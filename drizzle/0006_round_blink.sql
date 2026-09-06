ALTER TABLE "exercises" ADD COLUMN "forked_from_id" uuid;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_forked_from_id_exercises_id_fk" FOREIGN KEY ("forked_from_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_forked_from_id_idx" ON "exercises" USING btree ("forked_from_id");