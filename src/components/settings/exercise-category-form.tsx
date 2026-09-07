"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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

const OPTIONS: { value: ExerciseCategoryChoice; label: string; description: string }[] = [
  { value: "calisthenics", label: "Calisthenics", description: "Bodyweight exercises — push-ups, pull-ups, levers, holds…" },
  { value: "gym", label: "Gym", description: "Barbell, dumbbell, and machine exercises." },
  { value: "both", label: "Both", description: "See the full catalog." },
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
              <p className="font-medium">{option.label}</p>
              <p className={`text-sm ${selected ? "" : "text-muted"}`}>{option.description}</p>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted px-1">
        Exercises you&apos;ve already logged sets for stay visible either way — this only changes what&apos;s offered going
        forward.
      </p>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
