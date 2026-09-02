# 安装

这份文件既写给人看，也写给 Agent 看。如果你不想手动一步步做，最快的方式是：在这个项目目录下
打开终端，让你的 Agent（Claude Code 或类似工具）直接读这份文件帮你配置——"读一下 INSTALL.md，
照着帮我配一下"，下面的信息足够它独立完成。

这个项目没有需要安装的包，也没有需要运行的守护进程——`webfetch` 和 `websearch` 两个调用点都是
**零运行时依赖**。本质是一段会被加载进 `claude` 进程本身的脚本；`websearch` 用到的 `turndown`
（把抓到的页面转成 markdown）以预先打包好的 vendored bundle 形式提交进本仓库，而不是加载时才去
解析的 npm 包——真实的 Claude Code 是编译成单文件可执行程序发布的，它内嵌的运行时对外部
preload 进来的脚本没法解析 npm 包，只认普通文件路径，装一个活的 `node_modules` 依赖在那种环境
下根本不会生效。配置只有两步：填一个配置文件，然后告诉你的 shell，每次运行 `claude` 时都加载
这段脚本。`websearch` 额外默认会自管理一个本地 SearXNG Docker 容器做检索——只有启用
`websearch` 时才需要；`webfetch` 不受影响，不需要 Docker。

## 1. 把项目放到一个不会移动/删除的路径上

克隆（或拷贝）这个仓库到一个稳定的位置——第 3 步添加的 shell 配置会引用这个具体路径。

```bash
git clone <this-repo-url> ~/webfetch-mitm   # 路径随意，选一个不会挪动的位置
cd ~/webfetch-mitm
```

## 2. 配置 `.env`

```bash
cp .env.example .env
```

编辑 `.env`：

- `WEBFETCH_MITM_PROVIDER`：填 `openrouter` 或 `zai` 二选一。
- 填对应的 API key（`WEBFETCH_MITM_OPENROUTER_API_KEY` 或 `WEBFETCH_MITM_ZAI_API_KEY`），
  可选覆盖该分支默认的模型列表。
- `WEBFETCH_MITM_PROMPT_FILE` 留空即使用项目内置的通用模板
  （`templates/webfetch-summary.txt`）；如果想自定义发给第三方模型的摘要指令措辞，填一个
  指向你自己模板文件的绝对路径。

`.env` 已经在 `.gitignore` 里，不会通过这个仓库外泄。**任何时候都不要**把真实 key 粘贴进
commit、issue 或任何公开的地方。

## 3. 让 `claude` 每次启动都加载这段 preload 脚本

这是比较特别的一步：不是装一个包，而是通过 Bun 官方文档化的 `BUN_OPTIONS=--preload` 机制，
让 `claude` 二进制自身启动时把 `src/preload.ts` 注入到同一个进程里（这个机制具体意味着什么、
不意味着什么，见 [`docs/COMPLIANCE.zh-CN.md`](docs/COMPLIANCE.zh-CN.md)）。下面的配置只对
`claude` 这一个命令生效——**不会**全局 `export BUN_OPTIONS`，不影响你机器上其他用到 Bun 的
项目/脚本。

把下面的 `/absolute/path/to/webfetch-mitm` 换成你第 1 步实际克隆到的路径。

### Linux / macOS（bash 或 zsh）

macOS 从 Catalina 起默认 shell 是 zsh；多数 Linux 发行版默认 bash。不确定自己用哪个可以
`echo $SHELL` 查一下，然后编辑对应的文件：

- bash → `~/.bashrc`（如果你在 macOS 上用 Terminal.app，登录 shell 读的是
  `~/.bash_profile`，同样加一份）
- zsh → `~/.zshrc`

追加这个函数：

```bash
claude() {
  BUN_OPTIONS="--preload /absolute/path/to/webfetch-mitm/src/preload.ts" command claude "$@"
}
```

### Windows

Claude Code 在 Windows 上最常见的跑法是在 **WSL** 里——如果你是这种情况，在 WSL 的 shell 里
照上面 Linux/macOS 的步骤做就行；这也是本项目实际验证过的路径。

如果你是在 PowerShell 里原生跑 `claude`（不经过 WSL），等价配置是在 PowerShell profile
（`$PROFILE`）里加一个函数：

```powershell
function claude {
  $env:BUN_OPTIONS = "--preload C:\absolute\path\to\webfetch-mitm\src\preload.ts"
  & (Get-Command claude -CommandType Application).Source @args
  Remove-Item Env:\BUN_OPTIONS
}
```

这个 Bun preload 机制在原生 Windows 上对编译后的 `claude.exe` 是否完全生效，本项目没有实测
验证过——WSL 是测试更充分的路径。

## 4. 完整重启终端窗口

shell 配置的改动只对新开的 shell 生效，而且当前正在跑的 `claude` 会话本来就不是带着这个
wrapper 启动的。**把整个终端窗口关掉（不是只关标签页，也不是 source 一下就行），再重新打开
一个。** 如果是让 Agent 帮你做的这次配置，一定要提醒它在这一步明确告诉你把窗口关掉重开——
有些终端模拟器的标签页之间会共享环境状态，同窗口内新开标签不一定可靠。

## 5. 验证是否生效

```bash
claude -p "Use the WebFetch tool to fetch https://example.com and summarize it" \
  --allowedTools WebFetch --permission-mode dontAsk
```

正常情况下会拿到一份摘要，肉眼看不出和没装之前有什么区别——去看终端的 stderr，确认有一行
`[webfetch-mitm]` 开头的日志，说明这次请求被拦截并转发出去了。

## 关闭它

把第 3 步加的 `claude()` 函数（或 PowerShell 里的同名函数）删掉/注释掉，再重启一次终端。
就这么多——没有其他残留状态需要清理，Claude Code 本身在磁盘上从未被改动过。
