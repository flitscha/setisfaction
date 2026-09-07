import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { readProcedure, router, writeProcedure } from "../trpc";

const exerciseCategoriesInput = z
  .object({ wantsCalisthenics: z.boolean(), wantsGym: z.boolean() })
  .refine((value) => value.wantsCalisthenics || value.wantsGym, {
    message: "Choose at least one.",
  });

export const settingsRouter = router({
  // Drives both the one-time onboarding step (src/app/onboarding/exercise-
  // categories) and the Settings page — same read, same write, since
  // changing your mind later is just doing the onboarding step again.
  exerciseCategories: readProcedure.query(async ({ ctx }) => {
    const [profile] = await db
      .select({ wantsCalisthenics: profiles.wantsCalisthenics, wantsGym: profiles.wantsGym })
      .from(profiles)
      .where(eq(profiles.userId, ctx.viewUserId));
    return profile ?? { wantsCalisthenics: true, wantsGym: false };
  }),

  updateExerciseCategories: writeProcedure.input(exerciseCategoriesInput).mutation(async ({ ctx, input }) => {
    await db
      .update(profiles)
      .set({ wantsCalisthenics: input.wantsCalisthenics, wantsGym: input.wantsGym })
      .where(eq(profiles.userId, ctx.userId));
    return { success: true };
  }),
});
