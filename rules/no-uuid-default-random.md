# No `uuid().defaultRandom()`

Calling `.defaultRandom()` on a Drizzle `uuid(...)` column generates a UUIDv4 — random, not time-sortable. **Categorically banned. No exceptions.**

This is enforced by `scripts/dev/lint/rules/no-uuid-default-random.ts`.

## Why

UUIDv4 is uniformly random across all 122 random bits. There is no temporal ordering between two UUIDv4s, no way to scan a B-tree of UUIDv4s in creation order, and no way to recover a row's creation time from the id.

UUIDv7 (RFC 9562) puts a 48-bit unix-millisecond timestamp in the first 48 bits. This means:

- `ORDER BY id DESC` gives reverse-chronological order — no separate `created_at_idx` needed.
- `WHERE id >= uuidv7LowerBound(cutoff)` is a fast PK-index range scan equivalent to `WHERE created_at >= cutoff`.
- `timestampFromUuidv7(row.id)` recovers the creation time without a `createdAt` column (which is itself banned — see [no-timestamp-columns.md](no-timestamp-columns.md)).

## What's banned

```typescript
// ❌ Banned
id: uuid("id").defaultRandom().notNull().primaryKey()
```

## What to do instead

```typescript
// ✅ PG18 native uuidv7() — server-side, no app-code dependency
id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`)
```

The IaC provisions Postgres 18.3, which has `uuidv7()` as a built-in function. No extension needed.

## See also

- [no-timestamp-columns.md](no-timestamp-columns.md) — companion rule banning `timestamp` / `date` / `time` / `interval` columns.
- `src/db/lib/uuid-time.ts` — helpers for working with UUIDv7 ids in app code.
