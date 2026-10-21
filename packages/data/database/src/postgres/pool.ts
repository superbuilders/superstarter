import { annotateOperation, observed } from "@superstarter/operational-telemetry/effect"
import { OPERATIONAL_SPANS } from "@superstarter/operational-telemetry/spans"
import { drizzle } from "drizzle-orm/node-postgres"
import { Effect, Function as Fn } from "effect"
import { Pool, type PoolClient } from "pg"
import {
	connectFailureOf,
	deliveredToStatement,
	localTransportOptionsOf,
	POSTGRES_SESSION_OPTIONS,
	postgresTransportOptionsOf
} from "#postgres/connection.ts"
import type { PostgresPrincipal } from "#postgres/principals.ts"
import type { NativePostgresDatabase, PostgresConnectRejected } from "#query/contracts.ts"

/** Vercel's guidance for Fluid compute: a short idle timeout closes unused connections quickly
 * while still letting busy traffic reuse them. Idle timers do not run while an instance sleeps. */
const POSTGRES_IDLE_MILLISECONDS = 5_000

/** Vercel's guidance: keep one connection past the idle timeout rather than capping the pool at
 * one, so the next request after a quiet moment skips a TLS handshake and an IAM signature. */
const POSTGRES_MIN_CONNECTIONS = 1

/** One pg pool and the clients it opened that no borrow has seen yet. */
export type PostgresPool = Readonly<{ native: Pool; opened: WeakSet<PoolClient> }>

/** How the pool signs in: to RDS with an IAM token signed per new physical connection (one lives
 * fifteen minutes), or to the local development cluster, which trusts localhost. */
export type PostgresPoolConnection =
	| Readonly<{ kind: "rds-iam"; host: string; password: () => Promise<string> }>
	| Readonly<{ kind: "local"; database: string }>

export type PostgresPoolInput = Readonly<{
	connection: PostgresPoolConnection
	username: PostgresPrincipal
	maxConnections: number
}>

const signInOf = (connection: PostgresPoolConnection) => {
	if (connection.kind === "rds-iam") {
		return { ...postgresTransportOptionsOf(connection.host), password: connection.password }
	}
	return localTransportOptionsOf(connection.database)
}

/** Construction opens no socket and signs nothing. */
export const makePostgresPool = (input: PostgresPoolInput): PostgresPool => {
	const native = new Pool({
		...signInOf(input.connection),
		user: input.username,
		application_name: input.username,
		max: input.maxConnections,
		min: POSTGRES_MIN_CONNECTIONS,
		idleTimeoutMillis: POSTGRES_IDLE_MILLISECONDS,
		options: POSTGRES_SESSION_OPTIONS
	})
	const opened = new WeakSet<PoolClient>()
	native.on("connect", (client) => {
		opened.add(client)
	})
	return { native, opened }
}

/** Whether this borrow opened the client or took an idle one the pool had already opened. */
const connectionStateOf = (pool: PostgresPool, client: PoolClient): "connected" | "reused" =>
	pool.opened.delete(client) ? "connected" : "reused"

const withPooledPostgresOf = <A, E, R>(
	pool: PostgresPool,
	consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | PostgresConnectRejected, R> =>
	Effect.acquireUseRelease(
		Effect.tryPromise({ try: () => pool.native.connect(), catch: connectFailureOf }).pipe(
			Effect.tap((client) => Effect.sync(() => client.on("error", deliveredToStatement))),
			Effect.tap((client) =>
				annotateOperation(OPERATIONAL_SPANS.postgresConnect, {
					"superstarter.postgres.connection": connectionStateOf(pool, client),
					"superstarter.postgres.pool.total": pool.native.totalCount,
					"superstarter.postgres.pool.idle": pool.native.idleCount,
					"superstarter.postgres.pool.waiting": pool.native.waitingCount
				})
			),
			observed(OPERATIONAL_SPANS.postgresConnect, { "db.system.name": "postgresql" })
		),
		(client) => consume(drizzle({ client })),
		(client) =>
			Effect.sync(() => {
				client.off("error", deliveredToStatement)
				client.release()
			})
	)

/** Borrow one client, run `consume`, release it. Acquisition is uninterruptible, so a client pg
 * hands to an interrupted borrower is still released. */
export const withPooledPostgres: {
	<A, E, R>(
		consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
	): (pool: PostgresPool) => Effect.Effect<A, E | PostgresConnectRejected, R>
	<A, E, R>(
		pool: PostgresPool,
		consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
	): Effect.Effect<A, E | PostgresConnectRejected, R>
} = Fn.dual(2, withPooledPostgresOf)
