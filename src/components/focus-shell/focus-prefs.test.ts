import { afterEach, expect, test } from "bun:test"
import {
	completeTutorialDismissal,
	DEFAULT_FOCUS_PREFS,
	DEFAULT_FOCUS_TUTORIAL_PREFS_STATE,
	FOCUS_PREFS_STORAGE_KEY,
	FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
	readFocusPrefs,
	readFocusTutorialPrefsState,
	setTickingSoundEnabled,
	setTutorialEnabledForNextRun,
	setWarningSoundEnabled,
	shouldShowTutorialOnNextRun,
	shouldShowTutorialOnNextRunState,
	writeFocusPrefs,
	writeFocusTutorialPrefsState
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

test("readFocusTutorialPrefsState returns defaults when storage is empty", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(readFocusTutorialPrefsState("alice")).toEqual(DEFAULT_FOCUS_TUTORIAL_PREFS_STATE)
})

test("readFocusPrefs falls back to defaults for malformed JSON", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(FOCUS_PREFS_STORAGE_KEY, "{not-json")
	expect(readFocusPrefs()).toEqual(DEFAULT_FOCUS_PREFS)
})

test("setWarningSoundEnabled persists the updated value", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = setWarningSoundEnabled(false)
	expect(next).toEqual({ tickingSoundEnabled: true, warningSoundEnabled: false })
	expect(localStorage.getItem(FOCUS_PREFS_STORAGE_KEY)).toBe(
		JSON.stringify({ tickingSoundEnabled: true, warningSoundEnabled: false })
	)
})

test("setTickingSoundEnabled persists the updated value independently", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = setTickingSoundEnabled(false)
	expect(next).toEqual({ tickingSoundEnabled: false, warningSoundEnabled: true })
	expect(localStorage.getItem(FOCUS_PREFS_STORAGE_KEY)).toBe(
		JSON.stringify({ tickingSoundEnabled: false, warningSoundEnabled: true })
	)
})

test("setTutorialEnabledForNextRun(true) writes a per-user replay flag to localStorage", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = setTutorialEnabledForNextRun(true, "alice")
	expect(next).toEqual({ hasCompletedTutorial: false, showOnNextRun: true })
	expect(readStoredJson(localStorage, FOCUS_TUTORIAL_LOCAL_STORAGE_KEY)).toEqual({
		byUserKey: {
			alice: { hasCompletedTutorial: false, showOnNextRun: true }
		}
	})
})

test("completeTutorialDismissal marks completed for the current user and clears replay", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialPrefsState({ hasCompletedTutorial: false, showOnNextRun: true }, "alice")
	const next = completeTutorialDismissal("alice")
	expect(next).toEqual({ hasCompletedTutorial: true, showOnNextRun: false })
	expect(readStoredJson(localStorage, FOCUS_TUTORIAL_LOCAL_STORAGE_KEY)).toEqual({
		byUserKey: {
			alice: { hasCompletedTutorial: true, showOnNextRun: false }
		}
	})
	expect(readFocusTutorialPrefsState("bob")).toEqual(DEFAULT_FOCUS_TUTORIAL_PREFS_STATE)
})

test("setTutorialEnabledForNextRun(false) suppresses the tutorial across logins for this user", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	const next = setTutorialEnabledForNextRun(false, "alice")
	// Off-toggle is authoritative: it marks the user as having seen it, so the
	// new-user auto-show no longer fires.
	expect(next).toEqual({ hasCompletedTutorial: true, showOnNextRun: false })
	expect(readStoredJson(localStorage, FOCUS_TUTORIAL_LOCAL_STORAGE_KEY)).toEqual({
		byUserKey: {
			alice: { hasCompletedTutorial: true, showOnNextRun: false }
		}
	})
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
})

test("setTutorialEnabledForNextRun can re-enable the tutorial after dismissal", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialPrefsState({ hasCompletedTutorial: true, showOnNextRun: false }, "alice")
	const next = setTutorialEnabledForNextRun(true, "alice")
	expect(next).toEqual({ hasCompletedTutorial: true, showOnNextRun: true })
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
})

test("brand-new user auto-shows the tutorial on first run", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	expect(readFocusTutorialPrefsState("alice")).toEqual({
		hasCompletedTutorial: false,
		showOnNextRun: false
	})
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
})

test("existing user with completed tutorial does not auto-show again", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialPrefsState({ hasCompletedTutorial: true, showOnNextRun: false }, "alice")
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
})

test("a different first-time user on the same browser still gets the tutorial by default", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialPrefsState({ hasCompletedTutorial: true, showOnNextRun: false }, "alice")
	expect(readFocusTutorialPrefsState("bob")).toEqual(DEFAULT_FOCUS_TUTORIAL_PREFS_STATE)
	expect(shouldShowTutorialOnNextRun("bob")).toBe(true)
})

test("preference is scoped per user and does not leak across users", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusTutorialPrefsState({ hasCompletedTutorial: true, showOnNextRun: true }, "alice")
	expect(readFocusTutorialPrefsState("bob")).toEqual(DEFAULT_FOCUS_TUTORIAL_PREFS_STATE)
	expect(readFocusTutorialPrefsState("alice")).toEqual({
		hasCompletedTutorial: true,
		showOnNextRun: true
	})
})

test("preference survives a simulated fresh login (sessionStorage cleared)", () => {
	const { localStorage, sessionStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	setTutorialEnabledForNextRun(false, "alice")
	// Simulate logout/login: sessionStorage gets blown away but localStorage stays.
	sessionStorage.clear()
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
	// And the stored state still names alice as having seen it.
	expect(readStoredJson(localStorage, FOCUS_TUTORIAL_LOCAL_STORAGE_KEY)).toEqual({
		byUserKey: {
			alice: { hasCompletedTutorial: true, showOnNextRun: false }
		}
	})
})

test("legacy browser-global completed state migrates to the current scoped user", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(FOCUS_TUTORIAL_LOCAL_STORAGE_KEY, JSON.stringify({ hasCompletedTutorial: true }))
	expect(readFocusTutorialPrefsState("alice")).toEqual({
		hasCompletedTutorial: true,
		showOnNextRun: false
	})
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
	expect(readStoredJson(localStorage, FOCUS_TUTORIAL_LOCAL_STORAGE_KEY)).toEqual({
		byUserKey: {
			alice: { hasCompletedTutorial: true, showOnNextRun: false }
		}
	})
})

test("legacy scoped completedByUserKey migrates to the new byUserKey shape", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(
		FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
		JSON.stringify({ completedByUserKey: { alice: true } })
	)
	expect(readFocusTutorialPrefsState("alice")).toEqual({
		hasCompletedTutorial: true,
		showOnNextRun: false
	})
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
	// And bob (no legacy entry) still gets the tutorial.
	expect(readFocusTutorialPrefsState("bob")).toEqual(DEFAULT_FOCUS_TUTORIAL_PREFS_STATE)
})

test("legacy focusPrefs tutorialSeen migrates to the current scoped user", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(
		FOCUS_PREFS_STORAGE_KEY,
		JSON.stringify({ warningSoundEnabled: true, tutorialSeen: true, tutorialReplayPending: false })
	)
	expect(readFocusTutorialPrefsState("alice")).toEqual({
		hasCompletedTutorial: true,
		showOnNextRun: false
	})
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
	expect(localStorage.getItem(FOCUS_PREFS_STORAGE_KEY)).toBe(
		JSON.stringify({ warningSoundEnabled: true })
	)
})

test("legacy single sound toggle hydrates both ticking and warning prefs", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(
		FOCUS_PREFS_STORAGE_KEY,
		JSON.stringify({ warningSoundEnabled: false })
	)
	expect(readFocusPrefs()).toEqual({ tickingSoundEnabled: false, warningSoundEnabled: false })
})

test("legacy unscoped reads still honor old completed state", () => {
	const { localStorage } = installMockWindow(makeMockStorage(), makeMockStorage())
	localStorage.setItem(FOCUS_TUTORIAL_LOCAL_STORAGE_KEY, JSON.stringify({ hasCompletedTutorial: true }))
	expect(readFocusTutorialPrefsState()).toEqual({
		hasCompletedTutorial: true,
		showOnNextRun: false
	})
})

test("shouldShowTutorialOnNextRun reflects the full lifecycle", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	// First-ever visit: shows.
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
	// Dismissed: stops showing.
	completeTutorialDismissal("alice")
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
	// Replay requested: shows again.
	setTutorialEnabledForNextRun(true, "alice")
	expect(shouldShowTutorialOnNextRun("alice")).toBe(true)
	// Replay consumed by dismissal: stops showing.
	completeTutorialDismissal("alice")
	expect(shouldShowTutorialOnNextRun("alice")).toBe(false)
	// Different fresh user still gets it.
	expect(shouldShowTutorialOnNextRun("bob")).toBe(true)
})

test("shouldShowTutorialOnNextRunState evaluates the gate predicate", () => {
	expect(
		shouldShowTutorialOnNextRunState({ hasCompletedTutorial: false, showOnNextRun: false })
	).toBe(true)
	expect(
		shouldShowTutorialOnNextRunState({ hasCompletedTutorial: true, showOnNextRun: false })
	).toBe(false)
	expect(
		shouldShowTutorialOnNextRunState({ hasCompletedTutorial: true, showOnNextRun: true })
	).toBe(true)
	expect(
		shouldShowTutorialOnNextRunState({ hasCompletedTutorial: false, showOnNextRun: true })
	).toBe(true)
})

test("prefs and tutorial storages stay independent", () => {
	installMockWindow(makeMockStorage(), makeMockStorage())
	writeFocusPrefs({ tickingSoundEnabled: true, warningSoundEnabled: false })
	writeFocusTutorialPrefsState({ hasCompletedTutorial: true, showOnNextRun: false }, "alice")
	expect(readFocusPrefs()).toEqual({ tickingSoundEnabled: true, warningSoundEnabled: false })
	expect(readFocusTutorialPrefsState("alice")).toEqual({
		hasCompletedTutorial: true,
		showOnNextRun: false
	})
	expect(readFocusTutorialPrefsState("bob")).toEqual(DEFAULT_FOCUS_TUTORIAL_PREFS_STATE)
})
