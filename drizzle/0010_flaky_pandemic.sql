CREATE TABLE "training_plan_workouts" (
	"training_plan_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"workout_id" uuid NOT NULL,
	CONSTRAINT "training_plan_workouts_training_plan_id_weekday_pk" PRIMARY KEY("training_plan_id","weekday")
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"sets_count" integer NOT NULL,
	"target_reps" integer,
	"target_time_seconds" integer,
	"target_weight_kg" numeric(6, 2),
	"rest_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_plan_workouts" ADD CONSTRAINT "training_plan_workouts_training_plan_id_training_plans_id_fk" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plan_workouts" ADD CONSTRAINT "training_plan_workouts_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "training_plans_user_id_lower_name_idx" ON "training_plans" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "training_plans_one_active_per_user_idx" ON "training_plans" USING btree ("user_id") WHERE "training_plans"."is_active";--> statement-breakpoint
CREATE INDEX "workout_exercises_workout_id_idx" ON "workout_exercises" USING btree ("workout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workouts_user_id_lower_name_idx" ON "workouts" USING btree ("user_id",lower("name"));