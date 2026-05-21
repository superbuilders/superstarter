# Session Log: Phase 5 sub-phase 3 — full-length test round (plan + 6-commit ship)

**Date:** 2026-05-07, ~10:30 → 12:24
**Duration:** ~2 hours
**Focus:** Drafted the closed-immutable plan for Phase 5 sub-phase 3 (full-length test), then shipped the six-commit round end-to-end. Phase 5 v1 is now feature-complete.

## What Got Done

### Plan-write
- Drafted `docs/plans/phase5-full-length-test.md` (622 lines) audit-first against `main` HEAD `ef2f067`. 12-section plan including 11 open questions §12.1-§12.11 with recommendations.
- Audit-against-actual-artifact across master plan §5, feature-roadmap §1, SPEC §10.3, PRD §4.5, schema readiness, per-surface session-type-aware enumeration, slot-generator design constraints, timer/pacing model, entry-point design, post-session shell behavior, test surface, live-DB row state.
- Plan-doc shipped early in commit `28d6260` (alongside unrelated docs) — audit-surfaced divergence vs §9 commit-1 framing.

### Commit 1 — `bc7e4be` — `docs(spec): open phase5-full-length-test round; SPEC §10.3 forward-looking adjustments`
- SPEC §10.3 header `/test` → `/full-length`.
- Added round-open marker callout naming the sub-phase + predecessor list + route pair pinning + slot-generator location.
- Item-1 v1-shape sentence updated: `/test/page.tsx` → `/full-length/configure/page.tsx` + `/full-length/run/page.tsx`.
- Captured 56-tier-cell snapshot (44 populated, 12 zero) in commit message body.

### Commit 2 — `a7ec40a` — `feat(config): full-length-slot generator + per-session deterministic interleaving`
- Added `generateFullLengthSlots(sessionId): ReadonlyArray<FullLengthSlot>` to `src/config/difficulty-curves.ts`.
- 4 helper functions: `seededRand`, `pickSubTypesWithReplacement`, `shuffleInPlace`, `buildDecileSlots` (extraction driven by biome's `noExcessiveCognitiveComplexity`).
- PRNG centralization: added `xmur3` + `mulberry32` to `diagnostic-mix.ts`'s named exports (option (a) — 1-line edit, body untouched).
- New `src/config/difficulty-curves.test.ts` with 7 unit tests (total length, per-decile distribution, per-session determinism, cross-session variation, 14-sub-type union coverage, no-section-break interleaving, per-(sessionId, decileIndex) decoupling). Test count 69 → 76.

### Commit 3 — `74f2dac` — `feat(selection): wire full-length into getNextFixedCurve`
- Extended `getNextFixedCurve` in `src/server/items/selection.ts` to dispatch on `ctx.type`: diagnostic → `shuffledDiagnosticOrder`, full_length → `generateFullLengthSlots`, simulation/drill → defensive throw.
- 3 integration tests in `src/server/items/selection.test.ts`: 50-attempt completion + per-decile distribution; slot-by-slot integrity (sub-type match + tier-degraded fallback shape); no-re-serve-in-session. Test count 76 → 79.
- EXPLAIN ANALYZE captured for `pickItemRow` (Bitmap Heap Scan on `items_sub_type_difficulty_status_idx`, 0.084 ms execution). No new indexes needed.

### Commit 4 — `61a650c` — `feat(app): /full-length/configure + /full-length/run routes; Mastery Map secondary CTA`
- New `src/app/(app)/full-length/configure/page.tsx` (bare primer pane; Q12.6).
- New `src/app/(app)/full-length/run/page.tsx` (server component → `startSession({ type: "full_length" })`).
- New `src/app/(app)/full-length/run/content.tsx` (`"use client"` mounting `<FocusShell>` with `sessionDurationMs: 900_000`, `targetQuestionCount: 50`, etc.).
- `src/components/mastery-map/mastery-map.tsx` extended with secondary CTA anchor: `<a href="/full-length/configure" className="text-foreground/60 text-sm underline-offset-4 hover:underline">Take a full-length test</a>`.
- Real-DB harness at `/tmp/full-length-harness.ts` drove 4 scenarios: 50-attempt completion (PASS), early-end / time-expiry simulation (PASS), slot-generator preview (PASS), Playwright screenshot of `/full-length/configure` unauth → /login redirect (PASS).

### Commit 5 — `9376423` — `feat(post-session): full-surface audit + polish across full-length post-session render path`
- Empty commit (`--allow-empty`); audit clean across all three surfaces (post-session shell, configure page, Mastery Map secondary CTA).
- EXPLAIN ANALYZE re-runs against full-length fixture session `019e0363-d0e7-7304-a520-583a4c4ce4ea` for all 5 post-session aggregations (`getPerSubTypeAccuracy` 0.608ms, `getPerSubTypeLatency` 0.493ms, `getWrongItemsForSession` 2.345ms, `triageScoreForSession` 0.143ms, `getStrategiesForSubTypes` 0.057ms) — all match diagnostic baseline plan shape.
- Systemic-token snapshot: `text-foreground/60` count 13 across 7 files (correcting commit 4's claim of count=1); `bg-foreground/5` at-rest count holds at 3.

### Commit 6 — `8a10fb1` — `docs(spec+plan): reconcile §10.3 + §10.7 to past-tense; close phase5-full-length-test round`
- SPEC §10.3 round-open marker reconciled past-tense ("opens" → "shipped"; "lifts" → "lifted").
- SPEC §10.3 items 1-3 expanded: route paths + slot-generator narrative + FocusShell auto-end + Mastery Map secondary CTA description.
- SPEC §10.7 added a sub-phase-3 marker paragraph matching the per-sub-phase-marker convention (corrects plan §2.8's misattribution to §6.5).
- Plan-doc status flipped to "shipped 2026-05-07" with full six-commit ledger + multi-paragraph round-close summary; original status preserved as a quote block underneath.

## Issues & Troubleshooting

### Heredoc bash parsing failure on commit 2's first attempt
- **Problem:** `git commit -m "$(cat <<'EOF' ... EOF)"` failed with "unexpected EOF while looking for matching `)`" — body never reached git.
- **Cause:** Long commit message body contained shell-special characters that confused the heredoc closure under bash's command-substitution context.
- **Fix:** Switched to writing the message to `/tmp/commitN-msg.txt` with the Write tool, then `git commit -F /tmp/commitN-msg.txt`. Used this pattern for commits 2-6.

### Commit 2 — biome `noExcessiveCognitiveComplexity` (max 15; inlined function scored 21)
- **Problem:** `generateFullLengthSlots` as a single function failed lint at complexity 21.
- **Cause:** Per-decile loop + per-tier loop + per-pick loop + Fisher-Yates shuffle compressed into one function body.
- **Fix:** Extracted 4 pure helpers (`seededRand`, `pickSubTypesWithReplacement`, `shuffleInPlace`, `buildDecileSlots`). Audit-surfaced finding: divergence vs plan §3 sketch which showed a single function. The 4-helper extraction is a strict readability + per-helper-testability win.

### Commit 2 — biome `no-pointless-indirection` on test helper
- **Problem:** `function emptyTierCounts() { return { easy: 0, medium: 0, hard: 0, brutal: 0 } }` flagged as pointless wrapper.
- **Cause:** 1-line function with no computation.
- **Fix:** Inlined directly into `tallyTiers`.

### Commit 3 — `??` lint catch in test code
- **Problem:** `row.fallbackFromTier ?? row.servedAtTier` flagged by `no-nullish-coalescing` rule.
- **Cause:** `??` operator banned codebase-wide; rule fires even in test files.
- **Fix:** Extracted `requestedTierForRow(row)` helper using explicit `if (row.fallbackFromTier !== null) return row.fallbackFromTier; return row.servedAtTier`. Matches the existing `requestedTierForItem(item)` pattern at `selection.test.ts:258`.

### Commit 3 — `as Difficulty` redundant cast
- **Problem:** `row.servedAtTier as Difficulty` flagged by `no-as-type-assertion` rule.
- **Cause:** Drizzle's pgEnum inference already returns `Difficulty` for `itemDifficulty(...)` columns; the cast was redundant.
- **Fix:** Dropped `as`. Replaced `Record<Difficulty, number>` index access with exhaustive `tierRank(tier: Difficulty): number` switch helper.

### Commit 3 — `items.subTypeId` returns `string` (not `SubTypeId`)
- **Problem:** Drizzle's varchar(64) inference returns `string`, not the narrowed `SubTypeId` union.
- **Cause:** Schema-level type doesn't carry the application's narrower union.
- **Fix:** Added `asSubTypeIdForTest(s: string): SubTypeId` helper at the boundary in the test file (mirror of `asSubTypeId` pattern in `selection.ts:55-69`); `errors.new` + `logger.error` per `require-logger-before-throw.md`.

### Commit 3 — Test 2 ~1% probabilistic flake
- **Problem:** Test 2's `degradedSeen >= 1` assertion failed once during dev (1 fail across multiple runs).
- **Cause:** Slot generator's draws-with-replacement against 14 sub-types means ~99% per-session probability of hitting the bank's 12 zero cells, but ~1% miss rate makes the test technically non-deterministic.
- **Fix:** No code change. Documented in test's own comment per Q12.11 — accepted risk; if future bank changes alter the zero-cell distribution, the assertion can be downgraded or scoped to specific zero cells.

### Commit 4 — Harness `@/` alias resolution from `/tmp/`
- **Problem:** `bun /tmp/full-length-harness.ts` failed with "Cannot find module '@/env'".
- **Cause:** tsconfig's `paths` alias `@/* → ./src/*` resolves from project root; `/tmp/` is outside the path-resolution scope.
- **Fix:** Copied harness to `./full-length-harness.ts` (project root); added to `.git/info/exclude` to keep it untracked. Ran from project root. Moved back to `/tmp/` for cleanup; restored exclude file.

### Commit 4 — Harness `endSession` failed with WorkflowRuntimeError
- **Problem:** `endSession(sessionId)` threw `WorkflowRuntimeError: 'start' received an invalid workflow function`.
- **Cause:** `endSession` triggers `masteryRecomputeWorkflow` which requires the Next.js workflow runtime — not available outside a Next.js request context.
- **Fix:** Used the existing dev/test escape hatch: `endSession(sessionId, { skipWorkflowTrigger: true })`. Same pattern `selection.test.ts` uses for its driven sessions.

### Commit 4 — Playwright chromium binary missing
- **Problem:** `chromium.launch()` failed with "Executable doesn't exist at /home/riwata/.cache/ms-playwright/...".
- **Cause:** Playwright was installed but the chromium browser binary wasn't downloaded.
- **Fix:** `bunx playwright install chromium` (downloaded 112 MiB).

### Commit 5 — `text-foreground/60` codebase-wide count correction
- **Problem:** Commit 4's commit message claimed `text-foreground/60` was a new token at count=1 after the secondary CTA edit.
- **Cause:** Partial grep at commit-4 audit time; didn't run codebase-wide.
- **Fix:** Commit 5's audit ran `grep -rn "text-foreground/60" src/` — actual count is 13 across 7 files, all semantically aligned as "secondary visual weight". Token is a stable systemic primitive; no namespaced token earns promotion. Convention: future systemic-token-count claims should use `grep -rn` codebase-wide rather than partial inspection.

### Commit 6 — SPEC §6.5 vs §10.7 misattribution
- **Problem:** Plan §2.8 referenced "SPEC §6.5 (Post-session review composition)"; actual SPEC §6.5 is "Latency measurement" (focus-shell internal, unrelated).
- **Cause:** Plan-time misattribution; the actual post-session-review-composition section is §10.7.
- **Fix:** Marker paragraph landed at §10.7 instead, matching the per-sub-phase-marker convention used by sub-phases 1, 4, 5. Captured per Q12.11 in commit message; no plan amendment per closed-plans-immutable.

### `Read` tool blocked on PNG screenshot
- **Problem:** `Read` of `/tmp/fl-harness-configure-unauth.png` blocked by codebase-memory-mcp pre-tool hook.
- **Cause:** Hook treats Read of any file as code-discovery without graph-tool routing.
- **Fix:** Skipped visual inspection; verified screenshot existed via `ls -la` (13776 bytes). Visual verification covered by HTTP status code check (302 redirect to /login confirmed the (app) gate works).

## Decisions Made

### Q12.1 — slot generator location: `difficulty-curves.ts`, not new `full-length-mix.ts`
The slot generator is a thin pure function over `standardCurve` + `roundDecile`; colocating with them in the existing config file avoids file-organization overhead for a 30-line function. Master plan §5's "or sibling" framing was settled in favor of colocation.

### Q12.3 — uniform sub-type draws in v1 (empirical-anchor weighting deferred)
Per-decile difficulty curve is the load-bearing exam-fidelity signal; sub-type weighting is a finer adjustment whose value isn't yet validated against dogfood signal. Uniform is simpler, deterministic, easier to verify.

### Q12.5 — Mastery Map secondary CTA → `/full-length/configure`
Small low-contrast anchor below the primary `<StartSessionButton>`, inside the existing `flex-col gap-3` wrapper. Inline anchor element, no dedicated component.

### Q12.6 — bare primer configure page; no pickers
v1 is fixed at 50q × 15min cross-sub-type-interleaved; nothing to configure. Configure page exists as a thin commitment-confirmation layer (not a settings panel).

### Q12.7 — heading stays "Session complete" (no full-length-specific copy)
Adding a third heading branch for one render variant doesn't earn its weight. Drill also uses "Session complete"; full-length matches.

### Q12.8 — zero session-type-aware edits to existing components
Every existing slot guard already routes full-length correctly. One Mastery Map secondary CTA addition; no edits to `<PostSessionShell>`.

### Q12.10 — tuples may repeat across slots; item ids never repeat in-session
The slot generator's draws-with-replacement may produce repeated `(subTypeId, difficulty)` tuples across slots; item-id-level no-re-serve enforced by existing `pickWithFallback` `sessionAttemptedIds` exclusion.

### PRNG centralization: option (a) — fold into commit 2
`xmur3` + `mulberry32` were locally scoped in `diagnostic-mix.ts`; commit 2 added named exports (1-line refactor; `shuffledDiagnosticOrder` body untouched). Avoided commit-cluster-shape change vs option (b)'s separate refactor commit.

### Form-submit shape over `<Link>` for configure → run
Matched drill's `<form action="/full-length/run" method="get">` pattern bit-for-bit; avoids importing `next/link` unnecessarily.

### Run-page imports `startSession` directly (not via the `actions.ts` wrapper)
Same precedent as drill — server components can import underlying functions directly; the actions wrapper is for client-component callers.

### Empty commit for clean-audit commit 5
Per plan §6 commit 5 framing's option (A): clean-audit outcome means "doc-only at the commit-message-body level". Used `git commit --allow-empty` to land the audit findings + EXPLAIN ANALYZE outputs in the message body without touching files.

### NO new SPEC §6.14.NN entries at sub-phase 3 close (Q12.11)
Multi-instance candidates (cyclomatic-complexity-cap-forced extraction; rule-doc/lint-enforcement gap; throwaway-verification-pattern) recorded for traceability in the round-close summary; not yet at promotion threshold.

## Current State

### Phase 5 v1: feature-complete
All five sub-phases shipped:
- Sub-phase 1 (post-session review surface) — 2026-05-04
- Sub-phase 2 (adaptive walker) — 2026-05-06
- Sub-phase 5 (dojo UI rename + belt indicator) — 2026-05-06
- Sub-phase 4 (click-to-highlight) — 2026-05-07
- Sub-phase 3 (full-length test) — 2026-05-07 ← *this round*

### What's working live (`main`)
End-to-end full-length flow reachable in browser:
- Mastery Map → "Take a full-length test" secondary CTA
- → `/full-length/configure` (bare primer pane, "Start full-length test" submit)
- → `/full-length/run` (kicks off `startSession({ type: "full_length" })`)
- → `<FocusShell>` with `sessionDurationMs: 900_000`, `targetQuestionCount: 50`, `paceTrackVisible: true`
- → 50-attempt completion OR 15-minute auto-end
- → `/post-session/[sessionId]` (drill-shared "Session complete" heading; slot 1 belt indicator null; slots 7-8 null; slot 9 Continue CTA renders; slots 2-6 type-agnostic including click-to-highlight on wrong items)

### Test surface
79 pass / 0 fail / 366 expect calls across 9 files. Test count grew 69 → 79 across this round (+7 unit tests on slot generator + 3 integration tests on engine dispatch).

### Bank invariants
439 live items / 14 sub-types / 50 NULL `source_folder` / 389 with `structuredExplanation` / 42 strategies / 14 distinct sub-types in strategies. Unchanged throughout the round.

### Audit gates
- `bun lint` clean.
- `bun typecheck` clean.
- closed-plans-immutable preserved (0 lines diff across 11 prior shipped plan-docs + commit-1 plan-doc body).
- Plan-doc shipped closed-immutable — body untouched outside the status block.

### Deploy gate
**The no-deploy-until-feature-complete gate per master plan §1 lifts.** The repo is now ready for the deploy decision.

### Local state
- 6 commits ahead of `origin/main`, not pushed (per safety protocol — no auto-push).
- Branch: `main` clean (working tree clean).
- Untracked: `docs/plans/dashboard_reference.png` (unrelated to this round); `/tmp/full-length-harness.ts` (throwaway).
- `practice_sessions.type='full_length'` row count: ~39 dev-only fixture rows from integration tests + harness runs.

## Next Steps

### Highest priority — deploy decision
- Push the 6 commits (`bc7e4be` → `8a10fb1`) to `origin/main` when ready.
- Decide whether to deploy now (deploy gate is lifted) or land the post-Phase-5 cleanup round first.

### Post-Phase-5 cleanup round (planned next arc per master plan §1 + sub-phase 3 round-close summary)
- Cleanup of vestigial v1-cut artifacts: schema files for `review_queue` + `strategy_views` (already dropped per v1-code-cleanup but worth re-checking); columns `practice_sessions.diagnostic_overtime_note_shown_at_ms` (deferred from Phase 3 sub-phase 1 commit 5); any other stale code-surface markers.
- Deploy-and-dogfood interlude (was Round Bx; deferred per Leo's no-deploy-until-feature-complete decision; now eligible).
- Operational hardening as dogfood signal surfaces.

### Standing candidates surfaced this round (carry forward to future operational rounds)
- **rule-doc/lint-enforcement gap** (4+ instances across sub-phases 3 + 4) — strong promotion candidate for §6.14.NN entry.
- **Cyclomatic-complexity-cap-forced extraction** (2 instances; sub-phase 3 + sub-phase 4) — pattern-tracking signal.
- **Throwaway-verification-pattern** (firmly multi-instance: sub-phases 2, 4, 5 + this round) — formalization candidate if dogfood signal demands.
- **`numerical.ratios.hard = 0`** non-brutal zero cell — documented; tier-degraded fallback handles it; future bank-population round can backfill if needed.
- **`structuredExplanation` backfill for the 50 NULL-`source_folder` seed items** (carried since sub-phase 4) — standing candidate; not graduated this round.
- **Visual-regression test infrastructure** + **component-test infrastructure** — both stay standing candidates; not graduated.
- **Test 2's 1% probabilistic flake** — single-instance signal; revisit if bank's zero-cell distribution shifts.

### Out of scope until further notice
- Test-day simulation (PRD §4.6) — Phase 6.
- Phase 4 LLM generation pipeline.
- Length variants for full-length, sub-type weighting in slot generator — follow-up rounds if dogfood signal demands.
- Mastery Map "Test-day simulation" / "History" / "Review (N due)" secondary CTAs — out of v1 scope.
