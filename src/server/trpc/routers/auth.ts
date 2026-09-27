import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { isSyntheticEmail, usernameToEmail } from "@/lib/username";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { applyStandardGrouping } from "@/server/db/standard-groups";
import { resolveUsernames } from "@/server/db/usernames";
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
  me: protectedProcedure.query(async ({ ctx }) => {
    const [[row], [profile]] = await Promise.all([
      db.execute(sql`select email from auth.users where id = ${ctx.userId}`) as unknown as Promise<{ email: string }[]>,
      db.select({ username: profiles.username }).from(profiles).where(eq(profiles.userId, ctx.userId)),
    ]);
    const usernameByUserId = await resolveUsernames([{ id: ctx.userId, email: row.email }]);
    return {
      username: usernameByUserId.get(ctx.userId) ?? "?",
      // Signed in, but auth.ensureRegistration never completed — see
      // RegistrationGuard, which sends such an account to /onboarding.
      // Legacy synthetic-email accounts are exempt; /verify-email handles them.
      needsRegistration: !profile?.username && !isSyntheticEmail(row.email),
    };
  }),

  // The login form collects a username (or an email, which the client
  // uses directly without calling this) — this resolves the email
  // Supabase's signInWithPassword actually needs. Tries, in order:
  // profiles.username (the normal case); the old synthetic-email scheme, so
  // an account that hasn't been through /verify-email yet still logs in;
  // and the username stored in Supabase's user_metadata at signUp time,
  // which covers a confirmed account whose profile row was never created
  // (auth.ensureRegistration repairs that right after login) and an
  // unconfirmed signup, reported as such so the login page can say "confirm
  // your email first" instead of "wrong password". The email itself is
  // never returned for an unconfirmed signup.
  resolveLoginEmail: publicProcedure.input(z.object({ username: z.string().trim().min(1) })).query(async ({ input }) => {
    const [profile] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(sql`lower(${profiles.username}) = lower(${input.username})`);

    if (profile) {
      const [row] = (await db.execute(
        sql`select email from auth.users where id = ${profile.userId}`,
      )) as unknown as AuthUserRow[];
      if (row) return { email: row.email, pendingConfirmation: false };
    }

    const syntheticEmail = usernameToEmail(input.username);
    const [legacy] = (await db.execute(
      sql`select id from auth.users where email = ${syntheticEmail}`,
    )) as unknown as { id: string }[];
    if (legacy) return { email: syntheticEmail, pendingConfirmation: false };

    const [signup] = (await db.execute(
      sql`select email, email_confirmed_at is not null as confirmed from auth.users
          where lower(raw_user_meta_data->>'username') = lower(${input.username})
          order by email_confirmed_at desc nulls last, created_at desc
          limit 1`,
    )) as unknown as { email: string; confirmed: boolean }[];
    if (!signup) return { email: null, pendingConfirmation: false };
    return signup.confirmed
      ? { email: signup.email, pendingConfirmation: false }
      : { email: null, pendingConfirmation: true };
  }),

  // Cheap pre-check for the registration form's immediate feedback —
  // ensureRegistration re-validates authoritatively (the unique index is
  // the real backstop), since a name could be taken by the time it's called.
  checkUsernameAvailable: publicProcedure.input(z.object({ username: z.string().trim().min(1) })).query(async ({ input }) => {
    if (!USERNAME_PATTERN.test(input.username)) return { available: false };
    return { available: !(await isUsernameTaken(input.username)) };
  }),

  // Creates the app-level profile row (username + default grouping) for a
  // confirmed, signed-in account that doesn't have one yet — called from
  // /auth/callback's signup flow and after every login, so a registration
  // interrupted between confirming the email and this running (browser
  // closed, network dropped) repairs itself on the next login instead of
  // leaving an account with no username. The username comes from the
  // user_metadata set at signUp; `username` overrides it only when that
  // name got taken in the meantime and the user picked a new one.
  // `created` tells the client to show onboarding.
  ensureRegistration: protectedProcedure
    .input(z.object({ username: z.string().trim().min(1).max(50).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [existingProfile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId));
      if (existingProfile?.username) return { created: false };

      const [meta] = (await db.execute(
        sql`select raw_user_meta_data->>'username' as username from auth.users where id = ${ctx.userId}`,
      )) as unknown as { username: string | null }[];
      const username = input.username ?? meta?.username;
      if (!username) return { created: false };

      assertValidUsername(username);
      if (await isUsernameTaken(username)) {
        throw new TRPCError({ code: "CONFLICT", message: USERNAME_TAKEN_MESSAGE });
      }

      // Grouping first, username last: profiles.username is what marks the
      // registration as done (see the early return above), so a failure in
      // between leaves it retryable instead of permanently half-finished.
      // applyStandardGrouping is idempotent, so a retry doesn't duplicate.
      await applyStandardGrouping(ctx.userId);

      if (existingProfile) {
        await db.update(profiles).set({ username }).where(eq(profiles.userId, ctx.userId));
      } else {
        await db.insert(profiles).values({ userId: ctx.userId, username });
      }
      return { created: true };
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
