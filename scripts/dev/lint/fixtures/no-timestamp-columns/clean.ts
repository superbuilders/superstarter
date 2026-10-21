import { bigint, pgTable, uuid } from "drizzle-orm/pg-core"

const date = (): string => "not a column"

export const events = pgTable("events", {
	id: uuid(),
	expiresAtUnixMs: bigint({ mode: "number" })
})

export const label = date()
