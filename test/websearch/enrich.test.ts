import { describe, expect, mock, test } from "bun:test";
import type { PoolEntry, SummaryLlmConfig } from "../../src/websearch/types";

// 设计文档第 8 节。只 mock src/realFetch 这一层（页面抓取与 llm.ts 内部的 OpenRouter 调用
// 都经过它，靠 URL 里是否含 /chat/completions 区分）——不单独 mock src/websearch/llm，
// 理由见 planner.test.ts 顶部注释：避免与其他测试文件对同一个 specifier 的全局 mock 冲突。

type FetchMode = "html-ok" | "non-html" | "http-error" | "network-throw";
let fetchMode: FetchMode = "html-ok";
let htmlBody = "<html><body><script>var x=1;</script><h1>Hello</h1><p>World</p></body></html>";
let llmMode: "success" | "throw" = "success";
let llmOutput = "extracted bullet points";

mock.module("../../src/realFetch", () => ({
  realFetch: async (input: unknown, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (url.includes("/chat/completions")) {
      if (llmMode === "throw") return new Response("server error", { status: 500 });
      return new Response(JSON.stringify({ choices: [{ message: { content: llmOutput } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (fetchMode === "network-throw") throw new Error("network down");
    if (fetchMode === "http-error") return new Response("not found", { status: 404 });
    if (fetchMode === "non-html") {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "application/pdf" } });
    }
    return new Response(htmlBody, { headers: { "content-type": "text/html; charset=utf-8" } });
  },
}));

const { enrichOne, enrichTop } = await import("../../src/websearch/enrich");

const summaryConfig: SummaryLlmConfig = {
  apiKey: "test-key",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "deepseek/deepseek-v4-flash-0731",
  sort: "latency",
};

function entry(overrides: Partial<PoolEntry> = {}): PoolEntry {
  return {
    title: "Title",
    url: "https://example.com/page",
    content: "original excerpt",
    hitCount: 1,
    engines: new Set(["google"]),
    score: 1,
    enriched: false,
    ...overrides,
  };
}

describe("enrichOne", () => {
  test("happy path: fetch -> turndown -> extract, marks enriched and replaces content", async () => {
    fetchMode = "html-ok";
    llmMode = "success";
    llmOutput = "- Hello World fact";
    const result = await enrichOne(entry(), "query", summaryConfig, AbortSignal.timeout(5000));
    expect(result.enriched).toBe(true);
    expect(result.content).toBe("- Hello World fact");
  });

  test("non-HTML content-type is skipped, original entry returned unchanged", async () => {
    fetchMode = "non-html";
    const original = entry();
    const result = await enrichOne(original, "query", summaryConfig, AbortSignal.timeout(5000));
    expect(result).toEqual(original);
    expect(result.enriched).toBe(false);
  });

  test("fetch failure (network throw) is caught, original content preserved", async () => {
    fetchMode = "network-throw";
    const original = entry();
    const result = await enrichOne(original, "query", summaryConfig, AbortSignal.timeout(5000));
    expect(result).toEqual(original);
  });

  test("HTTP error status is caught, original content preserved", async () => {
    fetchMode = "http-error";
    const original = entry();
    const result = await enrichOne(original, "query", summaryConfig, AbortSignal.timeout(5000));
    expect(result).toEqual(original);
  });

  test("script/style content is stripped before extraction reaches the LLM (turndown .remove())", async () => {
    fetchMode = "html-ok";
    htmlBody = "<html><body><style>.x{color:red}</style><script>alert(1)</script><p>Real content</p></body></html>";
    llmMode = "success";
    llmOutput = "- Real content fact";
    const result = await enrichOne(entry(), "query", summaryConfig, AbortSignal.timeout(5000));
    expect(result.enriched).toBe(true);
    expect(result.content).toBe("- Real content fact");
  });

  test("LLM extraction failure is caught, original content preserved", async () => {
    fetchMode = "html-ok";
    htmlBody = "<html><body><p>content</p></body></html>";
    llmMode = "throw";
    const original = entry();
    const result = await enrichOne(original, "query", summaryConfig, AbortSignal.timeout(5000));
    expect(result).toEqual(original);
  });
});

describe("enrichTop", () => {
  test("fetchTopN=0 returns an empty array without touching any entry", async () => {
    fetchMode = "html-ok";
    const result = await enrichTop([entry(), entry({ url: "https://example.com/2" })], 0, "query", summaryConfig, AbortSignal.timeout(5000));
    expect(result).toEqual([]);
  });

  test("enriches only the top fetchTopN entries, in parallel", async () => {
    fetchMode = "html-ok";
    llmMode = "success";
    llmOutput = "- fact";
    const pool = [entry({ url: "https://example.com/1" }), entry({ url: "https://example.com/2" }), entry({ url: "https://example.com/3" })];
    const result = await enrichTop(pool, 2, "query", summaryConfig, AbortSignal.timeout(5000));
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.enriched)).toBe(true);
  });
});
