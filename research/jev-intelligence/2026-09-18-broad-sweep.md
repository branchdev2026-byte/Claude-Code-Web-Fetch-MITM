# Jev / TypeSafe AI Intelligence — Link Collection (Pass 1: Broad Sweep)

**Date collected:** 2026-09-18 (as of this pass)
**Purpose:** Stage-1 OSINT / technical-intelligence collection for reverse-engineering TypeSafe AI's "Jev" model family (announced 2026-09-15). This is a **shallow, broad net-cast** — 7 parallel research passes ran ~200 search queries total across blogs, forums, social media, academic indices, and code hosts, judging relevance from titles/snippets/URLs only (no full-text reads). The goal was maximum recall, not precision — weak and speculative matches are intentionally included for a later, deeper filtering pass. Links are **not deduplicated across sections** in this version; the same URL may legitimately appear more than once because different search agents found it relevant to different topics.

## Top-line finding

As of 2026-09-18, **no public technical paper, weight release, or full architecture description for Jev exists** on arXiv, OpenReview, Semantic Scholar, Papers with Code, DBLP, or HuggingFace. Live arXiv API queries for `"TypeSafe AI"`, `title:"Jev"`, and `"parallel sampler" AND "typed"` all returned zero entries. Everything found is: TypeSafe's own blog/docs/marketing copy, third-party blog explainers and reviews, social media commentary, Hacker News discussion threads, and independent community re-implementations/audits attempting to replicate or probe Jev's behavior from the outside.

## ⚠️ Caveats — read before using this list for analysis

1. **"Erik Gafni" name collision.** The Semantic Scholar / Google Scholar "Erik Gafni" profiles that surface are a cancer-genomics/cfDNA researcher and a UCLA distributed-computing theorist, respectively — **neither is confirmed to be TypeSafe's CTO**. The `egafni` GitHub account is also unconfirmed. Do not attribute those papers to TypeSafe's Erik Gafni without independent verification.
2. **"RLCD" acronym collision.** There is an unrelated, pre-existing 2023 paper/method also abbreviated "RLCD": *Reinforcement Learning from Contrastive Distillation for Language Model Alignment* (arXiv 2307.12950). This is **not** TypeSafe's "Reinforcement Learning for Calibrated Decisions." Several search hits (OpenReview, Papers with Code) surfaced this unrelated paper — they are flagged inline but watch for this confusion in any follow-up searching.
3. **Unverified/likely-dubious "prior art" claim.** A Hacker News thread titled "Open-sourced jev architecture last year with model, paper and dataset" (https://news.ycombinator.com/item?id=49736660) claims a pre-2026 "jev architecture" paper+dataset release and cites `arxiv.org/abs/2503.23303`. This arXiv ID could **not be independently verified** by any agent in this pass — it may be a genuine prior-art lead, a mis-cited ID, or HN snark/satire (the claim of "last year" predating a model announced days ago is suspicious on its face). Treat as unconfirmed until someone opens the actual arXiv page and HN thread.
4. **Some "jev"-named projects are unrelated name collisions**, not references to TypeSafe's model (e.g., a browser-agent project called "jev-ultrafast"/"Jev Ultrafast" with a dynamic action space appears to predate or be unrelated to TypeSafe's launch — flagged inline where found).
5. **One source misspells the model as "Jeff"** (MindStudio's RLCD-vs-RLHF piece) — same subject, just a typo in their title.
6. **Community GitHub repos styled after "Jev/RLCD"** (`qwen-rlcd`, `openjev`, `Verdict-open-jev`, `jev-exploration`, `daf-jev`, etc.) are **independent third-party reimplementations/audits based on public claims**, not leaked or official TypeSafe code. They're valuable as evidence of what outsiders believe Jev's mechanism to be, not as ground truth about it.
7. Several leads are flagged by the collecting agent as **"unresolved" rather than "confirmed negative"** (DBLP, OpenReview internal search, and DuckDuckGo were bot/anti-scraper-gated during collection) — absence of a hit here doesn't mean the information doesn't exist, just that this pass couldn't retrieve it.

## Structure

- **Part A** — Official channels, people, social media, forums, skepticism/criticism, press coverage
- **Part B** — Academic indices sweep (arXiv, OpenReview, Semantic Scholar, DBLP, HuggingFace, GitHub)
- **Part C–G** — Per-paper "Jev connection" search results, organized by the 5 thematic groups from the original reading list (architecture / calibration+RL theory / LLM confidence & uncertainty / distillation & non-autoregressive decoding / structured outputs & selective prediction)

---

# Part A: Official Channels, People, Social Media, Forums, Skepticism, Press

## Agent 6: Official channels, people, social, forums, skepticism

### Official channels
- [Introducing System One Models & Jev — TypeSafe AI Blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — original announcement (2026-09-15)
- [AI: too good to be true, too bad to be useful — TypeSafe AI Blog](https://typesafe.ai/blog/ai-too-good-to-be-true-too-bad-to-be-useful-typesafe-ai) — TypeSafe's own pre-emptive post addressing skepticism
- [Home - TypeSafe AI](https://typesafe.ai/)
- [Team - TypeSafe AI](https://typesafe.ai/team) — lists Almeida (CEO), Gafni (CTO), Sheng (COO)
- [Introduction - TypeSafe AI docs](https://docs.typesafe.ai/introduction)
- [AI primer - TypeSafe AI docs](https://docs.typesafe.ai/introduction/machine-learning-primer) — discusses RLCD
- [TypeSafe · GitHub org](https://github.com/typesafe-ai)
- [typesafe-ai/vllm fork](https://github.com/typesafe-ai/vllm)
- [typesafe-ai/skills — Agent skills for TypeSafe's System One API](https://github.com/typesafe-ai/skills)
- [TypeSafe AI GitHub Pages](https://typesafe-ai.github.io/)
- [Vercel changelog: TypeSafe AI's Jev now available on AI Gateway](https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway)

### Social media
- [Diogo Almeida (@CompleteSkeptic) on X](https://x.com/CompleteSkeptic)
- [@CompleteSkeptic status 2099925684256899543](https://x.com/CompleteSkeptic/status/2099925684256899543) — "Jev can't generate text... parallel vs sequential is the same leap Transformers made over RNNs"
- [@CompleteSkeptic status 2099925682726002904](https://x.com/CompleteSkeptic/status/2099925682726002904) — announcement thread
- [Chubby on X (kimmonismus) — "sounds almost too good to be true"](https://x.com/kimmonismus/status/2100057080698950042)
- [Chubby on X — Jev summary](https://x.com/kimmonismus/status/2100222673385312617)
- [TestingCatalog on X — Jev launch summary](https://x.com/testingcatalog/status/2099968075861008781)
- [AGTP on X — "Here's what you need to know"](https://x.com/AGTPinsights/status/2099946094570733605)
- [X Trending: "Ex-OpenAI Researcher Launches Jev"](https://x.com/i/trending/2099939291707134172)
- [Wall St Engine on X](https://x.com/wallstengine/status/2099927802405654900)
- [Gina Acosta on X](https://x.com/ginacostag_/status/2099927822089228378)
- [Shay Boloor on X](https://x.com/StockSavvyShay/status/2099932058152050848)
- [elvis (@omarsar0) on X](https://x.com/omarsar0/status/2099933100440494105) — notable AI-commentary account
- [will depue (@willdepue) on X](https://x.com/willdepue/status/2099937498885464070) — commentary from OpenAI-affiliated figure
- [Sasha Sheng - TypeSafe AI | LinkedIn](https://www.linkedin.com/in/sasha-sheng-20998435/)

### Forums/aggregators
- [Introducing System One Models and Jev | Hacker News (main thread)](https://news.ycombinator.com/item?id=49717558) — comment: "70ms vs 329 seconds isn't apples-to-apples if the LLM baseline does full chain-of-thought"
- [Typesafe AI | Hacker News](https://news.ycombinator.com/item?id=49718888)
- [Typesafe.ai's System One Model | Hacker News](https://news.ycombinator.com/item?id=49718261)
- [Jev: The Model That Gives AI the Properties of Code | Hacker News](https://news.ycombinator.com/item?id=49716682)
- [Reverse-engineered Jev-like model | Hacker News](https://news.ycombinator.com/item?id=49731282)
- [AINews: Jev — a "System One Model" | Latent Space (swyx newsletter)](https://www.latent.space/p/ainews-jev-a-system-one-model-that)

### People
- Diogo Almeida (co-founder/CEO) — X: [@CompleteSkeptic](https://x.com/CompleteSkeptic); "co-inventor of RLHF/ChatGPT," ex-OpenAI
- Sasha Sheng (co-founder/COO) — [LinkedIn](https://www.linkedin.com/in/sasha-sheng-20998435/); ex-Meta/FAIR (News Feed, AI Experiences, AI Research), NeurIPS/ECCV publications
- Erik Gafni (co-founder/CTO) — described in funding-round press as repeat founder, previously founded Ravel (DNA-sequencing AI), early employee at Invitae and Freenome
- [TypeSafe AI team page](https://typesafe.ai/team)
- **No DBLP, OpenReview, or arXiv hits found specifically tying Erik Gafni or a "TypeSafe AI"/"Diogo Almeida 2026" paper to Jev.**

### Skepticism/criticism
- [TypeSafe's own "too good to be true" post](https://typesafe.ai/blog/ai-too-good-to-be-true-too-bad-to-be-useful-typesafe-ai)
- [Jev by TypeSafe AI: Is the 200x Faster Decision Model Too Good to Be True? | Flowtivity](https://flowtivity.ai/blog/jev-typesafe-ai-decision-model/) — "speed and price are real as published, the intelligence comparison is vendor-graded homework"
- [TypeSafe AI Raises $40 Million for Jev, but Its 445× Cost Claim Is Still Self-Tested | ts2.tech](https://ts2.tech/en/typesafe-ai-raises-40-million-for-jev-but-its-445x-cost-claim-is-still-self-tested/)
- [TypeSafe AI Jev Funding Puts a 445× Cost Claim Under Scrutiny | Remio](https://www.remio.ai/post/typesafe-ai-jev-funding-puts-a-445-cost-claim-under-scrutiny)
- [TypeSafe Jev Review: The AI Model That Doesn't Generate Text | Kingy AI](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/) — "not yet a proven frontier-intelligence replacement... reference labels are model-generated"
- [TypeSafe launches Jev, a chatless AI model that claims to beat Claude 193x | pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/16460/typesafe-jev-chatless-ai-beats-claude)
- [Jev: TypeSafe's Decision Model, Speed and Cost Explained | OrcaRouter](https://www.orcarouter.ai/blog/jev-typesafe-system-one-what-we-know) — no independent benchmark reproduction, no OpenRouter listing
- [RLCD vs RLHF: What Is Typesafe's "Jeff" Model Actually Claiming? | MindStudio](https://www.mindstudio.ai/blog/typesafe-jeff-rlcd-vs-rlhf) — (note: title misspells "Jev" as "Jeff")
- Hacker News commenter "ramon156" on [main thread](https://news.ycombinator.com/item?id=49717558) — flags apples-to-oranges latency comparison vs CoT LLM baselines

### Other (press/coverage)
- [TypeSafe AI's new models work with machines, not humans | InfoWorld](https://www.infoworld.com/article/4223468/typesafe-ais-new-models-work-with-machines-not-humans.html)
- [AI model "Jev" to make machines decide faster | heise online (German)](https://www.heise.de/en/news/AI-model-Jev-to-make-machines-decide-faster-11457071.html)
- [TypeSafe launches Jev for AI decisions inside software | The Rundown AI](https://www.therundown.ai/news/typesafe-jev-ai-decisions-software)
- [ChatGPT co-developers created 'Jev'... GPT-5.6 Terra-level performance | GIGAZINE (Japanese)](https://gigazine.net/gsc_news/en/20260916-system-one-jev/)
- [TypeSafe AI Emerges From Stealth With $40M in Funding | BusinessWire](https://www.businesswire.com/news/home/20260915525333/en/TypeSafe-AI-Emerges-From-Stealth-With-$40M-in-Funding-With-New-Model-for-Composable-AI) (syndicated: [Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/typesafe-ai-emerges-stealth-40m-190000776.html), [Morningstar](https://www.morningstar.com/news/business-wire/20260915525333/typesafe-ai-emerges-from-stealth-with-40m-in-funding-with-new-model-for-composable-ai), [HPCwire/AIwire](https://www.hpcwire.com/aiwire/2026/09/16/typesafe-ai-emerges-from-stealth-with-40m-in-funding-with-new-model-for-composable-ai/), [SiliconANGLE](https://siliconangle.com/2026/09/16/typesafe-ai-exits-stealth-with-40m-to-build-ai-for-use-by-software/), [FinancialContent/WRAL](https://markets.financialcontent.com/wral/article/bizwire-2026-9-15-typesafe-ai-emerges-from-stealth-with-40m-in-funding-with-new-model-for-composable-ai))
- [TypeSafe exits stealth with $40M seed | Dealroom News](https://dealroom.co/news/151032-typesafe-exits-stealth-with-40m-seed-to-build-ai-for-software-not-people/) — notes Forbes-reported $200M valuation, DCVC-led round
- [Aventure funding writeup](https://aventure.vc/news/2026-09-16-typesafe-ai-exits-stealth-with-40m-to-build-ai-for-use-by-software)
- [Jev: The Language Model That Won't Talk | Anthony Maio (Substack)](https://anthonymaio.substack.com/p/jev-the-language-model-that-wont)
- [Mini-Vibe Check: TypeSafe's Jev Judged Everything I've Written in 0.7 Seconds | Every.to](https://every.to/also-true-for-humans/mini-vibe-check-typesafe-s-jev-judged-everything-i-ve-written-in-0-7-seconds)
- [TypeSafe opens Jev early access | RuntimeWire](https://runtimewire.com/article/typesafe-jev-system-one-ai-model-early-access)
- [TypeSafe AI Jev Review: How It Works vs LLMs | Actionbox](https://actionbox.cloud/blog/typesafe-ai-jev-review/)
- [TypeSafe AI Launches Jev for Structured AI Automation | HyperAI](https://hyper.ai/en/stories/6f7d07f4680cc41bc4f4fe69a2ad79c1)
- [TypeSafe Jev: $0.042/1M Decision Model vs Auto-Regressive LLMs and MDLM | lilting channel](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model)
- [TypeSafe Jev: A Model That Returns Decisions, Not Text | Digital Applied](https://www.digitalapplied.com/blog/typesafe-jev-system-one-model-typed-decisions)
- [Jev: TypeSafe's System One Model That Never Hallucinates | DataCamp](https://www.datacamp.com/blog/system-one-models-jev)
- [AI Specialized for High-Speed Decision Making | note.com (Japanese, npaka)](https://note.com/npaka/n/n6f8dd30a5fa4?hl=en)
- [ChatGPT pioneer launches Jev model for programmatic logic | AI News](https://www.artificialintelligence-news.com/news/chatgpt-pioneer-launches-jev-model-for-programmatic-logic/)
- [ICYMI: TypeSafe AI launches Jev | TestingCatalog](https://www.testingcatalog.com/icymtypesafe-ai-launches-jev-for-structured-ai-decisions/)
- [TypeSafe Launches Jev for Fast, Structured AI Decisions | Superpower Daily](https://superpowerdaily.com/posts/typesafe-launches-jev-for-fast-structured-ai-decisions)
- [TypeSafe Jev: The model built to kill chat | StartupHub.ai](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/typesafe-jev-model-kills-chat)
- [TypeSafe Jev model launches for deterministic logic | RelveHQ](https://relvehq.com/blog/noise/typesafe-jev-model-deterministic-logic)
- [Jev Model: Proven Speed, Smart Logic Without a Chatbot | ProgressiveRobot](https://www.progressiverobot.com/2026/09/16/jev-model-typesafe-programmatic-logic/)
- [ChatGPT co-inventor Diogo Almeida launches Jev | AI Socratic](https://aisocratic.org/news/chatgpt-co-inventor-diogo-almeida-launches-jev-a-decision-model-he-says-is-20200x-faster-than-frontier-llms)
- [TypeSafe AI | AI Wiki](https://aiwiki.ai/wiki/typesafe_ai)
- [Jev (AI model) | AI Wiki](https://aiwiki.ai/wiki/jev)
- [TypeSafe Jev: the First Decision-Only Model Class, Benchmarked and Priced | Developers Digest](https://www.developersdigest.tech/blog/typesafe-jev-system-one-models-release-guide-2026)
- [Jev — TypeSafe's model returns typed decisions | AI/TLDR](https://ai-tldr.dev/releases/typesafe-jev/)
- [Jev by TypeSafe AI: System One Models Explained (2026) | SaaSCity](https://saascity.io/blog/system-one-models-jev-typesafe-ai-2026)
- [Jev by TypeSafe AI: 200x Faster Structured-Output Model | explainx.ai](https://www.explainx.ai/blog/typesafe-ai-jev-system-one-models-launch-2026)
- [What Is Jev, the New Model From TypeSafe AI? | Tech Brew Ride Home Podcast (YouTube)](https://www.youtube.com/watch?v=Ipom6c1fcP0)
- [TypeSafe's Jev: Machine-Native Models and Why Agents Need Typed Decisions | DEV Community](https://dev.to/ifynx_studio/typesafes-jev-machine-native-models-and-why-agents-need-typed-decisions-4fh8)
- [The Register: TypeSafe AI debuts model for machines that plays Doom](https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711)
- [The AI Insider: TypeSafe AI Emerges From Stealth With $40M](https://theaiinsider.tech/2026/09/17/typesafe-ai-emerges-from-stealth-with-40m-to-build-machine-native-ai-models/)
- [aiera.blog: Jev AI](https://aiera.blog/jev-ai-what-typesafes-new-decision-model-actually/)
- [AI Model Benchmarks | Compare GPT-5.6, Claude Fable 5 & Gemini 3 | LM Council](https://lmcouncil.ai/benchmarks) — tangential general benchmark comparison site

Note from agent: What's Next After RLHF? — Diogo Almeida, TypeSafe AI (YouTube) interview also surfaced in other agents' passes: https://www.youtube.com/watch?v=cJ0EOzey--o


---

# Part B: Academic Indices Sweep (arXiv, OpenReview, Semantic Scholar, DBLP, HuggingFace, GitHub)

## Agent 7: Academic indices & aggregators (arXiv, OpenReview, Semantic Scholar, DBLP, HuggingFace)

### arXiv
- [A Generalizable Approach to Learning Optimizers (2021)](https://arxiv.org/abs/2106.00958) — Diogo Almeida (with Clemens Winter, Jie Tang, Wojciech Zaremba); most recent pre-TypeSafe technical work found.
- [InstructGPT (2022)](https://arxiv.org/abs/2203.02155) — Diogo Almeida co-author, known background.
- [GPT-4 Technical Report (2023)](https://arxiv.org/abs/2303.08774) — Diogo Almeida co-author, known background.
- [Resnet in Resnet (2016)](https://arxiv.org/abs/1603.08029) — Sasha Targ, Diogo Almeida, Kevin Lyman — different "Sasha" (Targ, not Sheng).
- [Understanding and Improving CNNs via Concatenated ReLUs (2016)](https://arxiv.org/abs/1603.05201) — Diogo Almeida co-author, background only.
- [Human-Adversarial Visual Question Answering (2021)](https://arxiv.org/abs/2106.02280) — Sasha Sheng et al., known prior work.
- [MUGEN (2022)](https://arxiv.org/abs/2204.08058) — Sasha Sheng co-author, known prior work.
- **NAME COLLISION WARNING**: [RLCD: Reinforcement Learning from Contrastive Distillation for Language Model Alignment (2023)](https://arxiv.org/abs/2307.12950) — unrelated method also abbreviated "RLCD," easy to confuse with TypeSafe's "Reinforcement Learning for Calibrated Decisions."
- Checked-and-ruled-out: [Training-Free Task Vectors for LLM Behavioral Control](https://arxiv.org/html/2609.09054) — confirmed Diogo Almeida is NOT an author (only cited via GPT-4 report).
- **Confirmed negative**: live arXiv API queries for `"TypeSafe AI"`, `title:"Jev"`, and `"parallel sampler" AND "typed"` all returned zero entries — consistent with no public technical paper as of 2026-09-18.

### OpenReview
- [Diogo Almeida — OpenReview profile](https://openreview.net/profile?id=~Diogo_Almeida1) — profile exists but was bot-gated during this pass; listed papers unconfirmed, worth manual re-check.
- Speculative/unverified authorship "just in case" hits from a "Diogo Almeida" OpenReview query: [Implicit Bias of Spectral Descent and Muon on Multiclass Separable Data](https://openreview.net/pdf?id=Zn2ajV1kTQ), [TMLR paper 11/2025](https://openreview.net/pdf?id=jp1AdIcKTj), [ColorBrowserAgent](https://openreview.net/pdf/ae2ee05df2068a9457d3a71550dc7b12b4fe68e0.pdf), [HARDMATH benchmark](https://openreview.net/pdf?id=gt6prlTEGL), [CBraMod (ICLR 2025)](https://openreview.net/pdf?id=NPNUHgHF2w), [Informed Tree of Thought](https://openreview.net/pdf?id=EJNkaV27yB), [ICLR 2024 paper](https://openreview.net/pdf?id=r42tSSCHPh), [ICLR 2026 paper](https://openreview.net/pdf?id=9cUdn8GKId).
- [RLCD (unrelated) — OpenReview forum](https://openreview.net/forum?id=v3XXtxWKi6) — same name-collision as above.
- [NeurIPS 2026 Conference — OpenReview](https://openreview.net/group?id=NeurIPS.cc/2026/Conference) — venue exists; submissions not searchable in this pass (bot-gated).
- No OpenReview results for exact "TypeSafe AI" or "Erik Gafni" queries.

### Semantic Scholar / Papers with Code
- **NAME COLLISION**: [Erik Gafni — Semantic Scholar (author ID 40103273)](https://www.semanticscholar.org/author/Erik-Gafni/40103273) — this is a DIFFERENT Erik Gafni, a cancer-genomics/cfDNA researcher, NOT TypeSafe's CTO.
- Another namesake: "E. Gafni" (Semantic Scholar author ID 2401975217) — sound source localization/genetics/tech-diffusion papers — irrelevant.
- Sasha Sheng — Semantic Scholar profile confirmed only the 2 known papers (AdVQA, MUGEN), no new work.
- [RLCD (unrelated) — Papers with Code](https://paperswithcode.com/paper/rlcd-reinforcement-learning-from-contrast) — same name-collision.
- No "TypeSafe AI" or "Jev" results on Papers with Code.
- Semantic Scholar bulk search API was rate-limited before a direct "RLCD calibrated decisions typed" query could complete — inconclusive, not confirmed-negative.

### DBLP / Scholar
- DBLP and direct Google search were bot-gated throughout this pass for both "Diogo Almeida" and "Erik Gafni" — **unresolved, not negative**; worth manual follow-up.
- **NAME COLLISION**: [Erik S. Gafni — Google Scholar](https://scholar.google.com/citations?user=IiAPlrYAAAAJ&hl=en) — this is the UCLA distributed-computing theorist (k-set consensus, asynchronous computability), a different person from TypeSafe's CTO.

### HuggingFace
- Searches for "jev" and "typesafe" on HuggingFace Models returned no genuine matches — all "jev*" hits are unrelated usernames/personal fine-tunes. No TypeSafe org or Jev model card published there yet.

### GitHub / community signals
- [egafni · GitHub](https://github.com/egafni) — account for "Erik Gafni," identity unconfirmed relative to TypeSafe's CTO (name also matches the bioinformatics Erik Gafni, whose COSMOS tool is GitHub-hosted) — flag just in case.
- Community repos reacting to Jev/TypeSafe launch:
  - [devagrawal09/jev-review](https://github.com/devagrawal09/jev-review) (138★)
  - [Anil-matcha/awesome-jev-by-typesafe](https://github.com/Anil-matcha/awesome-jev-by-typesafe) (393★) — "awesome list" aggregator
  - [jkudish/jev-mcp](https://github.com/jkudish/jev-mcp) (37★) — MCP integration for Jev
  - [iammrduncan/typesafe-ai-benchmark](https://github.com/iammrduncan/typesafe-ai-benchmark) (25★)
  - [Twister915/typesafe-ai](https://github.com/Twister915/typesafe-ai) (6★)
  - [BunsDev/typesafe-ai-playground](https://github.com/BunsDev/typesafe-ai-playground) (5★)
  - [nickthompson480/typesafe-ai-playground](https://github.com/nickthompson480/typesafe-ai-playground) (2★)
- [infosiragpt-ops/SiraGPT-APP PR #721 "feat(rlcd): calibrated decisions..."](https://github.com/infosiragpt-ops/SiraGPT-APP/pull/721) — almost certainly unrelated/coincidental terminology overlap, flagged given exact "calibrated decisions"/"rlcd" naming.
- GitHub search for "RLCD calibrated" repos hit rate limit mid-pass — incomplete, not confirmed-negative.

### Conference venues
- No ICML 2026, ICLR 2026, or NeurIPS 2026 submission specifically matching TypeSafe/Jev/RLCD found. `site:` filters didn't reliably work for this combination; OpenReview per-venue search was bot-gated. Should be retried with authenticated/direct browsing.

### Other (non-academic, surfaced despite site: filters)
- [TypeSafe AI — official site](https://typesafe.ai/), [docs.typesafe.ai](https://docs.typesafe.ai/introduction), [typesafe.ai/team](https://typesafe.ai/team), [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [InfoWorld](https://www.infoworld.com/article/4223468/typesafe-ais-new-models-work-with-machines-not-humans.html)
- [HPCwire/AIwire](https://www.hpcwire.com/aiwire/2026/09/16/typesafe-ai-emerges-from-stealth-with-40m-in-funding-with-new-model-for-composable-ai/)
- [The Register: TypeSafe AI debuts model for machines that plays Doom](https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711)
- [AI News: ChatGPT pioneer launches Jev model for programmatic logic](https://www.artificialintelligence-news.com/news/chatgpt-pioneer-launches-jev-model-for-programmatic-logic/)
- [The AI Insider](https://theaiinsider.tech/2026/09/17/typesafe-ai-emerges-from-stealth-with-40m-to-build-machine-native-ai-models/)
- [Kingy AI Review](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/), [Anthony Maio Substack](https://anthonymaio.substack.com/p/jev-the-language-model-that-wont), [orcarouter.ai](https://www.orcarouter.ai/blog/jev-typesafe-system-one-what-we-know), [aiera.blog](https://aiera.blog/jev-ai-what-typesafes-new-decision-model-actually/), [every.to mini vibe-check](https://every.to/also-true-for-humans/mini-vibe-check-typesafe-s-jev-judged-everything-i-ve-written-in-0-7-seconds), [aiwiki.ai](https://aiwiki.ai/wiki/typesafe_ai)

### Coverage gaps (agent's own notes)
- WebSearch hit a session-wide 200-call budget cap after ~12 queries, forcing a switch to direct WebFetch/API calls (arXiv export API, Semantic Scholar API, GitHub/HuggingFace search pages).
- DBLP, OpenReview's internal search, and DuckDuckGo were bot/anti-scraping gated — several planned queries unresolved rather than confirmed-negative.
- **Bottom line: no direct academic trace (arXiv, OpenReview, Semantic Scholar, Papers with Code, DBLP-confirmed) of "Jev," "TypeSafe AI," or "RLCD" (in TypeSafe's sense) was found. Most "Erik Gafni" and "RLCD" hits are namesake/acronym collisions with unrelated people/methods.**


---

# Part C: Architecture Papers (Perceiver IO, Perceiver, Set Transformer, Deep Sets, DETR, CNP, ANP, BLIP-2/Q-Former)

## Agent 1: Architecture papers (Perceiver IO, Perceiver, Set Transformer, Deep Sets, DETR, CNP, ANP, BLIP-2/Q-Former)

### Perceiver IO: A General Architecture for Structured Inputs & Outputs (2107.14795)
- [Jev's Architecture Unmasked — archerhume](https://archerhume.com/posts/jevs-architecture-unmasked/) — blog post reverse-engineering Jev's architecture via ~10,000 API calls; discusses reading decision probabilities from internal representations, conceptually adjacent to Perceiver IO's "read-process-write" output-query paradigm. Note: page appears dated June 2026, before the Sept 15 2026 Jev launch — date/identity should be verified before use.
- [From Set Transformer to Perceiver Sampler | Towards Data Science](https://towardsdatascience.com/from-set-transformer-to-perceiver-sampler-2f18e741d242/) — title directly bridges "Set Transformer" and a "Perceiver Sampler" naming pattern that echoes Jev's "parallel sampler" terminology; strong speculative match worth a closer read later.
- [Reverse-engineered Jev-like model | Hacker News](https://news.ycombinator.com/item?id=49731282) — HN thread on a reverse-engineered "jevlike" architecture; general discussion likely touches read/process/write-style latent designs.
- [Vincent Wang-Maścianica on X: "I reverse-engineered a jev-like architecture..."](https://x.com/vinnylarouge/status/2100170846346097083) — same reverse-engineering effort, links a GitHub training repo for "jevlikes."
- [Typesafe.ai's System One Model | Hacker News](https://news.ycombinator.com/item?id=49718261) — general HN launch-discussion thread; commenters speculate on architecture — weak/speculative match.
- [Introducing System One Models and Jev | Hacker News](https://news.ycombinator.com/item?id=49717558) — main HN launch thread, "commenters guessed everything from a stripped-down text diffusion model to an encoder-only transformer with classification heads" — weak/speculative, not Perceiver-specific.

### Perceiver: General Perception with Iterative Attention (2103.03206)
- [From Set Transformer to Perceiver Sampler | Towards Data Science](https://towardsdatascience.com/from-set-transformer-to-perceiver-sampler-2f18e741d242/) — same as above; directly juxtaposes Perceiver-style sampling with Jev-adjacent "sampler" language.
- [Jev's Architecture Unmasked — archerhume](https://archerhume.com/posts/jevs-architecture-unmasked/) — weak/speculative match, general internal-representation/latent read-out framing.
- [ChatGPT pioneer launches Jev model for programmatic logic](https://www.artificialintelligence-news.com/news/chatgpt-pioneer-launches-jev-model-for-programmatic-logic/) — cites HN commenters' architecture guesses (diffusion vs. encoder-only classifier); no explicit "Perceiver" mention but background for architecture speculation.

### Set Transformer (Lee et al., ICML 2019)
- [From Set Transformer to Perceiver Sampler | Towards Data Science](https://towardsdatascience.com/from-set-transformer-to-perceiver-sampler-2f18e741d242/) — strongest match found for this topic; explicitly connects Set Transformer lineage to a "Sampler" concept.
- [Jev: The Model That Gives AI the Properties of Code | Hacker News](https://news.ycombinator.com/item?id=49716682) — general HN thread, no explicit Set Transformer mention but part of the architecture-speculation cluster — weak/speculative.
- (Deep-dive academic Set Transformer papers, e.g. arxiv.org/pdf/1810.00825, surfaced but with no Jev/TypeSafe connection — general topical background only.)

### Deep Sets (1703.06114)
- [GitHub - dnakhoa/jev-deferred-crispification](https://github.com/dnakhoa/jev-deferred-crispification) — position paper arguing Jev/System-One decision models are missing "Hidden-Markov and fuzzy primitives"; notes "Expected calibration error is permutation-invariant" as a limitation — touches permutation-invariance concept (Deep Sets' core property) in a critique of Jev. Weak/speculative but notable.
- (no direct results found connecting Deep Sets specifically to Jev beyond the above)

### DETR: End-to-End Object Detection with Transformers (2005.12872)
- [How Does Jev Work? RLCD & Parallel Inference Explained | explainx.ai](https://www.explainx.ai/blog/how-does-jev-work-rlcd-system-one-model-explained-2026) — explicitly draws the DETR analogy: "This approach shares architectural similarities with DETR-style object detection models... DETR introduced preset parallelized learnable queries... The parallel nature of Jev's design is key to its performance." Strong direct match.
- [DETR-based algorithms — Wikipedia](https://en.wikipedia.org/wiki/DETR-based_algorithms) — surfaced alongside Jev/TypeSafe queries; general background.
- [Jev: The Model That Gives AI the Properties of Code | Hacker News](https://news.ycombinator.com/item?id=49716682) — general architecture-speculation thread, weak/speculative match.

### Conditional Neural Processes (1807.01613)
- (no results found directly connecting CNPs to Jev/TypeSafe)
- General topical background only: [The Neural Process Family: Survey, Applications and Perspectives](https://arxiv.org/pdf/2209.00517), [Convolutional Conditional Neural Processes](https://arxiv.org/pdf/2408.09583)

### Attentive Neural Processes (1901.05761)
- (no results found directly connecting ANPs to Jev/TypeSafe)
- General topical background only: [Property modeling using attentive neural processes (patent)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12524583), [Dimension Agnostic Neural Processes](https://arxiv.org/pdf/2502.20661)

### BLIP-2 / Q-Former (2301.12597)
- (no results found directly connecting Q-Former/BLIP-2 to Jev/TypeSafe)
- [browser-use/jev-ultrafast — Seismograph for GitHub](https://gitnova.dev/en/r/browser-use/jev-ultrafast) — likely a false positive / name collision (unrelated browser-agent project named "jev"), not TypeSafe's Jev.
- General topical background only: [BLIP-2 · Hugging Face](https://huggingface.co/docs/transformers/model_doc/blip-2), [Zero-shot image-to-text generation with BLIP-2](https://huggingface.co/blog/blip-2)

### General / Cross-Topic Architecture Speculation (not tied to one paper)
- [Typesafe AI | Hacker News](https://news.ycombinator.com/item?id=49718888) — general launch discussion.
- [Introducing System One Models and Jev | Hacker News](https://news.ycombinator.com/item?id=49717558) — main HN thread; source of widely-quoted line "commenters guessed everything from a stripped-down text diffusion model to an encoder-only transformer with classification heads."
- [Open-sourced jev architecture last year with model, paper and dataset | Hacker News](https://news.ycombinator.com/item?id=49736660) — HN post claiming prior-art/open-sourced "jev" architecture with paper+dataset; worth deeper review to check if it cites any of the target papers.
- [Reverse-engineered Jev-like model | Hacker News](https://news.ycombinator.com/item?id=49731282) and matching [X post](https://x.com/vinnylarouge/status/2100170846346097083) — independent reverse-engineering attempt with a public training repo.
- [[AINews] Jev: a "System One Model"... | Latent Space](https://www.latent.space/p/ainews-jev-a-system-one-model-that) — aggregator/newsletter coverage of the launch.
- [GitHub - dnakhoa/jev-deferred-crispification](https://github.com/dnakhoa/jev-deferred-crispification) — critical position paper on Jev's architecture class, archived on Zenodo (DOI 10.5281/zenodo.22801506).
- [Wall St Engine on X](https://x.com/wallstengine/status/2099927802405654900) — launch announcement thread.
- [Hephaestvs on X](https://x.com/Vulcanux_/status/2099985257034346574) — amplifies the HN "Introducing System One Models and Jev" thread.
- [Jev's Architecture Unmasked — archerhume](https://archerhume.com/posts/jevs-architecture-unmasked/) — most substantive independent technical speculation found; reverse-engineers behavior via API probing (date stamp anomaly noted above).
- [TypeSafe's Jev and the Parse-Validate-Retry Tax... — FourWeekMBA](https://fourweekmba.com/ai-typesafe-jev-system-one-model-structured-output/) — architecture/business analysis blog.
- [TypeSafe Jev: $0.042/1M Decision Model vs Auto-Regressive LLMs and MDLM — lilting channel](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model) — compares Jev to autoregressive LLMs and masked diffusion LMs (MDLM).
- [TypeSafe Jev Review — Kingy AI](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/) — general critical review.
- [How Does Jev Work? RLCD & Parallel Inference Explained — explainx.ai](https://www.explainx.ai/blog/how-does-jev-work-rlcd-system-one-model-explained-2026) — DETR analogy + general RLCD/parallel-sampler explainer.
- [I tried replacing model routing with TypeSafe (Jev)... — DevelopersIO](https://dev.classmethod.jp/en/articles/jev-for-llm-model-routing/) — practitioner writeup.
- [AI Specialized for High-Speed Decision Making - TypeSafe "Jev"... — note.com (npaka)](https://note.com/npaka/n/n6f8dd30a5fa4?hl=en) — Japanese-language explainer.
- [Introducing System One Models & Jev - TypeSafe AI Blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — primary source announcement.
- [Manifesto - TypeSafe AI](https://typesafe.ai/manifesto) — company manifesto.
- [Introduction - TypeSafe AI docs](https://docs.typesafe.ai/introduction) — official docs.


---

# Part D: Calibration Theory & RLCD-Adjacent RL Papers

## Agent 2: Calibration theory & RLCD-adjacent papers

### Beyond Binary Rewards: Training LMs to Reason About Their Uncertainty / RLCR (arxiv 2507.16806)
- [Beyond Binary Rewards (arxiv abs)](https://arxiv.org/abs/2507.16806) — TypeSafe write-ups explicitly describe RLCD's reward as "combined correctness + Brier-score reward in an RLCR-style approach" — direct link.
- [GitHub - damanimehul/RLCR (official repo)](https://github.com/damanimehul/RLCR) — canonical reference RLCD is being compared against.
- [smollm2-360m-boolq-calibration-sft-v1 (Hugging Face)](https://huggingface.co/25b3nk/smollm2-360m-boolq-calibration-sft-v1) — explicitly "inspired by TypeSafe AI's Jev model and RLCD" — direct connection.
- [Papers Explained 439: RLCR — Medium](https://ritvik19.medium.com/papers-explained-439-reinforcement-learning-with-calibration-rewards-rlcr-bafda59538fd) — surfaced alongside "qwen-rlcd" (a Jev-style project) — weak/speculative.
- [Paper Note: Beyond Binary Rewards (papernotes.org, ICLR 2026)](https://en.papernotes.org/ICLR2026/reinforcement_learning/beyond_binary_rewards_training_lms_to_reason_about_their_uncertainty/) — general background.
- [Pith Review: 2507.16806](https://pith.science/paper/2507.16806) — general background.
- [ML Anthology entry (ICLR 2026)](https://mlanthology.org/iclr/2026/damani2026iclr-beyond/) — general background.
- [Decoupling Reasoning and Confidence: Resurrecting Calibration in RLVR (papernotes.org, ICML 2026)](https://en.papernotes.org/ICML2026/llm_alignment/decoupling_reasoning_and_confidence_resurrecting_calibration_in_reinforcement_le/) — weak/speculative, adjacent RLVR-calibration paper.

### Balancing Classification and Calibration via Calibration-Aware RL (arxiv 2601.13284, ACL Findings 2026)
- [alphaXiv version](https://www.alphaxiv.org/abs/2601.13284) — co-occurs with RLCD terminology searches; strong topical overlap.
- [arxiv HTML v1](https://arxiv.org/html/2601.13284v1) — describes reducing ECE up to 9 points while preserving RLVR accuracy — parallels RLCD's stated goals.
- [Ranking-Aware Calibration for Reliable Multimodal RL (arxiv 2605.16999)](https://arxiv.org/pdf/2605.16999) — weak/speculative match.

### Reaching Beyond the Mode: RL for Distributional Reasoning / Multi-Answer RL (arxiv 2603.24844)
- [2603.24844 (arxiv abs)](https://arxiv.org/abs/2603.24844) — addresses mode-collapse in RLVR, thematically adjacent to Jev's typed choice/distribution outputs; no direct Jev mention.
- [Reaching Beyond the Mode project page](https://multi-answer-rl.github.io/) — general background.
- [Bytez paper summary](https://bytez.com/docs/arxiv/2603.24844/paper) — general background.
- [GitHub - shamazharikh/qwen-rlcd: "Jev-style calibrated decision model (Choice/Score/Noul) on Qwen3.5-0.8B"](https://github.com/shamazharikh/qwen-rlcd) — independent reimplementation explicitly styled after Jev/RLCD, outputs multiple decision types — weak/speculative direct link to this paper, strong general relevance.

### On the Effectiveness of Reward Functions in RL for Confidence Calibration (arxiv 2607.04332)
- [2607.04332 (arxiv abs)](https://arxiv.org/abs/2607.04332) — describes "confidence reward hacking" in RL calibration reward design, directly relevant to how RLCD's reward scheme could fail.
- [2607.04332 (PDF)](https://arxiv.org/pdf/2607.04332) — surfaced alongside TypeSafe/Jev/RLCD blog summaries (topical co-occurrence).
- [Pith paper page for 2607.04332](https://pith.science/paper/2607.04332) — general background.
- [Confidence-Calibrated Small-Large LM Collaboration (arxiv 2603.03752)](https://arxiv.org/pdf/2603.03752) — weak/speculative.
- [HeddleCo/heddle GitHub issue #1763: "Explore TypeSafe Jev for Ready triage + product decision surfaces"](https://github.com/HeddleCo/heddle/issues/1763) — product team discussing Jev for confidence-gated triage — weak/speculative, tangential.

### Brier (1950) — Verification of Forecasts Expressed in Terms of Probability
- [ADS abstract of Brier (1950)](https://ui.adsabs.harvard.edu/abs/1950MWRv...78....1B/abstract) — multiple TypeSafe/Jev secondary sources explicitly cite the Brier score as the proper scoring rule underlying RLCD rewards.
- [Semantic Scholar: Verification of Forecasts...](https://www.semanticscholar.org/paper/VERIFICATION-OF-FORECASTS-EXPRESSED-IN-TERMS-OF-Brier/feee6551179612b9691f021b583d8a99b81b9b86) — background.
- [Introducing System One Models & Jev — TypeSafe AI Blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — **primary source; explicitly states RLCD "uses verifiable ground-truth data and proper scoring rules, such as the Brier score, to compute rewards."**
- [TypeSafe Jev: Decision Model, Speed and Cost Explained — orcarouter.ai](https://www.orcarouter.ai/blog/jev-typesafe-system-one-what-we-know) — repeats Brier-score-as-reward claim.
- [TypeSafe Jev: $0.042/1M Decision Model — lilting channel](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model) — same claim.
- [Making better decisions with the Brier score | Hacker News](https://news.ycombinator.com/item?id=27417425) — older general HN thread, no direct Jev mention.
- [GitHub - Heman10x-NGU/Verdict-open-jev](https://github.com/Heman10x-NGU/Verdict-open-jev) — direct match; independent "TypeSafe AI Jev benchmark audit" repo reporting Brier score (0.0252) alongside ECE for a Jev-style RLCD model.

### Gneiting & Raftery — Strictly Proper Scoring Rules, Prediction, and Estimation
- [Semantic Scholar entry](https://www.semanticscholar.org/paper/Strictly-Proper-Scoring-Rules,-Prediction,-and-Gneiting-Raftery/6bbd8fc39487249bd1b6886e4dc763550877b758) — canonical citation behind "proper scoring rules," a term TypeSafe uses verbatim for RLCD's reward mechanism.
- [Gneiting & Raftery 2007 PDF (U. Washington)](https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf) — general background.
- [TypeSafe Jev blog — digitalapplied.com](https://www.digitalapplied.com/blog/typesafe-jev-system-one-model-typed-decisions) — explicitly invokes "proper scoring rules (PSRs)" as theoretical basis for RLCD.
- [Honest Reporting in Scored Oversight (arxiv 2605.03793)](https://arxiv.org/pdf/2605.03793) — weak/speculative.
- [Proper scoring rules for estimation and forecast evaluation (arxiv 2504.01781)](https://arxiv.org/pdf/2504.01781) — general background.

### On Calibration of Modern Neural Networks (Guo et al., ICML 2017)
- [On Calibration of Modern Neural Networks (arxiv 1706.04599)](https://arxiv.org/abs/1706.04599) — TypeSafe/Jev commentary explicitly cites Guo et al. 2017 and temperature scaling as the baseline RLCD/Jev is positioned against.
- [PMLR v70 Guo et al. 2017](https://proceedings.mlr.press/v70/guo17a.html) — cited discussing "chat-tuned models lean overconfident, temperature scaling can fix calibration issues" vs. Jev.
- [Neural Network Calibration — Geoff Pleiss blog](https://geoffpleiss.com/blog/nn_calibration.html) — Pleiss is a Guo et al. co-author; surfaced alongside Jev/TypeSafe calibration comparisons.
- [GitHub PR #31, 3dwag98/3dwag98.github.io: "blog: add 'A model that answers in types' — TypeSafe's Jev"](https://github.com/3dwag98/3dwag98.github.io/pull/31) — direct match; blog draft on TypeSafe's Jev found alongside Guo/temperature-scaling comparisons.
- [Calibration in Deep Learning: A Survey (arxiv 2308.01222)](https://arxiv.org/pdf/2308.01222) — weak/speculative.
- [davidstutz.de summary of Guo et al.](https://davidstutz.de/on-calibration-of-modern-neural-networks-guo-et-al/) — general background.

### Beyond Temperature Scaling: Dirichlet Calibration (arxiv 1910.12656)
- [Beyond temperature scaling: Dirichlet calibration (PDF)](https://arxiv.org/pdf/1910.12656) — **search indicates TypeSafe's own docs (docs.typesafe.ai) mention "using Dirichlet scaling if there is class-specific bias" as part of Jev's calibration approach — direct, non-speculative connection, flagged for deeper review.**
- [Beyond temperature scaling — NeurIPS 2019 proceedings](https://proceedings.neurips.cc/paper/2019/hash/8ca01ea920679a0fe3728441494041b9-Abstract.html) — general background.
- [GitHub - shamazharikh/qwen-rlcd](https://github.com/shamazharikh/qwen-rlcd) — surfaced directly in Dirichlet+Jev/RLCD search.
- [Calibration Regularized Training of DNNs (OpenReview)](https://openreview.net/pdf?id=1-lFH8oYTI) — weak/speculative.
- [AI primer - TypeSafe AI docs](https://docs.typesafe.ai/introduction/machine-learning-primer) — **primary source, likely contains the Dirichlet scaling reference — high priority for closer read.**

### Verified Uncertainty Calibration (NeurIPS 2019)
- [Verified Uncertainty Calibration — NeurIPS proceedings](https://proceedings.neurips.cc/paper/2019/hash/f8c0c968632845cd133308b1a494967f-Abstract.html) — no direct Jev mention.
- [NeurIPS Poster page](https://neurips.cc/virtual/2019/poster/14517) — no direct Jev mention.
- [NeurIPS 2019 slides (Kumar, Liang, Ma)](https://neurips.cc/media/neurips-2019/Slides/15698.pdf) — no direct Jev mention.
- [Measuring Uncertainty Calibration (arxiv 2512.13872)](https://arxiv.org/pdf/2512.13872) — weak/speculative, no direct Jev mention.

### Measuring Calibration in Deep Learning (arxiv 1904.01685)
- [Measuring Calibration in Deep Learning (arxiv abs)](https://arxiv.org/abs/1904.01685) — no direct Jev mention.
- [arxiv PDF](https://arxiv.org/pdf/1904.01685) — ECE flaws discussion, thematically relevant to critiques of Jev's undisclosed ECE claims but no direct textual link.
- [ResearchGate copy](https://www.researchgate.net/publication/332186300_Measuring_Calibration_in_Deep_Learning) — no direct Jev mention.

### Cross-cutting / general RLCD-calibration discussion
- [TypeSafe AI Blog: Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — primary announcement, defines RLCD, proper scoring rules/Brier score.
- [AI primer - TypeSafe AI docs](https://docs.typesafe.ai/introduction/machine-learning-primer) — reportedly mentions Dirichlet scaling.
- [RLCD vs RLHF: What Is Typesafe's Jev Model Actually Claiming? — MindStudio](https://www.mindstudio.ai/blog/typesafe-jeff-rlcd-vs-rlhf) — analytical comparison of RLCD to RLHF/RLVR.
- [Introducing System One Models and Jev | Hacker News (256-comment thread)](https://news.ycombinator.com/item?id=49717558)
- [Jev: The Model That Gives AI the Properties of Code | Hacker News](https://news.ycombinator.com/item?id=49716682)
- [Reverse-engineered Jev-like model | Hacker News](https://news.ycombinator.com/item?id=49731282)
- [Open-sourced jev architecture last year with model, paper and dataset | Hacker News](https://news.ycombinator.com/item?id=49736660) — commenter cites arxiv.org/abs/2503.23303 as prior art — flagged as unverified lead.
- [GitHub - Heman10x-NGU/Verdict-open-jev](https://github.com/Heman10x-NGU/Verdict-open-jev) — independent audit repo, ECE 0.0730, Brier 0.0252.
- [GitHub - SamuelSacco/jev-exploration](https://github.com/SamuelSacco/jev-exploration) — claim-audit repo: "the central calibration claim has zero public evidence: no calibration curve, no ECE figure, no paper."
- [GitHub - docxology/daf-jev](https://github.com/docxology/daf-jev) — third-party Python toolkit wrapping Jev's decision API with calibration/confidence-gate tooling.
- [elvis (omarsar0) on X](https://x.com/omarsar0/status/2099933100440494105) — social media summary of launch.
- [Latent Space: [AINews] Jev launch coverage](https://www.latent.space/p/ainews-jev-a-system-one-model-that)
- [zenn.dev (Japanese) trying Jev](https://zenn.dev/kun432/scraps/7d699847974237) — compares Jev's RLCD to temperature/Platt scaling and Brier score.


---

# Part E: LLM Confidence & Uncertainty Papers

## Agent 3: LLM confidence & uncertainty papers

### Revisiting the Calibration of Modern Neural Networks (NeurIPS 2021)
- [Revisiting the Calibration of Modern Neural Networks (arxiv PDF)](https://arxiv.org/pdf/2106.07998) — general topical background only.
- [TypeSafe Jev Review: The AI Model That Doesn't Generate Text – Kingy AI](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/) — discusses Jev's RLCD calibration claims close to ECE/reliability framing; weak/speculative.
- [Introducing System One Models & Jev - TypeSafe AI Blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — primary source for RLCD calibration claims; no direct mention.

### Simple and Scalable Predictive Uncertainty Estimation using Deep Ensembles (1612.01474)
- [1612.01474 Deep Ensembles](https://arxiv.org/abs/1612.01474) — no direct Jev mention, general topical background.
- (no direct Jev/TypeSafe results found; RLCD described as alternative to ensembling but no source draws comparison explicitly)

### Calibrating Deep Neural Networks using Focal Loss (2002.09437)
- [TypeSafe Jev Review – Kingy AI](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/) — explicitly notes focal loss is NOT indicated as used in Jev's training (rules out link, but ties concept to Jev by name).
- (no other direct results)

### When Does Label Smoothing Help? (1906.02629)
- [1906.02629](https://arxiv.org/abs/1906.02629) — no direct Jev mention, general background only.

### Language Models (Mostly) Know What They Know (Anthropic, 2207.05221)
- [TypeSafe Jev Review – Kingy AI](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/) — states this concept "appears in TypeSafe's documentation and resources" re: Jev's self-knowledge framing — weak/speculative, worth verifying.
- [Introduction - TypeSafe AI docs](https://docs.typesafe.ai/introduction) — frames Jev's design goal as "knowing what they know," conceptually adjacent.

### Teaching Models to Express Their Uncertainty in Words (2205.14334)
- [Anthropomimetic Uncertainty: What Verbalized Uncertainty in LMs is Missing](https://arxiv.org/pdf/2507.10587) — contrasts Jev's numeric/typed confidence vs "verbalized uncertainty" lineage — weak/speculative but conceptually direct.
- [Jev: The Language Model That Won't Talk - Anthony Maio (Substack)](https://anthonymaio.substack.com/p/jev-the-language-model-that-wont) — rhetorical contrast to "expressing uncertainty in words."

### Just Ask for Calibration (2305.14975)
- [Jev: TypeSafe's Decision Model, Speed and Cost Explained](https://www.orcarouter.ai/blog/jev-typesafe-system-one-what-we-know) — describes a "just ask Jev" calibration-testing procedure echoing this paper's framing — weak/speculative.

### Can LLMs Express Their Uncertainty? (2306.13063)
- [Can LLMs Express Their Uncertainty? (arxiv PDF)](https://arxiv.org/pdf/2306.13063) — same result cluster as TypeSafe docs / TestingCatalog post.
- [🚨 AI News | TestingCatalog on X](https://x.com/testingcatalog/status/2099968075861008781) — describes Jev generating "a fast judgment with calibrated probabilities and a confidence score."
- [A Survey of Calibration Process for Black-Box LLMs](https://arxiv.org/pdf/2412.12767) — general topical background.

### Calibration-Tuning: Teaching LLMs to Know What They Don't Know (ACL 2024 UncertaiNLP)
- [Can AI Assistants Know What They Don't Know? (arxiv PDF)](https://arxiv.org/pdf/2401.13275) — search explicitly names Calibration-tuning (UncertaiNLP 2024) as conceptually parallel to Jev's design goal — weak/speculative.
- [TypeSafe Jev Review – Kingy AI](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/) — discusses Jev's "knows when it doesn't know" framing.
- [Introducing System One Models & Jev - TypeSafe AI Blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — primary source for "knows when it does not know" design intent.

### Calibrating LLMs with Sample Consistency (2402.13904)
- [2402.13904](https://arxiv.org/abs/2402.13904) — returned with TypeSafe's own self-consistency cookbook; strong topical match.
- [Self-consistency: nouls - TypeSafe AI (docs cookbook)](https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook) — TypeSafe's own docs contain a "self-consistency" cookbook using jev-latest with repeated sampling (NUM_SAMPLES=15), paralleling sample-consistency calibration — notable, worth deeper read.
- [TypeSafe Jev: $0.042/1M Decision Model vs Auto-Regressive LLMs and MDLM | lilting channel](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model) — general background.

### Self-Evaluation Improves Selective Generation in LLMs (2312.09300)
- [2312.09300](https://arxiv.org/abs/2312.09300) — mirrors Jev's confidence-threshold escalate/automate design.
- [Learning self-evaluation to improve selective prediction in LLMs (USPTO patent PDF)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12536388) — possible patent-related background; check for TypeSafe/Jev assignee in deeper pass.
- [Out-of-Distribution Detection and Selective Generation for Conditional LMs](https://arxiv.org/pdf/2209.15558) — general background.

### Taming Overconfidence in LLMs: Reward Calibration in RLHF (ICLR 2025)
- [RLCD vs RLHF: What Is Typesafe's Jeff Model Actually Claiming? | MindStudio](https://www.mindstudio.ai/blog/typesafe-jeff-rlcd-vs-rlhf) — directly compares TypeSafe's RLCD to RLHF's overconfidence problem; strongest direct match for this topic. (Note: source spells it "Jeff" — possible typo/confusion, verify.)
- [Taming Overconfidence in LLMs (arxiv PDF)](https://arxiv.org/pdf/2410.09724) and [OpenReview](https://openreview.net/forum?id=l0tg0jzsdL) — the paper itself, returned alongside the MindStudio comparison.
- [R&D: decision-only models (TypeSafe Jev) — Issue #1316 · SocialGouv/iterion (GitHub)](https://github.com/SocialGouv/iterion/issues/1316) — real engineering-team GitHub issue discussing replacing LLM-as-classifier/RLHF-calibration workflows with Jev; strong direct match.
- [The Behavioral Credibility Trilemma: When Calibrated Autonomy Becomes Impossible](https://arxiv.org/pdf/2605.25739) — thematically adjacent.

### Mitigating LLM Hallucination via Behaviorally Calibrated RL (2512.19920)
- [2512.19920 abstract](https://arxiv.org/abs/2512.19920) / [PDF](https://arxiv.org/pdf/2512.19920) — returned alongside major Jev launch coverage (HyperAI, DataCamp); strong topical match (RL that makes models abstain, mirrors RLCD).
- [Jev: TypeSafe's System One Model That Never Hallucinates - DataCamp](https://www.datacamp.com/blog/system-one-models-jev) — discusses Jev's "zero hallucination" (schema-match) claims.
- [TypeSafe AI Launches Jev for Structured AI Automation | HyperAI](https://hyper.ai/en/stories/6f7d07f4680cc41bc4f4fe69a2ad79c1) — general Jev/RLCD background.

### General / cross-cutting calibration commentary
- [This $200 Million Startup Wants To Fix AI's Overconfidence Problem – Forbes](https://www.forbes.com/sites/the-prompt/2026/09/15/this-200-million-startup-wants-to-fix-ais-overconfidence-problem/) — mainstream press framing TypeSafe/Jev around "AI's overconfidence problem."
- [What's Next After RLHF? — Diogo Almeida, TypeSafe AI (YouTube)](https://www.youtube.com/watch?v=cJ0EOzey--o) — founder interview on RLHF's overconfidence/sycophancy failure mode and RLCD as successor.
- [Jev: The Model That Gives AI the Properties of Code | Hacker News](https://news.ycombinator.com/item?id=49716682)
- [Introducing System One Models and Jev | Hacker News](https://news.ycombinator.com/item?id=49717558)
- [GitHub - Hawxy/awesome-typesafe](https://github.com/Hawxy/awesome-typesafe) — curated community link list.
- [GitHub - Friedjof/awesome-typesafe](https://github.com/Friedjof/awesome-typesafe) — curated community link list.
- [GitHub - SamuelSacco/jev-exploration](https://github.com/SamuelSacco/jev-exploration) — community "claim audit, live demos, runnable code" repo probing Jev's calibration/accuracy claims; worth deeper review.
- [What Jev Probably Is, And Why You Already Have One – Medium](https://medium.com/@mbonsign/what-jev-probably-is-and-why-you-already-have-one-8bff04081b80) — speculative technical-architecture post.
- [Jev & System One Models: The Claim-vs-Evidence Guide to TypeSafe's Launch (2026) – agentpedia](https://agentpedia.codes/blog/jev-system-one-models) — notes "no public evidence calibration works — no paper, no reliability curve, no ECE number."
- [TypeSafe AI Jev Funding Puts a 445× Cost Claim Under Scrutiny – remio.ai](https://www.remio.ai/post/typesafe-ai-jev-funding-puts-a-445-cost-claim-under-scrutiny) — skeptical analysis.
- [How Does Jev Work? RLCD & Parallel Inference Explained – explainx.ai](https://www.explainx.ai/blog/how-does-jev-work-rlcd-system-one-model-explained-2026) — technical explainer of RLCD.

Note from agent: no evidence of a published Jev technical paper/weights/architecture description found; matches are TypeSafe's own marketing/docs language, third-party informal comparisons, or coincidental search co-occurrence.


---

# Part F: Distillation & Non-Autoregressive/Parallel Decoding Papers

## Agent 4: Distillation & non-autoregressive/parallel decoding papers

### Distilling the Knowledge in a Neural Network (Hinton et al.)
- [R&D: decision-only models (TypeSafe Jev) — Issue #1316 · SocialGouv/iterion](https://github.com/SocialGouv/iterion/issues/1316) — dev team discussing swapping LLM-as-classifier for Jev; conceptually adjacent to teacher→smaller-model compression.
- Naming-collision flag: Meta published an unrelated 2023 method also abbreviated "RLCD" (Reinforcement Learning from Contrastive Distillation) — shares only the acronym with TypeSafe's "Reinforcement Learning for Calibrated Decisions." Not a real link; watch for confusion in further searches.
- [Introducing System One Models & Jev - TypeSafe AI Blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — no explicit distillation mention, general background.
- [Distilling the Knowledge in a Neural Network (arxiv 1503.02531)](https://arxiv.org/abs/1503.02531) — original paper, no Jev connection found.

### Distilling Step-by-Step! (arxiv 2305.02301)
- (no results found)

### Distilling Reasoning Capabilities into Smaller LMs (arxiv 2212.00193)
- [TypeSafe Jev Played Chess — And Landed Next to Reasoning Models | dev.to](https://dev.to/maximsaplin/typesafe-jev-played-chess-and-landed-next-to-reasoning-models-28ga) — compares Jev's non-reasoning judgment output to reasoning models; thematically adjacent, weak/speculative.
- [🚨 AI News | TestingCatalog on X](https://x.com/testingcatalog/status/2099968075861008781) — states "Jev can't reason or write explanations... anything heavier gets split into separate questions" — weak/speculative.

### Dual-Head Reasoning Distillation (arxiv 2509.21487)
- [Dual-Head Reasoning Distillation (arxiv PDF)](https://arxiv.org/pdf/2509.21487) — co-occurring result with Jev/TypeSafe queries (both move reasoning cost out of inference, return classifier-style outputs); no explicit textual link but strong conceptual overlap — flagged for closer look.

### Non-Autoregressive Neural Machine Translation (arxiv 1711.02281)
- [TypeSafe Jev: $0.042/1M Decision Model vs Auto-Regressive LLMs and MDLM | lilting channel](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model) — most substantive third-party technical comparison; frames Jev against "Auto-Regressive LLMs and MDLM."
- (no direct mention of this specific paper tied to Jev)

### Mask-Predict (arxiv 1904.09324)
- [Mask-Predict: Parallel Decoding of Conditional Masked LMs (arxiv PDF)](https://arxiv.org/pdf/1904.09324) — co-occurring result; topically closest classical NAR precedent to Jev's "evaluate all fields in parallel" design — weak/speculative.
- [lilting channel — Jev vs AR LLMs and MDLM](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model) — general background.

### Blockwise Parallel Decoding for Deep Autoregressive Models (NeurIPS 2018)
- [Blockwise Parallel Decoding (arxiv 1811.03115)](https://arxiv.org/pdf/1811.03115) — co-occurring result; thematic ancestor of "evaluate all fields in a single forward pass" claims about Jev.
- [GitHub - bnsd55/openjev: Jev-style parallel constrained decisions for any MLX model on Apple Silicon](https://github.com/bnsd55/openjev) — community open-source reimplementation explicitly modeled on Jev's "one forward pass" parallel-field approach — directly relevant.

### Medusa (arxiv 2401.10774)
- [Medusa (arxiv PDF)](https://arxiv.org/pdf/2401.10774) — sources explicitly contrast Medusa (predicts multiple future tokens) vs Jev (specialized decision model, not text generation) — background, explicitly framed as different.
- [GitHub - FasterDecoding/Medusa](https://github.com/FasterDecoding/Medusa) — no direct connection.

### EAGLE speculative decoding (arxiv 2401.15077)
- [GitHub - SafeAILab/EAGLE](https://github.com/SafeAILab/EAGLE) — only superficial "Safe" naming overlap with TypeSafe; no confirmed technical link.
- (no results found for genuine Jev-EAGLE connection)

### Lookahead Decoding (arxiv 2402.02057)
- [Break the Sequential Dependency of LLM Inference Using Lookahead Decoding (arxiv PDF)](https://arxiv.org/pdf/2402.02057) — co-occurs but described as "related but distinct" from Jev's parallel sampler.
- [[Experiment] TypeSafe Jev as non-blocking shadow evaluator · Issue #411 · azumag/soviet_now](https://github.com/azumag/soviet_now/issues/411) — community project running Jev as "non-blocking shadow evaluator" — tangentially resembles speculative/shadow-verification pattern, not the same technique.

### Large Language Diffusion Models / LLaDA (arxiv 2502.09992)
- [TypeSafe GitHub org](https://github.com/typesafe-ai) — **confirmed fork of ML-GSAI/LLaDA**, last updated Jun 17 2025, MIT license — strongest concrete technical breadcrumb found in this pass.
- [github.com/typesafe-ai/LLaDA](https://github.com/typesafe-ai/LLaDA) — the fork itself; relatedness to Jev's actual mechanism unconfirmed.
- [lilting channel — Jev vs AR LLMs and MDLM](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model) — explicitly discusses comparisons between "Jev's Parallel Sampler and diffusion models" (shared concept of parallel evaluation without autoregression) while noting Jev "does not run iterative denoising" — most direct third-party discussion connecting Jev to diffusion-LM approaches.
- [LLaDA-V (arxiv 2505.16933)](https://arxiv.org/pdf/2505.16933) — general background.
- [LLaDA 1.5 (arxiv 2505.19223)](https://arxiv.org/pdf/2505.19223) — general background.

### Diffusion LLMs Can Do Faster-Than-AR Inference via D2F (arxiv 2508.09192)
- [D2F (arxiv PDF)](https://arxiv.org/pdf/2508.09192) — co-occurring, both pitched on faster-than-AR inference via parallelism; no explicit citation link — speculative given thematic overlap.
- [lilting channel — Jev vs AR LLMs and MDLM](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model) — notes diffusion LMs "require 10-50 forward passes," implicitly distinguishing Jev's single-pass approach.

### Better & Faster LLMs via Multi-token Prediction (Meta, arxiv 2404.19737)
- (no results found; sources explicitly contrast Jev's single-pass classification against multi-token-prediction approaches that "still generate tokens sequentially, albeit multiple at a time" — explicit non-connection noted)

### FlashHead (arxiv 2603.14591)
- (no results found — zero co-occurrence with Jev/TypeSafe as of 2026-09-17)

### Broad venue / OSINT sweep
- [Typesafe AI | Hacker News](https://news.ycombinator.com/item?id=49718888)
- [Jev: The Model That Gives AI the Properties of Code | Hacker News](https://news.ycombinator.com/item?id=49716682)
- [Introducing System One Models and Jev | Hacker News](https://news.ycombinator.com/item?id=49717558)
- [Reverse-engineered Jev-like model | Hacker News](https://news.ycombinator.com/item?id=49731282) — high-interest speculative lead; possible black-box/behavioral distillation of a closed model's decision function.
- [Open-sourced jev architecture last year with model, paper and dataset | Hacker News](https://news.ycombinator.com/item?id=49736660) — high-interest speculative lead, unverified; claims prior open-source "jev architecture" release w/ paper+dataset.
- [Jev Ultrafast: A browser agent with a dynamic, indexed action space | Hacker News](https://news.ycombinator.com/item?id=49735979) — likely unrelated name collision.
- arxiv.org/abs/2503.23303 — mentioned in HN thread snippet as "related to jev architecture"; **could not independently verify this ID** — flagged as unverified/possibly hallucinated, needs direct confirmation.
- [GitHub - typesafe-ai/vllm (fork)](https://github.com/typesafe-ai) — confirmed fork exists, last updated ~May 2025 (pre-launch) — likely generic serving infra.
- [GitHub - bnsd55/openjev](https://github.com/bnsd55/openjev) — see Blockwise Parallel Decoding above.
- [He Says He Co-Invented ChatGPT. His New AI, Jev, Won't Write a Word - DEV Community](https://dev.to/gabrielanhaia/he-says-he-co-invented-chatgpt-his-new-ai-jev-wont-write-a-word-e3c)
- [Jev skips token generation entirely... | daily.dev](https://daily.dev/posts/jev-skips-token-generation-entirely-and-the-speed-numbers-are-hard-to-ignore-nv8tizgl7)
- [[AINews] Jev: a "System One Model"... | Latent Space](https://www.latent.space/p/ainews-jev-a-system-one-model-that)

Note from agent: Ran ~26 of planned queries before session WebSearch budget considerations; no full articles/threads opened, judgments from titles/snippets/URLs only. Most substantive recurring source: lilting channel's Jev vs AR/MDLM comparison. Most concrete non-textual evidence: typesafe-ai GitHub org forks of vLLM and LLaDA.


---

# Part G: Structured Outputs & Selective Prediction/Abstention Papers

## Agent 5: Structured outputs & selective prediction/abstention papers

### Grammar-Constrained Decoding for Structured NLP Tasks without Finetuning (arxiv 2305.13971)
- [TypeSafe's Jev and the Parse-Validate-Retry Tax That Production AI Has Always Paid](https://fourweekmba.com/ai-typesafe-jev-system-one-model-structured-output/) — directly frames Jev against the "parse-validate-retry" GCD paradigm.
- [What Is Jev? How to Implement Typesafe AI's Decision Model](https://mohammedshehu.com/jev-typesafe-ai/) — explains Jev's schema-masking of illegal tokens, core GCD concept.
- [TypeSafe Jev Review: The AI Model That Doesn't Generate Text](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/) — discusses constraining output space vs post-hoc grammar masking.
- [Introducing System One Models & Jev - TypeSafe AI Blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — primary source, claims grammar-free type-safety by construction.
- [Jev: The Language Model That Won't Talk - Anthony Maio](https://anthonymaio.substack.com/p/jev-the-language-model-that-wont) — commentary on constrained/no-text output design.
- [Jev AI Reality Check: Can You Run TypeSafe's Model Locally?](https://www.modemguides.com/blogs/ai-news/jev-typesafe-reality-check-run-locally) — weak/speculative, general coverage.
- [Flexible and Efficient Grammar-Constrained Decoding (arxiv 2502.05111)](https://arxiv.org/pdf/2502.05111) — general background.
- [Lookahead-then-Verify: Reliable Constrained Decoding for Diffusion LLMs under CFGs (arxiv 2602.00612)](https://arxiv.org/pdf/2602.00612) — general background.

### XGrammar (arxiv 2411.15100)
- [Jev by TypeSafe AI: 200x Faster Structured-Output Model (2026) — explainx.ai](https://www.explainx.ai/blog/typesafe-ai-jev-system-one-models-launch-2026) — positions Jev vs general structured-output tooling.
- [XGrammar (arxiv PDF)](https://arxiv.org/pdf/2411.15100) — paper itself, surfaced directly alongside Jev queries.
- [ICYMI: TypeSafe AI launches Jev for structured AI decisions — TestingCatalog](https://www.testingcatalog.com/icymtypesafe-ai-launches-jev-for-structured-ai-decisions/) — weak/speculative, general launch coverage.
- [TypeSafe's Jev and the Parse-Validate-Retry Tax](https://fourweekmba.com/ai-typesafe-jev-system-one-model-structured-output/) — explicitly contrasts Jev with logit-mask constrained decoding engines like XGrammar.
- [AdapTrack: Constrained Decoding without Distorting LLM's Output Intent (arxiv 2510.17376)](https://arxiv.org/pdf/2510.17376) — general background.
- [Correctness-Guaranteed Code Generation via Constrained Decoding (arxiv 2508.15866)](https://arxiv.org/pdf/2508.15866) — general background.
- [Small Language Models for Agentic Systems: A Survey (arxiv 2510.03847)](https://arxiv.org/pdf/2510.03847) — general background.

### XGrammar 2 (arxiv 2601.04426)
- [XGrammar-2 (arxiv abs)](https://arxiv.org/abs/2601.04426) / [PDF](https://arxiv.org/pdf/2601.04426) / [HTML](https://arxiv.org/html/2601.04426) / [HTML v2](https://arxiv.org/html/2601.04426v2) — co-surfaced in Jev/structured-decoding searches.
- [XGrammar-2 — CAIS 2026 conference program page](https://www.caisconf.org/program/2026/papers/xgrammar-dynamic-and-efficient-structured-generation-engine-for-agentic-llms/) — general background.
- [Accelerating Constrained Decoding with Token Space Compression (arxiv 2605.29986)](https://arxiv.org/pdf/2605.29986) — general background.
- (no article draws a direct Jev–XGrammar-2 comparison; only search co-occurrence)

### Generating Structured Outputs from Language Models / JSONSchemaBench (arxiv 2501.10868)
- [TypeSafe launches Jev for AI decisions inside software - The Rundown AI](https://www.therundown.ai/news/typesafe-jev-ai-decisions-software) — notes JSONSchemaBench cited in independent analyses of Jev's structured-output accuracy.
- [Jev: TypeSafe's System One Model That Never Hallucinates - DataCamp](https://www.datacamp.com/blog/system-one-models-jev) — structured-output claims, 0% schema-error framing.
- [TypeSafe Jev: $0.042/1M Decision Model vs Auto-Regressive LLMs and MDLM](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model) — compares Jev's structured generation to AR LLM JSON emission.
- [AI Specialized for High-Speed Decision Making - npaka](https://note.com/npaka/n/n6f8dd30a5fa4?hl=en) — weak/speculative, general coverage.
- [TypeSafe JEV Explained: AI Decisions Without a Chatbot - The Neuron](https://www.theneuron.ai/explainer-articles/typesafe-jev-system-one-models-explained/) — general coverage.
- [TypeSafe Jev: the First Decision-Only Model Class, Benchmarked and Priced](https://www.developersdigest.tech/blog/typesafe-jev-system-one-models-release-guide-2026) — benchmarking framing relevant to JSONSchemaBench-style eval.
- [TypeSafe Jev: A Model That Returns Decisions, Not Text](https://www.digitalapplied.com/blog/typesafe-jev-system-one-model-typed-decisions) — general coverage.
- [Jev by TypeSafe AI: Is the 200x Faster Decision Model Too Good to Be True? - Flowtivity](https://flowtivity.ai/blog/jev-typesafe-ai-decision-model/) — weak/speculative, skeptical benchmark angle.

### Selective Classification for Deep Neural Networks (arxiv 1705.08500)
- [Selective Classification for Deep Neural Networks (PDF)](https://arxiv.org/pdf/1705.08500) — surfaced directly in Jev-adjacent searches.
- [[Feature]: Jev router — use TypeSafe Jev as a routing classifier with CEL jev.* variables · Issue #7278 · maximhq/bifrost](https://github.com/maximhq/bifrost/issues/7278) — concrete real-world proposal using Jev as selective/confidence-based routing classifier.
- [TypeSafe AI Launches Jev for Structured AI Automation - HyperAI](https://hyper.ai/en/stories/6f7d07f4680cc41bc4f4fe69a2ad79c1) — general coverage.
- [Selective Classification Under Distribution Shifts (arxiv 2405.05160)](https://arxiv.org/pdf/2405.05160) — general background.
- [What Is Jev? - mohammedshehu.com](https://mohammedshehu.com/jev-typesafe-ai/) — discusses confidence-gated escalation.

### SelectiveNet (arxiv 1901.09192)
- (no results found)

### Deep Gamblers: Learning to Abstain with Portfolio Theory (NeurIPS)
- [Deep Gamblers (arxiv abs 1907.00208)](https://arxiv.org/abs/1907.00208) / [PDF](https://arxiv.org/pdf/1907.00208) — surfaced directly alongside Jev/abstention queries.
- [R&D: a system-one decision route ... TypeSafe Jev or similar; experiment on abstain-reason classification · Issue #589 · mas-bandwidth/nova-tools](https://github.com/mas-bandwidth/nova-tools/issues/589) — concrete engineering issue proposing Jev for abstain-reason classification.
- [TypeSafe AI Jev Funding Puts a 445× Cost Claim Under Scrutiny](https://www.remio.ai/post/typesafe-ai-jev-funding-puts-a-445-cost-claim-under-scrutiny) — weak/speculative.
- [GitHub - Z-T-WANG/NIPS2019DeepGamblers](https://github.com/Z-T-WANG/NIPS2019DeepGamblers) — original paper's reference code, no Jev mention.
- [Deep Gamblers reviews - NeurIPS proceedings](https://proceedings.neurips.cc/paper_files/paper/2019/file/0c4b1eeb45c90b52bfb9d07943d855ab-Reviews.html) — general background.
- [Machine Learning with a Reject Option: A survey (arxiv 2107.11277)](https://arxiv.org/pdf/2107.11277) — general background.
- [Learning When to Say "I Don't Know" (arxiv 2209.04944)](https://arxiv.org/pdf/2209.04944) — general background.
- [AI, Meet Human: Learning Paradigms for Hybrid Decision Making Systems (arxiv 2402.06287)](https://arxiv.org/pdf/2402.06287) — human-escalation angle relevant to Jev's design.

### Selective-LAMA (EACL Findings 2023)
- (no results found; only generic LAMA knowledge-probing background, e.g. [What Matters in Memorizing and Recalling Facts? (arxiv 2406.12277)](https://arxiv.org/pdf/2406.12277))

### Calibrated Language Models Must Hallucinate (arxiv 2311.14648)
- [Calibrated Language Models Must Hallucinate (PDF)](https://arxiv.org/pdf/2311.14648) — surfaced directly next to Jev's "can't hallucinate" claim.
- [Jev: TypeSafe's System One Model That Never Hallucinates - DataCamp](https://www.datacamp.com/blog/system-one-models-jev) — title directly invokes the "never hallucinates" framing this paper problematizes.
- [TypeSafe Jev Review: The AI Model That Doesn't Generate Text - Kingy AI](https://kingy.ai/blog/typesafe-jev-review-the-ai-model-that-doesnt-generate-text/) — qualifies Jev's "can't hallucinate" claim (structural vs semantic correctness).
- [Jev: The Language Model That Won't Talk - Anthony Maio](https://anthonymaio.substack.com/p/jev-the-language-model-that-wont) — discusses hallucination-avoidance-by-construction claim.
- [TypeSafe's Jev Claims 193x Faster and 444x Cheaper. Its Own Eval Scores Against Two Other Models' Answers. - North Denver Tribune](https://northdenvertribune.com/news-2/typesafe-jev-system-one-model-claims-evals-independent-tests/) — critical eval-scrutiny piece.
- [TypeSafe AI's new models work with machines, not humans - InfoWorld](https://www.infoworld.com/article/4223468/typesafe-ais-new-models-work-with-machines-not-humans.html) — general coverage.
- [Jev brings typed AI decisions to software workflows - AI Polix](https://aipolix.com/en-us/news/jev-typed-decisions-system-one-models) — weak/speculative.
- [What Is TypeSafe Jev? System One Models Explained (2026) - andrew.ooo](https://andrew.ooo/answers/what-is-typesafe-jev-system-one-model-september-2026/) — weak/speculative.

### Broad venue / platform searches
- [Typesafe.ai's System One Model | Hacker News](https://news.ycombinator.com/item?id=49718261)
- [Jev: The Model That Gives AI the Properties of Code | Hacker News](https://news.ycombinator.com/item?id=49716682)
- [Open-sourced jev architecture last year with model, paper and dataset | Hacker News](https://news.ycombinator.com/item?id=49736660) — weak/speculative, likely spurious; cites arxiv 2503.23303, unverified.
- [Introducing System One Models and Jev | Hacker News](https://news.ycombinator.com/item?id=49717558)
- [Structured outputs create false confidence | Hacker News](https://news.ycombinator.com/item?id=46345333) — no direct Jev mention, relevant critique angle.
- [System One - TypeSafe AI docs](https://docs.typesafe.ai/concepts/system-one) — primary source on System One/Jev design.
- [TypeSafe launches Jev, a chatless AI model that claims to beat Claude 193x](https://pasqualepillitteri.it/en/news/16460/typesafe-jev-chatless-ai-beats-claude) — general coverage.
- [TypeSafe AI Emerges From Stealth With $40M in Funding - Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/typesafe-ai-emerges-stealth-40m-190000776.html) — funding/background context, confirms founders.
- [blog: add "A model that answers in types" — TypeSafe's Jev · PR #31 · 3dwag98/3dwag98.github.io](https://github.com/3dwag98/3dwag98.github.io/pull/31)
- [Jev skips token generation entirely... | daily.dev](https://daily.dev/posts/jev-skips-token-generation-entirely-and-the-speed-numbers-are-hard-to-ignore-nv8tizgl7)
- [AI News | TestingCatalog on X](https://x.com/testingcatalog/status/2099968075861008781) — mentions calibrated probabilities/confidence score framing.
