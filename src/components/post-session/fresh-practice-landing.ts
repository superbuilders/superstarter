// Tracks whether the user just landed on /post-session/<id> from a
// fresh practice-test completion (full_length/simulation) versus
// re-opening the page from /review or a deep link. The run page calls
// `markFreshPracticeTestLanding(sessionId)` immediately before
// `router.push("/post-session/<id>")`; the post-session shell calls
// `consumeFreshPracticeTestLanding(sessionId)` on mount which returns
// true exactly once per (sessionId × tab) and clears the flag, so a
// reload or a return visit reads false.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

const STORAGE_KEY_PREFIX = "post-session-fresh-practice:"

function storageKeyFor(sessionId: string): string {
	return `${STORAGE_KEY_PREFIX}${sessionId}`
}

function markFreshPracticeTestLanding(sessionId: string): void {
	if (typeof window === "undefined") return
	const writeResult = errors.trySync(function persist() {
		window.sessionStorage.setItem(storageKeyFor(sessionId), "1")
	})
	if (writeResult.error) {
		logger.warn(
			{ sessionId, error: writeResult.error },
			"fresh-practice-landing: sessionStorage write failed"
		)
	}
}

function consumeFreshPracticeTestLanding(sessionId: string): boolean {
	if (typeof window === "undefined") return false
	const readResult = errors.trySync(function read() {
		return window.sessionStorage.getItem(storageKeyFor(sessionId))
	})
	if (readResult.error) {
		logger.warn(
			{ sessionId, error: readResult.error },
			"fresh-practice-landing: sessionStorage read failed"
		)
		return false
	}
	if (readResult.data !== "1") return false
	const clearResult = errors.trySync(function clear() {
		window.sessionStorage.removeItem(storageKeyFor(sessionId))
	})
	if (clearResult.error) {
		logger.warn(
			{ sessionId, error: clearResult.error },
			"fresh-practice-landing: sessionStorage clear failed"
		)
	}
	return true
}

export { consumeFreshPracticeTestLanding, markFreshPracticeTestLanding }
