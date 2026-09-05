"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";

export default function EditExercisePage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: exercise, isLoading } = trpc.exercise.getById.useQuery({ id: exerciseId });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const updateExercise = trpc.exercise.update.useMutation({
    onSuccess: async () => {
      await utils.exercise.list.invalidate();
      router.push("/exercises");
    },
  });

  const deleteExercise = trpc.exercise.delete.useMutation({
    onSuccess: async () => {
      await utils.exercise.list.invalidate();
      router.push("/exercises");
    },
  });

  const resetToDefault = trpc.exercise.resetToDefault.useMutation({
    onSuccess: async () => {
      await utils.exercise.list.invalidate();
      await utils.exercise.listHiddenStandard.invalidate();
      router.push("/exercises");
    },
  });

  if (isLoading) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <BackLink href="/exercises" label="Exercises" />
        <p className="text-muted px-1 mt-4">Loading…</p>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <BackLink href="/exercises" label="Exercises" />
        <p className="text-muted px-1 mt-4">Exercise not found.</p>
      </main>
    );
  }

  const isShared = exercise.userId === null;
  const canResetToDefault = exercise.forkedFrom?.name.toLowerCase() === exercise.name.toLowerCase();

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href="/exercises" label="Exercises" />
      <h1 className="text-xl font-semibold px-1">Edit exercise</h1>

      {isShared && (
        <p className="text-sm text-muted px-1 -mt-4">
          This is a shared exercise. Saving changes creates your own personal copy — everyone else keeps seeing
          the original.
        </p>
      )}

      {exercise.forkedFrom && !canResetToDefault && (
        <p className="text-sm text-muted px-1 -mt-4">
          This started as the shared &quot;{exercise.forkedFrom.name}&quot;. Renaming it keeps both visible —
          rename it back to restore the option to reset to default below.
        </p>
      )}

      <ExerciseForm
        initialValues={{
          name: exercise.name,
          description: exercise.description ?? "",
          tracksReps: exercise.tracksReps,
          tracksTime: exercise.tracksTime,
          tracksWeight: exercise.tracksWeight,
          groupIds: exercise.groupIds,
        }}
        onSubmit={(values) =>
          updateExercise.mutate({ id: exerciseId, ...values, description: values.description || undefined })
        }
        isSubmitting={updateExercise.isPending}
        submitLabel="Save"
        errorMessage={updateExercise.error?.message}
      />

      {canResetToDefault && (
        <div className="border-t border-card-border pt-4">
          {!showResetConfirm ? (
            <Button variant="secondary" onClick={() => setShowResetConfirm(true)}>
              Reset to default
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                Reset &quot;{exercise.name}&quot; to the shared default? Your logged sets are kept — everyone
                (including you) goes back to seeing the standard version.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => resetToDefault.mutate({ id: exerciseId })}
                  disabled={resetToDefault.isPending}
                >
                  {resetToDefault.isPending ? "Resetting…" : "Reset to default"}
                </Button>
                <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
              </div>
              {resetToDefault.error && <p className="text-red-600 text-sm">{resetToDefault.error.message}</p>}
            </div>
          )}
        </div>
      )}

      {!isShared && (
        <div className="border-t border-card-border pt-4">
          {!showDeleteConfirm ? (
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete exercise
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                Delete &quot;{exercise.name}&quot;? This also deletes {exercise.setsCount} logged set
                {exercise.setsCount === 1 ? "" : "s"}.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="bg-red-600 text-white hover:brightness-110"
                  onClick={() => deleteExercise.mutate({ id: exerciseId })}
                  disabled={deleteExercise.isPending}
                >
                  {deleteExercise.isPending ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
