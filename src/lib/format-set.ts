export type FormattableSet = { reps: number | null; timeSeconds: number | null; weightKg: number | null };

// Compact form ("20", "7s", "6kg") for side-by-side chips — as opposed to a
// verbose form like "20 reps", which reads better in a single-line list but
// gets noisy once several values sit next to each other.
export function formatSetValue(set: FormattableSet): string {
  const parts: string[] = [];
  if (set.reps !== null) parts.push(`${set.reps}`);
  if (set.timeSeconds !== null) parts.push(`${set.timeSeconds}s`);
  if (set.weightKg !== null) parts.push(`${set.weightKg}kg`);
  return parts.join(" / ");
}
