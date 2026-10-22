import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Effect, Schema, Stdio } from "effect"
import { withAdminPostgres } from "#database/admin-postgres.ts"
import {
	type Migration,
	type MigrationMode,
	MigrationMode as Mode,
	runMigration
} from "#migrations.ts"
import { argumentsOf } from "#script.ts"

/** Production's migrations, as the master user: `status` reports packaged against applied, and
 * `apply` runs the pending reviewed migrations through the native migrator, then the programs for
 * the application login, which signs in with IAM. */
const MIGRATIONS: Readonly<Record<MigrationMode, Migration>> = {
	status: { mode: "status" },
	apply: { mode: "apply", identity: { kind: "rds-iam" } }
}

const main = Effect.gen(function* () {
	const stdio = yield* Stdio.Stdio
	const [mode] = yield* stdio.args.pipe(
		Effect.flatMap(argumentsOf(Schema.Tuple([Mode]), "migrate <status|apply>"))
	)
	yield* withAdminPostgres(runMigration(MIGRATIONS[mode]))
})

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
