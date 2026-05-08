# Session Log: Practice round commit 12 — round-close plan-doc status flip
**Date:** 2026-05-07 22:01
**Duration:** ~10 minutes
**Focus:** Ship the final commit (12 of 12) of the practice round — flip `docs/plans/practice-round.md` status block from "planning, approved, not yet implemented" to "shipped 2026-05-07" per SPEC §6.14.20 closed-plans-immutable convention.

## What Got Done

- Audited the existing working-tree change to `docs/plans/practice-round.md` (already staged before the session) against the brief's required shape and the dashboard round's close precedent (`d1812c8`).
- Confirmed SPEC §6.14.20 wholesale-replacement-with-quote-preservation convention via `docs/SPEC.md` line 1322.
- Verified plan body sections §1–§9 are bit-for-bit identical to the commit-1 version (`12d9bca`) by extracting `git show 12d9bca:docs/plans/practice-round.md` and diffing original lines 4–469 against current lines 21–486 — `BODY IDENTICAL`.
- Ran the full verification suite:
  - `bun lint:all` → clean (664 files, no fixes; super-lint "no violations found").
  - `bun typecheck` → empty stdout (`tsgo --noEmit` success).
  - `bun test` × 3 runs → run 1: 78/79 (pre-existing `selection.test.ts:684 fullLengthNoReServe` flake); runs 2 + 3: 79/79.
- Committed: **`61dbd41`** — `docs(plan): round-close — plan-doc status flip` (1 file, +19/-2 lines).
- Reported the round-close ledger: full 12-commit hash list, 8/8 ask acceptance, 12-14 §6.14 candidate slate (7 from this round + 5 carried from dashboard round + 2 borderline), 4-item operational follow-up queue.

## Issues & Troubleshooting

- **Problem:** `bun test` run 1 failed at `selection.test.ts:684` (`fullLengthNoReServe`: expected 50 distinct items, got 48).
  - **Cause:** Pre-existing probabilistic flake — bank-depth-sensitive on thin sub-type cells, ~10-20% rate. Surfaced intermittently across both the dashboard round and this practice round but was never introduced by any round commit.
  - **Fix:** Re-ran the test suite twice more; both runs passed 79/79. The brief explicitly anticipated this flake and queues it as an operational follow-up — NOT a §6.14 candidate.

- **Problem:** Initial `Read` tool call against `docs/plans/practice-round.md` was blocked by the `cbm-code-discovery-gate` hook, which prefers codebase-memory-mcp tools for code discovery.
  - **Cause:** Hook is configured to route file reads through the codebase-memory MCP server.
  - **Fix:** Used `sed -n` via `Bash` to read the plan-doc content directly. The hook permits text-content reads via Grep/Bash fallback.

## Decisions Made

- **Accept the existing working-tree changes as correct.** The plan-doc edits were already made before the session started; rather than redo them, the session audited their shape (status-block-only, body-immutable, dashboard-precedent-matching) and validated the diff before committing.
- **Keep both top + bottom status flips.** The practice-round plan-doc has a self-referential bottom-of-file marker added at commit 1 (`> **Status: planning, approved, not yet implemented.** ... Round-close commit will flip this.`) — a divergence from the dashboard precedent which had only a top status. Flipped both per the original commit-1 instruction, called out explicitly in the commit body.
- **Defer §6.14 promotions to a separate post-round operational sub-round.** Per the round-close brief: 7-9 candidates from this round + 5 from dashboard round = 12-14 total; doc-only, ~1 commit, NOT bundled into this commit.
- **Do not push to origin.** Per the brief's explicit "DO NOT push to origin" instruction.

## Current State

- **Practice round: feature-complete.** All 12 commits landed on `main`; branch is 24 commits ahead of `origin/main` (pre-existing 12 dashboard-round + 12 practice-round).
- **Plan-doc:** `docs/plans/practice-round.md` flipped to "shipped 2026-05-07" with embedded 12-commit ledger and round-close summary; plan body §1–§9 immutable per SPEC §6.14.20.
- **Test invariant:** 79/79 preserved across all 11 prior commits' stable runs; pre-existing `selection.test.ts:684` flake queued for operational follow-up.
- **Asks 1–8:** All landed end-to-end and verified at commit 11 (Practice Test rename + Mastery Map removal; Previous Score + sparkline; editable Goal/Days; Pace tile + sparkline; Mistakes tile; mission picker; drill-default-5q; Practice tab → /full-length/configure).
- **Stub-removal chain (PRD §19):** 5 of 9 stubs went real this round (Sim Scoring × 2 helpers, Pace, Mission Picker, countMistakes); 4 still queued (Belts seeding, Streaks `computeStreak`, full Lessons, full Stats).
- **Untracked:** `data/images/` directory present in the working tree — pre-existing, not in scope for this commit.

## Next Steps

Whatever Leo decides next from this slate:

1. **Post-round §6.14 promotion sub-round** — doc-only, ~1 commit; promote 12-14 accumulated candidates (7 from this round + 5 carried from dashboard round + 2 borderline) into SPEC §6.14 entries.
2. **a11y-completeness sub-round** — Tab focus-trap in `<ScoreStripPopover>` + `aria-controls` correlation between trigger and dialog (G2/G3 from commit 11's audit) + focus-shell `prefers-reduced-motion` scope-anchor (carried from dashboard round commit 11).
3. **`selection.test.ts:684 fullLengthNoReServe` flake fix** — bank-depth-sensitive on thin sub-type cells; root-cause + fix.
4. **Deploy + dogfood** — dashboard v2 shape (TopNav + ScoreStrip + MissionCard + 2 DojoCards) is feature-complete; ready to ship.
5. **One of the 4 remaining PRD §19 follow-up PRDs** — Belts seeding (the `user_sub_type_belts` table now exists, deferred-migration absorbed at commit 3), Streaks `computeStreak`, full Lessons surface, full Stats surface. Mistakes-Review surface is also unblocked since `countMistakes` returns a real number.
