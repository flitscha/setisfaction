"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { groupItemsByGroup } from "@/lib/group-by";
import { searchItems } from "@/lib/search";
import { useAppPath, useViewAsUser } from "@/components/admin/view-as-context";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SearchInput } from "@/components/ui/search-input";

export default function ExercisesPage() {
  const isReadOnly = useViewAsUser() !== null;
  const appPath = useAppPath();
  const [query, setQuery] = useState("");
  const utils = trpc.useUtils();
  const { data: exercises, isLoading } = trpc.exercise.list.useQuery();
  const { data: groups } = trpc.group.list.useQuery();
  const { data: hiddenStandard } = trpc.exercise.listHiddenStandard.useQuery(undefined, { enabled: !isReadOnly });

  const resetToDefault = trpc.exercise.resetToDefault.useMutation({
    onSuccess: async () => {
      await utils.exercise.list.invalidate();
      await utils.exercise.listHiddenStandard.invalidate();
    },
  });

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  // Searching drops the grouping in favor of one filtered, relevance-ranked
  // list — the point is to catch near-duplicates before creating one.
  const searched = query.trim() ? searchItems(exercises ?? [], query) : null;
  const sections = searched ? null : groupItemsByGroup(exercises ?? [], groups ?? [], (exercise) => exercise.groupIds);

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
      {searched?.length === 0 && <p className="text-muted px-1">No matching exercises.</p>}

      <div className="flex flex-col gap-3">
        {searched
          ? searched.map((exercise) => (
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

      {!isReadOnly && hiddenStandard && hiddenStandard.length > 0 && (
        <CollapsibleSection
          storageKey="exercises-list:hidden-standard"
          title="Hidden standard exercises"
          count={hiddenStandard.length}
          defaultOpen={false}
        >
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted px-1">
              You have your own version of these — restoring brings back the shared default (your logged sets are
              kept) and lets you compare with other users again.
            </p>
            {hiddenStandard.map((item) => (
              <div
                key={item.forkId}
                className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-2"
              >
                <p>{item.name}</p>
                <Button
                  variant="secondary"
                  onClick={() => resetToDefault.mutate({ id: item.forkId })}
                  disabled={resetToDefault.isPending}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </main>
  );
}
