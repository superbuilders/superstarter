"use server"

import { retryPostgresTransient } from "@superstarter/database/postgres/retry"
import { CreateTodo, DeleteTodo, ToggleTodo } from "@superstarter/todo-protocol/todo-contracts"
import { Effect } from "effect"
import { revalidatePath } from "next/cache"
import { effectAction } from "#server/effect-action.ts"
import { flipTodo, insertTodo, removeTodo } from "#server/todos/todos.ts"

const revalidateList = Effect.sync(() => {
	revalidatePath("/")
})

export const createTodo = effectAction(CreateTodo, (title) =>
	insertTodo(title).pipe(retryPostgresTransient, Effect.tap(revalidateList))
)

export const toggleTodo = effectAction(ToggleTodo, (id) =>
	flipTodo(id).pipe(retryPostgresTransient, Effect.andThen(revalidateList))
)

export const deleteTodo = effectAction(DeleteTodo, (id) =>
	removeTodo(id).pipe(retryPostgresTransient, Effect.andThen(revalidateList))
)
