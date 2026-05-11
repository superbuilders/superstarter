// Dashboard data orchestrator + loadUserProfile real read. Dashboard
// PRD §6 + §6.1 + `docs/plans/dashboard.md` §5 commit 5 +
// `docs/plans/practice-round.md` §5 commit 4 + commit 6.
//
// The orchestrator composes one real read (loadUserProfile) and seven
// stubbed helpers into a single DashboardData payload. Each helper
// lives in its own file under @/server/dashboard/ so a follow-up PRD
// can replace one stub at a time without touching this orchestrator
// (`docs/plans/dashboard.md` §9 lists the stub-removal sequence).
//
// loadUserProfile is private to this file. It reads `users` directly
// for `id`, `name`, `targetDateMs`, and `targetScore`. Practice round
// commit 4 replaced the previous STUB_GOAL_SCORE=40 constant with a
// real read of users.target_score: the column was added at practice
// round commit 3 with NOT NULL DEFAULT 40, so every existing user row
// has 40 and the read returns a number unconditionally.
//
// Practice round commit 10 (atomic bottom-strip removal): the
// orchestrator no longer assembles transitional pace fields
// (medianSeconds + last7Days) or the optional `lastSim` block. The
// pace mapping is the simple ms→seconds conversion of the two real
// fields the rebuilt <ScoreStrip> at commit 9 consumes; the
// `getLastFullSim` helper was removed at commit 10 along with its
// caller.
//
// Decision G (`docs/plans/dashboard.md` §3, resolved 2026-05-07):
// loadUserProfile validates `row.name === null` and throws via
// errors.new with logger.error before throw. No `??` operator
// anywhere in this file. The Google adapter always populates `name`;
// a null is a data-integrity violation, not a legitimate empty state.

import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"
import { loadAllBelts } from "@/server/dashboard/belts"
import { deriveHeadline } from "@/server/dashboard/helpers"
import { pickTodaysMission } from "@/server/dashboard/mission"
import { countMistakes } from "@/server/dashboard/mistakes"
import { computePaceWeek } from "@/server/dashboard/pace"
import { computeScoreEstimate, getLast5SimScores } from "@/server/dashboard/score"
import { computeStreak } from "@/server/dashboard/streak"
import type { DashboardData } from "@/server/dashboard/types"

interface UserProfile {
	id: string
	firstName: string
	initials: string
	goal: number
	daysToTest?: number
	targetDateMs?: number
}

/**
 * Returns the dashboard payload for the given user.
 *
 * Helper status as of practice round commit 10:
 *   - loadUserProfile        → real read (auth/users; target_score
 *                              wired at practice round commit 4)
 *   - loadAllBelts           → STUB (Belts PRD)
 *   - pickTodaysMission      → real read (practice round commit 7)
 *   - computeScoreEstimate   → real read (practice round commit 5)
 *   - computeStreak          → real read (consecutive UTC days
 *                              with ≥1 attempt; src/server/dashboard/
 *                              streak.ts has the unit tests)
 *   - computePaceWeek        → real read (practice round commit 6;
 *                              transitional fields pruned at
 *                              commit 10)
 *   - countMistakes          → real read (practice round commit 8)
 *   - getLast5SimScores      → real read (practice round commit 9)
 */
async function getDashboardData(userId: string): Promise<DashboardData> {
	logger.info({ userId }, "dashboard data requested")

	const profileResult = await errors.try(loadUserProfile(userId))
	if (profileResult.error) {
		logger.error({ error: profileResult.error, userId }, "dashboard profile load failed")
		throw errors.wrap(profileResult.error, "dashboard profile load")
	}
	const profile = profileResult.data

	const [verbal, numerical, mission, score, streakDays, pace, mistakesCount, last5SimScores] =
		await Promise.all([
			loadAllBelts(userId, "verbal"),
			loadAllBelts(userId, "numerical"),
			pickTodaysMission(userId),
			computeScoreEstimate(userId),
			computeStreak(userId),
			computePaceWeek(userId),
			countMistakes(userId),
			getLast5SimScores(userId)
		])

	const previousMedianSeconds =
		pace.previousMedianMs === undefined ? undefined : pace.previousMedianMs / 1000
	const last5SimMedians = pace.last5SimMedianMs.map(function msToSeconds(ms) {
		return ms === undefined ? undefined : ms / 1000
	})

	return {
		user: {
			firstName: profile.firstName,
			initials: profile.initials,
			streakDays
		},
		greeting: {
			today: new Date(),
			headline: deriveHeadline({ delta: score.delta, hasSim: score.current !== undefined })
		},
		score: {
			current: score.current,
			delta: score.delta,
			goal: profile.goal,
			daysToTest: profile.daysToTest,
			targetDateMs: profile.targetDateMs,
			last5SimScores
		},
		mission,
		verbal,
		numerical,
		pace: {
			targetSeconds: 18,
			previousMedianSeconds,
			last5SimMedians
		},
		mistakesQueue: {
			count: mistakesCount,
			estimatedMinutes: Math.max(1, Math.round(mistakesCount * 0.35)),
			href: "/mistakes"
		}
	}
}

async function loadUserProfile(userId: string): Promise<UserProfile> {
	const rows = await db
		.select({
			id: users.id,
			name: users.name,
			targetDateMs: users.targetDateMs,
			targetScore: users.targetScore
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)
	const row = rows[0]
	if (row === undefined) {
		logger.error({ userId }, "dashboard profile: user row missing")
		throw errors.new("dashboard profile: user row missing")
	}
	if (row.name === null) {
		logger.error({ userId }, "dashboard profile: user has no name (auth invariant broken)")
		throw errors.new("user has no name")
	}
	const fullName = row.name
	const firstName = firstNameFor(fullName)
	const initials = initialsFor(fullName)
	const nowMs = Date.now()
	const targetDateMs = row.targetDateMs === null ? undefined : row.targetDateMs
	const daysToTest =
		targetDateMs === undefined
			? undefined
			: Math.max(0, Math.ceil((targetDateMs - nowMs) / 86_400_000))
	return {
		id: row.id,
		firstName,
		initials,
		goal: row.targetScore,
		daysToTest,
		targetDateMs
	}
}

function firstNameFor(name: string): string {
	const parts = name.split(" ")
	const first = parts[0]
	if (first === undefined || first.length === 0) return name
	return first
}

function initialsFor(name: string): string {
	const parts = name
		.trim()
		.split(/\s+/)
		.filter(function nonEmpty(p) {
			return p.length > 0
		})
	if (parts.length === 0) return "?"
	if (parts.length === 1) {
		const single = parts[0]
		if (single === undefined) return "?"
		return single.charAt(0).toUpperCase()
	}
	const first = parts[0]
	const last = parts[parts.length - 1]
	if (first === undefined || last === undefined) return "?"
	return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export { getDashboardData }
