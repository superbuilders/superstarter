import type { Realtime } from "@inngest/realtime"
import type { Logger } from "inngest"
import type { Context } from "inngest/types"

import { inngest } from "@/inngest"

type RealtimeOverrides = {
	publish: Realtime.PublishFn
	logger: Logger
}

const todoDeleted = inngest.createFunction(
	{ id: "todo-deleted" },
	{ event: "superstarter/todo.deleted" },
	async ({
		event,
		logger,
		publish
	}: Context<typeof inngest, "superstarter/todo.deleted", RealtimeOverrides>) => {
		logger.info("todo deleted", { entityId: event.data.entityId })
		await publish({
			channel: "todos",
			topic: "refresh",
			data: { event: "deleted", entityId: event.data.entityId }
		})
		return { entityId: event.data.entityId }
	}
)

export { todoDeleted }
