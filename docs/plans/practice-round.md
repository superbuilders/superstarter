# Plan — Practice round (dashboard v2)

> **Status: shipped 2026-05-07.** The twelve-commit sequence below landed on `main` cleanly:
>
>   - Commit 1 (atomic Mastery-Map-removal + TopNav rename — `Practice` → `Practice Test` + relink `/drill` → `/full-length/configure`; 7 mastery-map components + 2 server-fn files + 1 route page deleted; `<EmptyBankPane>` href rewrite `/drill` → `/`; mission alt-CTA gap-window stub points at `/full-length/configure` per Decision 4) — `12d9bca` — `feat(dashboard): atomic Mastery-Map-removal + TopNav rename`
>   - Commit 2 (drill default 5q + delete configure + migrate empty-bank pre-check from configure into `/run/page.tsx`; local discriminated-union `DrillInit = ready | empty-bank` keeps the exported `RunInit` shape bit-for-bit compatible with `<DrillRunContent>`) — `a4883cf` — `feat(drill): default 5-q drill, delete configure, migrate empty-bank check to /run`
>   - Commit 3 (`users.target_score` schema + migration; `bun db:generate` bundled the dashboard-round-deferred `user_sub_type_belts` table + `belt_level` enum into the same migration `0004_square_speedball.sql`; live DB column populated for all 1201 users at default 40 per Decision 2) — `0e90bde` — `feat(users): add target_score column + run migration`
>   - Commit 4 (`updateGoal` + `updateTargetDate` Server Actions — Zod-parsed bounds, `requireUserId()`, `errors.try`, `revalidatePath("/")` per `saveOnboardingTargets` precedent; `loadUserProfile` reads real `users.target_score` removing the inline `STUB_GOAL_SCORE=40` constant; `targetDateMs` exposed on the profile shape so commit-9's `<DaysToTestEditor>` can pre-populate the date input) — `76280cc` — `feat(dashboard): server actions for goal + target date, loadUserProfile real read of target_score`
>   - Commit 5 (Sim Scoring real reads — `computeScoreEstimate` + `getLastFullSim` + shared private `loadLastSimsWithScores(userId, limit)` against `practice_sessions_user_type_ended_idx`; SQL-level `COALESCE(SUM(CASE WHEN attempts.correct THEN 1 ELSE 0 END), 0)::int` to satisfy `no-unnecessary-condition` super-lint vs JS-side null-fallback) — `812292f` — `feat(dashboard): Sim Scoring real reads — computeScoreEstimate + getLastFullSim`
>   - Commit 6 (Pace real reads — `previousMedianMs` + `last5SimMedianMs` via `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)::int` per `latency-summary.tsx` precedent; transitional `medianMs` + `perDayMs` retained additively so `<PaceMetric>` keeps rendering through commits 6-9; null-handling asymmetry vs commit 5's COALESCE-on-SQL-side documented as a §6.14 candidate) — `0e8a737` — `feat(dashboard): Pace real reads — previousPace + last5SimMedians`
>   - Commit 7 (Mission picker real impl — `pickTodaysMission` queries `mastery_state` + most-recent `practice_sessions` filtered to `type='drill'` for verbal/numerical alternation per ask 6; `MASTERY_RANK = { learning: 0, decayed: 1, fluent: 2, mastered: 3 }`; tie-break determinism via DB PK alphabetical order on `(userId, subTypeId)` — Decision 7's verbal-default applies only to the no-prior-drill case) — `f1db5ec` — `feat(dashboard): Mission picker real impl — pickTodaysMission queries mastery_state`
>   - Commit 8 (`countMistakes` real read — single COUNT-DISTINCT query JOINing `attempts` through `practice_sessions.user_id` because `attempts` has no `user_id` column; brief-vs-existing-contract drift caught at audit — brief specified `{count, estimatedMinutes, href}` return but the existing dashboard-round contract has the helper returning `Promise<number>` with the orchestrator building the queue shape — followed existing contract per Decision 6) — `400168a` — `feat(dashboard): countMistakes real read`
>   - Commit 9 (ScoreStrip rebuild — 5-stat top panel + greeting block; 4 new components: `<Sparkline>` (5-bar SVG), `<ScoreStripPopover>` (custom anchor-positioned dialog with click-outside + Escape; minimal inline wrapper vs radix-popover install per Decision 5), `<GoalEditor>`, `<DaysToTestEditor>`; `useRef + useEffect` programmatic focus replaces banned `autoFocus` per `noAutofocus`; `last5SimScores` + `targetDateMs` additively wired through types/data/score helpers) — `6178b2a` — `feat(dashboard): ScoreStrip rebuild — 5-stat top panel with editable Goal + Days popovers and 5-sim sparklines`
>   - Commit 10 (atomic bottom-strip removal — `<PaceMetric>` + `<MistakesTile>` + `<LastSimTile>` deleted, `lastSim?:` field + transitional `pace.medianSeconds` + `pace.last7Days` removed from `DashboardData`, `getLastFullSim` + the now-dead `startedAtMs` + `FULL_SIM_QUESTION_COUNT` removed from `score.ts`; type-contract consistency held by atomic single-commit discipline; `deriveHeadline`'s `hasSim` predicate semantically swapped from `lastSim !== undefined` to `score.current !== undefined` — same SQL filter so editorial behavior unchanged) — `cbd8145` — `feat(dashboard): atomic bottom-strip removal — delete PaceMetric, MistakesTile, LastSimTile + prune deprecated type fields`
>   - Commit 11 (full-surface Alpha Style audit + polish; Phase A static-trace + throwaway SSR runtime walk against the post-commit-10 surface — Asks 1-8 all PASS, WCAG AA contrast PASS via no-new-token-combos, prefers-reduced-motion globals.css blanket squash PASS, click-through PASS, sparkline empty-state PASS; Phase B applied 1 polish: stale `autoFocus` comment in `<ScoreStripPopover>` updated to accurately describe the `useRef + useEffect` pattern + flag the queued Tab-trap a11y completeness gap) — `7367d20` — `feat(dashboard): full-surface Alpha Style audit + polish`
>   - Commit 12 (round-close — plan-doc status flip) — *this commit* — `docs(plan): round-close — plan-doc status flip`
>
> **Round-close summary.** The practice round is the first major post-dashboard-round feature work, taking the dashboard from a stub-heavy v1 to its v2 shape that consumes 4 of the 9 PRD §19 stub-removal targets as real reads. Eight Leo-enumerated asks land end-to-end: ask 1 (Practice Test rename + Mastery Map removal), ask 2 (Previous Score with 5-sim sparkline), ask 3 (editable Goal + Days popovers wired to Server Actions), ask 4 (Previous Pace tile + 5-sim sparkline), ask 5 (Mistakes tile with real count), ask 6 (Mission picker reads `mastery_state` + alternates verbal/numerical), ask 7 (drill-default-5q + configure deletion), ask 8 (Practice tab → /full-length/configure). Commit 11's audit walk verified 8/8 via static-trace + throwaway SSR runtime against the rendered surface. The four §3 decisions resolved at plan-write all landed as code: D1 UI-only Mastery Map removal (commit 1; `mastery_state` schema + writes preserved for the engine + recompute workflow + new mission picker); D2 `target_score` integer NOT NULL default 40 (commit 3; live DB row-state verified per §6.14.21 against the 1201-user population); D3 two narrow Server Actions over extending `saveOnboardingTargets` (commit 4); D4 interim mission alt-CTA = `/full-length/configure` for the 7-commit gap window (commits 1-7); D5 native `<input type="date">` over shadcn Calendar (commit 9; audit at commit 4 confirmed shadcn Calendar not installed); D6 `countMistakes` real read this round (commit 8); D7 mission tie-break = verbal-default for no-prior-drill case (commit 7); D8 single 12-commit chain post-redline-merger of original commits 1+2 (whole round). One commit-3 surprise — `bun db:generate` bundled the dashboard-round-deferred `user_sub_type_belts` table + `belt_level` enum into the same migration as `target_score` ALTER, side-effect of the deferred-schema-in-barrel-without-migration pattern from dashboard round commit 2; future Belts PRD's migration scope decreases by ~1 commit. Four stub→real transitions completed cleanly per the data-layer's commit-by-commit additive-then-prune discipline: Sim Scoring (commit 5, two helpers — `computeScoreEstimate` + `getLast5SimScores` after commit 9), Pace (commit 6, `computePaceWeek` returning `previousMedianMs` + `last5SimMedianMs`), Mission Picker (commit 7, `pickTodaysMission` reading `mastery_state.current_state`), countMistakes (commit 8, COUNT-DISTINCT-on-attempts via JOIN through `practice_sessions`); the type contract held atomic at commit 10's bottom-strip prune. Test invariant 79/79 preserved across all 11 prior commits' stable runs; the pre-existing probabilistic flake at `src/server/items/selection.test.ts:684` (`fullLengthNoReServe`, ~10-20% rate, bank-depth-sensitive on thin sub-type cells) surfaced intermittently across this round same as last but was never introduced by any round commit and is queued as an operational follow-up — NOT a §6.14 candidate. Seven §6.14 candidates accumulated this round (deferred-migration-bundling pattern at commit 3, SQL-level-COALESCE-vs-JS-fallback at commit 5, PERCENTILE_CONT-vs-SUM null-handling asymmetry at commit 6, MASTERY_RANK reversibility + DB-PK tie-break determinism at commit 7, brief-vs-existing-contract drift at commit 8, autoFocus-vs-useRef+useEffect for popover-dialog focus at commit 9, active-wrong-vs-historical-trail comment classification at commit 11) plus two borderline (brief-numeric-counts must recheck against most-recent commit at commit 10 — overlaps with §6.14.18 already; discriminated-union for empty-bank gate at commit 2 — narrow); promotion to SPEC §6.14 entries is INTENTIONALLY DEFERRED to a separate post-round operational sub-round (doc-only, ~1 commit) per the round-close brief. The dashboard round's 5 still-queued candidates (PRD-prose-vs-git-history, no-inline-ternary scope drift, usePathname .d.ts-vs-runtime, two-step migration, blanket-vs-scoped reduced-motion) carry forward; total slate: 12-14 candidates across both rounds. Operational follow-up queue: (1) §6.14 promotion sub-round; (2) a11y-completeness sub-round (Tab focus-trap in `<ScoreStripPopover>` + `aria-controls` correlation between trigger and dialog — surfaced at commit 11 as G2/G3 audit findings); (3) focus-shell `prefers-reduced-motion` scope-anchor (carried from dashboard round commit 11); (4) `selection.test.ts:684 fullLengthNoReServe` flake fix. Operational implications worth pinning: the deferred-Belts-migration absorption shrinks the future Belts PRD's commit ledger by ~1; the mission picker's `MASTERY_RANK` ordering (learning < decayed < fluent < mastered) is product-perspective-reversible — flipping is a one-line constant change if Leo wants decayed prioritized differently; tie-break determinism across equal-mastery rows uses the DB's composite-PK alphabetical order on `(userId, subTypeId)` with `subTypes.id` slug as the natural sort key — config-order tie-break is a one-line addition if needed. Stub-removal follow-up chain (PRD §19 of dashboard round): 5 of 9 stubs went real this round (Sim Scoring × 2 helpers, Pace, Mission Picker, countMistakes); 4 still queued (Belts seeding via the now-extant `user_sub_type_belts` table, Streaks `computeStreak` real read, full Lessons surface, full Stats surface, full Review surface — the count is real but the page is a stub). The dashboard's v2 shape — TopNav + ScoreStrip (5-stat top panel + greeting + 2 sparklines) + MissionCard + 2 DojoCards — is feature-complete and ready for whatever Leo decides next: deploy + dogfood, post-round §6.14 promotion sub-round, a11y-completeness sub-round, or one of the 4 PRD §19 follow-up PRDs still queued (Belts, Streaks, Lessons, Stats; Mistakes-Review surface unblocked).

> **Original status at plan-write (preserved for audit, per closed-plans-immutable convention).** "Status: planning, approved, not yet implemented. This plan was drafted audit-first against `main` HEAD `d1812c8` (2026-05-07; the dashboard round's round-close commit; one commit past commit 11's full-surface Alpha Style audit + polish at `88417f8`). The eight asks Leo enumerated are the source of truth for the *what*; this plan is the source of truth for the *how* — commit sequencing, audit findings against `main`, decisions surfaced for Leo, and acceptance criteria. Closed-plans-immutable per SPEC §6.14.20 once Leo approves."

This round is the first major post-dashboard-round feature work. The dashboard shipped a stub-heavy v1 that benefits immediately from real Sim Scoring + Pace + Mistakes + Mission Picker reads (4 of the 9 PRD §19 stub-removal targets); ask 6 (real mission picker) is itself one of those stub-replacements. The dashboard round's PRD §2 framing ("No mutations from the dashboard itself") flips here — Goal + Days editors are the dashboard's first mutation surface, exercising Server Actions + popover client state for the first time on this surface. Two surfaces being deleted (Mastery Map subtree + drill configure page) are larger than they look from prose: 7 component files + 2 server-fn files + 1 route page + cascading import-rewrites. Rough commit count: **12 commits** in a single chain (post-merger of original commits 1+2 into a single atomic Mastery-Map-removal-plus-TopNav-rename commit at plan-approval). This plan does not propose internal sub-rounds — see §3 decision 8 for the rationale.

## 1. Why this round, why now

Three forcing functions:

- **The dashboard's stub heaviness is a deferred cost.** The dashboard round shipped 7 stubs returning deterministic empty values (loadAllBelts all-white, pickTodaysMission baseline-only, computeScoreEstimate undefined, computeStreak 0, computePaceWeek zero-week, countMistakes 0, getLastFullSim undefined). Three of those (`computeScoreEstimate`, `getLastFullSim`, `computePaceWeek`, `countMistakes`, `pickTodaysMission`) directly drive surfaces this round restructures. Replacing the stubs in the same round that restructures the surface is cheaper than two passes.
- **Mastery Map is content-redundant with the dashboard.** The dojo cards on the dashboard are a richer sub-type picker than `<MasteryMap>` ever was — same 14 sub-types, same per-type detail, same drill entry. Keeping the Mastery Map at `/drill` was a transitional concession during the dashboard round (commit 3 migrated rather than deleted). Ask 1 closes the transition: the dashboard IS the picker; Mastery Map deletes; nav drops the redundant entry.
- **Ask 3 (editable Goal + Days) and ask 7 (drill-default-5) are pre-deploy quality fixes.** Both surfaces are clearly broken or aspirational today: Goal is hardcoded to STUB_GOAL_SCORE=40 with no editor; drill's "5/10/20 with default 10" length picker adds friction to an 18-second-pacing app where shorter sessions are the right default. Both are small structural fixes that compound the dashboard's polish before deploy.

The cost of this round is bounded. One new schema migration (users.target_score). 13 commits. Every external surface (focus shell, post-session UI, diagnostic flow, full-length flow, drill /run page) stays unchanged beyond accepting the 5-question default and dropping configure. The Belts/Streaks/Lessons/Stats follow-up PRDs all stay queued.

## 2. Audit findings against `main`

Current state, as of `main` HEAD `d1812c8`:

### 2.A. Mastery Map file + symbol inventory

**`src/components/mastery-map/`** (7 files):
- `computing-state.tsx` — empty-state pane when mastery_state has zero rows; `useRouter().refresh()` polling.
- `mastery-icon.tsx` — single-icon primitive driven by mastery state per (sub-type).
- `mastery-map.tsx` — outer client component composing the rest.
- `near-goal-line.tsx` — "near-goal" headline reads `users.target_percentile`.
- `sign-out-button.tsx` — sign-out button (rendered inside the map header).
- `start-session-button.tsx` — primary CTA "Enter dojo: {sub-type}".
- `triage-adherence-line.tsx` — triage adherence sub-line.

**`src/server/mastery/`** (5 files):
- `compute.ts` — exports `computeMastery`, `median`, `sourceParams` + types `ComputeMasteryInput`, `MasteryLevel`, `MasterySource`.
- `compute.test.ts` — unit tests for compute.
- `near-goal.ts` — exports `deriveNearGoal` + type `DeriveNearGoalInput`.
- `recommended-next.ts` — exports `rankFor`, `recommendedNextSubType`.
- `recompute.ts` — exports `recomputeForUser`, `ErrSubTypeNotFound`, `ErrUpsertFailed`.

**Consumers of `@/components/mastery-map`** (`grep -rln`): `src/app/(app)/drill/page.tsx` (the picker); `src/components/mastery-map/mastery-map.tsx` (self).

**Consumers of `@/server/mastery`** (per-export breakdown):
- `compute.ts` — `median` used by `src/server/items/selection.ts`; `computeMastery` + `MasteryLevel` + `MasterySource` types used by `src/server/mastery/recompute.ts`; `MasterySource` type used by `src/workflows/mastery-recompute-steps.ts`. **STAYS.**
- `compute.test.ts` — self-contained test. **STAYS.**
- `near-goal.ts` — only consumer is `src/app/(app)/drill/page.tsx`. **DELETES with the picker.**
- `recommended-next.ts` — only consumer is `src/app/(app)/drill/page.tsx`. **DELETES with the picker.**
- `recompute.ts` — consumed by `src/workflows/mastery-recompute-steps.ts`. **STAYS** (the post-session mastery recompute workflow continues writing to mastery_state; ask 6's mission picker reads from it).

**`mastery_state` table + `MasteryLevel` type:** the underlying data layer STAYS. The schema file `src/db/schemas/practice/mastery-state.ts` is unchanged. The post-session recompute workflow keeps writing to it. Ask 6's mission picker reads from it.

### 2.B. Diagnostic flow's relationship to mastery_state

**Writes to mastery_state** (via `db.update`/`db.insert`/`onConflictDoUpdate`): single production path through `src/server/mastery/recompute.ts:recomputeForUser`. Test fixture writes at `src/server/items/selection.test.ts:280`. No other production writes.

**Reads of mastery_state** (`from(masteryState)`):
- `src/app/(app)/drill/page.tsx:72` — Mastery Map picker. **GOES** with the picker.
- `src/server/items/selection.ts:441` — engine reads mastery_state to set initial walker tier. **STAYS.**
- `src/server/mastery/recompute.ts:77` — recompute reads-then-writes. **STAYS.**

**Diagnostic gate at `(app)/layout.tsx`:** reads `practice_sessions.type='diagnostic'` (per the comment at line 5: "type='diagnostic' with ended_at_ms NOT NULL AND completion_reason != 'abandoned'"). Does NOT read mastery_state. Mastery Map removal does not affect the gate.

**Conclusion:** ask 6's `pickTodaysMission` becomes the second production reader of mastery_state (alongside selection.ts). The data layer survives.

### 2.C. Drill route current structure

**Routes under `src/app/(app)/drill/`:**
- `page.tsx` (148 lines) — the Mastery Map picker (migrated by dashboard round commit 3 from `(app)/page.tsx`).
- `[subTypeId]/page.tsx` (157 lines) — the **drill configure surface**. Validates subTypeId; pre-checks live-item count via `db.select({n: count()}).from(items).where(...)`; if count=0 renders `<EmptyBankPane>`; else renders a length-picker form (radio buttons 5/10/20, default 10) whose form action navigates to `/drill/<subTypeId>/run?length=N`.
- `[subTypeId]/run/page.tsx` (96 lines) — drill /run page. Reads `searchParams.length`; defaults to 10 if missing or invalid; calls `startSession({type:'drill', subTypeId, timerMode:'standard', drillLength})`.
- `[subTypeId]/run/content.tsx` (69 lines) — client wrapper for the run page.

**Per ask 7:** `[subTypeId]/page.tsx` deletes entirely. The /run page's default flips from 10 to 5 (or it ignores searchParams entirely, hardcoding 5). BeltRow hrefs flip from `/drill/<id>` to `/drill/<id>/run`.

**Note:** the drill configure page also handles the empty-bank case (renders `<EmptyBankPane>` when no live items exist for a sub-type). This empty-bank check needs to MOVE to the /run page when configure deletes — otherwise a user clicking a belt-row for an empty-bank sub-type lands on a 500 (startSession would throw `ErrFirstItemMissing`).

### 2.D. BeltRow href vs actual route resolution

`src/server/dashboard/belts.ts:38` — `href: \`/drill/${encodeURIComponent(s.id)}\``. With `(app)/drill/[subTypeId]/page.tsx` present today, this lands on the configure surface. NOT 404. Behavior is "click belt → see length picker → submit → run." Per ask 7: change href to `/drill/<id>/run`.

`src/components/dashboard/belt-row.tsx:54` — uses plain `<a href={row.href}>` per dashboard round's commit 7 typedRoutes-vs-Link reconciliation. The href shape change doesn't require component changes; only `loadAllBelts` in `belts.ts` needs the rewrite.

### 2.E. practice_sessions schema for full-length sims

Schema at `src/db/schemas/practice/practice-sessions.ts`. Columns: `id` (uuidv7 PK), `userId`, `type` (enum), `subTypeId` (nullable, FK), `timerMode` (enum), `targetQuestionCount`, `startedAtMs`, `endedAtMs` (nullable), `lastHeartbeatMs`, `completionReason` (enum, nullable), `recencyExcludedItemIds` (uuid[]), `diagnosticOvertimeNoteShownAtMs` (nullable).

`session_type` enum: `["diagnostic", "drill", "full_length", "simulation"]`. **Full sims store as `type='full_length'`** (confirms dashboard round Decision E; the PRD §6.4 "simulation" is wrong but the helper's TODO comment already names `type IN ('full_length', 'simulation')` per Decision E's resolution).

**No score column.** Score is derived per session: `COUNT(*) FROM attempts WHERE session_id = ? AND correct = true`. The "out of" is `practice_sessions.target_question_count` (50 for full-length).

**Indexes:** `practice_sessions_user_type_ended_idx` on `(userId, type, endedAtMs)` covers the "last 5 full-length sims" query shape directly. EXPLAIN ANALYZE will confirm Index Scan; no new index needed.

### 2.F. attempts schema

`src/db/schemas/practice/attempts.ts` — relevant columns: `correct: boolean`, `latencyMs: integer`, `sessionId: uuid` (FK with cascade delete). Index: `attempts_session_id_idx` on `(sessionId)`.

**Score per session:** `SELECT COUNT(*) FROM attempts WHERE session_id = ? AND correct = true`. One Index Scan via `attempts_session_id_idx`.

**Pace per session (median latency):** `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) FROM attempts WHERE session_id = ?`. Same index. PostgreSQL's `percentile_cont` is the canonical median; aliased as `median` in `@/server/mastery/compute.ts` for in-memory data, but for SQL we call `percentile_cont(0.5)`.

**No standalone `userId` on attempts** — joins go through `practice_sessions.userId`. Confirmed at dashboard round plan §2.6; reconfirmed.

### 2.G. Auth.js v5 + Server Actions

Server Actions ARE established. `src/app/(app)/actions.ts` (line 1: `"use server"`) is the canonical home. Other `"use server"` files: `src/app/(admin)/admin/ingest/actions.ts`, `src/app/login/page.tsx` (inline action).

**Existing actions in `(app)/actions.ts`** (~5 named exports): `startSession`, `endSession`, `submitAttempt`, `signOutAction`, `saveOnboardingTargets`.

**`saveOnboardingTargets` is the precedent for ask 3.** It already writes `users.targetPercentile` (allowed: 50/30/20/10/5) AND `users.targetDateMs` via Zod-validated input + `requireUserId()` + `db.update(users).set(...)` + `errors.try` + `revalidatePath("/")`. Pattern:

```ts
const onboardingTargetsSchema = z.object({
  targetPercentile: z.union([z.literal(50), ...]).optional(),
  targetDateMs: z.number().int().positive().optional()
})

async function saveOnboardingTargets(input: ...): Promise<void> {
  const parsed = onboardingTargetsSchema.safeParse(input)
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues }, "...")
    throw errors.wrap(ErrInvalidActionInput, "...")
  }
  const userId = await requireUserId()
  // ... build updateValues object
  const result = await errors.try(db.update(users).set(updateValues).where(eq(users.id, userId)))
  if (result.error) {
    logger.error({ error: result.error, userId }, "...")
    throw errors.wrap(result.error, "...")
  }
  revalidatePath("/")
}
```

This round's Goal + Days editors can either (a) extend `saveOnboardingTargets` to also handle `target_score`, or (b) introduce `updateGoal` + `updateTargetDate` separate actions following the same shape. See §3 decision 3.

### 2.H. users schema columns

`src/db/schemas/auth/users.ts`:
- `id: uuid` (PK, uuidv7 default)
- `name: varchar(256)` (nullable)
- `email: varchar(320)` (notNull, unique)
- `emailVerifiedMs: bigint` (nullable)
- `image: text` (nullable)
- `targetPercentile: integer` (nullable; per dashboard round Decision D, intentionally NOT read by the dashboard)
- `targetDateMs: bigint` (nullable)
- `createdAtMs: bigint` (notNull, default now-ms)

**`target_score` does NOT exist.** This round's migration adds it. Per §3 decision 2: integer, nullable (no notNull), no default.

### 2.I. Routing implications of /drill index removal

References to `/drill` in source today (post-dashboard-round):
- `src/server/dashboard/mission.ts:27` — `alternateHref: "/drill"` (MissionCard alternate CTA — "Pick a drill"). When `(app)/drill/page.tsx` deletes, this becomes a 404 link. **Needs in-round handling.** See §3 decision 4 + ask 6's real mission picker (which provides a sub-type-specific drill href as the alternate).
- `src/components/drill/empty-bank-pane.tsx:41` — `<Anchor href="/drill">Back to Mastery Map</Anchor>`. Per dashboard round commit 3's rewrite. Same problem when picker deletes. Rewrite to `/` (the dashboard, where the dojo cards now serve as the picker).
- `src/components/dashboard/top-nav.tsx:39-41` — NAV array entry `{ href: "/drill", label: "Practice" }`. Per ask 1: `{ href: "/full-length/configure", label: "Practice Test" }`. Plus the typed-string union at line 39 needs updating.

Plus comments in top-nav.tsx:29 and similar — comment-only references that update during file rewrites.

### 2.J. Strategies relationship to mistakes

`src/server/dashboard/mistakes.ts` — currently stubs `countMistakes(userId)` to 0. Replacement: `SELECT COUNT(*) FROM attempts JOIN practice_sessions ON attempts.session_id = practice_sessions.id WHERE practice_sessions.user_id = ? AND attempts.correct = false`. One JOIN + filter + count. Index-supported via `practice_sessions_user_id_idx` (sessions filter) + `attempts_session_id_idx` (join). Cheap.

Strategies (catalog) are NOT pulled into this round. The Mistakes-to-review surface is just a count. The /review page itself stays a stub; the count display is the only mistakes-related surface that goes real.

### 2.K. Diagnostic flow paths after Mastery Map removal

`grep -rn "masteryState\|deriveNearGoal\|recommendedNextSubType" src/app/(diagnostic-flow)/` returns zero matches. The diagnostic flow at `src/app/(diagnostic-flow)/` does not read mastery_state directly and does not import any of the to-be-deleted server-fns. Mastery Map removal does NOT break the diagnostic flow.

The post-session recompute workflow (`src/workflows/mastery-recompute-steps.ts`) imports `recomputeForUser` from `@/server/mastery/recompute` and `MasterySource` from `@/server/mastery/compute` — those files STAY (per audit A). Workflow continues writing to mastery_state.

### 2.L. Bonus findings

**Drill configure also handles empty-bank.** Beyond the length picker, `[subTypeId]/page.tsx` checks `live-item count` and renders `<EmptyBankPane>` if zero. Deleting configure means moving the empty-bank check elsewhere — likely `[subTypeId]/run/page.tsx` (a defensive `notFound` or pre-fetch check before `startSession`). See commit 3 in §5 below.

**`saveOnboardingTargets` is mid-flow precedent.** It revalidates `/` and is wired from `<OnboardingTargets>` post-session form. Dashboard's Goal + Days editors will revalidate `/` similarly so the ScoreStrip re-renders with new values immediately.

**Mission picker requires "most recent drill session" lookup.** Ask 6 alternates verbal/numerical based on the user's last drill session's section. Query: `SELECT subTypeId FROM practice_sessions WHERE user_id = ? AND type = 'drill' AND ended_at_ms IS NOT NULL ORDER BY id DESC LIMIT 1`. Use the existing `practice_sessions_user_type_ended_idx` index. The subTypeId resolves to its section via `subTypes.find(s => s.id === ?)?.section`. If no prior drill exists, default to verbal (or use a deterministic tie-break — see §3 decision 7).

## 3. Open decisions for Leo

Eight decisions surfaced. Numbered for redline tracking.

### Decision 1 — Mastery Map data-layer scope: UI-only vs full removal? **RESOLVED: option 1 (UI-only).**

**Context.** `mastery_state` table + `MasteryLevel` type + writes via `recomputeForUser` are the data layer. `<MasteryMap>` UI + `near-goal.ts` + `recommended-next.ts` are the UI/derivation layer.

**Options.**
1. UI-only removal — keep table, schema file, MasteryLevel type, recompute workflow. Delete `<MasteryMap>` components + `near-goal.ts` + `recommended-next.ts`.
2. Full removal — drop the table + schema + workflow + all helpers + the engine's read at `selection.ts:441` (which sets initial walker tier).

**Recommendation: option 1.** Ask 6's mission picker reads `mastery_state.current_state` to find the lowest-mastery sub-type per section. The post-session recompute workflow keeps writing to it. The engine reads it for initial walker tier. Removing the data layer is invasive and out of scope for this round. UI-only removal leaves the table + writes intact.

### Decision 2 — `target_score` column shape. **RESOLVED: option 2 (integer notNull default(40)).**

**Context.** Dashboard round currently stubs goal=40 via `STUB_GOAL_SCORE`. The new column persists user-set goal scores.

**Options.**
1. Integer, nullable, no default — null = "user hasn't set yet"; reads fall back to STUB_GOAL_SCORE=40 in `loadUserProfile` until the user clicks the editor.
2. Integer, notNull, default 40 — every user has a target_score from creation; loadUserProfile reads it directly with no fallback.
3. Integer, nullable, default 40 — every existing user gets 40 on migration; future logic can distinguish "explicit null" from "default 40".

**Recommendation: option 2.** Notnull + default 40 mirrors the dashboard round's STUB behavior, simplifies `loadUserProfile` (drop the STUB_GOAL_SCORE constant entirely; read `users.target_score` directly), and avoids three-state nullability. The migration adds the column with default 40 — every existing user (including the dev/test users in the live DB) gets 40 on the migration; the editor lets them adjust. Goal Score PRD's framing in dashboard round §19 is satisfied.

### Decision 3 — Server Actions: extend `saveOnboardingTargets` vs add new actions? **RESOLVED: option 2 (two narrow actions: `updateGoal` + `updateTargetDate`).**

**Context.** The existing `saveOnboardingTargets` writes targetPercentile + targetDateMs. The new editors mutate `target_score` + `target_date_ms`.

**Options.**
1. Extend `saveOnboardingTargets` — add `targetScore` to the Zod schema + updateValues; the action handles three optional fields.
2. Two new actions — `updateGoal(targetScore)` + `updateTargetDate(targetDateMs)`. Each editor wires to its own action.
3. One new action — `updateUserTargets({targetScore?, targetDateMs?})` that supersedes saveOnboardingTargets.

**Recommendation: option 2.** Two narrow actions match the two distinct editors. Each editor's submit calls one action with one field; no need for partial-update logic. `saveOnboardingTargets` stays untouched for the post-session onboarding flow (different surface, different copy). The action surface grows by 2; that's worth it for clarity over the alternative of conflating diagnostic-onboarding with dashboard-edit semantics.

### Decision 4 — MissionCard alternate CTA fate during the gap between commit 1 (delete /drill) and commit 7 (real mission picker, post-renumber). **RESOLVED: option 1 (interim alternateHref = `/full-length/configure`, redundant with primary, label changed).**

**Context.** Today `mission.ts:27` returns `alternateHref: "/drill"` + `alternateLabel: "Pick a drill"`. Ask 1 deletes /drill; ask 6 lands a real picker that returns a sub-type-specific drill href as the alternate. Between commits 1 and 8 there's a window where the alternate CTA needs interim handling.

**Options.**
1. Commit 1 changes the stub's alternateHref to `/full-length/configure` (same as primary, label changed to something benign like "Take the full sim instead") — redundant but functional.
2. Commit 1 removes the alternate CTA from the stub return entirely; MissionCard renders only the primary; commit 8's real impl re-adds the alternate.
3. Commit 1 changes the stub's alternateHref to `#dojo-section` (in-page anchor scrolling to the dojo cards) — the dojo cards ARE the picker per ask 1.

**Recommendation: option 1.** The simplest interim — point both CTAs at the same route, change the alternate label. Commit 8 splits them again with the real picker. Option 3 (in-page anchor) is appealing but requires adding an id to the dojo grid in dashboard.tsx; option 2 forces MissionCard to handle a "no alternate" branch, which is component-API churn.

### Decision 5 — Calendar UI for Days editor. **RESOLVED: option 2 (native `<input type="date">`) unless audit at commit 4 shows shadcn Calendar already installed.**

**Context.** The editor opens on click of "Days to test"; the user picks a date; submit writes `target_date_ms`. shadcn/ui's Calendar primitive (react-day-picker wrapper) is one path; native `<input type="date">` is another.

**Options.**
1. shadcn Calendar + Popover primitives — visual polish, react-day-picker dependency. Need to verify if either is already installed.
2. Native `<input type="date">` — zero new dependencies, accessible across browsers, less polished.
3. Custom datepicker — overkill.

**Recommendation: option 2** unless audit shows shadcn calendar primitives are already installed. Native input renders consistently across browsers, has built-in mobile-OS-native date pickers, has zero bundle weight, satisfies accessibility, and matches ALPHA §7's "crisp, legible, emotionally calm" form discipline. Visual polish is a follow-up PRD's concern. Final call at commit 5: if `node_modules/react-day-picker` exists from any prior round, switch to option 1; else option 2.

### Decision 6 — `countMistakes` stub→real this round? **RESOLVED: option 1 (real read this round).**

**Context.** Ask 5 says "Just the number" alongside other top-panel stats. The current stub returns 0; replacement is one cheap query.

**Options.**
1. Wire real read this round — replaces `mistakes.ts` stub with the COUNT query.
2. Stay stubbed — defers to the Mistakes PRD.

**Recommendation: option 1.** Cheap query (one JOIN, two indexes). The top panel showing "Mistakes to review: 0" for users with real attempts is misleading; the real count is one of the 4 stub-replacements this round naturally absorbs. This is one commit (commit 9 in §5).

### Decision 7 — Mission picker tie-break: no prior drill session. **RESOLVED: option 1 (default to verbal — alphabetical-first, deterministic).**

**Context.** Ask 6 alternates verbal/numerical based on the user's most recent drill session's section. If no prior drill exists (first session), what's the default?

**Options.**
1. Default to verbal — alphabetical first.
2. Default to whichever section has the LOWER lowest-mastery (numerical case if numerical's lowest sub-type is at "learning" while verbal's lowest is "fluent").
3. Random.

**Recommendation: option 1.** Deterministic, simple. The mission picker isn't a complex weakness-analysis ranker; it picks lowest current_state per section, alternates by last drill section, defaults to verbal on tie. The richer "weakness analysis" framing from PRD §6.3 ("frequency_on_real_test × (1 - accuracy_at_pace)") is a future Mission Picker PRD concern; this round delivers the simplest correct version of ask 6.

### Decision 8 — Internal phasing: single chain or sub-rounds? **RESOLVED: option 1 (single chain of 12 commits, post-redline merger of original commits 1+2).**

**Context.** Round forecast: 13 commits. Past rounds: 4-12 commits.

**Options.**
1. Single chain (13 commits) — one plan-doc, one round-close, one redline pass.
2. Sub-rounds — e.g. round-A (Mastery Map removal + drill restructure, 5 commits), round-B (real reads + ScoreStrip rebuild, 6 commits), round-C (editors + schema + close, 4 commits). Three plan-docs, three round-closes, three redline passes.

**Recommendation: option 1 (single chain).** The 13 commits have natural dependencies that favor one chain. Mastery Map removal sets up the drill-route restructure (commit 3 absorbs both); the schema migration enables the editors which need to read the column; ScoreStrip rebuild depends on the real-data helpers being in place. Splitting into sub-rounds would triple the plan-doc + round-close overhead without saving review time — Leo's redline pass over 13 commits in one plan-doc is cheaper than three separate plan-docs. Past round commit-count records (Phase 5 sub-phase 1's 7 commits, sub-phase 3's 6, dashboard round's 12) are below this round's 13 but the precedent for "single chain" cleanly extends to 13.

The dashboard round shipped 12 commits in 24 hours of focused work; this round's 13 commits + first-mutation-surface complexity will land in a similar window. The plan-doc redline + commit-by-commit cadence holds.

## 4. Pinned scope

### 4.1 In scope

**TopNav rename + relink (ask 1, part 1):**
- `src/components/dashboard/top-nav.tsx` — NAV array entry `{ href: "/drill", label: "Practice" }` → `{ href: "/full-length/configure", label: "Practice Test" }`. Update typed-string union at line 39 + comments. Active-route-detection for "Practice Test" is via `pathname?.startsWith("/full-length")`.

**Mastery Map removal (ask 1, part 2):**
- DELETE all 7 files under `src/components/mastery-map/`.
- DELETE `src/app/(app)/drill/page.tsx` (the picker).
- DELETE `src/server/mastery/near-goal.ts` (only consumer was the picker).
- DELETE `src/server/mastery/recommended-next.ts` (only consumer was the picker).
- KEEP `src/server/mastery/compute.ts`, `compute.test.ts`, `recompute.ts` (non-picker consumers exist).
- KEEP `src/db/schemas/practice/mastery-state.ts` (engine + recompute workflow + new mission picker all read/write).
- REWRITE `src/components/drill/empty-bank-pane.tsx:41` href `/drill` → `/` (the dashboard's dojo cards are the new picker).

**Drill route restructure (ask 7):**
- DELETE `src/app/(app)/drill/[subTypeId]/page.tsx` (the configure surface).
- MOVE empty-bank pre-check from configure into `[subTypeId]/run/page.tsx` — defensive `<EmptyBankPane>` render before `startSession` if the sub-type has zero live items.
- UPDATE `[subTypeId]/run/page.tsx` `asDrillLength` default from 10 to 5 (or hardcode 5 ignoring searchParams).
- UPDATE `src/server/dashboard/belts.ts:38` `href:` from `/drill/${id}` to `/drill/${id}/run`.

**ScoreStrip rebuild (asks 2, 3, 4, 5):**
- REPLACE `Est. score` tile with `Previous score` (last full-length sim's score + 5-sim history sparkline).
- REPLACE static `Goal` tile value with editable popover (numeric input 0-50, validates, calls `updateGoal` server action).
- REPLACE static `Days to test` tile value with editable date-picker (native input or shadcn Calendar; calls `updateTargetDate` server action).
- ADD `Previous pace` tile (last full-length sim's median latency + 5-sim history sparkline).
- ADD `Mistakes to review` tile (real `countMistakes` count).
- TOP-PANEL LAYOUT: 5 stats + greeting in a single row at md+. Mobile wraps responsively.

**Bottom-strip removal:**
- DELETE `src/components/dashboard/pace-metric.tsx` (88 lines).
- DELETE `src/components/dashboard/mistakes-tile.tsx` (62 lines).
- DELETE `src/components/dashboard/last-sim-tile.tsx` (64 lines; subsumed by Previous Score).
- UPDATE `src/components/dashboard/dashboard.tsx` to remove the bottom-row grid + the three imports.

**MissionCard alternate CTA (ask 6):**
- COMMIT 1: change `mission.ts` stub's alternateHref to `/full-length/configure` + alternateLabel to something benign (e.g. "Take the full sim instead") — interim, redundant but functional.
- COMMIT 8: real impl reads mastery_state + most-recent drill session, returns `alternateHref: \`/drill/${pickedSubTypeId}/run\`` + `alternateLabel: "Drill {subType-display-name}"`.

**Schema migration:**
- ADD `target_score: integer("target_score").notNull().default(40)` to `src/db/schemas/auth/users.ts`.
- RUN `bun db:generate` + `bun db:push`. Audit live DB pre/post per §6.14.21.
- Latest migration baseline: 4 SQL files (0000-0003) + 5 meta entries (4 snapshots + journal) per dashboard round commit 2 audit.

**Server Actions (ask 3):**
- ADD `updateGoal(targetScore: number)` to `src/app/(app)/actions.ts`.
- ADD `updateTargetDate(targetDateMs: number | null)` to `src/app/(app)/actions.ts`.
- Each: Zod-parsed input + `requireUserId()` + `errors.try` + `revalidatePath("/")` per `saveOnboardingTargets` precedent.

**Real-data wiring (asks 2, 4, 5, 6):**
- REPLACE `src/server/dashboard/score.ts` stubs (`computeScoreEstimate`, `getLastFullSim`) with real reads.
- REPLACE `src/server/dashboard/pace.ts` stub (`computePaceWeek`) with new helper shape (last sim's pace + 5-sim history). May rename to `computePreviousPace` for clarity; data contract update at `types.ts`.
- REPLACE `src/server/dashboard/mistakes.ts` stub (`countMistakes`) with real query.
- REPLACE `src/server/dashboard/mission.ts` stub (`pickTodaysMission`) with real picker reading mastery_state + most-recent drill session.
- UPDATE `src/server/dashboard/types.ts` `DashboardData` shape: `score.previousScore?: number`, `score.previousFiveScores: ReadonlyArray<number | undefined>` (5-element), and same for pace; `lastSim` field deletes (subsumed).

### 4.2 Out of scope

- Belts PRD: real promotion logic. `loadAllBelts` stays stubbed all-white.
- Streaks PRD: `computeStreak` stays stubbed at 0.
- Lessons PRD, Stats PRD, full Mistakes-Review PRD. Stub pages stay placeholders.
- Real /review surface design — Mistakes count is real, the page itself stays a stub.
- Deploy decision.
- Mobile design polish beyond "doesn't break".
- Container queries.
- Dark-mode body-weight tuning.
- Focus-shell `prefers-reduced-motion` scope-anchor (queued operational follow-up from dashboard round commit 11).
- `selection.test.ts:684` `fullLengthNoReServe` flake fix (queued operational follow-up).
- §6.14 promotion sub-round (queued from dashboard round close — 5 candidates accumulated).
- Anything not listed in §4.1.

## 5. Commit ledger

Single chain of 12 commits. Each commit independently reviewable, lint+typecheck+test-clean, ships a coherent slice. Commit 1 absorbs the plan-doc per the dashboard round's commit-1 precedent (plan-doc redlines + first work item bundled). Original draft proposed 13 commits with a separate TopNav rename commit; at plan approval, that small TopNav-rename commit merged into the larger Mastery-Map-UI-removal commit because both touch the same conceptual surface (the picker is gone; the nav reflects that). Round becomes 12 commits.

| # | Title | Files touched | Verifies |
|---|---|---|---|
| 1 | plan-doc redlines + atomic Mastery-Map-removal + TopNav rename | this plan-doc, `src/components/mastery-map/*` (delete 7), `src/server/mastery/near-goal.ts` (delete), `src/server/mastery/recommended-next.ts` (delete), `src/app/(app)/drill/page.tsx` (delete the picker), `src/components/dashboard/top-nav.tsx` (NAV entry `Practice` → `Practice Test`, href `/drill` → `/full-length/configure`), `src/components/drill/empty-bank-pane.tsx` (href rewrite `/drill` → `/`), `src/server/dashboard/mission.ts` (interim alternateHref to `/full-length/configure` per decision 4) | bun lint:all + bun typecheck + bun test 79/79; grep src/ for `@/components/mastery-map` returns zero matches; grep `@/server/mastery/near-goal` + `@/server/mastery/recommended-next` returns zero; curl /drill → 404; curl /full-length/configure → 200 (auth-redirect path); TopNav "Practice Test" entry visible in SSR-harness HTML; mastery_state schema + recompute workflow UNCHANGED |
| 2 | Drill route restructure: delete configure, default-5, BeltRow href fix | `src/app/(app)/drill/[subTypeId]/page.tsx` (DELETE the configure surface), `src/app/(app)/drill/[subTypeId]/run/page.tsx` (default drillLength=5; absorb empty-bank pre-check), `src/server/dashboard/belts.ts` (href update `/drill/<id>` → `/drill/<id>/run`) | curl /drill/<id> → 404; curl /drill/<id>/run → 200 (auth-redirect path) with drillLength=5 default; empty-bank-pre-check gates on insufficient items for the requested length (5 by default), not just zero items — test: pick a sub-type with fewer than 5 live items if any exists (audit-time check); if all sub-types have ≥5 live items, the threshold protection is forward-looking only; sub-type with zero live items renders `<EmptyBankPane>` not 500 |
| 3 | users.target_score schema add + migration | `src/db/schemas/auth/users.ts`, `drizzle/0004_*.sql` (generated), `drizzle/meta/0004_snapshot.json` + journal entry | **Pre-migration audit per §6.14.21:** capture `SELECT COUNT(*) FROM users` + the existing column list from `information_schema.columns WHERE table_name = 'users'` (baseline before edit). Run `bun db:generate` (creates 0004_*.sql migration file). Run `bun db:push` (applies to local dev DB). **Post-migration audit:** verify `target_score` column exists with default 40; row count unchanged from pre-migration baseline; zero NULL values in `target_score` column (notNull + default 40 backfills existing rows). Pre-migration baseline = 4 SQL + 5 meta entries (per dashboard round commit 2 audit); post-migration = 5 SQL + 6 meta entries |
| 4 | Server Actions: updateGoal + updateTargetDate; loadUserProfile real read | `src/app/(app)/actions.ts` (extend with two new actions), `src/server/dashboard/data.ts` (replace `STUB_GOAL_SCORE = 40` constant with a Drizzle SELECT of `users.target_score` — the new column exists from commit 3) | **Validation specifics:** `updateGoal: z.number().int().min(1).max(50)`. `updateTargetDate: z.number().int()` with past-date warning logged but not rejected (post-test review use case keeps past dates writable). Both actions log before throw per `rules/require-logger-before-throw.md`. Pattern: `requireUserId` + `errors.try` + `revalidatePath("/")` per `saveOnboardingTargets` precedent. `loadUserProfile` reads `users.target_score` via existing PK index; throwaway runtime smoke calls each action and verifies the user row updated; loadUserProfile returns `goal: row.target_score` no longer hardcoded |
| 5 | Sim Scoring real reads | `src/server/dashboard/score.ts` (replace stubs), `src/server/dashboard/types.ts` (update `DashboardData["score"]` shape — drop `current/delta`; add `previousScore?` + `previousFiveScores`), `src/server/dashboard/data.ts` (orchestrator update for renamed fields), `src/components/dashboard/score-strip.tsx` (will need adapting at commit 9; for this commit just update the consumer to keep building — the real ScoreStrip rebuild lands at commit 9) | EXPLAIN ANALYZE on the 5-sim query confirms Index Scan via `practice_sessions_user_type_ended_idx`; throwaway smoke against a known user verifies returned shape. **`DashboardData.lastSim` field STAYS in the type contract for this commit; `getLastFullSim` returns the lastSim shape (or undefined for sub-1-sim users). Field deletion deferred to commit 10 (Bottom strip removal) where `<LastSimTile>` deletes alongside the type contract change.** |
| 6 | Pace real reads (last sim + 5-sim history) | `src/server/dashboard/pace.ts` (replace stub), `src/server/dashboard/types.ts` (rename `DashboardData["pace"]` fields: drop `medianSeconds/targetSeconds/last7Days`; add `previousPaceSeconds?` + `previousFivePaceSeconds`), `src/server/dashboard/data.ts` (orchestrator update) | EXPLAIN ANALYZE on `percentile_cont(0.5)` median query; throwaway smoke verifies shape |
| 7 | Mission picker real impl (ask 6) | `src/server/dashboard/mission.ts` (replace stub) | mastery_state + most-recent-drill-session reads; alternate href is `/drill/<id>/run`; alternates verbal/numerical based on last drill session's section; tie-break = verbal-first per decision 7; throwaway smoke against a known user verifies the returned mission's alternateHref points at a live sub-type |
| 8 | countMistakes real read | `src/server/dashboard/mistakes.ts` (replace stub) | EXPLAIN ANALYZE on the JOIN+COUNT query; throwaway smoke verifies count matches expected (zero for fresh user; > 0 for users with attempts) |
| 9 | ScoreStrip rebuild: 5-stat top panel with editable Goal + Days, sparklines for Previous Score + Previous Pace | `src/components/dashboard/score-strip.tsx` (large rewrite), new `src/components/dashboard/goal-editor.tsx` ("use client" popover wrapper for numeric Goal input), new `src/components/dashboard/target-date-editor.tsx` ("use client" popover wrapper for date input), new `src/components/dashboard/sparkline.tsx` (5-bar SVG primitive — recyclable for Previous Score + Previous Pace), `src/components/dashboard/dashboard.tsx` (pass score + pace + mistakesQueue.count props) | streaming-SSR throwaway harness renders top panel with all 5 stats; clicking Goal opens popover; submitting fires updateGoal action and revalidates; same for Days; sparklines render 5 bars in correct order with empty-state subdued bars per decision recommendation |
| 10 | Bottom strip removal — atomic | `src/components/dashboard/pace-metric.tsx` (DELETE 88 lines), `src/components/dashboard/mistakes-tile.tsx` (DELETE 62 lines), `src/components/dashboard/last-sim-tile.tsx` (DELETE 64 lines), `src/server/dashboard/types.ts` (remove `lastSim` field from `DashboardData` type contract — deferred from commit 5 per redline 3), `src/server/dashboard/score.ts` (`getLastFullSim` may stay or simplify; align with type contract), `src/server/dashboard/data.ts` (orchestrator drops `lastSim` field assignment), `src/components/dashboard/dashboard.tsx` (drop bottom-row grid + 3 imports + remove `<LastSimTile>` render). **Atomic:** delete `<LastSimTile>` file + remove `lastSim` field from `DashboardData` type + remove `<LastSimTile>` render in `<Dashboard>` wrapper. All in one commit to keep the type contract consistent | streaming-SSR throwaway harness renders dashboard with NO bottom row; visual diff vs commit 9 baseline; grep src/ for the deleted component names returns zero; tsgo typecheck confirms no orphan `lastSim` references |
| 11 | full-surface Alpha Style audit + polish | varies — typically 1-3 surfaces touched per audit findings | parallels dashboard round commit 11; PRD-style acceptance criteria all green; the same PRD §15-equivalent invariant set (cobalt-rule-of-N, focus-visible, em-dash empty-states) verified for the new top panel; `prefers-reduced-motion` confirmed honored on the new sparklines |
| 12 | round-close — plan-doc status flip | this plan-doc | wholesale-replacement-with-quote-preservation per §6.14.20; `git diff` confirms only this plan-doc touched; bun lint:all + typecheck + test all green |

**Commit 1 plan-doc absorption note.** Per the dashboard round's commit-1 precedent (which absorbed plan-doc redlines into the first feature commit), this round's commit 1 lands the plan-doc redlines AND the atomic Mastery Map UI removal + TopNav rename. Plan-doc-only commits are out of convention.

**Commit ordering rationale.**
- Commit 1 finishes the picker-deletion arc (Mastery Map UI + TopNav reflects the absence). Commit 2 finishes the drill-route restructure. After commit 2, the codebase is stable on the structural changes; the data layer + ScoreStrip rebuild can proceed without route ambiguity.
- Commit 3 lands the schema migration. Must precede commit 4 (Server Actions write to the new column + loadUserProfile reads from it) + commit 9 (ScoreStrip reads via loadUserProfile).
- Commits 4-8 land the data layer (Server Actions + loadUserProfile real read + 4 stub-replacements). All independent in shape; commit 4 is the only one with a schema-migration precondition. Recommended order has 4 before 9 (ScoreStrip consumes the actions) and 5-8 before 9 (ScoreStrip consumes the new helper shapes).
- Commit 9 is the largest UI rebuild. Depends on all prior data-layer + schema + actions commits being in place.
- Commit 10 cleanups deletions; deferred until after commit 9 verifies the new ScoreStrip subsumes their roles. Atomic with the `lastSim` type-contract change to keep tsgo + the orchestrator consistent.
- Commits 11-12 are the standard polish + close pair.

**Branching.** Single-branch round (no nested feature branches). Commits land on `main` after each is lint+typecheck+test-clean. No remote pushes from Claude.

## 6. Working principles (recap)

- Superbuilder ruleset same as dashboard round (PRD §3): no try/catch, no new Error(), no console.log, no setInterval, no process.env, no forEach, no barrel files, no `as` (except as const), no <img>, all timestamps `bigint("col_name_ms")`, UUIDv7 PKs, log-before-throw, Pino object-first, RSC by default, "use client" only when needed.
- Closed-plans-immutable per §6.14.20 once Leo approves.
- Per-commit audit-against-actual-artifact (§6.14.18). Schema migration runs `bun db:generate` + `bun db:push`; per §6.14.21, audit live DB row-state pre and post.
- Real-data wiring: 4 stubs from PRD §19 go real this round (Sim Scoring's two helpers, Pace-Strip's helper, Mission Picker's helper, Mistakes count). Each replacement is a one-file change.
- Two-step migration discipline: where any existing surface changes, copy-then-replace per the dashboard round's pattern (the new ScoreStrip can be drafted alongside the old one in commit 10's same-commit replace, OR as a new component shipping at commit 10 and getting mounted at commit 10's same point).
- The Goal + Days popovers are the round's first interactive form state on the dashboard. Use minimal client-state (`useState` in popover wrappers); Server Actions for the mutations; no React Query, no other state-mgmt libs.
- typedRoutes constraint applies: `<Link>` for static-literal hrefs; plain `<a>` for dynamic-string hrefs (per dashboard round commits 7+8 reconciliation).

## 7. Acceptance criteria

Mirrors the dashboard round's PRD §15 with adaptations for the practice-round surfaces.

**Visual.**
- [ ] Top panel renders 5 stat slots + greeting in a single row at md+; wraps responsively at smaller breakpoints
- [ ] Previous Score sparkline renders 5 bars; empty slots subdued per decision recommendation
- [ ] Previous Pace sparkline renders 5 bars
- [ ] Cobalt accent rule-of-4 holds (mission eyebrow + greeting italic + Goal value + 1 sparkline accent — count adapts to new layout)
- [ ] Goal value rendered as raw integer (no `%` suffix; preserved from dashboard round Decision F)
- [ ] Days-to-test value rendered as raw integer days
- [ ] Both light + dark modes render without WCAG AA violations (DevTools audit — Leo's authenticated pass per dashboard round Decision I precedent)
- [ ] Drill post-session `<BeltIndicator>` looks unchanged from `8a10fb1` baseline (preservation invariant across rounds)

**Behavior.**
- [ ] Belt row → `/drill/<subTypeId>/run` (URL-encoded); empty-bank sub-type renders `<EmptyBankPane>` not 500
- [ ] Mission primary CTA → `/full-length/configure`
- [ ] Mission alternate CTA → `/drill/<picked-sub-type>/run` (real picker output; alternates verbal/numerical based on last drill session's section)
- [ ] Active "Practice Test" nav item highlighted on `/full-length/*` routes
- [ ] /drill returns 404 (intentional; the picker is gone)
- [ ] /drill/<id> returns 404 (configure deleted)
- [ ] /drill/<id>/run returns 200 with drillLength=5 default
- [ ] Goal click opens editor popover; submitting numeric value calls updateGoal action; ScoreStrip re-renders with new value (revalidatePath("/") fires)
- [ ] Days-to-test click opens date picker; submitting calls updateTargetDate action; ScoreStrip re-renders with updated days math
- [ ] ScoreStrip empty-state for zero-sim user: Previous Score em-dash; sparkline subdued bars; Previous Pace em-dash; sparkline subdued bars
- [ ] Mistakes count is the real query result (0 for fresh user; > 0 for users with attempts)
- [ ] Bottom row absent from page composition; previously-rendered PaceMetric/MistakesTile/LastSimTile content appears nowhere
- [ ] All 4 nav items (`/`, `/full-length/configure`, `/lessons`, `/review`, `/stats`) resolve to a 200; "Practice Test" highlights when on `/full-length/*`

**Constraints.**
- [ ] `bun lint:all` passes (Biome + super-lint + GritQL)
- [ ] `bun typecheck` passes
- [ ] `bun test` passes 79 → 79 across N≥3 stable runs (the pre-existing `selection.test.ts:684` flake remains queued operational concern)
- [ ] Zero `try…catch` blocks in new files
- [ ] Zero `as` casts (other than `as const`) in new files
- [ ] Zero `null` types in new function-boundary signatures (only `?:` optionals)
- [ ] Zero `??` operators in new files
- [ ] Zero `<Link>` with dynamic-string hrefs
- [ ] One new schema migration (`drizzle/0004_*.sql`); pre = 4 SQL files / post = 5 SQL files; live DB has `target_score` column with default 40 (existing rows updated)
- [ ] No `bun db:migrate` invoked outside the planned commit 4 (no accidental migrations)
- [ ] Mastery Map subtree fully removed: `grep -rln "@/components/mastery-map" src/` returns zero
- [ ] `mastery_state` table + schema file UNCHANGED; only the UI/derivation layer removes
- [ ] Drill route is exactly `/drill/[subTypeId]/run` (no `/drill` index, no `/drill/[id]` configure)

**Mutations.**
- [ ] `updateGoal` action signature: Zod-parsed `targetScore: number` (0-50); requireUserId; errors.try; revalidatePath("/")
- [ ] `updateTargetDate` action signature: Zod-parsed `targetDateMs: number | null` (null = clear date); same wrapper pattern
- [ ] Both actions log `info` on success and `error` before throw on failure (rules/require-logger-before-throw.md)
- [ ] revalidatePath("/") fires after each successful write; ScoreStrip re-renders without a manual reload

**Motion + a11y.**
- [ ] All transitions use `--ease-out`; durations are `--d-fast` or `--d-base`
- [ ] `prefers-reduced-motion: reduce` honored (continues from dashboard round commit 11)
- [ ] Every interactive element (Goal/Days editors, mission CTAs, nav links) has visible `:focus-visible` outline
- [ ] Goal + Days popovers trap focus when open; ESC closes them
- [ ] `aria-label` on the avatar; `aria-expanded` on the Goal/Days editor triggers; popover surfaces have `role="dialog"` or appropriate ARIA

## 8. Risks and known unknowns

- **First mutation surface on the dashboard.** The page goes from read-only to read-write. RSC patterns adapt: the editors are "use client" popover wrappers that call Server Actions; the ScoreStrip parent stays server-component-by-default. Risk: revalidatePath("/") may interact awkwardly with the dashboard's `getDashboardData` Promise.all; mitigation = follow `saveOnboardingTargets` precedent exactly + verify via runtime smoke at commit 5.
- **Schema migration is the round's first.** `bun db:generate` + `bun db:push` against the dev DB. If the existing dev DB has rows, the default-40 backfill needs to apply cleanly. Audit the live DB row-state before AND after per §6.14.21. Rollback plan: `db:drop:schema` (per package.json) + replay `db:seed` if migration corrupts state — but better to run a non-destructive `ALTER TABLE` first via `db:generate` + manual review of the generated SQL before `db:push`.
- **5-sim history empty-slot rendering.** The decision is "subdued bars per recommendation." Visual fidelity here is Leo-eyeball at commit 12. If subdued bars look wrong, fall back to "hide bars; show 'Take more sims' empty-state copy" — that's a one-line ScoreStrip JSX change.
- **Mission picker over-spec.** Ask 6's rules ("lowest mastery, alternate verbal/numerical") are simple but may produce unintuitive picks for users with no diagnostic completed (mastery_state may be sparse). Mitigation: gate the dashboard behind the existing `(app)/layout.tsx` diagnostic-completed gate (no change); ensure mastery_state always has rows for every sub-type post-diagnostic (verify in audit at commit 8).
- **typedRoutes + dynamic-href reconciliation extends.** Ask 6's mission alternate CTA uses a runtime-derived `/drill/<id>/run` href. Per dashboard round commits 7+8 pattern, MissionCard's alternate CTA already uses plain `<a>` not `<Link>`. No new reconciliation needed; the existing pattern absorbs ask 6 cleanly.
- **MissionCard alternate CTA gap window.** Decision 4's option-1 (interim redundant CTA pointing at /full-length/configure) creates a 7-commit window (commits 1-8) where the alternate CTA is functionally redundant. Cosmetic concern only; commit 8 closes it.
- **`lastSim` field deletion** in DashboardData["lastSim"] type at commit 6 is a breaking change to the type contract. Components consuming it (currently only `<LastSimTile>`, which deletes at commit 11) need to come down before or alongside the type change — done by ordering commit 11 after commit 10, or by deleting `<LastSimTile>` import at commit 6 (defer the file delete to commit 11).
- **Drill 5-question default may surface bank-thin sub-types.** Some sub-types have <5 live items; currently the configure page's empty-bank pre-check catches the zero case but not the "<5" case. With drill default=5, `startSession` may throw `ErrFirstItemMissing` for thin sub-types. Audit at commit 3: confirm every live sub-type has ≥5 items, OR add a "<5" empty-bank branch to `<EmptyBankPane>` in the run page.

## 9. Out of scope

Restated. None of the following land this round:

- Belts PRD: real promotion logic, `loadAllBelts` real read, walker-based promotion writes.
- Streaks PRD: `computeStreak` real read.
- Lessons PRD, Stats PRD, full Mistakes-Review surface (the page itself; the count is real).
- Real /review page (stays a stub).
- Deploy.
- Mobile design polish beyond "doesn't break".
- Container queries on dashboard components.
- Dark-mode body-weight tuning per ALPHA §3.
- Focus-shell `prefers-reduced-motion` scope-anchor follow-up.
- `selection.test.ts:684 fullLengthNoReServe` flake fix.
- §6.14 promotion sub-round (5 candidates accumulated from dashboard round; queued).
- Any change to focus shell, post-session UI, diagnostic flow, full-length flow, drill /run page beyond accepting drillLength=5 default and absorbing the empty-bank check.
- `target_percentile` column removal — stays; `saveOnboardingTargets` continues writing it from the post-session onboarding form. The dashboard ignores it per Decision D resolution from the prior round.
- Repurposing `/drill` to render anything else (it 404s after this round).

---

> **Status: shipped 2026-05-07.** Round-close at commit 12 of 12; see top-of-file status block for the twelve-commit ledger + round-close summary. Plan body bit-for-bit immutable from this commit onward per SPEC §6.14.20.
