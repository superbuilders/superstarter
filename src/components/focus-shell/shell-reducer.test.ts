import { expect, test } from "bun:test"
import {
	initShellState,
	makeReducer,
	type ShellState,
	type TickContext
} from "@/components/focus-shell/shell-reducer"
import type { ItemForRender } from "@/components/focus-shell/types"

const TICK_CTX: TickContext = {
	perQuestionTargetMs: 18_000,
	sessionType: "full_length"
}

const FAKE_ITEM: ItemForRender = {
	id: "019dfd91-901b-7641-8a47-0cb4c472baf8",
	body: { kind: "text", text: "fake question" },
	options: [
		{ id: "a", text: "alpha" },
		{ id: "b", text: "beta" }
	],
	selection: {
		servedAtTier: "easy",
		fallbackLevel: "fresh"
	}
}

const FAKE_NEXT_ITEM: ItemForRender = {
	id: "019dfd9d-074c-734c-ab74-e092814be3da",
	body: { kind: "text", text: "next question" },
	options: [
		{ id: "x", text: "X" },
		{ id: "y", text: "Y" }
	],
	selection: {
		servedAtTier: "medium",
		fallbackLevel: "fresh"
	}
}

const INITIAL_STATE: ShellState = initShellState({
	initialItem: FAKE_ITEM,
	targetQuestionCount: 50,
	startMs: 1000
})

test("initial state has submitPending=false", () => {
	expect(INITIAL_STATE.submitPending).toBe(false)
})

test("submit action sets submitPending=true", () => {
	const reducer = makeReducer(TICK_CTX)
	const after = reducer(INITIAL_STATE, { kind: "submit", nowMs: 2000 })
	expect(after.submitPending).toBe(true)
})

test("submit_failed clears submitPending after a failed submit", () => {
	const reducer = makeReducer(TICK_CTX)
	const submitted = reducer(INITIAL_STATE, { kind: "submit", nowMs: 2000 })
	expect(submitted.submitPending).toBe(true)
	const recovered = reducer(submitted, { kind: "submit_failed" })
	expect(recovered.submitPending).toBe(false)
})

test("submit_failed preserves questionStartedAtMs for accurate retry latency", () => {
	const reducer = makeReducer(TICK_CTX)
	const withAnchor = reducer(INITIAL_STATE, {
		kind: "set_question_started",
		nowMs: 1500
	})
	const submitted = reducer(withAnchor, { kind: "submit", nowMs: 5000 })
	const recovered = reducer(submitted, { kind: "submit_failed" })
	expect(recovered.questionStartedAtMs).toBe(1500)
})

test("submit_failed preserves selectedOptionId so the user's selection persists for retry", () => {
	const reducer = makeReducer(TICK_CTX)
	const selected = reducer(INITIAL_STATE, { kind: "select", optionId: "a" })
	const submitted = reducer(selected, { kind: "submit", nowMs: 2000 })
	const recovered = reducer(submitted, { kind: "submit_failed" })
	expect(recovered.selectedOptionId).toBe("a")
})

test("submit_failed is a no-op when no submit is in flight", () => {
	const reducer = makeReducer(TICK_CTX)
	const after = reducer(INITIAL_STATE, { kind: "submit_failed" })
	expect(after).toBe(INITIAL_STATE)
})

test("submit after submit_failed re-arms the pending flag (retry path)", () => {
	const reducer = makeReducer(TICK_CTX)
	const submitted = reducer(INITIAL_STATE, { kind: "submit", nowMs: 2000 })
	const failed = reducer(submitted, { kind: "submit_failed" })
	const retried = reducer(failed, { kind: "submit", nowMs: 3000 })
	expect(retried.submitPending).toBe(true)
})

test("advance still clears submitPending on the happy path", () => {
	const reducer = makeReducer(TICK_CTX)
	const submitted = reducer(INITIAL_STATE, { kind: "submit", nowMs: 2000 })
	const advanced = reducer(submitted, {
		kind: "advance",
		next: FAKE_NEXT_ITEM,
		nowMs: 3000
	})
	expect(advanced.submitPending).toBe(false)
	expect(advanced.currentItem.id).toBe(FAKE_NEXT_ITEM.id)
})
