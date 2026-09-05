"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { groupItemsByGroup } from "@/lib/group-by";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

export type PickableExercise = {
  id: string;
  name: string;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
};

function ExerciseButton({ exercise, onSelect }: { exercise: PickableExercise; onSelect: (exercise: PickableExercise) => void }) {
  return (
    <button
      onClick={() => onSelect(exercise)}
      className="text-left rounded-lg border border-card-border px-3 py-2 hover:bg-card w-full"
    >
      {exercise.name}
    </button>
  );
}

export function ExercisePicker({ onSelect }: { onSelect: (exercise: PickableExercise) => void }) {
  const [query, setQuery] = useState("");
  const { data: all } = trpc.exercise.list.useQuery();
  const { data: recent } = trpc.exercise.listRecent.useQuery();
  const { data: groups } = trpc.group.list.useQuery();

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = trimmedQuery ? (all ?? []).filter((exercise) => exercise.name.toLowerCase().includes(trimmedQuery)) : null;

  const sections = groupItemsByGroup(all ?? [], groups ?? [], (exercise) => exercise.groupIds);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Search exercise…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        className="border border-card-border rounded-lg px-3 py-2 bg-transparent"
      />

      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
        {filtered ? (
          <div className="flex flex-col gap-1">
            {filtered.length === 0 && <p className="text-sm text-muted">No exercises found.</p>}
            {filtered.map((exercise) => (
              <ExerciseButton key={exercise.id} exercise={exercise} onSelect={onSelect} />
            ))}
          </div>
        ) : (
          <>
            {recent && recent.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted px-1">Recent</p>
                {recent.map((exercise) => (
                  <ExerciseButton key={exercise.id} exercise={exercise} onSelect={onSelect} />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted px-1">Browse by group</p>
              {sections.map((section) => (
                <CollapsibleSection
                  key={section.groupId ?? "ungrouped"}
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
