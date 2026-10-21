import { NodeRuntime } from "@effect/platform-node"
import { Array as Arr, Effect, Schema } from "effect"
import { withAdminPostgres } from "#database/admin-postgres.ts"
import { MigrationMode, runMigration } from "#migrations.ts"

/** Production's migrations, as the master user: `status` reports packaged against applied, and
 * `apply` runs the pending reviewed migrations through the native migrator, then the programs. */
const main = Effect.gen(function* () {
	const [mode] = yield* Schema.decodeUnknownEffect(Schema.Tuple([MigrationMode]))(
		Arr.drop(process.argv, 2)
	)
	yield* withAdminPostgres(runMigration({ mode, identity: { kind: "rds-iam" } }))
})

NodeRuntime.runMain(main)
