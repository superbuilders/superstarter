"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { logger } from "@/logger"

const FOCUS_PREFS_STORAGE_KEY = "18seconds.focusPrefs.v1"

interface FocusPrefs {
	warningSoundEnabled: boolean
	tutorialSeen: boolean
	tutorialReplayPending: boolean
}

const DEFAULT_FOCUS_PREFS: FocusPrefs = {
	warningSoundEnabled: true,
	tutorialSeen: false,
	tutorialReplayPending: false
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function readFocusPrefs(): FocusPrefs {
	if (typeof window === "undefined") return DEFAULT_FOCUS_PREFS
	const raw = window.localStorage.getItem(FOCUS_PREFS_STORAGE_KEY)
	if (raw === null) return DEFAULT_FOCUS_PREFS
	const parseResult = errors.trySync(function parse() {
		return JSON.parse(raw)
	})
	if (parseResult.error) {
		logger.warn(
			{ error: parseResult.error, raw },
			"focus-prefs: localStorage payload not valid JSON"
		)
		return DEFAULT_FOCUS_PREFS
	}
	if (!isRecord(parseResult.data)) {
		logger.warn({ raw }, "focus-prefs: localStorage payload is not an object")
		return DEFAULT_FOCUS_PREFS
	}
	const data = parseResult.data
	return {
		warningSoundEnabled:
			typeof data.warningSoundEnabled === "boolean"
				? data.warningSoundEnabled
				: DEFAULT_FOCUS_PREFS.warningSoundEnabled,
		tutorialSeen:
			typeof data.tutorialSeen === "boolean"
				? data.tutorialSeen
				: DEFAULT_FOCUS_PREFS.tutorialSeen,
		tutorialReplayPending:
			typeof data.tutorialReplayPending === "boolean"
				? data.tutorialReplayPending
				: DEFAULT_FOCUS_PREFS.tutorialReplayPending
	}
}

function writeFocusPrefs(next: FocusPrefs): void {
	if (typeof window === "undefined") return
	const writeResult = errors.trySync(function write() {
		window.localStorage.setItem(FOCUS_PREFS_STORAGE_KEY, JSON.stringify(next))
	})
	if (writeResult.error) {
		logger.warn(
			{ error: writeResult.error, next },
			"focus-prefs: failed to write to localStorage"
		)
	}
}

function updateFocusPrefs(patch: Partial<FocusPrefs>): FocusPrefs {
	const next = { ...readFocusPrefs(), ...patch }
	writeFocusPrefs(next)
	return next
}

function setWarningSoundEnabled(enabled: boolean): FocusPrefs {
	return updateFocusPrefs({ warningSoundEnabled: enabled })
}

function markTutorialSeen(): FocusPrefs {
	return updateFocusPrefs({ tutorialSeen: true })
}

function clearTutorialReplayPending(): FocusPrefs {
	return updateFocusPrefs({ tutorialReplayPending: false })
}

function markTutorialReplayPending(): FocusPrefs {
	return updateFocusPrefs({ tutorialReplayPending: true })
}

function completeTutorialDismissal(): FocusPrefs {
	return updateFocusPrefs({ tutorialSeen: true, tutorialReplayPending: false })
}

function useFocusPrefs() {
	const [prefs, setPrefs] = React.useState<FocusPrefs>(function initPrefs() {
		return readFocusPrefs()
	})

	React.useEffect(function syncFromStorage() {
		function onStorage(event: StorageEvent) {
			if (event.key !== FOCUS_PREFS_STORAGE_KEY) return
			setPrefs(readFocusPrefs())
		}
		window.addEventListener("storage", onStorage)
		return function cleanup() {
			window.removeEventListener("storage", onStorage)
		}
	}, [])

	const setWarningSoundEnabledPref = React.useCallback((enabled: boolean) => {
		setPrefs(function writeNext() {
			return setWarningSoundEnabled(enabled)
		})
	}, [])

	const markTutorialSeenPref = React.useCallback(() => {
		setPrefs(function writeNext() {
			return markTutorialSeen()
		})
	}, [])

	const clearTutorialReplayPendingPref = React.useCallback(() => {
		setPrefs(function writeNext() {
			return clearTutorialReplayPending()
		})
	}, [])

	const markTutorialReplayPendingPref = React.useCallback(() => {
		setPrefs(function writeNext() {
			return markTutorialReplayPending()
		})
	}, [])

	const completeTutorialDismissalPref = React.useCallback(() => {
		setPrefs(function writeNext() {
			return completeTutorialDismissal()
		})
	}, [])

	return {
		prefs,
		setWarningSoundEnabled: setWarningSoundEnabledPref,
		markTutorialSeen: markTutorialSeenPref,
		clearTutorialReplayPending: clearTutorialReplayPendingPref,
		markTutorialReplayPending: markTutorialReplayPendingPref,
		completeTutorialDismissal: completeTutorialDismissalPref
	}
}

export {
	DEFAULT_FOCUS_PREFS,
	FOCUS_PREFS_STORAGE_KEY,
	clearTutorialReplayPending,
	completeTutorialDismissal,
	markTutorialReplayPending,
	markTutorialSeen,
	readFocusPrefs,
	setWarningSoundEnabled,
	useFocusPrefs,
	writeFocusPrefs
}
export type { FocusPrefs }
