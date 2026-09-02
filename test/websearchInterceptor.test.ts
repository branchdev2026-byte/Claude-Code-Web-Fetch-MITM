import { afterAll, afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { Config } from "../src/config";
import fixtureWebFetchRequest from "./fixtures/request.json";
import fixtureWebSearchRequest from "./fixtures/websearch-request.json";

// 验证设计文档第 13、14 节：interceptor 侧 resolveWebSearchProvider 的 fail-open/自管理/
// 熔断/正常路径这几条分支，以及跟 webfetch 熔断互相独立（第 9.5 节）。
//
// 只 mock 到 src/realFetch 这一层，让 src/websearch/provider.ts、
// src/websearch/backends/{searxng,searxngLifecycle}.ts 全部保持真实实现——不直接
// mock.module 这几个模块本身，理由见 test/websearch/planner.test.ts 顶部注释：bun:test 的
// mock.module 是进程级全局生效的，这几个模块同时也是 test/websearch/provider.test.ts 与
// test/websearch/searxngLifecycle.test.ts 的被测对象（它们需要"真实实现"），在同一次
// `bun test` 全量运行时，若这里也直接 mock 掉它们，会跟那两个文件的全局注册产生冲突
// （谁能拿到真实模块不确定）。全部收敛到只 mock realFetch 这一层，从根源上消除冲突。
//
// realFetch 这一层要同时扮演：docker 健康检查（返回 200，让自管理路径永远"已可达"，不需要
// 真的起/连 Docker）、SearXNG 检索端点、OpenRouter chat/completions（webfetch 的流式请求与
// websearch 的非流式请求共用同一个 URL，按 body.stream 区分）、以及 api.anthropic.com 的
// fail-open 透传目标。

const CHAT_COMPLETIONS_URL_FRAGMENT = "/chat/completions";
const DOCKER_HEALTHCHECK_URL_PREFIX = "http://127.0.0.1:18888";

let passthroughCallCount = 0;
let openrouterMode: "fail-http" | "success" = "fail-http"; // 控制 webfetch 侧（流式）

interface WebSearchLlmState {
  plannerHttpError: boolean;
}
let wsState: WebSearchLlmState;

function jsonLlmResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

mock.module("../src/realFetch", () => ({
  realFetch: async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

    if (url.includes("/search?")) {
      // SearXNG 检索端点：round 1 恒定返回 1 条结果，够绝大多数测试场景使用。检查顺序在
      // docker 健康检查之前——自管理路径下这个 URL 前缀跟健康检查 URL 相同
      // （http://127.0.0.1:18888），只是多了 /search 路径，必须先匹配更具体的这个分支。
      return new Response(
        JSON.stringify({ results: [{ title: "Bun docs", url: "https://bun.sh/docs", content: "c", score: 1, engines: ["google"] }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.startsWith(DOCKER_HEALTHCHECK_URL_PREFIX)) {
      return new Response("ok", { status: 200 }); // 假装自管理容器一直已经可达，不触发真实 docker 调用
    }

    if (url.startsWith("https://openrouter.ai/")) {
      const body = init?.body ? JSON.parse(init.body as string) : {};

      if (body.stream) {
        // webfetch 侧：流式 SSE，沿用既有 openrouterMode 控制的成功/失败两种形状。
        if (openrouterMode === "success") {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(
                enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "ok summary" } }] })}\n\n`),
              );
              controller.enqueue(enc.encode(`data: [DONE]\n\n`));
              controller.close();
            },
          });
          return new Response(stream, { headers: { "content-type": "text/event-stream" } });
        }
        return new Response("unauthorized", { status: 401 });
      }

      // websearch 侧：非流式 chat/completions，按 prompt 内容分派到规划/反思/汇总
      // （测试场景里 fetchTopN 恒为 0，不需要处理富化提炼的 prompt 分支）。
      const prompt = body.messages?.[0]?.content ?? "";
      if (prompt.includes("planning stage")) {
        if (wsState.plannerHttpError) return new Response("server error", { status: 500 });
        return jsonLlmResponse(JSON.stringify({ subQueries: ["q1"], timeBudgetMs: 10_000, roundGuidance: 1, fetchTopN: 0 }));
      }
      if (prompt.includes("reflection stage")) {
        return jsonLlmResponse(JSON.stringify({ sufficient: true, refinedQueries: [] }));
      }
      if (prompt.includes("Write a concise, factual summary")) {
        return jsonLlmResponse("Bun is a fast JS runtime [1].");
      }
      throw new Error(`test bug: unrecognized websearch prompt: ${String(prompt).slice(0, 80)}`);
    }

    passthroughCallCount++;
    return new Response(JSON.stringify({ fakePassthrough: true }), {
      headers: { "content-type": "application/json" },
    });
  },
}));

const { installInterceptor } = await import("../src/interceptor");

const originalFetch = globalThis.fetch;

function baseWebsearchConfig(overrides?: Partial<Config["websearch"]["reason"]>, searxngUrl: string | null = null): Config {
  return {
    enableTargets: ["webfetch", "websearch"],
    provider: "openrouter",
    openrouter: { apiKey: "test-key", models: ["m1"], providers: null, sort: null },
    zai: { apiKey: null, models: [] },
    promptFile: null,
    websearch: {
      backend: "searxng",
      searxng: { url: searxngUrl, categories: "general" },
      reason: {
        apiKey: "test-key",
        baseUrl: "https://openrouter.ai/api/v1",
        model: "moonshotai/kimi-k3",
        effort: "low",
        sort: "latency",
        ...overrides,
      },
      summary: { apiKey: "test-key", baseUrl: "https://openrouter.ai/api/v1", model: "deepseek/deepseek-v4-flash-0731", sort: "latency" },
      maxSources: 20,
    },
  };
}

let logs: string[] = [];
let spy: ReturnType<typeof spyOn>;

beforeEach(() => {
  passthroughCallCount = 0;
  openrouterMode = "fail-http";
  wsState = { plannerHttpError: false };
  logs = [];
  spy = spyOn(console, "error").mockImplementation((msg: unknown) => {
    logs.push(String(msg));
  });
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

describe("resolveWebSearchProvider fail-open / self-managed / normal path branches", () => {
  test("REASON_API_KEY unset -> no provider -> fail-open, no LLM/search calls made", async () => {
    installInterceptor(baseWebsearchConfig({ apiKey: null }));

    const res = await fireWebSearchRequest();
    expect(passthroughCallCount).toBe(1);
    const json = await res.json();
    expect(json).toEqual({ fakePassthrough: true });
    expect(logs.some((l) => l.includes('no provider configured, fail-open'))).toBe(true);
  });

  test("SEARXNG_URL unset (self-managed path) -> provider still constructed (not null), search succeeds", async () => {
    installInterceptor(baseWebsearchConfig(undefined, null));

    const res = await fireWebSearchRequest();
    const text = await res.text();
    expect(text).toContain("web_search_tool_result"); // 命中了真正的 provider，不是 fail-open
    expect(passthroughCallCount).toBe(0);
  });

  test("query extraction failure falls open to the real request unchanged", async () => {
    installInterceptor(baseWebsearchConfig());
    const malformed = {
      ...fixtureWebSearchRequest,
      messages: [{ role: "user", content: [{ type: "text", text: "not the expected prefix" }] }],
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: JSON.stringify(malformed) });
    expect(passthroughCallCount).toBe(1);
    const json = await res.json();
    expect(json).toEqual({ fakePassthrough: true });
    expect(logs.some((l) => l.includes("failed to extract query"))).toBe(true);
  });

  test("normal path: synthesized response carries the summary text block and the sources link list", async () => {
    installInterceptor(baseWebsearchConfig());
    const res = await fireWebSearchRequest();
    const text = await res.text();
    expect(text).toContain("web_search_tool_result");
    expect(text).toContain("https://bun.sh/docs");
    expect(text).toContain("Bun docs");
    expect(text).toContain("Bun is a fast JS runtime [1].");
    expect(logs.some((l) => l.includes("websearch forwarded") && l.includes("1 source(s)"))).toBe(true);
  });
});

describe("websearch provider failure triggers fail-open and its own circuit breaker", () => {
  test("provider throwing (planner HTTP error) falls open and opens the circuit after 3 consecutive failures", async () => {
    installInterceptor(baseWebsearchConfig());
    wsState.plannerHttpError = true;

    await fireWebSearchRequest();
    await fireWebSearchRequest();
    expect(logs.some((l) => l.includes("ALERT"))).toBe(false);

    logs = [];
    await fireWebSearchRequest();
    expect(logs.some((l) => l.includes("ALERT") && l.includes("circuit breaker OPEN"))).toBe(true);
    expect(passthroughCallCount).toBe(3);

    logs = [];
    wsState.plannerHttpError = false; // 就算这时候恢复正常，熔断期间也不应该再去尝试它
    const res = await fireWebSearchRequest();
    expect(logs.some((l) => l.includes("circuit breaker open, skipping provider"))).toBe(true);
    const text = await res.text();
    expect(text).not.toContain("web_search_tool_result"); // 没有真的再去调用 provider
  });
});

describe("circuit breakers are independent per rule", () => {
  test("webfetch's provider failures do not open websearch's circuit, and vice versa", async () => {
    installInterceptor(baseWebsearchConfig());

    // webfetch 侧连续失败到阈值（openrouterMode 保持 fail-http）。
    await fireWebFetchRequest();
    await fireWebFetchRequest();
    await fireWebFetchRequest();
    expect(logs.some((l) => l.includes("ALERT") && l.includes("[webfetch]") && l.includes("circuit breaker OPEN"))).toBe(
      true,
    );

    logs = [];
    // websearch 侧从未失败过——即使 webfetch 已经熔断，websearch 这次调用仍然应该正常命中
    // provider，不受影响。
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
