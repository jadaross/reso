CREATE TABLE "advance_availability" (
	"member_id" uuid NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "advance_availability_member_id_day_pk" PRIMARY KEY("member_id","day")
);
--> statement-breakpoint
ALTER TABLE "advance_availability" ADD CONSTRAINT "advance_availability_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advance_availability_day_idx" ON "advance_availability" USING btree ("day");