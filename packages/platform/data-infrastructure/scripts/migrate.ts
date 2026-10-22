import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Effect, Schema, Stdio } from "effect"
import { withAdminPostgres } from "#database/admin-postgres.ts"
import { MigrationMode, runMigration } from "#migrations.ts"

/** Production's migrations, as the master user: `status` reports packaged against applied, and
 * `apply` runs the pending reviewed migrations through the native migrator, then the programs. */
const main = Effect.gen(function* () {
	const stdio = yield* Stdio.Stdio
	const [mode] = yield* stdio.args.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Tuple([MigrationMode])))
	)
	yield* withAdminPostgres(runMigration({ mode, identity: { kind: "rds-iam" } }))
})

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
