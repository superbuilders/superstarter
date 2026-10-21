---
globs: *.ts
alwaysApply: false
---

# Structured Logging and Telemetry

Logs are Effect logs, and traces are Effect spans named from a closed roster. `console` is banned (oxlint `no-console`, tsgo `globalConsole`), and so is any second logger. The operational logger and tracer are installed once, at each entry point. They tie every log to its span and export logs, spans and metrics to PostHog.

## Logs

The message comes first and is a terse literal: lower case, a noun phrase or a past participle. Facts follow it as a structured object or a `Cause`. Never interpolate data into the message.

```ts
// GOOD
yield* Effect.logInfo("schema dropped", { schema: name })
Effect.logError("postgres idle client failed").pipe(
	Effect.annotateLogs({ diagnostic: postgresDiagnosticOf(error) })
)

// BAD
yield* Effect.logInfo(`dropped schema ${name}`)
```

- **Annotations:** `Effect.annotateLogs({ … })` attaches keys to every log an Effect writes.
- **Levels:**
  - `logDebug`: detail.
  - `logInfo`: an operation's milestones.
  - `logWarning`: a recoverable surprise.
  - `logError`: a failure someone must look at.

  The minimum level is `All`, so debug logs ship too.

- **Failures:** log a failure once, where it becomes a value, with its `Cause`. Code that only propagates a failure does not log it: the span records it on the way out ([error-handling.md](error-handling.md)).
- **Content:** never log a secret, a request body, a URL's query or what a person typed (such as a todo's title). Log ids and closed codes.

## Spans: `observed`

Every operation worth seeing in a trace is one entry of `OPERATIONAL_SPANS` (`@superstarter/operational-telemetry/spans`): its `superstarter.<area>.<noun>` span name and every attribute its span may carry, as Schemas. `opened` is what the span opens with, required where the operation always knows it; `learned` is what the work finds out on the way. No other key types on that span.

```ts
todoCreate: operationalSpan({
	name: "superstarter.todos.create",
	opened: {},
	learned: { "superstarter.todo.id": TodoId }
}),
```

Wrap the work with `observed(operation, opened)` from `@superstarter/operational-telemetry/effect`:

```ts
export const removeTodo = (id: TodoId) =>
	withApplicationPostgres(
		withPostgresStatement((scope) =>
			scope.run((database) =>
				database.delete(coreTodos).where(eq(coreTodos.id, id)).returning({ id: coreTodos.id })
			)
		)
	).pipe(
		Effect.flatMap(affectedOf(id)),
		observed(OPERATIONAL_SPANS.todoDelete, { "superstarter.todo.id": id })
	)
```

Write a fact learned partway through with `annotateOperation(operation, learned)`:

```ts
Effect.tap((id) => annotateOperation(OPERATIONAL_SPANS.todoCreate, { "superstarter.todo.id": id }))
```

`annotateOperation` needs the operation's scope in the Effect's requirements, and only `observed` for that operation provides it. Writing a fact onto an operation the work is not inside leaves the requirement unmet, which fails `tsc` at the entry point. The fact lands on the operation's own span, even from inside a span nested under it.

Every log written inside a span carries the span's attributes, so a log never repeats context that its span already holds.

## The rosters are closed

- **Span names** are roster members, never literals or generated strings (oxlint `superstarter/no-literal-span-name`, over `observed`, `Effect.withSpan`, `Effect.fn` and `Effect.makeSpanScoped`).
- **`superstarter.*` attribute keys** go through `observed` or `annotateOperation`, which type them (oxlint `superstarter/no-literal-attribute-key`). `Effect.annotateCurrentSpan`, and literal keys on `Span.attribute` or in `withSpan` options, are refused.
- **Attribute values** are identifiers, codes, counts and durations, never free text.
- **Shared attributes:** keys no single operation owns (the deployment, the replay session, the cold start, the outcome the tracer records at a span's end) are `SharedAttributes` (`@superstarter/operational-telemetry/schema`), written only by the telemetry and the server's reporting.
- **Extending:** a new operation is a new `OPERATIONAL_SPANS` entry; a new fact is a new key in that operation's `opened` or `learned`.

## Where telemetry is installed

The process's telemetry is one `OperationalTelemetry` service (`@superstarter/operational-telemetry/effect`): its origin with the instance id minted once, the one tracer and logger, and the cold start the first request span claims. The web app builds it, with the telemetry sink and the database pool, into one `ManagedRuntime` anchored on `globalThis` (`packages/product/nextjs-app/src/server/runtime.ts`), the process's only global, shared by the instrumentation bundle and every app bundle. Every entry point (render reads, server actions, the request-error hook, registration) runs on it under `withOperationalTelemetry`, which roots the work under the request's span. Work scheduled with Next's `after()` uses `withBackgroundOperationalTelemetry`: its own root span, linked to the request that scheduled it.

`@superstarter/operational-telemetry` stays host-neutral. One registration module in the web server registers the OpenTelemetry SDK and builds the OTLP exporters, and superlint `operational-telemetry-boundary` refuses those imports anywhere else.
