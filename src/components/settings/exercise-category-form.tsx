"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT, type TranslationKey } from "@/lib/i18n/context";

type ExerciseCategoryChoice = "calisthenics" | "gym" | "both";

function choiceFromFlags(wantsCalisthenics: boolean, wantsGym: boolean): ExerciseCategoryChoice {
  if (wantsCalisthenics && wantsGym) return "both";
  if (wantsGym) return "gym";
  return "calisthenics";
}

function flagsFromChoice(choice: ExerciseCategoryChoice): { wantsCalisthenics: boolean; wantsGym: boolean } {
  return {
    wantsCalisthenics: choice === "calisthenics" || choice === "both",
    wantsGym: choice === "gym" || choice === "both",
  };
}

const OPTIONS: { value: ExerciseCategoryChoice; labelKey: TranslationKey; descriptionKey: TranslationKey }[] = [
  { value: "calisthenics", labelKey: "category.calisthenics", descriptionKey: "category.calisthenicsHint" },
  { value: "gym", labelKey: "category.gym", descriptionKey: "category.gymHint" },
  { value: "both", labelKey: "category.both", descriptionKey: "category.bothHint" },
];

export function ExerciseCategoryForm({
  initialWantsCalisthenics,
  initialWantsGym,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  initialWantsCalisthenics: boolean;
  initialWantsGym: boolean;
  onSubmit: (values: { wantsCalisthenics: boolean; wantsGym: boolean }) => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const t = useT();
  const [choice, setChoice] = useState<ExerciseCategoryChoice>(
    choiceFromFlags(initialWantsCalisthenics, initialWantsGym),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(flagsFromChoice(choice));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {OPTIONS.map((option) => {
          const selected = choice === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setChoice(option.value)}
              className={`text-left rounded-2xl border p-4 transition-colors ${
                selected ? "border-accent bg-accent text-accent-foreground" : "border-card-border bg-card"
              }`}
            >
              <p className="font-medium">{t(option.labelKey)}</p>
              <p className={`text-sm ${selected ? "" : "text-muted"}`}>{t(option.descriptionKey)}</p>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted px-1">{t("category.keepHistoryHint")}</p>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("common.saving") : submitLabel}
      </Button>
    </form>
  );
}
