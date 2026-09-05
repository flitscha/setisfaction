"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { groupItemsByGroup } from "@/lib/group-by";
import { rankByQuery } from "@/lib/search";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SearchInput } from "@/components/ui/search-input";

export type PickableExercise = {
  id: string;
  name: string;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
};

const TOP_COUNT = 7;

function ExerciseButton({ exercise, onSelect }: { exercise: PickableExercise; onSelect: (exercise: PickableExercise) => void }) {
  return (
    <button
      onClick={() => onSelect(exercise)}
      className="text-left rounded-lg border border-card-border px-3 py-2.5 min-h-11 hover:bg-card w-full"
    >
      {exercise.name}
    </button>
  );
}

export function ExercisePicker({ onSelect }: { onSelect: (exercise: PickableExercise) => void }) {
  const [query, setQuery] = useState("");
  const { data: all } = trpc.exercise.list.useQuery();
  const { data: groups } = trpc.group.list.useQuery();
  const { data: aggregates } = trpc.stats.aggregates.useQuery();

  // Most-trained exercises surface first — both as a quick top list and within
  // each group — since that's what you're likely to do again, not necessarily
  // whatever you just logged (you don't want to train the same thing twice in
  // a row).
  const setCountByExercise = new Map((aggregates?.exerciseSetCounts ?? []).map((e) => [e.exerciseId, e.setCount]));
  const byFrequency = [...(all ?? [])].sort(
    (a, b) => (setCountByExercise.get(b.id) ?? 0) - (setCountByExercise.get(a.id) ?? 0),
  );
  const topExercises = byFrequency.filter((e) => setCountByExercise.has(e.id)).slice(0, TOP_COUNT);

  // Ranked rather than filtered — surfaces the closest match even for a
  // typo instead of coming up empty.
  const ranked = query.trim() ? rankByQuery(byFrequency, query) : null;

  const sections = groupItemsByGroup(byFrequency, groups ?? [], (exercise) => exercise.groupIds);

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Search exercise…" autoFocus />

      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
        {ranked ? (
          <div className="flex flex-col gap-1">
            {ranked.length === 0 && <p className="text-sm text-muted">No exercises yet.</p>}
            {ranked.map((exercise) => (
              <ExerciseButton key={exercise.id} exercise={exercise} onSelect={onSelect} />
            ))}
          </div>
        ) : (
          <>
            {topExercises.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted px-1">Most trained</p>
                {topExercises.map((exercise) => (
                  <ExerciseButton key={exercise.id} exercise={exercise} onSelect={onSelect} />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted px-1">Browse by group</p>
              {sections.map((section) => (
                <CollapsibleSection
                  key={section.groupId ?? "ungrouped"}
                  storageKey={`picker:${section.groupId ?? "ungrouped"}`}
                  defaultOpen={false}
                  title={section.groupName}
                  count={section.items.length}
                >
                  <div className="flex flex-col gap-1">
                    {section.items.map((exercise) => (
                      <ExerciseButton key={exercise.id} exercise={exercise} onSelect={onSelect} />
                    ))}
                  </div>
                </CollapsibleSection>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
