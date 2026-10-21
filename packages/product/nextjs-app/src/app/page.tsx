import { connection } from "next/server"
import { Suspense } from "react"
import { TodoList } from "#app/todo-list.tsx"
import { runRenderRead } from "#server/runtime.ts"
import { readTodos } from "#server/todos/todos.ts"
import { Card, CardContent, CardHeader, CardTitle } from "#ui/card.tsx"

/** `connection()` holds the read until a request arrives, so a build never opens a database
 * session and the page shell prerenders around the list's fallback. */
const todosOfRequest = () => connection().then(() => runRenderRead(readTodos))

export default function TodosPage() {
	return (
		<main data-slot="todos-page" className="mx-auto max-w-lg p-8">
			<Card>
				<CardHeader>
					<CardTitle>Todos</CardTitle>
				</CardHeader>
				<CardContent>
					<Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
						<TodoList todos={todosOfRequest()} />
					</Suspense>
				</CardContent>
			</Card>
		</main>
	)
}
