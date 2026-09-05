import { TRPCError } from "@trpc/server";
import { count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/server/db";
import { exerciseGroups, exercises, profiles, sets } from "@/server/db/schema";
import { adminProcedure, protectedProcedure, router } from "../trpc";

// Supabase Auth's users live in the auth schema, not one Drizzle manages
// migrations for — read directly via raw SQL instead of modeling the table.
type AuthUserRow = { id: string; email: string; created_at: string };

function usernameFromEmail(email: string): string {
  return email.replace(/@setisfaction\.local$/, "");
}

export const adminRouter = router({
  // Any signed-in user can check their own admin status, so the UI can
  // decide whether to show the admin entry point at all.
  isAdmin: protectedProcedure.query(({ ctx }) => ctx.isAdmin),

  listUsers: adminProcedure.query(async () => {
    const authUsers = (await db.execute(
      sql`select id, email, created_at from auth.users order by created_at`,
    )) as unknown as AuthUserRow[];

    const profileRows = await db.select().from(profiles);
    const isAdminByUserId = new Map(profileRows.map((p) => [p.userId, p.isAdmin]));

    const setCounts = await db.select({ userId: sets.userId, setCount: count() }).from(sets).groupBy(sets.userId);
    const setCountByUserId = new Map(setCounts.map((row) => [row.userId, row.setCount]));

    return authUsers.map((row) => ({
      userId: row.id,
      username: usernameFromEmail(row.email),
      createdAt: new Date(row.created_at),
      isAdmin: isAdminByUserId.get(row.id) ?? false,
      totalSets: setCountByUserId.get(row.id) ?? 0,
    }));
  }),

  // Identity only — the target user's actual data (today/exercises/stats) is
  // fetched by the same routers/queries their own pages use, scoped via
  // ctx.viewUserId (see readProcedure in trpc.ts) once ViewAsRegistration
  // registers this userId.
  getUser: adminProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ input }) => {
    const [authUser] = (await db.execute(
      sql`select id, email, created_at from auth.users where id = ${input.userId}`,
    )) as unknown as AuthUserRow[];

    if (!authUser) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      userId: authUser.id,
      username: usernameFromEmail(authUser.email),
      createdAt: new Date(authUser.created_at),
    };
  }),

  // Deletes all of the target user's app data, then their Supabase Auth
  // account. Irreversible — the client gates this behind typing the username.
  deleteUser: adminProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You can't delete your own account here." });
    }

    await db.transaction(async (tx) => {
      // Explicit, not just cascaded from deleting exercises below — a set
      // can be logged against a standard (shared) exercise that isn't this
      // user's own and so never gets deleted, which wouldn't cascade to it.
      await tx.delete(sets).where(eq(sets.userId, input.userId));
      // Cascades exercise_group_members via its FK.
      await tx.delete(exercises).where(eq(exercises.userId, input.userId));
      await tx.delete(exerciseGroups).where(eq(exerciseGroups.userId, input.userId));
      await tx.delete(profiles).where(eq(profiles.userId, input.userId));
    });

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(input.userId);
    if (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }

    return { success: true };
  }),
});
