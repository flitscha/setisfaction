import { inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { emailToUsername } from "@/lib/username";

// Resolves display usernames for a batch of auth.users rows, preferring
// profiles.username (the source of truth since real-email registration —
// see CLAUDE.md's Auth section) and falling back to deriving one from the
// row's email only for an account that hasn't been through /verify-email
// yet. Never derive from an already-real (or @setisfaction.test) email —
// emailToUsername only knows how to strip the old @setisfaction.local
// suffix, so anything else would leak the address itself as the
// "username," exactly what profiles.username exists to avoid.
export async function resolveUsernames(rows: { id: string; email: string }[]): Promise<Map<string, string>> {
  if (rows.length === 0) return new Map();

  const profileRows = await db
    .select({ userId: profiles.userId, username: profiles.username })
    .from(profiles)
    .where(inArray(profiles.userId, rows.map((r) => r.id)));
  const usernameByUserId = new Map(
    profileRows.filter((p): p is { userId: string; username: string } => p.username !== null).map((p) => [p.userId, p.username]),
  );

  return new Map(rows.map((r) => [r.id, usernameByUserId.get(r.id) ?? emailToUsername(r.email)]));
}
