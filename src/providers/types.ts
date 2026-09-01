export interface SummarizeInput {
  pageMarkdown: string;
  userPrompt: string;
  promptTemplate: string;
}

export interface Provider {
  // 逐块产出摘要文本增量。在还没产出任何内容之前失败（throw），interceptor 可以安全
  // fail-open；已经产出过内容之后再失败（throw），interceptor 已经提交转发、不能再
  // fail-open，只能把已产出内容原样收尾。
  summarizeStream(input: SummarizeInput, signal: AbortSignal): AsyncGenerator<string>;
}

// websearch 的搜索结果天然一次性到齐，不是逐块生成的文本——不用 webfetch 那种流式接口
// （设计文档第 9.2 节）。interceptor 侧对应用一个总超时（AbortSignal.timeout），不需要
// streamCollect.ts 的空闲超时机制。
export interface SearchResult {
  title: string;
  url: string;
}

export interface WebSearchProvider {
  search(query: string, signal: AbortSignal): Promise<SearchResult[]>;
}
