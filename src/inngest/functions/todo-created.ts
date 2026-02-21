import type { Realtime } from "@inngest/realtime"
import type { Context } from "inngest/types"
import { revalidateTag } from "next/cache"
import { inngest } from "@/inngest"

type RealtimeOverrides = {
	publish: Realtime.PublishFn
}

const todoCreated = inngest.createFunction(
	{ id: "todo-created" },
	{ event: "superstarter/todo.created" },
	async ({
		event,
		step,
		publish
	}: Context<typeof inngest, "superstarter/todo.created", RealtimeOverrides>) => {
		await publish({
			channel: `todo:${event.data.entityId}`,
			topic: "status",
			data: { status: "acknowledged" }
		})

		await step.sleep("process", "1s")
		await publish({
			channel: `todo:${event.data.entityId}`,
			topic: "status",
			data: { status: "done" }
		})

		revalidateTag("todos", "max")
		return { todoId: event.data.entityId }
	}
)

export { todoCreated }
