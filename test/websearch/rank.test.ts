import { describe, expect, test } from "bun:test";
import { mergeAndRank, normalizeUrl } from "../../src/websearch/rank";
import type { PoolEntry, RawHit } from "../../src/websearch/types";

// 设计文档第 7 节。纯函数，不需要 mock 网络。

function hit(overrides: Partial<RawHit> = {}): RawHit {
  return { title: "Title", url: "https://example.com/page", content: "content", score: 1, engines: ["google"], ...overrides };
}

describe("normalizeUrl", () => {
  test("strips fragment, trailing slash, and lowercases host", () => {
    expect(normalizeUrl("https://Example.com/Page/#section")).toBe(normalizeUrl("https://example.com/Page"));
  });

  test("does not strip the root path slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  test("falls back to the raw string for an unparsable URL, without throwing", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });
});

describe("mergeAndRank", () => {
  test("URL normalization dedupes hits that only differ by fragment/trailing slash/host case", () => {
    const hits: RawHit[] = [
      hit({ url: "https://example.com/page", engines: ["google"] }),
      hit({ url: "https://EXAMPLE.com/page/#anchor", engines: ["bing"] }),
    ];
    const pool = mergeAndRank([], hits);
    expect(pool).toHaveLength(1);
    expect(pool[0]!.hitCount).toBe(2);
    expect(pool[0]!.engines).toEqual(new Set(["google", "bing"]));
  });

  test("appends content from later duplicate hits, separated by newline", () => {
    const hits: RawHit[] = [
      hit({ url: "https://example.com/page", content: "first excerpt" }),
      hit({ url: "https://example.com/page", content: "second excerpt" }),
    ];
    const pool = mergeAndRank([], hits);
    expect(pool[0]!.content).toBe("first excerpt\nsecond excerpt");
  });

  test("keeps the title from the first occurrence", () => {
    const hits: RawHit[] = [
      hit({ url: "https://example.com/page", title: "First Title" }),
      hit({ url: "https://example.com/page", title: "Second Title" }),
    ];
    const pool = mergeAndRank([], hits);
    expect(pool[0]!.title).toBe("First Title");
  });

  test("merges into an existing pool passed in from a previous round", () => {
    const existing: PoolEntry[] = [
      {
        title: "Existing",
        url: "https://example.com/existing",
        content: "old content",
        hitCount: 1,
        engines: new Set(["google"]),
        score: 0.5,
        enriched: false,
      },
    ];
    const pool = mergeAndRank(existing, [hit({ url: "https://example.com/new" })]);
    expect(pool).toHaveLength(2);
  });

  test("sort key: hitCount desc, then engines.size desc, then score desc", () => {
    const hits: RawHit[] = [
      hit({ url: "https://a.com", engines: ["e1"], score: 10 }), // hitCount 1, engines 1
      hit({ url: "https://b.com", engines: ["e1"], score: 1 }),
      hit({ url: "https://b.com", engines: ["e2"], score: 1 }), // hitCount 2, engines 2, score 1
      hit({ url: "https://c.com", engines: ["e1", "e2", "e3"], score: 5 }), // hitCount 1, engines 1 (Set from one hit's engines array — still counted per-entry not per-array-length nuance)
    ];
    const pool = mergeAndRank([], hits);
    // b.com: hitCount 2 (highest) should be first.
    expect(pool[0]!.url).toBe("https://b.com");
    // Among the remaining hitCount-1 entries, higher score wins tie-break after engine count.
    const rest = pool.slice(1);
    expect(rest[0]!.url).toBe("https://c.com"); // 3 engines from a single hit > 1 engine
    expect(rest[1]!.url).toBe("https://a.com");
  });

  test("empty inputs produce an empty pool", () => {
    expect(mergeAndRank([], [])).toEqual([]);
  });
});
