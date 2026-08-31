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

export interface Config {
  enableTargets: string[];
  provider: "openrouter" | "zai" | null;
  openrouter: {
    apiKey: string | null;
    models: string[];
    providers: string[] | null;
    // OpenRouter 算力商路由排序偏好（provider.sort）。null = 不发这个字段，用
    // OpenRouter 默认（按价格升序，会落到最便宜也最慢的端点）。
    sort: "throughput" | "latency" | "price" | null;
  };
  zai: {
    apiKey: string | null;
    models: string[];
  };
  promptFile: string | null;
}

const DEFAULT_OPENROUTER_MODELS = "deepseek/deepseek-v4-flash-0731";
const DEFAULT_ZAI_MODELS = "glm-4.7-flashx,glm-4.7-flash,glm-4.5-flash";

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

  // 未设置 → 默认 throughput（WebFetch 卡在 CC 主循环上，延迟优先）。
  // 显式设为空字符串 → null（回退到 OpenRouter 默认按价格路由）。
  const openrouterSortRaw = process.env.WEBFETCH_MITM_OPENROUTER_SORT;
  const openrouterSort =
    openrouterSortRaw === undefined
      ? "throughput"
      : openrouterSortRaw.trim() === ""
        ? null
        : openrouterSortRaw.trim();
  if (
    openrouterSort !== null &&
    openrouterSort !== "throughput" &&
    openrouterSort !== "latency" &&
    openrouterSort !== "price"
  ) {
    throw new Error(
      `WEBFETCH_MITM_OPENROUTER_SORT must be "throughput", "latency", "price" or empty, got: ${JSON.stringify(openrouterSortRaw)}`,
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
      sort: openrouterSort as "throughput" | "latency" | "price" | null,
    },
    zai: {
      apiKey: process.env.WEBFETCH_MITM_ZAI_API_KEY?.trim() || null,
      models: splitCsv(process.env.WEBFETCH_MITM_ZAI_MODELS ?? DEFAULT_ZAI_MODELS),
    },
    promptFile: process.env.WEBFETCH_MITM_PROMPT_FILE?.trim() || null,
  };
}
