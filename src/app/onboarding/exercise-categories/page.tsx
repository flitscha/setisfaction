"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ExerciseCategoryForm } from "@/components/settings/exercise-category-form";
import { PullUpIcon } from "@/components/icons/pull-up-icon";
import { useT } from "@/lib/i18n/context";

// The one-time landing point right after signup (see auth/callback's
// flow=signup branch) — completeRegistration already created the profile
// row with the schema's defaults (calisthenics only), this is just where the
// user gets to actually choose instead of silently keeping that default.
// Not enforced by the proxy the way /verify-email is: skipping it (e.g. by
// navigating straight to /today) just leaves the default in place, which is
// a harmless, reversible outcome — the same choice is always available
// again later in Settings.
export default function OnboardingExerciseCategoriesPage() {
  const router = useRouter();
  const t = useT();
  const { data: categories, isLoading } = trpc.settings.exerciseCategories.useQuery();

  const updateCategories = trpc.settings.updateExerciseCategories.useMutation({
    onSuccess: () => {
      router.push("/today");
      router.refresh();
    },
  });

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-xs flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2 text-center">
          <div className="rounded-full bg-accent text-accent-foreground w-12 h-12 flex items-center justify-center">
            <PullUpIcon size={24} />
          </div>
          <h1 className="text-xl font-semibold">{t("onboarding.title")}</h1>
          <p className="text-sm text-muted">{t("onboarding.hint")}</p>
        </div>

        {isLoading && <p className="text-sm text-muted text-center">{t("common.loading")}</p>}

        {categories && (
          <ExerciseCategoryForm
            initialWantsCalisthenics={categories.wantsCalisthenics}
            initialWantsGym={categories.wantsGym}
            onSubmit={(values) => updateCategories.mutate(values)}
            isSubmitting={updateCategories.isPending}
            submitLabel={t("category.continue")}
          />
        )}
      </div>
    </main>
  );
}
