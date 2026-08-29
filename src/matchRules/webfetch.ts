import type { AnthropicMessagesRequestBody, MatchRule } from "./types";

// 设计文档第 2 节的严格信号前缀。
const STRICT_PREFIX = "\nWeb page content:\n---";

// 模板固定结构（ref 文档第 2 节），用于从命中的文本里拆出 pageMarkdown / userPrompt。
const FIXED_HEADER = "\nWeb page content:\n---\n";
const MIDDLE_SEP = "\n---\n\n";
const FIXED_TAIL = "\n\nProvide a concise response based only on the content above. In your response:";

export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

function firstText(body: AnthropicMessagesRequestBody): string | undefined {
  return body.messages?.[0]?.content?.[0]?.text;
}

export const webfetchRule: MatchRule = {
  id: "webfetch",
  looseMatch(body) {
    return body.model === HAIKU_MODEL && Array.isArray(body.tools) && body.tools.length === 0;
  },
  strictMatch(body) {
    const text = firstText(body);
    return typeof text === "string" && text.startsWith(STRICT_PREFIX);
  },
};

export interface WebFetchInputs {
  pageMarkdown: string;
  userPrompt: string;
}

export function extractWebFetchInputs(body: AnthropicMessagesRequestBody): WebFetchInputs | null {
  const text = firstText(body);
  if (typeof text !== "string" || !text.startsWith(FIXED_HEADER)) return null;

  const tailIdx = text.indexOf(FIXED_TAIL);
  if (tailIdx === -1) return null;

  const beforeTail = text.slice(FIXED_HEADER.length, tailIdx);
  const sepIdx = beforeTail.lastIndexOf(MIDDLE_SEP);
  if (sepIdx === -1) return null;

  return {
    pageMarkdown: beforeTail.slice(0, sepIdx),
    userPrompt: beforeTail.slice(sepIdx + MIDDLE_SEP.length),
  };
}
