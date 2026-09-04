import { router } from "../trpc";
import { exerciseRouter } from "./exercise";
import { healthRouter } from "./health";
import { setRouter } from "./set";

export const appRouter = router({
  health: healthRouter,
  exercise: exerciseRouter,
  set: setRouter,
});

export type AppRouter = typeof appRouter;
