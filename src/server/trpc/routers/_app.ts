import { router } from "../trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { communityRouter } from "./community";
import { exerciseRouter } from "./exercise";
import { groupRouter } from "./group";
import { healthRouter } from "./health";
import { setRouter } from "./set";
import { statsRouter } from "./stats";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  admin: adminRouter,
  community: communityRouter,
  exercise: exerciseRouter,
  group: groupRouter,
  set: setRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
