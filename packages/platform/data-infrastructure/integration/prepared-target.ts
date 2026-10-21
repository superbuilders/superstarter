import { LOCAL_POSTGRES_DATABASES } from "@superstarter/database/postgres/connection"
import type {
	NativePostgresDatabase,
	PostgresConnectRejected
} from "@superstarter/database/query/contracts"
import type { Effect } from "effect"
import { withLocalPostgres } from "#database/local-postgres.ts"

/** Lends one superuser session to `consume`; the suite sets each statement's production role
 * itself. */
export type Borrow = <A, E, R>(
	consume: (database: NativePostgresDatabase) => Effect.Effect<A, E, R>
) => Effect.Effect<A, E | PostgresConnectRejected, R>

/** The database the suite PREPAREs against: the throwaway test database `pnpm test` rebuilds from
 * the migrations on the local cluster before the suite runs. Each borrow is its own session. */
export const borrowPreparedDatabase: Borrow = (consume) =>
	withLocalPostgres({ database: LOCAL_POSTGRES_DATABASES.test, consume })
