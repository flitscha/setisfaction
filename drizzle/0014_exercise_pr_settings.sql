CREATE TABLE "exercise_pr_settings" (
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"pr_fields" jsonb NOT NULL,
	CONSTRAINT "exercise_pr_settings_user_id_exercise_id_pk" PRIMARY KEY("user_id","exercise_id")
);
--> statement-breakpoint
ALTER TABLE "exercise_pr_settings" ADD CONSTRAINT "exercise_pr_settings_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;