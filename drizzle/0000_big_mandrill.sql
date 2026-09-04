CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"tracks_reps" boolean DEFAULT true NOT NULL,
	"tracks_time" boolean DEFAULT false NOT NULL,
	"tracks_weight" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reps" integer,
	"time_seconds" integer,
	"weight_kg" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_user_id_lower_name_idx" ON "exercises" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "exercises_user_id_name_idx" ON "exercises" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "sets_user_id_performed_at_idx" ON "sets" USING btree ("user_id","performed_at");--> statement-breakpoint
CREATE INDEX "sets_user_id_exercise_id_performed_at_idx" ON "sets" USING btree ("user_id","exercise_id","performed_at");