import type { Config } from "../config";
import { renderTemplate } from "../promptTemplate";
import { realFetch } from "../realFetch";
import { parseSSEStream } from "../sseParse";
import type { Provider, SummarizeInput } from "./types";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export function buildOpenRouterRequestBody(
  prompt: string,
  models: string[],
  providers: string[] | null,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    models,
    stream,
    messages: [{ role: "user", content: prompt }],
  };
  if (providers) body.provider = { order: providers };
  return body;
}

export function createOpenRouterProvider(config: Config): Provider {
  const { apiKey, models, providers } = config.openrouter;

  return {
    async *summarizeStream(input: SummarizeInput, signal: AbortSignal): AsyncGenerator<string> {
      if (!apiKey) throw new Error("openrouter api key not configured");
      if (models.length === 0) throw new Error("openrouter models list is empty");

      const prompt = renderTemplate(input.promptTemplate, {
        pageMarkdown: input.pageMarkdown,
        userPrompt: input.userPrompt,
      });
      const body = buildOpenRouterRequestBody(prompt, models, providers, true);

      const res = await realFetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) throw new Error(`openrouter http ${res.status}`);
      if (!res.body) throw new Error("openrouter response has no body");

      for await (const { data } of parseSSEStream(res.body)) {
        if (data === "[DONE]") return;

        let json: any;
        try {
          json = JSON.parse(data);
        } catch (err) {
          // SSE data: 行本该是这家 API 自己产出的合法 JSON——解析失败是协议层面的
          // 异常，不是可以静默跳过的噪音，直接当失败处理，交给上层 fail-open。
          throw new Error(`openrouter sent malformed SSE data line: ${String(err)}`);
        }

        // OpenRouter 在流式请求里遇到内容审核/限流/上游模型出错等情况时，会在一个
        // 仍然是 200 状态码的 SSE data 行里塞一个 error 字段，而不是走 HTTP 层报错——
        // 必须显式识别，否则会被当成"这块没内容"静默跳过，可能让部分失败的请求被
        // 当作正常完成处理。
        if (json?.error) {
          throw new Error(`openrouter stream error: ${JSON.stringify(json.error)}`);
        }

        // "choices 整个不是数组"（比如 API 换了个完全不同的响应形状）和"choices[0].delta
        // 存在但这块内容刚好是空的"（比如只带 role 声明的 chunk，正常）是两回事——前者才
        // 值得 throw，后者按现有逻辑当空内容跳过即可，不能用同一条路径处理。
        if (!Array.isArray(json?.choices)) {
          throw new Error(`openrouter chunk missing 'choices' array: ${JSON.stringify(json)}`);
        }
        const content = json.choices[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) yield content;
      }
    },
  };
}
