"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { logger } from "@/logger"

const FOCUS_PREFS_STORAGE_KEY = "18seconds.focusPrefs.v1"
const FOCUS_TUTORIAL_LOCAL_STORAGE_KEY = "18seconds.focusTutorialLocal.v1"

interface FocusPrefs {
	tickingSoundEnabled: boolean
	warningSoundEnabled: boolean
}

interface FocusTutorialPrefsState {
	hasCompletedTutorial: boolean
	showOnNextRun: boolean
}

const DEFAULT_FOCUS_PREFS: FocusPrefs = {
	tickingSoundEnabled: true,
	warningSoundEnabled: true
}

const DEFAULT_FOCUS_TUTORIAL_PREFS_STATE: FocusTutorialPrefsState = {
	hasCompletedTutorial: false,
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

function readFocusPrefs(): FocusPrefs {
	const data = readJsonStorage<Record<string, unknown>>(
		getLocalStorage(),
		FOCUS_PREFS_STORAGE_KEY,
		{},
		"focus-prefs"
	)
	const legacyWarningSoundEnabled =
		typeof data.warningSoundEnabled === "boolean" ? data.warningSoundEnabled : undefined
	let tickingSoundEnabled = DEFAULT_FOCUS_PREFS.tickingSoundEnabled
	if (typeof data.tickingSoundEnabled === "boolean") {
		tickingSoundEnabled = data.tickingSoundEnabled
	} else if (typeof legacyWarningSoundEnabled === "boolean") {
		tickingSoundEnabled = legacyWarningSoundEnabled
	}
	return {
		tickingSoundEnabled,
		warningSoundEnabled:
			typeof data.warningSoundEnabled === "boolean"
				? data.warningSoundEnabled
				: DEFAULT_FOCUS_PREFS.warningSoundEnabled
	}
}

function readTutorialEntryFromByUserKey(
	data: Record<string, unknown>,
	userKey: string
): FocusTutorialPrefsState | undefined {
	const raw = data.byUserKey
	if (!isRecord(raw)) return undefined
	const entry = raw[userKey]
	if (!isRecord(entry)) return undefined
	const hasCompletedTutorial =
		typeof entry.hasCompletedTutorial === "boolean" ? entry.hasCompletedTutorial : false
	const showOnNextRun = typeof entry.showOnNextRun === "boolean" ? entry.showOnNextRun : false
	return { hasCompletedTutorial, showOnNextRun }
}

function readLegacyCompletedByUserKey(data: Record<string, unknown>, userKey: string): boolean {
	const raw = data.completedByUserKey
	if (!isRecord(raw)) return false
	return raw[userKey] === true
}

function readLegacyUnscopedCompleted(data: Record<string, unknown>): boolean {
	if (typeof data.hasCompletedTutorial === "boolean") return data.hasCompletedTutorial
	if (typeof data.tutorialSeen === "boolean") return data.tutorialSeen
	return false
}

function readLegacyTutorialCompletedFromFocusPrefs(): boolean {
	const data = readJsonStorage<Record<string, unknown>>(
		getLocalStorage(),
		FOCUS_PREFS_STORAGE_KEY,
		{},
		"focus-prefs"
	)
	return data.tutorialSeen === true
}

function clearLegacyTutorialFieldsFromFocusPrefs(): void {
	const storage = getLocalStorage()
	if (!storage) return
	const data = readJsonStorage<Record<string, unknown>>(
		storage,
		FOCUS_PREFS_STORAGE_KEY,
		{},
		"focus-prefs"
	)
	const { tutorialSeen, tutorialReplayPending, ...next } = data
	if (tutorialSeen === undefined && tutorialReplayPending === undefined) return
	writeStorage(storage, FOCUS_PREFS_STORAGE_KEY, next, "focus-prefs")
}

function readByUserKeyMap(
	data: Record<string, unknown>
): Record<string, FocusTutorialPrefsState> {
	const raw = data.byUserKey
	const out: Record<string, FocusTutorialPrefsState> = {}
	if (!isRecord(raw)) return out
	for (const [key, value] of Object.entries(raw)) {
		if (!isRecord(value)) continue
		const hasCompletedTutorial =
			typeof value.hasCompletedTutorial === "boolean" ? value.hasCompletedTutorial : false
		const showOnNextRun = typeof value.showOnNextRun === "boolean" ? value.showOnNextRun : false
		out[key] = { hasCompletedTutorial, showOnNextRun }
	}
	return out
}

function writeTutorialEntry(userKey: string, entry: FocusTutorialPrefsState): void {
	const storage = getLocalStorage()
	if (!storage) return
	const data = readJsonStorage<Record<string, unknown>>(
		storage,
		FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
		{},
		"focus-tutorial-local"
	)
	const byUserKey = readByUserKeyMap(data)
	byUserKey[userKey] = entry
	writeStorage(storage, FOCUS_TUTORIAL_LOCAL_STORAGE_KEY, { byUserKey }, "focus-tutorial-local")
}

function readFocusTutorialPrefsState(userKey?: string): FocusTutorialPrefsState {
	const data = readJsonStorage<Record<string, unknown>>(
		getLocalStorage(),
		FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
		{},
		"focus-tutorial-local"
	)
	const normalizedUserKey = normalizeUserKey(userKey)
	if (normalizedUserKey !== undefined) {
		const entry = readTutorialEntryFromByUserKey(data, normalizedUserKey)
		if (entry !== undefined) return entry
		// Migrate legacy formats keyed by this user.
		const legacyScopedCompleted = readLegacyCompletedByUserKey(data, normalizedUserKey)
		let legacyUnscopedCompleted = readLegacyUnscopedCompleted(data)
			if (!legacyUnscopedCompleted) {
				legacyUnscopedCompleted = readLegacyTutorialCompletedFromFocusPrefs()
			}
			const hasCompletedTutorial = legacyScopedCompleted
				? true
				: legacyUnscopedCompleted
		if (hasCompletedTutorial) {
			const migrated: FocusTutorialPrefsState = {
				hasCompletedTutorial: true,
				showOnNextRun: false
			}
			writeTutorialEntry(normalizedUserKey, migrated)
			clearLegacyTutorialFieldsFromFocusPrefs()
			return migrated
		}
		return DEFAULT_FOCUS_TUTORIAL_PREFS_STATE
	}
	// Unscoped legacy read path: honor old browser-global completed state.
	if (readLegacyUnscopedCompleted(data)) {
		return { hasCompletedTutorial: true, showOnNextRun: false }
	}
	return DEFAULT_FOCUS_TUTORIAL_PREFS_STATE
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

function writeFocusTutorialPrefsState(next: FocusTutorialPrefsState, userKey?: string): void {
	const normalizedUserKey = normalizeUserKey(userKey)
	if (normalizedUserKey === undefined) {
		// No user scope — write nothing. Unscoped writes would pollute the legacy shape
		// and aren't reachable from the live UI (the gate always passes a userKey).
		return
	}
	writeTutorialEntry(normalizedUserKey, next)
}

function updateFocusPrefs(patch: Partial<FocusPrefs>): FocusPrefs {
	const next = { ...readFocusPrefs(), ...patch }
	writeFocusPrefs(next)
	return next
}

function updateFocusTutorialPrefsState(
	patch: Partial<FocusTutorialPrefsState>,
	userKey?: string
): FocusTutorialPrefsState {
	const next = { ...readFocusTutorialPrefsState(userKey), ...patch }
	writeFocusTutorialPrefsState(next, userKey)
	return next
}

function setWarningSoundEnabled(enabled: boolean): FocusPrefs {
	return updateFocusPrefs({ warningSoundEnabled: enabled })
}

function setTickingSoundEnabled(enabled: boolean): FocusPrefs {
	return updateFocusPrefs({ tickingSoundEnabled: enabled })
}

function completeTutorialDismissal(userKey?: string): FocusTutorialPrefsState {
	return updateFocusTutorialPrefsState(
		{ hasCompletedTutorial: true, showOnNextRun: false },
		userKey
	)
}

// The settings checkbox is the *effective* "tutorial will show" state. Turning it OFF
// must suppress the tutorial permanently for this user (across logins); turning it ON
// requests a one-shot replay on the next run. Without the dual-write, an unchecked
// toggle could not override the new-user auto-show, which is the bug the user reported.
function setTutorialEnabledForNextRun(
	enabled: boolean,
	userKey?: string
): FocusTutorialPrefsState {
	if (enabled) {
		return updateFocusTutorialPrefsState({ showOnNextRun: true }, userKey)
	}
	return updateFocusTutorialPrefsState(
		{ showOnNextRun: false, hasCompletedTutorial: true },
		userKey
	)
}

function shouldShowTutorialOnNextRunState(state: FocusTutorialPrefsState): boolean {
	if (state.showOnNextRun) return true
	return !state.hasCompletedTutorial
}

function shouldShowTutorialOnNextRun(userKey?: string): boolean {
	return shouldShowTutorialOnNextRunState(readFocusTutorialPrefsState(userKey))
}

function useFocusPrefs(userKey?: string) {
	const normalizedUserKey = normalizeUserKey(userKey)
	const [prefs, setPrefs] = React.useState<FocusPrefs>(function initPrefs() {
		return readFocusPrefs()
	})
	const [tutorialPrefs, setTutorialPrefs] = React.useState<FocusTutorialPrefsState>(
		function initTutorialPrefs() {
			return readFocusTutorialPrefsState(normalizedUserKey)
		}
	)

	React.useEffect(
		function syncScopedState() {
			setTutorialPrefs(readFocusTutorialPrefsState(normalizedUserKey))
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
					setTutorialPrefs(readFocusTutorialPrefsState(normalizedUserKey))
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

	const setTickingSoundEnabledPref = React.useCallback((enabled: boolean) => {
		setPrefs(function writeNext() {
			return setTickingSoundEnabled(enabled)
		})
	}, [])

	const completeTutorialDismissalPref = React.useCallback(() => {
		setTutorialPrefs(function writeNext() {
			return completeTutorialDismissal(normalizedUserKey)
		})
	}, [normalizedUserKey])

	const setTutorialEnabledForNextRunPref = React.useCallback(
		(enabled: boolean) => {
			setTutorialPrefs(function writeNext() {
				return setTutorialEnabledForNextRun(enabled, normalizedUserKey)
			})
		},
		[normalizedUserKey]
	)

	return {
		prefs,
		tutorialPrefs,
		setTickingSoundEnabled: setTickingSoundEnabledPref,
		setWarningSoundEnabled: setWarningSoundEnabledPref,
		setTutorialEnabledForNextRun: setTutorialEnabledForNextRunPref,
		completeTutorialDismissal: completeTutorialDismissalPref
	}
}

export {
	DEFAULT_FOCUS_PREFS,
	DEFAULT_FOCUS_TUTORIAL_PREFS_STATE,
	FOCUS_PREFS_STORAGE_KEY,
	FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
	completeTutorialDismissal,
	readFocusPrefs,
	readFocusTutorialPrefsState,
	setTickingSoundEnabled,
	setTutorialEnabledForNextRun,
	setWarningSoundEnabled,
	shouldShowTutorialOnNextRun,
	shouldShowTutorialOnNextRunState,
	useFocusPrefs,
	writeFocusPrefs,
	writeFocusTutorialPrefsState
}
export type { FocusPrefs, FocusTutorialPrefsState }
