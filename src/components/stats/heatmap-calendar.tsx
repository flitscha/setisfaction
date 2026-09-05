import Link from "next/link";
import { toLocalDateKey } from "@/lib/date";
import { heatColorClass } from "@/lib/stats";

const DAYS_SHOWN = 84;

export function HeatmapCalendar({
  performedAtDates,
  href = "/stats/history",
}: {
  performedAtDates: Date[];
  href?: string;
}) {
  const countByDay = new Map<string, number>();
  for (const date of performedAtDates) {
    const key = toLocalDateKey(date);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const today = new Date();
  const days: { key: string; count: number }[] = [];
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = toLocalDateKey(date);
    days.push({ key, count: countByDay.get(key) ?? 0 });
  }

  return (
    <Link href={href} className="flex flex-wrap gap-1 w-fit">
      {days.map((day) => (
        <div
          key={day.key}
          title={`${day.key}: ${day.count} set${day.count === 1 ? "" : "s"}`}
          className={`w-3 h-3 rounded-sm ${heatColorClass(day.count)}`}
        />
      ))}
    </Link>
  );
}
