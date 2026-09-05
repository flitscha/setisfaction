import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";

export async function createTRPCContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const [profile] = await db.select({ isAdmin: profiles.isAdmin }).from(profiles).where(eq(profiles.userId, user.id));
    isAdmin = profile?.isAdmin ?? false;
  }

  return {
    userId: user?.id ?? null,
    isAdmin,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
