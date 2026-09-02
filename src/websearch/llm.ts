import { realFetch } from "../realFetch";
import type { SortOption } from "./types";

// 设计文档第 10 节：厂商中立的 OpenAI 兼容 `chat/completions` 非流式客户端。规划/反思用
// 推理档配置（Kimi K3），富化提炼/汇总用汇总档配置（DeepSeek Flash）——两处共用同一个函数，
// 区别只在传入的 LlmCallOptions。

export type { SortOption };

export interface LlmCallOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  sort: SortOption;
  temperature: number;
  jsonMode?: boolean;
  reasoningEffort?: string;
}

// `reasoning_effort` 是否发送取决于目标模型是否已知支持——不假设所有可能配置的模型都认识
// 这个字段（设计第 10.1 节的厂商中立原则）。当前只有 Kimi K3 在白名单里，换模型时这个字段
// 不发送，不报错、不降级，安静地不带这个参数请求。
export function supportsReasoningEffort(model: string): boolean {
  return model.startsWith("moonshotai/kimi-k3");
}

export async function callLlm(options: LlmCallOptions, prompt: string, signal: AbortSignal): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    temperature: options.temperature,
    messages: [{ role: "user", content: prompt }],
  };

  const providerPref: Record<string, unknown> = {};
  if (options.sort) providerPref.sort = options.sort;
  if (Object.keys(providerPref).length > 0) body.provider = providerPref;

  if (options.jsonMode) body.response_format = { type: "json_object" };
  if (options.reasoningEffort && supportsReasoningEffort(options.model)) {
    body.reasoning_effort = options.reasoningEffort;
  }

  const res = await realFetch(`${options.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) throw new Error(`websearch llm http ${res.status}`);

  let json: any;
  try {
    json = await res.json();
  } catch (err) {
    throw new Error(`websearch llm response is not valid JSON: ${String(err)}`);
  }

  // 同 openrouter.ts 的范式：200 状态码但响应体内嵌 error 字段的情况必须显式识别，
  // 否则会被当成"没有 choices"的结构异常误判，或者更糟——被当空内容忽略。
  if (json?.error) {
    throw new Error(`websearch llm error: ${JSON.stringify(json.error)}`);
  }
  if (!Array.isArray(json?.choices)) {
    throw new Error(`websearch llm response missing 'choices' array: ${JSON.stringify(json)}`);
  }
  const content = json.choices[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`websearch llm response missing message.content: ${JSON.stringify(json)}`);
  }
  return content;
}
