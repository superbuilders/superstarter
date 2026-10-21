import { Schema } from "effect"
import { postgresDiagnosticOf } from "#postgres/diagnostic.ts"
import { POSTGRES_DATABASE_NAME, POSTGRES_PORT } from "#postgres/principals.ts"
import { RDS_US_EAST_1_CA_PEM } from "#postgres/rds-ca.ts"
import { PostgresConnectRejected } from "#query/contracts.ts"

/** How often PostgreSQL checks, during a running query, that its client is still connected. A
 * function that ends mid-query leaves no session working on its behalf for longer than this. */
const CLIENT_CONNECTION_CHECK_MILLISECONDS = 10_000

/**
 * Every session names schemas explicitly (search_path holds only pg_catalog), keeps time in UTC,
 * runs every transaction SERIALIZABLE (autocommit statements included), and stops work for a
 * client that has gone.
 */
export const POSTGRES_SESSION_OPTIONS = `-c search_path=pg_catalog -c timezone=UTC -c default_transaction_isolation=serializable -c client_connection_check_interval=${CLIENT_CONNECTION_CHECK_MILLISECONDS}`

/** Certificate-verified TLS 1.3 against the pinned RDS authorities; the driver refuses anything
 * else, including a plaintext session. */
export const postgresTransportOptionsOf = (host: string) =>
	({
		host,
		port: POSTGRES_PORT,
		database: POSTGRES_DATABASE_NAME,
		ssl: {
			ca: RDS_US_EAST_1_CA_PEM,
			rejectUnauthorized: true,
			minVersion: "TLSv1.3",
			servername: host
		},
		sslnegotiation: "postgres",
		keepAlive: true
	}) as const

/** The local development cluster `pnpm db:local` starts: its own PostgreSQL 18 on localhost,
 * trust authentication, no TLS. Production is RDS on 5432 behind IAM and verify-full TLS. */
export const LOCAL_POSTGRES_PORT = 5434

/** The local databases: development's, and the throwaway one `pnpm test` rebuilds every run. */
export const LOCAL_POSTGRES_DATABASES = {
	development: "superstarter",
	test: "superstarter_test"
} as const

export const localTransportOptionsOf = (database: string) =>
	({ host: "localhost", port: LOCAL_POSTGRES_PORT, database }) as const

const isConnectRejected = Schema.is(PostgresConnectRejected)

/** The one decode of a connect failure. A credentials refusal arrives already decoded from the
 * password callback; anything else is the driver's, reduced to its admitted diagnostic. */
export const connectFailureOf = (error: unknown): PostgresConnectRejected => {
	if (isConnectRejected(error)) {
		return error
	}
	return PostgresConnectRejected.make({
		failure: { stage: "connect", diagnostic: postgresDiagnosticOf(error) }
	})
}

/** A checked-out client has no error listener of its own, and an unhandled `error` event crashes
 * the process. pg delivers the same failure to the active or next statement instead. */
export const deliveredToStatement = (): void => undefined
