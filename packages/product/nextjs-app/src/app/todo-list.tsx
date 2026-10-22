"use client"

import type { Todo } from "@superstarter/database/queries/todos"
import type { ActionFailed, ActionUnconfirmed } from "@superstarter/todo-protocol/action"
import { CreateTodo, DeleteTodo, ToggleTodo } from "@superstarter/todo-protocol/todo-contracts"
import {
	TODO_TITLE_MAX_LENGTH,
	type TodoId,
	type TodoNotFound,
	TodoTitle
} from "@superstarter/todo-protocol/todos"
import type { PostgresTransientFailure } from "@superstarter/todo-protocol/transient-failure"
import { Array as Arr, Effect, Option, Schema, String as Str } from "effect"
import { Trash2Icon } from "lucide-react"
import { use, useOptimistic, useState, useTransition } from "react"
import { v7 } from "uuid"
import { callAction } from "#lib/action-client.ts"
import { createTodo, deleteTodo, toggleTodo } from "#server/todos/todo-actions.ts"
import { Button } from "#ui/button.tsx"
import { Checkbox } from "#ui/checkbox.tsx"
import { Input } from "#ui/input.tsx"

/** A saved todo has an id the server minted; a pending one exists only until its action settles,
 * keyed by a client-side value that is never sent. Either way `key` is the row's React identity. */
type Row =
	| Readonly<{ kind: "saved"; key: TodoId; todo: Todo }>
	| Readonly<{ kind: "pending"; key: string; title: TodoTitle }>

type Change =
	| Readonly<{ kind: "create"; key: string; title: TodoTitle }>
	| Readonly<{ kind: "toggle"; id: TodoId }>
	| Readonly<{ kind: "delete"; id: TodoId }>

const callCreate = callAction(CreateTodo, createTodo)
const callToggle = callAction(ToggleTodo, toggleTodo)
const callDelete = callAction(DeleteTodo, deleteTodo)

type ChangeRefused = TodoNotFound | PostgresTransientFailure | ActionFailed | ActionUnconfirmed

/** Everything the list can tell the person about their last change, keyed by what happened: a
 * title to write first, or the tag of the refusal. A defect is not here: it rejects the transition
 * and reaches the error boundary. */
const NOTICE_TEXT = {
	"title-required": "Write a title first.",
	TodoNotFound: "That todo no longer exists. Reload to see the current list.",
	PostgresTransientFailure: "The list changed at the same moment. Try again.",
	ActionFailed: "Something went wrong. Try again.",
	ActionUnconfirmed: "The change could not be confirmed. Reload to see the current list."
} as const satisfies Readonly<Record<ChangeRefused["_tag"] | "title-required", string>>

type Notice = keyof typeof NOTICE_TEXT

/** A settled change's notice: none once it landed, which clears the last refusal, else its own. */
const noticeAfter = (
	change: Effect.Effect<unknown, ChangeRefused>
): Promise<Option.Option<Notice>> =>
	Effect.runPromise(
		change.pipe(
			Effect.match({
				onSuccess: (): Option.Option<Notice> => Option.none(),
				onFailure: (refusal) => Option.some(refusal._tag)
			})
		)
	)

const isTitle = Schema.is(TodoTitle)

const savedRowsOf = (todos: ReadonlyArray<Todo>): ReadonlyArray<Row> =>
	Arr.map(todos, (todo): Row => ({ kind: "saved", key: todo.id, todo }))

const toggledOf =
	(id: TodoId) =>
	(row: Row): Row => {
		if (row.kind === "saved" && row.key === id) {
			return { ...row, todo: { ...row.todo, completed: !row.todo.completed } }
		}
		return row
	}

const keptAfterDelete =
	(id: TodoId) =>
	(row: Row): boolean =>
		!(row.kind === "saved" && row.key === id)

const applyChange = (rows: ReadonlyArray<Row>, change: Change): ReadonlyArray<Row> => {
	switch (change.kind) {
		case "create":
			return Arr.prepend(rows, { kind: "pending", key: change.key, title: change.title })
		case "toggle":
			return Arr.map(rows, toggledOf(change.id))
		case "delete":
			return Arr.filter(rows, keptAfterDelete(change.id))
	}
}

export function TodoList({ todos }: Readonly<{ todos: Promise<ReadonlyArray<Todo>> }>) {
	const saved = use(todos)
	const [rows, applyOptimistic] = useOptimistic(savedRowsOf(saved), applyChange)
	const [draft, setDraft] = useState("")
	const [notice, setNotice] = useState(Option.none<Notice>())
	const [pending, startTransition] = useTransition()

	/** The change's notice once it settles. A state update after an action's await is a transition
	 * of its own. */
	const noticeOnSettle = (change: Effect.Effect<unknown, ChangeRefused>): Promise<void> =>
		noticeAfter(change).then((settled) => {
			startTransition(() => {
				setNotice(settled)
			})
		})

	/** Run from a plain submit handler, not a form action: clearing the draft is then a discrete
	 * update the input shows at once, so a second Enter finds it empty instead of creating the todo
	 * again. */
	const create = (): void => {
		const title = Str.trim(draft)
		if (!isTitle(title)) {
			setNotice(Option.some("title-required"))
			return
		}
		setDraft("")
		startTransition(() => {
			applyOptimistic({ kind: "create", key: v7(), title })
			return noticeOnSettle(callCreate(title))
		})
	}

	const toggle = (todo: Todo): void => {
		startTransition(() => {
			applyOptimistic({ kind: "toggle", id: todo.id })
			return noticeOnSettle(callToggle(todo.id))
		})
	}

	const remove = (todo: Todo): void => {
		startTransition(() => {
			applyOptimistic({ kind: "delete", id: todo.id })
			return noticeOnSettle(callDelete(todo.id))
		})
	}

	const isEmpty = rows.length === 0

	return (
		<div data-slot="todo-list" className="flex flex-col gap-4">
			<form
				onSubmit={(event) => {
					event.preventDefault()
					create()
				}}
				className="flex gap-2"
			>
				<Input
					name="title"
					placeholder="What needs to be done?"
					value={draft}
					maxLength={TODO_TITLE_MAX_LENGTH}
					onChange={(event) => {
						setDraft(event.target.value)
					}}
					aria-busy={pending}
				/>
				<Button type="submit">Add</Button>
			</form>
			<output className="text-sm text-destructive empty:hidden">
				{Option.match(notice, { onNone: () => "", onSome: (key) => NOTICE_TEXT[key] })}
			</output>
			<p className="text-center text-sm text-muted-foreground" hidden={!isEmpty}>
				No todos yet
			</p>
			<ul className="flex flex-col gap-1">
				{Arr.map(rows, (row) => (
					<TodoRow key={row.key} row={row} onToggle={toggle} onRemove={remove} />
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
