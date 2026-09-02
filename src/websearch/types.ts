// 设计文档第 4、5、6、8 节。本模块 transport 无关，不引用任何 Anthropic 类型。

// OpenRouter provider.sort 取值，llm.ts、config.ts 与本文件下面两个 LLM 配置接口共用。
export type SortOption = "throughput" | "latency" | "price" | null;

// 推理档（规划、反思，Kimi K3）与汇总档（富化提炼、最终汇总，DeepSeek Flash）的运行期配置
// ——都要求 apiKey 已经过校验非空（resolveWebSearchProvider 在构造 provider 前已经检查过，
// 见 config.ts/interceptor.ts）。
export interface ReasonLlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  effort: string;
  sort: SortOption;
}

export interface SummaryLlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  sort: SortOption;
}

// 检索后端（第 6 节）返回的单条原始结果。
export interface RawHit {
  title: string;
  url: string;
  content: string;
  score: number;
  engines: string[];
}

// 合并排序后的候选池条目（第 7 节）。`enriched` 标记 `content` 是否已被第 8 节的富化阶段
// 替换为提炼要点（而不是检索后端给的原始摘录）。
export interface PoolEntry {
  title: string;
  url: string;
  content: string;
  hitCount: number;
  engines: Set<string>;
  score: number;
  enriched: boolean;
}

// 规划阶段（planner.ts，第 5.1 节）输出。
export interface PlannerOutput {
  subQueries: string[];
  roundGuidance: number;
  fetchTopN: number;
}

// 反思阶段（reflect.ts，第 5 节步骤 3）输出。
export interface ReflectOutput {
  sufficient: boolean;
  refinedQueries: string[];
}

// provider 对外的最终产出（第 4 节）。会替换 `src/providers/types.ts` 里的旧
// `SearchResult`/`WebSearchProvider`——那边改成从这里 re-export，本模块保持不引用任何
// Anthropic 类型的约定。
export interface WebSearchResult {
  summary: string;
  sources: { title: string; url: string }[];
}

export interface WebSearchProvider {
  search(query: string, signal: AbortSignal): Promise<WebSearchResult>;
}
