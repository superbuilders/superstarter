import * as errors from "@superbuilders/errors"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { fetchAdminSecret } from "@/db/admin-secret"
import { DATABASE_NAME } from "@/db/constants"
import { RDS_CA_BUNDLE } from "@/db/rds-ca-bundle"
import { type Db, dbSchema } from "@/db/schema"
import { env } from "@/env"
import { logger } from "@/logger"

interface AdminDb extends AsyncDisposable {
	readonly db: Db
}

async function createAdminDb(): Promise<AdminDb> {
	await using stack = new AsyncDisposableStack()

	const secret = await fetchAdminSecret()

	const pool = new Pool({
		host: env.DATABASE_HOST,
		port: 5432,
		user: secret.username,
		password: secret.password,
		database: DATABASE_NAME,
		ssl: { ca: RDS_CA_BUNDLE, rejectUnauthorized: true },
		max: 10
	})
	stack.defer(async function disposePool() {
		const result = await errors.try(pool.end())
		if (result.error) {
			logger.warn({ error: result.error }, "admin pool end failed")
		}
	})

	const db = drizzle({ client: pool, schema: dbSchema })

	const owned = stack.move()
	return {
		db,
		[Symbol.asyncDispose]: async function disposeAdminDb() {
			await owned.disposeAsync()
		}
	}
}

export type { AdminDb }
export { createAdminDb }
