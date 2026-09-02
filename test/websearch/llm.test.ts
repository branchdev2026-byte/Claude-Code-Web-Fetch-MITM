import { describe, expect, mock, test } from "bun:test";

// 设计文档第 10.3 节。mock.module 替换 src/realFetch.ts，再动态 import src/websearch/llm，
// 保证生产代码不改，只是不让真的打 OpenRouter。

let lastRequestBody: any = null;
let responseMode: "success" | "http-error" | "embedded-error" | "missing-choices" = "success";

mock.module("../../src/realFetch", () => ({
  realFetch: async (_url: unknown, init?: RequestInit) => {
    lastRequestBody = init?.body ? JSON.parse(init.body as string) : null;

    if (responseMode === "http-error") {
      return new Response("server error", { status: 500 });
    }
    if (responseMode === "embedded-error") {
      return new Response(JSON.stringify({ error: { message: "bad request", code: 400 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (responseMode === "missing-choices") {
      return new Response(JSON.stringify({ id: "abc", object: "chat.completion" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: "the answer" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
}));

const { callLlm, supportsReasoningEffort } = await import("../../src/websearch/llm");

function baseOptions(overrides: Partial<Parameters<typeof callLlm>[0]> = {}) {
  return {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "test-key",
    model: "deepseek/deepseek-v4-flash-0731",
    sort: "latency" as const,
    temperature: 0.3,
    ...overrides,
  };
}

describe("callLlm", () => {
  test("200 with valid choices resolves to message content", async () => {
    responseMode = "success";
    const result = await callLlm(baseOptions(), "hello", AbortSignal.timeout(5000));
    expect(result).toBe("the answer");
  });

  test("HTTP error status throws", async () => {
    responseMode = "http-error";
    await expect(callLlm(baseOptions(), "hello", AbortSignal.timeout(5000))).rejects.toThrow(/http 500/);
  });

  test("200 response with embedded error field throws, not silently swallowed", async () => {
    responseMode = "embedded-error";
    await expect(callLlm(baseOptions(), "hello", AbortSignal.timeout(5000))).rejects.toThrow(/websearch llm error/);
  });

  test("200 response missing 'choices' array throws", async () => {
    responseMode = "missing-choices";
    await expect(callLlm(baseOptions(), "hello", AbortSignal.timeout(5000))).rejects.toThrow(/missing 'choices' array/);
  });

  test("reasoning_effort is sent only for a model in the supported whitelist", async () => {
    responseMode = "success";
    await callLlm(baseOptions({ model: "moonshotai/kimi-k3", reasoningEffort: "low" }), "hello", AbortSignal.timeout(5000));
    expect(lastRequestBody.reasoning_effort).toBe("low");

    await callLlm(
      baseOptions({ model: "deepseek/deepseek-v4-flash-0731", reasoningEffort: "low" }),
      "hello",
      AbortSignal.timeout(5000),
    );
    expect(lastRequestBody.reasoning_effort).toBeUndefined();
  });

  test("provider.sort is included in the request body when sort is non-null", async () => {
    responseMode = "success";
    await callLlm(baseOptions({ sort: "latency" }), "hello", AbortSignal.timeout(5000));
    expect(lastRequestBody.provider).toEqual({ sort: "latency" });

    await callLlm(baseOptions({ sort: null }), "hello", AbortSignal.timeout(5000));
    expect(lastRequestBody.provider).toBeUndefined();
  });

  test("jsonMode requests response_format json_object", async () => {
    responseMode = "success";
    await callLlm(baseOptions({ jsonMode: true }), "hello", AbortSignal.timeout(5000));
    expect(lastRequestBody.response_format).toEqual({ type: "json_object" });
  });
});

describe("supportsReasoningEffort", () => {
  test("true for kimi-k3 model ids", () => {
    expect(supportsReasoningEffort("moonshotai/kimi-k3")).toBe(true);
    expect(supportsReasoningEffort("moonshotai/kimi-k3-turbo")).toBe(true);
  });

  test("false for other models", () => {
    expect(supportsReasoningEffort("deepseek/deepseek-v4-flash-0731")).toBe(false);
  });
});
