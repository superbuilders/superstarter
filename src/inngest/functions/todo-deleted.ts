import { revalidateTag } from "next/cache"
import { inngest } from "@/inngest"

const todoDeleted = inngest.createFunction(
	{ id: "todo-deleted" },
	{ event: "superstarter/todo.deleted" },
	async ({ event, logger }) => {
		logger.info("todo deleted", { entityId: event.data.entityId })
		revalidateTag("todos", "max")
		return { entityId: event.data.entityId }
	}
)

export { todoDeleted }
