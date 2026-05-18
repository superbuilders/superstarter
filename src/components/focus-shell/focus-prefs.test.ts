import { afterEach, expect, test } from "bun:test"
import {
	DEFAULT_FOCUS_PREFS,
	FOCUS_PREFS_STORAGE_KEY,
	markTutorialReplayPending,
	readFocusPrefs,
	setWarningSoundEnabled,
	writeFocusPrefs
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

function installMockWindow(storage: MockStorage) {
	Object.defineProperty(globalThis, "window", {
		value: { localStorage: storage },
		configurable: true,
		writable: true
	})
	return storage
}

afterEach(function cleanup() {
	Reflect.deleteProperty(globalThis, "window")
})

test("readFocusPrefs returns defaults when storage is empty", () => {
	installMockWindow(makeMockStorage())
	expect(readFocusPrefs()).toEqual(DEFAULT_FOCUS_PREFS)
})

test("readFocusPrefs falls back to defaults for malformed JSON", () => {
	const storage = installMockWindow(makeMockStorage())
	storage.setItem(FOCUS_PREFS_STORAGE_KEY, "{not-json")
	expect(readFocusPrefs()).toEqual(DEFAULT_FOCUS_PREFS)
})

test("readFocusPrefs merges partial payloads with defaults", () => {
	const storage = installMockWindow(makeMockStorage())
	storage.setItem(FOCUS_PREFS_STORAGE_KEY, JSON.stringify({ tutorialSeen: true }))
	expect(readFocusPrefs()).toEqual({
		warningSoundEnabled: true,
		tutorialSeen: true,
		tutorialReplayPending: false
	})
})

test("setWarningSoundEnabled persists the updated value", () => {
	const storage = installMockWindow(makeMockStorage())
	const next = setWarningSoundEnabled(false)
	expect(next).toEqual({
		warningSoundEnabled: false,
		tutorialSeen: false,
		tutorialReplayPending: false
	})
	expect(storage.getItem(FOCUS_PREFS_STORAGE_KEY)).toBe(
		JSON.stringify({
			warningSoundEnabled: false,
			tutorialSeen: false,
			tutorialReplayPending: false
		})
	)
})

test("markTutorialReplayPending persists the replay flag", () => {
	const storage = installMockWindow(makeMockStorage())
	writeFocusPrefs({
		warningSoundEnabled: false,
		tutorialSeen: true,
		tutorialReplayPending: false
	})
	const next = markTutorialReplayPending()
	expect(next).toEqual({
		warningSoundEnabled: false,
		tutorialSeen: true,
		tutorialReplayPending: true
	})
	expect(storage.getItem(FOCUS_PREFS_STORAGE_KEY)).toBe(
		JSON.stringify({
			warningSoundEnabled: false,
			tutorialSeen: true,
			tutorialReplayPending: true
		})
	)
})
