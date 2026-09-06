import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { emailToUsername, isSyntheticEmail, usernameToEmail } from "@/lib/username";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { applyStandardGrouping } from "@/server/db/standard-groups";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const USERNAME_TAKEN_MESSAGE = "That username is already taken.";

function assertValidUsername(username: string) {
  if (!USERNAME_PATTERN.test(username)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Username can only contain letters, numbers, underscores, and hyphens — no spaces.",
    });
  }
}

async function isUsernameTaken(username: string): Promise<boolean> {
  const [existing] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(sql`lower(${profiles.username}) = lower(${username})`);
  return existing !== undefined;
}

type AuthUserRow = { id: string; email: string };

export const authRouter = router({
  // Prefers the profiles.username column; falls back to deriving it from a
  // still-synthetic email for an account that hasn't gone through
  // /verify-email yet (whose profiles.username may not be set).
  me: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await db.select({ username: profiles.username }).from(profiles).where(eq(profiles.userId, ctx.userId));
    if (profile?.username) {
      return { username: profile.username };
    }

    const [row] = (await db.execute(sql`select email from auth.users where id = ${ctx.userId}`)) as unknown as { email: string }[];
    return { username: emailToUsername(row.email) };
  }),

  // The login form only ever collects a username — this resolves the email
  // Supabase's signInWithPassword actually needs, client-side, before it
  // calls that. Checks profiles.username first (real-email accounts, the
  // normal case going forward), then falls back to the old synthetic-email
  // scheme so an account that hasn't been through /verify-email yet can
  // still log in exactly as before.
  resolveLoginEmail: publicProcedure.input(z.object({ username: z.string().trim().min(1) })).query(async ({ input }) => {
    const [profile] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(sql`lower(${profiles.username}) = lower(${input.username})`);

    if (profile) {
      const [row] = (await db.execute(
        sql`select email from auth.users where id = ${profile.userId}`,
      )) as unknown as AuthUserRow[];
      if (row) return { email: row.email };
    }

    const syntheticEmail = usernameToEmail(input.username);
    const [legacy] = (await db.execute(
      sql`select id from auth.users where email = ${syntheticEmail}`,
    )) as unknown as { id: string }[];
    return { email: legacy ? syntheticEmail : null };
  }),

  // Cheap pre-check for the registration form's immediate feedback —
  // completeRegistration re-validates authoritatively (the unique index is
  // the real backstop), since a name could be taken by the time it's called.
  checkUsernameAvailable: publicProcedure.input(z.object({ username: z.string().trim().min(1) })).query(async ({ input }) => {
    if (!USERNAME_PATTERN.test(input.username)) return { available: false };
    return { available: !(await isUsernameTaken(input.username)) };
  }),

  // Called once the client has already done supabase.auth.signUp(...) and
  // verifyOtp(...) — this only creates the app-level profile row (username +
  // default grouping) for the now-verified, now-authenticated account.
  // Registration itself needs no server involvement: a real email passes
  // Supabase's public signup validation, so there's no reason to route it
  // through the admin-bypass the old synthetic-email scheme needed.
  completeRegistration: protectedProcedure
    .input(z.object({ username: z.string().trim().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      assertValidUsername(input.username);

      const [existingProfile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId));
      if (existingProfile?.username) {
        // Already completed (e.g. a retried request) — nothing to do.
        return { success: true };
      }

      if (await isUsernameTaken(input.username)) {
        throw new TRPCError({ code: "CONFLICT", message: USERNAME_TAKEN_MESSAGE });
      }

      if (existingProfile) {
        await db.update(profiles).set({ username: input.username }).where(eq(profiles.userId, ctx.userId));
      } else {
        await db.insert(profiles).values({ userId: ctx.userId, username: input.username });
      }

      await applyStandardGrouping(ctx.userId);
      return { success: true };
    }),

  // Whether this account still needs to go through /verify-email — the
  // proxy checks this from the session's email directly (no DB round trip
  // needed there); this is for the client-side page itself to double-check
  // before showing the "add your email" form.
  needsEmailVerification: protectedProcedure.query(async ({ ctx }) => {
    const [row] = (await db.execute(sql`select email from auth.users where id = ${ctx.userId}`)) as unknown as { email: string }[];
    return { needsVerification: isSyntheticEmail(row.email) };
  }),
});
