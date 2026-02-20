import { inngest } from "@/inngest"

const todoToggled = inngest.createFunction(
	{ id: "todo-toggled" },
	{ event: "superstarter/todo.toggled" },
	async ({ event, logger }) => {
		logger.info("todo toggled", { entityId: event.data.entityId })
		return { entityId: event.data.entityId }
	}
)

export { todoToggled }
