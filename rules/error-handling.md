---
globs: *.ts
alwaysApply: false
---

# Error Handling

A failure is a value in Effect's error channel. An expected failure is a `Schema.TaggedError`. A failure that can only mean a bug is a defect. Nothing throws through application code, nothing is swallowed, and nothing falls back to an invented value.

## Expected failures are tagged errors

```ts
import { Schema } from "effect"
import { TodoId } from "@superstarter/todo-protocol/todos"

/** The todo a toggle or delete names no longer exists. */
export class TodoNotFound extends Schema.TaggedError<
	TodoNotFound,
	{ readonly brand: unique symbol }
>()("TodoNotFound", {
	id: TodoId
}) {}
```

- **Name:** `<Subject><State>`, such as `TodoNotFound`, `AdminSecretUnreadable`, `PostgresStatementRejected` or `PostgresTransientFailure`. No `Error` suffix.
- **Tag:** `_tag` equals the class name (tsgo `deterministicKeys`).
- **Brand:** the second type argument is required (tsgo `schemaClassMissingBrand`), so two errors with the same fields stay distinct types.
- **Fields:** fields are Schemas that hold closed facts: ids, literal reasons, admitted diagnostics. Never put a provider's message or a raw caught value in a field, because those can carry secrets or user content. When the cases differ by one fact, write one class with a literal field (`reason: Schema.Literals(["fetch", "empty", "shape"])`) rather than one class per case.
- **Construction:** construct with `X.make({...})` (tsgo `newSchemaClass`). In a generator, `yield* X.make({...})` fails it; elsewhere use `Effect.fail(X.make({...}))`.

```ts
/** The one row a toggle or delete returned, or the refusal that it named nothing. */
const affectedOf =
	(id: TodoId) =>
	(rows: ReadonlyArray<Readonly<{ id: TodoId }>>): Effect.Effect<void, TodoNotFound> => {
		if (Array.isReadonlyArrayNonEmpty(rows)) {
			return Effect.void
		}
		return Effect.fail(TodoNotFound.make({ id }))
	}
```

## Capturing native failures

Native code throws and rejects, so wrap it where it is called. The `catch` maps the thrown value to a tagged error. It never returns `unknown` or `Error` (tsgo `unknownInEffectCatch`, `globalErrorInEffectCatch`).

| Work                                  | Capture                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------ |
| A Promise                             | `Effect.tryPromise({ try: (signal) => …, catch: () => X.make({...}) })`  |
| A synchronous call that throws        | `Effect.try({ try: () => …, catch: () => X.make({...}) })`               |
| A synchronous call outside Effect     | `Result.try({ try: () => …, catch: () => … })`                           |
| A value that may be null or undefined | `Effect.fromNullishOr(value).pipe(Effect.mapError(() => X.make({...})))` |

```ts
const response = yield* Effect.tryPromise({
	try: (signal) =>
		client.send(new GetSecretValueCommand({ SecretId: secretArn }), { abortSignal: signal }),
	catch: () => AdminSecretUnreadable.make({ reason: "fetch" })
})
const raw = yield* Effect.fromNullishOr(response.SecretString).pipe(
	Effect.mapError(() => AdminSecretUnreadable.make({ reason: "empty" }))
)
```

Pass `signal` on, so that interruption aborts the call.

## Handling

- **One tag:** `Effect.catchTag("TodoNotFound", (error) => …)`. The handled tag leaves the error channel.
- **Several tags:** `Effect.catchTags({ TodoNotFound: …, PostgresTransientFailure: … })`.
- **A different domain failure:** `Effect.mapError`.
- **Our own bug:** `Effect.orDie`, for a failure that cannot happen unless our code is wrong, such as a row of our own SQL that does not decode or a missing `Config` at runtime.
- **Retry:** `PostgresTransientFailure` (SQLSTATE 40001 or 40P01) means the attempt changed nothing and may succeed when run again. Nothing retries automatically. The caller decides, with `retryPostgresTransient` (`@superstarter/database/postgres/retry`): three more attempts, exponentially spaced from 20 ms. The todo lifecycle suite proves it against a real conflict.

  ```ts
  flipTodo(id).pipe(retryPostgresTransient)
  ```

## Boundaries

- **Server actions** run through `effectAction` (`packages/product/nextjs-app/src/server/effect-action.ts`). A failure the action's contract names crosses to the browser as itself, decoded back into the same class. Every other cause is reported once and crosses as the opaque `ActionFailed`. The client never sees an exception or an error's text; it writes its own message per `_tag`.
- **Render reads** reject the promise the page passed down, and the route's error boundary renders.
- **Scripts** end in `NodeRuntime.runMain(main)`, which reports a failure and sets the exit code.
- **Native callbacks:** `throw` appears only where a native callback's contract demands it, such as pg's `password` callback, and it throws a tagged error.

## Reporting

- Report a failure once, where it becomes a value (`effectAction` does this). Code that only propagates a failure does not log it: the cause travels in the error channel, and the span records it.
- Never flatten a failure into a string (`String(error)`, `error.message`). Keep the typed error or the `Cause`.
- Telemetry classifies failures by `_tag` into closed codes (`FAILURE_CODES` in `@superstarter/operational-telemetry/failure`). A new tagged error that can reach telemetry gets a row there; without one it reports as `unknown`.

## See also

- [no-try.md](no-try.md): no `try`/`catch`/`finally`
- [no-new-error.md](no-new-error.md), [no-extends-error.md](no-extends-error.md), [no-instanceof-error.md](no-instanceof-error.md)
- [no-nullish-coalescing.md](no-nullish-coalescing.md): missing data stops the work
- [structured-logging.md](structured-logging.md)
