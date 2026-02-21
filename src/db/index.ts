import { drizzle } from "drizzle-orm/bun-sql"
import * as core from "@/db/schemas/core"
import { env } from "@/env"

const schema = { ...core }
const db = drizzle({
	connection: { url: env.DATABASE_URL, max: 3 },
	schema
})

export { db }
