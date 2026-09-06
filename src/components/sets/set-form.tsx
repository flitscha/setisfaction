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
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Only guards freshly-entered, not-yet-saved values (create flow) — cancelling
  // an edit never loses anything, the previous values are still safely stored.
  const hasUnsavedEntry = !initialValues && (reps !== "" || timeSeconds !== "" || weightKg !== "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      reps: exercise.tracksReps && reps !== "" ? Number(reps) : undefined,
      timeSeconds: exercise.tracksTime && timeSeconds !== "" ? Number(timeSeconds) : undefined,
      weightKg: exercise.tracksWeight && weightKg !== "" ? Number(weightKg) : undefined,
    });
  }

  function handleCancelClick() {
    if (hasUnsavedEntry && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    onCancel();
  }

  function nudgeTime(delta: number) {
    setTimeSeconds((prev) => String(Math.max(0, Number(prev || 0) + delta)));
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
          <input
            type="number"
            inputMode="numeric"
            value={timeSeconds}
            onChange={(e) => setTimeSeconds(e.target.value)}
            className={inputClass}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Stopwatch onStop={(seconds) => setTimeSeconds(String(seconds))} hasExistingValue={timeSeconds !== ""} />
            {timeSeconds !== "" && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => nudgeTime(-1)}
                  aria-label="Subtract one second"
                  className="rounded-lg border border-card-border px-3 py-2 text-sm min-h-11"
                >
                  −1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime(1)}
                  aria-label="Add one second"
                  className="rounded-lg border border-card-border px-3 py-2 text-sm min-h-11"
                >
                  +1s
                </button>
              </div>
            )}
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

      {confirmCancel ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Discard this set?</span>
          <Button type="button" variant="danger" onClick={onCancel} className="ml-auto">
            Discard
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmCancel(false)}>
            Keep editing
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save set"}
          </Button>
          <Button type="button" variant="ghost" onClick={handleCancelClick}>
            Cancel
          </Button>
          {onDelete && (
            <Button type="button" variant="danger" onClick={onDelete} disabled={isDeleting} className="ml-auto">
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
