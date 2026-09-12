import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { exercises, sets, trainingPlanWorkouts, trainingPlans, workoutExercises, workouts } from "@/server/db/schema";
import { readProcedure, router, writeProcedure } from "../trpc";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

// weekday matches JS's Date#getDay() (0 = Sunday .. 6 = Saturday) — the
// client computes it locally (never on the server, which doesn't know the
// user's timezone; same reasoning as set.listByDay's dayStart/dayEnd).
const scheduleEntry = z.object({ weekday: z.number().int().min(0).max(6), workoutId: z.string().uuid().nullable() });

const planInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  schedule: z.array(scheduleEntry).max(7),
});

async function assertOwnsWorkouts(workoutIds: string[], userId: string) {
  if (workoutIds.length === 0) return;
  const owned = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(inArray(workouts.id, workoutIds), eq(workouts.userId, userId)));
  if (owned.length !== workoutIds.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "One or more workouts don't exist." });
  }
}

function onlyScheduledDays(schedule: z.infer<typeof scheduleEntry>[]) {
  return schedule.filter((day): day is { weekday: number; workoutId: string } => day.workoutId !== null);
}

// One exercise slot's target values plus how many sets have already been
// logged today (or yesterday, for a missed catch-up day) — counts *any*
// logged set for that exercise that day, whether it came from checking off
// this workout or from the normal "New set" flow, so the two never
// disagree about what's already done.
async function loadWorkoutProgress(workoutId: string, userId: string, dayStart: Date, dayEnd: Date) {
  const exerciseRows = await db
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
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.position));

  if (exerciseRows.length === 0) return null;

  const loggedCounts = await db
    .select({ exerciseId: sets.exerciseId, loggedCount: count() })
    .from(sets)
    .where(
      and(
        eq(sets.userId, userId),
        inArray(
          sets.exerciseId,
          exerciseRows.map((e) => e.exerciseId),
        ),
        gte(sets.performedAt, dayStart),
        lt(sets.performedAt, dayEnd),
      ),
    )
    .groupBy(sets.exerciseId);
  const loggedByExercise = new Map(loggedCounts.map((r) => [r.exerciseId, r.loggedCount]));

  const exercisesWithProgress = exerciseRows.map((e) => ({ ...e, loggedCount: loggedByExercise.get(e.exerciseId) ?? 0 }));
  const isComplete = exercisesWithProgress.every((e) => e.loggedCount >= e.setsCount);
  return { exercises: exercisesWithProgress, isComplete };
}

export const trainingPlanRouter = router({
  list: readProcedure.query(({ ctx }) =>
    db.select().from(trainingPlans).where(eq(trainingPlans.userId, ctx.viewUserId)).orderBy(trainingPlans.name),
  ),

  getById: readProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    // Both queries key off input.id alone — run together rather than
    // waiting on the plan row before asking for its schedule.
    const [[plan], scheduleRows] = await Promise.all([
      db
        .select()
        .from(trainingPlans)
        .where(and(eq(trainingPlans.id, input.id), eq(trainingPlans.userId, ctx.viewUserId))),
      db
        .select({ weekday: trainingPlanWorkouts.weekday, workoutId: trainingPlanWorkouts.workoutId })
        .from(trainingPlanWorkouts)
        .where(eq(trainingPlanWorkouts.trainingPlanId, input.id)),
    ]);
    if (!plan) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return { ...plan, schedule: scheduleRows };
  }),

  create: writeProcedure.input(planInput).mutation(async ({ ctx, input }) => {
    await assertOwnsWorkouts(
      input.schedule.map((d) => d.workoutId).filter((id): id is string => id !== null),
      ctx.userId,
    );

    try {
      return await db.transaction(async (tx) => {
        // A brand-new plan starts active when the user doesn't already have
        // one — otherwise the very first plan someone builds would need a
        // second, separate "activate" step before it does anything on
        // Today, which isn't obvious the first time through this feature.
        // Creating an alternate/deload plan later never overrides an
        // existing active one this way.
        const [existingActive] = await tx
          .select({ id: trainingPlans.id })
          .from(trainingPlans)
          .where(and(eq(trainingPlans.userId, ctx.userId), eq(trainingPlans.isActive, true)));

        const [plan] = await tx
          .insert(trainingPlans)
          .values({ userId: ctx.userId, name: input.name, isActive: !existingActive })
          .returning();
        const scheduledDays = onlyScheduledDays(input.schedule);
        if (scheduledDays.length > 0) {
          await tx
            .insert(trainingPlanWorkouts)
            .values(scheduledDays.map((day) => ({ trainingPlanId: plan.id, weekday: day.weekday, workoutId: day.workoutId })));
        }
        return plan;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TRPCError({ code: "CONFLICT", message: "A plan with this name already exists." });
      }
      throw error;
    }
  }),

  update: writeProcedure.input(planInput.extend({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { id, schedule, ...values } = input;
    await assertOwnsWorkouts(
      schedule.map((d) => d.workoutId).filter((wid): wid is string => wid !== null),
      ctx.userId,
    );

    try {
      return await db.transaction(async (tx) => {
        const [plan] = await tx
          .update(trainingPlans)
          .set(values)
          .where(and(eq(trainingPlans.id, id), eq(trainingPlans.userId, ctx.userId)))
          .returning();
        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await tx.delete(trainingPlanWorkouts).where(eq(trainingPlanWorkouts.trainingPlanId, id));
        const scheduledDays = onlyScheduledDays(schedule);
        if (scheduledDays.length > 0) {
          await tx
            .insert(trainingPlanWorkouts)
            .values(scheduledDays.map((day) => ({ trainingPlanId: id, weekday: day.weekday, workoutId: day.workoutId })));
        }
        return plan;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TRPCError({ code: "CONFLICT", message: "A plan with this name already exists." });
      }
      throw error;
    }
  }),

  delete: writeProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [deleted] = await db
      .delete(trainingPlans)
      .where(and(eq(trainingPlans.id, input.id), eq(trainingPlans.userId, ctx.userId)))
      .returning({ id: trainingPlans.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return deleted;
  }),

  // The partial unique index (one active plan per user) is the real
  // backstop; this just clears any previously-active plan first so setting
  // a new one active doesn't collide with it.
  setActive: writeProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await db.transaction(async (tx) => {
      await tx
        .update(trainingPlans)
        .set({ isActive: false })
        .where(and(eq(trainingPlans.userId, ctx.userId), eq(trainingPlans.isActive, true)));

      const [plan] = await tx
        .update(trainingPlans)
        .set({ isActive: true })
        .where(and(eq(trainingPlans.id, input.id), eq(trainingPlans.userId, ctx.userId)))
        .returning({ id: trainingPlans.id });
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
    });
    return { success: true };
  }),

  deactivate: writeProcedure.mutation(async ({ ctx }) => {
    await db
      .update(trainingPlans)
      .set({ isActive: false })
      .where(and(eq(trainingPlans.userId, ctx.userId), eq(trainingPlans.isActive, true)));
    return { success: true };
  }),

  // Drives the Today page's workout card: the active plan's workout for
  // today, or — if yesterday's was scheduled and left incomplete — that one
  // instead, as a one-day catch-up (see loadWorkoutProgress for what
  // "incomplete" means). Never looks back further than one day: once a new
  // day passes, a missed day quietly stops being "yesterday" and the prompt
  // goes away on its own rather than needing to be dismissed.
  todayWorkout: readProcedure
    .input(
      z.object({
        todayWeekday: z.number().int().min(0).max(6),
        yesterdayWeekday: z.number().int().min(0).max(6),
        todayStart: z.date(),
        todayEnd: z.date(),
        yesterdayStart: z.date(),
        yesterdayEnd: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [activePlan] = await db
        .select({ id: trainingPlans.id })
        .from(trainingPlans)
        .where(and(eq(trainingPlans.userId, ctx.viewUserId), eq(trainingPlans.isActive, true)));
      if (!activePlan) return null;

      const scheduleRows = await db
        .select({ weekday: trainingPlanWorkouts.weekday, workoutId: trainingPlanWorkouts.workoutId })
        .from(trainingPlanWorkouts)
        .where(
          and(
            eq(trainingPlanWorkouts.trainingPlanId, activePlan.id),
            inArray(trainingPlanWorkouts.weekday, [input.todayWeekday, input.yesterdayWeekday]),
          ),
        );
      const todayWorkoutId = scheduleRows.find((r) => r.weekday === input.todayWeekday)?.workoutId ?? null;
      const yesterdayWorkoutId = scheduleRows.find((r) => r.weekday === input.yesterdayWeekday)?.workoutId ?? null;

      async function workoutCard(workoutId: string, dayStart: Date, dayEnd: Date, isCatchUp: boolean) {
        // Both only need workoutId, known upfront — run together.
        const [progress, [workout]] = await Promise.all([
          loadWorkoutProgress(workoutId, ctx.viewUserId, dayStart, dayEnd),
          db.select({ name: workouts.name }).from(workouts).where(eq(workouts.id, workoutId)),
        ]);
        if (!progress) return null;
        return { workoutId, workoutName: workout?.name ?? "Workout", isCatchUp, ...progress };
      }

      if (yesterdayWorkoutId) {
        // Counts through the end of *today*, not just yesterday: a set
        // logged today to finish off a missed catch-up exercise still has
        // today's timestamp (it shows in today's normal set list, per the
        // spec), so progress toward the catch-up has to include today's
        // window too or checking off an exercise here would never register.
        const yesterday = await workoutCard(yesterdayWorkoutId, input.yesterdayStart, input.todayEnd, true);
        if (yesterday && !yesterday.isComplete) return yesterday;
      }

      if (todayWorkoutId) {
        const today = await workoutCard(todayWorkoutId, input.todayStart, input.todayEnd, false);
        if (today) return today;
      }

      return null;
    }),
});
