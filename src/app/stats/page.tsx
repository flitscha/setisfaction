"use client";

import { trpc } from "@/lib/trpc/client";
import { groupItemsByGroup } from "@/lib/group-by";
import { HeatmapCalendar } from "@/components/stats/heatmap-calendar";
import { AggregateCards } from "@/components/stats/aggregate-cards";
import { ExerciseSummaryRow } from "@/components/stats/exercise-summary-row";
import { GroupSummaryRow } from "@/components/stats/group-summary-row";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

export default function StatsPage() {
  const { data: heatmapData } = trpc.stats.heatmap.useQuery();
  const { data: aggregates } = trpc.stats.aggregates.useQuery();
  const { data: exercises } = trpc.exercise.list.useQuery();
  const { data: groups } = trpc.group.list.useQuery();
  const { data: groupAggregates } = trpc.stats.groupAggregates.useQuery();

  const setCountByExercise = new Map((aggregates?.exerciseSetCounts ?? []).map((e) => [e.exerciseId, e.setCount]));
  const sortedExercises = [...(exercises ?? [])].sort(
    (a, b) => (setCountByExercise.get(b.id) ?? 0) - (setCountByExercise.get(a.id) ?? 0),
  );
  const exerciseSections = groupItemsByGroup(sortedExercises, groups ?? [], (exercise) => exercise.groupIds);

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
        <HeatmapCalendar performedAtDates={(heatmapData ?? []).map((set) => set.performedAt)} />
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium px-1">By exercise</p>
        {exerciseSections.length === 0 && <p className="text-sm text-muted px-1">No exercises yet.</p>}
        {exerciseSections.map((section) => (
          <CollapsibleSection key={section.groupId ?? "ungrouped"} title={section.groupName} count={section.items.length}>
            {section.items.map((exercise) => (
              <ExerciseSummaryRow key={exercise.id} exercise={exercise} />
            ))}
          </CollapsibleSection>
        ))}
      </section>

      {sortedGroups.length > 0 && (
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
