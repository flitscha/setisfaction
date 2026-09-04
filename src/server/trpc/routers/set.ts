import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { exercises, sets } from "@/server/db/schema";
import { protectedProcedure, router } from "../trpc";

const createSetInput = z.object({
  exerciseId: z.string().uuid(),
  performedAt: z.date().optional(),
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

export const setRouter = router({
  create: protectedProcedure.input(createSetInput).mutation(async ({ ctx, input }) => {
    await assertOwnsExercise(input.exerciseId, ctx.userId);

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

    return set;
  }),

  listToday: protectedProcedure
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
