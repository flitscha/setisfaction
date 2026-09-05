// A search box should filter, not just reorder — but a typo shouldn't come
// up empty either. Two tiers:
//  1. The query matches a whole word in the name exactly ("squats" in
//     "Cossack Squats") — every such match is shown, uncapped.
//  2. Otherwise, fall back to substring/description/fuzzy scoring, keep only
//     results above a relevance threshold, and cap it to the best few — so a
//     near-miss (typo) still surfaces the closest exercise, but an unrelated
//     query shows nothing rather than the whole list re-sorted.

const FALLBACK_LIMIT = 5;
const FALLBACK_SCORE_THRESHOLD = 0.5;

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[rows - 1][cols - 1];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The query appears in the name as a whole word (word-boundary match), not
// merely as a substring inside a longer word.
function isExactWordMatch(name: string, query: string): boolean {
  return new RegExp(`\\b${escapeRegExp(query)}\\b`, "i").test(name);
}

// 0..1 — how close the query is to the single best-matching word in text,
// so a one-word typo ("csosack") still scores well against a multi-word
// name ("Cossack Squats") instead of being penalized for the whole string.
function bestTokenSimilarity(query: string, text: string): number {
  let best = 0;
  for (const token of tokenize(text)) {
    const distance = levenshtein(query, token);
    const similarity = 1 - distance / Math.max(query.length, token.length, 1);
    if (similarity > best) best = similarity;
  }
  return best;
}

function scoreItem(item: { name: string; description?: string | null }, query: string): number {
  const name = item.name.toLowerCase();
  const description = (item.description ?? "").toLowerCase();

  // Substring matches rank above any fuzzy score, name above description.
  if (name.includes(query)) return 3 + query.length / name.length;
  if (description.includes(query)) return 2 + query.length / Math.max(description.length, 1);

  return Math.max(bestTokenSimilarity(query, name), bestTokenSimilarity(query, description) * 0.8);
}

// Filters items down to what actually matches the query, best first. An
// empty query returns the list unchanged; a query with no good match
// returns an empty array rather than the full list re-sorted.
export function searchItems<T extends { name: string; description?: string | null }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  const exactMatches = items.filter((item) => isExactWordMatch(item.name, q));
  if (exactMatches.length > 0) return exactMatches;

  return items
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter(({ score }) => score >= FALLBACK_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, FALLBACK_LIMIT)
    .map(({ item }) => item);
}
