"use client";

import { Card } from "@/components/ui/card";
import { useT } from "@/lib/i18n/context";

export function AggregateCards({ totalSets, totalTrainingDays }: { totalSets: number; totalTrainingDays: number }) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <p className="text-2xl font-semibold">{totalSets}</p>
        <p className="text-sm text-muted">{t("stats.setsTotal")}</p>
      </Card>
      <Card>
        <p className="text-2xl font-semibold">{totalTrainingDays}</p>
        <p className="text-sm text-muted">{t("stats.trainingDays")}</p>
      </Card>
    </div>
  );
}
