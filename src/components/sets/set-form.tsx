"use client";

import { useState } from "react";
import { Stopwatch } from "./stopwatch";

export type SetFormValues = {
  reps?: number;
  timeSeconds?: number;
  weightKg?: number;
};

export function SetForm({
  exercise,
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  exercise: { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };
  onSubmit: (values: SetFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [reps, setReps] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");
  const [weightKg, setWeightKg] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      reps: exercise.tracksReps && reps !== "" ? Number(reps) : undefined,
      timeSeconds: exercise.tracksTime && timeSeconds !== "" ? Number(timeSeconds) : undefined,
      weightKg: exercise.tracksWeight && weightKg !== "" ? Number(weightKg) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border rounded p-4">
      {exercise.tracksReps && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Reps</span>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="border rounded px-3 py-2"
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
              className="border rounded px-3 py-2 flex-1 min-w-0"
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
            className="border rounded px-3 py-2"
          />
        </label>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Log set"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
