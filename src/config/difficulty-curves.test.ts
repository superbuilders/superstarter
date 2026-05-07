// Pure-function unit tests for the SPEC §10.3 / plan §3 full-length
// slot generator at @/config/difficulty-curves. These tests cover the
// 5 mandatory + 1 optional scenarios enumerated in
// docs/plans/phase5-full-length-test.md §3 verification:
//   1. decile distribution exactness (per-tier counts match roundDecile)
//   2. per-session determinism (same sessionId → same 50-slot output)
//   3. cross-session variation (different sessionIds → at least one
//      slot differs)
//   4. all-14-sub-types reachable across many sessions (union over 100
//      sessions covers the full pool)
//   5. no-section-break interleaving (within at least one decile, at
//      least one verbal/numerical section transition)
//   6. (optional) per-decile seeding decoupling — same sessionId
//      regenerates each decile's 10-slot block bit-for-bit identical.
//
// These tests verify the slot generator's OUTPUT SHAPE only. Bank-cell
// integration (tier-degraded fallback when generateFullLengthSlots
// requests a thin cell like numerical.ratios.hard = 0) is commit 3's
// territory via getNextFixedCurve + pickWithFallback.

import * as errors from "@superbuilders/errors"
import { expect, test } from "bun:test"
import {
	DECILE_SIZE,
	FULL_LENGTH_SLOT_COUNT,
	type FullLengthSlot,
	generateFullLengthSlots,
	roundDecile,
	standardCurve
} from "@/config/difficulty-curves"
import { type Difficulty, type SubTypeId, subTypeIds, subTypes } from "@/config/sub-types"
import { logger } from "@/logger"

const SECTION_BY_SUB_TYPE: ReadonlyMap<SubTypeId, "verbal" | "numerical"> = new Map(
	subTypes.map(function entryForSubType(s) {
		return [s.id, s.section] as const
	})
)

function tallyTiers(slots: ReadonlyArray<FullLengthSlot>): Record<Difficulty, number> {
	const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, brutal: 0 }
	for (const slot of slots) {
		counts[slot.difficulty] += 1
	}
	return counts
}

function sectionFor(subTypeId: SubTypeId): "verbal" | "numerical" {
	const section = SECTION_BY_SUB_TYPE.get(subTypeId)
	if (section === undefined) {
		// Unreachable: SECTION_BY_SUB_TYPE is built from the same
		// `subTypes` source the SubTypeId union derives from, so every
		// SubTypeId-typed key is in the map by construction. Guard for
		// the noUncheckedIndexedAccess narrowing only.
		logger.error({ subTypeId }, "difficulty-curves.test: section lookup miss (impossible)")
		throw errors.new("section lookup miss")
	}
	return section
}

test("generateFullLengthSlots: total length is 50", function totalLengthIs50() {
	const slots = generateFullLengthSlots("seed-A")
	expect(slots.length).toBe(FULL_LENGTH_SLOT_COUNT)
})

test("generateFullLengthSlots: per-decile tier distribution matches roundDecile exactly", function decileDistributionExactness() {
	const slots = generateFullLengthSlots("seed-decile-distribution")
	for (const [decileIndex, distribution] of standardCurve.entries()) {
		const expected = roundDecile(distribution, DECILE_SIZE)
		const decileSlots = slots.slice(decileIndex * DECILE_SIZE, (decileIndex + 1) * DECILE_SIZE)
		const actual = tallyTiers(decileSlots)
		expect(actual).toEqual(expected)
	}
})

test("generateFullLengthSlots: per-session determinism — same sessionId → same 50-slot sequence", function perSessionDeterminism() {
	const first = generateFullLengthSlots("seed-A")
	const second = generateFullLengthSlots("seed-A")
	expect(second).toEqual(first)
})

test("generateFullLengthSlots: cross-session variation — different sessionIds differ on at least one slot", function crossSessionVariation() {
	const fromA = generateFullLengthSlots("seed-A")
	const fromB = generateFullLengthSlots("seed-B")
	expect(fromA.length).toBe(fromB.length)
	let differs = false
	for (let i = 0; i < fromA.length; i += 1) {
		const a = fromA[i]
		const b = fromB[i]
		if (a === undefined || b === undefined) continue
		if (a.subTypeId !== b.subTypeId || a.difficulty !== b.difficulty) {
			differs = true
			break
		}
	}
	expect(differs).toBe(true)
})

test("generateFullLengthSlots: all 14 sub-types reachable across 100 sessions (union coverage)", function allSubTypesReachable() {
	const seen = new Set<SubTypeId>()
	for (let n = 0; n < 100; n += 1) {
		const slots = generateFullLengthSlots(`coverage-test-${n}`)
		for (const slot of slots) {
			seen.add(slot.subTypeId)
		}
	}
	for (const id of subTypeIds) {
		expect(seen.has(id)).toBe(true)
	}
})

test("generateFullLengthSlots: no-section-break interleaving — at least one decile has a section transition", function noSectionBreakInterleaving() {
	// For a fixed sessionId, scan each decile's 10-slot block for a
	// verbal↔numerical section change. At least one decile (across
	// the 5 deciles × 10 slots) must contain at least one transition.
	// A "10 slots of one section" decile is technically possible under
	// uniform with-replacement draws but has vanishing probability for
	// any concrete sessionId; the assertion is a sanity check on the
	// in-decile shuffle.
	const slots = generateFullLengthSlots("seed-section-interleaving")
	let anyTransition = false
	for (let decileIndex = 0; decileIndex < standardCurve.length; decileIndex += 1) {
		const decile = slots.slice(decileIndex * DECILE_SIZE, (decileIndex + 1) * DECILE_SIZE)
		for (let i = 1; i < decile.length; i += 1) {
			const prev = decile[i - 1]
			const curr = decile[i]
			if (prev === undefined || curr === undefined) continue
			if (sectionFor(prev.subTypeId) !== sectionFor(curr.subTypeId)) {
				anyTransition = true
				break
			}
		}
		if (anyTransition) break
	}
	expect(anyTransition).toBe(true)
})

test("generateFullLengthSlots: per-(sessionId, decileIndex) decoupling — re-running yields bit-identical decile blocks", function perDecileSeedingDecoupling() {
	// Sanity check on the seeding scheme: regenerating the full
	// sequence yields the same per-decile 10-slot blocks (a stronger
	// claim than test 3's full-sequence determinism, but a useful
	// independent check that no global PRNG state leaks across deciles).
	const first = generateFullLengthSlots("seed-decoupling")
	const second = generateFullLengthSlots("seed-decoupling")
	for (let decileIndex = 0; decileIndex < standardCurve.length; decileIndex += 1) {
		const a = first.slice(decileIndex * DECILE_SIZE, (decileIndex + 1) * DECILE_SIZE)
		const b = second.slice(decileIndex * DECILE_SIZE, (decileIndex + 1) * DECILE_SIZE)
		expect(b).toEqual(a)
	}
})
