import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { publicProcedure, router } from "../trpc";

// Verifies the Next.js -> tRPC -> Drizzle -> Supabase wiring end to end.
export const healthRouter = router({
  dbCheck: publicProcedure.query(async () => {
    const result = await db.execute(sql`select 1 as ok`);
    return { ok: result[0]?.ok === 1 };
  }),
});
