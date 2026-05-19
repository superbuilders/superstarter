import { afterEach, expect, test } from "bun:test"
import {
	clearTutorialReplayPending,
	clearTutorialSessionForLoginReset,
	completeTutorialDismissal,
	DEFAULT_FOCUS_PREFS,
	DEFAULT_FOCUS_TUTORIAL_SESSION_STATE,
	FOCUS_PREFS_STORAGE_KEY,
	FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
	markTutorialReplayPending,
	readFocusPrefs,
	readFocusTutorialSessionState,
	setTutorialEnabledForNextRun,
	setWarningSoundEnabled,
	shouldShowTutorialOnNextRun,
	shouldShowTutorialOnNextRunState,
	writeFocusPrefs,
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
	expect(next).toEqual({ dismissedThisLogin: false, showOnNextRun: true })
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(
		JSON.stringify({ dismissedThisLogin: false, showOnNextRun: true })
	)
})

test("completeTutorialDismissal marks dismissed and clears replay", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ dismissedThisLogin: false, showOnNextRun: true })
	const next = completeTutorialDismissal()
	expect(next).toEqual({ dismissedThisLogin: true, showOnNextRun: false })
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(
		JSON.stringify({ dismissedThisLogin: true, showOnNextRun: false })
	)
})

test("clearTutorialReplayPending clears only the next-run flag", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ dismissedThisLogin: true, showOnNextRun: true })
	const next = clearTutorialReplayPending()
	expect(next).toEqual({ dismissedThisLogin: true, showOnNextRun: false })
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(
		JSON.stringify({ dismissedThisLogin: true, showOnNextRun: false })
	)
})

test("setTutorialEnabledForNextRun can suppress the first-run tutorial", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = setTutorialEnabledForNextRun(false)
	expect(next).toEqual({ dismissedThisLogin: true, showOnNextRun: false })
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(
		JSON.stringify({ dismissedThisLogin: true, showOnNextRun: false })
	)
	expect(shouldShowTutorialOnNextRun()).toBe(false)
})

test("setTutorialEnabledForNextRun can re-enable the tutorial after dismissal", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ dismissedThisLogin: true, showOnNextRun: false })
	const next = setTutorialEnabledForNextRun(true)
	expect(next).toEqual({ dismissedThisLogin: true, showOnNextRun: true })
	expect(shouldShowTutorialOnNextRun()).toBe(true)
})

test("shouldShowTutorialOnNextRun is true on first start and false after dismissal", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(shouldShowTutorialOnNextRun()).toBe(true)
	completeTutorialDismissal()
	expect(shouldShowTutorialOnNextRun()).toBe(false)
})

test("shouldShowTutorialOnNextRunState matches first-run and replay semantics", () => {
	expect(shouldShowTutorialOnNextRunState({ dismissedThisLogin: false, showOnNextRun: false })).toBe(true)
	expect(shouldShowTutorialOnNextRunState({ dismissedThisLogin: true, showOnNextRun: false })).toBe(false)
	expect(shouldShowTutorialOnNextRunState({ dismissedThisLogin: true, showOnNextRun: true })).toBe(true)
})

test("clearTutorialSessionForLoginReset removes the session-scoped tutorial state", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ dismissedThisLogin: true, showOnNextRun: true })
	clearTutorialSessionForLoginReset()
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(null)
	expect(readFocusTutorialSessionState()).toEqual(DEFAULT_FOCUS_TUTORIAL_SESSION_STATE)
})

test("prefs and tutorial session storages stay independent", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusPrefs({ warningSoundEnabled: false })
	writeFocusTutorialSessionState({ dismissedThisLogin: true, showOnNextRun: false })
	expect(readFocusPrefs()).toEqual({ warningSoundEnabled: false })
	expect(readFocusTutorialSessionState()).toEqual({
		dismissedThisLogin: true,
		showOnNextRun: false
	})
})
