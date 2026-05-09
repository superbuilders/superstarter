// Dashboard belt-row loader. Mirrors the post-session <BeltIndicator>:
// each sub-type's belt color is derived from the user's most-recent
// drill attempt's REQUESTED tier (`COALESCE(fallback_from_tier,
// served_at_tier)` per SPEC §9.2 — same expression
// `getEndSessionTierForDrill` reads). Sub-types the user has never
// drilled stay at white.
//
// Tier → belt mapping matches `tierToBeltColor` in
// src/components/post-session/belt-indicator.tsx so the dashboard's
// <BeltStripe> and the post-session <BeltIndicator> always agree:
//   easy   → white
//   medium → blue
//   hard   → brown
//   brutal → black
//
// Drill-only filter (`practice_sessions.type = 'drill'`) matches the
// post-session indicator's null-on-non-drill branch — the adaptive
// walker is drill-mode only, so non-drill attempts don't carry a
// meaningful tier signal for this surface.
//
// `lastAttemptedAtMs` is decoded from the most-recent attempt's
// UUIDv7 prefix via `timestampFromUuidv7` (see
// src/db/lib/uuid-time.ts); the row's `id` already carries the
// attempt's creation time, so no separate timestamp column is
// needed (and per the no-timestamp-columns rule, none would be
// allowed). undefined when the user has never drilled the
// sub-type. Drives both the row's "last drilled" text and the
// dashboard's last-worked-on sort key.
//
// `atRisk` remains stubbed at false — the at-risk evaluator is
// part of the deferred Belts PRD (`docs/plans/dashboard.md` §9
// row 3); only the visible belt color + last-drilled timestamp
// are wired here.
//
// `name` is `s.displayName` directly (Title Case), per
// `docs/plans/dashboard.md` §3 decision F.
//
// `href` points at /drill/<subTypeId>/run since practice round commit
// 2 (`docs/plans/practice-round.md` §5 commit 2 + ask 7).

import * as errors from "@superbuilders/errors"
import { and, desc, eq, sql } from "drizzle-orm"
import type { Difficulty } from "@/config/sub-types"
import { subTypes } from "@/config/sub-types"
import { db } from "@/db"
import { timestampFromUuidv7 } from "@/db/lib/uuid-time"
import { items } from "@/db/schemas/catalog/items"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import type { BeltLevel, SubtypeRow } from "@/server/dashboard/types"

function tierToBelt(tier: Difficulty): BeltLevel {
	if (tier === "easy") return "white"
	if (tier === "medium") return "blue"
	if (tier === "hard") return "brown"
	if (tier === "brutal") return "black"
	const _exhaustive: never = tier
	return _exhaustive
}

interface MostRecentDrillAttempt {
	tier: Difficulty
	attemptId: string
}

async function loadMostRecentDrillBySubType(
	userId: string
): Promise<Map<string, MostRecentDrillAttempt>> {
	const result = await errors.try(
		db
			.selectDistinctOn([items.subTypeId], {
				subTypeId: items.subTypeId,
				tier: sql<Difficulty>`COALESCE(${attempts.fallbackFromTier}, ${attempts.servedAtTier})`,
				attemptId: attempts.id
			})
			.from(attempts)
			.innerJoin(items, eq(attempts.itemId, items.id))
			.innerJoin(practiceSessions, eq(attempts.sessionId, practiceSessions.id))
			.where(
				and(eq(practiceSessions.userId, userId), eq(practiceSessions.type, "drill"))
			)
			.orderBy(items.subTypeId, desc(attempts.id))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, userId },
			"loadMostRecentDrillBySubType: query failed"
		)
		throw errors.wrap(result.error, "loadMostRecentDrillBySubType")
	}
	const map = new Map<string, MostRecentDrillAttempt>()
	for (const row of result.data) {
		map.set(row.subTypeId, { tier: row.tier, attemptId: row.attemptId })
	}
	return map
}

async function loadAllBelts(
	userId: string,
	section: "verbal" | "numerical"
): Promise<ReadonlyArray<SubtypeRow>> {
	const recentBySubType = await loadMostRecentDrillBySubType(userId)
	logger.debug(
		{ userId, section, subTypesWithDrillHistory: recentBySubType.size },
		"loadAllBelts: derived belts from most-recent drill attempts"
	)
	return subTypes
		.filter(function bySection(s) {
			return s.section === section
		})
		.map(function toRow(s): SubtypeRow {
			const recent = recentBySubType.get(s.id)
			const belt = recent === undefined ? "white" : tierToBelt(recent.tier)
			const lastAttemptedAtMs =
				recent === undefined ? undefined : timestampFromUuidv7(recent.attemptId).getTime()
			return {
				id: s.id,
				slug: s.id,
				name: s.displayName,
				belt,
				lastAttemptedAtMs,
				atRisk: false,
				href: `/drill/${encodeURIComponent(s.id)}/run`
			}
		})
}

export { loadAllBelts, tierToBelt }
