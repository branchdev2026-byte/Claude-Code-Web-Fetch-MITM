import type { PoolEntry, RawHit } from "./types";

// 设计文档第 7 节。纯函数，不发网络请求，单元测试直接覆盖。

// 导出给 provider.ts 的"收尾合并"复用（按归一化 URL 把富化结果对回候选池），避免两处各写
// 一份归一化逻辑而漂移。
export function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    // 不是合法 URL 的极端情况：按原样字符串归一，至少能在同一批结果里去重，不抛错。
    return rawUrl;
  }
}

function mergeHitInto(entry: PoolEntry, hit: RawHit): void {
  if (hit.content) {
    entry.content = entry.content ? `${entry.content}\n${hit.content}` : hit.content;
  }
  entry.hitCount += 1;
  for (const engine of hit.engines) entry.engines.add(engine);
  // score 取遇到过的最大值——同一 URL 被不同子查询召回时相关度分数可能不同，取更有信心的那次。
  if (hit.score > entry.score) entry.score = hit.score;
}

export function mergeAndRank(existingPool: PoolEntry[], newHits: RawHit[]): PoolEntry[] {
  const byNormalizedUrl = new Map<string, PoolEntry>();
  for (const entry of existingPool) {
    byNormalizedUrl.set(normalizeUrl(entry.url), entry);
  }

  for (const hit of newHits) {
    const key = normalizeUrl(hit.url);
    const existing = byNormalizedUrl.get(key);
    if (existing) {
      mergeHitInto(existing, hit);
    } else {
      byNormalizedUrl.set(key, {
        title: hit.title,
        url: hit.url,
        content: hit.content,
        hitCount: 1,
        engines: new Set(hit.engines),
        score: hit.score,
        enriched: false,
      });
    }
  }

  return Array.from(byNormalizedUrl.values()).sort((a, b) => {
    if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
    if (b.engines.size !== a.engines.size) return b.engines.size - a.engines.size;
    return b.score - a.score;
  });
}
