import { drizzle } from "drizzle-orm/node-postgres"
import { boolean, pgTable, uuid } from "drizzle-orm/pg-core"

const todos = pgTable("todos", { id: uuid().notNull(), done: boolean().notNull() })

const tx = drizzle("postgres://fixture")

export const wipe = tx.delete(todos) // violation

export const flip = tx.update(todos).set({ done: true }) // violation
