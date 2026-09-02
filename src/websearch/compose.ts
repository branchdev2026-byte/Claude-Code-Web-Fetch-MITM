import { callLlm } from "./llm";
import { buildComposePrompt } from "./prompts";
import type { PoolEntry, SummaryLlmConfig } from "./types";

// 设计文档第 5 节步骤 7、10.3 节。汇总失败降级返回空字符串（不在这里 fail-open，由
// provider.ts/responseSynthesizer 处理——空 summary 时只发前两块，等价于原生 WebSearch）。
const COMPOSE_SOURCES_LIMIT = 10;
const COMPOSE_TEMPERATURE = 0.3;
const COMPOSE_MAX_CHARS = 8_000;
const SENTENCE_END_CHARS = ["。", "！", "？", ".", "!", "?"];

function truncateToSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  let lastIndex = -1;
  for (const ch of SENTENCE_END_CHARS) {
    const idx = slice.lastIndexOf(ch);
    if (idx > lastIndex) lastIndex = idx;
  }
  return lastIndex === -1 ? slice : slice.slice(0, lastIndex + 1);
}

function buildNumberedSources(pool: PoolEntry[]): string {
  return pool
    .slice(0, COMPOSE_SOURCES_LIMIT)
    .map((e, i) => `[${i + 1}] ${e.title} (${e.url})\n${e.content}`)
    .join("\n\n");
}

export async function compose(query: string, pool: PoolEntry[], llmConfig: SummaryLlmConfig, signal: AbortSignal): Promise<string> {
  try {
    const raw = await callLlm(
      {
        baseUrl: llmConfig.baseUrl,
        apiKey: llmConfig.apiKey,
        model: llmConfig.model,
        sort: llmConfig.sort,
        temperature: COMPOSE_TEMPERATURE,
      },
      buildComposePrompt(query, buildNumberedSources(pool)),
      signal,
    );
    return truncateToSentence(raw, COMPOSE_MAX_CHARS);
  } catch (err) {
    console.error(`[webfetch-mitm] websearch compose failed: ${String(err)}`);
    return "";
  }
}
