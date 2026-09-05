import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { exerciseGroupMembers, exerciseGroups, exercises, sets } from "@/server/db/schema";
import { readProcedure, router } from "../trpc";

export const statsRouter = router({
  // Returns raw timestamps; the client buckets them into local calendar days
  // for the heatmap so day boundaries match the user's own timezone.
  heatmap: readProcedure.query(({ ctx }) =>
    db.select({ performedAt: sets.performedAt }).from(sets).where(eq(sets.userId, ctx.viewUserId)),
  ),

  aggregates: readProcedure.query(async ({ ctx }) => {
    const [totals] = await db
      .select({
        totalSets: count(),
        totalTrainingDays: sql<number>`count(distinct date_trunc('day', ${sets.performedAt}))`,
      })
      .from(sets)
      .where(eq(sets.userId, ctx.viewUserId));

    const setCount = count(sets.id);
    const exerciseSetCounts = await db
      .select({
        exerciseId: exercises.id,
        name: exercises.name,
        setCount,
      })
      .from(exercises)
      .innerJoin(sets, eq(sets.exerciseId, exercises.id))
      .where(eq(exercises.userId, ctx.viewUserId))
      .groupBy(exercises.id)
      .orderBy(desc(setCount));

    return {
      totalSets: totals.totalSets,
      totalTrainingDays: Number(totals.totalTrainingDays),
      exerciseSetCounts,
    };
  }),

  // One row per group the user has defined, even if it has zero sets — that's
  // the signal for "did I skip leg day" the overview is meant to surface.
  groupAggregates: readProcedure.query(async ({ ctx }) => {
    const totalSets = count(sets.id);
    const rows = await db
      .select({
        groupId: exerciseGroups.id,
        name: exerciseGroups.name,
        totalSets,
        totalTrainingDays: sql<number>`count(distinct date_trunc('day', ${sets.performedAt}))`,
        // The postgres driver returns a raw max() aggregate as a string, not a Date.
        lastTrainedAt: sql<string | null>`max(${sets.performedAt})`,
      })
      .from(exerciseGroups)
      .leftJoin(exerciseGroupMembers, eq(exerciseGroupMembers.groupId, exerciseGroups.id))
      .leftJoin(sets, and(eq(sets.exerciseId, exerciseGroupMembers.exerciseId), eq(sets.userId, ctx.viewUserId)))
      .where(eq(exerciseGroups.userId, ctx.viewUserId))
      .groupBy(exerciseGroups.id)
      .orderBy(exerciseGroups.name);

    return rows.map((row) => ({
      ...row,
      totalTrainingDays: Number(row.totalTrainingDays),
      // The postgres driver returns a raw max() aggregate as a string, not a Date.
      lastTrainedAt: row.lastTrainedAt ? new Date(row.lastTrainedAt) : null,
    }));
  }),

  groupTimeline: readProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      db
        .select({ performedAt: sets.performedAt })
        .from(sets)
        .innerJoin(exerciseGroupMembers, eq(exerciseGroupMembers.exerciseId, sets.exerciseId))
        .where(and(eq(sets.userId, ctx.viewUserId), eq(exerciseGroupMembers.groupId, input.groupId))),
    ),
});
