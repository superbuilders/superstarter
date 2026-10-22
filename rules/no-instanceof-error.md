# No `instanceof Error`

`x instanceof Error` is banned (oxlint `unicorn/no-instanceof-builtins` with `useErrorIsError`, which also refuses `instanceof` on the primitive wrappers and `Array`). It says that something is an error, not which one. Effect already knows which, because its error channel is typed.

## Match by tag

```ts
// BAD
if (error instanceof Error) {
	// which error? what can be done about it?
}

// GOOD: handle one tag; it leaves the error channel
const todo = readTodo(id).pipe(Effect.catchTag("TodoNotFound", () => Effect.succeedNone))

// GOOD: branch on the closed union's tag
const changeRefusalOf = (
	error: Schema.SchemaError | TodoNotFound | DatabaseFailure
): Refused | undefined => {
	if (error._tag === "TodoNotFound") {
		return GONE_REFUSED
	}
	if (error._tag === "PostgresTransientFailure") {
		return CONFLICT_REFUSED
	}
	return undefined
}
```

## Other cases

- **A Schema class:** use `Schema.is(X)`, not `instanceof X` (tsgo `instanceOfSchema`).
- **An untyped cause** (a defect or an interruption): inspect the `Cause` with `Cause.findErrorOption` or `Cause.hasInterruptsOnly`.
- **A native library's value:** it stays `unknown` until a `catch` callback maps it to a tagged error, at the one place it enters ([no-try.md](no-try.md)).

See [error-handling.md](error-handling.md).
