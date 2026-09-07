ALTER TABLE "workout_exercises" ALTER COLUMN "target_reps" SET DATA TYPE jsonb USING NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" ALTER COLUMN "target_time_seconds" SET DATA TYPE jsonb USING NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" ALTER COLUMN "target_weight_kg" SET DATA TYPE jsonb USING NULL;
