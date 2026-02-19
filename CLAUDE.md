# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## Commands

| Command | Purpose |
|---------|---------|
| `bun dev` | Next.js dev server (port 3000) |
| `bun build` | Production build |
| `bun start` | Run production server |
| `bun lint` | Biome + GritQL + super-lint (staged files only) |
| `bun lint:all` | Lint entire codebase |
| `bun format` | Strip comments + Biome format |
| `bun style` | Design token / Tailwind enforcement |
| `bun typecheck` | TypeScript type checking (`tsc`) |
| `bun db:generate` | Generate Drizzle migration (human-only, never run automatically) |
| `bun db:push` | Push schema to database |
| `bun db:migrate` | Apply pending migrations |
| `bun db:studio` | Open Drizzle Studio |
| `bun db:drop` | Drop schema (DANGER) |
| `bun dev:inngest` | Start Inngest local dev server |

Run a single lint rule: `bun scripts/dev/lint.ts src/path/to/file.ts`
Run style check on directory: `bun scripts/dev/style.ts src/app/`

## Architecture

**Stack:** Next.js 16 (App Router) + Drizzle ORM (PostgreSQL) + Inngest (background jobs) + Tailwind CSS 4 + Zod 4 + shadcn/ui

### Source Layout

```
src/
├── app/           # Next.js App Router pages, layouts, server actions
│   └── api/       # API routes (Inngest webhook)
├── components/ui/ # shadcn/ui components (excluded from linting)
├── db/
│   ├── schemas/   # Drizzle schema definitions (core.ts)
│   ├── scripts/   # DB utility scripts
│   └── index.ts   # Drizzle client (drizzle-orm/bun-sql dialect)
├── inngest/
│   ├── functions/ # Inngest function definitions
│   └── index.ts   # Inngest client, event schemas, realtime middleware
├── lib/utils.ts   # cn() utility (tailwind-merge + clsx)
└── env.ts         # T3 Env: Zod-validated environment variables
```

```
scripts/
├── dev/
│   ├── lint.ts    # super-lint: type-aware linter (complements Biome)
│   ├── style.ts   # style linter: design token enforcement
│   └── fmt.ts     # custom formatter (comment stripping, blank lines, exports)
└── agents/        # Agent-related scripts
```

### Three-Layer Linting

1. **Biome** (`biome.json` → `biome/base.json`) — formatting + standard lint rules
2. **GritQL plugins** (`gritql/*.grit`) — 11 custom static analysis rules registered as Biome plugins
3. **super-lint** (`scripts/dev/lint.ts`) — 11 type-aware rules using TypeScript's type checker

All three run via `bun lint`. GritQL rules catch patterns statically; super-lint catches patterns requiring type information (e.g., null-undefined unions, impossible conditions, pointless indirection).

### Import Aliases

- `@/*` → `./src/*`
- `@scripts/*` → `./scripts/*`

All imports MUST use `@/` prefix. Relative imports (`./`, `../`) are banned.

### Database

- Drizzle ORM with PostgreSQL via `drizzle-orm/bun-sql`
- Schema in `src/db/schemas/core.ts`, filtered to `"core"` schema
- Drizzle config: `drizzle.config.ts`
- Never run `bun db:generate` automatically — migrations are human-reviewed

### Inngest

- Client in `src/inngest/index.ts` with checkpointing, event schemas, realtime middleware
- Functions in `src/inngest/functions/`
- Inngest logger pipes to `@superbuilders/slog`
- Type context pattern: `Context<typeof inngest, EventKey, Overrides>`
- In Inngest functions, use the `logger` parameter, not imported slog

### Environment

- Validated via T3 Env + Zod in `src/env.ts`
- Required: `DATABASE_URL`
- Optional: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, Vercel vars
- Skip validation with `SKIP_ENV_VALIDATION=1`

## Enforced Code Patterns

These are enforced by lint — violations are errors, not warnings.

### Error Handling

```typescript
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// Async: errors.try() — MUST check result.error on next line
const result = await errors.try(somePromise)
if (result.error) {
    logger.error("operation failed", { error: result.error })
    throw errors.wrap(result.error, "operation context")
}
const data = result.data

// Sync: errors.trySync()
const parsed = errors.trySync(() => JSON.parse(input))
if (parsed.error) {
    logger.error("parse failed", { error: parsed.error })
    throw errors.wrap(parsed.error, "JSON.parse")
}

// Own errors: errors.new() — never new Error()
logger.error("user not found", { userId })
throw errors.new("user not found")

// Sentinel pattern for domain errors
const ErrNotFound = errors.new("not found")
throw errors.wrap(ErrNotFound, `user id '${id}'`)
if (errors.is(err, ErrNotFound)) { /* handle */ }
```

**Banned:** `try/catch/finally`, `new Error()`, `extends Error`, `instanceof Error`

### Logging

```typescript
import * as logger from "@superbuilders/slog"

// Terse message + context object (max 2 args)
logger.info("starting import", { file: path, count: 1000 })
logger.error("query failed", { error: result.error })
```

**Banned:** `console.*`, template literals in messages, `.toString()` on errors (automatic), manual `cause` property

### Module Pattern

```typescript
// Named function declarations — no arrow functions (except trivial inline callbacks)
function processUser(user: User) { /* ... */ }

// No classes, no object namespaces — use ESM modules
// Multiple instances? Factory function returning object

// Exports at end — no inline exports
export { processUser }
export type { User }
```

### Type Safety

- No `as` assertions (except `as const` and DOM types)
- No `any` — use proper types or Zod runtime validation
- Zod: always `safeParse`, never `parse`
- No `??` nullish coalescing — fix the source
- No `||` for fallbacks — only in boolean conditions
- No optional arrays — use `[]` for empty
- No `null | undefined` unions — pick one (prefer `undefined`)
- No inline styles — Tailwind only
- No inline ternaries — extract to `const` (assignment/return OK)

### React Server Components

Follow the `page.tsx` + `content.tsx` pattern:

- **`page.tsx`** (Server Component, NOT async): colocate Drizzle queries, export derived types, chain promises via `.then()`, wrap child in `<Suspense>`
- **`content.tsx`** (Client Component, `"use client"`): consume promises with `React.use()`, handle interactivity

Never `await` in server components. Pass promises as props.

### Cleanup / Resource Management

Use `DisposableStack` / `AsyncDisposableStack` instead of `try/finally`:

```typescript
await using stack = new AsyncDisposableStack()
const conn = await openConnection()
stack.defer(async () => await conn.close())
```

### Style Linting

Design token enforcement via `bun style`:
- No arbitrary colors, spacing, radius, shadows — use theme tokens
- Components must have `data-slot` on top-level element
- No duplicate `data-slot` values across components

### Formatting

- Tabs, double quotes, no semicolons, trailing commas: none
- Line width: 100
- Tailwind classes auto-sorted
