import { getTableName, sql } from "drizzle-orm"
import type { Column, SQL, Table } from "drizzle-orm"
import type { PgSchema } from "drizzle-orm/pg-core"

type EventTriggerConfig = {
	operation: "INSERT" | "UPDATE" | "DELETE"
	appId: string
	label: string
	columns?: Column[]
	when?: SQL
}

function emitEventTriggers(schema: PgSchema, table: Table, configs: EventTriggerConfig[]): SQL[] {
	const tableName = getTableName(table)
	const statements: SQL[] = []

	for (const config of configs) {
		const triggerName = sql.identifier(`emit_${tableName}_${config.label}`)
		const columnClause = config.columns
			? sql` OF ${sql.join(
					config.columns.map(function toIdentifier(col) {
						return sql.identifier(col.name)
					}),
					sql.raw(", ")
				)}`
			: sql.raw("")

		const whenClause = config.when ? sql` WHEN (${config.when})` : sql.raw("")

		statements.push(
			sql`DROP TRIGGER IF EXISTS ${triggerName} ON ${table}`,
			sql`CREATE TRIGGER ${triggerName} AFTER ${sql.raw(config.operation)}${columnClause} ON ${table} FOR EACH ROW${whenClause} EXECUTE FUNCTION ${schema}.emit_event(${sql.raw(`'${config.appId}'`)}, ${sql.raw(`'${config.label}'`)})`
		)
	}

	return statements
}

export { emitEventTriggers }
export type { EventTriggerConfig }
