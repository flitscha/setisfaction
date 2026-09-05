ALTER TABLE "exercises" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "forked_from_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_standard_lower_name_idx" ON "exercises" USING btree (lower("name")) WHERE "exercises"."user_id" is null;