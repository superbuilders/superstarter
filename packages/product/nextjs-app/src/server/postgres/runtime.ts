import "server-only"
import { Signer } from "@aws-sdk/rds-signer"
import { postgresDiagnosticOf } from "@superstarter/database/postgres/diagnostic"
import {
	makePostgresPool,
	type PostgresPool,
	withPooledPostgres
} from "@superstarter/database/postgres/pool"
import { POSTGRES_PORT, POSTGRES_PRINCIPALS } from "@superstarter/database/postgres/principals"
import { AWS_REGION } from "@superstarter/database/postgres/rds"
import {
	type NativePostgresDatabase,
	PostgresConnectRejected
} from "@superstarter/database/query/contracts"

import {
	type OperationalTelemetry,
	withOperationalTelemetry
} from "@superstarter/operational-telemetry/effect"
import { attachDatabasePool } from "@vercel/functions"
import { Context, Effect, Layer, Scope } from "effect"
import { type DatabaseTarget, databaseTarget } from "#env.ts"
import { productionAwsCredentialsOf } from "#server/aws/production.ts"

/** Connections one function instance may hold to the database. */
const APPLICATION_MAX_CONNECTIONS = 10

const credentialsRefused = PostgresConnectRejected.make({ failure: { stage: "credentials" } })

/** On RDS the application pool signs an IAM token per new connection as `app`; a credentials
 * failure leaves the provider's message behind, because it can carry secret material. Locally it
 * signs in as `app` to the trusted development cluster. */
const applicationPoolOf = (target: DatabaseTarget): PostgresPool => {
	if (target.kind === "local") {
		return makePostgresPool({
			connection: { kind: "local", database: target.database },
			username: POSTGRES_PRINCIPALS.app,
			maxConnections: APPLICATION_MAX_CONNECTIONS
		})
	}
	const signer = new Signer({
		hostname: target.host,
		port: POSTGRES_PORT,
		region: AWS_REGION,
		username: POSTGRES_PRINCIPALS.app,
		credentials: productionAwsCredentialsOf(target.roleArn)
	})
	return makePostgresPool({
		connection: {
			kind: "rds-iam",
			host: target.host,
			password: () =>
				signer.getAuthToken().then(
					(token) => token,
					() => {
						throw credentialsRefused
					}
				)
		},
		username: POSTGRES_PRINCIPALS.app,
		maxConnections: APPLICATION_MAX_CONNECTIONS
	})
}

/**
 * The instance's one application pool, held by the web runtime. Concurrent invocations on one
 * Fluid compute instance borrow from it and return to it. It is built on the first borrow, so a
 * process that never reads the database (or whose configuration is missing) still serves
 * telemetry; missing configuration is a deployment defect and dies there. `attachDatabasePool`
 * closes idle connections before Vercel suspends the instance, because no idle timeout runs while
 * it is suspended. The pool ends when its runtime is disposed: for the web runtime, when a stop
 * signal reaches the process's exit hook.
 * https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#attachdatabasepool
 */
export class ApplicationPostgres extends Context.Service<
	ApplicationPostgres,
	Readonly<{ pool: Effect.Effect<PostgresPool> }>
>()("@superstarter/nextjs-app/server/postgres/runtime/ApplicationPostgres") {}

export const ApplicationPostgresLive = Layer.effect(
	ApplicationPostgres,
	Effect.gen(function* () {
		const scope = yield* Effect.scope
		const runFork = Effect.runForkWith(yield* Effect.context<OperationalTelemetry>())
		const acquire = Effect.acquireRelease(
			Effect.gen(function* () {
				const pool = applicationPoolOf(yield* databaseTarget)
				pool.native.on("error", (error) => {
					runFork(
						Effect.logError("postgres idle client failed").pipe(
							Effect.annotateLogs({ diagnostic: postgresDiagnosticOf(error) }),
							withOperationalTelemetry
						)
					)
				})
				attachDatabasePool(pool.native)
				return pool
			}).pipe(Effect.orDie),
			(pool) => Effect.promise(() => pool.native.end())
		)
		const pool = yield* Effect.cached(acquire.pipe(Scope.provide(scope)))
		return ApplicationPostgres.of({ pool })
	})
)

/** Borrow one application connection for `consume`. */
export const withApplicationPostgres = <A, E, R>(
	consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | PostgresConnectRejected, R | ApplicationPostgres> =>
	Effect.flatMap(ApplicationPostgres, ({ pool }) =>
		Effect.flatMap(pool, withPooledPostgres(consume))
	)
