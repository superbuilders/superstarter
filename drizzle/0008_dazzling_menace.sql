CREATE TYPE "public"."item_user_report_disposition_kind" AS ENUM('resolved_via_item_action', 'dismissed_without_item_action');--> statement-breakpoint
CREATE TYPE "public"."item_user_report_reason" AS ENUM('formatting', 'wrong_answer', 'mislabeled', 'other');--> statement-breakpoint
CREATE TYPE "public"."item_user_report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
ALTER TYPE "public"."session_type" ADD VALUE 'mistakes';--> statement-breakpoint
CREATE TABLE "item_user_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"reason" "item_user_report_reason" NOT NULL,
	"reason_note" text,
	"status" "item_user_report_status" DEFAULT 'open' NOT NULL,
	"disposition_admin_user_id" uuid,
	"disposition_at_ms" bigint,
	"disposition_item_action_id" uuid,
	"disposition_kind" "item_user_report_disposition_kind",
	"reported_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_user_reports" ADD CONSTRAINT "item_user_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_user_reports" ADD CONSTRAINT "item_user_reports_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_user_reports" ADD CONSTRAINT "item_user_reports_disposition_admin_user_id_users_id_fk" FOREIGN KEY ("disposition_admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_user_reports" ADD CONSTRAINT "item_user_reports_disposition_item_action_id_item_admin_actions_id_fk" FOREIGN KEY ("disposition_item_action_id") REFERENCES "public"."item_admin_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_user_reports_user_item_uniq" ON "item_user_reports" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE INDEX "item_user_reports_item_status_idx" ON "item_user_reports" USING btree ("item_id","status");