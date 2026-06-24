"use client"

import { Trash2 } from "lucide-react"
import * as React from "react"
import { createTodo, deleteTodo, toggleTodo } from "@/app/actions"
import type { Todo } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type OptimisticAction =
	| { kind: "create"; todo: Todo }
	| { kind: "toggle"; id: string }
	| { kind: "delete"; id: string }

function reduceOptimistic(state: Todo[], action: OptimisticAction): Todo[] {
	if (action.kind === "create") {
		return [action.todo, ...state]
	}
	if (action.kind === "toggle") {
		return state.map(function applyToggle(todo) {
			if (todo.id !== action.id) {
				return todo
			}
			return { ...todo, completed: !todo.completed }
		})
	}
	return state.filter(function keep(todo) {
		return todo.id !== action.id
	})
}

function Content({ todosPromise }: { todosPromise: Promise<Todo[]> }) {
	const todos = React.use(todosPromise)
	const [optimisticTodos, applyOptimistic] = React.useOptimistic(todos, reduceOptimistic)
	const [title, setTitle] = React.useState("")
	const [isPending, startTransition] = React.useTransition()

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
			applyOptimistic({
				kind: "create",
				todo: {
					id: crypto.randomUUID(),
					title: trimmed,
					completed: false
				}
			})
			await createTodo(trimmed)
		})
	}

	function handleToggle(id: string) {
		startTransition(async () => {
			applyOptimistic({ kind: "toggle", id })
			await toggleTodo(id)
		})
	}

	function handleDelete(id: string) {
		startTransition(async () => {
			applyOptimistic({ kind: "delete", id })
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
					{optimisticTodos.length === 0 && (
						<p className="text-center text-muted-foreground text-sm">No todos yet</p>
					)}
					<ul className="flex flex-col gap-1">
						{optimisticTodos.map(function renderTodo(todo) {
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
