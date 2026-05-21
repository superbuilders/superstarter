import { describe, expect, test } from "bun:test"
import {
	dateToMs,
	msToDate,
	rowToAdapterAccount,
	rowToAdapterSession,
	rowToAdapterUser,
	rowToVerificationToken
} from "@/auth/drizzle-adapter-shim"

describe("dateToMs", () => {
	test("converts a Date to its epoch milliseconds", () => {
		const d = new Date(1714512345000)
		expect(dateToMs(d)).toBe(1714512345000)
	})

	test("returns null for null input", () => {
		expect(dateToMs(null)).toBeNull()
	})
})

describe("msToDate", () => {
	test("converts epoch milliseconds to a Date with the same instant", () => {
		const date = msToDate(1714512345000)
		expect(date).not.toBeNull()
		if (date === null) return
		expect(date.getTime()).toBe(1714512345000)
	})

	test("returns null for null input", () => {
		expect(msToDate(null)).toBeNull()
	})

	test("round-trips through dateToMs without drift", () => {
		const original = new Date("2026-05-01T12:34:56.789Z")
		const ms = dateToMs(original)
		expect(ms).not.toBeNull()
		if (ms === null) return
		const restored = msToDate(ms)
		expect(restored).not.toBeNull()
		if (restored === null) return
		expect(restored.getTime()).toBe(original.getTime())
	})
})

describe("rowToAdapterUser", () => {
	test("maps a verified-user row with all fields populated", () => {
		const user = rowToAdapterUser({
			id: "01900000-0000-7000-8000-000000000001",
			name: "Test User",
			email: "test@example.com",
			emailVerifiedMs: 1714512345000,
			image: "https://example.com/avatar.png"
		})
		expect(user.id).toBe("01900000-0000-7000-8000-000000000001")
		expect(user.name).toBe("Test User")
		expect(user.email).toBe("test@example.com")
		expect(user.emailVerified).not.toBeNull()
		if (user.emailVerified === null) return
		expect(user.emailVerified.getTime()).toBe(1714512345000)
		expect(user.image).toBe("https://example.com/avatar.png")
	})

	test("maps an unverified-user row with email_verified_ms = null", () => {
		const user = rowToAdapterUser({
			id: "01900000-0000-7000-8000-000000000002",
			name: null,
			email: "unverified@example.com",
			emailVerifiedMs: null,
			image: null
		})
		expect(user.emailVerified).toBeNull()
		expect(user.name).toBeNull()
		expect(user.image).toBeNull()
	})
})

describe("rowToAdapterSession", () => {
	test("maps a session row, converting expires_ms to Date", () => {
		const session = rowToAdapterSession({
			sessionToken: "abc123",
			userId: "01900000-0000-7000-8000-000000000001",
			expiresMs: 1714512345000
		})
		expect(session.sessionToken).toBe("abc123")
		expect(session.userId).toBe("01900000-0000-7000-8000-000000000001")
		expect(session.expires.getTime()).toBe(1714512345000)
	})
})

describe("rowToAdapterAccount", () => {
	test("converts expires_at_ms back to seconds for Auth.js (OAuth standard)", () => {
		const account = rowToAdapterAccount({
			userId: "01900000-0000-7000-8000-000000000001",
			type: "oauth",
			provider: "google",
			providerAccountId: "google-12345",
			refreshToken: "rt-xyz",
			accessToken: "at-xyz",
			expiresAtMs: 1714512345000,
			refreshTokenExpiresAtMs: null,
			tokenType: "bearer",
			scope: "openid email",
			idToken: "id-xyz",
			sessionState: null
		})
		expect(account.expires_at).toBe(1714512345)
		expect(account.refresh_token).toBe("rt-xyz")
		expect(account.access_token).toBe("at-xyz")
		expect(account.token_type).toBe("bearer")
		expect(account.scope).toBe("openid email")
		expect(account.id_token).toBe("id-xyz")
		expect(account.session_state).toBeUndefined()
		expect(account.type).toBe("oauth")
	})

	test("maps null token columns to undefined for Auth.js", () => {
		const account = rowToAdapterAccount({
			userId: "01900000-0000-7000-8000-000000000001",
			type: "oidc",
			provider: "google",
			providerAccountId: "google-67890",
			refreshToken: null,
			accessToken: null,
			expiresAtMs: null,
			refreshTokenExpiresAtMs: null,
			tokenType: null,
			scope: null,
			idToken: null,
			sessionState: null
		})
		expect(account.refresh_token).toBeUndefined()
		expect(account.access_token).toBeUndefined()
		expect(account.expires_at).toBeUndefined()
		expect(account.token_type).toBeUndefined()
		expect(account.scope).toBeUndefined()
		expect(account.id_token).toBeUndefined()
		expect(account.session_state).toBeUndefined()
	})

	test("normalizes mixed-case token_type before classifying", () => {
		const account = rowToAdapterAccount({
			userId: "01900000-0000-7000-8000-000000000001",
			type: "oauth",
			provider: "google",
			providerAccountId: "google-1",
			refreshToken: null,
			accessToken: null,
			expiresAtMs: null,
			refreshTokenExpiresAtMs: null,
			tokenType: "Bearer",
			scope: null,
			idToken: null,
			sessionState: null
		})
		expect(account.token_type).toBe("bearer")
	})

	test("rejects an unrecognized account type", () => {
		expect(() =>
			rowToAdapterAccount({
				userId: "01900000-0000-7000-8000-000000000001",
				type: "magic",
				provider: "google",
				providerAccountId: "google-1",
				refreshToken: null,
				accessToken: null,
				expiresAtMs: null,
				refreshTokenExpiresAtMs: null,
				tokenType: null,
				scope: null,
				idToken: null,
				sessionState: null
			})
		).toThrow()
	})
})

describe("rowToVerificationToken", () => {
	test("converts expires_ms to Date and preserves identifier+token", () => {
		const token = rowToVerificationToken({
			identifier: "user@example.com",
			token: "tok-1234",
			expiresMs: 1714512345000
		})
		expect(token.identifier).toBe("user@example.com")
		expect(token.token).toBe("tok-1234")
		expect(token.expires.getTime()).toBe(1714512345000)
	})
})
