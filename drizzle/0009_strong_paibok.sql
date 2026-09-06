ALTER TABLE "profiles" ADD COLUMN "username" text;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_lower_username_idx" ON "profiles" USING btree (lower("username"));