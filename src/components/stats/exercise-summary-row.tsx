"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useAppPath } from "@/components/admin/view-as-context";
import { aggregateByDay, TRACKED_FIELD_UNIT, valueForField, type TrackedField } from "@/lib/stats";
import { CustomBadge } from "@/components/exercises/custom-badge";
import { Sparkline } from "./sparkline";

// Volume (reps × weight) takes priority over either alone for a gym-style
// exercise that tracks both — see valueForField's comment for why.
function primaryField(exercise: { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean }): TrackedField | null {
  if (exercise.tracksReps && exercise.tracksWeight) return "volume";
  if (exercise.tracksReps) return "reps";
  if (exercise.tracksTime) return "time";
  if (exercise.tracksWeight) return "weight";
  return null;
}

export function ExerciseSummaryRow({
  exercise,
}: {
  exercise: {
    id: string;
    userId: string | null;
    name: string;
    tracksReps: boolean;
    tracksTime: boolean;
    tracksWeight: boolean;
  };
}) {
  const appPath = useAppPath();
  const { data: history } = trpc.set.listByExercise.useQuery({ exerciseId: exercise.id });
  const field = primaryField(exercise);

  const points = field
    ? (history ?? [])
        .map((set) => {
          const value = valueForField(set, field);
          return value === null ? null : { performedAt: set.performedAt, value };
        })
        .filter((p): p is { performedAt: Date; value: number } => p !== null)
    : [];

  const daily = aggregateByDay(points);
  const best = daily.length > 0 ? Math.max(...daily.map((d) => d.best)) : null;

  return (
    <Link
      href={appPath(`/stats/${exercise.id}`)}
      className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:brightness-95 dark:hover:brightness-125"
    >
      <div className="min-w-0">
        <p className="font-medium flex items-center gap-2">
          <span className="truncate">{exercise.name}</span>
          {exercise.userId !== null && <CustomBadge />}
        </p>
        <p className="text-sm text-muted">
          {best !== null && field ? `Best: ${best} ${TRACKED_FIELD_UNIT[field]}` : "No sets yet"}
        </p>
      </div>
      {daily.length > 0 && <Sparkline values={daily.map((d) => d.best)} />}
    </Link>
  );
}
