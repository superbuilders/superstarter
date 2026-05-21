# Plan — Phase 3: Practice surface (focus shell, diagnostic, drill, Mastery Map, heartbeats)

> **Status: planning, not yet implemented.** This document is the canonical reference for Phase 3's scope, sequencing, and the design seams that Phase 5 plugs into. Where it disagrees with the SPEC's Phase-3 file map (`docs/SPEC.md` §12 Phase 3 list), this plan wins; the SPEC's longer-horizon descriptions of Phase 5/6 deliverables (triage trainer's full UI, NarrowingRamp, full-length test, strategy-review gate, review queue) carry forward unchanged and are explicitly out of scope here.

Phase 3 is the first commit run where a real human-shaped session can run end-to-end against the bank seeded in Phase 2. The whole Phase 1 schema is reused unchanged; the whole Phase 2 ingest path is reused unchanged. What lands in Phase 3 is everything *between* the user clicking "sign in" and an attempts row hitting the database — the focus shell, the selection engine's first two strategies, the diagnostic gate and flow, the standard-drill flow, the Mastery Map, the post-diagnostic onboarding capture, and the heartbeat + abandon-sweep loop that keeps mastery-recompute honest in serverless.

The single design constraint that runs through every commit below: **any state that controls a future session decision must be derivable from the database on every call**, because Vercel serverless drops in-memory state between invocations. Adaptive tier (Phase 5), recency-excluded set (Phase 3, materialized at session start), and abandonment state (Phase 3, derived from heartbeats + cron) all obey this rule.

## 1. Goal & scope

Nine deliverables, all sequenced across the commits in §10. Each maps one-to-one to a slice of the user-facing happy path.

1. **Session-engine server actions.** `startSession`, `submitAttempt`, `endSession`, plus the in-server `getNextItem` dispatcher. `getNextItem` is keyed on a `selectionStrategy` value derived from `practice_sessions.type` (and, for drills, `timer_mode`). Phase 3 implements `'fixed_curve'` (diagnostic) and a new Phase-3-only `'uniform_band'` (drill) fully; `'adaptive'` and `'review_queue'` are present in the dispatch as throwing stubs (`errors.new("strategy deferred to Phase 5")`) so the switch is exhaustive against the SPEC's enumeration but unreachable from any Phase 3 call site. Phase 5 plugs adaptive in by changing the `drill → strategy` mapping and filling in the `'adaptive'` branch — no call sites move.

2. **`<FocusShell>` client component.** Single React 19 client component, `useReducer` state per `shell-reducer.ts`, session-timer bar + pace track + question-timer bar in periphery, `<ItemPrompt>` in the central content area, persistent triage prompt at the per-question target, inter-question card. Timer loop is `requestAnimationFrame` driven from `performance.now()`. Latency is anchored on a `<ItemSlot>` mount effect (one effect per item, keyed by `currentItem.id`) so first paint of each item is the latency start. The triage prompt **never auto-submits** — the user must click it or press `T`, and the session timer is the only hard cutoff. The per-question timer is plumbed but `questionTimerVisible` is hardcoded `false` in this phase; the toggle UI and the `persistTimerPrefs` write path are Phase 5.

3. **Diagnostic flow.** `/diagnostic` server-renders the first item (untimed at the session level, pace track hidden, per-question target 18000ms so triage prompts still fire), then the FocusShell drives `submitAttempt` for the remaining 49. `getNextItem` reads the deterministic mix from `src/config/diagnostic-mix.ts` indexed by current attempt count. The 15-minute overtime note (`practice_sessions.diagnostic_overtime_note_shown_at_ms`) is recorded by the existing column. After the 50th submit, `endSession` triggers `masteryRecomputeWorkflow` with `source='diagnostic'`.

4. **Diagnostic post-session at `/post-session/[sessionId]`.** Renders `<OnboardingTargets>` (target-percentile + target-date capture) and a "Save and continue" / "Skip for now" pair, then `router.push('/')`. **This is the only post-session review surface in Phase 3.** Drills in Phase 3 do not detour through `/post-session/[sessionId]` at all — `endSession` returns and the FocusShell pushes directly to `/`. The full PostSessionReview composition (wrong-items list, accuracy/latency summary, strategy surfacing) is Phase 5; the full-length strategy-review gate is Phase 5.

5. **Mastery Map at `/`.** Server-rendered. Eleven-icon grid (BookOpen × 5 verbal section, Calculator × 6 numerical section), fill state per `mastery_state.current_state`. Single-line near-goal text via `deriveNearGoal`. One primary CTA, label computed from the recommended next session (lowest-mastery sub-type → drill of that sub-type; if every sub-type is `mastered`, the CTA degrades to "Start full-length test" — but full-length is Phase 5, so for now the CTA falls back to "Start drill: <best-fit sub-type>"). Thirty-day rolling triage adherence in low-contrast periphery via `triageRolling30d`. `alpha-style` skin applies here (and to `/post-session/[sessionId]`); the FocusShell explicitly opts out.

6. **Diagnostic gate in `src/app/(app)/layout.tsx`.** Server-component check: if there is no `practice_sessions` row for the user with `type='diagnostic' AND ended_at_ms IS NOT NULL AND completion_reason != 'abandoned'`, redirect to `/diagnostic`. The check is layout-level on purpose so direct navigation to `/drill/[subTypeId]` is also gated. Edge handling for in-progress and recently-abandoned diagnostics is the load-bearing part — see §9 risk areas.

7. **Standard drill mode at `/drill/[subTypeId]`.** Configure page captures length (5 / 10 / 20, default 10). No timer-mode selector in this phase (only `standard` is wired); the `speed_ramp` and `brutal` modes are Phase 5. No NarrowingRamp (Phase 5). No "default to last-time choice" persistence (Phase 5). At session start, `computeRecencyExcludedSet(userId, nowMs)` materializes the last-7-days item-id set into `practice_sessions.recency_excluded_item_ids`, and `startSession` returns the first item server-rendered. The FocusShell drives the rest. After the last submit, `endSession` and `router.push('/')`.

8. **Heartbeats.** The FocusShell mounts `<Heartbeat sessionId={sessionId} />` which fires `navigator.sendBeacon('/api/sessions/' + sessionId + '/heartbeat', '')` every 30 seconds (via a `setTimeout`-recursion driven from the requestAnimationFrame tick — **not `setInterval`**, per `rules/no-iife.md`-adjacent conventions and the codebase's general avoidance of `setInterval` for renderer-coupled work) plus once on `pagehide`. The route handler at `/api/sessions/[sessionId]/heartbeat` writes `last_heartbeat_ms = Date.now()`, returns 204. The route lives outside the auth-protected matcher per the Phase 2 `.well-known/workflow` precedent — the `proxy.ts` matcher exclusion is extended in the same commit that adds the route (see §7).

9. **Abandon-sweep cron at `/api/cron/abandon-sweep`.** Every minute (`* * * * *`), bearer-auth via `env.CRON_SECRET`. Marks sessions abandoned after **5 minutes since last heartbeat** (the threshold is proposed here; SPEC §7.12 currently writes `120000` as the threshold and that line is corrected by this plan — see §7 below). Sets `ended_at_ms = last_heartbeat_ms + 30000`, `completion_reason = 'abandoned'`. For each finalized session, enqueues `masteryRecomputeWorkflow(sessionId)` so a partially-completed diagnostic still produces useful mastery signal (capped per the diagnostic source rules in §9.3).

## 2. Out of scope

Each item below is named explicitly so a future reader of this plan does not infer scope from silence:

- **Adaptive difficulty tier (`nextDifficultyTier`).** Phase 5. The `'adaptive'` branch of `getNextItem` is a throwing stub here.
- **Brutal and speed-ramp drill modes.** Phase 5. Drill configure UI in Phase 3 does not surface a timer-mode selector.
- **NarrowingRamp (`<ObstacleScan>`, `<VisualNarrowing>`, `<SessionBrief>`, `<LaunchCountdown>`, `suggestObstacleOptions`).** Phase 5.
- **Spaced-repetition queue + review session + `reviewQueueRefreshWorkflow`.** Phase 5. The `'review_queue'` branch of `getNextItem` is a throwing stub. `endSession` does NOT enqueue `reviewQueueRefreshWorkflow` in this phase (the SPEC §7.3 line that lists both workflows is corrected in commit 1: only `masteryRecomputeWorkflow` fires).
- **Question-timer toggle UI and `persistTimerPrefs` write path.** Phase 5. `users.timer_prefs_json` exists from Phase 1 and is read at session start with a default of `{ sessionTimerVisible: true, questionTimerVisible: false }`; no Phase 3 write path.
- **Full-length practice test (`/test`), full-length post-session strategy-review gate (`<StrategyReviewGate>`).** Phase 5.
- **Test-day simulation (`/simulation`), history tab (`/history`), candidate-promotion cron, account deletion (`/settings/delete-account`).** Phase 6.
- **Click-to-highlight in post-session review.** Phase 5/6. The `metadata_json.structuredExplanation` contract and opaque option ids that unlock it shipped in Phase 2 — Phase 3 does not consume the structured form (Phase 3's only review surface is the diagnostic onboarding capture, which renders no per-item explanation).
- **Drill post-session review composition** (wrong-items list, triage score rendering, accuracy/latency summary, surfaced strategies). Phase 5. Drill end pushes straight to `/`.
- **Per-session option shuffling.** Phase 5/6. Opaque ids unlock it; this plan does not build it.
- **Image-bearing item variants and S3 storage.** v2.

## 3. Schema changes

**Phase 3 adds zero columns and zero tables — pending §3.0.** Every column and enum value the user prompt enumerated as load-bearing for Phase 3 *should* already exist from Phase 1, but that is a claim, not a contract. §3.0 below mandates a hard verification step before commit 1 begins; the §3.1–§3.10 subsections each carry a verified-against / verification-pending marker so the next reader sees this is still a real check.

### 3.0 Pre-flight: schema diff (NEW — added in plan v2)

Before commit 1's first line of code lands, run a schema-audit pass against `src/db/schema.ts` (the barrel), `src/db/schemas/**/*.ts` (the individual table files), and `drizzle/0000_*.sql` (the applied migration). The pass confirms every column and enum value that §3.1–§3.10 below claim is "Phase 1 already." Concretely:

```
# Column presence — one grep per column listed in §3.1–§3.9
grep -E '(last_heartbeat_ms|recency_excluded_item_ids|completion_reason|diagnostic_overtime_note_shown_at_ms|if_then_plan|narrowing_ramp_completed|timer_prefs_json|target_percentile|target_date_ms|served_at_tier|fallback_from_tier|triage_prompt_fired|triage_taken|metadata_json|was_mastered)' \
    src/db/schemas/**/*.ts drizzle/0000_*.sql

# Enum value presence — verifies §3.10
grep -E "session_type|completion_reason|item_difficulty|mastery_level|timer_mode" \
    src/db/schemas/**/*.ts
```

**If the diff finds anything missing**, that delta becomes commit 1.0 (a schema-only commit landing the gaps via `bun db:generate` + `bun db:push` per `README.md` §"Human-led Database Migrations") and every later commit number in §10 shifts by one (commit 1 → commit 1.1, commit 2 → commit 2.0, etc.). The §3 subsections that listed the missing column flip from "verified-against" to "added in commit 1.0."

**Verification result at plan v2 publication:** all columns and enum values in §3.1–§3.10 verified-against `drizzle/0000_typical_golden_guardian.sql` and the `src/db/schemas/**/*.ts` files. **No commit 1.0 needed; the §10 commit count stays at 5.** This result is restated per-subsection below for traceability — if a future revision invalidates any of those markers (e.g., a schema change between this plan and Phase 3 kickoff), the per-subsection marker is what gets corrected, and §3.0's "no commit 1.0 needed" claim is what gets revisited.

### 3.1 `practice_sessions.last_heartbeat_ms` — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:132`)

`bigint("last_heartbeat_ms", { mode: "number" }).notNull().default(sql\`(extract(epoch from now()) * 1000)::bigint\`)`. Updated by `recordHeartbeat`. Indexed (partial) by `practice_sessions_abandon_sweep_idx ON (last_heartbeat_ms) WHERE ended_at_ms IS NULL`. Phase 3 reads and writes; no schema migration.

### 3.2 `practice_sessions.recency_excluded_item_ids: uuid[]` — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:136` + `practice_sessions_recency_excluded_gin_idx`)

`uuid("recency_excluded_item_ids").array().notNull().default(sql\`'{}'::uuid[]\`)`. Indexed by `practice_sessions_recency_excluded_gin_idx USING gin`. Phase 3 writes the materialized set at `startSession`; reads it inside `getNextItem` to filter eligible items. No schema migration.

### 3.3 `practice_sessions.completion_reason` (the "abandonment-state column") — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:8,133`)

Implemented as `pgEnum('completion_reason', ['completed','abandoned'])`, nullable until set. The diagnostic gate's filter is `completion_reason != 'abandoned' AND ended_at_ms IS NOT NULL` — both halves matter, since abandoned-and-ended-at-ms-set rows must NOT count as "diagnostic complete." Phase 3 writes `'completed'` from `endSession` and `'abandoned'` from the cron-driven sweep.

### 3.4 `practice_sessions.diagnostic_overtime_note_shown_at_ms` — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:138`)

Nullable `bigint`. Set once by a server action when the FocusShell crosses the 15-minute mark in a diagnostic. Phase 3 wires the write; the substantive overtime feedback lives on the post-session review (Phase 3 deliverable §1.4).

### 3.5 `practice_sessions.if_then_plan` and `practice_sessions.narrowing_ramp_completed` — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:134,135`)

Phase 3 inserts both with safe defaults (`if_then_plan = NULL`, `narrowing_ramp_completed = false`) since the NarrowingRamp does not run in this phase. Phase 5 populates them.

### 3.6 `users.timer_prefs_json` — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:41`)

`jsonb("timer_prefs_json").notNull().default(sql\`'{}'::jsonb\`)`. Phase 3 reads with a hardcoded default object when the column's parsed shape is empty (`{ sessionTimerVisible: true, questionTimerVisible: false }`). No Phase 3 write path; the value is plumbed into the FocusShell's `initialTimerPrefs` prop and, since there is no toggle UI, it never round-trips back to the server in this phase.

### 3.7 `users.target_percentile` and `users.target_date_ms` — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:39,40`)

Both nullable. Written by `saveOnboardingTargets` from the diagnostic post-session form. Read by `deriveNearGoal` for the Mastery Map's near-goal line. The `targetPercentile` column accepts the discrete set `{50, 30, 20, 10, 5}` — enforced at the action layer via `z.enum`-style validation, not at the column level (the column is a plain `integer`).

### 3.8 `attempts.served_at_tier`, `attempts.fallback_from_tier`, `attempts.metadata_json`, `attempts.triage_prompt_fired`, `attempts.triage_taken` — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:107–111`) (revised in plan v2 — triage columns added to this subsection)

Phase 3's `submitAttempt` writes all five. `served_at_tier` and `fallback_from_tier` are dedicated enum columns; `triage_prompt_fired` and `triage_taken` are dedicated booleans (NOT nested inside `metadata_json` — see §4.5 for the read-path contract that consumes them). The `metadata_json.fallback_level` field carries the four-state value `'fresh' | 'session-soft' | 'recency-soft' | 'tier-degraded'` — the value flows from `getNextItem` through `ItemForRender.selection` to the FocusShell and back via `SubmitAttemptInput.selection`. Phase 3 only ever writes `'fresh'` and `'session-soft'` (recency-soft and tier-degraded require fallback chains the diagnostic and uniform_band drills only encounter at the seed-bank's edges — which they do; see §8 pre-flight check).

### 3.9 `mastery_state` and `mastery_state.was_mastered` — **Phase 1 already** (verified-against `drizzle/0000_typical_golden_guardian.sql:114–124`)

Phase 3 writes via `recomputeForUser(userId, subTypeId, source)` from `masteryRecomputeWorkflow`. `was_mastered` is set to `true` (idempotently) the first time `current_state` becomes `'mastered'` or `'decayed'`. Diagnostic-source recomputes never set `current_state = 'mastered'` per `sourceParams('diagnostic')` (`allowMastered: false`), so a user finishing the diagnostic always lands in `learning` or `fluent` for every sub-type they attempted ≥3 of.

### 3.10 Enum coverage (NEW — added in plan v2)

The §4.1 dispatch's exhaustive switch over `SessionType` only type-checks if every value is present in the `session_type` enum, and the post-session route's redirect logic reads `completion_reason` against both possible values. Verify before commit 1 begins:

- `pgEnum('session_type', [...])` contains all five values: `'diagnostic'`, `'drill'`, `'full_length'`, `'simulation'`, `'review'`. **Verified** at `src/db/schemas/practice/practice-sessions.ts:16–22` and `drizzle/0000_typical_golden_guardian.sql:6` (CREATE TYPE statement).
- `pgEnum('completion_reason', [...])` contains both values: `'completed'`, `'abandoned'`. **Verified** at `src/db/schemas/practice/practice-sessions.ts:26` and `drizzle/0000_typical_golden_guardian.sql:8`.
- `pgEnum('item_difficulty', [...])` contains all four values: `'easy'`, `'medium'`, `'hard'`, `'brutal'`. Required by the §4.3 `'uniform_band'` initial-tier table and the §4.2 `'fixed_curve'` tier-degraded fallback. **Verified** at `src/db/schemas/catalog/items.ts:7`.
- `pgEnum('mastery_level', [...])` contains all four values: `'learning'`, `'fluent'`, `'mastered'`, `'decayed'`. Required by the §6.3 Mastery Map's icon fill state and §4.3's initial-tier lookup. **Verified** at `src/db/schemas/practice/mastery-state.ts:5`.
- `pgEnum('timer_mode', [...])` contains `'standard'` (Phase 3 ships only this value, but `'speed_ramp'` and `'brutal'` must already be present so Phase 5 doesn't break the existing column type). **Verified** at `src/db/schemas/practice/practice-sessions.ts:24`.

If any value is missing on the next pass of §3.0, add the missing values to the enum in commit 1.0 (a `CREATE TYPE ... ADD VALUE` migration) — the §10 commit count then shifts as described in §3.0.

## 4. Selection engine — design

### 4.1 Strategy dispatch and the Phase-3-only `'uniform_band'` strategy

`getNextItem(sessionId)` lives at `src/server/items/selection.ts` and dispatches over a strategy id resolved from the session row. The mapping function:

```ts
function selectionStrategyForSession(type: SessionType, timerMode: TimerMode | null): SelectionStrategy {
    if (type === "diagnostic") return "fixed_curve"
    if (type === "drill") return "uniform_band"  // Phase 5 changes this to "adaptive"
    if (type === "full_length" || type === "simulation") return "fixed_curve"
    if (type === "review") return "review_queue"
    // exhaustiveness check: adding a new session_type fails the compile here
    const _exhaustive: never = type
    return _exhaustive
}
```

The dispatch:

```ts
async function getNextItem(sessionId: string): Promise<ItemForRender | undefined> {
    // ... read session row, count attempts, etc.
    switch (strategy) {
        case "fixed_curve":  return getNextFixedCurve(/* ... */)
        case "uniform_band": return getNextUniformBand(/* ... */)
        case "adaptive":     {
            logger.error({ sessionId, strategy }, "adaptive strategy invoked in phase 3")
            throw errors.new("adaptive strategy deferred to phase 5")
        }
        case "review_queue": {
            logger.error({ sessionId, strategy }, "review_queue strategy invoked in phase 3")
            throw errors.new("review_queue strategy deferred to phase 5")
        }
    }
}
```

Both stub branches are reachable only by reflection — no Phase 3 call site sets a session up to land there. They throw rather than return `undefined` because returning `undefined` would silently end a session early; throwing fails loud.

### 4.2 `'fixed_curve'` for diagnostic

Reads `diagnosticMix[attemptCount]` from `src/config/diagnostic-mix.ts`. Filters items by `(sub_type_id, difficulty, status='live')`, removes any id in the union of `practice_sessions.recency_excluded_item_ids` and the in-session attempted set (a single SQL query joining `attempts` to the current session). Returns one row, ordered by `id` desc with a small jitter (`ORDER BY md5(id::text || $sessionIdSalt)` so two diagnostics from the same user pull deterministically different items per slot — the salt is `sessionId`).

The recency-excluded set + within-session-attempted set IS the diagnostic's tier-degradation surface. When the requested `(sub_type_id, difficulty)` returns zero rows after exclusion, fall back per SPEC §9.2: try without recency-exclusion (within-session-only), then try with the next-easier tier (`hard → medium → easy`), recording `fallback_level` accordingly. The diagnostic is hand-tuned and seed-coverage-sensitive; tier degradation is expected on numerical mediums (see §8).

### 4.3 `'uniform_band'` for Phase-3 drills

The simplest correct selection for a non-adaptive drill: pick a single difficulty band at session start (the SPEC §9.1 initial-tier rule, applied to the user's `mastery_state.current_state` and `was_mastered` for this sub-type), and stay in that band for the whole drill. Within the band, sample uniformly at random from `(sub_type_id, difficulty=band, status='live')` minus the recency-excluded ∪ within-session-attempted set. No tier walking, no fallback ladder beyond the standard recency-exhaustion fallback (`fresh → session-soft → recency-soft → tier-degraded one step easier`).

The chosen band is **not stored on the session row** — it's recomputed every call from the same inputs (`mastery_state` + `timer_mode`), per the serverless-state-derivation rule. New users (no `mastery_state` row for this sub-type, which is the default after the diagnostic since diagnostic-source mastery never assigns `mastered`): default to `medium` per SPEC §9.1's "new users" line.

This is the architectural seam Phase 5 plugs adaptive into. Phase 5's diff:
- `selectionStrategyForSession` returns `'adaptive'` for `drill`.
- The `'adaptive'` branch becomes a real implementation that calls `nextDifficultyTier` over the user's last-10 in-session attempts and walks the tier each call.
- The `'uniform_band'` branch is removed (or kept as a manual-test/escape hatch — author's call at Phase 5 time).

The `'uniform_band'` value is intentionally not added to a public-facing config or surfaced to the user; it lives only as an internal switch case in `selection.ts`. A code comment documents it as Phase-3-only.

### 4.4 `ItemForRender.selection` and the request/response loop

`getNextItem` returns `{ id, body, options, selection: { servedAtTier, fallbackFromTier?, fallbackLevel } }`. The FocusShell holds `selection` opaque and echoes it back in `SubmitAttemptInput.selection` on the next submit. `submitAttempt` writes `served_at_tier`, `fallback_from_tier`, and `metadata_json.fallback_level` from the echoed value. **No serverless state survives across calls** — the values travel through the request/response cycle exactly once, which is what the SPEC §7.4 echo-back design solves for.

### 4.5 Triage adherence storage contract (NEW — added in plan v2)

`triageScoreForSession(sessionId)` and `triageRolling30d(userId)` (both in `src/server/triage/score.ts`, both shipped in commit 1) need a stable read path. The storage contract:

- **`attempts.triage_prompt_fired: boolean`** — written by `submitAttempt` from `SubmitAttemptInput.triagePromptFired`. The FocusShell sets this to `true` when the per-question `elapsedQuestionMs` crossed `perQuestionTargetMs` (18000ms in Phase 3) at any point before the user submitted, otherwise `false`. Source-of-truth lives in the reducer's `triagePromptFired` flag (§5.2 / SPEC §6.7).
- **`attempts.triage_taken: boolean`** — written by `submitAttempt` from `SubmitAttemptInput.triageTaken`. The FocusShell sets this to `true` only when the user clicked the prompt OR pressed `T` AND the take landed within 3000ms of `triagePromptFiredAtMs` (the 3-second window from PRD §6.1, mirrored in the §5.2 reducer's `triage_take` action handler). Otherwise `false`. **Submitting normally — even with the prompt visible — does NOT count as taking it**; the user has to make the deliberate take action.

Note: these two booleans are **dedicated columns on `attempts`**, not nested inside `metadata_json`. This was confirmed against the schema in §3.8's verification — an early draft of this contract proposed JSON-blob storage, which would have required a `jsonb` parse on every rolling-30-day read. The native columns let `triageRolling30d` reduce to a single indexed scan.

Adherence formula: `triage_taken_count / triage_prompt_fired_count` over the last 30 days, joined to `practice_sessions` for the user.

```sql
-- triageRolling30d query shape
SELECT
    SUM(CASE WHEN a.triage_taken THEN 1 ELSE 0 END)        AS taken,
    SUM(CASE WHEN a.triage_prompt_fired THEN 1 ELSE 0 END) AS fired
FROM attempts a
JOIN practice_sessions s ON s.id = a.session_id
WHERE s.user_id = $1
  AND a.id >= uuidv7LowerBound($now_ms - 30 * 86400000)
```

The 30-day window is range-scanned via the UUIDv7 lower-bound trick (`src/db/lib/uuid-time.ts`), so no `created_at_ms` column is needed (and none exists, per `rules/no-timestamp-columns.md`).

`triageScoreForSession` returns `{ fired, taken, ratio: number | null }` per SPEC §9.7: `ratio` is `taken / fired` when `fired >= 3`, otherwise `null` (the small-sample branch). `triageRolling30d` returns the same shape with the same small-sample threshold. The Mastery Map's low-contrast triage adherence indicator (§6.3) renders `ratio` if non-null, otherwise the small-sample text per PRD §5.2.

## 5. FocusShell — design

The SPEC §6 spec is correct as-written for Phase 3 except for two simplifications this plan calls out:

### 5.1 Per-question timer is plumbed but disabled

The `<QuestionTimerBar>` component is built and mounted inside the shell's grid `footer` area, but its visibility prop comes from `timerPrefs.questionTimerVisible` which is hardcoded `false` by the Phase 3 server-action default (no read of `users.timer_prefs_json` actually flips it true since there's no write path). The reducer's `toggle_question_timer` action is wired but unreachable from any Phase 3 UI. Phase 5 adds the toggle UI and the `persistTimerPrefs` server action.

### 5.2 Triage prompt is non-auto-submitting and load-bearing on the BrainLift

This is the part of the design that is most-likely to be eroded by future "let's auto-submit at 30 seconds, the user clearly froze" PR comments. **Do not.** The triage prompt's pedagogical value is exactly that the user has to make the decision to abandon — auto-submit teaches the reflex away. The session-timer is the only hard cutoff. Implementation:

- When `elapsedQuestionMs >= perQuestionTargetMs` (18000ms for diagnostic and standard drill) and `triagePromptFired` is false, the reducer flips it true and captures `triagePromptFiredAtMs = elapsedQuestionMs`. The `<TriagePrompt>` overlay fades in and stays mounted until the next item paints.
- The user takes the prompt by clicking it OR pressing `T`. Both paths dispatch `triage_take`, which auto-submits the currently-selected option (or, if none selected, picks one at random per PRD §6.1) and marks `triageTaken = true` if the take landed within 3000ms of the prompt firing.
- The prompt does not auto-submit on its own at any elapsed time. The visual intensity may subtly increase between 18s and 30s and then plateau, but no behavior change.

### 5.3 Latency anchor on `<ItemSlot>` mount

Each item is rendered inside an inner `<ItemSlot>` keyed by `currentItem.id`. A `useEffect` with no dependency list (so it re-runs every mount) inside `<ItemSlot>` captures `performance.now()` and stores it in the reducer as `questionStartedAtMs`. On `submit`, the click handler reads `performance.now()` and computes `latencyMs = submitNow - questionStartedAtMs`. Math.floor at the boundary because `attempts.latency_ms` is `integer`.

The reason this lives on `<ItemSlot>` and not on `<FocusShell>`: `<FocusShell>` mounts once per session, so its mount effect fires only on the first item. `<ItemSlot>`'s key change forces React to remount on every item swap, which re-runs the effect at first paint of each new item. **If anyone refactors the shell to lift `<ItemSlot>` into a non-keyed render, latency capture silently breaks** — see §9 risk areas.

### 5.4 Heartbeat mounting

The `<Heartbeat sessionId={sessionId} />` is a sibling of `<ItemSlot>` inside `<FocusShell>`. It mounts once per session. Its body is a `useEffect` that:

- Schedules the next beacon via `setTimeout(send, 30_000)` (recursive — each `send` re-schedules itself). **Not `setInterval`** because the codebase avoids `setInterval` for renderer-coupled work (timer drift, tab-throttling); a recursive `setTimeout` paired with `performance.now()` ticks gives the same cadence with cleaner cancellation.
- Adds a `pagehide` listener that fires the same beacon synchronously.
- Cleanup: clears the timeout and removes the listener.

The beacon body is empty; the URL itself carries the sessionId. The handler at `/api/sessions/[sessionId]/heartbeat` reads sessionId from the route param, runs an idempotent UPDATE, returns 204.

## 6. Diagnostic, post-session, Mastery Map, drill — flow detail

### 6.1 `/diagnostic` flow

1. `/diagnostic/page.tsx` (server component, NOT async per `rules/rsc-data-fetching-patterns.md`) initiates `startSession({ type: "diagnostic" })`. The action's promise is passed into `/diagnostic/content.tsx` ("use client") which consumes it via `React.use()`.
2. `startSession` resolves the user via `auth()`, computes the recency-excluded set (empty for a brand-new user), inserts the `practice_sessions` row, and synchronously calls `getNextItem` to return the first item alongside the `sessionId`.
3. `<FocusShell>` mounts with `sessionDurationMs: null`, `perQuestionTargetMs: 18000`, `paceTrackVisible: false`, `targetQuestionCount: 50`, the first item server-rendered into the page response.
4. After each submit, `submitAttempt` writes the `attempts` row and returns `{ nextItem }`. After the 50th submit returns `{ nextItem: undefined }`, the shell calls `endSession` and `router.push('/post-session/' + sessionId)`.
5. `endSession` triggers `masteryRecomputeWorkflow(sessionId)` (fire-and-forget). The user is not waiting on it.
6. The 15-minute overtime note is recorded by a thin server action (`recordDiagnosticOvertimeNote(sessionId)`) called once from the reducer when `elapsedSessionMs` first crosses 900000. Idempotent at the column level (`UPDATE WHERE diagnostic_overtime_note_shown_at_ms IS NULL`).

### 6.2 `/post-session/[sessionId]` (diagnostic only)

Server component reads the session row and the count of distinct sub-types touched. If `session.type !== 'diagnostic'`, immediately `redirect('/')` — Phase 3 has no other post-session content to render.

For diagnostic sessions, render `<OnboardingTargets>` (a small client component with two fields: target percentile from `{50, 30, 20, 10, 5}` and target date as a date picker). Primary "Save and continue" button calls `saveOnboardingTargets({ targetPercentile, targetDateMs })` then redirects to `/`. "Skip for now" link redirects to `/` without saving. Both flows touch `users` rows.

The diagnostic post-session is also where the substantive 15-min-overtime feedback would appear if the column was set — a single low-key paragraph, no graph. Phase 3 ships the column write but renders the text only as a one-liner under the form.

### 6.3 `/` Mastery Map

Server-rendered. The page initiates four parallel promises (per `rules/rsc-data-fetching-patterns.md`'s promise-drilling pattern):

- `masteryStatesPromise` — `SELECT sub_type_id, current_state FROM mastery_state WHERE user_id = $1`. Empty for a user who has not completed the diagnostic, but the `(app)/layout.tsx` gate redirects before this page renders so the empty case is unreachable.
- `userTargetsPromise` — `SELECT target_percentile, target_date_ms FROM users WHERE id = $1`.
- `triageRolling30dPromise` — `triageRolling30d(userId)` from `src/server/triage/score.ts`.
- `recommendedNextSessionPromise` — derives the lowest-mastery sub-type (with deterministic tie-break: lexicographic `sub_type_id`) for the primary CTA label.

The four promises are passed to a "use client" `<MasteryMap>` component which `React.use()`-consumes them. The grid is two row groups (verbal × 5 with `BookOpen` from `lucide-react`, numerical × 6 with `Calculator`); each icon's fill state is tied to `current_state` (`mastered` filled, `fluent` half-filled, `learning` outlined, no row → "not yet attempted" locked-style render). No percentages, no numbers, no scores beneath the icons — per PRD §5.2.

### 6.4 `/drill/[subTypeId]`

1. `/drill/[subTypeId]/page.tsx` (server component) is the configure page. Validates the `subTypeId` param against `subTypeIds` from `src/config/sub-types.ts`; on miss, `notFound()`. Renders a small form: length (5 / 10 / 20, default 10). On submit, the form action navigates to `/drill/[subTypeId]/run?length=N`.
2. `/drill/[subTypeId]/run/page.tsx` (server component) initiates `startSession({ type: "drill", subTypeId, timerMode: "standard", drillLength })` — this materializes the recency set, picks the band per §4.3, returns the first item.
3. `<FocusShell>` mounts with `sessionDurationMs = drillLength * 18000`, `paceTrackVisible: true`, `targetQuestionCount: drillLength`.
4. After the last submit, `endSession` then `router.push('/')`. **No detour through `/post-session/[sessionId]`** in Phase 3.

### 6.5 The `(app)/layout.tsx` diagnostic gate

```ts
// pseudo
const session = await auth()
if (!session?.user?.id) redirect("/login")

const completedDiagnostic = await db.select({ ok: sql<number>`1` })
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

> **Implementation note (added post-implementation).** The plan's pseudo-code shows
> `async layout` with `await auth()` at the top. `next.config.ts` sets
> `cacheComponents: true`, which trips a runtime error on awaits not nested
> under a Suspense boundary. The actual implementation Suspense-wraps an async
> inner component: outer layout is sync and returns
> `<Suspense fallback={null}><Inner gatePromise={...}>{children}</Inner></Suspense>`.
> `redirect()` still throws before any HTML streams so the gate semantics are
> unchanged. Phase 5 layouts adopting the same gate pattern should mirror this
> structure.

The gate must **not** apply to `/diagnostic` itself or `/post-session/[sessionId]` — those routes live OUTSIDE `(app)/`. Concretely, the route group structure is (revised in plan v2 — `(diagnostic-flow)/layout.tsx` made explicit, login confirmed):

- `src/app/(app)/layout.tsx` (NEW in commit 4) → auth check + diagnostic-completed gate, wraps `/`, `/drill/...`.
- `src/app/(diagnostic-flow)/layout.tsx` (NEW in commit 4) → auth check ONLY (`if (!session?.user?.id) redirect("/login")`); does NOT run the diagnostic-completed gate. This is the layout that lets `/diagnostic` and `/post-session/[sessionId]` render for a user who has not yet completed the diagnostic. Without this file, Next.js falls back to the root layout and the auth check has to live on every page in the group — fragile.
- `src/app/(diagnostic-flow)/diagnostic/page.tsx` (NEW in commit 4) → diagnostic flow.
- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` (NEW in commit 4) → diagnostic post-session.
- `src/app/login/page.tsx` — **already exists** (verified at `src/app/login/page.tsx`; Phase 1/2 shipped a single-button Google OAuth via `signIn("google", { redirectTo: "/" })`). No Phase 3 change to this file.

This is the cleanest way to express "auth required, but diagnostic-completed not required" for the diagnostic flow itself; alternatives (a path-prefix check inside `(app)/layout.tsx`) are fragile and easy to break by accident. See §9 risk areas for the redirect-loop edges this layout structure prevents.

## 7. Heartbeats & abandon-sweep — design and proxy carve-out

### 7.1 Heartbeat route

`src/app/api/sessions/[sessionId]/heartbeat/route.ts`. POST handler. Reads `sessionId` from the route param. Runs:

```sql
UPDATE practice_sessions
SET last_heartbeat_ms = $now
WHERE id = $1 AND ended_at_ms IS NULL
```

Returns 204 regardless of whether the row updated (idempotent, no leakage of session existence to a user who happens to know a sessionId). Does not call `auth()` — the route is on the public side of the proxy. Even if leaked, the only damage is "session marked alive longer," which the cron resolves on the next sweep.

### 7.2 `proxy.ts` matcher exclusion

The current `src/proxy.ts` excludes `_next/static`, `_next/image`, `favicon`, and `\\.well-known/workflow/` from the matcher. The heartbeat route gets the same treatment — added to the matcher exclusion regex rather than to `PUBLIC_PREFIXES`, so the proxy never invokes `auth()` for this path (avoiding a per-30s DB hit on the auth_sessions table given `session: { strategy: "database" }`).

```ts
matcher: ["/((?!_next/static|_next/image|favicon|\\.well-known/workflow/|api/sessions/[^/]+/heartbeat).*)"]
```

The `/api/cron/...` paths stay on `PUBLIC_PREFIXES` (proxy runs but skips the redirect) since they're hit at most once per minute and the auth() overhead is irrelevant. The heartbeat is hit 120× per session.

### 7.3 Abandon-sweep cron

`src/app/api/cron/abandon-sweep/route.ts`. Bearer-auth via `Authorization: Bearer ${env.CRON_SECRET}`. The handler runs:

```sql
UPDATE practice_sessions
SET ended_at_ms = last_heartbeat_ms + 30000,
    completion_reason = 'abandoned'
WHERE last_heartbeat_ms < ($now_ms - 300000)  -- 5 minutes
  AND ended_at_ms IS NULL
RETURNING id, user_id
```

For each finalized session, enqueue `masteryRecomputeWorkflow(sessionId)` (fire-and-forget — the cron returns 204 immediately).

**Threshold rationale.** SPEC §7.12 currently writes `120000` (2 minutes). This plan corrects that to `300000` (5 minutes) on the grounds that:

- Heartbeats fire every 30 seconds. Two minutes is four heartbeats — well within the noise of a flaky network or a backgrounded tab.
- `navigator.sendBeacon` delivery is best-effort under `pagehide`; some browsers throttle or drop it.
- The cost of a false-abandon is a real one: it finalizes the session with `completion_reason='abandoned'` and triggers `masteryRecomputeWorkflow`, which writes a possibly-misleading mastery state from a still-in-progress run.
- The cost of a true-abandon being detected at 5 minutes instead of 2 is negligible — the user has already left.

Five minutes (10 missed heartbeats) is the conservative call. The `vercel.json` cron schedule remains `* * * * *` so detection latency is at most 60s past the threshold.

`vercel.json` is added in the same commit as the cron route:

```json
{ "crons": [{ "path": "/api/cron/abandon-sweep", "schedule": "* * * * *" }] }
```

## 8. Pre-flight check — diagnostic coverage of the 55 hand-seeded items

The 55 hand-seeded items in `src/db/seeds/items/data/*.ts` are 11 sub-types × 5 items each, with a fixed per-sub-type difficulty mix of 2 easy + 2 medium + 1 hard (verified by `grep -c '"difficulty":' src/db/seeds/items/data/*.ts`). All 55 carry hand-written explanations. Phase 3 must not block on stage-2 explanations being generated for the 99 stage-1 OCR items, so the diagnostic must run end-to-end against the 55-item bank alone.

The diagnostic mix in `src/config/diagnostic-mix.ts` demands per sub-type:

| sub-type group | demand per sub-type | sub-types | total |
|---|---|---|---|
| verbal (5 sub-types) | 1 easy + 2 medium + 1 hard = 4 | 5 | 20 |
| numerical (6 sub-types) | 1 easy + 3 medium + 1 hard = 5 | 6 | 30 |
| | | | **50** |

Cross-checking against the 55-item bank (2 easy + 2 medium + 1 hard per sub-type):

- **Verbal sub-types**: demand 1e + 2m + 1h, supply 2e + 2m + 1h. Clean fit. No fallback needed. ✅
- **Numerical sub-types**: demand 1e + 3m + 1h, supply 2e + 2m + 1h. **Medium is one short per sub-type**; six sub-types × one missing = 6 of 50 diagnostic slots cannot be filled by the medium tier without exhausting it.

The expected behavior under the 55-item bank: for each numerical sub-type's third medium slot, `getNextItem` runs the recency/within-session exclusion and finds zero remaining medium items, then falls back per §4.2 — first to within-session-only (still zero, since both mediums are already attempted), then to `recency-soft` (still zero), then to `tier-degraded` one step easier (`medium → easy`). The diagnostic still serves 50 items; six of them are served at `easy` with `attempts.fallback_from_tier = 'medium'` and `metadata_json.fallback_level = 'tier-degraded'`. Mastery computation uses `served_at_tier` (per SPEC §9.1's stated semantic) so the user's experienced tier is what counts.

**Recommendation: ship Phase 3 against the 55-item bank as-is**, and accept the six tier-degraded slots in numerical mediums. Two reasons:

1. Mastery computation is robust to it (latency-thresholded, accuracy-thresholded; an extra easy doesn't push a user falsely toward `mastered` because diagnostic-source mastery cannot assign `mastered` at all).
2. The alternative (hand-seeding 6 more medium numerical items, one per sub-type) is real authoring work and re-runs through the embedding-backfill workflow; pushing it into Phase 3's critical path costs more than it buys. If Phase 3's diagnostic UX feels under-calibrated in dev testing, the seed expansion is a one-commit follow-up.

A smoke test added in commit 1's verification step (§10) runs the diagnostic against the seed bank end-to-end and counts `attempts.metadata_json->>'fallback_level' = 'tier-degraded'` on the resulting session, expecting ≤ 6.

## 9. Risk areas

### 9.1 Latency-anchor correctness on `<ItemSlot>` mount

The latency capture lives on `<ItemSlot>`'s keyed mount effect. If a future refactor lifts `<ItemSlot>` into a non-keyed render (or fuses it back into `<FocusShell>`), the mount effect runs once per session instead of once per item, and every item's `latencyMs` becomes "time since session start," silently. Mitigation: a code comment on `<ItemSlot>` documenting the load-bearing key, and a runtime sanity-check inside `submitAttempt` that throws on `latencyMs > 5 minutes` (since no individual item should ever produce that). The runtime check is a tripwire, not the contract — the contract is the keyed mount.

### 9.2 Serverless state derivation for non-adaptive drills

The `'uniform_band'` strategy recomputes the band from `mastery_state` on every `getNextItem` call. If a recompute lands during a drill (which would not happen in Phase 3 since `masteryRecomputeWorkflow` only fires from `endSession` and the abandon-sweep, both of which run after a session terminates), the band could shift mid-drill. Mitigation in Phase 3: nothing, because the order-of-operations naturally prevents it. Mitigation if Phase 5's adaptive lands and a similar concern resurfaces: persist the resolved tier on `attempts.served_at_tier` (already done) and read backwards from there if mastery has changed since session start.

### 9.3 Heartbeat-vs-cron race window

A user can submit their last attempt at T=4:55 (within the 5-minute threshold), `endSession` fires at T=4:55.5, and the cron runs at T=5:00 — between `endSession`'s start and its commit, the cron's UPDATE could finalize the same session as `'abandoned'`. The mitigation is in the cron's WHERE clause: `ended_at_ms IS NULL` means a session that `endSession` already wrote to (with `completion_reason='completed'` and `ended_at_ms` set) is excluded from the sweep. The race window is the brief moment when `endSession`'s SET clause has not yet committed — Postgres' default isolation prevents the cron from seeing the half-written row. The two writers cannot both succeed; whichever commits second hits the `ended_at_ms IS NULL` filter and no-ops.

There is one residual case: if `endSession` itself runs an idempotent guard (`WHERE ended_at_ms IS NULL`), a successful cron-finalize-as-abandoned BEFORE `endSession` commits will cause `endSession`'s UPDATE to no-op. The user sees the post-session screen (because the FocusShell's `router.push` fires before the action's resolution propagates back), but the session row says `'abandoned'`. Mastery recompute fires twice (once from cron, once from `endSession`), but `recomputeForUser` is idempotent on the same input window, so the final `mastery_state` is correct. The user-visible artifact is a `'abandoned'` row in `practice_sessions` for what felt like a completed run. Acceptable — the alternative (transactional locking between cron and endSession) is over-engineering for an edge case that requires the user to be exactly at the 5-minute mark when they submit their last item.

### 9.4 Diagnostic-gate redirect-loop edges

Two failure modes:

- **In-progress diagnostic.** A user starts a diagnostic, navigates away to `/`, comes back. The gate's filter (`ended_at_ms IS NOT NULL AND completion_reason != 'abandoned'`) doesn't match the in-progress row, so the user is redirected to `/diagnostic`. `/diagnostic/page.tsx` (which lives outside the `(app)` group, so no gate) calls `startSession`, which creates a fresh diagnostic — the old in-progress one is orphaned forever (or until the cron sweeps it). Mitigation: at the top of `/diagnostic/page.tsx`, before calling `startSession`, query for an in-progress diagnostic session for this user and if found, either resume it (pass its sessionId + a re-fetched current item to `<FocusShell>`) or — if `last_heartbeat_ms < $now - 300000` — finalize it as abandoned synchronously and proceed with a fresh start. Resume vs. abandon-then-restart: resume is the better UX but requires "fast-forward to the right item index" logic; abandon-then-restart is simpler. Phase 3 ships abandon-then-restart with a small UI note ("we couldn't recover your previous diagnostic session — starting a fresh one"). Resume is a Phase 5 polish item if the abandon-then-restart UX feels rough in testing.

- **Recently-abandoned-but-not-swept diagnostic.** A user starts a diagnostic, closes the tab, returns immediately (before the cron has finalized the session). The gate filter sees `ended_at_ms IS NULL`, redirects to `/diagnostic`. Same code path as in-progress — the abandon-then-restart logic at the top of `/diagnostic/page.tsx` finalizes the orphan and starts fresh. The cron's eventual sweep of the same row no-ops because `ended_at_ms IS NOT NULL` after the synchronous finalize.

The general shape of the mitigation: one query at the top of `/diagnostic/page.tsx` that finalizes any stale in-progress diagnostic for this user, then proceeds. The query is cheap (the `practice_sessions_user_type_ended_idx` index covers it).

## 10. Sequencing and commits

Five commits, in this order. Each is independently testable and lands a self-contained checkpoint. **Stop and report after each commit; do not start the next one until the listed verification has been signed off.**

### Commit 1 — `feat(server): selection engine + recency materialization + session lifecycle actions`

Scope: server-only. No UI changes. No route handlers.

Files added/modified:
- `src/server/items/selection.ts` (NEW) — `selectionStrategyForSession`, `getNextItem`, `getNextFixedCurve`, `getNextUniformBand`, throwing stubs for `'adaptive'` and `'review_queue'`. Exports the `ItemForRender`, `ItemSelection`, `SelectionStrategy` types.
- `src/server/items/recency.ts` (NEW) — `computeRecencyExcludedSet(userId, nowMs)` running the UUIDv7-lower-bound query joining `attempts` to `practice_sessions`.
- `src/server/items/queries.ts` (NEW) — colocated Drizzle prepared statements used by `selection.ts`.
- `src/server/sessions/{queries,start,submit,end}.ts` (NEW) — the server-side bodies of the actions. `endSession`'s server-side body accepts an optional `{ skipWorkflowTrigger?: boolean }` flag (default `false`) that, when `true`, skips the `start(masteryRecomputeWorkflow, ...)` call and writes the session-end columns only. This flag is the dev/test escape hatch documented in the commit-1 smoke below; it is **NOT** exposed via `src/app/(app)/actions.ts:endSession` (the server action), only through a direct import of the underlying function from `src/server/sessions/end.ts`. No real Phase 3 call site imports the underlying function. (revised in plan v2 — added the flag)
- `src/server/triage/score.ts` (NEW) — `triageScoreForSession` + `triageRolling30d` per the §4.5 storage contract; both read `attempts.triage_prompt_fired` and `attempts.triage_taken` directly (native columns, not `metadata_json`-nested) and return `{ fired, taken, ratio: number | null }` with the `fired >= 3` small-sample threshold from SPEC §9.7.
- `src/server/mastery/{compute,recompute,near-goal}.ts` (NEW) — pure-function mastery + the recompute upsert.
- `src/workflows/mastery-recompute.ts` (NEW) — Vercel Workflow wrapping `recomputeForUser` over distinct sub-types in a session.
- `src/app/(app)/actions.ts` (NEW) — `"use server"` file exporting `startSession`, `submitAttempt`, `endSession`, `recordDiagnosticOvertimeNote`, `saveOnboardingTargets`. The server-action `endSession` always passes `skipWorkflowTrigger: false` (i.e., always fires the workflow); the flag is reachable only by direct import of the underlying function in dev/test paths. Each action follows the `errors.try` + `logger.error` + `errors.wrap` pattern; each calls `revalidatePath` after writes (except `saveOnboardingTargets` which calls `revalidatePath('/')`).

Smoke tests (the explicit checkpoint criterion):
- `bun lint && bun typecheck` — both clean.
- `bun test src/server/mastery/compute.test.ts` (NEW) — round-trip tests for diagnostic-source vs. ongoing-source rules, covering the 3-attempt threshold, 1.5× latency relaxation, and the `mastered` ban for diagnostic. Add the test file in this commit.
- A throwaway Bun script (`scripts/dev/smoke/phase3-commit1.ts`, NEW, then `git rm` after sign-off — or kept in `scripts/dev/smoke/` as a pattern for future commits) that:
  - Calls `startSession({ type: 'diagnostic' })` against the dev DB, asserts the response shape (`{ sessionId, firstItem }` with `firstItem.options.length >= 4`).
  - Calls `submitAttempt` with a hand-crafted `selection` payload, asserts `nextItem` is returned.
  - Calls the underlying `endSession` from `src/server/sessions/end.ts` directly with `{ skipWorkflowTrigger: true }` — **NOT** the server action. The flag is required here because `start(workflow)` requires Next.js request context and throws from raw Bun (per Phase 2's Appendix D item 4). Asserts the row's `ended_at_ms` is set and `completion_reason = 'completed'`. The full workflow-trigger path (`endSession` → `masteryRecomputeWorkflow` end-to-end) is verified in commit 4's diagnostic-flow smoke instead, where the action runs inside the Next.js dev server.
  - SQL spot-check: `SELECT count(*) FROM attempts WHERE session_id = $1` returns 1.
- Stub-throw verification: a curl-equivalent call that constructs a `drill`-type session but with the `drill → adaptive` mapping flipped on (manually edited then reverted) to confirm the `'adaptive'` branch throws with the expected message. Optional but instructive.

Stop-and-report criterion: all four smoke tests pass; the throwaway smoke script's output is pasted into the commit's report; `bun typecheck` is clean. The `skipWorkflowTrigger` flag's only Phase 3 caller is the smoke script — confirmed by `grep -r "skipWorkflowTrigger" src/ scripts/` showing only the two expected hits (the function definition and the smoke call).

### Commit 2 — `feat(focus-shell): client component + reducer + timer loop + heartbeat client`

Scope: client components. No routes mounting them yet.

Files added/modified:
- `src/components/focus-shell/focus-shell.tsx` (NEW) — main shell, owns the grid layout, dispatches the requestAnimationFrame loop.
- `src/components/focus-shell/shell-reducer.ts` (NEW) — per-SPEC §6.2 actions and reducer.
- `src/components/focus-shell/{session-timer-bar,pace-track,question-timer-bar,triage-prompt,inter-question-card,diagnostic-overtime-note,heartbeat,item-slot}.tsx` (NEW) — peripherals + the keyed `<ItemSlot>` that owns latency capture.
- `src/components/focus-shell/types.ts` (NEW) — `FocusShellProps`, `TimerPrefs`, `SubmitAttemptInput`, `SubmitAttemptResult` types, mirroring the action signatures from commit 1.
- `src/components/item/item-prompt.tsx` and `src/components/item/option-button.tsx` — **already exist from Phase 2 and are reusable as-is** (revised in plan v2 — confirmed via inspection). `<ItemPrompt>` already takes `{ body, options, selectedOptionId, onSelect }` and computes `displayLabel = String.fromCharCode(0x41 + index)` per-option, then renders `<OptionButton>` with `id`, `displayLabel`, `text`, `selected`, `onSelect`. The keyboard-nav handler for `1`–`5` and `A`–`E` is already attached. `<ItemSlot>` mounts `<ItemPrompt>` directly with the current item's `body` and `options`, wires `selectedOptionId` from the reducer's `selectedOptionId` field, and passes an `onSelect` that dispatches `{ kind: "select", optionId }` to the reducer. **No extraction or refactor of either Phase 2 component is needed.** The only Phase 3 addition adjacent to these is the `T`-key handler for triage-take, which lives in the FocusShell's own keydown effect (separate from `<ItemPrompt>`'s 1–5/A–E handler so they don't fight) — the two listeners coexist via `event.key` discrimination.

Smoke tests:
- `bun lint && bun typecheck` clean. The lint pass enforces `no-arrow-functions`, `no-relative-imports`, `no-inline-style`, `no-iife`, etc., on the new component files.
- A throwaway client-only smoke page at `src/app/_phase3-smoke/page.tsx` (NEW; deleted at end of phase) that mounts `<FocusShell>` with hand-crafted props and a stubbed `onSubmitAttempt` (in-memory item rotation). Manual verification:
  - First-item paint visible immediately.
  - Pressing `1`–`5` selects an option (the existing `<ItemPrompt>` keyboard nav handles this).
  - Pressing `Enter` submits; latency value rendered in a debug overlay is plausible (>0 and <session duration).
  - At t=18s the triage prompt overlay fades in and stays visible until either click or `T`. Confirm **no auto-submit** at t=30s by leaving the prompt on screen for 60s.
- Browser devtools: confirm the `requestAnimationFrame` loop runs at ~60Hz and the `<Heartbeat>` component fires `sendBeacon` at the 30-second mark (Network tab filtered to "beacon").

Stop-and-report criterion: all manual checks pass; the smoke page screenshot is attached to the commit's report.

### Commit 3 — `feat(api,proxy): heartbeat route + abandon-sweep cron + matcher carve-outs`

Scope: API routes + proxy. No UI.

Files added/modified:
- `src/app/api/sessions/[sessionId]/heartbeat/route.ts` (NEW).
- `src/app/api/cron/abandon-sweep/route.ts` (NEW) — bearer auth via `env.CRON_SECRET`, runs the abandon-sweep UPDATE with the **5-minute** threshold per §7.3, fires `masteryRecomputeWorkflow` per finalized session.
- `src/workflows/abandon-sweep.ts` (NEW; thin orchestrator if not already covered by direct invocation).
- `src/proxy.ts` (MOD) — extend the matcher exclusion to add `api/sessions/[^/]+/heartbeat`. `PUBLIC_PREFIXES` already covers `/api/cron`.
- `vercel.json` (NEW) — single cron entry for `/api/cron/abandon-sweep`.

Smoke tests:
- `bun lint && bun typecheck` clean.
- `curl -X POST http://localhost:3000/api/sessions/<a-known-sessionId>/heartbeat` against a session created by the commit-1 smoke script. SQL spot-check: `SELECT last_heartbeat_ms FROM practice_sessions WHERE id = $1` was bumped within the last second. Assert no auth() call landed (check server logs for absence of any auth-related log line for that request).
- Negative test: `curl http://localhost:3000/api/cron/abandon-sweep` without bearer token returns 401. With bearer token (`CRON_SECRET`) returns 204.
- Set up a stale session: create a `practice_sessions` row with `last_heartbeat_ms = now - 600s` (10 minutes ago, well past the 5-minute threshold) and `ended_at_ms = NULL`. Hit the cron endpoint with bearer; SQL spot-check the row is now `completion_reason = 'abandoned'`, `ended_at_ms = last_heartbeat_ms + 30000`. Confirm `masteryRecomputeWorkflow` was enqueued (check Vercel Workflows dev log).
- Race-window check: create an in-flight session (`last_heartbeat_ms = now - 100s`, well within threshold), hit the cron — assert the row is unchanged.

Stop-and-report criterion: all four checks pass; `bun lint` shows the proxy's matcher regex change is recognized.

### Commit 4 — `feat(app): diagnostic flow + post-session onboarding + (app) layout gate`

Scope: routes + the (diagnostic-flow) and (app) route groups. Wires commits 1–3 into a real user flow.

Files added/modified (revised in plan v2 — `(diagnostic-flow)/layout.tsx` added; `actions.ts` alternative removed; `/login` confirmed pre-existing):
- `src/app/(app)/layout.tsx` (NEW) — server-component auth check + diagnostic-completed gate per §6.5.
- `src/app/(app)/page.tsx` (NEW) — placeholder Mastery Map ("hello, your diagnostic is complete" + a "Start drill: <sub-type>" link). The full `<MasteryMap>` component lands in commit 5.

  > **Implementation note.** `typedRoutes: true` in `next.config.ts` rejects
  > `<Link href>` to dynamic param routes that haven't been built yet (e.g.,
  > `/drill/[subTypeId]` from the commit-4 placeholder before commit 5 lands the
  > configure page). Use plain `<a>` tags for these forward-references; they're
  > untyped and compile against routes that don't exist yet. Commit 5's
  > `<MasteryMap>` keeps `<a>` for the CTA since the route param is dynamic
  > anyway.

- `src/app/(diagnostic-flow)/layout.tsx` (NEW) — auth check ONLY (`if (!session?.user?.id) redirect("/login")`), no diagnostic-completed gate. Lets the diagnostic and post-session routes render for users who haven't yet finished the diagnostic, without each page repeating the auth check.
- `src/app/(diagnostic-flow)/diagnostic/page.tsx` (NEW) — server component, runs the in-progress-stale-finalize check then `startSession`, passes promise to content.
- `src/app/(diagnostic-flow)/diagnostic/content.tsx` (NEW) — `"use client"`, `React.use(promise)`, mounts `<FocusShell>` with the diagnostic config.
- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` (NEW) — server component, redirects non-diagnostic sessions to `/`. Imports `saveOnboardingTargets` directly from `src/app/(app)/actions.ts` (the action lives with other user-state writes; it is NOT moved or re-exported into the diagnostic-flow group). The action's reach into `users` is global, not diagnostic-specific.
- `src/app/(diagnostic-flow)/post-session/[sessionId]/content.tsx` (NEW) — `<OnboardingTargets>` form, calls the imported `saveOnboardingTargets`.
- `src/app/login/page.tsx` — **NOT new; pre-exists from Phase 1/2** (a single-button Google sign-in via `signIn("google", { redirectTo: "/" })`). No commit-4 modification. Both `(app)/layout.tsx` and `(diagnostic-flow)/layout.tsx` redirect to it for unauthenticated users; verified the page exists before commit 4 begins so the redirects do not 404.
- `src/components/post-session/onboarding-targets.tsx` (NEW) — the form component.
- `src/components/post-session/post-session-shell.tsx` (NEW) — minimal shell that renders the form + the substantive overtime-note text.

Smoke tests:
- `bun lint && bun typecheck` clean.
- Sign in as a fresh user (no `mastery_state`, no completed diagnostic). Navigate to `/`. Assert redirect to `/diagnostic`.
- Step through all 50 diagnostic items in the browser. For numerical sub-types, verify the third-medium slot serves with `metadata_json->>'fallback_level' = 'tier-degraded'`. Check the SQL: `SELECT count(*) FROM attempts WHERE session_id = $1 AND metadata_json->>'fallback_level' = 'tier-degraded'` should be ≤ 6.
- Confirm the 15-minute overtime note fires (or fast-forward by hand-editing `practice_sessions.started_at_ms` to 16 minutes ago, then triggering a tick).
- After the 50th submit, assert redirect to `/post-session/<sessionId>`. Fill in target percentile + target date, submit, assert redirect to `/`.
- Re-open `/` — the `(app)/layout.tsx` gate now passes; the placeholder Mastery Map renders.
- Redirect-loop edge-case test: in a separate browser session, navigate to `/diagnostic` directly (skipping the home redirect path) — confirm the in-progress-stale-finalize logic runs and a fresh session starts (or resumes, if that's the chosen behavior). No infinite redirect loop.

Stop-and-report criterion: all five user-flow steps pass; the SQL fallback-level count is ≤ 6.

### Commit 5 — `feat(app): Mastery Map + standard drill flow`

Scope: home screen + drill route.

Files added/modified:
- `src/components/mastery-map/{mastery-map,mastery-icon,near-goal-line,start-session-button,triage-adherence-line}.tsx` (NEW) — `alpha-style` skin applied.
- `src/app/(app)/page.tsx` (MOD) — replace the commit-4 placeholder with `<MasteryMap>`. Initiates the four parallel promises per §6.3, drills them through to `<MasteryMap>` via `React.use()`.
- `src/app/(app)/drill/[subTypeId]/page.tsx` (NEW) — configure page; subTypeId validation; length form.
- `src/app/(app)/drill/[subTypeId]/run/page.tsx` (NEW) — server component, calls `startSession({ type: 'drill', subTypeId, timerMode: 'standard', drillLength })`, passes promise into content.
- `src/app/(app)/drill/[subTypeId]/run/content.tsx` (NEW) — `"use client"`, `React.use(promise)`, mounts `<FocusShell>` with drill config. After last submit, `router.push('/')`.

Smoke tests:
- `bun lint && bun typecheck` clean.
- Navigate to `/`. Assert: 11 icons in two grouped rows (5 verbal + 6 numerical), the near-goal line renders, the primary CTA names a sub-type, the triage adherence line is in the periphery (low-contrast).
- Click the primary CTA → lands on `/drill/<sub-type>`. Submit length=10 → lands on `/drill/<sub-type>/run`.
- Step through 10 items. Confirm the pace track shrinks from the left edge inward on every submit. Confirm the session-timer bar depletes. Confirm latency values are plausible (`SELECT latency_ms FROM attempts WHERE session_id = $1` — all within 100ms < x < 60000ms band).
- After the 10th submit, assert redirect to `/`. The Mastery Map renders fresh state (revalidated by `endSession`'s `revalidatePath('/')`).
- Within-session uniqueness: confirm no item id appears twice in `attempts` for the drill session.
- Recency exclusion: run a second drill of the same sub-type immediately. Confirm `practice_sessions.recency_excluded_item_ids` for the new session is non-empty (it should include the 10 items from the first drill).

Stop-and-report criterion: all six checks pass; the drill flow round-trips without auth or proxy errors.

## 11. Forward-looking notes

**The `'uniform_band'` strategy is intentionally throwaway.** Phase 5's diff replaces its case branch with the `'adaptive'` branch's body and changes the mapping. The fact that Phase 3 carries this temporary strategy is a load-bearing design choice — it lets drill mode ship with a real selection mechanism in Phase 3 without committing to the full adaptive contract. If Phase 5 slips, Phase 3's drills still produce honest mastery signal at the band the user landed in post-diagnostic, just without tier walking.

**The diagnostic-mix coverage gap (§8) is a known-good pre-flight.** The six tier-degraded numerical-medium slots produce slightly-easier-than-target items, which biases the user's diagnostic accuracy upward by a small amount on those sub-types. The `was_mastered` flag is unaffected (diagnostic-source recompute can't assign `mastered`), and the user's drill-time initial tier would be the same regardless. The mitigation is documented in the seed data files as a comment so future seed-bank expansion knows where to add medium items.

**The 5-minute abandon threshold is a one-line config in the cron handler.** If real-world usage shows it's too generous (sessions sit "alive" for an annoying amount of time on the Mastery Map's history view, when that view ships in Phase 6), the threshold can drop to 3 minutes without re-architecting anything. The lower bound is roughly 90 seconds (3× heartbeat interval); below that, false-abandons start hitting honest users.

**The `/post-session/[sessionId]` route is intentionally minimal in Phase 3.** Phase 5 adds the drill post-session UI (wrong-items list, triage score, accuracy/latency summary, surfaced strategies) and the full-length strategy-review gate. The route's directory structure (a `(diagnostic-flow)` route group sibling to `(app)`) is set up so Phase 5 can move the route into `(app)` (gated by the diagnostic-completed check) without disturbing Phase 3's diagnostic flow. The `(diagnostic-flow)` group is a Phase 3 scaffold; Phase 5 may collapse it.

### 11.1 Framework-constraint adaptations from Phase 3 implementation

Two places in this plan describe pseudo-code that the framework rejected when implemented as written. Both have inline implementation notes at their original location (§6.5 and §10 commit 4); collected here for cross-reference.

- **§6.5 — `(app)/layout.tsx` diagnostic gate must Suspense-wrap the await.** `next.config.ts` enables `cacheComponents: true`, which trips a runtime error on awaits that aren't nested under a Suspense boundary. Outer layout stays sync; an async `Inner` component is mounted inside `<Suspense fallback={null}>` and awaits the gate promise. `redirect()` semantics are unchanged (it throws before any HTML streams). Phase 5 layouts adopting the same gate pattern must mirror this structure.

- **§10 commit 4 — forward-references to dynamic param routes must use plain `<a>` tags, not `<Link href>`.** `typedRoutes: true` in `next.config.ts` rejects `<Link href>` to dynamic param routes that haven't been built yet (e.g., `/drill/[subTypeId]` from the commit-4 placeholder before commit 5 lands the configure page). Plain `<a>` tags compile against routes that don't exist yet because they're untyped. Commit 5's `<MasteryMap>` keeps `<a>` for the CTA since the route param is dynamic anyway.

### 11.2 Tooling-boundary observations (the "lint scope follows ownership scope" meta-pattern)

Phase 3 surfaced three independent cases where the project's tooling has ownership boundaries that the lint/build configuration didn't reflect by default. Each was resolved by making the boundary explicit in config:

1. **Workflow webhook routes (plugin-owned).** `src/app/.well-known/workflow/` is plugin-emitted, gitignored, and regenerates on `bun run dev`. Biome config now ignores this path; lint scope follows gitignore scope.

2. **Workflow function import graphs (plugin-rejected pino reachability).** The `@workflow/next` plugin rejects pino-reachable imports from `"use workflow"` functions' import graphs. Workflow files keep `"use workflow"`/`"use step"` markers but delegate step bodies to sibling step-helpers files (e.g., `mastery-recompute-steps.ts`) that own the `@/logger` import. Phase 4's generation-pipeline workflows (generateItem, validateItem, scoreItem, deployItem) should adopt this pattern from day one rather than retrofit.

3. **Self-declared EXEMPT scripts.** 11 files under `scripts/` carry an explicit `EXEMPT FROM THE PROJECT RULESET` header documenting they predate the current ruleset. Biome doesn't read file-header markers; the config now lists each EXEMPT file by path. New files in `scripts/_lib/` are NOT auto-exempt — adding a new exemption requires both the header AND the config entry.

Workflow manifest counts have a similar offset: 3 built-in steps from `workflow/internal/builtins` (`__builtin_response_array_buffer`, `__builtin_response_json`, `__builtin_response_text`) are auto-injected so workflow code can call `await response.json()` across the VM boundary. Manifest count = (user-defined `"use step"` markers) + 3.

Verification recipe when adding new workflows: count `grep -rn '"use step"' src/workflows/`, add 3, compare against the dev startup log line `Created manifest with N steps, M workflows, and 0 classes`. If the math doesn't match, the helper extraction silently dropped or duplicated a step.

### 11.3 Open follow-ups for Phase 4 / Phase 5

- **Post-completion orphan rows.** Idempotency in `startSession` (commit `e087ac9`) closes the React strict-mode + cacheComponents double-render orphan source. A second orphan source remains: after `endSession` fires from a form action, Next.js auto-revalidates the form-action's source route, which re-runs the run page's server-side `startSession` with the previous session already finalized. Idempotency correctly creates a new empty row. Both the drill flow (`/drill/[subTypeId]/run`) and the diagnostic flow are affected by shape but diagnostic's UX hides it (the post-session route gates on session ownership).

  The smoke filter `ended_at_ms IS NOT NULL` in `loadDrillSession` is the semantically-correct query for "find the drill we just ran" and should stay as a contract regardless of orphan-source state. Phase 5 should investigate the right fix when it adds the post-session review composition; candidates include skipping form-action source-route revalidation on completion, revalidating only `/` instead of the route's own path, or making the run page's `startSession` a no-op when a recently-finalized session is detected. Don't pre-commit to a specific fix in the plan.

- **lefthook's format step is intentionally disabled** pending two fixes:
  1. `fmt.ts --strip-comments` has a parser bug that mangled identifiers adjacent to stripped comments during Phase 3 (`selection.ts:372-373` mangle observed; minimal repro shape characterized at `scripts/dev/fmt-bug-repro.ts` but isolation not yet achieved).
  2. The format step's scope is unbounded — uses `getFilesToCheck()` instead of `{staged_files}`, would auto-stage ~96 unrelated files per commit.

  Re-enable when both are addressed. Tracked as Phase 4 prep work; not blocking Phase 4's first commit.

- **Meta-observation: Phase 3's smokes are dense enough to surface incorrect design premises before they ship.** Two examples this session: Commit B's "install lefthook + sweep lint debt" caught a missed `||` violation in `focus-shell.tsx` that Commit A's lint pass had let through; Commit C's `phase3-commit5.ts` smoke caught that the "orphan rows can no longer exist by construction" premise was too strong. The smoke is the contract — when a fix premise turns out to be wrong, the smoke is what surfaces it. Phase 4 should preserve this density: every workflow stage gets a smoke, every threshold gets a regression check, every "by construction" claim gets verified empirically.
