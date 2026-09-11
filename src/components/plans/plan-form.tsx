"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { useT, type TranslationKey } from "@/lib/i18n/context";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

// Displayed Monday-first regardless of the chosen app language (matches the
// rest of the app's aesthetic) — weekday *values* stay JS's Date#getDay()
// convention (0 = Sunday .. 6 = Saturday) end to end, including on the
// server, so nothing needs translating when the Today page looks itself up;
// only the display label is translated.
const WEEKDAYS: { weekday: number; labelKey: TranslationKey }[] = [
  { weekday: 1, labelKey: "plans.weekdayMonday" },
  { weekday: 2, labelKey: "plans.weekdayTuesday" },
  { weekday: 3, labelKey: "plans.weekdayWednesday" },
  { weekday: 4, labelKey: "plans.weekdayThursday" },
  { weekday: 5, labelKey: "plans.weekdayFriday" },
  { weekday: 6, labelKey: "plans.weekdaySaturday" },
  { weekday: 0, labelKey: "plans.weekdaySunday" },
];

export type PlanFormValues = {
  name: string;
  // Index = weekday (0-6); null = rest day.
  schedule: (string | null)[];
};

export function PlanForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  errorMessage,
}: {
  initialValues?: PlanFormValues;
  onSubmit: (values: PlanFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  errorMessage?: string | null;
}) {
  const t = useT();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [schedule, setSchedule] = useState<(string | null)[]>(initialValues?.schedule ?? Array(7).fill(null));
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: workouts } = trpc.workout.list.useQuery();

  function setDay(weekday: number, workoutId: string | null) {
    setSchedule((prev) => prev.map((value, i) => (i === weekday ? workoutId : value)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError(t("plans.nameRequired"));
      return;
    }
    if (schedule.every((workoutId) => workoutId === null)) {
      setValidationError(t("plans.assignAtLeastOneDay"));
      return;
    }

    setValidationError(null);
    onSubmit({ name, schedule });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("exercises.name")}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("plans.namePlaceholder")}
          className={inputClass}
        />
      </label>

      {workouts?.length === 0 && <p className="text-sm text-muted">{t("plans.noWorkoutsToStart")}</p>}

      <div className="flex flex-col gap-2">
        {WEEKDAYS.map(({ weekday, labelKey }) => (
          <label key={weekday} className="flex items-center justify-between gap-3 rounded-lg border border-card-border px-3 py-2">
            <span className="text-sm font-medium">{t(labelKey)}</span>
            <select
              value={schedule[weekday] ?? ""}
              onChange={(e) => setDay(weekday, e.target.value || null)}
              // Explicit bg/text color (not bg-transparent) — the dropdown's
              // OPEN option list is rendered by the OS, not styled by the
              // rest of this page's CSS, so a transparent select left it
              // inheriting dark mode's light text color over the browser's
              // own white popup background (unreadable). Chrome/Firefox/Edge
              // also honor color/background set directly on <option>, which
              // is what actually fixes the popup itself.
              className="border border-card-border rounded-lg px-2 py-1.5 bg-card text-foreground min-h-11"
            >
              <option value="" className="bg-card text-foreground">
                {t("plans.restDay")}
              </option>
              {workouts?.map((workout) => (
                <option key={workout.id} value={workout.id} className="bg-card text-foreground">
                  {workout.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {(validationError || errorMessage) && <p className="text-red-600 text-sm">{validationError ?? errorMessage}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("common.saving") : submitLabel}
      </Button>
    </form>
  );
}
