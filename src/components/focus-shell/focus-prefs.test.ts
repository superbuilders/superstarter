import { afterEach, expect, test } from "bun:test"
import {
	clearTutorialReplayPending,
	clearTutorialSessionForLoginReset,
	completeTutorialDismissal,
	DEFAULT_FOCUS_PREFS,
	DEFAULT_FOCUS_TUTORIAL_LOCAL_STATE,
	DEFAULT_FOCUS_TUTORIAL_SESSION_STATE,
	FOCUS_PREFS_STORAGE_KEY,
	FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
	FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
	markTutorialReplayPending,
	readFocusPrefs,
	readFocusTutorialLocalState,
	readFocusTutorialSessionState,
	setTutorialEnabledForNextRun,
	setWarningSoundEnabled,
	shouldShowTutorialOnNextRun,
	shouldShowTutorialOnNextRunState,
	writeFocusPrefs,
	writeFocusTutorialLocalState,
	writeFocusTutorialSessionState
} from "@/components/focus-shell/focus-prefs"

interface MockStorage {
	getItem(key: string): string | null
	setItem(key: string, value: string): void
	removeItem(key: string): void
	clear(): void
}

function makeMockStorage(): MockStorage {
	const store = new Map<string, string>()
	return {
		getItem(key: string) {
			const value = store.get(key)
			if (value === undefined) return null
			return value
		},
		setItem(key: string, value: string) {
			store.set(key, value)
		},
		removeItem(key: string) {
			store.delete(key)
		},
		clear() {
			store.clear()
		}
	}
}

function installMockWindow(localStorage: MockStorage, sessionStorage: MockStorage) {
	Object.defineProperty(globalThis, "window", {
		value: { localStorage, sessionStorage },
		configurable: true,
		writable: true
	})
	return { localStorage, sessionStorage }
}

afterEach(function cleanup() {
	Reflect.deleteProperty(globalThis, "window")
})

test("readFocusPrefs returns defaults when storage is empty", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(readFocusPrefs()).toEqual(DEFAULT_FOCUS_PREFS)
})

test("readFocusTutorialSessionState returns defaults when storage is empty", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(readFocusTutorialSessionState()).toEqual(DEFAULT_FOCUS_TUTORIAL_SESSION_STATE)
	expect(readFocusTutorialLocalState()).toEqual(DEFAULT_FOCUS_TUTORIAL_LOCAL_STATE)
})

test("readFocusPrefs falls back to defaults for malformed JSON", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(FOCUS_PREFS_STORAGE_KEY, "{not-json")
	expect(readFocusPrefs()).toEqual(DEFAULT_FOCUS_PREFS)
})

test("setWarningSoundEnabled persists the updated value", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = setWarningSoundEnabled(false)
	expect(next).toEqual({ warningSoundEnabled: false })
	expect(localStorage.getItem(FOCUS_PREFS_STORAGE_KEY)).toBe(
		JSON.stringify({ warningSoundEnabled: false })
	)
})

test("markTutorialReplayPending persists the next-run flag in session storage", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = markTutorialReplayPending()
	expect(next).toEqual({ autoShowPendingThisLogin: true, showOnNextRun: true })
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(
		JSON.stringify({ autoShowPendingThisLogin: true, showOnNextRun: true })
	)
})

test("completeTutorialDismissal marks completed locally and clears replay", () => {
	const { localStorage, sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: true, showOnNextRun: true })
	const next = completeTutorialDismissal()
	expect(next).toEqual({ autoShowPendingThisLogin: false, showOnNextRun: false })
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(
		JSON.stringify({ autoShowPendingThisLogin: false, showOnNextRun: false })
	)
	expect(localStorage.getItem(FOCUS_TUTORIAL_LOCAL_STORAGE_KEY)).toBe(
		JSON.stringify({ hasCompletedTutorial: true })
	)
})

test("clearTutorialReplayPending clears only the next-run flag", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: true })
	const next = clearTutorialReplayPending()
	expect(next).toEqual({ autoShowPendingThisLogin: false, showOnNextRun: false })
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(
		JSON.stringify({ autoShowPendingThisLogin: false, showOnNextRun: false })
	)
})

test("setTutorialEnabledForNextRun(false) clears only the manual replay flag", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = setTutorialEnabledForNextRun(false)
	expect(next).toEqual({ autoShowPendingThisLogin: true, showOnNextRun: false })
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(
		JSON.stringify({ autoShowPendingThisLogin: true, showOnNextRun: false })
	)
	expect(shouldShowTutorialOnNextRun()).toBe(true)
})

test("setTutorialEnabledForNextRun can re-enable the tutorial after dismissal", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: false })
	writeFocusTutorialLocalState({ hasCompletedTutorial: true })
	const next = setTutorialEnabledForNextRun(true)
	expect(next).toEqual({ autoShowPendingThisLogin: false, showOnNextRun: true })
	expect(shouldShowTutorialOnNextRun()).toBe(true)
})

test("tutorial replay toggle stays off by default on a fresh login session", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(readFocusTutorialSessionState().showOnNextRun).toBe(false)
	expect(readFocusTutorialLocalState().hasCompletedTutorial).toBe(false)
	expect(shouldShowTutorialOnNextRun()).toBe(true)
})

test("returning login keeps manual replay off after tutorial was already completed", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(FOCUS_TUTORIAL_LOCAL_STORAGE_KEY, JSON.stringify({ hasCompletedTutorial: true }))
	expect(readFocusTutorialSessionState().showOnNextRun).toBe(false)
	expect(shouldShowTutorialOnNextRun()).toBe(false)
})

test("legacy dismissedThisLogin state migrates to autoShowPendingThisLogin=false", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	sessionStorage.setItem(
		FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
		JSON.stringify({ dismissedThisLogin: true, showOnNextRun: false })
	)
	expect(readFocusTutorialSessionState()).toEqual({
		autoShowPendingThisLogin: false,
		showOnNextRun: false
	})
})

test("legacy local completed state suppresses first-time auto-show", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(FOCUS_TUTORIAL_LOCAL_STORAGE_KEY, JSON.stringify({ hasCompletedTutorial: true }))
	expect(shouldShowTutorialOnNextRun()).toBe(false)
})

test("shouldShowTutorialOnNextRun is true on first start and false after dismissal", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(shouldShowTutorialOnNextRun()).toBe(true)
	completeTutorialDismissal()
	expect(shouldShowTutorialOnNextRun()).toBe(false)
})

test("shouldShowTutorialOnNextRunState matches first-run and replay semantics", () => {
	expect(
		shouldShowTutorialOnNextRunState(
			{ autoShowPendingThisLogin: true, showOnNextRun: false },
			{ hasCompletedTutorial: false }
		)
	).toBe(true)
	expect(
		shouldShowTutorialOnNextRunState(
			{ autoShowPendingThisLogin: false, showOnNextRun: false },
			{ hasCompletedTutorial: false }
		)
	).toBe(false)
	expect(
		shouldShowTutorialOnNextRunState(
			{ autoShowPendingThisLogin: false, showOnNextRun: true },
			{ hasCompletedTutorial: true }
		)
	).toBe(true)
	expect(
		shouldShowTutorialOnNextRunState(
			{ autoShowPendingThisLogin: true, showOnNextRun: false },
			{ hasCompletedTutorial: true }
		)
	).toBe(false)
})

test("clearTutorialSessionForLoginReset removes the session-scoped tutorial state", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: true })
	clearTutorialSessionForLoginReset()
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(null)
	expect(readFocusTutorialSessionState()).toEqual(DEFAULT_FOCUS_TUTORIAL_SESSION_STATE)
	expect(readFocusTutorialLocalState()).toEqual({ hasCompletedTutorial: false })
})

test("prefs and tutorial session storages stay independent", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusPrefs({ warningSoundEnabled: false })
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: false })
	writeFocusTutorialLocalState({ hasCompletedTutorial: true })
	expect(readFocusPrefs()).toEqual({ warningSoundEnabled: false })
	expect(readFocusTutorialSessionState()).toEqual({
		autoShowPendingThisLogin: false,
		showOnNextRun: false
	})
	expect(readFocusTutorialLocalState()).toEqual({ hasCompletedTutorial: true })
})
