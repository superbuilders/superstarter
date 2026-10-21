---
globs: *.ts
alwaysApply: false
---

# No `new Error()`

`new Error(...)` is banned (oxlint `superstarter/no-new-error`, which also refuses a bare `Error(...)` call). An `Error` carries free text and nothing a caller can match on. Model the failure as a `Schema.TaggedError` and construct it with `make`.

```ts
// BAD
throw new Error("todo not found")
Effect.fail(new Error("todo not found"))

// GOOD
export class TodoNotFound extends Schema.TaggedError<
	TodoNotFound,
	{ readonly brand: unique symbol }
>()("TodoNotFound", {
	id: TodoId
}) {}

Effect.fail(TodoNotFound.make({ id }))
```

tsgo also refuses the global `Error` type in an Effect's failure channel (`globalErrorInEffectFailure`) and `new` on a Schema class (`newSchemaClass`).

See [error-handling.md](error-handling.md).
