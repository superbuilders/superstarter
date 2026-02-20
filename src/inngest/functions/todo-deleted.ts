import { inngest } from "@/inngest"

const todoDeleted = inngest.createFunction(
	{ id: "todo-deleted" },
	{ event: "superstarter/todo.deleted" },
	async ({ event, logger }) => {
		logger.info("todo deleted", { entityId: event.data.entityId })
		return { entityId: event.data.entityId }
	}
)

export { todoDeleted }
