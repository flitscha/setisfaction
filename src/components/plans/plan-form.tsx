"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

// Displayed Monday-first regardless of locale (matches the rest of the
// app's aesthetic) — weekday values themselves stay JS's Date#getDay()
// convention (0 = Sunday .. 6 = Saturday) end to end, including on the
// server, so nothing needs translating when the Today page looks itself up.
const WEEKDAYS: { weekday: number; label: string }[] = [
  { weekday: 1, label: "Monday" },
  { weekday: 2, label: "Tuesday" },
  { weekday: 3, label: "Wednesday" },
  { weekday: 4, label: "Thursday" },
  { weekday: 5, label: "Friday" },
  { weekday: 6, label: "Saturday" },
  { weekday: 0, label: "Sunday" },
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
      setValidationError("Name is required.");
      return;
    }
    if (schedule.every((workoutId) => workoutId === null)) {
      setValidationError("Assign a workout to at least one day.");
      return;
    }

    setValidationError(null);
    onSubmit({ name, schedule });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Main Plan"
          className={inputClass}
        />
      </label>

      {workouts?.length === 0 && (
        <p className="text-sm text-muted">You don&apos;t have any workouts yet — create one first.</p>
      )}

      <div className="flex flex-col gap-2">
        {WEEKDAYS.map(({ weekday, label }) => (
          <label key={weekday} className="flex items-center justify-between gap-3 rounded-lg border border-card-border px-3 py-2">
            <span className="text-sm font-medium">{label}</span>
            <select
              value={schedule[weekday] ?? ""}
              onChange={(e) => setDay(weekday, e.target.value || null)}
              className="border border-card-border rounded-lg px-2 py-1.5 bg-transparent min-h-11"
            >
              <option value="">Rest day</option>
              {workouts?.map((workout) => (
                <option key={workout.id} value={workout.id}>
                  {workout.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {(validationError || errorMessage) && <p className="text-red-600 text-sm">{validationError ?? errorMessage}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
