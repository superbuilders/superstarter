# 18 Seconds

[![Built with Biome](https://img.shields.io/badge/formatter-Biome-blueviolet?style=flat-square&logo=biome)](https://biomejs.dev)
[![Linted with GritQL](https://img.shields.io/badge/linter-GritQL-orange?style=flat-square)](https://www.grit.io/docs)

A CCAT (Criteria Cognitive Aptitude Test) practice app that distinguishes itself from competitor question-banks by being a **mastery engine**. It tracks per-sub-type performance, generates new practice items on demand, and trains the strategic skill of triaging questions at the 18-second mark.

Built on top of the [Superbuilder superstarter](https://github.com/superbuilders/superstarter) scaffold. The scaffold's conventions and tooling are preserved verbatim; this repo adds the product on top.

---

## Documentation

The product and engineering decisions live in `docs/`. Read in this order:

| Document | Purpose |
| --- | --- |
| [`docs/PRD.md`](docs/PRD.md) | Product requirements — what 18 Seconds does and why |
| [`docs/architecture_plan.md`](docs/architecture_plan.md) | One-page overview of the system shape; read this before opening the SPEC |
| [`docs/SPEC.md`](docs/SPEC.md) | Engineering specification — file paths, schemas, server actions |
| [`docs/design_decisions.md`](docs/design_decisions.md) | Audit trail of every architectural decision and its rationale |
| [`docs/phase-1-manual-verification.md`](docs/phase-1-manual-verification.md) | Checklist for verifying Phase 1's auth flow end-to-end |

If you're a reviewer skimming this for the first time, the architecture plan is the document that orients fastest.

---

## Status

The build is sequenced in six phases over a two-week window, per the architecture plan's "Build sequencing" section.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 — Foundations | Auth, schemas, pgvector, configs, seeds | In progress (manual auth verification pending) |
| 2 — Real-item path | Admin ingest, ~150 hand-seeded items, embedding backfill | Not started |
| 3 — Practice surface | Focus shell, diagnostic, Mastery Map, drills, heartbeats | Not started |
| 4 — Generation pipeline | Generator + validator + scorer + deployer + admin dashboard | Not started |
| 5 — Engine completeness | Adaptive difficulty, SR queue, NarrowingRamp, full-length test | Not started |
| 6 — Polish & cuts | Simulation, history, candidate-promotion cron, account deletion | Not started |

**v1 scope is text-only.** 11 sub-types (5 verbal + 6 numerical). Abstract reasoning, attention-to-detail, and `numerical.data_interpretation` are deferred — they require image rendering, image storage, and visual item authoring that v1 cuts. Users prepping for the full CCAT need to know v1 doesn't cover roughly 30% of the test sections; the post-diagnostic review surfaces this explicitly.

---

## Core Technologies

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, `proxy.ts` for route gating)
- **Runtime**: [Bun](https://bun.sh/)
- **Database**: PostgreSQL 18 with [`pgvector`](https://github.com/pgvector/pgvector) extension
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [Auth.js v5](https://authjs.dev/) (Google OAuth, database sessions) via a custom Drizzle adapter shim that preserves `bigint(_ms)` time columns
- **LLMs** (Phase 4+): [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) (Claude Sonnet) for generation; [OpenAI SDK](https://github.com/openai/openai-node) (GPT-4o + `text-embedding-3-small`) for validation and uniqueness
- **Async workflows**: [Vercel Workflows](https://useworkflow.dev/) (`"use workflow"` / `"use step"` directives)
- **Infrastructure** (production): AWS RDS via [Alchemy](https://alchemy.run) IaC with Vercel ↔ AWS OIDC federation
- **Linting & Formatting**: [Biome](https://biomejs.dev/) + custom [GritQL](https://www.grit.io/) rules (the Superbuilder Ruleset)
- **Environment Variables**: [T3 Env](https://env.t3.gg/)
- **Error Handling**: [`@superbuilders/errors`](https://github.com/superbuilders/errors)
- **Logging**: [Pino](https://getpino.io/) via a centralised `@/logger`
- **TypeScript**: [TypeScript 7.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/) via `tsgo`

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3+
- [Docker](https://docs.docker.com/get-docker/) (for the local Postgres container)
- A Google Cloud Console OAuth 2.0 client (instructions below)
- Optional: AWS account with Vercel team for production-shape testing

### Local development (recommended)

The week-1 build path uses a local `pgvector/pgvector:pg18` Docker container. AWS RDS provisioning isn't required for Phases 1–3.

1. **Clone and install:**

   ```bash
   git clone <this repo>
   cd 18seconds
   bun install
   bunx lefthook install   # wires up the pre-commit hook (format + lint + typecheck)
   ```

2. **Start the local Postgres container:**

   ```bash
   docker compose up -d
   ```

   Pinned to `pgvector/pgvector:pg18` in `docker-compose.yml`. Data persists in the named `18seconds_pgdata` volume across restarts. If you already have something on `localhost:5432`, the compose file maps to a non-default host port — check `docker ps` for the actual mapping.

3. **Set up the OAuth client.** In [Google Cloud Console](https://console.cloud.google.com):
   - **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**.
   - Application type: Web application.
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Copy the Client ID and Client Secret.

   If you haven't configured the OAuth consent screen yet, do that first (External, with your email as both support and developer contact). Add yourself as a test user under **OAuth consent screen → Test users**.

4. **Configure environment variables.** Copy `.env.example` to `.env` and fill in the values:

   ```dotenv
   # Database — local Docker
   DATABASE_LOCAL_URL=postgres://postgres:postgres@localhost:5432/postgres

   # Auth.js
   AUTH_SECRET=<generate via: openssl rand -base64 32>
   AUTH_GOOGLE_ID=<from step 3>
   AUTH_GOOGLE_SECRET=<from step 3>

   # LLM — placeholders are fine for Phases 1–3; real keys needed in Phase 4
   ANTHROPIC_API_KEY=sk-ant-placeholder
   OPENAI_API_KEY=sk-placeholder

   # Cron — used by Phase 6, but env validation requires it now
   CRON_SECRET=<generate via: openssl rand -base64 32>
   ```

   Adjust the port in `DATABASE_LOCAL_URL` to match what `docker compose` actually exposed. With `DATABASE_LOCAL_URL` set, the database modules (`src/db/index.ts`, `src/db/admin.ts`, `src/db/scripts/drizzle-kit-shim.ts`) skip the AWS RDS Signer + Secrets Manager path and use a plain `pg` connection. `db:push:programs` also skips the `GRANT rds_iam` line (vanilla Postgres has no `rds_iam` role).

5. **Apply programs, migrations, and seeds:**

   ```bash
   bun db:push:programs    # creates the `app` user, installs pgcrypto + pgvector
   bun db:migrate          # applies drizzle/0000_*.sql
   bun db:seed             # inserts 11 sub_types and 33 strategies
   ```

6. **Start the dev server:**

   ```bash
   bun dev
   ```

   Navigate to `http://localhost:3000` — middleware redirects unauthenticated users to `/login`, where the Google sign-in button completes the OAuth flow.

7. **Verify Phase 1 end-to-end.** Run through [`docs/phase-1-manual-verification.md`](docs/phase-1-manual-verification.md) — covers schema spot-checks, OAuth round-trip, sign-out and re-sign-in, and the `/api/health` endpoint. About 15 minutes if everything works on the first try.

### Resetting the local database

```bash
docker compose down -v
```

Removes the `18seconds_pgdata` volume; the next `docker compose up -d` starts fresh. Re-run programs + migrate + seed afterward.

### Production-shape (AWS RDS)

When you're ready to test against the production deployment topology — typically late Phase 2 or early Phase 4 — comment out (or unset) `DATABASE_LOCAL_URL` and provide `AWS_ROLE_ARN`, `DATABASE_HOST`, and `DATABASE_ADMIN_SECRET_ARN`. No code changes required.

Provision the AWS infrastructure via the Alchemy IaC workspace:

```bash
cd packages/superstarter-iac
VERCEL_TEAM_SLUG=<slug> ALCHEMY_PASSWORD=<32+ char secret> bun run deploy
cd ../..
```

The deploy logs print the env vars to paste into Vercel and your local `.env`. See [`packages/superstarter-iac/README.md`](packages/superstarter-iac/README.md) for the full team workflow.

The architecture plan calls for landing production as a Vercel **preview deployment first**; promotion to production is a one-click move at launch.

---

## Project Structure

```
.
├── docs/                              # Product + engineering specifications
│   ├── PRD.md                         # Product requirements
│   ├── architecture_plan.md           # System overview (read first)
│   ├── SPEC.md                        # Engineering spec (file paths, schemas)
│   ├── design_decisions.md            # Decision audit trail
│   └── phase-1-manual-verification.md # Phase 1 verification checklist
├── docker-compose.yml                 # Local pgvector/pgvector:pg18 container
├── drizzle/                           # Generated SQL migrations
├── gritql/                            # Custom GritQL linting rules (Superbuilder Ruleset)
├── packages/
│   └── superstarter-iac/              # Alchemy IaC workspace (AWS RDS + OIDC + Vercel role)
├── rules/                             # Markdown documentation for custom rules
└── src/
    ├── app/                           # Next.js App Router
    │   ├── api/auth/[...nextauth]/    # Auth.js route handler
    │   ├── api/health/                # Health probe (bypasses auth)
    │   ├── login/                     # Google sign-in page
    │   └── layout.tsx                 # Root layout
    ├── auth/
    │   └── drizzle-adapter-shim.ts    # Date ↔ epoch-ms shim for Auth.js + bigint columns
    ├── auth.ts                        # Auth.js v5 instance (server-only)
    ├── auth.config.ts                 # Edge-safe Auth.js config (no DB imports)
    ├── proxy.ts                       # Next.js 16 route gating (formerly middleware.ts)
    ├── components/ui/                 # shadcn/ui components
    ├── config/                        # 18 Seconds config (sub-types, strategies, templates)
    │   ├── sub-types.ts               # 11 v1 sub-types with latency thresholds
    │   ├── strategies.ts              # 3 strategies × 11 sub-types = 33 strategies
    │   ├── admins.ts                  # Admin email allowlist
    │   ├── item-templates.ts          # LLM generation prompt templates per sub-type
    │   ├── diagnostic-mix.ts          # Hand-tuned 50-row diagnostic composition
    │   └── difficulty-curves.ts       # Per-decile difficulty mix for full-length test
    ├── db/                            # Drizzle ORM
    │   ├── schemas/
    │   │   ├── auth/                  # users, accounts, sessions, verification_tokens
    │   │   ├── catalog/               # sub_types, strategies, items
    │   │   ├── practice/              # practice_sessions, attempts, mastery_state
    │   │   ├── review/                # review_queue
    │   │   └── ops/                   # strategy_views, candidate_promotion_log
    │   ├── schema.ts                  # Schema barrel
    │   ├── index.ts                   # App pool (IAM auth in prod, password locally)
    │   ├── admin.ts                   # Admin pool (Secrets Manager in prod, password locally)
    │   ├── lib/
    │   │   ├── pgvector.ts            # Drizzle custom column type for vector(1536)
    │   │   └── uuid-time.ts           # timestampFromUuidv7, uuidv7LowerBound helpers
    │   ├── programs/                  # SQL programs (extensions, app_user role, grants)
    │   └── scripts/                   # drizzle-kit shim, push-programs, seed
    ├── workflows/                     # Vercel Workflow definitions ("use workflow")
    ├── styles/                        # Global styles
    ├── env.ts                         # Environment variable validation (T3 Env)
    └── logger.ts                      # Pino logger
```

---

## Available Commands

| Command | Description |
| --- | --- |
| `bun dev` | Starts the Next.js development server. |
| `bun build` | Builds the application for production. |
| `bun start` | Starts the production server. |
| `bun typecheck` | Runs TypeScript 7 type checking via `tsgo`. |
| `bun lint` | Runs Biome and the custom super-lint on staged files. |
| `bun lint:all` | Runs Biome and super-lint across the whole repo. |
| `bun format` | Strips comments and applies Biome formatting. |
| `bun test` | Runs the Bun test suite (e.g., the auth shim's round-trip tests). |
| `bun db:generate` | Generates a SQL migration file from schema changes. **Human-led only**; never automate. |
| `bun db:migrate` | Applies pending migrations and runs `db:push:programs`. |
| `bun db:push` | Pushes schema directly to the database and runs `db:push:programs`. |
| `bun db:push:programs` | Creates the `app` user, grants `rds_iam` (skipped locally), installs `pgcrypto` and `pgvector`. |
| `bun db:seed` | Seeds the `sub_types` and `strategies` tables from `src/config/`. |
| `bun db:studio` | Opens Drizzle Studio. |
| `bun db:drop:schema` | **DANGER:** Drops the named schema(s) using admin credentials. |

---

## The Superbuilder Ruleset (Inherited Conventions)

This repo inherits the [Superbuilder Ruleset](https://github.com/superbuilders/superstarter) — a set of opinionated patterns enforced by Biome and custom GritQL rules. The rules are not suggestions; they're compiled into the linter and will fail the build if violated. The full per-rule rationale lives under [`rules/`](rules/); the canonical examples are in [`gritql/`](gritql/).

The summary below is intentionally brief — for the full discussion, read the markdown files under `rules/`.

### Error Handling & Logging

<details>
<summary><strong>🚫 Ban <code>try...catch</code> and <code>new Error()</code></strong></summary>

Use the `errors.try()` wrapper and `errors.new()` / `errors.wrap()` for creating and propagating errors. Makes error handling explicit and forces every failure point to be addressed.

```typescript
import * as errors from "@superbuilders/errors"

const result = await errors.try(somePromise())
if (result.error) {
    throw errors.wrap(result.error, "failed to process something")
}
const data = result.data
```

Enforced by `gritql/no-try.grit` and `gritql/no-new-error.grit`.
</details>

<details>
<summary><strong>📜 Structured logging via <code>@/logger</code></strong></summary>

All logging goes through Pino via the centralised `@/logger` module. Object-first, message-string-second. Message must be a string literal, never a template literal.

```typescript
import { logger } from "@/logger"

logger.info({ userId: user.id, plan: "premium" }, "user created")
logger.error({ error: err, attempt: 3 }, "database connection failed")
```

Enforced by `gritql/logger-structured-args.grit`.
</details>

<details>
<summary><strong>🪵 Every <code>throw</code> is preceded by a logger call</strong></summary>

The line immediately before any `throw` must be a `logger.{error,warn,info,debug}` call. This pattern means observability has the same coverage as error paths — you never lose context on a thrown error.

Enforced by `gritql/require-logger-before-throw.grit`.
</details>

### Database

<details>
<summary><strong>🚫 No <code>timestamp</code> / <code>date</code> / <code>time</code> / <code>interval</code> columns</strong></summary>

Every PK is `uuid("id").primaryKey().notNull().default(sql\`uuidv7()\`)`. Drizzle's `timestamp`, `date`, `time`, and `interval` column factories are categorically banned. Time columns use `bigint("col_name", { mode: "number" })` with the `_ms` suffix.

UUIDv7's first 48 bits are a unix-millisecond timestamp ([RFC 9562](https://www.rfc-editor.org/rfc/rfc9562)), so a row's creation time is already in its primary key. PostgreSQL 18 has `uuidv7()` as a built-in function. Helpers in `src/db/lib/uuid-time.ts` cover `timestampFromUuidv7(id)` and `uuidv7LowerBound(date)` for the cases where you need the inverse.

```typescript
const items = pgTable("items", {
    id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
    started_at_ms: bigint("started_at_ms", { mode: "number" }).notNull(),
    ended_at_ms: bigint("ended_at_ms", { mode: "number" }),
})
```

Enforced by `scripts/dev/lint/rules/no-timestamp-columns.ts` and `scripts/dev/lint/rules/no-uuid-default-random.ts`.
</details>

<details>
<summary><strong>⚠️ Human-led migrations</strong></summary>

Never run `drizzle-kit generate` or `bun db:generate` automatically. All schema changes require human review. The process: edit a table file, run `bun db:generate` manually, review the SQL, apply with `bun db:push` or `bun db:migrate`.
</details>

### Type Safety

<details>
<summary><strong>🚫 No unsafe <code>as</code> type assertions</strong></summary>

The `as` keyword is forbidden, with the sole exception of `as const`. Use Zod's `safeParse` for runtime validation or proper type narrowing instead.

Enforced by `gritql/no-as-type-assertion.grit`.
</details>

<details>
<summary><strong>❓ Prefer <code>undefined</code> over <code>null</code> at boundaries</strong></summary>

Function boundaries must never accept or return `T | null | undefined`. Prefer `undefined` (optionals) for all internal types; only use `null` when writing to an external API that requires it. Normalize at the boundary with `z.preprocess`.

Enforced by `super-lint.ts` rule `no-null-undefined-union`.
</details>

<details>
<summary><strong>🔒 Other Biome rules worth knowing</strong></summary>

- `suspicious/noConsole`: no `console.log`; use `@/logger`
- `complexity/noForEach`: prefer `for...of`
- `style/noNonNullAssertion`: no `!` non-null assertion
- `style/useTemplate`: template literals over string concatenation
- `performance/noImgElement`: use Next.js `<Image>` not `<img>`
- `correctness/noUnusedVariables`: unused vars/imports/params are errors
- `style/noProcessEnv`: use `env` from `@/env`, not `process.env`
- `performance/noBarrelFile`: no barrel files (with `src/db/schema.ts` as a permitted exception for the Drizzle adapter)

Plus the full `recommended` ruleset.
</details>

### React / Next.js Patterns

<details>
<summary><strong>🧩 RSC data-fetching pattern</strong></summary>

Server components initiate fetches via prepared statements colocated with the page. Server components are never `async`. Promises are passed down to client components, which consume them via `React.use()`. Mutations are server actions with `revalidatePath` after writes (with documented exceptions like the timer-prefs persistence). Type derivation goes through `Awaited<ReturnType<typeof query.execute>>[number]`.

Documented in [`rules/rsc-data-fetching-patterns.md`](rules/rsc-data-fetching-patterns.md).
</details>

---

## Drizzle-Kit Migrate — Recovery from Opaque Failures

If `bun db:migrate` exits with code 1 and produces minimal diagnostic output (e.g., `[⣷] applying migrations...error: "drizzle-kit" exited with code 1` with no SQL trace, no stack), the failure is structurally opaque. drizzle-kit's verbose-flag surface is minimal: `--config`, `--help`, `--version` only. Standard diagnostic flags (`--verbose`, `--debug`) are not exposed.

Empirical context for this opacity is captured in [`scripts/_logs/drizzle-kit-investigation.summary.md`](scripts/_logs/drizzle-kit-investigation.summary.md) (tooling-reliability-debug round, §2 commit 0).

### Diagnostic steps

Before resorting to manual-apply, try:

1. Re-run `bun db:migrate` once. The failure may be transient.
2. Inspect the failing migration's SQL file at `drizzle/<NNNN>_*.sql` for syntax errors or schema drift since last `drizzle-kit generate` run.
3. Verify DB connectivity (e.g., `bun --bun run -e "import { db } from './src/db'; import { sql } from 'drizzle-orm'; await db.execute(sql\`select 1\`)"` or equivalent).
4. Check the journal at `drizzle/meta/_journal.json` ends at the expected idx; the migration to apply should be the next idx not yet present.

### Manual-apply procedure

When diagnostic steps don't surface a fix, the manual-apply procedure applies the migration's SQL directly via the Drizzle client and inserts the journal row by hand. This procedure follows SPEC §6.14.31 destructive-operation-gate discipline.

**Pre-apply hash capture:**

```bash
sha256sum drizzle/meta/_journal.json
# Record this hash for post-apply verification.
```

**Manual SQL application:**

Author a one-shot script (do NOT commit) that:

1. Reads the failing migration's SQL: `drizzle/<NNNN>_*.sql`.
2. Executes it via the Drizzle client: `await db.execute(sql\`<SQL content>\`)`.
3. Computes the migration's content hash (standard drizzle journal format is sha256 of the migration file's SQL bytes).
4. Inserts the journal row directly:

```typescript
// pseudocode — adapt to project's Drizzle client conventions
const journal = JSON.parse(
    await fs.readFile("drizzle/meta/_journal.json", "utf-8")
)
journal.entries.push({
    idx: <NNNN>,
    version: "<existing-version-string>",
    when: Date.now(),
    tag: "<NNNN>_<migration-name>",
    breakpoints: true
})
await fs.writeFile(
    "drizzle/meta/_journal.json",
    JSON.stringify(journal, null, 2) + "\n"
)
```

5. Verify the DB schema matches the migration's intended state (e.g., for an `ALTER TABLE ... DROP COLUMN`, query the column list and confirm the column is absent).

**Post-apply hash capture:**

```bash
sha256sum drizzle/meta/_journal.json
# Hash must DIFFER from pre-apply (journal row was added).
# Confirm new entry idx + tag match the migration just applied.
```

**Cleanup:**

Delete the one-shot script. The journal row + DB schema change ARE intended permanent state; the script is investigative only.

### Historical reference

First instance of this manual-apply procedure: sidecar commit `822a674` (`drop users.target_percentile column`, 2026-05-09). See [`docs/plans/score-based-target-goals-sidecar.md`](docs/plans/score-based-target-goals-sidecar.md) §2 for that round's narrative.

### Future-instance escalation

If drizzle-kit failures occur a second time after this documentation lands (i.e., a third instance overall after `822a674` + this documentation), open an upstream `drizzle-team/drizzle-orm` GitHub issue with reproduction. Multiple instances justify upstream engagement; single-occurrence-then-documented does not.

---

## Contributing / Phase 2 Readiness

Phase 1 is the foundation. Once `docs/phase-1-manual-verification.md` passes top to bottom, Phase 2 starts: admin ingest form, hand-seeding ~150 real items across the 11 v1 sub-types, embedding-backfill workflow. The Phase 2 prompt for Claude Code will draw from `docs/SPEC.md` §7.6 (`ingestItemAction`), §3.3 (items schema), and §8 (the generation pipeline structure that the ingest flow validates against).

Each phase commits in conventional-commits style (`feat:`, `fix:`, `chore:`, `docs:`) with lint + typecheck passing before every commit. The lint+typecheck-before-commit discipline is non-negotiable; broken intermediate commits make `git bisect` unreliable.

For the audit trail of every architectural decision made during the planning interview, see [`docs/design_decisions.md`](docs/design_decisions.md). For open questions still pending product input, see [`docs/SPEC.md`](docs/SPEC.md) §13.
