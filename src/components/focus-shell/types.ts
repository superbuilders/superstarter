// Shared types for the FocusShell client component and its peripherals.
//
// Some types here are duplicated from src/server/sessions/* and
// src/server/items/selection.ts so the client bundle never imports the
// server modules. The shapes are checked against the server originals
// via the structural-compatibility test in the action-wrapper layer at
// src/app/(app)/actions.ts (commit 1) — if the server type drifts, that
// boundary breaks at compile time and forces a sync here.

import type { ItemBody } from "@/server/items/body-schema"

type SessionType = "diagnostic" | "drill" | "full_length" | "simulation"

type Difficulty = "easy" | "medium" | "hard" | "brutal"
type FallbackLevel = "fresh" | "session-soft" | "recency-soft" | "tier-degraded"

interface ItemSelection {
	servedAtTier: Difficulty
	fallbackFromTier?: Difficulty
	fallbackLevel: FallbackLevel
}

interface ItemForRender {
	id: string
	body: ItemBody
	options: { id: string; text: string }[]
	selection: ItemSelection
}

interface SubmitAttemptInput {
	sessionId: string
	itemId: string
	selectedAnswer?: string
	latencyMs: number
	selection: ItemSelection
}

interface SubmitAttemptResult {
	nextItem?: ItemForRender
}

interface FocusShellProps {
	sessionId: string
	sessionType: SessionType
	// Drill-only — the canonical sub-type id (e.g. "numerical.number_series")
	// passed from /drill/[subTypeId]/run/content for body-renderer dispatch
	// in <ItemPrompt> (Round 1 §5.8 number-series formatting). Diagnostic +
	// full_length leave undefined because those surfaces mix sub-types
	// per-item; per-item dispatch would require adding subTypeId to
	// ItemForRender (out of scope per Round 1 §1, see plan-doc §5.8
	// §6.14.28 addendum).
	subTypeId?: string
	// `null` for sessions with no session-level duration. The diagnostic
	// passes `null` (untimed at the session level — capacity measurement;
	// see plan docs/plans/phase3-diagnostic-flow.md §4). Drill,
	// full-length, and simulation pass a positive number which drives the
	// session-progress bar, the chronometer, and the auto-end effect.
	sessionDurationMs: number | null
	perQuestionTargetMs: number
	targetQuestionCount: number
	paceTrackVisible: boolean
	initialItem: ItemForRender
	heartbeatHref?: string
	completionHref?: string
	// `true` for simulation only (Phase 5). Disables any pause UI etc.
	// Phase 3 callers pass `false`.
	strictMode: boolean
	onSubmitAttempt: (input: SubmitAttemptInput) => Promise<SubmitAttemptResult>
	onEndSession: () => Promise<void>
}

export type {
	Difficulty,
	FallbackLevel,
	FocusShellProps,
	ItemForRender,
	ItemSelection,
	SessionType,
	SubmitAttemptInput,
	SubmitAttemptResult
}
