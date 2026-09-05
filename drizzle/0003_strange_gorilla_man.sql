CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
