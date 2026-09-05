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

export type DailyCount = { date: Date; count: number };

// Like aggregateByDay, but for a group of exercises whose values aren't in the
// same unit (reps vs. seconds vs. kg) — set count per day is the only thing
// that's still meaningful to sum across them.
export function aggregateCountByDay(dates: Date[]): DailyCount[] {
  const byDay = new Map<string, DailyCount>();

  for (const date of dates) {
    const key = toLocalDateKey(date);
    const existing = byDay.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byDay.set(key, { date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), count: 1 });
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}
