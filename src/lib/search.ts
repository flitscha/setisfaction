// A search box should filter, not just reorder — but a typo shouldn't come
// up empty either. Two tiers:
//  1. The query matches a whole word in the name exactly ("squats" in
//     "Cossack Squats") — every such match is shown, uncapped, shortest name
//     first (an exact match on a shorter, more specific name — e.g. plain
//     "Push-Ups" over "Diamond Push-Ups" — is the closer hit).
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

// 0..1 — tokenizes BOTH sides, so a multi-word (possibly typo'd) query like
// "front leaver" is judged word-by-word against "front lever" instead of
// being compared as one long string against each single word of the name
// (which made every word look like a bad match and sank the whole score).
function multiWordSimilarity(query: string, text: string): number {
  const queryTokens = tokenize(query);
  const textTokens = tokenize(text);
  if (queryTokens.length === 0 || textTokens.length === 0) return 0;

  const bestPerQueryToken = queryTokens.map((qToken) => {
    let best = 0;
    for (const tToken of textTokens) {
      const distance = levenshtein(qToken, tToken);
      const similarity = 1 - distance / Math.max(qToken.length, tToken.length, 1);
      if (similarity > best) best = similarity;
    }
    return best;
  });

  return bestPerQueryToken.reduce((sum, s) => sum + s, 0) / bestPerQueryToken.length;
}

function scoreItem(item: { name: string; description?: string | null }, query: string): number {
  const name = item.name.toLowerCase();
  const description = (item.description ?? "").toLowerCase();

  // Substring matches rank above any fuzzy score, name above description.
  if (name.includes(query)) return 3 + query.length / name.length;
  if (description.includes(query)) return 2 + query.length / Math.max(description.length, 1);

  return Math.max(multiWordSimilarity(query, name), multiWordSimilarity(query, description) * 0.8);
}

// Filters items down to what actually matches the query, best first. An
// empty query returns the list unchanged; a query with no good match
// returns an empty array rather than the full list re-sorted.
export function searchItems<T extends { name: string; description?: string | null }>(
  items: T[],
  query: string,
): T[] {
  return searchItemsBilingual(items, query, () => undefined);
}

// Same two-tier algorithm as searchItems, but each item is also checked
// against its "other language" name (e.g. an exercise translated for
// display, like "Klimmzüge" for "Pull-Ups") — not merely as a fallback for
// when the primary-language search comes up empty. Searching "pull ups"
// must find plain "Pull-Ups" (shown as "Klimmzüge") right alongside
// "Australian Pull-Ups", not just when nothing else matched at all —
// otherwise the one exercise someone is actually looking for can be the one
// that's missing, with an unrelated, weaker match masking its absence.
// Always returns the original items, never the alternate-named stand-ins
// used only to widen the match.
export function searchItemsBilingual<T extends { name: string; description?: string | null }>(
  items: T[],
  query: string,
  alternateName: (item: T) => string | undefined,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  const exactMatches = items
    .map((item) => {
      const alt = alternateName(item);
      const matchedName = isExactWordMatch(item.name, q) ? item.name : alt && isExactWordMatch(alt, q) ? alt : null;
      return matchedName === null ? null : { item, matchedName };
    })
    .filter((match): match is { item: T; matchedName: string } => match !== null);
  if (exactMatches.length > 0) {
    return exactMatches
      .sort((a, b) => a.matchedName.length - b.matchedName.length || a.matchedName.localeCompare(b.matchedName))
      .map(({ item }) => item);
  }

  return items
    .map((item) => {
      const alt = alternateName(item);
      const score = Math.max(scoreItem(item, q), alt ? scoreItem({ ...item, name: alt }, q) : 0);
      return { item, score };
    })
    .filter(({ score }) => score >= FALLBACK_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length)
    .slice(0, FALLBACK_LIMIT)
    .map(({ item }) => item);
}
