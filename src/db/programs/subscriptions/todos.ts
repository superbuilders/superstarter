import { eq } from "drizzle-orm"
import { db } from "@/db"
import { todosEventSource } from "@/db/programs/events/todos"
import { coreTodos } from "@/db/schemas/core"
import { createRealtimeSubscription } from "@/subscriptions"

const todosSubscription = createRealtimeSubscription({
	source: todosEventSource,
	channelName: "todos",
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
