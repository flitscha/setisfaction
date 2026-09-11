"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath } from "@/components/admin/view-as-context";
import { aggregateCountByDay } from "@/lib/stats";
import { HeatmapCalendar } from "@/components/stats/heatmap-calendar";
import { TrendChart } from "@/components/stats/trend-chart";
import { BackLink } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n/context";

export default function GroupStatsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const t = useT();
  const appPath = useAppPath();
  const { data: groups } = trpc.stats.groupAggregates.useQuery();
  const { data: timeline } = trpc.stats.groupTimeline.useQuery({ groupId });

  const group = groups?.find((g) => g.groupId === groupId);
  const dates = (timeline ?? []).map((t) => t.performedAt);
  const daily = aggregateCountByDay(dates);

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href={appPath("/stats")} label={t("stats.title")} />
      <h1 className="text-xl font-semibold px-1">{group?.name ?? "…"}</h1>

      {group && (
        <p className="text-sm text-muted px-1">
          {t("groupStats.setsAcrossDays", {
            sets: group.totalSets,
            days: group.totalTrainingDays,
            dayWord: t(group.totalTrainingDays === 1 ? "stats.trainingDaySingular" : "stats.trainingDayPlural"),
          })}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">{t("groupStats.last12Weeks")}</p>
        <HeatmapCalendar performedAtDates={dates} href={appPath(`/stats/history?group=${groupId}`)} />
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">{t("groupStats.setsPerDay")}</p>
        <TrendChart points={daily.map((d) => ({ date: d.date, value: d.count }))} />
      </section>
    </main>
  );
}
