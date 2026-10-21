import { sql } from "drizzle-orm"
import { pgTable, uuid } from "drizzle-orm/pg-core"

const randomish = { defaultRandom: (): string => "unrelated" }

export const things = pgTable("things", {
	id: uuid().default(sql`uuidv7()`).notNull()
})

export const value = randomish.defaultRandom()
