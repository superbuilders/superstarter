# Opinionated Next.js Starter with Biome & GritQL

[![Built with Biome](https://img.shields.io/badge/formatter-Biome-blueviolet?style=flat-square&logo=biome)](https://biomejs.dev)
[![Linted with GritQL](https://img.shields.io/badge/linter-GritQL-orange?style=flat-square)](https://www.grit.io/docs)

A comprehensive, highly-opinionated starter template for building robust and scalable full-stack applications. This template integrates Next.js with Drizzle ORM, Inngest, and a powerful, custom-enforced set of coding standards called the Superbuilder Ruleset, powered by Biome and GritQL.

The philosophy of this starter is simple: **prevent entire classes of bugs at the source**. By enforcing strict patterns for error handling, data consistency, and type safety, we aim to build applications that are not only fast and modern but also exceptionally maintainable and reliable.

## Core Technologies

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (with PostgreSQL)
*   **Background Jobs**: [Inngest](https://www.inngest.com/)
*   **Linting & Formatting**: [Biome](https://biomejs.dev/)
*   **Custom Static Analysis**: [GritQL](https://www.grit.io/)
*   **Environment Variables**: [T3 Env](https://env.t3.gg/)
*   **Error Handling**: A custom, robust error handling library (`@superbuilders/errors`)
*   **Logging**: A structured logging library (`@superbuilders/slog`)

## Getting Started

### Prerequisites

*   [Bun](https://bun.sh/)
*   Node.js
*   A PostgreSQL database

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/superbuilders/superstarter.git
    cd superstarter
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Set up environment variables:**
    Copy the `src/env.js` file's `server` schema to a new `.env` file and fill in your database connection string.
    ```bash
    cp .env.example .env
    ```
    Your `.env` file should look like this:
    ```.env
    DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
    ```

4.  **Push the database schema:**
    This command will sync your Drizzle schema with your database.
    ```bash
    bun db:push
    ```

5.  **Run the development server:**
    ```bash
    bun dev
    ```

Your application should now be running at `http://localhost:3000`.

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

// Wrapping a function that might fail
const result = await errors.try(somePromise());
if (result.error) {
	// Propagate the error with additional context
	throw errors.wrap(result.error, "failed to process something");
}
const data = result.data; // data is safely available here

// Creating a new error
if (!isValid) {
	throw errors.new("validation failed: input is not valid");
}
```

#### ❌ Incorrect
```typescript
try {
	const data = await somePromise();
} catch (e) {
	// Unstructured, inconsistent error handling
	throw new Error("Something went wrong");
}
```
</details>

<details>
<summary><strong>📜 Enforce Structured Logging</strong></summary>

**Rule:** All logging must use the `@superbuilders/slog` library. Log messages must be terse, with all context provided as a key-value object. Never use string interpolation or pass more than two arguments (message and context).

**Rationale:** Structured logging produces machine-readable logs that are easy to parse, query, and monitor. It enforces consistency and ensures that critical context is never lost in a simple string. For Inngest functions, always use the `logger` provided in the function arguments to ensure proper log flushing in serverless environments.

**Enforced by:** `gritql/logger-structured-args.grit`

#### ✅ Correct
```typescript
import * as logger from "@superbuilders/slog";

logger.info("user created", { userId: user.id, plan: "premium" });
logger.error("database connection failed", { error: err, attempt: 3 });
```

#### ❌ Incorrect
```typescript
// Banned: String interpolation
console.log(`User ${user.id} was created with plan ${plan}.`);

// Banned: Non-structured logging call (too many arguments)
logger.info("User created", user.id, "premium");

// Banned: First argument is not a simple string
logger.info("user created: " + user.id);
```
</details>

### Database & Background Jobs (Drizzle & Inngest)

<details>
<summary><strong>🚫 Ban <code>db.select</code> inside Inngest <code>step.run()</code></strong></summary>

**Rule:** Using `db.select()` or similar data-fetching methods inside an Inngest `step.run()` closure is strictly prohibited.

**Rationale:** The output of `step.run()` is serialized to JSON and sent over the network for memoization. Fetching and returning large database payloads can cause severe performance degradation, network bloat, and potential "request entity too large" errors. Data should be fetched *before* `step.run()`, or a dedicated data-fetching function should be called via `step.invoke()`.

**Enforced by:** `gritql/no-db-select-in-step-run.grit`

#### ✅ Correct
```typescript
// Fetch data BEFORE the step
const user = await db.query.users.findFirst({ where: eq(users.id, event.data.userId) });

// Pass only essential primitives into the step if needed
const result = await step.run("process-user-action", async () => {
    return await someExternalApiCall({ externalId: user.externalId });
});
```

#### ❌ Incorrect
```typescript
const userPayload = await step.run("fetch-user", async () => {
    // This entire user object would be serialized and sent over HTTP
    return await db.query.users.findFirst({ where: eq(users.id, event.data.userId) });
});
```
</details>

<details>
<summary><strong>⚠️ Human-led Database Migrations</strong></summary>

**Rule:** Never run `drizzle-kit generate` or `bun db:generate` automatically. Database migrations must be handled by a human developer.

**Rationale:** Automated migration generation is dangerous and can lead to irreversible data loss. All schema changes require careful human review to assess impact, ensure data integrity, and plan for production deployment.

**Process:**
1.  Modify the schema files in `src/db/schemas/`.
2.  **Manually** run `bun db:generate` to create a migration file.
3.  Carefully review the generated SQL migration.
4.  Apply the migration with `bun db:push` or a similar command.
</details>

### Type Safety & Data Consistency

<details>
<summary><strong>🚫 Ban Unsafe <code>as</code> Type Assertions</strong></summary>

**Rule:** The `as` keyword for type assertions is forbidden, with the sole exception of `as const` for creating immutable, literal types.

**Rationale:** The `as` keyword is a blind spot in TypeScript's type system. It tells the compiler to trust the developer's assertion, even if it's incorrect at runtime, leading to potential runtime errors. Safer alternatives like runtime validation (with Zod) or proper type narrowing should be used instead.

**Enforced by:** `gritql/no-as-type-assertion.grit`

#### ✅ Correct
```typescript
// Allowed for const assertions
const command = 'start' as const;

// Safe type narrowing
if (typeof value === 'string') {
    // value is now safely typed as string
}
```

#### ❌ Incorrect
```typescript
const response: unknown = { id: 1 };

// This is an unsafe cast and is banned.
// If `response` doesn't have a `name` property, it will cause a runtime error.
const user = response as { id: number; name: string };
```
</details>

<details>
<summary><strong>❓ Prefer <code>undefined</code> over <code>null</code></strong></summary>

**Rule:** The use of `null` is forbidden in type declarations (annotations, aliases, generics). Always use `undefined` for representing missing or absent values.

**Rationale:** JavaScript has two values for "nothing" (`null` and `undefined`), which can lead to confusion and boilerplate checks. By standardizing on `undefined`, we simplify logic, align with modern JavaScript idioms (e.g., optional chaining `?.`), and create a more consistent codebase.

**Enforced by:** `gritql/prefer-undefined-over-null.grit`

#### ✅ Correct
```typescript
const [value, setValue] = React.useState<string | undefined>(undefined);

type UserProfile = {
    name: string;
    bio: string | undefined;
}
```

#### ❌ Incorrect
```typescript
const [value, setValue] = React.useState<string | null>(null);

type UserProfile = {
    name: string;
    bio: string | null;
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

The project follows a feature-colocated structure within the Next.js `src/app` directory.

```
.
├── gritql/                  # Custom GritQL linting rules
├── public/                  # Static assets
├── rules/                   # Markdown documentation for custom rules
└── src/
    ├── app/                 # Next.js App Router
    │   ├── api/             # API routes (e.g., for Inngest)
    │   ├── page.tsx         # Home page component
    │   └── layout.tsx       # Root layout
    ├── db/                  # Drizzle ORM setup
    │   ├── schemas/         # Database table schemas
    │   ├── scripts/         # Utility scripts (e.g., drop schema)
    │   └── index.ts         # Drizzle client instance
    ├── inngest/             # Inngest client and functions
    │   ├── functions/       # Inngest function definitions
    │   └── client.ts        # Inngest client initialization
    ├── styles/              # Global styles
    ├── env.js               # Environment variable validation (T3 Env)
    └── biome.json           # Biome linter and formatter configuration
```

## Available Commands

| Command             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `bun build`         | Builds the application for production.               |
| `bun check`         | Runs Biome linter and formatter checks.              |
| `bun check:unsafe`  | Runs Biome checks with unsafe auto-fixes applied.    |
| `bun check:write`   | Runs Biome checks and applies safe auto-fixes.       |
| `bun db:generate`   | Generates a SQL migration file from schema changes.  |
| `bun db:migrate`    | Applies pending database migrations.                 |
| `bun db:push`       | Pushes schema changes directly to the database.      |
| `bun db:studio`     | Opens the Drizzle Studio to browse your data.        |
| `bun db:drop`       | **DANGER:** Drops the database schema.              |
| `bun dev`           | Starts the development server with Turbo.            |
| `bun dev:inngest`   | Starts the Inngest development server.               |
| `bun preview`       | Builds and starts the production server.             |
| `bun start`         | Starts the production server.                        |
| `bun typecheck`     | Runs TypeScript type checking and Biome formatting.  |