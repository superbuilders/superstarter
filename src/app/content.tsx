"use client"

import { useInngestSubscription } from "@inngest/realtime/hooks"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { createTodo, deleteTodo, getTodosRealtimeToken, toggleTodo } from "@/app/actions"
import type { Todo } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function Content({ todosPromise }: { todosPromise: Promise<Todo[]> }) {
	const todos = React.use(todosPromise)
	const router = useRouter()
	const [title, setTitle] = React.useState("")
	const [isPending, startTransition] = React.useTransition()

	const { latestData } = useInngestSubscription({
		enabled: true,
		refreshToken: getTodosRealtimeToken
	})

	React.useEffect(
		function refreshOnRealtimeMessage() {
			if (latestData) {
				router.refresh()
			}
		},
		[latestData, router]
	)

	function handleCreate(formData: FormData) {
		const value = formData.get("title")
		if (typeof value !== "string") {
			return
		}
		const trimmed = value.trim()
		if (trimmed.length === 0) {
			return
		}
		setTitle("")
		startTransition(async () => {
			await createTodo(trimmed)
		})
	}

	function handleToggle(id: string) {
		startTransition(async () => {
			await toggleTodo(id)
		})
	}

	function handleDelete(id: string) {
		startTransition(async () => {
			await deleteTodo(id)
		})
	}

	return (
		<div className="mx-auto max-w-lg p-8">
			<Card>
				<CardHeader>
					<CardTitle>Todos</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<form action={handleCreate} className="flex gap-2">
						<Input
							name="title"
							placeholder="What needs to be done?"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							disabled={isPending}
						/>
						<Button type="submit" disabled={isPending}>
							Add
						</Button>
					</form>
					{todos.length === 0 && (
						<p className="text-center text-muted-foreground text-sm">No todos yet</p>
					)}
					<ul className="flex flex-col gap-1">
						{todos.map(function renderTodo(todo) {
							const textClass = todo.completed ? "line-through text-muted-foreground" : ""
							return (
								<li key={todo.id} className="flex items-center gap-2 rounded-md px-2 py-1">
									<input
										type="checkbox"
										checked={todo.completed}
										onChange={() => handleToggle(todo.id)}
										className="size-4 accent-primary"
									/>
									<span className={`flex-1 text-sm ${textClass}`}>{todo.title}</span>
									<Button variant="ghost" size="icon-sm" onClick={() => handleDelete(todo.id)}>
										<Trash2 className="size-3.5" />
									</Button>
								</li>
							)
						})}
					</ul>
				</CardContent>
			</Card>
		</div>
	)
}

export { Content }
