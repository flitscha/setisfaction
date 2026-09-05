"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { GroupMultiSelect } from "@/components/exercises/group-multi-select";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";

export default function EditExercisePage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: exercise, isLoading } = trpc.exercise.getById.useQuery({ id: exerciseId });

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

  if (exercise.userId === null) {
    return <StandardExercisePage exercise={exercise} />;
  }

  return <CustomExercisePage exercise={exercise} exerciseId={exerciseId} />;
}

// Read-only definition — name, description, and tracked fields are locked so
// training stays comparable across users. Only this user's own grouping of
// it can change.
function StandardExercisePage({
  exercise,
}: {
  exercise: {
    id: string;
    name: string;
    description: string | null;
    tracksReps: boolean;
    tracksTime: boolean;
    tracksWeight: boolean;
    groupIds: string[];
  };
}) {
  const utils = trpc.useUtils();
  const [groupIds, setGroupIds] = useState(exercise.groupIds);

  const updateGroups = trpc.exercise.updateGroups.useMutation({
    onSuccess: async () => {
      await utils.exercise.list.invalidate();
    },
  });

  const trackedLabels = [
    exercise.tracksReps && "Reps",
    exercise.tracksTime && "Time",
    exercise.tracksWeight && "Weight",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href="/exercises" label="Exercises" />

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold px-1">{exercise.name}</h1>
        <p className="text-sm text-muted px-1">Shared exercise — read-only, same for everyone.</p>
      </div>

      {exercise.description && <p className="text-sm text-muted px-1">{exercise.description}</p>}
      <p className="text-sm text-muted px-1 -mt-4">Type: {trackedLabels}</p>

      <GroupMultiSelect selectedGroupIds={groupIds} onChange={setGroupIds} />

      {updateGroups.error && <p className="text-red-600 text-sm">{updateGroups.error.message}</p>}

      <Button
        onClick={() => updateGroups.mutate({ id: exercise.id, groupIds })}
        disabled={updateGroups.isPending}
      >
        {updateGroups.isPending ? "Saving…" : "Save groups"}
      </Button>
    </main>
  );
}

function CustomExercisePage({
  exercise,
  exerciseId,
}: {
  exercise: {
    name: string;
    description: string | null;
    tracksReps: boolean;
    tracksTime: boolean;
    tracksWeight: boolean;
    groupIds: string[];
    setsCount: number;
  };
  exerciseId: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
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

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href="/exercises" label="Exercises" />
      <h1 className="text-xl font-semibold px-1">Edit exercise</h1>

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

      <div className="border-t border-card-border pt-4">
        {!showDeleteConfirm ? (
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete exercise
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              Delete &quot;{exercise.name}&quot; and its {exercise.setsCount} set{exercise.setsCount === 1 ? "" : "s"}?
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
    </main>
  );
}
