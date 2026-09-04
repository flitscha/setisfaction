"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { HeatmapCalendar } from "@/components/stats/heatmap-calendar";
import { AggregateCards } from "@/components/stats/aggregate-cards";

export default function StatsPage() {
  const { data: heatmapData } = trpc.stats.heatmap.useQuery();
  const { data: aggregates } = trpc.stats.aggregates.useQuery();
  const { data: exercises } = trpc.exercise.list.useQuery();

  return (
    <main className="flex-1 p-6 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Stats</h1>

      <section>
        <p className="text-sm font-medium mb-2">Last 12 weeks</p>
        <HeatmapCalendar performedAtDates={(heatmapData ?? []).map((set) => set.performedAt)} />
      </section>

      {aggregates && (
        <AggregateCards
          totalSets={aggregates.totalSets}
          totalTrainingDays={aggregates.totalTrainingDays}
          mostTrainedExercises={aggregates.mostTrainedExercises}
        />
      )}

      <section>
        <p className="text-sm font-medium mb-2">Progress by exercise</p>
        <div className="flex flex-col gap-2">
          {exercises?.map((exercise) => (
            <Link
              key={exercise.id}
              href={`/stats/${exercise.id}`}
              className="border rounded px-3 py-2 hover:bg-gray-50"
            >
              {exercise.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
