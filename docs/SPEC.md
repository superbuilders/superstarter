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
- **Text-only v1 scope.** v1 supports only the 11 text-based sub-types (5 verbal + 6 numerical). The abstract sub-types, the attention-to-detail sub-types, and `numerical.data_interpretation` are deferred (PRD §2, §10). Image storage, signed URLs, and any image-rendering pipeline that supported visual sub-types are out of scope for v1; the schema is shaped to make their later addition additive (see §3.3.1).

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
│   │   ├── mastery-map.tsx                                    # NEW: 11-icon grid + near-goal line + start CTA + low-contrast triage adherence
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
│           ├── page.tsx                                       # NEW: 11 × 4 grid (live / candidate / target) + per-cell top-up button + cost dashboard
│           └── actions.ts                                     # NEW: triggerGenerationAction server action
│
└── lib/
    └── utils.ts                                               # already exists (cn helper)
```

> **File-map paths cut from v1 2026-05-04.** The following entries above are specced-but-never-shipped under v1 scope (PRD §4.3 + §4.4 + §5.3 + §6.5 cut markers). On-disk-code-surface notes per entry — anyone wondering "is this path real?" should consult this list before grep'ing for it:
>
> - `src/db/schemas/practice/strategy_views.ts` (line 73 above) — **never shipped** in tree. 30-second strategy-review gate cut (PRD §6.5). The schema barrel reference at §3.6 is vestigial-in-spec.
> - `src/db/schemas/review/review_queue.ts` (line 75; actual on-disk path is `review-queue.ts`) — **shipped during Phase 3, stays vestigial in tree.** Spaced-repetition queue cut (PRD §4.3). v1 never inserts rows. Drop in v1-code-cleanup.
> - `src/server/review/queries.ts` + `src/server/review/schedule.ts` (lines 100–101 / §9.5) — **never shipped** in tree. Spaced-repetition cut.
> - `src/server/narrowing-ramp/obstacle.ts` (line 110) — **never shipped** in tree. NarrowingRamp cut (PRD §5.3).
> - `src/workflows/review-queue-refresh.ts` (line 117) — **never shipped** in tree. SR queue cut. `endSession` does not trigger this workflow in v1 (§7.3 marker).
> - `src/components/narrowing-ramp/{narrowing-ramp,obstacle-scan,visual-narrowing,session-brief,launch-countdown}.tsx` (lines 142–148) — **never shipped** in tree. NarrowingRamp cut.
> - `src/components/post-session/strategy-review-gate.tsx` (line 150) — **never shipped** in tree. Strategy-gate cut (PRD §6.5).
> - `src/app/(app)/review/{page,content}.tsx` (lines 190–192) — **never shipped** in tree. SR queue cut.
>
> Schema files that **stay vestigial in tree** (column/enum/table preserved, never written by v1): `src/db/schemas/auth/users.ts` (`timer_prefs_json` column), `src/db/schemas/practice/practice-sessions.ts` (`timer_mode` enum, `narrowing_ramp_completed`, `if_then_plan`, `strategy_review_viewed` columns), `src/db/schemas/review/review-queue.ts` (entire table). All of the above queue for drop in the v1-code-cleanup follow-up round. The `# NEW: ...` comment annotations above are preserved as the original spec intent; treat the cut markers as the authoritative v1 status.

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
| `timer_prefs_json` | `jsonb` | `notNull`, `default '{}'` |
| `created_at_ms` | `bigint` | `notNull`, `default extract(epoch from now()) * 1000` |

Indexes: `email_idx` (unique).

> **Cut from v1 2026-05-04** — timer-toggle UX (PRD §5.1 cut marker). The `timer_prefs_json` column **stays vestigial in tree** at `src/db/schemas/auth/users.ts`; no v1 reader writes or reads it. v1 timer visibility is static-per-session-type (session timer ON for non-diagnostic, question timer OFF everywhere; underlying 18s tracking still drives the triage prompt). Drop the column in the v1-code-cleanup follow-up round. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.

`timer_prefs_json` shape: `{ sessionTimerVisible: boolean; questionTimerVisible: boolean }`. Empty `{}` resolves to `{ sessionTimerVisible: true, questionTimerVisible: false }` at session start.

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
| `id` | `varchar(64)` | PK (e.g. `"verbal.synonyms"`) |
| `name` | `varchar(128)` | `notNull` |
| `section` | `pgEnum('sub_type_section', ['verbal','numerical'])` | `notNull` (extending the enum is the additive migration when visual sections are added in a future version) |
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

Indexes:
- `items_sub_type_status_idx` on `(sub_type_id, status)` — primary lookup path for `getNextItem`.
- `items_sub_type_difficulty_status_idx` on `(sub_type_id, difficulty, status)` — used by selection by tier.
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
    importSource?: 'hand-seed' | 'ocr-visible' | 'ocr-solved' | 'generated'
    originalExplanation?: string  // verbatim text from a source screenshot, when extracted by the OCR pipeline
    sourceImageHash?: string       // SHA-256 of the source PNG; OCR-imported items only

    // Structured form of the user-facing explanation. See §3.3.3.
    structuredExplanation?: { parts: StructuredExplanationPart[] }
}
```

##### 3.3.1 `body` discriminator schema

v1 is text-only: the body has exactly one variant, but it is still expressed as a Zod `discriminatedUnion("kind", [...])` in `src/server/items/body-schema.ts` so that future visual variants are an additive change rather than a schema rewrite.

```ts
const BodyText = z.object({
    kind: z.literal("text"),
    text: z.string()
})

const ItemBody = z.discriminatedUnion("kind", [BodyText])
```

The renderer dispatches via `switch` over `body.kind` with TypeScript exhaustiveness checking; today it has one case. Generation pipeline output and admin ingest both validate via `ItemBody.safeParse` per `rules/zod-usage.md`.

Image storage is deferred to a future version when visual sub-types are added; the items table schema does not currently include image references, and the body schema does not carry image keys. When that future version lands, additional variants (text_with_image, chart, grid, image_pair, image_pair_grid, column_matching) will be added to the union, and the renderer's switch will gain corresponding cases.

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

The structured form unlocks future click-to-highlight in post-session review (Phase 5/6): tapping a part's prose highlights the option ids it references via `referencedOptions`, with the renderer mapping opaque ids to current display positions. The data model is ready; the UI surface ships in a later phase. See `docs/plans/opaque-option-ids-and-pipeline-split.md` and `docs/plans/ocr-import-screenshots.md` for the contract design.

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

> **Partial cut from v1 2026-05-04.** Three columns + one table specced below stay vestigial in tree (or are never created) per PRD §4.4 + §5.3 + §6.5 cut markers. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04. Cuts within this subsection:
> - `practice_sessions.timer_mode` enum: only the `'standard'` value is written in v1. The `pgEnum('timer_mode', ['standard','speed_ramp','brutal'])` declaration **stays vestigial in tree** at `src/db/schemas/practice/practice-sessions.ts` (the enum definition is preserved; v1 just never writes `'speed_ramp'` or `'brutal'`). Drop the unused enum values in the v1-code-cleanup follow-up round. Note: this `timer_mode` enum is the **drill-mode** dimension and is unrelated to the **`item_difficulty`** enum (`['easy','medium','hard','brutal']`) on `attempts.served_at_tier` / `items.difficulty` — the **Brutal difficulty tier stays in v1** (item bank, fallback chains, `TIER_ORDER` references, adaptive walker can serve Brutal-tier items inside Standard drills).
> - `practice_sessions.narrowing_ramp_completed` + `practice_sessions.if_then_plan` columns: NarrowingRamp protocol cut. Both columns **stay vestigial in tree**; v1 sessions write `narrowing_ramp_completed = false` (default) and `if_then_plan = null` unconditionally. Drop in v1-code-cleanup.
> - `strategy_views` table prose below: 30-second strategy-review gate cut (PRD §6.5). The table **was never shipped** — `src/db/schemas/practice/strategy_views.ts` does not exist in tree. The schema barrel reference at §3.6 is also vestigial-in-spec-only. The `attempts` post-session-review surface (Phase 5 sub-phase 1) does not need least-recently-viewed strategy tracking.

#### `src/db/schemas/practice/practice-sessions.ts` — table `practice_sessions`

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `user_id` | `uuid` | `notNull`, FK → `users.id`, `onDelete cascade` |
| `type` | `pgEnum('session_type', ['diagnostic','drill','full_length','simulation','review'])` | `notNull` |
| `sub_type_id` | `varchar(64)` | nullable, FK → `sub_types.id` (set only for `drill` and `review`) |
| `timer_mode` | `pgEnum('timer_mode', ['standard','speed_ramp','brutal'])` | nullable (only set for `drill`) |
| `target_question_count` | `integer` | `notNull` (50 for diagnostic/full_length/simulation; 5/10/20 for drill; computed from due-set size for review) |
| `started_at_ms` | `bigint` | `notNull` |
| `ended_at_ms` | `bigint` | nullable (set by `endSession` or the abandon sweep) |
| `last_heartbeat_ms` | `bigint` | `notNull`, `default extract(epoch from now()) * 1000` |
| `completion_reason` | `pgEnum('completion_reason', ['completed','abandoned'])` | nullable (set when `ended_at_ms` is set) |
| `narrowing_ramp_completed` | `boolean` | `notNull`, `default false` |
| `if_then_plan` | `text` | nullable |
| `recency_excluded_item_ids` | `uuid[]` | `notNull`, `default '{}'` |
| `strategy_review_viewed` | `boolean` | `notNull`, `default false` (full-length 30s gate) |
| `diagnostic_overtime_note_shown_at_ms` | `bigint` | nullable, vestigial — left in place for sub-phase 1; no reader writes or reads it. The post-session pacing line (§6.10) is derived from `MAX(attempts.id)` minus `started_at_ms` instead. Drop in a future cleanup commit. |

Indexes:
- `practice_sessions_user_id_idx` on `user_id`.
- `practice_sessions_user_type_ended_idx` on `(user_id, type, ended_at_ms)` — drives the first-run check in `(app)/layout.tsx`.
- `practice_sessions_abandon_sweep_idx` on `(last_heartbeat_ms)` `WHERE ended_at_ms IS NULL` — drives the abandon-sweep query.
- `practice_sessions_recency_excluded_gin_idx` on `recency_excluded_item_ids` using `gin`.

Recover `created_at` via `timestampFromUuidv7(row.id)`. `started_at_ms` is recorded explicitly because it is set from the user's clock (NarrowingRamp end) and may differ from row insertion.

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

#### `src/db/schemas/practice/strategy_views.ts` — table `strategy_views`

Append-only log used by the strategy-review gate to pick least-recently-viewed strategies.

| column | type | constraint |
|---|---|---|
| `id` | `uuid` | PK, `default uuidv7()` |
| `user_id` | `uuid` | `notNull`, FK → `users.id`, `onDelete cascade` |
| `strategy_id` | `uuid` | `notNull`, FK → `strategies.id`, `onDelete cascade` |
| `viewed_at_ms` | `bigint` | `notNull` |

Index: `strategy_views_user_strategy_idx` on `(user_id, strategy_id)` — drives the LEFT JOIN for least-recently-viewed lookup.

### 3.5 Review tables

> **Cut from v1 2026-05-04** — spaced-repetition review queue (PRD §4.3 cut marker). The `review_queue` table **stays vestigial in tree** at `src/db/schemas/review/review-queue.ts` (the schema file shipped during Phase 3 to lock the migration shape; v1 never inserts rows into it). The schema-barrel registration at §3.6 also stays vestigial. Drop the table + its barrel entry in the v1-code-cleanup follow-up round. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.

#### `src/db/schemas/review/review_queue.ts` — table `review_queue`

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
import * as practiceStrategyViews from "@/db/schemas/practice/strategy_views"
import * as reviewReviewQueue from "@/db/schemas/review/review_queue"

const dbSchema = {
    ...authUsers, ...authAccounts, ...authSessions, ...authVerificationTokens,
    ...catalogSubTypes, ...catalogStrategies, ...catalogItems, ...catalogCandidatePromotionLog,
    ...practiceSessions, ...practiceAttempts, ...practiceMasteryState, ...practiceStrategyViews,
    ...reviewReviewQueue
}
```

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

Single source of truth for the 11 v1 sub-types per PRD §2. Exports `subTypes`:

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

- **12s (recognition):** `verbal.synonyms`, `verbal.antonyms`, `numerical.number_series`, `numerical.letter_series`.
- **15s (quick structured reasoning):** `verbal.analogies`, `verbal.sentence_completion`, `numerical.fractions`, `numerical.percentages`, `numerical.averages_ratios`.
- **18s (sustained multi-constraint reasoning):** `verbal.logic`, `numerical.word_problems`.

Default `bankTargetByDifficulty` is `{ easy: 50, medium: 50, hard: 50, brutal: 50 }`. All 11 v1 sub-types use the default; there are no real-only sub-types in v1.

`SubTypeId` is a `as const` union of the 11 string ids. A migration in `src/db/scripts/seed-sub-types.ts` populates the `sub_types` table from this file.

### 4.2 `src/config/strategies.ts`

Exports `strategies: Record<SubTypeId, StrategyEntry[]>` where `StrategyEntry = { kind: 'recognition' | 'technique' | 'trap'; text: string }`. Each of the 11 sub-types has exactly three entries — one of each kind — distilled from `docs/CCAT-categories.md`. 33 strategy rows total (3 × 11). Each entry is 1–2 sentences. A migration populates the `strategies` table from this file.

### 4.3 `src/config/admins.ts`

Hardcoded admin email allowlist. Lowercase only. Compared case-insensitively in `src/server/auth/admin-gate.ts`.

### 4.4 `src/config/item-templates.ts`

Per-sub-type generator templates, versioned. v1 has 11 templates (one per v1 sub-type). The Zod schema for each template's structured output emits `body: { kind: "text", text: string }`:

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

Hand-tuned 50-row array for the diagnostic. Each entry is `{ subTypeId, difficulty }`. Brutal-tier items are excluded. Distribution across the 11 v1 sub-types: 5 verbal × 4 each = 20; 6 numerical × 5 each = 30. Total = 50. Within each sub-type, tier mix is hand-picked from `easy / medium / hard` (no brutal); typical per-sub-type shapes:

- 4-item verbal block: `[easy, medium, medium, hard]`.
- 5-item numerical block: `[easy, medium, medium, medium, hard]`.

The exact tier assignments are curated in the file rather than derived from a formula — the diagnostic is calibration-critical and a flat data file is more honest than an algorithm.

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

1. Compute `rows_affected` per user-scoped table (sessions, attempts via cascade, mastery_state, ~~review_queue~~ [vestigial-in-tree, always 0 rows in v1 — see §3.5 cut marker], ~~strategy_views~~ [never shipped — see §3.4 cut marker; remove from cascade list before v1 ship], accounts, auth_sessions).
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
- v1 items are text-only, so first paint == text paint == question visible. (When future visual sub-types are added, latency will need to anchor on the text paint rather than the image paint so visual sub-types aren't systematically penalized.)
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
- `A`–`E` — same as 1–5 (for visual sub-types where options are letter-labeled).
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

The focus shell uses a hybrid two-path audio model — synthesized ticks before the per-question target, a sampled MP3 looping from the target until advance.

**Pre-target ticks.** A soft 880 Hz sine pip fires at every integer second strictly greater than half the per-question target and strictly less than the target itself. For an 18-second target this lands as eight ticks at seconds 10, 11, 12, 13, 14, 15, 16, 17. Each tick is ~50 ms, peak gain 0.12, synthesized via `OscillatorNode` + `GainNode`. AudioContext is created lazily on first user interaction; calls before that unlock are silent no-ops. There is no synth dong at second 18 — the urgency loop's first second of playback replaces it.

**Post-target urgency loop.** At session start (the same first-interaction moment that creates the AudioContext), one MP3 file is picked at random from the bank manifest at `src/config/sound-bank.ts`. The manifest is build-time-generated by `scripts/copy-sounds-to-public.ts` from the top-level `*.mp3` files in `data/sounds/` — subdirectories under `data/sounds/` (e.g., `success/`, `failure/`, `ticks/`) are deliberately NOT enumerated; the bank is the top-level files only. The chosen file's `AudioBuffer` is fetched and decoded once. When `elapsedQuestionMs` first crosses `perQuestionTargetMs`, that buffer starts playing in a loop (`source.loop = true`) at peak gain ~0.8. The loop stops on item advance via a cleanup-on-`currentItem.id`-change effect — uniformly handles every advance path (Submit click, Space-triage take, click-triage take, server-end). The same file plays for every question in the session; a hard refresh re-picks.

**Gating and silence.** Before the first user interaction, AudioContext doesn't exist and every audio path returns silently — there is no silent fallback to "no sound, but state still ticks"; failure-to-play is the *correct* behavior under browser autoplay policy. (The prior `timerPrefs.questionTimerVisible` gate was dropped in v1-code-cleanup commit 2; audio runs unconditionally once the AudioContext is unlocked.)

Audio is implemented in `src/components/focus-shell/audio-ticker.ts`. The reducer's `urgencyLoopStartedForCurrentQuestion` flag prevents double-starts within a question; pre-target ticks use a `useRef`-tracked previous-integer-second value (no reducer state) for cross-second detection.

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
- ~~For `full_length` sessions, sets `practice_sessions.strategy_review_viewed = true`. Throws `ErrStrategyReviewRequired` if the gate has not yet elapsed.~~ **Cut from v1 2026-05-04** — 30-second strategy-review gate (PRD §6.5 cut marker). The `strategy_review_viewed` column **stays vestigial in tree** at `src/db/schemas/practice/practice-sessions.ts` (default `false`, never written `true` in v1). `ErrStrategyReviewRequired` is **never thrown** in v1 — see §7.15 marker. v1 `dismissPostSession` has no full-length-specific branch.
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

> **Cut from v1 2026-05-04** — timer-toggle UX (PRD §5.1 cut marker). `persistTimerPrefs` was **never shipped** to tree (`src/app/(app)/actions.ts` does not export it). With the toggle UI cut, no caller needs to write `users.timer_prefs_json` at runtime. Section preserved as historical reference. The "no `revalidatePath`" exception note remains an accurate description of the deliberate design *if* the action ever returns post-v1. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.

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

- **The no-walking contract is on REQUESTED tier, not served tier.** uniform_band's strategy contract is "the requested tier stays constant across the drill — the engine doesn't adaptively shift its REQUEST based on user accuracy." The SERVED tier can still differ from the requested tier when the bank exhausts and the tier-degraded fallback fires. Reading `served_at_tier` alone overconstrains the contract; verification scenarios that assert "tier didn't walk" must derive the requested tier from `(fallbackFromTier ?? servedAtTier)` or equivalent (i.e., the requested tier IS the served tier when no fallback fired, otherwise it's whatever `fallbackFromTier` records).
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

1. `/drill/[subTypeId]/page.tsx` is a configure page. Validates the route param against `subTypeIds`; on miss → `notFound()`. Pre-checks the sub-type's live-item count via `SELECT count(*) FROM items WHERE sub_type_id = $1 AND status = 'live'`. **If the count is zero, renders `<EmptyBankPane>` instead of the configure form** — heading "No questions available for {sub-type} yet.", body "Try a different sub-type from the Mastery Map.", single "Back to Mastery Map" CTA. The pane uses `data-testid="drill-empty-bank-pane"`. This handling replaces the prior fail-through to `startSession`'s `ErrFirstItemMissing` → Next.js error boundary, which gave users an unhelpful error for what's a known empty-bank case (e.g., `verbal.synonyms` while the testbank workstream is between stage-1 ingest and stage-2 explanation generation).
2. With a populated bank, the configure page renders a length picker (5 / 10 / 20, default 10). **Phase 3 wires only `standard` timer mode** — `speed_ramp` and `brutal` ship in Phase 5; the configure page's timer-mode selector is correspondingly absent in Phase 3. The PRD §4.4 timer-mode-selection narrative applies to Phase 5+.
3. Form submit `GET`s to `/drill/[subTypeId]/run?length=N`. The run page calls `startSession({ userId, type: "drill", subTypeId, timerMode: "standard", drillLength })`. **Phase 3 ships no NarrowingRamp** — `startSession` is invoked directly. PRD §5.3 NarrowingRamp ships in Phase 5.
4. `<FocusShell>` runs with `sessionDurationMs = drillLength * 18000`, `perQuestionTargetMs: 18000`, `paceTrackVisible: true`. **Selection strategy is `'uniform_band'`** in Phase 3 (§9.2 deferred-adaptive note); the requested tier is constant across the drill, derived from `mastery_state` per §9.1's initial-tier table.
5. After the last submit, `endSession` then `router.push("/")` — drills land on the Mastery Map directly, NOT through `/post-session/[sessionId]`. Drill post-session UI is Phase 5 (PRD §6.5).

**Sign-out button.** The Mastery Map's header (top-right) renders `<SignOutButton>` for users not currently inside a session — see §10.1's flow paragraph. The button is deliberately absent from `/diagnostic/run` and `/drill/[subTypeId]/run` (the focus shell strips chrome to maintain session focus) and from the diagnostic explainer at `/diagnostic` (mid-flow surface). Visual treatment is `text-foreground/70` with a `hover:text-foreground` transition — distinct from the footer's low-contrast `<TriageAdherenceLine>` because sign-out is an ACTION, not a STATUS, and inheriting the periphery treatment would make it harder to find.

The session-timer toggle does NOT live on the configure page — it's a focus-shell periphery control only. (v1 2026-05-04: timer-toggle UX cut entirely, PRD §5.1 + SPEC §6.6 markers. Sentence preserved as historical reference for the configure-page placement decision.)

### 10.3 Full-length test — `/test`

> **Partial cut from v1 2026-05-04.** Full-length test stays in v1 (Phase 5 sub-phase 3). Two prefix/suffix elements cut: NarrowingRamp pre-session (PRD §5.3) and strategy-review gate post-session (PRD §6.5). v1 shape: directly → `<FocusShell>` → post-session review (dismissible immediately). On-disk surface: `src/components/narrowing-ramp/*` and `src/components/post-session/strategy-review-gate.tsx` were **never shipped** to tree.

PRD §4.5. 50 items, 15 minutes, real-test difficulty mix with randomized interleaving across the 11 v1 sub-types (verbal and numerical, no section breaks). The real CCAT additionally interleaves abstract and attention-to-detail items; v1 omits those because v1 does not cover those sections.

1. ~~`/test/page.tsx` renders `<NarrowingRamp>`.~~ **Cut 2026-05-04.** v1 `/test/page.tsx` calls `startSession({ type: "full_length" })` directly (no `ifThenPlan`).
2. `startSession({ type: "full_length", ifThenPlan })`. `getNextItem` selects per the per-decile mix in `src/config/difficulty-curves.ts`, with cross-sub-type interleaving (the ordering of sub-types within a decile is randomized per session). Pulls from `source: "real"` first; only falls back to `generated` when the real-bank set is exhausted for the requested sub-type/difficulty bucket.
3. `<FocusShell>` with `sessionDurationMs: 900000`, `perQuestionTargetMs: 18000`, `paceTrackVisible: true`.
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

`/post-session/[sessionId]/page.tsx` (server component) loads:

- The session row.
- All attempts for the session.
- The user's strategies for sub-types where session accuracy was below 70%.
- The wrong items with prompt/options/explanation.
- For diagnostic sessions: a percentile-estimate string ("your diagnostic accuracy was 65% — average CCAT score is around 48%").

Then renders `<PostSessionReview>` which composes `<WrongItemsList>`, accuracy/latency summary, triage score (with the small-sample / N/A branches per §9.7), surfaced strategies, and:

- For diagnostic only: `<OnboardingTargets>` (target percentile + target date capture). Primary button "Save and continue"; smaller "Skip for now" link. Both flows then dismiss the post-session.
- ~~For full_length only: `<StrategyReviewGate>` — 30-second timer plus a single rendered strategy paired with the user's worst sub-type from this session. Dismiss button is disabled until the gate elapses and the strategy is marked viewed; the gate posts a `strategy_views` row when the strategy first appears.~~ **Cut from v1 2026-05-04** — strategy-review gate (PRD §6.5 cut marker). `<StrategyReviewGate>` was **never shipped** to tree. v1 full_length post-session is dismissible immediately like every other session type.

For diagnostic ~~and drill and review~~ **and drill** (review session type also cut, §10.5 marker), the dismiss button is enabled immediately. **In v1 (2026-05-04), this applies to all session types** including full_length and simulation.

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
- [ ] **No `<img>`.** Use Next `<Image>`. (`biome/base.json:106` `performance/noImgElement: error`) v1 has no item images so the application surface today rarely needs `<Image>` either; the rule is documented for completeness and for future visual sub-types.
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
- Hand-seed 55 real items (5 per sub-type × 11 v1 sub-types) via the form. Then OCR-import additional items from CCAT practice-test screenshots via the four-pass pipeline at `scripts/import-questions.ts` + `scripts/generate-explanations.ts`. Validates the (single-variant) body discriminator end-to-end.
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
- ~~`src/components/focus-shell/question-timer-bar.tsx` (MOD: toggle + persistence)~~ **Cut from v1 2026-05-04** — timer-toggle UX (PRD §5.1). Question-timer bar shipped during Phase 3; the toggle + persistence MOD is cut. Drop unused toggle code paths in v1-code-cleanup.
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

---

## 13. Open questions

1. **Future visual-sub-type migration.** v1's text-only scope informs eventual addition of the abstract reasoning, attention-to-detail, and `numerical.data_interpretation` sub-types. The current schema is shaped to make that migration additive (single-variant body discriminator stays a discriminated union; `sub_type_section` enum extensible; `options_json` carries `text` only but the type allows `imageUrl` to be added). The specific assumptions that will need revisiting: introducing image keys into the body schema, choosing image storage (S3 with the proxied-image route handler is the obvious choice but isn't committed), wiring image-MIME-type validation at ingest, deciding whether visual sub-types use `selectionStrategy: 'real-only'` or get their own programmatic generators, and re-anchoring latency on text-paint instead of first-paint when image-bearing variants exist. Flagged here so the future migration isn't a surprise; not a v1 deliverable.
