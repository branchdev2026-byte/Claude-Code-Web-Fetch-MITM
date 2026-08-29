export interface AnthropicMessagesRequestBody {
  model?: string;
  messages?: Array<{
    role: string;
    content: Array<{ type: string; text?: string }>;
  }>;
  tools?: unknown[];
  [key: string]: unknown;
}

export interface MatchRule {
  id: string;
  looseMatch(body: AnthropicMessagesRequestBody): boolean;
  strictMatch(body: AnthropicMessagesRequestBody): boolean;
}

export type MatchLevel = "strict" | "loose" | "none";
