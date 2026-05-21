CREATE TYPE "public"."item_admin_action_type" AS ENUM('edit', 'approve', 'reject', 'flag', 'unflag');--> statement-breakpoint
ALTER TYPE "public"."item_status" ADD VALUE 'rejected';--> statement-breakpoint
CREATE TABLE "item_admin_actions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"item_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action_type" "item_admin_action_type" NOT NULL,
	"before_json" jsonb NOT NULL,
	"after_json" jsonb NOT NULL,
	"reason" text,
	"created_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "rejected_at_ms" bigint;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "rejected_by" uuid;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "item_admin_actions" ADD CONSTRAINT "item_admin_actions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_admin_actions" ADD CONSTRAINT "item_admin_actions_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_admin_actions_item_created_idx" ON "item_admin_actions" USING btree ("item_id","created_at_ms");--> statement-breakpoint
CREATE INDEX "item_admin_actions_admin_user_idx" ON "item_admin_actions" USING btree ("admin_user_id");--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;