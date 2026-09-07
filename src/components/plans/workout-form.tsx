"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ExercisePicker, type PickableExercise } from "@/components/sets/exercise-picker";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

export type WorkoutExerciseDraft = {
  exerciseId: string;
  exerciseName: string;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
  setsCount: string;
  targetReps: string;
  targetTimeSeconds: string;
  targetWeightKg: string;
  definePause: boolean;
  restSeconds: string;
};

export type WorkoutFormValues = {
  name: string;
  exercises: WorkoutExerciseDraft[];
};

function draftFromExercise(exercise: PickableExercise): WorkoutExerciseDraft {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    tracksReps: exercise.tracksReps,
    tracksTime: exercise.tracksTime,
    tracksWeight: exercise.tracksWeight,
    setsCount: "3",
    targetReps: "",
    targetTimeSeconds: "",
    targetWeightKg: "",
    definePause: false,
    restSeconds: "60",
  };
}

// Submission payload derived from the draft state — undefined for any
// target left blank (or rest left off), matching workout.ts's zod schema
// exactly (all target fields optional and independent).
export function serializeWorkoutValues(values: WorkoutFormValues) {
  return {
    name: values.name.trim(),
    exercises: values.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      setsCount: Number(e.setsCount),
      targetReps: e.tracksReps && e.targetReps !== "" ? Number(e.targetReps) : undefined,
      targetTimeSeconds: e.tracksTime && e.targetTimeSeconds !== "" ? Number(e.targetTimeSeconds) : undefined,
      targetWeightKg: e.tracksWeight && e.targetWeightKg !== "" ? Number(e.targetWeightKg) : undefined,
      restSeconds: e.definePause && e.restSeconds !== "" ? Number(e.restSeconds) : undefined,
    })),
  };
}

export function WorkoutForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  errorMessage,
}: {
  initialValues?: WorkoutFormValues;
  onSubmit: (values: WorkoutFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  errorMessage?: string | null;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [exercises, setExercises] = useState<WorkoutExerciseDraft[]>(initialValues?.exercises ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function updateExercise(index: number, patch: Partial<WorkoutExerciseDraft>) {
    setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError("Name is required.");
      return;
    }
    if (exercises.length === 0) {
      setValidationError("Add at least one exercise.");
      return;
    }
    for (const exercise of exercises) {
      if (!exercise.setsCount || Number(exercise.setsCount) < 1) {
        setValidationError(`Set a valid number of sets for ${exercise.exerciseName}.`);
        return;
      }
    }

    setValidationError(null);
    onSubmit({ name, exercises });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pull Day"
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-3">
        {exercises.map((exercise, index) => (
          <div key={index} className="rounded-2xl border border-card-border bg-card shadow-sm p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium truncate">{exercise.exerciseName}</p>
              <button
                type="button"
                onClick={() => removeExercise(index)}
                aria-label={`Remove ${exercise.exerciseName}`}
                className="p-2 -m-2 text-muted hover:text-red-600 shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Sets</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={exercise.setsCount}
                onChange={(e) => updateExercise(index, { setsCount: e.target.value })}
                className={inputClass}
              />
            </label>

            {exercise.tracksReps && (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted">Target reps (optional — blank means to failure)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={exercise.targetReps}
                  onChange={(e) => updateExercise(index, { targetReps: e.target.value })}
                  className={inputClass}
                />
              </label>
            )}

            {exercise.tracksTime && (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted">Target time in seconds (optional)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={exercise.targetTimeSeconds}
                  onChange={(e) => updateExercise(index, { targetTimeSeconds: e.target.value })}
                  className={inputClass}
                />
              </label>
            )}

            {exercise.tracksWeight && (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted">Target weight in kg (optional)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={exercise.targetWeightKg}
                  onChange={(e) => updateExercise(index, { targetWeightKg: e.target.value })}
                  className={inputClass}
                />
              </label>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exercise.definePause}
                onChange={(e) => updateExercise(index, { definePause: e.target.checked })}
              />
              Define rest between sets
            </label>
            {exercise.definePause && (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted">Rest in seconds</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={exercise.restSeconds}
                  onChange={(e) => updateExercise(index, { restSeconds: e.target.value })}
                  className={inputClass}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={() => setShowPicker(true)} className="flex items-center justify-center gap-1.5">
        <Plus size={18} />
        Add exercise
      </Button>

      {(validationError || errorMessage) && <p className="text-red-600 text-sm">{validationError ?? errorMessage}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>

      {showPicker && (
        <Modal title="Add exercise" onClose={() => setShowPicker(false)}>
          <ExercisePicker
            onSelect={(exercise) => {
              setExercises((prev) => [...prev, draftFromExercise(exercise)]);
              setShowPicker(false);
            }}
          />
        </Modal>
      )}
    </form>
  );
}
