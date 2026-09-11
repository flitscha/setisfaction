"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { BackLink } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n/context";

export default function NewExercisePage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useT();

  const createExercise = trpc.exercise.create.useMutation({
    onSuccess: async () => {
      await utils.exercise.list.invalidate();
      router.push("/exercises");
    },
  });

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <BackLink href="/exercises" label={t("exercises.title")} />
      <h1 className="text-xl font-semibold px-1">{t("exercises.newTitle")}</h1>
      <ExerciseForm
        onSubmit={(values) => createExercise.mutate({ ...values, description: values.description || undefined })}
        isSubmitting={createExercise.isPending}
        submitLabel={t("exercises.create")}
        errorMessage={createExercise.error?.message}
      />
    </main>
  );
}
