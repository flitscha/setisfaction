"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath } from "@/components/admin/view-as-context";
import { toLocalDateKey, getLocalDayRange } from "@/lib/date";
import { heatColorClass, heatTextColorClass } from "@/lib/stats";
import { BackLink } from "@/components/ui/back-link";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryPageContent />
    </Suspense>
  );
}

function HistoryPageContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("group");
  const appPath = useAppPath();

  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: globalHeatmap } = trpc.stats.heatmap.useQuery(undefined, { enabled: !groupId });
  const { data: groupTimeline } = trpc.stats.groupTimeline.useQuery(
    { groupId: groupId ?? "" },
    { enabled: !!groupId },
  );
  const { data: groupAggregates } = trpc.stats.groupAggregates.useQuery(undefined, { enabled: !!groupId });
  const { data: exercises } = trpc.exercise.list.useQuery(undefined, { enabled: !!groupId });

  const dates = (groupId ? groupTimeline : globalHeatmap)?.map((s) => s.performedAt) ?? [];
  const countByDay = new Map<string, number>();
  for (const date of dates) {
    const key = toLocalDateKey(date);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const groupName = groupId ? (groupAggregates?.find((g) => g.groupId === groupId)?.name ?? null) : null;
  const allowedExerciseIds = groupId
    ? new Set((exercises ?? []).filter((e) => e.groupIds.includes(groupId)).map((e) => e.id))
    : null;

  const dayRange = selectedDate ? getLocalDayRange(selectedDate) : null;
  const { data: daySets } = trpc.set.listByDay.useQuery(
    { dayStart: dayRange?.start ?? new Date(), dayEnd: dayRange?.end ?? new Date() },
    { enabled: dayRange !== null },
  );

  const dayGroups = useMemo(() => {
    const filtered = (daySets ?? []).filter((s) => !allowedExerciseIds || allowedExerciseIds.has(s.exerciseId));
    const map = new Map<string, { exerciseName: string; values: string[] }>();

    for (const set of filtered) {
      const parts: string[] = [];
      if (set.reps !== null) parts.push(`${set.reps}`);
      if (set.timeSeconds !== null) parts.push(`${set.timeSeconds}s`);
      if (set.weightKg !== null) parts.push(`${set.weightKg}kg`);

      const existing = map.get(set.exerciseId);
      if (existing) existing.values.push(parts.join("/"));
      else map.set(set.exerciseId, { exerciseName: set.exerciseName, values: [parts.join("/")] });
    }

    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySets, groupId]);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (firstDay.getDay() + 6) % 7; // Monday-based

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = toLocalDateKey(new Date());

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <BackLink href={appPath(groupId ? `/stats/groups/${groupId}` : "/stats")} label={groupName ?? "Stats"} />
      <h1 className="text-xl font-semibold px-1">{groupName ? `${groupName} history` : "History"}</h1>

      <div className="flex items-center justify-between px-1">
        <button onClick={() => setMonthCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <p className="font-medium">{monthLabel}</p>
        <button onClick={() => setMonthCursor(new Date(year, month + 1, 1))} aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted px-1">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = toLocalDateKey(date);
          const count = countByDay.get(key) ?? 0;
          const isSelected = selectedDate !== null && toLocalDateKey(selectedDate) === key;
          const isToday = key === todayKey;

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              className={`aspect-square rounded-md flex items-center justify-center text-xs ${heatColorClass(count)} ${heatTextColorClass(count)} ${
                isSelected ? "ring-2 ring-accent" : ""
              } ${isToday ? "font-semibold" : ""}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <section className="flex flex-col gap-2 border-t border-card-border pt-4">
          <p className="text-sm font-medium px-1">
            {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {dayGroups.length === 0 ? (
            <p className="text-sm text-muted px-1">No sets logged this day.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {dayGroups.map((group) => (
                <div key={group.exerciseName} className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3">
                  <p className="font-medium">{group.exerciseName}</p>
                  <p className="text-sm text-muted">{group.values.join(" · ")}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
