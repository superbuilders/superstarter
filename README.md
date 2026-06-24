# Opinionated Next.js Starter with Biome & GritQL

[![Built with Biome](https://img.shields.io/badge/formatter-Biome-blueviolet?style=flat-square&logo=biome)](https://biomejs.dev)
[![Linted with GritQL](https://img.shields.io/badge/linter-GritQL-orange?style=flat-square)](https://www.grit.io/docs)

A comprehensive, highly-opinionated starter template for building robust and scalable full-stack applications. This template integrates Next.js with Drizzle ORM, Vercel Workflows, AWS RDS Postgres (IAM auth via OIDC), and a powerful, custom-enforced set of coding standards called the Superbuilder Ruleset, powered by Biome and GritQL.

The philosophy of this starter is simple: **prevent entire classes of bugs at the source**. By enforcing strict patterns for error handling, data consistency, and type safety, we aim to build applications that are not only fast and modern but also exceptionally maintainable and reliable.

## Core Technologies

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **Runtime**: [Bun](https://bun.sh/)
*   **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (with PostgreSQL)
*   **Async Workflows**: [Vercel Workflows](https://useworkflow.dev/) (`"use workflow"` / `"use step"` directives)
*   **Authentication**: [Clerk](https://clerk.com/) (plug-and-play auth)
*   **Infrastructure**: AWS via [Alchemy](https://alchemy.run) — see [`packages/superstarter-iac`](packages/superstarter-iac/README.md)
*   **Auth model**: Vercel ↔ AWS OIDC federation; runtime mints per-connection RDS IAM auth tokens (no DB password in env)
*   **Linting & Formatting**: [Biome](https://biomejs.dev/)
*   **Custom Static Analysis**: [GritQL](https://www.grit.io/)
*   **Environment Variables**: [T3 Env](https://env.t3.gg/)
*   **Error Handling**: A custom, robust error handling library (`@superbuilders/errors`)
*   **Logging**: [Pino](https://getpino.io/) via a centralised `@/logger`
*   **TypeScript**: [TypeScript 7.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/) via `tsgo` (with `@typescript/typescript6` aliased as `typescript` for tools that need the legacy peer)

## Getting Started

### Prerequisites

*   [Bun](https://bun.sh/) (1.3+)
*   AWS account with credentials in `~/.aws/credentials` and a default VPC in `us-east-1`
*   Vercel project (note its team slug + project name)

### Installation

1.  **Clone and install:**
    ```bash
    git clone https://github.com/superbuilders/superstarter.git
    cd superstarter
    bun install
    bunx lefthook install   # wires up the pre-commit hook (format + lint + typecheck)
    ```

2.  **Provision AWS infrastructure** (RDS Postgres, IAM OIDC provider, Vercel role):
    ```bash
    cd packages/superstarter-iac
    VERCEL_TEAM_SLUG=<slug> ALCHEMY_PASSWORD=<32+ char secret> bun run deploy
    cd ../..
    ```
    The deploy logs print the env vars to paste into Vercel and your local `.env`. See [`packages/superstarter-iac/README.md`](packages/superstarter-iac/README.md) for the full team workflow.

3.  **Set up environment variables:** Copy `.env.example` to `.env` and fill in the values from the IaC deploy output, plus your Clerk keys from [dashboard.clerk.com](https://dashboard.clerk.com):
    ```bash
    cp .env.example .env
    ```
    ```.env
    CLERK_SECRET_KEY="sk_test_..."
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
    ```

4.  **Bootstrap the database:**
    ```bash
    bun db:push:programs    # creates the `app` user, grants rds_iam, installs pgcrypto
    bun db:push             # pushes the table schema (core_todos, …)
    ```

5.  **Run the development server:**
    ```bash
    bun dev
    ```

Your application should now be running at `http://localhost:3000`.

## Authentication with Clerk

This starter includes [Clerk](https://clerk.com/) authentication pre-configured and ready to use. Clerk provides a complete user management solution with minimal setup required.

### What's Included

*   **Authentication Pages**: Pre-built `/login` and `/sso-callback` routes
*   **Middleware Setup**: Clerk middleware initialized (no protected routes by default)
*   **Type-Safe Metadata**: Extensible schema for storing custom user data
*   **Zero Configuration**: Works out of the box with just API keys

### Setting Up Clerk

1.  **Create a Clerk Application**: Sign up at [dashboard.clerk.com](https://dashboard.clerk.com) and create a new application
2.  **Copy Your API Keys**: Find them in your Clerk dashboard under "API Keys"
3.  **Enable Authentication Methods**: In your Clerk dashboard, configure:
    *   Social providers (Google, GitHub, etc.)
    *   Email/password authentication
    *   Any other methods you need

### Customizing User Metadata

The starter includes a flexible metadata schema at `src/lib/metadata/clerk.ts`. You can extend it to store custom user data:

```typescript
// Example: Adding custom fields to the metadata schema
export const ClerkUserPublicMetadataSchema = z.object({
    role: z.enum(["user", "admin"]).default("user"),
    onboardingCompleted: z.boolean().default(false),
    preferences: z.object({
        theme: z.enum(["light", "dark"]).default("light"),
        language: z.string().default("en")
    }).default({})
})
```

### Protecting Routes

By default, all routes are public. To protect specific routes, update the middleware:

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/api/protected(.*)"
])

export default clerkMiddleware((auth, req) => {
    if (isProtectedRoute(req)) {
        auth.protect()
    }
})
```

### Accessing User Data

In Server Components:
```typescript
import { currentUser } from "@clerk/nextjs/server"

const user = await currentUser()
// Access built-in fields: user?.firstName, user?.lastName, user?.emailAddresses
```

In Client Components:
```typescript
"use client"
import { useUser } from "@clerk/nextjs"

const { user, isLoaded, isSignedIn } = useUser()
```

## The Superbuilder Ruleset: Enforced Best Practices

This starter isn't just a collection of technologies; it's a prescriptive framework for writing high-quality code. The Superbuilder Ruleset is a set of development patterns enforced by Biome and our custom GritQL rules. These rules are not mere suggestions—they are compiled into the linter and will cause build errors if violated.

### Error Handling & Logging

We enforce a Go-inspired error handling pattern that favors explicit error checking over `try...catch` blocks.

<details>
<summary><strong>🚫 Ban <code>try...catch</code> and <code>new Error()</code></strong></summary>

**Rule:** Never use native `try...catch` blocks or `new Error()`. Instead, use the custom `errors.try()` wrapper and `errors.new()` / `errors.wrap()` for creating and propagating errors.

**Rationale:** This pattern makes error handling explicit and predictable. It eliminates hidden control flow from exceptions and forces developers to handle every potential failure point, creating more robust code.

**Enforced by:**
*   `gritql/no-try.grit`
*   `gritql/no-new-error.grit`

#### ✅ Correct
```typescript
import * as errors from "@superbuilders/errors";

const result = await errors.try(somePromise());
if (result.error) {
	throw errors.wrap(result.error, "failed to process something");
}
const data = result.data;

if (!isValid) {
	throw errors.new("validation failed: input is not valid");
}
```

#### ❌ Incorrect
```typescript
try {
	const data = await somePromise();
} catch (e) {
	throw new Error("Something went wrong");
}
```
</details>

<details>
<summary><strong>📜 Enforce Structured Logging</strong></summary>

**Rule:** All logging must use Pino via the centralised `@/logger` module. Log calls take an optional context object first and a string-literal message second.

**Rationale:** Structured logging produces machine-readable logs that are easy to parse, query, and monitor. Object-first calls keep messages terse and ensure context is never lost in a string.

**Enforced by:** `gritql/logger-structured-args.grit`

#### ✅ Correct
```typescript
import { logger } from "@/logger";

logger.info({ userId: user.id, plan: "premium" }, "user created");
logger.error({ error: err, attempt: 3 }, "database connection failed");
```

#### ❌ Incorrect
```typescript
console.log(`User ${user.id} was created with plan ${plan}.`);
logger.info("User created", user.id, "premium");
logger.info("user created: " + user.id);
```
</details>

### Database: UUIDv7 IDs, No Timestamp Columns

<details>
<summary><strong>🚫 No <code>timestamp</code> / <code>date</code> / <code>time</code> / <code>interval</code> columns. No <code>uuid().defaultRandom()</code>. Zero exceptions.</strong></summary>

**Rule:** Every PK is `uuid("id").primaryKey().notNull().default(sql\`uuidv7()\`)`. Drizzle's `timestamp`, `date`, `time`, and `interval` column factories are categorically banned. So is `defaultRandom()` on uuid columns (which generates UUIDv4 — random, not time-sortable).

**Rationale:** UUIDv7's first 48 bits are a unix-millisecond timestamp ([RFC 9562](https://www.rfc-editor.org/rfc/rfc9562)). Every row's creation time is already in its primary key, so a separate `createdAt` column is redundant — and the PK index serves as a free time-sorted index. PostgreSQL 18.3 (which the IaC provisions) has `uuidv7()` as a built-in function.

**Enforced by:**
- `scripts/dev/lint/rules/no-timestamp-columns.ts`
- `scripts/dev/lint/rules/no-uuid-default-random.ts`

**Helpers:** `src/db/lib/uuid-time.ts` exports `timestampFromUuidv7(id)` and `uuidv7LowerBound(date)`.

#### ✅ Correct
```typescript
import { sql } from "drizzle-orm"
import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core"

const coreTodos = pgTable("core_todos", {
    id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
    title: varchar("title", { length: 256 }).notNull(),
    completed: boolean("completed").notNull().default(false)
})

// Time-sorted scan via the PK index:
db.select(...).from(coreTodos).orderBy(desc(coreTodos.id))

// Recover creation time in app code:
import { timestampFromUuidv7 } from "@/db/lib/uuid-time"
const createdAt = timestampFromUuidv7(row.id)
```

#### ❌ Incorrect
```typescript
const coreTodos = pgTable("core_todos", {
    id: uuid("id").defaultRandom().primaryKey(),                                // UUIDv4 — banned
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),    // banned
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),             // banned
})
```

See [rules/no-timestamp-columns.md](rules/no-timestamp-columns.md) and [rules/no-uuid-default-random.md](rules/no-uuid-default-random.md) for the full rationale and the "but I really need a timestamp" answer (you don't).
</details>

<details>
<summary><strong>⚠️ Human-led Database Migrations</strong></summary>

**Rule:** Never run `drizzle-kit generate` or `bun db:generate` automatically. Database migrations must be handled by a human developer.

**Rationale:** Automated migration generation is dangerous and can lead to irreversible data loss. All schema changes require careful human review to assess impact, ensure data integrity, and plan for production deployment.

**Process:**
1.  Modify a table file in `src/db/schemas/<domain>/<table>.ts` (one table per file).
2.  **Manually** run `bun db:generate` to create a migration file.
3.  Carefully review the generated SQL migration.
4.  Apply with `bun db:push` or `bun db:migrate`.
</details>

### Type Safety & Data Consistency

<details>
<summary><strong>🚫 Ban Unsafe <code>as</code> Type Assertions</strong></summary>

**Rule:** The `as` keyword for type assertions is forbidden, with the sole exception of `as const` for creating immutable, literal types.

**Rationale:** The `as` keyword is a blind spot in TypeScript's type system. It tells the compiler to trust the developer's assertion, even if it's incorrect at runtime, leading to potential runtime errors. Safer alternatives like runtime validation (with Zod) or proper type narrowing should be used instead.

**Enforced by:** `gritql/no-as-type-assertion.grit`

#### ✅ Correct
```typescript
const command = 'start' as const;

if (typeof value === 'string') {
    // value is now safely typed as string
}
```

#### ❌ Incorrect
```typescript
const response: unknown = { id: 1 };
const user = response as { id: number; name: string };
```
</details>

<details>
<summary><strong>❓ Prefer <code>undefined</code> over <code>null</code></strong></summary>

**Rule:** Types must never include both `null` AND `undefined` at function boundaries. Prefer `undefined` (optionals) for all internal types; only use `null` when writing to an external API that requires it.

**Rationale:** JavaScript has two values for "nothing" which can lead to confusion and triple-state branching. Standardising on `undefined` aligns with TypeScript's optional syntax (`?:`) and modern idioms (optional chaining `?.`).

**Enforced by:** `super-lint.ts` rule `no-null-undefined-union`

#### ✅ Correct
```typescript
interface UserProfile {
    name: string;
    bio?: string;
}
```

#### ❌ Incorrect
```typescript
interface UserProfile {
    name: string;
    bio: string | null | undefined;
}
```
</details>

## Biome Configuration Highlights

Beyond the custom GritQL rules, this template uses a strict Biome configuration to enforce modern best practices. Here are some of the key rules enabled in `biome.json`:

*   `suspicious/noConsole`: (`error`) - Bans `console.log` and its variants, pushing developers to use the structured logger.
*   `complexity/noForEach`: (`error`) - Prefers `for...of` loops over `Array.prototype.forEach` for better performance and control flow (e.g., `break`, `continue`).
*   `style/noNonNullAssertion`: (`error`) - Forbids the `!` non-null assertion operator, promoting safer type guards.
*   `style/useTemplate`: (`error`) - Enforces the use of template literals over string concatenation.
*   `performance/noImgElement`: (`error`) - Recommends using Next.js's `<Image>` component for performance optimizations instead of the standard `<img>` tag.
*   `correctness/noUnusedVariables`: (`error`) - Keeps the codebase clean by flagging unused variables, imports, and function parameters.
*   ...and many more from the `recommended` ruleset.

## File Structure

```
.
├── gritql/                            # Custom GritQL linting rules
├── packages/
│   └── superstarter-iac/              # Alchemy IaC workspace (AWS RDS + OIDC + Vercel role)
├── public/                            # Static assets
├── rules/                             # Markdown documentation for custom rules
└── src/
    ├── app/                           # Next.js App Router
    │   ├── login/                     # Clerk sign-in page
    │   ├── sso-callback/              # Clerk SSO callback handler
    │   ├── page.tsx                   # Home page (server component)
    │   ├── content.tsx                # Client component (useOptimistic todos)
    │   ├── actions.ts                 # Server actions (revalidatePath after mutations)
    │   └── layout.tsx                 # Root layout (ClerkProvider)
    ├── components/ui/                 # shadcn/ui components
    ├── db/                            # Drizzle ORM
    │   ├── schemas/<domain>/<table>.ts  # One table per file
    │   ├── schema.ts                  # Barrel
    │   ├── index.ts                   # IAM-auth pool (app user, OIDC creds)
    │   ├── admin.ts                   # Admin pool (Secrets Manager) for scripts
    │   ├── programs/                  # SQL programs (app_user role, grants, pgcrypto)
    │   └── scripts/                   # drizzle-kit shim, push-programs, drop-schema
    ├── lib/                           # Shared utilities
    │   ├── metadata/                  # Clerk metadata schema
    │   └── utils.ts                   # cn() helper
    ├── workflows/                     # Vercel Workflow definitions ("use workflow")
    ├── styles/                        # Global styles
    ├── env.ts                         # Environment variable validation (T3 Env)
    ├── middleware.ts                  # Clerk middleware for auth
    └── logger.ts                      # Pino logger
```

## Available Commands

| Command                    | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `bun dev`                  | Starts the Next.js development server.                                     |
| `bun build`                | Builds the application for production.                                     |
| `bun start`                | Starts the production server.                                              |
| `bun typecheck`            | Runs TypeScript 7 type checking via `tsgo`.                                |
| `bun lint`                 | Runs Biome and the custom super-lint on staged files.                      |
| `bun lint:all`             | Runs Biome and super-lint across the whole repo.                           |
| `bun format`               | Strips comments and applies Biome formatting.                              |
| `bun db:generate`          | Generates a SQL migration file from schema changes.                        |
| `bun db:migrate`           | Applies pending migrations and runs `db:push:programs`.                    |
| `bun db:push`              | Pushes schema directly to the database and runs `db:push:programs`.        |
| `bun db:push:programs`     | Creates the `app` user, grants `rds_iam`, installs `pgcrypto`.             |
| `bun db:studio`            | Opens Drizzle Studio.                                                      |
| `bun db:drop:schema`       | **DANGER:** Drops the named schema(s) using admin credentials.             |
