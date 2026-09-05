// Ranks items by how well they match a query instead of filtering them out —
// a search box should always surface its best guess (e.g. a typo'd exercise
// name) rather than "no results", so the caller can find an existing
// exercise instead of accidentally creating a near-duplicate.

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

// Sorts items by relevance to the query, best first. An empty query returns
// the list unchanged.
export function rankByQuery<T extends { name: string; description?: string | null }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return [...items].sort((a, b) => scoreItem(b, q) - scoreItem(a, q));
}
