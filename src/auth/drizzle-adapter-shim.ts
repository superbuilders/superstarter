import * as errors from "@superbuilders/errors"
import { and, eq } from "drizzle-orm"
import type {
	Adapter,
	AdapterAccount,
	AdapterSession,
	AdapterUser,
	VerificationToken
} from "next-auth/adapters"
import type { Db } from "@/db/schema"
import { accounts } from "@/db/schemas/auth/accounts"
import { authSessions } from "@/db/schemas/auth/sessions"
import { users } from "@/db/schemas/auth/users"
import { verificationTokens } from "@/db/schemas/auth/verification_tokens"
import { logger } from "@/logger"

const ErrAdapterUserNotFound = errors.new("adapter: user not found after upsert")

function dateToMs(d: Date | null): number | null {
	if (d === null) {
		return null
	}
	return d.getTime()
}

function msToDate(ms: number | null): Date | null {
	if (ms === null) {
		return null
	}
	return new Date(ms)
}

interface UserRow {
	id: string
	name: string | null
	email: string
	emailVerifiedMs: number | null
	image: string | null
}

function rowToAdapterUser(row: UserRow): AdapterUser {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		emailVerified: msToDate(row.emailVerifiedMs),
		image: row.image
	}
}

interface SessionRow {
	sessionToken: string
	userId: string
	expiresMs: number
}

function rowToAdapterSession(row: SessionRow): AdapterSession {
	const expires = msToDate(row.expiresMs)
	if (expires === null) {
		logger.error({ sessionToken: row.sessionToken }, "session expires_ms is null")
		throw errors.new("adapter: session expires_ms is null")
	}
	return {
		sessionToken: row.sessionToken,
		userId: row.userId,
		expires
	}
}

interface AccountRow {
	userId: string
	type: string
	provider: string
	providerAccountId: string
	refreshToken: string | null
	accessToken: string | null
	expiresAtMs: number | null
	refreshTokenExpiresAtMs: number | null
	tokenType: string | null
	scope: string | null
	idToken: string | null
	sessionState: string | null
}

function rowToAdapterAccount(row: AccountRow): AdapterAccount {
	const expiresAtSeconds = row.expiresAtMs === null ? undefined : Math.floor(row.expiresAtMs / 1000)
	return {
		userId: row.userId,
		type: accountTypeFromString(row.type),
		provider: row.provider,
		providerAccountId: row.providerAccountId,
		refresh_token: row.refreshToken === null ? undefined : row.refreshToken,
		access_token: row.accessToken === null ? undefined : row.accessToken,
		expires_at: expiresAtSeconds,
		token_type: row.tokenType === null ? undefined : tokenTypeFromString(row.tokenType),
		scope: row.scope === null ? undefined : row.scope,
		id_token: row.idToken === null ? undefined : row.idToken,
		session_state: row.sessionState === null ? undefined : row.sessionState
	}
}

function accountTypeFromString(value: string): AdapterAccount["type"] {
	if (value === "oauth" || value === "oidc" || value === "email" || value === "webauthn") {
		return value
	}
	logger.error({ value }, "unrecognized account type from db")
	throw errors.new("adapter: unrecognized account type")
}

function tokenTypeFromString(value: string): NonNullable<AdapterAccount["token_type"]> {
	const lowered = value.toLowerCase()
	if (lowered === "bearer" || lowered === "dpop") {
		return lowered
	}
	logger.error({ value }, "unrecognized token type from db")
	throw errors.new("adapter: unrecognized token type")
}

interface VerificationTokenRow {
	identifier: string
	token: string
	expiresMs: number
}

function rowToVerificationToken(row: VerificationTokenRow): VerificationToken {
	const expires = msToDate(row.expiresMs)
	if (expires === null) {
		logger.error({ identifier: row.identifier }, "verification token expires_ms is null")
		throw errors.new("adapter: verification token expires_ms is null")
	}
	return {
		identifier: row.identifier,
		token: row.token,
		expires
	}
}

const userReturnColumns = {
	id: users.id,
	name: users.name,
	email: users.email,
	emailVerifiedMs: users.emailVerifiedMs,
	image: users.image
}

const sessionReturnColumns = {
	sessionToken: authSessions.sessionToken,
	userId: authSessions.userId,
	expiresMs: authSessions.expiresMs
}

const accountReturnColumns = {
	userId: accounts.userId,
	type: accounts.type,
	provider: accounts.provider,
	providerAccountId: accounts.providerAccountId,
	refreshToken: accounts.refreshToken,
	accessToken: accounts.accessToken,
	expiresAtMs: accounts.expiresAtMs,
	refreshTokenExpiresAtMs: accounts.refreshTokenExpiresAtMs,
	tokenType: accounts.tokenType,
	scope: accounts.scope,
	idToken: accounts.idToken,
	sessionState: accounts.sessionState
}

const verificationTokenReturnColumns = {
	identifier: verificationTokens.identifier,
	token: verificationTokens.token,
	expiresMs: verificationTokens.expiresMs
}

function bigintAdapter(db: Db): Adapter {
	return {
		async createUser(user) {
			const [row] = await db
				.insert(users)
				.values({
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerifiedMs: dateToMs(user.emailVerified),
					image: user.image
				})
				.returning(userReturnColumns)
			if (!row) {
				logger.error({ email: user.email }, "create user returned no rows")
				throw ErrAdapterUserNotFound
			}
			return rowToAdapterUser(row)
		},

		async getUser(id) {
			const [row] = await db
				.select(userReturnColumns)
				.from(users)
				.where(eq(users.id, id))
				.limit(1)
			if (!row) {
				return null
			}
			return rowToAdapterUser(row)
		},

		async getUserByEmail(email) {
			const [row] = await db
				.select(userReturnColumns)
				.from(users)
				.where(eq(users.email, email))
				.limit(1)
			if (!row) {
				return null
			}
			return rowToAdapterUser(row)
		},

		async getUserByAccount(providerAccount) {
			const [row] = await db
				.select(userReturnColumns)
				.from(users)
				.innerJoin(accounts, eq(accounts.userId, users.id))
				.where(
					and(
						eq(accounts.provider, providerAccount.provider),
						eq(accounts.providerAccountId, providerAccount.providerAccountId)
					)
				)
				.limit(1)
			if (!row) {
				return null
			}
			return rowToAdapterUser(row)
		},

		async updateUser(user) {
			const emailVerifiedMs =
				user.emailVerified === undefined ? undefined : dateToMs(user.emailVerified)
			const [row] = await db
				.update(users)
				.set({
					name: user.name,
					email: user.email,
					emailVerifiedMs,
					image: user.image
				})
				.where(eq(users.id, user.id))
				.returning(userReturnColumns)
			if (!row) {
				logger.error({ id: user.id }, "update user returned no rows")
				throw ErrAdapterUserNotFound
			}
			return rowToAdapterUser(row)
		},

		async deleteUser(userId) {
			await db.delete(users).where(eq(users.id, userId))
		},

		async linkAccount(account) {
			const expiresAtMs = account.expires_at === undefined ? null : account.expires_at * 1000
			await db.insert(accounts).values({
				userId: account.userId,
				type: account.type,
				provider: account.provider,
				providerAccountId: account.providerAccountId,
				refreshToken: account.refresh_token,
				accessToken: account.access_token,
				expiresAtMs,
				tokenType: account.token_type,
				scope: account.scope,
				idToken: account.id_token,
				sessionState:
					typeof account.session_state === "string" ? account.session_state : undefined
			})
		},

		async unlinkAccount(providerAccount) {
			await db
				.delete(accounts)
				.where(
					and(
						eq(accounts.provider, providerAccount.provider),
						eq(accounts.providerAccountId, providerAccount.providerAccountId)
					)
				)
		},

		async createSession(session) {
			const [row] = await db
				.insert(authSessions)
				.values({
					sessionToken: session.sessionToken,
					userId: session.userId,
					expiresMs: session.expires.getTime()
				})
				.returning(sessionReturnColumns)
			if (!row) {
				logger.error({ sessionToken: session.sessionToken }, "create session returned no rows")
				throw errors.new("adapter: create session returned no rows")
			}
			return rowToAdapterSession(row)
		},

		async getSessionAndUser(sessionToken) {
			const [row] = await db
				.select({
					session: sessionReturnColumns,
					user: userReturnColumns
				})
				.from(authSessions)
				.innerJoin(users, eq(users.id, authSessions.userId))
				.where(eq(authSessions.sessionToken, sessionToken))
				.limit(1)
			if (!row) {
				return null
			}
			return {
				session: rowToAdapterSession(row.session),
				user: rowToAdapterUser(row.user)
			}
		},

		async updateSession(session) {
			const expiresMs = session.expires === undefined ? undefined : session.expires.getTime()
			const [row] = await db
				.update(authSessions)
				.set({
					userId: session.userId,
					expiresMs
				})
				.where(eq(authSessions.sessionToken, session.sessionToken))
				.returning(sessionReturnColumns)
			if (!row) {
				return null
			}
			return rowToAdapterSession(row)
		},

		async deleteSession(sessionToken) {
			await db.delete(authSessions).where(eq(authSessions.sessionToken, sessionToken))
		},

		async createVerificationToken(token) {
			const [row] = await db
				.insert(verificationTokens)
				.values({
					identifier: token.identifier,
					token: token.token,
					expiresMs: token.expires.getTime()
				})
				.returning(verificationTokenReturnColumns)
			if (!row) {
				logger.error({ identifier: token.identifier }, "create verification token returned no rows")
				return null
			}
			return rowToVerificationToken(row)
		},

		async useVerificationToken(params) {
			const [row] = await db
				.delete(verificationTokens)
				.where(
					and(
						eq(verificationTokens.identifier, params.identifier),
						eq(verificationTokens.token, params.token)
					)
				)
				.returning(verificationTokenReturnColumns)
			if (!row) {
				return null
			}
			return rowToVerificationToken(row)
		},

		async getAccount(providerAccountId, provider) {
			const [row] = await db
				.select(accountReturnColumns)
				.from(accounts)
				.where(
					and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId))
				)
				.limit(1)
			if (!row) {
				return null
			}
			return rowToAdapterAccount(row)
		}
	}
}

export {
	bigintAdapter,
	dateToMs,
	msToDate,
	rowToAdapterUser,
	rowToAdapterSession,
	rowToAdapterAccount,
	rowToVerificationToken
}
