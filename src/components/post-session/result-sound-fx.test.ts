import { expect, test } from "bun:test"
import { bankFor, pickRandomUrl, tierForScore } from "@/components/post-session/result-sound-fx"
import { ALMOST_SOUND_URLS, FAILURE_SOUND_URLS, SUCCESS_SOUND_URLS } from "@/config/sound-bank"

// ---------- tierForScore ----------

test("tierForScore: 0 maps to failure", () => {
	expect(tierForScore(0)).toBe("failure")
})

test("tierForScore: 29 (upper failure boundary) maps to failure", () => {
	expect(tierForScore(29)).toBe("failure")
})

test("tierForScore: 30 (lower almost boundary) maps to almost", () => {
	expect(tierForScore(30)).toBe("almost")
})

test("tierForScore: 39 (upper almost boundary) maps to almost", () => {
	expect(tierForScore(39)).toBe("almost")
})

test("tierForScore: 40 (lower success boundary) maps to success", () => {
	expect(tierForScore(40)).toBe("success")
})

test("tierForScore: 50 (perfect score) maps to success", () => {
	expect(tierForScore(50)).toBe("success")
})

test("tierForScore: mid-failure 15 maps to failure", () => {
	expect(tierForScore(15)).toBe("failure")
})

test("tierForScore: mid-almost 35 maps to almost", () => {
	expect(tierForScore(35)).toBe("almost")
})

test("tierForScore: mid-success 45 maps to success", () => {
	expect(tierForScore(45)).toBe("success")
})

// ---------- bankFor ----------

test("bankFor: failure routes to FAILURE_SOUND_URLS", () => {
	expect(bankFor("failure")).toBe(FAILURE_SOUND_URLS)
})

test("bankFor: almost routes to ALMOST_SOUND_URLS", () => {
	expect(bankFor("almost")).toBe(ALMOST_SOUND_URLS)
})

test("bankFor: success routes to SUCCESS_SOUND_URLS", () => {
	expect(bankFor("success")).toBe(SUCCESS_SOUND_URLS)
})

// ---------- pickRandomUrl ----------

test("pickRandomUrl: empty bank returns undefined", () => {
	expect(pickRandomUrl([])).toBeUndefined()
})

test("pickRandomUrl: single-entry bank always returns that entry", () => {
	const url = "/audio/test/only.mp3"
	for (let i = 0; i < 10; i++) {
		expect(pickRandomUrl([url])).toBe(url)
	}
})

test("pickRandomUrl: multi-entry bank returns one of the entries", () => {
	const bank = ["/a.mp3", "/b.mp3", "/c.mp3"]
	for (let i = 0; i < 50; i++) {
		const picked = pickRandomUrl(bank)
		if (picked === undefined) {
			expect(picked).toBeDefined()
			return
		}
		expect(bank.includes(picked)).toBe(true)
	}
})

// ---------- bank smoke checks ----------
// The script regenerates these arrays from data/sounds/<category>/.
// Asserting non-empty here guards against an accidental empty-folder
// regression silently breaking the result sound.

test("FAILURE_SOUND_URLS is non-empty", () => {
	expect(FAILURE_SOUND_URLS.length).toBeGreaterThan(0)
})

test("ALMOST_SOUND_URLS is non-empty", () => {
	expect(ALMOST_SOUND_URLS.length).toBeGreaterThan(0)
})

test("SUCCESS_SOUND_URLS is non-empty", () => {
	expect(SUCCESS_SOUND_URLS.length).toBeGreaterThan(0)
})

test("FAILURE_SOUND_URLS entries all live under /audio/failure/", () => {
	for (const url of FAILURE_SOUND_URLS) {
		expect(url.startsWith("/audio/failure/")).toBe(true)
	}
})

test("ALMOST_SOUND_URLS entries all live under /audio/almost/", () => {
	for (const url of ALMOST_SOUND_URLS) {
		expect(url.startsWith("/audio/almost/")).toBe(true)
	}
})

test("SUCCESS_SOUND_URLS entries all live under /audio/success/", () => {
	for (const url of SUCCESS_SOUND_URLS) {
		expect(url.startsWith("/audio/success/")).toBe(true)
	}
})
