"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath, useViewAsUser } from "@/components/admin/view-as-context";
import { ExerciseProgressView } from "@/components/stats/exercise-progress-view";
import { BackLink } from "@/components/ui/back-link";
import { useLocale, useT } from "@/lib/i18n/context";
import { translateExerciseName } from "@/lib/i18n/exercise-names";

export default function ExerciseStatsPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = use(params);
  const t = useT();
  const { locale } = useLocale();
  const appPath = useAppPath();
  const isViewingAs = useViewAsUser() !== null;
  const [compareFriendId, setCompareFriendId] = useState<string | null>(null);
  // The friend list is only worth fetching once someone actually asks to
  // compare — loading it unconditionally on every standard exercise's page
  // used to add a second, sequential round trip after the exercise and its
  // history had already loaded, for a feature most visits never use.
  const [showCompareOptions, setShowCompareOptions] = useState(false);

  const { data: exercise } = trpc.exercise.getById.useQuery({ id: exerciseId });
  const { data: history } = trpc.set.listByExercise.useQuery({ exerciseId });

  // Comparing against a friend only makes sense on a standard exercise —
  // that's the only case where the exercise id is genuinely the same one
  // they're logging against too. Also not shown while an admin is viewing
  // another user's page: the friends involved would be the admin's own,
  // which has nothing to do with whose data is on screen.
  const canCompare = !isViewingAs && exercise?.userId === null;
  const { data: friends, isLoading: isLoadingFriends } = trpc.community.listFriends.useQuery(undefined, {
    enabled: canCompare && showCompareOptions,
  });
  const compareFriend = friends?.find((f) => f.userId === compareFriendId) ?? null;
  const { data: comparisonHistory } = trpc.community.friendExerciseHistory.useQuery(
    { userId: compareFriendId ?? "", exerciseId },
    { enabled: canCompare && compareFriendId !== null },
  );

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href={appPath("/stats")} label={t("stats.title")} />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold px-1">{exercise ? translateExerciseName(exercise, locale) : "…"}</h1>
        {exercise?.description && <p className="text-sm text-muted px-1">{exercise.description}</p>}
      </div>

      {canCompare && !showCompareOptions && (
        <button
          onClick={() => setShowCompareOptions(true)}
          className="self-start text-sm rounded-lg px-3 py-2 min-h-11 border border-card-border"
        >
          {t("stats.compareWithFriend")}
        </button>
      )}

      {canCompare && showCompareOptions && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium px-1">{t("stats.compareWithFriend")}</p>
          {isLoadingFriends && <p className="text-sm text-muted px-1">{t("common.loading")}</p>}
          {friends?.length === 0 && <p className="text-sm text-muted px-1">{t("community.noFriendsYet")}</p>}
          <div className="flex gap-2 px-1 flex-wrap">
            {friends?.map((friend) => (
              <button
                key={friend.userId}
                onClick={() => setCompareFriendId((current) => (current === friend.userId ? null : friend.userId))}
                className={`text-sm rounded-lg px-3 py-2 min-h-11 border border-card-border ${
                  compareFriendId === friend.userId ? "bg-accent text-accent-foreground border-transparent" : ""
                }`}
              >
                {friend.username}
              </button>
            ))}
          </div>
        </div>
      )}

      {exercise && history && (
        <ExerciseProgressView
          exercise={exercise}
          history={history}
          comparison={compareFriend ? { label: compareFriend.username, history: comparisonHistory ?? [] } : null}
        />
      )}
    </main>
  );
}
