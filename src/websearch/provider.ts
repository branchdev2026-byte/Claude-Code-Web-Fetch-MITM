import type { SearchBackend } from "./backends/searxng";
import { compose } from "./compose";
import { enrichTop } from "./enrich";
import { plan } from "./planner";
import { reflect } from "./reflect";
import { mergeAndRank, normalizeUrl } from "./rank";
import type { PlannerOutput, PoolEntry, ReasonLlmConfig, SummaryLlmConfig, WebSearchProvider } from "./types";

// 设计文档第 5、9 节：编排整条搜索流程，负责时间预算与"反思循环与富化并发发起"的调度。

export interface WebSearchProviderConfig {
  backend: SearchBackend;
  reason: ReasonLlmConfig;
  summary: SummaryLlmConfig;
  maxSources: number;
}

// 第 5 节步骤 6"收尾合并"：按归一化 URL 把富化结果对回最终候选池；富化没覆盖到的条目
// （包括反思阶段补搜带入的新条目）保留原状，不为它们单独补一次富化抓取。
function mergeEnrichedIntoPool(pool: PoolEntry[], enriched: PoolEntry[]): PoolEntry[] {
  const enrichedByUrl = new Map<string, PoolEntry>();
  for (const e of enriched) {
    if (e.enriched) enrichedByUrl.set(normalizeUrl(e.url), e);
  }
  return pool.map((entry) => enrichedByUrl.get(normalizeUrl(entry.url)) ?? entry);
}

// 反思是固定环节：循环体每次进入都会跑一次反思，不由外部轮数计数器前置门控——是否继续由
// 反思自己的输出（sufficient/refinedQueries）决定；时间预算检查是唯一的停止条件，不需要
// 额外的"最大轮数"兜底（设计第 5 节步骤 3、4）。
async function reflectLoop(
  query: string,
  planOutput: PlannerOutput,
  initialPool: PoolEntry[],
  reasonConfig: ReasonLlmConfig,
  backend: SearchBackend,
  signal: AbortSignal,
  deadline: number,
): Promise<PoolEntry[]> {
  let pool = initialPool;
  let round = 1;

  while (true) {
    if (Date.now() >= deadline) break;

    let reflection: Awaited<ReturnType<typeof reflect>>;
    try {
      reflection = await reflect(query, planOutput.roundGuidance, round, pool, reasonConfig, signal);
    } catch (err) {
      console.error(`[webfetch-mitm] websearch reflect failed, stopping refinement loop: ${String(err)}`);
      break;
    }

    if (reflection.sufficient || reflection.refinedQueries.length === 0) break;

    const hits = await Promise.all(reflection.refinedQueries.map((q) => backend.search(q, signal)));
    pool = mergeAndRank(pool, hits.flat());
    round++;
  }

  return pool;
}

export function createWebSearchProvider(config: WebSearchProviderConfig): WebSearchProvider {
  return {
    async search(query: string, signal: AbortSignal) {
      const planStartedAt = Date.now();
      // 规划必须先跑，无法并发——后面所有阶段都依赖它的输出（设计第 9 节）。
      const planOutput = await plan(query, config.reason, signal);
      const deadline = planStartedAt + planOutput.timeBudgetMs;

      const round1Hits = await Promise.all(planOutput.subQueries.map((q) => config.backend.search(q, signal)));
      const flatRound1 = round1Hits.flat();
      if (flatRound1.length === 0) {
        // 第 1 轮检索全部子查询返回空 → 整体抛错，由 interceptor 走 fail-open（设计第 13 节）。
        throw new Error("websearch: first round of retrieval returned no results from any sub-query");
      }
      let pool = mergeAndRank([], flatRound1);

      // 富化基于第 1 轮候选池就能开始，跟反思循环并发发起（本设计收益最大的并发点，第 9 节）
      // ——发起但不 await，两条分支同时跑，最后再合并。
      const enrichPromise = enrichTop(pool, planOutput.fetchTopN, query, config.summary, signal);

      pool = await reflectLoop(query, planOutput, pool, config.reason, config.backend, signal, deadline);

      const enriched = await enrichPromise;
      pool = mergeEnrichedIntoPool(pool, enriched);

      // 汇总是流程的终点，必须等反思循环与富化都结束才能跑；内部已经把失败降级成 ""，
      // 这里的 .catch 只是防止任何未预期的异常从这里往外抛导致整体 fail-open（设计第 13 节：
      // 只有规划阶段和第 1 轮全失败才应该整体 fail-open）。
      const summary = await compose(query, pool, config.summary, signal).catch(() => "");

      return {
        summary,
        sources: pool.slice(0, config.maxSources).map((e) => ({ title: e.title, url: e.url })),
      };
    },
  };
}
