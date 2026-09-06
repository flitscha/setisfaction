import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, isNotNull, isNull, notInArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { exerciseGroupMembers, exerciseGroups, exercises, sets } from "@/server/db/schema";
import { readProcedure, router, writeProcedure } from "../trpc";

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

// Scoped to the viewing user's own groups — a shared exercise's id can be
// filed into other users' groups too (e.g. via their own seed run), which
// isn't this viewer's grouping to see.
async function getGroupIdsByExercise(exerciseIds: string[], userId: string): Promise<Map<string, string[]>> {
  if (exerciseIds.length === 0) return new Map();
  const rows = await db
    .select({ exerciseId: exerciseGroupMembers.exerciseId, groupId: exerciseGroupMembers.groupId })
    .from(exerciseGroupMembers)
    .innerJoin(exerciseGroups, eq(exerciseGroups.id, exerciseGroupMembers.groupId))
    .where(and(inArray(exerciseGroupMembers.exerciseId, exerciseIds), eq(exerciseGroups.userId, userId)));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const existing = map.get(row.exerciseId);
    if (existing) existing.push(row.groupId);
    else map.set(row.exerciseId, [row.groupId]);
  }
  return map;
}

// Standard exercises this user has forked (to change tracked fields) —
// hidden from their lists in favor of the personal fork that replaces them.
async function getForkedAwayStandardIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ forkedFromId: exercises.forkedFromId })
    .from(exercises)
    .where(and(eq(exercises.userId, userId), isNotNull(exercises.forkedFromId)));
  return rows.map((r) => r.forkedFromId).filter((id): id is string => id !== null);
}

export const exerciseRouter = router({
  list: readProcedure.query(async ({ ctx }) => {
    const forkedAwayIds = await getForkedAwayStandardIds(ctx.viewUserId);

    const rows = await db
      .select()
      .from(exercises)
      .where(
        and(
          or(eq(exercises.userId, ctx.viewUserId), isNull(exercises.userId)),
          forkedAwayIds.length > 0 ? notInArray(exercises.id, forkedAwayIds) : undefined,
        ),
      )
      .orderBy(exercises.name);

    const groupIdsByExercise = await getGroupIdsByExercise(rows.map((r) => r.id), ctx.viewUserId);
    return rows.map((row) => ({ ...row, groupIds: groupIdsByExercise.get(row.id) ?? [] }));
  }),

  getById: readProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const forkedAwayIds = await getForkedAwayStandardIds(ctx.viewUserId);

    const [exercise] = await db
      .select()
      .from(exercises)
      .where(
        and(
          eq(exercises.id, input.id),
          or(eq(exercises.userId, ctx.viewUserId), isNull(exercises.userId)),
          forkedAwayIds.length > 0 ? notInArray(exercises.id, forkedAwayIds) : undefined,
        ),
      );

    if (!exercise) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Scoped to this user's own sets — a standard exercise can be shared
    // with sets logged by other users too, which aren't this viewer's to count.
    const [{ value: setsCount }] = await db
      .select({ value: count() })
      .from(sets)
      .where(and(eq(sets.exerciseId, input.id), eq(sets.userId, ctx.viewUserId)));
    const groupIdsByExercise = await getGroupIdsByExercise([exercise.id], ctx.viewUserId);

    return { ...exercise, setsCount, groupIds: groupIdsByExercise.get(exercise.id) ?? [] };
  }),

  create: writeProcedure.input(createExerciseInput).mutation(async ({ ctx, input }) => {
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

  // Standard (userId-null) exercises are never editable this way — the name
  // and description have to stay identical for everyone so training on them
  // stays comparable. Only a user's own exercises can be renamed/redescribed;
  // see updateStandard for what a standard exercise's own page can change.
  update: writeProcedure.input(updateExerciseInput).mutation(async ({ ctx, input }) => {
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

  // What a standard exercise's own page can change: this user's grouping of
  // it, always; and its tracked fields, by forking. The shared definition
  // itself must stay identical for everyone, so a different reps/time/weight
  // combo becomes this user's own exercise instead — same name, taking over
  // their past sets on it — rather than changing the standard for everyone.
  // See restoreStandard to undo a fork.
  updateStandard: writeProcedure
    .input(
      z
        .object({
          id: z.string().uuid(),
          groupIds: z.array(z.string().uuid()).default([]),
          tracksReps: z.boolean(),
          tracksTime: z.boolean(),
          tracksWeight: z.boolean(),
        })
        .refine(hasTrackedField, trackedFieldIssue),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, groupIds, tracksReps, tracksTime, tracksWeight } = input;
      await assertOwnsGroups(groupIds, ctx.userId);

      const [standard] = await db
        .select()
        .from(exercises)
        .where(and(eq(exercises.id, id), isNull(exercises.userId)));
      if (!standard) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const typeUnchanged =
        tracksReps === standard.tracksReps &&
        tracksTime === standard.tracksTime &&
        tracksWeight === standard.tracksWeight;

      if (typeUnchanged) {
        const ownGroups = await db
          .select({ id: exerciseGroups.id })
          .from(exerciseGroups)
          .where(eq(exerciseGroups.userId, ctx.userId));
        const ownGroupIds = ownGroups.map((g) => g.id);

        await db.transaction(async (tx) => {
          if (ownGroupIds.length > 0) {
            await tx
              .delete(exerciseGroupMembers)
              .where(and(eq(exerciseGroupMembers.exerciseId, id), inArray(exerciseGroupMembers.groupId, ownGroupIds)));
          }
          if (groupIds.length > 0) {
            await tx.insert(exerciseGroupMembers).values(groupIds.map((groupId) => ({ exerciseId: id, groupId })));
          }
        });

        return { forked: false as const, exerciseId: id };
      }

      try {
        const fork = await db.transaction(async (tx) => {
          const [fork] = await tx
            .insert(exercises)
            .values({
              userId: ctx.userId,
              name: standard.name,
              description: standard.description,
              tracksReps,
              tracksTime,
              tracksWeight,
              forkedFromId: standard.id,
            })
            .returning();

          await tx
            .update(sets)
            .set({ exerciseId: fork.id })
            .where(and(eq(sets.exerciseId, standard.id), eq(sets.userId, ctx.userId)));

          if (groupIds.length > 0) {
            await tx.insert(exerciseGroupMembers).values(groupIds.map((groupId) => ({ exerciseId: fork.id, groupId })));
          }

          return fork;
        });

        return { forked: true as const, exerciseId: fork.id };
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({ code: "CONFLICT", message: "You already have an exercise with this name." });
        }
        throw error;
      }
    }),

  // Undoes a fork created by updateStandard: moves this user's sets back
  // onto the standard exercise and removes the personal fork, which brings
  // the standard back into their lists (with its grouping as it was before).
  restoreStandard: writeProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [fork] = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, input.id), eq(exercises.userId, ctx.userId)));

    if (!fork || !fork.forkedFromId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const forkedFromId = fork.forkedFromId;

    await db.transaction(async (tx) => {
      await tx
        .update(sets)
        .set({ exerciseId: forkedFromId })
        .where(and(eq(sets.exerciseId, fork.id), eq(sets.userId, ctx.userId)));
      await tx.delete(exercises).where(eq(exercises.id, fork.id));
    });

    return { exerciseId: forkedFromId };
  }),

  delete: writeProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // eq(userId, ctx.userId) already excludes standard (userId-null) exercises —
    // SQL equality never matches NULL, so there's nothing shared to accidentally delete here.
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
