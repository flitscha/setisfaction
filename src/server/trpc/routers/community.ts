import { TRPCError } from "@trpc/server";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { emailToUsername } from "@/lib/username";
import { exerciseGroups, friendRequests, friendships } from "@/server/db/schema";
import { protectedProcedure, router, writeProcedure } from "../trpc";
import { getAggregatesForUser } from "./stats";
import { listVisibleExercises } from "./exercise";
import { getSetsByExercise } from "./set";

type AuthUserRow = { id: string; email: string; created_at: string };

// Kept out of the directory (community.listUsers) specifically — not
// friendships/requests/chat, which still work normally for anyone who ends
// up friends with one of these regardless. Covers the fixed test fixture
// (scripts/create-test-users.mjs) and the app owner's own account, so
// neither clutters the "who can I add" list real friends see.
const HIDDEN_FROM_DIRECTORY = new Set(["user1", "user2", "user3", "felix"]);

// Friendships are stored with the lower id first (plain string comparison)
// so a pair is never represented by two rows or an ambiguous direction.
function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function areFriends(userId: string, otherUserId: string): Promise<boolean> {
  const [userIdA, userIdB] = orderedPair(userId, otherUserId);
  const [row] = await db
    .select({ userIdA: friendships.userIdA })
    .from(friendships)
    .where(and(eq(friendships.userIdA, userIdA), eq(friendships.userIdB, userIdB)));
  return row !== undefined;
}

async function assertFriends(userId: string, otherUserId: string) {
  if (!(await areFriends(userId, otherUserId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You're not friends with this user." });
  }
}

export const communityRouter = router({
  // Every other registered user, with just enough to find the right person
  // and know what action is available — no training details until friends.
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const authUsers = (await db.execute(
      sql`select id, email, created_at from auth.users where id != ${ctx.userId} order by created_at`,
    )) as unknown as AuthUserRow[];

    const [outgoing, incoming, friendRows] = await Promise.all([
      db.select({ toUserId: friendRequests.toUserId }).from(friendRequests).where(eq(friendRequests.fromUserId, ctx.userId)),
      db.select({ fromUserId: friendRequests.fromUserId }).from(friendRequests).where(eq(friendRequests.toUserId, ctx.userId)),
      db
        .select()
        .from(friendships)
        .where(or(eq(friendships.userIdA, ctx.userId), eq(friendships.userIdB, ctx.userId))),
    ]);

    const outgoingIds = new Set(outgoing.map((r) => r.toUserId));
    const incomingIds = new Set(incoming.map((r) => r.fromUserId));
    const friendIds = new Set(friendRows.map((r) => (r.userIdA === ctx.userId ? r.userIdB : r.userIdA)));

    return authUsers
      .filter((row) => !HIDDEN_FROM_DIRECTORY.has(emailToUsername(row.email)))
      .map((row) => ({
        userId: row.id,
        username: emailToUsername(row.email),
        status: friendIds.has(row.id)
          ? ("friends" as const)
          : outgoingIds.has(row.id)
            ? ("outgoing" as const)
            : incomingIds.has(row.id)
              ? ("incoming" as const)
              : ("none" as const),
      }));
  }),

  listFriends: protectedProcedure.query(async ({ ctx }) => {
    const friendRows = await db
      .select()
      .from(friendships)
      .where(or(eq(friendships.userIdA, ctx.userId), eq(friendships.userIdB, ctx.userId)));
    if (friendRows.length === 0) return [];

    const friendIds = friendRows.map((r) => (r.userIdA === ctx.userId ? r.userIdB : r.userIdA));
    const authUsers = (await db.execute(
      sql`select id, email, created_at from auth.users where id in (${sql.join(friendIds.map((id) => sql`${id}`), sql`, `)})`,
    )) as unknown as AuthUserRow[];

    return authUsers.map((row) => ({ userId: row.id, username: emailToUsername(row.email) }));
  }),

  // For the community entry point's badge — how many requests are waiting on
  // this user to accept or decline.
  incomingRequestCount: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select({ id: friendRequests.id }).from(friendRequests).where(eq(friendRequests.toUserId, ctx.userId));
    return rows.length;
  }),

  listIncomingRequests: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(friendRequests).where(eq(friendRequests.toUserId, ctx.userId));
    if (rows.length === 0) return [];

    const fromIds = rows.map((r) => r.fromUserId);
    const authUsers = (await db.execute(
      sql`select id, email, created_at from auth.users where id in (${sql.join(fromIds.map((id) => sql`${id}`), sql`, `)})`,
    )) as unknown as AuthUserRow[];
    const usernameById = new Map(authUsers.map((u) => [u.id, emailToUsername(u.email)]));

    return rows.map((row) => ({ fromUserId: row.fromUserId, username: usernameById.get(row.fromUserId) ?? "?" }));
  }),

  listOutgoingRequests: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(friendRequests).where(eq(friendRequests.fromUserId, ctx.userId));
    if (rows.length === 0) return [];

    const toIds = rows.map((r) => r.toUserId);
    const authUsers = (await db.execute(
      sql`select id, email, created_at from auth.users where id in (${sql.join(toIds.map((id) => sql`${id}`), sql`, `)})`,
    )) as unknown as AuthUserRow[];
    const usernameById = new Map(authUsers.map((u) => [u.id, emailToUsername(u.email)]));

    return rows.map((row) => ({ toUserId: row.toUserId, username: usernameById.get(row.toUserId) ?? "?" }));
  }),

  // If the other user already sent a request, sending one back accepts it
  // instead of creating a second, stuck-forever pending row.
  sendRequest: writeProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You can't friend yourself." });
    }
    if (await areFriends(ctx.userId, input.userId)) {
      throw new TRPCError({ code: "CONFLICT", message: "You're already friends." });
    }

    const [reverseRequest] = await db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(and(eq(friendRequests.fromUserId, input.userId), eq(friendRequests.toUserId, ctx.userId)));

    if (reverseRequest) {
      const [userIdA, userIdB] = orderedPair(ctx.userId, input.userId);
      await db.transaction(async (tx) => {
        await tx.delete(friendRequests).where(eq(friendRequests.id, reverseRequest.id));
        await tx.insert(friendships).values({ userIdA, userIdB });
      });
      return { status: "friends" as const };
    }

    try {
      await db.insert(friendRequests).values({ fromUserId: ctx.userId, toUserId: input.userId });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        throw new TRPCError({ code: "CONFLICT", message: "Request already sent." });
      }
      throw error;
    }
    return { status: "outgoing" as const };
  }),

  cancelRequest: writeProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await db
      .delete(friendRequests)
      .where(and(eq(friendRequests.fromUserId, ctx.userId), eq(friendRequests.toUserId, input.userId)));
    return { status: "none" as const };
  }),

  acceptRequest: writeProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [request] = await db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(and(eq(friendRequests.fromUserId, input.userId), eq(friendRequests.toUserId, ctx.userId)));
    if (!request) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const [userIdA, userIdB] = orderedPair(ctx.userId, input.userId);
    await db.transaction(async (tx) => {
      await tx.delete(friendRequests).where(eq(friendRequests.id, request.id));
      await tx.insert(friendships).values({ userIdA, userIdB });
    });
    return { status: "friends" as const };
  }),

  declineRequest: writeProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await db
      .delete(friendRequests)
      .where(and(eq(friendRequests.fromUserId, input.userId), eq(friendRequests.toUserId, ctx.userId)));
    return { status: "none" as const };
  }),

  unfriend: writeProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [userIdA, userIdB] = orderedPair(ctx.userId, input.userId);
    await db.delete(friendships).where(and(eq(friendships.userIdA, userIdA), eq(friendships.userIdB, userIdB)));
    return { status: "none" as const };
  }),

  // The three below drive the friend profile popup — same shape as the
  // signed-in user's own exercise.list/stats.aggregates/set.listByExercise,
  // just for a friend's userId instead of ctx.viewUserId, gated by friendship.
  friendAggregates: protectedProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertFriends(ctx.userId, input.userId);
    return getAggregatesForUser(input.userId);
  }),

  friendExercises: protectedProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertFriends(ctx.userId, input.userId);
    return listVisibleExercises(input.userId);
  }),

  friendGroups: protectedProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertFriends(ctx.userId, input.userId);
    return db.select().from(exerciseGroups).where(eq(exerciseGroups.userId, input.userId)).orderBy(exerciseGroups.name);
  }),

  friendExerciseHistory: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), exerciseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertFriends(ctx.userId, input.userId);
      return getSetsByExercise(input.userId, input.exerciseId);
    }),
});
