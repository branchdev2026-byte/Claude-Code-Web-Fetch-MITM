import { realFetch } from "../realFetch";
import { callLlm } from "./llm";
import { buildEnrichExtractPrompt } from "./prompts";
import type { PoolEntry, SummaryLlmConfig } from "./types";
// 不能 `import TurndownService from "turndown"`——2026-09-02 Phase 16 真实链路验证实测
// 发现：Claude Code 自身是 `bun build --compile` 编译出的单文件可执行程序，其内嵌 Bun
// 运行时对通过 `--preload` 注入的外部脚本，只支持相对/绝对路径的文件 import，不支持任何
// bare specifier 的 npm 包解析（与 node_modules 是否存在无关，是编译产物本身的限制）。
// 改用 `scripts/build-vendor.ts` 预先打包好的单文件 bundle（turndown 版本升级时用
// `bun run vendor:turndown` 重新生成），import 路径是相对文件路径，不受这个限制影响。
import TurndownService from "./vendor/turndown.bundle.js";
// 类型专用：`import type ... = require(...)` 在编译期完全擦除，不产生任何运行时 import
// 语句，因此不受上面那条限制影响；只是为了拿到 turndown 的 `Filter` 等命名空间类型。
import type TurndownServiceNS = require("turndown");

// 设计文档第 8 节：富化头部来源全文。抓取用项目已有的 realFetch，转 markdown 用 turndown
// （2026-09-02 实测对比过 HTMLRewriter，见设计第 8 节；vendored bundle 而非 npm 运行时
// 依赖的理由见上），提炼用 DeepSeek Flash。单条失败不影响其他条目、不影响整体流程（保留
// 原始检索摘录）。

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 1.5 * 1024 * 1024; // 1.5MB，控制 turndown 解析耗时
const MARKDOWN_MAX_CHARS = 8_000;
const ENRICH_TEMPERATURE = 0;
const HTML_LIKE_CONTENT_TYPES = ["text/html", "text/plain"];

async function readBodyCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      const keep = value.byteLength - (total - maxBytes);
      if (keep > 0) chunks.push(value.subarray(0, keep));
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(chunks.reduce((sum, c) => sum + c.byteLength, 0));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function enrichOne(
  entry: PoolEntry,
  query: string,
  summaryLlmConfig: SummaryLlmConfig,
  signal: AbortSignal,
): Promise<PoolEntry> {
  try {
    const callSignal = AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]);

    const res = await realFetch(entry.url, { signal: callSignal, redirect: "follow" });
    if (!res.ok) throw new Error(`fetch http ${res.status}`);

    const contentType = res.headers.get("content-type") ?? "";
    if (!HTML_LIKE_CONTENT_TYPES.some((t) => contentType.includes(t))) {
      // 非 HTML/纯文本内容（PDF、图片等）：本设计不处理，原样保留检索后端摘录。
      return entry;
    }

    const html = await readBodyCapped(res, MAX_BODY_BYTES);

    const turndownService = new TurndownService();
    // @types/turndown 的 TagName 类型取自 HTMLElementTagNameMap，不含 "svg"（那是
    // SVGElementTagNameMap 里的键）——turndown 运行时只按标签名字符串匹配，这个类型缺口
    // 不影响实际行为，这里按 Filter 类型断言绕过，不改动实际传入的标签列表。
    turndownService.remove(["script", "style", "noscript", "iframe", "svg"] as unknown as TurndownServiceNS.Filter);
    const markdown = turndownService.turndown(html).slice(0, MARKDOWN_MAX_CHARS);

    const extracted = await callLlm(
      {
        baseUrl: summaryLlmConfig.baseUrl,
        apiKey: summaryLlmConfig.apiKey,
        model: summaryLlmConfig.model,
        sort: summaryLlmConfig.sort,
        temperature: ENRICH_TEMPERATURE,
      },
      buildEnrichExtractPrompt(query, markdown),
      callSignal,
    );

    return { ...entry, content: extracted, enriched: true };
  } catch (err) {
    console.error(`[webfetch-mitm] websearch enrich failed for ${entry.url}: ${String(err)}`);
    return entry;
  }
}

export async function enrichTop(
  pool: PoolEntry[],
  fetchTopN: number,
  query: string,
  summaryLlmConfig: SummaryLlmConfig,
  signal: AbortSignal,
): Promise<PoolEntry[]> {
  if (fetchTopN <= 0) return [];
  return Promise.all(pool.slice(0, fetchTopN).map((entry) => enrichOne(entry, query, summaryLlmConfig, signal)));
}
