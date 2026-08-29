// 捕获真实 fetch 的唯一位置。必须在 interceptor 把 globalThis.fetch 换成 wrapper 之前
// 被求值一次——preload.ts 通过先 import 这个模块（间接经由 interceptor/providers）来保证
// 求值顺序，之后任何代码（包括 providers 自己的出站请求）都应该用这个引用，不要直接用
// 裸的 `fetch`，避免绕一圈自己的 wrapper（虽然不会死循环，因为 wrapper 只拦截
// api.anthropic.com/v1/messages，但绕一圈没有意义）。
export const realFetch: typeof fetch = globalThis.fetch;
