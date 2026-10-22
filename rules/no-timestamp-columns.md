# No Timestamp Columns

Drizzle's `timestamp`, `date`, `time` and `interval` column factories are banned from every schema file, with no exceptions and no allowlist. Superlint `no-timestamp-columns` (`scripts/dev/lint/rules/no-timestamp-columns.ts`) enforces it.

## Why

Every primary key is a UUIDv7 minted by PostgreSQL's `uuidv7()`. Its first 48 bits are a big-endian unix-millisecond timestamp, so a row's creation time is already in its key. A `createdAt` column stores that fact a second time and indexes it a second time.

- **Time order:** `ORDER BY id DESC` walks the primary-key index newest first.
- **Time ranges:** `id >= uuidv7LowerBound(cutoff)` is a range scan of the primary-key index.
- **The time itself:** `timestampFromUuidv7(row.id)` decodes the prefix.

## Banned

```ts
// BAD: every one of these
createdAt: timestamp({ withTimezone: true }).defaultNow()
updatedAt: timestamp().$onUpdate(() => new Date())
birthday: date()
opensAt: time()
duration: interval()
```

## Instead

```ts
// The primary key: minted by PostgreSQL, checked to be version 7
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

The helpers live in `@superstarter/database/lib/uuid-time`:

- `timestampFromUuidv7(id: Uuidv7): DateTime.Utc` gives the creation instant. Every table's id brands `Uuidv7` (`TodoId` does), so any row id passes.
- `uuidv7LowerBound(instant: DateTime.Utc): string` gives the smallest UUIDv7 minted at or after `instant`.

```ts
import { sql } from "drizzle-orm"
import { uuidv7LowerBound } from "@superstarter/database/lib/uuid-time"

// Todos created since `cutoff`, served by the primary-key index
const recentTodos = (scope: PostgresQueryScope, cutoff: DateTime.Utc) =>
	scope.run((database) =>
		database
			.select({ id: coreTodos.id, title: coreTodos.title })
			.from(coreTodos)
			.where(sql`${coreTodos.id} >= ${uuidv7LowerBound(cutoff)}`)
	)
```

## "But I need a different time"

- **An event time, not a creation time:** model the event as its own row, one row per event. Its UUIDv7 is the event's time, and it references what it is about by foreign key.
- **A third party's timestamp:** store the record as one immutable row in an ingestion ledger; its UUIDv7 is the ingestion time. To keep the source's claimed time, store it as unix milliseconds in a `bigint` named for its unit: `sourceUnixMs: bigint({ mode: "number" })`.
- **A future time** (an expiry, a schedule): a UUIDv7 prefix is always now or the past, so store unix milliseconds the same way: `expiresAtUnixMs: bigint({ mode: "number" })`.

The lint has no escape hatch on purpose. If you find yourself reaching for a suppression comment or moving a column to a file the lint does not read, rethink the model.

See [no-uuid-default-random.md](no-uuid-default-random.md).
