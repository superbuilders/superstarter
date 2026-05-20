CREATE TYPE "public"."experimental_audit_status" AS ENUM('unaudited', 'approved', 'rejected', 'needs_revision');--> statement-breakpoint
CREATE TYPE "public"."experimental_completion_reason" AS ENUM('completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."experimental_session_type" AS ENUM('practice_test', 'drill', 'review');--> statement-breakpoint
CREATE TYPE "public"."experimental_revision_decision" AS ENUM('approve_as_is', 'approve_edit', 'reject', 'needs_revision', 'hide');--> statement-breakpoint
CREATE TABLE "experimental_attempts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"session_id" uuid NOT NULL,
	"experimental_item_id" uuid NOT NULL,
	"selected_answer" varchar(64),
	"correct" boolean NOT NULL,
	"latency_ms" integer NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experimental_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"sub_type_id" varchar(64) NOT NULL,
	"difficulty" "item_difficulty" NOT NULL,
	"body" jsonb NOT NULL,
	"options_json" jsonb NOT NULL,
	"correct_answer" varchar(64) NOT NULL,
	"explanation" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audit_status" "experimental_audit_status" DEFAULT 'unaudited' NOT NULL,
	"source_version" integer DEFAULT 1 NOT NULL,
	"parent_experimental_item_id" uuid,
	"promoted_item_id" uuid,
	"hidden_at_ms" bigint,
	"created_by_user_id" uuid,
	"created_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL,
	"updated_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experimental_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "experimental_session_type" NOT NULL,
	"sub_type_id" varchar(64),
	"target_question_count" integer NOT NULL,
	"started_at_ms" bigint NOT NULL,
	"ended_at_ms" bigint,
	"last_heartbeat_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL,
	"completion_reason" "experimental_completion_reason",
	"recency_excluded_item_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_audits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"experimental_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"experimental_session_id" uuid,
	"experimental_attempt_id" uuid,
	"makes_sense" boolean,
	"correct_answer_is_right" boolean,
	"subject_tag_is_right" boolean,
	"difficulty_is_right" boolean,
	"suggested_subject" varchar(64),
	"suggested_difficulty" "item_difficulty",
	"notes" text,
	"submitted_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_edit_proposals" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"experimental_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"proposed_body" jsonb,
	"proposed_options_json" jsonb,
	"proposed_correct_answer" varchar(64),
	"proposed_explanation" text,
	"suggested_subject" varchar(64),
	"suggested_difficulty" "item_difficulty",
	"rationale" text,
	"submitted_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_revision_decisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"experimental_item_id" uuid NOT NULL,
	"proposal_id" uuid,
	"acted_by_user_id" uuid NOT NULL,
	"decision" "experimental_revision_decision" NOT NULL,
	"promoted_item_id" uuid,
	"decision_notes" text,
	"acted_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experimental_attempts" ADD CONSTRAINT "experimental_attempts_session_id_experimental_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."experimental_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experimental_attempts" ADD CONSTRAINT "experimental_attempts_experimental_item_id_experimental_items_id_fk" FOREIGN KEY ("experimental_item_id") REFERENCES "public"."experimental_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experimental_items" ADD CONSTRAINT "experimental_items_sub_type_id_sub_types_id_fk" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experimental_items" ADD CONSTRAINT "experimental_items_parent_experimental_item_id_experimental_items_id_fk" FOREIGN KEY ("parent_experimental_item_id") REFERENCES "public"."experimental_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experimental_items" ADD CONSTRAINT "experimental_items_promoted_item_id_items_id_fk" FOREIGN KEY ("promoted_item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experimental_items" ADD CONSTRAINT "experimental_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experimental_sessions" ADD CONSTRAINT "experimental_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experimental_sessions" ADD CONSTRAINT "experimental_sessions_sub_type_id_sub_types_id_fk" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_audits" ADD CONSTRAINT "item_audits_experimental_item_id_experimental_items_id_fk" FOREIGN KEY ("experimental_item_id") REFERENCES "public"."experimental_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_audits" ADD CONSTRAINT "item_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_audits" ADD CONSTRAINT "item_audits_experimental_session_id_experimental_sessions_id_fk" FOREIGN KEY ("experimental_session_id") REFERENCES "public"."experimental_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_audits" ADD CONSTRAINT "item_audits_experimental_attempt_id_experimental_attempts_id_fk" FOREIGN KEY ("experimental_attempt_id") REFERENCES "public"."experimental_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_audits" ADD CONSTRAINT "item_audits_suggested_subject_sub_types_id_fk" FOREIGN KEY ("suggested_subject") REFERENCES "public"."sub_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_edit_proposals" ADD CONSTRAINT "item_edit_proposals_experimental_item_id_experimental_items_id_fk" FOREIGN KEY ("experimental_item_id") REFERENCES "public"."experimental_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_edit_proposals" ADD CONSTRAINT "item_edit_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_edit_proposals" ADD CONSTRAINT "item_edit_proposals_suggested_subject_sub_types_id_fk" FOREIGN KEY ("suggested_subject") REFERENCES "public"."sub_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision_decisions" ADD CONSTRAINT "item_revision_decisions_experimental_item_id_experimental_items_id_fk" FOREIGN KEY ("experimental_item_id") REFERENCES "public"."experimental_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision_decisions" ADD CONSTRAINT "item_revision_decisions_proposal_id_item_edit_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."item_edit_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision_decisions" ADD CONSTRAINT "item_revision_decisions_acted_by_user_id_users_id_fk" FOREIGN KEY ("acted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision_decisions" ADD CONSTRAINT "item_revision_decisions_promoted_item_id_items_id_fk" FOREIGN KEY ("promoted_item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "experimental_attempts_session_id_idx" ON "experimental_attempts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "experimental_attempts_item_id_idx" ON "experimental_attempts" USING btree ("experimental_item_id");--> statement-breakpoint
CREATE INDEX "experimental_items_sub_type_audit_idx" ON "experimental_items" USING btree ("sub_type_id","audit_status");--> statement-breakpoint
CREATE INDEX "experimental_items_audit_hidden_idx" ON "experimental_items" USING btree ("audit_status","hidden_at_ms");--> statement-breakpoint
CREATE INDEX "experimental_items_audit_difficulty_idx" ON "experimental_items" USING btree ("audit_status","difficulty");--> statement-breakpoint
CREATE INDEX "experimental_items_parent_idx" ON "experimental_items" USING btree ("parent_experimental_item_id");--> statement-breakpoint
CREATE INDEX "experimental_items_promoted_idx" ON "experimental_items" USING btree ("promoted_item_id");--> statement-breakpoint
CREATE INDEX "experimental_sessions_user_id_idx" ON "experimental_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "experimental_sessions_user_type_ended_idx" ON "experimental_sessions" USING btree ("user_id","type","ended_at_ms");--> statement-breakpoint
CREATE INDEX "experimental_sessions_abandon_sweep_idx" ON "experimental_sessions" USING btree ("last_heartbeat_ms") WHERE "experimental_sessions"."ended_at_ms" IS NULL;--> statement-breakpoint
CREATE INDEX "experimental_sessions_recency_excluded_gin_idx" ON "experimental_sessions" USING gin ("recency_excluded_item_ids");--> statement-breakpoint
CREATE INDEX "item_audits_item_idx" ON "item_audits" USING btree ("experimental_item_id");--> statement-breakpoint
CREATE INDEX "item_audits_user_idx" ON "item_audits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "item_audits_session_idx" ON "item_audits" USING btree ("experimental_session_id");--> statement-breakpoint
CREATE INDEX "item_audits_attempt_idx" ON "item_audits" USING btree ("experimental_attempt_id");--> statement-breakpoint
CREATE INDEX "item_edit_proposals_item_idx" ON "item_edit_proposals" USING btree ("experimental_item_id");--> statement-breakpoint
CREATE INDEX "item_edit_proposals_user_idx" ON "item_edit_proposals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "item_edit_proposals_submitted_idx" ON "item_edit_proposals" USING btree ("submitted_at_ms");--> statement-breakpoint
CREATE INDEX "item_revision_decisions_item_idx" ON "item_revision_decisions" USING btree ("experimental_item_id");--> statement-breakpoint
CREATE INDEX "item_revision_decisions_proposal_idx" ON "item_revision_decisions" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "item_revision_decisions_actor_idx" ON "item_revision_decisions" USING btree ("acted_by_user_id");--> statement-breakpoint
CREATE INDEX "item_revision_decisions_acted_at_idx" ON "item_revision_decisions" USING btree ("acted_at_ms");