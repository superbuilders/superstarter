import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/env"
import * as schema from "./schemas"

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
// biome-ignore lint: Per user instruction, this file is not to be modified. The assertion is used for connection caching in development.
const globalForDb = globalThis as unknown as {
	conn: postgres.Sql | undefined
}

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL)
if (env.NODE_ENV !== "production") globalForDb.conn = conn

export const db = drizzle(conn, { schema })
