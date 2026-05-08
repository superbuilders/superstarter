// Dashboard "today's mission" picker. Real implementation against
// practice_sessions + mastery_state. Practice round commit 7
// (`docs/plans/practice-round.md` §5 commit 7 + ask 6).
//
// **Alternate CTA semantics:**
//   - Targets the lowest-mastery sub-type, alternating verbal/numerical
//     based on the user's most-recent drill session's section.
//   - Last drilled verbal → next mission is numerical (and vice versa).
//   - No prior drill → defaults to verbal (decision 7 from the plan).
//   - Lowest-mastery within a section: order by mastery rank ASC
//     (learning < decayed < fluent < mastered), tie-break by
//     updatedAtMs ASC (stalest first; longest time since drill).
//
// **Empty-state fallbacks:**
//   - User has 0 mastery_state rows for the target section (hasn't
//     completed diagnostic for those sub-types) → falls back to the
//     first sub-type of the section by config order
//     (verbal.antonyms or numerical.number_series). This is
//     theoretically reachable for users mid-diagnostic; in practice
//     the (app)/layout.tsx gate requires diagnostic completion before
//     the dashboard renders, so all 14 mastery_state rows should
//     exist by the time pickTodaysMission runs.
//   - User has 0 drill sessions → tie-break to verbal per decision 7.
//
// **Primary CTA unchanged:** still "Take your baseline simulation"
// → /full-length/configure. Only the alternate CTA's runtime values
// change vs the dashboard-round stub. The interim
// alternateHref="/full-length/configure" placeholder from practice
// round commit 1 (decision 4 transitional fallback) is replaced
// here with the real per-user picker.

import * as errors from "@superbuilders/errors"
import { and, desc, eq } from "drizzle-orm"
import { type SubTypeConfig, type SubTypeId, subTypes } from "@/config/sub-types"
import { db } from "@/db"
import { masteryState } from "@/db/schemas/practice/mastery-state"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import type { DashboardData } from "@/server/dashboard/types"

type MasteryLevel = "learning" | "fluent" | "mastered" | "decayed"
type Section = "verbal" | "numerical"

const MASTERY_RANK: Record<MasteryLevel, number> = {
	learning: 0,
	decayed: 1,
	fluent: 2,
	mastered: 3
}

interface MasteryRow {
	subTypeId: string
	currentState: MasteryLevel
	updatedAtMs: number
}

function sectionForSubTypeId(id: string): Section | undefined {
	const config = subTypes.find(function bySubTypeId(s) {
		return s.id === id
	})
	return config?.section
}

function alternateSection(priorSubTypeId: string | undefined): Section {
	if (priorSubTypeId === undefined) return "verbal"
	const priorSection = sectionForSubTypeId(priorSubTypeId)
	if (priorSection === undefined) {
		logger.warn(
			{ priorSubTypeId },
			"alternateSection: prior drill subTypeId not in config (defaulting to verbal)"
		)
		return "verbal"
	}
	return priorSection === "verbal" ? "numerical" : "verbal"
}

async function loadLastDrillSubTypeId(userId: string): Promise<string | undefined> {
	const result = await errors.try(
		db
			.select({ subTypeId: practiceSessions.subTypeId })
			.from(practiceSessions)
			.where(and(eq(practiceSessions.userId, userId), eq(practiceSessions.type, "drill")))
			.orderBy(desc(practiceSessions.endedAtMs))
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId },
			"loadLastDrillSubTypeId: query failed"
		)
		throw errors.wrap(result.error, "loadLastDrillSubTypeId")
	}
	const row = result.data[0]
	if (row === undefined) return undefined
	if (row.subTypeId === null) {
		// Defensive — drill sessions always carry a subTypeId per
		// practice_sessions schema constraints upstream of this query;
		// this branch shouldn't fire.
		logger.warn(
			{ userId },
			"loadLastDrillSubTypeId: drill session has null subTypeId (defensive)"
		)
		return undefined
	}
	return row.subTypeId
}

async function loadAllMasteryRows(userId: string): Promise<ReadonlyArray<MasteryRow>> {
	const result = await errors.try(
		db
			.select({
				subTypeId: masteryState.subTypeId,
				currentState: masteryState.currentState,
				updatedAtMs: masteryState.updatedAtMs
			})
			.from(masteryState)
			.where(eq(masteryState.userId, userId))
	)
	if (result.error) {
		logger.error({ error: result.error, userId }, "loadAllMasteryRows: query failed")
		throw errors.wrap(result.error, "loadAllMasteryRows")
	}
	return result.data
}

function pickLowestMasterySubType(
	rows: ReadonlyArray<MasteryRow>,
	section: Section
): SubTypeConfig {
	const sectionRows = rows.filter(function inSection(r) {
		return sectionForSubTypeId(r.subTypeId) === section
	})
	if (sectionRows.length === 0) {
		// No mastery_state rows for this section. Fall back to the
		// first sub-type of the section by config order. Reachable
		// pre-diagnostic-completion (theoretical only — the (app)
		// layout gate prevents pre-diagnostic dashboard renders).
		const firstInSection = subTypes.find(function inTargetSection(s) {
			return s.section === section
		})
		if (firstInSection === undefined) {
			logger.error(
				{ section },
				"pickLowestMasterySubType: no sub-types in section (impossible — config has 5 verbal + 9 numerical)"
			)
			throw errors.new("pickLowestMasterySubType: empty section")
		}
		return firstInSection
	}
	let best: MasteryRow | undefined
	for (const row of sectionRows) {
		if (best === undefined) {
			best = row
			continue
		}
		const rankDiff = MASTERY_RANK[row.currentState] - MASTERY_RANK[best.currentState]
		if (rankDiff < 0) {
			best = row
			continue
		}
		if (rankDiff === 0 && row.updatedAtMs < best.updatedAtMs) {
			best = row
		}
	}
	if (best === undefined) {
		// Impossible — sectionRows.length > 0 guaranteed best assigned.
		logger.error({ section }, "pickLowestMasterySubType: best undefined after loop (impossible)")
		throw errors.new("pickLowestMasterySubType: best undefined")
	}
	const config = subTypes.find(function byId(s) {
		return s.id === best.subTypeId
	})
	if (config === undefined) {
		logger.error(
			{ subTypeId: best.subTypeId },
			"pickLowestMasterySubType: mastery_state row's sub_type_id not in config (defensive)"
		)
		throw errors.new("pickLowestMasterySubType: unknown sub-type id")
	}
	return config
}

async function pickTodaysMission(userId: string): Promise<DashboardData["mission"]> {
	const [priorSubTypeId, masteryRows] = await Promise.all([
		loadLastDrillSubTypeId(userId),
		loadAllMasteryRows(userId)
	])
	const targetSection = alternateSection(priorSubTypeId)
	const chosen = pickLowestMasterySubType(masteryRows, targetSection)
	logger.info(
		{
			userId,
			priorSubTypeId,
			targetSection,
			chosenSubTypeId: chosen.id,
			masteryRowCount: masteryRows.length
		},
		"pickTodaysMission: alternate CTA resolved"
	)
	return {
		eyebrow: "Today's mission",
		title: "Take your baseline simulation",
		body: "We'll calibrate your belts and recommend daily missions from your first sim onward.",
		primaryHref: "/full-length/configure",
		primaryLabel: "Start full sim",
		alternateHref: `/drill/${encodeURIComponent(chosen.id satisfies SubTypeId)}/run`,
		alternateLabel: chosen.displayName
	}
}

export { pickTodaysMission }
