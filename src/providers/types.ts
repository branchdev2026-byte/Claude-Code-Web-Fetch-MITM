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
