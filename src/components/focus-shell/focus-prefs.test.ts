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

function readStoredJson(storage: MockStorage, key: string): unknown {
	const raw = storage.getItem(key)
	if (raw === null) return null
	return JSON.parse(raw)
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
	expect(readFocusTutorialSessionState("alice")).toEqual(DEFAULT_FOCUS_TUTORIAL_SESSION_STATE)
	expect(readFocusTutorialLocalState("alice")).toEqual(DEFAULT_FOCUS_TUTORIAL_LOCAL_STATE)
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
	const next = markTutorialReplayPending("alice")
	expect(next).toEqual({ autoShowPendingThisLogin: true, showOnNextRun: true })
	expect(readStoredJson(sessionStorage, FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toEqual({
		autoShowPendingThisLogin: true,
		showOnNextRun: true,
		ownerUserKey: "alice"
	})
})

test("completeTutorialDismissal marks completed for the current user and clears replay", () => {
	const { localStorage, sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: true, showOnNextRun: true }, "alice")
	const next = completeTutorialDismissal("alice")
	expect(next).toEqual({ autoShowPendingThisLogin: false, showOnNextRun: false })
	expect(readStoredJson(sessionStorage, FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toEqual({
		autoShowPendingThisLogin: false,
		showOnNextRun: false,
		ownerUserKey: "alice"
	})
	expect(localStorage.getItem(FOCUS_TUTORIAL_LOCAL_STORAGE_KEY)).toBe(
		JSON.stringify({ completedByUserKey: { alice: true } })
	)
	expect(readFocusTutorialLocalState("bob")).toEqual({ hasCompletedTutorial: false })
})

test("clearTutorialReplayPending clears only the next-run flag", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: true }, "alice")
	const next = clearTutorialReplayPending("alice")
	expect(next).toEqual({ autoShowPendingThisLogin: false, showOnNextRun: false })
	expect(readStoredJson(sessionStorage, FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toEqual({
		autoShowPendingThisLogin: false,
		showOnNextRun: false,
		ownerUserKey: "alice"
	})
})

test("setTutorialEnabledForNextRun(false) clears only the manual replay flag", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = setTutorialEnabledForNextRun(false, "alice")
	expect(next).toEqual({ autoShowPendingThisLogin: true, showOnNextRun: false })
	expect(readStoredJson(sessionStorage, FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toEqual({
		autoShowPendingThisLogin: true,
		showOnNextRun: false,
		ownerUserKey: "alice"
	})
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
})

test("setTutorialEnabledForNextRun can re-enable the tutorial after dismissal", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: false }, "alice")
	writeFocusTutorialLocalState({ hasCompletedTutorial: true }, "alice")
	const next = setTutorialEnabledForNextRun(true, "alice")
	expect(next).toEqual({ autoShowPendingThisLogin: false, showOnNextRun: true })
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
})

test("tutorial replay toggle stays off by default on a fresh login session", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(readFocusTutorialSessionState("alice").showOnNextRun).toBe(false)
	expect(readFocusTutorialLocalState("alice").hasCompletedTutorial).toBe(false)
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
})

test("existing user with completed tutorial keeps manual replay off by default", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialLocalState({ hasCompletedTutorial: true }, "alice")
	expect(readFocusTutorialSessionState("alice").showOnNextRun).toBe(false)
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
})

test("a different first-time user on the same browser still gets the tutorial by default", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialLocalState({ hasCompletedTutorial: true }, "alice")
	expect(readFocusTutorialLocalState("bob")).toEqual({ hasCompletedTutorial: false })
	expect(shouldShowTutorialOnNextRun("bob")).toBe(true)
})

test("session state is ignored when it belongs to another user", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: true }, "alice")
	expect(readFocusTutorialSessionState("bob")).toEqual(DEFAULT_FOCUS_TUTORIAL_SESSION_STATE)
})

test("legacy dismissedThisLogin state migrates to autoShowPendingThisLogin=false", () => {
	const { sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	sessionStorage.setItem(
		FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
		JSON.stringify({ dismissedThisLogin: true, showOnNextRun: false })
	)
	expect(readFocusTutorialSessionState("alice")).toEqual({
		autoShowPendingThisLogin: false,
		showOnNextRun: false
	})
})

test("legacy browser-global completed state is ignored for scoped first-time users", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(FOCUS_TUTORIAL_LOCAL_STORAGE_KEY, JSON.stringify({ hasCompletedTutorial: true }))
	expect(readFocusTutorialLocalState("alice")).toEqual({ hasCompletedTutorial: false })
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
})

test("legacy focusPrefs tutorialSeen is ignored for scoped first-time users", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(
		FOCUS_PREFS_STORAGE_KEY,
		JSON.stringify({ warningSoundEnabled: true, tutorialSeen: true, tutorialReplayPending: false })
	)
	expect(readFocusTutorialLocalState("alice")).toEqual({ hasCompletedTutorial: false })
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
})

test("legacy unscoped reads still honor old completed state", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(FOCUS_TUTORIAL_LOCAL_STORAGE_KEY, JSON.stringify({ hasCompletedTutorial: true }))
	expect(readFocusTutorialLocalState()).toEqual({ hasCompletedTutorial: true })
})

test("shouldShowTutorialOnNextRun is true on first start and false after dismissal", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
	completeTutorialDismissal("alice")
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
	expect(shouldShowTutorialOnNextRun("bob")).toBe(true)
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
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: true }, "alice")
	clearTutorialSessionForLoginReset()
	expect(sessionStorage.getItem(FOCUS_TUTORIAL_SESSION_STORAGE_KEY)).toBe(null)
	expect(readFocusTutorialSessionState("alice")).toEqual(DEFAULT_FOCUS_TUTORIAL_SESSION_STATE)
	expect(readFocusTutorialLocalState("alice")).toEqual({ hasCompletedTutorial: false })
})

test("prefs and tutorial storages stay independent", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusPrefs({ warningSoundEnabled: false })
	writeFocusTutorialSessionState({ autoShowPendingThisLogin: false, showOnNextRun: false }, "alice")
	writeFocusTutorialLocalState({ hasCompletedTutorial: true }, "alice")
	expect(readFocusPrefs()).toEqual({ warningSoundEnabled: false })
	expect(readFocusTutorialSessionState("alice")).toEqual({
		autoShowPendingThisLogin: false,
		showOnNextRun: false
	})
	expect(readFocusTutorialLocalState("alice")).toEqual({ hasCompletedTutorial: true })
	expect(readFocusTutorialLocalState("bob")).toEqual({ hasCompletedTutorial: false })
})
