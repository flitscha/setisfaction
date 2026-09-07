"use client";

import { useRef, useState } from "react";
import { Check, CalendarClock } from "lucide-react";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/routers/_app";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SetForm, type SetFormValues } from "@/components/sets/set-form";
import { RestTimer } from "./rest-timer";

type TodayWorkout = NonNullable<inferRouterOutputs<AppRouter>["trainingPlan"]["todayWorkout"]>;
type PlanExercise = TodayWorkout["exercises"][number];
type TodayWorkoutInput = inferRouterInputs<AppRouter>["trainingPlan"]["todayWorkout"];

function targetAt(values: (number | null)[] | null | undefined, slotIndex: number): number | null {
  return values?.[slotIndex] ?? null;
}

function targetsForSlot(exercise: PlanExercise, slotIndex: number): SetFormValues {
  return {
    reps: targetAt(exercise.targetReps, slotIndex) ?? undefined,
    timeSeconds: targetAt(exercise.targetTimeSeconds, slotIndex) ?? undefined,
    weightKg: targetAt(exercise.targetWeightKg, slotIndex) ?? undefined,
  };
}

// True when at least one tracked field has no plan-defined target for this
// specific set — the user has to enter something before it can be logged.
function needsInputForSlot(exercise: PlanExercise, slotIndex: number) {
  return (
    (exercise.tracksReps && targetAt(exercise.targetReps, slotIndex) === null) ||
    (exercise.tracksTime && targetAt(exercise.targetTimeSeconds, slotIndex) === null) ||
    (exercise.tracksWeight && targetAt(exercise.targetWeightKg, slotIndex) === null)
  );
}

// Short label for one set's slot pill, e.g. "10", "10 · 20kg", or plainly
// "Set 2" when nothing at all is fixed for it (the common to-failure case —
// a run of bare question marks read as broken/uncertain rather than "log it
// yourself"). A field with no target only gets its own "–" when some *other*
// tracked field for the same set does have one, so a real value is never
// lost in a sea of placeholders.
function slotLabel(exercise: PlanExercise, slotIndex: number): string {
  const parts: string[] = [];
  let anyDefined = false;

  if (exercise.tracksReps) {
    const v = targetAt(exercise.targetReps, slotIndex);
    if (v !== null) anyDefined = true;
    parts.push(v !== null ? String(v) : "–");
  }
  if (exercise.tracksTime) {
    const v = targetAt(exercise.targetTimeSeconds, slotIndex);
    if (v !== null) anyDefined = true;
    parts.push(v !== null ? `${v}s` : "–");
  }
  if (exercise.tracksWeight) {
    const v = targetAt(exercise.targetWeightKg, slotIndex);
    if (v !== null) anyDefined = true;
    parts.push(v !== null ? `${v}kg` : "–");
  }

  return anyDefined ? parts.join(" · ") : `Set ${slotIndex + 1}`;
}

function SlotPill({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      className={
        done
          ? "inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-3 py-1 text-sm font-medium"
          : "inline-flex items-center gap-1 rounded-full border border-card-border px-3 py-1 text-sm text-muted"
      }
    >
      {done && <Check size={12} />}
      {label}
    </span>
  );
}

export function PlanWorkoutCard({
  workout,
  isReadOnly,
  queryInput,
  todayRangeKey,
}: {
  workout: TodayWorkout;
  isReadOnly: boolean;
  // The exact variables object passed to the todayWorkout query, so this
  // component can patch that same cache entry optimistically.
  queryInput: TodayWorkoutInput;
  todayRangeKey: { dayStart: Date; dayEnd: Date };
}) {
  const utils = trpc.useUtils();
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(null);
  const [rest, setRest] = useState<{ exerciseName: string; seconds: number; setNumber: number; setsCount: number } | null>(
    null,
  );
  // A ref (not state) so a double-tap within the same synchronous event —
  // before React has re-rendered the disabled button — is still blocked.
  // Someone unsure whether their first tap registered is exactly who'd tap
  // twice fast enough to slip past a state-only check.
  const loggingRef = useRef<Set<string>>(new Set());

  const createSet = trpc.set.create.useMutation({
    // Optimistic on both caches this affects: the plan checklist's own
    // progress count, and the normal per-exercise card below (which shows
    // the actual logged value as a chip) — so checking off a set feels
    // instant on both surfaces instead of waiting on the round trip.
    onMutate: async (input) => {
      await Promise.all([utils.trainingPlan.todayWorkout.cancel(queryInput), utils.set.listByDay.cancel(todayRangeKey)]);
      const previousWorkout = utils.trainingPlan.todayWorkout.getData(queryInput);
      const previousSets = utils.set.listByDay.getData(todayRangeKey);
      const exercise = workout.exercises.find((e) => e.exerciseId === input.exerciseId);

      utils.trainingPlan.todayWorkout.setData(queryInput, (old) => {
        if (!old) return old;
        const exercises = old.exercises.map((e) =>
          e.exerciseId === input.exerciseId ? { ...e, loggedCount: Math.min(e.setsCount, e.loggedCount + 1) } : e,
        );
        return { ...old, exercises, isComplete: exercises.every((e) => e.loggedCount >= e.setsCount) };
      });

      if (exercise) {
        utils.set.listByDay.setData(todayRangeKey, (old) => [
          ...(old ?? []),
          {
            id: `optimistic-${crypto.randomUUID()}`,
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            tracksReps: exercise.tracksReps,
            tracksTime: exercise.tracksTime,
            tracksWeight: exercise.tracksWeight,
            performedAt: new Date(),
            reps: input.reps ?? null,
            timeSeconds: input.timeSeconds ?? null,
            weightKg: input.weightKg ?? null,
            isPr: false,
          },
        ]);
      }

      return { previousWorkout, previousSets };
    },
    onError: (_error, _input, context) => {
      if (context?.previousWorkout !== undefined) utils.trainingPlan.todayWorkout.setData(queryInput, context.previousWorkout);
      if (context?.previousSets) utils.set.listByDay.setData(todayRangeKey, context.previousSets);
    },
    onSuccess: () => {
      utils.stats.aggregates.invalidate();
    },
    onSettled: () => {
      utils.trainingPlan.todayWorkout.invalidate();
      utils.set.listByDay.invalidate();
    },
  });

  function logSet(exercise: PlanExercise, slotIndex: number, values: SetFormValues) {
    if (loggingRef.current.has(exercise.id)) return;
    loggingRef.current.add(exercise.id);
    setPendingExerciseId(exercise.id);

    createSet.mutate(
      { exerciseId: exercise.exerciseId, ...values },
      {
        onSuccess: () => {
          setExpandedExerciseId(null);
          if (exercise.restSeconds != null) {
            setRest({
              exerciseName: exercise.exerciseName,
              seconds: exercise.restSeconds,
              setNumber: slotIndex + 1,
              setsCount: exercise.setsCount,
            });
          }
        },
        onSettled: () => {
          loggingRef.current.delete(exercise.id);
          setPendingExerciseId(null);
        },
      },
    );
  }

  function handleLogNext(exercise: PlanExercise) {
    const slotIndex = exercise.loggedCount;
    if (slotIndex >= exercise.setsCount) return;

    if (needsInputForSlot(exercise, slotIndex)) {
      setExpandedExerciseId(exercise.id);
      return;
    }
    logSet(exercise, slotIndex, targetsForSlot(exercise, slotIndex));
  }

  return (
    <>
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-accent shrink-0" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted font-medium">
              {workout.isCatchUp ? "Missed yesterday — catch up" : "Today's plan"}
            </p>
            <p className="font-semibold truncate">{workout.workoutName}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {workout.exercises.map((exercise) => {
            const done = exercise.loggedCount >= exercise.setsCount;
            const isExpanded = expandedExerciseId === exercise.id;
            const isPending = pendingExerciseId === exercise.id;
            const nextSlot = exercise.loggedCount;

            return (
              <div key={exercise.id} className="border-t border-card-border pt-3 flex flex-col gap-2">
                <p className="font-medium">{exercise.exerciseName}</p>

                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: exercise.setsCount }, (_, i) => (
                    <SlotPill key={i} label={slotLabel(exercise, i)} done={i < exercise.loggedCount} />
                  ))}
                </div>

                {done ? (
                  <p className="text-sm text-accent flex items-center gap-1">
                    <Check size={14} /> All sets done
                  </p>
                ) : (
                  !isReadOnly &&
                  !isExpanded && (
                    <Button variant="secondary" onClick={() => handleLogNext(exercise)} disabled={isPending}>
                      {isPending ? "Logging…" : `Log set ${nextSlot + 1} of ${exercise.setsCount}`}
                    </Button>
                  )
                )}

                {isExpanded && (
                  <SetForm
                    exercise={exercise}
                    fixedValues={targetsForSlot(exercise, nextSlot)}
                    onSubmit={(values) => logSet(exercise, nextSlot, values)}
                    isSubmitting={isPending}
                    onCancel={() => setExpandedExerciseId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {rest && (
        <RestTimer
          exerciseName={rest.exerciseName}
          seconds={rest.seconds}
          setNumber={rest.setNumber}
          setsCount={rest.setsCount}
          onDone={() => setRest(null)}
        />
      )}
    </>
  );
}
