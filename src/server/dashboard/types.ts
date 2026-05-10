// Dashboard data contract. Dashboard PRD §5 +
// `docs/plans/dashboard.md` §5 commit 5 +
// `docs/plans/practice-round.md` §5 commit 6 + commit 10. Practice
// round commit 10 (atomic bottom-strip removal) pruned the
// transitional `pace.medianSeconds` + `pace.last7Days` fields and
// the optional top-level `lastSim?` field; the bottom-row tiles
// they fed (<PaceMetric>, <LastSimTile>, <MistakesTile>) all moved
// into the rebuilt <ScoreStrip> at commit 9 or were retired.
//
// This file is the structural source of truth for the dashboard's
// payload. Components consume slices via props (DashboardData["score"],
// DashboardData["pace"], DashboardData["mission"], etc.); the
// orchestrator at `data.ts` assembles a full DashboardData from seven
// helper outputs + loadUserProfile.
//
// Pure-types-only file: no imports beyond TypeScript built-ins. Every
// other file under @/server/dashboard/ imports from this one.

type BeltLevel = "white" | "blue" | "brown" | "black"

interface SubtypeRow {
	/** sub_types.id (a varchar slug like "verbal.analogies") */
	id: string
	/** URL-safe identifier — same string as id today */
	slug: string
	/** Display name from src/config/sub-types.ts (Title Case, e.g.
	 * "Sentence Completion"). Per `docs/plans/dashboard.md` §3
	 * decision F (resolved 2026-05-07) the dashboard does NOT
	 * apply a sentence-case transformer; if sentence case is
	 * desired later, the fix lives at the config source. */
	name: string
	belt: BeltLevel
	/** Unix-ms of the user's most-recent drill attempt against this
	 * sub-type, derived from the attempt's UUIDv7 prefix; undefined
	 * when the user has never drilled this sub-type. Drives both the
	 * row's "last drilled" text and the dashboard's last-worked-on
	 * sort key. */
	lastAttemptedAtMs?: number
	/** True if recent accuracy < 65% or median time > target by 30%+ */
	atRisk: boolean
	/** Where "drill this" navigates */
	href: string
}

interface DashboardData {
	user: {
		firstName: string
		initials: string
		streakDays: number
	}
	greeting: {
		today: Date
		/** Derived editorial line: "You're climbing.", "Steady today.", etc. */
		headline: string
	}
	score: {
		/** Latest estimate; undefined when no full sim has been taken */
		current?: number
		/** Signed delta vs previous full sim; undefined when fewer than 2 sims */
		delta?: number
		/** Target raw score (out of 50 questions on a full sim). Sourced
		 * from users.target_score (added at practice round commit 3;
		 * NOT NULL DEFAULT 40). */
		goal: number
		daysToTest?: number
		/** Raw target date in epoch ms; undefined when no date set.
		 * Practice round commit 9 surfaced this so the
		 * <DaysToTestEditor> popover can pre-populate its date input
		 * with the user's existing target. The display field
		 * `daysToTest` (days-from-now) is derived from this in
		 * loadUserProfile and stays the primary read for the tile
		 * value. */
		targetDateMs?: number
		/** Length-5 array of per-sim correct counts, OLDEST-TO-NEWEST.
		 * Missing slots padded with undefined. New at practice round
		 * commit 9; consumed by the Previous Score sparkline in the
		 * rebuilt <ScoreStrip>. Empty-state (0 sims) is `[undefined,
		 * undefined, undefined, undefined, undefined]`. */
		last5SimScores: ReadonlyArray<number | undefined>
	}
	mission: {
		eyebrow: string
		title: string
		primaryHref: string
		primaryLabel: string
		alternateHref: string
		alternateLabel: string
	}
	verbal: ReadonlyArray<SubtypeRow>
	numerical: ReadonlyArray<SubtypeRow>
	pace: {
		/** Hard target (18) */
		targetSeconds: number
		/** Median seconds-per-question over all attempts in the most
		 * recent full_length sim. undefined when the user has zero
		 * completed full sims. New at practice round commit 6;
		 * consumed by the rebuilt <ScoreStrip> at commit 9. */
		previousMedianSeconds?: number
		/** Length-5 array of per-sim median seconds-per-question,
		 * OLDEST-TO-NEWEST. Missing slots padded with undefined. New
		 * at practice round commit 6; consumed by the sparkline in
		 * the rebuilt <ScoreStrip> at commit 9. Empty-state (0 sims)
		 * is `[undefined, undefined, undefined, undefined, undefined]`. */
		last5SimMedians: ReadonlyArray<number | undefined>
	}
	mistakesQueue: {
		count: number
		/** Rough estimate; "1 minute per ~3 mistakes" rule of thumb. */
		estimatedMinutes: number
		href: string
	}
}

export type { BeltLevel, DashboardData, SubtypeRow }
