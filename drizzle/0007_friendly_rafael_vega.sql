CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_id_a" uuid NOT NULL,
	"user_id_b" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_id_a_user_id_b_pk" PRIMARY KEY("user_id_a","user_id_b")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "friend_requests_from_to_idx" ON "friend_requests" USING btree ("from_user_id","to_user_id");--> statement-breakpoint
CREATE INDEX "friend_requests_to_user_id_idx" ON "friend_requests" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "friendships_user_id_b_idx" ON "friendships" USING btree ("user_id_b");