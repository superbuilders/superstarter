---
alwaysApply: true
---

# No Optional Array

Arrays must never be optional (`T[] | undefined`) or nullable (`T[] | null`). Use the empty array `[]` as the empty state. This is enforced by `super-lint.ts` rule `no-optional-array`.

## The Problem

```typescript
// BAD: Optional array creates branching everywhere
interface User {
  tags?: string[]
}

// Every consumer must check:
if (user.tags) {
  for (const tag of user.tags) { ... }
}

// Or use fallbacks:
const tags = user.tags ?? []  // Banned by no-nullish-coalescing!
```

## The Rule

**Arrays are never optional.** An empty array `[]` represents "no items" - you don't need `null` or `undefined` for that.

```typescript
// GOOD: Always an array
interface User {
  tags: string[]  // Empty array [] means no tags
}

// Clean consumer code:
for (const tag of user.tags) { ... }

// Checking for "no items":
if (user.tags.length === 0) { ... }
```

## Fixing External API Boundaries

External APIs may omit array fields or send `null`. Normalize at the boundary using `z.preprocess`:

```typescript
// API might send: { tags: ["a"] } or { tags: null } or {}
// We want: string[] (never null/undefined)

const UserSchema = z.object({
  // Normalize null/undefined -> empty array at parse time
  tags: z.preprocess(
    (v) => (v === null || v === undefined ? [] : v),
    z.array(z.string())
  )
})

// Result type: { tags: string[] }
// Always an array - clean internal code
```

## Fix Patterns

### 1. Optional Array Field

```typescript
// BAD
interface User {
  roles?: string[]
}

// GOOD
interface User {
  roles: string[]  // Default to [] when creating
}
```

### 2. Function Parameter

```typescript
// BAD
function process(items?: string[]) {
  const list = items ?? []  // Forced to use banned ??
}

// GOOD
function process(items: string[]) {
  // items is always an array
}

// Caller passes [] for "no items":
process([])
```

### 3. Function Return Type

```typescript
// BAD
function getUsers(): User[] | null {
  if (noUsers) return null
}

// GOOD
function getUsers(): User[] {
  if (noUsers) return []
}
```

### 4. Zod Schema (API Boundary)

```typescript
// BAD: produces string[] | null | undefined
const schema = z.object({
  tags: z.array(z.string()).nullable().optional()
})

// GOOD: normalize to array
const schema = z.object({
  tags: z.preprocess(
    (v) => (v === null || v === undefined ? [] : v),
    z.array(z.string())
  )
})
```

### 5. Database/Cache Results

```typescript
// BAD: Redis might return null
async function getCachedTags(key: string): Promise<string[] | null> {
  return await redis.get(key)
}

// GOOD: Normalize at boundary
async function getCachedTags(key: string): Promise<string[]> {
  const result = await redis.get(key)
  if (!result) {
    return []
  }
  return result
}
```

## Why This Matters

1. **Eliminates branching** - No need to check `if (arr)` before iterating
2. **Removes `??` fallbacks** - Which are banned anyway
3. **Cleaner semantics** - "No items" is `[]`, not three possible states
4. **Safe iteration** - `for (const x of arr)` always works
5. **Safe methods** - `arr.map()`, `arr.filter()` always work

## Summary

| Pattern | Fix |
|---------|-----|
| `items?: string[]` | `items: string[]` with `[]` default |
| `items: string[] \| null` | `items: string[]` with `[]` default |
| `z.array().optional()` | `z.preprocess(v => v ?? [], z.array())` |
| `return null` for empty | `return []` |
| API returns `null` for empty | Normalize to `[]` at boundary |
