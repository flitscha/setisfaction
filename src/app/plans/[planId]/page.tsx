"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PlanForm, type PlanFormValues } from "@/components/plans/plan-form";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n/context";

export default function EditTrainingPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useT();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: plan, isLoading } = trpc.trainingPlan.getById.useQuery({ id: planId });

  function invalidateAll() {
    utils.trainingPlan.list.invalidate();
    utils.trainingPlan.getById.invalidate({ id: planId });
  }

  const updatePlan = trpc.trainingPlan.update.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      router.push("/plans");
    },
  });

  const deletePlan = trpc.trainingPlan.delete.useMutation({
    onSuccess: async () => {
      await utils.trainingPlan.list.invalidate();
      router.push("/plans");
    },
  });

  const setActive = trpc.trainingPlan.setActive.useMutation({ onSuccess: invalidateAll });
  const deactivate = trpc.trainingPlan.deactivate.useMutation({ onSuccess: invalidateAll });

  if (isLoading) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <BackLink href="/plans" label={t("nav.plans")} />
        <p className="text-muted px-1 mt-4">{t("common.loading")}</p>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <BackLink href="/plans" label={t("nav.plans")} />
        <p className="text-muted px-1 mt-4">{t("plans.notFound")}</p>
      </main>
    );
  }

  const scheduleByWeekday = new Map(plan.schedule.map((d) => [d.weekday, d.workoutId]));
  const initialValues: PlanFormValues = {
    name: plan.name,
    schedule: Array.from({ length: 7 }, (_, weekday) => scheduleByWeekday.get(weekday) ?? null),
  };

  function handleSubmit(values: PlanFormValues) {
    updatePlan.mutate({
      id: planId,
      name: values.name.trim(),
      schedule: values.schedule.map((workoutId, weekday) => ({ weekday, workoutId })),
    });
  }

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <BackLink href="/plans" label={t("nav.plans")} />
      <h1 className="text-xl font-semibold px-1">{t("plans.editPlanTitle")}</h1>

      {plan.isActive ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-card-border px-3 py-2">
          <span className="text-sm font-medium">{t("plans.activePlan")}</span>
          <Button variant="ghost" onClick={() => deactivate.mutate()} disabled={deactivate.isPending}>
            {t("plans.deactivate")}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setActive.mutate({ id: planId })} disabled={setActive.isPending}>
          {setActive.isPending ? t("plans.activating") : t("plans.setAsActive")}
        </Button>
      )}

      <PlanForm
        key={planId}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isSubmitting={updatePlan.isPending}
        submitLabel={t("common.save")}
        errorMessage={updatePlan.error?.message}
      />

      <div className="border-t border-card-border pt-4">
        {!showDeleteConfirm ? (
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            {t("plans.deletePlan")}
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">{t("plans.deletePlanConfirm", { name: plan.name })}</p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="bg-red-600 text-white hover:brightness-110"
                onClick={() => deletePlan.mutate({ id: planId })}
                disabled={deletePlan.isPending}
              >
                {deletePlan.isPending ? t("common.deleting") : t("exercises.confirmDelete")}
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
