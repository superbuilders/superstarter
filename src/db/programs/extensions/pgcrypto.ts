import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import type { PgSchema } from "drizzle-orm/pg-core"

function pgcrypto(schema: PgSchema): SQL {
	return sql`CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA ${schema}`
}

export { pgcrypto }
