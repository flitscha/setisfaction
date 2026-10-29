import { and, eq, inArray } from "drizzle-orm";
import type { TrackedField } from "@/lib/stats";
import { db } from "@/server/db";
import { exercisePrSettings } from "@/server/db/schema";

// This user's stored PR-field choice per exercise. Exercises without a row
// are simply missing from the map — callers resolve them with
// lib/pr.ts's effectivePrFields, which falls back to the default.
export async function getStoredPrFields(userId: string, exerciseIds: string[]): Promise<Map<string, TrackedField[]>> {
  if (exerciseIds.length === 0) return new Map();
  const rows = await db
    .select({ exerciseId: exercisePrSettings.exerciseId, prFields: exercisePrSettings.prFields })
    .from(exercisePrSettings)
    .where(and(eq(exercisePrSettings.userId, userId), inArray(exercisePrSettings.exerciseId, exerciseIds)));
  return new Map(rows.map((row) => [row.exerciseId, row.prFields]));
}
