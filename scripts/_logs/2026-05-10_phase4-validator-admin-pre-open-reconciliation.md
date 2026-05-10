# Phase 4 sub-phase b — Validator + Admin Review pre-open reconciliation

**Date:** 2026-05-10
**HEAD at audit:** `810c83a feat(post-session): add LatencyRangeSlider component for visualizing session latencies`
**Anchor of redirector's pre-drift mental model:** `a8d83bf docs(spec,plan): re-retract diagnostic-timing sidecar; close round; promote §6.14.43`
**Drift size:** 9 commits forward of `a8d83bf` on `main`.
**Pattern precedent:** §6.14.40 reconciliation (HEAD-anchor reconciliation as a standalone artifact before round-open work; tooling-reliability-debug §0.9).

## §1 Purpose

This file is the empirical reconciliation record between the redirector's pre-open mental model (anchored at `a8d83bf` per the original commit-0 prompt for the validator+admin round) and the post-drift HEAD state at `810c83a`. The validator+admin round's plan-doc §0.1 reconciliation block cites this file. Five probes resolve five concerns the prior commit-0 attempt surfaced as STOP-or-uncertain at the executor's audit step:

1. Selection-engine sidecar state (one or two; entanglement disposition).
2. Test baseline at `810c83a` (replaces `128 / 0 / 644` from `a8d83bf`).
3. Ad-hoc work-stream session scope (the redirector's "Round 3 review work" framing was actually a 5-concern session).
4. Triage-retirement empirical scope (the prior commit-0 STOP fired on Assumption C falsification; this probe sizes the retirement and the residuals).
5. Streak feature scope (mentioned in session-log filename; not in prior redirector context).

This file is empirical-only. No architectural decisions are made here. The redirector ratifies findings before the next commit (validator+admin round commit 0) issues its plan-doc.

## §2 Probe 1 — Selection-engine sidecar state

**Question:** Is there one selection-engine sidecar (executor step-8 hypothesis at the prior STOP) or two (the prior commit-0 prompt's "sidecar #2" framing)?

**Answer:** ONE sidecar. CLOSED at `1dc2b75 feat(test): relax marker-aware session-uniqueness invariant; close selection-engine sidecar` (May 10 00:16, before `a8d83bf`).

### §2.1 Evidence

- `ls -la docs/plans/selection-engine*.md` returns exactly one file: `docs/plans/selection-engine-session-attempted-ids-sidecar.md` (mtime May 10 00:16). No "selection-engine sidecar #2" plan-doc exists.
- `git log --follow -- docs/plans/selection-engine-session-attempted-ids-sidecar.md` shows 5 commits modifying the plan-doc:
  - `df4df7c` — stub authored.
  - `ccb3aab` — wholesale-replace stub; open sidecar (commit 0).
  - `d59f86d` — SPEC §9.2 patch (γ branch; commit 1).
  - `6db9ca8` — fetch-helper extension (commit 2a).
  - `1dc2b75` — close (commit 2b).
- `1dc2b75`'s diff against the plan-doc populates §5 ledger row, §6 round-close residuals (5 forward-pins), §7 §6.14 candidates. The `1dc2b75` commit message reads verbatim: *"Sidecar commit 2b. Final commit; sidecar CLOSES at this hash."*
- `fa1c081 docs(log,plan): open selection-engine sidecar; close diagnostic-timing sidecar with retraction` does NOT appear in `git log --follow -- docs/plans/selection-engine*.md`. Its diff (`git show --stat fa1c081`) only adds two session-log files at `docs/claude_logs/`:
  - `session_2026-05-10_00-20_selection-engine-sidecar-close.md`
  - `session_2026-05-10_08-10_diagnostic-timing-sidecar-retraction.md`
- Reading the close session log (`docs/claude_logs/session_2026-05-10_00-20_selection-engine-sidecar-close.md`) confirms verbatim: *"Sidecar CLOSED at `1dc2b75`."*

### §2.2 Plan-doc top-of-file `STATUS: OPEN` annotation

Line 3 of `docs/plans/selection-engine-session-attempted-ids-sidecar.md` reads:

> **STATUS: OPEN — sidecar commit 0 (audit-step framework executed; branch NOT yet selected).**

This line was authored at commit 0 (`ccb3aab`) and was NOT updated at the round-close commit (`1dc2b75`). The substantive content of §5/§6/§7 is fully populated as round-close. The `STATUS: OPEN` line is a documentation-hygiene defect (round-close did not amend the top-of-file status marker), not evidence of an open sidecar. The session log is the authoritative status source.

Forward-pin: file an `[edit]` candidate in the validator+admin round residuals to update line 3 to `STATUS: CLOSED at 1dc2b75 (commit 2b)` — minor docs hygiene, not load-bearing.

### §2.3 Synthesis — `fa1c081` commit-message-vs-diff inversion

`fa1c081`'s commit message reads:

> *"Opened the selection-engine sidecar, replacing the previous stub with a comprehensive plan-doc. Closed the diagnostic-timing sidecar, re-retracting before §1 implementation due to an implicit-resolution-selection finding."*

The "Opened" verb is past-tense session-arc narrative. The session covered both opening (which physically happened earlier at `ccb3aab` on May 9 23:20:47) AND closing (at `1dc2b75` on May 10 00:16:46) of the selection-engine sidecar plus the diagnostic-timing sidecar's open-and-retract arc. `fa1c081` itself only captures the session-log markdown files for that arc.

The prior commit-0 prompt's "selection-engine sidecar #2" framing read `fa1c081`'s commit-message "Opened" as a present-tense action committed at that hash. Empirical content of the diff is two session-log files; the verb describes the prior session's work, not new sidecar-opening work.

### §2.4 §6.14.43 instance — banked

- **Instance #6 (from prior commit-0 prompt's three-assumption decomposition).** The prior commit-0 prompt asserted three assumptions (Assumption A: Round 3 ad-hoc; Assumption B: sidecar #2 in-flight; Assumption C: triage cleanup docs-only) with explicit STOP triggers. Decomposing the drift's disposition into three pre-resolved assumptions, rather than a single "audit the drift" probe, is a §6.14.43 sub-type-4 candidate — but qualified: the redirector ATTACHED STOP triggers to each assumption, which is the discipline working as intended (verify-don't-absorb). Banked as a borderline instance — the assumption-decomposition pattern carries implicit-resolution risk that the STOP triggers mitigate but do not eliminate.
- **Instance #7 (Probe 1 confirms commit-message-vs-diff inversion on `fa1c081`).** Confirmed at this audit. The redirector's "sidecar #2" framing was a misread of `fa1c081`'s past-tense commit message as forward-tense action. Sub-type-4 territory: implicit-resolution-selection (the framing pre-resolved that two sidecars existed without verifying the diff content).

State after this commit: instance #5 (round-open as first practical test on wide-architectural surface) + #6 (assumption-decomposition borderline) + #7 (commit-message-vs-diff inversion) banked. §6.14.43 promoted at `a8d83bf`; instances post-promotion track first-practical-tests of the codified discipline.

### §2.5 Entanglement-fence disposition for plan-doc §0.2

The prior commit-0 prompt's §0.2 anti-scope included an entanglement-fence for "selection-engine sidecar #2" against `items.ts` / `selection.ts`. Since sidecar #2 does not exist, the fence dissolves entirely. The validator+admin round operates on `items.ts` / `selection.ts` against the post-`1dc2b75` state without sidecar-overlap concerns.

The closed selection-engine sidecar's empirical findings (12% bug rate Wilson CI on `fullLengthNoReServe`; pressure cells empirically identified — brutal tier=6 across 3 of 14 sub-types; `numerical.fractions:hard=1`; `numerical.workrate:hard=1`; `numerical.averages:hard=1`) are the load-bearing inputs to the validator+admin round's §0.7 pressure-cell prioritization (δ-branch operationalization). These citations remain valid post-close.

## §3 Probe 2 — Test baseline at HEAD `810c83a`

**Command:** `bun test 2>&1 | tail -25`

**Result:**

```
 172 pass
 0 fail
 769 expect() calls
Ran 172 tests across 19 files. [4.99s]
```

A `ZodError` trace from `structured-explanation.test.ts:152` appears in stderr but does NOT cause a fail. This is the previously-forward-pinned stochastic suspect; this run is consistent with "expected stderr trace from a passing Zod-rejection-assertion test" rather than a failing test. Not investigated this audit.

### §3.1 Delta from `a8d83bf` baseline `128 / 0 / 17 / 644`

| Metric | `a8d83bf` | `810c83a` | Δ |
|---|---|---|---|
| Pass | 128 | 172 | +44 |
| Fail | 0 | 0 | 0 |
| Files | 17 | 19 | +2 |
| Expect() calls | 644 | 769 | +125 |
| Runtime | n/a | 4.99s | n/a |

### §3.2 Test files modified or added between `a8d83bf` and `810c83a`

`git diff --stat a8d83bf..810c83a -- '**/*.test.ts' '**/*.test.tsx'`:

```
src/components/post-session/result-sound-fx.test.ts | 115 ++++++++++++++++++  (NEW)
src/server/dashboard/streak.test.ts                 | 128 +++++++++++++++++++  (NEW)
src/server/items/selection.test.ts                  |  43 ++-----                (MODIFIED — triage scrub)
src/server/post-session/end-session-tier.test.ts    |  18 +--                   (MODIFIED — triage scrub)
```

- `result-sound-fx.test.ts` (NEW, +115 lines): 21 tests covering tier boundaries (0/29/30/39/40/50 + mid-range), bank routing, empty/single/multi-entry pick semantics. Authored at `810c83a` per session log scope.
- `streak.test.ts` (NEW, +128 lines): 23 tests covering empty / today-only / yesterday-only / broken / 5-day run / 4-day run / month-year-leap-day boundaries / duplicate-day defense / 14-day run. Authored at `7258789` per session log scope.
- `selection.test.ts` (-43): triage-retirement scrub at `81819e0`.
- `end-session-tier.test.ts` (-18): triage-retirement scrub at `81819e0`.

### §3.3 Forward-watch baseline for the validator+admin round

The validator+admin round's §0.9 forward-watch references `172 / 0 / 19 files / 769` as the baseline. Round-close convergence verifies tests do not regress from this state and tracks the deltas the round itself contributes (validator engine tests + admin-route tests + auth scaffolding tests).

The `structured-explanation.test.ts:152` stderr trace remains forward-pinned; not investigated this round per anti-scope unless it surfaces as a fail.

## §4 Probe 3 — Ad-hoc session-log scope

**File:** `docs/claude_logs/session_2026-05-10_10-11_review-streak-sounds-triage-removal-topnav.md`

The session-log filename names FIVE work-streams; the body confirms the session covered all five sequentially. The redirector's prior commit-0 prompt framed this as "Round 3 review work" — that framing collapses five concerns into one. The empirical scope is wider.

### §4.1 Five work-streams enumerated

| # | Stream | Commits | Surfaces touched |
|---|---|---|---|
| 1 | `/review` surface (new) | `7258789` | `src/server/review/data.ts` (new); `src/app/(app)/review/page.tsx`; `src/components/review/{review-view,review-card,review-row}.tsx` (new); post-session full-question-review (renamed from "Items you got wrong"); abandoned-session filtering on dashboard sparklines + listing. |
| 2 | Real day-streak read (formerly STUB → 0) | `7258789` | `src/server/dashboard/streak.ts` (rewritten with `loadPracticeDaysDesc` + `computeStreakFromDays` + UTC date helpers); `src/server/dashboard/streak.test.ts` (new, 23 tests); `src/server/dashboard/data.ts` helper-status note. |
| 3 | Sound-bank rewire (per-question warning + post-session result) | `0a4f832` + `c1ce1c6` + `67a3879` | `scripts/copy-sounds-to-public.ts` rewritten 3×; `src/config/sound-bank.ts` (4 banks: 6 / 9 / 3 / 11); `src/components/focus-shell/audio-ticker.ts` swap; `src/components/post-session/result-sound-fx.tsx` (new) + `result-sound-fx.test.ts` (new, 21 tests). Mounted in `<PostSessionShell>` for `full_length` / `simulation` only. |
| 4 | Triage feature removed end-to-end | `81819e0` | In-product: `<TriagePrompt>` deleted, Space-key listener stripped, `triage_take` reducer action removed, `<TriageScoreLine>` (post-session slot 2) deleted. Server: `src/server/triage/score.ts` + entire `src/server/triage/` directory deleted. Schema: `attempts.triage_prompt_fired` + `attempts.triage_taken` columns DROPPED via `drizzle/0006_friendly_switch.sql` (migration applied to live local DB). Tests + smokes scrubbed. Docs: deprecation banners added to PRD / SPEC / design_decisions / CCAT-categories. |
| 5 | TopNav unified across authenticated surfaces | `32bbbd4` | `src/server/nav/chrome.ts` (new) — `loadNavChrome(userId)` parallel-loads `{ initials, streakDays }`. `src/components/nav/page-nav.tsx` (new) — `"use client"` `<PageNav>` consumes promise via `React.use()`, renders existing `<TopNav>`. Mounted on `/`, `/review`, `/lessons`, `/stats`, `/full-length/configure`, `/post-session/[sessionId]`. NO role-aware affordances introduced. |

The fifth work-stream's TopNav unification is the post-Round-3 anchor pattern the validator+admin round's §0.5 cites. Its data path (`loadNavChrome` + `<PageNav>` + `React.use()`) is the directly-reusable shape for admin routes.

The fourth work-stream's triage retirement is the empirical event the prior commit-0 prompt's Assumption C misframed as "docs-only."

### §4.2 Load-bearing decisions identified in session log

Direct quotes from the session log's "Decisions Made" section that the validator+admin round must inherit:

- *"A 'practice day' = any UTC day on which the user submitted ≥1 row in `attempts`."* — Streak feature definition. Orthogonal to validator+admin; flagged for §0.2 anti-scope.
- *"`public/audio/` is the source of truth for sounds, not `data/sounds/`."* — Sound-bank source-of-truth. Orthogonal.
- *"Triage removal scope: strip code + DB columns + active living docs (PRD.md, SPEC.md, design_decisions.md, CCAT-categories.md). Closed plan documents under docs/plans/ and session records under docs/claude_logs/ were left intact as historical artifacts."* — Establishes the canonical retired-feature pattern: live docs get deprecation banners; closed plan-docs and session logs preserve their historical state. Validator+admin round inherits this convention if it cites or extends triage prose.
- *"Triage migration applied immediately at the user's explicit request (`bun run db:migrate`); columns dropped from the live local DB."* — DB state at `810c83a` has `attempts.triage_*` columns gone. Validator+admin round operates against the post-retirement schema.
- *"TopNav data path: small shared `loadNavChrome` server helper + a `<PageNav>` client wrapper that consumes the promise via `React.use()`, so every authenticated surface mounts the same chrome without duplicating the user/streak read. The dashboard itself wasn't refactored — it already loaded the same data through `getDashboardData`."* — Establishes the nav-chrome reuse pattern. Admin routes reuse `<PageNav>`; admin-specific affordances (admin-mode badge, admin-route shortcuts) are NEW additions on top of this base.
- *"Optional triage-doc cleanup pass. Banners added to canonical docs; the inline ~80 references inside SPEC/PRD/design_decisions are still present and could be surgically edited section-by-section if you want them gone."* — Forward-pinned residual at session close. Surfaces in the validator+admin round if SPEC §-numbering or section-landing decisions intersect with historical-but-still-present triage prose.

### §4.3 Round-3 disposition

Per session-log Decision: the work was deliberate ad-hoc work in the redirector pattern (no formal plan-doc; one comprehensive session log). The four commits `7258789 / 0a4f832 / c1ce1c6 / 67a3879 / 81819e0 / 32bbbd4 / aa76394 / 810c83a` (eight commits — five work-streams may have spanned multiple commits each) are all attributable to this session arc.

Verdict: Round 3 review-section architecture is RETIRED-AS-SHIPPED. The validator+admin round consumes its components as anchor patterns for §2 admin UI but does not modify them.

## §5 Probe 4 — Triage-retirement empirical scope

The prior commit-0 prompt's Assumption C ("triage cleanup docs-only; no SPEC change") was hard-falsified at the executor's audit step. This probe sizes the retirement empirically and surfaces the residuals the validator+admin round must navigate.

### §5.1 Source-code retirement scope (per `81819e0` diff + grep)

Retired modules (deleted):

- `src/components/focus-shell/triage-prompt.tsx` (60 lines).
- `src/components/post-session/triage-score-line.tsx` (72 lines).
- `src/server/triage/score.ts` (90 lines).
- `src/server/triage/` directory removed.

Reducer / state-machine changes:

- `src/components/focus-shell/shell-reducer.ts` (-128 lines around triage state machine: `triagePromptFired`, `triageTaken`, `triagePromptFiredAtMs`, `TRIAGE_TAKEN_WINDOW_MS`, `triage_take` action).
- `src/components/focus-shell/focus-shell.tsx` (-160 lines around `<TriagePrompt>` integration).
- `src/components/focus-shell/types.ts` (-6 lines).

Schema / migration:

- `src/db/schemas/practice/attempts.ts` (-2 lines): `triage_prompt_fired` + `triage_taken` columns removed.
- `drizzle/0006_friendly_switch.sql` (NEW): two `ALTER TABLE … DROP COLUMN` statements. Applied to live local DB at session time.

Test / smoke / app-action retirements:

- `src/server/items/selection.test.ts` (-43 lines): triage scrub.
- `src/server/post-session/end-session-tier.test.ts` (-18 lines): triage scrub.
- `src/server/post-session/end-session-tier.ts` (-20 lines): logic unwind.
- `src/server/sessions/submit.ts` (-41 lines): zod schema + interface + insert + log payload no longer reference triage.
- `src/app/(app)/actions.ts` (-22 lines): action wrapper.
- `src/app/phase3-smoke/page.tsx` (-60 lines).
- `scripts/dev/smoke/phase3-{commit1,polish-commit1}.ts` (scrubbed).
- `src/server/mastery/compute.ts` (-9 lines).
- `src/components/focus-shell/audio-ticker.ts` (-3 lines).
- `src/components/item/item-prompt.tsx` (-4 lines).
- `src/config/item-templates.ts` (-2 lines).

### §5.2 Live-code residuals (NOT cleaned in `81819e0`)

`grep -rln "triage" src/ docs/ scripts/ drizzle/ 2>&1` returns:

- **Active source code:** `scripts/dev/smoke/phase3-commit5.ts`, `scripts/dev/smoke/phase3-commit2-browser.ts`, `scripts/_lib/explain.ts` — three files retain live-code triage references that the session-log author flagged as "Optional triage-doc cleanup pass." `81819e0`'s scrub touched only `phase3-commit1.ts` and `phase3-polish-commit1.ts`. Smoke and library files at `commit5` / `commit2-browser` / `_lib/explain` were missed.
- **Active docs:** `docs/PRD.md` (16 matches), `docs/SPEC.md` (38 matches), `docs/design_decisions.md` (19 matches), `docs/CCAT-categories.md` (0 matches — fully scrubbed from this doc).
- **Historical artifacts:** `docs/architecture_plan.md`, `docs/audits/post-session-review-surface-alpha-design.md`, `docs/plans/*.md` (multiple), `docs/claude_logs/*.md` (multiple), `scripts/_logs/bun-test-flake-rerun.log`. Per session-log Decision, these are NOT to be cleaned (preserved as historical artifacts).

### §5.3 SPEC.md state — header note vs body prose

`docs/SPEC.md:1-15` has the header note added by `81819e0`:

> **Triage feature removed 2026-05-10.** Every prior reference in this document to `<TriagePrompt>`, the `triage_take` reducer action, `triagePromptFired` / `triageTaken` reducer state, the `attempts.triage_prompt_fired` / `attempts.triage_taken` columns, the `@/server/triage/score` module, and the `<TriageScoreLine>` post-session slot 2 describes a feature that no longer ships. Migration `0006_friendly_switch.sql` drops the columns; the related source modules and prop chains have been removed. Sections below that describe these are historical only.

Body sections containing live-prose triage references (per `grep -n "triage" docs/SPEC.md`):

- Line 30 — `<FocusShell>` description.
- Lines 120-122 — `src/server/triage/` directory tree.
- Lines 138 — `<TriagePrompt>` component description.
- Line 148 — `<MasteryMap>` "low-contrast triage adherence."
- Line 159 — post-session-review slot mention.
- Lines 528-529 — `attempts.triage_prompt_fired` + `attempts.triage_taken` schema rows.
- Lines 931-932 — `triagePromptFired` + `triagePromptFiredAtMs` reducer state.
- Line 942 — `triage_take` action.
- Line 1000 — Triage-prompt fade-in trigger.
- Line 1010 — `triage_take` action effect.
- Line 1017 — `T` keyboard shortcut.
- Line 1030 — Triage exclusion in diagnostic-flow.

The header marks all of this historical, but the body prose still describes the feature in present-tense / live-architecture language. A reader skimming SPEC §-by-§ may take live-prose at face value without noticing the top-of-file note.

### §5.4 Estimated round-close SPEC body amendment delta (forward-pinned)

The session-log author's "Optional triage-doc cleanup pass" estimate is "~80 inline references inside SPEC/PRD/design_decisions" total. SPEC alone is 38 matches.

If the validator+admin round chooses to land its new SPEC content WITHOUT first amending live-prose triage sections, the new content sits below historical-but-live-prose triage sections. Plan-doc §0.6 SPEC-section landing-place decision must surface this trade-off explicitly. Three options for the redirector to weigh at plan-doc commit 0:

- **(SPEC-A)** Land validator+admin SPEC content as a new top-level section (§9.x or §11.x) AFTER triage prose. Triage prose stays historical-with-banner; new content does not interleave. Lowest-friction; carries the inconsistency forward.
- **(SPEC-B)** Surgical body-prose amendment as a separate sub-commit during the validator+admin round, before validator+admin SPEC content lands. Round-close ships clean SPEC. ~80-line delta across 3 docs.
- **(SPEC-C)** Decline to amend body prose; cite specific sections as live-vs-historical inline at each citation. Highest local clarity; most maintenance debt.

This decision is forward-pinned to the validator+admin round's commit-0 audit, NOT made here. The audit-log surfaces the trade-off so the redirector ratifies it explicitly.

### §5.5 Anchor-pattern impact for plan-doc §0.5

The validator+admin round's §0.5 architectural skeleton cannot reuse `<TriagePrompt>` / `<TriageScoreLine>` / triage reducer state in admin item-rendering — those modules are gone. Admin item-detail surface for rendering candidates as they would appear to users uses post-retirement components only:

- `<ItemPrompt>` (still live; triage references stripped).
- `<FocusShell>` (live; triage logic stripped).
- `<PostSessionShell>` (live; slot 2 `<TriageScoreLine>` deleted; tabbed review interface from `aa76394`).
- `<WrongItemsBrowser>` (live; renamed to "Question review"; supports correct/incorrect/skipped status badges from `aa76394`).

## §6 Probe 5 — Streak feature scope

**Question:** Is streak parent-facing, an admin metric, or a user-incentive surface? Determines whether the validator+admin round needs to fence streak from anti-scope.

**Answer:** Parent-facing user-incentive dashboard chip. Fully orthogonal to validator+admin.

### §6.1 Module shape

Per `src/server/dashboard/streak.ts:1-40` (read at probe):

- A "practice day" is any UTC day on which the user submitted ≥1 row in `attempts`.
- Skipped questions count (selectedAnswer NULL still creates an attempts row); abandoned and completed sessions both count, as long as ≥1 attempt exists. Sessions started but never answered (zero attempts) do NOT count.
- The streak is the longest run of consecutive UTC days ending at the most recent practice day, with one grace day:
  - Most recent practice day = today (UTC) → streak ends today.
  - Most recent practice day = yesterday (UTC) → streak ends yesterday. Today is the grace day.
  - Most recent practice day = N days ago (N ≥ 2) → streak = 0.
- All time math is in UTC. Per-user timezones deferred to a future Streaks PRD.

### §6.2 Consumer surface

`grep -rln "streak" src/ docs/`:

- `src/server/dashboard/streak.{ts,test.ts}` — feature module + 23 tests.
- `src/server/dashboard/types.ts` — `StreakDays` type.
- `src/server/dashboard/data.ts` — dashboard data orchestrator.
- `src/server/nav/chrome.ts` — `loadNavChrome` parallel-loads streak alongside initials.
- `src/components/dashboard/streak-chip.tsx` — visual chip.
- `src/components/dashboard/{dashboard,top-nav}.tsx` — render-site.
- `src/components/nav/page-nav.tsx` — TopNav surface that displays streak across authenticated routes.
- `src/components/review/review-view.tsx` — passes streak through.

### §6.3 Classification and round disposition

- **Surface:** parent-facing chrome (dashboard chip + TopNav across authenticated routes). Visible to all authenticated users; not gated by role.
- **Purpose:** user-incentive (gamification surface — reinforces consecutive-day practice).
- **Admin relevance:** none. The validator+admin round's admin queue surface mounts the same TopNav (per §4.2 anchor pattern), which means admin users see their own streak — but streak is not an admin metric, not a queue input, not a validator criterion.

Verdict for plan-doc §0.2: streak is fully orthogonal. Anti-scope mention sufficient ("This round does not modify the streak feature; admin routes mount the same TopNav and inherit the streak chip without modification."). No entanglement-fence required.

## §7 Synthesis for plan-doc authorship

Consolidated findings the validator+admin round's plan-doc §0 cites verbatim or by reference:

### §7.1 §0.1 reconciliation block (citations from this audit-log)

- Round opens at HEAD `810c83a`; redirector's pre-drift anchor was `a8d83bf`; 9-commit drift reconciled per §6.14.40 precedent.
- Drift composition (per Probe 3):
  - `fa1c081` — session-log capture for selection-engine sidecar close + diagnostic-timing sidecar retraction. NOT a new sidecar opening.
  - `7258789 / 0a4f832 / c1ce1c6 / 67a3879 / 81819e0 / 32bbbd4 / aa76394 / 810c83a` — five-work-stream ad-hoc session: review surface, streak, sound-bank, triage retirement, TopNav unification.
- Round 3 review-section work: RETIRED-AS-SHIPPED (one ad-hoc session, no plan-doc, eight commits).
- Selection-engine sidecar: ONE sidecar, CLOSED at `1dc2b75`. NO sidecar #2.

### §7.2 §0.2 anti-scope (citations from this audit-log)

- Triage retirement: REVISED from "docs-only" to "code retirement complete + active-doc deprecation banners + ~80 inline body-prose residuals across PRD/SPEC/design_decisions." Plan-doc §0.2 explicitly acknowledges `81819e0`'s scope; §0.5 anchor patterns cite post-retirement component shapes only.
- Streak feature: orthogonal. Anti-scope mention sufficient; admin routes inherit TopNav streak chip without modification.
- Selection-engine sidecar entanglement-fence: DISSOLVES (no sidecar #2). Validator+admin round operates on `items.ts` / `selection.ts` against post-`1dc2b75` state freely.
- Sound-bank rewire: orthogonal. Admin routes do not interact with sound effects.
- `/review` surface (Round 3): retired-as-shipped; consumed as anchor pattern, not modified.
- Smoke-script triage residuals (`scripts/dev/smoke/phase3-commit5.ts`, `phase3-commit2-browser.ts`, `scripts/_lib/explain.ts`): NOT in scope unless smokes are run during validator+admin round and surface failures from these residuals.

### §7.3 §0.5 anchor patterns (post-retirement / post-Round-3 components)

Reusable in the admin UI (§2 of plan-doc):

- **TopNav unification:** `loadNavChrome(userId)` + `<PageNav>` (`"use client"`, `React.use()` consumer). Mount on admin routes; admin-specific affordances (e.g., admin-mode badge) are NEW additions on top of this base.
- **Past-sessions review page (`/review`)** as anchor for admin queue's paginated-fetch shape: server component initiates promise, `<Suspense>` per-page wrapper, `"use client"` view component consumes promise.
- **Tabbed review interface (`<PostSessionShell>` post-`aa76394`)** as anchor for admin item-detail surface: tabs for stem / explanation / provenance / audit-history.
- **`<LatencyRangeSlider>` (post-`810c83a`)** as anchor for any range-filter affordances in the admin queue (difficulty-range filter, embedding-distance-range filter).
- **`<WrongItemsBrowser>` post-rename "Question review"** for item-card rendering with status badges.

Excluded from reuse (deleted at `81819e0`):
- `<TriagePrompt>`.
- `<TriageScoreLine>`.
- `triage_take` reducer action and associated state.

### §7.4 §0.6 architectural-question impact

- **Q5 edit semantics** — admin-edit fields list is unchanged by drift (stem / options / correct-answer / explanation / tags / sub-type / tier). Sub-phase a's provenance columns (per §0.6 Q5 schema-aware extensibility) remain the inputs.
- **Q7 audit trail shape** — `item_admin_actions` table proposal unaffected by drift; UUIDv7 + bigint ms conventions hold.
- **Q8 admin auth shape** — TopNav unification (`32bbbd4`) introduced NO role-aware affordances per §4.2. Q8's "greenfield" framing holds: `users.role` enum + Auth.js v5 session-callback enrichment is a clean introduction. HIGH confidence reaffirmed.
- **Q10 validator shape** — sub-phase a generator's Vercel Workflow integration unaffected by drift; one-shot batch over 1,711 candidates remains the v1 path.

### §7.5 §0.7 pressure-cell prioritization (δ-branch)

Empirical inputs from selection-engine sidecar's commit-0 audit (per `selection-engine-session-attempted-ids-sidecar.md` §6 #1):

- 2,150 total items / 439 live / 1,711 candidates at sub-phase-a close.
- Brutal tier: 6 items live across only 3 of 14 sub-types.
- Hard-tier-of-1 cells: `numerical.fractions:hard=1`, `numerical.workrate:hard=1`, `numerical.averages:hard=1`.
- Validator round un-deferred at sidecar close as the vehicle for δ-branch operationalization.

These remain valid post-drift; no commit between `1dc2b75` and `810c83a` modified the items table.

### §7.6 §0.9 forward-watch baseline

- Test baseline at `810c83a`: 172 / 0 / 19 files / 769 expect() calls.
- `structured-explanation.test.ts:152` stochastic suspect: still forward-pinned; NOT investigated this round.
- Selection-engine sidecar plan-doc top-of-file `STATUS: OPEN` line: docs-hygiene residual (line 3 not updated at round-close); minor edit candidate, not load-bearing.
- Smoke-script triage residuals: forward-pinned to a future smoke-script-cleanup pass; not blocking.
- Triage-prose body amendment in PRD/SPEC/design_decisions: forward-pinned per SPEC-A vs SPEC-B vs SPEC-C decision at validator+admin round commit 0.

### §7.7 §6.14.43 instances banked at this commit

- **Instance #5** — round-open as first practical test on wide-architectural surface (banked at validator+admin round commit-0; not at this audit-only commit but contextually recorded).
- **Instance #6** — three-assumption decomposition pattern (banked here; borderline — explicit STOP triggers mitigated risk but did not eliminate it; two of three assumptions falsified).
- **Instance #7** — commit-message-vs-diff inversion on `fa1c081` (banked here; CONFIRMED by Probe 1).

State after this audit: instances #6 and #7 banked at this commit. Instance #5 banks at the validator+admin round's plan-doc commit 0 (next commit).

## §8 Audit-step ledger

| # | Step | Outcome |
|---|---|---|
| 1 | `git rev-parse HEAD` = `810c83a` | PASS — anchor matches re-anchored spec |
| 2 | Lineage `810c83a / aa76394 / 32bbbd4` | PASS — verbatim match |
| 3 | `bun run typecheck` clean | PASS — no errors |
| 4 | `bun run lint` clean | PASS — `Checked 0 files`; structural lint runner clean |
| 5 | `git status` working tree clean | PASS — no modifications pre-write |
| 6 | Target audit-log file absent | PASS — no prior file at path |
| P1 | Selection-engine sidecar state (one or two) | FINDING — ONE sidecar, CLOSED at `1dc2b75`. §6.14.43 instance #7 banks. Plan-doc top-of-file `STATUS: OPEN` line is a docs-hygiene residual; substantive content of §5/§6/§7 is round-close. |
| P2 | Test baseline at `810c83a` | FINDING — 172 / 0 / 19 files / 769 expect(). Δ from `a8d83bf` baseline (128 / 0 / 17 / 644): +44 / +0 / +2 / +125. New test files: `result-sound-fx.test.ts` (+115), `streak.test.ts` (+128). |
| P3 | Ad-hoc session-log scope | FINDING — Five work-streams (review surface, streak, sound-bank, triage retirement, TopNav unification) covered in one ad-hoc session across eight commits. Round 3 framing was a subset; full scope is wider. Load-bearing decisions surfaced for §0.2 / §0.5 inheritance. |
| P4 | Triage-retirement empirical scope | FINDING — Code retirement complete (3 modules deleted, 2 schema columns dropped, ~430 LOC removed across reducer + tests + smokes + actions). Active-doc deprecation banners landed; ~80 inline body-prose residuals across PRD/SPEC/design_decisions. Three smoke/lib files retain live-code references missed in `81819e0`'s scrub. SPEC body amendment delta forward-pinned to plan-doc commit 0 (SPEC-A / SPEC-B / SPEC-C decision). |
| P5 | Streak feature scope | FINDING — Parent-facing user-incentive dashboard chip + TopNav across authenticated routes. UTC-day-distinct query; today\|yesterday grace. Fully orthogonal to validator+admin round. Anti-scope mention sufficient; no entanglement-fence required. |

## §9 Path-convention finding (per heads-up)

The redirector specified `scripts/_logs/2026-05-10_phase4-validator-admin-pre-open-reconciliation.md`.

### §9.1 Convention observed

- `scripts/_logs/` holds empirical artifacts: `convergence-audit.md`, `bun-test-flake-rerun.summary.md`, `drizzle-kit-investigation.summary.md`, jsonl outputs, snapshots, screenshot dirs. No date-prefixed session-log filenames.
- `docs/claude_logs/` holds conversational session logs: all `session_YYYY-MM-DD_HH-MM_topic.md` pattern, ~30 files.

### §9.2 Hybrid disposition

This file's content is empirical (probe findings, grep results, schema citations, test baseline) — matches `scripts/_logs/` content convention.

This file's filename uses date-prefix `2026-05-10_…` — matches `docs/claude_logs/` filename convention, NOT existing `scripts/_logs/` filenames.

The closest analog by content is `scripts/_logs/convergence-audit.md` (no date prefix; sub-phase-a-close handoff doc for sub-phase b). This audit-log is the same role for sub-phase b's commit-0 audit.

### §9.3 Resolution

Proceeded with the redirector's specified location. The hybrid (date-prefixed empirical-log) is a coherent convention extension: empirical content with date-tied scope. Surfaced for redirector ratification at stop-and-report; if the redirector prefers either pure convention (e.g., `scripts/_logs/phase4-validator-admin-pre-open-reconciliation.md` without date, or `docs/claude_logs/session_2026-05-10_pre-open-reconciliation.md` with conversational-log location), this commit can be amended with `git mv` before push.
