"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { groupItemsByGroup } from "@/lib/group-by";
import { closeFriendProfile, type OpenFriendProfile } from "@/lib/friend-profile";
import { AggregateCards } from "@/components/stats/aggregate-cards";
import { ExerciseProgressView } from "@/components/stats/exercise-progress-view";
import { CustomBadge } from "@/components/exercises/custom-badge";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useFriendProfile } from "./use-friend-profile";

// A near-full-screen overlay (not a route) showing a friend's stats
// read-only. Deliberately not styled like the app's own pages — the colored
// header and the fact that it floats above everything else is the point:
// it should never be mistaken for "my" Today/Exercises/Stats underneath.
export function FriendProfileModal() {
  const friend = useFriendProfile();

  useEffect(() => {
    if (!friend) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [friend]);

  if (!friend) return null;

  // Keyed by userId so switching to a different friend remounts this with
  // fresh state instead of carrying over the previous friend's drill-down.
  return <FriendProfileModalContent key={friend.userId} friend={friend} />;
}

function FriendProfileModalContent({ friend }: { friend: NonNullable<OpenFriendProfile> }) {
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const { data: aggregates } = trpc.community.friendAggregates.useQuery({ userId: friend.userId });
  const { data: exercises } = trpc.community.friendExercises.useQuery({ userId: friend.userId });
  const { data: groups } = trpc.community.friendGroups.useQuery({ userId: friend.userId });
  const { data: history } = trpc.community.friendExerciseHistory.useQuery(
    { userId: friend.userId, exerciseId: exerciseId ?? "" },
    { enabled: exerciseId !== null },
  );

  const setCountByExercise = new Map((aggregates?.exerciseSetCounts ?? []).map((e) => [e.exerciseId, e.setCount]));
  const trainedExercises = [...(exercises ?? [])]
    .filter((e) => (setCountByExercise.get(e.id) ?? 0) > 0)
    .sort((a, b) => (setCountByExercise.get(b.id) ?? 0) - (setCountByExercise.get(a.id) ?? 0));
  const sections = groupItemsByGroup(trainedExercises, groups ?? [], (exercise) => exercise.groupIds);
  const activeExercise = exercises?.find((e) => e.id === exerciseId) ?? null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center items-start bg-black/50 pt-[4vh] px-2 sm:px-4"
      onClick={() => closeFriendProfile()}
    >
      <div
        className="w-full max-w-md h-[92vh] bg-background rounded-2xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
          {exerciseId ? (
            <button onClick={() => setExerciseId(null)} aria-label="Back to overview" className="p-2 -m-2">
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <p className="font-medium truncate flex-1">{friend.username}&apos;s stats</p>
          <button onClick={() => closeFriendProfile()} aria-label="Close" className="p-2 -m-2">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {exerciseId && activeExercise ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold px-1">{activeExercise.name}</h2>
                {activeExercise.description && <p className="text-sm text-muted px-1">{activeExercise.description}</p>}
              </div>
              {history && <ExerciseProgressView exercise={activeExercise} history={history} />}
            </>
          ) : (
            <>
              {aggregates && (
                <AggregateCards totalSets={aggregates.totalSets} totalTrainingDays={aggregates.totalTrainingDays} />
              )}

              <section className="flex flex-col gap-3">
                <p className="text-sm font-medium px-1">By exercise</p>
                {exercises && trainedExercises.length === 0 && (
                  <p className="text-sm text-muted px-1">No sets logged yet.</p>
                )}
                {sections.map((section) => (
                  <CollapsibleSection
                    key={section.groupId ?? "ungrouped"}
                    storageKey={`friend-profile:${friend.userId}:${section.groupId ?? "ungrouped"}`}
                    title={section.groupName}
                    count={section.items.length}
                  >
                    {section.items.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => setExerciseId(exercise.id)}
                        className="w-full text-left rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:brightness-95 dark:hover:brightness-125"
                      >
                        <p className="font-medium flex items-center gap-2 min-w-0">
                          <span className="truncate">{exercise.name}</span>
                          {exercise.userId !== null && <CustomBadge />}
                        </p>
                        <p className="text-sm text-muted whitespace-nowrap">
                          {setCountByExercise.get(exercise.id) ?? 0} sets
                        </p>
                      </button>
                    ))}
                  </CollapsibleSection>
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
