import { inngest } from "@/inngest"

const todoCompleted = inngest.createFunction(
	{ id: "todo-completed" },
	{ event: "superstarter/todo.completed" },
	async ({ event, logger }) => {
		logger.info("todo completed", { entityId: event.data.entityId })
		return { entityId: event.data.entityId }
	}
)

export { todoCompleted }
