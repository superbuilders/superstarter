import type { Realtime } from "@inngest/realtime"
import type { Logger } from "inngest"
import type { Context } from "inngest/types"

import { inngest } from "@/inngest"

type RealtimeOverrides = {
	publish: Realtime.PublishFn
	logger: Logger
}

const todoToggled = inngest.createFunction(
	{ id: "todo-toggled" },
	{ event: "superstarter/todo.toggled" },
	async ({
		event,
		logger,
		publish
	}: Context<typeof inngest, "superstarter/todo.toggled", RealtimeOverrides>) => {
		logger.info("todo toggled", { entityId: event.data.entityId })
		await publish({
			channel: "todos",
			topic: "refresh",
			data: { event: "toggled", entityId: event.data.entityId }
		})
		return { entityId: event.data.entityId }
	}
)

export { todoToggled }
