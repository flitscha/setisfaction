export type FormattableSet = { reps: number | null; timeSeconds: number | null; weightKg: number | null };

// Compact form ("20", "7s", "6kg") for side-by-side chips — as opposed to a
// verbose form like "20 reps", which reads better in a single-line list but
// gets noisy once several values sit next to each other. A set with nothing
// recorded at all (a deliberately untimed/uncounted set — see setForm's
// confirmation before allowing that) would otherwise render as an empty,
// near-invisible chip, so it falls back to an explicit label instead.
// `t` is threaded in (rather than imported) since this is a plain utility,
// not a component — it can't call the useT() hook itself.
export function formatSetValue(set: FormattableSet, t: (key: "setForm.noValueLogged") => string): string {
  const parts: string[] = [];
  if (set.reps !== null) parts.push(`${set.reps}`);
  if (set.timeSeconds !== null) parts.push(`${set.timeSeconds}s`);
  if (set.weightKg !== null) parts.push(`${set.weightKg}kg`);
  return parts.length > 0 ? parts.join(" / ") : t("setForm.noValueLogged");
}
