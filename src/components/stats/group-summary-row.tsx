"use client";

import Link from "next/link";
import { useAppPath } from "@/components/admin/view-as-context";
import { formatDaysAgo } from "@/lib/date";
import { useT } from "@/lib/i18n/context";

export function GroupSummaryRow({
  group,
}: {
  group: { groupId: string; name: string; totalSets: number; totalTrainingDays: number; lastTrainedAt: Date | null };
}) {
  const t = useT();
  const appPath = useAppPath();
  return (
    <Link
      href={appPath(`/stats/groups/${group.groupId}`)}
      className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:brightness-95 dark:hover:brightness-125"
    >
      <div>
        <p className="font-medium">{group.name}</p>
        <p className="text-sm text-muted">
          {t("stats.groupSummary", {
            sets: group.totalSets,
            days: group.totalTrainingDays,
            dayWord: t(group.totalTrainingDays === 1 ? "stats.trainingDaySingular" : "stats.trainingDayPlural"),
          })}
        </p>
      </div>
      <p className="text-sm text-muted whitespace-nowrap">
        {group.lastTrainedAt ? formatDaysAgo(group.lastTrainedAt, t) : t("stats.never")}
      </p>
    </Link>
  );
}
