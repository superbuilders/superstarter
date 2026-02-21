import type { SQL } from "drizzle-orm"
import { pgcrypto } from "@/db/programs/extensions/pgcrypto"
import { emitEventFunction } from "@/db/programs/functions/emit-event"
import { updatedAtFunction } from "@/db/programs/functions/updated-at"
import { emitEventTriggers } from "@/db/programs/triggers/emit-event"
import { updatedAtTrigger } from "@/db/programs/triggers/updated-at"
import { coreSchema, coreTodos } from "@/db/schemas/core"

const programs: SQL[] = [
	pgcrypto,
	updatedAtFunction(coreSchema),
	emitEventFunction(coreSchema),
	...updatedAtTrigger(coreSchema, coreTodos),
	...emitEventTriggers(coreSchema, coreTodos, [
		{ operation: "INSERT", eventName: "superstarter/todo.created", columns: [] },
		{
			operation: "UPDATE",
			eventName: "superstarter/todo.toggled",
			columns: [coreTodos.completed]
		},
		{ operation: "DELETE", eventName: "superstarter/todo.deleted", columns: [] }
	])
]

export { programs }
