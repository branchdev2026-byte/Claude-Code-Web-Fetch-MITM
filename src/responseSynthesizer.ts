// 合成与 Anthropic /v1/messages 流式响应同构的 SSE 流。
// 事件结构、扩展字段来自实测原文（doc/ref/2026-08-29_webfetch-haiku完整prompt模板-实测抓取.md 第 4.1 节）。

function randomMessageId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `msg_${hex}`;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function buildSyntheticSSE(originalModel: string, text: string): string {
  const messageId = randomMessageId();
  const inputTokens = 0;
  const outputTokens = 0;

  const messageStart = sseEvent("message_start", {
    type: "message_start",
    message: {
      model: originalModel,
      id: messageId,
      type: "message",
      role: "assistant",
      content: [],
      stop_reason: null,
      stop_sequence: null,
      stop_details: null,
      usage: {
        input_tokens: inputTokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
        output_tokens: 0,
        service_tier: "standard",
        inference_geo: "not_available",
      },
    },
  });

  const contentBlockStart = sseEvent("content_block_start", {
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" },
  });

  const ping = sseEvent("ping", { type: "ping" });

  const contentBlockDelta = sseEvent("content_block_delta", {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text },
  });

  const contentBlockStop = sseEvent("content_block_stop", { type: "content_block_stop", index: 0 });

  const messageDelta = sseEvent("message_delta", {
    type: "message_delta",
    delta: { stop_reason: "end_turn", stop_sequence: null, stop_details: null },
    usage: {
      input_tokens: inputTokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: outputTokens,
      iterations: [
        {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
          type: "message",
        },
      ],
    },
    context_management: { applied_edits: [] },
  });

  const messageStop = sseEvent("message_stop", { type: "message_stop" });

  return (
    messageStart +
    contentBlockStart +
    ping +
    contentBlockDelta +
    contentBlockStop +
    messageDelta +
    messageStop
  );
}

export function buildSyntheticResponse(originalModel: string, text: string): Response {
  const sse = buildSyntheticSSE(originalModel, text);
  return new Response(sse, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

