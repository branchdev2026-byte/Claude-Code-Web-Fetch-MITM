import { describe, expect, test } from "bun:test";
import { buildSyntheticResponse, buildSyntheticSSE } from "../src/responseSynthesizer";

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

