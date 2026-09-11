"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath, useViewAsUser } from "@/components/admin/view-as-context";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

export default function PlansPage() {
  const t = useT();
  const isReadOnly = useViewAsUser() !== null;
  const appPath = useAppPath();
  const utils = trpc.useUtils();
  const { data: workouts, isLoading: workoutsLoading } = trpc.workout.list.useQuery();
  const { data: plans, isLoading: plansLoading } = trpc.trainingPlan.list.useQuery();

  const setActive = trpc.trainingPlan.setActive.useMutation({
    onSuccess: () => utils.trainingPlan.list.invalidate(),
  });

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <h1 className="text-xl font-semibold px-1">{t("plans.title")}</h1>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium">{t("plans.workouts")}</p>
          {!isReadOnly && (
            <Link
              href="/plans/workouts/new"
              className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-medium"
            >
              <Plus size={16} />
              {t("common.new")}
            </Link>
          )}
        </div>
        {workoutsLoading && <p className="text-sm text-muted px-1">{t("common.loading")}</p>}
        {workouts?.length === 0 && <p className="text-sm text-muted px-1">{t("plans.noWorkoutsYet")}</p>}
        <div className="flex flex-col gap-2">
          {workouts?.map((workout) => (
            <Link
              key={workout.id}
              href={appPath(`/plans/workouts/${workout.id}`)}
              className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:brightness-95 dark:hover:brightness-125"
            >
              <span className="truncate">{workout.name}</span>
              {!isReadOnly && <Pencil size={16} className="text-muted shrink-0" />}
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium">{t("plans.trainingPlans")}</p>
          {!isReadOnly && (
            <Link
              href="/plans/new"
              className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-medium"
            >
              <Plus size={16} />
              {t("common.new")}
            </Link>
          )}
        </div>
        {plansLoading && <p className="text-sm text-muted px-1">{t("common.loading")}</p>}
        {plans?.length === 0 && <p className="text-sm text-muted px-1">{t("plans.noPlansYet")}</p>}
        {plans && plans.length > 0 && <p className="text-sm text-muted px-1">{t("plans.onlyActiveShows")}</p>}
        <div className="flex flex-col gap-2">
          {plans?.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
            >
              <Link href={appPath(`/plans/${plan.id}`)} className="flex-1 min-w-0 flex items-center gap-2 hover:underline">
                <span className="truncate">{plan.name}</span>
                {!isReadOnly && <Pencil size={14} className="text-muted shrink-0" />}
              </Link>
              {plan.isActive ? (
                <span className="text-sm text-accent font-medium whitespace-nowrap">{t("plans.active")}</span>
              ) : (
                !isReadOnly && (
                  <Button
                    variant="secondary"
                    onClick={() => setActive.mutate({ id: plan.id })}
                    disabled={setActive.isPending}
                  >
                    {t("plans.activate")}
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
