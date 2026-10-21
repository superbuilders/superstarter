import * as pg from "drizzle-orm/pg-core"
import { pgTable, timestamp as moment, uuid } from "drizzle-orm/pg-core"

export const events = pgTable("events", {
	id: uuid(),
	createdAt: moment(), // violation
	day: pg.date(), // violation
	opensAt: pg.time() // violation
})
