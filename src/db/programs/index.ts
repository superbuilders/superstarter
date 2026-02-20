import type { SQL } from "drizzle-orm"
import { pgcrypto } from "@/db/programs/extensions/pgcrypto"
import { notifyTriggerFunction } from "@/db/programs/functions/notify-trigger"
import { updatedAtFunction } from "@/db/programs/functions/updated-at"
import { notifyTrigger } from "@/db/programs/triggers/notify"
import { updatedAtTrigger } from "@/db/programs/triggers/updated-at"
import { corePosts } from "@/db/schemas/core"

const programs: SQL[] = [
	// extensions
	pgcrypto,

	// functions
	updatedAtFunction,
	notifyTriggerFunction,

	// triggers
	...updatedAtTrigger(corePosts),
	...notifyTrigger(corePosts),
]

export { programs }
