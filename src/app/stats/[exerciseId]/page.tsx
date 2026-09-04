"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { aggregateByDay } from "@/lib/stats";
import { TrendChart } from "@/components/stats/trend-chart";

type TrackedField = "reps" | "time" | "weight";

const FIELD_LABEL: Record<TrackedField, string> = { reps: "Reps", time: "Time (s)", weight: "Weight (kg)" };

export default function ExerciseStatsPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = use(params);
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

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-semibold px-1">{exercise?.name ?? "…"}</h1>

      {availableFields.length > 1 && (
        <div className="flex gap-2 px-1">
          {availableFields.map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              className={`text-sm rounded-lg px-3 py-1 border border-card-border ${
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
        <TrendChart points={daily.map((d) => ({ date: d.date, value: d.total }))} variant="bar" />
      </section>
    </main>
  );
}
