export type PreviousBest = {
  maxReps: number | null;
  maxTimeSeconds: number | null;
  maxWeightKg: number | null;
};

export type SetValues = {
  reps?: number;
  timeSeconds?: number;
  weightKg?: number;
};

export type TrackedField = "reps" | "time" | "weight";

// A field counts as a new personal record if it's tracked on this set and
// exceeds the best value ever logged for that exercise (excluding this set itself).
export function getPrFields(values: SetValues, previousBest: PreviousBest): TrackedField[] {
  const prFields: TrackedField[] = [];

  if (values.reps !== undefined && (previousBest.maxReps === null || values.reps > previousBest.maxReps)) {
    prFields.push("reps");
  }
  if (
    values.timeSeconds !== undefined &&
    (previousBest.maxTimeSeconds === null || values.timeSeconds > previousBest.maxTimeSeconds)
  ) {
    prFields.push("time");
  }
  if (
    values.weightKg !== undefined &&
    (previousBest.maxWeightKg === null || values.weightKg > previousBest.maxWeightKg)
  ) {
    prFields.push("weight");
  }

  return prFields;
}
