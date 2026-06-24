---
alwaysApply: true
---

# No Null-Undefined Union

Types must never include both `null` AND `undefined` at function boundaries. Pick one. This is enforced by `super-lint.ts` rule `no-null-undefined-union`.

## Scope

This rule only checks **function boundaries** and **property signatures**:
- Function parameters
- Function return types
- Interface/type property signatures

It does **NOT** check variable declarations. This allows Zod schemas to use `.nullable().optional()` internally for API normalization.

## The Golden Rule

**Prefer `undefined` (optionals) for all internal types.** Use `null` only when writing TO an external API that specifically requires it.

## Chain Consistency

When fixing a null/undefined violation, you MUST trace the value through the entire data flow and fix ALL points in the chain. A partial fix will cause type errors elsewhere.

```typescript
// If you fix the type here:
interface User { score?: number }  // Changed from number | null

// You MUST also fix:
// 1. Where the data comes from (API response parsing)
// 2. Where the data is used (function parameters, return types)
// 3. Where the data is passed (intermediate variables, transformations)
```

**Before fixing, always:**
1. Read the file with the violation
2. Trace imports/exports to find the source of the type
3. Grep for usages of the field/variable
4. Fix consistently across ALL files in the chain

## The Problem

```typescript
// BAD: Triple branch - three states to handle everywhere
type User = { email: string | null | undefined }

// What does this mean?
// - string: has value
// - null: explicitly no value
// - undefined: never set?

// Forces this everywhere:
if (user.email !== null && user.email !== undefined) { ... }
```

## The Rule

**Pick one.** Prefer `undefined` for internal types (TS convention). Use `null` only at external API boundaries that require it.

```typescript
// GOOD: Optional (T | undefined) - PREFERRED
type User = { email?: string }

// ACCEPTABLE: Nullable (T | null) - only for external APIs that require null
type ApiPayload = { email: string | null }
```

## Fixing External API Boundaries

External APIs (JSON, databases, third-party services) often send `null`. Some also omit fields entirely (undefined). Use `z.preprocess` to normalize at parse time:

```typescript
// API can send: { email: "foo" } or { email: null } or {}
// We want: string | undefined (never null)

const UserSchema = z.object({
  // Normalize null -> undefined at parse time
  email: z.preprocess(
    (v) => (v === null ? undefined : v),
    z.string().optional()
  )
})

// Result type: { email?: string }
// Never null - clean internal code
```

## When to Use null vs undefined

| Context | Use | Reason |
|---------|-----|--------|
| Internal optional fields | `undefined` (`?:`) | TS convention, cleaner syntax |
| Function optional params | `undefined` (`?:`) | TS convention |
| External API responses | normalize to `undefined` | Consistency |
| Writing TO external API | `null` if API requires | Match API spec |
| Database fields | normalize to `undefined` | Consistency |

## Fix Patterns

### 1. Optional Field (Internal) - PREFERRED

```typescript
// BAD
interface User {
  middleName: string | null | undefined
}

// GOOD - use optional syntax
interface User {
  middleName?: string
}
```

### 2. Zod Schema (API Boundary)

```typescript
// BAD: produces string | null | undefined
const schema = z.object({
  email: z.string().nullable().optional()
})

// GOOD: normalize to undefined (preferred)
const schema = z.object({
  email: z.preprocess(
    (v) => (v === null ? undefined : v),
    z.string().optional()
  )
})
```

### 3. Function Return Types

```typescript
// BAD
function findUser(id: string): User | null | undefined

// GOOD: pick one - prefer undefined
function findUser(id: string): User | undefined
```

### 4. External API That Requires null

If an external API specifically requires `null` in the output (writing to it), normalize the other direction:

```typescript
// API expects: { email: string | null }
// Internal type: { email?: string }

const toApiFormat = (user: User) => ({
  email: user.email === undefined ? null : user.email
})
```

Or use preprocess to normalize undefined -> null:

```typescript
const ApiUserSchema = z.object({
  email: z.preprocess(
    (v) => (v === undefined ? null : v),
    z.string().nullable()
  )
})
```

## Complete Chain Fix Example

When you encounter a violation like `score: number | null | undefined`, here's the full fix process:

```typescript
// 1. FIND THE SOURCE - external API response type
// src/lib/api/types.ts
interface ApiCourseProgress {
  score: number | null  // API sends null for no score
}

// 2. NORMALIZE AT BOUNDARY - Zod schema
// src/lib/api/schemas.ts
const CourseProgressSchema = z.object({
  score: z.preprocess(
    (v) => (v === null ? undefined : v),
    z.number().optional()
  )
})

// 3. UPDATE INTERNAL TYPE - use optional
// src/lib/domain/types.ts
interface CourseProgress {
  score?: number  // Internal: never null, use optional
}

// 4. UPDATE ALL USAGES - check assignments
// src/lib/domain/transformers.ts
function transform(api: ApiCourseProgress): CourseProgress {
  return {
    score: api.score === null ? undefined : api.score
  }
}
```

## Summary

1. Never have both `null` AND `undefined` in the same type
2. **Prefer `undefined` (optionals) for all internal types**
3. Normalize external data at the boundary using `z.preprocess`
4. Only use `null` when writing TO an API that requires it
5. **Fix the entire chain** - trace data flow and update all connected types
