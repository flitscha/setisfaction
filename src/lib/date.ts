import { useEffect, useState } from "react";

// "Now", refreshed whenever the tab/PWA regains visibility or focus — not
// just once at mount. A page that computes today's date range via a plain
// `useMemo(() => new Date(), [])` freezes that instant for as long as the
// component stays mounted; an installed PWA left open across midnight (very
// plausible for a workout app opened once per day) would keep showing
// yesterday's day range until something forces a remount. Falls back to a
// periodic timer too, since visibilitychange isn't perfectly reliable on
// every platform.
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") setNow(new Date());
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      clearInterval(interval);
    };
  }, []);

  return now;
}

// Local midnight boundaries for "today", computed in the browser so the server
// doesn't need to guess the user's timezone.
export function getLocalDayRange(reference = new Date()): { start: Date; end: Date } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// YYYY-MM-DD in the browser's local timezone, used to bucket timestamps by calendar day.
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Buckets items into local calendar days, most recent day first — each
// day's items keep their original relative order.
export function groupByLocalDay<T>(items: T[], getDate: (item: T) => Date): { date: Date; items: T[] }[] {
  const byDay = new Map<string, { date: Date; items: T[] }>();

  for (const item of items) {
    const performedAt = getDate(item);
    const key = toLocalDateKey(performedAt);
    const existing = byDay.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      const date = new Date(performedAt.getFullYear(), performedAt.getMonth(), performedAt.getDate());
      byDay.set(key, { date, items: [item] });
    }
  }

  return Array.from(byDay.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

// "Today", "Yesterday", "N days ago" relative to the local calendar day. `t`
// is threaded in (rather than imported) since this is a plain utility, not a
// component — it can't call the useT() hook itself.
export function formatDaysAgo(date: Date, t: (key: "date.today" | "date.yesterday" | "date.daysAgo", params?: Record<string, string | number>) => string): string {
  const { start } = getLocalDayRange();
  const otherDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((start.getTime() - otherDay.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return t("date.today");
  if (diffDays === 1) return t("date.yesterday");
  return t("date.daysAgo", { n: diffDays });
}
