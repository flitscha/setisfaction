"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ExerciseProgressChart } from "@/components/stats/exercise-progress-chart";

type TrackedField = "reps" | "time" | "weight";

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

  return (
    <main className="flex-1 p-6 max-w-md mx-auto w-full flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{exercise?.name ?? "…"}</h1>

      {availableFields.length > 1 && (
        <div className="flex gap-2">
          {availableFields.map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              className={`text-sm border rounded px-2 py-1 ${activeField === f ? "bg-black text-white" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <ExerciseProgressChart points={points} />

      <div className="flex flex-col gap-1">
        {[...points].reverse().map((point, i) => (
          <div key={i} className="flex justify-between text-sm text-gray-500">
            <span>{point.performedAt.toLocaleDateString()}</span>
            <span>{point.value}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
