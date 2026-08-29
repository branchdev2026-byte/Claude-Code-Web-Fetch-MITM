# Compliance & Policy Notes

**This is the project author's own reading of Anthropic's publicly published
policies, done before releasing this tool. Anthropic has not reviewed,
audited, or endorsed this project in any way, and nothing here is legal
advice.** It's published so anyone deciding whether to use this tool can see
the same reasoning the author used, rather than having to redo the research
themselves — and so it's on the record if the author's reading turns out to
be wrong.

Research was done by reading Anthropic's own published documents (linked
below) as they stood on **2026-08-29**. Policies can change after that date;
if you're relying on this, it's worth rereading the primary sources
yourself rather than trusting this summary indefinitely.

## What this tool actually does

Claude Code's built-in `WebFetch` tool internally makes a separate call to a
small model (Haiku) to summarize the page it just fetched. This project
injects a script into the `claude` process at startup (via Bun's documented
`--preload` mechanism — see [`INSTALL.md`](../INSTALL.md)) that recognizes
*only* that one specific internal call and forwards it to a third-party
model instead, to cut cost. Everything else — the main conversation, tool
calls, MCP traffic, authentication — passes through completely untouched.
If the third-party call fails or times out for any reason, the request
falls through to the real Haiku call automatically; WebFetch never breaks
because of this tool.

It never reads, stores, or transmits your Anthropic OAuth/session
credentials anywhere. The only network calls it adds are to whichever
third-party provider you configure (OpenRouter or Z.ai), using your own API
key for that provider.

## What we found checking Anthropic's published policies

Three documents were checked against what this tool actually does: Claude
Code's [Legal and compliance page](https://code.claude.com/docs/en/legal-and-compliance),
the [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms)
(the one that applies to individual Free/Pro/Max subscriptions, not the
Commercial Terms), and the [Anthropic Usage Policy](https://www.anthropic.com/legal/aup).

**The injection mechanism itself is not a hack or an exploit.** `--preload`
is a documented Bun CLI flag, and Bun's own docs state that `BUN_OPTIONS` is
read by compiled standalone executables (which is what the `claude` binary
is) specifically so runtime flags can be passed without recompiling. Using
this mechanism, on its own, isn't using an undocumented or unintended
interface.

**No clause we found squarely addresses this specific behavior.** None of
the three documents has language that maps cleanly onto "an individual
subscriber intercepts one specific internal request, in-process, on their
own machine, without touching authentication credentials." That's a
genuine gap, not a green light — the absence of a matching clause doesn't
mean the behavior is affirmatively permitted, and Anthropic's terms give it
broad discretion to suspend or terminate access for anything it believes
breaches the terms, independent of which specific clause might apply.

**Two things are close enough to be worth naming directly, as a gray
area:**

- The Consumer Terms prohibit reverse-engineering or reducing the Service
  to human-readable form. Locating the internal call this tool targets
  required reading Claude Code's (deobfuscated) source during development —
  that action falls within the literal wording of this clause, independent
  of whether the interception itself is ever deployed. This already
  happened during this project's research phase; it isn't a hypothetical
  risk.
- The Consumer Terms also restrict accessing the Services through automated
  or non-human means (bot/script). Whether redirecting one internal request
  while a human is actively driving the rest of the session counts as
  "script access" in the sense that clause means is genuinely ambiguous —
  we did not find any Anthropic statement addressing this kind of partial,
  in-process interception one way or the other.

**The Usage Policy's prohibited-use list doesn't appear to cover this.**
Its restrictions are aimed at things like bypassing safety guardrails,
scraping training data, automating account creation, and evading bans —
none of which describe what this tool does.

## Not related: the 2026 third-party-harness OAuth restrictions

Anthropic restricted several third-party coding tools' subscription OAuth
access in early 2026. That action targeted a different category of
behavior: third-party products handling or forwarding a user's Anthropic
OAuth token to route it through their own infrastructure. This tool is not
that — it runs *inside* the official `claude` binary, doesn't touch your
OAuth token at all, and every other request Claude Code makes (including
authentication) goes out exactly as it would without this tool installed.
We're calling this out explicitly because it's an easy thing to conflate;
it isn't relevant to this project's risk profile and shouldn't be read as
implying anything about it.

## Mitigations built into this project

- **Fail-open by design**: any provider failure, timeout, or unexpected
  response shape falls back to the real Haiku call rather than erroring or
  hanging.
- **Never touches authentication**: OAuth tokens and session credentials
  are never read, logged, or forwarded anywhere by this tool.
- **The bundled default prompt template is original wording**, not a
  reproduction of Anthropic's internal prompt. An earlier draft of this
  project shipped a template that closely matched Anthropic's actual
  internal wording (captured during development to verify request/response
  formats); it was rewritten before release specifically to avoid
  redistributing that text. If you want the summarization behavior to be
  closer to Claude Code's own, you're free to write your own template
  locally and point `WEBFETCH_MITM_PROMPT_FILE` at it — that file is never
  published or shared by this project.

## Bottom line

This sits in a genuine gray area rather than on either side of a clear
line, with one confirmed technicality (the reverse-engineering clause,
triggered during research) and one open question (the automated-access
clause). Anthropic retains broad discretion to act on any account
regardless of how any individual clause is read. Use this tool at your own
risk and on your own account; if you want more certainty than this
document can give you, Anthropic is the only party who can actually answer
that.

## Sources

- [Claude Code — Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)
- [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms)
- [Anthropic Usage Policy](https://www.anthropic.com/legal/aup)
- [Bun docs — `--preload` CLI option](https://bun.com/docs/cli/run)
- [Bun docs — `BUN_OPTIONS` and standalone executables](https://bun.com/docs/bundler/executables)
