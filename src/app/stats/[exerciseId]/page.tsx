"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath } from "@/components/admin/view-as-context";
import { aggregateByDay } from "@/lib/stats";
import { TrendChart } from "@/components/stats/trend-chart";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";

type TrackedField = "reps" | "time" | "weight";

const FIELD_LABEL: Record<TrackedField, string> = { reps: "Reps", time: "Time (s)", weight: "Weight (kg)" };

function formatSet(set: { reps: number | null; timeSeconds: number | null; weightKg: number | null }): string {
  const parts: string[] = [];
  if (set.reps !== null) parts.push(`${set.reps} reps`);
  if (set.timeSeconds !== null) parts.push(`${set.timeSeconds}s`);
  if (set.weightKg !== null) parts.push(`${set.weightKg}kg`);
  return parts.join(" · ");
}

export default function ExerciseStatsPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = use(params);
  const appPath = useAppPath();
  const { data: exercise } = trpc.exercise.getById.useQuery({ id: exerciseId });
  const { data: history } = trpc.set.listByExercise.useQuery({ exerciseId });
  const [field, setField] = useState<TrackedField | null>(null);

  const availableFields = (["reps", "time", "weight"] as const).filter((f) => {
    if (f === "reps") return exercise?.tracksReps;
    if (f === "time") return exercise?.tracksTime;
    return exercise?.tracksWeight;
  });
  const activeField = field ?? availableFields[0] ?? null;

  const points = (history ?? [])
    .map((set) => {
      const value = activeField === "reps" ? set.reps : activeField === "time" ? set.timeSeconds : set.weightKg;
      return value === null || value === undefined ? null : { performedAt: set.performedAt, value };
    })
    .filter((point): point is { performedAt: Date; value: number } => point !== null);

  const daily = aggregateByDay(points);
  const unitLabel = activeField ? FIELD_LABEL[activeField].toLowerCase() : "";
  const allTimeBest = daily.length > 0 ? Math.max(...daily.map((d) => d.best)) : null;
  const recentSets = [...(history ?? [])].reverse().slice(0, 10);

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href={appPath("/stats")} label="Stats" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold px-1">{exercise?.name ?? "…"}</h1>
        {exercise?.description && <p className="text-sm text-muted px-1">{exercise.description}</p>}
      </div>

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
            <p className="text-2xl font-semibold">{history?.length ?? 0}</p>
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

      {recentSets.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium px-1">Recent sets</p>
          <div className="flex flex-col gap-1">
            {recentSets.map((set) => (
              <div key={set.id} className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2 text-sm">
                <span className="text-muted">
                  {set.performedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span>{formatSet(set)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
