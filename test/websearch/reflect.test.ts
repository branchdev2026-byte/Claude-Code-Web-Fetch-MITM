import { describe, expect, mock, test } from "bun:test";
import type { PoolEntry, ReasonLlmConfig } from "../../src/websearch/types";

// 设计文档第 5 节步骤 3。mock 的是 src/realFetch（llm.ts 往下一层）——理由同 planner.test.ts
// 顶部注释：本项目 test/websearch/ 下的约定是只 mock realFetch 这一层，避免多个文件互相
// mock 掉 src/websearch/llm.ts 本身产生的全局注册冲突。

let mockResponse = "";
mock.module("../../src/realFetch", () => ({
  realFetch: async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: mockResponse } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
}));

const { reflect } = await import("../../src/websearch/reflect");

const config: ReasonLlmConfig = {
  apiKey: "test-key",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "moonshotai/kimi-k3",
  effort: "low",
  sort: "latency",
};

const emptyPool: PoolEntry[] = [];

describe("reflect", () => {
  test("parses a well-formed reflect response", async () => {
    mockResponse = JSON.stringify({ sufficient: false, refinedQueries: ["more specific query"] });
    const result = await reflect("query", 2, 1, emptyPool, config, AbortSignal.timeout(5000));
    expect(result).toEqual({ sufficient: false, refinedQueries: ["more specific query"] });
  });

  test("defaults refinedQueries to an empty array when missing", async () => {
    mockResponse = JSON.stringify({ sufficient: true });
    const result = await reflect("query", 1, 1, emptyPool, config, AbortSignal.timeout(5000));
    expect(result).toEqual({ sufficient: true, refinedQueries: [] });
  });

  test("throws when 'sufficient' is missing", async () => {
    mockResponse = JSON.stringify({ refinedQueries: ["x"] });
    await expect(reflect("query", 1, 1, emptyPool, config, AbortSignal.timeout(5000))).rejects.toThrow(/sufficient/);
  });

  test("throws on invalid JSON", async () => {
    mockResponse = "not json";
    await expect(reflect("query", 1, 1, emptyPool, config, AbortSignal.timeout(5000))).rejects.toThrow(/invalid JSON/);
  });
});
