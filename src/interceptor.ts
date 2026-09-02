import type { Config } from "./config";
import { buildEnabledRules, matchRequest } from "./matchRules/registry";
import type { AnthropicMessagesRequestBody } from "./matchRules/types";
import { extractWebFetchInputs } from "./matchRules/webfetch";
import { extractWebSearchQuery } from "./matchRules/websearch";
import { loadTemplate } from "./promptTemplate";
import { createOpenRouterProvider } from "./providers/openrouter";
import type { Provider, WebSearchProvider } from "./providers/types";
import { createZaiProvider } from "./providers/zai";
import { realFetch } from "./realFetch";
import { buildSyntheticResponse, buildWebSearchSyntheticResponse } from "./responseSynthesizer";
import { collectStreamWithIdleTimeout, isValidSummary, StreamCollectTimeoutError } from "./streamCollect";
import { createSearxngBackend } from "./websearch/backends/searxng";
import { ensureManagedSearxngRunning } from "./websearch/backends/searxngLifecycle";
import { createWebSearchProvider } from "./websearch/provider";

const ANTHROPIC_MESSAGES_PATH = "/v1/messages";
const ANTHROPIC_HOST = "api.anthropic.com";
// 实测 OpenRouter/DeepSeek Flash 延迟波动很大（1.5s ~ 19s），固定总超时不管调多大都是
// 赌博：调小了经常白白 fail-open、拿不到省钱收益，调大了在 provider 真卡死时让 WebFetch
// 白等一大段时间。改成流式空闲超时（doc/plan/fix/2026-08-29_provider超时策略改为流式空闲超时.md）：
// 只要片段还在陆续到达就不算超时，能扛住长尾延迟；IDLE 覆盖"卡住不动"，TOTAL 兜底"一直有
// 片段但永远不完"的极端情况。这两个常量只用于 webfetch——websearch 的 provider 接口是
// 一次性 Promise（不是流式生成器，见 providers/types.ts），用下面独立的
// WEBSEARCH_HARD_TIMEOUT_MS 做单一总超时，不需要 idle timeout 这层。
const IDLE_TIMEOUT_MS = 20_000;
const TOTAL_TIMEOUT_MS = 90_000;
// websearch 的技术安全阀（设计文档第 13 节）：不是业务参数，不经 env，源码里的硬编码常量。
// 2026-09-02 设计修订后，反思循环不再受任何软时间预算约束、完全由反思自己的判断决定要不要
// 继续（design v2 第 5 节）——这个常量因此从"正常情况下用不到的极端兜底"变成了反思循环
// 事实上的墙钟上限：如果反思反复判定"不够"（哪怕带来的 refinedQueries 质量不高、没有实质
// 缩小缺口），流程会一直跑到这里为止才被打断。仍然视为异常路径（计入熔断失败计数），但比
// 修订前更容易被真实触碰到，调大这个值前先确认是不是想接受更长的单次查询延迟。
const WEBSEARCH_HARD_TIMEOUT_MS = 120_000;
// 连续失败达到这个次数后熔断：本进程剩余生命周期内不再尝试该调用点的 provider，直接纯透传。
// 见 doc/plan/fix/2026-08-29_provider响应结构漂移熔断.md——防的是"provider 响应格式
// 变了但没人发现，之后每次调用都要空等一次超时预算才摔回真实 Haiku"这种隐性变慢。
// 设计文档第 9.5 节：熔断按调用点（rule id）独立计数，不共享——webfetch/websearch 的
// provider 完全独立，共享一个计数器会让一边的失败拖累另一边提前熔断。
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

// 设计文档第 3、6.3、14 节。保持同步函数（不 await 任何东西）——installInterceptor() 本身
// 不是 async，跟现有代码风格一致。
function resolveWebSearchProvider(config: Config): WebSearchProvider | null {
  const { websearch } = config;
  if (!websearch.reason.apiKey) return null; // 无 provider，走现有 fail-open 分支。

  const resolveUrl: () => Promise<string | null> = websearch.searxng.url
    ? async () => websearch.searxng.url
    : ensureManagedSearxngRunning;

  if (!websearch.searxng.url) {
    // SEARXNG_URL 未设置（自管理路径）：后台发起一次，不 await——让它现在就开始跑，不等到
    // 真正 search() 时才第一次触发（设计第 6.3 节"后台发起、不阻塞进程启动"）。
    void ensureManagedSearxngRunning();
  }

  const backend = createSearxngBackend(resolveUrl, websearch.searxng.categories);

  return createWebSearchProvider({
    backend,
    reason: {
      apiKey: websearch.reason.apiKey,
      baseUrl: websearch.reason.baseUrl,
      model: websearch.reason.model,
      effort: websearch.reason.effort,
      sort: websearch.reason.sort,
    },
    summary: {
      // summary.apiKey 已经在 config.ts 里做过"为空回退用 reason.apiKey"的处理，这里
      // reason.apiKey 非空已经在上面判断过，summary.apiKey 必然也非空。
      apiKey: websearch.summary.apiKey ?? websearch.reason.apiKey,
      baseUrl: websearch.summary.baseUrl,
      model: websearch.summary.model,
      sort: websearch.summary.sort,
    },
    maxSources: websearch.maxSources,
  });
}

interface CircuitState {
  consecutiveFailures: number;
  circuitOpen: boolean;
}

export function installInterceptor(config: Config): void {
  const enabledRules = buildEnabledRules(config);
  if (enabledRules.length === 0) {
    log("no targets enabled, running as pure passthrough");
    return;
  }

  const provider = resolveProvider(config);
  const webSearchProvider = resolveWebSearchProvider(config);
  const promptTemplate = loadTemplate(config);

  // 熔断状态：进程内内存变量，按 rule id 独立维护，不跨进程持久化——下次重启 claude
  // 拿到新的 preload 实例，重新给一次尝试机会，不需要额外的重置逻辑。
  const circuits = new Map<string, CircuitState>();

  function circuitFor(ruleId: string): CircuitState {
    let state = circuits.get(ruleId);
    if (!state) {
      state = { consecutiveFailures: 0, circuitOpen: false };
      circuits.set(ruleId, state);
    }
    return state;
  }

  function recordProviderFailure(ruleId: string): void {
    const state = circuitFor(ruleId);
    state.consecutiveFailures++;
    if (!state.circuitOpen && state.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      state.circuitOpen = true;
      alert(
        `[${ruleId}] ${state.consecutiveFailures} consecutive provider failures — circuit breaker OPEN, ` +
          `falling back to passthrough for the rest of this process's lifetime (restart claude to retry)`,
      );
    }
  }

  function recordProviderSuccess(ruleId: string): void {
    circuitFor(ruleId).consecutiveFailures = 0;
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

    const ruleId = matched.rule.id;

    if (ruleId === "websearch") {
      if (!webSearchProvider) {
        log(`strict match on "websearch" but no provider configured, fail-open`);
        return realFetch(input as any, init);
      }
      if (circuitFor(ruleId).circuitOpen) {
        log(`circuit breaker open, skipping provider, fail-open [${ruleId}]`);
        return realFetch(input as any, init);
      }

      try {
        const query = extractWebSearchQuery(body);
        if (!query) {
          log(`strict match on "websearch" but failed to extract query, fail-open`);
          return realFetch(input as any, init);
        }

        let results: Awaited<ReturnType<WebSearchProvider["search"]>>;
        try {
          results = await webSearchProvider.search(query, AbortSignal.timeout(WEBSEARCH_HARD_TIMEOUT_MS));
        } catch (err) {
          log(`websearch provider failed, fail-open: ${String(err)}`);
          recordProviderFailure(ruleId);
          return realFetch(input as any, init);
        }

        recordProviderSuccess(ruleId);
        log(
          `websearch forwarded, ${results.sources.length} source(s), summary ${
            results.summary.length ? `${results.summary.length} chars` : "empty (degraded)"
          }`,
        );
        return buildWebSearchSyntheticResponse(
          body.model ?? "claude-haiku-4-5-20251001",
          query,
          results.sources,
          results.summary,
        );
      } catch (err) {
        log(`unexpected error, fail-open: ${String(err)}`);
        recordProviderFailure(ruleId);
        return realFetch(input as any, init);
      }
    }

    // strict match on webfetch: 尝试转发。
    if (!provider) {
      log(`strict match on "${ruleId}" but no provider configured, fail-open`);
      return realFetch(input as any, init);
    }

    if (circuitFor(ruleId).circuitOpen) {
      log(`circuit breaker open, skipping provider, fail-open`);
      return realFetch(input as any, init);
    }

    try {
      const inputs = extractWebFetchInputs(body);
      if (!inputs) {
        log(`strict match on "${ruleId}" but failed to extract inputs, fail-open`);
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
        recordProviderFailure(ruleId);
        return realFetch(input as any, init);
      }

      if (!isValidSummary(text)) {
        log(`provider returned invalid summary (empty or too long, ${text.length} chars), fail-open`);
        recordProviderFailure(ruleId);
        return realFetch(input as any, init);
      }

      recordProviderSuccess(ruleId);
      log(`forwarded to ${config.provider}, ${text.length} chars summary`);
      return buildSyntheticResponse(body.model ?? "claude-haiku-4-5-20251001", text);
    } catch (err) {
      log(`unexpected error, fail-open: ${String(err)}`);
      recordProviderFailure(ruleId);
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
