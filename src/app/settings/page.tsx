"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useViewAsUser } from "@/components/admin/view-as-context";
import { ExerciseCategoryForm } from "@/components/settings/exercise-category-form";

// Reachable from the top bar's gear icon on any page, not just one fixed
// parent — router.back() (rather than a fixed BackLink href) is what
// actually gets you back to wherever you came from.
export default function SettingsPage() {
  const router = useRouter();
  const isReadOnly = useViewAsUser() !== null;
  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.settings.exerciseCategories.useQuery();

  const updateCategories = trpc.settings.updateExerciseCategories.useMutation({
    onSuccess: async () => {
      await utils.settings.exerciseCategories.invalidate();
      // Brief pause so "Saved." is actually visible before leaving, rather
      // than an instant nav that makes the save feel like it didn't happen.
      setTimeout(() => router.back(), 600);
    },
  });

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 py-2 -my-2 text-sm text-muted hover:text-foreground w-fit"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <h1 className="text-xl font-semibold px-1">Settings</h1>

      <section className="flex flex-col gap-3">
        <div className="px-1">
          <p className="text-sm font-medium">Exercise catalog</p>
          <p className="text-sm text-muted">Which standard exercises show up when you search or browse.</p>
        </div>

        {isLoading && <p className="text-sm text-muted px-1">Loading…</p>}

        {categories && !isReadOnly && (
          <>
            <ExerciseCategoryForm
              key={`${categories.wantsCalisthenics}-${categories.wantsGym}`}
              initialWantsCalisthenics={categories.wantsCalisthenics}
              initialWantsGym={categories.wantsGym}
              onSubmit={(values) => updateCategories.mutate(values)}
              isSubmitting={updateCategories.isPending}
              submitLabel="Save"
            />
            {updateCategories.isSuccess && <p className="text-sm text-accent px-1">Saved.</p>}
          </>
        )}

        {categories && isReadOnly && (
          <p className="text-sm px-1">
            {categories.wantsCalisthenics && categories.wantsGym
              ? "Calisthenics and Gym"
              : categories.wantsGym
                ? "Gym"
                : "Calisthenics"}
          </p>
        )}
      </section>
    </main>
  );
}
