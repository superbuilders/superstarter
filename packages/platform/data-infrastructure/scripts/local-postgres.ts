import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { pgDatabase } from "@superstarter/database/catalog/pg-catalog"
import {
	LOCAL_POSTGRES_DATABASES,
	LOCAL_POSTGRES_PORT
} from "@superstarter/database/postgres/connection"
import { POSTGRES_MASTER_USERNAME } from "@superstarter/database/postgres/principals"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
import { eq, sql } from "drizzle-orm"
import { Array as Arr, Effect, FileSystem, Schema, Stdio, String as Str } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { withLocalPostgres } from "#database/local-postgres.ts"
import { runMigration } from "#migrations.ts"
import { argumentsOf } from "#script.ts"

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
type LocalMode = typeof LocalMode.Type

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
			`--username=${POSTGRES_MASTER_USERNAME}`,
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

/** What a mode does to its database: `ensure` creates it when it is missing; `recreate` drops it
 * first, sessions and all. */
type DatabaseOperation = "ensure" | "recreate"

const ensureDatabase = (input: Readonly<{ name: string; operation: DatabaseOperation }>) =>
	withLocalPostgres({
		database: "postgres",
		consume: (database) =>
			withPostgresStatement(database, (scope) =>
				Effect.gen(function* () {
					if (input.operation === "recreate") {
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

const migrated = (input: Readonly<{ name: string; operation: DatabaseOperation }>) =>
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

const MODES = {
	start: ensureCluster.pipe(
		Effect.andThen(migrated({ name: LOCAL_POSTGRES_DATABASES.development, operation: "ensure" }))
	),
	stop,
	test: ensureCluster.pipe(
		Effect.andThen(migrated({ name: LOCAL_POSTGRES_DATABASES.test, operation: "recreate" }))
	)
} satisfies Readonly<Record<LocalMode, Effect.Effect<void, unknown, unknown>>>

const main = Effect.flatMap(Stdio.Stdio, (stdio) => stdio.args).pipe(
	Effect.flatMap(argumentsOf(Schema.Tuple([LocalMode]), "local-postgres <start|stop|test>")),
	Effect.flatMap(([mode]) => MODES[mode])
)

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
