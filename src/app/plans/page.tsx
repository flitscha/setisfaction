"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath, useViewAsUser } from "@/components/admin/view-as-context";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";

export default function PlansPage() {
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
      <BackLink href={appPath("/exercises")} label="Exercises" />
      <h1 className="text-xl font-semibold px-1">Training plans</h1>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium">Workouts</p>
          {!isReadOnly && (
            <Link
              href="/plans/workouts/new"
              className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-medium"
            >
              <Plus size={16} />
              New
            </Link>
          )}
        </div>
        {workoutsLoading && <p className="text-sm text-muted px-1">Loading…</p>}
        {workouts?.length === 0 && (
          <p className="text-sm text-muted px-1">No workouts yet — a workout is a reusable exercise list, e.g. &quot;Pull Day&quot;.</p>
        )}
        <div className="flex flex-col gap-2">
          {workouts?.map((workout) => (
            <Link
              key={workout.id}
              href={appPath(`/plans/workouts/${workout.id}`)}
              className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 hover:brightness-95 dark:hover:brightness-125"
            >
              {workout.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium">Training plans</p>
          {!isReadOnly && (
            <Link
              href="/plans/new"
              className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-medium"
            >
              <Plus size={16} />
              New
            </Link>
          )}
        </div>
        {plansLoading && <p className="text-sm text-muted px-1">Loading…</p>}
        {plans?.length === 0 && (
          <p className="text-sm text-muted px-1">No plans yet — a plan assigns a workout to each day of the week.</p>
        )}
        <div className="flex flex-col gap-2">
          {plans?.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
            >
              <Link href={appPath(`/plans/${plan.id}`)} className="flex-1 min-w-0 hover:underline">
                <span className="truncate block">{plan.name}</span>
              </Link>
              {plan.isActive ? (
                <span className="text-sm text-accent font-medium whitespace-nowrap">✓ Active</span>
              ) : (
                !isReadOnly && (
                  <Button
                    variant="secondary"
                    onClick={() => setActive.mutate({ id: plan.id })}
                    disabled={setActive.isPending}
                  >
                    Activate
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
