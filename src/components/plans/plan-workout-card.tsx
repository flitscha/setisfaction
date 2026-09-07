"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/routers/_app";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SetForm, type SetFormValues } from "@/components/sets/set-form";
import { RestTimer } from "./rest-timer";

type TodayWorkout = NonNullable<inferRouterOutputs<AppRouter>["trainingPlan"]["todayWorkout"]>;
type PlanExercise = TodayWorkout["exercises"][number];

function targetsFor(exercise: PlanExercise): SetFormValues {
  return {
    reps: exercise.targetReps ?? undefined,
    timeSeconds: exercise.targetTimeSeconds ?? undefined,
    weightKg: exercise.targetWeightKg ?? undefined,
  };
}

// True when at least one tracked field has no plan-defined target — the user
// has to enter something before this set can be logged.
function needsInput(exercise: PlanExercise) {
  return (
    (exercise.tracksReps && exercise.targetReps == null) ||
    (exercise.tracksTime && exercise.targetTimeSeconds == null) ||
    (exercise.tracksWeight && exercise.targetWeightKg == null)
  );
}

export function PlanWorkoutCard({ workout, isReadOnly }: { workout: TodayWorkout; isReadOnly: boolean }) {
  const utils = trpc.useUtils();
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [rest, setRest] = useState<{ exerciseName: string; seconds: number } | null>(null);

  const createSet = trpc.set.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.trainingPlan.todayWorkout.invalidate(),
        utils.set.listByDay.invalidate(),
        utils.stats.aggregates.invalidate(),
      ]);
    },
  });

  function logSet(exercise: PlanExercise, values: SetFormValues) {
    createSet.mutate(
      { exerciseId: exercise.exerciseId, ...values },
      {
        onSuccess: () => {
          setExpandedExerciseId(null);
          if (exercise.restSeconds != null) {
            setRest({ exerciseName: exercise.exerciseName, seconds: exercise.restSeconds });
          }
        },
      },
    );
  }

  function handleLogNext(exercise: PlanExercise) {
    if (needsInput(exercise)) {
      setExpandedExerciseId(exercise.id);
    } else {
      logSet(exercise, targetsFor(exercise));
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-4">
        <div>
          <p className="font-medium">{workout.isCatchUp ? `Catch up: ${workout.workoutName}` : workout.workoutName}</p>
          {workout.isCatchUp && <p className="text-sm text-muted">Missed yesterday</p>}
        </div>

        <div className="flex flex-col gap-3">
          {workout.exercises.map((exercise) => {
            const done = exercise.loggedCount >= exercise.setsCount;
            const isExpanded = expandedExerciseId === exercise.id;

            return (
              <div key={exercise.id} className="border-t border-card-border pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={done ? "text-muted line-through" : ""}>{exercise.exerciseName}</span>
                  <span className="text-sm text-muted whitespace-nowrap">
                    {exercise.loggedCount}/{exercise.setsCount} sets
                  </span>
                </div>

                {!done && !isReadOnly && !isExpanded && (
                  <Button variant="secondary" onClick={() => handleLogNext(exercise)} disabled={createSet.isPending}>
                    Log set
                  </Button>
                )}

                {isExpanded && (
                  <SetForm
                    exercise={exercise}
                    fixedValues={targetsFor(exercise)}
                    onSubmit={(values) => logSet(exercise, values)}
                    isSubmitting={createSet.isPending}
                    onCancel={() => setExpandedExerciseId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {rest && <RestTimer seconds={rest.seconds} exerciseName={rest.exerciseName} onDone={() => setRest(null)} />}
    </>
  );
}
