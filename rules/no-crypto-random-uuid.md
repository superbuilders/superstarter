---
globs: *.ts
alwaysApply: false
---

# No `crypto.randomUUID()`

`crypto.randomUUID()` is banned (tsgo `cryptoRandomUUID`). It mints a UUIDv4, which is random: it neither sorts by time nor records one.

- **Primary keys** are minted by PostgreSQL's `uuidv7()` as the column default, so the application never sends one. See [no-uuid-default-random.md](no-uuid-default-random.md).
- **A throwaway client-side key** that is never sent, such as an optimistic row's React key, comes from `uuid`'s `v7()`:

```ts
import { v7 } from "uuid"

applyOptimistic({ kind: "create", key: v7(), title })
```
