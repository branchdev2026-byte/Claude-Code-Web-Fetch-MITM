// 消费一个 AsyncGenerator<string>，用"空闲超时"代替固定总超时：只要片段还在陆续到达就
// 不算超时，能扛住长尾延迟；同时留一个总体安全上限防止"片段一直来但永远不结束"。
// 见 doc/plan/fix/2026-08-29_provider超时策略改为流式空闲超时.md。

export interface CollectOptions {
  idleTimeoutMs: number;
  totalTimeoutMs: number;
}

export class StreamCollectTimeoutError extends Error {
  constructor(
    message: string,
    public readonly kind: "idle" | "total",
  ) {
    super(message);
    this.name = "StreamCollectTimeoutError";
  }
}

// makeGen 拿到的 signal 由这个函数自己创建并持有：空闲/总体超时触发时会真正
// abort 这个 signal，让底层请求（provider 内部传给 fetch 的同一个 signal）被取消，
// 而不只是不再等待它、让请求在后台裸奔。
export async function collectStreamWithIdleTimeout(
  makeGen: (signal: AbortSignal) => AsyncGenerator<string>,
  options: CollectOptions,
): Promise<string> {
  const { idleTimeoutMs, totalTimeoutMs } = options;
  const controller = new AbortController();
  const gen = makeGen(controller.signal);

  let text = "";
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const totalTimer = setTimeout(() => {
    controller.abort(new StreamCollectTimeoutError(`total timeout after ${totalTimeoutMs}ms`, "total"));
  }, totalTimeoutMs);

  function armIdleTimer(): void {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      controller.abort(new StreamCollectTimeoutError(`idle timeout: no chunk for ${idleTimeoutMs}ms`, "idle"));
    }, idleTimeoutMs);
  }

  try {
    armIdleTimer();
    while (true) {
      const next = await gen.next();
      if (next.done) break;
      text += next.value;
      armIdleTimer();
    }
  } catch (err) {
    // AbortController.abort(reason) 被我们自己触发时，多数 fetch 实现会用这个 reason
    // 拒绝 pending 的读取——直接把它抛出去，让调用方看到更明确的
    // StreamCollectTimeoutError 而不是笼统的 AbortError。
    if (controller.signal.aborted && controller.signal.reason instanceof StreamCollectTimeoutError) {
      throw controller.signal.reason;
    }
    throw err;
  } finally {
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
  }

  return text;
}

const MAX_SUMMARY_CHARS = 50_000;

// 防御性检查：正常摘要是散文，不应该整段就是一个可解析的 JSON 对象/数组。provider 层
// 已经显式处理了已知的 error 事件/字段（见 openrouter.ts/zai.ts），这里是最后一道防线，
// 防止某种我们没预料到的 payload 结构（比如 provider 把一整个 error 对象当正文吐出来）
// 混进最终摘要文本里。
function looksLikeRawJsonPayload(trimmed: string): boolean {
  const looksLikeJsonShape =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (!looksLikeJsonShape) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function isValidSummary(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length >= MAX_SUMMARY_CHARS) return false;
  if (looksLikeRawJsonPayload(trimmed)) return false;
  return true;
}
