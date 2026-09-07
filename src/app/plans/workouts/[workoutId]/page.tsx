"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { WorkoutForm, serializeWorkoutValues, targetDraftFromArray, type WorkoutFormValues } from "@/components/plans/workout-form";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";

export default function EditWorkoutPage({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: workout, isLoading } = trpc.workout.getById.useQuery({ id: workoutId });

  const updateWorkout = trpc.workout.update.useMutation({
    onSuccess: async () => {
      await utils.workout.list.invalidate();
      router.push("/plans");
    },
  });

  const deleteWorkout = trpc.workout.delete.useMutation({
    onSuccess: async () => {
      await utils.workout.list.invalidate();
      router.push("/plans");
    },
  });

  if (isLoading) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <BackLink href="/plans" label="Plans" />
        <p className="text-muted px-1 mt-4">Loading…</p>
      </main>
    );
  }

  if (!workout) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <BackLink href="/plans" label="Plans" />
        <p className="text-muted px-1 mt-4">Workout not found.</p>
      </main>
    );
  }

  const initialValues: WorkoutFormValues = {
    name: workout.name,
    exercises: workout.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      tracksReps: e.tracksReps,
      tracksTime: e.tracksTime,
      tracksWeight: e.tracksWeight,
      setsCount: String(e.setsCount),
      reps: targetDraftFromArray(e.targetReps, e.setsCount),
      time: targetDraftFromArray(e.targetTimeSeconds, e.setsCount),
      weight: targetDraftFromArray(e.targetWeightKg, e.setsCount),
      definePause: e.restSeconds !== null,
      restSeconds: e.restSeconds !== null ? String(e.restSeconds) : "60",
    })),
  };

  function handleSubmit(values: WorkoutFormValues) {
    updateWorkout.mutate({ id: workoutId, ...serializeWorkoutValues(values) });
  }

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href="/plans" label="Plans" />
      <h1 className="text-xl font-semibold px-1">Edit workout</h1>

      <WorkoutForm
        key={workoutId}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isSubmitting={updateWorkout.isPending}
        submitLabel="Save"
        errorMessage={updateWorkout.error?.message}
      />

      <div className="border-t border-card-border pt-4">
        {!showDeleteConfirm ? (
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete workout
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">Delete &quot;{workout.name}&quot;?</p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="bg-red-600 text-white hover:brightness-110"
                onClick={() => deleteWorkout.mutate({ id: workoutId })}
                disabled={deleteWorkout.isPending}
              >
                {deleteWorkout.isPending ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
