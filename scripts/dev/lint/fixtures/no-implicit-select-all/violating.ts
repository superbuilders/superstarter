import { drizzle } from "drizzle-orm/node-postgres"
import { pgTable, text, uuid } from "drizzle-orm/pg-core"

const todos = pgTable("todos", { id: uuid().notNull(), title: text().notNull() })

const database = drizzle("postgres://fixture")

export const all = database.select().from(todos) // violation

export const inserted = database.insert(todos).values({ id: "x", title: "y" }).returning() // violation
