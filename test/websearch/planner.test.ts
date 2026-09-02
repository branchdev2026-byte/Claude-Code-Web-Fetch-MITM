import { describe, expect, mock, test } from "bun:test";
import type { ReasonLlmConfig } from "../../src/websearch/types";

// 设计文档第 5.1 节。mock 的是 src/realFetch（llm.ts 往下一层），不是 src/websearch/llm
// 本身——bun:test 的 mock.module 是进程级全局生效的（同一个 specifier 被多个测试文件各自
// mock 时互不干扰，但如果某个文件想要"真实"的那个模块、而另一个文件把它整个 mock 掉，
// 后加载的一方会拿到别人的 mock，不保证拿到真实实现）。本项目 test/websearch/ 下的约定是
// ——只 mock src/realFetch 这一层，src/websearch/llm.ts 及以上的模块永远保持真实，这样
// 不会有任何一个文件需要"真实的 llm.ts"而与另一个 mock 掉它的文件冲突。
let mockResponse = "";
mock.module("../../src/realFetch", () => ({
  realFetch: async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: mockResponse } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
}));

const { plan } = await import("../../src/websearch/planner");

const config: ReasonLlmConfig = {
  apiKey: "test-key",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "moonshotai/kimi-k3",
  effort: "low",
  sort: "latency",
};

describe("plan", () => {
  test("parses a well-formed planner response", async () => {
    mockResponse = JSON.stringify({
      subQueries: ["bun release notes", "bun changelog"],
      timeBudgetMs: 8000,
      roundGuidance: 2,
      fetchTopN: 1,
    });
    const result = await plan("bun latest release", config, AbortSignal.timeout(5000));
    expect(result).toEqual({
      subQueries: ["bun release notes", "bun changelog"],
      timeBudgetMs: 8000,
      roundGuidance: 2,
      fetchTopN: 1,
    });
  });

  test("falls back to internal defaults for malformed numeric fields, does not throw", async () => {
    mockResponse = JSON.stringify({
      subQueries: ["a query"],
      timeBudgetMs: "not a number",
      roundGuidance: null,
      // fetchTopN missing entirely
    });
    const result = await plan("query", config, AbortSignal.timeout(5000));
    expect(result.subQueries).toEqual(["a query"]);
    expect(typeof result.timeBudgetMs).toBe("number");
    expect(typeof result.roundGuidance).toBe("number");
    expect(typeof result.fetchTopN).toBe("number");
  });

  test("throws when subQueries is missing", async () => {
    mockResponse = JSON.stringify({ timeBudgetMs: 5000, roundGuidance: 1, fetchTopN: 0 });
    await expect(plan("query", config, AbortSignal.timeout(5000))).rejects.toThrow(/subQueries/);
  });

  test("throws when subQueries is an empty array", async () => {
    mockResponse = JSON.stringify({ subQueries: [], timeBudgetMs: 5000, roundGuidance: 1, fetchTopN: 0 });
    await expect(plan("query", config, AbortSignal.timeout(5000))).rejects.toThrow(/subQueries/);
  });

  test("throws on invalid JSON", async () => {
    mockResponse = "not json at all";
    await expect(plan("query", config, AbortSignal.timeout(5000))).rejects.toThrow(/invalid JSON/);
  });
});
