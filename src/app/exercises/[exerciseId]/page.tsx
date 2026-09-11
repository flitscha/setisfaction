"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { GroupMultiSelect } from "@/components/exercises/group-multi-select";
import { TrackedFieldsFieldset, type TrackedFields } from "@/components/exercises/tracked-fields-fieldset";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n/context";

export default function EditExercisePage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useT();

  const { data: exercise, isLoading } = trpc.exercise.getById.useQuery({ id: exerciseId });

  if (isLoading) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <BackLink href="/exercises" label={t("exercises.title")} />
        <p className="text-muted px-1 mt-4">{t("common.loading")}</p>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <BackLink href="/exercises" label={t("exercises.title")} />
        <p className="text-muted px-1 mt-4">{t("exercises.notFound")}</p>
      </main>
    );
  }

  if (exercise.userId === null) {
    return <StandardExercisePage exercise={exercise} />;
  }

  return <CustomExercisePage exercise={exercise} exerciseId={exerciseId} />;
}

// Name and description are locked so training stays comparable across users.
// This user's own grouping can always change; changing tracked fields forks
// a personal copy instead of changing the shared definition (see
// exercise.updateStandard).
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
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useT();
  const [groupIds, setGroupIds] = useState(exercise.groupIds);
  const [trackedFields, setTrackedFields] = useState<TrackedFields>({
    tracksReps: exercise.tracksReps,
    tracksTime: exercise.tracksTime,
    tracksWeight: exercise.tracksWeight,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const updateStandard = trpc.exercise.updateStandard.useMutation({
    onSuccess: async () => {
      await utils.exercise.list.invalidate();
      router.push("/exercises");
    },
  });

  function handleSave() {
    if (!trackedFields.tracksReps && !trackedFields.tracksTime && !trackedFields.tracksWeight) {
      setValidationError(t("exercises.trackAtLeastOne"));
      return;
    }
    setValidationError(null);
    updateStandard.mutate({ id: exercise.id, groupIds, ...trackedFields });
  }

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href="/exercises" label={t("exercises.title")} />

      <h1 className="text-xl font-semibold px-1">{exercise.name}</h1>

      {exercise.description && <p className="text-sm text-muted px-1">{exercise.description}</p>}

      <TrackedFieldsFieldset value={trackedFields} onChange={setTrackedFields} />

      <GroupMultiSelect selectedGroupIds={groupIds} onChange={setGroupIds} />

      {(validationError || updateStandard.error) && (
        <p className="text-red-600 text-sm">{validationError ?? updateStandard.error?.message}</p>
      )}

      <Button onClick={handleSave} disabled={updateStandard.isPending}>
        {updateStandard.isPending ? t("common.saving") : t("common.save")}
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
    forkedFromId: string | null;
  };
  exerciseId: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useT();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const restoreStandard = trpc.exercise.restoreStandard.useMutation({
    onSuccess: async () => {
      await utils.exercise.list.invalidate();
      router.push("/exercises");
    },
  });

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
      <BackLink href="/exercises" label={t("exercises.title")} />
      <h1 className="text-xl font-semibold px-1">{t("exercises.editTitle")}</h1>

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
        submitLabel={t("common.save")}
        errorMessage={updateExercise.error?.message}
      />

      {exercise.forkedFromId && (
        <div className="border-t border-card-border pt-4">
          {!showRestoreConfirm ? (
            <Button variant="secondary" onClick={() => setShowRestoreConfirm(true)}>
              {t("exercises.switchBackToStandard")}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm">{t("exercises.switchBackConfirm")}</p>
              {restoreStandard.error && <p className="text-red-600 text-sm">{restoreStandard.error.message}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={() => restoreStandard.mutate({ id: exerciseId })}
                  disabled={restoreStandard.isPending}
                >
                  {restoreStandard.isPending ? t("exercises.switching") : t("common.confirm")}
                </Button>
                <Button variant="ghost" onClick={() => setShowRestoreConfirm(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-card-border pt-4">
        {!showDeleteConfirm ? (
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            {t("exercises.deleteExercise")}
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              {t("exercises.deleteConfirm", {
                name: exercise.name,
                count: exercise.setsCount,
                setWord: t(exercise.setsCount === 1 ? "exercises.setSingular" : "exercises.setPlural"),
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="bg-red-600 text-white hover:brightness-110"
                onClick={() => deleteExercise.mutate({ id: exerciseId })}
                disabled={deleteExercise.isPending}
              >
                {deleteExercise.isPending ? t("common.deleting") : t("exercises.confirmDelete")}
              </Button>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
