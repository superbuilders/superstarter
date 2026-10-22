import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { POSTGRES_DATABASE_NAME, POSTGRES_PORT } from "@superstarter/database/postgres/principals"
import { RDS_US_EAST_1_CA_PEM } from "@superstarter/database/postgres/rds-ca"
import { Effect, FileSystem, Path, Redacted } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { readAdminSecret } from "#database/admin-secret.ts"
import { databaseHost } from "#env.ts"

/**
 * Opens Drizzle Studio on RDS as the master user, to browse. Schema changes are migrations only
 * (`pnpm db:migrate`), so this is drizzle-kit's one remaining use against the database. drizzle-kit
 * dials from the URL alone, so the pinned RDS authorities reach it as a file through
 * NODE_EXTRA_CA_CERTS, and verify-full makes it refuse any other certificate. The temporary
 * directory goes away when the command ends.
 */
const main = Effect.gen(function* () {
	const host = yield* databaseHost
	const secret = yield* readAdminSecret
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const directory = yield* fs.makeTempDirectoryScoped()
	const caPath = path.join(directory, "rds-us-east-1.pem")
	yield* fs.writeFileString(caPath, RDS_US_EAST_1_CA_PEM)
	const user = encodeURIComponent(secret.username)
	const password = encodeURIComponent(Redacted.value(secret.password))
	const url = `postgresql://${user}:${password}@${host}:${POSTGRES_PORT}/${POSTGRES_DATABASE_NAME}?sslmode=verify-full`
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	process.exitCode = yield* spawner.exitCode(
		ChildProcess.make("drizzle-kit", ["studio"], {
			env: { DATABASE_URL: url, NODE_EXTRA_CA_CERTS: caPath },
			extendEnv: true,
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit"
		})
	)
}).pipe(Effect.scoped)

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
