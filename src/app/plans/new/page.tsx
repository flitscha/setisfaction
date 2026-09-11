"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PlanForm, type PlanFormValues } from "@/components/plans/plan-form";
import { BackLink } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n/context";

export default function NewTrainingPlanPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useT();

  const createPlan = trpc.trainingPlan.create.useMutation({
    onSuccess: async () => {
      await utils.trainingPlan.list.invalidate();
      router.push("/plans");
    },
  });

  function handleSubmit(values: PlanFormValues) {
    createPlan.mutate({
      name: values.name.trim(),
      schedule: values.schedule.map((workoutId, weekday) => ({ weekday, workoutId })),
    });
  }

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href="/plans" label={t("nav.plans")} />
      <h1 className="text-xl font-semibold px-1">{t("plans.newPlanTitle")}</h1>

      <PlanForm
        onSubmit={handleSubmit}
        isSubmitting={createPlan.isPending}
        submitLabel={t("plans.createPlan")}
        errorMessage={createPlan.error?.message}
      />
    </main>
  );
}
