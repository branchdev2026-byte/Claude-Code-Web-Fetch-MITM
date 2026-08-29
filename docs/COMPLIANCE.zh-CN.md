# 合规与政策说明

**这是项目作者在发布这个工具之前，对 Anthropic 公开政策的自行解读。Anthropic 没有以任何形式
审查、审计或认可过这个项目，本文档内容也不构成法律意见。** 公开这份文档的目的，是让任何考虑
使用这个工具的人能看到作者当时的判断依据，而不用自己重新调研一遍；同时，如果这份判断日后被
证明是错的，也留有据可查。

调研方式是直接阅读 Anthropic 自己发布的文档（链接见文末），调研时间是 **2026-08-29**。政策
可能在这之后发生变化；如果你要依据这份文档做决定，建议自己重新读一遍原始条款，不要无限期地
信任这份摘要。

## 这个工具实际做的事

Claude Code 内置的 `WebFetch` 工具，在抓取到一个网页后，内部会另外发一次调用给一个小模型
（Haiku）来做摘要。这个项目通过 Bun 官方文档化的 `--preload` 机制（见
[`INSTALL.zh-CN.md`](../INSTALL.zh-CN.md)），在 `claude` 进程启动时往里注入一段脚本，这段
脚本**只**识别这一个具体的内部调用，把它转发给你自己配置的第三方模型来省钱。其余所有流量——
主对话、工具调用、MCP 通信、身份认证——完全不受影响、原样通过。如果第三方调用因为任何原因
失败或超时，请求会自动摔回真实的 Haiku 调用；WebFetch 不会因为装了这个工具而变得不可用。

这个工具从不读取、存储或转发你的 Anthropic OAuth/会话凭证。它唯一新增的网络请求是发往你自己
配置的第三方 provider（OpenRouter 或 Z.ai），用的是你自己在那家的 API key。

## 对照 Anthropic 公开政策逐条核实的结果

对照的是三份文档：Claude Code 的
[Legal and compliance 页](https://code.claude.com/docs/en/legal-and-compliance)、
[Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms)
（适用于个人 Free/Pro/Max 订阅用户的那份，不是 Commercial Terms）、以及
[Anthropic Usage Policy](https://www.anthropic.com/legal/aup)。

**注入机制本身不是漏洞，也不是利用未公开接口。** `--preload` 是 Bun CLI 官方文档化的选项，
Bun 自己的文档写明 `BUN_OPTIONS` 会被编译后的单文件可执行程序（`claude` 二进制正是这一类）
读取，专门用于不重新编译就能传运行时参数。单纯使用这个机制本身，不构成利用未公开或非预期的
接口。

**没有找到哪一条条款直接、明确地对应这个具体行为。** 这三份文档里，没有任何一句话精确对应
"个人订阅用户在自己机器上、进程内拦截一个具体的内部请求、且不触碰身份认证凭证"这个具体行为。
这是一个真实存在的空白，不代表"默许"——没有对应条款，不等于这个行为被明确允许；Anthropic
的条款给了自己相当宽泛的自由裁量权，可以在认为用户违反条款时中止或终止访问，不依赖某一条
具体条款是否精确匹配。

**有两点足够接近，值得直接点明，作为灰色地带列出：**

- Consumer Terms 禁止反编译、逆向工程，或以其他方式把服务还原成人类可读形式。开发过程中为了
  定位这个工具要拦截的具体内部调用，需要阅读 Claude Code（反混淆后）的源码——这个动作字面上
  落在这条禁止条款的措辞范围内，跟最终是否真的部署这个拦截功能无关。这件事已经在本项目的
  调研阶段发生过，不是假设性的风险。
- Consumer Terms 也限制通过自动化或非人工方式（bot/脚本）访问服务。在一个人正在正常操作会话
  的同时，其中一次内部请求被脚本重定向，算不算这条条款意义上的"脚本访问"，确实存在解释空间——
  没有找到 Anthropic 就这种"部分请求、进程内拦截"的场景发表过任何明确说法。

**Usage Policy 的禁止行为清单看起来不覆盖这个行为。** 它限制的是绕过安全护栏、爬取训练数据、
自动化批量开号、规避封禁这类行为，都不对应这个工具做的事。

## 跟这个项目无关的一件事：2026 年针对第三方 harness 的 OAuth 限制

2026 年初 Anthropic 限制了几款第三方编程工具的订阅 OAuth 接入。那次限制针对的是另一类行为：
第三方产品经手或转发用户的 Anthropic OAuth token，把它接到自己的基础设施里用。这个工具不是
那类东西——它运行在官方 `claude` 二进制**内部**，完全不碰你的 OAuth token，Claude Code
发出的其余每一个请求（包括身份认证）跟没装这个工具时完全一样。我们专门把这一点单独列出来，
是因为这两件事很容易被混为一谈；它跟这个项目本身的风险状况没有关系，也不应该被理解成对这个
项目有什么暗示。

## 这个项目已经做的缓解措施

- **设计上就是 fail-open**：provider 调用失败、超时、或返回了不认识的响应结构，都会摔回真实
  的 Haiku 调用，而不是报错或卡死。
- **完全不碰身份认证**：这个工具从不读取、记录或转发 OAuth token、会话凭证。
- **随包发布的默认摘要模板是原创措辞**，不是 Anthropic 内部提示词的复现。这个项目早期版本
  曾经用过一份和 Anthropic 实际内部提示词高度一致的模板（开发过程中为验证请求/响应格式而
  抓包得到）；发布前已经重写，专门为了避免把那段文字对外分发。如果你想要摘要效果更接近
  Claude Code 原生行为，可以自己写一份模板放在本地，让 `WEBFETCH_MITM_PROMPT_FILE` 指向它——
  这个文件从不会被这个项目发布或分享出去。

## 结论

这个工具落在一个真实存在的灰色地带，不属于明显合规或明显违规的任一边：有一个已经确认发生
过的技术性擦线（反编译/逆向条款，发生在调研阶段），也有一个悬而未决的开放问题（自动化访问
条款）。不管某一条具体条款怎么解释，Anthropic 都保留对任何账号采取行动的宽泛自由裁量权。
使用这个工具的风险和后果由你自己承担，作用于你自己的账号；如果你需要比这份文档更确定的答案，
只有 Anthropic 自己能给。

## 参考资料

- [Claude Code — Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)
- [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms)
- [Anthropic Usage Policy](https://www.anthropic.com/legal/aup)
- [Bun 文档：`--preload` CLI 选项](https://bun.com/docs/cli/run)
- [Bun 文档：`BUN_OPTIONS` 与单文件可执行程序](https://bun.com/docs/bundler/executables)
