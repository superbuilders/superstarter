import type { Realtime } from "@inngest/realtime"
import type { Logger } from "inngest"
import type { Context } from "inngest/types"

import { inngest } from "@/inngest"

type RealtimeOverrides = {
	publish: Realtime.PublishFn
	logger: Logger
}

const todoCreated = inngest.createFunction(
	{ id: "todo-created" },
	{ event: "superstarter/todo.created" },
	async ({
		event,
		logger,
		publish
	}: Context<typeof inngest, "superstarter/todo.created", RealtimeOverrides>) => {
		logger.info("todo created", { entityId: event.data.entityId })
		await publish({
			channel: "todos",
			topic: "refresh",
			data: { event: "created", entityId: event.data.entityId }
		})
		return { todoId: event.data.entityId }
	}
)

export { todoCreated }
