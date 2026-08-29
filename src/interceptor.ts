import type { Config } from "./config";
import { buildEnabledRules, matchRequest } from "./matchRules/registry";
import type { AnthropicMessagesRequestBody } from "./matchRules/types";
import { extractWebFetchInputs } from "./matchRules/webfetch";
import { loadTemplate } from "./promptTemplate";
import { createOpenRouterProvider } from "./providers/openrouter";
import type { Provider } from "./providers/types";
import { createZaiProvider } from "./providers/zai";
import { realFetch } from "./realFetch";
import { buildSyntheticResponse } from "./responseSynthesizer";
import { collectStreamWithIdleTimeout, isValidSummary, StreamCollectTimeoutError } from "./streamCollect";

const ANTHROPIC_MESSAGES_PATH = "/v1/messages";
const ANTHROPIC_HOST = "api.anthropic.com";
// 实测 OpenRouter/DeepSeek Flash 延迟波动很大（1.5s ~ 19s），固定总超时不管调多大都是
// 赌博：调小了经常白白 fail-open、拿不到省钱收益，调大了在 provider 真卡死时让 WebFetch
// 白等一大段时间。改成流式空闲超时（doc/plan/fix/2026-08-29_provider超时策略改为流式空闲超时.md）：
// 只要片段还在陆续到达就不算超时，能扛住长尾延迟；IDLE 覆盖"卡住不动"，TOTAL 兜底"一直有
// 片段但永远不完"的极端情况。
const IDLE_TIMEOUT_MS = 20_000;
const TOTAL_TIMEOUT_MS = 90_000;
// 连续失败达到这个次数后熔断：本进程剩余生命周期内不再尝试 provider，直接纯透传。
// 见 doc/plan/fix/2026-08-29_provider响应结构漂移熔断.md——防的是"provider 响应格式
// 变了但没人发现，之后每次 WebFetch 都要空等一次超时预算才摔回 Haiku"这种隐性变慢。
const CIRCUIT_BREAKER_THRESHOLD = 3;

function log(msg: string): void {
  console.error(`[webfetch-mitm] ${msg}`);
}

function alert(msg: string): void {
  console.error(`[webfetch-mitm] ALERT: ${msg}`);
}

function isAnthropicMessagesRequest(url: string, method: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === ANTHROPIC_HOST && parsed.pathname.startsWith(ANTHROPIC_MESSAGES_PATH);
  } catch {
    return false;
  }
}

function resolveProvider(config: Config): Provider | null {
  if (config.provider === "openrouter") return createOpenRouterProvider(config);
  if (config.provider === "zai") return createZaiProvider(config);
  return null;
}

export function installInterceptor(config: Config): void {
  const enabledRules = buildEnabledRules(config);
  if (enabledRules.length === 0) {
    log("no targets enabled, running as pure passthrough");
    return;
  }

  const provider = resolveProvider(config);
  const promptTemplate = loadTemplate(config);

  // 熔断状态：进程内内存变量，不跨进程持久化——下次重启 claude 拿到新的 preload
  // 实例，重新给一次尝试机会，不需要额外的重置逻辑。
  let consecutiveFailures = 0;
  let circuitOpen = false;

  function recordProviderFailure(): void {
    consecutiveFailures++;
    if (!circuitOpen && consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitOpen = true;
      alert(
        `${consecutiveFailures} consecutive provider failures — circuit breaker OPEN, ` +
          `falling back to passthrough for the rest of this process's lifetime (restart claude to retry)`,
      );
    }
  }

  function recordProviderSuccess(): void {
    consecutiveFailures = 0;
  }

  const wrappedFetchImpl = async (
    input: Parameters<typeof fetch>[0],
    init: Parameters<typeof fetch>[1],
  ): ReturnType<typeof fetch> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET") ?? "GET";

    if (!isAnthropicMessagesRequest(url, method)) {
      return realFetch(input as any, init);
    }

    // 读 body 时必须不破坏 input——fail-open 分支要能把原始 input/init 原样交给 realFetch。
    // Request 对象的 body 是一次性流，用 .clone() 读，避免把原始请求的 body 消费掉。
    let bodyText: string;
    try {
      if (typeof init?.body === "string") {
        bodyText = init.body;
      } else if (input instanceof Request) {
        bodyText = await input.clone().text();
      } else {
        // 非字符串 body 且 input 不是 Request（如 ReadableStream/Blob/FormData）：不支持
        // 拦截，直接透传，避免消费掉唯一的 body 流。
        return realFetch(input as any, init);
      }
    } catch (err) {
      log(`failed to read request body, passing through: ${String(err)}`);
      return realFetch(input as any, init);
    }

    let body: AnthropicMessagesRequestBody;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return realFetch(input as any, init);
    }

    let matched: ReturnType<typeof matchRequest>;
    try {
      matched = matchRequest(body, enabledRules);
    } catch (err) {
      log(`match rule threw, passing through: ${String(err)}`);
      return realFetch(input as any, init);
    }

    if (!matched || matched.level === "none") {
      return realFetch(input as any, init);
    }

    if (matched.level === "loose") {
      log(
        `drift warning: request matches loose signal (model=${String(body.model)}) but not strict signal for rule "${matched.rule.id}" — prompt template may have changed upstream`,
      );
      return realFetch(input as any, init);
    }

    // strict match: 尝试转发。
    if (!provider) {
      log(`strict match on "${matched.rule.id}" but no provider configured, fail-open`);
      return realFetch(input as any, init);
    }

    if (circuitOpen) {
      log(`circuit breaker open, skipping provider, fail-open`);
      return realFetch(input as any, init);
    }

    try {
      const inputs = extractWebFetchInputs(body);
      if (!inputs) {
        log(`strict match on "${matched.rule.id}" but failed to extract inputs, fail-open`);
        return realFetch(input as any, init);
      }

      const summarizeInput = { pageMarkdown: inputs.pageMarkdown, userPrompt: inputs.userPrompt, promptTemplate };

      let text: string;
      try {
        text = await collectStreamWithIdleTimeout((signal) => provider.summarizeStream(summarizeInput, signal), {
          idleTimeoutMs: IDLE_TIMEOUT_MS,
          totalTimeoutMs: TOTAL_TIMEOUT_MS,
        });
      } catch (err) {
        const reason =
          err instanceof StreamCollectTimeoutError ? `${err.kind} timeout (${err.message})` : String(err);
        log(`provider failed, fail-open: ${reason}`);
        recordProviderFailure();
        return realFetch(input as any, init);
      }

      if (!isValidSummary(text)) {
        log(`provider returned invalid summary (empty or too long, ${text.length} chars), fail-open`);
        recordProviderFailure();
        return realFetch(input as any, init);
      }

      recordProviderSuccess();
      log(`forwarded to ${config.provider}, ${text.length} chars summary`);
      return buildSyntheticResponse(body.model ?? "claude-haiku-4-5-20251001", text);
    } catch (err) {
      log(`unexpected error, fail-open: ${String(err)}`);
      recordProviderFailure();
      return realFetch(input as any, init);
    }
  };

  // Bun 的 fetch 类型比标准 lib.dom 多一个 preconnect 方法；wrapper 本身不需要实现它，
  // 直接把真实 fetch 的 preconnect 挂上去即可满足 typeof fetch 的形状。
  const wrappedFetch = Object.assign(wrappedFetchImpl, {
    preconnect: (realFetch as unknown as { preconnect?: unknown }).preconnect,
  }) as typeof fetch;

  globalThis.fetch = wrappedFetch;
  log(`installed, targets=[${config.enableTargets.join(",")}] provider=${config.provider ?? "none"}`);
}
