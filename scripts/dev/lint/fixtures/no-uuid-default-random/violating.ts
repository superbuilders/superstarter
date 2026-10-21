import * as pg from "drizzle-orm/pg-core"
import { pgTable, uuid as id } from "drizzle-orm/pg-core"

export const things = pgTable("things", {
	id: id().defaultRandom(), // violation
	other: pg.uuid().notNull().defaultRandom() // violation
})
