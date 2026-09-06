import { desc, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { resolveUsernames } from "@/server/db/usernames";
import { chatMessages } from "@/server/db/schema";
import { protectedProcedure, router, writeProcedure } from "../trpc";

// Only the most recent MESSAGE_LIMIT rows are kept — a global chat like this
// doesn't need real history, and it keeps the table (and every `list` query)
// small forever with no separate archival job.
const MESSAGE_LIMIT = 100;

type AuthUserRow = { id: string; email: string };

export const chatRouter = router({
  // Not friend-gated — this is the one global room every registered user
  // shares, unlike everything else in community.ts.
  list: protectedProcedure.query(async () => {
    const rows = await db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(MESSAGE_LIMIT);
    rows.reverse();
    if (rows.length === 0) return [];

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const authUsers = (await db.execute(
      sql`select id, email from auth.users where id in (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`,
    )) as unknown as AuthUserRow[];
    const usernameById = await resolveUsernames(authUsers);

    return rows.map((row) => ({ ...row, username: usernameById.get(row.userId) ?? "?" }));
  }),

  send: writeProcedure
    .input(z.object({ body: z.string().trim().min(1, "Message can't be empty").max(500) }))
    .mutation(async ({ ctx, input }) => {
      await db.transaction(async (tx) => {
        await tx.insert(chatMessages).values({ userId: ctx.userId, body: input.body });

        // Prune down to the most recent MESSAGE_LIMIT — only actually deletes
        // anything once the table is over the cap, i.e. essentially every
        // send once it's warmed up.
        const keep = await tx
          .select({ id: chatMessages.id })
          .from(chatMessages)
          .orderBy(desc(chatMessages.createdAt))
          .limit(MESSAGE_LIMIT);
        if (keep.length === MESSAGE_LIMIT) {
          await tx.delete(chatMessages).where(
            notInArray(
              chatMessages.id,
              keep.map((r) => r.id),
            ),
          );
        }
      });
    }),
});
