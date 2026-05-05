// DB-driven tests for the diagnostic selection engine — plan
// docs/plans/phase3-diagnostic-flow.md §3 (sampling determinism).
//
// These tests exercise:
//
//   - Within-cell determinism: pickItemRow called twice with the same
//     (subTypeId, tier, excludedIds, sessionIdSalt) returns the same
//     item id. The selection's md5(items.id::text || salt) ORDER BY
//     gives a deterministic permutation per (cell, salt) pair.
//
//   - Within-cell variation across sessions: pickItemRow with different
//     salts produces varied first-served items. Statistical: with 20
//     distinct salts, at least 2 distinct items must surface (under a
//     uniform hash, the probability of all 20 collapsing to one item
//     is vanishingly small for any cell with ≥2 live items).
//
//   - No-re-serve within a session: drive a 50-attempt diagnostic to
//     completion; assert all 50 attempt.item_id values are distinct.
//     The selection engine's session-attempted-ids exclusion is what
//     guarantees this.
//
// Tests assume the local docker postgres is up + seeded (db:seed +
// db:seed:items). Each test creates its own user and isolates state to
// that user.

import "@/env"
import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { and, count, eq } from "drizzle-orm"
import { createAdminDb } from "@/db/admin"
import { attempts } from "@/db/schemas/practice/attempts"
import { items } from "@/db/schemas/catalog/items"
import { users } from "@/db/schemas/auth/users"
import { logger } from "@/logger"
import type { ItemForRender } from "@/components/focus-shell/types"
import { pickItemRow } from "@/server/items/queries"
import { startSession } from "@/server/sessions/start"
import { submitAttempt } from "@/server/sessions/submit"

const ErrUserInsertEmpty = errors.new("selection-test: user insert returned no rows")
const ErrCellEmpty = errors.new("selection-test: dev DB has no live items in target cell")
const ErrCellTooSmall = errors.new("selection-test: dev DB has <2 live items in target cell")
const ErrPickReturnedNull = errors.new("selection-test: pickItemRow returned null unexpectedly")
const ErrUnexpectedNextItemAbsence = errors.new("selection-test: nextItem undefined before quota")

async function createTestUser(suffix: string): Promise<string> {
	await using adminDb = await createAdminDb()
	const email = `selection-test-${suffix}-${Date.now()}@local.dev`
	const result = await errors.try(
		adminDb.db
			.insert(users)
			.values({ email, name: "Selection Test" })
			.returning({ id: users.id })
	)
	if (result.error) {
		logger.error({ error: result.error, email }, "selection-test: user insert failed")
		throw errors.wrap(result.error, "user insert")
	}
	const u = result.data[0]
	if (!u) {
		logger.error({ email }, "selection-test: user insert returned no rows")
		throw ErrUserInsertEmpty
	}
	return u.id
}

async function liveCellItemCount(subTypeId: string): Promise<number> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({ n: count() })
			.from(items)
			.where(and(eq(items.subTypeId, subTypeId), eq(items.status, "live")))
	)
	if (result.error) {
		logger.error({ error: result.error, subTypeId }, "selection-test: live cell count failed")
		throw errors.wrap(result.error, "live cell count")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ subTypeId }, "selection-test: live cell count returned no rows (impossible)")
		throw errors.new("count returned no rows")
	}
	return row.n
}

test("pickItemRow: within-cell determinism — same (cell, salt) returns same item", async function withinCellDeterminism() {
	// Sentinel UUID; reused across the two pickItemRow calls so the md5
	// ORDER BY produces the same permutation both times.
	const salt = "11111111-1111-1111-1111-111111111111"
	const subTypeId = "verbal.antonyms"
	const tier = "medium"

	const liveCount = await liveCellItemCount(subTypeId)
	if (liveCount < 1) {
		logger.error({ subTypeId, tier }, "selection-test: cell empty, can't run determinism check")
		throw ErrCellEmpty
	}

	const first = await pickItemRow({ subTypeId, tier, excludedIds: [], sessionIdSalt: salt })
	const second = await pickItemRow({ subTypeId, tier, excludedIds: [], sessionIdSalt: salt })
	if (!first || !second) {
		logger.error({ first, second, subTypeId, tier }, "selection-test: pickItemRow returned null")
		throw ErrPickReturnedNull
	}
	expect(first.id).toBe(second.id)
})

test("pickItemRow: within-cell variation across sessions — different salts surface different items", async function withinCellVariationAcrossSessions() {
	const subTypeId = "verbal.antonyms"
	const tier = "medium"
	const liveCount = await liveCellItemCount(subTypeId)
	if (liveCount < 2) {
		// If the dev DB has only one live item in this cell, salt variation
		// is trivially monotone; skip with an explicit error rather than
		// silently passing.
		logger.error(
			{ subTypeId, tier, liveCount },
			"selection-test: cell <2 items, can't test salt variation"
		)
		throw ErrCellTooSmall
	}

	const seenIds = new Set<string>()
	// 20 distinct salts. With ≥2 live items and a uniform-hash ORDER BY,
	// the probability of all 20 collapsing to one item is at most
	// (1/2)^19 ≈ 2e-6. The set should have ≥2 entries with overwhelming
	// probability.
	for (let i = 0; i < 20; i += 1) {
		const salt = `aaaaaaaa-bbbb-cccc-dddd-${i.toString(16).padStart(12, "0")}`
		const row = await pickItemRow({ subTypeId, tier, excludedIds: [], sessionIdSalt: salt })
		if (row) seenIds.add(row.id)
	}
	expect(seenIds.size).toBeGreaterThanOrEqual(2)
})

test("getNextItem: no re-serve within a session — 50 attempts produce 50 distinct item_ids", async function noReServeInSession() {
	const userId = await createTestUser("no-reserve")
	const start = await startSession({ userId, type: "diagnostic" })
	const sessionId = start.sessionId

	let next: ItemForRender = start.firstItem
	for (let i = 1; i <= 49; i += 1) {
		const r = await errors.try(
			submitAttempt({
				sessionId,
				itemId: next.id,
				selectedAnswer: next.options[0]?.id,
				latencyMs: 5000,
				triagePromptFired: false,
				triageTaken: false,
				selection: next.selection
			})
		)
		if (r.error) {
			logger.error({ error: r.error, sessionId, i }, "selection-test: submit failed")
			throw errors.wrap(r.error, "submit")
		}
		const data = r.data
		if (data.nextItem === undefined) {
			logger.error(
				{ sessionId, i },
				"selection-test: nextItem undefined before quota; mix exhausted early"
			)
			throw ErrUnexpectedNextItemAbsence
		}
		next = data.nextItem
	}

	// Final 50th submit — selection engine produces undefined here (mix
	// exhausted).
	const fiftiethResult = await errors.try(
		submitAttempt({
			sessionId,
			itemId: next.id,
			selectedAnswer: next.options[0]?.id,
			latencyMs: 5000,
			triagePromptFired: false,
			triageTaken: false,
			selection: next.selection
		})
	)
	if (fiftiethResult.error) {
		logger.error({ error: fiftiethResult.error, sessionId }, "selection-test: submit 50 failed")
		throw errors.wrap(fiftiethResult.error, "submit 50")
	}
	expect(fiftiethResult.data.nextItem).toBeUndefined()

	// Read all attempts back. Assert 50 rows, all distinct item_ids.
	await using adminDb = await createAdminDb()
	const rowsResult = await errors.try(
		adminDb.db
			.select({ itemId: attempts.itemId })
			.from(attempts)
			.where(eq(attempts.sessionId, sessionId))
	)
	if (rowsResult.error) {
		logger.error({ error: rowsResult.error, sessionId }, "selection-test: attempts read failed")
		throw errors.wrap(rowsResult.error, "read attempts")
	}
	const itemIds = rowsResult.data.map(function pickItemId(r) {
		return r.itemId
	})
	expect(itemIds.length).toBe(50)
	const distinct = new Set(itemIds)
	expect(distinct.size).toBe(50)
}, 60_000)
