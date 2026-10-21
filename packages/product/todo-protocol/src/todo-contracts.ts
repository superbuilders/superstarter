import { Schema } from "effect"
import { TodoId, TodoNotFound, TodoTitle } from "#todos.ts"
import { PostgresTransientFailure } from "#transient-failure.ts"

/** Inserts a todo and answers its new id. */
export const CreateTodo = {
	name: "todos.create",
	payload: TodoTitle,
	success: TodoId,
	error: PostgresTransientFailure
} as const

/** Flips a todo's completion. */
export const ToggleTodo = {
	name: "todos.toggle",
	payload: TodoId,
	success: Schema.Void,
	error: Schema.Union([TodoNotFound, PostgresTransientFailure])
} as const

/** Deletes a todo. */
export const DeleteTodo = {
	name: "todos.delete",
	payload: TodoId,
	success: Schema.Void,
	error: Schema.Union([TodoNotFound, PostgresTransientFailure])
} as const
