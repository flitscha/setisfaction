import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { getPrFields, type PreviousBest } from "@/lib/pr";
import { exercises, sets } from "@/server/db/schema";
import { protectedProcedure, router } from "../trpc";

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

async function assertOwnsExercise(exerciseId: string, userId: string) {
  const [exercise] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));

  if (!exercise) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return exercise;
}

async function getPreviousBest(exerciseId: string, excludeSetId?: string): Promise<PreviousBest> {
  const conditions = [eq(sets.exerciseId, exerciseId)];
  if (excludeSetId) {
    conditions.push(ne(sets.id, excludeSetId));
  }

  const [result] = await db
    .select({
      maxReps: sql<number | null>`max(${sets.reps})`,
      maxTimeSeconds: sql<number | null>`max(${sets.timeSeconds})`,
      maxWeightKg: sql<number | null>`max(${sets.weightKg})`,
    })
    .from(sets)
    .where(and(...conditions));

  return result;
}

export const setRouter = router({
  create: protectedProcedure.input(createSetInput).mutation(async ({ ctx, input }) => {
    await assertOwnsExercise(input.exerciseId, ctx.userId);

    const previousBest = await getPreviousBest(input.exerciseId);

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

    return { set, prFields: getPrFields(input, previousBest) };
  }),

  update: protectedProcedure.input(updateSetInput).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input;

    const [existing] = await db
      .select()
      .from(sets)
      .where(and(eq(sets.id, id), eq(sets.userId, ctx.userId)));

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const previousBest = await getPreviousBest(existing.exerciseId, id);

    const [set] = await db
      .update(sets)
      .set({
        reps: values.reps ?? null,
        timeSeconds: values.timeSeconds ?? null,
        weightKg: values.weightKg ?? null,
      })
      .where(eq(sets.id, id))
      .returning();

    return { set, prFields: getPrFields(values, previousBest) };
  }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [deleted] = await db
      .delete(sets)
      .where(and(eq(sets.id, input.id), eq(sets.userId, ctx.userId)))
      .returning({ id: sets.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return deleted;
  }),

  listByExercise: protectedProcedure
    .input(z.object({ exerciseId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      db
        .select()
        .from(sets)
        .where(and(eq(sets.userId, ctx.userId), eq(sets.exerciseId, input.exerciseId)))
        .orderBy(asc(sets.performedAt)),
    ),

  // Named by day range rather than "today" since it's also used to view past days.
  listByDay: protectedProcedure
    .input(z.object({ dayStart: z.date(), dayEnd: z.date() }))
    .query(({ ctx, input }) =>
      db
        .select({
          id: sets.id,
          exerciseId: sets.exerciseId,
          exerciseName: exercises.name,
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
          and(eq(sets.userId, ctx.userId), gte(sets.performedAt, input.dayStart), lt(sets.performedAt, input.dayEnd)),
        )
        .orderBy(asc(sets.performedAt)),
    ),
});
