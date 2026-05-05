# Plan — Phase 5 v1 code cleanup (pre-sub-phase-1 hygiene)

> **Status: in progress, commits 1 + 2 shipped.** This round drops the vestigial code surfaces left behind by the 2026-05-04 doc-only v1-scope-tightening (commits `ca2330a` / `991d3eb` / `75240c8` / `4b35449` / `141bf83` + the hygiene follow-up `832f634`). The doc-only round established what's cut and what stays vestigial in tree; this round excises the vestigial code so it doesn't leak into Phase 5 sub-phase 1's audit findings. **Five commits**, all small, sequenced leaf-first — original commit 3 (application-layer barrel + drill route signature alignment) was dropped after the audit pass at commit-2-close confirmed Outcome 1 (commits 1 + 2 rippled cleanly; no application-layer cleanup needed). Renumber landed atomically with new commit 3's migration work. Per-commit implementation detail (specific migration SQL, exact reducer-state diffs) lives in the commits themselves; this plan is sequencing-shaped.

The audit-first framing carries forward from sub-phase 4. The audit pass against `main` (§2) found the cut surfaces split cleanly across two categories: **never-shipped** (the components, server actions, workflows, and routes the doc-only round marked as "specced-but-never-shipped" — already absent from tree, no cleanup needed) and **shipped-but-now-vestigial** (the schema columns, schema tables, error sentinels, selection-engine throwing stubs, and focus-shell reducer state that DID land during Phase 3 and now have zero v1 callers). The cleanup scope is exclusively the second category.

The audit also surfaced two findings beyond the user's prompt scope list — both flagged in §10 for redline before implementation begins.

## 1. Why this round, why now

Two forcing functions:

1. **Phase 5 sub-phase 1 starts next.** Sub-phase 1 ships the post-session review surface (PRD §6.5 minus the strategy gate). It will inevitably grep for related surfaces (`practice_sessions.*`, the focus-shell reducer's state shape, the selection engine's session-type dispatch) during its plan-writing audit. Vestigial code surfaces — `narrowing_ramp_completed` in the sessions schema, `timerPrefs` in the reducer, `ErrReviewQueueDeferred` in the selection engine — would distract that audit and risk the sub-phase 1 plan inadvertently building on or around them. Cleanup before sub-phase 1 starts is the right sequencing.

2. **The doc-only round established the legibility for cleanup.** Each cut SPEC marker carries an on-disk-code-surface note ("stays vestigial in tree at `path/to/file.ts`" vs "never shipped"). The cleanup scope is therefore already enumerated; this round just executes the on-disk-code-surface notes. Postponing past sub-phase 1 means the same notes get re-derived later from a more-tangled state.

The round is a strict subset of work the doc-only round committed to. **Nothing in this plan re-litigates a cut.** All decisions about what's cut are upstream of this round and cannot be reopened here.

## 2. Audit pass + cleanup scope inventory

Grep-driven audit against `main` at HEAD `832f634`. Findings grouped by code surface, with on-disk-code-surface verdict per cut:

### 2.1 Schema files (delete)

- `src/db/schemas/review/review-queue.ts` — **shipped, vestigial.** Defines the `review_queue` table + its two indices. No application reader (verified by `grep reviewQueue src/`). Imported only by the schema barrel. Drop the file + the barrel registration; drop the table via Drizzle migration.
- `src/db/schemas/ops/strategy-views.ts` — **shipped, vestigial.** (Note: prompt called this `practice/strategy-views.ts`; actual on-disk path is `ops/`.) Defines the `strategy_views` table + its index. No application reader. Same drop shape as `review-queue.ts`.

### 2.2 Schema columns (drop via migration)

All have zero application readers (`grep` yields only the column declarations themselves):

- `users.timer_prefs_json` (`src/db/schemas/auth/users.ts:14`) — `jsonb notNull default '{}'::jsonb`. Cut per PRD §5.1 / SPEC §3.2.
- `practice_sessions.narrowing_ramp_completed` (`src/db/schemas/practice/practice-sessions.ts:45`) — `boolean notNull default false`. Cut per PRD §5.3 / SPEC §3.4.
- `practice_sessions.if_then_plan` (`practice-sessions.ts:46`) — `text` nullable. Cut per PRD §5.3 / SPEC §3.4.
- `practice_sessions.strategy_review_viewed` (`practice-sessions.ts:51`) — `boolean notNull default false`. Cut per PRD §6.5 / SPEC §3.4.

`start.ts` lines 247–248 are the ONLY writers for `narrowing_ramp_completed` + `if_then_plan` and they always write defaults under v1 inputs (the `ifThenPlan` input is never passed); removing those write lines is part of the application-layer cleanup that lands BEFORE the migration.

### 2.3 Schema enums

- `timer_mode` enum (`practice-sessions.ts:24`) — `pgEnum('timer_mode', ['standard','speed_ramp','brutal'])`. Cut per PRD §4.4 / SPEC §3.4 leaves only `'standard'` written in v1. **Decision: truncate to `['standard']` via the standard Postgres rename-swap pattern.** Migration shape: `CREATE TYPE timer_mode_v2 AS ENUM ('standard'); ALTER TABLE practice_sessions ALTER COLUMN timer_mode TYPE timer_mode_v2 USING timer_mode::text::timer_mode_v2; DROP TYPE timer_mode; ALTER TYPE timer_mode_v2 RENAME TO timer_mode;`. The `text::timer_mode_v2` cast succeeds for every existing row because the only written value under v1 is `'standard'` (drills) or `NULL` (non-drills), both valid in the v2 enum. The schema-vs-application drift is closed at the database level; future-Claude reads the enum as "this is the only value the app writes" without needing to cross-reference a cut-from-v1 marker. **This work absorbs into commit 3** alongside the column drops on the same `practice_sessions` table — see §5 migration shape.
- `session_type` enum (`practice-sessions.ts:16-22`) — includes `'review'` value. Cut per PRD §4.3 / SPEC §3.5 leaves no v1 caller writing `'review'`. **Decision: truncate to `['diagnostic','drill','full_length','simulation']` via the same rename-swap pattern as `timer_mode`, in commit 3.** Migration shape parallels `timer_mode`: `CREATE TYPE session_type_v2 AS ENUM ('diagnostic','drill','full_length','simulation'); ALTER TABLE practice_sessions ALTER COLUMN type TYPE session_type_v2 USING type::text::session_type_v2; DROP TYPE session_type; ALTER TYPE session_type_v2 RENAME TO session_type;`. The cast is safe — every existing row's `type` value is one of the four v2 values because the v1 application never wrote `'review'`. The eight `'review'` call sites surfaced by the audit (`practice-sessions.ts:21` enum, `actions.ts:36` zod schema, `sessions/queries.ts:17` + `selection.ts:74` + `start.ts:60` + `focus-shell/types.ts:12` + `focus-shell/shell-reducer.ts:120` type unions, plus the two dispatch sites at `selection.ts:116` + `start.ts:93` already in commit 1's scope) split cleanly across commits 1 / 2 / 3 — see §3 / §4 / §5 for per-commit attribution. **Symmetry with the `timer_mode` decision is preserved**: same redline rationale (§12.1 + §12.4), same migration pattern, same call-site audit shape. The "higher-altitude session_type" framing in §12.4's Option B was considered and rejected on the grounds that the structural-importance argument doesn't change the mechanics or the cleanliness-compounds principle.

### 2.4 Server actions (mostly never shipped — verify-and-skip)

- `persistTimerPrefs` — **never shipped to tree** (verified by `grep persistTimerPrefs src/` returning empty). Nothing to delete; the cleanup verifies absence and removes the SPEC §7.8 cut marker's "if the action ever returns post-v1" forward-looking phrasing.
- `dismissPostSession` — **never shipped to tree** (verified). The current post-session route at `src/app/(diagnostic-flow)/post-session/[sessionId]/{page,content}.tsx` uses `saveOnboardingTargets` instead. Nothing to delete.
- `saveOnboardingTargets` — **shipped, in scope, NOT a cut feature.** Mentioned here only to disambiguate from `dismissPostSession` above.

### 2.5 Error sentinels (delete what shipped)

- `ErrReviewQueueDeferred` (`src/server/items/selection.ts:49` + line 513 export) — **shipped, vestigial.** Sole consumer is the throwing branch at line 489–494. Delete both.
- `ErrStrategyReviewRequired` — **never shipped to tree** (verified). Nothing to delete.

### 2.6 Selection-engine throwing stubs + dead branches (delete with exhaustiveness check)

In `src/server/items/selection.ts`:

- Line 73: `type SelectionStrategy = "fixed_curve" | "uniform_band" | "adaptive" | "review_queue"` — drop `"review_queue"` from the union.
- Line 116: `if (type === "review") return "review_queue"` — drop the dispatch.
- Lines 489–494: throwing branch for `strategy === "review_queue"` — drop.
- Lines 388–411: `initialTierFor` carries reachable-only-via-non-standard-timer-mode branches: line 390 (`if (timerMode === "brutal") return "brutal"`) and lines 405–411 (`if (timerMode === "speed_ramp")` shift block). With `timerMode` tightened to `'standard'` literal, both branches become unreachable. Drop both.
- Lines 424–426: `getNextUniformBand`'s `timer_mode === null` guard becomes vacuous if `timer_mode` always carries `'standard'` for drills (the only callers). Tighten or keep as a defense-in-depth assertion — judgment call deferred to commit 1.

The `_exhaustive: never` pattern at line 498–499 is the load-bearing type-checker exhaustiveness assertion — verifying it still passes after the union narrowing is the verification scenario for commit 1.

In `src/server/sessions/start.ts`:

- Line 68: `timerMode?: TimerMode` input — narrow to `timerMode?: "standard"` literal (or drop the field if a default works).
- Line 70: `ifThenPlan?: string` input — drop entirely.
- Line 93: `if (input.type === "review")` branch — drop (review-type session unreachable from the application layer).
- Lines 110–112: drill missing `timerMode` error path — drop or keep depending on whether the field stays as a literal or gets dropped.
- Lines 162–166: `timer_mode` write logic — simplify to always write `'standard'` for drill, `null` otherwise.
- Lines 247–248: `narrowing_ramp_completed` + `if_then_plan` inserts — drop both write lines (the columns themselves drop in commit 3).

In `src/app/(app)/actions.ts`:

- Line 38: `timerMode: z.enum(["standard", "speed_ramp", "brutal"]).optional()` — narrow to `z.literal("standard").optional()` or drop entirely.
- Line 40: `ifThenPlan: z.string().min(1).max(2048).optional()` — drop.

In `src/app/(app)/drill/[subTypeId]/run/page.tsx`:

- Line 4 (comment), line 68 (`timerMode: "standard"`) — drop the field from the `startSession` call iff start.ts drops the input; otherwise leave as the only acceptable literal.

### 2.7 Reducer state + focus-shell internals (delete dead state)

In `src/components/focus-shell/shell-reducer.ts`:

- Lines 45 (in `ShellState`), 92 (in init args), 104 (in init): `timerPrefs: TimerPrefs` field. Drop the field; visibility becomes static-per-session-type, computed inline in `focus-shell.tsx` from `sessionDurationMs !== null` and the session type rather than read from reducer state.
- Lines 85–86: `toggle_session_timer` + `toggle_question_timer` action kinds — drop both.
- Lines 256–258 + 266–268: `reduceToggleSessionTimer` + `reduceToggleQuestionTimer` reducer functions — drop both.
- Lines 311–312: action-kind dispatch for the two toggle actions — drop both. Re-verify the `_exhaustive: never` assertion in the reducer's main switch.

In `src/components/focus-shell/focus-shell.tsx`:

- Line 83: `timerPrefs: props.initialTimerPrefs` in init — drop.
- Lines 242, 266, 279, 283, 291, 392, 425: every `state.timerPrefs.*` read site — replace with the static-per-session-type computation. (`state.timerPrefs.sessionTimerVisible` → `sessionDurationMs !== null`; `state.timerPrefs.questionTimerVisible` → `false` per the v1 cut.)
- Line 531: `ifThenPlan={props.ifThenPlan}` pass-through to `<TriagePrompt>` — drop the prop.

In `src/components/focus-shell/triage-prompt.tsx`:

- Line 30: `ifThenPlan?: string` prop — drop.
- Lines 36–37: `hasPlan` branch + the if-then-plan rendering — drop. Always render `Best move: guess and advance.` per PRD §6.1's generic triage prompt.

In `src/components/focus-shell/types.ts`:

- Line 62: `ifThenPlan?: string` in `FocusShellProps` — drop. Plus `initialTimerPrefs: TimerPrefs` if it's still in the props interface — drop too (the static-per-session-type computation removes the need for an external initial-state input).

### 2.8 Schema barrel + initial migration

- `src/db/schema.ts` — drop the `reviewReviewQueueSchema` and `opsStrategyViewsSchema` imports + spread registrations. Atomic with the schema-file deletions.
- `drizzle/0000_typical_golden_guardian.sql` — **stays as-is.** The initial migration is committed history; cleanup migrations are forward-only. The new migration files (commits 4 + 5) add `DROP COLUMN` / `DROP TABLE` statements that compose with the initial-migration state.

### 2.9 SPEC + PRD doc updates (atomic with each cleanup commit)

The doc-only round front-loaded the cut markers; this round tightens them from "stays vestigial in tree" to "dropped from tree" as the corresponding code lands. SPEC sections affected: §3.2, §3.4, §3.5, §3.6, §6.2, §6.6, §7.1, §7.4, §7.8, §7.15, §9.2, §10.x file-map. PRD §8.1 schema sketch likewise. Each cleanup commit lands its own SPEC/PRD delta atomically (NOT a global doc pass at round end — the doc-only round was the global pass; this round is back to the standard "code + doc together" convention).

## 3. Commit 1 — selection.ts + start.ts: drop `review_queue` strategy + dead `timer_mode` branches

### Scope

- `src/server/items/selection.ts`: drop `ErrReviewQueueDeferred` constant + export, drop `'review_queue'` from `SelectionStrategy` union, drop the `type === "review"` dispatch (line 116), drop the throwing branch (lines 489–494), drop the `brutal` early-return + `speed_ramp` shift block in `initialTierFor` (lines 390 + 405–411).
- `src/server/sessions/start.ts`: drop the `if (input.type === "review")` branch (line 93), simplify `timer_mode` write logic (lines 162–166) to always-write-`'standard'`-for-drill, drop the `ifThenPlan` input (line 70) and its insert site (lines 247–248), drop the `narrowing_ramp_completed` insert site (line 247) — both columns get dropped in commit 3 but the application layer stops writing them now.
- `src/app/(app)/actions.ts`: narrow `timerMode` zod schema to `z.literal("standard").optional()`; drop the `ifThenPlan` zod field (line 40); narrow the `type` zod schema (line 36) from 5-valued to 4-valued by dropping `"review"`. (Whether the `timerMode` field gets dropped entirely vs kept as a literal is a judgment call at commit time; recommendation is to keep as `z.literal` so the wire shape can carry future drill-mode additions without an action-signature break.)
- `src/app/(app)/drill/[subTypeId]/run/page.tsx`: align with whatever the `actions.ts` decision was — keep `timerMode: "standard"` as a literal field if `actions.ts` kept the field, or drop if `actions.ts` dropped it.
- **Session-type type-union narrowings (server-side; per §2.3 + §12.4):** drop `"review"` from the local `SessionType` type unions at `src/server/items/selection.ts:74`, `src/server/sessions/start.ts:60`, and `src/server/sessions/queries.ts:17`. Each is a one-line edit; collectively they tighten the server's session-type contract before the schema enum truncation in commit 3.

### Dependencies

None — leaf commit.

### Verification

- `bun typecheck` passes (the load-bearing assertion is the `_exhaustive: never` pattern at `selection.ts:498–499` after the union narrowing).
- `bun lint` passes.
- The existing drill smoke (`scripts/dev/smoke/drill-mode.ts` or equivalent — verify path during implementation) runs end-to-end against a `'standard'` drill. The drill happy path is the only `timer_mode`-touching path in v1 use.
- Diagnostic flow smoke runs end-to-end (no `timer_mode` interaction; verifies the `selection.ts` narrowing didn't break diagnostic dispatch).

### Migration shape

None. Application-layer-only commit.

## 4. Commit 2 — Focus-shell internals: drop `timerPrefs` + `ifThenPlan` prop chain

### Scope

- `src/components/focus-shell/shell-reducer.ts`: drop `timerPrefs` from `ShellState`, drop `toggle_session_timer` + `toggle_question_timer` action kinds + their reducer functions, drop the dispatch lines. Re-verify the reducer's main `_exhaustive: never` switch.
- `src/components/focus-shell/focus-shell.tsx`: replace every `state.timerPrefs.*` read with the static-per-session-type computation (the visibility logic per SPEC §6.6 v1 marker: session timer visible iff `sessionDurationMs !== null`; question timer always hidden). Drop the `ifThenPlan` prop pass-through to `<TriagePrompt>` (line 531).
- `src/components/focus-shell/triage-prompt.tsx`: drop `ifThenPlan` prop + the hasPlan branch; always render `Best move: guess and advance.`
- `src/components/focus-shell/types.ts`: drop `ifThenPlan?: string` from `FocusShellProps`; drop `initialTimerPrefs` if present; drop `"review"` from the `SessionType` union at line 12.
- `src/components/focus-shell/shell-reducer.ts`: drop `"review"` from the inline session-type union at line 120.

### Dependencies

None — independent of commit 1. Could ship before or after commit 1; sequencing puts it second so commit 1 cleans the server-side first and commit 2 cleans the client-side second.

### Verification

- `bun typecheck` + `bun lint` pass.
- Diagnostic flow smoke + drill smoke both run end-to-end. The visibility outcome should be identical to the pre-cleanup behavior under v1 inputs (session timer ON for drill / full_length / simulation, OFF for diagnostic; question timer always OFF) — the cleanup is type-shape work, not behavior change.
- Manual visual verification: load `/diagnostic/run` and `/drill/[subTypeId]/run` in browser, confirm the session timer + per-question timer visibility matches expected static-per-session-type state.

### Migration shape

None.

## 5. Commit 3 — Schema column drops + `timer_mode` + `session_type` enum truncations via Drizzle migration

### Scope

- New Drizzle migration file (`drizzle/0001_*.sql`, name auto-generated by `bun run drizzle-kit generate`). Statements (logical order; Drizzle's generator may reorder):
  - **Column drops:**
    - `ALTER TABLE users DROP COLUMN timer_prefs_json;`
    - `ALTER TABLE practice_sessions DROP COLUMN narrowing_ramp_completed;`
    - `ALTER TABLE practice_sessions DROP COLUMN if_then_plan;`
    - `ALTER TABLE practice_sessions DROP COLUMN strategy_review_viewed;`
  - **`timer_mode` enum truncation (rename-swap pattern):**
    - `CREATE TYPE timer_mode_v2 AS ENUM ('standard');`
    - `ALTER TABLE practice_sessions ALTER COLUMN timer_mode TYPE timer_mode_v2 USING timer_mode::text::timer_mode_v2;`
    - `DROP TYPE timer_mode;`
    - `ALTER TYPE timer_mode_v2 RENAME TO timer_mode;`
  - **`session_type` enum truncation (rename-swap pattern, parallel to `timer_mode`):**
    - `CREATE TYPE session_type_v2 AS ENUM ('diagnostic','drill','full_length','simulation');`
    - `ALTER TABLE practice_sessions ALTER COLUMN type TYPE session_type_v2 USING type::text::session_type_v2;`
    - `DROP TYPE session_type;`
    - `ALTER TYPE session_type_v2 RENAME TO session_type;`
- Schema file edits (atomic with the migration so the generated SQL matches the schema state):
  - `src/db/schemas/auth/users.ts`: drop the `timerPrefsJson` field declaration.
  - `src/db/schemas/practice/practice-sessions.ts`: drop the `narrowingRampCompleted`, `ifThenPlan`, `strategyReviewViewed` field declarations; tighten the `timerMode` `pgEnum` declaration from `['standard','speed_ramp','brutal']` to `['standard']`; tighten the `sessionType` `pgEnum` declaration from `['diagnostic','drill','full_length','simulation','review']` to `['diagnostic','drill','full_length','simulation']`.

**Migration-author note:** Drizzle Kit's auto-generator may not produce the exact rename-swap pattern when it sees an enum value-set shrink (the alternative it reaches for is `ALTER TYPE … RENAME VALUE`, which Postgres doesn't support, or a fail-to-generate). If the generator fails or produces non-running SQL, hand-write the migration file using the rename-swap pattern above — Drizzle Kit is the convenience tool, not the source of truth. Snapshot files (`drizzle/meta/`) update accordingly so subsequent generates start from the post-truncation state.

### Dependencies

Commits 1 + 2. The schema column drops require zero application readers — verified by `grep timer_prefs_json src/`, `grep narrowing_ramp_completed src/`, etc., which should each yield only the schema-file declarations being dropped. If grep yields any other hit, that hit is a leftover from commits 1 + 2 and must be cleaned up before this commit lands.

### Verification

- `bun run drizzle-kit generate` produces the expected migration; inspect the generated SQL for unexpected statements (e.g., column reorderings — should NOT appear).
- Apply the migration against a fresh dev DB (`bun run db:reset && bun run db:migrate`) — verify clean apply.
- Apply the migration against a non-fresh dev DB (one that's been run on `main`'s prior state) — verify clean apply (Drizzle's incremental migration shape).
- `bun typecheck` (the schema-derived types from `src/db/schema.ts` shrink; any caller still reading the dropped columns would have surfaced in commits 1 + 2's typecheck — this commit's typecheck is the final guard).
- `bun lint` passes.
- Full smoke battery passes.

### Migration shape

`ALTER TABLE … DROP COLUMN` x4 + the four-statement `timer_mode` rename-swap + the four-statement `session_type` rename-swap (each: CREATE → ALTER COLUMN → DROP TYPE → RENAME TYPE). No data preservation needed for the column drops (every cut column is either always-default or always-null under v1 application use). The `timer_mode` cast preserves data for existing rows — every value in the column at migration time is either `'standard'` (drill) or `NULL` (non-drill), both valid in the v2 enum. The `session_type` cast likewise — every existing row's `type` value is one of `{'diagnostic','drill','full_length','simulation'}` because the v1 application never wrote `'review'`; the cast cannot fail. **Hand-verify the migration on a non-fresh dev DB** (one with existing diagnostic + drill rows) to confirm both casts in practice; the fresh-DB verification path doesn't exercise either cast meaningfully.

## 6. Commit 4 — Schema table drops + barrel cleanup

### Scope

- New Drizzle migration file (`drizzle/0002_*.sql`). Statements:
  - `DROP TABLE review_queue;`
  - `DROP TABLE strategy_views;`
- Schema file deletions:
  - `src/db/schemas/review/review-queue.ts` — DELETE entire file.
  - `src/db/schemas/ops/strategy-views.ts` — DELETE entire file.
- `src/db/schema.ts` barrel: drop the `reviewReviewQueueSchema` and `opsStrategyViewsSchema` imports + their spread registrations. Atomic with the file deletions.

### Dependencies

Commits 1 + 2 for application-layer readers. Commit 3 not strictly required (column drops vs table drops are independent), but sequencing puts column drops first so the migration count grows monotonically.

### Verification

- Same shape as commit 3: generate, inspect, apply against fresh + non-fresh dev DB.
- `bun typecheck`: the barrel shrinks; the `Db` type in `src/db/schema.ts` no longer carries `reviewQueue` or `strategyViews` keys. Any caller that imported the deleted modules would have surfaced earlier — final typecheck is the guard.
- `bun lint` passes.
- Full smoke battery passes.

### Migration shape

`DROP TABLE` x2. The `review_queue` table has FKs to `users` (CASCADE) and `items` (NO ACTION); `strategy_views` has FKs to `users` and `strategies` (both CASCADE). Drop order doesn't matter under Postgres semantics; Drizzle's generated SQL handles dependency order.

## 7. Commit 5 — SPEC + PRD doc reconciliation + plan close

### Scope

The doc-only round front-loaded the cut markers; this commit tightens them from "stays vestigial in tree" to "dropped from tree" wherever the corresponding code landed.

- `docs/SPEC.md`:
  - §3.2 marker on `users.timer_prefs_json` → "dropped 2026-MM-DD" (column gone). Schema field declaration also pulled from the column table at the top of the section.
  - §3.4 markers on `narrowing_ramp_completed`, `if_then_plan`, `strategy_review_viewed`, `strategy_views` → "dropped 2026-MM-DD." Column table and `strategy_views` subsection updated.
  - §3.5 marker on `review_queue` → "dropped 2026-MM-DD." Subsection content pulled or marked deleted.
  - §3.6 schema barrel: `reviewReviewQueue` + `practiceStrategyViews` (note: actual barrel name is `opsStrategyViews`) registrations removed from the example.
  - §6.2 marker on `toggle_session_timer` + `toggle_question_timer` reducer actions → "dropped." Action union in the example shrinks.
  - §6.6 marker on toggle persistence → "dropped." The "toggleable mid-session?" column entries flip from "yes" to "no — static per session type."
  - §7.1 startSession input shape: `timerMode` narrowed (or dropped); `ifThenPlan` field dropped.
  - §7.4 + §7.5 + §7.8 + §7.15: each marker tightens to reflect the now-dropped or now-confirmed-absent state.
  - §9.2 selection-strategy table: `'review'` row dropped (or struck-through-and-marked-dropped).
  - §10.x walkthrough markers (§10.3, §10.5, §10.6, §10.7): tightened to reflect the now-confirmed-absent state.
  - §2 file-map cut paragraph: each path's on-disk-code-surface state updated from "stays vestigial in tree" to "dropped" where applicable. The two schema files (`review-queue.ts`, `strategy-views.ts`) flip from "stays vestigial" to "dropped this round."

- `docs/PRD.md`:
  - §8.1 schema sketch: drop `narrowing_ramp_completed, if_then_plan` from the `sessions (...)` row; drop the `review_queue (...)` row entirely. The §8.1 cut blockquote marker (added in `832f634`) updates from "stays vestigial in tree" to "dropped from tree this round."
  - §3.2 prose mention of `users.timer_prefs_json` (if present in §8.1 Notes) — drop or mark dropped.

- `docs/plans/phase5-v1-code-cleanup.md` (this plan): status banner flips to "shipped 2026-MM-DD" with all five prior commit hashes filled in.

- `docs/plans/feature-roadmap.md` "Cut from v1 2026-05-04" section: sub-bullet noting "code-surface cleanup landed in `phase5-v1-code-cleanup.md` round" added beneath the section header.

- **Stale-comment hygiene-debt at `src/app/(app)/drill/[subTypeId]/page.tsx:16`** — surfaced by commit-3-close audit (Outcome 1 finding). Current text: "*No timer-mode selector in Phase 3 — only `standard` is wired. Phase 5 adds `speed_ramp` and `brutal` modes.*" Stale relative to v1 cuts (PRD §4.4 + SPEC §3.4 markers — those drill modes are cut, not deferred to Phase 5). One-line update to remove the "Phase 5 adds" forward-looking clause; phrase to match the v1-cut reality.

### Dependencies

Commits 1 + 2 + 3 + 4 — all prior commits must land before the doc reconciliation can describe them as past-tense.

### Verification

Doc-only — `bun lint` + `bun typecheck` pass trivially. The audit re-grep against this commit produces zero surviving references to the deleted code surfaces (matching the shape of the prior round's `832f634` re-grep verification).

### Migration shape

None.

## 9. Sequencing recommendation

Five commits, leaf-first, in the order numbered above. Justifications:

1. **Commit 1 (selection.ts + start.ts) goes first** — server-side throwing-stub deletion has no dependents and surfaces the cleanest typecheck signal (the `_exhaustive: never` assertion is the load-bearing guard that the union narrowing was complete). Landing this first means any application-layer cleanup that ripples from the input-shape narrowing is forced into commit 1's diff rather than scattering across later commits.

2. **Commit 2 (focus-shell internals) goes second** — independent of commit 1 in principle, but landing the server side first avoids a state where the focus shell reads cleaned-up state shapes from a still-unmodified server. The two commits could swap; the recommendation is server-first to match the user's grep-then-delete framing.

3. **Commits 3 + 4 (schema column + table drops) go after the application-layer cleanup** — the migrations must land after every reader is gone, not before. Splitting columns (commit 3) from tables (commit 4) keeps each migration's SQL small and the diff easy to verify, and lets a partial-implementation rollback land at column-drops-only if the table-drop migration surfaces an unexpected issue (it shouldn't — both tables have zero rows under v1 use — but sequencing-for-rollback-friendliness is cheap).

4. **Commit 5 (doc reconciliation) goes last** — code first, doc second, no overlap, per the convention pinned in `phase3-heartbeats-and-cron.md` §6 and SPEC §6.14.11. The doc commit describes shipped reality.

The original 6-commit shape carved a slot for application-layer cleanup-rippling between commits 2 and the schema work; the audit at commit-2-close (see §12.5) confirmed Outcome 1 (commits 1 + 2 rippled cleanly), so the slot was dropped and the round renumbered to five.

## 10. Cross-cutting concerns

### 10.1 Migration discipline

Drizzle migrations are forward-only and committed with the schema files that produce them. Each schema-touching commit (commits 3 + 4) runs `bun run drizzle-kit generate`, inspects the generated SQL by hand for unexpected statements (column reorderings, default-value changes, FK-drop-and-recreate cycles — none should appear for these clean drops), and commits the migration file atomically with the schema-file edits. Dev DB verification is two-phase: fresh DB (`bun run db:reset && bun run db:migrate`) and incremental DB (a DB at the prior state, run the new migration on top). Both must apply cleanly. **No migrations are squashed; the initial migration `0000_typical_golden_guardian.sql` stays untouched.**

### 10.2 Type-checker exhaustiveness

The `_exhaustive: never` pattern at `selection.ts:498–499` (the `getNextItem` strategy switch) and at the reducer's main switch in `shell-reducer.ts` (line ~310 area) are the two type-level guards that catch incomplete union narrowings. Both must continue to compile after their respective commits land. If either fails to compile, the union narrowing left a strategy/action-kind that's unreachable at runtime but still in the type — fix the type before merging.

### 10.3 Testing

Per the round's convention, tests referencing deleted server actions, columns, or reducer state get cleaned up in the same commit as the code they reference. The audit pass found zero `*.test.ts` files referencing any of the cut surfaces (verified by `grep -E "review_queue|strategy_views|timer_prefs_json|narrowing_ramp_completed|if_then_plan|strategy_review_viewed|persistTimerPrefs|dismissPostSession|ErrReviewQueueDeferred|ErrStrategyReviewRequired|toggle_session_timer|toggle_question_timer|ifThenPlan" src/**/*.test.ts` returning empty). Smokes under `scripts/dev/smoke/` likewise — none exercise the cut surfaces. **Testing scope is therefore limited to verifying the existing diagnostic + drill smokes still pass; no new tests need to be written, none deleted.**

### 10.4 SPEC re-reconciliation cadence

The doc-only round (commits ca2330a → 832f634) was the **bulk-reconciliation pass**. This round is back to the standard "code + doc together" convention — each cleanup commit (1–4) lands its scoped SPEC delta atomically; commit 5 absorbs the residual doc work that's better staged separately (the file-map paragraph rewrite, the §8.1 PRD schema sketch update, the plan-close metadata, the roadmap sub-bullet). This is the inverse of the doc-only round's pattern and matches the phase 3 sub-phase cadence.

## 11. Out of scope

- **Phase 5 sub-phase 1 implementation work.** Sub-phase 1 (post-session review surface) is the next round, planned separately after this cleanup round closes. This round excises vestigial code; sub-phase 1 builds new surface. No overlap.
- **(removed 2026-05-04)** ~~`session_type` enum `'review'` value at the database level.~~ Was previously listed as out-of-scope; redlined into scope per §12.4. Migration absorbs into commit 3 alongside `timer_mode`. Both enums get the rename-swap treatment in the same migration file.
- **PRD §4.2 borderline residual** (`Across sessions, items can repeat per the spaced-repetition rules` — flagged in the `832f634` round-close report). Recommendation: leave as-is. The phrase "spaced-repetition rules" is broad enough to cover the v1 adaptive walker's cross-session-recency rules (the 7-day recency-excluded set), even without an SR queue. Tightening the line is a doc-hygiene judgment call that doesn't fit this round's scope. If sub-phase 1 or sub-phase 2 surfaces a sharper interpretation, the line gets tightened then.
- **`drizzle/0000_typical_golden_guardian.sql` revisions.** The initial migration is committed history; cleanup is forward-only via new migration files.
- **Any "while we're in here" cleanup** beyond what the doc-only round explicitly cut. Adjacent code-quality issues that surface during implementation get noted in the commit messages but not addressed in this round.

## 12. Open questions / resolutions

All five resolved.

### 12.1 `timer_mode` enum cardinality — resolved as TRUNCATE to `['standard']`

**Question.** The `timer_mode` column is nullable and would always carry `'standard'` (drill) or `null` (non-drill) under v1 use. The original plan-draft recommendation was "keep the enum 3-valued; tighten application types only" — leaning on the Postgres-can't-drop-enum-values constraint and the v2-reintroduction-cost argument.

**Resolution at redline (2026-05-04): truncate the enum to `['standard']` via the standard Postgres rename-swap pattern, in commit 3 (was commit 4 pre-renumber per §12.5).**

**Rationale (user's redline, recorded verbatim):**

- Postgres-can't-drop-enum-values is true but the operational cost of re-adding values in v2 is trivial: existing rows remain `'standard'`; new sessions write the re-added values. No backfill needed.
- The real cost of keeping 3-valued is permanent schema-vs-application drift — schema carries values the application never writes, future-Claude has to cross-reference cut-from-v1 markers to understand why, and "narrower-than-schema application types" leaves the inconsistency where it'll snag the next refactor.
- Codebase cleanliness compounds; v2-readiness via vestigial enum values is a soft signal anyway. If v2 doesn't return these features, the truncated enum is honest. If v2 returns them in different shapes than v1 had, the v1 enum values would have been wrong to keep.

**Implementation (commit 3 absorbs):** Migration adds the four-statement rename-swap (`CREATE TYPE timer_mode_v2 AS ENUM ('standard'); ALTER TABLE … TYPE timer_mode_v2 USING …::text::timer_mode_v2; DROP TYPE timer_mode; ALTER TYPE timer_mode_v2 RENAME TO timer_mode;`). The schema file's `pgEnum` declaration shrinks to `['standard']` atomically. See §5 for full migration shape + the Drizzle-Kit-may-not-auto-generate-this caveat. Commit 3 absorbs this work alongside the column drops because both touch `practice_sessions` and stay in one migration file. **Round closes at 5 commits** post-renumber (see §12.5).

### 12.2 Audit finding beyond user's prompt scope — `start.ts:93` review-type branch — resolved as INCLUDE in commit 1

**Finding.** The user's prompt scope-list named `start.ts`'s `ifThenPlan` input + `narrowing_ramp_completed` write path, but did NOT explicitly name the review-type branch at line 93 (`if (input.type === "review") { ... }`). The review-type branch is dead code under v1 (no caller invokes `startSession({ type: "review" })`); leaving it in tree contradicts the round's "drop everything cut from v1" thesis.

**Resolution at redline (2026-05-04): include in commit 1.** Audit-finding-beyond-prompt-scope is exactly what the audit-first opening exists to catch. The branch is leaf code, deletes cleanly, no application-layer ripple. Commit 1's scope-list at §3 already names it; this resolution confirms the scope.

### 12.3 PRD §4.2 borderline residual — resolved as LEAVE AS-IS

**Question.** The `832f634` round-close report flagged PRD §4.2 line 170 (`Across sessions, items can repeat per the spaced-repetition rules`) as a borderline-residual.

**Resolution at redline (2026-05-04): leave as-is.** Same reasoning as the architecture-plan body-text drift seeds in the doc round's commit 3 (Option 5): PRD §4.2 describes the durable product shape; SR is cut-from-v1, not cut-permanent; the §4.3 cut marker two paragraphs below carries the v1 authority. Tightening §4.2 would be the compounding-amendments creep the doc round refused once already. Commit 5's PRD scope does NOT include a §4.2 edit.

### 12.4 `session_type` enum cardinality — resolved as TRUNCATE to four values (parallel to §12.1)

**Question.** The plan-amendment for §12.1 truncated the `timer_mode` enum to `['standard']` per the codebase-cleanliness-compounds principle. §2.3's first amendment kept `session_type` asymmetrically at five values (with `'review'` vestigial), framed as a future-revisit breadcrumb. **Should `session_type` get the same treatment?**

Two options surfaced at redline:

- **Option A — Truncate `'review'` from `session_type` in this round.** Same shape as `timer_mode`; folds the rename-swap into commit 3's migration (was commit 4 pre-renumber per §12.5). Rationale: same logic as §12.1; schema-vs-application drift compounds; the cleanliness principle applies to both enums.
- **Option B — Keep `'review'` as-is, future-revisit.** Rationale: `session_type` is the dispatch primary key for the whole engine, structurally different from `timer_mode` (a per-session config flag). Truncating session-type values touches a higher-altitude schema element worth its own deliberate round.

**Resolution at redline (2026-05-04): Option A — truncate.**

**Rationale (recommendation, accepted at redline):**

1. The §12.1 redline rationale ("schema-vs-application drift compounds; codebase cleanliness wins") applies identically — same shape of vestigial-enum-value-with-no-application-writer. Treating the two enums differently would itself be the inconsistency §12.1 pushed back against.
2. Audit confirmed low effort: 8 call sites total, 6 mechanical type-union edits, 2 already in commit 1's scope (the `selection.ts:116` dispatch + the `start.ts:93` branch redlined into commit 1 per §12.2). Migration shape is mechanically identical to `timer_mode` (rename-swap; cast-safe — every existing row's `type` is one of `{'diagnostic','drill','full_length','simulation'}` because v1 never wrote `'review'`).
3. Folding into commit 3 keeps all `practice_sessions` schema changes atomic in one migration file. Splitting `session_type` into a separate cleanup round would mean writing+reviewing+deploying two migrations on the same table — structurally more work for no semantic gain. The Option B "higher-altitude" framing is real but doesn't change the mechanics or the cleanliness principle.

**Implementation:** §2.3 + §3 (commit 1) + §4 (commit 2) + §5 (commit 3) + §11 all updated to reflect the truncation. The 8 call sites distribute as: commit 1 absorbs `selection.ts:74` + `start.ts:60` + `sessions/queries.ts:17` type unions and the `actions.ts:36` zod schema (plus the two dispatch sites already in scope per §12.2); commit 2 absorbs `focus-shell/types.ts:12` + `focus-shell/shell-reducer.ts:120` type unions; commit 3 absorbs the schema enum rename-swap. **Round closes at 5 commits** post-renumber (see §12.5).

### 12.5 Audit outcome at commit-2-close — Outcome 1 (Empty), renumber landed atomically with commit 3

**Question.** The plan reserved an "application-layer barrel + drill route signature alignment" slot as the original commit 3 (§5 pre-renumber) — a possibly-empty slot for cleanup-rippling work that didn't fit into commits 1 + 2. The decision criterion was: audit at commit-2-close determines whether the slot has work (outcome 2 / 3) or stays empty (outcome 1).

**Resolution at audit (2026-05-04, post-commit-`a32131a`): Outcome 1 — Empty.**

**Audit findings (read-only grep across `src/app/`, `src/components/post-session/`, `src/components/mastery-map/`):**

- Zero functional residuals across the deleted-symbol set: `TimerPrefs`, `timerPrefs`, `initialTimerPrefs`, `ifThenPlan`, the toggle action kinds, `ErrReviewQueueDeferred`, `review_queue`, `narrowingRamp`, `persistTimerPrefs`, `dismissPostSession`, `StrategyReviewGate`, `strategy_review_viewed`.
- Zero `as`-cast type assertions on the narrowed types (`StartSessionInput` / `FocusShellProps` / `TimerPrefs` / `SessionType` / `TimerMode` / `SelectionStrategy`) anywhere in `src/app/`. Commits 1 + 2 narrowings flowed through type inference cleanly.
- Three intentional residuals — all explicitly preserved per prior decisions: the drill run page's `timerMode: "standard"` literal (plan §3 wire-shape stability recommendation); the `phase3-smoke/page.tsx:108` historical comment breadcrumb; three `'brutal'` literals at `actions.ts:71` + `ingest-item/route.ts:14` + `_form.tsx:17` referencing the **`item_difficulty`** enum, NOT the cut **`timer_mode`** drill-mode dimension (disambiguation pin).
- One trailing hygiene-debt — the stale Phase-5 comment at `src/app/(app)/drill/[subTypeId]/page.tsx:16` ("*Phase 5 adds `speed_ramp` and `brutal` modes*"). One line, comment-only, no functional code. Folded into the new commit 5's doc-reconciliation scope rather than expanding the cleanup round.

**Renumber decision.** The original §5 (commit 3 application-layer slot) was dropped; §6 → §5 (commit 3 schema migration), §7 → §6 (commit 4 table drops), §8 → §7 (commit 5 doc reconciliation). All cross-references updated in lockstep — every "commit 4" → "commit 3", every "commit 5" → "commit 4", every "commit 6" → "commit 5", §10.4 cleanup-1-to-5 → 1-to-4, §11 commit-4 reference → commit-3, §12.1 + §12.4 implementation pointers updated, §9 sequencing rewritten to drop the possibly-empty slot bullet, the round's overall commit count from "5–6" to **5**. **Heading-numbering gap (§7 → §9):** §§ 9 / 10 / 11 / 12 retained their pre-renumber numbers per the strict scope of the redline directive (only §§ 6 / 7 / 8 were instructed to renumber forward). The gap is the visible artifact of the slot drop — future-Claude reading the plan's TOC sees §7 jump to §9 and knows from this resolution why.

**Implementation:** the renumber landed in the same commit as commit 3's migration work (one bundled commit covers the plan amendment + the schema migration). This kept the round artifact synchronized with the work it describes — same convention as commits 1 + 2's atomic code+SPEC pattern, applied here to plan+code.
