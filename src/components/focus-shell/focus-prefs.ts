"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { logger } from "@/logger"

const FOCUS_PREFS_STORAGE_KEY = "18seconds.focusPrefs.v1"
const FOCUS_TUTORIAL_LOCAL_STORAGE_KEY = "18seconds.focusTutorialLocal.v1"
const FOCUS_TUTORIAL_SESSION_STORAGE_KEY = "18seconds.focusTutorialSession.v1"

interface FocusPrefs {
	warningSoundEnabled: boolean
}

interface FocusTutorialLocalState {
	hasCompletedTutorial: boolean
}

interface FocusTutorialSessionState {
	autoShowPendingThisLogin: boolean
	showOnNextRun: boolean
}

const DEFAULT_FOCUS_PREFS: FocusPrefs = {
	warningSoundEnabled: true
}

const DEFAULT_FOCUS_TUTORIAL_LOCAL_STATE: FocusTutorialLocalState = {
	hasCompletedTutorial: false
}

const DEFAULT_FOCUS_TUTORIAL_SESSION_STATE: FocusTutorialSessionState = {
	autoShowPendingThisLogin: true,
	showOnNextRun: false
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function normalizeUserKey(userKey: string | undefined): string | undefined {
	if (typeof userKey !== "string") return undefined
	const normalized = userKey.trim()
	if (normalized.length === 0) return undefined
	return normalized
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

function readCompletedByUserKeyMap(data: Record<string, unknown>): Record<string, boolean> {
	const raw = data.completedByUserKey
	if (!isRecord(raw)) return {}
	const out: Record<string, boolean> = {}
	for (const [key, value] of Object.entries(raw)) {
		if (typeof value === "boolean") {
			out[key] = value
		}
	}
	return out
}

function readFocusTutorialLocalState(userKey?: string): FocusTutorialLocalState {
	const data = readJsonStorage<Record<string, unknown>>(
		getLocalStorage(),
		FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
		{},
		"focus-tutorial-local"
	)
	const normalizedUserKey = normalizeUserKey(userKey)
	if (normalizedUserKey !== undefined) {
		const completedByUserKey = readCompletedByUserKeyMap(data)
		return {
			hasCompletedTutorial: completedByUserKey[normalizedUserKey] === true
		}
	}
	if (typeof data.hasCompletedTutorial === "boolean") {
		return { hasCompletedTutorial: data.hasCompletedTutorial }
	}
	if (typeof data.tutorialSeen === "boolean") {
		return { hasCompletedTutorial: data.tutorialSeen }
	}
	return DEFAULT_FOCUS_TUTORIAL_LOCAL_STATE
}

function readFocusTutorialSessionState(userKey?: string): FocusTutorialSessionState {
	const data = readJsonStorage<Record<string, unknown>>(
		getSessionStorage(),
		FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
		{},
		"focus-tutorial-session"
	)
	const normalizedUserKey = normalizeUserKey(userKey)
	const ownerUserKey = normalizeUserKey(
		typeof data.ownerUserKey === "string" ? data.ownerUserKey : undefined
	)
	if (
		normalizedUserKey !== undefined &&
		ownerUserKey !== undefined &&
		ownerUserKey !== normalizedUserKey
	) {
		return DEFAULT_FOCUS_TUTORIAL_SESSION_STATE
	}
	let autoShowPendingThisLogin = DEFAULT_FOCUS_TUTORIAL_SESSION_STATE.autoShowPendingThisLogin
	if (typeof data.autoShowPendingThisLogin === "boolean") {
		autoShowPendingThisLogin = data.autoShowPendingThisLogin
	} else if (typeof data.dismissedThisLogin === "boolean") {
		autoShowPendingThisLogin = !data.dismissedThisLogin
	}
	return {
		autoShowPendingThisLogin,
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

function writeFocusTutorialLocalState(next: FocusTutorialLocalState, userKey?: string): void {
	const normalizedUserKey = normalizeUserKey(userKey)
	if (normalizedUserKey === undefined) {
		writeStorage(getLocalStorage(), FOCUS_TUTORIAL_LOCAL_STORAGE_KEY, next, "focus-tutorial-local")
		return
	}
	const data = readJsonStorage<Record<string, unknown>>(
		getLocalStorage(),
		FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
		{},
		"focus-tutorial-local"
	)
	const completedByUserKey = readCompletedByUserKeyMap(data)
	if (next.hasCompletedTutorial) {
		completedByUserKey[normalizedUserKey] = true
	} else {
		delete completedByUserKey[normalizedUserKey]
	}
	writeStorage(
		getLocalStorage(),
		FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
		{ completedByUserKey },
		"focus-tutorial-local"
	)
}

function writeFocusTutorialSessionState(next: FocusTutorialSessionState, userKey?: string): void {
	const normalizedUserKey = normalizeUserKey(userKey)
	const payload: Record<string, unknown> = {
		autoShowPendingThisLogin: next.autoShowPendingThisLogin,
		showOnNextRun: next.showOnNextRun
	}
	if (normalizedUserKey !== undefined) {
		payload.ownerUserKey = normalizedUserKey
	}
	writeStorage(
		getSessionStorage(),
		FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
		payload,
		"focus-tutorial-session"
	)
}

function updateFocusPrefs(patch: Partial<FocusPrefs>): FocusPrefs {
	const next = { ...readFocusPrefs(), ...patch }
	writeFocusPrefs(next)
	return next
}

function updateFocusTutorialLocalState(
	patch: Partial<FocusTutorialLocalState>,
	userKey?: string
): FocusTutorialLocalState {
	const next = { ...readFocusTutorialLocalState(userKey), ...patch }
	writeFocusTutorialLocalState(next, userKey)
	return next
}

function updateFocusTutorialSessionState(
	patch: Partial<FocusTutorialSessionState>,
	userKey?: string
): FocusTutorialSessionState {
	const next = { ...readFocusTutorialSessionState(userKey), ...patch }
	writeFocusTutorialSessionState(next, userKey)
	return next
}

function setWarningSoundEnabled(enabled: boolean): FocusPrefs {
	return updateFocusPrefs({ warningSoundEnabled: enabled })
}

function markTutorialReplayPending(userKey?: string): FocusTutorialSessionState {
	return updateFocusTutorialSessionState({ showOnNextRun: true }, userKey)
}

function clearTutorialReplayPending(userKey?: string): FocusTutorialSessionState {
	return updateFocusTutorialSessionState({ showOnNextRun: false }, userKey)
}

function completeTutorialDismissal(userKey?: string): FocusTutorialSessionState {
	updateFocusTutorialLocalState({ hasCompletedTutorial: true }, userKey)
	return updateFocusTutorialSessionState(
		{
			autoShowPendingThisLogin: false,
			showOnNextRun: false
		},
		userKey
	)
}

function setTutorialEnabledForNextRun(enabled: boolean, userKey?: string): FocusTutorialSessionState {
	if (enabled) {
		return updateFocusTutorialSessionState({ showOnNextRun: true }, userKey)
	}
	return updateFocusTutorialSessionState({ showOnNextRun: false }, userKey)
}

function clearTutorialSessionForLoginReset(): void {
	const storage = getSessionStorage()
	if (!storage) return
	storage.removeItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)
}

function shouldShowTutorialOnNextRunState(
	sessionState: FocusTutorialSessionState,
	localState: FocusTutorialLocalState
): boolean {
	if (sessionState.showOnNextRun) return true
	if (localState.hasCompletedTutorial) return false
	return sessionState.autoShowPendingThisLogin
}

function shouldShowTutorialOnNextRun(userKey?: string): boolean {
	return shouldShowTutorialOnNextRunState(
		readFocusTutorialSessionState(userKey),
		readFocusTutorialLocalState(userKey)
	)
}

function useFocusPrefs(userKey?: string) {
	const normalizedUserKey = normalizeUserKey(userKey)
	const [prefs, setPrefs] = React.useState<FocusPrefs>(function initPrefs() {
		return readFocusPrefs()
	})
	const [tutorialLocal, setTutorialLocal] = React.useState<FocusTutorialLocalState>(
		function initTutorialLocal() {
			return readFocusTutorialLocalState(normalizedUserKey)
		}
	)
	const [tutorialSession, setTutorialSession] = React.useState<FocusTutorialSessionState>(
		function initTutorialSession() {
			return readFocusTutorialSessionState(normalizedUserKey)
		}
	)

	React.useEffect(
		function syncScopedState() {
			setTutorialLocal(readFocusTutorialLocalState(normalizedUserKey))
			setTutorialSession(readFocusTutorialSessionState(normalizedUserKey))
		},
		[normalizedUserKey]
	)

	React.useEffect(
		function syncFromStorage() {
			function onStorage(event: StorageEvent) {
				if (event.key === FOCUS_PREFS_STORAGE_KEY) {
					setPrefs(readFocusPrefs())
					return
				}
				if (event.key === FOCUS_TUTORIAL_LOCAL_STORAGE_KEY) {
					setTutorialLocal(readFocusTutorialLocalState(normalizedUserKey))
					return
				}
				if (event.key === FOCUS_TUTORIAL_SESSION_STORAGE_KEY) {
					setTutorialSession(readFocusTutorialSessionState(normalizedUserKey))
				}
			}
			window.addEventListener("storage", onStorage)
			return function cleanup() {
				window.removeEventListener("storage", onStorage)
			}
		},
		[normalizedUserKey]
	)

	const setWarningSoundEnabledPref = React.useCallback((enabled: boolean) => {
		setPrefs(function writeNext() {
			return setWarningSoundEnabled(enabled)
		})
	}, [])

	const markTutorialReplayPendingPref = React.useCallback(() => {
		setTutorialSession(function writeNext() {
			return markTutorialReplayPending(normalizedUserKey)
		})
	}, [normalizedUserKey])

	const clearTutorialReplayPendingPref = React.useCallback(() => {
		setTutorialSession(function writeNext() {
			return clearTutorialReplayPending(normalizedUserKey)
		})
	}, [normalizedUserKey])

	const completeTutorialDismissalPref = React.useCallback(() => {
		setTutorialLocal(function syncLocal() {
			return updateFocusTutorialLocalState({ hasCompletedTutorial: true }, normalizedUserKey)
		})
		setTutorialSession(function syncSession() {
			return updateFocusTutorialSessionState(
				{
					autoShowPendingThisLogin: false,
					showOnNextRun: false
				},
				normalizedUserKey
			)
		})
	}, [normalizedUserKey])

	const setTutorialEnabledForNextRunPref = React.useCallback(
		(enabled: boolean) => {
			setTutorialSession(function writeNext() {
				return setTutorialEnabledForNextRun(enabled, normalizedUserKey)
			})
		},
		[normalizedUserKey]
	)

	const clearTutorialSessionForLoginResetPref = React.useCallback(() => {
		clearTutorialSessionForLoginReset()
		setTutorialSession(DEFAULT_FOCUS_TUTORIAL_SESSION_STATE)
	}, [])

	return {
		prefs,
		tutorialLocal,
		tutorialSession,
		setWarningSoundEnabled: setWarningSoundEnabledPref,
		markTutorialReplayPending: markTutorialReplayPendingPref,
		clearTutorialReplayPending: clearTutorialReplayPendingPref,
		setTutorialEnabledForNextRun: setTutorialEnabledForNextRunPref,
		completeTutorialDismissal: completeTutorialDismissalPref,
		clearTutorialSessionForLoginReset: clearTutorialSessionForLoginResetPref
	}
}

export {
	DEFAULT_FOCUS_PREFS,
	DEFAULT_FOCUS_TUTORIAL_LOCAL_STATE,
	DEFAULT_FOCUS_TUTORIAL_SESSION_STATE,
	FOCUS_PREFS_STORAGE_KEY,
	FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
	FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
	clearTutorialReplayPending,
	clearTutorialSessionForLoginReset,
	completeTutorialDismissal,
	markTutorialReplayPending,
	readFocusPrefs,
	readFocusTutorialLocalState,
	readFocusTutorialSessionState,
	setTutorialEnabledForNextRun,
	setWarningSoundEnabled,
	shouldShowTutorialOnNextRun,
	shouldShowTutorialOnNextRunState,
	useFocusPrefs,
	writeFocusPrefs,
	writeFocusTutorialLocalState,
	writeFocusTutorialSessionState
}
export type { FocusPrefs, FocusTutorialLocalState, FocusTutorialSessionState }
