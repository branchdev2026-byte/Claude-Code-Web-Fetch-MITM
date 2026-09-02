import { afterAll, afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { Config } from "../src/config";
import fixtureRequest from "./fixtures/request.json";

// 验证 doc/plan/fix/2026-08-29_provider响应结构漂移熔断.md 里的连续失败熔断逻辑。
//
// 跟 providers.integration.test.ts 一样的手法：mock.module 替换掉 src/realFetch.ts，
// 再动态 import src/interceptor，保证 interceptor.ts 加载到的是这份 mock，而不是真的去
// 打 openrouter.ai / api.anthropic.com。生产代码（interceptor.ts/openrouter.ts）完全
// 不改，属于"不需要改源码的常规测试脚本"。
//
// realFetch 的调用分两类，靠目标 URL 区分：
// - openrouter.ai：模拟 provider 层这次调用成功还是失败，由 `mode` 控制。
// - 其余（api.anthropic.com）：interceptor 自己 fail-open 时转发的那次调用，直接返回
//   占位响应、计数，不发真实网络请求——不管熔断有没有触发，这条路径都必须被走到
//   （WebFetch 不能因为熔断而真的失败），测试要能区分"走到了但没试 provider"和
//   "走到了、试了 provider 又失败了"，靠下面的日志断言。

let mode: "fail-http" | "success" = "fail-http";
let passthroughCallCount = 0;

mock.module("../src/realFetch", () => ({
  realFetch: async (input: unknown, _init?: unknown) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (url.startsWith("https://openrouter.ai/")) {
      if (mode === "success") {
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

function circuitBreakerConfig(): Config {
  return {
    enableTargets: ["webfetch"],
    provider: "openrouter",
    openrouter: { apiKey: "test-key", models: ["m1"], providers: null, sort: null },
    zai: { apiKey: null, models: [] },
    promptFile: null,
    websearch: {
      backend: "searxng",
      searxng: { url: null, categories: "general" },
      reason: { apiKey: null, baseUrl: "https://openrouter.ai/api/v1", model: "m", effort: "low", sort: null },
      summary: { apiKey: null, baseUrl: "https://openrouter.ai/api/v1", model: "m", sort: null },
      maxSources: 20,
    },
  };
}

let logs: string[] = [];
let spy: ReturnType<typeof spyOn>;

beforeEach(() => {
  mode = "fail-http";
  passthroughCallCount = 0;
  logs = [];
  spy = spyOn(console, "error").mockImplementation((msg: unknown) => {
    logs.push(String(msg));
  });
  installInterceptor(circuitBreakerConfig());
});

afterEach(() => {
  spy.mockRestore();
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

async function fireStrictMatchRequest(): Promise<void> {
  await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    body: JSON.stringify(fixtureRequest),
  });
}

describe("interceptor circuit breaker", () => {
  test("opens after 3 consecutive provider failures, then skips the provider entirely", async () => {
    await fireStrictMatchRequest();
    await fireStrictMatchRequest();
    expect(logs.some((l) => l.includes("ALERT"))).toBe(false);
    expect(passthroughCallCount).toBe(2); // 每次失败都仍然 fail-open 到"真实"路径

    logs = [];
    await fireStrictMatchRequest(); // 第 3 次失败 —— 达到阈值
    expect(logs.some((l) => l.includes("ALERT") && l.includes("circuit breaker OPEN"))).toBe(true);
    expect(passthroughCallCount).toBe(3);

    // 就算 provider 这时候恢复正常了，熔断期间也不应该再去尝试它。
    logs = [];
    mode = "success";
    await fireStrictMatchRequest();
    expect(logs.some((l) => l.includes("circuit breaker open, skipping provider"))).toBe(true);
    expect(logs.some((l) => l.includes("forwarded to openrouter"))).toBe(false);
    expect(passthroughCallCount).toBe(4); // fail-open 本身照常发生，只是没有经过 provider 尝试
  });

  test("a success before the threshold resets the consecutive-failure counter", async () => {
    await fireStrictMatchRequest(); // 失败 1
    await fireStrictMatchRequest(); // 失败 2（还没到阈值 3）

    mode = "success";
    await fireStrictMatchRequest(); // 成功一次，计数器清零
    expect(logs.some((l) => l.includes("forwarded to openrouter"))).toBe(true);

    logs = [];
    mode = "fail-http";
    await fireStrictMatchRequest(); // 清零后的失败 1
    await fireStrictMatchRequest(); // 清零后的失败 2
    expect(logs.some((l) => l.includes("ALERT"))).toBe(false); // 还没连续到 3 次，不该触发熔断
  });
});
