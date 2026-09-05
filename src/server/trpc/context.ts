import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { VIEW_AS_HEADER } from "@/lib/view-as";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";

export async function createTRPCContext({ req }: FetchCreateContextFnOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const [profile] = await db.select({ isAdmin: profiles.isAdmin }).from(profiles).where(eq(profiles.userId, user.id));
    isAdmin = profile?.isAdmin ?? false;
  }

  // Only honored for admins — lets them browse another user's pages read-only
  // without impersonating them for writes. See viewingAsUserId usage in trpc.ts.
  const requestedViewAsUserId = req.headers.get(VIEW_AS_HEADER);
  const viewingAsUserId = isAdmin ? requestedViewAsUserId : null;

  return {
    userId: user?.id ?? null,
    isAdmin,
    viewingAsUserId,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
