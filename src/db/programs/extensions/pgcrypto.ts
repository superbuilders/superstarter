import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

function pgcrypto(): SQL {
	return sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`
}

export { pgcrypto }
