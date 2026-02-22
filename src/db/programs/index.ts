import type { SQL } from "drizzle-orm"
import { pgcrypto } from "@/db/programs/extensions/pgcrypto"
import { emitEventFunction } from "@/db/programs/functions/emit-event"
import { todosSubscription } from "@/db/programs/subscriptions"
import { emitEventTriggers } from "@/db/programs/triggers/emit-event"
import { coreEventOutbox, coreSchema, coreTodos } from "@/db/schemas/core"

const programs: SQL[] = [
	pgcrypto(coreSchema),
	emitEventFunction(coreSchema, coreEventOutbox),
	...emitEventTriggers(coreSchema, coreTodos, todosSubscription.triggerConfigs)
]

export { programs }
