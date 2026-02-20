import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const pgcrypto: SQL = sql.raw("CREATE EXTENSION IF NOT EXISTS pgcrypto")

export { pgcrypto }
