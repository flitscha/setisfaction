"use client";

import { useState } from "react";
import { aggregateByDay } from "@/lib/stats";
import { formatDaysAgo, groupByLocalDay } from "@/lib/date";
import { formatSetValue } from "@/lib/format-set";
import { TrendChart } from "./trend-chart";
import { Card } from "@/components/ui/card";

export type TrackedField = "reps" | "time" | "weight";

const FIELD_LABEL: Record<TrackedField, string> = { reps: "Reps", time: "Time (s)", weight: "Weight (kg)" };
const RECENT_DAYS_COUNT = 10;

export type ProgressExercise = { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };
export type ProgressSet = {
  id: string;
  performedAt: Date;
  reps: number | null;
  timeSeconds: number | null;
  weightKg: number | null;
};

// The stat cards, field toggle, and charts for one exercise's history —
// shared between the signed-in user's own /stats/[exerciseId] page and the
// friend profile popup's exercise drill-down, so both stay visually and
// behaviorally identical. Doesn't fetch anything or render a heading/back
// link itself; the host page owns those.
export function ExerciseProgressView({ exercise, history }: { exercise: ProgressExercise; history: ProgressSet[] }) {
  const [field, setField] = useState<TrackedField | null>(null);

  const availableFields = (["reps", "time", "weight"] as const).filter((f) => {
    if (f === "reps") return exercise.tracksReps;
    if (f === "time") return exercise.tracksTime;
    return exercise.tracksWeight;
  });
  const activeField = field ?? availableFields[0] ?? null;

  const points = history
    .map((set) => {
      const value = activeField === "reps" ? set.reps : activeField === "time" ? set.timeSeconds : set.weightKg;
      return value === null || value === undefined ? null : { performedAt: set.performedAt, value };
    })
    .filter((point): point is { performedAt: Date; value: number } => point !== null);

  const daily = aggregateByDay(points);
  const unitLabel = activeField ? FIELD_LABEL[activeField].toLowerCase() : "";
  const allTimeBest = daily.length > 0 ? Math.max(...daily.map((d) => d.best)) : null;
  const recentDays = groupByLocalDay(history, (set) => set.performedAt).slice(0, RECENT_DAYS_COUNT);

  return (
    <div className="flex flex-col gap-6">
      {allTimeBest !== null && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-2xl font-semibold">
              {allTimeBest}
              {activeField === "time" ? "s" : activeField === "weight" ? "kg" : ""}
            </p>
            <p className="text-sm text-muted">All-time best</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold">{history.length}</p>
            <p className="text-sm text-muted">Sets total</p>
          </Card>
        </div>
      )}

      {availableFields.length > 1 && (
        <div className="flex gap-2 px-1">
          {availableFields.map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              className={`text-sm rounded-lg px-3 py-2 min-h-11 border border-card-border ${
                activeField === f ? "bg-accent text-accent-foreground border-transparent" : ""
              }`}
            >
              {FIELD_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">Best per training day</p>
        <TrendChart points={daily.map((d) => ({ date: d.date, value: d.best }))} />
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">Total {unitLabel} per training day</p>
        <TrendChart points={daily.map((d) => ({ date: d.date, value: d.total }))} />
      </section>

      {recentDays.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium px-1">Recent training days</p>
          <div className="flex flex-col gap-2">
            {recentDays.map((day) => (
              <div key={day.date.toISOString()} className="rounded-lg border border-card-border px-3 py-2">
                <p className="text-sm text-muted mb-1.5">{formatDaysAgo(day.date)}</p>
                <div className="flex flex-wrap gap-2">
                  {day.items.map((set) => (
                    <span key={set.id} className="rounded-md border border-card-border px-2 py-1 text-sm tabular-nums">
                      {formatSetValue(set)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
