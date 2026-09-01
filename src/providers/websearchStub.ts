import type { SearchResult, WebSearchProvider } from "./types";

// 设计文档第 9.4 节：本期占位实现，不接入任何真实搜索 API，不接受任何配置、不发网络请求。
// 目的只是验证"识别 → 提取 query → 调 provider → 合成响应 → 父级 Sonnet 正常消费"这条链路
// 本身稳定，不是提供可用的搜索能力。真实使用中会让父级模型看到明显异常的假结果，因此
// WEBFETCH_MITM_ENABLE_TARGETS 默认值不含 websearch（config.ts），必须显式加上才会触发。
export const websearchStubProvider: WebSearchProvider = {
  async search(query: string, _signal: AbortSignal): Promise<SearchResult[]> {
    console.error(`[webfetch-mitm] websearch STUB provider hit, query=${JSON.stringify(query)}`);
    return [
      {
        title: `[STUB] placeholder result for: ${query}`,
        url: "https://example.com/stub-websearch-result",
      },
    ];
  },
};
