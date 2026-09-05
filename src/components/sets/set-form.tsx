"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Stopwatch } from "./stopwatch";

export type SetFormValues = {
  reps?: number;
  timeSeconds?: number;
  weightKg?: number;
};

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

export function SetForm({
  exercise,
  initialValues,
  onSubmit,
  isSubmitting,
  onCancel,
  onDelete,
  isDeleting,
}: {
  exercise: { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };
  initialValues?: SetFormValues;
  onSubmit: (values: SetFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  const [reps, setReps] = useState(initialValues?.reps !== undefined ? String(initialValues.reps) : "");
  const [timeSeconds, setTimeSeconds] = useState(
    initialValues?.timeSeconds !== undefined ? String(initialValues.timeSeconds) : "",
  );
  const [weightKg, setWeightKg] = useState(initialValues?.weightKg !== undefined ? String(initialValues.weightKg) : "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      reps: exercise.tracksReps && reps !== "" ? Number(reps) : undefined,
      timeSeconds: exercise.tracksTime && timeSeconds !== "" ? Number(timeSeconds) : undefined,
      weightKg: exercise.tracksWeight && weightKg !== "" ? Number(weightKg) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-card-border pt-3">
      {exercise.tracksReps && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Reps</span>
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {exercise.tracksTime && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Time (seconds)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={timeSeconds}
              onChange={(e) => setTimeSeconds(e.target.value)}
              className={`${inputClass} flex-1 min-w-0`}
            />
            <Stopwatch onStop={(seconds) => setTimeSeconds(String(seconds))} />
          </div>
        </label>
      )}

      {exercise.tracksWeight && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Weight (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save set"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete} disabled={isDeleting} className="ml-auto">
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}
