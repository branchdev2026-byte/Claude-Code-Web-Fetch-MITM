import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROJECT_ROOT } from "../../config";
import { realFetch } from "../../realFetch";

// 设计文档第 6.3 节：`WEBFETCH_MITM_WEBSEARCH_SEARXNG_URL` 未设置时（默认、推荐路径），本
// 项目自己管理一个本地 SearXNG 容器的生命周期——固定容器名/端口是实现细节，不做成 env；
// 只有明确要接一个外部/共享实例时才设置那个变量，那种情况下本模块整个不参与
// （backends/searxng.ts 的 resolveUrl 直接返回配置的 URL，不经过这里）。

const CONTAINER_NAME = "webfetch-mitm-searxng";
const MANAGED_PORT = 18888;
const MANAGED_URL = `http://127.0.0.1:${MANAGED_PORT}`;
// 轮询等待容器就绪的上限——进程级的一次性准备工作，跟某一次 search() 调用的时间预算无关。
const READY_TIMEOUT_MS = 10_000;
const REACHABLE_CHECK_TIMEOUT_MS = 1_000;
const POLL_INTERVAL_MS = 250;
const SETTINGS_TEMPLATE_PATH = join(PROJECT_ROOT, "docker", "searxng-settings.yml");
const SECRET_KEY_PLACEHOLDER = "REPLACED_AT_RUNTIME_WITH_RANDOM_VALUE";

let readyPromise: Promise<string | null> | null = null;

// installInterceptor() 里在 websearch 自管理路径下调用一次（不 await，让它后台跑）；
// search() 真正要用检索后端时再调用一次并 await——两处共用同一个 promise，重复调用不会
// 重复触发启动逻辑。
export function ensureManagedSearxngRunning(): Promise<string | null> {
  return (readyPromise ??= startAndWaitReady());
}

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await realFetch(url, { signal: AbortSignal.timeout(REACHABLE_CHECK_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

interface DockerResult {
  ok: boolean;
}

async function runDocker(args: string[]): Promise<DockerResult> {
  try {
    const proc = Bun.spawn(["docker", ...args], { stdout: "ignore", stderr: "ignore" });
    const exitCode = await proc.exited;
    return { ok: exitCode === 0 };
  } catch {
    // docker 命令本身不存在（ENOENT）或其他 spawn 层面异常——不让这一步抛出未处理异常，
    // 按"这次没有可用后端"处理（设计第 13 节），调用方会走轮询超时的同一条 null 返回路径。
    return { ok: false };
  }
}

function renderSettingsWithRandomKey(): string {
  const template = readFileSync(SETTINGS_TEMPLATE_PATH, "utf8");
  const secretKey = randomBytes(16).toString("hex");
  const rendered = template.replace(SECRET_KEY_PLACEHOLDER, secretKey);
  // 每个实例用不同的随机 secret_key（SearXNG 官方建议），不把固定 key 提交进仓库——
  // 仓库里的 docker/searxng-settings.yml 只是模板，真正挂载给容器的是这份渲染出的临时文件。
  const outPath = join(tmpdir(), `webfetch-mitm-searxng-settings-${Date.now()}-${secretKey.slice(0, 8)}.yml`);
  writeFileSync(outPath, rendered, "utf8");
  return outPath;
}

async function startAndWaitReady(): Promise<string | null> {
  if (await isReachable(MANAGED_URL)) return MANAGED_URL;

  // 先尝试复用已存在但停着的容器（最常见情形），失败再退回新建一个。
  const startResult = await runDocker(["start", CONTAINER_NAME]);
  if (!startResult.ok) {
    let settingsPath: string;
    try {
      settingsPath = renderSettingsWithRandomKey();
    } catch (err) {
      console.error(`[webfetch-mitm] failed to render searxng settings template: ${String(err)}`);
      return null;
    }
    await runDocker([
      "run",
      "-d",
      "--name",
      CONTAINER_NAME,
      "-p",
      `${MANAGED_PORT}:8080`,
      "-v",
      `${settingsPath}:/etc/searxng/settings.yml`,
      "searxng/searxng:latest",
    ]);
  }

  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isReachable(MANAGED_URL)) return MANAGED_URL;
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  return null; // 超时也不抛错，调用方（backends/searxng.ts）按"这次没有可用后端"处理。
}

// 仅供测试重置模块级 promise 缓存，生产代码不会调用。
export function __resetManagedSearxngStateForTest(): void {
  readyPromise = null;
}
