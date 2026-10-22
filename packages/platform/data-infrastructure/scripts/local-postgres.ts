import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { pgDatabase } from "@superstarter/database/catalog/pg-catalog"
import {
	LOCAL_POSTGRES_DATABASES,
	LOCAL_POSTGRES_PORT
} from "@superstarter/database/postgres/connection"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
import { eq, sql } from "drizzle-orm"
import { Array as Arr, Effect, FileSystem, Schema, String as Str } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { withLocalPostgres } from "#database/local-postgres.ts"
import { runMigration } from "#migrations.ts"

/**
 * The local development cluster: superstarter's own PostgreSQL 18 (production's major) in the
 * repository's gitignored `out/postgres/`, on localhost:5434 with trust authentication.
 * - `start` creates the cluster if missing and starts it if stopped, then makes the development
 *   database, migrates it and applies the programs. Every step is idempotent.
 * - `stop` stops the cluster.
 * - `test` does what `start` does for the cluster, then drops and rebuilds the throwaway test
 *   database from the migrations.
 */
const LocalMode = Schema.Literals(["start", "stop", "test"])

const CLUSTER = `${import.meta.dirname}/../../../../out/postgres`
const DATA = `${CLUSTER}/data`

class LocalPostgresRefused extends Schema.TaggedError<
	LocalPostgresRefused,
	{ readonly brand: unique symbol }
>()("LocalPostgresRefused", {
	step: Schema.Literals(["version", "initdb", "start", "stop"])
}) {}

const exitCodeOf = (command: string, args: ReadonlyArray<string>) =>
	Effect.flatMap(ChildProcessSpawner.ChildProcessSpawner, (spawner) =>
		spawner.exitCode(
			ChildProcess.make(command, [...args], { stdout: "inherit", stderr: "inherit" })
		)
	)

const succeeds = (
	step: LocalPostgresRefused["step"],
	command: string,
	args: ReadonlyArray<string>
) =>
	Effect.flatMap(exitCodeOf(command, args), (code) =>
		code === 0 ? Effect.void : Effect.fail(LocalPostgresRefused.make({ step }))
	)

/** The binaries on PATH must be PostgreSQL 18, the major RDS runs. */
const requirePostgres18 = Effect.flatMap(ChildProcessSpawner.ChildProcessSpawner, (spawner) =>
	spawner.string(ChildProcess.make("pg_ctl", ["--version"]))
).pipe(
	Effect.flatMap((version) =>
		Str.includes("(PostgreSQL) 18.")(version)
			? Effect.void
			: Effect.fail(LocalPostgresRefused.make({ step: "version" }))
	)
)

/** `pg_ctl status` exits 0 only for a running server. */
const isRunning = Effect.map(
	Effect.flatMap(ChildProcessSpawner.ChildProcessSpawner, (spawner) =>
		spawner.exitCode(ChildProcess.make("pg_ctl", ["status", "-D", DATA]))
	),
	(code) => code === 0
)

const ensureCluster = Effect.gen(function* () {
	yield* requirePostgres18
	const fs = yield* FileSystem.FileSystem
	if (!(yield* fs.exists(`${DATA}/PG_VERSION`))) {
		yield* fs.makeDirectory(CLUSTER, { recursive: true })
		yield* succeeds("initdb", "initdb", [
			"--pgdata",
			DATA,
			"--username=postgres",
			"--auth=trust",
			"--encoding=UTF8",
			"--locale-provider=builtin",
			"--locale=C.UTF-8"
		])
	}
	if (!(yield* isRunning)) {
		yield* succeeds("start", "pg_ctl", [
			"start",
			"--pgdata",
			DATA,
			"--log",
			`${CLUSTER}/postgres.log`,
			"--wait",
			"-o",
			`-p ${LOCAL_POSTGRES_PORT} -c listen_addresses=localhost`
		])
	}
})

/** Creates `name` when it is missing; with `fresh`, drops it first, sessions and all. */
const ensureDatabase = (input: Readonly<{ name: string; fresh: boolean }>) =>
	withLocalPostgres({
		database: "postgres",
		consume: (database) =>
			withPostgresStatement(database, (scope) =>
				Effect.gen(function* () {
					if (input.fresh) {
						yield* scope.run((builder) =>
							builder.execute(
								sql`DROP DATABASE IF EXISTS ${sql.identifier(input.name)} WITH (FORCE)`
							)
						)
					}
					const existing = yield* scope.run((builder) =>
						builder
							.select({ name: pgDatabase.datname })
							.from(pgDatabase)
							.where(eq(pgDatabase.datname, input.name))
					)
					if (!Arr.isReadonlyArrayNonEmpty(existing)) {
						yield* scope.run((builder) =>
							builder.execute(sql`CREATE DATABASE ${sql.identifier(input.name)}`)
						)
					}
				})
			)
	})

const migrated = (input: Readonly<{ name: string; fresh: boolean }>) =>
	ensureDatabase(input).pipe(
		Effect.andThen(
			withLocalPostgres({
				database: input.name,
				consume: runMigration({ mode: "apply", identity: { kind: "local" } })
			})
		),
		Effect.tap(() => Effect.logInfo("local database ready", { database: input.name }))
	)

const stop = Effect.gen(function* () {
	if (yield* isRunning) {
		yield* succeeds("stop", "pg_ctl", ["stop", "--pgdata", DATA, "--mode", "fast"])
	}
})

const main = Effect.gen(function* () {
	const [mode] = yield* Schema.decodeUnknownEffect(Schema.Tuple([LocalMode]))(
		Arr.drop(process.argv, 2)
	)
	if (mode === "stop") {
		return yield* stop
	}
	yield* ensureCluster
	const database =
		mode === "test" ? LOCAL_POSTGRES_DATABASES.test : LOCAL_POSTGRES_DATABASES.development
	yield* migrated({ name: database, fresh: mode === "test" })
})

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
