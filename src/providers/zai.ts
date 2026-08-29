import type { Config } from "../config";
import { renderTemplate } from "../promptTemplate";
import { realFetch } from "../realFetch";
import { parseSSEStream } from "../sseParse";
import type { Provider, SummarizeInput } from "./types";

const ENDPOINT = "https://api.z.ai/api/anthropic/v1/messages";

async function* callOneModelStream(
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const res = await realFetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 32000,
      temperature: 1,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });

  if (!res.ok) throw new Error(`zai http ${res.status} (${model})`);
  if (!res.body) throw new Error(`zai response has no body (${model})`);

  for await (const { event, data } of parseSSEStream(res.body)) {
    // 原生 Anthropic 协议里，mid-stream 错误（内容审核/限流/上游出错）是一个专门的
    // event: error，不是把 HTTP 状态码改掉——不显式处理的话会被当成"不认识的事件"
    // 静默忽略，导致一个本该失败的请求被当作已经流完的部分内容处理。
    if (event === "error") {
      throw new Error(`zai stream error event (${model}): ${data}`);
    }

    if (event === "content_block_delta") {
      let json: any;
      try {
        json = JSON.parse(data);
      } catch (err) {
        // data: 行本该是 ZAI 自己产出的合法 JSON——解析失败是协议层面的异常，不是
        // 可以静默跳过的噪音。
        throw new Error(`zai sent malformed SSE data line (${model}): ${String(err)}`);
      }
      // "delta 整个不是对象"（响应形状变了）和"delta 存在但 text 刚好是空/缺失"（正常，
      // 如某些 delta 只带 type 没带 text）是两回事——前者才值得 throw。
      if (typeof json?.delta !== "object" || json.delta === null) {
        throw new Error(`zai chunk missing 'delta' object (${model}): ${JSON.stringify(json)}`);
      }
      const text = json.delta.text;
      if (typeof text === "string" && text.length > 0) yield text;
    } else if (event === "message_stop") {
      return;
    }
  }
}

export function createZaiProvider(config: Config): Provider {
  const { apiKey, models } = config.zai;

  return {
    async *summarizeStream(input: SummarizeInput, signal: AbortSignal): AsyncGenerator<string> {
      if (!apiKey) throw new Error("zai api key not configured");
      if (models.length === 0) throw new Error("zai models list is empty");

      const prompt = renderTemplate(input.promptTemplate, {
        pageMarkdown: input.pageMarkdown,
        userPrompt: input.userPrompt,
      });

      const failures: string[] = [];
      for (const model of models) {
        if (signal.aborted) break;
        let yieldedAny = false;
        try {
          for await (const delta of callOneModelStream(apiKey, model, prompt, signal)) {
            yieldedAny = true;
            yield delta;
          }
          return;
        } catch (err) {
          if (yieldedAny) {
            // 已经流出过内容给调用方了，不能再换模型重来——只能把这个错误往上抛，
            // 由 interceptor 决定怎么优雅收尾。
            throw err;
          }
          failures.push(`${model}: ${String(err)}`);
        }
      }

      throw new Error(`zai: all models exhausted: ${failures.join("; ")}`);
    },
  };
}
