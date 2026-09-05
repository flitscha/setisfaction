CREATE TABLE "exercise_group_members" (
	"exercise_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "exercise_group_members_exercise_id_group_id_pk" PRIMARY KEY("exercise_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "exercise_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "exercise_group_members" ADD CONSTRAINT "exercise_group_members_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_group_members" ADD CONSTRAINT "exercise_group_members_group_id_exercise_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."exercise_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_group_members_group_id_idx" ON "exercise_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_groups_user_id_lower_name_idx" ON "exercise_groups" USING btree ("user_id",lower("name"));