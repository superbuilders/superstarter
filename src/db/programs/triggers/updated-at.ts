import { getTableName, sql } from "drizzle-orm"
import type { SQL, Table } from "drizzle-orm"

function updatedAtTrigger(table: Table): SQL[] {
	const triggerName = sql.identifier(`set_${getTableName(table)}_updated_at`)
	return [
		sql`DROP TRIGGER IF EXISTS ${triggerName} ON ${table}`,
		sql`CREATE TRIGGER ${triggerName} BEFORE UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION set_updated_at()`
	]
}

export { updatedAtTrigger }
