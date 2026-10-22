# superstarter

A Next.js starter on Effect. Everything in it is typed end to end and checked harder than usual:
TypeScript 7 with every Effect language-service diagnostic as an error, a semantic linter on the
TypeScript 7 native API, type-aware oxlint, a Tailwind token linter and a dead-code gate. The example app is a
todo list: server actions, PostgreSQL on RDS behind Drizzle, and traces, logs and metrics in PostHog
(on Vercel) or in local JSONL files (everywhere else).
Working rules live in [AGENTS.md](AGENTS.md); each rule's rationale lives in [rules/](rules).

## Stack

| Layer          | Choice                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Runtime        | Node 24+, running TypeScript by type stripping; pnpm                                                   |
| Framework      | Next.js 16.4 (App Router, Cache Components, React Compiler), React 19.3                                |
| Language       | TypeScript 7.0.2 patched by `@effect/tsgo`, Effect 4                                                   |
| Data           | PostgreSQL 18.3 on RDS, Drizzle ORM 1.0, `pg`; RDS IAM auth through Vercel OIDC                        |
| Telemetry      | Effect's tracer and logger bridged to OpenTelemetry (`@vercel/otel`): PostHog or local JSONL           |
| UI             | shadcn (Base UI, `base-nova`), Tailwind 4                                                              |
| Infrastructure | Alchemy 2 on Effect, in [packages/platform/data-infrastructure](packages/platform/data-infrastructure) |
| Workspace      | pnpm workspaces and Turborepo: per-package typecheck and lint, cached                                  |
| Checks         | oxlint + tsgolint, oxfmt, superlint, style lint, fallow, lefthook                                      |

## How it fits together

- **Server first.** Pages are server components that are never async: a page builds a promise of its
  data and hands it to a client component that calls `use()` inside `<Suspense>`. A mutation is a server
  action built by `effectAction` from a contract (`@superstarter/todo-protocol/todo-contracts`): its name and its payload,
  success and error Schemas. The browser calls it through `callAction` as an Effect that fails with the
  contract's own error classes.
- **Effect inside, Promises at the edges.** Reads and writes are Effect values; Next's boundaries run them
  with `runRenderRead` (pages, tied to React's `cacheSignal`) and `effectAction` (server actions). Failures are
  `Schema.TaggedError` values in the type, never exceptions.
- **One database path.** `withApplicationPostgres` borrows a pooled connection that signed in as `app`
  with an RDS IAM token. `withPostgresStatement`, `withPostgresTransaction` and
  `withPostgresReadTransaction` lend a scope that can only build and run statements. Every transaction is
  SERIALIZABLE; a 40001 or 40P01 comes back as a typed `PostgresTransientFailure`. Primary keys are
  UUIDv7 minted by PostgreSQL, and there are no timestamp columns.
- **Typed telemetry.** Each operation in `OPERATIONAL_SPANS` declares its span name and the Schemas of
  every attribute its span may carry. `observed` wraps work in that span; `annotateOperation` writes a
  learned fact, and only types inside that operation's `observed`. Every log carries its span's
  attributes. Where it all goes is decided once, from the deployment (`telemetryBackend` in the app's
  `src/env.ts`):
  - **On Vercel** (production and preview), spans, logs and metrics export to PostHog over gzipped OTLP,
    flushed by `@vercel/otel` as each request ends; server exceptions go to PostHog Error Tracking, and
    posthog-js runs in the browser. The project token is required there. A batch PostHog refuses as too
    large (413) is halved and resent, as PostHog's SDK spec does; a single record it still refuses is
    dropped with a console receipt.
  - **Locally** (`pnpm dev`, a local `pnpm build`/`start`), nothing reaches PostHog and no token is read.
    Each signal is appended to the app's `out/telemetry/traces.jsonl`, `logs.jsonl` and `metrics.jsonl`, one
    OTLP/JSON export request per line (the OpenTelemetry Collector file exporter's format); server
    exceptions go to `out/telemetry/exceptions.jsonl` beside them; logs also print to the terminal; the browser
    starts no analytics. A request's spans and logs are written as soon as it ends; metrics once a minute.
- **Vercel-focused, never Vercel-dependent.** `pnpm db:local && pnpm dev`, a local `pnpm build && pnpm
  start` and `pnpm test` run with no env file and offline: every local default lives in an env module
  (`Config.withDefault`), the Geist font ships in the `geist` package, and telemetry stays on disk.
- **Config is code.** Each package that reads environment declares every variable it reads as an Effect
  `Config` in its own `src/env.ts` (the app, the infrastructure package). The database package reads none:
  connection facts are passed in. The browser never reads env; the server passes what the client needs.

## Setup

You need Node 24 or later, pnpm, a Vercel project, and an AWS account for the infrastructure.

```sh
pnpm install                 # also patches tsc with @effect/tsgo and installs the git hook
```

1. **Infrastructure.** Follow [packages/platform/data-infrastructure/README.md](packages/platform/data-infrastructure/README.md):
   bootstrap once, plan, deploy. The deploy prints `AWS_ROLE_ARN`, `DATABASE_HOST` and
   `DATABASE_ADMIN_SECRET_ARN`.
2. **Vercel project.** Set the project's Root Directory to `packages/product/nextjs-app` in the Vercel
   dashboard. The app's [vercel.json](packages/product/nextjs-app/vercel.json) installs the workspace
   with `pnpm install --frozen-lockfile` and builds with `pnpm run build`; Turbo does not run on Vercel.
3. **Environment.** Set those three in the Vercel project, and `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
   for its deployments ([the app's .env.example](packages/product/nextjs-app/.env.example) describes
   each), then pull them, with `VERCEL_OIDC_TOKEN`, into the app's `.env.local`. The database scripts read
   that file too. The PostHog token is only ever read on a Vercel deployment; locally, telemetry goes to
   the app's `out/telemetry/` and needs no env (the build needs none either):

   ```sh
   pnpm env:pull
   ```

   Set `NEXT_OTEL_VERBOSE=1` in Vercel as well if you want every Next.js framework span.

4. **Database.** `pnpm db:migrate apply` applies the reviewed migrations through Drizzle's native
   migrator, then the SQL programs: the `app` login, its `rds_iam` membership and its grants on `core`.
   It signs in as the RDS master user through the Vercel OIDC role, so no AWS keys are needed.
5. **Run locally.** `pnpm db:local` starts superstarter's own PostgreSQL 18 (Homebrew's, production's
   major) in the gitignored `out/postgres/`, on localhost:5434 with trust authentication, creating the
   cluster the first time; then it migrates the `superstarter` database and applies the programs. It is
   idempotent, so rerun it whenever. The app signs in to it as `app`, to `superstarter` unless
   `LOCAL_POSTGRES_DATABASE` names another (`pnpm test` names `superstarter_test`); no env file is needed.

   ```sh
   pnpm db:local
   pnpm dev
   ```

## Commands

Every command runs from the repository root. The checks go through `scripts/dev/check.ts`, which runs
Turborepo: a task whose inputs did not change replays its cached result, and a package's checks rerun
whenever a package it depends on changes. Concurrency comes from `--concurrency`, else
`CHECK_CONCURRENCY` in the shell, else in the root `.env.local`, else Turbo's default.

| Command                                  | What it does                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js, in the app package. `build` also typechecks with the patched `tsc`.                                                                                                                                                                                  |
| `pnpm check`                             | The gate, run by the pre-commit hook: every typecheck, superlint, oxlint, style lint, format check and fallow. Never writes.                                                                                                                                  |
| `pnpm typecheck`                         | `tsc` for every package (the app after `next typegen`) and for the root tooling.                                                                                                                                                                              |
| `pnpm lint`                              | Superlint for every package and the root tooling, the fixture self-tests (superlint's fixtures, the plugin rules' RuleTester cases), oxlint (type-aware, with the repository plugin) and fallow (unused files, exports, types and dependencies), in parallel. |
| `pnpm style`                             | The Tailwind token linter.                                                                                                                                                                                                                                    |
| `pnpm format` / `pnpm format:write`      | Check / write: strips every comment but JSDoc and tool directives, normalizes blank lines, then oxfmt.                                                                                                                                                        |
| `pnpm env:pull`                          | Vercel's development environment into the app's `.env.local`.                                                                                                                                                                                                 |
| `pnpm test`                              | Rebuilds the throwaway `superstarter_test` database from the migrations, then runs the prepared-statement suites and the todo lifecycle suite. Never cached, and not part of `pnpm check`.                                                                    |
| `pnpm db:local` / `pnpm db:local:stop`   | Start (creating it the first time) / stop the local PostgreSQL 18 on localhost:5434; `db:local` also migrates `superstarter` and applies the programs.                                                                                                        |
| `pnpm db:generate`                       | Draft a migration from schema changes. A person drafts and reviews every migration.                                                                                                                                                                           |
| `pnpm db:migrate status` / `apply`       | On RDS: packaged against applied migrations / apply the pending ones through the native migrator, then the SQL programs.                                                                                                                                      |
| `pnpm db:studio`                         | Drizzle Studio on RDS, signed in as the master user.                                                                                                                                                                                                          |

Schema changes are migrations only: there is no push and no ad hoc SQL. `db:generate` runs in
`@superstarter/database`, whose drizzle-kit config never connects; the other `db:*` commands are
operator scripts in `@superstarter/data-infrastructure`. Every statement the app runs is a declared
`preparePostgresStatement` in `@superstarter/database/queries/*`; the prepared-statement suite finds
each one through the compiler and PREPAREs it under `app` against the migrated test database, so a
column, grant or parameter PostgreSQL would refuse fails `pnpm test` instead of production.

## Strictness

- **TypeScript.** The root `tsconfig.json`, which every package extends, turns on `strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports`,
  `noImplicitReturns`, `erasableSyntaxOnly` and the unused checks.
- **Effect.** All 130 `@effect/tsgo` diagnostics are errors, suggestions included, so `tsc` refuses, for
  example:
  - `async` functions, native array, string and record methods, `Date`, `Math.random`, `process.env`,
    `console` and Node built-ins that Effect replaces;
  - an exported two-argument function without a pipeable form;
  - an error tag that differs from its class name.

  One exception: `unstableApiUsage` is off, because Effect's whole Node platform layer is marked unstable.
  Server actions need no exemption: `effectAction` returns a plain function, which Next accepts as a
  `"use server"` export.

- **oxlint** (`.oxlintrc.json`): the correctness and suspicious categories, every type-aware rule tsgolint
  offers (no floating promises, no unnecessary conditions, exhaustive switches with no needless default,
  strict boolean expressions), React, accessibility and Next.js rules, and no relative imports, Zod, `process.env`,
  `console` or inline styles. Five rules stay off on purpose:
  - `typescript/prefer-nullish-coalescing`: `??` is banned.
  - `typescript/promise-function-async`: `async` is banned.
  - `eslint/no-redeclare`: tsc reports redeclarations, and a Schema shares its type's name.
  - `typescript/consistent-return`: it contradicts `return yield*`, which tsgo requires for an Effect that only
    fails, and exhaustive switches with no `default`; tsc's `noImplicitReturns` proves every path returns.
  - `typescript/no-invalid-void-type`: oxlint's port refuses `void` as a generic argument
    (`Promise.withResolvers<void>()`), which the rule exists to allow.
- **The repository plugin** (`scripts/dev/oxlint-plugin.ts`, one rule per module in `scripts/dev/oxlint/rules/`,
  each with a RuleTester self-test, run by oxlint): no `try`, `as`, `??`, IIFEs, `new Error`, `instanceof
  Error`, evolving `null`/`[]` variables, needless template literals, untitled `<svg>`, literal
  `superstarter.*` keys on `Span.attribute`, telemetry ownership (who registers the SDK, constructs the
  OTLP exporters, starts posthog-js and opens spans), and Biome's cognitive complexity (at most 15).
- **Superlint** (`scripts/dev/lint.ts`): the opinionated type-aware rules on TypeScript 7's native API,
  including no null-and-undefined unions, no `||` fallbacks, no classes but Effect's, no timestamp columns
  or random UUIDs, no implicit Drizzle `SELECT *`, and no Drizzle `delete` or `update` without `.where()`.
- **Style lint** (`scripts/dev/style.ts`): every Tailwind class resolves against the theme in the app's
  `src/styles/globals.css`; no arbitrary colors, spacing, radii or shadows; every component carries a
  `data-slot`.

## Layout

```
packages/
  product/
    nextjs-app/             the Next app: pages, server actions and reads, telemetry registration, shadcn UI, env
    todo-protocol/          browser-safe types the database, server and browser share: todos, action contracts
  platform/
    operational-telemetry/  the span registry, the Effect→OTel bridge, PostHog and file export
    data-infrastructure/    Alchemy 2 stack (network, RDS, Vercel runtime role) and the database operator scripts
  data/
    database/               Drizzle schema (core.*), postgres pool/connection/transaction, query contracts, SQL programs
scripts/dev/                check launcher, superlint, oxlint plugin, formatter, style linter
rules/                      one document per rule: the rule and why
turbo.json                  the task graph: per-package typecheck and lint, root tooling tasks
tsconfig.json               the strict base every package extends, and the tooling program
```

## License

0BSD. See [LICENSE](LICENSE).
