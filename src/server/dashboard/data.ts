// Dashboard data orchestrator + loadUserProfile real read. Dashboard
// PRD §6 + §6.1 + `docs/plans/dashboard.md` §5 commit 5 +
// `docs/plans/practice-round.md` §5 commit 4.
//
// The orchestrator composes one real read (loadUserProfile) and seven
// stubbed helpers into a single DashboardData payload. Each helper
// lives in its own file under @/server/dashboard/ so a follow-up PRD
// can replace one stub at a time without touching this orchestrator
// (`docs/plans/dashboard.md` §9 lists the stub-removal sequence).
//
// loadUserProfile is private to this file. It reads `users` directly
// for `id`, `name`, `targetDateMs`, and `targetScore`.
// `target_percentile` is intentionally NOT read
// (`docs/plans/dashboard.md` §2.4 audit). Practice round commit 4
// (this commit) replaced the previous STUB_GOAL_SCORE=40 constant
// with a real read of users.target_score: the column was added at
// practice round commit 3 with NOT NULL DEFAULT 40, so every
// existing user row has 40 and the read returns a number
// unconditionally.
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
import { countMistakes } from "@/server/dashboard/mistakes"
import { pickTodaysMission } from "@/server/dashboard/mission"
import { computePaceWeek } from "@/server/dashboard/pace"
import { computeScoreEstimate, getLastFullSim } from "@/server/dashboard/score"
import { computeStreak } from "@/server/dashboard/streak"
import type { DashboardData } from "@/server/dashboard/types"

interface UserProfile {
	id: string
	firstName: string
	initials: string
	goal: number
	daysToTest?: number
}

/**
 * Returns the dashboard payload for the given user.
 *
 * Helper status as of practice round commit 4:
 *   - loadUserProfile        → real read (auth/users; target_score
 *                              wired this commit, was STUB_GOAL_SCORE
 *                              pre-practice-round)
 *   - loadAllBelts           → STUB (Belts PRD)
 *   - pickTodaysMission      → STUB (Mission Picker PRD; real impl
 *                              lands at practice round commit 7)
 *   - computeScoreEstimate   → STUB (Sim Scoring PRD; real impl
 *                              lands at practice round commit 5)
 *   - computeStreak          → STUB (Streaks PRD)
 *   - computePaceWeek        → STUB (Pace-Strip PRD; real impl
 *                              lands at practice round commit 6)
 *   - countMistakes          → STUB (Mistakes PRD; real impl lands
 *                              at practice round commit 8)
 *   - getLastFullSim         → STUB (Sim Scoring PRD; real impl
 *                              lands at practice round commit 5)
 */
async function getDashboardData(userId: string): Promise<DashboardData> {
	logger.info({ userId }, "dashboard data requested")

	const profileResult = await errors.try(loadUserProfile(userId))
	if (profileResult.error) {
		logger.error({ error: profileResult.error, userId }, "dashboard profile load failed")
		throw errors.wrap(profileResult.error, "dashboard profile load")
	}
	const profile = profileResult.data

	const [verbal, numerical, mission, score, streakDays, pace, mistakesCount, lastSim] =
		await Promise.all([
			loadAllBelts(userId, "verbal"),
			loadAllBelts(userId, "numerical"),
			pickTodaysMission(userId),
			computeScoreEstimate(userId),
			computeStreak(userId),
			computePaceWeek(userId),
			countMistakes(userId),
			getLastFullSim(userId)
		])

	const last7Days = pace.perDayMs.map(function toPaceDay(ms, i) {
		return {
			medianSeconds: ms / 1000,
			isToday: i === pace.perDayMs.length - 1
		}
	})

	return {
		user: {
			firstName: profile.firstName,
			initials: profile.initials,
			streakDays
		},
		greeting: {
			today: new Date(),
			headline: deriveHeadline({ delta: score.delta, hasSim: lastSim !== undefined })
		},
		score: {
			current: score.current,
			delta: score.delta,
			goal: profile.goal,
			daysToTest: profile.daysToTest
		},
		mission,
		verbal,
		numerical,
		pace: {
			medianSeconds: pace.medianMs / 1000,
			targetSeconds: 18,
			last7Days
		},
		mistakesQueue: {
			count: mistakesCount,
			estimatedMinutes: Math.max(1, Math.round(mistakesCount * 0.35)),
			href: "/review"
		},
		lastSim
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
	const daysToTest =
		row.targetDateMs === null
			? undefined
			: Math.max(0, Math.ceil((row.targetDateMs - nowMs) / 86_400_000))
	return {
		id: row.id,
		firstName,
		initials,
		goal: row.targetScore,
		daysToTest
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
