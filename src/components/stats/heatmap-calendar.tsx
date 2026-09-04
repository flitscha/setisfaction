import { toLocalDateKey } from "@/lib/date";

const DAYS_SHOWN = 84;

function colorFor(setCount: number): string {
  if (setCount === 0) return "bg-gray-100";
  if (setCount <= 2) return "bg-green-200";
  if (setCount <= 5) return "bg-green-400";
  return "bg-green-600";
}

export function HeatmapCalendar({ performedAtDates }: { performedAtDates: Date[] }) {
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
    <div className="flex flex-wrap gap-1">
      {days.map((day) => (
        <div
          key={day.key}
          title={`${day.key}: ${day.count} set${day.count === 1 ? "" : "s"}`}
          className={`w-3 h-3 rounded-sm ${colorFor(day.count)}`}
        />
      ))}
    </div>
  );
}
