import { router } from "../trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { chatRouter } from "./chat";
import { communityRouter } from "./community";
import { exerciseRouter } from "./exercise";
import { groupRouter } from "./group";
import { healthRouter } from "./health";
import { setRouter } from "./set";
import { settingsRouter } from "./settings";
import { statsRouter } from "./stats";
import { trainingPlanRouter } from "./training-plan";
import { workoutRouter } from "./workout";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  admin: adminRouter,
  chat: chatRouter,
  community: communityRouter,
  exercise: exerciseRouter,
  group: groupRouter,
  set: setRouter,
  settings: settingsRouter,
  stats: statsRouter,
  workout: workoutRouter,
  trainingPlan: trainingPlanRouter,
});

export type AppRouter = typeof appRouter;
