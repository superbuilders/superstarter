import { Signer } from "@aws-sdk/rds-signer"
import * as errors from "@superbuilders/errors"
import { attachDatabasePool } from "@vercel/functions"
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { AWS_REGION, DATABASE_NAME, DATABASE_USER } from "@/db/constants"
import { RDS_CA_BUNDLE } from "@/db/rds-ca-bundle"
import { type Db, dbSchema } from "@/db/schema"
import { env } from "@/env"
import { logger } from "@/logger"

declare global {
	// Cached across Turbopack hot-reload module re-evaluation; harmless in production
	// since the server isn't hot-reloaded there.
	var __18seconds_pg_pool: Pool | undefined
}

// auth-oidc-restore C1 probe — see docs/plans/auth-oidc-restore.md §0.3 + §1.0.
// Reads the @vercel/request-context globalThis symbol via getOwnPropertyDescriptor
// + progressive type-narrowing through `unknown` (no `as`, no `any`, no added
// dependency). Returns a flat boolean shape for one-line Pino emission.
interface OidcSourceSnapshot {
	hasContextHolder: boolean
	hasContextValue: boolean
	hasContextToken: boolean
	hasEnvToken: boolean
}

function readVercelContextValue(): unknown {
	const symbol = Symbol.for("@vercel/request-context")
	const desc = Object.getOwnPropertyDescriptor(globalThis, symbol)
	if (!desc) return undefined
	const holder: unknown = desc.value
	if (holder === null || typeof holder !== "object" || !("get" in holder)) return undefined
	const getMaybe: unknown = holder.get
	if (typeof getMaybe !== "function") return undefined
	return getMaybe.call(holder)
}

function extractOidcTokenFromContext(ctx: unknown): boolean {
	if (ctx === null || typeof ctx !== "object" || !("headers" in ctx)) return false
	const headers: unknown = ctx.headers
	if (headers === null || typeof headers !== "object" || !("x-vercel-oidc-token" in headers)) {
		return false
	}
	const tokenMaybe: unknown = headers["x-vercel-oidc-token"]
	return typeof tokenMaybe === "string" && tokenMaybe.length > 0
}

function snapshotOidcSources(): OidcSourceSnapshot {
	const symbol = Symbol.for("@vercel/request-context")
	const hasContextHolder = Object.getOwnPropertyDescriptor(globalThis, symbol) !== undefined
	const ctx = readVercelContextValue()
	const hasContextValue = ctx !== undefined
	const hasContextToken = extractOidcTokenFromContext(ctx)
	const envToken = env.VERCEL_OIDC_TOKEN
	const hasEnvToken = typeof envToken === "string" && envToken.length > 0
	return { hasContextHolder, hasContextValue, hasContextToken, hasEnvToken }
}

// auth-oidc-restore C4-W(a) fix — poll the OIDC source until a token
// becomes available, with a hard cap. Bridges the Vercel cold-start
// injection race where the runtime's request-context is active but the
// x-vercel-oidc-token header has not yet been populated. The cap (2000ms)
// is well below the function's 300s timeout but well above the empirical
// race window observed at C3 (<10ms in 2 datapoints), giving wide margin
// while still failing fast on a genuine "OIDC permanently missing"
// scenario. Returns the actual elapsed time on success; on cap-reached,
// returns the cap exactly so partition reports cluster cleanly.
async function waitForOidcToken(
	maxWaitMs: number,
	intervalMs: number
): Promise<{ pollMs: number; success: boolean }> {
	const start = Date.now()
	while (Date.now() - start < maxWaitMs) {
		await new Promise<void>(function scheduleNextPoll(resolve) {
			setTimeout(resolve, intervalMs)
		})
		const snap = snapshotOidcSources()
		if (snap.hasContextToken || snap.hasEnvToken) {
			return { pollMs: Date.now() - start, success: true }
		}
	}
	return { pollMs: maxWaitMs, success: false }
}

function createLocalPool(connectionString: string): Pool {
	logger.info("creating local docker pg pool")
	return new Pool({
		connectionString,
		max: 10
	})
}

function createRdsPool(): Pool {
	if (!env.AWS_ROLE_ARN || !env.DATABASE_HOST) {
		logger.error(
			{ hasRole: Boolean(env.AWS_ROLE_ARN), hasHost: Boolean(env.DATABASE_HOST) },
			"rds pool needs AWS_ROLE_ARN and DATABASE_HOST when DATABASE_LOCAL_URL is unset"
		)
		throw errors.new(
			"db pool: AWS_ROLE_ARN and DATABASE_HOST required when DATABASE_LOCAL_URL is unset"
		)
	}

	const credentials = awsCredentialsProvider({ roleArn: env.AWS_ROLE_ARN })
	const signer = new Signer({
		region: AWS_REGION,
		hostname: env.DATABASE_HOST,
		port: 5432,
		username: DATABASE_USER,
		credentials
	})

	async function getDbPassword(): Promise<string> {
		// auth-oidc-restore C1 probe — diagnostic snapshot of OIDC token
		// source presence at entry. Recorded inside the same async frame
		// as the failing call so the snapshot reflects exactly what
		// getVercelOidcTokenSync() will see. Remove at auth-oidc-restore
		// C5 after the fix is verified.
		const initialSnapshot = snapshotOidcSources()
		logger.info(initialSnapshot, "getDbPassword: oidc source snapshot")

		// auth-oidc-restore C4-W(a) fix — when no OIDC source is present
		// at entry, poll for one before invoking signer. Targets the
		// Vercel cold-start injection race confirmed at C3. The poll log
		// line carries the wait duration so we can validate the race
		// window empirically post-deploy (expected pollMs values cluster
		// well under 1000ms based on the C3 data).
		if (!initialSnapshot.hasContextToken && !initialSnapshot.hasEnvToken) {
			const pollResult = await waitForOidcToken(2000, 50)
			logger.info(pollResult, "getDbPassword: oidc poll result")
		}

		const result = await errors.try(signer.getAuthToken())
		if (result.error) {
			logger.error(
				{ error: result.error, host: env.DATABASE_HOST, user: DATABASE_USER },
				"rds iam auth token fetch failed"
			)
			throw errors.wrap(result.error, "rds iam auth token")
		}
		return result.data
	}

	return new Pool({
		host: env.DATABASE_HOST,
		port: 5432,
		user: DATABASE_USER,
		database: DATABASE_NAME,
		ssl: { ca: RDS_CA_BUNDLE, rejectUnauthorized: true },
		max: 10,
		password: getDbPassword
	})
}

function getOrCreatePool(): Pool {
	const cached = globalThis.__18seconds_pg_pool
	if (cached) {
		return cached
	}
	const created = env.DATABASE_LOCAL_URL ? createLocalPool(env.DATABASE_LOCAL_URL) : createRdsPool()
	globalThis.__18seconds_pg_pool = created
	if (!env.DATABASE_LOCAL_URL) {
		attachDatabasePool(created)
	}
	return created
}

const pool = getOrCreatePool()

const db: Db = drizzle({ client: pool, schema: dbSchema })

export type { Db }
export { db }
