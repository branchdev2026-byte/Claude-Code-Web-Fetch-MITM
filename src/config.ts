import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 项目根用脚本自身路径反推，不依赖 claude 进程实际的 cwd（见 plan Phase 1）。
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadDotenv(): void {
  const envPath = join(PROJECT_ROOT, ".env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  const parsed = parseEnvFile(text);
  for (const [key, val] of Object.entries(parsed)) {
    // 已存在的环境变量（外部注入）优先于 .env 文件内容。
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function splitCsv(val: string | undefined): string[] {
  if (!val) return [];
  return val
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// OpenRouter 算力商路由排序偏好（provider.sort）。null = 不发这个字段，用 OpenRouter 默认
// （按价格升序，会落到最便宜也最慢的端点）。webfetch 的 OPENROUTER_SORT 与 websearch 的
// REASON_SORT/SUMMARY_SORT 三处共用同一个取值集合与解析规则（parseSortOption）。
export type SortOption = "throughput" | "latency" | "price" | null;

export interface Config {
  enableTargets: string[];
  provider: "openrouter" | "zai" | null;
  openrouter: {
    apiKey: string | null;
    models: string[];
    providers: string[] | null;
    sort: SortOption;
  };
  zai: {
    apiKey: string | null;
    models: string[];
  };
  promptFile: string | null;
  websearch: {
    backend: "searxng";
    searxng: {
      // null 是默认、推荐状态（自管理，见 websearch/backends/searxngLifecycle.ts），不是
      // "没配置"的异常态——不要把它当缺配置去改。只有明确要接一个外部/共享实例时才会是
      // 非 null 值。
      url: string | null;
      categories: string;
    };
    reason: {
      apiKey: string | null;
      baseUrl: string;
      model: string;
      effort: string;
      sort: SortOption;
    };
    summary: {
      apiKey: string | null;
      baseUrl: string;
      model: string;
      sort: SortOption;
    };
    maxSources: number;
  };
}

const DEFAULT_OPENROUTER_MODELS = "deepseek/deepseek-v4-flash-0731";
const DEFAULT_ZAI_MODELS = "glm-4.7-flashx,glm-4.7-flash,glm-4.5-flash";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_WEBSEARCH_REASON_MODEL = "moonshotai/kimi-k3";
const DEFAULT_WEBSEARCH_REASON_EFFORT = "low";
const DEFAULT_WEBSEARCH_SUMMARY_MODEL = "deepseek/deepseek-v4-flash-0731";
const DEFAULT_WEBSEARCH_SEARXNG_CATEGORIES = "general";
const DEFAULT_WEBSEARCH_MAX_SOURCES = 20;

// 未设置 → 用调用方传入的默认值。显式设为空字符串 → null（回退到 OpenRouter 默认按价格
// 路由）。三处调用点（webfetch 的 OPENROUTER_SORT、websearch 的 REASON_SORT/SUMMARY_SORT）
// 共用同一套校验规则，各自的默认值不同（webfetch 默认 throughput，websearch 两处默认
// latency，理由见设计文档第 10.2 节）。
function parseSortOption(envVarName: string, raw: string | undefined, defaultValue: SortOption): SortOption {
  if (raw === undefined) return defaultValue;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed === "throughput" || trimmed === "latency" || trimmed === "price") return trimmed;
  throw new Error(`${envVarName} must be "throughput", "latency", "price" or empty, got: ${JSON.stringify(raw)}`);
}

export function loadConfig(): Config {
  loadDotenv();

  const enableTargetsRaw = process.env.WEBFETCH_MITM_ENABLE_TARGETS ?? "webfetch";
  const enableTargets = splitCsv(enableTargetsRaw);

  const providerRaw = process.env.WEBFETCH_MITM_PROVIDER?.trim() || null;
  if (providerRaw !== null && providerRaw !== "openrouter" && providerRaw !== "zai") {
    throw new Error(
      `WEBFETCH_MITM_PROVIDER must be "openrouter" or "zai", got: ${JSON.stringify(providerRaw)}`,
    );
  }

  const openrouterProvidersRaw = process.env.WEBFETCH_MITM_OPENROUTER_PROVIDERS;
  const openrouterProviders = openrouterProvidersRaw ? splitCsv(openrouterProvidersRaw) : null;

  // WebFetch 卡在 CC 主循环上，默认按延迟优先的近似值 throughput（长流式摘要场景，见
  // openrouter.ts）。
  const openrouterSort = parseSortOption(
    "WEBFETCH_MITM_OPENROUTER_SORT",
    process.env.WEBFETCH_MITM_OPENROUTER_SORT,
    "throughput",
  );

  const reasonApiKey = process.env.WEBFETCH_MITM_WEBSEARCH_REASON_API_KEY?.trim() || null;
  // SUMMARY_API_KEY 未配置时回退用 REASON_API_KEY——两者通常是同一个 OpenRouter 账号
  // （设计文档第 3 节）。
  const summaryApiKey = process.env.WEBFETCH_MITM_WEBSEARCH_SUMMARY_API_KEY?.trim() || reasonApiKey;

  const searxngUrl = process.env.WEBFETCH_MITM_WEBSEARCH_SEARXNG_URL?.trim() || null;

  const maxSourcesRaw = process.env.WEBFETCH_MITM_WEBSEARCH_MAX_SOURCES?.trim();
  const maxSources = maxSourcesRaw ? Number.parseInt(maxSourcesRaw, 10) : DEFAULT_WEBSEARCH_MAX_SOURCES;
  if (!Number.isFinite(maxSources) || maxSources < 0) {
    throw new Error(
      `WEBFETCH_MITM_WEBSEARCH_MAX_SOURCES must be a non-negative integer, got: ${JSON.stringify(maxSourcesRaw)}`,
    );
  }

  return {
    enableTargets,
    provider: providerRaw as "openrouter" | "zai" | null,
    openrouter: {
      apiKey: process.env.WEBFETCH_MITM_OPENROUTER_API_KEY?.trim() || null,
      models: splitCsv(
        process.env.WEBFETCH_MITM_OPENROUTER_MODELS ?? DEFAULT_OPENROUTER_MODELS,
      ),
      providers: openrouterProviders && openrouterProviders.length > 0 ? openrouterProviders : null,
      sort: openrouterSort,
    },
    zai: {
      apiKey: process.env.WEBFETCH_MITM_ZAI_API_KEY?.trim() || null,
      models: splitCsv(process.env.WEBFETCH_MITM_ZAI_MODELS ?? DEFAULT_ZAI_MODELS),
    },
    promptFile: process.env.WEBFETCH_MITM_PROMPT_FILE?.trim() || null,
    websearch: {
      backend: "searxng",
      searxng: {
        url: searxngUrl,
        categories:
          process.env.WEBFETCH_MITM_WEBSEARCH_SEARXNG_CATEGORIES?.trim() || DEFAULT_WEBSEARCH_SEARXNG_CATEGORIES,
      },
      reason: {
        apiKey: reasonApiKey,
        baseUrl: process.env.WEBFETCH_MITM_WEBSEARCH_REASON_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL,
        model: process.env.WEBFETCH_MITM_WEBSEARCH_REASON_MODEL?.trim() || DEFAULT_WEBSEARCH_REASON_MODEL,
        effort: process.env.WEBFETCH_MITM_WEBSEARCH_REASON_EFFORT?.trim() || DEFAULT_WEBSEARCH_REASON_EFFORT,
        sort: parseSortOption(
          "WEBFETCH_MITM_WEBSEARCH_REASON_SORT",
          process.env.WEBFETCH_MITM_WEBSEARCH_REASON_SORT,
          "latency",
        ),
      },
      summary: {
        apiKey: summaryApiKey,
        baseUrl: process.env.WEBFETCH_MITM_WEBSEARCH_SUMMARY_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL,
        model: process.env.WEBFETCH_MITM_WEBSEARCH_SUMMARY_MODEL?.trim() || DEFAULT_WEBSEARCH_SUMMARY_MODEL,
        sort: parseSortOption(
          "WEBFETCH_MITM_WEBSEARCH_SUMMARY_SORT",
          process.env.WEBFETCH_MITM_WEBSEARCH_SUMMARY_SORT,
          "latency",
        ),
      },
      maxSources,
    },
  };
}
