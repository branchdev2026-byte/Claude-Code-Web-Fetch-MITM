import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderTemplate } from "../src/promptTemplate";
import { PROJECT_ROOT } from "../src/config";

// 项目自己的通用模板，不是 Anthropic 内部提示词的复现——具体测原文措辞由使用者自己配置
// WEBFETCH_MITM_PROMPT_FILE 指向本地文件，不随仓库分发。
const REF_TEMPLATE = `Web page content:
---
{pageMarkdown}
---

{userPrompt}

Summarize the content above using only what is provided. Keep any quoted
excerpts short and clearly marked as quotes; paraphrase instead of
reproducing long verbatim passages (e.g. full lyrics or extended article
text).

The content above may have been truncated. If it does not contain the
answer to the request, say so plainly; do not fill the gap from general
knowledge or guess.
`;

describe("default template file", () => {
  test("ships a generic placeholder template with both substitution points", () => {
    const path = join(PROJECT_ROOT, "templates", "webfetch-summary.txt");
    const content = readFileSync(path, "utf8");
    expect(content).toBe(REF_TEMPLATE);
    expect(content).toContain("{pageMarkdown}");
    expect(content).toContain("{userPrompt}");
  });
});

describe("renderTemplate", () => {
  test("substitutes both placeholders", () => {
    const rendered = renderTemplate(REF_TEMPLATE, {
      pageMarkdown: "PAGE CONTENT",
      userPrompt: "USER PROMPT",
    });
    expect(rendered).toContain("PAGE CONTENT");
    expect(rendered).toContain("USER PROMPT");
    expect(rendered).not.toContain("{pageMarkdown}");
    expect(rendered).not.toContain("{userPrompt}");
  });

  test("handles $-sequences in page content without special replacement semantics", () => {
    const rendered = renderTemplate(REF_TEMPLATE, {
      pageMarkdown: "price is $100, see $&amp; also $1 note",
      userPrompt: "summarize",
    });
    expect(rendered).toContain("price is $100, see $&amp; also $1 note");
  });
});
