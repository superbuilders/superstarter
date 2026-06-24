import type { ExtractTablesWithRelations } from "drizzle-orm"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"
import * as coreTodosSchema from "@/db/schemas/core/todos"

const dbSchema = {
	...coreTodosSchema
}

type DbSchema = typeof dbSchema
type Db = PgDatabase<PgQueryResultHKT, DbSchema, ExtractTablesWithRelations<DbSchema>>

export type { Db, DbSchema }
export { dbSchema }
