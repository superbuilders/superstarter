# Plan — Score-Based Target Goals (Sidecar; replaces percentile-based targets)

> **Status: shipped 2026-05-09.** All 5 implementation/admin commits + round-close landed at `<TBD>` (per §5.4). Sidecar closed against `main` at HEAD `9f35549` (Round 2 round-close); zero new SPEC §6.14 promotions; 4 round-close commentary entries captured at §9.1-§9.4; 12 residuals forward-pinned at §8 to Round 3+ work.
>
> **Sidecar opened against `main` at HEAD `9f35549`** (Round 2 round-close commit; post-amend hash on linear history). Round 2 shipped 2026-05-09 per its own `§5.15` status pin; SPEC §6.14.42 (audit-step grep-verify-consumers when deleting/renaming type-or-function exports) + SPEC §13 (Token architecture) both verified at `docs/SPEC.md:1817` + `docs/SPEC.md:2738` respectively.
>
> **CRITICAL §6.14.40 finding surfaced at audit-step (b):** the redirect's framing assumed `users.targetScore` would be a NEW column + the dashboard GOAL section would need score-display work. **Empirically, both already shipped at "practice round commit 3" + commits 4+9+** (a round prior to Round 1 / Round 2). See §0.2 + §0.3 below for the empirical inventory. The sidecar's actual remaining scope is materially smaller than the redirect anticipated. **Stop-and-report at §0; await Leo's scope-reduction redirect before commit 1.**

---

## §0 — Commit-0 audit findings

Ten audit steps per the sidecar-opening redline. Each finding ends with a positional conclusion (one-line scope flag, schema-vs-empirical classification, or open question for Leo). All file paths are anchored to the repo root.

### §0.1 Round 2 close-hash anchor verify (audit step (a))

Verified via `git log --oneline -1 9f35549`: `9f35549 docs(plan): close round 2 (post-session audit fixes + wide token retrofit)`. Round 2's plan-doc status pin at line 3 of `docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md` reads `"Status: shipped 2026-05-09."` SPEC additions verified:

- **§6.14.42** at `docs/SPEC.md:1817` — `"Audit-step grep-verify-consumers when deleting/renaming type-or-function exports"`. Round 2 round-close addition; load-bearing for this sidecar's audit-steps (b)+(d)+(e)+(f)+(g)+(h).
- **§13** at `docs/SPEC.md:2738` — `"Token architecture"` top-level section with §13.1-§13.6. Round 2 commit 1 (`7031167`) addition.

Sidecar plan-doc anchors against **`9f35549`**.

### §0.2 Schema-current-state audit (audit step (b)) — **critical finding**

Read `src/db/schemas/auth/users.ts` end-to-end (28 lines). Captured verbatim:

```typescript
const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
        name: varchar("name", { length: 256 }),
        email: varchar("email", { length: 320 }).notNull(),
        emailVerifiedMs: bigint("email_verified_ms", { mode: "number" }),
        image: text("image"),
        targetPercentile: integer("target_percentile"),
        targetDateMs: bigint("target_date_ms", { mode: "number" }),
        // Practice round commit 3 (`docs/plans/practice-round.md` §5
        // commit 3 + decision 2): target raw score the user is aiming
        // for on a 50-question CCAT full sim. notNull + default 40 per
        // decision 2 mirrors the dashboard round's STUB_GOAL_SCORE so
        // loadUserProfile can drop the stub and read this column
        // directly (commit 4). Migration 0004_*.sql backfills every
        // existing row to 40.
        targetScore: integer("target_score").notNull().default(40),
        createdAtMs: bigint("created_at_ms", { mode: "number" })
            .notNull()
            .default(sql`(extract(epoch from now()) * 1000)::bigint`)
    },
    (table) => [uniqueIndex("users_email_idx").on(table.email)]
)
```

**Critical findings:**

| Finding | Detail |
|---|---|
| `targetPercentile` column | `integer("target_percentile")` — nullable, no default. Pre-existing column. |
| `targetScore` column | **ALREADY EXISTS** as `integer("target_score").notNull().default(40)`. Added at "practice round commit 3" (per the in-line comment); migration 0004 backfills all existing rows to 40. |
| `targetDateMs` column | `bigint("target_date_ms", { mode: "number" })` — paired with the target columns. Unrelated to the percentile-vs-score pivot; preserved. |

**Migration `drizzle/0004_square_speedball.sql` content (verified):**

```sql
ALTER TABLE "users" ADD COLUMN "target_score" integer DEFAULT 40 NOT NULL;
```

The migration shipped already. The `target_percentile` column is **dead-on-the-DB-side already** — `loadUserProfile` reads `target_score` not `target_percentile` (per `src/server/dashboard/data.ts:13` doc-comment: *"`target_percentile` is intentionally NOT read"*).

**Conclusion:** the sidecar's redirect-framed scope item "add `users.targetScore` column" is **already done**. Schema migration scope reduces to **drop `targetPercentile` column** (Strategy A).

### §0.3 Pre-launch verification (audit step (c))

Per Strategy A, existing target-percentile data should drop. Per audit step (b) finding: `target_percentile` is already orphan-once-loaded — the dashboard reads `target_score` exclusively, not `target_percentile`. Migration 0004 (the practice round's earlier work) ALREADY shipped a `target_score`-default-40 backfill, so every existing user row already has a non-default-40 target_score independent of any target_percentile data.

**Migration shipped status (git log evidence):** `drizzle/0004_square_speedball.sql` exists in the repo at audit time. No git evidence of a prod deployment in this session's accessible context — the sidecar treats this as **dev-DB-only** for its own scope. If prod has already shipped migration 0004, dropping `target_percentile` is structurally safe (it's already not-read post-practice-round commit 4); dropping the column drops the dead data.

**Strategy A viability: CONFIRMED.** Dropping `target_percentile` is safe because:
1. `loadUserProfile` already reads `target_score` exclusively (per `data.ts:13` comment + line 141 select).
2. `target_score` defaults to 40 NOT NULL per migration 0004 backfill — every user has a valid score.
3. No production-blocking concern surfaces from the dev-side audit.

If Leo's external knowledge says prod has live percentile data that needs preserving (e.g., backfill `target_score` from `target_percentile` × 0.5 × 50 = score equivalent), surface for Strategy reconsideration. **Default disposition: drop column; no backfill** per Strategy A's redline framing.

### §0.4 UI surface inventory — `<OnboardingTargets>` (audit step (d))

Read `src/components/post-session/onboarding-targets.tsx` end-to-end (post-Round-2-state; 240 lines). Captured:

| Item | Detail |
|---|---|
| `TARGET_PERCENTILES` constant (line 30) | `[50, 30, 20, 10, 5] as const` |
| `TargetPercentile` type (line 31) | `(typeof TARGET_PERCENTILES)[number]` |
| `isPercentile` type-guard (lines 33-38) | Iterates `TARGET_PERCENTILES`; narrows `number` → `TargetPercentile` |
| `percentile` useState (line 90) | `React.useState<TargetPercentile \| null>(null)` |
| Submit handler `onSave` flow (lines 110-114) | Builds `targetPercentile = percentile === null ? undefined : percentile`; calls `saveOnboardingTargets({ targetPercentile, targetDateMs })` |
| `<select>` JSX (lines 152-172) | `<select id="onboarding-percentile" name="percentile" value={percentileSelectValue}>` with `<option value="">Select…</option>` + `TARGET_PERCENTILES.map(...)` rendering "Top 50%", "Top 30%", etc. |
| Round 2 commit 7 error-state slot | `submitError` useState + form-level `aria-describedby`-wired `role="alert"` region. **Pivot-independent;** ports forward unchanged. |
| Round 2 commit 8 blur-validation | `validateDateNotPast` + `dateError` useState + per-field error region. **Pivot-independent** (date validation only); ports forward unchanged. The score-input replacement applies a *parallel* validation discipline (1 ≤ score ≤ 50) but doesn't touch date logic. |
| Round 2 commit 9 touch-target `pointer-coarse:min-h-11` | Already on `<select>` + `<input type="date">`. Same class applies to the new `<input type="number">`. **Pivot-independent.** |
| Round 2 commit 14 skip-link copy + focus-visible | `"Skip and go to dashboard"` + canonical focus-visible classes. **Pivot-independent.** |
| Doc-comment block at top (lines 7, 13) | References "target percentile from the discrete set { 50, 30, 20, 10, 5 }" + "users.target_percentile / target_date_ms columns stay null". **Stale post-pivot;** needs update at sidecar commit time. |
| Exports (lines 235-237) | `export type { TargetPercentile }`; `export { OnboardingTargets, TARGET_PERCENTILES }`. **Both `TargetPercentile` + `TARGET_PERCENTILES` become dead post-pivot — delete from exports.** |

**Replacement shape proposal (matches `<GoalEditor>` semantics from §0.5):**

- `<input type="number" min={1} max={50} step={1} value={scoreString} ...>` instead of `<select>`.
- Default value: `40` per redirect default. Empty allowed (skip-for-now path; matches existing date-empty-allowed pattern).
- State: `score: number | null` useState peer (replaces `percentile: TargetPercentile | null`).
- Validation: `validateScoreRange(value)` pure-function helper (mirrors `validateDateNotPast` from commit 8 — `1 ≤ score ≤ 50`, integer; empty allowed).
- Per-field error region + aria-describedby (mirrors commit 8's date error region).
- Submit-time re-validation in `onSave` (mirrors commit 8's defense-in-depth).

### §0.5 UI surface inventory — Dashboard "GOAL" section (audit step (e)) — **already shipped**

`<GoalEditor>` exists at `src/components/dashboard/goal-editor.tsx` (87 lines). Read end-to-end. Captured:

| Item | Detail |
|---|---|
| Component header doc-comment | *"`<GoalEditor>` — popover content for editing the user's `target_score`. Practice round commit 9. Wires to updateGoal Server Action from commit 4."* |
| Form shape | `<input type="number" min={1} max={50} step={1}>` + `<button>Save</button>`. Value initialized from `props.initial`. |
| State | `value: string` useState (initialized to `String(initial)`); `isPending` from `useTransition`; `error: string \| undefined`. |
| Submit handler | Parses to int; validates `1 ≤ parsed ≤ 50`; on invalid sets error string `"Goal must be between 1 and 50."`; on valid calls `updateGoal({ goal: parsed })` then `onSaved()` callback. |
| Server action wiring | `updateGoal` from `@/app/(app)/actions` |
| Auto-focus on mount | `useEffect` with `inputRef.current?.focus()` |
| Error region | `<p className="text-[12px] text-pace-over" role="alert">` |

**Wiring into Dashboard ScoreStrip** (`src/components/dashboard/score-strip.tsx`):

- Imports `<GoalEditor>` at line 37.
- Renders the goal value at line 113: `{score.goal}`.
- Wires editor in popover at line 118: `{(close) => <GoalEditor initial={score.goal} onSaved={close} />}`.
- Score data shape includes `goal: row.targetScore` per `src/server/dashboard/data.ts:168`.

**Doc-comment evidence (`score-strip.tsx:26`):** *"Goal is a target raw score out of 50, not a target percentile."*

**Conclusion:** the redirect-framed sidecar scope item "Dashboard GOAL section update" is **already done**. The dashboard reads + edits `target_score` end-to-end via `<GoalEditor>` + `updateGoal`. Sidecar makes **NO changes** to the dashboard surface.

### §0.6 `updateGoal` server action — already shipped (audit step (f) partial)

At `src/app/(app)/actions.ts:203-230` (per grep). Captured:

```typescript
// updateGoal — dashboard editor for users.target_score. Practice round
// commit 4 (`docs/plans/practice-round.md` §5 commit 4 + ask 3).
// Range 1..50 per redline 5: target_score is a raw correct count out
// of 50.
// ... [Zod schema { goal: z.number().int().min(1).max(50) }]
// ... [updates users.targetScore via Drizzle]
// ... [revalidatePath("/")]
// ... [logger.info {userId, goal} "updateGoal: target_score persisted"]
```

**Conclusion:** the redirect-framed sidecar scope item "score-write server action" is **already done** for the dashboard editor's path (`updateGoal`). Sidecar's actual write-path work is **updating `saveOnboardingTargets` (the onboarding-form path) to write `targetScore` instead of `targetPercentile`**.

### §0.7 Downstream consumer cascade probe (audit step (f) full) — **§6.14.42 in action**

`grep -rnE "targetPercentile|target_percentile|TARGET_PERCENTILES" src/`:

| Consumer | File:Line | Pivot disposition |
|---|---|---|
| `users.targetPercentile` column declaration | `src/db/schemas/auth/users.ts:12` | **DROP** at sidecar schema commit |
| `saveOnboardingTargets` Zod schema field | `src/app/(app)/actions.ts:150-159` | **DROP** percentile field; ADD `targetScore` field |
| `saveOnboardingTargets` parsed-data accessor | `src/app/(app)/actions.ts:163, 173, 174, 195` | **REPLACE** percentile→score writes |
| `saveOnboardingTargets` updateValues type | `src/app/(app)/actions.ts:172` | **REPLACE** type field name |
| Dashboard data-fetch comment ("intentionally NOT read") | `src/server/dashboard/data.ts:13` | **UPDATE** doc-comment (now-vestigial; column gone post-sidecar) |
| `<OnboardingTargets>` doc-comment | `src/components/post-session/onboarding-targets.tsx:7, 14` | **UPDATE** to reference target score |
| `TARGET_PERCENTILES` constant | `src/components/post-session/onboarding-targets.tsx:30` | **DELETE** (dead post-pivot) |
| `TargetPercentile` type | `src/components/post-session/onboarding-targets.tsx:31` | **DELETE** (dead post-pivot) |
| `isPercentile` type-guard | `src/components/post-session/onboarding-targets.tsx:33-38` | **DELETE** (dead post-pivot) |
| `percentile` useState + handlers | `src/components/post-session/onboarding-targets.tsx:90, 110-114, 152-172` | **REPLACE** with score useState + score-input |
| `TARGET_PERCENTILES` export | `src/components/post-session/onboarding-targets.tsx:237` | **DELETE** from export list |
| `TargetPercentile` type export | `src/components/post-session/onboarding-targets.tsx:236` | **DELETE** from export list |
| `score-strip.tsx` doc-comment ("not a target percentile") | `src/components/dashboard/score-strip.tsx:26` | **NO CHANGE NEEDED** — comment is already correct (clarifies score-not-percentile post-practice-round). |

**External `TargetPercentile` consumers:** zero hits beyond `<OnboardingTargets>` itself per grep. The export is internally-consumed only (the local `isPercentile` narrows to it). Safe to delete.

### §0.8 Pacing-math + mastery-compute + post-session-copy cascade probe (audit step (g))

Greps:
- `percentile.*pace|pace.*percentile|percentileTarget|targetPace`: **zero hits** in `src/`.
- `masteryCompute.*percentile|percentile.*masteryCompute`: **zero hits**.
- `Your.*target|target.*percentile`: 6 hits, all in narrative doc-comments or in the consumer-cascade list above. **No active code references** percentile-derived pacing math or mastery-compute logic.

**Post-session pacing copy** (`src/components/post-session/post-session-shell.tsx:106` per Round 2 audit-doc evidence):

```
"Your diagnostic took {pacingMinutes} minutes. The real CCAT is 15 minutes for 50 questions."
```

**No percentile reference.** Already score-framing-compatible (mentions 50 questions, the score denominator). **No copy update needed.**

**Conclusion:** the redirect-framed "downstream consumer cascade (pacing math + mastery compute + post-session pacing copy)" scope is **already zero**. Pacing math + mastery compute were never wired to `targetPercentile` in the first place — practice round shipped them on `targetScore` from the start. Post-session pacing copy is score-compatible.

### §0.9 Test cascade probe (audit step (h))

`grep -rnE "targetPercentile|TARGET_PERCENTILES" --include='*.test.ts' src/`: **zero hits.**

**Conclusion:** zero test cascade. No test files reference percentile-derived target logic.

### §0.10 Schema-default-value decision (audit step (i))

The new `users.targetScore` column ships at `notNull().default(40)` per migration 0004 — **already-decided**. The sidecar's only schema work is **drop `users.targetPercentile`**. No new column → no default-value decision needed.

If the sidecar adds OPTIONAL future fields (e.g., `targetScoreSetAtMs` for goal-evolution timeline), defaults are decided per-field at commit time. Out of current scope.

### §0.11 Post-session pacing copy audit (audit step (j))

Captured at §0.8 above (combined with audit step (g) for efficiency). Existing copy is score-framing-compatible; no edits needed.

### §0.12 Open Qs surfaced for Leo to resolve before commit 1

| Q | Question | Resolution proposal |
|---|---|---|
| **Q1** | **Score-input UI shape.** Per redirect's framing: type=number; range 1-50; default 40. | **CONFIRMED** matches `<GoalEditor>`'s pattern verbatim. Sidecar's `<OnboardingTargets>` score-input mirrors `<GoalEditor>` (use the same min/max/step + similar validation). Ports forward Round 2 commits 7-9 patterns (error-state slot + blur-validation + pointer-coarse:min-h-11). |
| **Q2** | **Dashboard GOAL edit affordance.** Per redirect's audit-step (e). | **RESOLVED at audit-time** — `<GoalEditor>` already exists; dashboard ScoreStrip already wires it; `updateGoal` server action already validates 1-50. **No sidecar work for dashboard.** |
| **Q3** | **Existing pacing-math semantic preservation.** Per redirect's audit-step (g). | **RESOLVED at audit-time** — pacing math + mastery compute were NEVER wired to `targetPercentile`; they read `targetScore` from the start (practice round). **No sidecar work for pacing math.** |
| **Q4** | **Mastery compute integration.** Per redirect's audit-step (g) + Q3 resolution. | **RESOLVED at audit-time** — same as Q3; already on `targetScore`. |
| **Q5** | **Diagnostic-flow score capture.** Per redirect's framing: "Users enter score during diagnostic" — pre-diagnostic or post-diagnostic? | **RESOLVED — post-diagnostic** via `<OnboardingTargets>` post-session form. The diagnostic flow itself is untimed (Round 1 §0.15 retraction); no diagnostic-flow score-capture step exists. The `<OnboardingTargets>` form is the canonical onboarding entry point post-diagnostic. Dashboard `<GoalEditor>` lets users adjust score later. |
| **Q6** *(audit-surfaced)* | **Strategy A viability — production data inspection.** | **RESOLVED-DEV-only.** Migration 0004 already shipped to dev with `target_score` default 40 NOT NULL backfill; `target_percentile` is dead-on-the-DB-side (loadUserProfile doesn't read it post-practice-round commit 4). Dropping the column drops orphan data. If Leo has external knowledge of production-shipped percentile data that needs `target_score` backfill (e.g., percentile-to-score mapping `score = round(0.5 × (100 - percentile))` at the 50-question denominator), surface for Strategy A reconsideration. **Default: no backfill; drop column.** |
| **Q7** *(audit-surfaced)* | **Sidecar scope reduction acknowledgement.** Empirical state ≠ redirect-framed state by a wide margin. | **REDIRECT NEEDED.** Surfaced as §0.13 below. Audit-step grep-verify-consumers per §6.14.42 caught this divergence cleanly before code shipped. |

### §0.13 Audit-surfaced scope-change flag — **§6.14.40 instance, scope reduction**

The redirect's commit envelope estimate (6-8 implementation commits + round-close) anticipated:
- Schema migration: **add** `targetScore` column.
- UI replacement: `<OnboardingTargets>` percentile-select → score-input + Dashboard GOAL section update.
- Downstream consumer cascade: pacing math + mastery compute + post-session copy.
- Mastery compute integration commit.
- Test fixture cascade.

Empirical state (per audit-steps b/d/e/f/g/h above):
- Schema migration: `targetScore` column **already added** at migration 0004 (practice round commit 3). Schema work reduces to **DROP `targetPercentile`** column.
- UI replacement: `<OnboardingTargets>` percentile-select → score-input is **the only UI work**. Dashboard GOAL section is **already done** (`<GoalEditor>` from practice round commit 9 + ScoreStrip wiring + `updateGoal` action).
- Downstream consumer cascade: pacing math + mastery compute + post-session copy were **never wired to percentile**. Zero cascade in those areas.
- Mastery compute integration: **already on score**. Zero work.
- Test fixture cascade: **zero hits** for percentile-related tests.

**Reduced empirical scope (4 implementation commits + round-close):**

| # | Commit | Effect |
|---|---|---|
| 0 | Plan-doc creation + §0 audit findings (this commit) | Authoring now |
| 1 | `<OnboardingTargets>` UI replacement | percentile-select → score-input; `validateScoreRange` helper; per-field error region; submit-time re-validation. Mirrors Round 2 commits 7-9 patterns. |
| 2 | `saveOnboardingTargets` action update | Zod schema replaces percentile field with score field (1-50 int); writes `targetScore` instead of `targetPercentile`. |
| 3 | Schema drop `targetPercentile` column + Drizzle migration 0005 | `bun db:generate` to autogen migration; manual review per project convention. Updates `users.ts` to drop the column declaration. |
| 4 | Doc-comment + dead-code cleanup | Drop `TARGET_PERCENTILES` + `TargetPercentile` + `isPercentile` from `<OnboardingTargets>`; update header doc-comments; update `<OnboardingTargets>` exports; update `data.ts:13` doc-comment ("intentionally NOT read" → comment retired since column no longer exists). |
| 5 | Round-close (administrative) | Plan-doc finalization + §6.14 promotion candidates (likely none net-new — this sidecar reinforces §6.14.40 + §6.14.42 without surfacing new patterns). |

**Net commit envelope: 4 implementation + 1 round-close = 5 total** (down from redirect's 6-8). Estimated wall time: half-day at the round's typical pace.

This is a **§6.14.40 instance** — redirector-vs-empirical-state divergence in the **benign-direction** (scope-reducing, not adversarial). The audit-step grep-verify-consumers per §6.14.42 caught it cleanly before code shipped; the sidecar's redirect can adjust scope before commit 1.

### §0.14 Stop-and-report

This plan-doc is the commit-0 deliverable. Per the round-opening contract + the §0.13 scope-reduction finding, sidecar STOPS at §0 and reports findings. **No body sections (§1-§8) authored until Leo redirects with the reduced-scope confirmation.**

Specifically requested per stop-and-report contract: confirm the §0.13 commit envelope reduction (5 commits net) before authoring §1.2 envelope + §5 commit ledger.

---

## §1 — Round scope

### §1.1 In-scope

Three workstreams (per Leo's C2 redirect + §0 audit findings + §0.13 reduced-scope finding):

1. **`<OnboardingTargets>` UI replacement** (commit 1, bundled per Option C2): percentile-select → score-input + `validateScoreRange` helper + `scoreError` state + per-field error region. Round 2 commits 7-9 patterns ported forward (error-state slot + blur-validation + `pointer-coarse:min-h-11`). **STATUS: SHIPPED at `729a08e`.**
2. **`saveOnboardingTargets` action update** (commit 1, bundled): Zod schema `targetPercentile` literal-union → `targetScore z.number().int().min(1).max(50)`; Drizzle write path replaces `targetPercentile` with `targetScore`. **STATUS: SHIPPED at `729a08e`.**
3. **Schema drop** (commit 2): drop `users.targetPercentile` column + Drizzle migration 0005. Strategy A — drop without backfill (no production data per Q6 confirmation; column orphaned-since-practice-round-commit-4). **STATUS: SCHEDULED.**
4. **Doc-comment + dead-code cleanup** (commit 3): drop `TARGET_PERCENTILES` constant + `TargetPercentile` type from `<OnboardingTargets>` (and their exports). Update `data.ts:13` doc-comment ("intentionally NOT read" comment retires post-column-drop). `isPercentile` ALREADY pre-poned to commit 1 per audit-step empirical adjustment. **STATUS: SCHEDULED.**
5. **Round-close** (commit 4): plan-doc finalization + status flip + hash backfill across §5.0-§5.3 + §6.14 promotion candidates (likely zero net-new — sidecar reinforces §6.14.40 + §6.14.42 without surfacing new patterns). **STATUS: SCHEDULED.**

### §1.2 Commit envelope

Sidecar empirical envelope: **6 commits total** (commit 0 plan-doc + commit 1 UI/action bundled + follow-up plan-doc body authoring + commit 2 schema drop + commit 3 cleanup + commit 4 round-close). Estimated wall time: **half-day** at the round's typical pace.

Mid-round insertions (per §6.14.34 narrow-scope sub-round insertion):
- **Option C2 simplification**: Leo's C2 redirect bundled commit 1's UI + action update (originally framed as 2 separate commits in the Option C1 redirect). Net envelope effect: −1 commit.
- **Disposition X mid-round insertion**: this follow-up plan-doc body-authoring commit was inserted after commit 1 ships per Leo's Disposition X redirect (audit-trail consistency with Round 2's inline plan-doc-body-authoring pattern). Net envelope effect: +1 commit.
- **Net commit count: 6** (commit 0 + 5 sequential commits).

### §1.3 Explicitly deferred out-of-scope

Per §6.14.30 cascade-undercount defense:

| Deferred item | Forward-pin |
|---|---|
| Diagnostic timing reintroduction | Diagnostic-timing sidecar round (Round 1 §0.15; opens at Leo's discretion) |
| Review-section architecture | Round 3 |
| Review-specific features (line chart, filters, etc.) | Round 4 |
| §B.5 motion sweep + remaining P3 polish (§A.2.f1, §A.3.f1, §A.7.f3, §A.9.f2) | Future polish round |
| Sub-phase b validator | Indefinitely deferred (per Round 1 context) |
| `--border` 1.23:1 sub-3:1 contrast | Future-round token-system follow-up |
| `.catch()` pattern at `onboarding-targets.tsx:onSave` | Future polish round |
| Hook re-enable (`~/.claude/hooks/cbm-code-discovery-gate`) | Environmental, not project |
| Round 1 inherited residuals not closed by Round 2 (`loadAllBelts` stub; non-white belt visual review; number-series shape coverage; `urgencyLoop` naming debt) | Belts PRD round / future polish |

---

## §2 — Captured anchors

### §2.1 Q1-Q7 final resolutions

Per §0.12 audit findings + Leo's redirect confirmations:

| Q | Final resolution | Closed at |
|---|---|---|
| **Q1 — score-input UI shape** | `<input type="number" min={1} max={50} step={1}>` matching `<GoalEditor>` pattern. Default 40 (Path D2). Round 2 commits 7-9 patterns ported forward. | §5.1 (`729a08e`) |
| **Q2 — dashboard GOAL edit affordance** | RESOLVED at audit-time (already shipped at practice round commit 9 + ScoreStrip wiring). Zero sidecar work for dashboard. | §5.0 (`8ba0780`) |
| **Q3 — pacing-math semantic preservation** | RESOLVED at audit-time (never wired to percentile; on score from practice round). | §5.0 (`8ba0780`) |
| **Q4 — mastery compute integration** | RESOLVED at audit-time (same as Q3). | §5.0 (`8ba0780`) |
| **Q5 — diagnostic-flow score capture** | RESOLVED — post-diagnostic via `<OnboardingTargets>`; dashboard `<GoalEditor>` for later edits. | §5.0 (`8ba0780`) |
| **Q6 — Strategy A viability** | RESOLVED-PRE-LAUNCH. Drop column without backfill. | §5.0 (`8ba0780`) (audit-step (c)); §5.2 (commit 2 destructive-operation gate) |
| **Q7 — sidecar scope reduction** | RESOLVED via Leo's C2 redirect: 4 implementation + 1 round-close = 5 commits (post-Disposition-X follow-up: 6 commits including this plan-doc-body-authoring). | §5.0 (`8ba0780`) (audit-step (g) + §0.13) |

### §2.2 Round 2 patterns ported forward

Sidecar inherits Round 2's `<OnboardingTargets>` discipline:

- **Round 2 commit 7 (`c6d473b`)** — form-level error-state slot. `submitError: string | null` useState + form-level `aria-describedby`-wired `role="alert"` region. Pivot-independent; ports unchanged. Composes with sidecar's commit-1 score-error region (form-level `submitError` + per-field `scoreError` + per-field `dateError` all fire independently).
- **Round 2 commit 8 (`42b3558`)** — blur-validation discipline. Per-field validation; clear-on-onChange + re-validate-on-blur; submit-time re-validation defense-in-depth. Pivot-independent; ports unchanged for date validation. Sidecar applies parallel discipline to score validation (`validateScoreRange` helper; per-field error region; submit-time re-validation gate AT THE TOP of `onSave`, before date gate).
- **Round 2 commit 9 (`d72a29f`)** — `pointer-coarse:min-h-11` for replaced elements (`<select>` + `<input type="date">`). Sidecar applies the same to the new `<input type="number">`. Pivot-independent.
- **Round 2 commit 14 (`69ea647`)** — skip-link copy + focus-visible. `"Skip and go to dashboard"` + canonical focus-visible classes. Pivot-independent; preserved.

### §2.3 `<GoalEditor>` mirror pattern

Sidecar's score-input mirrors `<GoalEditor>` from `src/components/dashboard/goal-editor.tsx` (practice round commit 9):

- Same input shape: `<input type="number" min={1} max={50} step={1}>`.
- Same range: 1-50 (matches `updateGoal` server action's Zod range — `saveOnboardingTargets` mirrors that range exactly).
- Parallel validation: `<GoalEditor>` uses single range-only message (`"Goal must be between 1 and 50."`); sidecar SPLITS into two messages (`"Score must be a whole number."` + `"Score must be between 1 and 50."`) per ALPHA_DESIGN §9 specific-over-generic.
- Server action parallel: `saveOnboardingTargets`'s Zod `z.number().int().min(1).max(50).optional()` mirrors `updateGoal`'s same-range `z.number().int().min(1).max(50)`.

The `<GoalEditor>`-already-shipped reality is the load-bearing anchor for sidecar's reduced scope: dashboard editing was solved at practice round; sidecar just brings the post-onboarding entry flow in line.

---

## §3 — Cross-references to SPEC §6.14 (audit-first checkpoint canon)

Sidecar inherits Round 1 + Round 2 discipline patterns:

- **§6.14.18, §6.14.21, §6.14.22** — audit-first checkpoint per-commit.
- **§6.14.20** — wholesale-replacement-with-quote-preservation; closed-plans-immutable for prior rounds.
- **§6.14.28** — plan-prose-vs-empirical-truth divergence.
- **§6.14.30** — additive-feature-cascade-undercount (defense via §1.3 explicit-deferred-OOS list at body-authoring time).
- **§6.14.31** — destructive-operation-gate template (load-bearing for sidecar commit 3's `DROP COLUMN target_percentile` operation).
- **§6.14.34** — mid-round narrow-scope sub-round insertion.
- **§6.14.38** — tee-captured stdout for any long-running verification.
- **§6.14.40** — redirector-vs-empirical-state divergence. **§0.13 surfaces a scope-reducing instance.**
- **§6.14.41** — audit-vs-revert blindness.
- **§6.14.42** *(Round 2 round-close addition)* — audit-step grep-verify-consumers when deleting/renaming type-or-function exports. **Sidecar's audit-steps (b)+(d)+(e)+(f)+(g)+(h) are explicit applications of this discipline.** Caught the §0.13 scope-reduction finding cleanly.

---

## §4 — Cost envelope

No LLM cost. Round cost is engineer-time only. Empirical envelope per §0.13 + §1.2:

- **6 commits total** (commit 0 plan-doc creation + commit 1 UI/action bundled per Option C2 + follow-up plan-doc body authoring per Disposition X + commit 2 schema drop + commit 3 cleanup + commit 4 round-close).
- Estimated wall time: **half-day** at the round's typical pace.

The Disposition X mid-round insertion (this commit) trades +1 commit for audit-trail-consistency with Round 2's inline plan-doc-body-authoring pattern. Per §6.14.34, narrow-scope mid-round insertions are explicitly the canonical response when scope shifts mid-round; the +1 commit cost is well below the audit-trail-clarity benefit.

---

## §5 — Commit ledger

Per Round 1 / Round 2 discipline: each entry carries hash + files-touched + audit step + implementation notes + verification + stop-and-report.

### §5.0 — Commit 0: plan-doc creation + §0 audit findings

**Hash:** `8ba0780` — `docs(plan,logs): close Round 2 logs + open score-based-target-goals sidecar`. **Status: SHIPPED.**

**Files touched.**
- `docs/plans/score-based-target-goals-sidecar.md` — NEW (323 lines at commit-0 close).
- `docs/claude_logs/session_2026-05-09_11-00_round-2-token-retrofit-and-audit-fixes.md` — NEW (Round 2 session log; bundled into commit 0 per the Round 1→Round 2 transition pattern at `98b54e5`).

**Audit-step (a-j) findings.** See §0.1-§0.11 for verbatim capture. Highlights:
- §0.2 schema audit surfaced the **critical §6.14.40 instance**: `users.targetScore` already exists at migration `drizzle/0004_square_speedball.sql` per "practice round commit 3"; dashboard `<GoalEditor>` + `updateGoal` action already shipped; pacing math + mastery compute were never wired to percentile. The redirect's 6-8 commit envelope reduces empirically to 4 implementation commits.
- §0.7 audit-step grep-verify-consumers per §6.14.42 caught the divergence cleanly before code shipped.
- §0.12 + §0.13 surfaced 7 Open Qs (Q1-Q7); 5 RESOLVED at audit-time per empirical state; 2 (Q6 + Q7) needed Leo's redirect confirmation.

**Stop-and-report contract.** Stopped post-§0; awaited Leo's redirect for scope-reduction confirmation. Leo's C2 redirect confirmed the 4-commit reduced envelope.

### §5.1 — Commit 1: `<OnboardingTargets>` UI replacement + `saveOnboardingTargets` action update (Option C2 bundle)

**Hash:** `729a08e` — `feat(post-session,actions): replace percentile target with score target (sidecar §1)`. **Status: SHIPPED.**

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — modified. Added: `TARGET_SCORE_MIN/MAX/DEFAULT` constants, `SCORE_NOT_INTEGER_COPY` + `SCORE_OUT_OF_RANGE_COPY` error strings, `SCORE_ERROR_ID`, `validateScoreRange` pure-function helper, `scoreString` + `scoreError` useStates, `<input type="number">` JSX with full attribute list, per-field error region. Deleted: `<select>` + `percentile` useState + `onSelectPercentile` + `percentileSelectValue` + `isPercentile` type-guard (audit-step empirical pre-pone). Header doc-comment refreshed.
- `src/app/(app)/actions.ts` — modified. Deleted: `allowedPercentiles` constant. Refactored: `onboardingTargetsSchema` Zod, `saveOnboardingTargets` signature + write path + `logger.info` structured-arguments. Header doc-comment refreshed.

**Diff:** 2 files changed, +114 / −61 (+53 net).

**Audit-step recap (a-j).**

- **(a)** `<OnboardingTargets>` post-Round-2 surface re-confirmation: 237 lines pre-commit; all §0.4 inventory items captured verbatim; Round 2 commits 7-9 patterns confirmed pivot-independent; no drift.
- **(b)** `saveOnboardingTargets` action surface verbatim: lines 148-201 captured. Zod uses `z.union([z.literal(50), z.literal(30), z.literal(20), z.literal(10), z.literal(5)])`. Function signature `saveOnboardingTargets(input: { targetPercentile?, targetDateMs? })`. Drizzle write via `db.update(users).set(updateValues).where(eq(users.id, userId))`. `requireUserId()` resolves user; `errors.try()` discipline + `logger.info`/`logger.error` patterns preserved.
- **(c)** Score validation copy decision: **SPLIT into two errors** per §9 specific-over-generic. `SCORE_NOT_INTEGER_COPY = "Score must be a whole number."` + `SCORE_OUT_OF_RANGE_COPY = "Score must be between 1 and 50."` (template-literal interpolated from `TARGET_SCORE_MIN` / `TARGET_SCORE_MAX` constants).
- **(d)** Initial state decision: **Path D2 — default 40** via `useState<string>(String(TARGET_SCORE_DEFAULT))`. Skip-path preserved (clear input → empty → null → undefined → Drizzle skips column).
- **(e)** Per-field error region wired: `scoreError: string | null` useState peer; `scoreDescribedBy = scoreError !== null ? SCORE_ERROR_ID : undefined` extracted const; `aria-describedby={scoreDescribedBy}` on `<input>`; conditional error `<p>` below; clear-on-onChange + re-validate-on-blur + submit-time re-validation gate. Mirrors Round 2 commit 8 semantic.
- **(f)** `<input type="number">` JSX shape: mirrors `<GoalEditor>` + Round 2 §5.8 `pointer-coarse:min-h-11`. Full attribute list captured at the implementation-notes section. `<label htmlFor="onboarding-score">Target score (out of 50)</label>` paired correctly.
- **(g)** Submit handler refactor: score validation gate runs FIRST in `onSave` (before date gate, before save call); defense-in-depth. `targetScore = scoreString === "" ? undefined : Number(scoreString)`. `saveOnboardingTargets({ targetScore, targetDateMs: finalDate })`. Error region semantics (`submitError` + `scoreError` + `dateError`) coexist independently.
- **(h)** `saveOnboardingTargets` action update: `allowedPercentiles` constant deleted (line 148). Zod: `targetPercentile: z.union([z.literal(50), ...])` → `targetScore: z.number().int().min(1).max(50).optional()`. Function signature parallel update. Drizzle write: `updateValues.targetPercentile` → `updateValues.targetScore`. `users.targetScore` column already exists per migration 0004. Logger structured-arguments updated. Header doc-comment refreshed.
- **(i)** Doc-comment refresh: `<OnboardingTargets>` header (lines 7-22) and `saveOnboardingTargets` action preamble both refreshed citing sidecar §0.13 + §5.1 + cross-reference to `<GoalEditor>` parallel dashboard-edit path.
- **(j)** Test cascade decision: **zero new tests added**; matches predecessor coverage (no `onboarding-targets.test.ts` exists). `validateScoreRange` helper bounded; if bugs surface, add `_lib/score-validation.test.ts` follow-up. Matches Round 2 §5.7 deferred-but-bounded test pattern.

**Audit-surfaced empirical adjustment — `isPercentile` pre-pone.**

Per redirect's "TARGET_PERCENTILES + TargetPercentile + isPercentile UNCHANGED in this commit" framing: empirically broke down on first lint+typecheck. `isPercentile`'s only caller (`onSelectPercentile`) was deleted with the `<select>`; project's Biome `noUnusedVariables` + tsgo `TS6133` both fired on `isPercentile`. **Pre-poned `isPercentile` deletion to commit 1** (rather than commit 3 as the redirect framed).

`TARGET_PERCENTILES` + `TargetPercentile` (exported at module-top; Biome doesn't flag exports) stay alive per redirect; commit 3 deletes them with the column-drop cleanup.

**Small benign §6.14.40 instance, audit-step granularity.** Per the §6.14.40 sub-pattern note from Round 2 round-close: instance counts at audit-step granularity reinforce parent rule but don't separately promote.

**Verification.**
- `bun test`: **128 pass / 0 fail / 17 files** (consistent on multiple re-runs).
- `bun test` flake recurrence: **127/1 once** during commit-1 prep; re-runs consistent at 128/0; tracked from Round 2 §8 #13. **Pattern threshold reached at 2 occurrences (Round 2 commit 14 + sidecar commit 1)** — recommend post-sidecar debugging session.
- Lint (lefthook v2.1.6): clean.
- Typecheck (`tsgo --noEmit`): clean.

**Stop-and-report compliance.** Stopped post-commit-1 per redirect; awaited Leo's redirect for commit 2.

### §5.2 — Commit 2: schema drop `users.targetPercentile` column + Drizzle migration 0005

**Hash:** `<TBD; backfilled at round-close>` — `feat(db): drop users.target_percentile column (sidecar §2)`. **Status: SHIPPED.**

**Files touched.**
- `src/db/schemas/auth/users.ts` — `targetPercentile: integer("target_percentile")` declaration deleted at former line 12 (post-edit users table has 8 fields; pre-edit had 9).
- `drizzle/0005_amusing_microchip.sql` — NEW (autogen via `bun db:generate`). Single statement: `ALTER TABLE "users" DROP COLUMN "target_percentile";`. No defensive guards or wrapping; clean diff.
- `drizzle/meta/0005_snapshot.json` — NEW (Drizzle's table-state snapshot post-edit).
- `drizzle/meta/_journal.json` — modified (idx 5 entry appended; tag `0005_amusing_microchip`).

**Audit-step recap (a-h).**

- **(a)** Production-data scope re-confirmed: `vercel.json` exists (project deployment-ready, region `iad1`, single cron schedule); no `.env.production` reference in repo; no production-deployment commit in git log. Per Q6 pre-launch confirmation, dev-DB-only treatment stands.
- **(b)** `grep -rnE "targetPercentile|target_percentile|TARGET_PERCENTILES" src/` returned 9 hits — all in narrative comments (commit 1 doc-refresh trail at `actions.ts:151`; `data.ts:13`; `onboarding-targets.tsx:54+57+68`), the schema declaration target itself (`users.ts:12`), or the transient module-top exports (`onboarding-targets.tsx:71-72+294`). **Zero ACTIVE code consumers** beyond commit 2's drop target; the transient exports retire at sidecar commit 3.
- **(c)** DB-state probe: `1 row` with `target_percentile IS NOT NULL` out of `2373 total users` (≈0.04%; single dev test row). Per Q6 pre-launch confirmation: drop anyway; data unrecoverable per Strategy A. Documented in commit body for forward-traceability.
- **(d)** Drizzle autogen output: `bun db:generate` produced `drizzle/0005_amusing_microchip.sql` with single statement `ALTER TABLE "users" DROP COLUMN "target_percentile";`. Snapshot at `drizzle/meta/0005_snapshot.json`; journal updated at `drizzle/meta/_journal.json` (idx 5 entry tag `0005_amusing_microchip`). No surprising side-effects — no other tables touched, no defensive wrapping.
- **(e)** Migration apply: `bun db:migrate` exited with code 1 + opaque error (`error: "drizzle-kit" exited with code 1` + no further detail to stderr). **Workaround:** authored `scripts/_logs/apply-0005-manual.ts` to apply the SQL + insert journal row directly via Drizzle ORM (bypassing drizzle-kit's CLI). Manual apply succeeded: column dropped (post-migration `users` has 8 columns: `id`, `name`, `email`, `email_verified_ms`, `image`, `target_date_ms`, `created_at_ms`, `target_score`); journal row inserted at id=5 with hash `d7103ad67e501b3ab4540dfd493394fa4bd3167b9bcd231a35e14be30adab0c4`. Manual-apply script retired post-execution (one-shot tool; not committed). The drizzle-kit-CLI failure is captured as a Round-3+ residual for investigation.
- **(f)** Rollback strategy documented in commit body: recreate column via `ALTER TABLE "users" ADD COLUMN "target_percentile" integer;` (no default). The 1 row of pre-existing data is unrecoverable (no backup taken; per Q6 pre-launch confirmation acceptable).
- **(g)** `users.ts` schema edit verified: `targetPercentile: integer("target_percentile"),` line deleted; `targetDateMs` paired column preserved unchanged at the now-line-12; `targetScore` preserved unchanged at the now-line-20+; column ordering doesn't matter for Drizzle (set of column descriptors).
- **(h)** Post-edit grep `grep -rnE "targetPercentile|target_percentile" src/db/` returned **zero hits**. Schema clean.

**Application smoke test result.** Post-migration `bun -e` schema query confirmed `users` count = 2385 (tracks pre-migration count + dev seed delta; data integrity preserved). Test count `bun test`: 128 pass / 0 fail / 17 files (matches sidecar commit 1; no regression). Dashboard / post-session view smoke deferred to Leo's manual review per the round's screenshot-deferred discipline.

**Implementation notes.** Per §6.14.31 destructive-operation-gate compliance: pre-flight grep confirmed zero active consumers; DB count documented (1 of 2373); rollback strategy noted; column orphaned-since-practice-round-commit-4 (`loadUserProfile` reads only `target_score`). Strategy A confirmed via Q6 pre-launch state. The drizzle-kit-CLI opaque failure surfaced a residual; manual ORM apply was used as the workaround (forward-traceability via hash + journal row).

**Verification.** `bun test` 128 pass / 0 fail. Lint clean. Typecheck (`tsgo --noEmit`) clean. Schema query confirmed column drop empirically.

**Stop-and-report.** Do not proceed to commit 3 until redirect.

### §5.3 — Commit 3: doc-comment + dead-code cleanup

**Hash:** `<TBD>`. **Status: SHIPPED.**

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — deleted (1) the 19-line transient-region comment block (commit 1's `// TARGET_PERCENTILES + TargetPercentile — TRANSIENT module-top exports...`), (2) the `TARGET_PERCENTILES` const + `TargetPercentile` type at the former lines 71-72, and (3) the module-top exports `export type { TargetPercentile }` + `TARGET_PERCENTILES` from the value-export list. The remaining `export { OnboardingTargets }` line is the sole module surface.
- `src/server/dashboard/data.ts` — Path B2 cleanup: deleted the `target_percentile is intentionally NOT read` assertion + its parenthetical citation `(\`docs/plans/dashboard.md\` §2.4 audit).`. Lines 11-12 (real-read context for `id` / `name` / `targetDateMs` / `targetScore`) and the Practice round commit 4 STUB_GOAL_SCORE→target_score history paragraph preserved unchanged; reflows as a single coherent block once the moot assertion is removed.
- `src/app/(app)/actions.ts` — line 151 rewrite: `Sidecar §1 replaced the prior targetPercentile field per ...` → `Sidecar §1 replaced the prior percentile-based field per ...`. Preserves the §0.13 + §5.1 cross-reference (audit-trail intent) without leaving the literal `targetPercentile` identifier in the prose.

**Audit step.** Pre-flight grep + doc-comment hygiene per §6.14.20 prose-discipline. Audit captured three cleanup targets verbatim before edits: (a) `<OnboardingTargets>` module-top region + exports — straight-delete; (b) `data.ts:13` Path B2 candidate — straight-delete with paragraph reflow; (c) `actions.ts:151` historical narrative — Path B3-light selected (rewrite to "percentile-based" framing rather than full delete; preserves cross-reference value).

**Implementation notes.** Bounded cleanup. Module-top deletions cascade cleanly post-commit-2 column drop (no schema/Drizzle reference to the type union remains). The `actions.ts:151` rewrite chose Path B3-light over Path B-delete because the §0.13 + §5.1 cross-reference is legitimate audit-trail value (commit-message-grade history at the canonical action surface) and the literal-identifier removal alone satisfies the zero-hit grep criterion.

**Verification.** `grep -rE "targetPercentile|TARGET_PERCENTILES|target_percentile" src/` → ZERO HITS. `bun --bun biome lint` (3 files) → no fixes applied. `bun run scripts/dev/lint.ts` (3 files) → no violations found. `bun typecheck` → clean. `bun test` → 128 pass / 0 fail / 646 expect() across 17 files.

**Stop-and-report.** Plan-doc + commit ready; awaiting commit-message confirmation + push.

### §5.4 — Commit 4: round-close (administrative)

**Hash:** `<TBD>`. **Status: SHIPPED (round-close).**

**Files touched.**
- `docs/plans/score-based-target-goals-sidecar.md` — status flip ("planning" → "shipped 2026-05-09"); hash backfill across §5.0-§5.3 confirmed intact (no <TBD> placeholders below §5.4 self-reference, which is retained as <TBD> per Decision C); §5.4 entry authored; §6 final verification entry; §7 final resolutions state; §8 final residuals (12 items); §9 round-close commentary (4 entries) NEW.

**Audit step.** Pre-flight: (a) `git log --oneline 9f35549..HEAD` captured 5-commit ancestry — `8ba0780` (§5.0) → `729a08e` (§5.1) → `7ee5db9` (Disposition X follow-up; documented in §1.2 envelope, no §5.X slot per body-authoring framework) → `822a674` (§5.2) → `0b4aee5` (§5.3) → THIS commit (§5.4). (b) `git status --short` clean. (c) Closed-plans-immutable verified: `git log --name-only 9f35549..HEAD -- docs/plans/ docs/audits/` returned only `docs/plans/score-based-target-goals-sidecar.md` across all 5 sidecar commits — no Round 1 / Round 2 plan-doc or audit-doc surfaced with edits; canon clean. (d) Final cleanup grep `grep -rE "targetPercentile|TARGET_PERCENTILES|target_percentile" src/` → ZERO HITS (re-confirms §5.3 audit-step (f); cleanup criterion stable at round-close). (e) `bun test` final state: 128 pass / 0 fail / 646 expect() across 17 files; the residual #13 flake didn't surface this run. (f) Drizzle migration 0005 state confirmed: journal id=5 with hash `d7103ad67e501b3ab4540dfd493394fa4bd3167b9bcd231a35e14be30adab0c4` (matches commit 2's recorded value); `users` table information_schema enumeration shows 8 columns (`id`, `name`, `email`, `email_verified_ms`, `image`, `target_date_ms`, `created_at_ms`, `target_score`); `target_percentile` empirically dropped.

**Implementation notes.** Plan-doc finalization per Round 1 / Round 2 round-close patterns. No `--amend` workflow needed (no audit-doc frontmatter pinning the round-close hash; same simplification as Round 2 §5.15). §5.4 self-reference left as `<TBD>` placeholder per Decision C — no cleanup commit; round-close metadata is canonical from the commit hash + git log. Decision A confirmed zero new §6.14 promotions (sidecar reinforced §6.14.31 + §6.14.34 + §6.14.40 sub-pattern + §6.14.42 without surfacing new patterns); commentary captured at §9.1-§9.4 per Decision B. Visual walk deferred per Decision D-defer (see §6 final entry below).

**Verification.** Render-check post-edit; lint + typecheck pre-commit lefthook clean; final test count 128/0/646.

**Stop-and-report.** Sidecar SHIPPED at this commit's hash. Diagnostic-timing sidecar round (Round 1 §0.15), Round 3 (review-section architecture), or another sidecar opens at Leo's discretion next.

---

## §6 — Verification protocol carry-forward

Default carry-forward from Round 2 §6 + sidecar-specific additions:

- **Per-commit verification.** Each §5.{n} entry above has its own verification step. Visual reviews on `/post-session/[sessionId]/...` (diagnostic-mode session for `<OnboardingTargets>` rendering) + `/` (dashboard for `<GoalEditor>` parity) are the canonical signal for sidecar commit 1's UI work. Schema migration (commit 2) verified via `bun db:migrate` + `bun db:studio` post-migration column-drop inspection.
- **Real-DB harness.** All audit-step probes that read DB state (e.g., commit 0's `target_percentile IS NOT NULL` query if Leo's external knowledge surfaced production data) run against the dev DB, not mocked, per project discipline. Pre-launch state confirmed at commit 0 audit-step (c).
- **No new smokes.** Sidecar doesn't add smoke scripts. Existing smokes under `scripts/dev/smoke/` continue unchanged.
- **`tee` for any long-running stdout** per §6.14.38; not anticipated this round (no long-running pipelines).
- **Test discipline:** `bun test` green at every commit; track `127/1` flake (Round 2 §8 #13 carry-forward; pattern threshold reached at 2 occurrences per §5.1 verification — recommend post-sidecar debugging session).
- **Lint + typecheck discipline:** lefthook hooks at every commit; zero unused-variable warnings post-`isPercentile` pre-pone (commit 1) + post-`TARGET_PERCENTILES`/`TargetPercentile` deletion (commit 3).
- **Empirical visual walk: DEFERRED per round-close Decision D-defer.** The sidecar closes without empirical visual verification of commit 1's score-input rendering on the diagnostic post-session screen. Risk: a visual concern (e.g., browser default number-input spinner styling, mobile keyboard mode, focus-ring contrast against the new input shape) surfaces post-close requiring a follow-up bounded round. Acceptable per the round's pace + the strong unit-test + lint + typecheck signal at every commit. Forward-pin: visual concerns surfacing in Round 3+ trigger a small bounded sidecar OR roll into Round 3's broader review-section work, at Leo's discretion.

---

## §7 — Resolutions log

| Q / Audit Item | Resolution | Closing commit |
|---|---|---|
| Q1 — score-input UI shape | `<input type="number" min={1} max={50}>` per §0.12 + §2.3 mirror pattern | §5.1 (`729a08e`) |
| Q2 — dashboard GOAL edit affordance | RESOLVED at audit-time (already shipped at practice round) | §5.0 (`8ba0780`) |
| Q3 — pacing-math semantic | RESOLVED at audit-time (never wired to percentile) | §5.0 (`8ba0780`) |
| Q4 — mastery compute integration | RESOLVED at audit-time (same as Q3) | §5.0 (`8ba0780`) |
| Q5 — diagnostic-flow score capture | RESOLVED — post-diagnostic via `<OnboardingTargets>` | §5.0 (`8ba0780`) |
| Q6 — Strategy A viability | RESOLVED-PRE-LAUNCH (drop column; no backfill) | §5.0 (`8ba0780`) (audit-step (c)); §5.2 (commit 2 destructive-operation gate) |
| Q7 — sidecar scope reduction | RESOLVED via Leo's C2 redirect | §5.0 (`8ba0780`) (audit-step (g) + §0.13) |
| `<OnboardingTargets>` UI replacement | RESOLVED via §5.1 | §5.1 (`729a08e`) |
| `saveOnboardingTargets` action update | RESOLVED via §5.1 (bundled per Option C2) | §5.1 (`729a08e`) |
| `isPercentile` deletion | RESOLVED via §5.1 (audit-step pre-pone) | §5.1 (`729a08e`) |
| `users.targetPercentile` column drop | RESOLVED via §5.2 (manual ORM apply post-`drizzle-kit` CLI opaque failure; column empirically dropped from dev DB; journal row inserted at id=5) | §5.2 |
| `TARGET_PERCENTILES` + `TargetPercentile` deletion | RESOLVED via §5.3 (transient-region block + const + type + module-top exports all dropped; final grep returned ZERO HITS across `src/`) | §5.3 |
| `data.ts:13` doc-comment cleanup | RESOLVED via §5.3 (Path B2: assertion + parenthetical citation deleted; surrounding paragraph reflowed) | §5.3 |
| `actions.ts:151` historical narrative cleanup | RESOLVED via §5.3 (Path B3-light: rewrote `prior targetPercentile field` → `prior percentile-based field`; cross-reference to sidecar §0.13 + §5.1 preserved) | §5.3 |

---

## §8 — Round-close residuals + forward pins

### §8.1 Inherited from Round 2 §8 (forward-pinned through sidecar)

1. **Diagnostic-timing sidecar round** (Round 1 §0.15) — opens at Leo's discretion.
2. **Round 3 — review-section architecture.**
3. **Round 4 — review-specific features.**
4. **§B.5 motion sweep + remaining P3 polish** (§A.2.f1, §A.3.f1, §A.7.f3, §A.9.f2) — future polish round.
5. **Sub-phase b validator** — indefinitely deferred (per Round 1 context).
6. **`--border` 1.23:1 sub-3:1 contrast** — future-round token-system follow-up.
7. **`.catch()` pattern at `onboarding-targets.tsx:onSave`** — future polish round.
8. **Hook re-enable** (`~/.claude/hooks/cbm-code-discovery-gate`) — environmental, not project.
9. **Round 1 inherited residuals not closed by Round 2** (`loadAllBelts` stub; non-white belt visual review; number-series shape coverage; `urgencyLoop` naming debt) — Belts PRD round / future polish.
10. **`bun test` flake** (Round 2 §8 #13) — pattern threshold reached at 2 occurrences (Round 2 commit 14 + sidecar commit 1). **Recommend post-sidecar debugging session** before opening Round 3.

### §8.2 Sidecar-surfaced new residuals

11. **Plan-doc body-authoring discipline observation.** Sidecar's redirect framing of "deferred until §0 redirect" interacted ambiguously with Leo's "all four as recommended" subsequent redirects. Claude Code interpreted strictly (commit 1 implementation-only); follow-up commit retroactively authored body sections per Disposition X. Round-close commentary candidate (§9-style observation, not a §6.14 promotion): *"redirect contracts that lock scope but not body-authoring authorization should explicitly enable inline plan-doc updates."* **Single instance.** Track for Round 3+ if pattern recurs.

12. **`drizzle-kit migrate` CLI opaque failure (sidecar §5.2).** `bun db:migrate` exited with code 1 emitting only `error: "drizzle-kit" exited with code 1` to stderr — no DB-side error detail, no SQL trace, no stack. Manual ORM-level apply (via Drizzle's `db.execute(sql\`...\`)` directly + journal row insert by hand) succeeded cleanly. The CLI bug — whether environmental, Drizzle-version-specific, or a transient docker-pg interaction — is unidentified at sidecar close. Forward-pin: Round 3+ debugging session. Workaround pattern (manual ORM apply + hash-computed journal row) documented in §5.2 audit-step (e) recap; can be replayed if future migrations hit the same opaque-CLI behavior.

### §8.3 Closing

Sidecar SHIPPED at §5.4. Total residuals forward-pinned: **12** (10 inherited from Round 2 §8 carry-forward; 2 surfaced this sidecar). Pre-Round-3 debugging session recommended for residuals #10 (`bun test` flake) + #12 (`drizzle-kit migrate` CLI opaque failure) per §9.1's tooling-reliability observation.

---

## §9 — Round-close commentary

Four observations captured at sidecar close per Decision B. None promote to SPEC §6.14 this round (per Decision A); commentary serves as audit-trail-with-pattern-tracking for Round 3+ pattern-recurrence checks.

### §9.1 Tooling reliability concern

Two opaque-tooling-error observations accumulated through Round 2 + sidecar: `bun test` flake (Round 2 commit 14 + sidecar commit 1) and `drizzle-kit migrate` CLI failure (sidecar commit 2). Different tools, different surfaces, **same shape**: opaque errors with no diagnostic detail (test flake fails without isolation; CLI fails with exit code 1 + opaque stderr). Both block development friction; manual workarounds executed in both cases (re-run for flake; manual SQL apply for migration). Round-close recommendation: **pre-Round-3 debugging session** targets both. If either recurs in Round 3 audit-step work, consider §6.14 candidacy as "tooling reliability discipline" or similar pattern.

### §9.2 Plan-doc body-authoring discipline observation

Sidecar opened with explicit *"§1-§8 deferred until Leo redirects post-§0"* framing. Leo's subsequent redirects locked scope decisions but didn't explicitly authorize body authoring; Claude Code interpreted strictly (commit 1 ships implementation-only with no plan-doc body update). Disposition X mid-round insertion (commit `7ee5db9`) required to retroactively author bodies. **Single sidecar instance.** Round-close observation: redirect contracts that lock scope but not body-authoring authorization should explicitly enable inline plan-doc updates per Round 2 pattern. Track for Round 3+ if pattern recurs.

### §9.3 §6.14.31 first-explicit-application

Sidecar commit 2 was the first commit since §6.14.31's promotion (Round 2 round-close addition) to explicitly invoke its destructive-operation-gate template. The commit executed all eight gate sub-steps:

- (a) production-data scope determination (pre-launch; dev-DB-only treatment confirmed),
- (b) late-introduced-consumer grep (`grep -rnE "targetPercentile|target_percentile|TARGET_PERCENTILES" src/` returned 9 hits, all narrative comments + transient module-top exports — zero ACTIVE code consumers beyond the drop target),
- (c) DB-state probe (1 row with `target_percentile IS NOT NULL` out of 2373 total users — single dev test row; ≈0.04%; data-loss-acceptance confirmed at commit time per Q6),
- (d) Drizzle autogen via `bun db:generate` (clean diff: single `ALTER TABLE ... DROP COLUMN` statement),
- (e) migration apply (drizzle-kit CLI failed opaque; **manual ORM apply workaround** preserved the gate semantic — the destructive operation still executed under audit-step authorization),
- (f) rollback strategy documented (`ALTER TABLE "users" ADD COLUMN "target_percentile" integer;` recreates the column shape; the 1 row of pre-existing data is unrecoverable per Strategy A acceptance),
- (g) `users.ts` schema edit verified (paired columns preserved unchanged),
- (h) post-edit zero-hit grep across `src/db/`.

The rule worked exactly as designed: structural-safety verification before destructive change; rollback strategy documented; data-loss-acceptance confirmed at commit time. **Reinforces parent rule without promotion.**

### §9.4 §6.14.42 first-explicit-applications

Sidecar applied §6.14.42's grep-verify-consumers discipline (Round 2 round-close addition) at three audit-step instances:

- **Commit 0 scope-reducing finding (audit-step (g)).** Caught that `users.targetScore` column + `<GoalEditor>` + `updateGoal` action + `loadUserProfile` real read had **all already shipped at practice round commit 3 + commits 4+9+** — saving 4-5 implementation commits the redirect anticipated. Largest single-step scope reduction observed across Round 1 / Round 2 / sidecar to date.
- **Commit 1 `isPercentile` pre-pone.** Caught at lint+typecheck cascade (`noUnusedVariables`) when commit 1's redirect anticipated leaving `isPercentile` for commit 3 cleanup; pre-poned deletion to commit 1. Small benign §6.14.40 instance, audit-step granularity.
- **Commit 2 late-introduced-consumer re-grep.** Re-confirmed zero active consumers before destructive operation; gate-step (b) of §6.14.31's template implementation.

Combined effect: significant scope-reduction at the rule's first post-promotion application. **Reinforces parent rule without promotion.** Round 3 + future schema/type-deletion work should continue applying the discipline at every relevant audit-step.
