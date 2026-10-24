ALTER TABLE "outings" ADD COLUMN "booked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outings" ADD COLUMN "booked_by" uuid;--> statement-breakpoint
ALTER TABLE "outings" ADD COLUMN "booked_for" integer;--> statement-breakpoint
ALTER TABLE "outings" ADD CONSTRAINT "outings_booked_by_members_id_fk" FOREIGN KEY ("booked_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;