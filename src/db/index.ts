import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { attachDatabasePool } from "@vercel/functions"
import * as core from "@/db/schemas/core"
import { env } from "@/env"

const schema = { ...core }
const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: 50
})
attachDatabasePool(pool)

const db = drizzle({ client: pool, schema })

export { db }
