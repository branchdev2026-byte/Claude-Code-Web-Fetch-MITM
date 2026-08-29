import { describe, expect, test } from "bun:test";
import { buildOpenRouterRequestBody } from "../src/providers/openrouter";

describe("buildOpenRouterRequestBody", () => {
  test("omits top-level model, passes models array, carries stream flag", () => {
    const body = buildOpenRouterRequestBody("prompt text", ["deepseek/deepseek-v4-flash-0731"], null, true);
    expect(body.model).toBeUndefined();
    expect(body.models).toEqual(["deepseek/deepseek-v4-flash-0731"]);
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([{ role: "user", content: "prompt text" }]);
    expect(body.provider).toBeUndefined();
  });

  test("includes provider.order when providers list given", () => {
    const body = buildOpenRouterRequestBody("prompt", ["m1", "m2"], ["fireworks", "together"], true);
    expect(body.provider).toEqual({ order: ["fireworks", "together"] });
  });
});
