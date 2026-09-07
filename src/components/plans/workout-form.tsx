"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ExercisePicker, type PickableExercise } from "@/components/sets/exercise-picker";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

// A target field (reps, time, or weight) for one exercise slot. `defined`
// mirrors the "define X" checkbox; when off, every set is logged freeform
// during the workout (to muscle failure, for reps). When on, either one
// `value` applies to every set, or `perSet` gives each set its own — this is
// what lets a plan define a pyramid like reps 10 → 8 → 6 instead of the same
// number for every set. `perSet` is kept in sync with setsCount and carried
// along even while `sameForAllSets` is true, so toggling back and forth never
// silently drops what was typed.
type TargetDraft = {
  defined: boolean;
  sameForAllSets: boolean;
  value: string;
  perSet: string[];
};

function emptyTarget(setsCount: number): TargetDraft {
  return { defined: false, sameForAllSets: true, value: "", perSet: Array(setsCount).fill("") };
}

function resizePerSet(perSet: string[], setsCount: number): string[] {
  return Array.from({ length: setsCount }, (_, i) => perSet[i] ?? "");
}

// Rebuilds form state for a target field from its saved (number | null)[] —
// used when opening the edit page. "Same value for every set" is only
// inferred when every set actually has that same value; anything else (a
// real pyramid, or some sets left open) opens in per-set mode so nothing
// saved is ever silently collapsed into one number.
export function targetDraftFromArray(saved: (number | null)[] | null, setsCount: number): TargetDraft {
  if (!saved) return emptyTarget(setsCount);
  const perSet = resizePerSet(
    saved.map((v) => (v === null ? "" : String(v))),
    setsCount,
  );
  const allSame = perSet.every((v) => v !== "" && v === perSet[0]);
  return { defined: true, sameForAllSets: allSame, value: allSame ? perSet[0] : "", perSet };
}

// `round` guards against the "8.5 reps" case: a number input's inputMode
// only hints at a mobile numeric keypad, it doesn't actually block a decimal
// being typed, and reps/time are meant to be whole numbers server-side —
// without this, submitting one would fail on the server's int validation
// with a raw Zod message instead of just doing the sensible thing.
function serializeTarget(target: TargetDraft, setsCount: number, round: (n: number) => number): (number | null)[] | undefined {
  if (!target.defined) return undefined;
  if (target.sameForAllSets) {
    if (target.value === "") return undefined;
    return Array(setsCount).fill(round(Number(target.value)));
  }
  const perSet = resizePerSet(target.perSet, setsCount);
  if (perSet.every((v) => v === "")) return undefined;
  return perSet.map((v) => (v === "" ? null : round(Number(v))));
}

export type WorkoutExerciseDraft = {
  exerciseId: string;
  exerciseName: string;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
  setsCount: string;
  reps: TargetDraft;
  time: TargetDraft;
  weight: TargetDraft;
  definePause: boolean;
  restSeconds: string;
};

export type WorkoutFormValues = {
  name: string;
  exercises: WorkoutExerciseDraft[];
};

const DEFAULT_SETS_COUNT = 3;

function draftFromExercise(exercise: PickableExercise): WorkoutExerciseDraft {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    tracksReps: exercise.tracksReps,
    tracksTime: exercise.tracksTime,
    tracksWeight: exercise.tracksWeight,
    setsCount: String(DEFAULT_SETS_COUNT),
    reps: emptyTarget(DEFAULT_SETS_COUNT),
    time: emptyTarget(DEFAULT_SETS_COUNT),
    weight: emptyTarget(DEFAULT_SETS_COUNT),
    definePause: false,
    restSeconds: "60",
  };
}

// Submission payload derived from the draft state — matches workout.ts's zod
// schema exactly (each defined target is an array with one entry per set;
// omitted entirely when never defined at all).
export function serializeWorkoutValues(values: WorkoutFormValues) {
  return {
    name: values.name.trim(),
    exercises: values.exercises.map((e) => {
      const setsCount = Math.round(Number(e.setsCount));
      return {
        exerciseId: e.exerciseId,
        setsCount,
        targetReps: e.tracksReps ? serializeTarget(e.reps, setsCount, Math.round) : undefined,
        targetTimeSeconds: e.tracksTime ? serializeTarget(e.time, setsCount, Math.round) : undefined,
        targetWeightKg: e.tracksWeight ? serializeTarget(e.weight, setsCount, (n) => Math.round(n * 100) / 100) : undefined,
        restSeconds: e.definePause && e.restSeconds !== "" ? Math.round(Number(e.restSeconds)) : undefined,
      };
    }),
  };
}

function TargetFieldEditor({
  label,
  target,
  setsCount,
  inputMode,
  step,
  onChange,
}: {
  label: string;
  target: TargetDraft;
  setsCount: number;
  inputMode: "numeric" | "decimal";
  step?: string;
  onChange: (next: TargetDraft) => void;
}) {
  function setPerSetValue(index: number, value: string) {
    const perSet = target.perSet.slice();
    perSet[index] = value;
    onChange({ ...target, perSet });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={target.defined} onChange={(e) => onChange({ ...target, defined: e.target.checked })} />
        <span className="text-sm text-muted">Define {label.toLowerCase()} (optional — blank means to failure)</span>
      </label>

      {target.defined && (
        <div className="flex flex-col gap-2 pl-6">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={!target.sameForAllSets}
              onChange={(e) => onChange({ ...target, sameForAllSets: !e.target.checked })}
            />
            Different {label.toLowerCase()} per set (e.g. pyramid 10 → 8 → 6)
          </label>

          {target.sameForAllSets ? (
            <input
              type="number"
              inputMode={inputMode}
              step={step}
              value={target.value}
              onChange={(e) => onChange({ ...target, value: e.target.value })}
              className={inputClass}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: setsCount }, (_, i) => (
                <label key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted">Set {i + 1}</span>
                  <input
                    type="number"
                    inputMode={inputMode}
                    step={step}
                    value={target.perSet[i] ?? ""}
                    onChange={(e) => setPerSetValue(i, e.target.value)}
                    placeholder="–"
                    className={`${inputClass} w-16 text-center px-1`}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
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

  // Keeps every target field's per-set array the same length as setsCount,
  // so a value typed for "Set 3" doesn't silently end up applying to the
  // wrong set after the count changes.
  function updateSetsCount(index: number, raw: string) {
    const setsCount = Math.max(0, Number(raw) || 0);
    setExercises((prev) =>
      prev.map((e, i) =>
        i === index
          ? {
              ...e,
              setsCount: raw,
              reps: { ...e.reps, perSet: resizePerSet(e.reps.perSet, setsCount) },
              time: { ...e.time, perSet: resizePerSet(e.time.perSet, setsCount) },
              weight: { ...e.weight, perSet: resizePerSet(e.weight.perSet, setsCount) },
            }
          : e,
      ),
    );
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
        {exercises.map((exercise, index) => {
          const setsCount = Number(exercise.setsCount) || 0;
          return (
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
                  onChange={(e) => updateSetsCount(index, e.target.value)}
                  className={inputClass}
                />
              </label>

              {exercise.tracksReps && (
                <TargetFieldEditor
                  label="Reps"
                  target={exercise.reps}
                  setsCount={setsCount}
                  inputMode="numeric"
                  onChange={(reps) => updateExercise(index, { reps })}
                />
              )}

              {exercise.tracksTime && (
                <TargetFieldEditor
                  label="Time (seconds)"
                  target={exercise.time}
                  setsCount={setsCount}
                  inputMode="numeric"
                  onChange={(time) => updateExercise(index, { time })}
                />
              )}

              {exercise.tracksWeight && (
                <TargetFieldEditor
                  label="Weight (kg)"
                  target={exercise.weight}
                  setsCount={setsCount}
                  inputMode="decimal"
                  step="0.5"
                  onChange={(weight) => updateExercise(index, { weight })}
                />
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
          );
        })}
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
              // The same exercise twice in one workout would share a single
              // loggedCount on the Today checklist (it's counted by exercise
              // id, not by which slot it came from), so both entries would
              // silently complete together — confusing rather than useful.
              if (exercises.some((e) => e.exerciseId === exercise.id)) {
                setValidationError(`"${exercise.name}" is already in this workout.`);
                setShowPicker(false);
                return;
              }
              setValidationError(null);
              setExercises((prev) => [...prev, draftFromExercise(exercise)]);
              setShowPicker(false);
            }}
          />
        </Modal>
      )}
    </form>
  );
}
