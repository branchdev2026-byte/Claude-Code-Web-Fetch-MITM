import type { AnthropicMessagesRequestBody, MatchRule } from "./types";

// 设计文档第 9.1 节：WebSearch 触发时 CC 拆出一个独立的 Haiku 子请求执行实际搜索，
// 体量极小（~2KB，messages 只有 1 条），与主对话请求（110KB+，含完整历史）结构上截然
// 不同。信号是结构化字段，不是文本前缀——比 webfetch 规则更抗版本号漂移（web_search_20250305/
// 20260209/20260318 等版本号都能被前缀匹配覆盖）。实测原文见
// doc/ref/2026-09-02_websearch-haiku子请求实测抓包.md 第 3 节。
const WEB_SEARCH_TOOL_NAME = "web_search";
const WEB_SEARCH_TYPE_PREFIX = "web_search_";
const QUERY_PREFIX = "Perform a web search for the query: ";
// 设计文档第 12 节信号 B：`useHaiku` 关闭时 CC 不发 tool_choice 强制字段，改用这句固定
// system 文案标识这是一次 websearch 子请求——跟信号 A（tool_choice 强制）互为补充，覆盖
// `useHaiku` 开关的两种状态。
const SYSTEM_MARKER = "You are an assistant for performing a web search tool use";

function hasWebSearchToolByName(body: AnthropicMessagesRequestBody): boolean {
  if (!Array.isArray(body.tools)) return false;
  return body.tools.some(
    (t) => typeof t === "object" && t !== null && (t as Record<string, unknown>).name === WEB_SEARCH_TOOL_NAME,
  );
}

function hasStrictWebSearchTool(body: AnthropicMessagesRequestBody): boolean {
  if (!Array.isArray(body.tools)) return false;
  return body.tools.some((t) => {
    if (typeof t !== "object" || t === null) return false;
    const rec = t as Record<string, unknown>;
    return (
      rec.name === WEB_SEARCH_TOOL_NAME &&
      typeof rec.type === "string" &&
      rec.type.startsWith(WEB_SEARCH_TYPE_PREFIX)
    );
  });
}

function toolChoiceForcesWebSearch(body: AnthropicMessagesRequestBody): boolean {
  const toolChoice = body.tool_choice as Record<string, unknown> | undefined;
  return typeof toolChoice === "object" && toolChoice !== null && toolChoice.name === WEB_SEARCH_TOOL_NAME;
}

function hasSystemMarker(body: AnthropicMessagesRequestBody): boolean {
  const system = body.system as unknown;
  return (
    Array.isArray(system) &&
    system.some((s) => typeof s === "object" && s !== null && (s as Record<string, unknown>).text === SYSTEM_MARKER)
  );
}

function lastUserMessageHasQueryPrefix(body: AnthropicMessagesRequestBody): boolean {
  return extractWebSearchQuery(body) !== null;
}

export const websearchRule: MatchRule = {
  id: "websearch",
  // 宽信号：工具列表里存在叫 web_search 的条目，不要求 tool_choice/type 精确匹配。
  looseMatch(body) {
    return hasWebSearchToolByName(body);
  },
  // 严格信号（设计文档第 12 节，A、B 任一成立即命中，覆盖 useHaiku 开关的两种状态）：
  // A：tool_choice 强制指向 web_search，且工具定义里 type 是官方服务端工具前缀。
  // B：system 里有固定文案标记这是一次 websearch 子请求，且工具定义匹配，且最后一条
  //    user 消息带查询前缀——useHaiku 关闭时 CC 不发 tool_choice，靠这三个信号组合识别。
  strictMatch(body) {
    return (
      (toolChoiceForcesWebSearch(body) && hasStrictWebSearchTool(body)) ||
      (hasSystemMarker(body) && hasStrictWebSearchTool(body) && lastUserMessageHasQueryPrefix(body))
    );
  },
};

// 最后一条 user 消息文本匹配固定前缀，取其后全部文本作为 query。比 webfetch 的双字段提取
// （pageMarkdown/userPrompt）更简单，不需要从中间摘取。
export function extractWebSearchQuery(body: AnthropicMessagesRequestBody): string | null {
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const last = messages[messages.length - 1];
  const text = last?.content?.[0]?.text;
  if (typeof text !== "string" || !text.startsWith(QUERY_PREFIX)) return null;
  const query = text.slice(QUERY_PREFIX.length);
  return query.length > 0 ? query : null;
}
