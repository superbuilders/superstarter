import { getTableName, sql } from "drizzle-orm"
import type { SQL, Table } from "drizzle-orm"

type EventTriggerConfig = {
	operation: "INSERT" | "UPDATE" | "DELETE"
	eventName: string
}

function emitEventTriggers(table: Table, configs: EventTriggerConfig[]): SQL[] {
	const tableName = getTableName(table)
	const statements: SQL[] = []

	for (const config of configs) {
		const opSuffix = config.operation.toLowerCase()
		const triggerName = sql.identifier(`emit_${tableName}_${opSuffix}`)
		statements.push(
			sql`DROP TRIGGER IF EXISTS ${triggerName} ON ${table}`,
			sql`CREATE TRIGGER ${triggerName} AFTER ${sql.raw(config.operation)} ON ${table} FOR EACH ROW EXECUTE FUNCTION emit_event(${sql.raw(`'${config.eventName}'`)})`
		)
	}

	return statements
}

export { emitEventTriggers }
export type { EventTriggerConfig }
