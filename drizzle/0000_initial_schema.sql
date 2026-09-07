CREATE TYPE "public"."link_source" AS ENUM('apple', 'google', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('none', 'resolved', 'unresolved');--> statement-breakpoint
CREATE TYPE "public"."outing_status" AS ENUM('open', 'announced', 'done');--> statement-breakpoint
CREATE TYPE "public"."price_tier" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "attendance" (
	"outing_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "attendance_outing_id_member_id_pk" PRIMARY KEY("outing_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"outing_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "availability_outing_id_member_id_day_pk" PRIMARY KEY("outing_id","member_id","day")
);
--> statement-breakpoint
CREATE TABLE "draws" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outing_id" uuid NOT NULL,
	"pick_id" uuid NOT NULL,
	"is_reroll" boolean DEFAULT false NOT NULL,
	"candidate_count" integer NOT NULL,
	"drawn_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "group_secrets_secret_unique" UNIQUE("secret")
);
--> statement-breakpoint
CREATE TABLE "group_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"admin_pin_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"first_claimed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" date NOT NULL,
	"tier" "price_tier" NOT NULL,
	"tier_overridden" boolean DEFAULT false NOT NULL,
	"status" "outing_status" DEFAULT 'open' NOT NULL,
	"chosen_date" date,
	"chosen_date_overridden" boolean DEFAULT false NOT NULL,
	"drawn_pick_id" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outings_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tier" "price_tier" NOT NULL,
	"raw_link" text,
	"link_source" "link_source" DEFAULT 'unknown' NOT NULL,
	"link_status" "link_status" DEFAULT 'none' NOT NULL,
	"resolved_name" text,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"external_place_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plus_ones" (
	"outing_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "plus_ones_outing_id_member_id_pk" PRIMARY KEY("outing_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"outing_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_outing_id_member_id_pk" PRIMARY KEY("outing_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "sent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outing_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sent_messages_outing_kind_key" UNIQUE("outing_id","kind")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "public"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "public"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws" ADD CONSTRAINT "draws_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "public"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws" ADD CONSTRAINT "draws_pick_id_picks_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."picks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outings" ADD CONSTRAINT "outings_drawn_pick_id_picks_id_fk" FOREIGN KEY ("drawn_pick_id") REFERENCES "public"."picks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plus_ones" ADD CONSTRAINT "plus_ones_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "public"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plus_ones" ADD CONSTRAINT "plus_ones_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "public"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_messages" ADD CONSTRAINT "sent_messages_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "public"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_outing_day_idx" ON "availability" USING btree ("outing_id","day");--> statement-breakpoint
CREATE INDEX "draws_outing_idx" ON "draws" USING btree ("outing_id");--> statement-breakpoint
CREATE INDEX "picks_tier_idx" ON "picks" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "push_subscriptions_member_idx" ON "push_subscriptions" USING btree ("member_id");