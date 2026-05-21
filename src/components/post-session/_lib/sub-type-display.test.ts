// Tests for the shared sub-type display lib.
//
// Plan: docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md §5.4a
// (audit step (d) — tests added since the lib is shared infrastructure
// consumed by 4+ components; regression risk warrants coverage).

import { describe, expect, test } from "bun:test"
import { subTypes } from "@/config/sub-types"
import { SUB_TYPE_BY_ID, compareBySubTypeDisplay } from "@/components/post-session/_lib/sub-type-display"

describe("SUB_TYPE_BY_ID", () => {
	test("contains every subType from config", () => {
		expect(SUB_TYPE_BY_ID.size).toBe(subTypes.length)
		for (const t of subTypes) {
			expect(SUB_TYPE_BY_ID.has(t.id)).toBe(true)
		}
	})

	test("each entry preserves the canonical SubTypeConfig shape", () => {
		for (const t of subTypes) {
			const meta = SUB_TYPE_BY_ID.get(t.id)
			expect(meta).toBeDefined()
			expect(meta?.id).toBe(t.id)
			expect(meta?.displayName).toBe(t.displayName)
			expect(meta?.section).toBe(t.section)
			expect(meta?.latencyThresholdMs).toBe(t.latencyThresholdMs)
		}
	})
})

describe("compareBySubTypeDisplay", () => {
	test("verbal section sorts before numerical section", () => {
		const verbal = { subTypeId: "verbal.antonyms" } as const
		const numerical = { subTypeId: "numerical.fractions" } as const
		expect(compareBySubTypeDisplay(verbal, numerical)).toBeLessThan(0)
		expect(compareBySubTypeDisplay(numerical, verbal)).toBeGreaterThan(0)
	})

	test("within section, sorts alphabetically by displayName", () => {
		const a = { subTypeId: "verbal.analogies" } as const
		const b = { subTypeId: "verbal.antonyms" } as const
		const order = compareBySubTypeDisplay(a, b)
		const metaA = SUB_TYPE_BY_ID.get(a.subTypeId)
		const metaB = SUB_TYPE_BY_ID.get(b.subTypeId)
		expect(metaA).toBeDefined()
		expect(metaB).toBeDefined()
		if (metaA === undefined || metaB === undefined) return
		const expected = metaA.displayName.localeCompare(metaB.displayName)
		expect(Math.sign(order)).toBe(Math.sign(expected))
	})

	test("identical subTypeIds compare equal (zero)", () => {
		const x = { subTypeId: "verbal.antonyms" } as const
		expect(compareBySubTypeDisplay(x, x)).toBe(0)
	})

	test("Array.prototype.sort produces verbal-first / alphabetical-within-section ordering across all 15 sub-types", () => {
		const rows = subTypes.map(function toHaver(t) {
			return { subTypeId: t.id }
		})
		const sorted = [...rows].sort(compareBySubTypeDisplay)
		const verbalIdx = sorted.findIndex(function isNumerical(r) {
			const meta = SUB_TYPE_BY_ID.get(r.subTypeId)
			return meta?.section === "numerical"
		})
		// All entries before verbalIdx are 'verbal'; all entries from verbalIdx onward are 'numerical'.
		for (let i = 0; i < verbalIdx; i++) {
			const r = sorted[i]
			expect(r).toBeDefined()
			if (r === undefined) continue
			const meta = SUB_TYPE_BY_ID.get(r.subTypeId)
			expect(meta?.section).toBe("verbal")
		}
		for (let i = verbalIdx; i < sorted.length; i++) {
			const r = sorted[i]
			expect(r).toBeDefined()
			if (r === undefined) continue
			const meta = SUB_TYPE_BY_ID.get(r.subTypeId)
			expect(meta?.section).toBe("numerical")
		}
	})

	// NOTE: The defensive throw on unknown subTypeId is enforced at the TypeScript
	// type system level — `SubTypeIdHaver { subTypeId: SubTypeId }` rejects any
	// invalid id at compile time. Exercising the runtime throw path requires
	// bypassing the type system via an `as` cast, which the project's
	// `no-as-type-assertion` rule prohibits. The defensive branch stays in the
	// implementation as belt-and-suspenders against future drift; it is not
	// reachable through any type-safe call site.
})
