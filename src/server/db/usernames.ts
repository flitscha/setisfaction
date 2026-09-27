import { inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { emailToUsername } from "@/lib/username";

// Resolves display usernames for a batch of auth.users rows. Three tiers,
// in order:
//  1. profiles.username — the source of truth since real-email registration
//     (see CLAUDE.md's Auth section).
//  2. Supabase's own user_metadata.username — set at signUp time, before
//     any confirmation, so it covers a registration that never finished
//     (the browser closed between clicking the confirmation link and
//     auth.ensureRegistration running). Display only: creating the profile
//     is left to ensureRegistration on that account's next login, which
//     also applies the default grouping and shows onboarding — writing the
//     username here would mark the registration as done without either.
//  3. Deriving one from the row's email — only correct for an account
//     that hasn't been through /verify-email yet, since emailToUsername
//     only knows how to strip the old @setisfaction.local suffix. Anything
//     else here (a real email, or the test fixture's @setisfaction.test)
//     would otherwise leak the address itself as the "username."
export async function resolveUsernames(rows: { id: string; email: string }[]): Promise<Map<string, string>> {
  if (rows.length === 0) return new Map();

  const profileRows = await db
    .select({ userId: profiles.userId, username: profiles.username })
    .from(profiles)
    .where(inArray(profiles.userId, rows.map((r) => r.id)));
  const usernameByUserId = new Map(
    profileRows.filter((p): p is { userId: string; username: string } => p.username !== null).map((p) => [p.userId, p.username]),
  );

  const missingIds = rows.filter((r) => !usernameByUserId.has(r.id)).map((r) => r.id);
  if (missingIds.length > 0) {
    const metaRows = (await db.execute(
      sql`select id, raw_user_meta_data->>'username' as username from auth.users where id in (${sql.join(missingIds.map((id) => sql`${id}`), sql`, `)})`,
    )) as unknown as { id: string; username: string | null }[];

    for (const row of metaRows) {
      if (!row.username) continue;
      usernameByUserId.set(row.id, row.username);
    }
  }

  return new Map(rows.map((r) => [r.id, usernameByUserId.get(r.id) ?? emailToUsername(r.email)]));
}
