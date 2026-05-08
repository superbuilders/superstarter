// Dashboard pace helper. Real reads against practice_sessions +
// attempts; semantically refocused from "Pace this week" (dashboard
// round) to "Previous pace" (practice round, ask 4) — the median
// latency of the last full_length sim, plus a 5-sim history sparkline.
//
// Practice round commit 6 (`docs/plans/practice-round.md` §5 commit 6)
// replaced the dashboard-round STUB return with the queries below.
// The helper's return shape adds new fields (previousMedianMs +
// last5SimMedianMs) WITHOUT removing the old fields (medianMs +
// perDayMs); both shapes co-exist through commits 6-9. The atomic
// bottom-strip removal at commit 10 prunes <PaceMetric> + the old
// type fields. This avoids breaking <PaceMetric>'s rendering during
// the 4-commit window.
//
// **Transitional fields (deprecated this round):**
//   - medianMs: populated as previousMedianMs (or 0 if 0 sims)
//   - perDayMs: zero-array length 7 (not real "this-week" data
//     anymore; <PaceMetric> renders zero-bars during the
//     transitional window)
// Orchestrator at data.ts continues mapping these to
// DashboardData["pace"].medianSeconds + last7Days.
//
// **New fields (real this round):**
//   - previousMedianMs: median latency over all attempts in the most
//     recent full_length sim. undefined when 0 sims.
//   - last5SimMedianMs: ReadonlyArray<number | undefined> of length
//     5, OLDEST-TO-NEWEST. Padded with undefined for missing slots.
//     E.g. user with 2 sims → [undefined, undefined, undefined, m_old,
//     m_new]. Renders as subdued empty bars in the sparkline at
//     commit 9.
//
// **Median query:** PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY
// latency_ms)::int per session. Cross-DB-portable PG aggregate.
// Established precedent at
// src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx:95.
// LEFT JOIN keeps sessions even if they have zero attempts; in that
// edge case PERCENTILE_CONT returns NULL → mapped to undefined in
// the JS layer. Real full_length sims always have attempts; the
// LEFT JOIN+NULL path is defensive.

import * as errors from "@superbuilders/errors"
import { and, eq, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"

const SIM_HISTORY_LENGTH = 5

interface PaceWeek {
	/** Transitional. Populated as previousMedianMs (or 0 if no sims).
	 * Pruned at commit 10. */
	medianMs: number
	/** Transitional. Length 7, all zeros. Pruned at commit 10. */
	perDayMs: ReadonlyArray<number>
	/** Median latency (ms) over all attempts in the most recent
	 * full_length sim. undefined when the user has zero completed
	 * full sims. */
	previousMedianMs: number | undefined
	/** Length-5 array of per-sim median latencies (ms),
	 * OLDEST-TO-NEWEST. Missing slots padded with undefined.
	 * E.g. 2 sims → [undefined, undefined, undefined, m_old, m_new]. */
	last5SimMedianMs: ReadonlyArray<number | undefined>
}

interface SimMedianRow {
	sessionId: string
	endedAtMs: number
	medianMs: number | undefined
}

const ZERO_PER_DAY_MS: ReadonlyArray<number> = [0, 0, 0, 0, 0, 0, 0]

async function loadLastSimMedians(userId: string): Promise<ReadonlyArray<SimMedianRow>> {
	const result = await errors.try(
		db
			.select({
				sessionId: practiceSessions.id,
				endedAtMs: practiceSessions.endedAtMs,
				medianMs: sql<
					number | null
				>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${attempts.latencyMs})::int`
			})
			.from(practiceSessions)
			.leftJoin(attempts, eq(attempts.sessionId, practiceSessions.id))
			.where(
				and(
					eq(practiceSessions.userId, userId),
					eq(practiceSessions.type, "full_length"),
					isNotNull(practiceSessions.endedAtMs)
				)
			)
			.groupBy(practiceSessions.id)
			.orderBy(sql`${practiceSessions.endedAtMs} DESC`)
			.limit(SIM_HISTORY_LENGTH)
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "loadLastSimMedians: query failed")
		throw errors.wrap(result.error, "loadLastSimMedians")
	}
	return result.data.map(function toRow(row): SimMedianRow {
		// endedAtMs is filtered NOT NULL in the WHERE; defensive guard
		// for TS narrowing.
		const ended = row.endedAtMs
		if (ended === null) {
			logger.error(
				{ userId, sessionId: row.sessionId },
				"loadLastSimMedians: endedAtMs null after IS NOT NULL filter (impossible)"
			)
			throw errors.new("loadLastSimMedians: endedAtMs null after filter")
		}
		// PERCENTILE_CONT over zero attempts (defensive — real
		// full_length sims always have attempts) returns NULL; map to
		// undefined. Single-side T | null in the column type lets us
		// honestly check for null without super-lint flagging an
		// unnecessary-condition (vs commit 5's COALESCE-on-SQL-side
		// pattern, which fits SUM but not PERCENTILE_CONT — coalescing
		// the median to 0 would be a misleading data value).
		const median = row.medianMs === null ? undefined : row.medianMs
		return { sessionId: row.sessionId, endedAtMs: ended, medianMs: median }
	})
}

async function computePaceWeek(userId: string): Promise<PaceWeek> {
	const rows = await loadLastSimMedians(userId)
	logger.debug(
		{ userId, rowCount: rows.length },
		"computePaceWeek: queried last-5 full-length sim medians"
	)
	// Rows come back newest-first (ORDER BY endedAtMs DESC). The
	// last5SimMedianMs array is oldest-to-newest with right-aligned
	// fill: missing slots at the head, newest at the tail.
	const last5SimMedianMs: Array<number | undefined> = [
		undefined,
		undefined,
		undefined,
		undefined,
		undefined
	]
	for (let i = 0; i < rows.length; i++) {
		// rows[0] is newest → goes to slot 4 (last). rows[1] → slot 3.
		const slot = SIM_HISTORY_LENGTH - 1 - i
		const row = rows[i]
		if (row === undefined) continue
		last5SimMedianMs[slot] = row.medianMs
	}
	const previousMedianMs = rows[0]?.medianMs
	const medianMsTransitional = previousMedianMs === undefined ? 0 : previousMedianMs
	return {
		medianMs: medianMsTransitional,
		perDayMs: ZERO_PER_DAY_MS,
		previousMedianMs,
		last5SimMedianMs
	}
}

export { computePaceWeek }
