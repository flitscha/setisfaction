import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { advanceBest, EMPTY_BEST, effectivePrFields, getPrFields, type PreviousBest } from "@/lib/pr";
import { getStoredPrFields } from "@/server/db/pr-settings";
import { exercises, sets } from "@/server/db/schema";
import { readProcedure, router, writeProcedure } from "../trpc";

const createSetInput = z.object({
  exerciseId: z.string().uuid(),
  performedAt: z.date().optional(),
  reps: z.number().int().min(0).optional(),
  timeSeconds: z.number().int().min(0).optional(),
  weightKg: z.number().min(0).optional(),
});

const updateSetInput = z.object({
  id: z.string().uuid(),
  reps: z.number().int().min(0).optional(),
  timeSeconds: z.number().int().min(0).optional(),
  weightKg: z.number().min(0).optional(),
});

// A user may log sets against their own exercises and standard (shared) ones.
async function assertOwnsExercise(exerciseId: string, userId: string) {
  const [exercise] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), or(eq(exercises.userId, userId), isNull(exercises.userId))));

  if (!exercise) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return exercise;
}

// Scoped to the user's own sets — a standard exercise can be shared with
// sets logged by other users too, which shouldn't count toward this user's PR.
async function getPreviousBest(exerciseId: string, userId: string, excludeSetId?: string): Promise<PreviousBest> {
  const conditions = [eq(sets.exerciseId, exerciseId), eq(sets.userId, userId)];
  if (excludeSetId) {
    conditions.push(ne(sets.id, excludeSetId));
  }

  const [result] = await db
    .select({
      maxReps: sql<number | null>`max(${sets.reps})`,
      maxTimeSeconds: sql<number | null>`max(${sets.timeSeconds})`,
      maxWeightKg: sql<number | null>`max(${sets.weightKg})`.mapWith(Number),
      maxVolume: sql<number | null>`max(${sets.reps} * ${sets.weightKg})`.mapWith(Number),
    })
    .from(sets)
    .where(and(...conditions));

  return result;
}

async function getExercisePrFields(
  exercise: { id: string; tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean },
  userId: string,
) {
  const stored = await getStoredPrFields(userId, [exercise.id]);
  return effectivePrFields(exercise, stored.get(exercise.id));
}

// Exported so community.ts can build the same per-exercise history for a
// friend's profile, after checking friendship — this has no access control
// of its own.
export function getSetsByExercise(userId: string, exerciseId: string) {
  return db
    .select()
    .from(sets)
    .where(and(eq(sets.userId, userId), eq(sets.exerciseId, exerciseId)))
    .orderBy(asc(sets.performedAt));
}

export const setRouter = router({
  create: writeProcedure.input(createSetInput).mutation(async ({ ctx, input }) => {
    const exercise = await assertOwnsExercise(input.exerciseId, ctx.userId);

    const [previousBest, prFields] = await Promise.all([
      getPreviousBest(input.exerciseId, ctx.userId),
      getExercisePrFields(exercise, ctx.userId),
    ]);

    const [set] = await db
      .insert(sets)
      .values({
        userId: ctx.userId,
        exerciseId: input.exerciseId,
        performedAt: input.performedAt ?? new Date(),
        reps: input.reps,
        timeSeconds: input.timeSeconds,
        weightKg: input.weightKg,
      })
      .returning();

    return { set, prFields: getPrFields(input, previousBest, prFields) };
  }),

  update: writeProcedure.input(updateSetInput).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input;

    const [existing] = await db
      .select()
      .from(sets)
      .where(and(eq(sets.id, id), eq(sets.userId, ctx.userId)));

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const exercise = await assertOwnsExercise(existing.exerciseId, ctx.userId);
    const [previousBest, prFields] = await Promise.all([
      getPreviousBest(existing.exerciseId, ctx.userId, id),
      getExercisePrFields(exercise, ctx.userId),
    ]);

    const [set] = await db
      .update(sets)
      .set({
        reps: values.reps ?? null,
        timeSeconds: values.timeSeconds ?? null,
        weightKg: values.weightKg ?? null,
      })
      .where(eq(sets.id, id))
      .returning();

    return { set, prFields: getPrFields(values, previousBest, prFields) };
  }),

  delete: writeProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [deleted] = await db
      .delete(sets)
      .where(and(eq(sets.id, input.id), eq(sets.userId, ctx.userId)))
      .returning({ id: sets.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return deleted;
  }),

  listByExercise: readProcedure
    .input(z.object({ exerciseId: z.string().uuid() }))
    .query(({ ctx, input }) => getSetsByExercise(ctx.viewUserId, input.exerciseId)),

  // Named by day range rather than "today" since it's also used to view past days.
  //
  // `isPr` is computed here (not just returned from create/update) so it
  // survives a reload — it used to live only in the Today page's local React
  // state, reset to nothing the moment the page remounted. It's derived per
  // row against a running best that starts at the all-time max from before
  // this day and advances through the day's own sets in order, so two sets
  // logged today can both correctly be PRs if each beats the one before it.
  // Which fields count is the viewed user's own per-exercise choice (see
  // exercise_pr_settings), not the caller's.
  listByDay: readProcedure
    .input(z.object({ dayStart: z.date(), dayEnd: z.date() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: sets.id,
          exerciseId: sets.exerciseId,
          exerciseName: exercises.name,
          exerciseUserId: exercises.userId,
          tracksReps: exercises.tracksReps,
          tracksTime: exercises.tracksTime,
          tracksWeight: exercises.tracksWeight,
          performedAt: sets.performedAt,
          reps: sets.reps,
          timeSeconds: sets.timeSeconds,
          weightKg: sets.weightKg,
        })
        .from(sets)
        .innerJoin(exercises, eq(exercises.id, sets.exerciseId))
        .where(
          and(
            eq(sets.userId, ctx.viewUserId),
            gte(sets.performedAt, input.dayStart),
            lt(sets.performedAt, input.dayEnd),
          ),
        )
        .orderBy(asc(sets.performedAt));

      if (rows.length === 0) return [];

      const exerciseIds = [...new Set(rows.map((r) => r.exerciseId))];
      const [baselines, storedPrFields] = await Promise.all([
        db
          .select({
            exerciseId: sets.exerciseId,
            maxReps: sql<number | null>`max(${sets.reps})`,
            maxTimeSeconds: sql<number | null>`max(${sets.timeSeconds})`,
            maxWeightKg: sql<number | null>`max(${sets.weightKg})`.mapWith(Number),
            maxVolume: sql<number | null>`max(${sets.reps} * ${sets.weightKg})`.mapWith(Number),
          })
          .from(sets)
          .where(
            and(eq(sets.userId, ctx.viewUserId), inArray(sets.exerciseId, exerciseIds), lt(sets.performedAt, input.dayStart)),
          )
          .groupBy(sets.exerciseId),
        getStoredPrFields(ctx.viewUserId, exerciseIds),
      ]);

      const runningBest = new Map<string, PreviousBest>(baselines.map(({ exerciseId, ...best }) => [exerciseId, best]));

      return rows.map((row) => {
        const best = runningBest.get(row.exerciseId) ?? EMPTY_BEST;
        const candidates = effectivePrFields(row, storedPrFields.get(row.exerciseId));
        const prFields = getPrFields(
          { reps: row.reps ?? undefined, timeSeconds: row.timeSeconds ?? undefined, weightKg: row.weightKg ?? undefined },
          best,
          candidates,
        );
        runningBest.set(row.exerciseId, advanceBest(best, row));
        // prFields says *which* record a set broke, so the star can be
        // labeled — but only worth labeling when more than one field could
        // have been the record at all (see TodayExerciseCard).
        return { ...row, isPr: prFields.length > 0, prFields, labelPrFields: candidates.length > 1 };
      });
    }),
});
