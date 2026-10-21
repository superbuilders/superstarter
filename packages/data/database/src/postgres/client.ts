import { drizzle } from "drizzle-orm/node-postgres"
import { Effect, Function as Fn } from "effect"
import { Client, type ClientConfig } from "pg"
import { connectFailureOf, deliveredToStatement } from "#postgres/connection.ts"
import type { NativePostgresDatabase, PostgresConnectRejected } from "#query/contracts.ts"

const withNativePostgresClientOf = <A, E, R>(
	config: ClientConfig,
	consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | PostgresConnectRejected, R> =>
	Effect.acquireUseRelease(
		Effect.sync(() => {
			const client = new Client(config)
			client.on("error", deliveredToStatement)
			return client
		}),
		(client) =>
			Effect.tryPromise({ try: () => client.connect(), catch: connectFailureOf }).pipe(
				Effect.uninterruptible,
				Effect.andThen(() => consume(drizzle({ client })))
			),
		(client) => Effect.promise(() => client.end().then(deliveredToStatement, deliveredToStatement))
	)

/**
 * One owned session for exactly the lifetime of `consume`, for operator scripts and tests rather
 * than the runtime's pool. The dial is uninterruptible, because ending a still-connecting pg
 * Client can strand its promise.
 */
export const withNativePostgresClient: {
	<A, E, R>(
		consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
	): (config: ClientConfig) => Effect.Effect<A, E | PostgresConnectRejected, R>
	<A, E, R>(
		config: ClientConfig,
		consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
	): Effect.Effect<A, E | PostgresConnectRejected, R>
} = Fn.dual(2, withNativePostgresClientOf)
