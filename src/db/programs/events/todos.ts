import { coreTodos } from "@/db/schemas/core"
import { createEventSource } from "@/event-source"

const todosEventSource = createEventSource({
	appId: "superstarter",
	table: coreTodos,
	triggers: [
		{ operation: "INSERT", label: "created" },
		{ operation: "UPDATE", label: "updated", columns: [coreTodos.completed] },
		{ operation: "DELETE", label: "deleted" }
	]
})

export { todosEventSource }
