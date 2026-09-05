"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath } from "@/components/admin/view-as-context";
import { groupItemsByGroup } from "@/lib/group-by";
import { searchItems } from "@/lib/search";
import { HeatmapCalendar } from "@/components/stats/heatmap-calendar";
import { AggregateCards } from "@/components/stats/aggregate-cards";
import { ExerciseSummaryRow } from "@/components/stats/exercise-summary-row";
import { GroupSummaryRow } from "@/components/stats/group-summary-row";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SearchInput } from "@/components/ui/search-input";

export default function StatsPage() {
  const appPath = useAppPath();
  const [query, setQuery] = useState("");
  const { data: heatmapData } = trpc.stats.heatmap.useQuery();
  const { data: aggregates } = trpc.stats.aggregates.useQuery();
  const { data: exercises } = trpc.exercise.list.useQuery();
  const { data: groups } = trpc.group.list.useQuery();
  const { data: groupAggregates } = trpc.stats.groupAggregates.useQuery();

  const setCountByExercise = new Map((aggregates?.exerciseSetCounts ?? []).map((e) => [e.exerciseId, e.setCount]));
  const sortedExercises = [...(exercises ?? [])].sort(
    (a, b) => (setCountByExercise.get(b.id) ?? 0) - (setCountByExercise.get(a.id) ?? 0),
  );
  // Searching drops the grouping in favor of one filtered list, same as the
  // Exercises page, so a typo still finds the right exercise's chart.
  const searchedExercises = query.trim() ? searchItems(sortedExercises, query) : null;
  const exerciseSections = searchedExercises
    ? null
    : groupItemsByGroup(sortedExercises, groups ?? [], (exercise) => exercise.groupIds);

  // Never-trained or longest-neglected groups first, so a skipped leg day stands out.
  const sortedGroups = [...(groupAggregates ?? [])].sort((a, b) => {
    if (!a.lastTrainedAt && !b.lastTrainedAt) return a.name.localeCompare(b.name);
    if (!a.lastTrainedAt) return -1;
    if (!b.lastTrainedAt) return 1;
    return a.lastTrainedAt.getTime() - b.lastTrainedAt.getTime();
  });

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-semibold px-1">Stats</h1>

      {aggregates && (
        <AggregateCards totalSets={aggregates.totalSets} totalTrainingDays={aggregates.totalTrainingDays} />
      )}

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium px-1">Last 12 weeks (tap to browse by day)</p>
        <HeatmapCalendar
          performedAtDates={(heatmapData ?? []).map((set) => set.performedAt)}
          href={appPath("/stats/history")}
        />
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium px-1">By exercise</p>
        {sortedExercises.length > 0 && (
          <SearchInput value={query} onChange={setQuery} placeholder="Search exercises…" />
        )}
        {sortedExercises.length === 0 && <p className="text-sm text-muted px-1">No exercises yet.</p>}
        {searchedExercises?.length === 0 && <p className="text-sm text-muted px-1">No matching exercises.</p>}
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
          <p className="text-sm font-medium px-1">By group</p>
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
