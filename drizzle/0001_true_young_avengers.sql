-- v1-code-cleanup commit 3 (2026-05-04). Drops vestigial columns left
-- behind by the doc-only v1-scope-tightening round + truncates the
-- session_type and timer_mode enums to v1-only values. Hand-written
-- (not Drizzle-Kit-emitted) to use the rename-swap pattern explicitly
-- per docs/plans/phase5-v1-code-cleanup.md §5; Drizzle Kit's auto-
-- emitter chose a text-bounce pattern (ALTER COLUMN TYPE text ->
-- DROP TYPE -> CREATE TYPE -> ALTER COLUMN TYPE enum) which is
-- functionally equivalent but less explicit; the rename-swap below
-- keeps the v2-type-then-rename intent visible in the SQL.
--
-- Cast safety: every existing row's `type` is one of the four v2 values
-- (v1 never wrote 'review'); every existing row's `timer_mode` is
-- 'standard' (drill) or NULL (non-drill). Both casts cannot fail.

-- Drop vestigial columns (zero readers per commits 1 + 2).
ALTER TABLE "users" DROP COLUMN "timer_prefs_json";--> statement-breakpoint
ALTER TABLE "practice_sessions" DROP COLUMN "narrowing_ramp_completed";--> statement-breakpoint
ALTER TABLE "practice_sessions" DROP COLUMN "if_then_plan";--> statement-breakpoint
ALTER TABLE "practice_sessions" DROP COLUMN "strategy_review_viewed";--> statement-breakpoint

-- Truncate session_type enum: drop 'review' value via rename-swap.
CREATE TYPE "public"."session_type_v2" AS ENUM('diagnostic', 'drill', 'full_length', 'simulation');--> statement-breakpoint
ALTER TABLE "practice_sessions" ALTER COLUMN "type" SET DATA TYPE "public"."session_type_v2" USING "type"::text::"public"."session_type_v2";--> statement-breakpoint
DROP TYPE "public"."session_type";--> statement-breakpoint
ALTER TYPE "public"."session_type_v2" RENAME TO "session_type";--> statement-breakpoint

-- Truncate timer_mode enum: drop 'speed_ramp' + 'brutal' values via rename-swap.
CREATE TYPE "public"."timer_mode_v2" AS ENUM('standard');--> statement-breakpoint
ALTER TABLE "practice_sessions" ALTER COLUMN "timer_mode" SET DATA TYPE "public"."timer_mode_v2" USING "timer_mode"::text::"public"."timer_mode_v2";--> statement-breakpoint
DROP TYPE "public"."timer_mode";--> statement-breakpoint
ALTER TYPE "public"."timer_mode_v2" RENAME TO "timer_mode";
