"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { groupItemsByGroup } from "@/lib/group-by";
import { searchItemsBilingual } from "@/lib/search";
import { useAppPath, useViewAsUser } from "@/components/admin/view-as-context";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SearchInput } from "@/components/ui/search-input";
import { useLocale, useT } from "@/lib/i18n/context";
import { translateExerciseName, otherLanguageExerciseName } from "@/lib/i18n/exercise-names";

export default function ExercisesPage() {
  const t = useT();
  const { locale } = useLocale();
  const isReadOnly = useViewAsUser() !== null;
  const appPath = useAppPath();
  const [query, setQuery] = useState("");
  const { data: exercises, isLoading } = trpc.exercise.list.useQuery();
  const { data: groups } = trpc.group.list.useQuery();

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  // Translated once here (not inside ExerciseCard) so both the grouped
  // browse view and the search below work off the same display names.
  const displayExercises = (exercises ?? []).map((e) => ({ ...e, name: translateExerciseName(e, locale) }));
  // Searching drops the grouping in favor of one filtered, relevance-ranked
  // list — the point is to catch near-duplicates before creating one.
  // Matches against the name as shown and, when that finds nothing, falls
  // back to the exercise's other-language name.
  const searched = query.trim()
    ? searchItemsBilingual(displayExercises, query, (e) => otherLanguageExerciseName(e, locale))
    : null;
  const sections = searched ? null : groupItemsByGroup(displayExercises, groups ?? [], (exercise) => exercise.groupIds);

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-semibold">{t("exercises.title")}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={appPath("/exercises/groups")}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm"
          >
            <Layers size={18} />
            {t("exercises.groups")}
          </Link>
          {!isReadOnly && (
            <Link
              href="/exercises/new"
              className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-medium"
            >
              <Plus size={18} />
              {t("common.new")}
            </Link>
          )}
        </div>
      </div>

      {exercises && exercises.length > 0 && (
        <SearchInput value={query} onChange={setQuery} placeholder={t("exercises.searchPlaceholder")} />
      )}

      {isLoading && <p className="text-muted px-1">{t("common.loading")}</p>}
      {exercises?.length === 0 && <p className="text-muted px-1">{t("exercises.noneYet")}</p>}
      {searched?.length === 0 && <p className="text-muted px-1">{t("exercises.noMatches")}</p>}

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
    </main>
  );
}
