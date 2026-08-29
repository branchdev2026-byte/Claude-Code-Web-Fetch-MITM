import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "./config";
import { PROJECT_ROOT } from "./config";

const DEFAULT_TEMPLATE_PATH = join(PROJECT_ROOT, "templates", "webfetch-summary.txt");

export function loadTemplate(config: Config): string {
  const path = config.promptFile ?? DEFAULT_TEMPLATE_PATH;
  return readFileSync(path, "utf8");
}

export function renderTemplate(
  template: string,
  vars: { pageMarkdown: string; userPrompt: string },
): string {
  return template
    .replace("{pageMarkdown}", () => vars.pageMarkdown)
    .replace("{userPrompt}", () => vars.userPrompt);
}
