import { withNativePostgresClient } from "@superstarter/database/postgres/client"
import {
	localTransportOptionsOf,
	POSTGRES_SESSION_OPTIONS
} from "@superstarter/database/postgres/connection"
import type { NativePostgresDatabase } from "@superstarter/database/query/contracts"
import type { Effect } from "effect"

/** One session on the local development cluster as its superuser, which owns the schema there as
 * the master user owns it on RDS. */
export const withLocalPostgres = <A, E, R>(
	input: Readonly<{
		database: string
		consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
	}>
) =>
	withNativePostgresClient(
		{
			...localTransportOptionsOf(input.database),
			user: "postgres",
			application_name: "superstarter-local",
			options: POSTGRES_SESSION_OPTIONS
		},
		input.consume
	)
