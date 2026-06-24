# No Timestamp Columns

Drizzle's `timestamp`, `date`, `time`, and `interval` column factories are **categorically banned** from any schema file. There are **no exceptions**, no escape hatches, and no allowlist.

This is enforced by `scripts/dev/lint/rules/no-timestamp-columns.ts`.

## Why

Every primary key in this codebase is a [UUIDv7](https://www.rfc-editor.org/rfc/rfc9562). The first 48 bits of a UUIDv7 encode a big-endian unix-millisecond timestamp — i.e. **the row's creation time is already in its primary key**. Adding a separate `createdAt` column duplicates that information and pays for it twice (storage + a redundant index).

Concretely:

- **Time-sorted scans**: `ORDER BY id DESC` walks the PK index in reverse-chronological order. No `created_at_idx` needed.
- **Time-range filters**: `WHERE id >= uuidv7LowerBound(cutoff)` (see [`src/db/lib/uuid-time.ts`](src/db/lib/uuid-time.ts)) hits the PK index. No `created_at_idx` needed.
- **Reading the time in app code**: `timestampFromUuidv7(row.id)` decodes the 48-bit prefix back into a `Date`.

## What's banned

```typescript
// ❌ ALL banned, no exceptions
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
birthday: date("birthday")
openAt:   time("open_at")
duration: interval("duration")
```

## What to do instead

```typescript
// ✅ The only correct PK shape
id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`)

// ✅ Recovering creation time in app code
import { timestampFromUuidv7 } from "@/db/lib/uuid-time"
const createdAt = timestampFromUuidv7(row.id)

// ✅ Time-range query against the PK index
import { uuidv7LowerBound } from "@/db/lib/uuid-time"
import { gte } from "drizzle-orm"
db.select({ … }).from(coreTodos).where(gte(coreTodos.id, uuidv7LowerBound(cutoff)))
```

## "But I really need a different timestamp"

You don't.

- *"It's an event time, not a creation time."* → Model the event as its own ledger row (one row per event). The event row's UUIDv7 carries the event time. The "thing" that the event is about is referenced by foreign key.
- *"It's an external timestamp from a third-party API."* → Store the original record as one immutable row in an ingestion ledger; the ledger row's UUIDv7 is the ingestion time, not the source's claimed time. If you genuinely need to retain the source's timestamp, store it as `bigint("source_unix_ms")` — explicitly typed, no Drizzle time-shaped column involved.
- *"What about expiration / scheduled-for times in the future?"* → Same: `bigint("expires_at_unix_ms")`. Future times can't be UUIDv7 prefixes (those are always now-or-past).

The lint rule has no escape hatch on purpose. If you find yourself writing a `// biome-ignore` or moving the column to a non-Drizzle file, stop and re-think the model.

## See also

- [no-uuid-default-random.md](no-uuid-default-random.md) — the companion rule banning `defaultRandom()` (UUIDv4) on `uuid()` columns.
- `src/db/lib/uuid-time.ts` — `timestampFromUuidv7` + `uuidv7LowerBound` helpers.
