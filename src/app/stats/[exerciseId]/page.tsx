"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath } from "@/components/admin/view-as-context";
import { ExerciseProgressView } from "@/components/stats/exercise-progress-view";
import { BackLink } from "@/components/ui/back-link";

export default function ExerciseStatsPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = use(params);
  const appPath = useAppPath();
  const { data: exercise } = trpc.exercise.getById.useQuery({ id: exerciseId });
  const { data: history } = trpc.set.listByExercise.useQuery({ exerciseId });

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href={appPath("/stats")} label="Stats" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold px-1">{exercise?.name ?? "…"}</h1>
        {exercise?.description && <p className="text-sm text-muted px-1">{exercise.description}</p>}
      </div>

      {exercise && history && <ExerciseProgressView exercise={exercise} history={history} />}
    </main>
  );
}
