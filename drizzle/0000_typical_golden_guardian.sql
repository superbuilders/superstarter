CREATE TYPE "public"."item_difficulty" AS ENUM('easy', 'medium', 'hard', 'brutal');--> statement-breakpoint
CREATE TYPE "public"."item_source" AS ENUM('real', 'generated');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('live', 'candidate', 'retired');--> statement-breakpoint
CREATE TYPE "public"."strategy_kind" AS ENUM('recognition', 'technique', 'trap');--> statement-breakpoint
CREATE TYPE "public"."sub_type_section" AS ENUM('verbal', 'numerical');--> statement-breakpoint
CREATE TYPE "public"."promotion_decision" AS ENUM('promote', 'retire', 'hold');--> statement-breakpoint
CREATE TYPE "public"."mastery_level" AS ENUM('learning', 'fluent', 'mastered', 'decayed');--> statement-breakpoint
CREATE TYPE "public"."completion_reason" AS ENUM('completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('diagnostic', 'drill', 'full_length', 'simulation', 'review');--> statement-breakpoint
CREATE TYPE "public"."timer_mode" AS ENUM('standard', 'speed_ramp', 'brutal');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"provider" varchar(128) NOT NULL,
	"provider_account_id" varchar(256) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at_ms" bigint,
	"refresh_token_expires_at_ms" bigint,
	"token_type" varchar(64),
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(256) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" varchar(256),
	"email" varchar(320) NOT NULL,
	"email_verified_ms" bigint,
	"image" text,
	"target_percentile" integer,
	"target_date_ms" bigint,
	"timer_prefs_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(320) NOT NULL,
	"token" varchar(256) NOT NULL,
	"expires_ms" bigint NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"sub_type_id" varchar(64) NOT NULL,
	"difficulty" "item_difficulty" NOT NULL,
	"source" "item_source" NOT NULL,
	"status" "item_status" DEFAULT 'candidate' NOT NULL,
	"body" jsonb NOT NULL,
	"options_json" jsonb NOT NULL,
	"correct_answer" varchar(64) NOT NULL,
	"explanation" text,
	"strategy_id" uuid,
	"embedding" vector(1536),
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"sub_type_id" varchar(64) NOT NULL,
	"kind" "strategy_kind" NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_types" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"section" "sub_type_section" NOT NULL,
	"latency_threshold_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_promotion_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"item_id" uuid NOT NULL,
	"decision" "promotion_decision" NOT NULL,
	"observed_attempts" integer NOT NULL,
	"observed_accuracy" real NOT NULL,
	"observed_median_latency_ms" integer NOT NULL,
	"decision_reason" text,
	"enforced" boolean DEFAULT false NOT NULL,
	"decided_at_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_views" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"strategy_id" uuid NOT NULL,
	"viewed_at_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"session_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"selected_answer" varchar(64),
	"correct" boolean NOT NULL,
	"latency_ms" integer NOT NULL,
	"served_at_tier" "item_difficulty" NOT NULL,
	"fallback_from_tier" "item_difficulty",
	"triage_prompt_fired" boolean DEFAULT false NOT NULL,
	"triage_taken" boolean DEFAULT false NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery_state" (
	"user_id" uuid NOT NULL,
	"sub_type_id" varchar(64) NOT NULL,
	"current_state" "mastery_level" NOT NULL,
	"was_mastered" boolean DEFAULT false NOT NULL,
	"updated_at_ms" bigint NOT NULL,
	CONSTRAINT "mastery_state_user_sub_type_pk" PRIMARY KEY("user_id","sub_type_id")
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "session_type" NOT NULL,
	"sub_type_id" varchar(64),
	"timer_mode" timer_mode,
	"target_question_count" integer NOT NULL,
	"started_at_ms" bigint NOT NULL,
	"ended_at_ms" bigint,
	"last_heartbeat_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL,
	"completion_reason" "completion_reason",
	"narrowing_ramp_completed" boolean DEFAULT false NOT NULL,
	"if_then_plan" text,
	"recency_excluded_item_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"strategy_review_viewed" boolean DEFAULT false NOT NULL,
	"diagnostic_overtime_note_shown_at_ms" bigint
);
--> statement-breakpoint
CREATE TABLE "review_queue" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"due_at_ms" bigint NOT NULL,
	"interval_days" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_sub_type_id_sub_types_id_fk" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_sub_type_id_sub_types_id_fk" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_promotion_log" ADD CONSTRAINT "candidate_promotion_log_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_views" ADD CONSTRAINT "strategy_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_views" ADD CONSTRAINT "strategy_views_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_state" ADD CONSTRAINT "mastery_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery_state" ADD CONSTRAINT "mastery_state_sub_type_id_sub_types_id_fk" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_sub_type_id_sub_types_id_fk" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_unique_idx" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "items_sub_type_status_idx" ON "items" USING btree ("sub_type_id","status");--> statement-breakpoint
CREATE INDEX "items_sub_type_difficulty_status_idx" ON "items" USING btree ("sub_type_id","difficulty","status");--> statement-breakpoint
CREATE INDEX "strategies_sub_type_idx" ON "strategies" USING btree ("sub_type_id");--> statement-breakpoint
CREATE INDEX "candidate_promotion_log_item_id_idx" ON "candidate_promotion_log" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "candidate_promotion_log_decided_at_idx" ON "candidate_promotion_log" USING btree ("decided_at_ms");--> statement-breakpoint
CREATE INDEX "strategy_views_user_strategy_idx" ON "strategy_views" USING btree ("user_id","strategy_id");--> statement-breakpoint
CREATE INDEX "attempts_session_id_idx" ON "attempts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attempts_item_id_idx" ON "attempts" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "practice_sessions_user_id_idx" ON "practice_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "practice_sessions_user_type_ended_idx" ON "practice_sessions" USING btree ("user_id","type","ended_at_ms");--> statement-breakpoint
CREATE INDEX "practice_sessions_abandon_sweep_idx" ON "practice_sessions" USING btree ("last_heartbeat_ms") WHERE "practice_sessions"."ended_at_ms" IS NULL;--> statement-breakpoint
CREATE INDEX "practice_sessions_recency_excluded_gin_idx" ON "practice_sessions" USING gin ("recency_excluded_item_ids");--> statement-breakpoint
CREATE INDEX "review_queue_user_due_idx" ON "review_queue" USING btree ("user_id","due_at_ms");--> statement-breakpoint
CREATE UNIQUE INDEX "review_queue_user_item_unique" ON "review_queue" USING btree ("user_id","item_id");