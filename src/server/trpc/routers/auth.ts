import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/username";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { applyStandardGrouping } from "@/server/db/standard-groups";
import { publicProcedure, router } from "../trpc";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        username: z.string().trim().min(1, "Username is required").max(50),
        password: z.string().min(6, "Password must be at least 6 characters").max(72),
      }),
    )
    .mutation(async ({ input }) => {
      // Checked explicitly (rather than via the Zod schema) so the message
      // shown is this one, not Supabase's "invalid email" error from the
      // synthetic email built out of the username below — confusing since
      // the user never sees or enters an email themselves.
      if (!USERNAME_PATTERN.test(input.username)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Username can only contain letters, numbers, underscores, and hyphens — no spaces.",
        });
      }

      const admin = createAdminClient();

      const { data, error } = await admin.auth.admin.createUser({
        email: usernameToEmail(input.username),
        password: input.password,
        email_confirm: true,
      });

      if (error) {
        if (error.message.toLowerCase().includes("already been registered")) {
          throw new TRPCError({ code: "CONFLICT", message: "That username is already taken." });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }

      await db.insert(profiles).values({ userId: data.user.id });
      // Starting point only — the user can freely rename/reassign/delete
      // these afterward, same as any of their own groups.
      await applyStandardGrouping(data.user.id);

      return { success: true };
    }),
});
