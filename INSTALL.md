# Install

This file is written to be read by a human **or** handed straight to a coding
agent (Claude Code, or anything similar). If you'd rather not do this by
hand, the fastest path is: open a terminal in this project's directory and
ask your agent something like *"read INSTALL.md and set this up for me."*
It has everything it needs below.

There is no package to install and no daemon to run. This project has **zero
runtime dependencies** — it's a single script that gets loaded into the
`claude` process itself. Setup is: fill in a config file, then tell your
shell to load that script whenever you run `claude`.

## 1. Get the project onto disk somewhere permanent

Clone (or copy) this repository to a path you're not going to delete or move
— the shell configuration you add in step 3 will reference this exact path.

```bash
git clone <this-repo-url> ~/webfetch-mitm   # pick any stable location
cd ~/webfetch-mitm
```

## 2. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env`:

- `WEBFETCH_MITM_PROVIDER` — `openrouter` or `zai`.
- Fill in the matching API key (`WEBFETCH_MITM_OPENROUTER_API_KEY` or
  `WEBFETCH_MITM_ZAI_API_KEY`) and, optionally, override the default model
  list for that branch.
- Leave `WEBFETCH_MITM_PROMPT_FILE` empty to use the generic bundled
  template (`templates/webfetch-summary.txt`), or point it at an absolute
  path to your own instruction template if you want to customize the
  summarization prompt sent to the third-party model.

`.env` is git-ignored — it never leaves your machine through this repo.
**Never** paste a real key into a commit, an issue, or anywhere else public.

## 3. Load the preload script whenever you run `claude`

This is the unusual part: instead of installing a package, you tell your
shell to inject `src/preload.ts` into the `claude` binary's own process at
startup, via Bun's officially documented `BUN_OPTIONS=--preload` mechanism
(see [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) for what that mechanism does
and doesn't mean). The setup below scopes this to the `claude` command only
— it does **not** export `BUN_OPTIONS` globally, so nothing else on your
machine that happens to use Bun is affected.

Replace `/absolute/path/to/webfetch-mitm` below with wherever you actually
cloned this repo (step 1).

### Linux / macOS (bash or zsh)

macOS defaults to zsh since Catalina; most Linux distros default to bash.
Check with `echo $SHELL` if you're not sure, and edit the matching file:

- bash → `~/.bashrc` (also add the same to `~/.bash_profile` on macOS if you
  use Terminal.app, which reads that instead on login shells)
- zsh → `~/.zshrc`

Append this function:

```bash
claude() {
  BUN_OPTIONS="--preload /absolute/path/to/webfetch-mitm/src/preload.ts" command claude "$@"
}
```

### Windows

Claude Code on Windows is most commonly run inside **WSL** — if that's your
setup, follow the Linux/macOS instructions above inside your WSL shell; this
is the path the project has actually been tested on.

If you run `claude` natively from PowerShell (outside WSL), the equivalent
is a function in your PowerShell profile (`$PROFILE`):

```powershell
function claude {
  $env:BUN_OPTIONS = "--preload C:\absolute\path\to\webfetch-mitm\src\preload.ts"
  & (Get-Command claude -CommandType Application).Source @args
  Remove-Item Env:\BUN_OPTIONS
}
```

Native-Windows behavior of this Bun preload mechanism against the compiled
`claude.exe` has not been verified by this project — WSL is the
better-tested route.

## 4. Restart your terminal — fully

Shell profile changes only take effect in new shells, and a `claude`
session already running was started without the wrapper. **Close the
entire terminal window (not just the tab, and not just a re-source) and
open a new one.** If you asked an agent to do this setup for you, have it
remind you of exactly this before you continue working — some terminal
emulators share environment state across tabs in ways that make a same-window
reopen unreliable.

## 5. Verify it worked

```bash
claude -p "Use the WebFetch tool to fetch https://example.com and summarize it" \
  --allowedTools WebFetch --permission-mode dontAsk
```

You should get a normal summary back. There's no visible difference in
output when it's working — check your terminal's stderr for a
`[webfetch-mitm]` log line confirming the request was intercepted and
forwarded.

## Turning it off

Delete (or comment out) the `claude()` function / PowerShell function you
added in step 3, then restart your terminal again. That's the entire
footprint — there's no other state to clean up, and Claude Code itself is
never modified on disk.
