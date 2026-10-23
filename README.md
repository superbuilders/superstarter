# superstarter

A Next.js starter to copy, built on Effect. The example app is a todo list: server actions, PostgreSQL through
Drizzle, traces, logs and metrics, and AWS infrastructure declared in code.

What sets it apart is that its opinions are **enforced, not suggested**. TypeScript 7 runs with every Effect
language-service diagnostic as an error. Type-aware oxlint carries the repository's own rules, a semantic linter
runs on the TypeScript checker, a Tailwind linter resolves every class through the same checker, and a dead-code
gate runs alongside them. One `pnpm check` runs everything, and it is the pre-commit hook. A convention that
matters is a diagnostic, and every diagnostic says how to fix what it found.

[AGENTS.md](AGENTS.md) is the working contract for anyone, human or agent, changing the code.

## Quick start

Everything runs locally, offline, with no env file. You need Node 24+, pnpm, and PostgreSQL 18's server binaries
(`initdb`, `pg_ctl`) on `PATH`, for example Homebrew's `postgresql@18`.

```sh
pnpm install    # also patches tsc with @effect/tsgo and installs the pre-commit hook
pnpm db:local   # creates and starts a private PostgreSQL 18 on localhost:5434, then migrates it
pnpm dev        # http://localhost:3000
```

- **`pnpm test`** rebuilds a throwaway `superstarter_test` database from the migrations and runs the integration
  suites against it.
- **`pnpm check`** runs the whole gate.
- **Telemetry:** locally, spans, logs and metrics go to `packages/product/nextjs-app/out/telemetry/*.jsonl`, in
  the same OTLP/JSON a deployment sends to PostHog. Read them to see what a change emits.

## Stack

| Layer          | Choice                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| Runtime        | Node 24+, running TypeScript by type stripping; pnpm workspaces and Turborepo          |
| Framework      | Next.js 16 (App Router, Cache Components, React Compiler), React 19                    |
| Language       | TypeScript 7, patched by `@effect/tsgo`; Effect 4                                      |
| Data           | PostgreSQL 18 (RDS in production), Drizzle 1.0, `pg`; RDS IAM auth through Vercel OIDC |
| Telemetry      | Effect's tracer and logger bridged to OpenTelemetry: PostHog on Vercel, JSONL locally  |
| UI             | shadcn (Base UI, `base-nova`), Tailwind 4                                              |
| Infrastructure | Alchemy 2                                                                              |
| Checks         | oxlint + tsgolint, superlint, style lint, oxfmt, fallow, lefthook                      |

## The opinions

Each one is a decision with a reason, and nearly all are enforced by `pnpm check`.

### Design

- **Representation over control flow.** When a new case appears, change the types so it stops being special or
  stops being expressible, rather than adding a branch, flag, guard or sentinel. This is _parse, don't validate_:
  admit a value once at the boundary, by an Effect Schema, and let its type carry the proof inward. Never
  re-check it inside. _Make illegal states unrepresentable_: a closed result is a `kind` union, absence is an
  `Option` or a variant, and a missing value is never papered over with a fallback.
- **Delete before you add.** A fix removes the cause. A new rule, guard or branch needs evidence that deleting
  something could not do the job.
- **Hard cutovers.** A change replaces the old way everywhere at once: no shims, aliases, deprecated paths or
  readers of an old form.
- **Never defend against a trusted component.** Rows from our own SQL decode through their Schema once. A decode
  failure is a defect that dies loudly, never a state with its own branch.
- **Vercel-focused, never Vercel-dependent.** The deployment target is Vercel, but `pnpm db:local`, `pnpm dev`,
  `pnpm build && pnpm start` and `pnpm test` all run locally with no env file. A local default lives in its
  package's env module as a `Config.withDefault`, never in a committed `.env`.
- **Code is the documentation.** Types, lint rules and the code itself are the specification. The only comments
  are JSDoc on declarations and tool directives; the formatter strips everything else. Markdown exists only for
  what code cannot express: why a design exists, what it rejects, and facts from outside.

### Effect everywhere

- **Errors are values.** Every expected failure is a `Schema.TaggedError` named `<Subject><State>`
  (`TodoNotFound`, `PostgresTransientFailure`), its tag equal to its class name and its fields closed Schemas.
  A bug is a defect, not a typed error.
- **No `async`, `try`, `throw` or Promise chains in application code.** `Effect.tryPromise` captures a native
  failure where it occurs, maps it to a tagged error, and passes the abort signal on. Next's boundaries are the
  only Promises: `runRenderRead` for pages and `effectAction` for server actions. The single sanctioned `throw`
  is in a native callback whose contract demands one.
- **No ambient effects.** No `Date`, `Math.random`, timers, `console`, `fetch`, synchronous Node APIs or
  `process.env`. Use `DateTime`/`Clock`, `Random`, `Effect.sleep`, `Effect.log*`, Effect's platform services
  and `Config`. Each package that reads environment declares every variable in its own `src/env.ts`.
- **No escape hatches.** No `as` (except `as const`), `!`, `??`, `||` as a fallback, `instanceof Error`,
  `new Error`, IIFEs, or unions of `null` and `undefined`. No turning an `Option` back into `undefined`, `null`,
  `-1` or `NaN`. No classes except Effect's (Schema classes, tagged errors, service keys). No module-level
  mutable state: what outlives a request is a service of the one web runtime.
- **Pipeable APIs.** An exported function of two or more parameters is written with `Function.dual`, so it works
  data-first and in a pipe.

### Data

- **UUIDv7 keys and no timestamp columns.** PostgreSQL mints every primary key with `uuidv7()`, and a CHECK pins
  its version. The id's leading 48 bits are its creation time, so `ORDER BY id` is creation order and a timestamp
  column would only store the same fact twice.
- **SERIALIZABLE everywhere.** Every transaction runs SERIALIZABLE, and a transaction owns its `BEGIN`, `COMMIT`
  and `ROLLBACK` under an uninterruptible region, so an interrupted fiber never returns a connection
  mid-transaction. A serialization failure or deadlock (40001, 40P01) is a typed `PostgresTransientFailure` that
  the caller chooses to retry, with jittered backoff.
- **Every statement is declared, prepared and proven.** Each statement the app runs is a
  `preparePostgresStatement` with a name and a result Schema, and its rows decode once. A test suite finds every
  statement through the compiler and `PREPARE`s it as the app's own database login against the migrated test
  database. A column, grant or parameter PostgreSQL would refuse fails `pnpm test`, not production.
- **Explicit everything.** Sessions run with `search_path=pg_catalog`, so every statement names its schema. No
  query reads every column implicitly, and no `delete` or `update` lacks a `.where()`. Every constraint is named.
- **Migrations only.** There is no `push`, and generated migrations are never edited by hand. People draft and
  review migrations, and people apply them to shared databases.
- **Normalized relations.** Tables are in BCNF. A sum type is a header table plus one typed table per kind, never
  one wide table with nullable columns gated by a CHECK, because Drizzle types a column from its nullability
  alone. The full rules are in the `bjorns-opinionated-postgres-audit` skill (`.claude/skills/`).

### Server and UI

- **Pages are never async.** A page builds the promise of its data
  (`connection().then(() => runRenderRead(read))`) and hands it to a client component that calls `use()` inside
  `<Suspense>`. Reads start together and stream independently; a build never opens a database session.
- **Server actions are contracts.** A browser-safe contract names the action and Schemas its payload, success
  and errors. On the server, `effectAction` decodes the payload, runs the handler, and answers the encoded
  `Exit`:
  - a failure the contract names crosses as itself, when it is the run's only reason;
  - anything else is reported once and crosses as the opaque `ActionFailed`;
  - `redirect()` and `notFound()` navigate.

  The client calls the action as an Effect and switches exhaustively on `_tag`. A request that never answered is
  `ActionUnconfirmed`, and it is never retried automatically.

- **Tailwind tokens only, statically known.** The style linter finds every class string through the TypeScript
  checker and refuses:
  - a class that does not compile against the theme;
  - a color outside the theme, and an arbitrary value;
  - a class it cannot read whole from the source;
  - two classes setting the same property.

  Map state to fixed class strings; never interpolate into a class. Every component carries a `data-slot`.

- **The React Compiler is mandatory.** A component it cannot compile fails the build, so `useMemo`,
  `useCallback` and `memo` never appear.

### Telemetry

- **A closed, typed roster of operations.** Every span is an entry of `OPERATIONAL_SPANS`: its name, plus
  Schemas for the attributes it opens with and the ones it learns. `observed` opens the span.
  `annotateOperation` writes a learned fact, and it only typechecks inside that operation's `observed`. An
  operation built anywhere else does not typecheck. The web server's observability modules alone register the
  OpenTelemetry SDK and construct its exporters.
- **Wide logs.** Effect logs carry their span's attributes, so a log never repeats its context. A message is a
  terse literal; its facts are structured. Logs never contain secrets, request bodies, queries or what a person
  typed.
- **PostHog's SDK spec, and local parity.** On Vercel, gzipped OTLP goes to PostHog, flushed as each request
  ends. A batch PostHog refuses as too large is halved and resent, and a single record it still refuses is
  dropped with a receipt. Locally, identical OTLP/JSON goes to JSONL files, Next's own framework spans are on,
  and the token is never read. A SIGINT or SIGTERM disposes the runtime within five seconds, so the last
  metrics, spans and logs are written before the process exits.

### Tooling

- **Node runs TypeScript directly.** There is no bundler and no loader for scripts. Every package exports its
  raw TypeScript, and imports go through a package's `#` subpath map with the real file extension, or across
  packages by export name. There are no relative imports.
- **One gate that never writes.** `pnpm check` is the pre-commit hook, and it only refuses: `pnpm format:write`
  is the only command that changes files. Turborepo replays any check whose inputs did not change.
- **Rules are proven.** Each repository lint rule ships with fixtures or RuleTester cases that pin exactly what
  it must and must not report.
- **Lints record decisions.** A lint rule is an owner's decision. It is strengthened, never weakened, and never
  suppressed to make a change pass.

### Deliberate exceptions

These are switched off on purpose, each for a reason:

- `@effect/tsgo`'s `unstableApiUsage` is off, because Effect's whole Node platform layer is marked unstable.
- Five oxlint rules are off:
  - `typescript/prefer-nullish-coalescing`: `??` is banned.
  - `typescript/promise-function-async`: `async` is banned.
  - `eslint/no-redeclare`: tsc already reports redeclarations, and a Schema shares its type's name.
  - `typescript/consistent-return`: it contradicts `return yield*`, which tsgo requires for an Effect that only
    fails, and exhaustive switches without a `default`. tsc's `noImplicitReturns` already proves every path
    returns.
  - `typescript/no-invalid-void-type`: oxlint's port refuses `void` as a generic argument
    (`Promise.withResolvers<void>()`), which the rule exists to allow.

## How a request flows

- **A page read:**
  1. The page calls `runRenderRead(readTodos)`, which runs the Effect on the process's single `ManagedRuntime`,
     tied to React's `cacheSignal`.
  2. The read borrows a pooled connection (`withApplicationPostgres`) and runs a prepared statement.
  3. The rows decode through the statement's Schema.
  4. Every step is a span in the request's trace.
- **A mutation:**
  1. The client's `callAction(contract, action)` encodes the payload and calls the server action.
  2. `effectAction` decodes it and runs the handler (for example `flipTodo(id).pipe(retryPostgresTransient)`)
     inside one `superstarter.action` span.
  3. The handler revalidates the page, and the action answers with the encoded `Exit`.
  4. The client decodes the `Exit` back into the contract's own error classes.
- **The runtime:** one `ManagedRuntime`, anchored on `globalThis`, holds the process's services:
  - its telemetry;
  - the OpenTelemetry pipeline;
  - the PostgreSQL pool.

  Next's instrumentation builds the runtime before the first request, and the exit hook disposes it.

## Deploying

You need a Vercel project and an AWS account.

1. **Infrastructure.** Follow [the infrastructure package's README](packages/platform/data-infrastructure/README.md):
   bootstrap once, plan, then deploy, naming every resource the plan changes. The deploy prints
   `AWS_ROLE_ARN`, `DATABASE_HOST` and `DATABASE_ADMIN_SECRET_ARN`.
2. **The Vercel project.**
   - Set its Root Directory to `packages/product/nextjs-app`. Its [vercel.json](packages/product/nextjs-app/vercel.json)
     installs with `pnpm install --frozen-lockfile` and builds with `pnpm run build`.
   - Set the three values above, and `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, as described in the app's
     [.env.example](packages/product/nextjs-app/.env.example).
   - To trace every Next.js framework phase there too, set `NEXT_OTEL_VERBOSE=1`.
3. **Operator access.** `pnpm env:pull` writes the Vercel project's development environment, with
   `VERCEL_OIDC_TOKEN`, into the app's `.env.local`. The database operator scripts read that file.
4. **Migrations.** `pnpm db:migrate apply` signs in as the RDS master user through the Vercel OIDC role. It applies
   the pending reviewed migrations through Drizzle's native migrator, then the idempotent SQL programs: the
   `app` login, its `rds_iam` membership and its grants.

## Commands

Run every command from the repository root.

| Command                                  | What it does                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js in the app package. `dev` and `start` dispose the runtime on a stop signal, so the last telemetry lands. |
| `pnpm check`                             | The gate and pre-commit hook: every typecheck and linter, the fixture self-tests, the format check and fallow.   |
| `pnpm typecheck` / `lint` / `style`      | Parts of the gate on their own.                                                                                  |
| `pnpm format` / `pnpm format:write`      | Check / write formatting: strip every comment but JSDoc and tool directives, normalize blank lines, then oxfmt.  |
| `pnpm test`                              | Rebuild `superstarter_test` from the migrations, then run the prepared-statement and todo lifecycle suites.      |
| `pnpm db:local` / `pnpm db:local:stop`   | Start (creating it the first time) and migrate the local PostgreSQL 18 on localhost:5434 / stop it.              |
| `pnpm db:generate`                       | Draft a migration from schema changes, for a person to review.                                                   |
| `pnpm db:migrate status` / `apply`       | On RDS: compare packaged and applied migrations / apply the pending ones, then the SQL programs.                 |
| `pnpm db:studio`                         | Drizzle Studio on RDS, as the master user.                                                                       |
| `pnpm env:pull`                          | Vercel's development environment into the app's `.env.local`.                                                    |

The checks run through Turborepo, so an unchanged task replays its cached result. Set concurrency with
`--concurrency`, or with `CHECK_CONCURRENCY` in the shell or the root `.env.local`.

## Layout

```
packages/
  product/
    nextjs-app/             pages, server actions and reads, the telemetry pipeline, shadcn UI, env
    todo-protocol/          browser-safe types every layer shares: todo identity, action contracts, wire failures
  platform/
    operational-telemetry/  the span registry, the Effect→OpenTelemetry bridge, PostHog and file export
    data-infrastructure/    the Alchemy stack and the database operator scripts
  data/
    database/               the Drizzle schema, Postgres scopes and pool, prepared statements, SQL programs, migrations
scripts/dev/                the check launcher, superlint, the oxlint plugin, the formatter, the style linter
.claude/skills/             agent skills
patches/                    pinned patches to dependencies
```

## License

0BSD. See [LICENSE](LICENSE).
