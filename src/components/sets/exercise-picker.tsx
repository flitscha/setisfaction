"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { groupItemsByGroup } from "@/lib/group-by";
import { searchItemsBilingual } from "@/lib/search";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SearchInput } from "@/components/ui/search-input";
import { useLocale, useT } from "@/lib/i18n/context";
import { translateExerciseName, otherLanguageExerciseName } from "@/lib/i18n/exercise-names";

export type PickableExercise = {
  id: string;
  userId: string | null;
  name: string;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
};

const TOP_COUNT = 7;

// `exercise` here is a display copy (translated name) used for rendering
// and search only — selecting it resolves back to the original via
// onSelect, so callers always get the exercise's real (English) name.
function ExerciseButton({ exercise, onSelect }: { exercise: PickableExercise; onSelect: (exercise: PickableExercise) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(exercise)}
      className="text-left rounded-lg border border-card-border px-3 py-2.5 min-h-11 hover:bg-card w-full"
    >
      {exercise.name}
    </button>
  );
}

export function ExercisePicker({ onSelect }: { onSelect: (exercise: PickableExercise) => void }) {
  const t = useT();
  const { locale } = useLocale();
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
  // Translated once here for both display and search; the real (English)
  // exercise is looked back up by id in handleSelect below.
  const byIdOriginal = new Map(byFrequency.map((e) => [e.id, e]));
  const displayList = byFrequency.map((e) => ({ ...e, name: translateExerciseName(e, locale) }));
  function handleSelect(displayExercise: PickableExercise) {
    onSelect(byIdOriginal.get(displayExercise.id) ?? displayExercise);
  }

  const topExercises = displayList.filter((e) => setCountByExercise.has(e.id)).slice(0, TOP_COUNT);

  const searched = query.trim()
    ? searchItemsBilingual(displayList, query, (e) => otherLanguageExerciseName(e, locale))
    : null;

  const sections = groupItemsByGroup(displayList, groups ?? [], (exercise) => exercise.groupIds);

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} placeholder={t("picker.search")} autoFocus />

      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
        {searched ? (
          <div className="flex flex-col gap-1">
            {searched.length === 0 && <p className="text-sm text-muted">{t("picker.noMatches")}</p>}
            {searched.map((exercise) => (
              <ExerciseButton key={exercise.id} exercise={exercise} onSelect={handleSelect} />
            ))}
          </div>
        ) : (
          <>
            {topExercises.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted px-1">{t("picker.mostTrained")}</p>
                {topExercises.map((exercise) => (
                  <ExerciseButton key={exercise.id} exercise={exercise} onSelect={handleSelect} />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted px-1">{t("picker.browseByGroup")}</p>
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
                      <ExerciseButton key={exercise.id} exercise={exercise} onSelect={handleSelect} />
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
