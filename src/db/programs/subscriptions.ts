import { eq } from "drizzle-orm"
import { db } from "@/db"
import { coreTodos } from "@/db/schemas/core"
import { createSubscription } from "@/subscriptions"

const todosSubscription = createSubscription({
	appId: "superstarter",
	channelName: "todos",
	table: coreTodos,
	triggers: [
		{ operation: "INSERT", label: "created" },
		{ operation: "UPDATE", label: "updated", columns: [coreTodos.completed] },
		{ operation: "DELETE", label: "deleted" }
	],
	query: function queryTodo(id) {
		return db
			.select({
				id: coreTodos.id,
				title: coreTodos.title,
				completed: coreTodos.completed,
				createdAt: coreTodos.createdAt
			})
			.from(coreTodos)
			.where(eq(coreTodos.id, id))
			.limit(1)
	}
})

export { todosSubscription }
