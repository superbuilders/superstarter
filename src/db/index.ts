import { drizzle } from "drizzle-orm/bun-sql"
import * as agent from "@/db/schemas/agent"
import { env } from "@/env"

const schema = { ...agent }
const db = drizzle(env.DATABASE_URL, { schema })

export { db }
