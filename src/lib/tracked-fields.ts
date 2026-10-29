// Kept free of React imports — shared by client components and server routers (via lib/pr.ts).

// "volume" (reps × weight) is a derived metric, not a raw logged field — the
// one worth charting for a gym-style exercise that tracks both reps and
// weight, since either one alone is only half the picture: real progress
// often means fewer reps at a heavier weight (or the reverse), which can
// look flat or even declining on a reps-only or weight-only chart even
// though total training load went up.
export type TrackedField = "reps" | "time" | "weight" | "volume";

type FieldSet = { reps: number | null; timeSeconds: number | null; weightKg: number | null };

export function valueForField(set: FieldSet, field: TrackedField): number | null {
  if (field === "reps") return set.reps;
  if (field === "time") return set.timeSeconds;
  if (field === "weight") return set.weightKg;
  return set.reps !== null && set.weightKg !== null ? set.reps * set.weightKg : null;
}

// Every field this exercise can be charted by, in a fixed display order —
// volume only when both reps and weight are tracked, since it's meaningless
// otherwise.
export function availableTrackedFields(exercise: {
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
}): TrackedField[] {
  const fields: TrackedField[] = [];
  if (exercise.tracksReps) fields.push("reps");
  if (exercise.tracksTime) fields.push("time");
  if (exercise.tracksWeight) fields.push("weight");
  if (exercise.tracksReps && exercise.tracksWeight) fields.push("volume");
  return fields;
}
