// 通用 SSE 文本流解析：按 SSE 规范以空行分隔事件块，拆出 event/data。
// OpenRouter（OpenAI 风格，只有 data: 行）和 ZAI（原生 Anthropic 格式，event:+data: 都有）
// 共用这一份解析逻辑，各自在上层按自己的字段结构再解读 data 里的 JSON。
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string | null; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIdx: number;
      while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
        const rawBlock = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);

        let event: string | null = null;
        const dataLines: string[] = [];
        for (const line of rawBlock.split("\n")) {
          if (line.startsWith("event:")) event = line.slice("event:".length).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim());
        }
        if (dataLines.length > 0) yield { event, data: dataLines.join("\n") };
      }
    }
  } finally {
    reader.releaseLock();
  }
}
