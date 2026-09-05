"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { aggregateByDay } from "@/lib/stats";
import { Sparkline } from "./sparkline";

type TrackedField = "reps" | "time" | "weight";

const UNIT: Record<TrackedField, string> = { reps: "reps", time: "s", weight: "kg" };

function primaryField(exercise: { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean }): TrackedField | null {
  if (exercise.tracksReps) return "reps";
  if (exercise.tracksTime) return "time";
  if (exercise.tracksWeight) return "weight";
  return null;
}

export function ExerciseSummaryRow({
  exercise,
}: {
  exercise: { id: string; name: string; tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };
}) {
  const { data: history } = trpc.set.listByExercise.useQuery({ exerciseId: exercise.id });
  const field = primaryField(exercise);

  const points = field
    ? (history ?? [])
        .map((set) => {
          const value = field === "reps" ? set.reps : field === "time" ? set.timeSeconds : set.weightKg;
          return value === null || value === undefined ? null : { performedAt: set.performedAt, value };
        })
        .filter((p): p is { performedAt: Date; value: number } => p !== null)
    : [];

  const daily = aggregateByDay(points);
  const best = daily.length > 0 ? Math.max(...daily.map((d) => d.best)) : null;

  return (
    <Link
      href={`/stats/${exercise.id}`}
      className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:brightness-95 dark:hover:brightness-125"
    >
      <div>
        <p className="font-medium">{exercise.name}</p>
        <p className="text-sm text-muted">
          {best !== null && field ? `Best: ${best} ${UNIT[field]}` : "No sets yet"}
        </p>
      </div>
      {daily.length > 0 && <Sparkline values={daily.map((d) => d.best)} />}
    </Link>
  );
}
