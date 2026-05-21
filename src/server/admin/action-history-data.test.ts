// Pure-function tests for the audit-history data module (Phase 4
// sub-phase b §2.5 commit 0). Mirrors queue-data.test.ts in shape: the
// DB-touching loader is NOT exercised here (no DB harness in bun:test);
// only the Zod schema + jsonb type guard + pure diff helper are tested.

import { expect, test } from "bun:test"
import {
	adminActionTypeSchema,
	diffChangedKeys,
	isPlainObject
} from "@/server/admin/action-history-shared"

test("adminActionTypeSchema: accepts every defined enum value", function actionTypesAccepted() {
	const values = ["edit", "approve", "reject", "flag", "unflag"]
	for (const v of values) {
		const result = adminActionTypeSchema.safeParse(v)
		expect(result.success).toBe(true)
	}
})

test("adminActionTypeSchema: rejects unknown action types", function actionTypeUnknown() {
	const result = adminActionTypeSchema.safeParse("retire")
	expect(result.success).toBe(false)
})

test("adminActionTypeSchema: rejects non-string input", function actionTypeNonString() {
	expect(adminActionTypeSchema.safeParse(null).success).toBe(false)
	expect(adminActionTypeSchema.safeParse(undefined).success).toBe(false)
	expect(adminActionTypeSchema.safeParse(42).success).toBe(false)
	expect(adminActionTypeSchema.safeParse({}).success).toBe(false)
})

test("isPlainObject: returns true for empty + populated objects", function plainObjectAccepted() {
	expect(isPlainObject({})).toBe(true)
	expect(isPlainObject({ foo: "bar" })).toBe(true)
})

test("isPlainObject: returns false for null", function plainObjectNullRejected() {
	expect(isPlainObject(null)).toBe(false)
})

test("isPlainObject: returns false for arrays", function plainObjectArrayRejected() {
	expect(isPlainObject([])).toBe(false)
	expect(isPlainObject([1, 2, 3])).toBe(false)
})

test("isPlainObject: returns false for primitives", function plainObjectPrimitivesRejected() {
	expect(isPlainObject("string")).toBe(false)
	expect(isPlainObject(42)).toBe(false)
	expect(isPlainObject(true)).toBe(false)
	expect(isPlainObject(undefined)).toBe(false)
})

test("diffChangedKeys: empty when both sides equal", function diffEqual() {
	const before = { a: 1, b: "two", c: { nested: true } }
	const after = { a: 1, b: "two", c: { nested: true } }
	expect(diffChangedKeys(before, after)).toEqual([])
})

test("diffChangedKeys: empty when both sides empty", function diffBothEmpty() {
	expect(diffChangedKeys({}, {})).toEqual([])
})

test("diffChangedKeys: surfaces single primitive change", function diffPrimitiveChange() {
	const before = { difficulty: "medium", body: { kind: "text", text: "x" } }
	const after = { difficulty: "hard", body: { kind: "text", text: "x" } }
	expect(diffChangedKeys(before, after)).toEqual(["difficulty"])
})

test("diffChangedKeys: surfaces nested object change", function diffNestedChange() {
	const before = { body: { kind: "text", text: "old" } }
	const after = { body: { kind: "text", text: "new" } }
	expect(diffChangedKeys(before, after)).toEqual(["body"])
})

test("diffChangedKeys: surfaces array change", function diffArrayChange() {
	const before = { options: [{ id: "a" }, { id: "b" }] }
	const after = { options: [{ id: "a" }, { id: "c" }] }
	expect(diffChangedKeys(before, after)).toEqual(["options"])
})

test("diffChangedKeys: surfaces key added in after", function diffAdded() {
	const before = { a: 1 }
	const after = { a: 1, b: 2 }
	expect(diffChangedKeys(before, after)).toEqual(["b"])
})

test("diffChangedKeys: surfaces key removed in after", function diffRemoved() {
	const before = { a: 1, b: 2 }
	const after = { a: 1 }
	expect(diffChangedKeys(before, after)).toEqual(["b"])
})

test("diffChangedKeys: returns sorted union of changed keys", function diffSorted() {
	const before = { z: 1, a: 1, m: 1 }
	const after = { z: 2, a: 2, m: 2 }
	expect(diffChangedKeys(before, after)).toEqual(["a", "m", "z"])
})

test("diffChangedKeys: treats undefined value as missing", function diffUndefined() {
	const before = { a: 1, b: undefined }
	const after = { a: 1 }
	// JSON.stringify of undefined property === undefined string for both sides.
	expect(diffChangedKeys(before, after)).toEqual([])
})
