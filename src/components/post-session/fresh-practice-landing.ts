// Tracks whether the user just landed on a post-session review route
// from a fresh practice-test completion versus re-opening the page
// from review/history or a deep link. Multiple one-shot effects need
// to read this landing state independently (confetti and result sound),
// so the storage payload keeps per-effect pending flags instead of a
// single "consumed" bit.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

const STORAGE_KEY_PREFIX = "post-session-fresh-practice:"

type FreshPracticeLandingEffect = "confetti" | "result_sound"

interface FreshPracticeLandingPayload {
	confetti?: boolean
	resultSound?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

const ALL_FRESH_PRACTICE_EFFECTS: ReadonlyArray<FreshPracticeLandingEffect> = [
	"confetti",
	"result_sound"
]

function storageKeyFor(sessionId: string): string {
	return `${STORAGE_KEY_PREFIX}${sessionId}`
}

function payloadKeyFor(effect: FreshPracticeLandingEffect): keyof FreshPracticeLandingPayload {
	if (effect === "result_sound") return "resultSound"
	return "confetti"
}

function parsePayload(raw: string | null): FreshPracticeLandingPayload | null {
	if (raw === null) return null
	if (raw === "1") {
		return { confetti: true, resultSound: true }
	}
	const parseResult = errors.trySync(function parse() {
		return JSON.parse(raw)
	})
	if (parseResult.error) {
		logger.warn(
			{ error: parseResult.error, raw },
			"fresh-practice-landing: payload parse failed"
		)
		return null
	}
	const value = parseResult.data
	if (!isRecord(value)) {
		logger.warn({ raw }, "fresh-practice-landing: payload is not an object")
		return null
	}
	return {
		confetti: value.confetti === true,
		resultSound: value.resultSound === true
	}
}

function serializePayload(
	effects: ReadonlyArray<FreshPracticeLandingEffect>
): FreshPracticeLandingPayload {
	const payload: FreshPracticeLandingPayload = {}
	for (const effect of effects) {
		payload[payloadKeyFor(effect)] = true
	}
	return payload
}

function readPayload(sessionId: string): FreshPracticeLandingPayload | null {
	const readResult = errors.trySync(function read() {
		return window.sessionStorage.getItem(storageKeyFor(sessionId))
	})
	if (readResult.error) {
		logger.warn(
			{ sessionId, error: readResult.error },
			"fresh-practice-landing: sessionStorage read failed"
		)
		return null
	}
	return parsePayload(readResult.data)
}

function writePayload(sessionId: string, payload: FreshPracticeLandingPayload | null): void {
	if (payload === null || (payload.confetti !== true && payload.resultSound !== true)) {
		const clearResult = errors.trySync(function clear() {
			window.sessionStorage.removeItem(storageKeyFor(sessionId))
		})
		if (clearResult.error) {
			logger.warn(
				{ sessionId, error: clearResult.error },
				"fresh-practice-landing: sessionStorage clear failed"
			)
		}
		return
	}
	const writeResult = errors.trySync(function persist() {
		window.sessionStorage.setItem(storageKeyFor(sessionId), JSON.stringify(payload))
	})
	if (writeResult.error) {
		logger.warn(
			{ sessionId, error: writeResult.error, payload },
			"fresh-practice-landing: sessionStorage write failed"
		)
	}
}

function markFreshPracticeTestLanding(
	sessionId: string,
	effects: ReadonlyArray<FreshPracticeLandingEffect> = ALL_FRESH_PRACTICE_EFFECTS
): void {
	if (typeof window === "undefined") return
	writePayload(sessionId, serializePayload(effects))
}

function consumeFreshPracticeTestLandingEffect(
	sessionId: string,
	effect: FreshPracticeLandingEffect
): boolean {
	if (typeof window === "undefined") return false
	const payload = readPayload(sessionId)
	if (payload === null) return false
	const payloadKey = payloadKeyFor(effect)
	if (payload[payloadKey] !== true) return false
	payload[payloadKey] = false
	writePayload(sessionId, payload)
	return true
}

export type { FreshPracticeLandingEffect }
export { consumeFreshPracticeTestLandingEffect, markFreshPracticeTestLanding }
