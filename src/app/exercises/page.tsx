"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { groupItemsByGroup } from "@/lib/group-by";
import { rankByQuery } from "@/lib/search";
import { useAppPath, useViewAsUser } from "@/components/admin/view-as-context";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SearchInput } from "@/components/ui/search-input";

export default function ExercisesPage() {
  const isReadOnly = useViewAsUser() !== null;
  const appPath = useAppPath();
  const [query, setQuery] = useState("");
  const { data: exercises, isLoading } = trpc.exercise.list.useQuery();
  const { data: groups } = trpc.group.list.useQuery();

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  // Searching drops the grouping in favor of one relevance-ranked list, so a
  // typo'd search still surfaces the closest existing exercise instead of
  // "no results" — the point is to catch near-duplicates before creating one.
  const ranked = query.trim() ? rankByQuery(exercises ?? [], query) : null;
  const sections = ranked ? null : groupItemsByGroup(exercises ?? [], groups ?? [], (exercise) => exercise.groupIds);

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-semibold">Exercises</h1>
        <div className="flex items-center gap-2">
          <Link
            href={appPath("/exercises/groups")}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm"
          >
            <Layers size={18} />
            Groups
          </Link>
          {!isReadOnly && (
            <Link
              href="/exercises/new"
              className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-medium"
            >
              <Plus size={18} />
              New
            </Link>
          )}
        </div>
      </div>

      {exercises && exercises.length > 0 && (
        <SearchInput value={query} onChange={setQuery} placeholder="Search exercises…" />
      )}

      {isLoading && <p className="text-muted px-1">Loading…</p>}
      {exercises?.length === 0 && <p className="text-muted px-1">No exercises yet.</p>}

      <div className="flex flex-col gap-3">
        {ranked
          ? ranked.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                groupNames={exercise.groupIds.map((id) => groupNameById.get(id)).filter((name): name is string => Boolean(name))}
              />
            ))
          : sections?.map((section) => (
              <CollapsibleSection
                key={section.groupId ?? "ungrouped"}
                storageKey={`exercises-list:${section.groupId ?? "ungrouped"}`}
                title={section.groupName}
                count={section.items.length}
              >
                {section.items.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    groupNames={exercise.groupIds.map((id) => groupNameById.get(id)).filter((name): name is string => Boolean(name))}
                  />
                ))}
              </CollapsibleSection>
            ))}
      </div>
    </main>
  );
}
