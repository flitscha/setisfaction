"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { aggregateCountByDay } from "@/lib/stats";
import { HeatmapCalendar } from "@/components/stats/heatmap-calendar";
import { TrendChart } from "@/components/stats/trend-chart";

export default function GroupStatsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { data: groups } = trpc.stats.groupAggregates.useQuery();
  const { data: timeline } = trpc.stats.groupTimeline.useQuery({ groupId });

  const group = groups?.find((g) => g.groupId === groupId);
  const dates = (timeline ?? []).map((t) => t.performedAt);
  const daily = aggregateCountByDay(dates);

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-semibold px-1">{group?.name ?? "…"}</h1>

      {group && (
        <p className="text-sm text-muted px-1">
          {group.totalSets} sets across {group.totalTrainingDays} training day{group.totalTrainingDays === 1 ? "" : "s"}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">Last 12 weeks</p>
        <HeatmapCalendar performedAtDates={dates} />
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">Sets per training day</p>
        <TrendChart points={daily.map((d) => ({ date: d.date, value: d.count }))} variant="bar" />
      </section>
    </main>
  );
}
