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

// websearch 的搜索结果类型定义在 src/websearch/types.ts（那个模块 transport 无关，不引用
// 任何 Anthropic 类型，是本项目对外的权威定义）。这里只是 re-export，保持调用点习惯从
// providers/types 统一取类型的既有风格。
export type { WebSearchProvider, WebSearchResult } from "../websearch/types";
