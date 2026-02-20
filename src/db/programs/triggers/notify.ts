import { getTableName, sql } from "drizzle-orm"
import type { SQL, Table } from "drizzle-orm"

function notifyTrigger(table: Table): SQL[] {
	const name = getTableName(table)
	const triggerName = sql.identifier(`notify_${name}`)
	return [
		sql`DROP TRIGGER IF EXISTS ${triggerName} ON ${table}`,
		sql`CREATE TRIGGER ${triggerName} AFTER INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION notify_trigger()`,
	]
}

export { notifyTrigger }
