import { toLocalDateKey } from "./date";

export type DailyAggregate = { date: Date; best: number; total: number };

// Collapses same-day sets into one point per day (best value and sum), so a
// progress chart shows the training-day trend instead of noisy within-session swings.
export function aggregateByDay(points: { performedAt: Date; value: number }[]): DailyAggregate[] {
  const byDay = new Map<string, { date: Date; values: number[] }>();

  for (const point of points) {
    const key = toLocalDateKey(point.performedAt);
    const existing = byDay.get(key);
    if (existing) {
      existing.values.push(point.value);
    } else {
      const date = new Date(point.performedAt.getFullYear(), point.performedAt.getMonth(), point.performedAt.getDate());
      byDay.set(key, { date, values: [point.value] });
    }
  }

  return Array.from(byDay.values())
    .map(({ date, values }) => ({
      date,
      best: Math.max(...values),
      total: values.reduce((sum, value) => sum + value, 0),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
