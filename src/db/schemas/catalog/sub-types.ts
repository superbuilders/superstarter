import { bigint, pgEnum, pgTable, varchar } from "drizzle-orm/pg-core"

const subTypeSection = pgEnum("sub_type_section", ["verbal", "numerical"])

const subTypes = pgTable("sub_types", {
	id: varchar("id", { length: 64 }).primaryKey(),
	name: varchar("name", { length: 128 }).notNull(),
	section: subTypeSection("section").notNull(),
	latencyThresholdMs: bigint("latency_threshold_ms", { mode: "number" }).notNull()
})

export { subTypeSection, subTypes }
