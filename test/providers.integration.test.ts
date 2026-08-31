import { afterEach, describe, expect, mock, test } from "bun:test";
import type { Config } from "../src/config";

// 这些测试让 provider 层的真实代码（真实 fetch 调用、真实 AbortSignal 传导、真实 SSE
// 解析）打真实 HTTP 请求，只是把目标从 openrouter.ai/api.z.ai 换成本地 Bun.serve 假服务器
// ——覆盖"provider 卡住不动"/"一直有片段但永远不结束"/"mid-stream error 事件"这几种此前
// 只有抽象层假 generator 测试覆盖的场景。
//
// 生产代码（src/providers/*.ts）完全不改：用 bun:test 的 mock.module 直接替换掉
// src/realFetch.ts 这个模块，把请求 URL 的 origin 换成本地 mock server 的地址再转发给真实
// fetch，其余全部透传（method/headers/body/signal 都原样带过去）。provider 里的 ENDPOINT
// 常量、请求逻辑都不用动，属于"不需要改源码的常规测试脚本"，不需要拉测试分支。

let mockServer: ReturnType<typeof Bun.serve> | null = null;
const openTimers: Array<ReturnType<typeof setInterval>> = [];

mock.module("../src/realFetch", () => ({
  realFetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!mockServer) throw new Error("test bug: mockServer not started before a request was made");
    const originalUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const redirected = new URL(originalUrl.pathname + originalUrl.search, `http://127.0.0.1:${mockServer.port}`);
    return fetch(redirected, init);
  },
}));

const { createOpenRouterProvider } = await import("../src/providers/openrouter");
const { createZaiProvider } = await import("../src/providers/zai");
const { collectStreamWithIdleTimeout, StreamCollectTimeoutError } = await import("../src/streamCollect");

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sseChunk(event: string | null, data: unknown): string {
  const dataLine = typeof data === "string" ? data : JSON.stringify(data);
  return event ? `event: ${event}\ndata: ${dataLine}\n\n` : `data: ${dataLine}\n\n`;
}

afterEach(() => {
  mockServer?.stop(true);
  mockServer = null;
  for (const t of openTimers.splice(0)) clearInterval(t);
});

function baseConfig(): Config {
  return {
    enableTargets: ["webfetch"],
    provider: "openrouter",
    openrouter: { apiKey: "test-key", models: ["m1"], providers: null, sort: null },
    zai: { apiKey: "test-key", models: ["m1"] },
    promptFile: null,
  };
}

const INPUT = { pageMarkdown: "page content", userPrompt: "summarize", promptTemplate: "{pageMarkdown}\n{userPrompt}" };

describe("openrouter provider against a local mock server (via mocked realFetch)", () => {
  test("happy path: streams a few chunks then [DONE]", async () => {
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(enc.encode(sseChunk(null, { choices: [{ delta: { content: "Hello " } }] })));
            controller.enqueue(enc.encode(sseChunk(null, { choices: [{ delta: { content: "world" } }] })));
            controller.enqueue(enc.encode(sseChunk(null, "[DONE]")));
            controller.close();
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const provider = createOpenRouterProvider(baseConfig());
    const text = await collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
      idleTimeoutMs: 2000,
      totalTimeoutMs: 5000,
    });
    expect(text).toBe("Hello world");
  });

  test("idle timeout: server sends one chunk then goes silent forever", async () => {
    let clientDisconnected = false;
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(enc.encode(sseChunk(null, { choices: [{ delta: { content: "only chunk" } }] })));
            // 故意不再写入、不 close：模拟 provider 卡住不动。
          },
          cancel() {
            clientDisconnected = true;
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const provider = createOpenRouterProvider(baseConfig());
    const promise = collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
      idleTimeoutMs: 150,
      totalTimeoutMs: 10_000,
    });

    await expect(promise).rejects.toThrow(StreamCollectTimeoutError);
    try {
      await promise;
    } catch (err) {
      expect((err as InstanceType<typeof StreamCollectTimeoutError>).kind).toBe("idle");
    }

    await delay(50);
    expect(clientDisconnected).toBe(true);
  });

  test("total timeout: server keeps sending chunks forever, never completes", async () => {
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        let i = 0;
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            const timer = setInterval(() => {
              i++;
              try {
                controller.enqueue(enc.encode(sseChunk(null, { choices: [{ delta: { content: "x" } }] })));
              } catch {
                clearInterval(timer);
              }
              if (i > 200) clearInterval(timer); // 自我保护：不管断言是否生效都不会永远挂着
            }, 20);
            openTimers.push(timer);
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const provider = createOpenRouterProvider(baseConfig());
    const promise = collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
      idleTimeoutMs: 5000,
      totalTimeoutMs: 250,
    });

    await expect(promise).rejects.toThrow(StreamCollectTimeoutError);
    try {
      await promise;
    } catch (err) {
      expect((err as InstanceType<typeof StreamCollectTimeoutError>).kind).toBe("total");
    }
  });

  test("error field in a 200 SSE chunk is surfaced, not silently swallowed", async () => {
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(
              enc.encode(sseChunk(null, { error: { message: "content policy violation", code: 400 } })),
            );
            controller.close();
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const provider = createOpenRouterProvider(baseConfig());
    await expect(
      collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
        idleTimeoutMs: 2000,
        totalTimeoutMs: 5000,
      }),
    ).rejects.toThrow(/openrouter stream error/);
  });

  test("chunk with valid JSON but no 'choices' array is surfaced as an error, not treated as empty content", async () => {
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            // 语法合法的 JSON，但完全不是 chat-completion chunk 的形状——模拟 provider
            // 换了个响应格式。
            controller.enqueue(enc.encode(sseChunk(null, { id: "abc", object: "chat.completion.chunk" })));
            controller.close();
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const provider = createOpenRouterProvider(baseConfig());
    await expect(
      collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
        idleTimeoutMs: 2000,
        totalTimeoutMs: 5000,
      }),
    ).rejects.toThrow(/missing 'choices' array/);
  });

  test("chunk with delta present but no content field is still treated as empty (not an error)", async () => {
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            // role-only chunk：choices 数组在，delta 也在，就是没有 content 字段——正常。
            controller.enqueue(enc.encode(sseChunk(null, { choices: [{ delta: { role: "assistant" } }] })));
            controller.enqueue(enc.encode(sseChunk(null, { choices: [{ delta: { content: "ok" } }] })));
            controller.enqueue(enc.encode(sseChunk(null, "[DONE]")));
            controller.close();
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const provider = createOpenRouterProvider(baseConfig());
    const text = await collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
      idleTimeoutMs: 2000,
      totalTimeoutMs: 5000,
    });
    expect(text).toBe("ok");
  });

  test("malformed (non-JSON) SSE data line is surfaced as an error, not silently skipped", async () => {
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(enc.encode("data: this is not json at all\n\n"));
            controller.close();
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const provider = createOpenRouterProvider(baseConfig());
    await expect(
      collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
        idleTimeoutMs: 2000,
        totalTimeoutMs: 5000,
      }),
    ).rejects.toThrow(/malformed SSE data line/);
  });
});

describe("zai provider against a local mock server (via mocked realFetch)", () => {
  test("mid-stream error event is surfaced, not silently ignored", async () => {
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(enc.encode(sseChunk("content_block_delta", { delta: { text: "partial " } })));
            controller.enqueue(
              enc.encode(sseChunk("error", { type: "error", error: { type: "overloaded_error", message: "overloaded" } })),
            );
            controller.close();
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const config: Config = { ...baseConfig(), provider: "zai" };
    const provider = createZaiProvider(config);
    await expect(
      collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
        idleTimeoutMs: 2000,
        totalTimeoutMs: 5000,
      }),
    ).rejects.toThrow(/zai stream error event/);
  });

  test("content_block_delta with valid JSON but no 'delta' object is surfaced as an error", async () => {
    mockServer = Bun.serve({
      port: 0,
      fetch() {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            // 语法合法的 JSON，但没有 delta 这个字段——模拟原生 Anthropic 协议换了形状。
            controller.enqueue(enc.encode(sseChunk("content_block_delta", { type: "content_block_delta" })));
            controller.close();
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const config: Config = { ...baseConfig(), provider: "zai" };
    const provider = createZaiProvider(config);
    await expect(
      collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
        idleTimeoutMs: 2000,
        totalTimeoutMs: 5000,
      }),
    ).rejects.toThrow(/missing 'delta' object/);
  });

  test("sequential model retry works end-to-end over real HTTP: first model 500s, second succeeds", async () => {
    mockServer = Bun.serve({
      port: 0,
      async fetch(req) {
        const body = (await req.json()) as { model: string };
        if (body.model === "bad-model") {
          return new Response("server error", { status: 500 });
        }
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(enc.encode(sseChunk("content_block_delta", { delta: { text: "good model text" } })));
            controller.enqueue(enc.encode(sseChunk("message_stop", { type: "message_stop" })));
            controller.close();
          },
        });
        return new Response(stream, { headers: { "content-type": "text/event-stream" } });
      },
    });

    const config: Config = {
      ...baseConfig(),
      provider: "zai",
      zai: { apiKey: "test-key", models: ["bad-model", "good-model"] },
    };
    const provider = createZaiProvider(config);
    const text = await collectStreamWithIdleTimeout((signal) => provider.summarizeStream(INPUT, signal), {
      idleTimeoutMs: 2000,
      totalTimeoutMs: 5000,
    });
    expect(text).toBe("good model text");
  });
});
