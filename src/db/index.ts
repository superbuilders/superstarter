import { drizzle } from "drizzle-orm/bun-sql"
import * as core from "@/db/schemas/core"
import { env } from "@/env"

const schema = { ...core }
const db = drizzle(env.DATABASE_URL, { schema })

export { db }
