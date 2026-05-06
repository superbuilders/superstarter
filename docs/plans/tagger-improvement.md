# Plan — Tagger improvement (Phase 5 fourth operational round)

> **Status: planning.** Round opens against `main` at HEAD `58b2b10` post-adaptive-walker-close. This is the fourth operational round in Phase 5: taxonomy-restructure (`1710a91`) → data-wipe (`54775a9`) → testbank-re-extraction (six commits ending `9c99103`+round-close) → adaptive-walker (`58b2b10`) → this round.

The round closes the empirical-classification gaps surfaced by the testbank-re-extraction round-close (findings (a) and (e)) and re-confirmed by the adaptive-walker sub-phase 2 commit-2 audit (the 56-cell snapshot). It is bounded, operational, and data-quality only: prompt-engineering at the classifier and a full-bank re-tag. No SPEC changes, no schema migrations, no walker behavior changes, no taxonomy edits.

The audit is the load-bearing piece. Two findings drive the round; both share a single fix shape.

## 1. Why this round, why now

Three forcing functions:

1. **The walker shipped at `58b2b10` produces tier-degraded fallback for the two non-brutal zero cells.** Walker behavior under fallback is correct — it returns a sister-tier item when the requested (sub-type × tier) cell is empty — but pedagogy improves when fallbacks are the exception, not the routine path. The 56-cell snapshot in `88335b5`'s commit body shows `numerical.workrate.easy = 0` and `numerical.lowest_values.hard = 0` as the only non-brutal zero cells. The other 10 zero cells are all at the `brutal` tier (bank-not-yet-seeded across most sub-types) and remain out of scope per §7.

2. **`12min_ratios` is the lowest-confidence folder in the bank at 45% per-folder tagger correctness — well below the 80% threshold the testbank-re-extraction round used as pass criterion.** All 13 other ground-truth-mappable topic folders pass cleanly. Improving `12min_ratios` lifts the bank's worst-case correctness; the bank's overall data quality lifts with it. The mis-classified items aren't lost — they currently live under `numerical.word_problems`, where they confound mastery signal for both sub-types (ratios appears under-attempted; word_problems appears noisier).

3. **The fix is cheap and reversible.** A single prompt-engineering edit at the extract-pass classifier plus a text-only re-tag script (read `body` + `options` from DB, classify, UPDATE `sub_type_id` + `difficulty` in place) closes the gap without re-running OCR extraction. The cost envelope is ~$1–2 (~439 items × Sonnet 4.6 text-only calls), an order of magnitude below the testbank-re-extraction round's ~$8–12 OCR pipeline cost. Round shape is small.

This round runs independently of strategy authoring (`numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values` strategy entries — out of scope), brutal-tier seeding (out of scope), and `isTextOnly` filter relaxation (out of scope per §7). **Production deploy remains gated on Leo's no-deploy-until-feature-complete decision; this is dev-only.**

## 2. Audit findings

The audit ran read-only against `main` at HEAD `58b2b10` (post-walker-close) and the live dev DB at `localhost:54320` (439 items at `status='live'`, the bank produced by the testbank-re-extraction round + 50 pre-round seed items at NULL provenance).

### 2(a) Finding (a) reproduced — `12min_ratios` 45% per-folder correctness

Empirical state of the live DB:

```sql
SELECT sub_type_id, count(*) FROM items WHERE source_folder = '12min_ratios' GROUP BY sub_type_id ORDER BY count(*) DESC;
       sub_type_id       | count
-------------------------+-------
 numerical.word_problems |     6
 numerical.ratios        |     5
```

**11 items in folder; 5 correctly classified as `numerical.ratios`, 6 mis-classified as `numerical.word_problems` → 45.5% folder correctness.** Reproduces the testbank-re-extraction round-close finding (a) exactly.

### 2(b) Finding (e) reproduced — non-brutal zero cells

```sql
SELECT sub_type_id, difficulty, count(*) FROM items WHERE status='live'
  AND sub_type_id IN ('numerical.workrate', 'numerical.lowest_values')
  GROUP BY sub_type_id, difficulty ORDER BY sub_type_id, difficulty;
       sub_type_id       | difficulty | count
-------------------------+------------+-------
 numerical.lowest_values | easy       |    21
 numerical.lowest_values | medium     |    12
 numerical.workrate      | medium     |     8
 numerical.workrate      | hard       |     3
```

**`numerical.workrate.easy = 0`** (no row); **`numerical.lowest_values.hard = 0`** (no row). Reproduces the 56-cell snapshot. The two non-brutal zero cells are the only empirical gaps the walker has to degrade around.

### 2(c) Sample-inspected `12min_ratios` items — diagnosis

11 stage-1 JSONs at `scripts/_stage1/12min_ratios/q01..q11.png.json`. Every item is a proportional-reasoning problem (folder ground truth = `numerical.ratios`).

| qNN | Stem (abbreviated) | Tagger sub-type | Correct? | Notes |
|---|---|---|---|---|
| q01 | "Six batteries weigh 72 grams. How much does one battery weigh?" | `word_problems` | ✗ | Unit-rate problem, prose form |
| q02 | "Gum costs £1.35; cost of 4 packs?" | `word_problems` | ✗ | Unit-rate × quantity, prose form |
| q03 | "60 glasses earned £90; earnings from 15 glasses?" | `ratios` | ✓ | Proportional, prose form — TAGGER GOT IT |
| q04 | "Donald 4× Mickey, Mickey 30× Andy, ratio Donald:Andy?" | `ratios` | ✓ | Explicit `a:b` notation in options |
| q05 | "840 eggs/month at $2.40/dozen vs $3.00/dozen, how much more?" | `word_problems` | ✗ | Unit-rate × quantity comparison |
| q06 | "Win:loss 1:3 → 1:2, how many wins?" | `ratios` | ✓ | Explicit `a:b` notation in stem |
| q07 | "Rebecca 4× Charlie, total 30, Rebecca?" | `ratios` | ✓ | Proportional split, no `a:b` notation |
| q08 | "80 yoga classes $480; cost of 16?" | `word_problems` | ✗ | Same shape as q03 — INCONSISTENT |
| q09 | "3 charities donations split equally, third gets how much more?" | `word_problems` | borderline | Equalization, not strict proportional |
| q10 | "Wedding split evenly, Megan family pays how much less?" | `word_problems` | borderline | Equalization, not strict proportional |
| q11 | "Henry 11× Josh, total 264, Henry?" | `ratios` | ✓ | Proportional split, same shape as q07 |

**Diagnosis: TAGGER PROBLEM — the classifier's disambiguation rule for `numerical.ratios` is too narrow.** The extract-pass prompt at `scripts/_lib/extract.ts:64–110` (the load-bearing classifier — see §2(e)) lists the 14 sub-types with `displayName` + `section` only, with no disambiguation guidance. The LLM falls back on lexical signals: it correctly classifies items with explicit `a:b` notation (q04, q06) and prose proportional-split items where it picks up the cue (q07, q11), but mis-classifies prose unit-rate items (q01, q02, q05, q08) as `word_problems`. Critically, q03 and q08 are the *same shape* ("X items cost Y, what about Z items?") but get different classifications — internal inconsistency confirms the classifier has no rubric to lean on.

The borderline items (q09, q10) are equalization problems and arguably correct as `word_problems` — they're not pure proportional reasoning. So the achievable folder ceiling is **~9 of 11 = 82%**, not 100%.

### 2(d) Sample-inspected workrate / lowest_values items — diagnosis

**`12min_workrate`** (7 items in folder; bank distribution = 6 medium + 3 hard, 0 easy across all source folders):

| qNN | Stem (abbreviated) | Sub-type | Difficulty | Notes |
|---|---|---|---|---|
| q01 | "8 parts take 20 min; 6 parts?" | `workrate` | medium | Unit-rate variant — could plausibly be `easy` |
| q03 | "Printer 12 pics in 28 min; 9 pics?" | `ratios` (✗) | medium | Same shape as q01 — INCONSISTENT |
| q04 | "2 workers + 1 fast worker, time?" | `workrate` | hard | Combined-work, multi-step |
| q06 | "Pipe A fill 10h; B empty 15h; both open?" | `workrate` | medium | Combined-work canonical |
| q08 | "Sue 4h; Roy 6h; together 15 cakes?" | `workrate` | medium | Combined-work canonical |
| q09 | "Helen 2h; Rory 6h; together?" | `workrate` | medium | Combined-work canonical |

The workrate-easy zero-cell traces to the absent unit-rate-variant easy classifications (q01-shape items get tagged `medium` even when arithmetically simple). Combined-work items (q04, q06, q08, q09) intrinsically require setting up `1/A + 1/B = 1/T`, which is multi-step under the rubric — they're correctly `medium` or `hard`. **The easy-tier gap is partially classification (q01-shape items mis-tiered) and partially structural (true combined-work items aren't easy under the feature-anchored rubric).**

**`12min_lowest_value`** (12 items in folder; bank distribution = 21 easy + 12 medium across all source folders, 0 hard):

| qNN | Stem | Sub-type | Difficulty | Notes |
|---|---|---|---|---|
| q01 | "Lowest of 1/6, .15, 1/9, .2?" | `lowest_values` | easy | Single-conversion comparison |
| q02 | "Lowest of .35, 1/3, 3/8, .45?" | `lowest_values` | easy | Single-conversion comparison |
| q03 | "Lowest of .4-1/4, .55-1/3, .38-1/5, .75-4/6?" | `lowest_values` | medium | Multi-step subtraction |
| q06 | "Lowest of .2/2, .3/2, .4/2, .75/5?" | `lowest_values` | easy | Single-step division |
| q09 | "Lowest of 2/11, 3/15, 4/18, 5/16?" | `lowest_values` | medium | Cross-multiplication compare |
| q12 | "Lowest of .25*.5, .15*.15, .1*.2, .3*.6?" | `lowest_values` | medium | Multi-step multiplication |

The lowest_values-hard zero-cell traces to mis-tiering of the trickier composite items (q03, q12) at `medium` rather than `hard`. Per the extract-pass rubric, "hard" means "multi-step arithmetic with fractions/percentages" — q03 and q12 satisfy this characterization, but the classifier rates them medium. **The hard-tier gap appears to be classification, not structural** — items with the right complexity exist; they're just under-tiered.

**Diagnosis for finding (e): TAGGER PROBLEM (mixed with mild structural pressure).** The same prompt-rubric weakness that drives finding (a) drives the borderline-tier slips at workrate-easy and lowest_values-hard. Both gaps are addressable by sharpening the classifier rubric; if items remain at zero post-re-tag, the round documents the residual gap as structural and the walker absorbs it via tier-degradation per `58b2b10`. No bank-depth fix (sourcing additional items) is in scope.

### 2(e) Tagger-pipeline shape

Two candidate classifiers exist; only one is on the testbank-ingest path:

- **`scripts/_lib/extract.ts`** (`EXTRACT_MODEL = "claude-sonnet-4-6"`, vision input): the **actual classifier on the testbank-ingest path**. It does OCR + classification in one Sonnet 4.6 vision call per screenshot. The `extractedItem` Zod schema includes `subTypeId` + `difficulty`; the system prompt at lines 70–110 enumerates all 14 sub-types via `buildSubTypeList()` but **provides no disambiguation guidance** between adjacent sub-types. The difficulty rubric is **feature-anchored** (vocabulary level, mental-arithmetic time, step count) per the prompt's lines 73–83, NOT time-band-anchored — so "easy = under 8s" is not in play; "easy = arithmetic doable in your head in under 5 seconds; clear pattern" is.
- **`src/server/items/tagger.ts`** (`TAGGER_MODEL = "claude-haiku-4-5-20251001"`, text input): a separate classifier that lives in `src/`. It IS invoked, but **only by the admin-portal "suggest tags" action** at `src/app/(admin)/admin/ingest/actions.ts:34`. It is **NOT** invoked by the stage-2 ingest endpoint (`src/server/items/ingest.ts` does no classification — it accepts the `subTypeId` + `difficulty` already extracted in stage 1 and writes them to columns). Its prompt has explicit disambiguation rules (`'a:b ratio notation → numerical.ratios.'`) but they share the narrow-rule weakness.

**Two implications:**

1. The 12min_ratios mis-classifications and the workrate/lowest_values tier slips are products of the **extract pass** (Sonnet 4.6 vision), NOT of `tagger.ts`. Any prompt-engineering fix targeted at `tagger.ts` alone would NOT affect the bank state — items have already been ingested with extract-pass classifications.

2. The round's primary fix lands in `scripts/_lib/extract.ts` (so future ingestions are correct) AND `src/server/items/tagger.ts` (so the admin-portal "suggest tags" action benefits from the same rubric). The **re-tag** for the existing 439 items is a separate text-only pass — see §3 / §4.

**Side note (audit finding, not in scope to fix):** `scripts/_lib/extract.ts:71` says *"classify it into one of the 11 v1 sub-types"* — stale "11" carried over from pre-taxonomy-round prompt; the dynamic `buildSubTypeList()` correctly enumerates all 14. The LLM sees a count mismatch but classifies fine. Fix in commit 2 alongside the disambiguation edit (one-line update).

### 2(f) Per-folder correctness baseline (full table)

The 14 ground-truth-mappable topic folders' current per-folder correctness against the testbank-re-extraction round's 80% threshold (audit query: `SELECT source_folder, sub_type_id, count(*) FROM items WHERE source_folder LIKE '12min_%' AND source_folder NOT LIKE '12min_prep_practice%' GROUP BY ...`):

| Folder | Total | Correct sub-type count | % | ≥80%? |
|---|---|---|---|---|
| `12min_analogies` → `verbal.analogies` | 13 | 13 | 100% | ✓ |
| `12min_assumptions_and_conclusions_1` → `verbal.critical_reasoning` | 9 | 9 | 100% | ✓ |
| `12min_assumptions_and_conclusions_2` → `verbal.critical_reasoning` | 12 | 12 | 100% | ✓ |
| `12min_averages` → `numerical.averages` | 10 | 10 | 100% | ✓ |
| `12min_general_arithmetic` → `numerical.word_problems` | 10 | 9 | 90% | ✓ |
| `12min_lowest_value` → `numerical.lowest_values` | 12 | 12 | 100% | ✓ |
| `12min_number_series` → `numerical.number_series` | 12 | 12 | 100% | ✓ |
| `12min_percentages` → `numerical.percentages` | 12 | 12 | 100% | ✓ |
| **`12min_ratios` → `numerical.ratios`** | **11** | **5** | **45%** | **✗** |
| `12min_seating_arrangement` → `verbal.critical_reasoning` | 15 | 15 | 100% | ✓ |
| `12min_sentence_completion_1` → `verbal.sentence_completion` | 8 | 8 | 100% | ✓ |
| `12min_sentence_completion_2` → `verbal.sentence_completion` | 20 | 20 | 100% | ✓ |
| `12min_speed_distance` → `numerical.speed_distance_time` | 11 | 10 | 91% | ✓ |
| `12min_workrate` → `numerical.workrate` | 7 | 6 | 86% | ✓ |

Excluded (no ground-truth mapping per testbank-re-extraction §2(d)): `12min_advanced_topics`, `12min_numerical_summary`. Their distributions are recorded in §6 verification scenarios but do not gate the 80% pass criterion.

**Baseline summary:** 13 of 14 folders pass the 80% threshold; one fail (`12min_ratios` at 45%). Bank-wide tagger correctness across the 14 ground-truth folders is roughly `(155 / 162) = 95.7%`; the round's success criterion is moving `12min_ratios` to ≥80% without regressing any other folder below 80%.

## 3. Fix design

Two findings, single fix shape: sharpen the extract-pass classifier's prompt with disambiguation rules covering proportional reasoning (driving finding (a)) and tier-boundary cues (driving finding (e)), then re-classify the existing 439 items via a text-only pass against the improved prompt.

### 3.1 Prompt-engineering at the classifier — commit 2

Edits to `scripts/_lib/extract.ts:70–110` (the extract-pass system prompt) AND to `src/server/items/tagger.ts:108–155` (the parallel tagger prompt; kept in sync so the admin-portal "suggest tags" action benefits). Both prompts gain a single new disambiguation block + a sharpened difficulty rubric.

**Sub-type disambiguation block — exact additions:**

The current extract.ts prompt has no per-sub-type disambiguation. The current tagger.ts prompt has these rules at `src/server/items/tagger.ts:142–149`:

```
"Disambiguation for numerical items — classify by the dominant operation, not surface vocabulary:",
'- "%" symbol or the word "percent" → numerical.percentages.',
'- a/b fraction notation as operands → numerical.fractions.',
'- "average"/"mean" of a value set → numerical.averages.',
'- a:b ratio notation → numerical.ratios.',
'- combined-work or rate-of-completion ("A and B together can…") → numerical.workrate.',
'- speed / distance / time scenario → numerical.speed_distance_time.',
'- compare a small set of numeric expressions → numerical.lowest_values.',
'- Otherwise prose arithmetic without those markers → numerical.word_problems.',
```

The narrow-rule weakness is the `numerical.ratios` line — `a:b` notation alone misses prose-form proportional reasoning. **The replacement rule, applied to BOTH prompts:**

```
'- a:b ratio notation, OR proportional/unit-rate reasoning ("X items cost Y, what about Z items?"; "X cost Y per unit, total for N units?"; "A is k times B; given A+B, find A or B"; "scale up/down by factor") → numerical.ratios.'
```

The replacement explicitly enumerates the three prose-form patterns the classifier currently misses (unit-rate, scaling, multiplicative-split). The trailing `numerical.word_problems` catchall stays — items that are pure prose arithmetic without proportional structure (e.g., q09 / q10 equalization problems) correctly fall through.

**Difficulty rubric — sharpened tier-boundary cues:**

The current extract.ts difficulty rubric (lines 73–83) is feature-anchored but soft on the medium/hard boundary for arithmetic-heavy items. **One-line additions per tier:**

- `easy:` add — *"Single-step computation. Unit-rate problems with small integers (e.g., '8 parts in 20 min, 6 parts?') count as easy."*
- `medium:` unchanged.
- `hard:` add — *"Multi-step compound expressions, especially mixed fraction/decimal subtraction or cross-multiplied comparisons (e.g., '.4-1/4 vs .55-1/3'; '2/11 vs 3/15'), count as hard."*
- `brutal:` unchanged.

Cues are concrete (specific stem patterns) rather than abstract (count of steps), which the audit shows the classifier handles more reliably.

**Stale-count fix:** `scripts/_lib/extract.ts:71` `"11 v1 sub-types"` → `"14 v1 sub-types"`. One-line update; no behavior change but eliminates the prompt-internal inconsistency (audit finding noted in §2(e) side note).

**Decision rationale:** edit BOTH prompts (extract.ts and tagger.ts) in one commit. Trade-off: keeping them in lock-step is one more file to touch per future change; benefit is admin-portal "suggest tags" benefits from the same rubric and any future round that swaps which classifier runs in the ingest path doesn't regress on rubric quality. Rejected the alternative of editing only extract.ts (insufficient — the admin tagger is a forward dependency for the future admin-portal round; carrying the divergence is technical debt).

### 3.2 Re-tag script + execution — commit 3

A new script at `scripts/dev/retag-items.ts` reads each row from the `items` table, builds the question + options text payload, calls the **extract-pass classifier in text-only mode** (Sonnet 4.6, no image input — same model as extract.ts so classifications stay consistent), parses the response, and `UPDATE`s `sub_type_id` + `difficulty` if the new classification differs from the current one. Idempotent (runs safe to repeat); records per-row before/after deltas to a per-run summary log under `scripts/_logs/retag-summary-${date}.jsonl`.

**Why re-tag rather than re-extract:** re-extracting (re-running stage 1 + stage 2 + embedding backfill) costs ~$8–12 per the testbank-re-extraction round telemetry. Text-only re-tagging touches only `sub_type_id` + `difficulty` (the two fields under audit) and costs ~$1–2 for ~439 items. The `body`, `options`, `correct_answer`, `explanation`, and `embedding` columns are unaffected — the round's blast radius is exactly the two columns under audit.

**Decision: write a thin scripts-only re-tag that uses a text-only Sonnet 4.6 call directly.** Rejected the alternative of importing `classifyItem` from `tagger.ts` (Haiku 4.5) because (a) the bank's existing classifications came from Sonnet 4.6 — switching models risks regressing items currently correct due to model-capability rather than rubric quality; (b) the cost diff between Haiku and Sonnet for ~439 short calls is sub-dollar; (c) the round's primary fix is the rubric, not the model — keeping the model constant isolates the variable under test.

**Script shape (commit 3 implementation seam):**

```ts
// scripts/dev/retag-items.ts (new file, scripts/-ruleset-exempt)
const rows = await db.select({
  id: items.id,
  body: items.body,
  options: items.options,
  subTypeId: items.subTypeId,
  difficulty: items.difficulty
}).from(items).where(eq(items.status, 'live'))

for (const row of rows) {
  const text = renderQuestion(row.body, row.options)  // existing helper if available; else inline
  const result = await classifyTextOnly(text)         // text-only Sonnet 4.6 call with the improved prompt
  if (result.subTypeId !== row.subTypeId || result.difficulty !== row.difficulty) {
    await db.update(items).set({ subTypeId: result.subTypeId, difficulty: result.difficulty }).where(eq(items.id, row.id))
    log({ id: row.id, before: { subTypeId: row.subTypeId, difficulty: row.difficulty }, after: result })
  }
}
```

The `classifyTextOnly` helper takes the improved system prompt verbatim from extract.ts (so prompt parity is mechanical, not transcribed) and posts a text-only message. **No vision input** — the question + options text is the entire input.

**Touches:**

- `scripts/dev/retag-items.ts` (new)
- DB row state: `sub_type_id` + `difficulty` columns on a subset of `items` rows where the classifier disagrees with the current state. All other columns untouched.

**Concurrency / safety:**

- Single-process, sequential — no parallel calls, easy backoff on 429s via `withBackoff` from `scripts/_lib/anthropic.ts`.
- Read all rows first into memory, then loop — avoids long-held DB transactions.
- If the script crashes mid-run, the partial state is consistent (each UPDATE is atomic); re-running is idempotent (the script reclassifies all rows; no diff, no UPDATE).
- Dry-run flag (`--dry-run`) supported: emits the diff log without executing UPDATEs. Default mode is dry-run; `--apply` opts into writes.

**Cost estimate:** ~439 items × (~300 tokens in + ~50 tokens out) × Sonnet 4.6 pricing ≈ **$1–2**. Captured in commit 3's body alongside the `before → after` per-sub-type-per-tier delta table.

### 3.3 What this round does NOT fix

- **Bank-depth gaps that survive re-tag.** If after commit 3 the `numerical.workrate.easy` or `numerical.lowest_values.hard` cells remain at zero, the round documents the residual gap as structural in the round-close summary (§14) and accepts the walker's tier-degradation behavior as the stable resolution. No bank-depth fix (sourcing additional items from a different folder) is in scope.
- **Equalization-problem boundary in `numerical.word_problems`.** The borderline q09/q10 items in `12min_ratios` (equalization, not strict proportional) stay at `word_problems` post-fix; the achievable folder ceiling for `12min_ratios` is ~9 of 11 = 82%, not 100%. The round's success criterion accommodates this.
- **`12min_advanced_topics` and `12min_numerical_summary` distributions.** Excluded from the 80% gate per the testbank-re-extraction round's §2(d) discipline; observed empirically in §6 verification but not gated.

## 4. Re-run scope

**Decision: full bank re-tag (all 439 items at `status='live'`).** Rejected subset re-tag (only `12min_ratios` items, or only items where `source_folder ≠ expected_sub_type_for_folder`).

Rationale:

1. **Classification consistency.** A subset re-tag introduces classification-version skew within the bank: some items classified by the original extract pass (no disambiguation rules), some by the improved prompt (with rules). The 50 NULL-provenance seed items (hand-curated under the new taxonomy) and the 389 testbank items would be on different rubric versions if subset-re-tag were applied to only the testbank set. Walker, mastery computation, and selection-engine queries treat all items uniformly; rubric-version-skew across the bank produces selection asymmetries that are hard to debug.

2. **Cost is negligible.** Full re-tag is ~$1–2 (per §3.2). Subset re-tag would save maybe $0.50. The cost-savings rationale is dwarfed by the consistency cost.

3. **The improved rubric should be a no-op for the 13 folders already at ≥80%.** If the prompt change regresses any of them, the round catches it pre-merge in the verification protocol (§5) and either iterates the prompt or rolls back the rubric edit. The full-bank re-tag is also the empirical test of the rubric edit's safety; subset re-tag would not surface regressions on currently-correct folders.

4. **The 50 seed items get the same rubric.** They were hand-curated and should remain correctly classified under any reasonable rubric. If any seed item flips classification under the new rubric, that's an audit signal worth investigating (could be a seed-item authoring error, could be a rubric over-correction); pre-merge investigation either way.

**Bank-state delta after commit 3:** items count unchanged at 439; some subset (estimated 6–15 items, the `12min_ratios` mis-classifications + a few tier slips) have `sub_type_id` and/or `difficulty` updated. The `before → after` delta is captured in commit 3's body as primary-source verification.

## 5. Verification protocol

### 5.1 Per-folder tagger correctness — re-measured post-commit-3

The same query from §2(f) runs after commit 3:

```sql
SELECT source_folder, sub_type_id, count(*) FROM items
WHERE source_folder LIKE '12min_%' AND source_folder NOT LIKE '12min_prep_practice%'
GROUP BY source_folder, sub_type_id ORDER BY source_folder, count(*) DESC;
```

**Pass criteria:**

- `12min_ratios` → `numerical.ratios` ≥ **80%** (`numerical.ratios` is the modal sub-type; ≥9 of 11 items). The round may accept ≥75% if commit 3's body documents specifically why (e.g., a borderline item classified at the equalization edge).
- All 13 other ground-truth folders **stay at ≥80%** (no regression). If any drops below 80%, the round either iterates the prompt (additional commit) or rolls back the rubric edit and re-opens the round.

### 5.2 Per-sub-type per-tier counts — re-measured post-commit-3

The full grid query:

```sql
SELECT sub_type_id, difficulty, count(*) FROM items WHERE status='live'
GROUP BY sub_type_id, difficulty ORDER BY sub_type_id, difficulty;
```

**Pass criteria:**

- `numerical.workrate.easy` and `numerical.lowest_values.hard` cells **may move from 0 to ≥1** (target outcome). If they stay at 0, the round documents the gap as structural in the round-close summary; not a blocker.
- The other 10 brutal-tier zero cells stay zero (out of scope; bank-not-yet-seeded).
- Total live count stays at 439 (no items lost; no items duplicated).
- No sub-type goes from non-zero to zero on any non-brutal cell (no regression in bank coverage).

### 5.3 Sub-type drift snapshot

A second query captures the bank-wide before/after delta:

```sql
SELECT sub_type_id, count(*) FROM items WHERE status='live' GROUP BY sub_type_id ORDER BY sub_type_id;
```

Captured in commit 3's body alongside the §2(f)-shape per-folder table. Drift on the 14 sub-types should be small (estimated ≤20 items moving across all sub-types combined).

### 5.4 Walker behavior — uncoupled by construction

The walker reads `served_at_tier` (column on `attempts`, written at submit time) and consults the bank via the selection-engine queries. **No walker code paths read `sub_type_id` re-classifications transitively** beyond what existing queries already do. Verification:

- `bun test` 49/49 passes (walker tests pinned in `src/server/items/next-difficulty-tier.test.ts` and `src/server/items/selection.test.ts` are state-construction tests on synthetic bank data; they're untouched by re-tagging actual `items` rows).
- A spot smoke against `/practice/[sub-type]/drill` for `numerical.workrate` and `numerical.lowest_values` confirms the walker still serves items at the populated tiers + degrades gracefully on the zero cells (if any remain). Smoke is observational; no automated assertion.

### 5.5 Mastery / diagnostic-mix invariants

- `src/config/diagnostic-mix.ts`'s 50-entry mix has two tier substitutions (`numerical.workrate` easy → medium; `numerical.lowest_values` hard → medium) per the testbank-re-extraction round commit 5. **If commit 3 of THIS round populates the previously-zero cells**, the substitutions become unnecessary but stay in place — diagnostic-mix is hand-curated, not derived; reverting the substitutions is a separate operational decision (out of scope here, candidate for a follow-up).
- `src/config/diagnostic-mix.test.ts` 5/5 stays green (the `masteryReachability` test from testbank-re-extraction commit 5 is invariant under the re-tag — the mix doesn't change).

### 5.6 Lint / typecheck / test gates

- `bun lint` clean (Biome + GritQL + super-lint) at every commit.
- `bun typecheck` clean.
- `bun test` 49/49 holds (the test surface is unaffected by data-only changes per the testbank-re-extraction round's verification discipline).

### 5.7 Live-DB audit per SPEC §6.14.21

Out-of-band audit before commit 4:

```bash
PGPASSWORD=postgres psql -h localhost -p 54320 -U postgres -d postgres -At -c "
SELECT 'items_total='||count(*) FROM items WHERE status='live'
UNION ALL SELECT 'items_per_subtype_tier='||string_agg(sub_type_id||'.'||difficulty||'='||c::text, ',' ORDER BY sub_type_id, difficulty) FROM (SELECT sub_type_id, difficulty, count(*) c FROM items WHERE status='live' GROUP BY sub_type_id, difficulty) t
UNION ALL SELECT 'items_per_folder_subtype='||string_agg(f||'/'||s||'='||c::text, ',' ORDER BY f, c DESC) FROM (SELECT source_folder f, sub_type_id s, count(*) c FROM items WHERE status='live' AND source_folder IS NOT NULL GROUP BY f, s) t
;"
```

The output is recorded in commit 3's commit body as primary-source verification.

## 6. Sequencing and commits

**Four commits (decision):**

1. **Commit 1 — `docs+chore: open phase5-tagger-improvement round; capture pre-fix audit baseline`.** Plan ships at planning status. Pre-fix audit queries from §2(a), §2(b), §2(f) are captured to the commit body (and to `scripts/_logs/retag-baseline-${date}.txt` for reference). No code edits.

2. **Commit 2 — `feat(ingest+tagger): sharpen sub-type disambiguation rules + tier-boundary cues; sync taxonomy count`.** Per §3.1: edit `scripts/_lib/extract.ts` (add ratios disambiguation rule, sharpen difficulty rubric tier cues, fix stale "11 v1" → "14 v1") + edit `src/server/items/tagger.ts` (mirror the ratios disambiguation rule). Verification: `bun lint` + `bun typecheck` + `bun test` 49/49 hold (no behavior change to runtime code paths; prompt-string edit only).

3. **Commit 3 — `chore(items): full bank re-tag using improved classifier; verify per-folder correctness ≥80%`.** Per §3.2 + §4: write `scripts/dev/retag-items.ts`; run with `--dry-run` first to confirm the diff is plausible; run with `--apply` to commit; record the `before → after` delta + per-folder correctness re-measurement + per-sub-type-per-tier grid in the commit body. Live-DB audit per SPEC §6.14.21 captured in commit body. `bun test` 49/49 holds.

4. **Commit 4 — `docs(plan): close phase5-tagger-improvement round; reconcile round findings`.** Plan status flip to "shipped <date>" with all 4 commit hashes; round-close summary captures the per-finding outcome (fixed / accepted-as-structural / iterated); closed-plans-immutable verified per SPEC §6.14.20.

**Why 4 and not 2 or 6:**

- 2 commits (rubric edit + re-tag bundled) bundles a code-change with a data-change in one diff; review and revert become coupled. Rejected per migration-discipline analogy.
- 6 commits (split commit 2 into extract.ts + tagger.ts; split commit 3 into script-write + execution) over-fragments. The extract.ts and tagger.ts edits are mechanical-mirror; splitting adds churn without revertability benefit. Rejected.
- 4 commits matches the testbank-re-extraction round's audit-then-edit-then-execute-then-close shape and lets each commit's verification stand alone.

If commit 3's re-tag surfaces a regression on a currently-correct folder, the round inserts a follow-up commit (commit 3.5: `feat(ingest+tagger): iterate disambiguation rules; address <regression>`) before commit 4 closes; this matches the redline-expansion pattern from prior rounds. Plan-write commit count is 4; the audit-determined final count may be 4 or 5 per the actual runtime outcome.

## 7. Out of scope

- **Sub-phases 3, 4, 5 of Phase 5.** Strategy authoring, post-session-review polish, LLM-generation pipeline. Independent rounds.
- **Strategy authoring for `numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values`.** Independent of this round; can run in parallel.
- **`isTextOnly` filter relaxation** at `scripts/_lib/extract.ts:91`. Finding (c) from the testbank-re-extraction round; touches a different concern (filter aggression on chart-bearing stems) and would re-open the OCR pipeline. Separate round.
- **Brutal-tier bank seeding.** The 10 brutal-tier zero cells from the 56-cell snapshot are bank-not-yet-seeded across most sub-types; addressing them requires sourcing brutal items from a new corpus, not a tagger fix. Separate round.
- **Walker behavior changes.** The walker shipped at `58b2b10`; this round does not touch `src/server/items/selection.ts` or `next-difficulty-tier.ts`. The walker's tier-degradation behavior remains the stable fallback for any zero cells that survive the re-tag.
- **SPEC §4.1 / §4.2 taxonomy changes.** Closed in the taxonomy round per closed-plans-immutable.
- **Schema migrations.** No column adds, drops, or type changes. The blast radius is `sub_type_id` + `difficulty` row writes only.
- **Production deploy.** Gated on Leo's no-deploy-until-feature-complete decision; dev-only this round, same as the predecessor rounds.
- **Re-running stage 1 + stage 2 + embeddings.** Out of scope per §3 / §4 — the round explicitly chooses re-tag over re-extract for cost + blast-radius reasons.
- **`diagnostic-mix.ts` tier-substitution revert.** If commit 3 populates the previously-zero `numerical.workrate.easy` and `numerical.lowest_values.hard` cells, the two tier substitutions in the diagnostic mix become unnecessary. Reverting them is a hand-curated edit on a calibration-critical file; out of scope here, candidate for a follow-up operational round.
- **`scripts/_stage1/*.json` re-write.** Stage-1 JSONs carry the original extract-pass classifications; this round does not re-write them. The DB row state (`items.sub_type_id`, `items.difficulty`) is the source of truth post-commit-3; stage-1 JSONs are historical artifacts. Future re-extraction rounds (out of scope) would re-write them.
- **LLM-generation pipeline (Phase 4).** Not started; this round populates a more-correct items bank that the future generator will compare against for similarity-uniqueness.
- **`tagger.ts` model upgrade Haiku → Sonnet.** The admin-portal "suggest tags" use-case is fine on Haiku per the admin round's framing; switching costs more per-call without benefit for a manual-suggestion workflow. Not in scope.

## 8. Open questions / resolutions

Five questions surface at plan-write; recommended resolutions inline.

### 8.1 Q1 — Where to land the prompt-engineering fix

**Recommendation: BOTH `scripts/_lib/extract.ts` AND `src/server/items/tagger.ts`, in one commit (commit 2).** Rationale: the extract pass is the load-bearing classifier on the testbank-ingest path; the tagger module is a forward dependency for the future admin-portal "suggest tags" round. Keeping them in lock-step prevents rubric divergence; the cost is one extra file edit per future change. Rejected the alternative of editing only extract.ts (admin tagger carries technical debt) and the alternative of editing only tagger.ts and re-routing the testbank-ingest path through tagger.ts (architectural change out of scope for a data-quality round).

### 8.2 Q2 — Re-tag scope

**Recommendation: full bank (all 439 items at `status='live'`).** Rationale per §4: classification-version consistency across the bank, negligible cost difference (~$0.50 savings), and full-bank re-tag is the empirical test of the rubric edit's safety on currently-correct folders. Rejected subset re-tag (12min_ratios items only, or only items where `source_folder ≠ expected_sub_type_for_folder`).

### 8.3 Q3 — `numerical.workrate.easy` zero cell — diagnosis and remedy

**Recommendation: tagger-classification fix (covered by the same commit 2 prompt edit) + accept-and-document if cell remains at zero post-re-tag.** Rationale per §2(d): the q01-shape unit-rate workrate items are arguably easy under the feature-anchored rubric (single-step, small integers); the sharpened "easy" tier cues in commit 2 should pull at least the unit-rate-variant items into easy. Combined-work items (q04, q06, q08, q09) intrinsically require multi-step setup and stay at medium/hard correctly. If post-re-tag the cell is still zero, the round documents the gap as structural in §14 round-close and the walker's tier-degradation absorbs it. Rejected bank-depth fix (sourcing additional easy-workrate items from a new folder) because no additional source folder is empirically available in `data/testbank/`.

### 8.4 Q4 — `numerical.lowest_values.hard` zero cell — diagnosis and remedy

**Recommendation: tagger-classification fix (covered by the same commit 2 prompt edit) + accept-and-document if cell remains at zero post-re-tag.** Rationale per §2(d): items q03 and q12 in `12min_lowest_value` (mixed fraction-decimal subtraction; multi-step multiplication) plausibly satisfy the "hard" rubric of "multi-step compound expressions", but the classifier currently rates them medium. The sharpened "hard" tier cues in commit 2 (specific stem patterns: "`.4-1/4 vs .55-1/3`"; "`2/11 vs 3/15`") should pull at least the trickier composite items into hard. Same accept-and-document fallback as Q3 if post-re-tag the cell is zero. Rejected bank-depth fix (same rationale as Q3).

### 8.5 Q5 — 80% threshold inheritance

**Recommendation: hold 80% threshold for all 14 ground-truth folders post-fix; accept ≥75% for `12min_ratios` only if commit 3's body documents the equalization-boundary specific cause.** Rationale: the threshold is the testbank-re-extraction round's pass criterion and is the round's stated success metric. The achievable folder ceiling for `12min_ratios` is ~9 of 11 = 82% per §2(c) (q09 + q10 are equalization, not strict proportional, and may correctly stay at `word_problems` post-fix); the 80% gate is achievable. The ≥75% accommodation is for the case where the classifier under-applies the new rule on one borderline item (10 of 11 with a borderline q07-or-q11-class item flipping back to `word_problems`); commit 3's body documents the specific item if it lands.

## 9. SPEC §6.14.NN candidate (if applicable, commit 4)

This round inherits §6.14.18 (audit-against-actual-artifact) cleanly — §2 reproduces the testbank-re-extraction round's findings against the live DB and the actual classifier source files (not against inherited prior-round framings). Inherits §6.14.20 (closed-plans-immutable) cleanly — no edits to closed plans. Inherits §6.14.21 (live-DB-state-audit) cleanly — commits 1 and 3 each carry their own empirical-state recording.

**No new §6.14 entry is anticipated at plan-time.** If commit 3's re-tag surfaces a previously-uncaptured generalizable pattern (e.g., a "prompt-rubric-vs-bank-structure" lesson where a rubric edit reveals a structural bank-depth gap that wasn't visible under the original rubric), capture as a candidate for round-close redline. Otherwise, the round closes without a new §6.14 entry.

## 10. Inputs from prior rounds carrying forward

- **From taxonomy-restructure round** (`1710a91`): the 14-sub-type canonical taxonomy in `src/config/sub-types.ts`; the `subTypeIds` enum used by both `extract.ts` and `tagger.ts` Zod schemas.
- **From testbank-re-extraction round** (six commits ending `9c99103`+round-close): the 80% per-folder correctness threshold; the per-folder ground-truth-from-naming convention (14 of 16 folders); the `source_folder` + `source_filename` columns on `items` (used by §2(f)'s per-folder query); the 1426677 input + 85863 output token telemetry shape (used by §3.2 cost estimate); SPEC §6.14.22 (audit-claim-vs-actual-code, applied in §2(e)'s tagger-vs-extract distinction).
- **From adaptive-walker round** (`58b2b10`): the walker's tier-degradation behavior under empty (sub-type × tier) cells; the 56-cell snapshot in `88335b5`'s commit body (used by §2(b)'s zero-cell baseline). The walker's `served_at_tier` write path on `attempts.ts` (referenced in §5.4 — the re-tag does not interact with this).
- **From data-wipe round** (`54775a9`): the `targetQuestionCountFor` derivation from `diagnosticMix.length` (untouched by this round; the diagnostic mix is invariant under re-tagging).
- **From OCR-import-screenshots round** (predecessor pipeline): the script-ruleset-exemption convention (the new `scripts/dev/retag-items.ts` falls under this — `scripts/` files use `console.log` + native try/catch + inline ternaries per the predecessor convention).

