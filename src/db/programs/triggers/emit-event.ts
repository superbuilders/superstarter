import { getTableName, sql } from "drizzle-orm"
import type { Column, SQL, Table } from "drizzle-orm"

type EventTriggerConfig = {
	operation: "INSERT" | "UPDATE" | "DELETE"
	eventName: string
	columns: Column[]
	when?: SQL
}

function emitEventTriggers(table: Table, configs: EventTriggerConfig[]): SQL[] {
	const tableName = getTableName(table)
	const statements: SQL[] = []

	for (const config of configs) {
		const opSuffix = config.operation.toLowerCase()
		const triggerName = sql.identifier(`emit_${tableName}_${opSuffix}`)

		const columnClause =
			config.columns.length > 0
				? sql.raw(
						` OF ${config.columns
							.map(function getColName(col) {
								return col.name
							})
							.join(", ")}`
					)
				: sql.raw("")

		const whenClause = config.when ? sql` WHEN (${config.when})` : sql.raw("")

		statements.push(
			sql`DROP TRIGGER IF EXISTS ${triggerName} ON ${table}`,
			sql`CREATE TRIGGER ${triggerName} AFTER ${sql.raw(config.operation)}${columnClause} ON ${table} FOR EACH ROW${whenClause} EXECUTE FUNCTION emit_event(${sql.raw(`'${config.eventName}'`)})`
		)
	}

	return statements
}

export { emitEventTriggers }
export type { EventTriggerConfig }
