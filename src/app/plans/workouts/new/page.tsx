"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { WorkoutForm, serializeWorkoutValues, type WorkoutFormValues } from "@/components/plans/workout-form";
import { BackLink } from "@/components/ui/back-link";

export default function NewWorkoutPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const createWorkout = trpc.workout.create.useMutation({
    onSuccess: async () => {
      await utils.workout.list.invalidate();
      router.push("/plans");
    },
  });

  function handleSubmit(values: WorkoutFormValues) {
    createWorkout.mutate(serializeWorkoutValues(values));
  }

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href="/plans" label="Plans" />
      <h1 className="text-xl font-semibold px-1">New workout</h1>

      <WorkoutForm
        onSubmit={handleSubmit}
        isSubmitting={createWorkout.isPending}
        submitLabel="Create workout"
        errorMessage={createWorkout.error?.message}
      />
    </main>
  );
}
