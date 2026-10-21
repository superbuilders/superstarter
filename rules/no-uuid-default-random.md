# No `uuid().defaultRandom()`

`.defaultRandom()` on a Drizzle `uuid()` column mints a UUIDv4: random, not time-sortable. It is banned with no exceptions. Superlint `no-uuid-default-random` (`scripts/dev/lint/rules/no-uuid-default-random.ts`) enforces it.

## Why

A UUIDv4 is 122 random bits. Two of them have no order, a B-tree of them cannot be scanned in creation order, and none of them records when it was made.

A UUIDv7 puts a unix-millisecond timestamp in its first 48 bits:

- `ORDER BY id DESC` is newest first, with no `created_at` index.
- `id >= uuidv7LowerBound(cutoff)` is a primary-key range scan.
- `timestampFromUuidv7(row.id)` recovers the creation time, so no timestamp column exists ([no-timestamp-columns.md](no-timestamp-columns.md)).

## Banned

```ts
// BAD
id: uuid().defaultRandom().notNull()
```

## Instead

PostgreSQL mints the id with its built-in `uuidv7()`; RDS runs PostgreSQL 18.3, where it needs no extension. A CHECK pins the version, so no other kind of id can be inserted:

```ts
export const coreTodos = core.table(
	"todos",
	{
		id: uuid().$type<TodoId>().default(sql`uuidv7()`).notNull()
		// …
	},
	(table) => [
		primaryKey({ name: "todos_pk", columns: [table.id] }),
		check("todos_id_v7_ck", sql`uuid_extract_version(${table.id}) = 7`)
	]
)
```

The application never sends a primary key. `insertTodo` reads the minted id back with `.returning({ id: coreTodos.id })`.

The helpers that read time from an id live in `@superstarter/database/lib/uuid-time`.
