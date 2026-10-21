---
alwaysApply: true
---

# No Extends Error

A class that extends `Error` is banned (tsgo `extendsNativeError`). An expected failure is a `Schema.TaggedError` class.

## Why

- **Tags match by value.** `Effect.catchTag("TodoNotFound", …)` narrows the error and removes it from the error channel; `instanceof` does neither.
- **Fields are Schemas.** The payload is typed, closed and serializable.
- **Errors are yieldable.** `yield* TodoNotFound.make({ id })` fails the generator.

## The shape

```ts
import { Schema } from "effect"
import { TodoId } from "#lib/todos.ts"

/** The todo a toggle or delete names no longer exists. */
export class TodoNotFound extends Schema.TaggedError<
	TodoNotFound,
	{ readonly brand: unique symbol }
>()("TodoNotFound", {
	id: TodoId
}) {}
```

- `_tag` equals the class name (tsgo `deterministicKeys`).
- The brand type argument is required (tsgo `schemaClassMissingBrand`).
- There is no body and no constructor override (tsgo `overriddenSchemaConstructor`). Construct with `TodoNotFound.make({ id })`.
- No field is named `name` (tsgo `errorPayloadShadowsName`).
- Use `Schema.TaggedError`, not `Data.TaggedError` (tsgo `preferSchemaTaggedError`).
- Superlint `effect-classes-only` allows exactly these classes.

## Naming

`<Subject><State>`: the thing, then what happened to it. Examples: `TodoNotFound`, `AdminSecretUnreadable`, `PostgresStatementRejected`, `PostgresTransientFailure`. No `Error` suffix.

## One class, a literal field

When the cases differ by one closed fact, write one class with a literal field instead of a class per case:

```ts
/** The master secret could not be read. The provider's message is dropped: it can name the
 * caller's identity or echo credential material. */
export class AdminSecretUnreadable extends Schema.TaggedError<
	AdminSecretUnreadable,
	{ readonly brand: unique symbol }
>()("AdminSecretUnreadable", {
	reason: Schema.Literals(["fetch", "empty", "shape"])
}) {}
```

See [error-handling.md](error-handling.md).
