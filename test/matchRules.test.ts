import { describe, expect, test } from "bun:test";
import { extractWebFetchInputs, webfetchRule } from "../src/matchRules/webfetch";
import fixtureRequest from "./fixtures/request.json";

describe("webfetchRule", () => {
  test("strict match on real captured request", () => {
    expect(webfetchRule.strictMatch(fixtureRequest as any)).toBe(true);
    expect(webfetchRule.looseMatch(fixtureRequest as any)).toBe(true);
  });

  test("loose match without strict match triggers drift signal shape", () => {
    const looseOnly = {
      model: "claude-haiku-4-5-20251001",
      tools: [],
      messages: [{ role: "user", content: [{ type: "text", text: "some other queryHaiku prompt" }] }],
    };
    expect(webfetchRule.strictMatch(looseOnly as any)).toBe(false);
    expect(webfetchRule.looseMatch(looseOnly as any)).toBe(true);
  });

  test("neither signal matches an unrelated request", () => {
    const unrelated = {
      model: "claude-opus-5",
      tools: [{ name: "Bash" }],
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
    };
    expect(webfetchRule.strictMatch(unrelated as any)).toBe(false);
    expect(webfetchRule.looseMatch(unrelated as any)).toBe(false);
  });
});

describe("extractWebFetchInputs", () => {
  test("extracts pageMarkdown and userPrompt matching ref doc §2", () => {
    const result = extractWebFetchInputs(fixtureRequest as any);
    expect(result).not.toBeNull();
    expect(result!.pageMarkdown).toBe(
      "Example Domain\n\nExample Domain\n==============\n\nThis domain is for use in documentation examples without needing permission. Avoid use in operations.\n\n[Learn more](https://iana.org/domains/example)",
    );
    expect(result!.userPrompt).toBe("Summarize the content of this page in one sentence.");
  });

  test("returns null for non-matching body", () => {
    const result = extractWebFetchInputs({ messages: [{ role: "user", content: [{ type: "text", text: "x" }] }] } as any);
    expect(result).toBeNull();
  });
});
