import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { exerciseGroups } from "@/server/db/schema";
import { protectedProcedure, router } from "../trpc";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

export const groupRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    db.select().from(exerciseGroups).where(eq(exerciseGroups.userId, ctx.userId)).orderBy(exerciseGroups.name),
  ),

  create: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1, "Name is required").max(50) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [group] = await db
          .insert(exerciseGroups)
          .values({ name: input.name, userId: ctx.userId })
          .returning();
        return group;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({ code: "CONFLICT", message: "A group with this name already exists." });
        }
        throw error;
      }
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().trim().min(1, "Name is required").max(50) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [group] = await db
          .update(exerciseGroups)
          .set({ name: input.name })
          .where(and(eq(exerciseGroups.id, input.id), eq(exerciseGroups.userId, ctx.userId)))
          .returning();

        if (!group) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return group;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({ code: "CONFLICT", message: "A group with this name already exists." });
        }
        throw error;
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [deleted] = await db
      .delete(exerciseGroups)
      .where(and(eq(exerciseGroups.id, input.id), eq(exerciseGroups.userId, ctx.userId)))
      .returning({ id: exerciseGroups.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return deleted;
  }),
});
