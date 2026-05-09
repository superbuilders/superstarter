# Plan — Score-Based Target Goals (Sidecar; replaces percentile-based targets)

> **Status: planning (commit 0 — plan-doc creation + §0 audit findings).** Body sections (§1 scope fence, §2 captured anchors, §3 SPEC §6.14 cross-references, §4 cost envelope, §5 commit ledger, §6 verification, §7 resolutions, §8 round-close residuals) are deferred until Leo redirects post-§0. Per the round-opening contract: *"Do NOT proceed to commit 1. Wait for redirect."*
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

## §1 — Round scope (TBD; deferred until §0 redirect)

> *Authored at commit-1 prep time after Leo confirms the §0.13 scope reduction. Anchors expected: confirmed empirical scope (4 implementation commits + round-close); explicit deferral of dashboard work + pacing-math work + mastery-compute work as `already-done` rather than `out-of-scope`; cross-references to practice round's commit 3 + 4 + 9 as the empirical-state foundation.*

---

## §2 — Captured anchors (TBD; deferred until §0 redirect)

> *Authored at commit-1 prep time. Anchors expected: Q1-Q7 final resolutions; per-commit pattern-port from Round 2 commits 7-9 (error-state slot + blur-validation + pointer-coarse) onto the score-input replacement; `<GoalEditor>` validation pattern as the canonical mirror.*

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

## §4 — Cost envelope (TBD; deferred until §0 redirect)

> *No LLM cost. Empirical commit envelope per §0.13: **5 commits** (1 plan-doc + 4 implementation + round-close subsumed via amend-pattern OR separate ledger slot — decide at body-authoring). Estimated wall time: **half-day** at the round's typical pace (one-third the redirect's 1-2 day estimate).*

---

## §5 — Commit ledger (TBD; deferred until §0 redirect)

> *Per-commit entries authored at commit-N prep time. Each entry follows Round 1 / Round 2 structure: hash placeholder + files-touched + audit step + implementation notes + verification + stop-and-report.*

---

## §6 — Verification protocol carry-forward (TBD; deferred until §0 redirect)

> *Default carry-forward from Round 2 §6 + sidecar-specific addition: schema migration verification via `bun db:migrate` against dev DB + post-migration `bun db:studio` or equivalent inspection.*

---

## §7 — Resolutions log (TBD; deferred until §0 redirect)

> *Q1-Q7 final states logged here at commit-1 prep time after Leo's redirect.*

---

## §8 — Round-close residuals + forward pins (TBD; deferred until round-close)

> *Forward-pinned at audit time:*
> - *Diagnostic-timing sidecar round (Round 1 §0.15; opens at Leo's discretion).*
> - *Round 3 (review-section architecture).*
> - *Round 4 (review-specific features).*
> - *Future polish round (motion + remaining P3).*
> - *Sub-phase b validator (indefinitely deferred).*
> - *Round 1 inherited residuals not closed by Round 2 (loadAllBelts stub; non-white belt visual review; number-series shape coverage; urgencyLoop naming debt).*
