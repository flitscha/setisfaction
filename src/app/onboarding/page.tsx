"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { describeError } from "@/lib/supabase/errors";
import { AuthShell, FormError } from "@/components/auth/auth-shell";
import { ExerciseCategoryForm } from "@/components/settings/exercise-category-form";
import { LanguageForm } from "@/components/settings/language-form";
import { InstallAppHint, isRunningInstalled } from "@/components/install/install-app-hint";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

type Step = "language" | "training" | "install";

const subscribeNever = () => () => {};

// The one-time landing point right after a new account's profile is created
// (see auth.ensureRegistration — reached from /auth/callback's signup flow,
// or from the first login if that got interrupted). Placed after email
// confirmation rather than before it: the training choice is saved on the
// profile, which only exists once the account is confirmed, and the
// confirmation link may well open in a different browser than the one the
// signup form was filled in. Not enforced by the proxy the way
// /verify-email is — skipping it just keeps the defaults (browser language,
// calisthenics only), both changeable any time in Settings.
export default function OnboardingPage() {
  const router = useRouter();
  const t = useT();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: categories, isLoading, error: loadError } = trpc.settings.exerciseCategories.useQuery();
  const [step, setStep] = useState<Step>("language");
  // The install step is pointless when already running as the installed app.
  const isInstalled = useSyncExternalStore(subscribeNever, isRunningInstalled, () => false);
  const steps: Step[] = isInstalled ? ["language", "training"] : ["language", "training", "install"];

  function finish() {
    router.push("/today");
    router.refresh();
  }

  const updateCategories = trpc.settings.updateExerciseCategories.useMutation({
    onSuccess: () => (steps.includes("install") ? setStep("install") : finish()),
  });

  const stepIndex = steps.indexOf(step);

  const titles: Record<Step, string> = {
    language: me ? t("onboarding.welcomeWithName", { username: me.username }) : t("onboarding.welcome"),
    training: t("onboarding.title"),
    install: t("onboarding.installTitle"),
  };
  const subtitles: Record<Step, string> = {
    language: t("onboarding.languageHint"),
    training: t("onboarding.hint"),
    install: t("onboarding.installHint"),
  };

  return (
    <AuthShell title={titles[step]} subtitle={subtitles[step]} showLanguageToggle={false}>
      <div className="flex items-center justify-between -mt-2 mb-1">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={() => setStep(steps[stepIndex - 1])}
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft size={16} />
            {t("common.back")}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5" aria-label={t("onboarding.stepOf", { step: stepIndex + 1, total: steps.length })}>
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 w-6 rounded-full ${i <= stepIndex ? "bg-accent" : "bg-card-border"}`} />
          ))}
        </div>
      </div>

      {step === "language" && (
        <>
          <LanguageForm />
          <Button onClick={() => setStep("training")}>{t("category.continue")}</Button>
        </>
      )}

      {step === "training" && (
        <>
          {isLoading && <p className="text-sm text-muted text-center">{t("common.loading")}</p>}
          {loadError && <FormError>{describeError(loadError, t)}</FormError>}
          {categories && (
            <ExerciseCategoryForm
              initialWantsCalisthenics={categories.wantsCalisthenics}
              initialWantsGym={categories.wantsGym}
              onSubmit={(values) => updateCategories.mutate(values)}
              isSubmitting={updateCategories.isPending}
              submitLabel={t("category.continue")}
            />
          )}
          {updateCategories.error && <FormError>{describeError(updateCategories.error, t)}</FormError>}
        </>
      )}

      {step === "install" && (
        <>
          <InstallAppHint />
          <Button onClick={finish}>{t("onboarding.letsGo")}</Button>
        </>
      )}

      {step !== "install" && (
        <button type="button" onClick={finish} className="text-sm text-muted text-center">
          {t("onboarding.skip")}
        </button>
      )}
    </AuthShell>
  );
}
