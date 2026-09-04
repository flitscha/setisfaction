import { router } from "../trpc";
import { exerciseRouter } from "./exercise";
import { healthRouter } from "./health";

export const appRouter = router({
  health: healthRouter,
  exercise: exerciseRouter,
});

export type AppRouter = typeof appRouter;
