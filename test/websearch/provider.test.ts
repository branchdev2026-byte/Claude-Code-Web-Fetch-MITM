import { describe, expect, mock, test } from "bun:test";
import type { SearchBackend } from "../../src/websearch/backends/searxng";
import type { RawHit, ReasonLlmConfig, SummaryLlmConfig } from "../../src/websearch/types";

// 设计文档第 5、9 节。被测对象是 provider.ts 自己的编排逻辑（并发发起时机、时间预算提前
// 停止、收尾合并、fail-open 触发条件），驱动的是 planner/reflect/enrich/compose 的**真实
// 实现**——backend 直接传一个手写 fake（createWebSearchProvider 的 config.backend 只是个
// 普通参数，不是模块，不需要 mock），LLM 与页面抓取统一走一个 src/realFetch mock，按
// URL/prompt 内容分派到对应阶段的canned 响应。
//
// 不直接 mock.module("../../src/websearch/planner"/"reflect"/"enrich"/"compose")——那样
// 会和 planner.test.ts/reflect.test.ts/compose.test.ts/enrich.test.ts 想要的"真实实现"
// 在同一次 `bun test` 全量运行时发生全局 mock.module 注册冲突（bun:test 的 mock.module
// 是进程级生效的，同一个 specifier 被一个文件 mock、被另一个文件当作 SUT 真实导入时，
// 后加载的一方不保证拿到真实实现）。本项目 test/websearch/ 下的约定是只 mock 到
// src/realFetch 这一层，所有更上层模块永远保持真实，从根源上避免这类冲突。

const CHAT_COMPLETIONS_PATH = "/chat/completions";

interface MockState {
  plannerResponse: () => string;
  plannerHttpError?: boolean;
  reflectResponse: () => string | Promise<string>;
  extractResponse: () => string;
  composeResponse: () => string | Response;
  pageResponse: () => Response;
}

let state: MockState;
let events: string[];

function jsonLlmResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

mock.module("../../src/realFetch", () => ({
  realFetch: async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

    if (!url.includes(CHAT_COMPLETIONS_PATH)) {
      // 富化阶段抓取页面正文，跟 LLM 调用走的是不同 URL（页面自身的 URL，不含
      // /chat/completions）。
      return state.pageResponse();
    }

    const body = JSON.parse(init!.body as string);
    const prompt = body.messages[0].content as string;

    if (prompt.includes("planning stage")) {
      events.push("planner-call");
      if (state.plannerHttpError) return new Response("server error", { status: 500 });
      return jsonLlmResponse(state.plannerResponse());
    }
    if (prompt.includes("reflection stage")) {
      events.push("reflect-call-start");
      const content = await state.reflectResponse();
      events.push("reflect-call-end");
      return jsonLlmResponse(content);
    }
    if (prompt.includes("Extract the key facts")) {
      events.push("enrich-call");
      return jsonLlmResponse(state.extractResponse());
    }
    if (prompt.includes("Write a concise, factual summary")) {
      events.push("compose-call");
      const result = state.composeResponse();
      return result instanceof Response ? result : jsonLlmResponse(result);
    }
    throw new Error(`test bug: unrecognized prompt: ${prompt.slice(0, 80)}`);
  },
}));

const { createWebSearchProvider } = await import("../../src/websearch/provider");

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hit(overrides: Partial<RawHit> = {}): RawHit {
  return { title: "T", url: "https://example.com/a", content: "c", score: 1, engines: ["google"], ...overrides };
}

function freshState(overrides: Partial<MockState> = {}): MockState {
  return {
    plannerResponse: () => JSON.stringify({ subQueries: ["q1"], timeBudgetMs: 10_000, roundGuidance: 1, fetchTopN: 1 }),
    reflectResponse: () => JSON.stringify({ sufficient: true, refinedQueries: [] }),
    extractResponse: () => "- extracted fact",
    composeResponse: () => "a summary",
    pageResponse: () => new Response("<html><body><p>page</p></body></html>", { headers: { "content-type": "text/html" } }),
    ...overrides,
  };
}

const reasonConfig: ReasonLlmConfig = {
  apiKey: "k",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "moonshotai/kimi-k3",
  effort: "low",
  sort: "latency",
};
const summaryConfig: SummaryLlmConfig = {
  apiKey: "k",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "deepseek/deepseek-v4-flash-0731",
  sort: "latency",
};

function fakeBackend(searchImpl: (subQuery: string, signal: AbortSignal) => Promise<RawHit[]>): SearchBackend {
  return { search: searchImpl };
}

describe("createWebSearchProvider().search orchestration", () => {
  test("enrich runs concurrently with the reflect loop, not sequenced after it", async () => {
    events = [];
    state = freshState({
      reflectResponse: async () => {
        await delay(30);
        return JSON.stringify({ sufficient: true, refinedQueries: [] });
      },
    });

    const backend = fakeBackend(async () => [hit()]);
    const provider = createWebSearchProvider({ backend, reason: reasonConfig, summary: summaryConfig, maxSources: 20 });
    await provider.search("query", AbortSignal.timeout(5000));

    expect(events.indexOf("enrich-call")).toBeLessThan(events.indexOf("reflect-call-end"));
  });

  test("time budget exhausted before the reflect loop starts: reflect is never called, still composes normally", async () => {
    events = [];
    state = freshState({
      plannerResponse: () => JSON.stringify({ subQueries: ["q1"], timeBudgetMs: 0, roundGuidance: 1, fetchTopN: 0 }),
    });

    const backend = fakeBackend(async () => [hit()]);
    const provider = createWebSearchProvider({ backend, reason: reasonConfig, summary: summaryConfig, maxSources: 20 });
    const result = await provider.search("query", AbortSignal.timeout(5000));

    expect(events.filter((e) => e.startsWith("reflect-call"))).toHaveLength(0);
    expect(result.summary).toBe("a summary");
    expect(result.sources).toHaveLength(1);
  });

  test("sufficient=true stops the loop without firing a refinement search round", async () => {
    events = [];
    state = freshState({
      reflectResponse: () => JSON.stringify({ sufficient: true, refinedQueries: ["should not be searched"] }),
    });
    let searchCallCount = 0;
    const backend = fakeBackend(async () => {
      searchCallCount++;
      return [hit()];
    });

    const provider = createWebSearchProvider({ backend, reason: reasonConfig, summary: summaryConfig, maxSources: 20 });
    await provider.search("query", AbortSignal.timeout(5000));

    expect(events.filter((e) => e === "reflect-call-start")).toHaveLength(1);
    expect(searchCallCount).toBe(1); // 只有第 1 轮，没有补搜
  });

  test("fetchTopN=0 still produces valid sources/summary (enrich executes with zero items, not short-circuited)", async () => {
    events = [];
    state = freshState({
      plannerResponse: () => JSON.stringify({ subQueries: ["q1"], timeBudgetMs: 10_000, roundGuidance: 1, fetchTopN: 0 }),
    });
    const backend = fakeBackend(async () => [hit()]);
    const provider = createWebSearchProvider({ backend, reason: reasonConfig, summary: summaryConfig, maxSources: 20 });
    const result = await provider.search("query", AbortSignal.timeout(5000));

    expect(events.filter((e) => e === "enrich-call")).toHaveLength(0); // fetchTopN=0，没有条目要富化
    expect(result.sources).toHaveLength(1);
    expect(result.summary).toBe("a summary");
  });

  test("enrich failing on every entry (page fetch 404s) does not affect the overall result", async () => {
    events = [];
    // enrich.test.ts already covers "one entry enriched, one entry not enriched" at the
    // enrich.ts unit level with fine-grained per-URL control. At the provider orchestration
    // level, the thing worth confirming is that a fully-failed enrich phase (every entry
    // degrades back to its original content) still lets the overall search() complete
    // normally instead of propagating the failure.
    state = freshState({
      plannerResponse: () => JSON.stringify({ subQueries: ["q1"], timeBudgetMs: 10_000, roundGuidance: 1, fetchTopN: 2 }),
      pageResponse: () => new Response("not found", { status: 404 }),
    });
    const backend = fakeBackend(async () => [hit({ url: "https://example.com/a" }), hit({ url: "https://example.com/b" })]);
    const provider = createWebSearchProvider({ backend, reason: reasonConfig, summary: summaryConfig, maxSources: 20 });
    const result = await provider.search("query", AbortSignal.timeout(5000));

    expect(result.sources).toHaveLength(2);
    expect(result.summary).toBe("a summary");
  });

  test("planner throwing (HTTP error) makes search() reject as a whole (fail-open upstream)", async () => {
    events = [];
    state = freshState({ plannerHttpError: true });
    const backend = fakeBackend(async () => [hit()]);
    const provider = createWebSearchProvider({ backend, reason: reasonConfig, summary: summaryConfig, maxSources: 20 });
    await expect(provider.search("query", AbortSignal.timeout(5000))).rejects.toThrow(/http 500/);
  });

  test("all sub-queries return no results in round 1 -> search() rejects, reflect/enrich never touched", async () => {
    events = [];
    state = freshState();
    const backend = fakeBackend(async () => []);
    const provider = createWebSearchProvider({ backend, reason: reasonConfig, summary: summaryConfig, maxSources: 20 });
    await expect(provider.search("query", AbortSignal.timeout(5000))).rejects.toThrow(/no results/);
    expect(events.filter((e) => e.startsWith("reflect-call"))).toHaveLength(0);
    expect(events.filter((e) => e === "enrich-call")).toHaveLength(0);
  });

  test("compose failure degrades to an empty summary, sources still populated", async () => {
    events = [];
    state = freshState({ composeResponse: () => new Response("server error", { status: 500 }) });
    const backend = fakeBackend(async () => [hit()]);
    const provider = createWebSearchProvider({ backend, reason: reasonConfig, summary: summaryConfig, maxSources: 20 });
    const result = await provider.search("query", AbortSignal.timeout(5000));
    expect(result.summary).toBe("");
    expect(result.sources).toHaveLength(1);
  });
});
