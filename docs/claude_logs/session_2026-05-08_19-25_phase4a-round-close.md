# Session Log: Phase 4 Sub-Phase a (Similar-Item Generator) Round Close
**Date:** 2026-05-08, ~14:00 → 19:25 CDT
**Duration:** ~5h25m
**Focus:** Diagnose CR Zod failures, ship two generator fixes (schema + max_tokens), complete full-bank generation, characterize antonyms convergence, clean up convergent candidates, and close the round with plan-doc reconciliation + 12 new §6.14 entries.

## What Got Done

**Code commits (3 in src/server/generation/):**
- `60bde8e` — `fix(generation): align sibling schema options.min with full-bank source distribution`. Loosened `submitSiblingSetSchema.options` bound from `min(4).max(5)` to `min(3).max(5)` at `src/server/generation/sibling-schema.ts:57`; updated the system-prompt instruction at `src/server/generation/sibling-prompts.ts:48` from "Each sibling has 4 or 5 options." to "Each sibling has the same number of options as the source (typically 3 to 5)."
- `7aa39d5` — `fix(generation): raise sibling-generation max_tokens 4096→8192 + capture stop_reason/usage on parse-fail`. Raised `SIBLING_GEN_MAX_TOKENS` constant; augmented the parse-fail `logger.error` context object with `stop_reason` + the 4 usage fields (snake_case mirroring the success-path's logger.info shape at lines 197-208).

**Data commits (5 destructive cleanup commits, all `--allow-empty`):**
- `ecca199` — recovery cleanup before full-bank rerun (deleted 560 mixed-config generated rows + 140 provenance JSONs + truncated idempotency log).
- `989d6da` — full-bank sibling generation resume after max_tokens fix (437/439 sources × 4 = 1,748 candidates; $2.61 cost).
- `ed730a5` — retire 37 convergent verbal.antonyms candidates per cluster audit (keep-1-per-cluster across all 4 tiers).

**Round-close commit:**
- `f380ecd` — `docs(plan): close phase 4 sub-phase a (similar-item-generator) round + author §6.14 entries`. Plan-doc status flip; §8 wholesale-replacement-with-quote-preservation (original 10-row ledger preserved at §8.4); §11.1 round-close empirical-actual cost subsection; §12.1 round-close post-cleanup per-sub-type-per-difficulty table (1,711 candidates final). Authored 12 new SPEC §6.14 entries (6.14.28 through 6.14.39).

**Diagnostic artifacts captured (all under `scripts/_logs/`, preserved across all cleanup commits):**
- `cr-diag.log` (33,656 B) — original CR Zod-failure diagnostic capturing rawInput from 3 sources verbatim.
- `cr-fix-smoke.log` (13,911 B) — schema-fix validation smoke (3-source CR run, all 3 succeeded).
- `full-bank-output.log` (1,376,563 B) — halted full-bank attempt's stdout capture (the load-bearing artifact for the empty-rawInput diagnostic).
- `full-bank-output-resume.log` — resume run's complete trace with augmented stop_reason on the 1 parse-fail event.
- `convergence-audit.md` (73,840 B, 1,050 lines) — pgvector cosine-similarity cluster scan across all 56 (sub_type × tier) cells at thresholds 0.92/0.95/0.97; SANGUINE deep-dive with quartile stats + option-set fingerprints.

**Final bank state (sub-phase b's input):**
- 1,711 generated candidates ready for validator round.
- 437 of 439 source items with full 4-tier sibling sets (99.5% coverage).
- 2 residual baseline-LLM-noise failures: `019dfbc8-1e11` (numerical.percentages, OPTION DISTINCTNESS), `019dfdaf-e54a` (verbal.critical_reasoning, structuredExplanation parts order).
- Per-tier balance near-square: 429/430/430/422 (asymmetric brutal-tier dip from antonyms cleanup).
- Brutal-tier coverage delta: 6 → 428 (~71× growth from pre-round live bank).

## Issues & Troubleshooting

### 1. CR Zod-parse failure burst at full-bank scale (21+ failures)
- **Problem:** First full-bank attempt halted around 13:51 local with 21+ `verbal.critical_reasoning` Zod-parse rejections; the script process froze afterward; original run had no stdout-to-disk capture so the rejection details were lost when the terminal session ended.
- **Cause:** Schema's `options.min(4).max(5)` bound was authored against the 50-item seed bank where every CR source had 4-5 options. The full-bank extraction added 38 CR sources with the canonical CCAT logic-validity 3-option shape ("Correct / Cannot be determined / Incorrect"). The LLM correctly mirrored the source's option count per the prompt's "preserve problem structure" rule; Zod rejected on `siblings.{tier}.options too_small minimum=4`. Schema-vs-bank distribution audit showed 38/59 (64%) of real CR sources have 3 options + 1/16 ratios source.
- **Fix:** `60bde8e` loosened the bound to `min(3).max(5)`. Pre-fix audit confirmed no real source has option_count > 5 across all 14 sub-types, so `max(5)` upper bound was unchanged. Smoke-validated against 3 unprocessed CR sources; all 3 succeeded with 3-option output mirroring source structure.

### 2. Lost stdout on the halted full-bank run
- **Problem:** The first full-bank invocation didn't redirect stdout to disk via `tee`; the `logger.error` blocks (with `rawInput` + `issues`) emitted to terminal stdout only. Root-cause investigation of the CR-failure burst required a separate diagnostic re-run with `tee`.
- **Cause:** Operational discipline gap — long unattended LLM-call orchestration runs were assumed to log via the JSONL idempotency log, but that log only captures *successes*. Failure-path logger.error blocks went to stdout-only.
- **Fix:** Recovery cycle defaulted every subsequent invocation to `bun ... 2>&1 | tee scripts/_logs/<X>.log`. Captured logs are preserved as historical artifacts across all cleanup commits. Codified as §6.14.38 (Stdout capture for long unattended runs).

### 3. CLI flag syntax silently rejected
- **Problem:** First full-bank rerun invocation `bun run scripts/generate-siblings.ts --all-sub-types --max-cost-usd 50 --neighbors-per-tier=2` aborted at startup with `flag '--max-cost-usd' requires '=value'`.
- **Cause:** The orchestrator's CLI parser at `scripts/generate-siblings.ts:101` requires `=value` separator; `--max-cost-usd 50` (with space) is rejected. The user prompt's invocation example used a space.
- **Fix:** Re-ran with `--max-cost-usd=50`. DB was untouched (parse aborted before any mutation). No commit needed.

### 4. Empty-rawInput failure cluster on hard-tier high-content-tail CR sources
- **Problem:** Full-bank rerun at scope-H halted at 10.9% (6/55) verbal.critical_reasoning failure rate. 5 consecutive failures on `019dfdaf-{33aa,57ae,94e0,cae7,e54a}` with `rawInput: {}` (LLM emitted empty tool-use input).
- **Cause:** Diagnostic confirmed `max_tokens=4096` exhaustion as the dominant hypothesis: wall-clock ~62s on the empty calls vs. ~25s typical (~2.5× slower); 100% of failures at userPromptTokens ≥ 2739 + hard tier; empty rawInput is the SDK's tool_use shape on `stop_reason='max_tokens'` mid-output. The 5 affected sources are the largest CR sources by total content (1000-1458 chars total source content, with hard-tier output requiring more verbose siblings).
- **Fix:** `7aa39d5` raised `SIBLING_GEN_MAX_TOKENS` to 8192 (Sonnet's default cap, ~100% headroom over projected 3500-4500 token outputs). Same commit augmented the parse-fail logger.error context with `stop_reason` + usage fields per §6.14.33 (failure-path observability symmetry — the discipline that the gap had bitten twice in this round). Empirically validated: resume run had zero `stop_reason: "max_tokens"` occurrences in the log; 4 of 5 prior empty-rawInput sources now succeed.

### 5. Test-flake on `bun test` showing "1 fail" intermittently
- **Problem:** During verification gates after the antonyms cleanup commit, one `bun test` run output showed `1 fail` mid-stream.
- **Cause:** Misread of mid-output progress text; full output showed `97 pass / 0 fail`. Re-running confirmed clean state. The `expect()` count varied 477/478/479 across runs (likely a conditional-branch test that fires sometimes).
- **Fix:** Re-ran `bun test`; confirmed 97 pass / 0 fail; proceeded with commit.

### 6. SANGUINE convergence at ~46% (vs. plan-time prediction of "first 1-2 sources")
- **Problem:** Body-text-exact-match scan flagged 16/35 = 45.7% of brutal verbal.antonyms candidates as SANGUINE-bearing. Far worse than the §10 plan-time prediction of "first 1-2 sources converge". The b1 tier-stratified vector-similar-context architecture didn't prevent the convergence at full-bank scale.
- **Cause:** The SANGUINE convergence is a canonical-exemplar attractor: the LLM converges on the target word selection (anchor) even when (a) the prompt explicitly forbids reuse, (b) prior generations are injected as do-not-duplicate exemplars in the user prompt, and (c) each call independently produces its own option-set surface. The convergence-audit cosine-clustering scan at threshold 0.95 surfaced 16 antonyms clusters across all 4 tiers (SANGUINE size-13 brutal + frugal size-6 medium + timid size-4 easy + others). Other 13 sub-types showed ≤5.6% convergence (12 of 13 under 1%; CR and sentence_completion each at 0%).
- **Fix:** Authored convergence-audit.md as the binding cluster definition. Decided cleanup-after-the-fact (vs. architectural intervention) per Leo's option C: keep-1-per-cluster strategy at threshold 0.95 with lowest-id retention per cluster. `ed730a5` retired 37 candidates following the §6.14.31 destructive-operation-gate template. Codified the round-defining lesson as §6.14.36 (canonical-exemplar convergence — architectural-fix-not-prompt-fix) with the diversified-distractor finding (15/16 SANGUINE candidates have unique option-set fingerprints) as the load-bearing characterization.

### 7. Cross-tier cluster overlap fully erased one parent's generated set
- **Problem:** Post-cleanup verification step 8e showed 20 partial parents but only 33 sibling losses accounted for (37 total deletions − 33 visible = 4 unaccounted). GROUP BY query missed parents with zero remaining rows.
- **Cause:** Parent `019dfdac-b934-72ea-a786-436d334f4057` was the canonical-exemplar source whose generations clustered at all 4 tiers (Timid-easy, frugal-medium, hard-cluster #2, Sanguine-brutal); keep-1-per-cluster cleanup retained none of its 4 siblings. With zero rows remaining, the parent is invisible to a `GROUP BY metadata_json->>'parentItemId'` query.
- **Fix:** Wrote a follow-up zero-check script (`scripts/_audit/zerocheck.ts`) that walked the cluster-touched parents via union-of-cluster-member-ids and queried their current sibling counts. Surfaced 21 distinct parents touched (1 fully-erased + 20 partial); reconciled the 37-deletion math: 7×0 + 11×1 + 5×2 + 4×3 + 1×4 = 37 ✓. Folded the dataset-shape consequence into §6.14.36 as a sub-finding.

## Decisions Made

- **Loosen schema bound rather than tighten the prompt** (60bde8e). The CR-failure diagnostic showed the LLM was correctly preserving the source's structural pattern (3 options for CCAT logic-validity); the schema was wrong, not the LLM. Adjusting the prompt to demand 4-5 options would have fought against the "preserve problem structure" rule that's correct in every other sub-type.
- **Raise max_tokens to 8192 instead of 32k or 64k** (7aa39d5). 8192 is Sonnet's documented default cap; provides ~100% headroom over projected 3500-4500 token outputs without engaging extended-output beta headers. Conservative choice; can revisit if future content tier escalates.
- **Augment failure-path observability while the file is open** (7aa39d5 second change). The stop_reason/usage gap had bitten twice in the round (CR Zod-failure round + empty-rawInput round). Coordinated change with the max_tokens fix to close the observability gap that prevented direct diagnosis of both prior failures.
- **Halt the full-bank attempt at scope-H 10.9% CR rate** rather than burn through to completion. Per scope H discipline ("If failure rate exceeds 10% in any sub-type at scale, STOP and surface BEFORE the run completes — Don't burn through the full $13 chasing a structural problem"). The empty-rawInput cluster was a structural pattern, not noise; stopping preserved cost budget for the resume.
- **Idempotent resume after halt rather than start-over** (`989d6da`). The orchestrator's §4.8 idempotency guard (count==4 per parent) skipped the 372 successful sources at zero LLM cost. Resume processed only the 67 attempts that needed work ($2.61 cost vs. ~$13 for a clean restart). The "halt-on-threshold → fix → idempotent resume" pattern is now the validated round-recovery shape.
- **Investigate empty-rawInput before fixing** (Leo's option 3 at the resume halt). Captured the augmented logger.error data + computed prompt-size threshold analysis; confirmed max_tokens exhaustion as dominant hypothesis before authoring the fix. Avoided reactive-fix-cycles.
- **Cleanup-after-the-fact for antonyms convergence** (Leo's option C at the convergence-audit redirect; `ed730a5`). Architectural intervention (sub-type-specific brutal-anchor blacklist, etc.) deferred to future round. Cleanup at threshold 0.95 keep-1-per-cluster removed 37 candidates; bank ships at 1,711 with the convergence pattern characterized AND addressed.
- **Lowest-id retention per cluster** rather than LLM-judged quality. UUIDv7-asc = earliest-generated. Structurally deterministic; avoids LLM-judged "best quality" variance; preserves the earliest sibling under each canonical-exemplar attractor.
- **12 §6.14 entries authored at round-close** (parent commit 9). Per Leo's pre-evaluated promote/defer table: 12 promote, 3 defer (one of which folded into 6.14.36). Largest single round-close §6.14 batch in the project to date; reflects the round's structural complexity (22 commits across multiple discipline domains) + LLM-orchestration novelty.
- **Provenance JSONs left as-is post-cleanup** (per scope at `ed730a5`). 21 JSONs now encode 4-sibling sets where 1+ siblings have been deleted from DB; partial-invalidation documented as known state for sub-phase b validator awareness (codified as §6.14.39).

## Current State

**Plan-doc status:** `docs/plans/phase4-similar-item-generator.md` is **shipped 2026-05-08** (status flip at `f380ecd`). Round closed at parent commit 9. Sub-round plan-doc untouched (zero diff lines per §6.14.20 immutability).

**HEAD:** `f380ecd` on `main`. Round-close chain (most recent first): `f380ecd` → `ed730a5` → `989d6da` → `7aa39d5` → `ecca199` → `60bde8e` → ...

**DB state:**
- `source='generated'` count: **1,711** (final round-close state).
- `source='real'` count: **439** (untouched throughout the round).
- Per-tier breakdown: easy=429 / medium=430 / hard=430 / brutal=422.
- All 1,711 candidates have embeddings populated (synchronous embedding contract per parent §4.10 holds).

**Filesystem state:**
- `scripts/_siblings/*.json`: 437 provenance JSONs (one per successful parent; 21 are partial-invalid post-`ed730a5`).
- `scripts/_logs/siblings-generated.jsonl`: 437 success entries.
- `scripts/_logs/cr-diag.log`, `scripts/_logs/cr-fix-smoke.log`, `scripts/_logs/full-bank-output.log`, `scripts/_logs/full-bank-output-resume.log`, `scripts/_logs/convergence-audit.md`: all preserved as historical artifacts (gitignored locally).

**Code state:**
- `SIBLING_GEN_MAX_TOKENS = 8192` at `src/server/generation/sibling-generator.ts:42`.
- Parse-fail logger.error captures `stop_reason` + usage fields at lines 175-191.
- `submitSiblingSetSchema.options` bound: `z.array(llmOption).min(3).max(5)` at `src/server/generation/sibling-schema.ts:63`.
- Prompt instruction: `"Each sibling has the same number of options as the source (typically 3 to 5)."` at `src/server/generation/sibling-prompts.ts:48`.

**Lint/typecheck/test state:** all green at HEAD (`bun lint:all`, `bun typecheck`, `bun test` 97 pass / 0 fail).

**Cumulative LLM cost across the round:** ~$19.66 (under $50 cap; ~31% over plan-time central estimate of $5-15 due to iteration cycle + halted-then-resumed shape + recovery smokes).

## Next Steps

**Immediate next redirect cycle (separate, opens a new round):**

1. **Sub-phase b plan-doc creation** — the validator round. Inputs: 1,711 generated candidates from this round's bank; the 0.92 cosine-similarity threshold forward-pinned at parent §4.13; convergence-audit.md as calibration corpus. Audit step should explicitly cross-reference §6.14.39 (provenance-JSON partial-invalidation) so the validator handles the 21 partial-invalid JSONs cleanly.

**Deferred items worth tracking (not scoped this round; surface for future rounds):**

2. **Antonyms architectural-fix decision** (the deferred half of `ed730a5`'s scope). The cleanup addressed the symptom; the canonical-exemplar attractor architectural pattern is unaddressed. Future-round options surfaced in §6.14.36: (a) sub-type-specific brutal-anchor blacklist injected into prompt; (b) regeneration-with-anti-anchor signaling when neighbor-context shows target word repeating; (c) target-word constraint hard-coded out-of-distribution from the LLM's training-bias attractor set.
3. **2 residual baseline-noise failures** (`019dfbc8-1e11` + `019dfdaf-e54a`). Could be retried in a future round with `--reset-source` for completeness, or absorbed into sub-phase b's validator workload (the validator's job is to gate quality, including catching these).
4. **Provenance JSON partial-invalidation cleanup** (per §6.14.39). Future cleanup-cycle in sub-phase b could either prune the 21 partial-invalid JSONs OR introduce a JSON-side validator-aware read path. The round chose to defer.
5. **`numerical.lowest_values` templating artifact** (160 candidates, 97.5% in clusters — all expected per `c4d8541` prior audit). Sub-phase b's validator needs awareness that lowest_values bodies are intrinsically templated; cosine-similarity checks against this sub-type need a methodology adjustment.

**Empirical headlines to carry into sub-phase b:**

- B1 architecture (tier-stratified vector-similar-context) is empirically sufficient for 13 of 14 sub-types. Validator can rely on the b1 candidate-set as cleanly diversified for `verbal.critical_reasoning`, `verbal.sentence_completion`, `verbal.analogies`, all numerical sub-types except lowest_values, etc.
- B1 architecture is empirically insufficient for `verbal.antonyms`. Validator inherits a partially-cleaned antonyms set (103/140 post-cleanup); the residual convergence pattern is sub-type-bounded.
- Schema bounds + max_tokens are now tested at full-bank scale. Validator round can assume the generator's output shape is stable.
- Failure-path observability is symmetric with success-path. Validator round inherits the augmented logger.error contract; debug cycles for any LLM-call failure mode benefit from same-shape diagnostic data.
