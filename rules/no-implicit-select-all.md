---
description:
globs: *.tsx,*.ts
alwaysApply: false
---

# No Implicit `SELECT *`

Every Drizzle `select()` and `returning()` names its columns. Calling either with no argument, which reads every column, is banned.

## Why

- **Performance:** `SELECT *` reads and ships every column, including large `text`, `jsonb` or `vector` values the code never uses.
- **Stability:** the result's shape follows the table, so adding a column changes every query that selects all.
- **Exposure:** a credential or a person's data can leak into code that had no need for it.

## Fetch only what you use

- A `select` lists only the fields the code that follows actually reads. No field is fetched "just in case".
- A `returning` almost always returns only `id`.

```ts
// BAD
scope.run((database) => database.select().from(coreTodos))
scope.run((database) => database.insert(coreTodos).values({ title }).returning())

// GOOD
scope.run((database) =>
	database
		.select({ id: coreTodos.id, title: coreTodos.title, completed: coreTodos.completed })
		.from(coreTodos)
		.orderBy(desc(coreTodos.id))
)

scope.run((database) =>
	database.insert(coreTodos).values({ title }).returning({ id: coreTodos.id })
)

scope.run((database) =>
	database
		.update(coreTodos)
		.set({ completed: not(coreTodos.completed) })
		.where(eq(coreTodos.id, id))
		.returning({ id: coreTodos.id })
)
```

The same holds inside `withPostgresTransaction` and `withPostgresReadTransaction` (`@superstarter/database/postgres/transaction`).

Superlint `no-implicit-select-all` recognises the builder by the type its method resolves to, so a scope's `database`, a `db` and a `tx` are all checked. It also refuses a relational `findMany` or `findFirst` whose config names no `columns`. Superlint `no-drizzle-write-without-where` refuses a `delete` or `update` with no `.where(…)` in the same chain.
