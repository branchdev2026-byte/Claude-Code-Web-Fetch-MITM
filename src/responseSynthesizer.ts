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

function randomServerToolUseId(): string {
  return `srvtoolu_${randomMessageId().slice(4)}`;
}

// 设计文档第 9.3、11 节：父级 Sonnet 收到的 tool_result 里，Links 列表是 CC 客户端从
// web_search_tool_result 内容块提取 title/url 拼出来的固定模板文本；第三块 text 的内容会
// 原文逐字穿透到 tool_result，主循环拿它作答（
// doc/report/research/2026-09-02_websearch客户端全链路与拦截点分析.md 第 3.1 节实测确认）。
// 前两个内容块都是完整块、非增量——跟 webfetch 的纯文本 delta 流式不同，官方文档
// （doc/ref/2026-09-02_websearch-haiku子请求实测抓包.md 第 6 节）确认 web_search_tool_result
// 不拆 delta，一次性给出完整 content 数组；第三个 text 块本身仍然是"一次性给出完整
// summary"的单个 delta，不逐字拆，跟 webfetch 的多次增量 delta 不同。
export function buildWebSearchSyntheticSSE(
  originalModel: string,
  query: string,
  sources: Array<{ title: string; url: string }>,
  summary: string,
): string {
  const messageId = randomMessageId();
  const toolUseId = randomServerToolUseId();

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
      usage: {
        input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 0,
        service_tier: "standard",
      },
    },
  });

  const serverToolUseStart = sseEvent("content_block_start", {
    type: "content_block_start",
    index: 0,
    content_block: { type: "server_tool_use", id: toolUseId, name: "web_search", input: { query } },
  });
  const serverToolUseStop = sseEvent("content_block_stop", { type: "content_block_stop", index: 0 });

  const searchResultStart = sseEvent("content_block_start", {
    type: "content_block_start",
    index: 1,
    content_block: {
      type: "web_search_tool_result",
      tool_use_id: toolUseId,
      content: sources.map((r) => ({ type: "web_search_result", url: r.url, title: r.title })),
    },
  });
  const searchResultStop = sseEvent("content_block_stop", { type: "content_block_stop", index: 1 });

  // 第三块（index 2）仅当 summary 非空才发——responseSynthesizer 据 WebSearchResult.summary
  // 是否为空字符串决定发不发这一块，空字符串是汇总阶段降级的合法返回（设计第 4、13 节），
  // 效果等价于原生 WebSearch（只有链接列表，没有综述正文）。索引沿用现有代码"按实际写出的
  // 块顺序累加"的写法，summary 为空时不需要为空场景特殊处理索引。
  const summaryBlocks =
    summary.length > 0
      ? sseEvent("content_block_start", {
          type: "content_block_start",
          index: 2,
          content_block: { type: "text", text: "" },
        }) +
        sseEvent("content_block_delta", {
          type: "content_block_delta",
          index: 2,
          delta: { type: "text_delta", text: summary },
        }) +
        sseEvent("content_block_stop", { type: "content_block_stop", index: 2 })
      : "";

  const messageDelta = sseEvent("message_delta", {
    type: "message_delta",
    delta: { stop_reason: "end_turn", stop_sequence: null },
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      server_tool_use: { web_search_requests: 1 },
    },
  });

  const messageStop = sseEvent("message_stop", { type: "message_stop" });

  return (
    messageStart +
    serverToolUseStart +
    serverToolUseStop +
    searchResultStart +
    searchResultStop +
    summaryBlocks +
    messageDelta +
    messageStop
  );
}

export function buildWebSearchSyntheticResponse(
  originalModel: string,
  query: string,
  sources: Array<{ title: string; url: string }>,
  summary: string,
): Response {
  const sse = buildWebSearchSyntheticSSE(originalModel, query, sources, summary);
  return new Response(sse, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

