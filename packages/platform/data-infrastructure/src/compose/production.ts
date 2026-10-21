import { AWSEnvironment } from "alchemy/AWS"
import * as Output from "alchemy/Output"
import { Effect } from "effect"
import { VERCEL_PROJECT } from "#env.ts"
import { postgresInstance, postgresNetwork } from "#modules/postgres.ts"
import { runtimeIdentity } from "#modules/runtime-identity.ts"
import { namesOf } from "#names.ts"

/**
 * Production: the database network, the PostgreSQL instance and the role Vercel deployments
 * assume. The output is exactly the three variables the Vercel project's environment needs.
 */
export const production = Effect.gen(function* () {
	const names = namesOf("production")
	const { accountId: account } = yield* AWSEnvironment.current
	const vercel = yield* VERCEL_PROJECT
	const network = yield* postgresNetwork(names)
	const postgres = yield* postgresInstance({ names, account, network })
	const runtime = yield* runtimeIdentity({
		names,
		account,
		vercel,
		statements: postgres.runtimeStatements
	})
	return {
		vercel: Output.all(runtime.roleArn, postgres.host, postgres.adminSecretArn).pipe(
			Output.map(([role, host, adminSecret]) => ({
				AWS_ROLE_ARN: role,
				DATABASE_HOST: host,
				DATABASE_ADMIN_SECRET_ARN: adminSecret
			}))
		)
	}
})
