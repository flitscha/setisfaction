import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { exerciseGroupMembers, exerciseGroups, exercises, sets } from "@/server/db/schema";
import { protectedProcedure, router } from "../trpc";

const exerciseFields = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || undefined),
  tracksReps: z.boolean(),
  tracksTime: z.boolean(),
  tracksWeight: z.boolean(),
  groupIds: z.array(z.string().uuid()).default([]),
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

// Verifies the given group ids belong to the user, so a exercise can't be linked to someone else's group.
async function assertOwnsGroups(groupIds: string[], userId: string) {
  if (groupIds.length === 0) return;
  const owned = await db
    .select({ id: exerciseGroups.id })
    .from(exerciseGroups)
    .where(and(inArray(exerciseGroups.id, groupIds), eq(exerciseGroups.userId, userId)));
  if (owned.length !== groupIds.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "One or more groups don't exist." });
  }
}

async function getGroupIdsByExercise(exerciseIds: string[]): Promise<Map<string, string[]>> {
  if (exerciseIds.length === 0) return new Map();
  const rows = await db
    .select({ exerciseId: exerciseGroupMembers.exerciseId, groupId: exerciseGroupMembers.groupId })
    .from(exerciseGroupMembers)
    .where(inArray(exerciseGroupMembers.exerciseId, exerciseIds));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const existing = map.get(row.exerciseId);
    if (existing) existing.push(row.groupId);
    else map.set(row.exerciseId, [row.groupId]);
  }
  return map;
}

export const exerciseRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(exercises).where(eq(exercises.userId, ctx.userId)).orderBy(exercises.name);
    const groupIdsByExercise = await getGroupIdsByExercise(rows.map((r) => r.id));
    return rows.map((row) => ({ ...row, groupIds: groupIdsByExercise.get(row.id) ?? [] }));
  }),

  listRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }).optional())
    .query(({ ctx, input }) =>
      db
        .select({
          id: exercises.id,
          name: exercises.name,
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
    const groupIdsByExercise = await getGroupIdsByExercise([exercise.id]);

    return { ...exercise, setsCount, groupIds: groupIdsByExercise.get(exercise.id) ?? [] };
  }),

  create: protectedProcedure.input(createExerciseInput).mutation(async ({ ctx, input }) => {
    const { groupIds, ...values } = input;
    await assertOwnsGroups(groupIds, ctx.userId);

    try {
      return await db.transaction(async (tx) => {
        const [exercise] = await tx
          .insert(exercises)
          .values({ ...values, userId: ctx.userId })
          .returning();

        if (groupIds.length > 0) {
          await tx.insert(exerciseGroupMembers).values(groupIds.map((groupId) => ({ exerciseId: exercise.id, groupId })));
        }

        return { ...exercise, groupIds };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TRPCError({ code: "CONFLICT", message: "An exercise with this name already exists." });
      }
      throw error;
    }
  }),

  update: protectedProcedure.input(updateExerciseInput).mutation(async ({ ctx, input }) => {
    const { id, groupIds, ...values } = input;
    await assertOwnsGroups(groupIds, ctx.userId);

    try {
      return await db.transaction(async (tx) => {
        const [exercise] = await tx
          .update(exercises)
          .set(values)
          .where(and(eq(exercises.id, id), eq(exercises.userId, ctx.userId)))
          .returning();

        if (!exercise) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await tx.delete(exerciseGroupMembers).where(eq(exerciseGroupMembers.exerciseId, id));
        if (groupIds.length > 0) {
          await tx.insert(exerciseGroupMembers).values(groupIds.map((groupId) => ({ exerciseId: id, groupId })));
        }

        return { ...exercise, groupIds };
      });
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
