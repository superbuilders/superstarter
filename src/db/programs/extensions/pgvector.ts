import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

function pgvector(): SQL {
	return sql`CREATE EXTENSION IF NOT EXISTS vector`
}

export { pgvector }
