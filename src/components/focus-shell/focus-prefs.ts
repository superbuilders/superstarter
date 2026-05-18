"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { logger } from "@/logger"

const FOCUS_PREFS_STORAGE_KEY = "18seconds.focusPrefs.v1"
const FOCUS_TUTORIAL_SESSION_STORAGE_KEY = "18seconds.focusTutorialSession.v1"

interface FocusPrefs {
	warningSoundEnabled: boolean
}

interface FocusTutorialSessionState {
	dismissedThisLogin: boolean
	showOnNextRun: boolean
}

const DEFAULT_FOCUS_PREFS: FocusPrefs = {
	warningSoundEnabled: true
}

const DEFAULT_FOCUS_TUTORIAL_SESSION_STATE: FocusTutorialSessionState = {
	dismissedThisLogin: false,
	showOnNextRun: false
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function readJsonStorage<T extends object>(
	storage: Storage | undefined,
	key: string,
	fallback: T,
	logLabel: string
): T {
	if (!storage) return fallback
	const raw = storage.getItem(key)
	if (raw === null) return fallback
	const parseResult = errors.trySync(function parse() {
		return JSON.parse(raw)
	})
	if (parseResult.error) {
		logger.warn({ error: parseResult.error, raw }, `${logLabel}: payload not valid JSON`)
		return fallback
	}
	if (!isRecord(parseResult.data)) {
		logger.warn({ raw }, `${logLabel}: payload is not an object`)
		return fallback
	}
	return { ...fallback, ...parseResult.data }
}

function getLocalStorage(): Storage | undefined {
	if (typeof window === "undefined") return undefined
	return window.localStorage
}

function getSessionStorage(): Storage | undefined {
	if (typeof window === "undefined") return undefined
	return window.sessionStorage
}

function readFocusPrefs(): FocusPrefs {
	const data = readJsonStorage(
		getLocalStorage(),
		FOCUS_PREFS_STORAGE_KEY,
		DEFAULT_FOCUS_PREFS,
		"focus-prefs"
	)
	return {
		warningSoundEnabled:
			typeof data.warningSoundEnabled === "boolean"
				? data.warningSoundEnabled
				: DEFAULT_FOCUS_PREFS.warningSoundEnabled
	}
}

function readFocusTutorialSessionState(): FocusTutorialSessionState {
	const data = readJsonStorage(
		getSessionStorage(),
		FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
		DEFAULT_FOCUS_TUTORIAL_SESSION_STATE,
		"focus-tutorial-session"
	)
	return {
		dismissedThisLogin:
			typeof data.dismissedThisLogin === "boolean"
				? data.dismissedThisLogin
				: DEFAULT_FOCUS_TUTORIAL_SESSION_STATE.dismissedThisLogin,
		showOnNextRun:
			typeof data.showOnNextRun === "boolean"
				? data.showOnNextRun
				: DEFAULT_FOCUS_TUTORIAL_SESSION_STATE.showOnNextRun
	}
}

function writeStorage(storage: Storage | undefined, key: string, next: object, logLabel: string): void {
	if (!storage) return
	const writeResult = errors.trySync(function write() {
		storage.setItem(key, JSON.stringify(next))
	})
	if (writeResult.error) {
		logger.warn({ error: writeResult.error, next }, `${logLabel}: failed to write storage`)
	}
}

function writeFocusPrefs(next: FocusPrefs): void {
	writeStorage(getLocalStorage(), FOCUS_PREFS_STORAGE_KEY, next, "focus-prefs")
}

function writeFocusTutorialSessionState(next: FocusTutorialSessionState): void {
	writeStorage(
		getSessionStorage(),
		FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
		next,
		"focus-tutorial-session"
	)
}

function updateFocusPrefs(patch: Partial<FocusPrefs>): FocusPrefs {
	const next = { ...readFocusPrefs(), ...patch }
	writeFocusPrefs(next)
	return next
}

function updateFocusTutorialSessionState(
	patch: Partial<FocusTutorialSessionState>
): FocusTutorialSessionState {
	const next = { ...readFocusTutorialSessionState(), ...patch }
	writeFocusTutorialSessionState(next)
	return next
}

function setWarningSoundEnabled(enabled: boolean): FocusPrefs {
	return updateFocusPrefs({ warningSoundEnabled: enabled })
}

function markTutorialReplayPending(): FocusTutorialSessionState {
	return updateFocusTutorialSessionState({ showOnNextRun: true })
}

function clearTutorialReplayPending(): FocusTutorialSessionState {
	return updateFocusTutorialSessionState({ showOnNextRun: false })
}

function completeTutorialDismissal(): FocusTutorialSessionState {
	return updateFocusTutorialSessionState({
		dismissedThisLogin: true,
		showOnNextRun: false
	})
}

function clearTutorialSessionForLoginReset(): void {
	const storage = getSessionStorage()
	if (!storage) return
	storage.removeItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)
}

function shouldShowTutorialOnNextRun(): boolean {
	const state = readFocusTutorialSessionState()
	if (state.showOnNextRun) return true
	return !state.dismissedThisLogin
}

function useFocusPrefs() {
	const [prefs, setPrefs] = React.useState<FocusPrefs>(function initPrefs() {
		return readFocusPrefs()
	})
	const [tutorialSession, setTutorialSession] = React.useState<FocusTutorialSessionState>(
		function initTutorialSession() {
			return readFocusTutorialSessionState()
		}
	)

	React.useEffect(function syncFromStorage() {
		function onStorage(event: StorageEvent) {
			if (event.key === FOCUS_PREFS_STORAGE_KEY) {
				setPrefs(readFocusPrefs())
				return
			}
			if (event.key === FOCUS_TUTORIAL_SESSION_STORAGE_KEY) {
				setTutorialSession(readFocusTutorialSessionState())
			}
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

	const markTutorialReplayPendingPref = React.useCallback(() => {
		setTutorialSession(function writeNext() {
			return markTutorialReplayPending()
		})
	}, [])

	const clearTutorialReplayPendingPref = React.useCallback(() => {
		setTutorialSession(function writeNext() {
			return clearTutorialReplayPending()
		})
	}, [])

	const completeTutorialDismissalPref = React.useCallback(() => {
		setTutorialSession(function writeNext() {
			return completeTutorialDismissal()
		})
	}, [])

	const clearTutorialSessionForLoginResetPref = React.useCallback(() => {
		clearTutorialSessionForLoginReset()
		setTutorialSession(DEFAULT_FOCUS_TUTORIAL_SESSION_STATE)
	}, [])

	return {
		prefs,
		tutorialSession,
		setWarningSoundEnabled: setWarningSoundEnabledPref,
		markTutorialReplayPending: markTutorialReplayPendingPref,
		clearTutorialReplayPending: clearTutorialReplayPendingPref,
		completeTutorialDismissal: completeTutorialDismissalPref,
		clearTutorialSessionForLoginReset: clearTutorialSessionForLoginResetPref
	}
}

export {
	DEFAULT_FOCUS_PREFS,
	DEFAULT_FOCUS_TUTORIAL_SESSION_STATE,
	FOCUS_PREFS_STORAGE_KEY,
	FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
	clearTutorialReplayPending,
	clearTutorialSessionForLoginReset,
	completeTutorialDismissal,
	markTutorialReplayPending,
	readFocusPrefs,
	readFocusTutorialSessionState,
	setWarningSoundEnabled,
	shouldShowTutorialOnNextRun,
	useFocusPrefs,
	writeFocusPrefs,
	writeFocusTutorialSessionState
}
export type { FocusPrefs, FocusTutorialSessionState }
