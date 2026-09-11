"use client";

import { useState } from "react";
import {
  aggregateByDay,
  availableTrackedFields,
  valueForField,
  type DailyAggregate,
  type TrackedField,
} from "@/lib/stats";
import { formatDaysAgo, groupByLocalDay } from "@/lib/date";
import { formatSetValue } from "@/lib/format-set";
import { TrendChart } from "./trend-chart";
import { ChartLegend, ComparisonTrendChart } from "./comparison-trend-chart";
import { Card } from "@/components/ui/card";
import { useT, type TranslationKey } from "@/lib/i18n/context";

const RECENT_DAYS_COUNT = 10;

const FIELD_LABEL_KEY: Record<TrackedField, TranslationKey> = {
  reps: "stats.fieldReps",
  time: "stats.fieldTime",
  weight: "stats.fieldWeight",
  volume: "stats.fieldVolume",
};
const FIELD_TOTAL_TITLE_KEY: Record<TrackedField, TranslationKey> = {
  reps: "stats.totalRepsPerDay",
  time: "stats.totalTimePerDay",
  weight: "stats.totalWeightPerDay",
  volume: "stats.totalVolumePerDay",
};

export type ProgressExercise = { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };
export type ProgressSet = {
  id: string;
  performedAt: Date;
  reps: number | null;
  timeSeconds: number | null;
  weightKg: number | null;
};

// One chart section — plain when there's no comparison, or the primary vs.
// comparison overlay (with a legend) when there is. `pick` chooses which
// value off each day's aggregate this section is about (best vs. total).
function ChartSection({
  title,
  daily,
  comparisonDaily,
  comparison,
  primaryLabel,
  pick,
}: {
  title: string;
  daily: DailyAggregate[];
  comparisonDaily: DailyAggregate[] | null;
  comparison?: { label: string } | null;
  primaryLabel: string;
  pick: (d: DailyAggregate) => number;
}) {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-sm font-medium px-1">{title}</p>
      {comparison ? (
        <>
          <ComparisonTrendChart
            series={[
              { label: primaryLabel, points: daily.map((d) => ({ date: d.date, value: pick(d) })), colorClassName: "text-accent" },
              {
                label: comparison.label,
                points: (comparisonDaily ?? []).map((d) => ({ date: d.date, value: pick(d) })),
                colorClassName: "text-muted",
                dashed: true,
              },
            ]}
          />
          <ChartLegend
            series={[
              { label: primaryLabel, points: [], colorClassName: "text-accent" },
              { label: comparison.label, points: [], colorClassName: "text-muted", dashed: true },
            ]}
          />
        </>
      ) : (
        <TrendChart points={daily.map((d) => ({ date: d.date, value: pick(d) }))} />
      )}
    </section>
  );
}

function dailyForField(history: ProgressSet[], field: TrackedField | null): DailyAggregate[] {
  if (!field) return [];
  const points = history
    .map((set) => {
      const value = valueForField(set, field);
      return value === null ? null : { performedAt: set.performedAt, value };
    })
    .filter((point): point is { performedAt: Date; value: number } => point !== null);
  return aggregateByDay(points);
}

// The stat cards, field toggle, and charts for one exercise's history —
// shared between the signed-in user's own /stats/[exerciseId] page and the
// friend profile popup's exercise drill-down, so both stay visually and
// behaviorally identical. Doesn't fetch anything or render a heading/back
// link itself; the host page owns those.
//
// `comparison` overlays a second person's history on the "best per day"
// chart — the caller decides who: the signed-in user's own page passes a
// picked friend's history, the friend profile popup passes the signed-in
// user's own history, and `history` itself is always the "primary" (solid)
// series either way.
export function ExerciseProgressView({
  exercise,
  history,
  primaryLabel,
  comparison,
}: {
  exercise: ProgressExercise;
  history: ProgressSet[];
  // Label for `history` in the comparison legend — only shown/relevant when
  // `comparison` is set. Defaults to "You" since that's the common case (the
  // signed-in user's own page comparing against a friend); the friend
  // profile popup overrides it to the friend's username, since there
  // `history` is the friend's own data and the comparison is "you".
  primaryLabel?: string;
  comparison?: { label: string; history: ProgressSet[] } | null;
}) {
  const t = useT();
  const [field, setField] = useState<TrackedField | null>(null);

  const availableFields = availableTrackedFields(exercise);
  // Volume, when it's an option at all, is the more complete picture than
  // reps or weight alone (see valueForField's comment) — defaults to it
  // rather than to whichever tracked field happens to come first.
  const defaultField = availableFields.includes("volume") ? "volume" : (availableFields[0] ?? null);
  const activeField = field ?? defaultField;

  const daily = dailyForField(history, activeField);
  const comparisonDaily = comparison ? dailyForField(comparison.history, activeField) : null;
  const allTimeBest = daily.length > 0 ? Math.max(...daily.map((d) => d.best)) : null;
  const recentDays = groupByLocalDay(history, (set) => set.performedAt).slice(0, RECENT_DAYS_COUNT);

  return (
    <div className="flex flex-col gap-6">
      {allTimeBest !== null && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-2xl font-semibold">
              {allTimeBest}
              {activeField === "time" ? "s" : activeField === "weight" || activeField === "volume" ? "kg" : ""}
            </p>
            <p className="text-sm text-muted">{t("stats.allTimeBest")}</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold">{history.length}</p>
            <p className="text-sm text-muted">{t("stats.setsTotal")}</p>
          </Card>
        </div>
      )}

      {availableFields.length > 1 && (
        <div className="flex gap-2 px-1">
          {availableFields.map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              className={`text-sm rounded-lg px-3 py-2 min-h-11 border border-card-border ${
                activeField === f ? "bg-accent text-accent-foreground border-transparent" : ""
              }`}
            >
              {t(FIELD_LABEL_KEY[f])}
            </button>
          ))}
        </div>
      )}

      <ChartSection
        title={t("stats.bestPerDay")}
        daily={daily}
        comparisonDaily={comparisonDaily}
        comparison={comparison}
        primaryLabel={primaryLabel ?? t("stats.you")}
        pick={(d) => d.best}
      />

      <ChartSection
        title={activeField ? t(FIELD_TOTAL_TITLE_KEY[activeField]) : ""}
        daily={daily}
        comparisonDaily={comparisonDaily}
        comparison={comparison}
        primaryLabel={primaryLabel ?? t("stats.you")}
        pick={(d) => d.total}
      />

      {recentDays.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium px-1">{t("stats.recentDays")}</p>
          <div className="flex flex-col gap-2">
            {recentDays.map((day) => (
              <div key={day.date.toISOString()} className="rounded-lg border border-card-border px-3 py-2">
                <p className="text-sm text-muted mb-1.5">{formatDaysAgo(day.date, t)}</p>
                <div className="flex flex-wrap gap-2">
                  {day.items.map((set) => (
                    <span key={set.id} className="rounded-md border border-card-border px-2 py-1 text-sm tabular-nums">
                      {formatSetValue(set)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
