"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ExerciseForm } from "@/components/exercises/exercise-form";

export default function EditExercisePage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: exercise, isLoading } = trpc.exercise.getById.useQuery({ id: exerciseId });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  if (isLoading) {
    return (
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <p>Loading…</p>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <p>Exercise not found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Edit exercise</h1>

      <ExerciseForm
        initialValues={{
          name: exercise.name,
          category: exercise.category ?? "",
          tracksReps: exercise.tracksReps,
          tracksTime: exercise.tracksTime,
          tracksWeight: exercise.tracksWeight,
        }}
        onSubmit={(values) =>
          updateExercise.mutate({ id: exerciseId, ...values, category: values.category || undefined })
        }
        isSubmitting={updateExercise.isPending}
        submitLabel="Save"
        errorMessage={updateExercise.error?.message}
      />

      <div className="border-t pt-4">
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="text-sm text-red-600 underline">
            Delete exercise
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              Delete &quot;{exercise.name}&quot;? This also deletes {exercise.setsCount} logged set
              {exercise.setsCount === 1 ? "" : "s"}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteExercise.mutate({ id: exerciseId })}
                disabled={deleteExercise.isPending}
                className="bg-red-600 text-white rounded px-3 py-2 text-sm disabled:opacity-50"
              >
                {deleteExercise.isPending ? "Deleting…" : "Confirm delete"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-sm underline">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
