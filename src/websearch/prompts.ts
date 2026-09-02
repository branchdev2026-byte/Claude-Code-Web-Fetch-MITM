// 四类阶段的 prompt 模板，项目原创措辞（不逐字复制被借鉴项目 Vane/Farfalle 的 prompt）。
// 设计文档第 5、8 节。

export function buildPlannerPrompt(query: string): string {
  return `You are the planning stage of a web search pipeline. Given a user's search query, decide how to search for it.

Query: ${query}

Think about what kind of query this is:
- Factual or time-sensitive (e.g. current price, latest version, today's date, a single fact): needs few search angles, a short time budget, and usually does not need full-page fetching of any source.
- Comparative, multi-aspect, or needs precise figures to back up claims (e.g. "compare X and Y", "pros and cons of Z", "detailed spec of W"): needs broader coverage across a few search angles, a longer time budget, and benefits from fetching the full text of a few top sources.

Output a single JSON object with exactly these fields, nothing else:
{
  "subQueries": string[],       // 2 to 4 short, SEO-style keyword phrases (not full sentences) each covering a distinct angle of the query
  "timeBudgetMs": number,       // how many milliseconds this query is worth spending end-to-end, your own judgment, no fixed upper bound
  "roundGuidance": number,      // roughly how many search rounds this query is worth, as guidance for a later reflection step (not a hard cap)
  "fetchTopN": number           // how many of the top-ranked results are worth fetching in full for deeper detail; 0 means none are worth it
}

Respond with the JSON object only.`;
}

export function buildReflectPrompt(
  query: string,
  roundGuidance: number,
  currentRound: number,
  poolExcerpt: string,
): string {
  return `You are the reflection stage of a web search pipeline, after search round ${currentRound}. The planner guessed this query is worth roughly ${roundGuidance} round(s), but that is only guidance, not a hard limit — you decide based on the actual results below.

Original query: ${query}

Current results gathered so far:
${poolExcerpt}

Decide: is this enough to answer the query well, or are there gaps that another round of searching could fill?

Output a single JSON object with exactly these fields, nothing else:
{
  "sufficient": boolean,           // true if the current results are enough to write a good answer
  "refinedQueries": string[]       // up to 3 new, more targeted search phrases that would fill the gaps; empty array if sufficient is true or if you can't think of a better angle
}

Respond with the JSON object only.`;
}

export function buildEnrichExtractPrompt(query: string, markdown: string): string {
  return `Extract the key facts from the following page content that are relevant to this query: ${query}

Write your extraction as a short list of telegram-style bullet points — terse factual statements, no filler words, no restating the question, no summary sentence at the top or bottom. Only include what is actually relevant to the query; skip navigation text, ads, or unrelated boilerplate. If nothing on the page is relevant, output a single bullet saying so.

Page content (converted to markdown):
${markdown}`;
}

export function buildComposePrompt(query: string, numberedSources: string): string {
  return `Write a concise, factual summary that answers the following query, using only the numbered sources below. Every claim must be backed by an inline citation like [1], [2], referring to the source number. Do not add information that isn't in the sources. Do not add filler phrases like "based on the search results" or "according to the sources". Write in the same language as the query.

Query: ${query}

Sources:
${numberedSources}

Write the summary now.`;
}
