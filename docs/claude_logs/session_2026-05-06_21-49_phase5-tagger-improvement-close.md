# Session Log: Phase 5 tagger-improvement round — commits 3.5, 3.6, and round-close
**Date:** 2026-05-06, ~17:48–21:49 local
**Duration:** ~4 hours
**Focus:** Land commits 3.5 + 3.6 + 4 to close the Phase 5 tagger-improvement operational round; iterate the classifier disambiguation rubric until per-folder correctness gates pass empirically; reconcile docs.

## What Got Done

- **Commit 3.5 — `53604be`** — `feat(ingest+tagger): iterate disambiguation rules — canonical example, precedence ordering, ratios rule scope; export classifier prompt for script reuse`
  - Replaced canonical `numerical.word_problems` example in `tagger.ts:132` ("A pen costs $3" → "A bus has 47 passengers; 12 get off and 8 get on...").
  - Added precedence-ordering line to disambiguation block (lock-step in `extract.ts` + `tagger.ts`): `"percentages > fractions > workrate / speed_distance_time / averages / lowest_values > ratios > word_problems"`.
  - Tightened ratios-rule scope (lock-step) to non-temporal proportional reasoning with explicit time/work/speed/distance carve-out.
  - Folded in supporting `extract.ts` refactor: `buildExtractSystemPrompt` + `EXTRACT_TOOL` + `EXTRACT_TOOL_NAME` exports for `retag-items.ts` reuse.
- **Commit 3.6 — `4b84299`** — `feat(ingest+tagger+items): broaden workrate rule, sharpen ratios carve-out leading, replace pen seed with non-proportional additive; full bank re-tag`
  - Broadened workrate rule to include single-actor/uniform-rate work scenarios (lock-step).
  - Updated `tagger.ts:137` workrate canonical example to "If 8 parts take 20 minutes to make, how many minutes does it take to make 6 parts?".
  - Moved time/work/speed/distance carve-out from trailing to leading position in ratios rule (lock-step).
  - Replaced pen seed in `src/db/seeds/items/data/numerical-word-problems.ts` with the bus-passenger stem; new options `35/43/51/67`; correct answer index 1.
  - DB UPDATE for live row `019dfbc8-1e00...` to match the new seed (preserved opaque option ids; `correct_answer="y371vr1t"` still maps to "43").
  - Landed `scripts/dev/retag-items.ts` (399 lines, untracked from prior session).
  - Ran full apply-mode re-tag: 439 processed, 152 changes (22 sub-type, 130 difficulty).
  - Applied 4 manual UPDATE corrections post-apply (2 dry-run rejections + 2 stochastic divergences).
  - Committed apply-mode JSONL artifact `scripts/_logs/retag-summary-2026-05-06T23-39-09-228.jsonl` via `git add -f`.
- **Commit 4 — `9acf9a2`** — `docs(plan): close phase5-tagger-improvement round; reconcile round findings`
  - Wholesale-replaced status block at top of `docs/plans/tagger-improvement.md` ("Status: planning" → "Status: shipped 2026-05-06" with five-commit ledger and round-close summary).
  - Preserved original "Status: planning" sentence as a separate quote block underneath with attribution "Original status at plan-write."
  - Pure-appended new §11 "Round-close findings" with three operational lessons.
  - Verified body lines 1-2 and 4-410 byte-identical to commit 1 (807635e).
- **Empirical outcomes (post-commit-3.6 apply + manual corrections):**
  - `12min_workrate`: 6/7 (85.7%) → 7/7 (100%). Redline cleared.
  - `12min_ratios`: 5/11 (45.5%) → 7/11 (63.6%) raw / 7/9 (77.8%) adjusted against the achievable denominator per plan §2(c)+§8.5.
  - All 12 other ground-truth folders held at ≥90%.
  - Both non-brutal zero cells populated: `numerical.workrate.easy` 0→2; `numerical.lowest_values.hard` 0→8.
  - Bank totals invariant: 439 live / 50 NULL provenance / 389 non-NULL.
  - Cumulative LLM cost across the round: ~$18.96 (3 dry-runs + 1 apply at $4.62 / $4.72 / $4.81 / $4.81).
  - Test count holds at 49/49 across all five round commits.

## Issues & Troubleshooting

- **Problem:** Commit 3.5 audit-first checkpoint expected pre-edit baseline but Group A edits were already in the working tree.
  - **Cause:** Prior session had drafted commit-3.5 prompt edits + commit-3 prep files (`extract.ts` export refactor, `retag-items.ts`) into the working tree but didn't land them.
  - **Fix:** Halted, reported the workflow drift; user confirmed option (a) + split. Reset `extract.ts` to HEAD via `git checkout HEAD -- ...`, re-applied only Group A edits, staged `extract.ts` + `tagger.ts`, unstaged `retag-items.ts`.

- **Problem:** Split-path attempt for commit 3.5 broke `bun typecheck`.
  - **Cause:** `tsgo --noEmit` walks the full working tree (including untracked files). `retag-items.ts` imports `buildExtractSystemPrompt` / `EXTRACT_TOOL` / `EXTRACT_TOOL_NAME`, which I'd just stripped from `extract.ts` in the split-path reset.
  - **Fix:** Fell back to fold path per brief — restored full `extract.ts` (Group A prompt edits + Group B export refactor), re-staged. Title gained "+ export classifier prompt for script reuse".

- **Problem:** Commit-3.5 dry-run results showed 12min_workrate projected at 57.1% (below 80% redline) and 12min_ratios projected at 63.6% (below 75% accommodation).
  - **Cause:** Workrate rule was too narrow ("combined-work or rate-of-completion ('A and B together can…')"). Single-actor/uniform-rate work problems like "8 parts take 20 minutes" fell through to ratios via the proportional-reasoning rule. The carve-out's trailing position let the LLM weight the first-match more heavily. Pen seed scenario explicitly matched the ratios exemplar "X items cost Y, what about Z items?".
  - **Fix:** Halted, reported Path 2. Proposed commit 3.6 scope addressing all three root causes (workrate rule broadening, ratios carve-out fronting, pen-seed replacement). User approved with α-path for pen reconciliation (replace seed rather than strip the unit-pricing exemplar).

- **Problem:** First DB query for `019dfbc8-1e00...` row failed with "column 'options' does not exist", then again with "column 'correct_option_id' does not exist".
  - **Cause:** Guessed at column names without consulting the schema.
  - **Fix:** Queried `information_schema.columns` to get the actual column list (`body`, `options_json`, `correct_answer`, etc.), then re-ran with correct names.

- **Problem:** `bun run scripts/dev/retag-items.ts --apply | tail -25` never produced output during the apply run.
  - **Cause:** `tail -25` buffers all stdin until EOF. The Monitor was checking the bash output file, which stayed empty until the bun process exited.
  - **Fix:** Re-armed the Monitor against process-exit (`kill -0 71606`) instead of log-string match. Process completed cleanly at exit code 0.

- **Problem:** Apply-mode produced 2 sub-type changes that did NOT appear in the dry-run (`019dfdaf-94e0` critical_reasoning → word_problems; `019dfdb3-a9c5` speed_distance_time → ratios).
  - **Cause:** Stochastic LLM noise at `temperature=0` — temperature-0 isn't fully deterministic across runs.
  - **Fix:** Treated as additional rejections. Manually `UPDATE`d both rows back to pre-apply state in a single transaction alongside the 2 dry-run rejections (probability item, "Contend: Yield" analogy). Total 4 manual corrections; documented each in commit 3.6 body.

- **Problem:** Per-folder correctness query initially returned only 8 of 14 expected ground-truth folders.
  - **Cause:** Folder-name typos in my CTE (`12min_lowest_values` plural vs actual singular `12min_lowest_value`; missed `12min_assumptions_and_conclusions_*`, `12min_seating_arrangement`, `12min_sentence_completion_*`).
  - **Fix:** Queried distinct `source_folder` values to get authoritative names, then re-ran with corrected mappings — all 14 folders accounted for.

- **Problem:** Apply-mode JSONL summary file was gitignored.
  - **Cause:** `scripts/_logs/*.jsonl` pattern in `.gitignore` (intentionally — operational logs are typically transient).
  - **Fix:** Used `git add -f` for the apply-mode summary specifically, since the brief required it as the round's primary-source artifact for the diff log. Other prior dry-run JSONLs stayed untracked.

## Decisions Made

- **Fold path for commit 3.5 over hunk-split.** Hunk-level split worked cleanly but broke typecheck because `retag-items.ts` (untracked) depended on the Group B export refactor. Fold kept verification gates green; commit title widened to acknowledge the export refactor scope.
- **α-path for pen-seed reconciliation in commit 3.6.** User chose seed-replacement (rewrite `numerical-word-problems.ts:25` + DB UPDATE) over β-path (strip the "X items cost Y, what about Z items?" exemplar from ratios rule). α preserves the rubric's taxonomic clarity for unit-pricing.
- **Path 1 with documented exceptions for commit 3.6's apply decision.** 12min_ratios projected at 63.6% raw — below the 75% accommodation floor literally. But case-by-case audit identified marathon + wedding items as legitimate equalization-boundary exceptions per plan §2(c)+§8.5 (genuinely averages problems by their dominant operation, not ratios). Adjusted denominator 7/9 = 77.8% clears 75%. Plan §8.5's "achievable ceiling 9/11 = 82%" framing supports this reading.
- **Manual UPDATE corrections rather than rollback for the 4 outlier items in commit 3.6.** The bulk effect of 152 changes was overwhelmingly positive; 4 manual corrections (2.6% rate) are within reasonable scope and well-documented in the commit body.
- **No SPEC edits in commit 4.** Verified §4.1 + §4.2 contain only config-shape and strategies metadata; no rubric/disambiguation prose. The round's edits live entirely in `tagger.ts` + `extract.ts`.

## Current State

- **Phase 5 tagger-improvement round: shipped.** Five commits on `main`: `807635e` / `65e8af4` / `53604be` / `4b84299` / `9acf9a2`. Branch is 9 commits ahead of `origin/main` (round's 5 commits + 4 from predecessor adaptive-walker round).
- **Working tree:** clean.
- **Plan-doc:** `docs/plans/tagger-improvement.md` is closed-immutable with status "shipped 2026-05-06"; original "Status: planning" sentence preserved with attribution; new §11 round-close findings appended.
- **DB state:** 439 live items / 50 NULL provenance / 389 non-NULL. 12min_workrate 100%, 12min_ratios 63.6% raw / 77.8% adjusted, all 12 other ground-truth folders at ≥90%. Both non-brutal zero cells populated.
- **Verification gates:** `bun lint` clean / `bun typecheck` clean / `bun test` 49/49 across all five commits.
- **Tracked artifacts:** `scripts/dev/retag-items.ts` and the apply-mode summary JSONL at `scripts/_logs/retag-summary-2026-05-06T23-39-09-228.jsonl`.

## Next Steps

- Push the 9 ahead-of-origin commits when ready (not done in this session — destructive/visible action that needs explicit user authorization).
- Open the next operational round per master plan §8 sequencing (likely sub-phase 5: dojo belt indicator, which depends on the adaptive walker shipped in the predecessor round and visualizes the walker's current-tier output). Plan-time inputs would include this round's richer per-tier-cell baseline (workrate-easy and lowest_values-hard now populated).
- If a future round revisits the 12min_ratios folder ceiling, the gap to the 82% achievable ceiling is 2 unit-pricing items the classifier under-applies (`019dfdad-c80c` chewing gum £1.35×4; `019dfdae-1873` eggs multi-step pricing). Closing that gap would need either a sharper unit-pricing exemplar in the rubric or manual UPDATEs.
- Operational lessons from §11 should inform the next LLM-bearing round's plan-time framing: dry-run is a projection not a commitment (case-by-case audit must run against apply-mode output); folder-convention thresholds need an "achievable denominator" carve-out; cost envelopes should be expressed per-iteration with explicit halt-and-report gates per iteration.
