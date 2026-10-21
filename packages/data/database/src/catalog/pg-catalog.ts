import { type AnyColumn, type SQL, sql } from "drizzle-orm"
import { bigint, boolean, integer, pgSchema, text } from "drizzle-orm/pg-core"

const pgCatalog = pgSchema("pg_catalog")

/** The native migrator's history, which it creates and owns: one row per applied migration. Only
 * the columns read here are declared. */
export const nativeDrizzleHistory = pgSchema("drizzle").table("__drizzle_migrations", {
	id: integer("id").notNull(),
	hash: text("hash").notNull(),
	created_at: bigint("created_at", { mode: "number" }),
	name: text("name")
})

/** The session's prepared statements; the suite reads back the plan PostgreSQL inferred. */
export const pgPreparedStatements = pgCatalog.table("pg_prepared_statements", {
	name: text("name").notNull(),
	statement: text("statement").notNull(),
	parameter_types: text("parameter_types").notNull(),
	result_types: text("result_types"),
	from_sql: boolean("from_sql").notNull()
})

export const pgDatabase = pgCatalog.table("pg_database", {
	datname: text("datname").notNull()
})

export const pgNamespace = pgCatalog.table("pg_namespace", {
	oid: integer("oid").notNull(),
	nspname: text("nspname").notNull()
})

export const pgClass = pgCatalog.table("pg_class", {
	oid: integer("oid").notNull(),
	relname: text("relname").notNull(),
	relnamespace: integer("relnamespace").notNull()
})

export const pgAttribute = pgCatalog.table("pg_attribute", {
	attrelid: integer("attrelid").notNull(),
	attname: text("attname").notNull(),
	attnum: integer("attnum").notNull(),
	attnotnull: boolean("attnotnull").notNull(),
	attisdropped: boolean("attisdropped").notNull()
})

export const pgConstraint = pgCatalog.table("pg_constraint", {
	conname: text("conname").notNull(),
	connamespace: integer("connamespace").notNull(),
	conrelid: integer("conrelid").notNull(),
	contype: text("contype").notNull(),
	convalidated: boolean("convalidated").notNull()
})

/** How many elements an array column holds; NULL for a NULL array. */
export const cardinality = (column: AnyColumn): SQL<number | null> =>
	sql<number | null>`cardinality(${column})`
