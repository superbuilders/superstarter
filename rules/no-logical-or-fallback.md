---
alwaysApply: true
---

# No Logical OR Fallback

`||` is banned as a fallback. Superlint `no-logical-or-fallback` allows it only as boolean logic in two places: the condition of an `if`, `while`, `do … while` or `for`, and the expression of a `return` statement.

## Why

`||` treats `0`, `""` and `false` as missing and substitutes the fallback, hiding real values:

```ts
// BAD: a count of 0 becomes 1
const count = loginCount || 1

// BAD: an empty nickname becomes "Anonymous"
const name = nickname || "Anonymous"

// BAD: false becomes true
const enabled = feature || true
```

## Allowed

```ts
if (title.length === 0 || title.length > TODO_TITLE_MAX_LENGTH) {
	return TITLE_REFUSED
}

while (pending.length > 0 || paused) {
	// …
}
```

A `return` statement may return a `||` expression. An arrow's expression body is not a `return` statement, and tsgo `unnecessaryArrowBlock` refuses a block body that only returns, so a predicate that needs `||` branches in an `if` or composes with `Predicate.or`.

With `strictBooleanExpressions`, every operand is a `boolean`, so write the comparison out (`rows.length === 0`, `value === undefined`).

## Banned everywhere else

Even boolean `||` is refused outside those positions, including a ternary's test, a `const` initializer and an arrow's expression body:

```ts
// BAD
const timeout = configuredTimeout || 5_000
const label = role === "admin" || role === "moderator" ? "Staff" : "User"

// GOOD: compose named predicates
const isAdmin = (role: Role): boolean => role === "admin"
const isModerator = (role: Role): boolean => role === "moderator"
const isStaff = Predicate.or(isAdmin, isModerator)
const label = isStaff(role) ? "Staff" : "User"
```

## Fixing a fallback

Fix it the way you fix `??` ([no-nullish-coalescing.md](no-nullish-coalescing.md)):

1. Remove it if the type already proves the value is present.
2. Make the field required in its Schema if it always should be there.
3. Fail with a tagged error if the value is required and missing.
4. Align the types at the boundary.
