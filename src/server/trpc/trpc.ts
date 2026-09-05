import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires an authenticated Supabase session; narrows ctx.userId from `string | null` to `string`.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

// Requires the signed-in user's profile to have is_admin set.
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({ ctx });
});

// For queries only. Resolves ctx.viewUserId: the target user's id when an
// admin is browsing that user's pages read-only (ctx.viewingAsUserId),
// otherwise the signed-in user themself. Any page/component built on this
// automatically supports admin read-only viewing with no extra plumbing.
export const readProcedure = protectedProcedure.use(({ ctx, next }) => {
  return next({
    ctx: {
      ...ctx,
      viewUserId: ctx.viewingAsUserId ?? ctx.userId,
    },
  });
});

// For mutations only. Refuses to run while an admin is viewing another
// user's pages — mutations always act as ctx.userId (the admin's own
// account), so silently allowing them here would just write to the wrong
// place instead of the reader's intent; failing loudly is clearer.
export const writeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.viewingAsUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Read-only while viewing another user's data." });
  }

  return next({ ctx });
});
