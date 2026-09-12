"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath } from "@/components/admin/view-as-context";
import { groupItemsByGroup } from "@/lib/group-by";
import { searchItemsBilingual } from "@/lib/search";
import { HeatmapCalendar } from "@/components/stats/heatmap-calendar";
import { AggregateCards } from "@/components/stats/aggregate-cards";
import { ExerciseSummaryRow } from "@/components/stats/exercise-summary-row";
import { GroupSummaryRow } from "@/components/stats/group-summary-row";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SearchInput } from "@/components/ui/search-input";
import { useLocale, useT } from "@/lib/i18n/context";
import { translateExerciseName, otherLanguageExerciseName } from "@/lib/i18n/exercise-names";

const FAVORITES_COUNT = 7;

export default function StatsPage() {
  const t = useT();
  const { locale } = useLocale();
  const appPath = useAppPath();
  const [query, setQuery] = useState("");
  const { data: heatmapData } = trpc.stats.heatmap.useQuery();
  const { data: aggregates } = trpc.stats.aggregates.useQuery();
  const { data: exercises } = trpc.exercise.list.useQuery();
  const { data: groups } = trpc.group.list.useQuery();
  const { data: groupAggregates } = trpc.stats.groupAggregates.useQuery();

  const setCountByExercise = new Map((aggregates?.exerciseSetCounts ?? []).map((e) => [e.exerciseId, e.setCount]));
  // Translated once here (not inside ExerciseSummaryRow) so favorites,
  // search, and the grouped list below all work off the same display names.
  const displayExercises = (exercises ?? []).map((e) => ({ ...e, name: translateExerciseName(e, locale) }));
  const sortedExercises = [...displayExercises].sort(
    (a, b) => (setCountByExercise.get(b.id) ?? 0) - (setCountByExercise.get(a.id) ?? 0),
  );
  const trainedExercises = sortedExercises.filter((e) => (setCountByExercise.get(e.id) ?? 0) > 0);
  const favorites = trainedExercises.slice(0, FAVORITES_COUNT);
  // Searching drops the grouping in favor of one filtered list, same as the
  // Exercises page, so a typo still finds the right exercise's chart.
  const searchedExercises = query.trim()
    ? searchItemsBilingual(sortedExercises, query, (e) => otherLanguageExerciseName(e, locale))
    : null;
  // Only exercises with at least one logged set — an exercise never trained
  // has nothing to show here, so it'd just be clutter.
  const exerciseSections = searchedExercises
    ? null
    : groupItemsByGroup(trainedExercises, groups ?? [], (exercise) => exercise.groupIds);

  // Never-trained or longest-neglected groups first, so a skipped leg day stands out.
  const sortedGroups = [...(groupAggregates ?? [])].sort((a, b) => {
    if (!a.lastTrainedAt && !b.lastTrainedAt) return a.name.localeCompare(b.name);
    if (!a.lastTrainedAt) return -1;
    if (!b.lastTrainedAt) return 1;
    return a.lastTrainedAt.getTime() - b.lastTrainedAt.getTime();
  });

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-semibold px-1">{t("stats.title")}</h1>

      {aggregates && (
        <AggregateCards totalSets={aggregates.totalSets} totalTrainingDays={aggregates.totalTrainingDays} />
      )}

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">{t("stats.last12Weeks")}</p>
        <HeatmapCalendar
          performedAtDates={(heatmapData ?? []).map((set) => set.performedAt)}
          href={appPath("/stats/history")}
        />
      </section>

      {sortedExercises.length > 0 && (
        <SearchInput value={query} onChange={setQuery} placeholder={t("exercises.searchPlaceholder")} />
      )}
      {sortedExercises.length === 0 && <p className="text-sm text-muted px-1">{t("stats.noExercisesYet")}</p>}

      {!query.trim() && favorites.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium px-1">{t("stats.favorites")}</p>
          <div className="flex flex-col gap-2">
            {favorites.map((exercise) => (
              <ExerciseSummaryRow key={exercise.id} exercise={exercise} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium px-1">{t("stats.byExercise")}</p>
        {searchedExercises?.length === 0 && <p className="text-sm text-muted px-1">{t("exercises.noMatches")}</p>}
        {!searchedExercises && trainedExercises.length === 0 && (
          <p className="text-sm text-muted px-1">{t("stats.logSetToSeeHere")}</p>
        )}
        {searchedExercises
          ? searchedExercises.map((exercise) => <ExerciseSummaryRow key={exercise.id} exercise={exercise} />)
          : exerciseSections?.map((section) => (
              <CollapsibleSection
                key={section.groupId ?? "ungrouped"}
                storageKey={`stats-by-exercise:${section.groupId ?? "ungrouped"}`}
                title={section.groupName}
                count={section.items.length}
              >
                {section.items.map((exercise) => (
                  <ExerciseSummaryRow key={exercise.id} exercise={exercise} />
                ))}
              </CollapsibleSection>
            ))}
      </section>

      {!query.trim() && sortedGroups.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium px-1">{t("stats.byGroup")}</p>
          <div className="flex flex-col gap-2">
            {sortedGroups.map((group) => (
              <GroupSummaryRow key={group.groupId} group={group} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
