import { describe, expect, test } from "bun:test";
import {
  buildSyntheticResponse,
  buildSyntheticSSE,
  buildWebSearchSyntheticResponse,
  buildWebSearchSyntheticSSE,
} from "../src/responseSynthesizer";

function parseSSE(text: string): Array<{ event: string; data: any }> {
  const events: Array<{ event: string; data: any }> = [];
  const blocks = text.split("\n\n").filter((b) => b.trim().length > 0);
  for (const block of blocks) {
    const lines = block.split("\n");
    const eventLine = lines.find((l) => l.startsWith("event: "));
    const dataLine = lines.find((l) => l.startsWith("data: "));
    if (!eventLine || !dataLine) continue;
    events.push({
      event: eventLine.slice("event: ".length),
      data: JSON.parse(dataLine.slice("data: ".length)),
    });
  }
  return events;
}

describe("buildSyntheticSSE", () => {
  test("event sequence matches ref doc §4.1 order", () => {
    const sse = buildSyntheticSSE("claude-haiku-4-5-20251001", "hello world");
    const events = parseSSE(sse);
    expect(events.map((e) => e.event)).toEqual([
      "message_start",
      "content_block_start",
      "ping",
      "content_block_delta",
      "content_block_stop",
      "message_delta",
      "message_stop",
    ]);
  });

  test("delta text carries the provider text and model is echoed back", () => {
    const sse = buildSyntheticSSE("claude-haiku-4-5-20251001", "the summary text");
    const events = parseSSE(sse);
    const start = events.find((e) => e.event === "message_start")!;
    expect(start.data.message.model).toBe("claude-haiku-4-5-20251001");

    const delta = events.find((e) => e.event === "content_block_delta")!;
    expect(delta.data.delta.text).toBe("the summary text");

    const messageDelta = events.find((e) => e.event === "message_delta")!;
    expect(messageDelta.data.delta.stop_reason).toBe("end_turn");
  });

  test("extension fields from ref doc are present as placeholders", () => {
    const sse = buildSyntheticSSE("claude-haiku-4-5-20251001", "x");
    const events = parseSSE(sse);
    const start = events.find((e) => e.event === "message_start")!;
    expect(start.data.message.usage).toHaveProperty("cache_creation");
    expect(start.data.message.usage).toHaveProperty("inference_geo");

    const messageDelta = events.find((e) => e.event === "message_delta")!;
    expect(messageDelta.data.usage).toHaveProperty("iterations");
    expect(messageDelta.data).toHaveProperty("context_management");
  });
});

describe("buildSyntheticResponse", () => {
  test("returns a Response with text/event-stream content-type", async () => {
    const res = buildSyntheticResponse("claude-haiku-4-5-20251001", "hi");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    const text = await res.text();
    expect(text).toContain("event: message_start");
  });
});

// 设计文档第 9.3 节：websearch 合成响应的两个内容块都是完整块、非增量，跟 webfetch 的
// 纯文本 delta 流式不同——doc/ref/2026-09-02_websearch-haiku子请求实测抓包.md 第 6 节
// 确认官方 web_search_tool_result 不拆 delta。
const sampleWebSearchResults = [{ title: "Bun docs", url: "https://bun.sh/docs" }];

describe("buildWebSearchSyntheticSSE", () => {
  const results = sampleWebSearchResults;

  test("empty summary: two blocks only, event sequence has no text/delta blocks", () => {
    const sse = buildWebSearchSyntheticSSE("claude-haiku-4-5-20251001", "bun version", results, "");
    const events = parseSSE(sse);
    expect(events.map((e) => e.event)).toEqual([
      "message_start",
      "content_block_start",
      "content_block_stop",
      "content_block_start",
      "content_block_stop",
      "message_delta",
      "message_stop",
    ]);
  });

  test("server_tool_use block carries the query, web_search_tool_result carries title/url and matches tool_use_id", () => {
    const sse = buildWebSearchSyntheticSSE("claude-haiku-4-5-20251001", "bun version", results, "");
    const events = parseSSE(sse);
    const starts = events.filter((e) => e.event === "content_block_start");

    const serverToolUse = starts[0]!.data.content_block;
    expect(serverToolUse.type).toBe("server_tool_use");
    expect(serverToolUse.name).toBe("web_search");
    expect(serverToolUse.input).toEqual({ query: "bun version" });

    const searchResult = starts[1]!.data.content_block;
    expect(searchResult.type).toBe("web_search_tool_result");
    expect(searchResult.tool_use_id).toBe(serverToolUse.id);
    expect(searchResult.content).toEqual([
      { type: "web_search_result", url: results[0]!.url, title: results[0]!.title },
    ]);

    const messageDelta = events.find((e) => e.event === "message_delta")!;
    expect(messageDelta.data.delta.stop_reason).toBe("end_turn");
    expect(messageDelta.data.usage.server_tool_use.web_search_requests).toBe(1);
  });

  test("empty result list produces an empty content array, not an error shape", () => {
    const sse = buildWebSearchSyntheticSSE("claude-haiku-4-5-20251001", "no results query", [], "");
    const events = parseSSE(sse);
    const searchResultBlock = events.filter((e) => e.event === "content_block_start")[1]!.data.content_block;
    expect(searchResultBlock.content).toEqual([]);
  });

  // 设计文档第 11 节：summary 非空时新增第三块 text（index 2），一次性给出完整 summary
  // 作为单个 delta，不逐字拆——跟前两块一样是"完整块"语义，只是走 delta 通道。
  test("non-empty summary: three blocks, the third is a text block carrying the full summary as one delta", () => {
    const sse = buildWebSearchSyntheticSSE("claude-haiku-4-5-20251001", "bun version", results, "Bun is a fast JS runtime [1].");
    const events = parseSSE(sse);
    expect(events.map((e) => e.event)).toEqual([
      "message_start",
      "content_block_start",
      "content_block_stop",
      "content_block_start",
      "content_block_stop",
      "content_block_start",
      "content_block_delta",
      "content_block_stop",
      "message_delta",
      "message_stop",
    ]);

    const starts = events.filter((e) => e.event === "content_block_start");
    expect(starts[2]!.data.index).toBe(2);
    expect(starts[2]!.data.content_block).toEqual({ type: "text", text: "" });

    const delta = events.find((e) => e.event === "content_block_delta")!;
    expect(delta.data.index).toBe(2);
    expect(delta.data.delta).toEqual({ type: "text_delta", text: "Bun is a fast JS runtime [1]." });
  });
});

describe("buildWebSearchSyntheticResponse", () => {
  test("returns a Response with text/event-stream content-type", async () => {
    const res = buildWebSearchSyntheticResponse("claude-haiku-4-5-20251001", "q", sampleWebSearchResults, "a summary [1].");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    const text = await res.text();
    expect(text).toContain("event: message_start");
    expect(text).toContain("web_search_tool_result");
    expect(text).toContain("a summary [1].");
  });
});

