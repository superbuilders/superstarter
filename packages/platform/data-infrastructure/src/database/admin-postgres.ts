import { withNativePostgresClient } from "@superstarter/database/postgres/client"
import {
	POSTGRES_SESSION_OPTIONS,
	postgresTransportOptionsOf
} from "@superstarter/database/postgres/connection"
import type { NativePostgresDatabase } from "@superstarter/database/query/contracts"
import { Effect, Redacted } from "effect"
import { readAdminSecret } from "#database/admin-secret.ts"
import { databaseHost } from "#env.ts"

/** One operator session on RDS as the master user, for migrations and programs. */
export const withAdminPostgres = <A, E, R>(
	consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
) =>
	Effect.gen(function* () {
		const host = yield* databaseHost.pipe(Effect.orDie)
		const secret = yield* readAdminSecret
		return yield* withNativePostgresClient(
			{
				...postgresTransportOptionsOf(host),
				user: secret.username,
				password: Redacted.value(secret.password),
				application_name: "superstarter-admin",
				options: POSTGRES_SESSION_OPTIONS
			},
			consume
		)
	})
