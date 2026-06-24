---
globs: *.ts
alwaysApply: false
---

### No `crypto.randomUUID()`

Using `crypto.randomUUID()` is disallowed. It generates UUIDv4, which is random and not time-sortable. Use `Bun.randomUUIDv7()` instead.

**Incorrect:**

```typescript
const id = crypto.randomUUID()
```

**Correct:**

```typescript
const id = Bun.randomUUIDv7()
```

**Why:**

- UUIDv7 is time-sortable — better index locality and chronological ordering
- `Bun.randomUUIDv7()` generates time-sortable UUIDs client-side
- `crypto.randomUUID()` produces non-sortable UUIDv4
