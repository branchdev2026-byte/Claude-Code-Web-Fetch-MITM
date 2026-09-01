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

import { extractWebSearchQuery, websearchRule } from "../src/matchRules/websearch";
import fixtureWebSearchRequest from "./fixtures/websearch-request.json";

describe("websearchRule", () => {
  test("strict match on real captured request (doc/ref websearch-haiku子请求实测抓包)", () => {
    expect(websearchRule.strictMatch(fixtureWebSearchRequest as any)).toBe(true);
    expect(websearchRule.looseMatch(fixtureWebSearchRequest as any)).toBe(true);
  });

  test("strict match tolerates a newer tool type version (prefix match, not exact string)", () => {
    const body = {
      tool_choice: { type: "tool", name: "web_search" },
      tools: [{ name: "web_search", type: "web_search_20260318" }],
    };
    expect(websearchRule.strictMatch(body as any)).toBe(true);
  });

  test("loose match when tool name present but tool_choice missing/type unrecognizable", () => {
    const body = {
      tools: [{ name: "web_search", type: "some_future_shape" }],
    };
    expect(websearchRule.strictMatch(body as any)).toBe(false);
    expect(websearchRule.looseMatch(body as any)).toBe(true);
  });

  test("neither signal matches a request without the tool", () => {
    const body = {
      tools: [{ name: "Bash" }],
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
    };
    expect(websearchRule.strictMatch(body as any)).toBe(false);
    expect(websearchRule.looseMatch(body as any)).toBe(false);
  });
});

describe("extractWebSearchQuery", () => {
  test("extracts the query from the fixed prefix on the real captured request", () => {
    expect(extractWebSearchQuery(fixtureWebSearchRequest as any)).toBe("current price of Bitcoin in USD");
  });

  test("returns null when the fixed prefix is missing", () => {
    const body = { messages: [{ role: "user", content: [{ type: "text", text: "not the expected shape" }] }] };
    expect(extractWebSearchQuery(body as any)).toBeNull();
  });

  test("returns null for an empty messages array", () => {
    expect(extractWebSearchQuery({ messages: [] } as any)).toBeNull();
  });
});
