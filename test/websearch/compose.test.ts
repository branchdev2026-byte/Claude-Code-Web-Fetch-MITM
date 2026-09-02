import { describe, expect, mock, test } from "bun:test";
import type { PoolEntry, SummaryLlmConfig } from "../../src/websearch/types";

// 设计文档第 5 节步骤 7、10.3 节。mock 的是 src/realFetch（llm.ts 往下一层）——理由同
// planner.test.ts 顶部注释。

let mockMode: "success" | "http-error" = "success";
let mockText = "";
mock.module("../../src/realFetch", () => ({
  realFetch: async () => {
    if (mockMode === "http-error") return new Response("server error", { status: 500 });
    return new Response(JSON.stringify({ choices: [{ message: { content: mockText } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
}));

const { compose } = await import("../../src/websearch/compose");

const config: SummaryLlmConfig = {
  apiKey: "test-key",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "deepseek/deepseek-v4-flash-0731",
  sort: "latency",
};

function entry(overrides: Partial<PoolEntry> = {}): PoolEntry {
  return {
    title: "Title",
    url: "https://example.com",
    content: "content",
    hitCount: 1,
    engines: new Set(["google"]),
    score: 1,
    enriched: false,
    ...overrides,
  };
}

describe("compose", () => {
  test("returns the llm output unchanged when under the length limit", async () => {
    mockMode = "success";
    mockText = "Bun is a fast JS runtime [1].";
    const result = await compose("bun", [entry()], config, AbortSignal.timeout(5000));
    expect(result).toBe(mockText);
  });

  test("truncates overly long output to the last full sentence boundary", async () => {
    mockMode = "success";
    const sentence = "This is a fact. ";
    // 让文本超过 8000 字符上限，且以句号收尾便于断言。
    mockText = sentence.repeat(600) + "an incomplete tail with no punctuation";
    const result = await compose("bun", [entry()], config, AbortSignal.timeout(5000));
    expect(result.length).toBeLessThanOrEqual(8000);
    expect(result.endsWith(".")).toBe(true);
    expect(result).not.toContain("incomplete tail");
  });

  test("returns an empty string on failure, does not throw", async () => {
    mockMode = "http-error";
    const result = await compose("bun", [entry()], config, AbortSignal.timeout(5000));
    expect(result).toBe("");
  });
});
