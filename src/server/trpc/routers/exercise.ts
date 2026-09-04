import { TRPCError } from "@trpc/server";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { exercises, sets } from "@/server/db/schema";
import { protectedProcedure, router } from "../trpc";

const exerciseFields = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => value || undefined),
  tracksReps: z.boolean(),
  tracksTime: z.boolean(),
  tracksWeight: z.boolean(),
});

function hasTrackedField(data: { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean }) {
  return data.tracksReps || data.tracksTime || data.tracksWeight;
}

const trackedFieldIssue = {
  message: "At least one of reps, time, or weight must be tracked",
  path: ["tracksReps"] as PropertyKey[],
};

const createExerciseInput = exerciseFields.refine(hasTrackedField, trackedFieldIssue);
const updateExerciseInput = exerciseFields.extend({ id: z.string().uuid() }).refine(hasTrackedField, trackedFieldIssue);

// Postgres unique_violation error code.
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

export const exerciseRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    db.select().from(exercises).where(eq(exercises.userId, ctx.userId)).orderBy(exercises.name),
  ),

  listRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }).optional())
    .query(({ ctx, input }) =>
      db
        .select({
          id: exercises.id,
          name: exercises.name,
          category: exercises.category,
          tracksReps: exercises.tracksReps,
          tracksTime: exercises.tracksTime,
          tracksWeight: exercises.tracksWeight,
          createdAt: exercises.createdAt,
          lastPerformedAt: sql<Date | null>`max(${sets.performedAt})`,
        })
        .from(exercises)
        .leftJoin(sets, eq(sets.exerciseId, exercises.id))
        .where(eq(exercises.userId, ctx.userId))
        .groupBy(exercises.id)
        .orderBy(sql`max(${sets.performedAt}) desc nulls last`)
        .limit(input?.limit ?? 10),
    ),

  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [exercise] = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, input.id), eq(exercises.userId, ctx.userId)));

    if (!exercise) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const [{ value: setsCount }] = await db.select({ value: count() }).from(sets).where(eq(sets.exerciseId, input.id));

    return { ...exercise, setsCount };
  }),

  create: protectedProcedure.input(createExerciseInput).mutation(async ({ ctx, input }) => {
    try {
      const [exercise] = await db
        .insert(exercises)
        .values({ ...input, userId: ctx.userId })
        .returning();
      return exercise;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TRPCError({ code: "CONFLICT", message: "An exercise with this name already exists." });
      }
      throw error;
    }
  }),

  update: protectedProcedure.input(updateExerciseInput).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input;

    try {
      const [exercise] = await db
        .update(exercises)
        .set(values)
        .where(and(eq(exercises.id, id), eq(exercises.userId, ctx.userId)))
        .returning();

      if (!exercise) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return exercise;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TRPCError({ code: "CONFLICT", message: "An exercise with this name already exists." });
      }
      throw error;
    }
  }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [deleted] = await db
      .delete(exercises)
      .where(and(eq(exercises.id, input.id), eq(exercises.userId, ctx.userId)))
      .returning({ id: exercises.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return deleted;
  }),
});
