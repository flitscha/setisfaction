"use client";

import { trpc } from "@/lib/trpc/client";
import { HeatmapCalendar } from "@/components/stats/heatmap-calendar";
import { AggregateCards } from "@/components/stats/aggregate-cards";
import { ExerciseSummaryRow } from "@/components/stats/exercise-summary-row";

export default function StatsPage() {
  const { data: heatmapData } = trpc.stats.heatmap.useQuery();
  const { data: aggregates } = trpc.stats.aggregates.useQuery();
  const { data: exercises } = trpc.exercise.list.useQuery();

  const setCountByExercise = new Map((aggregates?.exerciseSetCounts ?? []).map((e) => [e.exerciseId, e.setCount]));
  const sortedExercises = [...(exercises ?? [])].sort(
    (a, b) => (setCountByExercise.get(b.id) ?? 0) - (setCountByExercise.get(a.id) ?? 0),
  );

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-semibold px-1">Stats</h1>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">Last 12 weeks</p>
        <HeatmapCalendar performedAtDates={(heatmapData ?? []).map((set) => set.performedAt)} />
      </section>

      {aggregates && (
        <AggregateCards totalSets={aggregates.totalSets} totalTrainingDays={aggregates.totalTrainingDays} />
      )}

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">By exercise</p>
        <div className="flex flex-col gap-2">
          {sortedExercises.map((exercise) => (
            <ExerciseSummaryRow key={exercise.id} exercise={exercise} />
          ))}
          {sortedExercises.length === 0 && <p className="text-sm text-muted px-1">No exercises yet.</p>}
        </div>
      </section>
    </main>
  );
}
