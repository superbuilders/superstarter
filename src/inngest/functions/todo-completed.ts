import { revalidateTag } from "next/cache"
import { inngest } from "@/inngest"

const todoCompleted = inngest.createFunction(
	{ id: "todo-completed" },
	{ event: "superstarter/todo.completed" },
	async ({ event, logger }) => {
		logger.info("todo completed", { entityId: event.data.entityId })
		revalidateTag("todos", "max")
		return { entityId: event.data.entityId }
	}
)

export { todoCompleted }
