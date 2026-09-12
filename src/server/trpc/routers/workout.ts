import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { exercises, workoutExercises, workouts } from "@/server/db/schema";
import { readProcedure, router, writeProcedure } from "../trpc";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

// One entry per set — a null entry means "not fixed for that particular set,
// log it during the workout instead," so a plan can mix a fixed pyramid
// (10/8/6) with the occasional to-failure set. The whole field is omitted
// when it was never defined at all (every set behaves as to-failure).
const targetIntArray = z.array(z.number().int().min(0).nullable());
const targetWeightArray = z.array(z.number().min(0).nullable());

const workoutExerciseInput = z
  .object({
    exerciseId: z.string().uuid(),
    setsCount: z.number().int().min(1).max(20),
    targetReps: targetIntArray.optional(),
    targetTimeSeconds: targetIntArray.optional(),
    targetWeightKg: targetWeightArray.optional(),
    // Rest between sets of this exercise — undefined ("define pause" left
    // unchecked) means no fixed rest, rest as long as you want.
    restSeconds: z.number().int().min(0).optional(),
  })
  .refine(
    (value) =>
      [value.targetReps, value.targetTimeSeconds, value.targetWeightKg].every(
        (target) => target === undefined || target.length === value.setsCount,
      ),
    { message: "Each defined target must have exactly one entry per set." },
  );

const workoutInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  exercises: z.array(workoutExerciseInput).min(1, "Add at least one exercise"),
});

export const workoutRouter = router({
  list: readProcedure.query(({ ctx }) =>
    db.select().from(workouts).where(eq(workouts.userId, ctx.viewUserId)).orderBy(workouts.name),
  ),

  getById: readProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    // Both queries key off input.id alone — run together rather than
    // waiting on the workout row before asking for its exercises.
    const [[workout], exerciseRows] = await Promise.all([
      db
        .select()
        .from(workouts)
        .where(and(eq(workouts.id, input.id), eq(workouts.userId, ctx.viewUserId))),
      db
        .select({
          id: workoutExercises.id,
          exerciseId: workoutExercises.exerciseId,
          exerciseName: exercises.name,
          exerciseUserId: exercises.userId,
          tracksReps: exercises.tracksReps,
          tracksTime: exercises.tracksTime,
          tracksWeight: exercises.tracksWeight,
          setsCount: workoutExercises.setsCount,
          targetReps: workoutExercises.targetReps,
          targetTimeSeconds: workoutExercises.targetTimeSeconds,
          targetWeightKg: workoutExercises.targetWeightKg,
          restSeconds: workoutExercises.restSeconds,
        })
        .from(workoutExercises)
        .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
        .where(eq(workoutExercises.workoutId, input.id))
        .orderBy(asc(workoutExercises.position)),
    ]);
    if (!workout) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return { ...workout, exercises: exerciseRows };
  }),

  create: writeProcedure.input(workoutInput).mutation(async ({ ctx, input }) => {
    try {
      return await db.transaction(async (tx) => {
        const [workout] = await tx.insert(workouts).values({ userId: ctx.userId, name: input.name }).returning();
        await tx
          .insert(workoutExercises)
          .values(input.exercises.map((exercise, position) => ({ workoutId: workout.id, position, ...exercise })));
        return workout;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TRPCError({ code: "CONFLICT", message: "A workout with this name already exists." });
      }
      throw error;
    }
  }),

  update: writeProcedure.input(workoutInput.extend({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { id, exercises: exerciseInputs, ...values } = input;
    try {
      return await db.transaction(async (tx) => {
        const [workout] = await tx
          .update(workouts)
          .set(values)
          .where(and(eq(workouts.id, id), eq(workouts.userId, ctx.userId)))
          .returning();
        if (!workout) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, id));
        await tx
          .insert(workoutExercises)
          .values(exerciseInputs.map((exercise, position) => ({ workoutId: id, position, ...exercise })));

        return workout;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TRPCError({ code: "CONFLICT", message: "A workout with this name already exists." });
      }
      throw error;
    }
  }),

  delete: writeProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [deleted] = await db
      .delete(workouts)
      .where(and(eq(workouts.id, input.id), eq(workouts.userId, ctx.userId)))
      .returning({ id: workouts.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return deleted;
  }),
});
