---
alwaysApply: true
---

# Effect Classes Only

Effect owns the classes a module declares. Superlint `effect-classes-only` refuses a class that does not extend one of Effect's class idioms, resolved through the checker to its `effect` export: `Schema.Class`, `Schema.TaggedClass`, `Schema.TaggedError`, `Schema.Error`, `Schema.ErrorClass`, `Schema.Opaque`, `Context.Service`, or any `Data` class. A renamed import still counts; a look-alike that is not Effect's does not.

## Why

- **Effect's declarations are classes.** A tagged error, a Schema class and a service key are declared as classes, and tsgo shapes each one (`schemaClassMissingBrand`, `newSchemaClass`, `overriddenSchemaConstructor`, `serviceNotAsClass`). Any other class is hand-rolled OOP with `this`, which Effect replaces.
- **Behaviour is module functions.** A module already gives encapsulation (what it does not export) and a namespace (its import path), and fallow finds an unused export where it cannot find an unused method.

## Declaring

```ts
/** Data with a Schema: an expected failure. */
export class TodoNotFound extends Schema.TaggedError<
	TodoNotFound,
	{ readonly brand: unique symbol }
>()("TodoNotFound", {
	id: TodoId
}) {}

/** A dependency that must be swappable: a service key, implemented by a Layer. */
export class Mailer extends Context.Service<
	Mailer,
	{ readonly send: (message: Message) => Effect.Effect<void, MailRefused> }
>()("superstarter/mail/Mailer") {}

/** Behaviour: a module function, or an Effect value. */
export const readTodos = withApplicationPostgres(withPostgresStatement(listTodos)).pipe(
	observed(OPERATIONAL_SPANS.todosRead)
)
```

Reach for `Context.Service` only when a dependency must be swappable, by a test or by an environment. Otherwise a module function is the whole design.

## Banned

```ts
// BAD: a hand-rolled class
class TodoStore {
	constructor(private readonly pool: PostgresPool) {}
	read() {
		/* … */
	}
}
```

An object literal of functions is not refused: it is how a service is implemented (`Mailer.of({ send })`) and how a value of a declared type is written.

See [no-module-state.md](no-module-state.md).
