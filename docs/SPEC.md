# 18 Seconds — Engineering Specification

This document is the engineering plan for building 18 Seconds on top of the Superbuilder superstarter scaffold currently checked into this repository. It translates `docs/PRD.md` into concrete file paths, schemas, server actions, and component boundaries that respect the conventions enforced in `rules/` and `gritql/`. Every claim cites either the PRD, a rule file, a `.grit` file, or an existing source file in this repo.

The rationale for every decision in this document is recorded in `docs/design_decisions.md`. The single-page architectural overview is in `docs/architecture_plan.md`. This SPEC is for **what to build**; the other two documents are for **why** and the **shape**.

---

## 1. Overview

18 Seconds is a self-service web application for adults preparing for the Criteria Cognitive Aptitude Test (CCAT). It tracks per-sub-type mastery, generates practice items via an LLM pipeline, and trains the strategic skill of abandoning questions at the 18-second mark (PRD §1, §2, §6.1).

Architectural shape:

- **Next.js App Router** with React 19 (PRD §7).
- **Server components for data fetching**, with the `prepare(...)` + `Awaited<ReturnType<typeof query.execute>>[number]` pattern visible in `src/app/page.tsx:7-17` and required by `rules/rsc-data-fetching-patterns.md`.
- **Server actions for mutations**, with `revalidatePath` after writes (`src/app/actions.ts`).
- **Vercel Workflows** (`"use workflow"` / `"use step"`) for asynchronous, retriable work.
- **Vercel Cron Jobs** (`vercel.json`) for periodic work — abandon sweep (every minute) and candidate promotion (nightly at 04:00 UTC).
- **A single `<FocusShell>` client component** that owns timers, dimming, the persistent triage prompt, the inter-question card, and heartbeats.
- **Auth.js v5 with the Drizzle adapter** wrapped in a thin shim that converts `Date ↔ ms` so every Auth.js timestamp column lands as `bigint(_ms)` per `rules/no-timestamp-columns.md`.
- **PostgreSQL via Drizzle ORM**, with every PK as `uuid("id").primaryKey().notNull().default(sql\`uuidv7()\`)` per `rules/no-uuid-default-random.md`.
- **`pgvector` extension** on the `items.embedding` column for the validator's uniqueness check at cosine-similarity threshold 0.92 (PRD §3.2, §7).
- **Text-only v1 scope.** v1 covers 14 text-based sub-types (5 verbal + 9 numerical) per PRD §2. Image storage, signed URLs, and any image-rendering pipeline are out of scope for v1; the body schema is a discriminated union (see §3.3.1) so additional variants can be added without a schema rewrite.

---

## 2. Repository layout

The tree below lists every file the build will add (NEW) or modify (MOD) on top of the existing repository. One-line responsibility for each. Existing files unchanged are not listed.

```
src/
├── auth.ts                                                    # NEW: Auth.js v5 wired through the bigint adapter shim
├── auth.config.ts                                             # NEW: Edge-safe Auth.js config used by middleware
├── auth/
│   ├── drizzle-adapter-shim.ts                                # NEW: thin wrapper around @auth/drizzle-adapter; converts Date <-> ms
│   └── drizzle-adapter-shim.test.ts                           # NEW: round-trip conversion tests for each adapter method
├── middleware.ts                                              # NEW: gates every route except /api/auth/*, /login, /api/health, /api/cron/*
├── env.ts                                                     # MOD: add AUTH_*, ANTHROPIC_API_KEY, OPENAI_API_KEY, CRON_SECRET
│
├── config/
│   ├── sub-types.ts                                           # NEW: 11 sub-type entries (id, displayName, section, latencyThresholdMs, bankTargetByDifficulty)
│   ├── diagnostic-mix.ts                                      # NEW: hand-tuned 50-row (sub_type_id, difficulty) array
│   ├── difficulty-curves.ts                                   # NEW: per-decile difficulty distribution for full_length and simulation
│   ├── strategies.ts                                          # NEW: 3 strategies per sub-type (recognition / technique / trap)
│   ├── admins.ts                                              # NEW: hardcoded admin email allowlist (PRD §3.1)
│   └── item-templates.ts                                      # NEW: per-sub-type structured prompt templates with Zod body schemas
│
├── db/
│   ├── schema.ts                                              # MOD: barrel every new schema module
│   ├── lib/
│   │   ├── pgvector.ts                                        # NEW: Drizzle custom column type for vector(1536)
│   │   └── uuid-time.ts                                       # already exists; spec depends on timestampFromUuidv7 + uuidv7LowerBound
│   ├── programs/
│   │   └── extensions/
│   │       └── pgvector.ts                                    # NEW: CREATE EXTENSION IF NOT EXISTS vector
│   └── schemas/
│       ├── auth/
│       │   ├── users.ts                                       # NEW: users + 18seconds columns (target_percentile, target_date_ms, timer_prefs_json)
│       │   ├── accounts.ts                                    # NEW: Auth.js accounts; bigint expires_at_ms, refresh_token_expires_at_ms
│       │   ├── auth_sessions.ts                               # NEW: Auth.js sessions; bigint expires_ms (renamed to avoid clash with practice/sessions)
│       │   └── verification_tokens.ts                         # NEW: bigint expires_ms
│       ├── catalog/
│       │   ├── sub-types.ts                                   # NEW: sub_types catalog table
│       │   ├── strategies.ts                                  # NEW: strategies table — text, kind enum, FK to sub_types
│       │   ├── items.ts                                       # NEW: items table — body jsonb (discriminated), options jsonb, embedding vector(1536)
│       │   └── candidate_promotion_log.ts                     # NEW: shadow-mode promotion decisions; columns item_id, decision, observed_*
│       ├── practice/
│       │   ├── sessions.ts                                    # NEW: sessions + last_heartbeat_ms, completion_reason, recency_excluded_item_ids
│       │   ├── attempts.ts                                    # NEW: attempts + served_at_tier, fallback_from_tier
│       │   ├── mastery_state.ts                               # NEW: mastery_state + was_mastered boolean
│       │   └── strategy_views.ts                              # NEW: strategy_views(user_id, strategy_id, viewed_at_ms) append-only
│       └── review/
│           └── review_queue.ts                                # NEW: SM-2 review queue (PRD §4.3)
│
├── server/
│   ├── auth/
│   │   ├── admin-gate.ts                                      # NEW: requireAdminEmail() — admin allowlist check
│   │   └── account-deletion.ts                                # NEW: deleteAccount(userId) — cascade + hashed-id audit log
│   ├── items/
│   │   ├── body-schema.ts                                     # NEW: Zod discriminated union for items.body and image-key extraction
│   │   ├── queries.ts                                         # NEW: prepared statements for item lookup
│   │   ├── ingest.ts                                          # NEW: ingestRealItem(input) — inserts source=real, status=live, fires embedding backfill
│   │   ├── tagger.ts                                          # NEW: classifyItem(prompt, options) — admin-form sub-type/difficulty suggestion
│   │   ├── selection.ts                                       # NEW: getNextItem(sessionId) dispatcher over selectionStrategy
│   │   ├── recency.ts                                         # NEW: computeRecencyExcludedSet(userId, nowMs) — UUIDv7 lower-bound query
│   │   └── promotion.ts                                       # NEW: candidate-promotion decision function (pure)
│   ├── sessions/
│   │   ├── queries.ts                                         # NEW: prepared statements for session+attempt history
│   │   ├── start.ts                                           # NEW: startSession — writes recency_excluded_item_ids at session start
│   │   ├── submit.ts                                          # NEW: submitAttempt — writes served_at_tier + fallback_from_tier
│   │   ├── heartbeat.ts                                       # NEW: recordHeartbeat — updates last_heartbeat_ms
│   │   └── end.ts                                             # NEW: endSession — finalizes ended_at_ms with completion_reason='completed'
│   ├── mastery/
│   │   ├── compute.ts                                         # NEW: computeMastery({source}) parameterized over diagnostic vs ongoing
│   │   ├── recompute.ts                                       # NEW: recomputeForUser(userId, subTypeId, sessionType)
│   │   └── near-goal.ts                                       # NEW: deriveNearGoal(user, masteryStates)
│   ├── review/
│   │   ├── queries.ts                                         # NEW: dueReviewItems(userId, nowMs)
│   │   └── schedule.ts                                        # NEW: nextDueAtMs (SM-2 ladder)
│   ├── generation/
│   │   ├── pipeline.ts                                        # NEW: generateItem / validateItem / scoreItem / deployItem
│   │   ├── generator.ts                                       # NEW: Anthropic Claude Sonnet 4 wrapper
│   │   ├── validator.ts                                       # NEW: OpenAI GPT-4o wrapper — 1..5 per check + nearest-neighbor cosine
│   │   ├── embeddings.ts                                      # NEW: OpenAI text-embedding-3-small wrapper
│   │   ├── similarity.ts                                      # NEW: nearestNeighborInBank(subTypeId, embedding)
│   │   └── pricing.ts                                         # NEW: per-model unit pricing for cost estimation
│   ├── narrowing-ramp/
│   │   └── obstacle.ts                                        # NEW: suggestObstacleOptions(userId) — top-2 weakness + reserved triage slot
│   └── triage/
│       └── score.ts                                           # NEW: triageScoreForSession(sessionId), triageRolling30d(userId)
│
├── workflows/
│   ├── item-generation.ts                                     # NEW: itemGenerationWorkflow(input) — four pipeline stages as steps
│   ├── mastery-recompute.ts                                   # NEW: masteryRecomputeWorkflow(sessionId)
│   ├── review-queue-refresh.ts                                # NEW: reviewQueueRefreshWorkflow(userId)
│   ├── embedding-backfill.ts                                  # NEW: embeddingBackfillWorkflow(itemId)
│   ├── abandon-sweep.ts                                       # NEW: finalizes stale sessions; idempotent
│   └── candidate-promotion.ts                                 # NEW: nightly promotion decisions; shadow mode for first 30 days
│
├── components/
│   ├── focus-shell/
│   │   ├── focus-shell.tsx                                    # NEW: <FocusShell> client component
│   │   ├── session-timer-bar.tsx                              # NEW: <SessionTimerBar>
│   │   ├── pace-track.tsx                                     # NEW: <PaceTrack>
│   │   ├── question-timer-bar.tsx                             # NEW: <QuestionTimerBar>
│   │   ├── triage-prompt.tsx                                  # NEW: persistent overlay with subtle escalating intensity 18s..30s
│   │   ├── inter-question-card.tsx                            # NEW: <InterQuestionCard>
│   │   ├── heartbeat.tsx                                      # NEW: client hook that posts sendBeacon every 30s + on pagehide
│   │   └── shell-reducer.ts                                   # NEW: pure reducer for FocusShell state
│   ├── item/
│   │   ├── item-prompt.tsx                                    # NEW: switch over body.kind dispatching to body-renderer components
│   │   ├── option-button.tsx                                  # NEW: a single answer-option button used inside item-prompt
│   │   └── body-renderers/
│   │       └── text.tsx                                       # NEW: { kind: 'text' } — the single v1 body variant
│   ├── mastery-map/
│   │   ├── mastery-map.tsx                                    # NEW: 14-icon grid + near-goal line + start CTA + low-contrast triage adherence
│   │   ├── mastery-icon.tsx                                   # NEW: per-section lucide icons (BookOpen for verbal / Calculator for numerical)
│   │   ├── near-goal-line.tsx                                 # NEW: single text line, no graph
│   │   └── start-session-button.tsx                           # NEW: primary CTA
│   ├── narrowing-ramp/
│   │   ├── narrowing-ramp.tsx                                 # NEW: orchestrates the 75s pre-session protocol
│   │   ├── obstacle-scan.tsx                                  # NEW: 30s obstacle picker + if-then plan editor
│   │   ├── visual-narrowing.tsx                               # NEW: 15s fixation point + slow-moving target
│   │   ├── session-brief.tsx                                  # NEW: 15s plain-text preview
│   │   └── launch-countdown.tsx                               # NEW: 15s countdown
│   └── post-session/
│       ├── post-session-review.tsx                            # NEW: accuracy/latency/triage/wrong-items
│       ├── strategy-review-gate.tsx                           # NEW: 30s strategy gate after full-length tests only
│       ├── wrong-items-list.tsx                               # NEW: browsable wrong-item list with explanations
│       └── onboarding-targets.tsx                             # NEW: target-percentile + target-date capture (post-diagnostic only)
│
├── app/
│   ├── layout.tsx                                             # MOD: keep existing fonts; no per-route changes
│   ├── page.tsx                                               # MOD: redirect to /(app) when authed; otherwise /login
│   ├── content.tsx                                            # DELETE: todos demo content
│   ├── actions.ts                                             # DELETE: replaced by feature-scoped action files
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts                         # NEW: Auth.js v5 route handler
│   │   ├── health/route.ts                                    # NEW: 200 OK probe — bypassed by middleware
│   │   ├── sessions/
│   │   │   └── [sessionId]/heartbeat/route.ts                 # NEW: 204 endpoint for navigator.sendBeacon
│   │   ├── cron/
│   │   │   ├── abandon-sweep/route.ts                         # NEW: per-minute cron — finalizes stale sessions
│   │   │   └── candidate-promotion/route.ts                   # NEW: nightly cron — promotion decisions
│   │   └── admin/
│   │       ├── generate-items/route.ts                        # NEW: admin-gated wrapper around the generation workflow trigger
│   │       └── ingest-item/route.ts                           # NEW: admin-gated wrapper around ingestItemAction
│   ├── login/
│   │   └── page.tsx                                           # NEW: single Google sign-in button
│   ├── (app)/
│   │   ├── layout.tsx                                         # NEW: auth-required + diagnostic-completed gate
│   │   ├── page.tsx                                           # NEW: server component → MasteryMap
│   │   ├── actions.ts                                         # NEW: startSession / submitAttempt / endSession + timer-prefs persist
│   │   ├── diagnostic/
│   │   │   ├── page.tsx                                       # NEW: diagnostic flow (untimed at session level; pace track hidden)
│   │   │   └── content.tsx                                    # NEW: client wrapper — drives FocusShell over 50 calibration items
│   │   ├── drill/
│   │   │   └── [subTypeId]/
│   │   │       ├── page.tsx                                   # NEW: configure page (timer mode + length) → NarrowingRamp → FocusShell
│   │   │       └── content.tsx                                # NEW: client wrapper for FocusShell with timer-mode prop
│   │   ├── test/
│   │   │   ├── page.tsx                                       # NEW: full-length practice test (50 q / 15 min)
│   │   │   └── content.tsx                                    # NEW: client wrapper for FocusShell with the strict full-length config
│   │   ├── simulation/
│   │   │   ├── page.tsx                                       # NEW: test-day simulation (PRD §4.6)
│   │   │   └── content.tsx                                    # NEW: client wrapper with stricter UI (no pause, no skip indicators)
│   │   ├── review/
│   │   │   ├── page.tsx                                       # NEW: spaced-repetition session built from due review_queue rows
│   │   │   └── content.tsx                                    # NEW: client wrapper for FocusShell over due items
│   │   ├── post-session/
│   │   │   └── [sessionId]/
│   │   │       ├── page.tsx                                   # NEW: server component → PostSessionReview
│   │   │       └── actions.ts                                 # NEW: dismissPostSession + saveOnboardingTargets server actions
│   │   ├── history/
│   │   │   ├── page.tsx                                       # NEW: chronological list of sessions
│   │   │   └── [sessionId]/page.tsx                           # NEW: per-question breakdown for a single past session
│   │   └── settings/
│   │       └── delete-account/
│   │           ├── page.tsx                                   # NEW: confirmation page for account deletion
│   │           └── actions.ts                                 # NEW: deleteAccount server action
│   └── (admin)/
│       ├── layout.tsx                                         # NEW: admin layout — calls requireAdminEmail()
│       ├── ingest/
│       │   ├── page.tsx                                       # NEW: real-item ingest form
│       │   └── actions.ts                                     # NEW: ingestItemAction server action
│       └── generate/
│           ├── page.tsx                                       # NEW: 14 × 4 grid (live / candidate / target) + per-cell top-up button + cost dashboard
│           └── actions.ts                                     # NEW: triggerGenerationAction server action
│
└── lib/
    └── utils.ts                                               # already exists (cn helper)
```

> **File-map paths cut from v1 2026-05-04.** The following entries above are specced-but-never-shipped under v1 scope (PRD §4.3 + §4.4 + §5.3 + §6.5 cut markers). On-disk-code-surface notes per entry — anyone wondering "is this path real?" should consult this list before grep'ing for it:
>
> - ~~`src/db/schemas/practice/strategy_views.ts`~~ (line 73 above) — **dropped 2026-05-04** (v1-code-cleanup commit 4). The doc-only round's "never shipped" claim referenced the SPEC's planned path; the actual on-disk path was `src/db/schemas/ops/strategy-views.ts`, which was shipped during Phase 3 and dropped in commit 4 alongside `review-queue.ts`. 30-second strategy-review gate cut (PRD §6.5).
> - ~~`src/db/schemas/review/review_queue.ts`~~ (line 75; actual on-disk path was `review-queue.ts`) — **dropped 2026-05-04** (v1-code-cleanup commit 4). The schema file was shipped during Phase 3 to lock the migration shape; v1 never inserted rows. Spaced-repetition queue cut (PRD §4.3). The `review/` directory was also removed (no other tables lived under it).
> - `src/server/review/queries.ts` + `src/server/review/schedule.ts` (lines 100–101 / §9.5) — **never shipped** in tree. Spaced-repetition cut.
> - `src/server/narrowing-ramp/obstacle.ts` (line 110) — **never shipped** in tree. NarrowingRamp cut (PRD §5.3).
> - `src/workflows/review-queue-refresh.ts` (line 117) — **never shipped** in tree. SR queue cut. `endSession` does not trigger this workflow in v1 (§7.3 marker).
> - `src/components/narrowing-ramp/{narrowing-ramp,obstacle-scan,visual-narrowing,session-brief,launch-countdown}.tsx` (lines 142–148) — **never shipped** in tree. NarrowingRamp cut.
> - `src/components/post-session/strategy-review-gate.tsx` (line 150) — **never shipped** in tree. Strategy-gate cut (PRD §6.5).
> - `src/app/(app)/review/{page,content}.tsx` (lines 190–192) — **never shipped** in tree. SR queue cut.
>
> Schema files that **stayed vestigial in tree** through the doc-only round and were dropped in v1-code-cleanup commits 3 + 4 (2026-05-04): `src/db/schemas/auth/users.ts` (`timer_prefs_json` column — dropped commit 3), `src/db/schemas/practice/practice-sessions.ts` (`timer_mode` enum truncated commit 3, `narrowing_ramp_completed` / `if_then_plan` / `strategy_review_viewed` columns dropped commit 3, `session_type` enum truncated commit 3), `src/db/schemas/review/review-queue.ts` (entire table dropped commit 4), `src/db/schemas/ops/strategy-views.ts` (entire table dropped commit 4). The `# NEW: ...` comment annotations above are preserved as the original spec intent; the cut markers + cleanup callouts trace what happened.

### New dependencies

Add via `bun add`:

- `next-auth@beta` and `@auth/drizzle-adapter` — Auth.js v5 (PRD §7).
- `@anthropic-ai/sdk` — generator LLM.
- `openai` — validator LLM and embeddings.
- `motion` — Framer Motion successor used by `motion/react`.

`pgvector` is a Postgres extension, not an npm package — installed via `src/db/programs/extensions/pgvector.ts`. The Drizzle integration is a custom column type written by hand in `src/db/lib/pgvector.ts`. `workflow@4.2.4` is already installed and is the runtime for `'use workflow'` / `'use step'`.

### Local Postgres image

`pgvector/pgvector:pg18` (the standard `postgres:18` image does not include the extension). Pin this image in the Docker compose file so the local dev environment matches the IaC-provisioned RDS instance — same major version, same extensions (`pgcrypto`, `pgvector`), same default collation. Postgres 18 is required because the schema uses the native `uuidv7()` function as the default for primary-key columns; earlier majors do not ship it.

---

## 3. Database schema

All `id` columns use UUIDv7 via `default(sql\`uuidv7()\`)`. All time-bearing columns are `bigint("col_name", { mode: "number" })` with the `_ms` suffix per `rules/no-timestamp-columns.md` and PRD §8.1. Each table lives in one file under `src/db/schemas/<domain>/`.

### 3.1 `pgvector` Drizzle column type

`src/db/lib/pgvector.ts` exports a `vector(name, { dimensions })` helper using Drizzle's `customType` API:

```ts
import { customType } from "drizzle-orm/pg-core"

const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
    dataType(config) {
        return `vector(${config.dimensions})`
    },
    toDriver(value) {
        return `[${value.join(",")}]`
    },
    fromDriver(value) {
        return JSON.parse(value)
    }
})

export { vector }
```

### 3.2 Auth.js tables (with `bigint` time columns)

The four Auth.js tables are rewritten in `src/db/schemas/auth/` so every time-bearing column is `bigint(... _ms)`. The Drizzle adapter is wrapped in a shim (`src/auth/drizzle-adapter-shim.ts`, §5.1) that converts `Date ↔ ms` at every adapter method boundary so the rest of the codebase never sees `Date` objects from Auth.js.

#### `src/db/schemas/auth/users.ts` — table `users`

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `notNull`, `default uuidv7()` |
| `name` | `varchar(256)` | nullable |
| `email` | `varchar(320)` | `notNull`, `unique` |
| `email_verified_ms` | `bigint` (`mode: "number"`) | nullable |
| `image` | `text` | nullable |
| `target_percentile` | `integer` | nullable (PRD §6.3) |
| `target_date_ms` | `bigint` | nullable |
| `created_at_ms` | `bigint` | `notNull`, `default extract(epoch from now()) * 1000` |

Indexes: `email_idx` (unique).

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 3). The `timer_prefs_json` column was dropped from the `users` table via migration `0001_true_young_avengers.sql`. The prior cut-from-v1 marker described the column as vestigial-in-tree; this commit excised it. Static-per-session-type visibility is now implemented inline in the focus shell (§6.6) without any user-config column.

#### `src/db/schemas/auth/accounts.ts` — table `accounts`

| column | type | constraint |
|---|---|---|
| `user_id` | `uuid` | `notNull`, FK → `users.id`, `onDelete cascade` |
| `type` | `varchar(64)` | `notNull` |
| `provider` | `varchar(128)` | `notNull` |
| `provider_account_id` | `varchar(256)` | `notNull` |
| `refresh_token` | `text` | nullable |
| `access_token` | `text` | nullable |
| `expires_at_ms` | `bigint` | nullable |
| `refresh_token_expires_at_ms` | `bigint` | nullable |
| `token_type` | `varchar(64)` | nullable |
| `scope` | `text` | nullable |
| `id_token` | `text` | nullable |
| `session_state` | `text` | nullable |

Composite PK: `(provider, provider_account_id)`. Index on `user_id`.

#### `src/db/schemas/auth/sessions.ts` — table `sessions` (Drizzle export `authSessions`)

**Naming reality (sub-phase 4 close-out, 2026-05-04).** This SPEC originally specified the file path as `src/db/schemas/auth/auth_sessions.ts` and the PG table name as `auth_sessions` — the planned rename to disambiguate from `practice_sessions` never executed. The actual shipped state is: file `src/db/schemas/auth/sessions.ts`, PG table name `"sessions"` (Auth.js's default), Drizzle export `authSessions`. The practice-side table name `practice_sessions` already disambiguates without the rename. Future readers grepping for the table by either name should find this note via `auth_sessions` or `authSessions` text search.

| column | type | constraint |
|---|---|---|
| `session_token` | `varchar(256)` | PK |
| `user_id` | `uuid` | `notNull`, FK → `users.id`, `onDelete cascade` |
| `expires_ms` | `bigint` | `notNull` |

#### `src/db/schemas/auth/verification_tokens.ts` — table `verification_tokens`

| column | type | constraint |
|---|---|---|
| `identifier` | `varchar(320)` | `notNull` |
| `token` | `varchar(256)` | `notNull` |
| `expires_ms` | `bigint` | `notNull` |

Composite PK: `(identifier, token)`.

### 3.3 Catalog tables

#### `src/db/schemas/catalog/sub-types.ts` — table `sub_types`

| column | type | constraint |
|---|---|---|
| `id` | `varchar(64)` | PK (e.g. `"verbal.antonyms"`) |
| `name` | `varchar(128)` | `notNull` |
| `section` | `pgEnum('sub_type_section', ['verbal','numerical'])` | `notNull` (extending the enum is the additive migration if a new section is added) |
| `latency_threshold_ms` | `bigint` | `notNull` |

This is the only table that does NOT use a UUIDv7 PK — sub-type ids are stable, human-readable strings used as foreign keys throughout. Seeded from `src/config/sub-types.ts` via the seed script.

#### `src/db/schemas/catalog/strategies.ts` — table `strategies`

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `sub_type_id` | `varchar(64)` | `notNull`, FK → `sub_types.id` |
| `kind` | `pgEnum('strategy_kind', ['recognition','technique','trap'])` | `notNull` |
| `text` | `text` | `notNull` |

Index: `strategies_sub_type_idx` on `sub_type_id`.

Three strategies per sub-type seeded from `src/config/strategies.ts`. The (`sub_type_id`, `kind`) pair is conventionally unique per sub-type but is not enforced by a UNIQUE index.

#### `src/db/schemas/catalog/items.ts` — table `items`

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `sub_type_id` | `varchar(64)` | `notNull`, FK → `sub_types.id` |
| `difficulty` | `pgEnum('item_difficulty', ['easy','medium','hard','brutal'])` | `notNull` |
| `source` | `pgEnum('item_source', ['real','generated'])` | `notNull` |
| `status` | `pgEnum('item_status', ['live','candidate','retired'])` | `notNull`, `default 'candidate'` |
| `body` | `jsonb` | `notNull` (Zod-validated discriminated union — §3.3.1) |
| `options_json` | `jsonb` | `notNull` (`{ id: string; text: string }[]` — `id` is an opaque 8-char Crockford-base32 string assigned server-side; see §3.3.2) |
| `correct_answer` | `varchar(64)` | `notNull` (matches an `option.id`; regex-constrained to `^[0-9a-z]{8}$` at the route boundary) |
| `explanation` | `text` | nullable (rendered prose; the canonical structured form lives in `metadata_json.structuredExplanation` — see §3.3.3) |
| `strategy_id` | `uuid` | nullable, FK → `strategies.id` |
| `embedding` | `vector(1536)` | nullable (set by `embeddingBackfillWorkflow`, or by `scripts/backfill-missing-embeddings.ts` for items inserted via the seed loader) |
| `metadata_json` | `jsonb` | `notNull`, `default '{}'` |
| `source_folder` | `varchar(128)` | nullable (basename of the source directory under `data/testbank/`; populated by the OCR pipeline's stage 2 ingest path; pre-2026-05-06 seed items carry NULL) |
| `source_filename` | `varchar(256)` | nullable (basename of the source PNG; pairs with `source_folder`) |

Indexes:
- `items_sub_type_status_idx` on `(sub_type_id, status)` — primary lookup path for `getNextItem`.
- `items_sub_type_difficulty_status_idx` on `(sub_type_id, difficulty, status)` — used by selection by tier.
- `items_source_folder_idx` on `source_folder` — used by future admin-portal "show items from {folder}" filter queries (added 2026-05-06 in the testbank-re-extraction round per Q1 redline). At v1 bank scale (~440 rows post-round) Postgres uses Index Scan; at lower row counts (~50) the planner correctly chooses Seq Scan per SPEC §6.14.13.
- `items_embedding_ivfflat_idx` on `embedding` using `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`.

`metadata_json` shape (typed at the boundary, not enforced by the column):

```ts
{
    // Phase 4 generation pipeline provenance.
    templateId?: string
    templateVersion?: number
    generatorModel?: string
    validatorReport?: { /* validator's per-check confidences and reasons */ }
    qualityScore?: number

    // Provenance for items entering the bank — set at ingest time.
    // Note: `importSource` records ANSWER-EXTRACTION provenance (how the
    // correct answer was determined), distinct from the `source_folder` /
    // `source_filename` columns which record FOLDER provenance (which
    // testbank source the screenshot came from). Both fields are populated
    // by the OCR pipeline's stage 2; pre-2026-05-06 seed items omit both.
    importSource?: 'hand-seed' | 'ocr-visible' | 'ocr-solved' | 'generated'
    originalExplanation?: string  // verbatim text from a source screenshot, when extracted by the OCR pipeline
    sourceImageHash?: string       // SHA-256 of the source PNG; OCR-imported items only

    // Structured form of the user-facing explanation. See §3.3.3.
    structuredExplanation?: { parts: StructuredExplanationPart[] }
}
```

##### 3.3.1 `body` discriminator schema

The body is expressed as a Zod `discriminatedUnion("kind", [...])` in `src/server/items/body-schema.ts`. v1 has a single variant; the union shape exists so additional variants can be added without a schema rewrite.

```ts
const BodyText = z.object({
    kind: z.literal("text"),
    text: z.string()
})

const ItemBody = z.discriminatedUnion("kind", [BodyText])
```

The renderer dispatches via `switch` over `body.kind` with TypeScript exhaustiveness checking; today it has one case. Generation pipeline output and admin ingest both validate via `ItemBody.safeParse` per `rules/zod-usage.md`.

##### 3.3.2 `options_json` shape — opaque ids

Each option is `{ id: string; text: string }`, where `id` is an opaque 8-character string drawn from Crockford's base32 alphabet (`0-9` + lowercase consonants minus `i/l/o/u`). Ids are generated server-side at ingest time via `src/server/items/option-id.ts`'s `assignOptionIds` helper; the LLM (in either the OCR extract pass or the Phase 4 generator) returns options with text only and never sees ids.

Display letters A/B/C/D/E are computed from array position at render time (see `src/components/item/option-button.tsx`'s `displayLabel` prop and `src/components/item/item-prompt.tsx`'s positional `String.fromCharCode(0x41 + index)`); they are **not stored**. Decoupling the stable handle (the opaque id) from the display label is what unlocks future per-session option shuffling and click-to-highlight in post-session review without breaking explanation cross-references when option order is permuted. See `docs/plans/opaque-option-ids-and-pipeline-split.md` for the full design rationale and the migration history.

Validation: `src/server/items/ingest.ts`'s `optionSchema.id` is regex-constrained to `^[0-9a-z]{8}$`. The `correct_answer` column carries an opaque id matching one of `options_json[*].id`; the runtime cross-check in `ingestRealItem` enforces that match.

##### 3.3.3 `metadata_json.structuredExplanation` shape

Explanations live in two places that stay in lockstep: `items.explanation` carries the rendered prose the user reads, and `items.metadata_json.structuredExplanation` carries the canonical structured form. Prose is deterministically rendered from structure (see `scripts/_lib/explain.ts`'s `renderExplanationProse`); structure is the source of truth.

```ts
type StructuredExplanationPart = {
    kind: 'recognition' | 'elimination' | 'tie-breaker'
    text: string
    referencedOptions: string[]  // option ids drawn from the row's options_json[*].id set
}

type StructuredExplanation = {
    parts: StructuredExplanationPart[]  // length 2 or 3
}
```

Zod refinement (in `src/server/items/ingest.ts` and `src/app/api/admin/ingest-item/route.ts`) enforces ordering: `parts[0].kind === 'recognition'`, `parts[1].kind === 'elimination'`, and `parts[2]?.kind === 'tie-breaker'` when present. The runtime cross-check in `ingestRealItem` enforces that every `referencedOptions[j]` exists in the item's `options_json[*].id` set.

The structured form powers click-to-highlight in post-session review — **shipped at Phase 5 sub-phase 4** (2026-05-07). `<StructuredExplanation>` (`src/components/post-session/structured-explanation.tsx`) parses the structured form at the render boundary via the same Zod schema enforced at ingest; tapping the elimination part toggles `line-through` on the option ids it references via `referencedOptions`, and tapping the tie-breaker part toggles a highlight ring on the options it considers — with the renderer mapping opaque ids to current display positions. Recognition is uniformly non-interactive. State is per-card local and ephemeral (resets on navigation). The 50 NULL-`source_folder` seed items lack the structured form and render via a silent prose fallback to `items.explanation`. See `docs/plans/phase5-click-to-highlight.md` for the round, plus `docs/plans/opaque-option-ids-and-pipeline-split.md` and `docs/plans/ocr-import-screenshots.md` for the contract design.

#### `src/db/schemas/catalog/candidate_promotion_log.ts` — table `candidate_promotion_log`

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `item_id` | `uuid` | `notNull`, FK → `items.id` |
| `decision` | `pgEnum('promotion_decision', ['promote','retire','hold'])` | `notNull` |
| `observed_attempts` | `integer` | `notNull` |
| `observed_accuracy` | `real` | `notNull` |
| `observed_median_latency_ms` | `integer` | `notNull` |
| `enforced` | `boolean` | `notNull`, `default false` |
| `decided_at_ms` | `bigint` | `notNull` |

Indexes: `candidate_promotion_log_item_id_idx` on `item_id`, `candidate_promotion_log_decided_at_idx` on `decided_at_ms` for the admin dashboard.

In shadow mode (the first 30 days after the workflow lands), `enforced` is always `false`. After hand-review and switch-over, the workflow sets `enforced=true` and updates `items.status` accordingly.

### 3.4 Practice tables

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 3). Three columns + two enums on `practice_sessions` were excised via migration `0001_true_young_avengers.sql`:
> - `narrowing_ramp_completed` column dropped (NarrowingRamp protocol cut, PRD §5.3).
> - `if_then_plan` column dropped (NarrowingRamp cut).
> - `strategy_review_viewed` column dropped (30-second strategy-review gate cut, PRD §6.5).
> - `timer_mode` enum truncated from `['standard','speed_ramp','brutal']` to `['standard']` via the rename-swap pattern (CREATE TYPE timer_mode_v2 → ALTER COLUMN USING text-cast → DROP TYPE → RENAME).
> - `session_type` enum truncated from 5 values to `['diagnostic','drill','full_length','simulation']` via the same rename-swap pattern (PRD §4.3 review-session cut).
>
> Brutal-tier-as-difficulty (item bank, `served_at_tier` enum on `attempts`, `items.difficulty` column, `TIER_ORDER` references in `selection.ts`) is **unaffected** — the doc-only round's disambiguation pin held through cleanup. The `strategy_views` table — **shipped during Phase 3 at `src/db/schemas/ops/strategy-views.ts`** (the doc-only round's "never shipped" claim referenced the SPEC's planned path `src/db/schemas/practice/strategy_views.ts`, which did not exist; the actual on-disk path differed) — was dropped in v1-code-cleanup commit 4 alongside `review_queue`; see §3.4 below.

#### `src/db/schemas/practice/practice-sessions.ts` — table `practice_sessions`

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `user_id` | `uuid` | `notNull`, FK → `users.id`, `onDelete cascade` |
| `type` | `pgEnum('session_type', ['diagnostic','drill','full_length','simulation'])` | `notNull` |
| `sub_type_id` | `varchar(64)` | nullable, FK → `sub_types.id` (set only for `drill`) |
| `timer_mode` | `pgEnum('timer_mode', ['standard'])` | nullable (only set for `drill`) |
| `target_question_count` | `integer` | `notNull` (50 for diagnostic/full_length/simulation; 5/10/20 for drill) |
| `started_at_ms` | `bigint` | `notNull` |
| `ended_at_ms` | `bigint` | nullable (set by `endSession` or the abandon sweep) |
| `last_heartbeat_ms` | `bigint` | `notNull`, `default extract(epoch from now()) * 1000` |
| `completion_reason` | `pgEnum('completion_reason', ['completed','abandoned'])` | nullable (set when `ended_at_ms` is set) |
| `recency_excluded_item_ids` | `uuid[]` | `notNull`, `default '{}'` |
| `diagnostic_overtime_note_shown_at_ms` | `bigint` | nullable, vestigial — left in place for sub-phase 1; no reader writes or reads it. The post-session pacing line (§6.10) is derived from `MAX(attempts.id)` minus `started_at_ms` instead. Drop in a future cleanup commit. |

Indexes:
- `practice_sessions_user_id_idx` on `user_id`.
- `practice_sessions_user_type_ended_idx` on `(user_id, type, ended_at_ms)` — drives the first-run check in `(app)/layout.tsx`.
- `practice_sessions_abandon_sweep_idx` on `(last_heartbeat_ms)` `WHERE ended_at_ms IS NULL` — drives the abandon-sweep query.
- `practice_sessions_recency_excluded_gin_idx` on `recency_excluded_item_ids` using `gin`.

Recover `created_at` via `timestampFromUuidv7(row.id)`. `started_at_ms` is recorded explicitly because it is set from the user's clock at session-start time (the row may insert slightly later under transaction load).

#### `src/db/schemas/practice/attempts.ts` — table `attempts`

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `session_id` | `uuid` | `notNull`, FK → `practice_sessions.id`, `onDelete cascade` |
| `item_id` | `uuid` | `notNull`, FK → `items.id` |
| `selected_answer` | `varchar(64)` | nullable (null = skipped/timeout) |
| `correct` | `boolean` | `notNull` |
| `latency_ms` | `integer` | `notNull` |
| `served_at_tier` | `pgEnum('item_difficulty', ['easy','medium','hard','brutal'])` | `notNull` |
| `fallback_from_tier` | `pgEnum('item_difficulty', ['easy','medium','hard','brutal'])` | nullable |
| `triage_prompt_fired` | `boolean` | `notNull`, `default false` |
| `triage_taken` | `boolean` | `notNull`, `default false` |
| `metadata_json` | `jsonb` | `notNull`, `default '{}'` (carries `fallback_level`) |

Indexes:
- `attempts_session_id_idx` on `session_id` — drives post-session review and mastery-recompute scope query.
- `attempts_item_id_idx` on `item_id` — drives candidate-item promotion.
- `attempts_user_recency_idx` is computed indirectly via UUIDv7 ordering on `(session_id, id)`. To find a user's recent attempts, query `WHERE session_id IN (SELECT id FROM practice_sessions WHERE user_id = $1) AND id >= uuidv7LowerBound(now - interval)`.

`metadata_json` shape (typed at the boundary): `{ fallback_level: 'fresh' | 'session-soft' | 'recency-soft' | 'tier-degraded' }`.

#### `src/db/schemas/practice/mastery_state.ts` — table `mastery_state`

| column | type | constraint |
|---|---|---|
| `user_id` | `uuid` | `notNull`, FK → `users.id`, `onDelete cascade` |
| `sub_type_id` | `varchar(64)` | `notNull`, FK → `sub_types.id` |
| `current_state` | `pgEnum('mastery_level', ['learning','fluent','mastered','decayed'])` | `notNull` |
| `was_mastered` | `boolean` | `notNull`, `default false` |
| `updated_at_ms` | `bigint` | `notNull` |

Composite PK: `(user_id, sub_type_id)`.

`was_mastered` is set `true` the first time `current_state` becomes `'mastered'` OR `'decayed'`, and never reset.

#### ~~`src/db/schemas/ops/strategy-views.ts` — table `strategy_views`~~

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 4). Table dropped via migration `0002_tranquil_mach_iv.sql` (`DROP TABLE strategy_views CASCADE`). Schema file `src/db/schemas/ops/strategy-views.ts` deleted from tree; barrel registration removed (§3.6). The 30-second strategy-review gate cut from v1 (PRD §6.5 marker) eliminated all readers; v1 never wrote rows. Section header preserved with strikethrough as historical reference; the column / index spec below is preserved for the same reason.

Append-only log used by the strategy-review gate to pick least-recently-viewed strategies.

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `user_id` | `uuid` | `notNull`, FK → `users.id`, `onDelete cascade` |
| `strategy_id` | `uuid` | `notNull`, FK → `strategies.id`, `onDelete cascade` |
| `viewed_at_ms` | `bigint` | `notNull` |

Index: `strategy_views_user_strategy_idx` on `(user_id, strategy_id)` — drives the LEFT JOIN for least-recently-viewed lookup.

### 3.5 Review tables

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 4). Table dropped via migration `0002_tranquil_mach_iv.sql` (`DROP TABLE review_queue CASCADE`). Schema file `src/db/schemas/review/review-queue.ts` deleted from tree; the `src/db/schemas/review/` directory removed (no other tables lived under `review/`); barrel registration removed (§3.6). The spaced-repetition queue cut from v1 (PRD §4.3 marker) eliminated all readers; v1 never inserted rows.

#### ~~`src/db/schemas/review/review-queue.ts` — table `review_queue`~~

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `user_id` | `uuid` | `notNull`, FK → `users.id`, `onDelete cascade` |
| `item_id` | `uuid` | `notNull`, FK → `items.id` |
| `due_at_ms` | `bigint` | `notNull` |
| `interval_days` | `integer` | `notNull` (one of 1, 3, 7, 21) |

Indexes:
- `review_queue_user_due_idx` on `(user_id, due_at_ms)` — drives `dueReviewItems`.
- `review_queue_user_item_unique` UNIQUE on `(user_id, item_id)` — at most one queued review per (user, item).

### 3.6 Schema barrel

`src/db/schema.ts` is updated to barrel all of the above:

```ts
import * as authUsers from "@/db/schemas/auth/users"
import * as authAccounts from "@/db/schemas/auth/accounts"
import * as authSessions from "@/db/schemas/auth/auth_sessions"
import * as authVerificationTokens from "@/db/schemas/auth/verification_tokens"
import * as catalogSubTypes from "@/db/schemas/catalog/sub-types"
import * as catalogStrategies from "@/db/schemas/catalog/strategies"
import * as catalogItems from "@/db/schemas/catalog/items"
import * as catalogCandidatePromotionLog from "@/db/schemas/catalog/candidate_promotion_log"
import * as practiceSessions from "@/db/schemas/practice/sessions"
import * as practiceAttempts from "@/db/schemas/practice/attempts"
import * as practiceMasteryState from "@/db/schemas/practice/mastery_state"

const dbSchema = {
    ...authUsers, ...authAccounts, ...authSessions, ...authVerificationTokens,
    ...catalogSubTypes, ...catalogStrategies, ...catalogItems, ...catalogCandidatePromotionLog,
    ...practiceSessions, ...practiceAttempts, ...practiceMasteryState
}
```

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 4). Two schema-barrel imports were removed: `practiceStrategyViews` (path was `practice/strategy_views.ts` per spec; actual on-disk path was `ops/strategy-views.ts`) and `reviewReviewQueue` (`review/review-queue.ts`). Both schema files were deleted from tree; the corresponding tables were dropped from the database via migration `0002_tranquil_mach_iv.sql` (see §3.4 + §3.5 markers). The `review/` directory was removed (no other tables lived there).

`coreTodos` and the demo `app/page.tsx` flow are removed once the diagnostic flow lands.

### 3.7 Database programs

`src/db/programs/extensions/pgvector.ts` follows the shape of `src/db/programs/extensions/pgcrypto.ts:4` and returns `sql\`CREATE EXTENSION IF NOT EXISTS vector\``. Added to the `programs` array in `src/db/programs/index.ts:14`, placed after `pgcrypto()` and before the `grant*ToAppUser()` calls so that the extension exists before grants execute.

A one-shot migration at `scripts/migrate-opaque-option-ids.ts` rewrote every existing `items` row from letter-shaped option ids (A-E) to opaque base32 ids per §3.3.2 when the schema landed. Its rollback artifact is `scripts/_logs/migrate-opaque-ids.jsonl` (one JSON-per-line per migrated row, with the full letter-to-opaque map). The script is idempotent — re-runs detect already-migrated rows and skip. See `docs/plans/opaque-option-ids-and-pipeline-split.md` §3 for the playbook.

### 3.8 `src/db/lib/uuid-time.ts`

Already exists per `rules/no-timestamp-columns.md`. Two helpers used throughout the SPEC:

- `timestampFromUuidv7(id: string): Date` — recovers the 48-bit prefix as a `Date`.
- `uuidv7LowerBound(timestamp: Date | number): string` — returns a UUIDv7-shaped string whose 48-bit prefix is `timestamp`, suitable for `WHERE id >= uuidv7LowerBound(...)` range scans.

If `uuidv7LowerBound` is not yet exported from this file, it must be added; the recency-window query and the `attempts_user_recency` lookups depend on it.

---

## 4. Configuration files

### 4.1 `src/config/sub-types.ts`

Single source of truth for the 14 v1 sub-types per PRD §2. Exports `subTypes`:

```ts
type Difficulty = "easy" | "medium" | "hard" | "brutal"

interface SubTypeConfig {
    id: SubTypeId
    displayName: string
    section: "verbal" | "numerical"
    latencyThresholdMs: number
    bankTargetByDifficulty: Record<Difficulty, number>
}
```

Three latency bands, mapped to cognitive operation type:

- **12s (recognition):** `verbal.antonyms`, `verbal.letter_series`, `numerical.number_series`, `numerical.lowest_values`.
- **15s (quick structured reasoning):** `verbal.analogies`, `verbal.sentence_completion`, `numerical.fractions`, `numerical.percentages`, `numerical.averages`, `numerical.ratios`, `numerical.workrate`, `numerical.speed_distance_time`.
- **18s (sustained multi-constraint reasoning):** `verbal.critical_reasoning`, `numerical.word_problems`.

Default `bankTargetByDifficulty` is `{ easy: 50, medium: 50, hard: 50, brutal: 50 }`. All 14 v1 sub-types use the default; there are no real-only sub-types in v1.

`SubTypeId` is a `as const` union of the 14 string ids. A migration in `src/db/scripts/seed-sub-types.ts` populates the `sub_types` table from this file.

### 4.2 `src/config/strategies.ts`

Exports `strategies: Record<SubTypeId, StrategyEntry[]>` where `StrategyEntry = { kind: 'recognition' | 'technique' | 'trap'; text: string }`. Each of the **14 v1 sub-types** (5 verbal + 9 numerical) has exactly three entries — one of each kind — distilled from `docs/CCAT-categories.md`. The three originally-deferred numerical sub-types (`numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values`) were closed in the strategy-authoring round. 42 strategy rows total (3 entries × 14 sub-types). Each entry is 1–2 sentences. The full `Record<...>` typing makes any future taxonomy add fail at typecheck if its strategies are not authored; the seed script (`src/db/scripts/seed-strategies.ts`) retains its `if (!entries) continue` guard as defense-in-depth.

### 4.3 `src/config/admins.ts`

Hardcoded admin email allowlist. Lowercase only. Compared case-insensitively in `src/server/auth/admin-gate.ts`.

### 4.4 `src/config/item-templates.ts`

Per-sub-type generator templates, versioned. v1 has 14 templates (one per v1 sub-type). The Zod schema for each template's structured output emits `body: { kind: "text", text: string }`:

```ts
interface ItemTemplate {
    subTypeId: SubTypeId
    version: number
    systemPrompt: string
    userPromptFor(difficulty: Difficulty): string
    schema: z.ZodTypeAny  // emits { body: { kind: "text", text }, options[], correctAnswer, explanation }
}
```

The LLM-facing `Option` schema is `{ text: string }` only — the model returns options with text and never invents ids. Server-side post-validation, `assignOptionIds` from `src/server/items/option-id.ts` assigns opaque base32 ids per §3.3.2 before the row is inserted. This matches the OCR ingest path's contract (extract pass also returns text-only options) so both pipelines flow through the same id-assignment seam.

Templates are versioned so a regeneration run can be associated with a specific template version in `items.metadata_json.templateId`.

### 4.5 `src/config/diagnostic-mix.ts`

Hand-tuned array for the diagnostic. Each entry is `{ subTypeId, difficulty }`. Brutal-tier items are excluded. Distribution across the 14 v1 sub-types is **50 entries** under a clamped-proportional allocation: 14 sub-types × 3-entry floor + 8 proportional bonus via largest-remainders against empirical CCAT-prep ratios from `12min_prep_practice_{1..6}/` (204-item denominator). 8 sub-types receive 4 entries (the top 8 by empirical rank: `numerical.number_series`, `verbal.antonyms`, `verbal.sentence_completion`, `verbal.analogies`, `numerical.lowest_values`, `verbal.critical_reasoning`, `numerical.word_problems`, `numerical.percentages`); 6 sub-types stay at the 3-entry floor. Within each sub-type, tier mix is hand-picked from `easy / medium / hard` (no brutal); typical per-sub-type shapes:

- 4-item verbal block: `[easy, medium, medium, hard]`.
- 5-item numerical block: `[easy, medium, medium, medium, hard]`.

The exact tier assignments are curated in the file rather than derived from a formula — the diagnostic is calibration-critical and a flat data file is more honest than an algorithm. The top comment in `src/config/diagnostic-mix.ts` documents the algorithm, the empirical anchor, and two forced tier substitutions for empirical-bank gaps (`numerical.workrate` substitutes `medium` for `easy`; `numerical.lowest_values` substitutes `medium` for `hard`). `targetQuestionCountFor` in `src/server/sessions/start.ts` derives from `diagnosticMix.length`; future mix changes propagate to the diagnostic's session quota automatically.

### 4.6 `src/config/difficulty-curves.ts`

Per-decile difficulty distribution for `full_length` and `simulation`. Both keys today reference the same `standardCurve` constant; future divergence is a one-line change.

```ts
const standardCurve: ReadonlyArray<Record<Difficulty, number>> = [
    { easy: 0.70, medium: 0.25, hard: 0.05, brutal: 0.00 }, // decile 1 (q01–q10)
    { easy: 0.35, medium: 0.45, hard: 0.20, brutal: 0.00 }, // decile 2
    { easy: 0.15, medium: 0.40, hard: 0.35, brutal: 0.10 }, // decile 3
    { easy: 0.05, medium: 0.25, hard: 0.45, brutal: 0.25 }, // decile 4
    { easy: 0.00, medium: 0.15, hard: 0.40, brutal: 0.45 }  // decile 5
]

const difficultyCurves = { full_length: standardCurve, simulation: standardCurve }
```

Within each 10-item decile, the engine applies largest-remainder rounding to convert percentages to integer counts, with ties broken by lower-tier preference (so `7.0 easy + 2.5 medium + 0.5 hard` rounds to `7 + 3 + 0`, not `7 + 2 + 1`).

---

## 5. Authentication

### 5.1 `src/auth/drizzle-adapter-shim.ts`

Wraps `@auth/drizzle-adapter` and converts `Date ↔ ms` on every method call:

```ts
function bigintAdapter(drizzleAdapter: ReturnType<typeof DrizzleAdapter>) {
    function dateToMs(d: Date | undefined | null): number | undefined {
        if (d === undefined || d === null) return undefined
        return d.getTime()
    }
    function msToDate(ms: number | undefined | null): Date | undefined {
        if (ms === undefined || ms === null) return undefined
        return new Date(ms)
    }
    return {
        ...drizzleAdapter,
        // override createUser, getUser, getUserByEmail, getUserByAccount, updateUser,
        // createSession, getSessionAndUser, updateSession, deleteSession,
        // createVerificationToken, useVerificationToken
        // — each one converts Date inputs → ms before the underlying call,
        //   converts ms results → Date before returning to Auth.js
    }
}

export { bigintAdapter }
```

`src/auth/drizzle-adapter-shim.test.ts` covers round-trip conversions for each adapter method including null-value cases (unverified email, sessions without expiry overrides).

### 5.2 `src/auth.ts`

```ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { bigintAdapter } from "@/auth/drizzle-adapter-shim"
import { db } from "@/db"
import { users } from "@/db/schemas/auth/users"
import { accounts } from "@/db/schemas/auth/accounts"
import { authSessions } from "@/db/schemas/auth/auth_sessions"
import { verificationTokens } from "@/db/schemas/auth/verification_tokens"
import { env } from "@/env"

const adapter = bigintAdapter(DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens
}))

const { handlers, auth, signIn, signOut } = NextAuth({
    adapter,
    providers: [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })],
    session: { strategy: "database" },
    secret: env.AUTH_SECRET
})

export { handlers, auth, signIn, signOut }
```

### 5.3 `src/auth.config.ts`

Edge-safe slice of the config (no Drizzle adapter import) used by `src/middleware.ts`. Contains only the providers list and auth callbacks.

### 5.4 Environment variables

Add to `src/env.ts:29` (`server` schema):

```ts
AUTH_SECRET: z.string().min(32),
AUTH_GOOGLE_ID: z.string().min(1),
AUTH_GOOGLE_SECRET: z.string().min(1),
ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
OPENAI_API_KEY: z.string().startsWith("sk-"),
CRON_SECRET: z.string().min(32)
```

And the matching `runtimeEnv` entries reading from `process.env.*`. Update `.env.example` to document the new variables.

### 5.5 `src/middleware.ts`

Protects every route except `/api/auth/*`, `/login`, `/api/health`, `/api/cron/*`. The cron paths are protected by their own header check against `CRON_SECRET`.

```ts
import { auth } from "@/auth.config"

const PUBLIC_PREFIXES = ["/api/auth", "/login", "/api/health", "/api/cron"]

export default auth((req) => {
    const path = req.nextUrl.pathname
    for (const prefix of PUBLIC_PREFIXES) {
        if (path.startsWith(prefix)) return
    }
    if (!req.auth) {
        const loginUrl = new URL("/login", req.nextUrl.origin)
        return Response.redirect(loginUrl)
    }
})

export const config = { matcher: ["/((?!_next/static|_next/image|favicon).*)"] }
```

### 5.6 Admin gate

`src/server/auth/admin-gate.ts` exports `requireAdminEmail()`:

```ts
const ErrUnauthorized = errors.new("unauthorized")

async function requireAdminEmail(): Promise<{ userId: string; email: string }> {
    const session = await auth()
    if (!session?.user?.email) {
        logger.warn({}, "admin gate: no session")
        throw errors.wrap(ErrUnauthorized, "no session")
    }
    const email = session.user.email.toLowerCase()
    if (!adminEmails.includes(email)) {
        logger.warn({ email }, "admin gate: email not in allowlist")
        throw errors.wrap(ErrUnauthorized, "email not in admin allowlist")
    }
    return { userId: session.user.id, email }
}

export { ErrUnauthorized, requireAdminEmail }
```

### 5.7 `(app)` layout gate

`src/app/(app)/layout.tsx` enforces the diagnostic-completed gate via a server-component check:

```ts
const session = await auth()
if (!session?.user?.id) redirect("/login")

const completedDiagnostic = await db
    .select({ ok: sql<number>`1` })
    .from(practiceSessions)
    .where(and(
        eq(practiceSessions.userId, session.user.id),
        eq(practiceSessions.type, "diagnostic"),
        isNotNull(practiceSessions.endedAtMs),
        ne(practiceSessions.completionReason, "abandoned")
    ))
    .limit(1)

if (completedDiagnostic.length === 0) redirect("/diagnostic")
```

Layout-level placement is load-bearing — a page-level check would only cover the home route and let users reach `/drill/[subTypeId]` or `/test` directly via URL before completing the diagnostic.

### 5.8 Account deletion

`src/server/auth/account-deletion.ts` exports `deleteAccount(userId)`. Runs a single transaction:

1. Compute `rows_affected` per user-scoped table (sessions, attempts via cascade, mastery_state, accounts, auth_sessions). (`review_queue` + `strategy_views` were dropped in v1-code-cleanup commit 4 — see §3.4 + §3.5 callouts; cascade list updated accordingly.)
2. `DELETE FROM users WHERE id = $1` — `ON DELETE CASCADE` on every user-scoped table flows the deletion through.
3. Log a structured event with `{ user_id_hash, deleted_at_ms, rows_affected }` (no PII; `user_id_hash` is `sha256(user_id)`).

`items` is shared content and does not cascade. The `/settings/delete-account` page surfaces a confirmation dialog with the cascade summary before invoking the action.

---

## 6. The focus shell

The single load-bearing client primitive of the application (PRD §5.1, §7). Lives at `src/components/focus-shell/focus-shell.tsx`.

### 6.1 Component signature

```ts
"use client"

interface FocusShellProps {
    sessionId: string
    sessionType: "diagnostic" | "drill" | "full_length" | "simulation"
    sessionDurationMs: number | null   // null for diagnostic (untimed at session level)
    perQuestionTargetMs: number        // 18000 for standard
    targetQuestionCount: number
    paceTrackVisible: boolean          // false for diagnostic
    initialItem: ItemForRender
    strictMode: boolean                // simulation only — disables pause UI etc.
    onSubmitAttempt: (input: SubmitAttemptInput) => Promise<SubmitAttemptResult>
    onEndSession: () => Promise<void>
}

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 2). The `initialTimerPrefs` and `ifThenPlan` props were dropped from `FocusShellProps`; the `TimerPrefs` interface was deleted from `src/components/focus-shell/types.ts`; the `'review'` value was dropped from `sessionType`. v1 timer visibility is static per session type — see §6.6.

interface ItemForRender {
    id: string
    body: ItemBodyDecoded              // post-Zod parsing; discriminated union with one variant in v1 ({ kind: 'text' })
    options: { id: string; text: string }[]
    selection: ItemSelection           // opaque; echoed back in the next SubmitAttemptInput
}

interface ItemSelection {
    servedAtTier: "easy" | "medium" | "hard" | "brutal"
    fallbackFromTier?: "easy" | "medium" | "hard" | "brutal"
    fallbackLevel: "fresh" | "session-soft" | "recency-soft" | "tier-degraded"
}
```

`SubmitAttemptInput` and `SubmitAttemptResult` are defined in §7. `SubmitAttemptInput` carries an `ItemSelection` field that the FocusShell echoes from the most-recently-rendered item; `submitAttempt` writes those values onto the new `attempts` row.

### 6.2 Internal state (managed by `shell-reducer.ts`)

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 2). The `timerPrefs` field was dropped from `ShellState` and the `InitArgs`; the `toggle_session_timer` and `toggle_question_timer` action kinds were dropped from `ShellAction` along with their reducer functions and dispatch lines. v1 timer visibility is static per session type, computed inline in the FocusShell render — session timer + chronometer rendered iff `sessionDurationMs !== null`; per-question timer bar always rendered.

Per PRD §7 — global state libraries are banned; the shell uses `useReducer`.

```ts
interface ShellState {
    currentItem: ItemForRender
    questionStartedAtMs: number          // performance.now() at first paint of currentItem
    sessionStartedAtMs: number
    elapsedQuestionMs: number            // updated by requestAnimationFrame
    elapsedSessionMs: number
    triagePromptFired: boolean           // flips true once elapsedQuestionMs >= perQuestionTargetMs
    triagePromptFiredAtMs?: number       // for the 3-second triage_taken window
    selectedOptionId?: string
    interQuestionVisible: boolean
    questionsRemaining: number
}

type ShellAction =
    | { kind: "tick"; nowMs: number }
    | { kind: "select"; optionId: string }
    | { kind: "submit" }
    | { kind: "triage_take" }
    | { kind: "advance"; next?: ItemForRender }
```

### 6.3 Layout

Vertical flex column with two regions — a chrome row at the top and a content region below it. There is no `footer` region anymore (the focus-shell overhaul collapsed it):

```
chrome row:
    chronometer (top-right, MM:SS countdown)
    <QuestionProgressionBar>      // top — always blue
    "Question N / M" label (with optional "— last question" suffix)
    <SessionTimerBar>             // with "Overall time" label; pace-keyed blue/red
    <QuestionTimerBarStack>       // primary + overflow per-question bars
    horizontal divider
content region:
    <ItemPrompt> (question body + option buttons)
    "Submit Answer" full-width button
```

- The three bars stack with consistent vertical rhythm; their labels (`Per question time`, `Overall time`) sit immediately below the corresponding bar.
- The progression bar is unconditional — it renders for every session type. The session bar + chronometer are hidden when `sessionDurationMs === null` (diagnostic only); visible otherwise. The per-question bar is always visible. (v1 post-cleanup-commit-2 2026-05-04: timer visibility is static per session type — toggle UX cut, no `timerPrefs` state, no user-facing visibility controls.)
- `<TriagePrompt>` is rendered as an overlay layer outside the chrome row + content region. `<InterQuestionCard>` and `<Heartbeat>` are siblings to the main column.

### 6.4 Timer animation strategy

- `requestAnimationFrame` loop, NOT `setInterval`. Loop dispatches a `{ kind: "tick", nowMs: performance.now() }` action.
- All elapsed values derived from `performance.now()` minus the captured start values. No clock drift.
- On `submit`, the loop reads the final `performance.now()` and includes `latencyMs = submitNow - questionStartedAtMs` in `SubmitAttemptInput`.
- Question start (`questionStartedAtMs`) is captured in a `useEffect` with no deps inside an inner `<ItemSlot>` keyed by `currentItem.id`, so it runs at first paint of every new item.
- The first item is server-rendered into the page response (§10) so first paint is the moment the question text is visible — not a skeleton + client-fetch.

### 6.5 Latency measurement

- Start: `performance.now()` captured in the `<ItemSlot>` mount effect.
- End: `performance.now()` captured in the click handler that dispatches `submit`.
- Difference is the `latency_ms` written to `attempts.latency_ms`.
- v1 items are text-only, so first paint == text paint == question visible.
- The shell does not round; the database column is `integer` so the value is implicitly truncated by `Math.floor` at the boundary.

### 6.6 Three peripheral elements

| element | shape | Fill direction | default visibility | toggleable mid-session? |
|---|---|---|---|---|
| `<SessionTimerBar>` | horizontal bar in the chrome row, with the numeric MM:SS readout (e.g. `8:42`) rendered as the chronometer at the page's top-right | fill grows from left edge as time elapses. Color is pace-keyed: BLUE (`bg-blue-600`) when within the cumulative per-question budget for the current question, RED (`bg-red-600`) when past that budget. "Behind pace" is `elapsedSessionMs > (currentQuestionIndex + 1) × perQuestionTargetMs` — i.e., the user has spent more time than they should have spent and STILL be on the current question. The color signal lives on this bar — both the absolute-elapsed-time signal and the pace-deficit signal share the single fill. Worked examples (50q × 18s session): Q1 t=10s → blue (within Q1's 18s budget); Q1 t=20s → red (past Q1's 18s budget); Q2 t=25s → blue (still within 36s budget); Q2/50 at 14/15 min → red (~840s well past Q2's 36s budget); Q49/50 at 2/15 min → blue (120s well within Q49's 882s budget). | ON for drill, full-length, simulation, review. **HIDDEN** for diagnostic. | yes; toggle persists per-user via `users.timer_prefs_json`. Toggling the session timer hides/shows the chronometer in lockstep. |
| `<QuestionProgressionBar>` | horizontal bar of N equal-width segments in the chrome row, one segment per question target. Renamed from `<PaceTrack>` in the focus-shell overhaul (commit 3). | leftmost K segments always filled solid blue (`bg-blue-600`); remaining segments stay neutral gray. The bar is purely a "where you are in the question count" indicator — pace-deficit color was tried here briefly in the post-overhaul-fixes round but moved to `<SessionTimerBar>` (mixing question-position and pace signals into the same bar was visually noisy). | always visible — the segments give a "you're on K of N" hint independent of any toggle. | not toggleable (the bar is unconditional). |
| `<QuestionTimerBarPrimary>` | top of two stacked per-question bars in the chrome row. Covers `[0, perQuestionTargetMs)`. Two stacked fill layers (blue underneath, red on top) sharing the gray track. | fill ratio = `min(elapsedQuestionMs / perQuestionTargetMs, 1.0)`. Color is **discretely keyed** to elapsed time: BLUE for `[0, perQuestionTargetMs / 2)`, RED for `[perQuestionTargetMs / 2, perQuestionTargetMs]`. The flip is a discrete jump at half-target — the entire current fill turns red, not a gradient. Capped at 100% red past target via `animation-fill-mode: forwards`. | tied to `timerPrefs.questionTimerVisible` (ON by default per the polish-plan default flip). | yes |
| `<QuestionTimerBarOverflow>` | bottom of the two stacked per-question bars in the chrome row, sits directly below the primary bar. Single red fill on a gray track. | empty (`scaleX(0)`) for `elapsedQuestionMs < perQuestionTargetMs`. Fills 0 → 100% red over `[perQuestionTargetMs, 2 × perQuestionTargetMs)`. Caps at 100% red beyond. The fill is held at scaleX(0) during the delay window via `animation-fill-mode: both` (NOT `forwards` — see §6.14). | tied to `timerPrefs.questionTimerVisible` (renders as a sibling of the primary bar). | yes (lockstep with the primary bar) |

The two per-question bars are wrapped by a shared `<QuestionTimerBarStack>` parent that owns the layout rhythm and the "Per question time" label sitting beneath the pair.

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 2). The "toggleable mid-session?" column entries are now all **no** — the toggle UX (state + actions + dispatch + reducer fns + render-condition reads) was dropped from `src/components/focus-shell/`. The `<SessionTimerBar>`'s visibility is now static-per-session-type: hidden when `sessionDurationMs === null` (diagnostic), visible otherwise (drill / full_length / simulation). The `<QuestionTimerBarPrimary>` and `<QuestionTimerBarOverflow>` always render. The "tied to `timerPrefs.questionTimerVisible`" annotations in the table above are stale spec — preserved for historical reference; the per-question bars are unconditional in v1. Per-user persistence (`users.timer_prefs_json`) is unwritten; the column drops in commit 4.

**Bar color allocation.** The progression bar is always blue — it's a question-count indicator with no time semantics. The session bar carries both the elapsed-time signal (the fill ratio) AND the pace-deficit signal (the fill color). An earlier post-overhaul-fixes commit put the pace-deficit color on the progression bar in addition to the session bar's static red; the doubled signal was visually noisy and the progression bar's color was distracting from its "K of N" job, so the color was consolidated onto the session bar in a follow-up.

### 6.7 Triage prompt — persistent, never auto-submits

When `elapsedQuestionMs >= perQuestionTargetMs` and `triagePromptFired` is false, the reducer flips `triagePromptFired = true`, captures `triagePromptFiredAtMs = elapsedQuestionMs`, and the `<TriagePrompt>` overlay fades in. **The prompt is persistent — it stays visible until the user submits or takes it.** Visual intensity may subtly increase between the per-question target and 30 seconds, then plateaus. There is **no auto-submit** at any time during a question; the session timer is the only hard cutoff.

When `sessionDurationMs !== null` and `elapsedSessionMs >= sessionDurationMs`, the focus shell auto-calls `onEndSession()` (wrapped in `errors.try()` so a server-action failure logs but doesn't strand the user) and navigates to `/post-session/[sessionId]`. The diagnostic case (`sessionDurationMs === null`) is exempt — the diagnostic is untimed at the session level (PRD §4.1, capacity measurement) and ends only when all 50 attempts are submitted. Pacing feedback for the diagnostic surfaces post-session as a derived sentence, not in-flow; see §6.10.

Render rule: always show `Best move: guess and advance.` with `(Space)` suffix. (v1 post-cleanup-commit-2 2026-05-04: the prior "if ifThenPlan is non-empty, render it instead" branch was dropped — NarrowingRamp protocol cut from v1 means no `ifThenPlan` reaches the prompt. The prop chain through `<TriagePrompt>` was removed.)

The user can take the prompt by:
- Clicking it.
- Pressing the `T` key.

Taking it dispatches `triage_take`, which auto-submits the currently-selected option (or a random option per PRD §6.1 if none is selected). The reducer marks `triageTaken = true` only if the take happens within 3000ms of `triagePromptFiredAtMs`.

Triage rendering is independent of timer-bar visibility — it appears regardless of toggle state.

### 6.8 Keyboard shortcuts

Active inside the FocusShell:
- `T` — take the triage prompt.
- `1`–`5` — select option at index 0–4.
- `A`–`E` — same as 1–5 (the letter-labeled alternative shorthand).
- `Enter` — submit the currently selected option.

Spacebar is **not** bound; preventing default on space would break radio-button selection elsewhere.

### 6.9 Inter-question card

After `submit` and before the next item paints, `<InterQuestionCard>` fades in for ~200ms (no progress count, no item index per PRD §5.1). The next item's `questionStartedAtMs` is captured AFTER the card fades out, in the `<ItemSlot>` mount effect.

### 6.10 Post-session pacing line (replaces the in-flow overtime note)

The diagnostic is untimed at the session level (PRD §4.1, capacity measurement, not triage). The focus shell renders no in-flow overtime overlay. Pacing feedback is derived post-session and surfaces as a single neutral sentence beneath the onboarding-targets form on `/post-session/[sessionId]`:

> Your diagnostic took {N} minutes. The real CCAT is 15 minutes for 50 questions.

The sentence renders only when the user took longer than 15 minutes (`elapsedMs > 900_000`); otherwise it is omitted. The phrasing is intentionally informational — the user calibrates against the real-CCAT reference without being primed by a triage frame the diagnostic isn't training. Drills will train pacing toward the same 15-min/50-question reference.

`pacingMinutes` is derived in `loadSession` (`src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx`) on every load:

```ts
const lastAttemptId = await db
    .select({ id: sql<string | null>`max(${attempts.id}::text)::uuid` })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId))

const lastAttemptMs = timestampFromUuidv7(lastAttemptId).getTime()
const elapsedMs = lastAttemptMs - row.startedAtMs
const pacingMinutes = elapsedMs > 900_000 ? Math.round(elapsedMs / 60_000) : undefined
```

The query plan (verified via EXPLAIN ANALYZE) uses `attempts_session_id_idx`; cost is bounded by per-session attempts (≤50), independent of global table size. See §6.14.6 for the canonical UUIDv7-text-max pattern.

**Vestigial column.** `practice_sessions.diagnostic_overtime_note_shown_at_ms` (§3.4) was the polish-round writer for an in-flow note that's been removed. Sub-phase 1 leaves it in place unread; a future cleanup commit drops it.

### 6.11 Heartbeat

The shell mounts a `<Heartbeat sessionId={sessionId} />` client component that:

- Fires `navigator.sendBeacon('/api/sessions/' + sessionId + '/heartbeat', new Blob([""], { type: "text/plain" }))` every 30 seconds via **recursive `setTimeout`** (not `setInterval`, per the project's no-setInterval convention; recursive `setTimeout` cleans up on unmount via `clearTimeout` rather than leaving a free-running interval handle).
- Registers a `pagehide` event listener via `AbortController` that fires the same beacon on clean tab close. Cleanup on unmount calls `controller.abort()` to detach the listener.
- Uses `sendBeacon`, not `fetch`, because the browser deprioritizes `fetch` calls fired from background tabs and may drop them on tab close. `sendBeacon` is the standard primitive for "fire-and-forget POSTs that must survive page unload."

The route handler at `/api/sessions/[sessionId]/heartbeat` updates `last_heartbeat_ms` to server-side `(extract(epoch from now()) * 1000)::bigint` and returns `204`. The route's WHERE clause additionally scopes by the cookie owner's user_id via an inline subquery against the auth-sessions table — see §7.7 for the Shape A contract. The abandon-sweep cron (§7.12) finalizes sessions whose `last_heartbeat_ms` falls past `ABANDON_THRESHOLD_MS = 5 * 60_000`.

**Tab-backgrounding behavior — intended outcome.** Chrome's `IntensiveWakeUpThrottling` policy caps backgrounded `setTimeout` callbacks to roughly once per minute after the tab has been hidden for ~5 minutes. Once throttling kicks in, the heartbeat cadence drops from one beacon per 30 seconds to one beacon per ~60 seconds. With `HEARTBEAT_GRACE_MS = 30_000` (the cron's added grace) and `ABANDON_THRESHOLD_MS = 5 * 60_000` (the cron's cutoff), a backgrounded tab whose heartbeats space out to 60+ seconds will eventually have its `last_heartbeat_ms` cross the 5-minute abandon threshold; the cron sweeps the row and finalizes the session as `'abandoned'`. **This is the intended outcome.** A user who backgrounds their tab during a timed drill or diagnostic IS abandoning the session in the sense that matters — they're no longer in the focus shell, the timed contract no longer holds, and resuming midway would corrupt the latency signal the mastery model depends on. The browser-level throttling is upstream of any choice this codebase makes; rather than fighting it (e.g., with a service worker or `Page Visibility API` pause-instead-of-abandon logic), the design lets the throttling produce the correct outcome via the existing cron path. A user who briefly tab-switches and returns within the 5-minute window resumes cleanly via `startSession`'s fresh-resume path; a user who leaves the tab for 5+ minutes gets their session finalized.

### 6.12 Audio cues

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 2). The audio paths previously gated on `timerPrefs.questionTimerVisible` are now **unconditional** — the gate was removed alongside the timer-toggle UX cut, preserving the Phase-3-shipped behavior of audio-on-by-default. The earlier doc-only round's claim that "all focus-shell audio is silent in v1" was inverted relative to Phase 3 reality and is corrected here. The audio implementation at `src/components/focus-shell/audio-ticker.ts` runs on every per-question target crossing.

> **Round 1 commit 9 amendment (2026-05-09).** The post-target audio model was retired-and-replaced. Pre-amendment: the warning sample played in a continuous loop (`source.loop = true`) from target crossing until item advance. Post-amendment: the warning sample plays **once** at target crossing as a one-shot accent, and synth ticks at the same 1-tick/sec cadence as pre-target ticks fire at integer-second boundaries beyond the target until item advance. Trigger: Round 1 §5.9 redline ("warning sound plays once, ticking-sound thereafter") + commit-9 audit-step finding that the prior loop was felt as overly aggressive. The exported audio-ticker function names (`startUrgencyLoop` / `stopUrgencyLoop`) and the reducer flag (`urgencyLoopStartedForCurrentQuestion`) intentionally retain "Loop" naming to keep the amendment scope minimal — every concrete behavior they describe is the warning-once-then-cancel-on-advance contract. See `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md` §5.9 for the audit trail.

The focus shell uses a hybrid two-path audio model — synthesized ticks both before AND after the per-question target, with a single sampled MP3 warning accent at the target crossing.

**Pre-target ticks.** A soft 880 Hz sine pip fires at every integer second strictly greater than half the per-question target and strictly less than the target itself. For an 18-second target this lands as eight ticks at seconds 10, 11, 12, 13, 14, 15, 16, 17. Each tick is ~50 ms, peak gain 0.12, synthesized via `OscillatorNode` + `GainNode`. AudioContext is created lazily on first user interaction; calls before that unlock are silent no-ops. There is no synth dong at second 18 — the warning sample's first playback replaces it.

**Target-crossing warning sample.** At session start (the same first-interaction moment that creates the AudioContext), one MP3 file is picked at random from the bank manifest at `src/config/sound-bank.ts`. The manifest is build-time-generated by `scripts/copy-sounds-to-public.ts` from the top-level `*.mp3` files in `data/sounds/` — subdirectories under `data/sounds/` (e.g., `success/`, `failure/`, `ticks/`) are deliberately NOT enumerated; the bank is the top-level files only. The chosen file's `AudioBuffer` is fetched and decoded once. When `elapsedQuestionMs` first crosses `perQuestionTargetMs`, that buffer plays **once** at peak gain ~0.8 as a one-shot warning accent (the `source.loop = true` from the pre-Round-1 design was retired per the commit-9 amendment above). The active source is cancelled mid-playback if an item advance fires before the sample completes — same cleanup-on-`currentItem.id`-change effect that handles every advance path (Submit click, Space-triage take, click-triage take, server-end). The same file plays for every question in the session; a hard refresh re-picks.

**Post-target ticks.** Synth ticks identical in shape to the pre-target ticks (880 Hz, ~50 ms, peak gain 0.12) fire at integer seconds strictly greater than the per-question target, with no upper bound — the cleanup-on-`currentItem.id`-change effect is the terminator. For an 18-second target this lands as ticks at seconds 19, 20, 21, … until the user submits or the server advances. The pre-target and post-target streams share the same `playTick` function but use independent cross-second-detection refs (`prevSecondRef` for pre-target, `prevPostTargetSecondRef` for post-target) so the boundary at second 18 doesn't drop or duplicate either stream.

**Gating and silence.** Before the first user interaction, AudioContext doesn't exist and every audio path returns silently — there is no silent fallback to "no sound, but state still ticks"; failure-to-play is the *correct* behavior under browser autoplay policy. (The prior `timerPrefs.questionTimerVisible` gate was dropped in v1-code-cleanup commit 2; audio runs unconditionally once the AudioContext is unlocked.)

Audio is implemented in `src/components/focus-shell/audio-ticker.ts`. The reducer's `urgencyLoopStartedForCurrentQuestion` flag prevents the warning sample from double-firing within a question; pre-target and post-target ticks each use a `useRef`-tracked previous-integer-second value (no reducer state) for cross-second detection.

### 6.13 Submit semantics

Submit is always enabled. Clicking Submit with no option selected records `selected_answer: NULL` in `attempts` and advances to the next item. Blank attempts are a real signal in the mastery model, not a UI error state — the user choosing to abandon a question cleanly is the strategic skill the triage prompt is designed to reinforce.

The Space-key triage take uses the same submit path: it submits whatever's currently selected (blank if nothing). Random-pick "guess and advance" was dropped in the polish-plan commit 3 — random picks contaminate the mastery model with attempts that look real-but-wrong.

### 6.14 Implementation notes for contributors

Five learned-the-hard-way items from the focus-shell post-overhaul-fixes round (commits 1–4 of `docs/plans/focus-shell-post-overhaul-fixes.md`). Read these before touching the focus-shell internals.

#### 6.14.1 Pace-deficit threshold

The `<SessionTimerBar>`'s `behindPace` prop fires when `elapsedSessionMs > (currentQuestionIndex + 1) × perQuestionTargetMs`. The right-hand side is "the cumulative time you've been allotted to STILL be on the current question." For Q1 (`currentQuestionIndex=0`), the threshold is `1 × 18000 = 18000 ms` — the bar stays blue for the first 18 seconds and turns red only if you've sat on Q1 past its per-question target. For Q2 (`currentQuestionIndex=1`), the threshold is `2 × 18000 = 36000 ms`. For Q_K, the threshold is `K × perQuestionTargetMs`.

This matches the "you should have moved past Q_K by now" intuition: a user who is on Q2 and 25 seconds into the session is on-pace (still within Q2's per-question budget); a user who is on Q2 and 40 seconds in has overshot and the session timer flips red.

An earlier ratio-based formulation (`elapsedSessionMs / sessionDurationMs > currentQuestionIndex / targetQuestionCount`) shipped briefly in the post-overhaul-fixes round. It produced the surprising "Q1 starts red the moment any time elapses" because the questions-ratio is `0 / N = 0` on Q1, so any time-ratio greater than 0 fired the flip. The cumulative-budget formulation is the corrected version.

(Historical note: the pace-deficit color initially lived on `<QuestionProgressionBar>` for a single commit. It moved to `<SessionTimerBar>` in a follow-up because the doubled signal was visually noisy and pace mixing into the segment bar muddled its "K of N" purpose.)

#### 6.14.2 Tailwind v4 footguns

Two distinct issues surfaced while implementing the dual stacked timer bars (commit 3); both are general enough to bite future contributors.

- **`[animation-delay:Nms]` arbitrary-property classes are mangled.** Tailwind v4 silently expands `[animation-delay:18000ms]` into multiple `animation` shorthand declarations (`enter` and `exit` named utilities) inside the same generated class. Each shorthand resets the `animation-delay` sub-property to `0s`. The generated CSS looks like:

  ```css
  .[animation-delay\:18000ms] {
      animation-delay: 18s;
      animation: enter ...;     /* resets delay */
      animation: exit ...;      /* resets delay */
  }
  ```

  **Fix:** bake the duration AND the delay into a custom utility variable that uses the full `animation` shorthand: `--animate-fill-bar-after-target: fill-bar 18000ms linear 18000ms both;`. Don't rely on stacking `animate-fill-bar` with a separate `[animation-delay:...]` arbitrary class.

- **`animation-fill-mode: forwards` does NOT apply the FROM keyframe during the delay window.** With `forwards`, an animation with positive `animation-delay` shows the element's *default* state (no transform applied) during the delay — for a `transform: scaleX(0)` keyframe, that means the bar renders at full width instead of empty. **Fix:** use `animation-fill-mode: both` instead. `both` applies the FROM keyframe during the delay AND holds the TO keyframe after the animation ends.

#### 6.14.3 Animation-time harness measurement

When verifying CSS keyframe behavior with `playwright-core`, sample on `element.getAnimations()[0].currentTime` (a browser-side `DOMHighResTimeStamp` in milliseconds since the animation began) rather than wall-clock from the harness side. The harness's `Date.now()` and the browser's `performance.now()` are not synchronized across the page-load → first-paint → animation-mount sequence; in our verification runs the offset was 150–300 ms. For any assertion that requires sub-second precision around a keyframe boundary (e.g., the half-target color flip in the primary timer bar), use the animation's own clock.

#### 6.14.4 Headless-Chromium autoplay policy

`AudioContext` won't reach `state === "running"` in headless Chromium unless **both**:

1. The browser is launched with `--autoplay-policy=no-user-gesture-required` (Playwright `chromium.launch({ args: [...] })`), AND
2. The unlock click is delivered via real pointer events (`page.click(selector)` in Playwright), NOT programmatic `.click()` from `page.evaluate(() => element.click())`.

Programmatic `.click()` calls don't satisfy the "trusted user gesture" requirement that gates AudioContext unlocking, even with the launch flag set. Production users always click via real input, so this is a harness-only consideration. Surfaced because it caused 7/8 silent-failures in the commit-2 verification harness before being diagnosed.

#### 6.14.5 Session-engine same-id-advance bug (server-side, masked by client)

`getNextUniformBand` (in `src/server/items/selection.ts`) can re-serve a session-attempted item via the `session-soft` fallback level when the bank for a sub-type is small. With a 5-item `numerical.fractions` bank and a few attempts already in session, the fallback chain exhausts uniqueness and the server returns `nextItem.id === currentItem.id`. The focus shell's `<ItemSlot key={state.currentItem.id}>` keyed mount doesn't re-fire when the key doesn't change — which previously left `submitPending: true` indefinitely after triage take, producing the frozen-UI symptom.

Commit 1 of the post-overhaul-fixes round added `submitPending: false` to `reduceAdvance`, which **masks** this server-side bug — the user is now unblocked even when the same item is re-served. They see the same options again, can re-answer, and proceed. The server-side aspect remains a real bug worth investigating (filed as a follow-up in `docs/plans/focus-shell-post-overhaul-fixes.md` §10). Don't remove the `submitPending: false` clear in `reduceAdvance` thinking it's redundant — it's load-bearing for this case.

#### 6.14.6 UUIDv7-text-max pattern for time-derivation queries

When a query needs the chronologically-latest row from a uuidv7-keyed table that has no `_ms` columns (project rule `rules/no-timestamp-columns.md`), use `max(id::text)::uuid` and decode the result via `timestampFromUuidv7` from `src/db/lib/uuid-time.ts`:

```ts
import { sql } from "drizzle-orm"
import { timestampFromUuidv7 } from "@/db/lib/uuid-time"

const rows = await db
    .select({ lastId: sql<string | null>`max(${table.id}::text)::uuid` })
    .from(table)
    .where(eq(table.partitionKey, partitionValue))

const lastId = rows[0]?.lastId
if (lastId) {
    const lastTimestamp = timestampFromUuidv7(lastId).getTime()
    // ...
}
```

**Why the text cast.** PostgreSQL has no built-in `max(uuid)` aggregate. Casting `id::text` enables PG's text MAX, which on UUIDv7's hex representation produces the same ordering as the underlying byte order — and UUIDv7's byte order matches its 48-bit time prefix. The result casts back to `uuid` cleanly.

**Why this beats `ORDER BY id DESC LIMIT 1`.** The DESC-LIMIT shape uses `<table>_pkey` Index Scan Backward; PG walks the PK in reverse and filters out non-matching partition rows until it finds a match. At production scale that can scan many irrelevant rows. The `max(id::text)::uuid` shape uses the partition index (e.g., `attempts_session_id_idx`) to narrow to the partition's rows, then aggregates over them — cost is bounded by per-partition rows, independent of global table size.

**First use site.** `loadSession` in `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` (the post-session pacing-line derivation, §6.10).

#### 6.14.7 EXPLAIN ANALYZE as a verification convention for hot-route queries

When introducing a new query on a hot route (any layout, any page that's hit on every navigation, any post-session-style route), capture an `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` plan and verify it uses an existing index (no Seq Scan). Log the cost in the commit message so a future reader can compare against drift. The §6.10 pacing-line query was verified this way during commit 3 of `docs/plans/phase3-diagnostic-flow.md`:

```
Aggregate (cost=9.40..9.41 rows=1 width=16)
  -> Index Scan using attempts_session_id_idx on attempts
       Index Cond: (session_id = $1)
       Buffers: shared hit=3
Execution Time: 0.076 ms
```

Compare alternative query shapes when the planner could pick differently at production scale; pick the shape that's bounded by per-partition work, not global table state.

#### 6.14.8 Smoke-script directory and the workflow-side-effect inference gap

`scripts/dev/smoke/*.ts` contains manual verification scripts that aren't part of `bun test`. They run when the developer sets up a verification environment (typically: docker postgres + `bun dev` running). The directory is the right home for any verification that:

- Requires a running Next.js dev server (e.g., for the workflow runtime; see below).
- Touches DB state in ways that aren't fully isolatable inside a single test.
- Is meaningful as a manual sign-off step rather than an automated regression check.

`bun test` runs only the hermetic tests under `src/**/*.test.ts` — DB-driven where the docker postgres alone is enough harness; pure-function for everything else.

**Workflow-side-effect inference gap.** Vercel Workflows (`workflow/api`'s `start()`) only fire inside the Next.js server process — the runtime is wired via `withWorkflow` in `next.config.ts`. Calling `start(masteryRecomputeWorkflow, ...)` from outside that process (e.g., from `bun test`) throws "invalid workflow function." Per the next-tier-side-effect pattern: the workflow is verified by its observable downstream effect (mastery_state rows upsert), not by direct trigger assertion.

The `scripts/dev/smoke/diagnostic-mastery-recompute.ts` smoke verifies the trigger→runtime→upsert chain via the abandon-sweep cron route (the only HTTP-accessible workflow trigger surface; both `endSession` and the cron call `start(masteryRecomputeWorkflow, [{sessionId}])` per §7.3, so workflow-fires-from-cron implies workflow-fires-from-endSession by call-shape equivalence). **The equivalence is an inference, not direct verification.** If `endSession`'s call site is ever modified, re-verify the equivalence by extending the smoke or by manual end-to-end exercise.

#### 6.14.9 Empty-state-during-async-workflow rendering pattern

When a UI surface depends on data that's populated by an async workflow trigger (e.g., the Mastery Map's `mastery_state` rows are written by `masteryRecomputeWorkflow`, fired async from `endSession`), the page-level read can land *before* the workflow's writes. The Mastery Map's `<ComputingState>` (`src/components/mastery-map/computing-state.tsx`) is the canonical handling shape; reuse it for any future workflow-driven UI rather than re-deriving:

- **Detection.** Branch on the data-shape that's empty during the race window, NOT on a separate "is computing" boolean. For the Mastery Map, the gate-passing `(app)` layout guarantees the user has a completed-non-abandoned diagnostic, so `masteryStates.size === 0` is sufficient — there's no other code path that produces an empty map at this surface. Adding a separate `isComputing` prop would just duplicate the same condition.
- **Pane.** A simple heading + body. No structural skeleton mirroring the populated render — the populated render's layout isn't load-bearing during this window, and a faithful skeleton invites visual flicker on transition.
- **Polling.** `setTimeout(2s)` → `router.refresh()` → parent re-renders. The Suspense boundary handles the re-render; the new server-component render reads fresh data, and if the data is now non-empty the parent branches to the populated form. The pane unmounts naturally on transition.
- **Budget.** 30 seconds per mount instance. After the budget elapses, the pane shows a fallback message ("Still computing — refresh manually if this takes longer") and stops polling. The reset-on-refresh property of `setTimeout`-based budgets is acceptable: in the common case (workflow completes within budget) the pane unmounts before the timer fires; in the rare stuck-workflow case the user sees the pane indefinitely but can recover via manual refresh.
- **Why no Suspense alone?** Suspense waits on a promise that resolves when *some* condition is met. The condition here is "external system finished its async work" — not a promise the page can await. Polling is the appropriate primitive.

#### 6.14.10 Race-window UI verification pattern

When verifying UI that surfaces during a brief race window (e.g., the empty-state pane between a workflow's trigger and its writes), prefer **instrumenting the test setup to reproduce the condition stably** over **catching the natural race window via tightly-timed observation**. The Mastery Map's empty-state smoke (`scripts/dev/smoke/mastery-map-empty-state.ts`) is the canonical example:

- The natural race window is ~1.1 seconds (per the §5.2 smoke's measurement of trigger→upsert latency on the dev DB).
- Catching that window via DOM observation after a real diagnostic completion is flaky-by-default — too short for reliable harness sampling, especially under headless-browser warmup variance.
- The smoke instead sets up the empty-state preconditions DIRECTLY: insert a `practice_sessions` row with `completion_reason='completed'` and `ended_at_ms` set, but skip the `masteryRecomputeWorkflow` trigger, leaving `mastery_state` empty. The pane is now stable until the test deliberately upserts rows.
- The branch under test (`states.size === 0 → <ComputingState>`) is identical between the natural race and the artificial setup, so the rendered behavior verified by the smoke matches what production users see during their natural race window.

The tradeoff is "reproducing the production race precisely" for "verifying the rendered behavior reliably." Document the tradeoff in the smoke header so a future contributor reading the test understands the gap. This pattern generalizes — any future race-window UI (e.g., review-queue empty state, drill-completion-vs-mastery-recompute window) should follow the same shape.

#### 6.14.11 Audit-tighter-than-contract pattern (audit-and-polish rounds)

Plans for audit-and-polish rounds (sub-phase 2 onward, where the underlying scaffolding shipped in a prior round) often write verification scenarios that are tighter than the engine's actual contracts. The audit's job includes catching this drift BEFORE verification fires false-positive failures and pushes the round toward unwarranted "fix" work. Two examples surfaced in the sub-phase 3 audit (`docs/plans/phase3-drill-mode.md`):

- The plan's scenario 8 said "all served tiers in a uniform_band drill must be identical." The actual contract (§9.2) is on REQUESTED tier; served tier can degrade via the documented tier-degraded fallback when banks exhaust.
- The plan's scenario 10 said "drill served items must respect recency exclusion." The actual contract is that recency is a SOFT preference; session-soft fallback can override it on small banks.

When the audit script's first run fails, **inspect the engine's documented contract before rewriting the engine to match the test**. The fix is usually to tighten or relax the test's assertion to match the contract — both directions are possible, and which one applies is what the audit determines. This pattern saves a round from spuriously expanding into "fix the engine to satisfy the plan's verification" when the engine was correct to begin with.

#### 6.14.12 Auth-state verification via DB inspection

For auth-related verification (sign-in, sign-out, session-expiry handling), check the underlying state — the `auth_sessions` row's presence/absence, the session cookie validity, the `users.last_seen_at_ms` if relevant — rather than just URL transitions. URL changes can succeed while the underlying state remains broken (e.g., a logout flow that redirects the browser to `/login` but fails to actually delete the session row, leaving the user logged-in if they manually navigate back). The sign-out smoke (`scripts/dev/smoke/sign-out-button.ts`) verifies BOTH the URL landing (`finalUrl.includes("/login")`) AND the DB state (`SELECT FROM auth_sessions WHERE session_token = $1` returns zero rows post-logout). Either alone is insufficient.

#### 6.14.13 Dev-vs-prod planner choice for hot-route queries

A hot-route query whose EXPLAIN ANALYZE shows a Sequential Scan on the dev DB is **not automatically a verification failure** — the planner picks Seq Scan when the table is small enough that scanning beats index lookup. The example case is the drill configure page's live-item count (`SELECT count(*) FROM items WHERE sub_type_id = $1 AND status = 'live'`): on the dev DB's 55-row items table the planner picks Seq Scan; at production scale (thousands of items, hundreds per sub-type) the same query will use `items_sub_type_status_idx` for an Index Only Scan.

**Do NOT coerce the dev planner via `set enable_seqscan = off`** to force the index path during verification. Coercion masks two real failure modes that production might surface:

- The query shape may be ineligible for the index PG would otherwise use (e.g., a function on the indexed column, an unintended cast). Letting the planner pick freely on the dev DB and noting the Seq Scan choice is honest; the production-scale concern surfaces in code review of the query shape, not by hiding the dev plan.
- The cost numbers reported under coerced settings aren't representative. Capturing the natural plan + execution time (the §6.14.7 convention) gives a real baseline; coerced numbers don't.

The sub-phase 3 commit message for the empty-bank-pane query (commit `b5510af`) is the canonical example of how to document the scale-dependent plan choice: capture the dev EXPLAIN ANALYZE in the commit, note that production will use the index, and move on. If a future planner-stability concern surfaces, the commit message is the audit trail.

#### 6.14.14 Uniform response code for ownership-opacity

Routes that scope a write or read to a resource owned by a specific user — e.g., the heartbeat route at `/api/sessions/[sessionId]/heartbeat` (§7.7) — should return a **uniform response code** across all four canonical request shapes (correct ownership, missing cookie, expired cookie, owner mismatch) rather than 4xx codes that leak which case fired. DB-state assertion is the verification anchor; response code is uniform.

The leak this closes: an unauthenticated probe enumerating arbitrary UUIDv7 ids by issuing requests and observing the response. With differing codes (401 missing-cookie, 403 owner-mismatch, 404 missing-row), the attacker learns which ids correspond to real-and-owned vs. real-and-not-theirs vs. nonexistent — a side channel that grows worse as more ownership-scoped routes ship. Returning uniform 204 (or 200 for read endpoints) makes the response code carry zero information about ownership; the only authoritative signal is the DB row's actual state, which the attacker cannot read.

Verification anchors on DB read-back, not response code. See `scripts/dev/smoke/heartbeat-route-ownership.ts` (sub-phase 4 commit 2, hash `78eb047`) for the canonical four-scenario shape: happy, cross-user, anonymous, garbage-id — all assert HTTP/204 (exact match) AND the appropriate DB-side outcome (advance for happy, exact-equality unchanged for negatives).

This pattern generalizes. Future ownership-scoped routes (e.g., a future "save partial response" route, a future "favorite an item" route) should default to uniform response codes with DB-state as the signal. Diverge only with a stated reason — debugging convenience is not enough.

#### 6.14.15 Hermetic smoke with per-run isolation

The pattern from `scripts/dev/smoke/heartbeat-route-ownership.ts` (sub-phase 4 commit 2, hash `78eb047`) — **future smokes that exercise auth-scoped routes should imitate this shape**. Three confirmed runs back-to-back at 222ms / 207ms / 292ms wall-clock, all green; full state isolation between runs.

Five elements of the pattern, in order:

1. **Per-run identifier suffixes.** User emails and session tokens are suffixed with `Date.now()` at smoke start. Two concurrent smoke runs of the same script never collide; a smoke run that crashes mid-execution leaves namespaced rows that future runs ignore.

2. **Setup before any assertion.** Insert all needed users + auth-sessions + practice-sessions rows up-front; capture the BEFORE-state snapshot (e.g., `last_heartbeat_ms` baseline) ONCE; then run scenarios.

3. **Negatives-first ordering, happy last.** When a happy-path scenario mutates the row's state, all subsequent BEFORE-comparisons would observe the post-mutation value. Run negatives first against a single fixed BEFORE; run the happy case last so its advance-assertion observes the original BEFORE.

4. **Teardown of session-scoped rows; users left in place.** The smoke's cleanup deletes rows it inserted whose lifecycle is the smoke's (auth-sessions, practice-sessions). Users are left in place — one user row per smoke run is rounding-error storage and avoids the FK-cascade complexity of deleting users (which would cascade into accounts, mastery_state, etc.). A periodic dev-DB cleanup script can sweep namespaced orphan users if accumulation matters.

5. **Sub-second wall-clock.** No artificial waits, no `setTimeout`, no Playwright. Each scenario is a `fetch` + a DB read; serial execution stays under 300ms even with three sequential scenarios. If a smoke needs longer than ~1s of wall-clock, ask whether it actually needs to be a smoke vs. a `bun test`.

This pattern applies to any future smoke that exercises a route at the network boundary against a real DB. The mastery-recompute side-effect smoke (sub-phase 1 commit 5) and the empty-state-pane smoke (sub-phase 2 commit 3) follow the same shape but with longer wall-clocks (the ~30s polling budget for empty-state).

#### 6.14.16 Auth-shape audit before pinning a perf-justified design

When a plan's design choice rests on a perf rationale ("avoid the auth_sessions DB read", "use the JWT to read user_id without DB access"), audit the actual stack-config — session strategy, cookie shape, adapter — before pinning the design. The plan-prompt's perf rationale may not survive contact with what's actually configured.

Sub-phase 4's load-bearing example: the original plan-prompt suggested "user_id read from the JWT, no auth_sessions DB hit, preserves the perf trade-off the carve-out was designed for." The actual config (`src/auth.ts:14`, `session: { strategy: "database" }`) makes JWT-readable user_id structurally impossible — the cookie is a session token requiring a DB lookup against `auth_sessions` to resolve to user_id. Once that fact landed, the design choice flipped: the perf rationale for the proxy carve-out (avoid the auth_sessions read) was moot under any ownership-check shape; the remaining axis became round-trip count, which led to Shape A (single-query inline subquery) over Shape B (call `auth()` then UPDATE).

The audit takes one grep + one file read. Cost is negligible compared to the cost of pinning a design that turns out to be impossible. Worth a habit: any time a plan invokes "perf trade-off" as a reason, the perf rationale gets verified against actual config before commit-time.

#### 6.14.17 Doc-only cut-from-v1 reconciliation as a deliberate convention break

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 5). Pattern surfaced from the doc-only round (commits `ca2330a` → `832f634`) + the v1-code-cleanup round (commits `7bc96ea` → this commit). Captured here so future scope-tightening rounds inherit the discipline.

When a round cuts features doc-only without corresponding code (the PRD/SPEC/roadmap mark the cut, the code stays untouched), the cut markers describe a **forward-projection of the cut decision** rather than current shipped behavior. The doc-only convention break is deliberate — the markers serve as a forcing function for a follow-up code-cleanup round — but it carries a specific risk: the projection can invert relative to shipped reality.

**Two failure modes to expect:**

1. **The "stays vestigial in tree" projection.** The doc-only cut marker says a column / table / function "stays vestigial" — meaning shipped, but unwritten. A subsequent cleanup-round audit can verify this directly via grep + DB inspection. Example: SPEC §3.4's pre-cleanup marker said `practice_sessions.timer_mode` "stays vestigial in tree"; the cleanup round confirmed and dropped it. **Low-risk projection.** The vestigial claim is a falsifiable assertion about current state.

2. **The "static behavior in v1" projection.** The doc-only cut marker says a feature behaves a specific way under v1 (e.g., "question timer OFF everywhere in v1"). This kind of claim is a forward-projection of what the post-cut behavior *should* look like — and it can invert relative to what's actually shipped. **Higher-risk projection.** Verification requires reading the code's actual default state, not just grepping for the cut feature.

**Inversion caught in this round** (v1-code-cleanup commit 2, `a32131a`): SPEC §6.12's pre-cleanup marker said "all focus-shell audio is silent in v1" because the audio paths gated on `timerPrefs.questionTimerVisible` and the marker projected that flag as static-`false`. **Phase 3 reality**: the diagnostic + drill content components passed `questionTimerVisible: true` as the default, so audio was on by default. The doc-only marker inverted the actual shipped behavior. Commit 2 corrected the SPEC §6.12 prose alongside removing the gate, so the doc and code now agree on "audio always on once unlocked."

**Convention going forward.** Cut markers should describe **what the cut authorizes** (the deletion: "this column is no longer required by v1; cleanup round will drop it") rather than projecting **what the post-cut state will be** ("question timer is OFF in v1"). Vestigial-state claims are safe (verifiable). Behavior-projection claims are unsafe (can invert) and should either be omitted or labeled explicitly as projections subject to verification at cleanup time.

**Cross-references.** Doc-only round commits: `ca2330a`, `991d3eb`, `75240c8`, `4b35449`, `141bf83`, `832f634`. v1-code-cleanup round commits: `7bc96ea`, `a32131a`, `938f771`, `37ad762`, this commit. The `a32131a` commit message documents the §6.12 inversion correction in detail; this entry generalizes the pattern.

#### 6.14.18 Framework constraint audit before pinning architectural detail at plan time

> **Captured 2026-05-04** (Phase 5 sub-phase 1 commit 7). Pattern surfaced from two findings during Phase 5 sub-phase 1 (`c1ee435` → `eaeb882`) where plan-time architectural pins had to be revised at commit time because a framework constraint the plan missed made the pinned shape impossible.

When a plan pins a specific architectural detail — module placement, query construction, file shape, prepared-statement parameter binding — verify the framework / stack constraints that bear on that detail **before** treating the pin as final. Plan-time analysis is good at concerns the plan author can hold in head (data contracts, ordering, API shape); it is consistently weaker on framework-imposed runtime / build constraints that only surface at the boundary between plan and code.

**Two load-bearing examples from Phase 5 sub-phase 1:**

1. **Module-placement constraint — Next.js client/server boundary.** Plan §9 + §15.3 said the "struggled" definition's numeric anchors (the 70% accuracy floor + the per-sub-type latency thresholds) live "as constants inside `<StrategySurface>`." `<StrategySurface>` is a `"use client"` component (it consumes a `SurfacedStrategy[]` prop and renders an editorial list). The post-session page is a server component. **Next.js disallows server components from importing helpers exported by `"use client"` modules at runtime** — the plan-time pin was structurally impossible. Commit 6 (`eaeb882`) extracted the helpers + anchors to `src/server/post-session/strategy-selection.ts`; `<StrategySurface>` stays purely presentational; the page imports `deriveStruggledSubTypes` + `selectStrategiesForStruggledSubTypes` from the server module. Plan §15.3's sentence ("numeric anchors live as constants inside `<StrategySurface>`") was tightened at this commit (commit 7) to reflect actual placement.

2. **Query-construction constraint — Drizzle `inArray` + prepared statements.** Plan §4 specified the strategies query as a parameterized lookup over a struggled-sub-type set, naturally written as `where(inArray(strategies.subTypeId, sql.placeholder("subTypeIds")))`. **Drizzle's `inArray` + `sql.placeholder` combination renders as `IN $1` for prepared statements**, which is invalid SQL — Postgres expects an expanded `IN (...)` list, not a single bound array. Commit 2 (`0ec6f4f`) used the explicit `where(sql\`${strategies.subTypeId} = ANY(${sql.placeholder("subTypeIds")}::varchar[])\`)` shape with explicit Postgres array casting. Empty-input handling (short-circuit at the call site) preserved per plan §4.

**Common shape:** in both cases, the plan-time pin was reasonable on its face — the helpers belonged with their consumer; `inArray` is the obvious Drizzle helper for "id ∈ set." The framework constraint (Next.js boundary; Drizzle prepared-statement semantics) was the load-bearing fact the plan missed. Verification cost is small: a one-paragraph check of the framework's docs, a one-grep audit of how a similar shape compiles elsewhere in the codebase, or a quick prototype against the actual stack. The cost of NOT verifying is a plan-time architectural pin that must be revised at commit time, sometimes with a name-change ripple (the helpers in this case got a `@/server/post-session/` import path that the plan-time `@/components/post-session/strategy-surface` import path didn't anticipate).

**Convention going forward.** When the plan pins a structural detail, ask: "what framework constraint would invalidate this?" — and verify the answer before the plan locks the pin. Three concrete classes of framework constraint where the audit pays off:

- **Module-boundary constraints** (Next.js server components ↔ `"use client"` modules; React Server Component import rules; `"use server"` action constraints).
- **ORM / query-builder semantics under prepared statements** (parameter binding, array expansion, type coercion, `RETURNING` shape, prepared-statement TTL).
- **Build-time / bundler constraints** (Tailwind class purging vs dynamic class names; environment-variable inlining boundaries; Zod schema-vs-runtime discrepancies).

The audit is cheap. The revision cost — plan-time pin → commit-time revision → SPEC reconciliation later — is not. §6.14.16's "auth-shape audit before pinning a perf-justified design" is a special case of this rule (verify the auth-shape constraint before pinning the design); §6.14.18 generalizes the pattern across all framework-imposed constraints.

**Cross-references.** Phase 5 sub-phase 1 commits: `c1ee435`, `0ec6f4f`, `a0aa1fd`, `c71770c`, `8d4195e`, `eaeb882`, this commit. Commit `eaeb882`'s message documents the Next.js module-boundary revision; commit `0ec6f4f`'s message documents the Drizzle `inArray` workaround. This entry generalizes both into the convention.

**Subsequent invocations across the dashboard + practice rounds (2026-05-07 / 2026-05-08).** The convention has been re-applied with four additional instances, each a specialization of "audit against actual artifact" worth recording inline:

- **PRD-prose claims about CSS state require git-log verification** (dashboard round commit 11, `88417f8`). PRD §8 prose claimed `prefers-reduced-motion: reduce` and a body font-family rule already lived in `globals.css`; `git log -p src/styles/unstyled/globals.css` showed neither ever did. PRD/spec text claims about codebase state are unverified intent until proven against the artifact.
- **Brief-vs-existing-contract drift — brief is hint, code is contract** (practice round commits 5 + 8, `812292f` + `400168a`). Round briefs are shorthand for what the redirector wants; existing code (Zod schema, type contracts, helper signatures) is the authoritative ground truth. When a brief's helper-shape conflicts with the existing contract, the existing contract wins; the brief's deviation is a finding to surface, not silently fix or follow.
- **Brief numeric counts must recheck against most-recent commit** (practice round commit 10, `cbd8145`). Briefs containing numeric counts (file counts, field counts, row counts) drift between commit-time and brief-write-time. The brief's count is a starting estimate; the audit's first move is `git diff --stat` or a fresh `wc -l` against current `HEAD`, with the brief amended inline if recheck shows divergence.
- **Product-judgment vs implementation-detail in stub→real transitions** (practice round commit 7, `f1db5ec`). When a stub becomes a real read, some encoded ordering decisions cross from implementation-detail (silently chosen by stub author) to product-judgment (Leo-overridable). The mission picker's `MASTERY_RANK` ordering (learning < decayed < fluent < mastered) and tie-break determinism (DB composite-PK alphabetical on `(userId, subTypeId)` slug) are reversible via one-line constant changes; audit at stub→real transitions surfaces these as redirector decisions rather than treating them as inert detail.

---

#### 6.14.19 Type-error-as-audit cascade pattern

> **Captured 2026-05-04** (taxonomy-restructure round commit 6). Pattern surfaced from the round's commit-1 narrowing of the `SubTypeId` union, where the original 8-commit clustering relied on a "type-error-as-audit" approach — narrow the union in commit 1, let downstream commits clear the resulting compile errors as discrete scope — but `lefthook`'s project-wide pre-commit typecheck made that approach structurally infeasible.

When a TypeScript union type is narrowed in a codebase that runs project-wide typecheck on every pre-commit hook, the narrowing commit cannot ship until **every consumer** of the old union is updated. The "narrow first, fix consumers in subsequent commits" pattern only works when the typecheck gate scopes per-commit (e.g., changed-files-only typecheck). With project-wide typecheck enforced, narrowing cascades absorbed-or-blocked, with no middle ground:

- **Absorb (option a):** Update the narrowing commit to include all consumer fixes. The commit becomes wider than its stated scope; the original commit clustering needs to renumber.
- **Bridge (option b):** Introduce a transient `Partial<Record<...>>` widening at consumer sites + leave the union itself wide; narrow in a later commit once consumers are clean. More ceremony per consumer than the absorb path, but preserves commit clustering shape.

The audit-time recommendation needs to bake in the typecheck-gate posture before locking commit clustering. If the codebase runs project-wide typecheck on pre-commit (lefthook + tsgo here; same shape applies to other pre-commit-gated build pipelines), default to absorb when the cascade is small and renumber the round; default to bridge when the cascade is large and splitting buys readability. Whichever choice, the round-close summary records the cascade as load-bearing — bookmark commits ("absorbed into commit 1, no work this commit") are commit-as-narrative rather than commit-as-work and should be collapsed via renumber, not preserved as structural gestures.

**The taxonomy-restructure round's cascade and renumber:** commit 1 narrowed `SubTypeId` from 11 ids to 14 with cuts/renames/moves/splits/adds. The narrowing surfaced 28 typecheck errors across 7 consumer files (`src/config/diagnostic-mix.ts`, `src/config/diagnostic-mix.test.ts`, `src/config/strategies.ts`, `src/server/items/tagger.ts`, `src/server/items/selection.test.ts`, `scripts/_lib/explain.ts`, `scripts/dev/smoke/start-session-idempotency.ts`). Original commit clustering projected 8 commits with diagnostic-mix.ts as commit 2 and strategies.ts as commit 3; both cascaded into commit 1 per option (a). The 8-commit projection collapsed to 6 commits in flight: original commits 4-7 renumbered to 2-5 ; original commit 8 (plan close) became 6.

**Convention going forward.** When pinning a commit clustering at audit-redline, ask: "does any commit narrow a type union, and what's the typecheck-gate posture?" If project-wide pre-commit typecheck is enforced, plan the cascade-absorb path explicitly OR plan the bridge-via-Partial path explicitly. Don't rely on a per-commit-scoped typecheck that the codebase doesn't actually run. §6.14.18's framework-constraint-audit rule is the parent convention; §6.14.19 is the type-system / build-tooling specialization.

**Cross-references.** Plan: `docs/plans/phase5-taxonomy-restructure.md` §4 (commit clustering shipped vs projected). Round commits: `5e43eaa`, `21b5594`, `9d9b358`, `e9cf5d5`, `ae87754`, this commit. The round's round-close summary records the cascade-collapse as a structural fact rather than a narrative gloss.

#### 6.14.20 Closed-plans-immutable as a multi-round convention

> **Captured 2026-05-04** (taxonomy-restructure round commit 6). Convention has now been invoked across four rounds (Phase 5 sub-phase 1 close-out, doc-only cuts, v1-code-cleanup, taxonomy-restructure); pinning as a §6.14 entry per the second-instance discipline (capture-when-pattern-repeats — this is the fourth instance).

Plans under `docs/plans/` that have flipped to "shipped <date>" status are immutable historical records. They describe what was planned and what shipped at the time the round closed. Subsequent rounds — even when they touch the same surfaces, redefine the same domain vocabulary, or invalidate plan-time assumptions — do not edit closed plans. The drift between closed plans and current living-doc state is acceptable cost; closed plans are commit-as-shipped artifacts that future-Claude reads to understand round-time context, not current-state references.

**Three concrete consequences for round-planning:**

1. **Audit identifies closed-plan drift; round does not correct it.** The audit step at round-open lists every doc surface with stale references including closed plans, but the edit step deliberately skips closed plans. The audit report explicitly categorizes closed-plan findings as "out of scope per closed-plans-immutable convention" rather than as edit candidates. This was the explicit shape of the taxonomy-restructure round's audit (commit 6 / `5e43eaa` precursor): closed plans `phase5-post-session-review.md` and `phase5-v1-code-cleanup.md` were both identified as carrying stale taxonomy refs (`verbal.synonyms` test fixtures, 11-taxonomy counts) and explicitly not edited.

2. **The convention requires a `git diff HEAD -- docs/plans/<closed>.md` returning zero lines as empirical proof at round close.** Verbal assertion alone isn't enough — the round-close summary or commit body should run the closed-plan diff check and record the zero-line result. The taxonomy-restructure round did this at commit 4 (`e9cf5d5`) for `phase5-post-session-review.md`, `phase5-v1-code-cleanup.md`, and `phase3-*.md` (zero diff lines, recorded in the commit body).

3. **Living plans (active or never-closed) DO get edited.** `docs/plans/feature-roadmap.md` is the canonical living roadmap and updates with every round; `docs/plans/phase5-master-plan.md` is the open phase plan and updates as sub-phases close. The convention applies only to plans with explicit "shipped" status banners.

**The four invocations to date:**

- **Phase 5 sub-phase 1 round close** (`022dbd6`, 2026-05-04). Closed plan `phase5-post-session-review.md`'s status flip; immediately following rounds did not edit the plan despite living-doc drift.
- **Doc-only cuts round** (preserved as historical context across `feature-roadmap.md` "Cut from v1 2026-05-04" entries). Five surfaces cut from v1; the SPEC + PRD reconciled; closed plans referencing the cut surfaces (e.g., the post-session strategy-review-gate references in pre-cut closed plans) were not edited.
- **v1-code-cleanup round** (closed 2026-05-04). Schema columns and tables dropped; closed plans naming those surfaces were not retroactively updated.
- **Taxonomy-restructure round** (this round). 14 sub-types replace 11; closed plans naming the old taxonomy were not retroactively updated. The convention has now earned its §6.14 slot via repeated invocation.

**Convention going forward.** When a round opens, the audit step lists closed plans with stale references; the edit step skips them; the round-close summary records the closed-plan diff at zero. Future-Claude reading any closed plan should treat its contents as "true at round close" not "true now"; cross-reference against current-state living docs (PRD, SPEC, architecture_plan, feature-roadmap) when the closed plan's framing doesn't match what the codebase shows.

**Cross-references.** Plan: `docs/plans/phase5-taxonomy-restructure.md` §3 resolution 8 (closed-plan drift acknowledgment). Round commits where the convention was empirically verified via `git diff` zero-line check: `e9cf5d5` (commit 4 of this round). The convention was first invoked structurally at `022dbd6` (Phase 5 sub-phase 1 commit 7); §6.14.20 generalizes the four-round repeat into a meta-convention.

**Two-step migration as a related route-tree-stability discipline (dashboard round, 2026-05-07).** A sibling discipline to plan-doc immutability: when migrating an existing route surface, first copy the content to a new path, then replace the original path's content with the new feature. The dashboard round (commits 3 + 10, `f4d0653` + `ad95e9b`) demonstrated this concretely — Mastery Map content moved from `/` to `/drill/page.tsx` at commit 3, then `/` was replaced with the dashboard at commit 10. The two-step keeps the pre-migration surface stable as a known-good route during the multi-commit interval (commits 3-9 here) and lets the round ship intermediate commits without breaking the user-visible route tree. Closed plans referencing the old route shape stay immutable per §6.14.20; the round-time route-tree carries both old and new content for the migration window. Future rounds doing route migrations under shipped-and-deployed conditions should default to this two-step shape rather than the one-shot replace.

#### 6.14.21 Audit DB row-state against the live DB, not against intended-state from prior commits

> **Captured 2026-05-06** (data-wipe round commit 3). Pattern surfaced from the round's commit-1 pre-execution audit, where the plan §2(b) listed `sub_types` and `strategies` as preserved tables under the assumption they were already at the post-taxonomy-restructure 14/33 state from the taxonomy round's commit-1 schema-seed run; the live dev DB instead carried 11 sub_types (with old-taxonomy IDs still present) and 111 strategies (3.36× the expected 33).

When a plan's audit step makes assertions about table row-state ("table T contains rows X, Y, Z post-prior-round"), the assertion needs an **explicit live-query verification step** — reading the rows from the actual DB at round-open — not just inference from the source-of-truth config files plus the prior round's commit history. Plan-time reasoning that assumes "config file + seed-script ran successfully = DB matches config" misses the failure modes where the DB diverges from config across rounds:

- **UPSERT-leaves-orphans.** Seed scripts that use `onConflictDoUpdate` (or equivalent) without companion `DELETE FROM T WHERE id NOT IN (config-side-id-set)` logic only insert/update entries currently in the config; entries that were in the config at a prior round but have since been cut/renamed/moved persist in the DB as orphans. Across multiple rounds of taxonomy/strategy/enum-set changes, orphans accumulate.
- **Deterministic-id keying drift.** Seed scripts that compute deterministic IDs from `(parent_id, index)` shapes upsert only the indices that exist under the current config shape; rows from prior config shapes (e.g., an entry that used to be at index 3 of 4 and is now removed) sit orphaned at their original ID.
- **Migration-ran-but-not-here.** A `DROP TABLE … CASCADE` Drizzle migration that shipped in a prior round drops the table on `db:migrate` runs; environments where `db:migrate` was not subsequently re-run carry the table on disk despite the schema source files showing it removed. The dev DB usually catches up, but environment-state drift across operators and machines is a real failure mode.

The first two are config-table-row-state problems; the third is a schema-state problem. All three share the root cause: the config / source files describe **intent**, not **actual DB state**, and intent-vs-actual divergence accumulates silently across rounds when rounds don't explicitly re-verify.

**Convention going forward.** Round-open audits that make claims about DB row-state or schema-state get an explicit verification step — `psql` (or Drizzle row-count read, or `\dt` for schema state) at round-open, recorded in the audit findings as a primary-source reference. Plan-time assertions phrased as "table T should have shape X" must be either (i) verified live and converted to "table T has shape X (verified `<timestamp>`)" or (ii) flagged as plan-time-assumed and re-verified at first commit's pre-execution audit step — with the round prepared to amend scope inline if the verification reveals divergence.

**Empirical instance from this round.** The plan §2(b) assumed sub_types=14 + strategies=33 based on the taxonomy round's commit-1 schema-seed run shipping cleanly. Commit 1's pre-execution audit ran a row-count query against the live dev DB and found sub_types=11 + strategies=111. The round adopted Path (A) (expand TRUNCATE list to include sub_types + strategies) and captured the amendment inline in commit 1's body as record-at-execution; the formal §2(b) plan-doc amendment landed in commit 3. **The round shipped 7-table TRUNCATE, not 5.**

**Inverse-pattern reference (audit done correctly).** The v1-code-cleanup round (closed at `37ad762`) provides the well-handled-failure-mode contrast: that round's audit identified `review_queue` and `strategy_views` as schema files marked "shipped, vestigial — needs to be dropped from disk." The audit step verified each table was in `src/db/schemas/**` AND in the schema barrel before authoring the `DROP TABLE … CASCADE` migration, rather than assuming the doc-only-cuts round had eliminated them. The contrast is instructive: schema-state was verified live in v1-code-cleanup; row-state was assumed-from-config in the original phase5-data-wipe plan §2(b). The audit-against-live-state discipline applies in both directions (intent says "exists, should drop" → verify it's still on disk; intent says "should be at shape X post-prior-round" → verify it's actually at shape X).

**Cross-references.** Plan: `docs/plans/phase5-data-wipe.md` §10.6 (Path (A) amendment) + §11 (round-close summary). Round commits where the pattern was empirically demonstrated: `8d3cf1d` (commit 1 — audit-finding inline + Path (A) amendment shipped), this commit (plan-doc formal §2(b) amendment + this SPEC entry). Inverse-pattern reference: `37ad762` (v1-code-cleanup commit 4 — schema-state verified live before authoring the `DROP TABLE` migration).

**Deferred-migration-bundling as a row-state-audit corollary (practice round, 2026-05-07).** A corollary failure mode where the live-DB / disk-schema divergence isn't a row-state issue but a generated-migration issue: `bun db:generate` walks the schema barrel and sweeps up any prior-round-deferred schema additions into the next migration regardless of the current round's intended scope. Practice round commit 3 (`0e90bde`) shipped a `target_score` ALTER, and the generated migration also bundled the dashboard-round-deferred `user_sub_type_belts` table + `belt_level` enum (added at dashboard round commit 2 `ff93fe1` to the barrel without a paired migration). Round-planning needs to anticipate this bundling — either accept the absorbed scope (this round's choice; documents that the future Belts PRD's commit ledger shrinks by ~1) OR remove deferred schema from the barrel until its planned migration commit. Audit step at round-open: inspect the generated SQL before `db:push` (or `bun db:generate --dry-run` if available) to surface bundling before the migration ships.

#### 6.14.22 Audit claims about existing code semantics against the consuming code, not the producing code

> **Captured 2026-05-06** (testbank-re-extraction round commit 6). Pattern surfaced from the round's commit 3 implementation, where the plan §2(c) framing claimed `metadata.importSource` was *"a legacy alias for `sourceFolder`"* — its semantics already align — based on a plan-write read of `scripts/_lib/explain.ts`. The actual semantic in the consuming code (`src/server/items/ingest.ts`'s `IngestRealItemInput.metadata.importSource` plus `scripts/generate-explanations.ts`'s `IngestPayload.metadata.importSource`) was different: the field carried answer-extraction-provenance values (`"ocr-visible"` | `"ocr-solved"`), NOT a folder name. The plan's claim of semantic equivalence between the existing field and the new `sourceFolder` was structurally inaccurate.

When a plan's audit step makes a claim about an existing field's semantics ("X is a legacy alias for Y," "X already carries the same content as Y," "X's semantics already align with the new design"), the claim must be verified by reading the **consuming code** — the schemas, route handlers, ingest paths, and call sites that determine what values the field actually holds — not just the **producing code** (script libraries, helpers, defaults). Producing code reveals what values the field *might* be set to in one path; consuming code reveals what values the field *can* hold across all paths and what downstream code expects.

**Three concrete failure modes this convention addresses:**

- **Single-source-of-truth claims from single-source audit.** Plan-write reads one file (a script library), sees a field used in a particular way, and claims that's the field's semantic. The consuming Zod schema or interface says otherwise. Multi-source claims need multi-source audit.
- **"Legacy alias" framing for fields with distinct semantics.** When a new design adds a field that *seems* to overlap an existing one, the plan-write may frame the existing field as a "legacy alias" or "renames-to." The actual semantic divergence is invisible until the implementation lands and the consuming code's type-checking surfaces the conflict. The plan should not claim semantic equivalence without evidence from both sides.
- **Free-text fields with implicit type unions.** When a field's type is `string` (free-text), the plan can read different uses across different files and conclude they're the same semantic. They might be — or they might be a `'a' | 'b'` union encoded as a typeless string with implicit branching downstream. Only the consuming code makes the union explicit.

**Convention going forward.** Round-open audits that make claims about existing field semantics (especially "X is an alias for Y" or "X already carries Z") get an explicit consuming-code verification step. The plan-write's audit findings include a `consumed-by` reference for any field whose semantic is load-bearing for the round's design — listing the files that read the field and the values they expect. If the consuming-code audit reveals divergence, the plan amends scope inline; the round's commits document the amendment.

**Empirical instance from this round.** Plan-write §2(c) claimed `metadata.importSource` was *"a legacy alias for sourceFolder going forward — its semantics already align."* The consuming code read at commit 3 implementation time:
- `src/server/items/ingest.ts:48-52` — `ingestMetadata` Zod schema: `importSource: z.string().min(1).max(64).optional()` — typeless free-text.
- `src/server/items/ingest.ts:82-86` — `IngestRealItemInput.metadata.importSource?: string` — typeless.
- `scripts/generate-explanations.ts` `IngestPayload.metadata.importSource: "ocr-visible" | "ocr-solved"` — explicit two-value union, NOT a folder name. This was the load-bearing signal: the field was an answer-extraction-provenance tag, not a folder alias.

The two semantics (folder origin vs answer-extraction provenance) are complementary, not equivalent. Commit 3 preserved the existing semantic and added `sourceFolder` + `sourceFilename` as **distinct, complementary** top-level fields. The plan's framing was amended at commit 6's plan close.

**Kinship to §6.14.21.** Both §6.14.21 (audit DB row-state against live DB) and this §6.14.22 (audit code semantics against consuming code) share a meta-pattern: audit assumptions must verify against the actual artifact, not the assumed shape. §6.14.21 specializes to runtime DB state vs. plan-time intended state; §6.14.22 specializes to code-semantic claims vs. single-source plan-write reads. Future-Claude reading either entry should consider the other for related-but-distinct lessons.

**Cross-references.** Plan: `docs/plans/phase5-testbank-re-extraction.md` §2(c) (amended framing) + §14 (round-close summary). Round commits where the pattern was empirically demonstrated: `5b56627` (commit 3 — execution-time discrepancy + IngestPayload comment), this commit (plan-doc amendment + this SPEC entry). Sibling: §6.14.21 (DB row-state audit). §6.14.18 (framework constraint audit) is the shared parent — both are specializations of the broader "audit against actual artifact" discipline.

#### 6.14.23 Runtime verification for UI side-effect fixes; static-trace alone is insufficient

> **Captured 2026-05-06** (diagnostic-bug-fixes round commit 5). Pattern surfaced from two consecutive in-round failures of static-trace verification: BUG 2 commit `b02590a` (a one-shot pointerdown/keydown listener intended to unlock the audio context on first user interaction) and BUG 3 commit `caccfbd` (a `leading-relaxed` → `leading-normal` line-height tightening). Both fixes were code-level correct — the listener correctly attached on mount, removed itself on first fire, and called `unlockAudio()` (idempotent per audit); the line-height was correctly applied in the bundled CSS — and both passed the round's static-trace verification at commit time. Both failed the user's runtime test on the next iteration: Q1 audio still silent, multi-paragraph spacing still loose. Root causes were at a different level than the static trace inspected: browser-policy-and-event-firing semantics for the listener, character-data-driven layout dominance for the line-height.

When a fix's stated goal is **user-perceived behavior change** — audio firing, visual spacing, animation smoothness, scroll feel, focus rings, color rendering, anything where the success criterion is "the user sees / hears / experiences X" — the verification chain MUST include runtime confirmation. Static-trace verification is necessary (it catches code-level errors) but not sufficient (it can't catch gaps between code-level correctness and user-perceived behavior).

**Two distinct gap-classes the static-trace verification can't catch:**

- **Browser-policy gaps.** The code is correct in isolation, but a browser-platform constraint (autoplay policy, user-activation timing, scroll-restoration behavior, transition-events firing, focus-trap interactions, viewport-meta behavior on mobile) prevents the code from delivering the intended behavior at runtime. Example from this round: `unlockAudio()` is correctly called from a listener handler, but the listener's gating event (next pointerdown/keydown) never fires because the user is reading silently — and the transient user-activation window from the prior-page click expired before any threshold tick. The static trace was sound; the browser-policy interaction was the gap.
- **Perception-dominance gaps.** The code's intended effect IS being applied at runtime, but a different-level factor dominates the user's perception of the overall behavior. The fix shipped, the CSS bundle serves the new class, the computed style reflects it — but the user reports no visible change because what the user actually perceives is dominated by a factor the fix didn't touch. Example from this round: line-height tightening from 1.625 → 1.5 reduced each line by ~7.7%, but the user-perceived spacing was dominated by `\n\n`-rendered blank lines (5 full-line gaps, 27px each = 135px), and the line-height change shrank each blank line by ~2px (~9px total, imperceptible against the 135px dominant factor).

**Convention going forward.** For UI side-effect fixes, the commit-time verification gates expand from `bun lint && bun typecheck && bun test` to also include one of:

- **Runtime-automation verification.** Playwright (or equivalent) navigates the actual flow, captures runtime state assertions: `audioCtx.state === "running"`, `getComputedStyle(...).lineHeight === "1.5"`, screenshot diffs against a fixture, etc. The harness produces a verification artifact reviewable at commit time.
- **Explicit user-verification ask.** When runtime automation isn't feasible (auth-gated routes without scriptable test users, behavior that requires human perception like audio audibility or motion smoothness), the commit body explicitly defers verification to the user with a specific test scenario. The commit is not reported as "verified" until the user confirms; the round is not closed until both automation OR user verification has passed for every UI-side-effect fix in the round.

**Anti-pattern.** Reporting a UI side-effect fix as "verified" on the basis of static-trace alone, with terminology like "verified via direct inspection" or "static-trace confirmed via code path reasoning" — these phrases describe code-level verification, not behavior-level verification. They obscure the gap and ship fixes that don't actually fix.

**Empirical instances from this round.**
- Commit `b02590a` reported "static-trace confirmed via the audio-ticker module's gate logic" + "no-regression for Q2+ confirmed via handler-driven unlockAudio remaining idempotent." Failed user runtime test (Q1 audio still silent). The static-trace reasoning was sound about the listener's mechanics; the gap was at the event-firing level (no event fires in the natural test condition).
- Commit `caccfbd` reported "static-trace reasoning rather than captured screenshots" with mathematical breakdown of the per-line reduction. Failed user visual test (no perceptible change). The math was correct; the gap was at the perception-dominance level (blank-line gaps dominated, not line-height).

The fixes that addressed the gaps shipped explicit user-verification asks instead of static-trace claims:
- `f7045f8` (Link conversion) and `f59a8ea` (mount-effect unlock) for BUG 2 — both deferred to user runtime verification with specific test scenarios.
- `08ba782` (paragraph-split refactor) for BUG 3 — deferred with explicit "navigate to multi-paragraph case + confirm visibly tighter spacing" ask.

All three of those commits passed runtime verification on the user's next pass; the discipline of explicit deferral closed the gap that static-trace claims had been masking.

**Kinship to §6.14.21 + §6.14.22.** Both prior entries codify "audit / verify against the actual artifact, not against the assumed shape." §6.14.21 specializes to runtime DB row-state vs. plan-time intended state; §6.14.22 specializes to consuming-code semantics vs. producing-code reads; this §6.14.23 specializes to runtime user-experience vs. static-trace code-level reasoning. Future-Claude reading any of the three should consider the others — they're three faces of the same parent discipline ("audit against actual artifact, not assumed shape," see §6.14.18).

**Cross-references.** Plan: `docs/plans/diagnostic-bug-fixes.md` §3 (BUG 2 + BUG 3 round-close summaries) + §5 (round-close meta-finding capture). Round commits where the pattern was empirically demonstrated: `b02590a` + `caccfbd` (the static-trace failures), `f7045f8` + `f59a8ea` + `08ba782` (the explicit-deferral successes), this commit (plan-doc + this SPEC entry). Siblings: §6.14.21 (DB row-state audit), §6.14.22 (consuming-code audit). Shared parent: §6.14.18 (audit against actual artifact).

**TS type signatures may diverge from runtime at SSR/CSR boundaries (dashboard round, 2026-05-07).** A third gap-class to add to the runtime-verification convention: framework-supplied `.d.ts` signatures may not match runtime behavior at the server/client boundary. Dashboard round commit 9 (`49894d7`) hit this with Next.js 16's `usePathname`, declared as returning `string` but returning `null` during the server-render tick before client hydration. Static-trace verification + `bun typecheck` both pass cleanly because the type signature matches; the runtime divergence only surfaces under streaming-SSR with the relevant render path actually exercised. The fix shipped a runtime null-check at the consumption site, with verification deferred to a streaming-SSR throwaway harness. Specialization framing: TS type signatures are a producing-code claim about runtime behavior; SSR/CSR boundary semantics are a consuming-code constraint that the type signature can't encode. Runtime render with streaming SSR is the reliable proof; type-checker-clean is necessary but not sufficient.

---

#### 6.14.24 Lint/type-rule strictness vs spec-acceptable usage

> **Captured 2026-05-08** (post-practice-round §6.14 promotion sub-round). Pattern surfaced from three rule-vs-spec collisions across the dashboard round (2026-05-07) and practice round (2026-05-07/08), where a project lint/type rule rejected a usage the relevant external spec (HTML/ARIA, gritql rule comments, Next.js typed-routes config) explicitly sanctioned. Each instance shipped a workaround that achieved the same UX/semantics without invoking the banned attribute or pattern.

When a project lint, type, or grit rule's strictness exceeds the relevant external spec's acceptable-usage envelope, the resolution is **always** a workaround that preserves the spec-correct UX, never a rule-suppression or `biome-ignore-line` exemption. The cost of the workaround is per-instance code; the cost of widening the rule (or adding case-by-case ignores) is repeated future audits and silent rule-erosion. Three concrete classes of this collision have surfaced empirically:

- **Biome lint vs ARIA dialog pattern** (practice round commit 9, `6178b2a`). Biome's `noAutofocus` rule flags `autoFocus` on every JSX element, including popover-dialog content where focus-on-mount is the WCAG 2.4.3 + ARIA dialog-pattern canonical UX. Workaround: `useRef` + `useEffect` programmatic `.focus()` on mount. Same observable behavior; rule-clean.
- **gritql rule scope drift vs commented intent** (dashboard round commit 8, `3abe143`). The `no-inline-ternary.grit` rule's comment header says nested const-ternaries are allowed; the actual gritql pattern only matches the *outermost* ternary and silently flags nested ternaries inside outer-ternary branches. Workaround: refactor to a top-level helper with an early-return chain, achieving the same expression value without nesting. Rule body wins over rule-comment claim about scope.
- **Next.js typed-routes config vs `<Link>` with dynamic strings** (dashboard round commits 6 + 7, `befe9bd` + `3abe143` cluster). `next.config.ts` has `typedRoutes: true`, which requires `<Link>` hrefs to be `Route` literals, not arbitrary strings. PRD listings used `<Link href={dynamicString}>` for BeltRow row hrefs, MissionCard CTAs, MistakesTile, LastSimTile. Workaround: refactor to plain `<a>` per `src/components/mastery-map/start-session-button.tsx` precedent (loss of soft-nav prefetch accepted in exchange for type-safety + rule-compliance).

**Common shape.** In every instance, the project rule is correct in the broad case (autofocus is a real a11y footgun outside dialogs; inline ternaries genuinely degrade readability; typed routes catch real broken-link bugs at compile time) but the spec-permitted usage IS one of the cases the rule's blanket pattern catches. The workaround pattern always exists; the cost is per-instance, well-bounded, and produces no recurring maintenance debt.

**Convention going forward.** When a project rule blocks a spec-permitted usage, the default action is to ship the workaround and document the rule-vs-spec collision in the commit body (one paragraph naming the rule, the spec, the workaround chosen, and the precedent if one exists in the codebase). Do not add `biome-ignore-line` or `// rule-suppress` comments; they accumulate as silent rule-erosion. Do not widen the rule; the rule's broad-case correctness is load-bearing. The workaround is the answer.

**Anti-pattern.** Resolving a rule-vs-spec collision by adding a per-line ignore comment with a justification. Justifications-as-comments rot; the next contributor reading the line sees the ignore-comment and infers the rule is negotiable. The workaround pattern keeps the rule absolutely enforced and surfaces the rule-vs-spec gap to future audits as a finding rather than a precedent.

**Cross-references.** Round commits where the pattern was empirically demonstrated: `3abe143` (no-inline-ternary scope drift + `<Link>` typed-routes / `<a>` refactor), `befe9bd` (composite components consuming the `<a>` precedent), `6178b2a` (autofocus / `useRef`+`useEffect`). Plans: `docs/plans/dashboard.md` §5 (commit 7 + 8 rows) + `docs/plans/practice-round.md` §5 (commit 9 row). This entry generalizes the three instances into the convention; future rule-vs-spec collisions add an instance below the bullet list rather than re-litigate the resolution.

---

#### 6.14.25 SQL-level NULL handling for `sql<T>` aggregate templates

> **Captured 2026-05-08** (post-practice-round §6.14 promotion sub-round). Pattern surfaced from two adjacent commits in the practice round (commits 5 + 6) where Drizzle's `sql<T>` template literal cast aggregate results as non-null but the underlying SQL semantics returned NULL on empty result sets. The two instances required different remedies depending on whether the empty-set default carried meaningful product semantics.

Drizzle's `sql<number>\`SUM(...)\`` (or `sql<number>\`PERCENTILE_CONT(...)\``, etc.) template casts the runtime result as `number` regardless of the actual SQL semantics — but `SUM` over an empty set returns NULL, `PERCENTILE_CONT` over an empty set returns NULL, `COUNT` over a LEFT JOIN can return 0 or NULL depending on shape, and so on. The TypeScript type asserts non-null; the runtime value can be null; super-lint's `no-unnecessary-condition` rule then flags JS-side null checks as redundant against the type. The collision is real: the lint rule's type-system view of `sql<T>` does not match the SQL runtime's NULL semantics.

The right resolution depends on whether the empty-set default is meaningful or misleading:

- **Default-is-meaningful → SQL-level COALESCE.** When the empty-set default has a real product semantic (SUM=0 means "zero correct answers"; COUNT=0 means "no rows matched"), the fix is `COALESCE(SUM(...), 0)::int` (or equivalent) at the SQL level. The template's `sql<number>` cast is then accurate; no JS-side null check is needed; lint stays green. Practice round commit 5 (`812292f`) used this shape for the `computeScoreEstimate` correct-answer count.
- **Default-is-misleading → typed-as-nullable + JS-side normalization.** When the empty-set default would be misleading (PERCENTILE_CONT=0 implies "0ms median latency" — false; the truthful answer is "no median exists"), the fix is to type the template as `sql<number | null>` and JS-side map null → undefined at the consumption boundary. Practice round commit 6 (`0e8a737`) used this shape for `previousMedianMs` + `last5SimMedianMs`: returning `undefined` on the empty case lets downstream rendering branch to "—" / "Take your first sim →" empty states rather than display "0 ms" as if it were a real measurement.

**Common shape.** The lint rule's type-system view of `sql<T>` aggregate templates does not match SQL runtime NULL semantics. The two remedies are not interchangeable — choose by what the empty-set default *means* for the consuming code, not by what's syntactically convenient.

**Convention going forward.** When writing a `sql<T>` template that contains an aggregate (SUM, AVG, MIN, MAX, COUNT under LEFT JOIN, PERCENTILE_CONT, percentile / quantile functions, ARRAY_AGG with FILTER), pause at the type annotation and ask: "does this aggregate return NULL on the empty case?" If yes, the next question is "is the empty-set default meaningful?" — yes → COALESCE-at-SQL-level; no → type-as-nullable + JS-side normalization. The lint rule's complaint is a feature: it forces this question into every aggregate-template site rather than letting silent NULL→0 coercions slip through.

**Cross-references.** Round commits where the pattern was empirically demonstrated: `812292f` (commit 5 — COALESCE-when-default-meaningful for correct-count SUM), `0e8a737` (commit 6 — typed-as-nullable for PERCENTILE_CONT median). Plan: `docs/plans/practice-round.md` §5 (commit ledger). §6.14.18 is the broader parent (audit-framework-constraint-before-pinning); §6.14.25 specializes to ORM-template-vs-SQL-runtime-NULL semantics.

---

#### 6.14.26 Active-wrong vs historical-trail comment classification

> **Captured 2026-05-08** (post-practice-round §6.14 promotion sub-round; instance from practice round commit 11, `7367d20`). Pattern surfaced from the round's full-surface Alpha Style audit + polish, where two distinct kinds of stale comment trail across multiple files received different default treatments: a comment that *describes how the code currently works* and is technically wrong gets fixed; a comment that *describes how the code used to look before a refactor* and is historically accurate but no longer load-bearing is left in place.

Comments cleave into two distinct categories with distinct treatments:

- **Active-wrong (technical-correctness misdocumentation).** A comment that claims "this code does X" or "this field carries Y" and the claim no longer matches the current code. **Default: fix.** The comment is actively misleading; future contributors read it as ground truth and act on its claim. Treatment is the same as a stale Zod schema description or a stale type comment — correct it inline as part of the next commit that touches the file, or surface it as an audit finding if the file isn't being touched in the round.
- **Historical-trail (provenance / migration-trace).** A comment that describes "this used to be at X / this was moved from Y / this previously inlined Z." The claim is historically accurate even if no longer architecturally load-bearing. **Default: leave.** The comment encodes commit-history context that `git log` recovers slowly (multi-commit traces with renames + moves are expensive to reconstruct from blame alone); deleting it loses the trace. Treatment is the same as a `// see commit XYZ` cross-reference — leave it unless it's actively misleading about *current* behavior.

**The distinction matters at audit time.** Mass `comment cleanup` sweeps that don't separate the two categories either (a) leave active-wrong comments in place and ship a misleading codebase, or (b) delete historical-trail comments and lose round-time context. The default is per-comment classification: read each stale comment, decide which category it belongs to, treat accordingly. Resist the temptation to apply a uniform default ("delete all stale comments" or "leave all stale comments") — the categories cleave the population, and the right action diverges.

**Convention going forward.** During audit-and-polish rounds, comment-trail review is per-comment, not per-sweep. The audit step categorizes each stale comment as active-wrong (fix-now), historical-trail (leave), or genuinely-orphaned (delete with a one-line commit-message note). The fix-now category gets inline edits; the leave category stays untouched; the delete category is the rare third path for comments that match neither — typically scaffolding comments left over from initial implementation that have lost both technical and historical relevance.

**Cross-references.** Round commit where the pattern was empirically demonstrated: `7367d20` (practice round commit 11 — full-surface Alpha Style audit + polish). Plan: `docs/plans/practice-round.md` §5 (commit 11 row). The convention complements §6.14.11 (audit-tighter-than-contract pattern) by specifying the per-comment treatment within the audit's edit phase; §6.14.11 covers when the audit *catches* tighter-than-contract; §6.14.26 covers what to *do* with the comment trail surfaced by the catch.

---

#### 6.14.27 Discriminated-union-local-to-the-page for deletion-cascade absorption

> **Captured 2026-05-08** (post-practice-round §6.14 promotion sub-round; instance from practice round commit 2, `a4883cf`). Pattern surfaced from the round's drill-restructure work, where deleting an upstream `/drill/configure` gate cascaded an "empty bank" detection responsibility onto the downstream `/drill/run` page. The page absorbed the new state via a local discriminated union, leaving the page's exported contract unchanged.

When deleting an upstream gate (a configuration page, a form, an intermediate route) that previously handled a precondition check, the downstream consumer page often inherits the responsibility for surfacing the precondition's failure case. The clean shape is a **discriminated union local to the consuming page** — the downstream page's internal state widens from `T` to `T | empty-bank-variant`, the union is consumed via discriminated-render in the page, and the page's exported contract (the type names and shapes external code imports) stays compatible because the exported variant is just the success case.

**The shape concretely:**

```typescript
// page-internal type, NOT exported
type DrillInit =
  | { kind: "ready"; firstQuestion: Question; bankSize: number }
  | { kind: "empty-bank"; subTypeId: SubTypeId }

// exported type — what external code imports as the run-engine input
type RunInit = Extract<DrillInit, { kind: "ready" }>
```

The consuming page reads `DrillInit`, switches on `.kind`, renders the empty-bank surface inline OR forwards `RunInit` to the run-engine machinery. External code (route handlers, server actions, the run-engine) keeps importing `RunInit` and never sees the empty-bank variant.

**Why this shape over the alternatives:**

- **Reintroducing a gate page** would re-create the deleted upstream surface, which the round was deleting precisely to simplify the route tree. Wrong direction.
- **Throwing on empty-bank in the data layer** would propagate as a server-error surface, which is semantically wrong (empty bank is a normal state, not an error). The user-facing rendering needs to be a deliberate UX surface, not an error boundary.
- **Widening the exported contract to `RunInit | EmptyBankInit`** would force every consumer to handle the empty-bank case even though only the page renders it. The local-to-the-page union confines the new responsibility to the one file that actually uses it.

**Convention going forward.** When a deletion-cascade lands a new responsibility on a downstream consumer, default to a local discriminated union with the new variant scoped to the consumer's internal type. Export the success-case extraction (`Extract<…, { kind: 'ready' }>` or equivalent) as the consumer's external contract. Resist widening the exported type or pushing the new responsibility further upstream — both alternatives leak the cascade into code that doesn't need to know about it.

**Cross-references.** Round commit where the pattern was empirically demonstrated: `a4883cf` (practice round commit 2 — `/drill/configure` deletion + `/drill/run` empty-bank absorption via local `DrillInit` union with `RunInit = Extract<DrillInit, { kind: 'ready' }>` exported). Plan: `docs/plans/practice-round.md` §5 (commit 2 row). The convention is narrow but the framing is sharp; future deletion-cascade rounds that encounter the same shape can reference §6.14.27 as the canonical pattern.

---

#### 6.14.28 Plan-prose-vs-empirical-truth divergence

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Pattern surfaced across multiple round-instances where load-bearing plan-prose claims about library/SDK/runtime behavior were contradicted by execution-time reality, requiring inline plan-doc amendments at the discovering commit's body.

When a plan's architecture decision rests on a claim about external-system behavior ("library X enforces Y", "SDK Z's start() function works without a runtime", "PK uniqueness on UUIDv7 prevents duplicate inserts"), the claim must be either (i) verified empirically at plan-write time before being load-bearing, or (ii) flagged as plan-time-assumed and re-verified at the first commit that depends on it. Plan-prose claims that turn out empirically false are not just documentation drift — they invalidate the architecture decisions built on top of them and can cascade into round-shape redesign mid-execution.

**Three concrete instances from this round:**

- **UUIDv7 PK uniqueness as a workflow-replay safeguard (parent commit 6).** Plan §10 framed PK uniqueness as the load-bearing mitigation against `writeSiblingSetStep` replay duplicates: "the second insert fails on PK uniqueness for the already-written rows." Empirically false: `uuidv7()` generates a new id on each call, so a replayed step inserts new rows rather than failing. The actual mitigation is `writeSiblingSetStep`'s explicit count-check guard. Plan-doc body amended at commit 6 to record the discrepancy + state the actual mitigation.
- **`@workflow/api` start() unusable outside Next.js runtime (parent commit 7 / `869d628`).** Plan §7.3 implied the orchestration script could call `start(siblingGenerationWorkflow, ...)` from `@workflow/api`. At commit 7's smoke-write time, `start()` threw `"invalid workflow function"` outside the `@workflow/next` runtime; the `"use workflow"` / `"use step"` directives are no-ops in CLI context. The workflow was invoked DIRECTLY in the orchestration script. Plan-doc body amended.
- **B1 measurement supersession claim (`c4d8541` → `9f47cfb`).** The c4d8541 plan revision documented Path 1 (layer-2 retry-on-duplicate scope expansion) as the architectural addition the b1 measurement was insufficient to avoid; the b1 measurement at e2f5304 had ALREADY passed the stop-condition before c4d8541 was authored. The 9f47cfb amendment reverted the layer-2 scope expansion as empirically unnecessary investment.

**Convention going forward.** Plan-time claims about external-system behavior get an explicit verification step at plan-write time when the claim is load-bearing. When a claim cannot be cheaply verified pre-write (e.g., requires a smoke run), it gets flagged as plan-time-assumed; the first commit that depends on the claim runs the verification as its audit step and documents the outcome. Plan-prose-as-anchor is fine; plan-prose-as-load-bearing-fact-without-verification is not.

**Cross-references.** Round: `docs/plans/phase4-similar-item-generator.md` (sub-phase a closing this round). Empirical instances: parent commit 6 body (UUIDv7 PK), `869d628` body (start() workflow), `c4d8541` + `9f47cfb` (b1 measurement supersession reversion). Sibling: §6.14.18 (framework constraint audit before pinning architectural detail), §6.14.22 (audit code semantics against consuming code) — both are specializations of the broader "audit against actual artifact" discipline.

---

#### 6.14.29 Empirical-state verification before plan-doc revision

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Sub-pattern of §6.14.21 specialized to in-flight plan-doc revision: when a plan revision is triggered by a pending measurement, the measurement must be verified-passed (or verified-failed) before the revision is authored, not concurrently.

When a round runs an iterative measurement loop ("ship N → measure → if not passing, expand scope; if passing, narrow scope"), the plan-doc revision that responds to the measurement must be authored **after** the measurement's empirical outcome is known. Authoring the revision concurrently with the measurement (or pre-emptively, anticipating a likely outcome) produces revisions that may not match the actual outcome — and the revision-then-revert sequence wastes the round's commit budget AND obscures the real architectural decision in the plan-doc's history.

**The c4d8541-then-9f47cfb sequence as the round's empirical anchor.** Sub-round commits 1, 2, 1.5, 1.6 shipped layer-1 (vector-similar-context: single-tier K=8 → tier-stratified K=2-per-tier × 4 tiers). The b1 measurement at `e2f5304` was the gating empirical signal: did tier-stratification pass the stop-condition (≥2 distinct brutal antonyms across 3 sources, 0 SANGUINE/LOQUACIOUS)? The measurement PASSED at 2/3 distinct (PHLEGMATIC×2 + MERETRICIOUS×1, 0 SANGUINE, 0 LOQUACIOUS). But the c4d8541 plan revision — authored against the iteration #2 baseline before the b1 measurement was empirically read — pre-emptively expanded scope to Path 1 (layer-2 retry-on-duplicate). The 9f47cfb amendment reverted that expansion as empirically unnecessary investment, with the c4d8541 framing preserved as a "considered-not-shipped" quote block.

**The discipline implication.** Plan-doc revisions in iterative-measurement rounds get the verify-then-revise sequence: read the measurement's empirical outcome FIRST, then author the revision against the outcome. The temptation to "document the next-step-anyway" while the measurement is in flight invites the revise-revert cycle. Pre-emptive plan revisions are not free — they're commit-ledger noise that must later be revert-amended with a quote-preserve block.

**Convention going forward.** When a round's commit ledger includes a measurement-gated decision point ("commit N measures; commit N+1 revises plan based on N's outcome"), the revision commit must verify N's outcome before authoring — not author concurrently. The verification step is named explicitly in commit N+1's pre-execution audit. Round-shape protection: verbalize the gate at plan-write time so the gate exists as a checklist item, not just an implicit "we'll see how it goes."

**Cross-references.** Round empirical anchor: `e2f5304` (b1 measurement that passed), `c4d8541` (plan revision authored pre-verification), `9f47cfb` (revert amendment). Plan: `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md` §11 (closed-plan re-opening framing + discipline-outcome paragraph). Parent: §6.14.21 (audit DB row-state against the live DB) — this entry specializes 6.14.21's discipline to in-flight plan revision; same root principle ("verify against actual artifact, not intended state"), different artifact (in-flight measurement vs. live DB).

---

#### 6.14.30 Additive-feature-cascade-undercount

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Pattern surfaced at three round-instances where adding an additive surface (new optional field, new exported symbol, new struct member) cascaded into more call-site updates than the plan-time audit anticipated.

When a plan adds an additive surface — a new optional field on a Zod schema, a new exported symbol, a new member on a TypeScript struct — the plan-time audit step typically counts production-code call-sites that consume the surface. The empirical cascade is broader: test fixtures that construct the struct must add the field; downstream-derived types (e.g., `Awaited<ReturnType<typeof query.execute>>[number]`) carry the new field through to consumers that auto-derive their input shape; ergonomic helpers (e.g., builders) must accept the field. Cascade-undercount produces a multi-commit ripple where the original additive commit lands clean but later commits surface "I forgot to update X" amendments.

**Three concrete instances from this round:**

- **`SiblingProvenancePayload` optional field (parent commit 4).** Adding the optional `templateVersion` field cascaded into the comparison-md writer's input shape, the JSON-shape parser, and the per-source provenance file format. Plan-time audit counted the producer site only; the cascade required follow-up commits.
- **`optionSchema` export (parent commit 5).** Adding the export from `ingest.ts` to enable reuse in `ingest-siblings.ts` cascaded into the test fixtures (which previously imported a local copy) and into the type-narrowing in the existing ingest happy-path.
- **`SourceItem.neighbors` member (sub-round commit 1).** Adding the optional `neighbors` array to `SourceItem` cascaded into `buildSiblingUserPrompt`'s rendering branch, the workflow's source-loading step, the loadNearestNeighbors step's return-shape coupling, and the sub-round commit 2's smoke-script's source-construction.

**The discipline implication.** Additive-feature audits get an explicit "consuming surface count" step that walks: production call-sites + test fixtures + auto-derived downstream types + ergonomic helpers. The audit's deliverable is a cascade-list with all sites enumerated, not just the producer-side change. When the cascade-list grows past ~5 sites, the additive feature should be split into multiple commits — one per cascade-layer — so each commit is mechanically reviewable.

**Convention going forward.** When a plan describes an additive feature, the audit step asks: "which test fixtures construct this struct? which downstream types auto-derive from this surface? which ergonomic helpers (builders, factories) accept this struct?" Each answer is a cascade-site that must land in the same commit (or split across multiple commits with explicit sequencing). The default of "the audit counts production-code only" silently undercounts.

**Cross-references.** Round empirical instances: parent commits 4, 5, sub-round commit 1. Plan: `docs/plans/phase4-similar-item-generator.md` §8 (commit 4 + 5 body for SiblingProvenancePayload + optionSchema), `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md` §6 (commit 1 body for SourceItem.neighbors). Sibling: §6.14.19 (type-error-as-audit cascade pattern) — that entry specializes to type-system propagation; this entry generalizes to call-site cascade across both type-system and ergonomic-helper surfaces.

---

#### 6.14.31 Destructive-operation-gate template

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Pattern surfaced at three round-instances of cleanup commits, each preserving real data while removing transient generated state via the same audit-confirm-execute-verify shape.

Destructive operations on shared state (DELETE rows, rm files, truncate logs) follow a five-step gate template that the round demonstrated three times across different cleanup contexts (sub-round retire-prior-iteration, post-CR-fix recovery cleanup, antonyms convergence cleanup). The shape is canonical for any commit that removes rows from DB or files from disk under preserved-companion-state.

**The five-step gate template:**

1. **Pre-flight count audit.** Read the live DB count of rows-to-be-deleted via `psql` (not inferred from prior commits' state). Read the file count of items-to-be-deleted via `ls`. Capture the exact pre-deletion numbers.
2. **Surface the destructive operation verbatim** to the user before firing. Include the SQL statement (with bound parameters), the filesystem operation (with paths), and the expected outcome. The surface is one-shot read-by-Leo — no cumulative context-build expected.
3. **Explicit confirmation gate.** User must type "yes" or equivalent before the destructive step fires. The confirmation prompt names the exact destructive operation; "proceed?" alone is insufficient.
4. **Transactional DELETE with RETURNING count match.** The actual DELETE runs as a single transaction with `RETURNING id` (or equivalent); the returned-row count must match the pre-flight count. Mismatch surfaces as immediate STOP.
5. **Post-flight byte-equality verification of preserved state.** Real items / real files / real logs that were NOT supposed to be touched must show byte-equal counts pre-and-post. The verification names each preserved surface explicitly.

**Three concrete instances from this round (all `--allow-empty` commits at git level):**

- `5be3c5c` — sub-round commit 5: retire all prior-iteration generated candidates (1.5-iteration mixed-config DB state).
- `ecca199` — recovery cleanup: retire mixed-config generated candidates after CR-schema-fix, before full-bank rerun.
- `ed730a5` — antonyms cleanup: retire 37 convergent verbal.antonyms candidates per the cluster audit (keep-1-per-cluster).

Each commit preserved (i) all `source='real'` items at byte-equal count, (ii) all out-of-scope `source='generated'` items at byte-equal count, (iii) untouched diagnostic logs preserved. Each commit followed the five steps verbatim.

**Convention going forward.** Any commit whose deliverable includes deletion of DB rows, deletion of files, or truncation of append-only logs follows the five-step gate. Rounds with more than one destructive commit should explicitly cross-reference the template; rounds with a single destructive commit should still author it against the template rather than improvising. The gate's purpose is twofold: prevent accidental over-deletion AND make destructive commits reviewable as a class (the verifier reads the same five-step shape across rounds).

**Cross-references.** Round empirical instances: `5be3c5c`, `ecca199`, `ed730a5` (this round). Plan: `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md` §6 commit 5 row (the canonical pre-deletion-audit + post-deletion-verification framing). Sibling: §6.14.21 (audit DB row-state against the live DB) — the destructive-operation-gate's step 1 is a specialization of that discipline; §6.14.31 generalizes the full audit-confirm-execute-verify shape into a reusable template.

---

#### 6.14.32 Sonnet 4.6 tool-use Zod-parse failures with scale-dependence

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Pattern surfaced from the round's empirical telemetry across multiple LLM-call run scales: a baseline ~5% noise rate in tool-use parameter compliance plus a scale-dependent regime where prompt-complexity drives output-budget pressure that manifests as new failure modes (empty rawInput, max>5 violations, structuredExplanation parts ordering).

LLM tool-use compliance has two regimes that the round empirically separated:

- **Baseline noise (~5% across the round).** The Sonnet 4.6 tool-use call occasionally emits malformed structured output — duplicate option text, referenced-option-text not exact-match, correctAnswerText not in options, structuredExplanation parts in wrong order. These are well-distributed across sub-types and rules; they're a baseline rate per LLM call that doesn't correlate with prompt complexity. Multiple-instance evidence: 2 percentages failures at sub-round commit 2 (`062fcf9`); 1 workrate at e2f5304; ~11 distributed failures at full-bank commit (`989d6da` resume).
- **Scale-dependent failures.** As prompt complexity grows, output-budget pressure produces categorically different failure modes — empty rawInput on max_tokens exhaustion, content-pattern attractors that cluster siblings on canonical exemplars, schema bound violations (too_big options) on overly-verbose tiers. These DO correlate with prompt complexity and concentrate in specific sub-types/tiers. Multiple-instance evidence: 21+ CR Zod failures at full-bank pre-fix (60bde8e + 7aa39d5 fixes addressed); empty-rawInput cluster at high-content-tail CR sources (7aa39d5 fix); SANGUINE-and-friends convergence at antonyms across all 4 tiers (ed730a5 cleanup addressed).

**The discipline implication.** Round-planning that relies on LLM tool-use must distinguish baseline-noise from scale-dependent failure modes. Baseline-noise is a "live with it, validate post-hoc" cost; scale-dependent failure is an architectural-or-fix-shape decision. Confusing the two leads to either (a) over-engineering to address noise that's empirically tolerable, or (b) under-engineering to ignore scale-dependent patterns that compound at full-bank scale.

**Operational anchor.** The 10% sub-type failure-rate threshold for "STOP and surface BEFORE the run completes" was the gating discipline for the round's full-bank attempts. The threshold separates baseline-noise (well under 10%) from scale-dependent failure (CR hit 10.9% at scope-H halt). Future LLM-call rounds should anchor on a sub-type-level failure-rate threshold rather than a run-level one — sub-type-level concentration is the structural signal, not the run-aggregate.

**Convention going forward.** Long-running LLM-call orchestrators include a per-sub-type failure-rate gate that halts the run at a threshold (10% as the round's empirical anchor). The captured run log + post-hoc per-sub-type telemetry lets future rounds distinguish baseline noise from scale-dependent failure. Iteration commits that respond to scale-dependent failure modes (the prompt iteration cycle) should anchor on sub-type-level evidence, not run-aggregate.

**Cross-references.** Round empirical instances: `062fcf9` (sub-round commit 2 — 2 percentages failures); `e2f5304` (sub-round commit 1.6 — 1 workrate failure); halted full-bank attempt + recovery cycle (`60bde8e` schema fix, `7aa39d5` max_tokens fix); `989d6da` (resume run baseline noise across 11 failures distributed across 4 sub-types). Plan: `docs/plans/phase4-similar-item-generator.md` §10 (LLM Zod failure handling). Sibling: §6.14.32 sits adjacent to §6.14.31 (destructive-operation-gate) as the runtime-discipline counterpart — both are LLM-orchestration-loop primitives.

---

#### 6.14.33 Failure-path observability symmetry

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Pattern surfaced from two round-instances where LLM-call failure-path logger.error contexts captured insufficient diagnostic fields, requiring additional debug cycles to recover information that was trivially available on the same SDK message object.

LLM-call failure paths must capture the same structured fields the success paths capture. The Anthropic SDK Message object carries `stop_reason`, `usage`, `content` blocks; the success-path's `logger.info` context object captured all three. The pre-fix failure-path's `logger.error` context object captured only `rawInput` (the failed-parse payload) — losing `stop_reason` and `usage`, both of which were diagnostic-bearing on every parse-fail. The asymmetric capture forced the round's debugging cycles to infer root cause via wall-clock + threshold analysis rather than direct evidence.

**Two round-instances of the gap biting twice:**

- **CR Zod-failure round** (60bde8e fix). The prior diagnostic captured rawInput showing 21+ CR sources emitted exactly 3 options where schema required 4-5. The diagnostic could not directly confirm "the LLM is mirroring the source's option-count" because `stop_reason` wasn't logged; inference was via schema-vs-source-bank distribution audit (which revealed 64% of real CR sources had 3 options).
- **Empty-rawInput cluster** (7aa39d5 fix). The 5 consecutive empty-rawInput CR failures could not be directly diagnosed because `stop_reason` wasn't logged; the diagnostic inferred max_tokens exhaustion via wall-clock (~62s vs ~25s typical) + sub-type concentration (all hard-tier) + bank-distribution correlation (high-content tail).

**The 7aa39d5 fix and its empirical validation.** The fix augmented the parse-fail logger.error context with `stop_reason`, `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens` (snake_case field shape mirroring success-path lines 197-208). The resume run (989d6da) included one parse-fail on `019dfdaf-e54a` with the augmented context: `stop_reason: "tool_use"` immediately surfaced that the failure mode had shifted from max_tokens exhaustion (pre-fix) to a different rule (structuredExplanation parts ordering). Diagnostic cycle collapsed by ~1 redirect compared to the pre-fix shape.

**The discipline implication.** Whenever a function's success path computes structured-log fields from an SDK response object (or any external API response), the failure path's logger.error context object should carry the same fields. If the failure throws BEFORE the success-path normalization (e.g., null-coalescing for nullable fields), the failure path duplicates the normalization inline rather than skipping the fields. The cost of duplication is one or two assignment-line per failure path; the cost of asymmetric capture is one or more debug cycles when the failure mode surfaces.

**Convention going forward.** Code-review checklist for any function that calls an external API and may fail: "if this function's success path logs structured fields from the response object, does the failure path log the same fields?" The default is symmetric capture; asymmetry must be justified with an explicit reason ("this field is sensitive PII" / "this field is the failure cause we're already capturing as `error.message`" / etc.).

**Cross-references.** Round empirical instances: pre-fix gap surfaced at `60bde8e` (CR Zod-failure round diagnostic) + `7aa39d5` body (empty-rawInput round diagnostic + fix authoring); post-fix validation at `989d6da` resume run's single parse-fail event. Plan: `docs/plans/phase4-similar-item-generator.md` §10 (LLM failure-mode handling). Sibling: §6.14.32 (Sonnet 4.6 tool-use Zod-parse failures with scale-dependence) — this entry is the observability-discipline complement to that entry's runtime-discipline.

---

#### 6.14.34 Mid-round narrow-scope sub-round insertion

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Pattern surfaced this round as the canonical shape for handling mid-round empirical evidence that a planned full-bank deliverable would be premature without a structural intervention.

When a round's commit ledger includes a test-run gate (e.g., parent commit 7's 42-source test before parent commit 8's 397-source full-bank run), and the test-run reveals a structural problem that requires architectural intervention (not just prompt iteration), the canonical response is a **narrow-scope sub-round between the existing parent's commits 7 and 8**. The sub-round opens its own plan-doc (`docs/plans/<parent>-<sub-round-name>-sub-round.md`), commits with sub-round-specific commit numbers (commits 7.5.0, 7.5.1, ...), and closes back into the parent at full-bank-run time. The parent round-close (parent commit 9) folds the sub-round outcomes back via `wholesale-replacement-with-quote-preservation` per §6.14.20.

**The round's empirical anchor.** Iteration #1 (`22c421f`, parent iteration commit between commits 7 and 8) anchored sibling difficulty tiers to real CCAT distribution. Iteration #2 (`0d3881c`, parent iteration commit between iteration #1 and the sub-round) de-templated antonyms anchor + added cross-source duplicate-prevention guards. The post-iteration #2 test-run still surfaced canonical-exemplar convergence (3/3 SANGUINE on antonyms-brutal). The sub-round opened (`40a2358` plan-doc) to ship vector-similar-context injection — a structural architectural addition that prompt iteration alone could not address. The sub-round closed at 8 commits + 5 recovery commits; parent commit 9 (this commit) folds the sub-round inline via the §6.14.20 pattern.

**The discipline implication.** Narrow-scope sub-rounds are bounded scope-expansion: the parent round's commit ledger does not absorb the sub-round's commits inline at plan-time; the sub-round opens its own plan-doc, ships its own commit chain, and the parent round-close reconciles via wholesale-replacement-with-quote-preservation. The sub-round preserves the parent's open-round window per §6.14.20.20 (extension to mid-round sub-round insertion). The alternative shapes — (a) absorbing iteration commits into the parent ledger inline with each new iteration getting a new commit number, or (b) closing the parent round and opening a new round — are both worse: (a) inflates the parent's commit count without preserving the empirical-iteration narrative; (b) loses the parent's open-round window and the §6.14.20 immutability constraint kicks in too early.

**Convention going forward.** When a mid-round empirical signal indicates a structural intervention is needed (not just prompt iteration), default to narrow-scope sub-round insertion. The sub-round plan-doc explicitly fences scope ("§3 Out of scope" lists the parent-round surfaces NOT touched). The parent round-close reconciles via §6.14.20's wholesale-replacement-with-quote-preservation pattern.

**Cross-references.** Round empirical instance: this round (parent commit 7's iteration cycle + sub-round insertion + parent commit 9 round-close). Plan: `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md` §11 (closed-plan re-opening framing — the round's explicit reasoning about why the sub-round shape was correct). Sibling: §6.14.20 (closed-plans-immutable as a multi-round convention) — this entry's narrow-scope-sub-round-insertion is a specialization of §6.14.20.20's mid-round insertion extension.

---

#### 6.14.35 Atomic-set contract as structural integrity probe

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Operational pattern: atomic-sibling-set contracts (each parent has exactly K generated children) produce tier-balanced row populations as a structural invariant that pre-destructive-operation audits can probe to verify state integrity.

The round's atomic-sibling-set contract (parent §4.2: each successful source produces exactly 4 generated siblings, one per difficulty tier) implies a structural invariant: across the whole `source='generated'` population, per-tier counts are equal (`COUNT WHERE difficulty='easy' = COUNT WHERE difficulty='medium' = ...`). Any deviation from per-tier balance signals atomic-set contract violation — either (a) a workflow midstream-failure that wrote partial sets, (b) a row-level corruption, or (c) post-write cleanup that didn't preserve the contract. Pre-destructive-operation audits should query this invariant; the result is a cheap structural-integrity probe.

**Empirical use across the round's destructive-operation commits:**

- `5be3c5c` (sub-round commit 5 cleanup): pre-flight count audit verified `easy/medium/hard/brutal = 12/12/12/12 = 48` rows × 4 tiers; post-cleanup verification confirmed all tiers at 0.
- `ecca199` (recovery cleanup post-CR-fix): pre-flight verified `140/140/140/140 = 560` rows; post-cleanup confirmed 0.
- `ed730a5` (antonyms cleanup): pre-flight verified `35/35/35/35 = 140` antonyms rows (the atomic-set invariant within the antonyms sub-set); post-cleanup verified the deletion pattern matched the cluster cardinality projection (`27/28/28/20`) and the 21 partial-parents shape was internally consistent (`7×0 + 11×1 + 5×2 + 4×3 + 1×4 = 37` sibling losses).

**The discipline implication.** When a system has an atomic-write contract (multi-row atomic sets, multi-file atomic write, etc.), the contract implies a structural invariant on aggregate state that's cheap to probe via aggregate query. Pre-destructive-operation audits run the probe as part of the pre-flight count audit (per §6.14.31's five-step template); deviations signal investigate-before-destroy.

**Convention going forward.** Round-planning that includes atomic-write contracts also names the aggregate-invariant query that probes the contract. Pre-destructive-operation audits run the query and surface the result. Post-destructive-operation verifications run the query against the post-state and verify the deviation matches the destructive operation's expected impact.

**Cross-references.** Round empirical instances: `5be3c5c`, `ecca199`, `ed730a5` (all three destructive-operation commits). Plan: `docs/plans/phase4-similar-item-generator.md` §4.2 (atomic-set contract definition). Sibling: §6.14.31 (destructive-operation-gate template) — this entry's atomic-set probe is one of step 1's pre-flight audit queries; §6.14.35 generalizes the operational pattern.

---

#### 6.14.36 Canonical-exemplar convergence — architectural-fix-not-prompt-fix

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Round-defining empirical finding: LLM-generated content can converge on a small set of canonical exemplars across many independent generations even when the prompt explicitly forbids surface-cloning, and the fix for this convergence at scale is architectural, not prompt-iteration.

When an LLM generation task (per-sub-type sibling generation in this round's case) has a small target-attribute space ("brutal-tier antonym for a college-register polysemous word"), the LLM converges on a small set of canonical exemplars across many independent calls — even when (a) the prompt explicitly says "produce a different specific word than any prior generation", (b) vector-similar-context injection (the b1 architecture) shows the LLM the prior generations as do-not-duplicate exemplars, and (c) each call has its own distractor option-set produced independently. The convergence is on the **target word (anchor)**, not on the **option-set surface**. The round's empirical evidence: 16 SANGUINE-bearing brutal antonyms across 16 distinct parent sources, with **15 of 16** distinct option-set fingerprints — diversified-distractors with same target word.

**The round's empirical envelope (verbal.antonyms convergence post-resume):**

- Total antonyms candidates: 140 (35 parents × 4 tiers).
- In-cluster at threshold 0.95: 53 (37.9%) across 16 clusters (easy: 6, medium: 3, hard: 3, brutal: 4).
- Largest single cluster: SANGUINE (brutal, size 13).
- Other 13 sub-types: ≤5.6% in-cluster (12 sub-types under 1%).
- The b1 architecture (tier-stratified vector-similar-context, K=2-per-tier × 4 tiers = 8 neighbors) was empirically validated for 13 of 14 sub-types (`verbal.critical_reasoning` 232 candidates, 0 clusters; `verbal.sentence_completion` 236 candidates, 0 clusters; etc.) AND empirically insufficient for `verbal.antonyms` where canonical-exemplar attractors persisted across all 4 tiers.

**The diversified-distractor finding as the load-bearing characterization.** The 16 SANGUINE-bearing candidates are NOT effectively-cloned output. Each call independently produced its own option-set; the convergence is on the brutal-anchor word selection. This shifts the fix-shape decision: **prompt-iteration** ("the LLM keeps producing SANGUINE — let's tell it more emphatically not to") attacks the wrong target. The right targets are architectural: (a) sub-type-specific brutal-anchor blacklist injected into the prompt, (b) regeneration with anti-anchor signaling when neighbor-context shows the candidate target word repeating, (c) target-word constraint hard-coded out-of-distribution from the LLM's training-bias attractor set.

**Cross-tier cluster-overlap as a dataset-shape consequence.** Single source `019dfdac-b934-72ea-a786-436d334f4057` had its generations clustered at all 4 tiers (Timid-easy, frugal-medium, hard-cluster #2, Sanguine-brutal); the keep-1-per-cluster cleanup retained none of its siblings. This is a downstream consequence of the canonical-exemplar pattern: when a parent's LLM-output stream produces convergent siblings at every tier, no per-cluster retention strategy preserves any of its generations. Future cleanup-policy designs may want a "preserve at least 1 sibling per parent" guard if maintaining coverage breadth across source items is a design goal.

**The discipline implication.** Round-planning that uses LLM generation against a small target-attribute space must anticipate canonical-exemplar attractors as a systemic risk. The b1-architecture validation across 13 of 14 sub-types shows the convergence is sub-type-specific, not generation-pipeline-general; identifying which sub-types fall in the convergence boundary is empirical work that requires full-bank-scale data, not test-run-scale data. The fix-shape decision (architectural intervention vs. cleanup-after-the-fact) is the round's empirical signal.

**Convention going forward.** Future LLM-generation rounds with small target-attribute spaces include a convergence-audit step at full-bank scale (cosine-similarity clustering at thresholds 0.92/0.95/0.97 per cell) BEFORE the round closes. The audit identifies sub-types in the convergence boundary; the cleanup-or-architectural-fix decision is informed by the audit's evidence (in-cluster percentage, distinct-fingerprint vs. effective-clone characterization, cross-tier overlap). Prompt iteration is the wrong tool when the convergence is on target-attribute selection, not on output surface.

**Cross-references.** Round empirical instances: `989d6da` (resume run that surfaced the convergence at full-bank scale); `scripts/_logs/convergence-audit.md` (the cosine-similarity cluster scan that quantified the convergence + characterized it as diversified-distractor); `ed730a5` (the architectural-or-cleanup decision, executed as cleanup-after-the-fact via keep-1-per-cluster). Plan: `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md` §10 (the round's anticipated risk; pre-empirical prediction was "first 1-2 sources converge", empirical reality was 16/35 = 45.7% at brutal). Sibling: §6.14.32 (LLM-output drift) — this entry's canonical-exemplar attractor is a specific instance of LLM-output drift's scale-dependent regime.

---

#### 6.14.37 Schema constraints derived from seed-data must re-verify against full-bank shape

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Pattern surfaced from the round's CR-failure cycle where a Zod schema bound (`options.min(4)`) was correct for the 50-item seed bank but wrong for the 479-item full bank.

When a Zod schema (or any data-shape constraint) is authored against a small seed-data sample, the constraint may not match the full-bank shape. The seed bank in this round had ~50 items at 4-or-5-options; the full bank had 479 items at 3-or-4-or-5-options because the canonical CCAT logic-validity question shape uses exactly 3 options ("Correct / Incorrect / Cannot be determined"), and the full-bank extraction had captured 38 such CR items + 1 ratios item. The schema's `options.min(4)` constraint rejected the 3-option shape that the LLM correctly mirrored (per the prompt's "preserve problem structure" rule).

**The empirical chain of the failure:**

1. Schema authored at parent commit 3 / `a07c03f` with `options: z.array(llmOption).min(4).max(5)` — derived from seed-data inspection.
2. Test run at parent commit 7 / `869d628` succeeded: 42 sources × 4 = 168 candidates generated. Seed items had 4-or-5 options; the generator mirrored that shape; schema accepted.
3. Full-bank attempt at the halted full-bank commit: 21+ CR sources rejected on `siblings.{tier}.options too_small minimum=4`. Diagnostic captured the exact rawInput showing every tier emitted exactly 3 options.
4. Schema-vs-bank distribution audit at the diagnostic phase: 38 of 59 real CR sources have 3 options (64%); 1 of 16 ratios sources has 3 options. Two sub-types affected by the schema-vs-data mismatch.
5. Fix at `60bde8e`: `options.min(4) → options.min(3)`. Audit-confirmed across all 14 sub-types: no source has option_count > 5.

**The discipline implication.** Schema authoring against seed-data is fine as a starting point; the schema's constraints must be re-verified against the full-bank distribution before the schema is load-bearing on full-bank execution. The verification is a single SQL query (per-sub-type option-count distribution) at schema-definition time. The round's audit query at the recovery cycle's diagnostic phase identified both affected sub-types in seconds; the same query at schema-definition time would have prevented the failure cycle entirely.

**Convention going forward.** When a Zod schema (or any value-bound constraint) is added or modified, the audit step includes a "verify against current full-bank shape" check: enumerate the constraint's bounds, run an SQL query against the live data to check no row violates the bounds, surface the result as part of the commit's pre-execution audit. The check is cheap; the failure mode it prevents is expensive (a full-bank execution cycle that fails partway through).

**Cross-references.** Round empirical instance: `60bde8e` (the schema fix + commit body documenting the seed-vs-bank shape mismatch). Plan: `docs/plans/phase4-similar-item-generator.md` §4.4 (body/option Zod schema consolidation; the schema-derivation site). Sibling: §6.14.21 (audit DB row-state against the live DB) — this entry specializes 6.14.21's discipline to schema-bound verification; same root principle ("verify against actual artifact"), different artifact (schema-bound vs. row-state).

---

#### 6.14.38 Stdout capture for long unattended runs

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Operational pattern: long-running LLM-call orchestration scripts must redirect stdout to disk via `tee` from the very first invocation; stdout-only-to-terminal is a single point of failure for postmortem investigation.

The original full-bank run ran for ~2h45m without `tee` redirect; the run halted at scope H's 10% CR-failure threshold. The script's `logger.error` blocks (with `rawInput`, `issues`, `stop_reason` post-7aa39d5) emitted to stdout; without `tee`, those error blocks were lost when the terminal session ended. Root-cause investigation required an explicit re-run with `tee` to capture failure-path data. The re-run's `cr-diag.log` was the load-bearing artifact for the CR-schema-fix diagnosis; without it, the round's CR-failure cycle would have required guesses-then-verify rather than direct-evidence-then-fix.

**The discipline implication.** Any orchestration script that runs longer than ~5 minutes unattended (= any LLM-call orchestrator at non-trivial scale) must `tee` stdout from the first invocation. The redirect cost is a few KB/MB on disk; the failure-recovery cost without it is 1+ debug cycles per investigation.

**The empirical operational anchor.** The round's recovery cycle defaulted to `bun run scripts/X.ts ... 2>&1 | tee scripts/_logs/<X>.log` for every diagnostic AND every retry AND the resume run AND the antonyms cleanup smoke. Each captured log is a postmortem-ready artifact: `cr-diag.log` (the original CR-failure diagnostic), `cr-fix-smoke.log` (the schema-fix validation smoke), `full-bank-output-resume.log` (the resume run's complete trace including the 1 parse-fail with augmented stop_reason). Future rounds reading these artifacts can trace the empirical chain end-to-end.

**Convention going forward.** Orchestration script invocations in plan-doc audit steps include the `tee` redirect verbatim; round-close summaries reference the captured logs by path. The captured-log paths live alongside the diagnostic artifacts (`scripts/_logs/`); they're preserved across cleanup commits as historical artifacts (not committed to git, but explicitly NOT-DELETED in the cleanup commit's "what NOT to touch" list).

**Cross-references.** Round empirical instances: the lost-stdout from the halted full-bank attempt; the recovery cycle's `cr-diag.log` + `cr-fix-smoke.log` + `full-bank-output.log` + `full-bank-output-resume.log`. Plan: `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md` §6 commit 6 row (post-amendment, the full-bank invocation includes `2>&1 | tee scripts/_logs/full-bank-output-resume.log`). Sibling: §6.14.33 (failure-path observability symmetry) — that entry covers what to log; this entry covers where the log is captured. Both are operational disciplines for LLM-call orchestration.

---

#### 6.14.39 Provenance-JSON partial-invalidation as known state after targeted cleanup

> **Captured 2026-05-08** (phase 4 sub-phase a similar-item-generator round close). Operational note: post-cleanup, a subset of provenance JSONs at `scripts/_siblings/<parentId>.json` encode 4-sibling sets where 1+ siblings have been deleted from DB; the provenance-JSON contract didn't anticipate post-write cluster-cleanup, and downstream consumers (sub-phase b validators) must cross-check against current DB state.

The round's antonyms cleanup commit (`ed730a5`) deleted 37 generated rows across 21 distinct parent items but did NOT touch the corresponding provenance JSONs at `scripts/_siblings/<parentId>.json`. Each JSON encodes the parent's 4-sibling set (LLM-output verbatim, embedding-step result, ingest IDs); after cleanup, 21 of those JSONs encode sibling IDs that no longer exist in the DB. The JSONs are still accurate as a record of "what the LLM produced at generation time" but are NOT accurate as a record of "what's in the bank now". The sub-round-shipping contract didn't anticipate this divergence.

**Three concrete consequences for sub-phase b:**

- **JSON-as-authoritative is wrong.** Validators consuming provenance must cross-check `JSON-encoded sibling IDs` against `current `items` table state` to filter out deleted siblings before assessing the parent's full sibling set.
- **Per-parent sibling count from DB, not JSON.** Aggregate queries on the bank ("which parents have 4 generated siblings remaining?") should use DB-side aggregate counts, not enumerate JSONs and assume each encodes 4 live rows.
- **Round-time JSON state vs. cleanup-time JSON state.** The JSONs are write-once-at-generation-time artifacts; cleanup is a separate write to the DB but NOT to JSON. Future cleanup commits in sibling rounds either (a) accept the same partial-invalidation pattern + document it explicitly, OR (b) introduce a JSON-side cleanup pass that prunes deleted-from-DB sibling references. The round chose (a) per scope.

**The discipline implication.** When a write-once external artifact (provenance JSON, audit log, side-effect file) is paired with a mutable primary store (DB row), cleanup operations on the primary store must explicitly classify the external artifact's state: kept-as-historical-artifact (with downstream consumer awareness) OR cleaned-in-parallel (paired DELETE). Round-planning must name the choice; future-Claude reading either side must understand which.

**Convention going forward.** When a round includes both write-once external artifacts and post-write cleanup operations on the primary store, the cleanup commit's body explicitly classifies each external artifact: which are kept-as-historical, which are cleaned in parallel. Downstream consumers (validators, dashboards, audit reports) get an explicit cross-reference if they must adapt their reads.

**Cross-references.** Round empirical instance: `ed730a5` (the antonyms cleanup; commit body documents partial-invalidation explicitly). Plan: `docs/plans/phase4-similar-item-generator.md` §4.12 (provenance shape — write-once-at-generation-time). Sibling: §6.14.31 (destructive-operation-gate template) — this entry covers a specific external-artifact disposition decision that the gate-template's step 5 (post-flight verification) names; §6.14.39 specializes the discussion to write-once-paired-with-DB external artifacts.

---

## 7. Server actions, route handlers, and workflows

All server actions live at the closest `actions.ts` file under `src/app/(app)/...`. All follow the patterns demonstrated in `src/app/actions.ts`: file-top `"use server"`; mutations use `errors.try` around DB calls (`rules/no-try.md`); errors are logged then thrown via `errors.wrap` (`rules/error-handling.md`); writes call `revalidatePath` after writes (with the specific exception in §7.8).

API routes live under `src/app/api/`. They use the same `errors.try` pattern.

### 7.1 `startSession` — `src/app/(app)/actions.ts`

```ts
async function startSession(input: StartSessionInput): Promise<{ sessionId: string; firstItem: ItemForRender }>

interface StartSessionInput {
    type: "diagnostic" | "drill" | "full_length" | "simulation"
    subTypeId?: SubTypeId           // required for drill
    timerMode?: "standard"          // optional; defaults to 'standard' for drill internally (v1 2026-05-04: speed_ramp + brutal drill modes cut, see §3.4)
    drillLength?: 5 | 10 | 20       // required for drill
}
```

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 1). The `'review'` session type, the `ifThenPlan` input, and the speed_ramp/brutal `timerMode` values were all dropped from `StartSessionInput` in tree. The `narrowing_ramp_completed` and `if_then_plan` insert paths were dropped from `start.ts`'s INSERT VALUES list. Schema columns + enum values stay until commit 4's migration drops them.

Side effects:
- Reads `auth()` to resolve `userId` (throws `ErrUnauthorized` if missing).
- Computes `target_question_count` from `input` (50 for diagnostic / full_length / simulation; `drillLength` for drill).
- Calls `computeRecencyExcludedSet(userId, Date.now())` from `src/server/items/recency.ts` — a single query joining `attempts` to `practice_sessions` filtered by `practice_sessions.user_id = $1 AND attempts.id >= uuidv7LowerBound(now - 7d)`, returning the distinct set of `item_id`s.
- Inserts a `practice_sessions` row with `started_at_ms = Date.now()`, `last_heartbeat_ms = Date.now()`, `target_question_count`, `recency_excluded_item_ids`. The `narrowing_ramp_completed` and `if_then_plan` columns receive the schema's defaults (`false`, `NULL`) — no application writer touches them in v1.
- Calls `getNextItem(sessionId)` synchronously to return the first item.

Tables touched: `practice_sessions` (insert), `attempts` + `practice_sessions` (read for recency), `items` (select via `getNextItem`).

### 7.2 `submitAttempt` — `src/app/(app)/actions.ts`

```ts
async function submitAttempt(input: {
    sessionId: string
    itemId: string
    selectedAnswer?: string
    latencyMs: number
    triagePromptFired: boolean
    triageTaken: boolean
    selection: ItemSelection      // echoed back from the rendered item
}): Promise<{ nextItem?: ItemForRender }>
```

Side effects:
- Reads the item's `correct_answer` and `difficulty`. The `served_at_tier`, `fallback_from_tier`, and `fallback_level` for this attempt come from `input.selection` — opaque values returned by the previous `getNextItem` call as part of `ItemForRender.selection` and echoed back by the FocusShell. No serverless-state-survival concern because the values travel through the request/response cycle. See §7.4.
- Computes `correct: boolean`.
- Inserts an `attempts` row with `served_at_tier`, `fallback_from_tier` (nullable), `metadata_json.fallback_level`.
- Calls `getNextItem(sessionId)` for the next item.
- Returns `{ nextItem: undefined }` when the session has reached `target_question_count` or — for brutal drills — when the brutal/hard fallback chain ends.

Tables touched: `attempts` (insert), `items` (select via `getNextItem`).

### 7.3 `endSession` — `src/app/(app)/actions.ts`

```ts
async function endSession(sessionId: string): Promise<void>
```

Side effects:
- Sets `practice_sessions.ended_at_ms = Date.now()`, `completion_reason = 'completed'` for `sessionId` (idempotent — guarded by `WHERE ended_at_ms IS NULL`).
- Triggers `masteryRecomputeWorkflow(sessionId)` (fire-and-forget per PRD §8.3).
- ~~Triggers `reviewQueueRefreshWorkflow(userId)`.~~ **Cut from v1 2026-05-04** — review queue (PRD §4.3 cut). The `reviewQueueRefreshWorkflow` was **never shipped** to tree (`src/workflows/review-queue-refresh.ts` does not exist). v1 `endSession` does not trigger any review-queue work.
- Calls `revalidatePath('/post-session/' + sessionId)`.

Tables touched: `practice_sessions` (update). Workflow consumers touch `attempts`, `mastery_state`, ~~`review_queue`~~ (review_queue inserts cut from v1 2026-05-04 — see PRD §4.3 + SPEC §3.5 cut markers).

### 7.4 `getNextItem` — `src/server/items/selection.ts`

Not a server action — invoked by `startSession` and `submitAttempt`.

```ts
async function getNextItem(sessionId: string): Promise<ItemForRender | undefined>
```

Implementation dispatches on the session's `selectionStrategy`, derived from `practice_sessions.type`:

- `'adaptive'` (drill only) — adaptive tier via `nextDifficultyTier` over the user's last 10 in-session attempts on this sub-type, computed from the `attempts` table on every call. Filtered by the recency-excluded set, then by the tier-fallback ladder (§9.1). **Phase 5 sub-phase 2 closes the deferred `ErrAdaptiveDeferred` placeholder; v1 currently dispatches `drill → uniform_band` (Phase 3).**
- `'fixed_curve'` (diagnostic / full_length / simulation) — the per-question (sub-type, difficulty) is read from the deterministic mix in `src/config/diagnostic-mix.ts` (diagnostic) or from the per-decile distribution in `src/config/difficulty-curves.ts` (full_length / simulation), indexed by the count of attempts already in the session. Filtered by the recency-excluded set.

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 1). The `'review_queue'` selection strategy was dropped from `SelectionStrategy` and from the dispatch in tree, alongside `ErrReviewQueueDeferred`. The brutal/speed-ramp drill-mode tier-fallback paths in `initialTierFor` were also dropped (the `timerMode` parameter is now narrowed to `'standard'` everywhere).

Returns `undefined` when:
- The session quota is reached (`COUNT(attempts WHERE session_id = $1) >= target_question_count`).

The `served_at_tier`, `fallback_from_tier`, and `fallback_level` for the chosen item are passed back to the client alongside the `ItemForRender` payload (see §6.1 — `ItemForRender` carries a `selection` field with `{ servedAtTier, fallbackFromTier?, fallbackLevel }`). The FocusShell echoes them back to the server in the next `submitAttempt` invocation, where `submitAttempt` writes them onto the inserted `attempts` row. No serverless-state-survival concern: the values travel through the request/response cycle exactly once, in flight.

Tables: `items`, `attempts`, `practice_sessions`.

### 7.5 `dismissPostSession` — `src/app/(app)/post-session/[sessionId]/actions.ts`

```ts
async function dismissPostSession(sessionId: string): Promise<void>
```

Side effects:
- ~~For `full_length` sessions, sets `practice_sessions.strategy_review_viewed = true`. Throws `ErrStrategyReviewRequired` if the gate has not yet elapsed.~~ **Cut from v1 2026-05-04**, code-cleanup landed v1-code-cleanup commit 3 (`938f771`). The `strategy_review_viewed` column was dropped from `practice_sessions` via migration `0001_true_young_avengers.sql`. `ErrStrategyReviewRequired` was never declared in tree (PRD §6.5 strategy-review gate cut). v1 `dismissPostSession` has no full-length-specific branch.
- For diagnostic sessions where the user has not yet provided onboarding targets, the post-session page renders the `<OnboardingTargets>` form first and `dismissPostSession` is gated by `<OnboardingTargets>` having posted (or skipped) via `saveOnboardingTargets`.
- Calls `revalidatePath('/')`.

### 7.6 `saveOnboardingTargets` — `src/app/(app)/post-session/[sessionId]/actions.ts`

```ts
async function saveOnboardingTargets(input: {
    targetPercentile?: 50 | 30 | 20 | 10 | 5
    targetDateMs?: number
}): Promise<void>
```

Updates `users.target_percentile` and `users.target_date_ms`. `undefined` for either field means "skip" — leave the column null. Calls `revalidatePath('/')`.

### 7.7 `recordHeartbeat` — `src/app/api/sessions/[sessionId]/heartbeat/route.ts`

`POST` handler. Verifies the session belongs to the cookied user, updates `last_heartbeat_ms`, returns `204`. Idempotent.

**Shape A — inline-subquery ownership scope (sub-phase 4 commit 1, hash `9ce8325`).** The route does NOT call `auth()` directly; the proxy carve-out (`api/sessions/[^/]+/heartbeat` in `src/proxy.ts`'s `config.matcher`) skips the proxy's auth resolution layer, AND the route handler reads the session-token cookie inline and scopes the UPDATE via a subquery that resolves the cookie owner's user_id from the auth-sessions table:

```sql
UPDATE practice_sessions
SET last_heartbeat_ms = (extract(epoch from now()) * 1000)::bigint
WHERE id = $sessionId
  AND ended_at_ms IS NULL
  AND user_id = (
      SELECT user_id FROM sessions
      WHERE session_token = $cookieValue
        AND expires_ms > (extract(epoch from now()) * 1000)::bigint
  )
RETURNING id
```

The `expires_ms` check sits inside the subquery's WHERE clause so an expired token matches zero rows. One PG round-trip; two indexed lookups (auth-sessions PK on `session_token`, practice_sessions PK on `id`).

**Why one round-trip beats `auth()` + UPDATE (Shape B, rejected).** Calling `auth()` from inside the handler would resolve the user_id via NextAuth's standard adapter (one DB read against the auth-sessions table) and then run the UPDATE as a second query (two round-trips total). Shape A is one round-trip — same DB cost (one auth-sessions read + one practice-sessions UPDATE), better latency. The database session strategy means the auth-sessions read is unavoidable regardless of shape; the round-trip count is the only axis on which the shapes differ.

**Cookie name — environment-aware.** Auth.js v5 names the session-token cookie based on `useSecureCookies` (HTTPS): `__Secure-authjs.session-token` in production, `authjs.session-token` in dev/HTTP. The route reads both and prefers the secure-prefix one when both are present. Hardcoding the dev-only name would silently drop ownership enforcement in production.

**Uniform-204 contract (load-bearing).** All four request shapes return HTTP/204 unconditionally:

| Request shape | DB-state outcome |
|---|---|
| Correct cookie + owned sessionId (happy) | `last_heartbeat_ms` advances |
| Correct cookie + different user's sessionId (cross-user) | `last_heartbeat_ms` unchanged |
| No cookie (anonymous) | `last_heartbeat_ms` unchanged |
| Correct cookie + nonexistent sessionId (garbage) | no row written |

**DB-state is the only signal.** Differing response codes (e.g., 401 for missing cookie, 403 for owner-mismatch, 404 for missing row) would let an unauthenticated probe enumerate which sessionIds exist by observing the response code. Returning uniform 204 closes that side channel — an attacker probing arbitrary UUIDv7 sessionIds gets the same 204 whether the id is real, owned, or garbage. Verification of the contract anchors on DB read-back (`SELECT last_heartbeat_ms FROM practice_sessions WHERE id = $sid`), not on response shape; see `scripts/dev/smoke/heartbeat-route-ownership.ts` (sub-phase 4 commit 2, hash `78eb047`) for the canonical four-scenario smoke and §6.14.14 for the generalizable pattern.

### 7.8 `persistTimerPrefs` — `src/app/(app)/actions.ts`

> **Cut from v1 2026-05-04** — timer-toggle UX (PRD §5.1 cut marker). `persistTimerPrefs` was never shipped to tree (`src/app/(app)/actions.ts` does not export it). The `users.timer_prefs_json` column it would have written was dropped in v1-code-cleanup commit 3 (`938f771`). Section preserved as historical reference; the "no `revalidatePath`" exception note documents the rationale for any future v2 reintroduction. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.

```ts
async function persistTimerPrefs(input: TimerPrefs): Promise<void>
```

Updates `users.timer_prefs_json`. **Does not call `revalidatePath`** — the focus shell reads `timer_prefs_json` only at session start, not from a server-rendered cache, so revalidating any path would invalidate the Mastery Map cache for no reason. Documented in `rules/`-comments inside the action so the linter convention isn't accidentally followed here.

### 7.9 `ingestItemAction` — `src/app/(admin)/ingest/actions.ts`

```ts
async function ingestItemAction(input: {
    subTypeId: SubTypeId
    difficulty: "easy" | "medium" | "hard" | "brutal"
    body: ItemBody                  // Zod-validated discriminated union; v1 has one variant ({ kind: 'text' })
    options: { id: string; text: string }[]
    correctAnswer: string
    explanation?: string
    strategyId?: string
}): Promise<{ itemId: string }>
```

Side effects:
- Calls `requireAdminEmail()` first; throws `ErrUnauthorized` on failure.
- Validates `input.body` with `ItemBody.safeParse` per `rules/zod-usage.md`.
- Inserts an `items` row with `source: "real"`, `status: "live"`, embedding NULL, `body` and `options_json` populated.
- Triggers `embeddingBackfillWorkflow(itemId)` so the embedding lands asynchronously.
- Calls `revalidatePath('/admin/ingest')` and `revalidatePath('/admin/generate')` (for the bank-target grid).

### 7.10 `triggerGenerationAction` — `src/app/(admin)/generate/actions.ts`

```ts
async function triggerGenerationAction(input: {
    subTypeId: SubTypeId
    difficulty: "easy" | "medium" | "hard" | "brutal"
    count: number              // bounded 1..50
}): Promise<{ enqueued: number }>
```

Side effects:
- Admin-gated.
- Enqueues `count` invocations of `itemGenerationWorkflow({ subTypeId, difficulty })`.
- The admin UI displays a confirmation dialog when `count >= 10` naming the cell, count, and estimated cost; below 10, the action fires without confirmation.

### 7.11 `deleteAccount` — `src/app/(app)/settings/delete-account/actions.ts`

Server action wrapping `src/server/auth/account-deletion.ts:deleteAccount`. Reads `auth()`, calls `deleteAccount(session.user.id)`, calls `signOut()`, redirects to `/login`. The page renders a confirmation dialog with the cascade summary before invoking.

### 7.12 Cron route handlers

`src/app/api/cron/abandon-sweep/route.ts` (`* * * * *`):
- Validates `Authorization: Bearer ${env.CRON_SECRET}`.
- Triggers `abandonSweepWorkflow()` which runs the idempotent UPDATE:

```sql
UPDATE practice_sessions
SET ended_at_ms = last_heartbeat_ms + 30000,
    completion_reason = 'abandoned'
WHERE last_heartbeat_ms < ($now_ms - 120000)
  AND ended_at_ms IS NULL
RETURNING id, user_id
```

For each finalized session, enqueue `masteryRecomputeWorkflow(sessionId)`.

`src/app/api/cron/candidate-promotion/route.ts` (`0 4 * * *`):
- Validates the bearer token.
- Triggers `candidatePromotionWorkflow()`.

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/abandon-sweep",       "schedule": "* * * * *" },
    { "path": "/api/cron/candidate-promotion", "schedule": "0 4 * * *" }
  ]
}
```

### 7.13 API route handlers

| route | method | purpose |
|---|---|---|
| `src/app/api/auth/[...nextauth]/route.ts` | `GET`, `POST` | Standard Auth.js v5 handlers — `export const { GET, POST } = handlers` from `src/auth.ts`. |
| `src/app/api/health/route.ts` | `GET` | Returns `200 {"ok":true}`. Bypassed by middleware. |
| `src/app/api/sessions/[sessionId]/heartbeat/route.ts` | `POST` | 204 endpoint for `navigator.sendBeacon`. |
| `src/app/api/cron/abandon-sweep/route.ts` | `GET` | Per-minute cron trigger. |
| `src/app/api/cron/candidate-promotion/route.ts` | `GET` | Nightly cron trigger. |
| `src/app/api/admin/generate-items/route.ts` | `POST` | Admin-gated wrapper around `triggerGenerationAction` for non-form callers. |
| `src/app/api/admin/ingest-item/route.ts` | `POST` | Bearer-`CRON_SECRET`-gated wrapper around `ingestRealItem` — used by stage 2 of the OCR pipeline. See §7.14. |

### 7.14 `src/app/api/admin/ingest-item/route.ts` — admin item ingest

Bearer-token-gated `POST` endpoint that stage 2 of the OCR pipeline (`scripts/generate-explanations.ts`) targets. Auth check: `Authorization: Bearer ${CRON_SECRET}` — reusing `CRON_SECRET` rather than a dedicated `ADMIN_API_TOKEN` is documented as a known compromise; introduce a separate token if other admin scripts adopt this route.

Request body (Zod-validated by `requestSchema` in the route file):

```ts
{
    subTypeId: SubTypeId
    difficulty: 'easy' | 'medium' | 'hard' | 'brutal'
    body: ItemBody          // discriminated union per §3.3.1
    options: { id: string, text: string }[]   // id matches /^[0-9a-z]{8}$/, length 2..5
    correctAnswer: string   // matches /^[0-9a-z]{8}$/, must equal one of options[*].id
    explanation?: string
    strategyId?: string     // uuid
    metadata?: {
        originalExplanation?: string
        importSource?: string  // length 1..64
        structuredExplanation?: { parts: StructuredExplanationPart[] }
            // parts.length 2..3, ordered recognition → elimination → optional tie-breaker (Zod refinement)
            // each parts[i].referencedOptions is z.array(z.string());
            //   the runtime cross-check that every referenced id exists in options[*].id
            //   lives in ingestRealItem (Zod cannot do cross-field validation).
    }
}
```

The route's behavior delegates to `ingestRealItem` from `src/server/items/ingest.ts`. On success returns `201 { itemId }`. On Zod failure returns `400` with the issues array. On internal failure returns `500` and logs the wrapped error.

The route is the boundary that enforces the opaque-id regex (`^[0-9a-z]{8}$`) — letter-shaped ids fail at the Zod boundary before reaching `ingestRealItem`. See `docs/plans/opaque-option-ids-and-pipeline-split.md` §3.3 for the validation tightening history.

### 7.15 Error patterns

Every server action and API route follows `rules/error-handling.md`. Module-level error sentinels per `rules/no-extends-error.md`:

```ts
const ErrSessionNotFound = errors.new("session not found")
const ErrItemNotFound = errors.new("item not found")
const ErrStrategyReviewRequired = errors.new("strategy review required before dismiss")  // CUT FROM v1 2026-05-04 — strategy-review gate (PRD §6.5 cut). Never declared in tree; never thrown in v1. See §7.5 marker.
const ErrUnauthorized = errors.new("unauthorized")
const ErrCronAuth = errors.new("cron authorization failed")
```

`errors.try` follows the canonical shape from `src/app/actions.ts:12-18` — variable assignment, immediate `if (result.error)` block, log then `throw errors.wrap(...)` with no blank line in between.

---

## 8. The generation pipeline

PRD §3.2, §8.2. The pipeline is a single module at `src/server/generation/pipeline.ts` with four named stage functions:

```ts
async function generateItem(template: ItemTemplate, difficulty: Difficulty): Promise<RawItem>
async function validateItem(item: RawItem, subTypeId: SubTypeId): Promise<ValidatorReport>
async function scoreItem(item: RawItem, validatorReport: ValidatorReport): Promise<QualityScore>
async function deployItem(input: DeployInput): Promise<{ itemId: string }>
```

Type shapes:

```ts
interface RawItem {
    body: ItemBody                         // Zod-validated, almost always { kind: 'text', text }
    options: { id: string; text: string }[]
    correctAnswer: string
    explanation: string
}

interface CheckScore {
    score: 1 | 2 | 3 | 4 | 5
    reason?: string
}

interface ValidatorReport {
    correctness: CheckScore
    ambiguity: CheckScore
    difficultyMatch: CheckScore
    novelty: CheckScore
    nearestNeighborSimilarity: number     // cosine, 0..1
    nearestNeighborItemId?: string
    passed: boolean                        // all four scores >= 4 AND similarity < 0.92
}

interface QualityScore {
    estimatedDifficulty: "easy" | "medium" | "hard" | "brutal"
    score: number                          // 0..1, weighted from validator scores
    promptLength: number
    optionCount: number
}
```

### 8.1 `generateItem`

- Calls Anthropic Claude Sonnet 4 via `@anthropic-ai/sdk`.
- Uses the template's `systemPrompt` and `userPromptFor(difficulty)`.
- Parses the response via `template.schema.safeParse` per `rules/zod-usage.md`.
- Returns `RawItem`.
- Logs `{ tokens_in, tokens_out, model, cost_estimate_usd }` via `logger.info(...)`. Cost is computed from `src/server/generation/pricing.ts`.

### 8.2 `validateItem`

- Calls OpenAI GPT-4o via the `openai` SDK (distinct model from generator).
- Validator prompt asks for a structured `1..5 + reason?` per check (correctness, ambiguity, difficulty match, novelty).
- Parses the response via a Zod schema matching `ValidatorReport` minus `nearestNeighborSimilarity`.
- Computes `embedding` for the item via `embeddings.ts` (`text-embedding-3-small`, single call per item).
- Calls `nearestNeighborInBank(subTypeId, embedding)` from `src/server/generation/similarity.ts`:

```ts
const nearest = await db
    .select({ id: items.id, distance: sql<number>`embedding <=> ${embedding}` })
    .from(items)
    .where(and(eq(items.subTypeId, subTypeId), eq(items.source, "generated")))
    .orderBy(sql`embedding <=> ${embedding}`)
    .limit(1)
const similarity = nearest.length === 0 ? 0 : 1 - nearest[0].distance
```

- `passed = correctness.score >= 4 && ambiguity.score >= 4 && difficultyMatch.score >= 4 && novelty.score >= 4 && nearestNeighborSimilarity < 0.92`.
- Logs the full `ValidatorReport` (all four scores plus reasons) when `passed === false`, not a filtered subset — debugging template regressions depends on the full picture.

### 8.3 `scoreItem`

No per-option distractor scoring — the cost/value of embedding each option is dominated by the validator's ambiguity check. Quality score is a weighted sum of validator confidences:

```ts
score = 0.4 * (correctness.score / 5)
      + 0.3 * (ambiguity.score   / 5)
      + 0.2 * (difficultyMatch.score / 5)
      + 0.1 * (novelty.score / 5)
```

`promptLength = body.text.length` (or `0` if `body.kind` has no text). `optionCount = options.length`. `estimatedDifficulty` is set to the input `difficulty` for v1 (validator's `difficultyMatch.score >= 4` is the gate; further heuristic estimation is unnecessary at v1 scale).

### 8.4 `deployItem`

- Inserts an `items` row with `source: "generated"`, `status: "candidate"`, `embedding` set, `body` from `RawItem.body`.
- Writes `metadata_json` containing `templateId`, `templateVersion`, `generatorModel`, `validatorReport`, `qualityScore`.
- Returns `{ itemId }`.

### 8.5 Workflow orchestration — `src/workflows/item-generation.ts`

Each pipeline stage is a `'use step'` function; the workflow body is `'use workflow'`. Each step retries independently:

```ts
async function generateStep(template: ItemTemplate, difficulty: Difficulty) {
    "use step"
    return generateItem(template, difficulty)
}
async function validateStep(item: RawItem, subTypeId: SubTypeId) {
    "use step"
    return validateItem(item, subTypeId)
}
async function scoreStep(item: RawItem, report: ValidatorReport) {
    "use step"
    return scoreItem(item, report)
}
async function deployStep(input: DeployInput) {
    "use step"
    return deployItem(input)
}
async function itemGenerationWorkflow(input: { subTypeId: SubTypeId; difficulty: Difficulty }): Promise<{ itemId?: string; rejected?: ValidatorReport }> {
    "use workflow"
    const template = templates[input.subTypeId]
    const item = await generateStep(template, input.difficulty)
    const report = await validateStep(item, input.subTypeId)
    if (!report.passed) return { rejected: report }
    const score = await scoreStep(item, report)
    const { itemId } = await deployStep({ item, report, score, templateId: template.subTypeId + ":v" + template.version })
    return { itemId }
}
```

### 8.6 Candidate promotion workflow — `src/workflows/candidate-promotion.ts`

Triggered nightly by the `/api/cron/candidate-promotion` cron at 04:00 UTC. Steps:

1. Find every candidate item with ≥ 20 attempts (`SELECT items.id, items.difficulty, COUNT(*) AS n, AVG(CAST(correct AS int)) AS acc, percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS med_latency FROM items JOIN attempts ON ... WHERE items.status = 'candidate' GROUP BY items.id, items.difficulty HAVING COUNT(*) >= 20`).
2. For each, decide `'promote' | 'retire' | 'hold'` via `src/server/items/promotion.ts:promotionDecision({ difficulty, accuracy, medianLatency })` against the wide v1 bands:

   | difficulty | accuracy band | median latency band |
   |---|---|---|
   | easy   | 0.60–0.98 | latency_threshold * 0.5 .. * 1.5 |
   | medium | 0.40–0.85 | latency_threshold * 0.7 .. * 1.7 |
   | hard   | 0.25–0.70 | latency_threshold * 0.9 .. * 1.9 |
   | brutal | 0.10–0.50 | latency_threshold * 1.0 .. * 2.5 |

   Decision: `accuracy in band AND latency in band → promote`; either out of band → `retire`; `hold` is reserved (the v1 implementation never returns `hold` — bands are intentionally wide so every decision is binary). Latency bands use the sub-type's `latency_threshold_ms` from `sub_types`.

3. For the first **30 days** after the workflow lands, write the decision to `candidate_promotion_log` with `enforced = false` and **do not** mutate `items.status`. After hand-review and the manual switch (a config flag in `src/config/sub-types.ts` or environment variable), the workflow flips to `enforced = true` and updates `items.status` to `'live'` or `'retired'`.

`'retired'` is a soft archive — the row stays; `getNextItem` filters by `status = 'live'`. Wrong retirements are reversible with a single `UPDATE`.

### 8.7 Cost telemetry

Every `generateItem` and `validateItem` call logs through Pino:

```ts
logger.info({
    model: "claude-sonnet-4-20250514",
    tokens_in: usage.input_tokens,
    tokens_out: usage.output_tokens,
    cost_estimate_usd: estimateCost(usage, "claude-sonnet-4-20250514"),
    sub_type_id: input.subTypeId,
    difficulty: input.difficulty
}, "llm call")
```

`src/server/generation/pricing.ts` exports `estimateCost(usage, model)` against per-million-token rates; the file carries a comment "update when provider pricing changes." Pricing is approximate (10% accuracy is fine for operational alerting; provider dashboards remain the source of truth for accounting).

The admin `/generate` page surfaces today's spend, this-week's spend, and per-sub-type cost. Today's rate is compared to the trailing-7-day average for the current hour-of-day; a soft warning surfaces when today's rate exceeds 2× the trailing baseline (no auto-pause).

---

## 9. Adaptive difficulty, mastery, and selection

### 9.1 Adaptive difficulty stepper (drills only)

Pure function over the in-session attempt window, exposed at `src/server/items/selection.ts`:

```ts
type Tier = "easy" | "medium" | "hard" | "brutal"

interface AdaptiveContext {
    last10Correct: boolean[]
    last10LatencyMs: number[]
    currentTier: Tier
    latencyThresholdMs: number
}

function nextDifficultyTier(ctx: AdaptiveContext): Tier {
    if (ctx.last10Correct.length < 10) return ctx.currentTier
    const accuracy = ctx.last10Correct.filter(Boolean).length / ctx.last10Correct.length
    const medianLatency = median(ctx.last10LatencyMs)
    if (accuracy >= 0.9 && medianLatency < ctx.latencyThresholdMs * 0.8) return stepUp(ctx.currentTier)
    if (accuracy <= 0.6 || medianLatency > ctx.latencyThresholdMs * 1.2) return stepDown(ctx.currentTier)
    return ctx.currentTier
}
```

The 0.8× / 1.2× zone widths match the "comfortably under" / "well above" framing from PRD §4.2.

The **initial tier** at session start derives from `mastery_state.current_state` and `mastery_state.was_mastered`:

| current_state | was_mastered = false | was_mastered = true |
|---|---|---|
| `learning` | `easy` | `medium` |
| `fluent`   | `medium` | `medium` |
| `mastered` | `hard`   | `hard` |
| `decayed`  | `medium` | `medium` |

Speed-ramp drills shift the initial tier down by one (`mastered → medium`, `fluent → easy`, `learning → easy`). Brutal drills override to `brutal` regardless. New users (no `mastery_state` row): `medium`.

The recompute window for adaptive uses `served_at_tier`, not `items.difficulty`, so fallback-served items affect adaptive walking based on what the user actually experienced.

### 9.2 Selection strategy and bank-empty fallback

`getNextItem` dispatches over the per-session-type `selectionStrategy`:

| `practice_sessions.type` | `selectionStrategy` |
|---|---|
| `diagnostic` | `'fixed_curve'` (sourced from `src/config/diagnostic-mix.ts`) |
| `drill`      | `'adaptive'` |
| `full_length` | `'fixed_curve'` (sourced from `difficulty-curves.ts`) |
| `simulation`  | `'fixed_curve'` (same curve as full_length) |

> **Code-cleanup landed 2026-05-04** (v1-code-cleanup commit 1). The `review → review_queue` row was dropped from this dispatch table; `'review_queue'` was dropped from `SelectionStrategy`; the `'review'` value stays in the `session_type` enum until commit 4's migration truncates it. Brutal-tier-as-difficulty (item bank, `served_at_tier` enum, `TIER_ORDER`) is **unaffected** — the adaptive walker (§9.1) can still serve Brutal-tier *items* inside a Standard drill via the next-harder-tier step.

Fallback chains within `getNextItem`:

- **Recency floor (soft):** Try eligible items not served in the last 7 days first. If none, fall back to eligible-and-not-served-this-session. If still none, any eligible item ordered by oldest-served-first. This guarantees `getNextItem` always returns something rather than throwing mid-drill.
- **Tier fallback (drill mode):** If the requested tier is exhausted under the recency floor, fall back to the next-easier tier and surface a peripheral note framed as user achievement: "All hard items mastered for this set — continuing at medium." (Speed-ramp + brutal drill modes were cut from v1 2026-05-04 per PRD §4.4; Standard-drill tier-fallback is the only v1 drill-mode path.)

Each `attempts` row records both `served_at_tier` (what the engine intended) and `fallback_from_tier` (nullable; populated only when tier-degraded). `metadata_json.fallback_level` captures which fallback path fired: `'fresh' | 'session-soft' | 'recency-soft' | 'tier-degraded'`.

**Two contract clarifications surfaced during the sub-phase 3 audit (and now load-bearing for any verification scenarios that touch drill selection):**

- **Verification reads REQUESTED tier, not served tier.** The drill engine's tier decisions — including the adaptive walker's step / hold output (§9.1) — are the REQUESTED tier handed to `pickWithFallback`; the bank may serve a different tier when the requested tier is exhausted under the recency-soft / session-soft chain (tier-degraded fallback). Reading `served_at_tier` alone reports what the user EXPERIENCED, not what the engine DECIDED. Verification scenarios that assert "the engine requested tier X" or "the walker held vs stepped" must derive the requested tier from `(fallbackFromTier ?? servedAtTier)` or equivalent (i.e., the requested tier IS the served tier when no fallback fired, otherwise it's whatever `fallbackFromTier` records). (Originally surfaced during the sub-phase 3 audit framed around the legacy `uniform_band` strategy's no-walking contract; reframed at Phase 5 sub-phase 2 round close after `uniform_band` was removed and the adaptive walker (§9.1) became drill's only tier-decision path. The REQUESTED-vs-SERVED tier semantic distinction generalizes cleanly to the walker, which walks the REQUESTED tier.)
- **The recency-excluded set is a SOFT preference, not a hard guarantee.** When the fresh + recency-soft passes both exhaust under the per-session bank size, the session-soft fallback CAN serve a recency-excluded item at the requested tier rather than force the engine to throw `null`. `metadata_json.fallback_level === 'session-soft'` is the observable marker. Verification scenarios that assert "no recency-excluded item is served" must either (a) ensure the bank is large enough that fresh/recency-soft never exhaust, or (b) only assert against the FIRST item served (where session-soft fallback is structurally extreme).

### 9.3 Mastery state (PRD §2 "Mastery state")

Pure function at `src/server/mastery/compute.ts` over the user's last 10 cross-session attempts on a sub-type:

```ts
type MasteryLevel = "learning" | "fluent" | "mastered" | "decayed"
type MasterySource = "diagnostic" | "ongoing"

interface ComputeMasteryInput {
    last10Correct: boolean[]
    last10LatencyMs: number[]
    latencyThresholdMs: number
    previousState: MasteryLevel | undefined
    source: MasterySource
}

function computeMastery(input: ComputeMasteryInput): MasteryLevel {
    const { minAttempts, latencyMultiplier, allowMastered } = sourceParams(input.source)
    const adjustedThreshold = input.latencyThresholdMs * latencyMultiplier
    const n = input.last10Correct.length
    if (n < minAttempts) return "learning"
    const accuracy = input.last10Correct.filter(Boolean).length / n
    const medianLatency = median(input.last10LatencyMs)
    if (accuracy < 0.7) return "learning"
    if (allowMastered && accuracy >= 0.8 && medianLatency <= adjustedThreshold) return "mastered"
    if (accuracy >= 0.8 && medianLatency > adjustedThreshold) return "fluent"
    if (input.previousState === "mastered" && (accuracy < 0.8 || medianLatency > adjustedThreshold)) return "decayed"
    return "learning"
}

function sourceParams(s: MasterySource) {
    if (s === "diagnostic") return { minAttempts: 3, latencyMultiplier: 1.5, allowMastered: false }
    return { minAttempts: 5, latencyMultiplier: 1.0, allowMastered: true }
}
```

Diagnostic-source rules: 3 attempts to leave `learning`, 1.5× latency relaxation, `mastered` is never assigned. Ongoing-source rules: standard 5/1.0/true.

`recomputeForUser(userId, subTypeId, sessionType)` reads the most recent 10 attempts for the (user, sub-type) pair (ordered by `attempts.id DESC`), the previous `mastery_state.current_state`, computes the new value, and upserts. If the new value is `'mastered'` or `'decayed'`, also sets `was_mastered = true` (idempotent).

### 9.4 `masteryRecomputeWorkflow`

Triggered by `endSession` and by the abandon sweep. Steps:

1. Read the session row (gets `type`).
2. Resolve `source: MasterySource` from `type` — `'diagnostic'` if `type === 'diagnostic'`, otherwise `'ongoing'`.
3. Compute the set of distinct sub-types touched in this session: `SELECT DISTINCT i.sub_type_id FROM attempts a JOIN items i ON a.item_id = i.id WHERE a.session_id = $1`. The query is covered by `attempts_session_id_idx`.
4. Sequential loop: for each sub-type, call `recomputeForUser(userId, subTypeId, source)`.

Sequential, not parallelized — partial-failure complexity isn't worth the few hundred milliseconds saved. The workflow runs async after `endSession` returns; the user is not waiting on it.

### 9.5 SM-2 spaced-repetition schedule (PRD §4.3)

> **Cut from v1 2026-05-04** — spaced-repetition queue (PRD §4.3 cut marker). `src/server/review/schedule.ts` was **never shipped** to tree; `nextDueAtMs` and `scheduleReview` do not exist as runnable code. `submitAttempt` does not call `scheduleReview` in v1. Section preserved as historical reference. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.

`src/server/review/schedule.ts`:

```ts
const INTERVAL_LADDER = [1, 3, 7, 21] as const

function nextDueAtMs(input: { lastIntervalDays: number; wasCorrect: boolean; nowMs: number }): { nextDueAtMs: number; nextIntervalDays: number } {
    const currentIdx = INTERVAL_LADDER.indexOf(input.lastIntervalDays)
    const nextIdx = input.wasCorrect ? Math.min(currentIdx + 1, INTERVAL_LADDER.length - 1) : 0
    const nextIntervalDays = INTERVAL_LADDER[nextIdx]
    return { nextDueAtMs: input.nowMs + nextIntervalDays * 86_400_000, nextIntervalDays }
}
```

`scheduleReview` upserts into `review_queue` keyed by `(user_id, item_id)`. Items enter the queue when (a) the answer is wrong, OR (b) the answer is right but median in-session latency on that sub-type exceeds the threshold (PRD §4.3 "got right but slowly").

### 9.6 Near-goal computation (PRD §6.3)

`src/server/mastery/near-goal.ts`:

```ts
function deriveNearGoal(input: {
    masteryStates: Map<SubTypeId, MasteryLevel>
    targetDateMs: number | undefined
    nowMs: number
}): string {
    if (input.targetDateMs === undefined) return "Set a target date to see today's goal."
    const remainingSubTypes = [...input.masteryStates.entries()].filter(([, s]) => s !== "mastered").length
    const daysRemaining = Math.max(1, Math.ceil((input.targetDateMs - input.nowMs) / 86_400_000))
    const sessionsPerDay = Math.ceil((remainingSubTypes * 2) / daysRemaining)
    return `${sessionsPerDay} session${sessionsPerDay === 1 ? "" : "s"} today to stay on track.`
}
```

### 9.7 Triage scoring

`src/server/triage/score.ts` exposes:

- `triageScoreForSession(sessionId)` — returns `{ fired: number; taken: number; ratio: number | null }`. `ratio` is `taken / fired` when `fired >= 3`, otherwise `null` (post-session review renders "small sample — N triage events" instead of a percentage). `fired === 0` is rendered positively: "no triage events: you stayed under 18s on every question."
- `triageRolling30d(userId)` — same shape, rolling over the past 30 days. Used for the Mastery Map's low-contrast triage adherence indicator.

---

## 10. Session flows

> **v1 cut markers landed below 2026-05-04** — NarrowingRamp protocol, strategy-review gate, and review-queue session type are all cut from v1 (PRD §4.3 + §5.3 + §6.5 cut markers). The shape of every v1 session is simplified to: **FocusShell → PostSessionReview** (no NarrowingRamp prefix). The `/review/` route was never shipped (§10.5 marker). The 30-second strategy-review gate after full-length tests is removed (§10.3 marker). See per-section markers below for on-disk-code-surface notes.

The shape of every session is: (NarrowingRamp) → FocusShell → PostSessionReview. Each session type below maps to a route in `src/app/(app)/`.

### 10.1 Diagnostic — `/diagnostic`

PRD §4.1. Fires when `(app)/layout.tsx` finds no completed-and-not-abandoned diagnostic session for the user.

1. `/diagnostic/page.tsx` is the explainer (server component). The user clicks "Start Diagnostic" to enter `/diagnostic/run`.
2. `/diagnostic/run/page.tsx` server component calls `startSession({ userId, type: "diagnostic" })`. Idempotent: returns the existing in-progress sessionId on a fresh-resume; finalizes a stale orphan as `'abandoned'` and inserts fresh otherwise (see §7.1). Skips the NarrowingRamp.
3. `/diagnostic/run/content.tsx` (`"use client"`) renders `<FocusShell>` with:
   - `sessionDurationMs: null` (untimed at the session level — the session timer bar, pace track, and chronometer are hidden).
   - `perQuestionTargetMs: 18000` (the per-question dual-bar timer + 18s triage prompt still fire).
   - `paceTrackVisible: false`.
   - `targetQuestionCount: 50`.
   - The first item is server-rendered into the page response; subsequent items come via `submitAttempt`.
4. The shell drives `submitAttempt` for each of 50 items. `getNextItem` resolves the strategy `"fixed_curve"` and reads from `shuffledDiagnosticOrder(sessionId)` (the per-session deterministic permutation of `src/config/diagnostic-mix.ts`).
5. After the 50th submit returns `{ nextItem: undefined }`, the shell calls `endSession` and `router.push('/post-session/' + sessionId)`.
6. `/post-session/[sessionId]/page.tsx` renders the `<OnboardingTargets>` form. When the diagnostic ran longer than 15 minutes, a derived neutral pacing line appears beneath the form per §6.10 ("Your diagnostic took {N} minutes. The real CCAT is 15 minutes for 50 questions."). No in-flow overtime overlay.
7. After the user saves or skips targets, route back to `/` which now shows the populated Mastery Map with a recommended first session.

A user can re-take the diagnostic from the History tab via "Retake diagnostic." The mastery values overwrite (still capped per the diagnostic source rules — never `mastered`); attempts and sessions history and `was_mastered` flags are preserved.

### 10.2 Drill — `/drill/[subTypeId]`

PRD §4.4.

1. `/drill/[subTypeId]/page.tsx` is a configure page. Validates the route param against `subTypeIds`; on miss → `notFound()`. Pre-checks the sub-type's live-item count via `SELECT count(*) FROM items WHERE sub_type_id = $1 AND status = 'live'`. **If the count is zero, renders `<EmptyBankPane>` instead of the configure form** — heading "No questions available for {sub-type} yet.", body "Try a different sub-type from the Mastery Map.", single "Back to Mastery Map" CTA. The pane uses `data-testid="drill-empty-bank-pane"`. This handling replaces the prior fail-through to `startSession`'s `ErrFirstItemMissing` → Next.js error boundary, which gave users an unhelpful error for what's a known empty-bank case (e.g., `numerical.workrate`, `numerical.speed_distance_time`, or `numerical.lowest_values` — three sub-types added in the taxonomy-restructuring round whose seed banks are empty until the testbank-re-extraction round populates them).
2. With a populated bank, the configure page renders a length picker (5 / 10 / 20, default 10). **Phase 3 wires only `standard` timer mode** — `speed_ramp` and `brutal` ship in Phase 5; the configure page's timer-mode selector is correspondingly absent in Phase 3. The PRD §4.4 timer-mode-selection narrative applies to Phase 5+.
3. Form submit `GET`s to `/drill/[subTypeId]/run?length=N`. The run page calls `startSession({ userId, type: "drill", subTypeId, timerMode: "standard", drillLength })`. **Phase 3 ships no NarrowingRamp** — `startSession` is invoked directly. PRD §5.3 NarrowingRamp ships in Phase 5.
4. `<FocusShell>` runs with `sessionDurationMs = drillLength * 18000`, `perQuestionTargetMs: 18000`, `paceTrackVisible: true`. **Selection strategy is `'uniform_band'`** in Phase 3 (§9.2 deferred-adaptive note); the requested tier is constant across the drill, derived from `mastery_state` per §9.1's initial-tier table.
5. After the last submit, `endSession` then `router.push("/post-session/" + sessionId)` — drills land on the post-session review surface (PRD §6.5 / §10.7). The drill post-session shell renders triage / accuracy / latency / wrong-items / strategy summaries plus a single "Continue" button → `/`. **Code shipped 2026-05-04 (Phase 5 sub-phase 1, commit `c1ee435`).** Pre-shipped phrasing — "drills land on the Mastery Map directly, NOT through `/post-session/[sessionId]`. Drill post-session UI is Phase 5" — preserved as historical reference for the Phase 3 sub-phase 3 default. See `docs/plans/phase5-post-session-review.md` for the round.

**Sign-out button.** The Mastery Map's header (top-right) renders `<SignOutButton>` for users not currently inside a session — see §10.1's flow paragraph. The button is deliberately absent from `/diagnostic/run` and `/drill/[subTypeId]/run` (the focus shell strips chrome to maintain session focus) and from the diagnostic explainer at `/diagnostic` (mid-flow surface). Visual treatment is `text-foreground/70` with a `hover:text-foreground` transition — distinct from the footer's low-contrast `<TriageAdherenceLine>` because sign-out is an ACTION, not a STATUS, and inheriting the periphery treatment would make it harder to find.

The session-timer toggle does NOT live on the configure page — it's a focus-shell periphery control only. (v1 2026-05-04: timer-toggle UX cut entirely, PRD §5.1 + SPEC §6.6 markers. Sentence preserved as historical reference for the configure-page placement decision.)

**Dojo rename — shipped in Phase 5 sub-phase 5 (v1 user-facing).** The drill route's user-facing copy reframes as "dojo mode" per PRD §4.2 — the configure page subhead reads "Standard timing. Pick a session length and enter the dojo.", the submit button reads "Enter dojo", the run skeleton fallback reads "Preparing your dojo session…", and the Mastery Map's primary CTA reads "Enter dojo: {sub-type}". The engine, route paths (`/drill/[subTypeId]`), session-type identifier (`'drill'`), `mastery_state` schema enum values, internal function names, and `data-testid` markers in this section remain unchanged; the rename is a copy-layer reframe scoped to user-visible strings only. See `docs/plans/phase5-dojo-belt-indicator.md` for the round.

### 10.3 Full-length test — `/full-length`

> **Partial cut from v1 2026-05-04.** Full-length test stays in v1 (Phase 5 sub-phase 3). Two prefix/suffix elements cut: NarrowingRamp pre-session (PRD §5.3) and strategy-review gate post-session (PRD §6.5). v1 shape: directly → `<FocusShell>` → post-session review (dismissible immediately). On-disk surface: `src/components/narrowing-ramp/*` and `src/components/post-session/strategy-review-gate.tsx` were **never shipped** to tree.

> **Phase 5 sub-phase 3 (full-length test) shipped 2026-05-07.** This was Phase 5 v1's last unshipped sub-phase; with its close, Phase 5 v1 is feature-complete and the no-deploy-until-feature-complete gate per the master plan §1 lifted. Predecessors all shipped: sub-phase 1 (post-session review surface, 2026-05-04), sub-phase 2 (adaptive walker, 2026-05-06), sub-phase 5 (dojo UI rename + belt indicator, 2026-05-06), sub-phase 4 (click-to-highlight in post-session explanation review, 2026-05-07). The route pair is `/full-length/configure` + `/full-length/run` (NOT `/test/...` — the historical `/test/page.tsx` framing in item 1 below was vestigial pre-sub-phase-3 narrative and is reconciled past-tense in this same close-out). The cross-sub-type-interleaved 50-slot decile generator lives in `src/config/difficulty-curves.ts` alongside the existing `standardCurve` + `roundDecile` (per Q12.1 — colocated rather than housed in a separate `full-length-mix.ts`). Full-length post-session inherits the existing `<PostSessionShell>` non-diagnostic render path with zero new slots and zero new gates — the slot-1 belt indicator stays drill-only, slots 7-8 stay diagnostic-only, slot 9 (Continue CTA) renders. The post-session heading stays "Session complete" (drill-shared); no full-length-specific copy. See `docs/plans/phase5-full-length-test.md` for the round.

PRD §4.5. 50 items, 15 minutes, real-test difficulty mix with randomized interleaving across the 14 v1 sub-types (verbal and numerical, no section breaks).

1. ~~`/test/page.tsx` renders `<NarrowingRamp>`.~~ **NarrowingRamp cut 2026-05-04; route renamed to `/full-length/...` at sub-phase 3 close.** v1 `/full-length/configure/page.tsx` renders a bare primer pane (no length-picker, no sub-type-picker — the test is fixed at 50q × 15min cross-sub-type-interleaved per Q12.6); the configure page's submit navigates to `/full-length/run/page.tsx`, which resolves `auth()` and calls `startSession({ userId, type: "full_length" })` directly. The Mastery Map carries a small low-contrast secondary CTA anchor — `<a href="/full-length/configure">Take a full-length test</a>` (`text-foreground/60 text-sm underline-offset-4 hover:underline`) — placed below the primary `<StartSessionButton>` per PRD §5.2's "small, low-contrast" framing for secondary actions.
2. `startSession({ type: "full_length" })`. `getNextItem` resolves the strategy `'fixed_curve'` and dispatches via `getNextFixedCurve` to `generateFullLengthSlots(sessionId)` from `src/config/difficulty-curves.ts` — a pure function returning a per-session-deterministic 50-tuple `[{subTypeId, difficulty}]` sequence. Algorithm: per decile, `roundDecile(standardCurve[k], 10)` produces integer per-tier counts; for each `(decileIndex, tier)` pair the function picks `n` sub-type-ids from the 14-pool with replacement, deterministically seeded `${sessionId}:d${decileIndex}:${tier}`; within each decile the 10-slot block is Fisher-Yates shuffled, deterministically seeded `${sessionId}:d${decileIndex}:order`. Sub-type weighting is uniform in v1 (Q12.3 — empirical-anchor weighting deferred). Sub-types may repeat across slots; item ids never repeat within a session via the existing `pickWithFallback` `sessionAttemptedIds` exclusion. Pulls from `source: "real"` first; the `source: "generated"` branch is forward-compat narrative — v1 has zero generated items (Phase 4 LLM pipeline is post-Phase-5), so the fallback is theoretical for v1.
3. `<FocusShell>` with `sessionDurationMs: 900000`, `perQuestionTargetMs: 18000`, `paceTrackVisible: true`, `targetQuestionCount: 50`, `strictMode: false`. The session-level auto-end at `state.elapsedSessionMs >= sessionDurationMs` (focus-shell.tsx:376-405) fires `onEndSession()` → `router.push("/post-session/" + sessionId)`. Either path lands the user on the existing post-session shell: 50/50 completion (engine returns `nextItem: undefined`) or 15-minute time-expiry with whatever attempts the user submitted by then.
4. After submit-or-timeout, `endSession`. ~~`/post-session/[sessionId]` renders WITH the 30s strategy-review gate. Dismiss button is disabled until 30s have elapsed AND `<StrategyReviewGate>` reports the strategy was viewed; `dismissPostSession` enforces this server-side via `ErrStrategyReviewRequired`. The strategy is picked deterministically: lowest accuracy → highest median latency → lexicographic `sub_type_id`. Within the chosen sub-type, pick least-recently-viewed strategy via a LEFT JOIN against `strategy_views`.~~ **Cut 2026-05-04.** v1 `/post-session/[sessionId]` is dismissible immediately for `full_length` like every other session type (drill / diagnostic / simulation). The deterministic strategy-pick query, the `<StrategyReviewGate>` component, and the `strategy_views` LEFT JOIN are all unreachable in v1.

### 10.4 Test-day simulation — `/simulation`

PRD §4.6. Identical to full-length except:

- `/simulation/content.tsx` passes `strictMode: true` to `<FocusShell>`, which disables any pause UI and any visible question-skip indicators.
- `selectionStrategy` and difficulty curve are identical to full-length (both reference `standardCurve` in `difficulty-curves.ts` today). Future divergence is a one-line change in that config.
- Available from the Mastery Map but is NOT the default Start CTA.

### 10.5 Spaced-repetition review — `/review`

> **Cut from v1 2026-05-04** — spaced-repetition queue (PRD §4.3 cut marker). The `/review/` route was **never shipped** to tree (`src/app/(app)/review/page.tsx` and `src/app/(app)/review/content.tsx` do not exist). Section preserved as historical reference. v1 has no `'review'`-typed sessions; the Mastery Map's "Review (N due)" secondary action is also cut. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.

PRD §4.3.

1. `/review/page.tsx` queries `review_queue` for due items (`due_at_ms <= Date.now()`). If zero rows, redirects back to `/`.
2. `startSession({ type: "review" })`. `target_question_count = COUNT(due)`. `getNextItem` returns the due items in `due_at_ms` ascending order.
3. `<FocusShell>` with the standard 18s per-question target, `paceTrackVisible: true`.
4. On `submit`, `submitAttempt` calls `scheduleReview` to update `review_queue.due_at_ms` and `interval_days` per the SM-2 ladder.
5. `/post-session/[sessionId]` (no strategy-review gate).

### 10.6 NarrowingRamp orchestration

> **Cut from v1 2026-05-04** — NarrowingRamp pre-session protocol (PRD §5.3 cut marker). All five components (`narrowing-ramp.tsx`, `obstacle-scan.tsx`, `visual-narrowing.tsx`, `session-brief.tsx`, `launch-countdown.tsx`) and the server helper (`src/server/narrowing-ramp/obstacle.ts`) were **never shipped** to tree. The `<NarrowingRamp>` orchestrator, `suggestObstacleOptions(userId)` weakness-based slot computation, and the if-then-plan implementation-intentions templates are all unreachable in v1. v1 sessions launch directly from the Mastery Map start-session button. Section preserved as historical reference. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.

Lives at `src/components/narrowing-ramp/narrowing-ramp.tsx`. Pure client component that runs four sequential timed steps and then calls `onComplete(ifThenPlan: string)`. Steps:

1. `<ObstacleScan>` — 30s. Reads three suggested options from `src/server/narrowing-ramp/obstacle.ts:suggestObstacleOptions(userId)`:
    - Slots 1 and 2: top 2 sub-types by composite weakness score `(1 - rolling_30d_accuracy) * (median_latency / threshold)`. Filter requires ≥ 5 attempts in the rolling 30-day window.
    - Slot 3: reserved for a triage-related obstacle if 30-day triage adherence < 70% or fewer than 3 triage events in the period; otherwise the third weakest sub-type.
    - Each slot maps to an "observable trigger → bounded action" if-then template (Gollwitzer implementation-intentions form). The triage slot's template is the canonical "If I'm 18 seconds into a question without a clear path, I will guess and advance." Sub-type-specific templates are calibrated to that sub-type's failure mode (slow-and-wrong → triage-flavored; fast-and-wrong → recognition-pause: "If I'm about to commit a synonym answer in under 3 seconds, I will read all options first").
    - User can accept the suggested template or write their own.
2. `<VisualNarrowing>` — 15s. CSS-only fixation point + slow-moving target; no interaction.
3. `<SessionBrief>` — 15s. Plain-text preview line.
4. `<LaunchCountdown>` — 15s with a 5-second visible countdown at the end.

### 10.7 Post-session review composition

> **Code shipped 2026-05-04 (Phase 5 sub-phase 1).** Seven commits: `c1ee435` (round setup + shell-shape refactor + drill landing flip), `0ec6f4f` (server-side aggregation queries), `a0aa1fd` (`<TriageScoreLine>` + `<AccuracySummary>`), `c71770c` (`<LatencySummary>`), `8d4195e` (`<WrongItemsBrowser>`), `eaeb882` (`<StrategySurface>` + struggled-sub-type derivation + drill Continue button + full-surface audit + polish), this commit (doc reconciliation + plan close). See `docs/plans/phase5-post-session-review.md` for the round. Pre-shipped phrasing — the `<PostSessionReview>` / `<WrongItemsList>` composer vocabulary that this section previously projected — was a plan-time draft; the shipped composition is described below.

`/post-session/[sessionId]/page.tsx` lives at `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx`. It is a server component (NOT `async`, per `rules/rsc-data-fetching-patterns.md`) that resolves the session row + auth check + four review aggregations + the triage score + the surfaced-strategies query in parallel, and passes the bundle to `<PostSessionContent>` (a `"use client"` component) which consumes the promise via `React.use()` and drills resolved values to `<PostSessionShell>`.

**Page-level data flow.** Four prepared statements colocated in `page.tsx` per `rules/rsc-data-fetching-patterns.md`:

- `getPerSubTypeAccuracy` — `SELECT items.sub_type_id, COUNT(*) FILTER (WHERE attempts.correct), COUNT(*) FROM attempts JOIN items ON attempts.item_id = items.id WHERE session_id = $1 GROUP BY items.sub_type_id`. Returns `{ subTypeId, correct, total }` rows.
- `getPerSubTypeLatency` — same JOIN; aggregates `percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)` per sub-type. Returns `{ subTypeId, medianLatencyMs }` rows. **`percentile_cont`, NOT `percentile_disc` or `AVG`** — `_disc` returns an actually-observed value (wrong shape for "median"); `AVG` is the mean (wrong stat).
- `getWrongItemsForSession` — chronological order via `ORDER BY attempts.id` (UUIDv7 ⇒ time-sorted). Returns `{ attemptId, itemId, subTypeId, body, optionsJson, correctAnswer, selectedAnswer?, explanation?, structuredExplanation? }`. The §15.2-amendment seam shipped end-to-end at Phase 5 sub-phase 4 — the `metadata_json -> 'structuredExplanation'` projection landed at commit 2 (typed `sql<unknown>` at the page-query boundary; null-from-absent-key normalizes to `undefined` at the row boundary per `rules/no-null-undefined-union.md`); the `<WrongItemCard>` consumer wiring landed at commit 4. See `docs/plans/phase5-click-to-highlight.md` for the round.
- `getStrategiesForSubTypes` — `WHERE sub_type_id = ANY($1::varchar[])` parameter shape. Empty input is short-circuited at the call site (no SQL `IN ()` syntax error). Drizzle's `inArray` + `sql.placeholder` combination renders as invalid `IN $1` for prepared statements — this query uses the explicit `= ANY(...)::varchar[]` shape to compile cleanly. See §6.14.18.

**Struggled-sub-type derivation.** Pure helpers in `src/server/post-session/strategy-selection.ts`:

- `deriveStruggledSubTypes(accuracy, latency)`: a sub-type is **struggled** in this session iff EITHER accuracy < 70% (matches `computeMastery`'s SPEC §9.3 learning floor) OR median latency > the sub-type's threshold from `src/config/sub-types.ts`. The OR is intentional — catches both fast-wrong and slow-but-right.
- `selectStrategiesForStruggledSubTypes(accuracy, latency, allStrategies)`: per struggled sub-type, picks ONE strategy via the kind-preference table:

  | Failure mode    | Definition                              | Preferred kind  | Fallback     |
  | --------------- | --------------------------------------- | --------------- | ------------ |
  | fast-wrong      | accuracy < 70% AND median ≤ threshold   | `'trap'`        | `'technique'`|
  | slow-wrong      | accuracy < 70% AND median > threshold   | `'recognition'` | `'technique'`|
  | slow-but-right  | accuracy ≥ 70% AND median > threshold   | `'recognition'` | `'technique'`|

  If neither preferred nor fallback exists, takes any strategy that exists. If zero strategies exist for the sub-type, no row renders for it (struggled-but-unsurfaceable).

  These helpers live under `src/server/post-session/` rather than alongside `<StrategySurface>` because Next.js disallows server components from importing functions exported by `"use client"` modules; the page (server component) needs to invoke them. Plan §9 originally said "numeric anchors live inside `<StrategySurface>`"; the implementation revision is captured in §6.14.18.

**Render composition.** `<PostSessionShell>` (`src/components/post-session/post-session-shell.tsx`) is a session-type-aware dispatcher with a locked nine-slot ordering (top to bottom):

1. Heading + brief one-line summary ("Diagnostic complete" / "Session complete").
2. `<TriageScoreLine>` — single line; PRD §6.5; SPEC §9.7 small-sample / N/A branches.
3. `<AccuracySummary>` — per-sub-type ✓/✗ counts, NO percentages (PRD §6.5).
4. `<LatencySummary>` — per-sub-type median with horizontal SVG track + threshold tick + above/below-threshold marker color.
5. `<WrongItemsBrowser>` — sub-type grouped (verbal-first, alphabetical within section), chronological within group via `attempts.id` ASC. Display letters A-E computed via `String.fromCharCode(0x41 + index)` at render time per SPEC §3.3.2 — letters are NOT stored. **Click-to-highlight extension — shipped in Phase 5 sub-phase 4 (2026-05-07).** The per-card explanation render dispatches three ways: (a) when `structuredExplanation` is present (389 / 439 live items), `<StructuredExplanation>` (`src/components/post-session/structured-explanation.tsx`) renders recognition / elimination / [optional] tie-breaker parts as up to three editorial paragraphs, with elimination + tie-breaker as `<button type="button" aria-pressed>`; (b) when `structuredExplanation` is absent but `items.explanation` is present (the 50 NULL-`source_folder` seed items), the card falls back silently to a prose `<p>`; (c) when both are absent, the card renders nothing for that slot. Clicking elimination toggles `line-through` + `text-foreground/60` on the options whose opaque ids are in `referencedOptions`; clicking tie-breaker toggles `bg-foreground/5 ring-1 ring-foreground/15` on the options it considers. Recognition is uniformly non-interactive regardless of `referencedOptions` length per the round plan §3.1 + §11.9. State is per-card local + ephemeral — each `<WrongItemCard>` holds two `useState<ReadonlyArray<string>>` slots (`struck`, `highlighted`) and emits via callback props passed into `<StructuredExplanation>`; navigating away resets. See `docs/plans/phase5-click-to-highlight.md` for the round.
6. `<StrategySurface>` — one strategy per struggled sub-type, sub-type displayName prefix + strategy text, verbal-first then alphabetical within section. Empty state ("No sub-types flagged this session — keep going.") when struggled set is empty.
7. `<OnboardingTargets>` — **diagnostic-only.** Existing Phase 3 component, unchanged. Primary button "Save and continue"; smaller "Skip for now" link. Both flows trigger `saveOnboardingTargets` (§7.6) and `router.push("/")`.
8. Pacing-line sentence — **diagnostic-only**, conditional on session duration > 15 minutes. Existing Phase 3 derivation (§6.10).
9. Continue CTA — **drill / full_length / simulation only.** Single `<Button>` → `router.push("/")`. Diagnostic mode does NOT render this button — `<OnboardingTargets>`'s Save / Skip handle nav.

Sort across sections 3 / 4 / 5 / 6 is identical (verbal-first, alphabetical by `displayName` within section), so the four review sections align row-for-row when stacked. Sub-type displayNames come from `src/config/sub-types.ts`.

The dismiss path is implicit: the post-session page does NOT render a separate "Dismiss" or "Done" button. Diagnostic mode dismisses via `<OnboardingTargets>`'s Save-and-continue / Skip-for-now (both call `saveOnboardingTargets` then `router.push("/")`). Drill / full-length / simulation dismiss via the Continue button → `router.push("/")`. There is no `dismissPostSession` server action; the `dismissPostSession` shape projected in §7.5 was never shipped.

**Cut markers preserved (PRD §6.5 cut from v1 2026-05-04).**

- ~~For full_length only: `<StrategyReviewGate>` — 30-second timer plus a single rendered strategy paired with the user's worst sub-type from this session. Dismiss button is disabled until the gate elapses and the strategy is marked viewed; the gate posts a `strategy_views` row when the strategy first appears.~~ **Cut from v1 2026-05-04** (PRD §6.5 cut marker). `<StrategyReviewGate>` was **never shipped** to tree. v1 full_length post-session is dismissible immediately like every other session type.

For diagnostic ~~and drill and review~~ **and drill** (review session type also cut, §10.5 marker), the dismiss path is enabled immediately. **In v1 (2026-05-04), this applies to all session types** including full_length and simulation.

**Full-length post-session render — verified end-to-end at Phase 5 sub-phase 3 (2026-05-07).** Full-length sessions land on this same `/post-session/[sessionId]` surface via the existing session-type-aware dispatch, with no full-length-specific copy and no full-length-specific gate. The heading branch routes `'full_length'` through "Session complete" (drill-shared); slot 1's belt indicator renders null (drill-only `props.sessionType === "drill"` guard); slots 7-8's `<OnboardingTargets>` + pacing-line render null (diagnostic-only `isDiagnostic` guards); slot 9's Continue CTA renders. Slots 2-6 (`<TriageScoreLine>`, `<AccuracySummary>`, `<LatencySummary>`, `<WrongItemsBrowser>`, `<StrategySurface>`) are session-type-agnostic and render unchanged — full-length wrong items inherit sub-phase 4's click-to-highlight automatically. Zero edits to `<PostSessionShell>` were required at sub-phase 3 close per Q12.8; the slot-locking discipline established at sub-phase 1 + sub-phase 5 held bit-for-bit (`post-session-shell.tsx` is unchanged since `c32a7fb`). See `docs/plans/phase5-full-length-test.md` for the round.

**Belt-indicator extension — shipped in Phase 5 sub-phase 5.** Slot 1 (Heading + brief one-line summary) carries a belt-indicator render for `'drill'`-typed sessions only. The indicator surfaces the tier the adaptive walker most recently REQUESTED at session end (read as `(fallback_from_tier ?? served_at_tier)` of the most-recent attempt per §9.2), mapped to a colored belt with text-label parity for accessibility — white = easy, blue = medium, brown = hard, black = brutal. Pre-floor (< 10 attempts in the walker's last-10-attempt running window per PRD §4.2 — the `ADAPTIVE_FLOOR_ATTEMPTS` constant exported from `src/server/items/selection.ts`) the indicator renders the current tier with a "(calibrating)" suffix because the walker has not yet stepped. Drill sessions with zero attempts render the heading slot unchanged (the indicator is null per the page-level query's defensive guard). Diagnostic / full_length / simulation post-session shells also render the heading slot unchanged; the belt indicator is drill-mode only. The data contract is the page-level `getEndSessionTierForDrill(sessionId)` query in `src/server/post-session/end-session-tier.ts` (single round-trip; covered by `attempts_session_id_idx`); the walker's `nextDifficultyTier` is unchanged. The component lives at `src/components/post-session/belt-indicator.tsx` with two belt-namespaced design tokens (`--belt-blue`, `--belt-brown`) registered in `@theme inline`; white and black reuse `--card` and `--foreground` respectively. The other eight slots in the locked ordering (TriageScoreLine through Continue CTA) are unchanged. See `docs/plans/phase5-dojo-belt-indicator.md` for the round.

### 10.8 Heartbeats and abandons

The FocusShell mounts a `<Heartbeat>` client component that posts to `/api/sessions/[sessionId]/heartbeat` every 30 seconds via `navigator.sendBeacon`, and once on `pagehide`. The handler updates `last_heartbeat_ms`. The `abandon-sweep` cron (every minute) finalizes sessions older than 120 seconds without an `ended_at_ms`, setting `ended_at_ms = last_heartbeat_ms + 30000`, `completion_reason = 'abandoned'`, then enqueues `masteryRecomputeWorkflow(sessionId)`.

For partially-completed diagnostics that are abandoned, the next visit triggers a fresh `/diagnostic` (the gate checks `completion_reason != 'abandoned'`).

---

## 11. Coding conventions checklist

This list is the union of `rules/*.md` and `gritql/*.grit` actually present in this repo. Every checkbox is enforced by either Biome, a GritQL plugin from `biome.json:5-18`, or the `super-lint.ts` pipeline referenced in `package.json:14`.

- [ ] **No `try`/`catch`/`finally`.** Use `errors.try` (async) or `errors.trySync` (sync), with `if (result.error)` on the next line. (`rules/no-try.md`, `gritql/no-try.grit`)
- [ ] **No bare `errors.try` / `errors.trySync`.** Always assign the result; never `void` or `return` it directly. (`gritql/no-try.grit` Cases 4–6)
- [ ] **No `new Error()`.** Use `errors.new()`. (`rules/no-new-error.md`, `gritql/no-new-error.grit`)
- [ ] **No `extends Error`.** Use `errors.new()` sentinels. (`rules/no-extends-error.md`, `gritql/no-extends-error.grit`)
- [ ] **No `instanceof Error`.** Use `errors.is(err, ErrSentinel)`. (`rules/no-instanceof-error.md`, `gritql/no-instanceof-error.grit`)
- [ ] **Every `throw` is preceded by a `logger.{error,warn,info,debug}` call on the immediately preceding line.** (`rules/require-logger-before-throw.md`, `gritql/require-logger-before-throw.grit`)
- [ ] **No `console.*`.** Use `logger` from `@/logger`. (`biome/base.json:24-27` `suspicious/noConsole: error`; `rules/structured-logging.md`)
- [ ] **Logger is object-first, message-string-second.** Message must be a string literal, not a template literal. (`rules/logger-structured-args.md`)
- [ ] **No relative imports.** Use `@/...` aliases everywhere, including same-directory siblings. (`rules/no-relative-imports.md`, `gritql/no-relative-imports.grit`)
- [ ] **No `as` type assertions.** Allowed only for `as const` and the DOM/event types whitelisted in `gritql/no-as-type-assertion.grit`. (`rules/no-as-type-assertion.md`)
- [ ] **No `??` (nullish coalescing).** Fix the source of optionality. (`rules/no-nullish-coalescing.md`, `gritql/no-nullish-coalescing.grit`)
- [ ] **No `||` for fallbacks.** Allowed only as a boolean condition in `if`/`while`/ternary tests. (`rules/no-logical-or-fallback.md`)
- [ ] **No `T | null | undefined` at function boundaries.** Prefer `undefined` (optionals); normalize null at the boundary with `z.preprocess`. (`rules/no-null-undefined-union.md`)
- [ ] **No inline ternaries.** Allowed only when directly assigned to `const`/`let` or in a `return`. (`rules/no-inline-ternary.md`, `gritql/no-inline-ternary.grit`)
- [ ] **No inline `style={{...}}`.** Tailwind classes only; CSS variables via `[--var:value]` syntax. (`rules/no-inline-style.md`, `gritql/no-inline-style.grit`)
- [ ] **No IIFEs.** Define a named function and call it. (`rules/no-iife.md`, `gritql/no-iife.grit`)
- [ ] **No object modules.** Export functions individually; module-level state, not classes. (`rules/no-object-module.md`)
- [ ] **No inline `export`.** Declare without `export`, then `export { ... }` at the bottom. (`rules/no-inline-export.md`)
- [ ] **No arrow functions.** Use `function` declarations. Short inline callbacks tolerated only for trivial array methods. (`rules/no-arrow-functions.md`)
- [ ] **No barrel files.** (`biome/base.json:105` `performance/noBarrelFile: error`) — `src/db/schema.ts` is a permitted barrel because it is the schema-typing collation point used by the Drizzle adapter.
- [ ] **No non-null assertions (`!`).** Validate and throw instead. (`biome/base.json:71-74` `style/noNonNullAssertion: error`)
- [ ] **No `process.env`.** Use `env` from `@/env`. (`biome/base.json:70` `style/noProcessEnv: error`)
- [ ] **No `forEach`.** Use `for...of`. (`biome/base.json:34-36` `complexity/noForEach: error`)
- [ ] **No `<img>`.** Use Next `<Image>`. (`biome/base.json:106` `performance/noImgElement: error`) v1 has no item images so the application surface today rarely needs `<Image>` either; the rule is documented for completeness.
- [ ] **Unused variables/imports/parameters are errors.** (`biome/base.json:53-56`)
- [ ] **No `timestamp` / `date` / `time` / `interval` columns.** Use `bigint` `_ms`. (`rules/no-timestamp-columns.md`, enforced by `scripts/dev/lint/rules/no-timestamp-columns.ts`)
- [ ] **No `uuid().defaultRandom()`.** Use `default(sql\`uuidv7()\`)`. (`rules/no-uuid-default-random.md`, enforced by `scripts/dev/lint/rules/no-uuid-default-random.ts`)
- [ ] **One table per file** under `src/db/schemas/<domain>/<table>.ts`. (`rules/no-timestamp-columns.md`)
- [ ] **No implicit `select(*)` / `returning(*)`.** Always pass a column object. (`rules/no-implicit-select-all.md`, `gritql/no-implicit-select-all.grit`)
- [ ] **Prepared statements colocated with the page that uses them**, with type derived via `Awaited<ReturnType<typeof query.execute>>[number]`. (`rules/rsc-data-fetching-patterns.md`)
- [ ] **Server components never `async`.** Initiate fetches, pass promises, consume with `React.use()` in client components. (`rules/rsc-data-fetching-patterns.md`)
- [ ] **Mutations are server actions** with `revalidatePath` after writes ~~— except `persistTimerPrefs` (§7.8), which is a deliberate exception~~. (v1 2026-05-04: `persistTimerPrefs` cut, §7.8 marker; the "deliberate exception" carve-out is unreachable in v1. The general rule stands without the exception.)
- [ ] **Zod uses `safeParse`, never `parse`.** (`rules/zod-usage.md`)

---

## 12. Build order

Six phases over a 2-week window. Each phase lists the files to create or modify in order. Cuts (per PRD §9): test-day simulation, history detail views, NarrowingRamp's visual-narrowing step. The mastery model, generation pipeline, focus shell, and Mastery Map are non-negotiable.

### Phase 1 — Foundations (week 1, days 1–3)

- `src/env.ts` (MOD: add AUTH_*, *_API_KEY, CRON_SECRET)
- `src/auth.ts` (NEW), `src/auth.config.ts` (NEW), `src/auth/drizzle-adapter-shim.ts` (NEW), `src/auth/drizzle-adapter-shim.test.ts` (NEW)
- `src/middleware.ts` (NEW)
- `src/db/lib/pgvector.ts` (NEW), confirm `src/db/lib/uuid-time.ts` exports `uuidv7LowerBound` (add if missing)
- `src/db/programs/extensions/pgvector.ts` (NEW); add to `src/db/programs/index.ts:14`
- `src/db/schemas/auth/{users,accounts,auth_sessions,verification_tokens}.ts` (NEW)
- `src/db/schemas/catalog/{sub-types,strategies,items,candidate_promotion_log}.ts` (NEW)
- `src/db/schemas/practice/{sessions,attempts,mastery_state,strategy_views}.ts` (NEW)
- `src/db/schemas/review/review_queue.ts` (NEW)
- `src/db/schema.ts` (MOD: extend the barrel)
- `src/config/{sub-types,strategies,admins,item-templates,diagnostic-mix,difficulty-curves}.ts` (NEW)
- `src/server/auth/admin-gate.ts` (NEW), `src/server/auth/account-deletion.ts` (NEW)
- `src/app/api/auth/[...nextauth]/route.ts` (NEW), `src/app/login/page.tsx` (NEW), `src/app/api/health/route.ts` (NEW)
- Manually run `bun db:generate` then `bun db:push` per `README.md` §"Human-led Database Migrations". Seed `sub_types` and `strategies` from the config files via `src/db/scripts/seed-sub-types.ts` (NEW) and `src/db/scripts/seed-strategies.ts` (NEW).

### Phase 2 — Real-item path (week 1, days 3–5)

- `src/server/items/{body-schema,ingest,tagger,recency,promotion}.ts` (NEW)
- `src/components/item/{item-prompt,option-button}.tsx` (NEW) and `src/components/item/body-renderers/text.tsx` (NEW; the only v1 body variant)
- `src/app/(admin)/layout.tsx` (NEW), `src/app/(admin)/ingest/{page,actions}.tsx,ts` (NEW)
- `src/app/api/admin/ingest-item/route.ts` (NEW)
- `src/server/generation/embeddings.ts` (NEW)
- `src/workflows/embedding-backfill.ts` (NEW)
- `src/server/items/option-id.ts` (NEW) — opaque base32 id generator (`generateOptionId`, `assignOptionIds`).
- `src/db/seeds/items/{index,types,data/*}.ts` (NEW) — declarative seed dataset; data files emit `correctAnswerIndex: number` rather than letter ids; seed loader resolves index → opaque id at ingest time.
- `scripts/migrate-opaque-option-ids.ts` (NEW) — one-shot migration that rewrote letter-shaped ids to opaque base32 ids on the existing dataset.
- `scripts/import-questions.ts`, `scripts/generate-explanations.ts`, `scripts/regenerate-explanations.ts`, `scripts/_lib/{anthropic,extract,solve-verify,explain,sample,logs}.ts` (NEW) — three-stage OCR import pipeline.
- `scripts/backfill-missing-embeddings.ts` (NEW) — populates `items.embedding` for rows inserted via the seed loader (which deliberately skips the workflow trigger).
- Hand-seed 70 real items (5 per sub-type × 14 v1 sub-types) via the form. Then OCR-import additional items from CCAT practice-test screenshots via the four-pass pipeline at `scripts/import-questions.ts` + `scripts/generate-explanations.ts`. Validates the (single-variant) body discriminator end-to-end.
- The opaque-option-id schema (§3.3.2) and the structured-explanation contract (§3.3.3) both shipped within Phase 2, in lockstep with the OCR pipeline. See `docs/plans/ocr-import-screenshots.md` and `docs/plans/opaque-option-ids-and-pipeline-split.md` for the design rationale and the migration history.

### Phase 3 — Practice surface (week 1, days 5–7) — **COMPLETE 2026-05-04**

Sub-phases 1 (diagnostic flow), 2 (Mastery Map + post-diagnostic empty-state pane), 3 (drill mode + sign-out), and 4 (heartbeats + cron-runner wiring + ownership-scope security fix) all shipped. The user-facing happy path runs end-to-end against real items. Production-deploy coupling is now unblocked; deploy-and-dogfood is the next move before Phase 5 (full-length tests + spaced-repetition + post-session review with click-to-highlight).

- `src/components/focus-shell/{focus-shell,session-timer-bar,pace-track,question-timer-bar,triage-prompt,inter-question-card,heartbeat,shell-reducer}.{tsx,ts}` (NEW)
- `src/server/sessions/{queries,start,submit,heartbeat,end}.ts` (NEW)
- `src/server/items/{queries,selection}.ts` (NEW)
- `src/server/triage/score.ts` (NEW)
- `src/server/mastery/{compute,recompute,near-goal}.ts` (NEW)
- `src/workflows/{mastery-recompute,abandon-sweep}.ts` (NEW)
- `src/app/api/sessions/[sessionId]/heartbeat/route.ts` (NEW)
- `src/app/api/cron/abandon-sweep/route.ts` (NEW), `vercel.json` (NEW)
- `src/components/mastery-map/{mastery-map,mastery-icon,near-goal-line,start-session-button}.tsx` (NEW)
- `src/components/post-session/{post-session-review,wrong-items-list,onboarding-targets}.tsx` (NEW)
- `src/app/(app)/{layout,page,actions}.{tsx,ts}` (NEW)
- `src/app/(app)/diagnostic/{page,content}.tsx` (NEW)
- `src/app/(app)/post-session/[sessionId]/{page,actions}.{tsx,ts}` (NEW)
- `src/app/(app)/drill/[subTypeId]/{page,content}.tsx` (NEW) — standard-only timer mode in this phase
- The whole user-facing happy path runs end-to-end against real items.

### Phase 4 — Generation pipeline (week 2, days 1–3)

- Vercel + RDS wired (preview deployment first; promotion to production happens at launch).
- `src/server/generation/{pipeline,generator,validator,similarity,pricing}.ts` (NEW)
- `src/workflows/item-generation.ts` (NEW)
- `src/app/(admin)/generate/{page,actions}.{tsx,ts}` (NEW), `src/app/api/admin/generate-items/route.ts` (NEW)
- First end-to-end candidate items land. Cost telemetry surfaces in the admin dashboard.

### Phase 5 — Engine completeness (week 2, days 3–5)

> **v1 scope tightened 2026-05-04** — five surfaces in this phase cut from v1 (PRD §4.3 + §4.4 + §5.3 + §5.1 + §6.5 cut markers). Authoritative current Phase-5 scope lives in `docs/plans/phase5-master-plan.md` (five sub-phases: post-session review surface, adaptive walker, full-length test no gate, click-to-highlight, dojo UI rename + belt indicator). The list below is preserved as historical-spec; treat strikethroughs + cut markers as the v1 status. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.

- `src/server/items/selection.ts` (MOD: add `nextDifficultyTier` and the fallback chains)
- ~~`src/server/review/{queries,schedule}.ts` (NEW)~~ **Cut from v1 2026-05-04** — SR queue (PRD §4.3); never shipped to tree.
- ~~`src/workflows/review-queue-refresh.ts` (NEW)~~ **Cut from v1 2026-05-04** — SR queue; never shipped to tree.
- ~~`src/app/(app)/review/{page,content}.tsx` (NEW)~~ **Cut from v1 2026-05-04** — SR queue route; never shipped to tree.
- `src/components/focus-shell/triage-prompt.tsx` (MOD: full triage logic, persistent rendering)
- ~~`src/components/focus-shell/question-timer-bar.tsx` (MOD: toggle + persistence)~~ **Cut from v1 2026-05-04** — timer-toggle UX (PRD §5.1). Question-timer bar shipped during Phase 3; the toggle + persistence MOD was cut. Unused toggle code paths dropped in v1-code-cleanup commit 2 (`a32131a`).
- ~~`src/components/narrowing-ramp/{narrowing-ramp,obstacle-scan,visual-narrowing,session-brief,launch-countdown}.tsx` (NEW)~~ **Cut from v1 2026-05-04** — NarrowingRamp (PRD §5.3); never shipped to tree.
- ~~`src/server/narrowing-ramp/obstacle.ts` (NEW)~~ **Cut from v1 2026-05-04** — NarrowingRamp helper; never shipped to tree.
- ~~`src/components/post-session/strategy-review-gate.tsx` (NEW)~~ **Cut from v1 2026-05-04** — strategy gate (PRD §6.5); never shipped to tree.
- `src/app/(app)/test/{page,content}.tsx` (NEW) — full-length practice test ~~, gated on the new strategy-review gate~~ (gate cut 2026-05-04; full-length test stays in scope as Phase 5 sub-phase 3, no gate).
- ~~Speed-ramp and brutal drill modes wired through the configure page.~~ **Cut from v1 2026-05-04** — speed-ramp + brutal drill modes (PRD §4.4). v1 ships Standard drill mode only.

### Phase 6 — Polish & cuts (week 2, days 5–7)

- `src/app/(app)/simulation/{page,content}.tsx` (NEW)
- `src/app/(app)/history/page.tsx` (NEW), `src/app/(app)/history/[sessionId]/page.tsx` (NEW)
- `src/app/(app)/settings/delete-account/{page,actions}.{tsx,ts}` (NEW)
- `src/workflows/candidate-promotion.ts` (NEW; ships in shadow mode), `src/app/api/cron/candidate-promotion/route.ts` (NEW)
- Surface strategies in `<PostSessionReview>` (already wired in phase 5).

PRD §9 cuts apply if behind: simulation, history detail views. The mastery model, generation pipeline, focus shell, and Mastery Map are non-negotiable. (NarrowingRamp's visual-narrowing step was previously listed here as a cut candidate — moot now since the entire NarrowingRamp protocol is cut from v1 2026-05-04, see PRD §5.3 + SPEC §10.6 markers.)
