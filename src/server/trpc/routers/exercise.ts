import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
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

export const exerciseRouter = router({
  list: readProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(exercises)
      .where(or(eq(exercises.userId, ctx.viewUserId), isNull(exercises.userId)))
      .orderBy(exercises.name);

    // Hide a standard exercise only once the user has an unrenamed fork of
    // it — same name would otherwise show up twice, looking like a
    // duplicate. A renamed fork reads as its own distinct exercise, so both
    // stay visible (and there's nothing to "restore" — see listHiddenStandard).
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const sameNameForkedFromIds = new Set(
      rows
        .filter((r) => r.userId === ctx.viewUserId && r.forkedFromId)
        .filter((r) => rowById.get(r.forkedFromId!)?.name.toLowerCase() === r.name.toLowerCase())
        .map((r) => r.forkedFromId),
    );
    const visible = rows.filter((r) => !(r.userId === null && sameNameForkedFromIds.has(r.id)));

    const groupIdsByExercise = await getGroupIdsByExercise(visible.map((r) => r.id), ctx.viewUserId);
    return visible.map((row) => ({ ...row, groupIds: groupIdsByExercise.get(row.id) ?? [] }));
  }),

  // Standard exercises the viewer has hidden by forking without renaming —
  // each can be brought back via resetToDefault (see the Exercises page's
  // "Hidden standard exercises" section).
  listHiddenStandard: readProcedure.query(async ({ ctx }) => {
    const ownForks = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.userId, ctx.viewUserId), isNotNull(exercises.forkedFromId)));

    if (ownForks.length === 0) return [];

    const originals = await db
      .select()
      .from(exercises)
      .where(
        inArray(
          exercises.id,
          ownForks.map((f) => f.forkedFromId!),
        ),
      );
    const originalById = new Map(originals.map((o) => [o.id, o]));

    return ownForks
      .filter((fork) => originalById.get(fork.forkedFromId!)?.name.toLowerCase() === fork.name.toLowerCase())
      .map((fork) => ({ forkId: fork.id, name: fork.name }));
  }),

  getById: readProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [exercise] = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, input.id), or(eq(exercises.userId, ctx.viewUserId), isNull(exercises.userId))));

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

    let forkedFrom: { id: string; name: string } | null = null;
    if (exercise.forkedFromId) {
      const [original] = await db.select().from(exercises).where(eq(exercises.id, exercise.forkedFromId));
      if (original) forkedFrom = { id: original.id, name: original.name };
    }

    return { ...exercise, setsCount, groupIds: groupIdsByExercise.get(exercise.id) ?? [], forkedFrom };
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

  update: writeProcedure.input(updateExerciseInput).mutation(async ({ ctx, input }) => {
    const { id, groupIds, ...values } = input;
    await assertOwnsGroups(groupIds, ctx.userId);

    const [existing] = await db.select().from(exercises).where(eq(exercises.id, id));
    if (!existing || (existing.userId !== null && existing.userId !== ctx.userId)) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    try {
      return await db.transaction(async (tx) => {
        let exercise: typeof exercises.$inferSelect;

        if (existing.userId === null) {
          // Standard (shared) exercise: don't edit the shared row itself —
          // fork a personal copy, and move only this user's own past sets
          // onto it so their history doesn't split across two exercise ids.
          [exercise] = await tx
            .insert(exercises)
            .values({ ...values, userId: ctx.userId, forkedFromId: id })
            .returning();

          await tx
            .update(sets)
            .set({ exerciseId: exercise.id })
            .where(and(eq(sets.exerciseId, id), eq(sets.userId, ctx.userId)));
        } else {
          [exercise] = await tx.update(exercises).set(values).where(eq(exercises.id, id)).returning();

          await tx.delete(exerciseGroupMembers).where(eq(exerciseGroupMembers.exerciseId, id));
        }

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

  // Undoes a fork: moves the user's own sets on it back onto the standard
  // exercise it came from, then deletes the fork. Unlike delete, this never
  // loses logged history — it's the safe way to give up a customization,
  // whether or not the fork was renamed.
  resetToDefault: writeProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [existing] = await db.select().from(exercises).where(eq(exercises.id, input.id));
    if (!existing || existing.userId !== ctx.userId || !existing.forkedFromId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const originalId = existing.forkedFromId;

    await db.transaction(async (tx) => {
      await tx
        .update(sets)
        .set({ exerciseId: originalId })
        .where(and(eq(sets.exerciseId, input.id), eq(sets.userId, ctx.userId)));
      // Cascades exercise_group_members for the fork; the standard exercise's
      // own group membership (from registration) was never touched.
      await tx.delete(exercises).where(eq(exercises.id, input.id));
    });

    return { originalId };
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
