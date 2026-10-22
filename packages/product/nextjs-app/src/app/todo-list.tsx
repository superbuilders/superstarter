"use client"

import {
	type ActionFailed,
	type ActionUnconfirmed,
	callAction
} from "@superstarter/todo-protocol/action"
import { CreateTodo, DeleteTodo, ToggleTodo } from "@superstarter/todo-protocol/todo-contracts"
import { type TodoNotFound, TodoTitle } from "@superstarter/todo-protocol/todos"
import type { PostgresTransientFailure } from "@superstarter/todo-protocol/transient-failure"
import { Array as Arr, Effect, Schema, String as Str } from "effect"
import { Trash2Icon } from "lucide-react"
import { use, useOptimistic, useState, useTransition } from "react"
import { v7 } from "uuid"
import { createTodo, deleteTodo, toggleTodo } from "#server/todos/todo-actions.ts"
import type { Todo } from "#server/todos/todos.ts"
import { Button } from "#ui/button.tsx"
import { Checkbox } from "#ui/checkbox.tsx"
import { Input } from "#ui/input.tsx"

/** A saved todo has an id the server minted; a pending one exists only until its action settles,
 * keyed by a client-side value that is never sent. */
type Row =
	| Readonly<{ kind: "saved"; todo: Todo }>
	| Readonly<{ kind: "pending"; key: string; title: TodoTitle }>

type Change =
	| Readonly<{ kind: "create"; key: string; title: TodoTitle }>
	| Readonly<{ kind: "toggle"; todo: Todo }>
	| Readonly<{ kind: "delete"; todo: Todo }>

const callCreate = callAction(CreateTodo, createTodo)
const callToggle = callAction(ToggleTodo, toggleTodo)
const callDelete = callAction(DeleteTodo, deleteTodo)

type ChangeRefused = TodoNotFound | PostgresTransientFailure | ActionFailed | ActionUnconfirmed

/** What the list tells the person about their last change: nothing, a title to write first, or
 * why the change was refused. */
type Notice =
	| Readonly<{ kind: "none" }>
	| Readonly<{ kind: "title-required" }>
	| Readonly<{ kind: "refused"; refusal: ChangeRefused["_tag"] }>

const NO_NOTICE: Notice = { kind: "none" }

/** Every way a change can be refused, said to the person; the refusal's tag is all the message
 * depends on. A defect is not here: it rejects the transition and reaches the error boundary. */
const refusalText = (refusal: ChangeRefused["_tag"]): string => {
	switch (refusal) {
		case "TodoNotFound":
			return "That todo no longer exists. Reload to see the current list."
		case "PostgresTransientFailure":
			return "The list changed at the same moment. Try again."
		case "ActionFailed":
			return "Something went wrong. Try again."
		case "ActionUnconfirmed":
			return "The change could not be confirmed. Reload to see the current list."
	}
}

const noticeText = (notice: Notice): string | undefined => {
	switch (notice.kind) {
		case "none":
			return undefined
		case "title-required":
			return "Write a title first."
		case "refused":
			return refusalText(notice.refusal)
	}
}

/** A settled change's notice: none once it landed, which clears the last refusal, else its own. */
const noticeAfter = (change: Effect.Effect<unknown, ChangeRefused>): Promise<Notice> =>
	Effect.runPromise(
		change.pipe(
			Effect.match({
				onSuccess: (): Notice => NO_NOTICE,
				onFailure: (refusal): Notice => ({ kind: "refused", refusal: refusal._tag })
			})
		)
	)

const isTitle = Schema.is(TodoTitle)

const savedRowsOf = (todos: ReadonlyArray<Todo>): ReadonlyArray<Row> =>
	Arr.map(todos, (todo): Row => ({ kind: "saved", todo }))

const toggledOf =
	(target: Todo) =>
	(row: Row): Row => {
		if (row.kind === "saved" && row.todo.id === target.id) {
			return { kind: "saved", todo: { ...row.todo, completed: !row.todo.completed } }
		}
		return row
	}

const keptAfterDelete =
	(target: Todo) =>
	(row: Row): boolean =>
		!(row.kind === "saved" && row.todo.id === target.id)

const applyChange = (rows: ReadonlyArray<Row>, change: Change): ReadonlyArray<Row> => {
	switch (change.kind) {
		case "create":
			return Arr.prepend(rows, { kind: "pending", key: change.key, title: change.title })
		case "toggle":
			return Arr.map(rows, toggledOf(change.todo))
		case "delete":
			return Arr.filter(rows, keptAfterDelete(change.todo))
	}
}

const rowKeyOf = (row: Row): string => {
	if (row.kind === "saved") {
		return row.todo.id
	}
	return row.key
}

export function TodoList({ todos }: Readonly<{ todos: Promise<ReadonlyArray<Todo>> }>) {
	const saved = use(todos)
	const [rows, applyOptimistic] = useOptimistic(savedRowsOf(saved), applyChange)
	const [draft, setDraft] = useState("")
	const [notice, setNotice] = useState(NO_NOTICE)
	const [pending, startTransition] = useTransition()

	/** A state update after an action's await is a transition of its own. */
	const settle = (settled: Notice): void => {
		startTransition(() => {
			setNotice(settled)
		})
	}

	const create = (): void => {
		const title = Str.trim(draft)
		if (!isTitle(title)) {
			setNotice({ kind: "title-required" })
			return
		}
		setDraft("")
		startTransition(() => {
			applyOptimistic({ kind: "create", key: v7(), title })
			return noticeAfter(callCreate(title)).then(settle)
		})
	}

	const toggle = (todo: Todo): void => {
		startTransition(() => {
			applyOptimistic({ kind: "toggle", todo })
			return noticeAfter(callToggle(todo.id)).then(settle)
		})
	}

	const remove = (todo: Todo): void => {
		startTransition(() => {
			applyOptimistic({ kind: "delete", todo })
			return noticeAfter(callDelete(todo.id)).then(settle)
		})
	}

	const isEmpty = rows.length === 0

	return (
		<div data-slot="todo-list" className="flex flex-col gap-4">
			<form action={create} className="flex gap-2">
				<Input
					name="title"
					placeholder="What needs to be done?"
					value={draft}
					onChange={(event) => {
						setDraft(event.target.value)
					}}
					aria-busy={pending}
				/>
				<Button type="submit">Add</Button>
			</form>
			<output className="text-sm text-destructive empty:hidden">{noticeText(notice)}</output>
			<p className="text-center text-sm text-muted-foreground" hidden={!isEmpty}>
				No todos yet
			</p>
			<ul className="flex flex-col gap-1">
				{Arr.map(rows, (row) => (
					<TodoRow key={rowKeyOf(row)} row={row} onToggle={toggle} onRemove={remove} />
				))}
			</ul>
		</div>
	)
}

type TodoRowProps = Readonly<{
	row: Row
	onToggle: (todo: Todo) => void
	onRemove: (todo: Todo) => void
}>

function TodoRow({ row, onToggle, onRemove }: TodoRowProps) {
	if (row.kind === "pending") {
		return (
			<li data-slot="todo-row" className="flex items-center gap-2 px-2 py-1 opacity-60">
				<Checkbox checked={false} disabled />
				<span className="flex-1 text-sm">{row.title}</span>
			</li>
		)
	}
	const { todo } = row
	const titleClass = todo.completed
		? "flex-1 text-muted-foreground text-sm line-through"
		: "flex-1 text-sm"
	return (
		<li data-slot="todo-row" className="flex items-center gap-2 px-2 py-1">
			<Checkbox
				checked={todo.completed}
				onCheckedChange={() => {
					onToggle(todo)
				}}
				aria-label={`Mark ${todo.title} done`}
			/>
			<span className={titleClass}>{todo.title}</span>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => {
					onRemove(todo)
				}}
				aria-label={`Delete ${todo.title}`}
			>
				<Trash2Icon />
			</Button>
		</li>
	)
}
