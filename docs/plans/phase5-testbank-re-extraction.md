# Plan — Testbank re-extraction (Phase 5 third operational round)

> **Status: planning, approved-pending-redline, not yet implemented.** Round opens against `main` at HEAD `54775a9` post-data-wipe-close.

This is the third operational round in Phase 5: taxonomy-restructure (`1710a91`) → data-wipe (`54775a9`) → testbank re-extraction (this round). The dev DB is in single-coherent-state post-data-wipe (sub_types=14 canonical, strategies=33 with `Partial<Record>` shape, items=50 at `status='live'` with embeddings 50/50, preserved auth tables intact). This round runs the OCR pipeline against `data/testbank/` to populate items under the 14-sub-type taxonomy from a substantially larger empirical bank, then re-balances `diagnosticMix` to 50 entries based on empirical per-sub-type ratios — the deferred Q1(b) work from the taxonomy round.

The round is operational rather than user-visible. The audit is the load-bearing piece. Three departures from the previous OCR pipeline drive the code edits; everything else is operating procedure.

## 1. Why this round, why now

Three forcing functions:

1. **The data-wipe round closed in single-coherent-state and unblocked re-extraction.** The 50 items currently in DB came from `bun db:seed:items` (hand-curated seed data under the new taxonomy). The full empirical bank — the screenshots in `data/testbank/` — is roughly an order of magnitude larger. Re-extracting now produces (a) per-sub-type counts that anchor the diagnostic-mix re-balance, (b) a richer item bank for similarity-aware fallback in selection, and (c) the substrate the LLM-generation pipeline (Phase 4 deliverable) compares against for uniqueness via embedding cosine similarity.

2. **Three of the round's inputs only became available 2026-05-05.** The `data/testbank/` shape audit (§2(a)) reveals 22 source folders modified between 2026-05-05 and 2026-05-06, including six fresh `12min_prep_practice_{1..6}` directories with answers visible in every screenshot, and 16 sub-type-targeted `12min_<topic>` directories that didn't exist when the predecessor pipeline (`docs/plans/ocr-import-screenshots.md`) shipped. The pipeline shape change (DEPARTURE 1: solve+verify deprecated) and the per-sub-type-folder shape (which lets the tagger be spot-checked against ground-truth sub-type-by-folder convention — §2(d)) are both direct consequences.

3. **The diagnostic-mix re-balance is the round's secondary deliverable.** PRD §4.1 carries a `PROVISIONAL` marker on the 46-entry mix pending this round; `src/config/diagnostic-mix.ts`'s top comment carries the same marker. The data-wipe round's commit 2 derivation fix made `targetQuestionCountFor` track `diagnosticMix.length` automatically, so the re-balance to 50 propagates without coordinated edit. This round resolves the marker.

Strategy authoring for the three new sub-types (`workrate`, `speed_distance_time`, `lowest_values`) is independent and can run in parallel; this round does not block strategy authoring. **Production deploy remains gated on Leo's no-deploy-until-feature-complete decision; this is dev-only.**

## 2. Audit findings

The audit ran read-only against `main` post-data-wipe-close (HEAD = `54775a9`).

### 2(a) `data/testbank/` inventory

22 folders, all PNG screenshots, all modified 2026-05-05 / 2026-05-06. Two shape categories:

**Mixed-source practice tests (6 folders, 209 PNGs):**
- `12min_prep_practice_1/` — 36 PNGs
- `12min_prep_practice_2/` — 34 PNGs
- `12min_prep_practice_3/` — 36 PNGs
- `12min_prep_practice_4/` — 33 PNGs
- `12min_prep_practice_5/` — 36 PNGs
- `12min_prep_practice_6/` — 34 PNGs

**Sub-type-targeted topic folders (16 folders, 188 PNGs):**
- `12min_advanced_topics/` (11), `12min_analogies/` (13), `12min_assumptions_and_conclusions_1/` (9), `12min_assumptions_and_conclusions_2/` (12), `12min_averages/` (10), `12min_general_arithmetic/` (10), `12min_lowest_value/` (12), `12min_number_series/` (12), `12min_numerical_summary/` (15), `12min_percentages/` (12), `12min_ratios/` (11), `12min_seating_arrangement/` (15), `12min_sentence_completion_1/` (8), `12min_sentence_completion_2/` (20), `12min_speed_distance/` (11), `12min_workrate/` (7).

**Totals: 397 PNGs across 22 folders.**

Filename convention: `q01.png`, `q02.png`, … with gaps in some folders (e.g., `12min_workrate/` has q01, q03, q04, q06, q08, q09 — 7 files spanning q01..q09 with three gaps). Gaps are deliberate (the source pages have items numbered non-sequentially); they're not extraction failures.

**Notable absence: `gauntlet_ccat_practice_1/` is no longer in `data/testbank/`.** The predecessor plan referenced this folder for the no-answer-visible solve+verify branch. Its 32 PNGs are gone. The stale stage-1 JSONs for that folder still exist under `scripts/_stage1/gauntlet_ccat_practice_1/` — see §2(e).

**Also notable: no antonyms-specific topic folder exists.** `verbal.antonyms` items will only land via the six `12min_prep_practice_{1..6}` mixed folders' antonym entries. Worth flagging in the diagnostic-mix re-balance audit (§2(f)) — antonyms' empirical ratio is constrained by what the practice tests carry.

**DEPARTURE 1 verification.** Sample-spot-check confirms: per the user's brief, all six `12min_prep_practice_{1..6}/` folders carry answers visible in every screenshot (the predecessor pipeline's answer-not-visible branch is unreachable for this round's input set). Sub-type-targeted topic folders likewise carry answers visible. The pipeline can run with all-answer-visible assumption; solve+verify is unused.

**DEPARTURE 2 surface.** The 16 `12min_<topic>` folders' content is text-heavy by topic naming (analogies, sentence_completion, etc.). The six `12min_prep_practice_{1..6}/` folders are likely to contain a small number of chart-bearing items per practice test (CCAT canonically includes a handful of "look at the chart and answer" items per full test). Audit-time estimate: 5-15 chart-bearing items across the full 397-PNG set; spot-check at first stage-1 run will produce an empirical count.

### 2(b) Pipeline scope

Three scripts in `scripts/`:

- **`scripts/import-questions.ts`** (stage 1) — extract via Sonnet vision, branch on `answerVisible` for solve+verify or trust-screenshot, emit one stage-1 JSON file per successful image to `scripts/_stage1/<source-dir-name>/<original-filename>.json`. Idempotency keyed on stage-1 JSON file presence.
- **`scripts/generate-explanations.ts`** (stage 2) — read stage-1 JSON, run explain pass via Sonnet text-only, POST to `http://localhost:3000/api/admin/ingest-item`. Idempotency keyed on source-image hash via `scripts/_logs/imported.jsonl`.
- **`scripts/regenerate-explanations.ts`** (stage 3) — re-run explain against existing items in DB, UPDATE `items.explanation` + `items.metadata_json.structuredExplanation`. Not used in this round; preserved for future explain-prompt iteration without re-extraction.

**Code edits required for this round** (driven by DEPARTURE 1, 2, 3):

1. **DEPARTURE 1 (deprecate solve+verify):** No active code removal. The solve+verify branch in `scripts/import-questions.ts` and `scripts/_lib/solve-verify.ts` is preserved as a defensive fallback; this round's input set never triggers it (all screenshots have answers visible). A future round can excise the dead code if the no-answer-visible source class is gone permanently — out of scope here.

2. **DEPARTURE 2 (chart-description in explanation):** Stage 2 (`scripts/generate-explanations.ts`) is edited to pass the source PNG to the explain LLM call alongside the text content. The explain prompt (in `scripts/_lib/explain.ts`'s `writeStructuredExplanation` builder) is updated to instruct: "if the screenshot contains a chart, describe the chart's data in the recognition step, then proceed with the elimination + tie-breaker steps as normal." The structured-explanation contract is unchanged (parts stay `recognition` → `elimination` → optional `tie-breaker`); the recognition part absorbs the chart description naturally. The `items.body` field stays text-only (`{kind: 'text', text}`); the chart's data informs the explanation but doesn't render visually.

   *Architectural alternative considered: extract pass captures a `chartDescription?` field that stage 2 reads from stage-1 JSON. Rejected because (a) it requires extract-prompt + stage-1-schema changes; (b) the explain LLM is already vision-capable (Sonnet 4.6) and can process the PNG directly; (c) per-item judgment ("is this chart relevant to the explanation?") fits more naturally in the explain pass than in the extract pass. The trade-off is one extra ~100KB image per stage-2 LLM call (50% of items × ~5 chart-bearing items adds ~5MB cumulative); negligible cost at testbank scale.*

3. **DEPARTURE 3 (source-provenance capture):** Stage 1 emits `sourceFolder` (basename of containing directory) + `sourceFilename` (basename of PNG) into the stage-1 JSON. Stage 2 passes both through to the ingest POST. Per §2(c) (Q1 redline-resolved 2026-05-06), provenance lands in **two new columns** on the `items` table — `source_folder` and `source_filename`, both nullable `varchar`. The legacy `metadata_json.importSource` key continues to be populated by stage 2 for backward compatibility with the existing 50 seed items (which have no provenance) and for the historical-readability of `metadata_json` as a self-contained record; new items populate **both** the columns AND `metadata_json.importSource` (=`sourceFolder`). A future cleanup round can drop the `importSource` key once all items have columns populated, but that's out of scope here.

**Idempotency at SHA-256-of-source-image keying — preserved.** The data-wipe round zeroed the items table, so this round's stage-2 inserts are all fresh. The `imported.jsonl` log accumulates across runs; the data-wipe round did NOT delete it (snapshot retention preserves stale log entries pointing at items that no longer exist in the DB). For this round, stage 2 should run with a clean `imported.jsonl` to avoid the stale-log-skips-fresh-insert hazard. **Recommendation: archive `scripts/_logs/imported.jsonl` to `scripts/_logs/imported.jsonl.bak.${date}` before stage 2 runs; create a fresh empty `imported.jsonl`.** This matches the §2(e) stage-1 archival discipline.

### 2(c) Schema for source provenance per DEPARTURE 3

> **Q1 redline-resolved 2026-05-06: column addition wins over metadata_json.** The plan-write recommendation was to extend `metadata_json` with `sourceFolder` + `sourceFilename` keys. Redline overrode on three counts: (a) the future admin-portal round (roadmap #2) will likely want "show items from {folder}" as a filter — column queries are faster + more durable than jsonb path queries; (b) the "future-lift if needed" argument cuts both ways — adding columns later requires a backfill migration from JSON, while adding columns now means data is queryable from day one; (c) cost is one small migration commit; benefit is queryability for the lifetime of the data. The minority case for metadata_json (debugging-only / ratchet-default-to-JSON) was undercut by the admin-portal forward dependency.

**Decision: add `source_folder` + `source_filename` columns to the `items` table via Drizzle migration.** Both nullable `varchar` (the existing 50 seed items have no provenance; columns must accept NULL for those rows). The `metadata_json.importSource` key continues to be populated by stage 2 for backward-compatibility with the 50 existing items and as a self-contained record on each row; new items populate both columns AND the metadata_json key. A future cleanup round can drop `importSource` from `metadata_json` once all items have columns populated.

**Schema shape (commit 2 — schema-migration commit, see §9 for cluster):**

```ts
// src/db/schemas/catalog/items.ts — additive columns
sourceFolder: varchar("source_folder", { length: 128 }),  // nullable
sourceFilename: varchar("source_filename", { length: 256 }),  // nullable
```

Two indexes considered for forward-compat with admin-portal filter queries:

- `items_source_folder_idx` on `source_folder` — supports `WHERE source_folder = $1` filter shape used by the projected admin filter.
- `items_source_folder_filename_idx` on `(source_folder, source_filename)` — supports rare "show me item X from folder Y" exact-match lookup.

**Recommendation: add `items_source_folder_idx` only.** The combined index has sub-second selectivity at v1 bank size (~400 rows) but adds index-write cost on every insert. Folder-only is a clear forward-compat hedge for the admin filter; folder+filename can be added in the future round that surfaces the exact-match lookup need.

**Ingest-schema extension (commit 3 — pipeline-modifications commit, see §9):**

```ts
// src/server/items/ingest.ts — extend the Zod schema + the ingest insert
const ingestInput = z.object({
  // ... existing fields ...
  sourceFolder: z.string().min(1).max(128).optional(),
  sourceFilename: z.string().min(1).max(256).optional(),
  metadata: ingestMetadata.optional()  // ingestMetadata.importSource also still set, see DEPARTURE 3
})

interface IngestRealItemInput {
  // ... existing fields ...
  sourceFolder?: string
  sourceFilename?: string
  metadata?: { ... }
}

// Insert writes both the columns and metadata_json.importSource:
.values({
  // ... existing values ...
  sourceFolder: data.sourceFolder,
  sourceFilename: data.sourceFilename,
  metadataJson  // includes importSource
})
```

The 50 existing seed items don't have provenance metadata (they came from `src/db/seeds/items/data/`, not from screenshots). The columns are nullable; the existing 50 items keep `source_folder = NULL`, `source_filename = NULL`. New ingests from this round populate both columns + the metadata_json key.

**Migration discipline.** Per the prior `db:migrate` discipline (Drizzle generates SQL via `bun db:generate`; operator inspects the generated SQL; `bun db:migrate` applies). The migration's blast radius is two `ALTER TABLE items ADD COLUMN` statements + one `CREATE INDEX` — additive, nullable, low-risk. Rollback path: `ALTER TABLE items DROP COLUMN source_folder; ALTER TABLE items DROP COLUMN source_filename;` — clean revert if needed before any new ingests have populated rows.

### 2(d) Tagger surface

`src/server/items/tagger.ts` was updated by the taxonomy round's commit 1 to handle all 14 sub-types. Audit confirms:

- The `subTypeIds` import is the canonical 14-entry list (verified — matches `src/config/sub-types.ts`).
- The system prompt enumerates all 14 sub-types with a per-sub-type one-liner example, including the three new ones (`workrate`, `speed_distance_time`, `lowest_values`).
- The disambiguation rules section covers all numerical sub-types with explicit pattern markers ("%" → percentages, "a/b notation" → fractions, "average/mean" → averages, "a:b ratio" → ratios, "combined-work" → workrate, "speed/distance/time" → speed_distance_time, "compare set, pick smallest/largest" → lowest_values).
- The `FALLBACK` constant (`verbal.antonyms`, `medium`, `confidence: 0`) is unchanged; FALLBACK fires only on Anthropic-call failure, JSON-parse failure, or schema-validation failure. With confidence: 0, it's flagged for manual review at the ingest log level.

**No tagger code edits required for this round.**

**Tagger correctness spot-check during the round.** The 16 `12min_<topic>` folders provide ground-truth sub-type-by-folder mapping (modulo `12min_advanced_topics` and `12min_numerical_summary`, both of which are unclear from naming and may be mixed-content). Expected mapping from folder name:

| Folder | Expected sub-type |
|---|---|
| `12min_analogies` | `verbal.analogies` |
| `12min_assumptions_and_conclusions_{1,2}` | `verbal.critical_reasoning` |
| `12min_averages` | `numerical.averages` |
| `12min_general_arithmetic` | `numerical.word_problems` (default for prose arithmetic) |
| `12min_lowest_value` | `numerical.lowest_values` |
| `12min_number_series` | `numerical.number_series` |
| `12min_percentages` | `numerical.percentages` |
| `12min_ratios` | `numerical.ratios` |
| `12min_seating_arrangement` | `verbal.critical_reasoning` |
| `12min_sentence_completion_{1,2}` | `verbal.sentence_completion` |
| `12min_speed_distance` | `numerical.speed_distance_time` |
| `12min_workrate` | `numerical.workrate` |
| `12min_advanced_topics` | UNCLEAR — empirical observation needed |
| `12min_numerical_summary` | UNCLEAR — empirical observation needed |

Post-stage-1 verification scenario: for each clearly-mapped folder, ≥80% of stage-1 JSONs should classify into the expected sub-type. If a folder lands <50% in the expected sub-type, the tagger has a misclassification cluster worth investigating before stage 2 runs (correcting at the stage-1-JSON level is cheaper than re-extracting). The 80% threshold accounts for legitimate within-folder variance (some `12min_general_arithmetic` items might use percent-symbols, legitimately classifying as `percentages`).

### 2(e) Stage-1 JSON disposition

`scripts/_stage1/` has 99 stale JSON files across 3 sub-directories: `12min_prep_practice_1/`, `12min_prep_practice_2/`, `gauntlet_ccat_practice_1/`. All tagged under the old 11-sub-type taxonomy by the predecessor pipeline; all reference image hashes that may not match the current screenshots (the `12min_prep_practice_{1,2}/` source folders were modified 2026-05-05/2026-05-06, suggesting screenshot replacement; `gauntlet_ccat_practice_1/` is no longer in `data/testbank/`).

**Decision: archive to `scripts/_stage1_old_2026-05-06/` before re-extraction starts.**

Three options weighed:

- **(A) Archive.** Move `scripts/_stage1/*` to `scripts/_stage1_old_2026-05-06/`. Preserves audit trail; allows cross-reference of "old taxonomy classification vs new taxonomy classification" if a tagger-correctness investigation surfaces during the round. Low cost (99 small JSON files).
- **(B) Overwrite in place.** Re-extracting `12min_prep_practice_1/` writes to `scripts/_stage1/12min_prep_practice_1/`. The newly-extracted JSONs would reference fresh image hashes; orphaned old-hash JSONs from removed source files (e.g., a screenshot deleted between the two screenshot-set drops) would persist. The orphaned-old-hash JSONs would then stage-2 into ingest, producing items that reference no on-disk source. Hazard.
- **(C) Delete and rebuild fresh.** Clean state; loses the historical reference.

(A) wins on audit-trail preservation. The `scripts/_stage1/` directory is gitignored (`.gitignore` line `scripts/_stage1/`); the archived directory falls under the same gitignore pattern via prefix match if we name it `scripts/_stage1_old_2026-05-06` (gitignore rule is `scripts/_stage1/`, which only matches the exact dir name; the archive needs an explicit gitignore entry or sibling-dir naming). **Verify gitignore semantics at commit-1 time and add a one-line gitignore entry if needed.**

The `scripts/_logs/imported.jsonl` archival (§2(b) above) follows the same shape: archive to `scripts/_logs/imported.jsonl.bak.2026-05-06` before stage 2 runs.

### 2(f) Diagnostic-mix re-balance plan-time framing

`src/config/diagnostic-mix.ts` carries 46 entries with explicit `PROVISIONAL` marker; PRD §4.1 carries the parallel `PROVISIONAL` marker. The data-wipe round's commit 2 derivation fix (`647a609`) made `targetQuestionCountFor` track `diagnosticMix.length`, so the re-balance to 50 propagates cleanly without code changes outside the mix file itself.

**Empirical anchor from this round's per-sub-type ingest counts.** The 50-entry allocation should be proportional to the ratios that the testbank's mixed `12min_prep_practice_{1..6}/` folders carry — those are full practice-test simulations, so their per-sub-type distribution is the closest proxy to "how often each sub-type appears in real CCAT tests." The 16 `12min_<topic>/` folders are not used as the empirical anchor for the diagnostic-mix because they're sub-type-targeted (loading them into the empirical-ratio computation would skew toward whatever the operator chose to make a topic folder for); they're useful for tagger spot-checking and for filling the per-sub-type item bank, not for ratio derivation.

**Decision on per-sub-type allocation algorithm: clamped proportional, with the clamp set at 3 entries minimum per sub-type (Q4 redline-resolved 2026-05-06 — was 2 in the plan-write draft).** Three options weighed:

- **(α) Pure proportional.** Allocate 50 entries proportionally to the empirical per-sub-type ratios from the six `12min_prep_practice_{1..6}/` folders. If a sub-type's empirical ratio rounds to 0, it gets 0 entries.
- **(β) Clamped proportional, minimum 1 per sub-type.** Reserve 14 entries; allocate the remaining 36 proportionally.
- **(γ) Clamped proportional, minimum 3 per sub-type — REDLINE CHOICE.** Reserve **42 entries (3 per sub-type × 14)**; allocate the remaining **8** proportionally to the most-prevalent sub-types in the empirical ratios.

(γ) wins on mastery-computation-reliability grounds, per SPEC §9.3. Mastery state stays at `'unknown'` for sub-types with fewer than 3 attempts in the diagnostic — 2 attempts doesn't reach the floor. The diagnostic's whole product purpose (per PRD §4.1) is calibrating mastery state for the user's first session; per-sub-type unreliability would produce a Mastery Map with `unknown` cells, which is the failure mode the diagnostic exists to prevent.

**Tradeoff explicit:** the 3-floor gives mastery-computation more reliable per-sub-type signal at the cost of less proportional differentiation. The 8 proportional entries leave room only for the empirically-frequent sub-types (typically `verbal.antonyms`, `verbal.analogies`, `numerical.word_problems`, `numerical.fractions`, `numerical.percentages` — which add up to 5-7 of the 8). The empirical anchor itself is small-N (six prep tests = ~209 items), so high-confidence proportional differentiation is overstated as a payoff anyway. Mastery-state reliability is the higher-leverage outcome for v1 dogfood.

Within each sub-type, the 3-entry minimum supports easy + medium + hard distribution (no brutal in diagnostic per existing convention). Sub-types with proportional-allocation top-ups (4+ entries) scale up the medium count first, then add a second hard. The re-balanced mix is computed as a separate commit (commit 5 in the redline 6-commit cluster — see §9) after stage-2 ingest completes and the per-sub-type counts are known empirically.

## 3. Stage-1 archival + log archival (commit 1's operational housekeeping)

### What's missing / what should exist

`scripts/_stage1/` and `scripts/_logs/imported.jsonl` carry stale state from the predecessor pipeline. The new pipeline's idempotency depends on these being either fresh or empty.

### Implementation seam

```bash
mv scripts/_stage1 scripts/_stage1_old_2026-05-06
mkdir -p scripts/_stage1
mv scripts/_logs/imported.jsonl scripts/_logs/imported.jsonl.bak.2026-05-06  # only if file exists
```

### Files touched

- `scripts/_stage1/` (renamed) + `scripts/_stage1/` (recreated empty).
- `scripts/_logs/imported.jsonl` (archived if present).
- `.gitignore` — verify both `scripts/_stage1/` (existing) and the archive paths (`scripts/_stage1_old_*`, `scripts/_logs/imported.jsonl.bak.*`) match gitignore rules; add a one-line entry per archive shape if needed.

### Schema / state changes

None.

### Verification scenarios

1. `ls scripts/_stage1/` returns empty.
2. `ls scripts/_stage1_old_2026-05-06/` returns 3 sub-directories (12min_prep_practice_1, 12min_prep_practice_2, gauntlet_ccat_practice_1) with the original 99 JSON files.
3. `git status` shows the archive paths are gitignored (no diff lines for archived files).
4. The plan doc + this commit's other deliverables stage cleanly.
5. **Q3 caveat captured in commit 1's body:** stale archived `imported.jsonl` entries describe items no longer in DB (the data-wipe round zeroed `items`); future-Claude reading `scripts/_logs/imported.jsonl_old_2026-05-06` sees the historical record but should NOT treat it as source-of-truth for what's currently in the bank. The same caveat lands in the round-close summary at commit 6.

## 4. Schema migration: add `source_folder` + `source_filename` columns (commit 2)

> **Inserted per Q1 redline 2026-05-06.** The plan-write recommendation was to extend `metadata_json`; the redline overrode in favor of column addition (rationale per §2(c)). This section is the new commit 2 in the 6-commit cluster (§9); the prior plan-write commit numbering bumps by one from commit 2 onward.

### What's missing / what should exist

The `items` table needs two nullable columns to record source-folder + source-filename provenance per DEPARTURE 3. Both columns are additive and nullable so the existing 50 seed items (which have no provenance) can stay at NULL without backfill.

### Implementation seam

1. Edit `src/db/schemas/catalog/items.ts` to add the two columns and one index:

```ts
sourceFolder: varchar("source_folder", { length: 128 }),
sourceFilename: varchar("source_filename", { length: 256 }),
// ... existing indexes ...
index("items_source_folder_idx").on(table.sourceFolder)
```

2. Run `bun db:generate` to produce the Drizzle migration SQL. Expected shape: two `ALTER TABLE items ADD COLUMN` statements + one `CREATE INDEX`.

3. Inspect the generated SQL in `drizzle/000N_*.sql` (the file number depends on prior migration count) to confirm the additive shape and zero data-loss risk.

4. Run `bun db:migrate` against the dev DB. Verify post-migration: `\d items` shows the two new columns; `SELECT count(*) FROM items WHERE source_folder IS NULL` returns 50 (all existing seed items at NULL); `SELECT count(*) FROM items WHERE source_filename IS NULL` returns 50.

### Files touched

- `src/db/schemas/catalog/items.ts` — additive column + index declarations.
- `drizzle/000N_*.sql` — generated migration file (committed alongside the schema-source change).
- `drizzle/meta/_journal.json` + `drizzle/meta/000N_snapshot.json` — Drizzle's migration metadata, auto-updated by `bun db:generate`.

### Schema / state changes

`items` table gains:
- `source_folder` `varchar(128)` nullable
- `source_filename` `varchar(256)` nullable
- `items_source_folder_idx` index on `source_folder`

All 50 existing rows have NULL for both columns post-migration. No row-state writes in this commit; commit 3's pipeline modifications + commit 4's re-extraction populate the columns for new rows.

### Verification scenarios

1. `bun db:generate` produces a migration file; the generated SQL is reviewed and matches the additive-only pattern.
2. `bun db:migrate` runs cleanly against the dev DB.
3. Post-migration row inspection: `SELECT id, source_folder, source_filename FROM items LIMIT 5` returns 5 rows with both new columns at NULL.
4. `SELECT indexname FROM pg_indexes WHERE tablename = 'items'` returns the new `items_source_folder_idx` alongside the existing indexes.
5. `bun lint` clean; `bun typecheck` clean (the schema change ripples cleanly — `IngestRealItemInput`'s `sourceFolder` + `sourceFilename` fields are commit 3's territory; commit 2's typecheck just verifies the schema source compiles).
6. `bun test` 37/37 holds (none of the test surface reads from the new columns yet).
7. **Live-DB audit per SPEC §6.14.21:** the migration's empirical effect (50 rows with NULL provenance) is recorded in commit 2's body as primary-source verification.

## 5. Pipeline modifications (commit 3)

### What's missing / what should exist

Code edits driving this round's pipeline shape change. The schema migration in commit 2 adds the columns; commit 3 wires the application code to write to them.

1. **`scripts/_lib/explain.ts`** — `writeStructuredExplanation` builder accepts an optional `imagePath?: string` parameter. When set, stage 2 reads the PNG bytes via `Bun.file(imagePath).arrayBuffer()`, base64-encodes, and includes it as an `image` content block in the Anthropic message alongside the text content block. The explain prompt is updated with one new clause: *"If the screenshot contains a chart, graph, or other visual data the question relies on, describe that data quantitatively in the recognition step (e.g., 'The bar chart shows quarterly revenue: Q1 $40k, Q2 $55k, Q3 $50k, Q4 $65k.'), then proceed with the elimination + tie-breaker steps as normal. The structured-explanation contract is unchanged — parts stay [recognition, elimination, optional tie-breaker]."*

   **Q6 redline-resolved 2026-05-06: vision-model verified.** All four pipeline models in `scripts/_lib/anthropic.ts:58-61` are pinned to `claude-sonnet-4-6` (EXTRACT_MODEL, SOLVE_MODEL, VERIFY_MODEL, EXPLAIN_MODEL). Sonnet 4.6 is vision-capable (already used by the EXTRACT pass for vision input on screenshots). No model migration is needed for the chart-description capability; the existing EXPLAIN_MODEL accepts image content blocks unchanged.

   **Cost telemetry per Q6:** the `writeStructuredExplanation` function logs token usage per call (prompt input tokens, output tokens, image tokens). Stage 2 aggregates per-call tokens into a per-run summary. Commit 4's verification report (the end-to-end re-extraction commit) records: total stage-2 invocations, chart-bearing-call count (calls where `imagePath` was set), per-call mean input tokens for chart vs. text-only, total cost increment estimate from chart-bearing calls. The architecture-plan's "LLM spend runs away" mitigation discipline applies here.

2. **`scripts/generate-explanations.ts`** — stage 2 reads stage-1 JSON's `sourceImagePath`, passes that path to `writeStructuredExplanation`, and threads `sourceFolder` + `sourceFilename` through to the ingest POST. The new POST payload shape:

```ts
const ingestBody = {
  // ... existing fields (subTypeId, difficulty, body, options, correctAnswer, ...) ...
  sourceFolder,           // NEW — top-level field, writes to items.source_folder column
  sourceFilename,         // NEW — top-level field, writes to items.source_filename column
  metadata: {
    importSource: sourceFolder,  // Legacy alias preserved per §2(c) backward-compat
    structuredExplanation: explanationOutput,
    originalExplanation,         // preserved if stage-1 JSON has it
  }
}
```

3. **`scripts/_lib/extract.ts`** — extract prompt unchanged for this round. The `isTextOnly` check stays as-is (it filters items where any *option* is non-text, which is what we want; the chart-bearing question stems with text-only options remain `isTextOnly: true` and proceed through the pipeline).

4. **`scripts/import-questions.ts`** — stage 1 emits `sourceFolder` (extracted from `path.basename(path.dirname(sourceImagePath))`) + `sourceFilename` (`path.basename(sourceImagePath)`) into the stage-1 JSON.

5. **`src/server/items/ingest.ts`** — `ingestInput` Zod schema gains top-level `sourceFolder` + `sourceFilename` optional fields; `IngestRealItemInput` interface mirrors. The insert writes both the new columns AND `metadata_json.importSource` per §2(c).

6. **`src/app/api/admin/ingest-item/route.ts`** — `requestSchema` mirrors the `ingestInput` extension (the route is a thin wrapper over `ingestRealItem`).

### Implementation seam

Three edit clusters: (a) stage-1 capture (script change to emit fields into JSON) + (b) ingest schema extension (src/ change — Zod + interface + insert call) + (c) stage-2 explain-with-image + provenance pass-through (script change). Commit 2's migration must land before commit 3 ships (the insert can't write to columns that don't exist).

### Files touched

- `scripts/_lib/explain.ts` — add `imagePath?` parameter; update prompt; thread token-usage telemetry up to caller.
- `scripts/_lib/extract.ts` — no changes (verified during plan-write).
- `scripts/generate-explanations.ts` — pass image path through; thread provenance + metadata; aggregate per-call cost telemetry into per-run summary.
- `scripts/import-questions.ts` — emit `sourceFolder` + `sourceFilename` into stage-1 JSON.
- `src/server/items/ingest.ts` — extend `ingestInput` Zod schema with top-level provenance fields; write to columns + metadata_json.importSource.
- `src/app/api/admin/ingest-item/route.ts` — mirror the schema extension.

### Schema / state changes

None at the schema layer (commit 2 already added the columns). Application code in this commit writes to the new columns for new ingests; the 50 existing seed items remain at NULL.

### Verification scenarios

1. Stage-1 dry-run on a single chart-bearing screenshot from `12min_prep_practice_1/`: the produced stage-1 JSON has `sourceFolder: "12min_prep_practice_1"`, `sourceFilename: "qNN.png"`.
2. Stage-2 dry-run on the same stage-1 JSON: the explain LLM call's request payload includes both the text content and the base64-encoded PNG; the produced structured-explanation's `recognition` part references the chart's quantitative data (e.g., specific numbers from the chart).
3. Full-stack smoke against the dev server: POST to `/api/admin/ingest-item` with `sourceFolder` + `sourceFilename` populated; the inserted row's `source_folder` + `source_filename` columns query returns the populated values; `metadata_json->>'importSource'` also returns the same value (backward-compat).
4. **Vision-model + cost-telemetry verification (Q6).** A single stage-2 call against a chart-bearing screenshot logs: `EXPLAIN_MODEL=claude-sonnet-4-6`, `tokens_in_text`, `tokens_in_image`, `tokens_out`. Aggregate captured in commit 4's report.
5. `bun typecheck` clean against the schema extension.
6. `bun lint` clean.

## 6. End-to-end re-extraction run (commit 4)

### What's missing / what should exist

Run the pipeline against all 22 `data/testbank/` folders:

```bash
# Stage 1 — extract per folder (idempotent within a folder; rerun-safe)
for d in data/testbank/*/; do
  bun run scripts/import-questions.ts "$d"
done

# Stage 2 — explain + ingest (POSTs to running dev server; idempotent via imported.jsonl)
bun --bun next dev &  # in a separate terminal, or via process management
bun run scripts/generate-explanations.ts

# Embedding backfill — same pipeline as data-wipe round Q4
bun run scripts/backfill-missing-embeddings.ts
```

### Implementation seam

No new code. Operating procedure runs the existing stage 1 + stage 2 + backfill scripts.

The dev server must be running (stage 2 POSTs to `http://localhost:3000/api/admin/ingest-item`); the operator brings it up before stage 2 and tears it down after. `CRON_SECRET` env var must be set (the route's auth gate).

### Files touched

None directly. The end-to-end run produces:
- 22 sub-directories of stage-1 JSONs under `scripts/_stage1/`.
- ~350-380 rows in `items` (estimate: 397 PNGs × ~90% extraction success rate).
- ~350-380 entries in `scripts/_logs/imported.jsonl`.
- ~350-380 embeddings populated post-backfill.

### Schema / state changes

`items` row count: 50 → ~400. All new rows at `status='live'` per existing `ingestRealItem` semantics.

### Verification scenarios

1. **Per-sub-type item counts** captured as primary-source reference for commit 5's re-balance:

```sql
SELECT sub_type_id, count(*) FROM items WHERE source = 'real' GROUP BY sub_type_id ORDER BY sub_type_id;
```

Expected shape: all 14 sub-types have ≥1 row (the three new sub-types `workrate`, `speed_distance_time`, `lowest_values` each get ≥7-11 from their topic folders). Any sub-type at 0 is a §6.14.21-flavored audit signal — investigate before commit 5 (the re-balance step depends on per-sub-type counts being non-zero).

2. **Tagger correctness spot-check** per §2(d) expected mapping: for each clearly-mapped topic folder, ≥80% of items in the folder land in the expected sub-type. Query (against the new `source_folder` column):

```sql
SELECT
  source_folder,
  sub_type_id,
  count(*) AS n
FROM items
WHERE source_folder IS NOT NULL
GROUP BY source_folder, sub_type_id
ORDER BY source_folder, n DESC;
```

Folders excluded from the threshold check (no ground-truth expectation): `12min_advanced_topics`, `12min_numerical_summary` — observed empirically; reported as a data point in commit 4's body.

3. **Source-provenance spot-check:** every newly-inserted row has `source_folder` and `source_filename` columns populated; the values match an existing PNG path under `data/testbank/`. Existing 50 seed items still have NULL for both columns. `metadata_json->>'importSource'` mirrors `source_folder` for new items (backward-compat per §2(c)).

4. **Embeddings populated:** `SELECT count(*) FROM items WHERE embedding IS NULL` returns 0 post-backfill.

5. **Items at `status='live'`:** `SELECT count(*) FROM items WHERE status != 'live'` returns 0 (the existing `ingestRealItem` always inserts at `'live'` per data-wipe round Q5).

6. **`bun test` 37/37** holds — the test surface is dev-DB-aware but the tests use isolated test-users (`createTestUser` in `selection.test.ts`) and don't compare against fixed item counts post-ingest.

7. **Cost telemetry summary (Q6):** stage-2 run summary captures total stage-2 invocations, chart-bearing-call count, per-call mean input tokens for chart vs. text-only, total cost increment estimate from chart-bearing calls. Recorded in commit 4's body.

### Out-of-band live-DB audit per SPEC §6.14.21

This round inherits the live-DB audit discipline. Before commit 5 lands, run:

```bash
PGPASSWORD=postgres psql -h localhost -p 54320 -U postgres -d postgres -At -c "
SELECT 'items_total='||count(*) FROM items
UNION ALL SELECT 'items_per_subtype='||string_agg(sub_type_id||'='||c::text, ',' ORDER BY sub_type_id) FROM (SELECT sub_type_id, count(*) c FROM items GROUP BY sub_type_id) t
UNION ALL SELECT 'items_per_folder='||string_agg(f||'='||c::text, ',' ORDER BY f) FROM (SELECT source_folder AS f, count(*) c FROM items WHERE source_folder IS NOT NULL GROUP BY f) t
UNION ALL SELECT 'items_with_embedding='||count(*) FROM items WHERE embedding IS NOT NULL
UNION ALL SELECT 'items_null_embedding='||count(*) FROM items WHERE embedding IS NULL
UNION ALL SELECT 'items_with_provenance='||count(*) FROM items WHERE source_folder IS NOT NULL
UNION ALL SELECT 'items_null_provenance='||count(*) FROM items WHERE source_folder IS NULL
;"
```

The output is recorded in commit 4's commit body as primary-source verification.

## 7. Diagnostic-mix re-balance to 50 entries (commit 5)

### What's missing / what should exist

`src/config/diagnostic-mix.ts` carries 46 entries; the round closes with 50. The re-balance computation:

1. Read empirical per-sub-type counts from the six `12min_prep_practice_{1..6}/` folders post-stage-2 (NOT from the 16 topic folders — those are sub-type-targeted and would skew the ratio). Query against the new `source_folder` column:

```sql
SELECT sub_type_id, count(*) AS n
FROM items
WHERE source_folder LIKE '12min_prep_practice_%'
GROUP BY sub_type_id
ORDER BY n DESC;
```

2. Apply the §2(f) clamped-proportional algorithm with the **3-entry minimum floor (Q4 redline-resolved)**:
   - Reserve **42 entries (3 per sub-type × 14 sub-types)** — covers easy + medium + hard tiers per sub-type.
   - Allocate the remaining **8** proportionally to the empirical-from-prep-practice counts, rounded with largest-remainders to land exactly at 8 — only the 5-7 most-prevalent sub-types pick up extra entries (typically `verbal.antonyms`, `verbal.analogies`, `numerical.word_problems`, `numerical.fractions`, `numerical.percentages` plus 2-3 more depending on empirical distribution).
   - Within each sub-type's 3-entry floor, distribute across tiers: easy + medium + hard. Sub-types getting proportional top-ups (4+ entries) scale up the medium count first, then add a second hard.
   - The floor satisfies SPEC §9.3's mastery-computation per-sub-type-floor requirement: 3 attempts per sub-type clears the `'unknown'` mastery state on the user's first diagnostic.

3. Update `src/config/diagnostic-mix.ts` to the new 50-entry layout. Update the top comment block: remove the `PROVISIONAL` marker; remove the "synonyms cut, three new numerical sub-types absent" framing; replace with a brief "Empirical-ratio-derived allocation with 3-entry floor per docs/plans/phase5-testbank-re-extraction.md commit 5 (round-shipped <date>)".

4. Update `src/config/diagnostic-mix.test.ts:53-56`'s pinned-length assertion from `46` to `50`.

5. Verify `bun test` produces 37/37 (the `noReServeInSession` test parameterized on `diagnosticMix.length` per data-wipe round commit 2 tracks automatically).

### Implementation seam

One edit to `src/config/diagnostic-mix.ts` (the 50-entry array + comment-block rewrite). One edit to `src/config/diagnostic-mix.test.ts` (single integer change). No `start.ts` edit (the derivation tracks via data-wipe round commit 2). No selection-engine edit.

### Files touched

- `src/config/diagnostic-mix.ts`
- `src/config/diagnostic-mix.test.ts`

### Schema / state changes

None. `practice_sessions.target_question_count` for new diagnostic sessions inserted post-commit-4 carries 50 (was 46); existing sessions with target=46 are wiped at this point per the round's no-extra-row-state convention (§9 below).

### Verification scenarios

1. `bun test src/config/diagnostic-mix.test.ts` — 5/5 pass (the length assertion now anchors on 50).
2. `bun test` — 37/37 (full suite).
3. Spot-check: `practice_sessions.target_question_count` for a fresh diagnostic session inserted post-fix equals 50. (Mirrors the data-wipe round commit 2 spot-check shape.)
4. The 50-entry allocation is reviewed for sanity: each sub-type has at least 3 entries (Q4 floor), the empirical-frequent sub-types (per-prep-practice counts) get more, the empirical-rare sub-types stay at the 3-floor.
5. **Mastery-state reachability spot-check (Q4 motivation):** simulate a fresh diagnostic completion against the updated mix; verify mastery-state for every sub-type clears the `'unknown'` floor (SPEC §9.3's >= 3 attempts requirement). If any sub-type stays at `'unknown'` after a full diagnostic, the floor is incorrectly computed — investigate before shipping.

## 8. PRD + SPEC reconciliation (commit 6)

### What's missing / what should exist

PRD §3.1 currently describes the OCR pipeline as four-pass (extract / solve / verify / explain). DEPARTURE 1 makes it two-pass for this round's input set. PRD §4.1 carries the `PROVISIONAL` marker on the 46-entry mix; commit 5 lands the 50-entry resolution. SPEC §3.3 (items table) needs the new `source_folder` + `source_filename` columns documented and the `metadata_json` keys enumerated.

Edits:

- **PRD §3.1.** Update the OCR-pipeline description: "two-pass (extract / explain) for screenshots with answers visible; the solve+verify branch is preserved as a defensive fallback for source classes where answers are not visible." Strike "four-pass" framing where it appears.
- **PRD §4.1.** Strike the `PROVISIONAL` marker. Update the entry count from 46 to 50. Reference the empirical-ratio derivation: "the allocation is empirically anchored on per-sub-type counts from the six `12min_prep_practice_{1..6}/` source folders, with a 3-entry minimum per sub-type to satisfy mastery-computation's per-sub-type floor (SPEC §9.3)."
- **SPEC §3.3** (items table). Add the two new columns to the items-table column listing (`source_folder varchar(128) nullable`, `source_filename varchar(256) nullable`); add the `items_source_folder_idx` index. Add a line under the column descriptions noting `metadata_json` keys: `originalExplanation` (from screenshot's verbatim explanation if present), `importSource` (legacy alias for the `source_folder` column — backward-compat for the 50 pre-round seed items + new items also write through; future cleanup round drops this), `structuredExplanation` (the structured-explanation contract object).
- **SPEC §6.14.21.** Cross-reference is added pointing at this round's commit-4 audit verification (the live-DB row-state audit was carried out per the convention).
- **Round-close summary in this plan doc** (per Q3 redline-tightening): include the explicit caveat that archived `imported.jsonl_old_2026-05-06` and `_stage1_old_2026-05-06/` describe items no longer in the DB; future-Claude reading these files sees a historical record but should NOT treat it as source-of-truth for what's currently in the bank.

### Implementation seam

Doc-only commit. No code, no schema, no migration.

### Files touched

- `docs/PRD.md`
- `docs/SPEC.md`
- `docs/plans/phase5-testbank-re-extraction.md` (this plan — status flip to "shipped <date>" with commit hashes; round-close summary).

### Schema / state changes

None.

### Verification scenarios

1. Closed-plans-immutable check: `git diff HEAD -- docs/plans/phase5-{post-session-review,v1-code-cleanup,taxonomy-restructure,data-wipe}.md docs/plans/phase3-*.md docs/plans/phase-3-*.md docs/plans/focus-shell-post-overhaul-fixes.md docs/plans/opaque-option-ids-and-pipeline-split.md docs/plans/ocr-import-screenshots.md` returns zero lines.
2. The `PROVISIONAL` marker grep (`grep -i provisional docs/PRD.md docs/SPEC.md src/config/diagnostic-mix.ts`) returns no diagnostic-mix-related matches post-commit.
3. `bun lint` clean (markdown-lint posture matches prior plan close-out commits).
4. `bun typecheck` clean (untouched by doc edits).

## 9. SPEC §6.14.NN candidate (if applicable, commit 6)

This round inherits §6.14.21 (live-DB-state audit) cleanly — the round-open audit ran the live-DB row-count + per-folder-distribution query and recorded the empirical state pre-commit-4 ingestion + post-commit-4 ingestion. That's the convention applied successfully, not a new instance of a new pattern.

**No new §6.14 entry is anticipated at plan-time.** If commit 4's empirical run surfaces a previously-uncaptured generalizable pattern (e.g., the chart-description-via-explain-pass-LLM-vision-input architectural choice as a meta-convention for "use the most-capable-model's vision capability rather than introducing an intermediate JSON field"), capture as a candidate for redline. Otherwise, the round closes without a new §6.14 entry.

## 10. Sequencing and commits

**Six commits (redline-expanded from the plan-write 5 to absorb Q1's schema-migration commit per the migration-discipline split):**

1. **Commit 1 — `docs+chore: open phase5-testbank-re-extraction round; archive stale stage-1 + imported.jsonl`.** Plan ships. Stage-1 archival to `scripts/_stage1_old_2026-05-06/`. `scripts/_logs/imported.jsonl` archival to `imported.jsonl_old_2026-05-06`. Gitignore adjustments if needed. Q3 caveat about archived-but-stale entries captured in commit body.

2. **Commit 2 — `feat(schema): add source_folder + source_filename columns to items via Drizzle migration`.** Per §4. `src/db/schemas/catalog/items.ts` gains two nullable varchar columns + `items_source_folder_idx`. `bun db:generate` produces the migration; `bun db:migrate` applies it. Verification: post-migration row inspection, all 50 existing rows at NULL for both new columns. Live-DB audit per §6.14.21 records the empirical state.

3. **Commit 3 — `feat(scripts+ingest): pass screenshot to explain pass + capture source-provenance in items columns`.** All edits per §5: `scripts/_lib/explain.ts` (image-input parameter + chart-description prompt clause + token-usage telemetry), `scripts/generate-explanations.ts` (image pass-through + provenance + cost-summary), `scripts/import-questions.ts` (sourceFolder + sourceFilename emission), `src/server/items/ingest.ts` (top-level provenance fields in Zod + insert call writes to columns AND metadata_json.importSource), `src/app/api/admin/ingest-item/route.ts` (route schema mirror). Verification: stage-1 + stage-2 dry-run on a single chart-bearing screenshot; ingest schema accepts the new fields; columns populated via INSERT; bun lint + typecheck clean.

4. **Commit 4 — `chore(testbank): re-extract data/testbank/ under 14-subtype taxonomy; verify per-sub-type counts`.** End-to-end run + verification recorded in commit body. Empirical per-sub-type counts captured as primary-source reference for commit 5. Tagger correctness spot-check passes (≥80% per 12 of 16 clearly-mapped topic folders; 2 unclear folders observed empirically). Source-provenance column population verified for all new items. Embeddings 100% populated. Cost-telemetry summary (Q6) recorded. `bun test` 37/37.

5. **Commit 5 — `feat(diagnostic-mix): rebalance to 50 entries based on empirical CCAT-prep ratios with 3-entry per-sub-type floor`.** `src/config/diagnostic-mix.ts` 46 → 50. Test pinned-length assertion 46 → 50. `targetQuestionCountFor` tracks via data-wipe-round-commit-2's derivation (no edit needed). 14×3=42 reserved + 8 proportional per Q4. Mastery-state reachability spot-check confirms no sub-type stays at `'unknown'` post a full diagnostic. `bun test` 37/37.

6. **Commit 6 — `docs(plan+prd+spec): close phase5-testbank-re-extraction round; reconcile PRD §3.1 + §4.1 + SPEC §3.3 metadata + columns`.** Plan status flip to "shipped <date>" with all 6 commit hashes; PRD/SPEC reconciliation per §8; round-close summary captures Q3 caveat about archived stale entries; closed-plans-immutable verified.

The 6-commit shape splits the schema-migration commit (commit 2) from the application-code-that-writes-to-it commit (commit 3) per Q1 redline. Migration-discipline rationale: migrations have their own verification protocol (`bun db:generate` + SQL inspection + `bun db:migrate` + post-migration row inspection); pipeline code edits have separate verification (lint, typecheck, dry-run on a single screenshot). Splitting also lets commit 2 be reverted independently if the migration shape needs adjustment without unwinding pipeline edits.

DEPARTURE 1's preserve-solve+verify-as-dead-code choice still removes a dead-code-removal commit. A future pipeline-cleanup round can excise solve+verify if the no-answer-visible source class is permanently gone.

## 11. Verification protocol carry-forward

Established discipline from prior sub-phases carries forward unchanged:

- `bun lint` clean (Biome + GritQL + super-lint) at every commit.
- `bun typecheck` clean.
- `bun test` 37/37 holds throughout (re-extraction is dev-DB-only; the test surface uses isolated test-users and doesn't compare against fixed item counts).
- DB row counts + per-sub-type + per-folder breakdowns recorded in commit 4's commit body as primary-source reference (per SPEC §6.14.21 — live DB audit, not assumed-from-config).
- Real-DB harness for verification of source-provenance keys + tagger correctness (per SPEC §6.14.12 — DB-state inspection).
- SPEC §6.14 conventions inherited:
  - **.15** (hermetic-smoke-with-per-run-isolation) — N/A, no smoke.
  - **.19** (type-error-as-audit-cascade) — applies to the commit-3 ingest schema extension; the cascade is small (top-level field addition + insert-call update + route mirror) so absorb-path applies.
  - **.20** (closed-plans-immutable) — applies; verified at commit 6.
  - **.21** (live-DB-state-audit) — applies; commits 2 and 4 each carry their own empirical-state recording (commit 2: post-migration with 50 NULL-provenance rows; commit 4: post-ingest with ~400 rows under new taxonomy).
- No regression in the four pure-function test files (per data-wipe round verification).

## 12. Out of scope

These are deliberately not addressed in this round:

- **Strategy authoring for `numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values`.** Independent round; can run in parallel with this one. Once ground-truth strategies are authored in `src/config/strategies.ts`, `bun db:seed` re-runs the seed (UPSERT semantics) — no testbank dependency.
- **Dropping `metadata_json.importSource` after columns are populated.** Q1 redline keeps `importSource` for backward-compat with the 50 pre-round seed items + new items also write through. A future cleanup round can drop the JSON key once all items have populated columns; not on this round's critical path.
- **Excising the solve+verify dead-code branch.** A future cleanup round can remove `scripts/_lib/solve-verify.ts` + the `--skip-solve` flag if the no-answer-visible source class is permanently gone. This round preserves the code as defensive fallback.
- **Production deploy.** Gated on Leo's no-deploy-until-feature-complete decision. Dev-only this round, same as taxonomy-restructure + data-wipe.
- **`targetQuestionCountFor` extension to `full_length` / `simulation` branches.** Deferred per data-wipe round Q1's diagnostic-only scope.
- **LLM-generation pipeline (Phase 4 deliverable).** Not started; this round populates the real-items bank that the future Phase 4 generator compares against for similarity-uniqueness.
- **Any taxonomy edits.** Closed in the taxonomy round; no edits permitted per closed-plans-immutable + the round's data-wipe-only scope.
- **Tagger code edits.** Audit confirms the tagger handles all 14 sub-types per the taxonomy round's commit-1 cascade. Spot-check at commit-3 verifies; if a misclassification cluster surfaces, the fix lands in a follow-up round, not as scope-creep here.
- **Embedding-pipeline edits.** `scripts/backfill-missing-embeddings.ts` is reused as-is from the data-wipe round Q4 pattern.
- **Stage 3 (`regenerate-explanations.ts`) re-runs.** Not used in this round; preserved for future explain-prompt iteration without re-extraction.
- **`data/testbank/` source-set additions.** This round runs against the 22 folders present on `main` at round-open. Future drops are routine re-runs with no plan-time dependency.

## 13. Open questions / resolutions

Seven questions surfaced at plan-write. **All seven resolved at redline 2026-05-06.** No remaining open questions at plan-greenlight.

### 13.1 Q1 — Source-provenance storage shape (DEPARTURE 3)

**Resolved at redline 2026-05-06: column addition wins over metadata_json.** Plan-write recommendation was metadata_json extension; redline overrode in favor of two new nullable varchar columns (`source_folder` + `source_filename`) plus an `items_source_folder_idx` index. Rationale per §2(c) (rewritten this round): (a) the future admin-portal round (roadmap #2) will likely want "show items from {folder}" as a filter, and column queries are faster + more durable than jsonb path queries; (b) the "future-lift if needed" argument cuts both ways — adding columns later requires backfilling from JSON, while adding columns now means data is queryable from day one; (c) cost is one small migration commit, benefit is queryability for the lifetime of the data. `metadata_json.importSource` is kept for backward-compat with the 50 pre-round seed items + new items also write through; a future cleanup round can drop the JSON key. **Schema migration adopts its own commit (commit 2) per migration-discipline split — see §10.**

### 13.2 Q2 — Stage-1 JSON disposition (§2(e))

**Resolved at redline 2026-05-06: archive to `scripts/_stage1_old_2026-05-06/` before re-extraction starts.** Plan-write recommendation accepted. Rationale: preserves audit trail; allows cross-reference of old-taxonomy classification vs new-taxonomy classification if a tagger-correctness investigation surfaces; low cost.

### 13.3 Q3 — `imported.jsonl` disposition

**Resolved at redline 2026-05-06: archive to `scripts/_logs/imported.jsonl_old_2026-05-06` and start fresh, with explicit caveat captured.** Plan-write recommendation accepted with one tightening: commit 1's body and the round-close summary in commit 6 must explicitly call out that archived stale entries describe items no longer in DB (data-wipe round zeroed the items table); future-Claude reading the archive sees a historical record but should NOT treat it as source-of-truth for what's currently in the bank. Rationale: the data-wipe round zeroed the items table but did NOT delete `imported.jsonl`; stale entries pointing at no-longer-existing items would cause stage 2 to skip fresh inserts under the existing source-image-hash idempotency. Archive shape mirrors §2(e).

### 13.4 Q4 — Diagnostic-mix per-sub-type allocation algorithm (§2(f))

**Resolved at redline 2026-05-06: clamped proportional, minimum 3 entries per sub-type (was 2 in plan-write draft).** Plan-write recommendation overridden in favor of a higher floor. Rationale per §2(f) (rewritten this round): SPEC §9.3's mastery-computation per-sub-type-floor requires >= 3 attempts; 2 attempts doesn't reach the floor; mastery state stays at `'unknown'` for sub-types with fewer than 3 entries in the diagnostic. The diagnostic's whole product purpose (per PRD §4.1) is calibrating mastery state on the user's first session; per-sub-type unreliability would produce a Mastery Map with `'unknown'` cells, defeating the diagnostic's purpose. Tradeoff: 3-floor gives mastery-computation more reliable per-sub-type signal at the cost of less proportional differentiation (only 8 entries free for proportional allocation, vs. 22 under the 2-floor draft). The empirical anchor itself is small-N (six prep tests), so high-confidence proportional differentiation is overstated as a payoff. **14 × 3 = 42 reserved + 8 proportional = 50 total.**

### 13.5 Q5 — Diagnostic-mix target count

**Resolved at redline 2026-05-06: 50 entries, matching PRD §4.1's 50-question-diagnostic contract.** Plan-write recommendation accepted. Rationale: PRD §4.1 explicitly states "50-question calibration test"; the `PROVISIONAL` 46 in the current mix is the data-wipe-round-Q1 deferral, not a permanent 46-question intent. The data-wipe-round-commit-2 derivation makes this propagate without code edit.

### 13.6 Q6 — Chart-description integration shape (DEPARTURE 2)

**Resolved at redline 2026-05-06: explain pass takes the source PNG as a vision-input alongside the text content; explain prompt instructs the LLM to describe chart data in the recognition step. Two implementation details captured per redline:**

- **Vision-model verification.** Verified at plan-write: all four pipeline models in `scripts/_lib/anthropic.ts:58-61` are pinned to `claude-sonnet-4-6` (EXTRACT/SOLVE/VERIFY/EXPLAIN). Sonnet 4.6 is vision-capable (already used by EXTRACT pass). No model migration needed; the existing EXPLAIN_MODEL accepts image content blocks unchanged.
- **Cost telemetry.** Per architecture-plan's "LLM spend runs away" mitigation discipline: `writeStructuredExplanation` logs token usage per call (input text tokens, image tokens, output tokens); stage 2 aggregates per-call tokens into a per-run summary; commit 4's verification report records total stage-2 invocations, chart-bearing-call count, per-call mean input tokens for chart vs. text-only, total cost increment estimate from chart-bearing calls.

Plan-write rationale per §5 stands: per-item judgment ("is this chart relevant to the explanation?") fits naturally in the explain pass; avoids an intermediate `chartDescription` field on stage-1 JSON. Trade-off is one extra ~100KB image per stage-2 LLM call; cost increment recorded in commit 4 per the telemetry discipline above.

### 13.7 Q7 — Tagger spot-check threshold (§2(d))

**Resolved at redline 2026-05-06: 80% threshold per clearly-mapped topic folder; 12 of 16 topic folders apply (the 2 unclear folders `12min_advanced_topics` + `12min_numerical_summary` are excluded from threshold check and observed empirically as a data point).** Plan-write recommendation accepted. Rationale: accommodates legitimate within-folder variance (e.g., a `12min_general_arithmetic` item using percent-symbols legitimately classifying as `numerical.percentages`); flags any folder dropping below 80% as an investigation candidate before commit 5 (diagnostic-mix re-balance) ships. The 2 unclear folders' classification distribution is reported in commit 4's body for forward-reference value.

## 14. Inputs from prior rounds carrying forward

- **From taxonomy-restructure round** (`1710a91`): the 14-sub-type canonical taxonomy in `src/config/sub-types.ts`; the `Partial<Record<SubTypeId, …>>` strategy-config shape with three sub-types unallocated; the diagnostic-mix at 46 entries with the deferred re-balance.
- **From data-wipe round** (`54775a9`): the dev DB at single-coherent-state (sub_types=14, strategies=33, items=50 at status='live' with 50/50 embeddings, preserved auth tables); the `targetQuestionCountFor` derivation from `diagnosticMix.length` (commit 2 / `647a609`); SPEC §6.14.21 (live-DB-state-audit pattern); the operational-script convention (`scripts/dev/wipe-practice-data.ts` shape).
- **From OCR-import-screenshots round** (predecessor pipeline): the three-stage script topology (`import-questions.ts` / `generate-explanations.ts` / `regenerate-explanations.ts`); the structured-explanation contract (`recognition` → `elimination` → optional `tie-breaker`); the SHA-256-of-source-image idempotency; `scripts/_logs/` log-file conventions; the per-sub-type style hints in the explain prompt; the script-ruleset-exemption convention (scripts/ files use console.log + native try/catch + inline ternaries).
- **From opaque-option-ids round** (`cb45ce6..cee3b74`): the 8-char Crockford-base32 option-id contract; the `assignOptionIds` helper; the stage-1-JSON-with-opaque-ids schema.
