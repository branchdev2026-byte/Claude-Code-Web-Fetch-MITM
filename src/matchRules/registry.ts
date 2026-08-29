import type { Config } from "../config";
import type { AnthropicMessagesRequestBody, MatchLevel, MatchRule } from "./types";
import { webfetchRule } from "./webfetch";

const ALL_RULES: MatchRule[] = [webfetchRule];

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
