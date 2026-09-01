import type { Config } from "../config";
import type { AnthropicMessagesRequestBody, MatchLevel, MatchRule } from "./types";
import { webfetchRule } from "./webfetch";
import { websearchRule } from "./websearch";

// websearchRule 跟 webfetchRule 一样走 config.enableTargets 开关（需要在
// WEBFETCH_MITM_ENABLE_TARGETS 里显式加上 "websearch" 才会参与匹配）。命中后 interceptor.ts
// 走占位 provider 转发，见设计文档第 9 节、providers/websearchStub.ts。
const ALL_RULES: MatchRule[] = [webfetchRule, websearchRule];

export interface MatchResult {
  rule: MatchRule;
  level: MatchLevel;
}

export function buildEnabledRules(config: Config): MatchRule[] {
  const enabled = new Set(config.enableTargets);
  return ALL_RULES.filter((rule) => enabled.has(rule.id));
}

export function matchRequest(
  body: AnthropicMessagesRequestBody,
  enabledRules: MatchRule[],
): MatchResult | null {
  for (const rule of enabledRules) {
    if (rule.strictMatch(body)) return { rule, level: "strict" };
    if (rule.looseMatch(body)) return { rule, level: "loose" };
  }
  return null;
}
