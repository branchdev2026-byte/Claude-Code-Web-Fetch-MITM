import { realFetch } from "../../realFetch";
import type { RawHit } from "../types";

// 设计文档第 6.2 节。检索后端在本层再抽一层接口——本设计只实现 SearXNG，换成按次计费的
// 搜索 API 只需新增一个实现并改 config，第 5、7 节流程与排序逻辑不变。
export interface SearchBackend {
  search(subQuery: string, signal: AbortSignal): Promise<RawHit[]>;
}

const PER_QUERY_TIMEOUT_MS = 10_000;

// resolveUrl 而不是一个固定字符串——SEARXNG_URL 已设置时调用方传一个返回固定配置值的
// trivial 函数；未设置时直接传 ensureManagedSearxngRunning（内部有 promise 缓存，重复调用
// 不会重复触发启动逻辑）。两种来源对这里的逻辑完全透明。
export function createSearxngBackend(resolveUrl: () => Promise<string | null>, categories: string): SearchBackend {
  return {
    async search(subQuery: string, signal: AbortSignal): Promise<RawHit[]> {
      try {
        const baseUrl = await resolveUrl();
        if (!baseUrl) throw new Error("no searxng backend available");

        const url = new URL("/search", baseUrl);
        url.searchParams.set("q", subQuery);
        url.searchParams.set("format", "json");
        url.searchParams.set("categories", categories);
        url.searchParams.set("safesearch", "0");

        // 派生一个更短的 signal：单条子查询调用超时固定 10 秒，或外层 signal 先触发，
        // 两者取先到者——不需要在这里另外计算"剩余时间预算"，外层 signal 已经代表它。
        const callSignal = AbortSignal.any([signal, AbortSignal.timeout(PER_QUERY_TIMEOUT_MS)]);

        const res = await realFetch(url, { signal: callSignal });
        if (!res.ok) throw new Error(`searxng http ${res.status}`);

        const json: any = await res.json();
        const results = Array.isArray(json?.results) ? json.results : [];

        const hits: RawHit[] = [];
        for (const r of results) {
          if (typeof r?.title !== "string" || typeof r?.url !== "string") continue;
          hits.push({
            title: r.title,
            url: r.url,
            content: typeof r.content === "string" ? r.content : "",
            score: typeof r.score === "number" ? r.score : 0,
            engines: Array.isArray(r.engines) ? r.engines.filter((e: unknown) => typeof e === "string") : [],
          });
        }
        return hits;
      } catch (err) {
        // HTTP 错误/超时/JSON 解析失败/无可用后端：这条子查询贡献 0 条结果，不向上抛
        // （设计第 6.2 节）——调用方（provider.ts 的一整轮）按"这条子查询没结果"处理即可，
        // 是否"整轮全失败"由调用方汇总多条子查询的结果后自己判断。
        console.error(`[webfetch-mitm] searxng search failed for subquery ${JSON.stringify(subQuery)}: ${String(err)}`);
        return [];
      }
    },
  };
}
