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
		withPostgresStatement((scope) => scope.runPrepared(removeTodoStatement, { id }))
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

- **Operations** are roster members. `observed` takes an `OperationalSpan`, and an `OperationalSpan` carries a key only `spans.ts` holds, so an operation built anywhere else does not type. Outside the telemetry package, Effect's own span writers (`Effect.withSpan`, `Effect.makeSpanScoped`, `Effect.annotateCurrentSpan`, `Effect.linkSpans` and the rest) and a named `Effect.fn("…")` are refused (oxlint `superstarter/telemetry-ownership`).
- **`superstarter.*` attribute keys** go through `observed` or `annotateOperation`, which type them. A literal `superstarter.*` key on `Span.attribute` is refused (oxlint `superstarter/no-literal-attribute-key`).
- **Attribute values** are identifiers, codes, counts and durations, never free text.
- **Shared attributes:** keys no single operation owns (the deployment, the replay session, the cold start, the outcome the tracer records at a span's end) are `SharedAttributes` (`@superstarter/operational-telemetry/schema`), written only by the telemetry and the server's reporting.
- **Extending:** a new operation is a new `OPERATIONAL_SPANS` entry; a new fact is a new key in that operation's `opened` or `learned`.

## Where telemetry is installed

The process's telemetry is one `OperationalTelemetry` service (`@superstarter/operational-telemetry/effect`): its origin with the instance id minted once, the one tracer and logger, and the async context outside every request, captured once at registration. The web app builds it, with the telemetry sink, the OpenTelemetry pipeline (`src/server/observability/pipeline.ts`) and the database pool, into one `ManagedRuntime` anchored on `globalThis` (`packages/product/nextjs-app/src/server/runtime.ts`), the process's only global, shared by the instrumentation bundle and every app bundle. A SIGINT or SIGTERM disposes that runtime, bounded by five seconds: the pool ends, then metrics export once more, then spans and logs drain, and the process exits.

Telemetry that reads the clock inside an SDK callback (the span processor's work at a span's end, an SDK diagnostic's count) runs in that outside context. Next treats a clock read inside a render's static stage as the render's own synchronous I/O and ends the stage, so telemetry never reads the clock there. The span processor marks `faas.coldstart` on the process's first server span, the first request it serves. Locally, Next traces every framework phase (`NEXT_OTEL_VERBOSE=1`, set by `src/instrumentation.ts`); a Vercel deployment opts in through its own environment. Every entry point (render reads, server actions, the request-error hook, registration) runs on it under `withOperationalTelemetry`, which roots the work under the request's span. Work scheduled with Next's `after()` uses `withBackgroundOperationalTelemetry`: its own root span, linked to the request that scheduled it.

`@superstarter/operational-telemetry` stays host-neutral. The web server's observability modules register the OpenTelemetry SDK (`src/server/observability/pipeline.ts`) and build the OTLP exporters (`sink.ts`), and oxlint `superstarter/telemetry-ownership` refuses those imports anywhere else, `posthog-js` outside `src/lib/product-analytics.ts`, and Effect `Console` output in the observability paths.

## Delivery

- **Vercel:** `@vercel/otel` flushes every span processor under `waitUntil` once a request's root span ends, so a request's spans and logs leave with it. Metrics export when a request's flush finds their minute has passed.
- **Locally:** the pipeline drains itself as each root span ends, so the JSONL under the app's `out/telemetry/` holds a request's spans and logs as soon as it ends. Metrics are written once a minute.
- **Size:** PostHog refuses an OTLP body over its limit with 413 (10 MiB hosted, 2 MiB self-hosted by default). Following PostHog's SDK spec, a refused batch is halved and the halves sent in order; a single record still refused is dropped with a console receipt and `superstarter.telemetry.export.dropped`. Nothing splits a record, and every log body also reaches the console. The OTLP exporters send gzip.
