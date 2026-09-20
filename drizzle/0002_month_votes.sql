CREATE TYPE "public"."month_choice" AS ENUM('low', 'medium', 'high', 'party');--> statement-breakpoint
CREATE TYPE "public"."outing_kind" AS ENUM('restaurant', 'party');--> statement-breakpoint
CREATE TABLE "month_votes" (
	"month" date NOT NULL,
	"member_id" uuid NOT NULL,
	"choice" "month_choice" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "month_votes_month_member_id_pk" PRIMARY KEY("month","member_id")
);
--> statement-breakpoint
ALTER TABLE "outings" ADD COLUMN "kind" "outing_kind" DEFAULT 'restaurant' NOT NULL;--> statement-breakpoint
ALTER TABLE "month_votes" ADD CONSTRAINT "month_votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;