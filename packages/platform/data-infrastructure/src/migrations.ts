import {
	nativeDrizzleHistory,
	pgClass,
	pgNamespace
} from "@superstarter/database/catalog/pg-catalog"

import {
	migrationConfiguration,
	packagedMigrations
} from "@superstarter/database/migrations/migration-artifacts"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
import {
	type PostgresAppIdentity,
	postgresProgramsOf
} from "@superstarter/database/programs/app-user"

import type {
	NativePostgresDatabase,
	PostgresQueryScope
} from "@superstarter/database/query/contracts"
import { and, eq } from "drizzle-orm"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Array as Arr, Effect, Schema } from "effect"

/** The two sanctioned operations. There is no ad hoc SQL mode: SQL drizzle-kit cannot express
 * belongs in a reviewed custom migration applied through the same native migrator, or in the
 * idempotent programs that follow it. */
export const MigrationMode = Schema.Literals(["status", "apply"])
export type MigrationMode = typeof MigrationMode.Type

/** The native migrator refused; its message names no credential or host. */
class MigrationApplyRejected extends Schema.TaggedError<
	MigrationApplyRejected,
	{ readonly brand: unique symbol }
>()("MigrationApplyRejected", {
	reason: Schema.Literals(["migrator", "init-response"])
}) {}

/** The hashes the native migrator recorded, or none before its first run created the history. */
const appliedHashes = (scope: PostgresQueryScope) =>
	Effect.gen(function* () {
		const history = yield* scope.run((database) =>
			database
				.select({ name: pgClass.relname })
				.from(pgClass)
				.innerJoin(pgNamespace, eq(pgNamespace.oid, pgClass.relnamespace))
				.where(
					and(
						eq(pgNamespace.nspname, migrationConfiguration.migrationsSchema),
						eq(pgClass.relname, migrationConfiguration.migrationsTable)
					)
				)
		)
		if (!Arr.isReadonlyArrayNonEmpty(history)) {
			return []
		}
		const rows = yield* scope.run((database) =>
			database.select({ hash: nativeDrizzleHistory.hash }).from(nativeDrizzleHistory)
		)
		return Arr.map(rows, ({ hash }) => hash)
	})

const reportStatus = (database: NativePostgresDatabase) =>
	Effect.gen(function* () {
		const packaged = yield* packagedMigrations
		const applied = yield* withPostgresStatement(database, appliedHashes)
		const pending = Arr.filter(packaged, ({ hash }) => !Arr.contains(applied, hash))
		yield* Effect.logInfo("migration status", {
			packaged: packaged.length,
			applied: packaged.length - pending.length,
			pending: Arr.map(pending, ({ name }) => name)
		})
	})

/** Drizzle's native migrator applies the pending reviewed migrations in order, then the programs
 * grant the application login what the schema now holds. */
const applyPending = (database: NativePostgresDatabase, identity: PostgresAppIdentity) =>
	Effect.gen(function* () {
		const response = yield* Effect.tryPromise({
			try: () => migrate(database, migrationConfiguration),
			catch: () => MigrationApplyRejected.make({ reason: "migrator" })
		})
		// The init-failure response exists only for `drizzle-kit pull --init`; a plain apply never returns it.
		if (typeof response === "object") {
			return yield* MigrationApplyRejected.make({ reason: "init-response" })
		}
		const programs = postgresProgramsOf(identity)
		yield* withPostgresStatement(database, (scope) =>
			Effect.forEach(programs, (program) => scope.run((builder) => builder.execute(program)), {
				discard: true
			})
		)
		yield* Effect.logInfo("migrations and programs applied", { programs: programs.length })
		yield* reportStatus(database)
	})

/** `status` or `apply` on one database, as the identity its application login authenticates with. */
export const runMigration = (
	input: Readonly<{ mode: MigrationMode; identity: PostgresAppIdentity }>
) =>
	input.mode === "status"
		? reportStatus
		: (database: NativePostgresDatabase) => applyPending(database, input.identity)
