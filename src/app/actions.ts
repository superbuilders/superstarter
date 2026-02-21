"use server"

import { eq, not } from "drizzle-orm"
import { getSubscriptionToken } from "@inngest/realtime"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { revalidateTag } from "next/cache"
import { db } from "@/db"
import { coreTodos } from "@/db/schemas/core"
import { inngest } from "@/inngest"

async function getRealtimeToken(channel: string) {
	const token = await getSubscriptionToken(inngest, {
		channel,
		topics: ["status"]
	})
	return token
}

async function createTodo(title: string) {
	logger.info("creating todo", { title })
	const result = await errors.try(
		db.insert(coreTodos).values({ title }).returning({ id: coreTodos.id })
	)
	if (result.error) {
		logger.error("create todo failed", { error: result.error })
		throw errors.wrap(result.error, "create todo")
	}

	const todo = result.data[0]
	if (!todo) {
		logger.error("create todo returned no rows")
		throw errors.new("create todo returned no rows")
	}

	revalidateTag("todos", "max")
	return todo.id
}

async function toggleTodo(id: string) {
	logger.info("toggling todo", { id })
	const result = await errors.try(
		db
			.update(coreTodos)
			.set({ completed: not(coreTodos.completed) })
			.where(eq(coreTodos.id, id))
			.returning({ id: coreTodos.id })
	)
	if (result.error) {
		logger.error("toggle todo failed", { error: result.error })
		throw errors.wrap(result.error, "toggle todo")
	}

	revalidateTag("todos", "max")
}

async function deleteTodo(id: string) {
	logger.info("deleting todo", { id })
	const result = await errors.try(
		db.delete(coreTodos).where(eq(coreTodos.id, id)).returning({ id: coreTodos.id })
	)
	if (result.error) {
		logger.error("delete todo failed", { error: result.error })
		throw errors.wrap(result.error, "delete todo")
	}

	revalidateTag("todos", "max")
}

export { createTodo, deleteTodo, getRealtimeToken, toggleTodo }
