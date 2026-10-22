# Working in superstarter

superstarter is a Next.js starter on Effect: a todo list behind server actions, PostgreSQL on RDS through
Drizzle, telemetry to PostHog (to local JSONL files outside Vercel), and AWS infrastructure declared with Alchemy. It exists to be copied, so every
convention here is meant to survive the copy.

## Code is the documentation

Code, types and lint rules are the documentation. The only comments are JSDoc on declarations and tool
directives (`@effect-diagnostics`, `oxlint-disable`, `fallow-ignore`): the formatter strips every other
comment, and `pnpm check` refuses one. Write JSDoc and Markdown only for what code cannot express: why a
design exists, what it rejects, and outside facts. They state rules in plain words and never narrate
history or cite documents. Lint (oxlint, superlint) and tsgo rules record owner decisions: strengthen
them, never weaken them.

## Design

- **Representation over control flow.** When a new case appears, change the types so it stops being
  special or stops being expressible, instead of adding a branch, flag, guard or sentinel. Parse at the
  boundary once; never re-validate inside. Absence is a variant or an `Option`, never a fallback.
- **Delete before you add.** A fix removes the cause. A new rule, guard or branch needs evidence that
  deleting something could not do the job.
- **Hard cutovers.** A change replaces the old way everywhere in one go: no shims, aliases or readers of an
  old form.
- **Never defend against a trusted component.** Our own SQL output decodes through its Schema once; a
  decode failure is a defect that dies loudly, never a state with its own arm.
- **Vercel-focused, never Vercel-dependent.** Everything runs locally with no env file: `pnpm db:local`,
  `pnpm dev`, a local `pnpm build && pnpm start` and `pnpm test`. A local default lives in its package's
  env module as `Config.withDefault`, never in a committed `.env`.

## Workspace

A Turborepo workspace in edullm's shape. Every package sits at `packages/<category>/<name>`, is named
`@superstarter/<name>`, and exports its raw TypeScript (no build step):

- `packages/product/nextjs-app`: the Next app (pages, server actions, the server's telemetry registration,
  shadcn UI, `src/env.ts`).
- `packages/product/todo-protocol`: the browser-safe types the database, server and browser share (todo
  identity, action contracts, the failures that cross the wire).
- `packages/platform/operational-telemetry`: the span registry, the Effect→OpenTelemetry bridge, exporters.
- `packages/data/database`: the schema, the Postgres scopes, query contracts, SQL programs and migrations. It
  reads no environment.
- `packages/platform/data-infrastructure`: the Alchemy stack, and the operator scripts that administer the
  database as its master user (`db:*`).
- The root holds only tooling (`scripts/dev`), `turbo.json` and the shared strict `tsconfig.json` that every
  package extends.

Inside a package, import through its own `#` map with the real extension; across packages, import the
other package's export by name, without an extension (`@superstarter/database/postgres/transaction`).

## Toolchain

- Node ≥ 24 runs TypeScript directly by type stripping; pnpm installs. No Bun, no bundler for scripts, no
  loaders. Scripts are `node scripts/<…>.ts`.
- TypeScript 7.0.2, patched by `@effect/tsgo` on install (`prepare: effect-tsgo patch`). `tsc` reports every
  Effect language-service diagnostic as an error, suggestions included. The only exception is
  `unstableApiUsage` (off). There is no `async` anywhere, server actions included.
- `pnpm check` is the gate and the pre-commit hook. It runs Turborepo tasks through `scripts/dev/check.ts`:
  each package's typecheck and superlint (`scripts/dev/lint.ts`, the opinionated type-aware rules, on
  TypeScript 7's native API, run in the package), and the root's tooling typecheck, repository superlint,
  oxlint (type-aware through tsgolint, with the repository's syntax rules in `scripts/dev/oxlint/rules/`,
  each with a RuleTester self-test), the style linter (`scripts/dev/style.ts`, on the app's checker), oxfmt and
  the comment and blank-line formatter in check mode, and fallow for dead code. Superlint and the style linter
  prove every rule against fixtures that mark the lines it must report. Turbo replays any task whose inputs did not change; a package's checks
  rerun when any package it depends on changes. Nothing in the gate writes files; `pnpm format:write` does.
  A rule that can live in oxlint lives there; superlint keeps the rules oxlint cannot express.

## Conventions

- **Imports.** Inside a package, only through its `#` subpath imports with their real extension
  (`#server/todos/todos.ts`); across packages, by package export (`@superstarter/todo-protocol/todos`). No
  relative imports. Effect is imported from its barrel:
  `import { Effect, Schema } from "effect"`.
- **Names.** kebab-case files; `*-actions.ts` for `"use server"` modules; `import "server-only"` on server
  modules. A Schema and its type share one name (`TodoId`). Errors are `Schema.TaggedError` classes named
  `<Subject><State>` (`TodoNotFound`, `PostgresStatementRejected`), tag equal to class name. Closed results
  are `kind` unions with kebab-case values. Rosters are SCREAMING plurals with a derived singular type.
- **Functions.** Arrow consts and inline exports. An exported function of two or more fixed parameters is
  written with `Function.dual` so it also pipes. React components are function declarations, never async.
- **Effect.** Effect is the internal currency; Next boundaries are Promises through `Effect.runPromise`.
  `Effect.provide` happens once, at an entry point. No `async`, `try`, synchronous Node API (`*Sync`,
  oxlint `node/no-sync`), `Math.random`, `Date`, timers, `console`, `fetch` or `process.env` in app code:
  use Effect and its FileSystem and ChildProcess, `Random`, `DateTime`/`Clock`, `Effect.sleep`,
  `Effect.log*` and `Config`. Each package that reads environment declares every variable in its own env
  module: the app's `src/env.ts`, the infrastructure package's `src/env.ts`.
- **Telemetry.** Every operation is an `OPERATIONAL_SPANS` entry (`@superstarter/operational-telemetry/spans`): its span
  name and the Schemas of the attributes it opens with and learns. Wrap work with
  `observed(operation, opened)` and write learned facts with `annotateOperation(operation, learned)`, which
  only types inside that operation's `observed`.
  Logs are wide: each carries its span's attributes. `telemetryBackend` (the app's `src/env.ts`) picks the
  sink from the deployment: PostHog on every Vercel deployment (token required), JSONL under the app's
  `out/telemetry/` locally, where nothing reaches PostHog and the token is never read. Read the local files
  to see what a change emits. Only the app's `src/instrumentation.ts` touches `process.env`: it reads Next's
  `NEXT_RUNTIME` intrinsic, so no Node code enters the Edge bundle, and in a local process it turns on Next's
  verbose framework spans.
- **Data.** Every primary key is a UUIDv7 minted by PostgreSQL's `uuidv7()`; there are no timestamp
  columns (`@superstarter/database/lib/uuid-time` reads time from the id). Every transaction is SERIALIZABLE; a 40001 or
  40P01 is a typed `PostgresTransientFailure` the caller may retry. Sessions run with
  `search_path=pg_catalog`, so every statement names its schema. Every statement the app runs is a
  `preparePostgresStatement` declared in `@superstarter/database/queries/*` and registered in the
  prepared-statement suite (`packages/platform/data-infrastructure/integration/`). Schema changes are
  migrations only, applied by `pnpm db:migrate apply` through Drizzle's native migrator and followed by
  the idempotent SQL programs; there is no push. Migrations are drafted and reviewed by a person: never
  run `pnpm db:generate` or apply schema changes on your own, except to the local cluster (`pnpm
  db:local`, `pnpm test`), which is superstarter's own PostgreSQL 18 on localhost:5434.
- **UI.** shadcn components live in the app's `src/ui/`, installed with the shadcn CLI run in the app
  package (`#ui`, `#lib/cn.ts`). Styling is Tailwind tokens only; the style linter refuses arbitrary
  values, colors outside the theme, and any class it cannot read whole in the source: map state to fixed class
  strings, never interpolate into a class. The React Compiler compiles every component, and one it cannot
  compile fails the build (`panicThreshold: "all_errors"`), so `useMemo`, `useCallback` and `memo`
  never appear.
- **RSC data.** Pages are not async. A page builds a promise
  (`connection().then(() => runRenderRead(effect))`) and passes it to a `"use client"` component that calls
  `use()` inside `<Suspense>`.

## Working here

- Never deploy, bootstrap infrastructure or push a database schema without the owner's explicit go-ahead.
- Commit only when asked. Leave others' uncommitted changes untouched.
