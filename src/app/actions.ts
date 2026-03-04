"use server"

import { eq, not } from "drizzle-orm"
import * as errors from "@superbuilders/errors"
import { db } from "@/db"
import { coreTodos } from "@/db/schemas/core"
import { todosSubscription } from "@/db/programs/subscriptions/todos"
import { inngest } from "@/inngest"
import { logger } from "@/logger"

async function getRealtimeToken() {
	return todosSubscription.getToken(inngest)
}

async function createTodo(title: string) {
	logger.info({ title }, "creating todo")
	const result = await errors.try(
		db.insert(coreTodos).values({ title }).returning({ id: coreTodos.id })
	)
	if (result.error) {
		logger.error({ error: result.error }, "create todo failed")
		throw errors.wrap(result.error, "create todo")
	}

	const todo = result.data[0]
	if (!todo) {
		logger.error("create todo returned no rows")
		throw errors.new("create todo returned no rows")
	}

	return todo.id
}

async function toggleTodo(id: string) {
	logger.info({ id }, "toggling todo")
	const result = await errors.try(
		db
			.update(coreTodos)
			.set({ completed: not(coreTodos.completed) })
			.where(eq(coreTodos.id, id))
			.returning({ id: coreTodos.id })
	)
	if (result.error) {
		logger.error({ error: result.error }, "toggle todo failed")
		throw errors.wrap(result.error, "toggle todo")
	}
}

async function deleteTodo(id: string) {
	logger.info({ id }, "deleting todo")
	const result = await errors.try(
		db.delete(coreTodos).where(eq(coreTodos.id, id)).returning({ id: coreTodos.id })
	)
	if (result.error) {
		logger.error({ error: result.error }, "delete todo failed")
		throw errors.wrap(result.error, "delete todo")
	}
}

export { createTodo, deleteTodo, getRealtimeToken, toggleTodo }
