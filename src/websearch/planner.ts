import { callLlm } from "./llm";
import { buildPlannerPrompt } from "./prompts";
import type { PlannerOutput, ReasonLlmConfig } from "./types";

// 设计文档第 5.1、10.3 节。规划阶段数值字段解析失败时按内部默认值兜底，是对模型输出格式
// 异常的防御，不是给业务决策设上限；`subQueries` 解析失败则整体抛错（fail-open，第 13 节）。
// 不再输出 timeBudgetMs——反思循环是否继续只由反思自己的判断决定，不受任何时间预算门控
// （2026-09-02 设计修订，见 design v2 第 5、13 节）。
const DEFAULT_ROUND_GUIDANCE = 1;
const DEFAULT_FETCH_TOP_N = 0;
const PLANNER_TEMPERATURE = 0.3;

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function plan(query: string, config: ReasonLlmConfig, signal: AbortSignal): Promise<PlannerOutput> {
  const raw = await callLlm(
    {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      sort: config.sort,
      temperature: PLANNER_TEMPERATURE,
      jsonMode: true,
      reasoningEffort: config.effort,
    },
    buildPlannerPrompt(query),
    signal,
  );

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`websearch planner returned invalid JSON: ${String(err)}`);
  }

  if (
    !Array.isArray(parsed?.subQueries) ||
    parsed.subQueries.length === 0 ||
    parsed.subQueries.some((q: unknown) => typeof q !== "string")
  ) {
    throw new Error(`websearch planner response missing valid 'subQueries': ${raw}`);
  }

  return {
    subQueries: parsed.subQueries,
    roundGuidance: coerceNumber(parsed.roundGuidance, DEFAULT_ROUND_GUIDANCE),
    fetchTopN: coerceNumber(parsed.fetchTopN, DEFAULT_FETCH_TOP_N),
  };
}
