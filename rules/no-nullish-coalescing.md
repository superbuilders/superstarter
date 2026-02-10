---
alwaysApply: true
---

# No Nullish Coalescing

The `??` operator is banned. It hides missing data by silently substituting fallback values.

## The Rule

When you see `x ?? fallback`, don't patch it here. Ask: **"Why is this value optional?"** Then fix the source.

## Fix Patterns

### 1. Remove No-op Fallbacks

TypeScript narrows discriminated unions through control flow. After an error check, the fallback is pointless:

```typescript
// ❌ WRONG: TypeScript already narrowed this
const result = await errors.try(fetchData())
if (result.error) {
  return null
}
const data = result.data ?? []  // POINTLESS - data is already T

// ✅ CORRECT: Trust the narrowing
const result = await errors.try(fetchData())
if (result.error) {
  return null
}
const data = result.data  // Already the success type
```

Same applies to required schema fields:

```typescript
// Schema: roles: z.array(UserRoleSchema)  // REQUIRED

// ❌ WRONG
roles: user.roles ?? []

// ✅ CORRECT
roles: user.roles  // Schema guarantees it exists
```

### 2. Fix `.nullable().optional()` Antipattern

Never use both. This creates `T | null | undefined` - three states to handle everywhere.

```typescript
// ❌ WRONG: Triple state
email: z.string().nullable().optional()  // string | null | undefined

// ✅ CORRECT: Pick one (prefer undefined)
email: z.string().optional()  // string | undefined

// ✅ CORRECT: Normalize null → undefined at boundary
email: z.string().nullable().transform(v => v ?? undefined)
```

### 3. Align Type Boundaries

If coercing `undefined` ↔ `null`, the types are misaligned. Fix at the boundary:

```typescript
// ❌ WRONG: Coercing at point of use
interface Input { grade?: string }  // undefined
interface Output { grade: string | null }  // null
const output = { grade: input.grade ?? null }

// ✅ CORRECT: Align the types
interface Input { grade: string | null }  // Match downstream
// OR
interface Output { grade?: string }  // Match upstream
```

### 4. Validate Required Fields at Boundary

If optional upstream but required downstream, validate and throw - don't silently default:

```typescript
// ❌ WRONG: Silent default
orgs: user.orgs ?? []

// ✅ CORRECT: Validate
if (!user.orgs) {
  logger.error("user missing required orgs", { userId: user.sourcedId })
  throw errors.new("user orgs required")
}
const orgs = user.orgs  // Now narrowed
```

### 5. Validate External Data

For Redis, APIs, etc. - validate structure before use:

```typescript
// ❌ WRONG: Hope keys exist
const data = await redis.hGetAll(key)
return {
  correct: Number.parseInt(data.correct ?? "0", 10),
}

// ✅ CORRECT: Validate keys
const data = await redis.hGetAll(key)
if (!data.correct || !data.incorrect) {
  logger.error("counter data incomplete", { key, data })
  throw errors.new("counter data missing required fields")
}
return {
  correct: Number.parseInt(data.correct, 10),
}
```

### 6. Redirect Invalid URL Params to Canonical Form

For URL search params, the canonical "empty" state is the **absence** of the param, not an empty string. Redirect invalid/empty params to the clean URL.

```typescript
// ❌ WRONG: Silent default in parser
export function parseFilters(params: SearchParams): ParsedFilters {
  return {
    query: params.q ?? "",  // Hiding empty param with fallback
  }
}

// ❌ ALSO WRONG: Ternary fallback at point of use
search: filters.query !== "" ? filters.query : undefined

// ✅ CORRECT: Redirect empty params to canonical URL (server component)
export default async function StudentsPage({ searchParams }) {
  const params = await searchParams

  // Canonical form: absence of param = no value
  // Redirect ?q= (empty) to URL without q param
  if (params.q === "") {
    const clean = new URLSearchParams()
    // Keep other valid params
    if (params.role === "student" || params.role === "admin") {
      clean.set("role", params.role)
    }
    const qs = clean.toString()
    redirect(qs ? `/admin/students?${qs}` : "/admin/students")
  }

  // After redirect, params.q is either a non-empty string or undefined
  // Parser can now use null to mean "no query" without fallbacks
  const filters = parseFilters(params)  // query: string | null
  // ...
}
```

The canonical URL form:
- `/admin/students` = no query (param absent)
- `/admin/students?q=foo` = query is "foo"
- `/admin/students?q=` = **invalid**, redirect to `/admin/students`

This eliminates the need for `??` fallbacks because invalid states are redirected away at the boundary.

### 7. Don't Replace `??` with `!` (Non-null Assertion)

Swapping one silent assumption for another is not a fix. Non-null assertions hide the same problem.

```typescript
// ❌ WRONG: Replacing ?? with ! and a comment
const currentOption = ROLE_OPTIONS.find((opt) => opt.value === currentRole)
// biome-ignore lint/style/noNonNullAssertion: array is non-empty constant
const option = currentOption ?? ROLE_OPTIONS[0]!

// ❌ ALSO WRONG: Just using ! directly
const color = colors[index]!  // "guaranteed" by math

// ✅ CORRECT: Validate and throw
const currentOption = ROLE_OPTIONS.find((opt) => opt.value === currentRole)
if (!currentOption) {
  logger.error("invalid role filter value", { currentRole })
  throw errors.new("invalid role filter")
}
// currentOption is now narrowed
```

If you're tempted to write `!` with a comment explaining why it's safe, that's a sign you should validate and throw instead. The validation makes the assumption explicit and debuggable.

## Summary

| Pattern | Fix |
|---------|-----|
| `result.data ?? []` after error check | Remove `?? []` - already narrowed |
| `user.roles ?? []` on required field | Remove fallback - trust schema |
| `z.string().nullable().optional()` | Pick one: `.optional()` preferred |
| `input.grade ?? null` | Align Input/Output types |
| `user.orgs ?? []` when orgs required | Validate and throw if missing |
| `redisData.field ?? "0"` | Validate hash structure first |
| `params.q ?? ""` in URL parsing | Redirect to canonical URL at boundary |
| `array[index]!` with "guaranteed" comment | Validate and throw if missing |
