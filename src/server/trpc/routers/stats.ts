import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { exercises, sets } from "@/server/db/schema";
import { protectedProcedure, router } from "../trpc";

export const statsRouter = router({
  // Returns raw timestamps; the client buckets them into local calendar days
  // for the heatmap so day boundaries match the user's own timezone.
  heatmap: protectedProcedure.query(({ ctx }) =>
    db.select({ performedAt: sets.performedAt }).from(sets).where(eq(sets.userId, ctx.userId)),
  ),

  aggregates: protectedProcedure.query(async ({ ctx }) => {
    const [totals] = await db
      .select({
        totalSets: count(),
        totalTrainingDays: sql<number>`count(distinct date_trunc('day', ${sets.performedAt}))`,
      })
      .from(sets)
      .where(eq(sets.userId, ctx.userId));

    const setCount = count(sets.id);
    const exerciseSetCounts = await db
      .select({
        exerciseId: exercises.id,
        name: exercises.name,
        setCount,
      })
      .from(exercises)
      .innerJoin(sets, eq(sets.exerciseId, exercises.id))
      .where(eq(exercises.userId, ctx.userId))
      .groupBy(exercises.id)
      .orderBy(desc(setCount));

    return {
      totalSets: totals.totalSets,
      totalTrainingDays: Number(totals.totalTrainingDays),
      exerciseSetCounts,
    };
  }),
});
