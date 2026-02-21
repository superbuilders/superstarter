import type { SQL } from "drizzle-orm"
import { pgcrypto } from "@/db/programs/extensions/pgcrypto"
import { emitEventFunction } from "@/db/programs/functions/emit-event"
import { updatedAtFunction } from "@/db/programs/functions/updated-at"
import { emitEventTriggers } from "@/db/programs/triggers/emit-event"
import { updatedAtTrigger } from "@/db/programs/triggers/updated-at"
import { coreTodos } from "@/db/schemas/core"

const programs: SQL[] = [
	pgcrypto,
	updatedAtFunction,
	emitEventFunction,
	...updatedAtTrigger(coreTodos),
	...emitEventTriggers(coreTodos, [
		{ operation: "INSERT", eventName: "superstarter/todo.created", columns: [] },
		{
			operation: "UPDATE",
			eventName: "superstarter/todo.completed",
			columns: [coreTodos.completed]
		},
		{ operation: "DELETE", eventName: "superstarter/todo.deleted", columns: [] }
	])
]

export { programs }
