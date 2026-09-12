"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useViewAsUser } from "@/components/admin/view-as-context";
import { getLocalDayRange } from "@/lib/date";
import { ExercisePicker, type PickableExercise } from "@/components/sets/exercise-picker";
import { SetForm, type SetFormValues } from "@/components/sets/set-form";
import { TodayExerciseCard } from "@/components/sets/today-exercise-card";
import { Modal } from "@/components/ui/modal";
import { PlanWorkoutCard } from "@/components/plans/plan-workout-card";
import { useLocale, useT } from "@/lib/i18n/context";
import { translateExerciseName } from "@/lib/i18n/exercise-names";

type EditingSet = {
  id: string;
  exerciseId: string;
  reps: number | null;
  timeSeconds: number | null;
  weightKg: number | null;
};

export default function TodayPage() {
  const t = useT();
  const { locale } = useLocale();
  const isReadOnly = useViewAsUser() !== null;
  const now = useMemo(() => new Date(), []);
  const { start, end } = useMemo(() => getLocalDayRange(now), [now]);
  const yesterdayRef = useMemo(() => new Date(now.getTime() - 24 * 60 * 60 * 1000), [now]);
  const { start: yesterdayStart, end: yesterdayEnd } = useMemo(() => getLocalDayRange(yesterdayRef), [yesterdayRef]);
  const utils = trpc.useUtils();
  const { data: todaySets } = trpc.set.listByDay.useQuery({ dayStart: start, dayEnd: end });
  const planWorkoutInput = {
    todayWeekday: now.getDay(),
    yesterdayWeekday: yesterdayRef.getDay(),
    todayStart: start,
    todayEnd: end,
    yesterdayStart,
    yesterdayEnd,
  };
  const { data: planWorkout } = trpc.trainingPlan.todayWorkout.useQuery(planWorkoutInput);

  const [showPicker, setShowPicker] = useState(false);
  const [activeExercise, setActiveExercise] = useState<PickableExercise | null>(null);
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const dayRangeKey = { dayStart: start, dayEnd: end };

  const createSet = trpc.set.create.useMutation({
    // Shows the new set in its card immediately instead of waiting on the
    // round trip — the connection to Supabase can be slow enough that the
    // wait is noticeable mid-workout. isPr is unknown until the server
    // confirms, so the optimistic entry just shows no star; the real list
    // (with the correct star) replaces it moments later regardless of
    // whether this succeeds.
    onMutate: async (input) => {
      if (!activeExercise) return;
      await utils.set.listByDay.cancel(dayRangeKey);
      const previous = utils.set.listByDay.getData(dayRangeKey);
      utils.set.listByDay.setData(dayRangeKey, (old) => [
        ...(old ?? []),
        {
          id: `optimistic-${crypto.randomUUID()}`,
          exerciseId: activeExercise.id,
          exerciseName: activeExercise.name,
          exerciseUserId: activeExercise.userId,
          tracksReps: activeExercise.tracksReps,
          tracksTime: activeExercise.tracksTime,
          tracksWeight: activeExercise.tracksWeight,
          performedAt: input.performedAt ?? new Date(),
          reps: input.reps ?? null,
          timeSeconds: input.timeSeconds ?? null,
          weightKg: input.weightKg ?? null,
          isPr: false,
        },
      ]);
      return { previous };
    },
    onError: (error, input, context) => {
      if (context?.previous) utils.set.listByDay.setData(dayRangeKey, context.previous);
    },
    onSuccess: async () => {
      await utils.stats.aggregates.invalidate();
      setActiveExercise(null);
    },
    // Also refreshes the plan checklist above: a manually-logged set for an
    // exercise that's part of today's plan counts toward it too, so its
    // progress must stay in sync regardless of which flow created the set.
    onSettled: () => {
      utils.set.listByDay.invalidate();
      utils.trainingPlan.todayWorkout.invalidate();
    },
  });

  const updateSet = trpc.set.update.useMutation({
    onSuccess: async () => {
      await utils.set.listByDay.invalidate();
      setEditingSet(null);
    },
  });

  const deleteSet = trpc.set.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.set.listByDay.invalidate(), utils.trainingPlan.todayWorkout.invalidate()]);
      setEditingSet(null);
    },
  });

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        exerciseId: string;
        exerciseName: string;
        exerciseUserId: string | null;
        tracksReps: boolean;
        tracksTime: boolean;
        tracksWeight: boolean;
        sets: NonNullable<typeof todaySets>;
      }
    >();

    for (const set of todaySets ?? []) {
      const existing = map.get(set.exerciseId);
      if (existing) {
        existing.sets.push(set);
      } else {
        map.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          exerciseUserId: set.exerciseUserId,
          tracksReps: set.tracksReps,
          tracksTime: set.tracksTime,
          tracksWeight: set.tracksWeight,
          sets: [set],
        });
      }
    }

    return Array.from(map.values());
  }, [todaySets]);

  // A freshly picked exercise with no sets logged yet today gets a temporary
  // card at the top so the add-set form always appears inside a card.
  const displayGroups = useMemo(() => {
    if (activeExercise && !groups.some((g) => g.exerciseId === activeExercise.id)) {
      return [
        {
          exerciseId: activeExercise.id,
          exerciseName: activeExercise.name,
          exerciseUserId: activeExercise.userId,
          tracksReps: activeExercise.tracksReps,
          tracksTime: activeExercise.tracksTime,
          tracksWeight: activeExercise.tracksWeight,
          sets: [] as NonNullable<typeof todaySets>,
        },
        ...groups,
      ];
    }
    return groups;
  }, [groups, activeExercise]);

  function handleCreateSet(values: SetFormValues) {
    if (!activeExercise) return;
    createSet.mutate({ exerciseId: activeExercise.id, ...values });
  }

  function handleUpdateSet(values: SetFormValues) {
    if (!editingSet) return;
    updateSet.mutate({ id: editingSet.id, ...values });
  }

  return (
    <main className="flex-1 p-4 pb-24 max-w-md mx-auto w-full flex flex-col gap-4">
      <h1 className="text-xl font-semibold px-1">{t("today.title")}</h1>

      {planWorkout && (
        <PlanWorkoutCard
          workout={planWorkout}
          isReadOnly={isReadOnly}
          queryInput={planWorkoutInput}
          todayRangeKey={dayRangeKey}
        />
      )}

      {/* Redundant once the plan card is showing — its pills already say
          nothing's logged yet, and it's the more useful next step anyway. */}
      {!planWorkout && displayGroups.length === 0 && (
        <p className="text-muted px-1">{isReadOnly ? t("today.noSetsReadOnly") : t("today.noSetsOwn")}</p>
      )}

      {planWorkout && displayGroups.length > 0 && (
        <p className="text-xs uppercase tracking-wide text-muted font-medium px-1">{t("today.loggedToday")}</p>
      )}

      <div className="flex flex-col gap-3">
        {displayGroups.map((group) => {
          const isAdding = activeExercise?.id === group.exerciseId;
          const editingHere = editingSet !== null && group.sets.some((s) => s.id === editingSet.id);

          let expandedContent: React.ReactNode = null;
          if (isAdding) {
            expandedContent = (
              <SetForm
                key={`add-${group.exerciseId}`}
                exercise={group}
                onSubmit={handleCreateSet}
                isSubmitting={createSet.isPending}
                onCancel={() => setActiveExercise(null)}
              />
            );
          } else if (editingHere && editingSet) {
            expandedContent = (
              <SetForm
                key={`edit-${editingSet.id}`}
                exercise={group}
                initialValues={{
                  reps: editingSet.reps ?? undefined,
                  timeSeconds: editingSet.timeSeconds ?? undefined,
                  weightKg: editingSet.weightKg ?? undefined,
                }}
                onSubmit={handleUpdateSet}
                isSubmitting={updateSet.isPending}
                onCancel={() => setEditingSet(null)}
                onDelete={() => deleteSet.mutate({ id: editingSet.id })}
                isDeleting={deleteSet.isPending}
              />
            );
          }

          return (
            <TodayExerciseCard
              key={group.exerciseId}
              exerciseName={translateExerciseName({ name: group.exerciseName, userId: group.exerciseUserId }, locale)}
              sets={group.sets}
              onAddSet={
                isReadOnly
                  ? undefined
                  : () => {
                      setEditingSet(null);
                      setActiveExercise({
                        id: group.exerciseId,
                        name: group.exerciseName,
                        userId: group.exerciseUserId,
                        tracksReps: group.tracksReps,
                        tracksTime: group.tracksTime,
                        tracksWeight: group.tracksWeight,
                      });
                    }
              }
              onEditSet={
                isReadOnly
                  ? undefined
                  : (setId) => {
                      const set = group.sets.find((s) => s.id === setId);
                      if (!set) return;
                      setActiveExercise(null);
                      setEditingSet({
                        id: set.id,
                        exerciseId: group.exerciseId,
                        reps: set.reps,
                        timeSeconds: set.timeSeconds,
                        weightKg: set.weightKg,
                      });
                    }
              }
              expandedContent={expandedContent}
            />
          );
        })}
      </div>

      {!isReadOnly && !activeExercise && !editingSet && (
        <button
          onClick={() => setShowPicker(true)}
          className="fixed bottom-20 right-4 rounded-full bg-accent text-accent-foreground h-14 pl-4 pr-5 flex items-center gap-1.5 shadow-lg font-medium"
        >
          <Plus size={24} />
          {t("today.newSet")}
        </button>
      )}

      {showPicker && (
        <Modal title={t("today.logExercise")} onClose={() => setShowPicker(false)}>
          <ExercisePicker
            onSelect={(exercise) => {
              setEditingSet(null);
              setActiveExercise(exercise);
              setShowPicker(false);
            }}
          />
        </Modal>
      )}
    </main>
  );
}
