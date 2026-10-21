import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { boolean, pgTable, uuid } from "drizzle-orm/pg-core"

const todos = pgTable("todos", { id: uuid().notNull(), done: boolean().notNull() })

const tx = drizzle("postgres://fixture")

const registry = new Map<string, number>()

export const removeOne = tx.delete(todos).where(eq(todos.id, "x"))

export const flipOne = tx.update(todos).set({ done: true }).where(eq(todos.id, "x"))

export const forget = registry.delete("x")
