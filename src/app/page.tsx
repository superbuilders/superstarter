import * as React from "react"
import { desc } from "drizzle-orm"
import { db } from "@/db"
import { coreTodos } from "@/db/schemas/core/todos"
import { Content } from "@/app/content"

const getTodos = db
	.select({
		id: coreTodos.id,
		title: coreTodos.title,
		completed: coreTodos.completed
	})
	.from(coreTodos)
	.orderBy(desc(coreTodos.id))
	.prepare("app_page_get_todos")

type Todo = Awaited<ReturnType<typeof getTodos.execute>>[number]

function Page() {
	const todosPromise = getTodos.execute()
	return (
		<React.Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
			<Content todosPromise={todosPromise} />
		</React.Suspense>
	)
}

export type { Todo }
export default Page
