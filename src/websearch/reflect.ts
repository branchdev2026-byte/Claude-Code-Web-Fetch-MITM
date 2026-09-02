import { callLlm } from "./llm";
import { buildReflectPrompt } from "./prompts";
import type { PoolEntry, ReasonLlmConfig, ReflectOutput } from "./types";

// 设计文档第 5 节步骤 3、4。反思阶段抛错时不整体 fail-open，由 provider.ts 按第 13 节降级
// ——停止继续循环，直接用当前候选池收尾。
const REFLECT_TEMPERATURE = 0;
const EXCERPT_MAX_ENTRIES = 10;
const EXCERPT_CONTENT_MAX_CHARS = 500;

function buildPoolExcerpt(pool: PoolEntry[]): string {
  return pool
    .slice(0, EXCERPT_MAX_ENTRIES)
    .map((e, i) => `${i + 1}. ${e.title}\n${e.content.slice(0, EXCERPT_CONTENT_MAX_CHARS)}`)
    .join("\n\n");
}

export async function reflect(
  query: string,
  roundGuidance: number,
  currentRound: number,
  pool: PoolEntry[],
  config: ReasonLlmConfig,
  signal: AbortSignal,
): Promise<ReflectOutput> {
  const raw = await callLlm(
    {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      sort: config.sort,
      temperature: REFLECT_TEMPERATURE,
      jsonMode: true,
      reasoningEffort: config.effort,
    },
    buildReflectPrompt(query, roundGuidance, currentRound, buildPoolExcerpt(pool)),
    signal,
  );

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`websearch reflect returned invalid JSON: ${String(err)}`);
  }

  if (typeof parsed?.sufficient !== "boolean") {
    throw new Error(`websearch reflect response missing valid 'sufficient': ${raw}`);
  }

  const refinedQueries = Array.isArray(parsed.refinedQueries)
    ? parsed.refinedQueries.filter((q: unknown) => typeof q === "string")
    : [];

  return { sufficient: parsed.sufficient, refinedQueries };
}
