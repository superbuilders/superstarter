// Shared loader for the dashboard-style TopNav chrome shown on every
// authenticated route group surface (dashboard, /review, /lessons,
// /stats, /full-length/configure, /post-session/[sessionId]).
//
// Returns the two values <TopNav> needs: `initials` (avatar text) and
// `streakDays` (drives the streak chip's "Start your streak" vs
// "{N}-day streak" branch). Both reads run in parallel.
//
// The data shape mirrors what the dashboard's <Dashboard> component
// receives via DashboardData.user; consolidating in one helper keeps
// the avatar + streak chip identical across every surface that
// renders <TopNav>.

import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"
import { computeStreak } from "@/server/dashboard/streak"

interface NavChrome {
	userId: string
	initials: string
	streakDays: number
}

async function loadInitials(userId: string): Promise<string> {
	const result = await errors.try(
		db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1)
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "loadInitials: query failed")
		throw errors.wrap(result.error, "loadInitials")
	}
	const row = result.data[0]
	if (row === undefined) {
		logger.error({ userId }, "loadInitials: user row missing")
		throw errors.new("nav chrome: user row missing")
	}
	if (row.name === null) {
		logger.error({ userId }, "loadInitials: user has no name (auth invariant broken)")
		throw errors.new("user has no name")
	}
	return initialsFor(row.name)
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

async function loadNavChrome(userId: string): Promise<NavChrome> {
	const [initials, streakDays] = await Promise.all([loadInitials(userId), computeStreak(userId)])
	return { userId, initials, streakDays }
}

export type { NavChrome }
export { loadNavChrome }
