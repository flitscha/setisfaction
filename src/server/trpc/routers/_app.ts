import { router } from "../trpc";
import { exerciseRouter } from "./exercise";
import { healthRouter } from "./health";
import { setRouter } from "./set";
import { statsRouter } from "./stats";

export const appRouter = router({
  health: healthRouter,
  exercise: exerciseRouter,
  set: setRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
