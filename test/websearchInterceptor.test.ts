import { afterAll, afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { Config } from "../src/config";
import fixtureWebFetchRequest from "./fixtures/request.json";
import fixtureWebSearchRequest from "./fixtures/websearch-request.json";

// 验证设计文档第 9 节：websearch 走占位 provider（真实网络零调用，不需要 mock realFetch 的
// "provider 成功/失败"分支——占位 provider 本身不发请求），以及第 9.5 节"熔断按调用点独立
// 计数"。跟 circuitBreaker.test.ts 一样的手法：mock.module 替换 src/realFetch.ts，再动态
// import src/interceptor，保证生产代码不改，只是不让 fail-open 分支真的发网络请求。

let passthroughCallCount = 0;
let openrouterMode: "fail-http" | "success" = "fail-http";

mock.module("../src/realFetch", () => ({
  realFetch: async (input: unknown, _init?: unknown) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (url.startsWith("https://openrouter.ai/")) {
      if (openrouterMode === "success") {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(
              enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "ok summary" } }] })}\n\n`),
            );
            controller.enqueue(enc.encode(`data: [DONE]\n\n`));
            controller.close();
          },
        });
        return new Response(body, { headers: { "content-type": "text/event-stream" } });
      }
      return new Response("unauthorized", { status: 401 });
    }
    passthroughCallCount++;
    return new Response(JSON.stringify({ fakePassthrough: true }), {
      headers: { "content-type": "application/json" },
    });
  },
}));

const { installInterceptor } = await import("../src/interceptor");

const originalFetch = globalThis.fetch;

function bothTargetsConfig(): Config {
  return {
    enableTargets: ["webfetch", "websearch"],
    provider: "openrouter",
    openrouter: { apiKey: "test-key", models: ["m1"], providers: null, sort: null },
    zai: { apiKey: null, models: [] },
    promptFile: null,
  };
}

let logs: string[] = [];
let spy: ReturnType<typeof spyOn>;

beforeEach(() => {
  passthroughCallCount = 0;
  openrouterMode = "fail-http";
  logs = [];
  spy = spyOn(console, "error").mockImplementation((msg: unknown) => {
    logs.push(String(msg));
  });
  installInterceptor(bothTargetsConfig());
});

afterEach(() => {
  spy.mockRestore();
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

async function fireWebSearchRequest(): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    body: JSON.stringify(fixtureWebSearchRequest),
  });
}

async function fireWebFetchRequest(): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    body: JSON.stringify(fixtureWebFetchRequest),
  });
}

describe("websearch stub provider interception", () => {
  test("strict match returns a synthesized response the parent would parse into title/url, not a passthrough", async () => {
    const res = await fireWebSearchRequest();
    expect(passthroughCallCount).toBe(0); // 没有落到 fail-open 真实转发
    const text = await res.text();
    expect(text).toContain("web_search_tool_result");
    expect(text).toContain("current price of Bitcoin in USD"); // query 原样出现在 server_tool_use.input
    expect(text).toContain("[STUB] placeholder result for: current price of Bitcoin in USD");
    expect(logs.some((l) => l.includes("websearch forwarded"))).toBe(true);
  });

  test("query extraction failure falls open to the real request unchanged", async () => {
    const malformed = { ...fixtureWebSearchRequest, messages: [{ role: "user", content: [{ type: "text", text: "not the expected prefix" }] }] };
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: JSON.stringify(malformed) });
    expect(passthroughCallCount).toBe(1);
    const json = await res.json();
    expect(json).toEqual({ fakePassthrough: true });
    expect(logs.some((l) => l.includes('failed to extract query'))).toBe(true);
  });
});

describe("circuit breakers are independent per rule", () => {
  test("webfetch's provider failures do not open websearch's circuit, and vice versa", async () => {
    // webfetch 侧连续失败到阈值（openrouterMode 保持 fail-http）。
    await fireWebFetchRequest();
    await fireWebFetchRequest();
    await fireWebFetchRequest();
    expect(logs.some((l) => l.includes("ALERT") && l.includes("[webfetch]") && l.includes("circuit breaker OPEN"))).toBe(
      true,
    );

    logs = [];
    // websearch 侧从未失败过（占位 provider 总是成功）——即使 webfetch 已经熔断，
    // websearch 这次调用仍然应该正常命中占位 provider，不受影响。
    const res = await fireWebSearchRequest();
    const text = await res.text();
    expect(text).toContain("web_search_tool_result");
    expect(logs.some((l) => l.includes("circuit breaker open"))).toBe(false);

    logs = [];
    // webfetch 侧确认已经熔断跳过 provider。
    await fireWebFetchRequest();
    expect(logs.some((l) => l.includes("circuit breaker open, skipping provider"))).toBe(true);
  });
});
