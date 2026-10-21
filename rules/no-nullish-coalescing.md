---
alwaysApply: true
---

# No Nullish Coalescing

The `??` operator is banned (oxlint `superstarter/no-nullish-coalescing`, `??=` included). It hides missing data by quietly substituting a fallback.

## The rule

When you see `x ?? fallback`, don't patch it where it stands. Ask why the value can be missing, and fix that.

Swapping `??` for something that does the same thing is not a fix:

- a ternary: `x !== undefined ? x : fallback`
- `||`
- `Option.getOrElse(() => fallback)` with an invented default
- a non-null assertion: `x!`

## Fix patterns

### 1. Remove fallbacks that do nothing

If the type already says the value is there, the fallback is dead code:

```ts
// Todo's Schema requires title
// BAD
const label = todo.title ?? "Untitled"

// GOOD
const label = todo.title
```

### 2. One absence, not two

`Schema.optionalKey(Schema.NullOr(X))` admits a missing key, `null` and a value: three states. Pick one ([no-null-undefined-union.md](no-null-undefined-union.md)):

```ts
// BAD: string | null, or absent
email: Schema.optionalKey(Schema.NullOr(Schema.String))

// GOOD: absent or a string
email: Schema.optionalKey(Schema.String)

// GOOD: whatever the API sends, one Option inside
email: Schema.OptionFromOptionalNullOr(Schema.String)
```

### 3. Align types at boundaries

Coercing `undefined` into `null` where a value is used means two types disagree. Make them agree:

```ts
// BAD
type Input = Readonly<{ grade?: string }>
type Output = Readonly<{ grade: string | null }>
const output: Output = { grade: input.grade ?? null }

// GOOD: one representation on both sides
type Output = Readonly<{ grade?: string }>
```

### 4. Required data fails when it is missing

If a value is optional upstream but required here, fail with a tagged error. Don't default it:

```ts
// BAD
const raw = response.SecretString ?? ""

// GOOD
const raw = yield* Effect.fromNullishOr(response.SecretString).pipe(
	Effect.mapError(() => AdminSecretUnreadable.make({ reason: "empty" }))
)
```

When a row your own SQL just inserted must exist, its absence is a defect:

```ts
Effect.flatMap((rows) => Effect.fromOption(Array.head(rows)).pipe(Effect.orDie))
```

### 5. Decode outside data before use

Data from a cache, an API or a file is decoded with a Schema that requires what the code needs. It is never read field by field with defaults:

```ts
// BAD
const correct = Number.parseInt(data.correct ?? "0", 10)

// GOOD
const Counter = Schema.Struct({ correct: Schema.Int, incorrect: Schema.Int })
const counter = yield* Schema.decodeUnknownEffect(Counter)(data)
```

### 6. Redirect invalid URL params to their canonical form

The canonical empty state of a search param is its absence, never `""`. Decode search params with a Schema that refuses `?q=`, and redirect a URL that does not decode to its canonical form. Don't turn `""` into "no query":

```ts
/** `?q=` is not a query; a missing `q` is. */
const StudentFilters = Schema.Struct({ q: Schema.optionalKey(Schema.NonEmptyString) })
```

| URL                     | Meaning                                |
| ----------------------- | -------------------------------------- |
| `/admin/students`       | no query                               |
| `/admin/students?q=ada` | the query is `ada`                     |
| `/admin/students?q=`    | invalid: redirect to `/admin/students` |

### 7. Don't replace `??` with `!`

A non-null assertion is the same silent assumption (oxlint `typescript/no-non-null-assertion`). Make the assumption explicit, and fail when it is false:

```ts
// BAD
const option = ROLE_OPTIONS.find((candidate) => candidate.value === role)!

// GOOD
const option = yield* Effect.fromOption(
	Array.findFirst(ROLE_OPTIONS, (candidate) => candidate.value === role)
).pipe(Effect.mapError(() => RoleFilterRefused.make({ role })))
```

## Summary

| Pattern                                           | Fix                                                  |
| ------------------------------------------------- | ---------------------------------------------------- |
| `todo.title ?? ""` on a required field            | Remove the fallback and trust the Schema             |
| `optionalKey(NullOr(X))`                          | Pick one: `optionalKey(X)`, or decode to an `Option` |
| `input.grade ?? null`                             | Align the input and output types                     |
| `response.field ?? ""` when the field is required | `Effect.fromNullishOr` and a tagged error            |
| `data.field ?? "0"` on outside data               | Decode with a Schema first                           |
| `params.q ?? ""`                                  | Redirect to the canonical URL                        |
| `array[index]!` or `find(…)!`                     | `Option`, then fail with a tagged error              |
