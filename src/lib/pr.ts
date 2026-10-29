import { availableTrackedFields, type TrackedField } from "./stats";

export type PreviousBest = {
  maxReps: number | null;
  maxTimeSeconds: number | null;
  maxWeightKg: number | null;
  maxVolume: number | null;
};

export const EMPTY_BEST: PreviousBest = { maxReps: null, maxTimeSeconds: null, maxWeightKg: null, maxVolume: null };

export type SetValues = {
  reps?: number;
  timeSeconds?: number;
  weightKg?: number;
};

type TrackedFlags = { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };

// Which fields count toward a PR when the user hasn't chosen themselves. For
// a reps + weight exercise, a reps record on its own mostly means "a lighter
// set than usual" (20 easy reps beat 8 heavy ones), so only the heaviest
// weight and the biggest single-set volume count by default. Everything else
// keeps the original "any tracked field" behavior.
export function defaultPrFields(exercise: TrackedFlags): TrackedField[] {
  if (exercise.tracksReps && exercise.tracksWeight) {
    return availableTrackedFields(exercise).filter((field) => field !== "reps");
  }
  return availableTrackedFields(exercise);
}

// The user's stored choice, narrowed to what the exercise still tracks (its
// tracked fields can change after the choice was saved); falls back to the
// default if nothing usable is left, so a set can always become a PR.
export function effectivePrFields(exercise: TrackedFlags, stored: TrackedField[] | null | undefined): TrackedField[] {
  const available = availableTrackedFields(exercise);
  const chosen = (stored ?? []).filter((field) => available.includes(field));
  return chosen.length > 0 ? chosen : defaultPrFields(exercise);
}

// A field counts as a new personal record if it's one of the exercise's PR
// fields, present on this set, and exceeds the best value ever logged for
// that exercise (excluding this set itself).
export function getPrFields(values: SetValues, previousBest: PreviousBest, prFields: TrackedField[]): TrackedField[] {
  const beats = (value: number | undefined, best: number | null) =>
    value !== undefined && (best === null || value > best);
  const volume = values.reps !== undefined && values.weightKg !== undefined ? values.reps * values.weightKg : undefined;

  return prFields.filter((field) => {
    if (field === "reps") return beats(values.reps, previousBest.maxReps);
    if (field === "time") return beats(values.timeSeconds, previousBest.maxTimeSeconds);
    if (field === "weight") return beats(values.weightKg, previousBest.maxWeightKg);
    return beats(volume, previousBest.maxVolume);
  });
}

// Advances a running best by one set, for computing PRs through a day in order.
export function advanceBest(best: PreviousBest, set: { reps: number | null; timeSeconds: number | null; weightKg: number | null }): PreviousBest {
  const max = (current: number | null, value: number | null) =>
    value === null ? current : current === null ? value : Math.max(current, value);
  return {
    maxReps: max(best.maxReps, set.reps),
    maxTimeSeconds: max(best.maxTimeSeconds, set.timeSeconds),
    maxWeightKg: max(best.maxWeightKg, set.weightKg),
    maxVolume: max(best.maxVolume, set.reps !== null && set.weightKg !== null ? set.reps * set.weightKg : null),
  };
}
