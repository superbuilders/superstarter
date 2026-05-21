# Plan — Phase 4 similar-item generator (sub-phase a)

> **Status: shipped 2026-05-08.** Round closed at parent commit 9 (this commit) following the wholesale-replacement-with-quote-preservation pattern per §6.14.20. Round opened 2026-05-08 against `main` at HEAD `977cdbe` (post §6.14 promotion sub-round) and closed same-day after a multi-commit narrative including iteration cycle (commits 7 → iteration #1 → iteration #2), narrow-scope sub-round insertion (§6.14.34), CR-schema-fix recovery cycle, max_tokens-fix recovery cycle, and antonyms convergence cleanup. Final bank state: 1,711 generated candidates ready for sub-phase b validator. Cumulative LLM cost: ~$18 across all sub-round + recovery commits. Phase 5 v1 was closed end-to-end at round-open (diagnostic + post-session + click-to-highlight + dojo + full-length + dashboard + practice surfaces all shipped); testbank carries 439 live items across the 14-sub-type taxonomy. This is the first of five sub-phases under Phase 4 (LLM question generation, feature-roadmap #4 / Round D); sub-phases b/c/d/e (validator, scorer, deployer, admin generation page) follow.

This round delivers the **similar-item generator** — a single LLM call per source item that emits four siblings (one per difficulty tier) preserving the source's problem structure while varying surface details. Siblings land at `status='candidate'` per §3 (Phase 4 deliverable). The validator that gates promotion to `status='live'` is sub-phase b. This sub-phase produces the candidate inventory the validator round consumes.

The motivation is brutal-tier coverage, surfaced empirically below (§12).

## 1. Context — what's shipped, what's not, why now

**Shipped:**

- 14-sub-type taxonomy (5 verbal + 9 numerical) under `src/config/sub-types.ts`. Stable since the taxonomy-restructure round (`1710a91`, 2026-05-04).
- 439 live items in the testbank, all `source='real'`, all with embeddings, 389/439 carrying `metadata_json.structuredExplanation`. Surface-folder provenance via `source_folder` + `source_filename` columns (added in the testbank-re-extraction round commit 2 `bedbe4b`).
- Opaque-id pipeline-split: LLM emits options as text-only; server assigns 8-char Crockford base32 ids via `assignOptionIds` (`src/server/items/option-id.ts`). The Phase 4 generator inherits this seam for free per `docs/plans/opaque-option-ids-and-pipeline-split.md`.
- `ingestRealItem` (`src/server/items/ingest.ts`) is the canonical write seam: validates against `optionSchema` + `structuredExplanation` (with `assertReferencedOptionsExist`), inserts at `status='live'`, triggers `embeddingBackfillWorkflow` async.
- Canonical body schema at `src/server/items/body-schema.ts` (single text variant; discriminated union for forward-compat). Consumed by `ingestRealItem`. **The local copy at `src/config/item-templates.ts:4-9` is deferred-since-Phase-2 and gets consolidated this round.**
- Existing LLM patterns:
    - `src/server/items/tagger.ts` — Haiku-based sub-type/difficulty classifier; cost telemetry shape (model + tokens_in + tokens_out + cost_estimate_usd).
    - `scripts/_lib/explain.ts` — Sonnet 4.6 explain pass with tool-use; closest analog for the generator's LLM-call shape (`writeStructuredExplanation` + `EXPLAIN_TOOL` + `withBackoff` + cost-telemetry usage object).
    - `src/server/items/option-id.ts` — id assignment.
    - `src/server/generation/embeddings.ts` — `embedText` (OpenAI text-embedding-3-small @ 1536 dims).
- Vercel Workflow A.6 helper-extraction precedent: `src/workflows/embedding-backfill.ts` (workflow file, "use workflow"/"use step" markers only, NO `@/logger` imports) + `src/workflows/embedding-backfill-steps.ts` (step bodies, `@/logger` allowed). The generator workflow follows this exact shape.

**Not shipped (this round addresses subset):**

- Phase 4 generator. Not started.
- Phase 4 validator (cosine-similarity check, GPT-4o per-check confidences). Not started; the 0.92 cosine threshold referenced in PRD §3.2 + SPEC §1 + architecture_plan §2395 is described but not implemented.
- Phase 4 scorer / deployer / admin generation page. Not started.
- Provenance column on `items` linking siblings to source. The metadata_json shape at SPEC §3.3 reserves `templateId`, `templateVersion`, `generatorModel`, `validatorReport`, `qualityScore` as forward-compat keys; nothing today writes them.

**Why now:**

1. The empirical distribution (§12) shows brutal coverage is concentrated in 3 of 14 sub-types (4 brutal items total). The full-length-test surface (`fixed_curve` strategy from `src/config/difficulty-curves.ts`) needs brutal items to populate the deepest decile. Today the selector falls back through the recency tiers to medium/hard items, undermining the curve's intent.
2. Phase 5 v1 closed; the post-session + click-to-highlight surfaces consume `metadata_json.structuredExplanation` (389/439 items). Siblings produced this round must include structured explanations — otherwise click-to-highlight gracefully degrades, which is acceptable but unwanted at scale.
3. The sub-phase boundary in feature-roadmap §4 (Round D) is "generator + templates" first; validator second. Generator-only this round matches the architecture plan's Phase 4 sub-phase carve, lets us audit candidate quality before wiring the validator's cosine + per-check gates, and surfaces cost telemetry empirically so sub-phase b's kill-switch threshold is data-anchored.

## 2. Goal — sub-phase a's deliverable in one paragraph

For every current live item (n=439), produce four sibling items at difficulties `easy / medium / hard / brutal` (one sibling per tier per source) via a single Sonnet 4.6 tool-use call per source. Siblings preserve the source's problem structure and the relationship between distractors and the correct answer; they vary surface details (numbers, named entities, subjects). Siblings inherit the source's `sub_type_id` and `strategy_id`, are written at `status='candidate'` with `source='generated'` and `metadata_json.parentItemId` set, carry server-assigned opaque option ids, carry their own `metadata_json.structuredExplanation`, and have their `embedding` populated synchronously before the candidate-set write commits. All 4 siblings for a given source land in **one transaction** — partial sets are rejected.

## 3. Out of scope

**Explicitly fenced (sub-phases b/c/d/e):**

- **Validator** — GPT-4o per-check confidences (correctness, ambiguity, difficulty, novelty), cosine-similarity nearest-neighbor < 0.92, sub-phase b. The candidates produced this round sit at `status='candidate'` waiting for sub-phase b.
- **Scorer** — weighted sum of validator confidences, sub-phase c.
- **Deployer** — promotes `candidate → live`, sub-phase d (or absorbed into sub-phase c).
- **Admin generation page** — UI surface for one-click top-up and per-cell `(sub_type_id, difficulty)` view, sub-phase e.

**Explicit non-goals (this round):**

- **No de-novo generation.** This round only creates siblings of EXISTING live items. The de-novo flow (start from `(sub_type_id, difficulty)` cell + template, no source) is a future extension — likely a sub-phase a' or e'.
- **No walker integration.** The mastery-walker (Phase 5 future round per `docs/plans/phase5-adaptive-walker.md`) is independent; siblings sit in candidate land until validator-promoted.
- **No admin review UI.** Spot-checking candidates is `psql` + a list query for now; UI follows in sub-phase e.
- **No automated quality grader.** Quality review is human-in-the-loop at commit 7 — Leo reads the test-run comparison markdown and decides whether to approve the full-bank run (commit 8) or redirect with prompt revisions. Sub-phase b's validator is the formal automated gate that promotes candidates to live.
- **No retroactive structuredExplanation backfill of the 50 seed items.** Out of scope per `docs/plans/phase5-click-to-highlight.md` §11.3 (the 50 unbackfilled items are a known click-to-highlight degradation; not this round's problem). Siblings of seed items receive their own structured explanation from the generator.
- **No cosine similarity check on siblings.** Siblings are by-design high-similarity to source. The 0.92 threshold is the validator's job in sub-phase b. See §4 pre-pin 9 for the forward-pin.
- **No PRD or SPEC edits.** SPEC §3.3's metadata_json shape already reserves the keys we'll write; no schema-vocabulary update is needed. Round-close commit may add a §6.14 entry if the audit-vs-implementation cycle surfaces a generalizable pattern (per the §6.14 second-instance discipline).

## 4. Pre-pin decisions

Each decision below is resolved inline; the rationale captures the trade-off so a future contributor reading the closed plan understands the load-bearing logic. Open Qs that require Leo's decision are in §5.

### 4.1 Generator output shape — text-only options, all 4 siblings in one tool-use call

**Decision:** the generator emits a single `submit_sibling_set` tool-use payload containing four siblings keyed by difficulty (`{easy, medium, hard, brutal}`). Each sibling is `{ body: {kind, text}, options: [{text}, ...], correctAnswerText, structuredExplanation: {parts: [...]} }`. Server post-processing assigns option ids via `assignOptionIds`, resolves `correctAnswer` from `correctAnswerText` to the assigned id, and resolves each `structuredExplanation.parts[*].referencedOptionTexts` to ids before write.

**Rationale:** opaque-id pipeline-split (`docs/plans/opaque-option-ids-and-pipeline-split.md`) — LLM never sees ids. Single tool-use call halves Anthropic round-trips vs four-call shape, lowers cost ~20% (input prompt amortizes across all four siblings), and makes the per-source atomicity contract structural (one tool response = one transaction).

### 4.2 Sibling tier specification — exactly four siblings per source, one per difficulty tier

**Decision:** every source item produces exactly four siblings — one each at `easy / medium / hard / brutal` — regardless of the source's own difficulty. A `medium` source produces an `easy` sibling, a `medium` sibling (a peer-difficulty rephrase), a `hard` sibling, and a `brutal` sibling.

**Rationale:** the round's empirical motivation (§12) is brutal-tier coverage. Generating only "harder than source" or "near-source-difficulty" siblings under-produces brutal. Generating exactly four siblings makes the run-shape uniform across all 439 sources, simplifies idempotency (skip-if-siblings-exist counts to 4 per source), and the prompt language can lean on the sibling-set framing ("here is one source; produce four siblings spanning the difficulty range") rather than per-call difficulty-anchoring.

### 4.3 Strategy-tag preservation — inherit `strategy_id` from source, no re-tagging

**Decision:** siblings inherit the source's `strategy_id` verbatim. No tagger re-run. (Note: 0/439 live items currently carry a `strategy_id`, so in practice this means siblings ship with `strategy_id=NULL` until the strategy-authoring round populates source items, at which point a future sub-phase can backfill via SQL update on parent-id descent.)

**Rationale:** sub-types are stable at the source-item level; strategies are coupled to sub-type, not to surface details. A sibling that varies surface details but preserves problem structure has the same triage move (same strategy) as its source. Re-tagging via Haiku per sibling adds 1,756 LLM calls × ~$0.0002/call = $0.35 of cost for marginal value (we'd expect tagger to confirm the inherited tag in ~95% of cases per the tagger's confidence-distribution shape). The 5% noise from re-tagging would degrade signal, not improve it.

### 4.4 Body schema consolidation — generator consumes canonical `itemBody` from `body-schema.ts`; local copy in `item-templates.ts` deletes

**Decision:** delete the local `BodyText` + `ItemBody` Zod schemas at `src/config/item-templates.ts:4-9` and the local `Option` + `generatedItem` Zod schemas at `src/config/item-templates.ts:11-20`. The generator imports `itemBody` from `@/server/items/body-schema` and a new sibling-set output schema (defined in the generator module). The `itemTemplates` map in `item-templates.ts` keeps its per-sub-type system-prompt + user-prompt builder; the schema field on `ItemTemplate` either points to the generator's sibling-set schema or is removed (the schema lives at the generator's call site, not in the template config).

**Rationale:** the `Phase-4-deferred` comment in the original opaque-id plan now retires. Two Zod copies of the same body shape is a known drift hazard (any change to the canonical body schema — e.g. adding `text_with_image` variant — has to be applied in two places, and the typecheck doesn't catch the divergence). The consolidation is one commit, well-bounded, and removes dead code rather than adding new code. **Schema additions for visual sub-types stay out of scope (no `text_with_image` variant added this round); the consolidation is structural-only.**

### 4.5 structuredExplanation production — siblings must produce it; required field in tool-use schema

**Decision:** the generator's tool-use schema makes `structuredExplanation` a required field per sibling, mirroring the contract from `scripts/_lib/explain.ts` (`StructuredExplanationOutput`). Generator prompt instructs the model to produce `recognition / elimination / optional tie-breaker` parts. Server post-processing resolves `referencedOptionTexts` → option ids using the post-`assignOptionIds` id map, then validates via the existing `structuredExplanation` Zod schema in `ingest.ts` and the existing `assertReferencedOptionsExist` invariant.

**Rationale:** post-session click-to-highlight (Phase 5, shipped) consumes `metadata_json.structuredExplanation`. Siblings without it would silently degrade the click-to-highlight surface for any session that includes a generated item. Producing it inline in the same tool-use call is cheaper than a follow-up explain pass (no second LLM round-trip per sibling, structured-explanation-aware generation tends to produce sharper distractors per the explain-pass empirical shape).

### 4.6 Cost telemetry — adopt the explain-pass usage shape

**Decision:** every generator LLM call logs `{ model, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, cost_estimate_usd, sourceItemId, durationMs }` at `logger.info` level. A run-summary log at end-of-run aggregates: total calls, total input + output tokens, cache hit rate, total estimated cost, p50/p95 latency, sibling-set success/failure counts.

**Rationale:** the explain-pass shape (`scripts/_lib/explain.ts:117-123`) is the project precedent. Same fields means future Phase-4 sub-phases reuse the same cost-aggregation tooling. `cost_estimate_usd` is computed at log-time from the published Sonnet 4.6 input/output prices ($3 / $15 per million); the helper lives in `src/server/generation/pricing.ts` per architecture_plan §2395.

### 4.7 Workflow shape — Vercel Workflow with helper-extraction per A.6 precedent

**Decision:** the generator runs as a Vercel Workflow (`src/workflows/sibling-generation.ts`) with the helper-extraction pattern that's now the project's canonical workflow shape:

- `src/workflows/sibling-generation.ts` — workflow function only; `"use workflow"`; imports step bodies from `./sibling-generation-steps`. NO `@/logger` import (the workflow file's import graph stays free of pino per the `@workflow/next` plugin's node-module guard, exactly as `embedding-backfill.ts` does).
- `src/workflows/sibling-generation-steps.ts` — step bodies; `@/logger` import allowed; each step is one `"use step"` async function. Steps: `loadSourceItemStep`, `generateSiblingSetStep`, `assignIdsAndValidateStep`, `embedSiblingStep`, `writeSiblingSetStep`.
- A separate Bun-runnable orchestration script at `scripts/generate-siblings.ts` enumerates eligible source items, fires `start(siblingGenerationWorkflow, [{itemId}])` per source, and accumulates the cost telemetry.

**Rationale:** the helper-extraction pattern is now load-bearing project convention (already applied to embedding-backfill + mastery-recompute). The script-side orchestration mirrors `scripts/import-questions.ts` + `scripts/generate-explanations.ts` — same `imported.jsonl`-style idempotency log shape (filed under `scripts/_logs/siblings-generated.jsonl`). The script-vs-workflow split keeps per-source LLM retries durable (Vercel Workflow `"use step"` semantics) without forcing the entire round to run inside the Next.js dev server (the Bun script orchestrates).

### 4.8 Idempotency — skip-if-4-siblings-exist; `--force` flag bypasses

**Decision:** before firing the workflow for a source item, the orchestration script queries `SELECT COUNT(*) FROM items WHERE metadata_json->>'parentItemId' = $1 AND source = 'generated' GROUP BY 1`. If count = 4, skip; if count is 0, generate; if count is 1-3, the source has a partial sibling set from a prior failed run — log a warning, skip by default, regenerate with `--force` (the partial set is left in DB, deduped by the validator round if it gets there before regeneration). The `--force` flag triggers regeneration regardless of existing count; it does NOT delete prior siblings (delete is a separate `--reset-source <id>` flag scoped narrowly).

**Rationale:** matches the `scripts/_logs/imported.jsonl` precedent from the testbank-re-extraction round. The skip-by-default behavior makes re-running the orchestration safe on a fresh terminal, which is useful when a kill-switch or rate-limit interrupts a run. The partial-set warning surfaces drift visibly without auto-correcting; a future contributor can grep the log for "partial sibling set" and decide whether to `--force` or `--reset-source` per case.

### 4.9 Failure handling — atomic per source; reject all 4 if any sibling fails Zod

**Decision:** if the LLM tool-use response fails to parse as the sibling-set Zod schema, OR if any of the 4 siblings individually fails the post-processing invariants (correctAnswerText not in options, referencedOptionTexts not in options, body schema mismatch, etc.), the entire sibling set is rejected. The workflow logs the per-failure detail (`logger.error` with full Zod issues) and throws — the source item is left with no candidates from this run. The orchestration script counts the failure into the run summary; the source can be re-attempted on the next run (no idempotency block fires because count remains 0). One retry with backoff happens inside the LLM call (per `withBackoff` from `scripts/_lib/anthropic.ts`); after retry exhaustion the workflow throws.

**Rationale:** the candidate-review burden is per-sibling-set, not per-sibling. Half-populated sibling sets where one tier is missing pollute the validator's per-tier coverage signal in sub-phase b. Atomicity at the sibling-set level means the validator either sees a complete set or no set; never a partial one. The cost of the retry-and-reject path is low: empirical Sonnet 4.6 tool-use compliance per `scripts/_lib/explain.ts` is north of 95%, so the rejection rate should be sub-5% across the run.

### 4.10 Atomicity — one DB transaction per sibling set

**Decision:** the `writeSiblingSetStep` opens a single `db.transaction(async (tx) => {...})` and inserts all 4 sibling rows under `tx`. Embedding columns are set inside the transaction (the embeddings are computed in the prior step and passed in as 4 number arrays). No async `embeddingBackfillWorkflow` trigger — embeddings are synchronous-before-write here.

**Rationale:** §4.9's atomicity contract demands all-or-nothing at the sibling-set level. The embedding-backfill workflow's async-after-insert pattern (used by `ingestRealItem`) is the WRONG shape for siblings: a row inserted with `embedding=NULL` and a later async UPDATE leaves a window where the validator round (sub-phase b) might attempt similarity comparison on a NULL-embedding row. Synchronous-before-write closes the window. Cost: the `embedSiblingStep` makes 4 OpenAI embedding calls (one per sibling) before the transaction; ~0.1s each in dev, durable retries via `"use step"`.

### 4.11 Status — siblings land at `candidate`; no override

**Decision:** every sibling row is inserted with `status='candidate'` and `source='generated'`. No CLI flag overrides. The promotion-to-live path is sub-phase b/c/d's job.

**Rationale:** matches the data-wipe-round pre-pin (`docs/plans/phase5-data-wipe.md`) and the architecture_plan §90's deployer contract. The validator's gate is per-sibling-cosine-and-confidence; auto-promoting at `candidate-write` time would skip that gate. There's no near-term need for a "trust-this-sibling" override — sub-phase b ships fast enough that the candidate-set lifetime is hours, not days.

### 4.12 Ingest-seam reuse vs new write path; provenance dual-write

**Decision:** introduce a new `ingestSiblingSet(siblings: SiblingItemInput[], parentItemId: string)` function in a new file `src/server/items/ingest-siblings.ts`. It reuses the validation primitives from `ingest.ts` (`optionSchema`, `structuredExplanation`, `assertReferencedOptionsExist`) but not `ingestRealItem` itself, because (a) `ingestRealItem` hardcodes `status='live'` and `source='real'`; (b) `ingestRealItem` triggers the async `embeddingBackfillWorkflow` which is the wrong shape per §4.10; (c) the input contract is per-sibling-set, not per-item. The validation primitives stay shared (one `optionSchema` constant exported from `ingest.ts`, imported by `ingest-siblings.ts`) so any future drift surfaces as a typecheck error.

`ingestSiblingSet` performs a **dual write** per sibling set: (1) the DB transaction inserting the 4 candidate rows with `metadata_json.parentItemId` populated for runtime queryability, AND (2) a per-source provenance JSON file at `scripts/_siblings/<parentItemId>.json` containing the full audit-trail (source snapshot, generator model, prompt + tool versions, per-sibling LLM-output verbatim, post-processing decisions, embedding hashes, cost telemetry, write timestamps). The DB row carries the minimum needed to query at runtime; the JSON file carries everything needed to reconstruct the run after the fact (mirroring the `scripts/_stage1/<source_folder>/<source_filename>.json` pattern that `scripts/import-questions.ts` writes for OCR extracts — same formatting convention, same single-source-of-truth role).

**Rationale:** `ingestRealItem` is the seed-loader + OCR-pipeline path; refactoring it to be parameterizable on `(status, source, parentItemId, embeddingMode)` would widen the surface for two consumers (real-ingest, sibling-ingest) and obscure the contract. A second function with shared primitives is cheaper. The per-source JSON file's role as canonical audit-trail (vs the DB row's runtime-queryable role) means provenance survives DB-side actions (validator-driven `retired` status, schema migrations, snapshot restores) and stays inspectable via plain `cat` / `jq`. Audit-vs-queryability split mirrors the testbank-re-extraction round's two-place pattern (`importSource` lives in both the column and `metadata_json` for the same reason).

### 4.13 Embedding similarity threshold for siblings — forward-pin to validator (sub-phase b); not implemented this round

**Decision:** the cosine-similarity check at PRD's 0.92 threshold is **not implemented this round**. Sub-phase a writes `candidate` rows with `embedding` populated; sub-phase b's validator runs the threshold check at validation-time. The forward-pin convention for sub-phase b (recorded here so it's not re-litigated): siblings of a given source are exempt from source↔sibling similarity comparison (siblings are by-design high-similarity to source); they are subject to sibling↔non-source-non-sibling comparison normally. Implementation of the exemption belongs in the `nearestNeighborInBank` helper that the validator calls — likely shape: `nearestNeighborInBank(subTypeId, embedding, { excludeParentItemId, excludeSiblingItemIds })`.

**Rationale:** §13 of the architecture plan reserves cosine-similarity as a validator concern, not a generator concern. Implementing the threshold inside the generator would require duplicating the helper and making sub-phase b's API unstable. The forward-pin is recorded here so when sub-phase b opens, the audit-first checkpoint surfaces the exemption decision as already-pinned rather than as a new question.

## 5. Resolved Qs (was: Open Qs for Leo)

All five Qs were resolved by Leo on 2026-05-08 ahead of commit 1 of this round. Each resolution is captured with one-sentence rationale; the original Q's trade-off framing is preserved as a quote block per the §6.14.20 wholesale-replacement-with-quote-preservation pattern.

### 5.1 Provenance shape

**Resolved 2026-05-08: per-source JSON file at `scripts/_siblings/<parentItemId>.json` (the canonical audit trail) plus minimal in-row `metadata_json.parentItemId` (runtime queryability). NEITHER a new column NOR a Drizzle migration this round.** Rationale: mirrors the existing `scripts/_stage1/<source_folder>/<source_filename>.json` pattern that `scripts/import-questions.ts` writes for OCR extracts — same formatting convention, same single-source-of-truth role; the JSON file survives DB-side actions and stays inspectable via plain `cat` / `jq`, and a future admin page can fall back to filesystem scan if needed.

> _Original Q: the `items` table has no parent-item linkage column today. Options framed as A (new `parent_item_id uuid` column with FK + index — indexable, FK-enforced, simple), B (`metadata_json.parentItemId` jsonb-path key — no migration, all metadata consolidated). The plan-write recommendation was Option A on per-source-descent-query speed. Leo's resolution introduces Option C (per-source JSON file on disk) and rejects both A and B for the canonical-audit-trail role; B's `metadata_json.parentItemId` is preserved purely for runtime queryability, not as the canonical record._

### 5.2 Cost-budget kill-switch

**Resolved 2026-05-08: $50/run hard cap, configurable via `--max-cost-usd` flag. Matches Option A.** Rationale: comfortable headroom over the $5–$15 plan-time estimate; cap-firing is a real signal worth investigating; per-call cost telemetry already tracks the running total.

> _Original Q: full-run estimate $5–$15 (§11), but a runaway prompt or prompt-caching miss could push higher. Options framed as A ($50 hard cap), B (no cap; rely on monitoring), C ($90 cap at 2× estimate). Plan-write recommendation was Option A._

### 5.3 Sub-type filtering

**Resolved 2026-05-08: all-at-once is the eventual default; the test-run mode (per New Ask 1, §8 commit 7) sources 3 items per sub-type × 14 sub-types = 42 sources in one invocation. The `--sub-type=<id>` flag stays for single-sub-type debugging.** Rationale: the test-run gate (commit 7) gives per-sub-type spot-check coverage in one invocation; staged mode is debugging-only post-test-run.

> _Original Q: staged (one run per sub-type) vs all-at-once (one run for all 14). Plan-write recommendation was staged-default. Leo's resolution flips to all-at-once-default but introduces a 3-per-sub-type test-run gate that absorbs the spot-check value of staging without the operational overhead._

### 5.4 Source-pool filter

**Resolved 2026-05-08: all 439 live items are eligible source items, including the 50 seed items lacking `metadata_json.structuredExplanation`.** Rationale: the generator produces siblings' own structured explanations from `body + options + correctAnswer` alone; cross-pollination from source-explanation is absent for the 50 seed items but the absence shows up empirically in sub-phase b's validator and can be remedied later if needed.

> _Original Q: all 439 vs only the 389 with structuredExplanation. Plan-write recommendation was all 439._

### 5.5 `correctAnswer` resolution shape

**Resolved 2026-05-08: Option A — reject the sibling set entirely if any duplicate option texts.** Rationale: duplicate option text is a bad-question signal in its own right; failing fast at post-processing saves a validator-round trip; the rejected set is logged and the source can be re-attempted on the next run.

> _Original Q: A (reject sibling set on any duplicate option text) vs B (resolve `correctAnswerText` to first matching option; warn but accept). Plan-write recommendation was Option A._

## 6. Schema changes

**None this round.** Per §5.1's resolution: provenance lives in `metadata_json.parentItemId` (runtime queryability via the existing jsonb column) plus a per-source JSON file at `scripts/_siblings/<parentItemId>.json` (canonical audit trail on disk). No new column. No new index. No Drizzle migration commit.

No enum migrations either. `item_difficulty` already includes `brutal`; `item_status` already includes `candidate`; `item_source` already includes `generated` (re-verified via `psql` 2026-05-08; commit 0's audit was correct). This is the load-bearing reason this round ships zero schema changes — every enum value the generator and ingest path need is already present.

## 7. Architecture

### 7.1 LLM prompt design

**System prompt (per sub-type):** the existing `itemTemplates[subTypeId].systemPrompt` + a sibling-mode appendix that describes the four-tier output contract. The appendix lives in a new `buildSiblingSystemPrompt(subTypeId): string` helper in `src/config/item-templates.ts` (or a sibling file `src/config/sibling-templates.ts` if the template surface becomes load-bearing). The appendix instructs:

- Preserve problem structure: same operation, same number of decision-points, same distractor relationship.
- Vary surface details: different numbers, different named entities, different subjects.
- Each sibling is independently solvable from its own body + options.
- Difficulty tiers map to expected solver-time budgets per the existing `difficultyHint` helper.

**User prompt:** the source item's body + options + correctAnswer + (optional) source `structuredExplanation`. The LLM never sees option ids — it sees option texts.

**Tool-use schema (`submit_sibling_set`):**

```ts
{
  siblings: {
    easy:   { body: BodyTextLike, options: [{text: string}], correctAnswerText: string, structuredExplanation: {parts: [...]} }
    medium: { ... }  // same shape
    hard:   { ... }
    brutal: { ... }
  }
}
```

The Zod validator at the server boundary unpacks this into 4 per-sibling input records.

### 7.2 Server-side post-processing

Per sibling, in order:

1. Validate body against `itemBody` from `body-schema.ts` (§4.4).
2. `assignOptionIds(sibling.options)` produces id-bearing options.
3. Build a `Map<text, id>` from the result (rejected on duplicate text per §5.5).
4. Resolve `correctAnswerText` via the map → `correctAnswer` id; reject if no match.
5. For each `structuredExplanation.parts[*].referencedOptionTexts`, resolve via the map → ids; reject on miss.
6. Assemble `IngestSiblingItemInput` and validate via the sibling-set Zod schema.
7. Compute embedding via `embedText(body.text)`.
8. Write all 4 in one transaction with `status='candidate'`, `source='generated'`, `metadata_json.parentItemId = <source>` (the canonical in-row linkage per §5.1), `metadata_json.generatorModel = 'claude-sonnet-4-6'`, `metadata_json.templateVersion = 1`, `metadata_json.generatedAt = <ISO>`. The transaction returns the 4 inserted item ids.
9. After the transaction commits, write the per-source provenance JSON file to `scripts/_siblings/<parentItemId>.json` via `src/server/generation/sibling-provenance.ts`'s `writeSiblingProvenance(parentItemId, payload)` helper. Payload contains: source-snapshot fields (id, subTypeId, difficulty, body, options, correctAnswer, originalExplanation), generator config (model, templateVersion, prompt-hash), per-sibling LLM-output verbatim (the un-id-assigned tool-use response), per-sibling post-processing decisions (assigned ids, resolved correctAnswer, resolved referencedOptions), per-sibling embedding hash, the inserted item ids, cost telemetry (input_tokens / output_tokens / cache_read_input_tokens / cache_creation_input_tokens / cost_estimate_usd / durationMs), and `generatedAt` ISO timestamp. The writer mirrors the stage-1 pattern: `fs.writeFileSync(path, ${JSON.stringify(payload, null, 2)}\n)` with directory auto-creation.

### 7.3 Workflow shape

```
src/workflows/
├── sibling-generation.ts                # workflow function, "use workflow", no @/logger
└── sibling-generation-steps.ts          # step bodies, "use step", @/logger allowed

src/server/items/
└── ingest-siblings.ts                   # ingestSiblingSet(); validation primitives reused from ingest.ts

src/server/generation/
├── sibling-generator.ts                 # NEW: LLM-call orchestration; uses Anthropic SDK; returns parsed sibling set
├── sibling-prompts.ts                   # NEW: buildSiblingSystemPrompt + buildSiblingUserPrompt
├── sibling-tool.ts                      # NEW: submit_sibling_set tool definition
├── sibling-schema.ts                    # NEW: Zod schemas for sibling-set output + per-sibling input
├── sibling-provenance.ts                # NEW: writeSiblingProvenance(parentItemId, payload) — writes scripts/_siblings/<id>.json + writeSiblingComparisonMd(rows) for the test-run review surface
├── pricing.ts                           # NEW: cost-estimate helper for Sonnet 4.6 pricing
└── embeddings.ts                        # EXISTING: embedText reused

scripts/
└── generate-siblings.ts                 # NEW: Bun-runnable orchestration; enumerates eligible items, fires workflow, accumulates telemetry

scripts/_siblings/                       # NEW: per-source provenance JSON files (mirror of scripts/_stage1/ pattern)
└── <parentItemId>.json                  # one file per source item; canonical audit trail per §4.12

scripts/_logs/
├── siblings-generated.jsonl             # NEW: idempotency log keyed on parentItemId (same shape as imported.jsonl)
└── sibling-test-run-comparison.md       # NEW (commit 7 only): human-review markdown for the 42-source test run
```

Each step:

- `loadSourceItemStep(itemId)` — selects body, options, correctAnswer, explanation (optional metadata_json.structuredExplanation), sub_type_id, strategy_id.
- `generateSiblingSetStep(source)` — Anthropic call; returns parsed sibling set + usage telemetry.
- `assignIdsAndValidateStep(siblingSet)` — runs §7.2 steps 1–6 per sibling.
- `embedSiblingStep(siblings)` — 4 sequential `embedText` calls (parallelizable in step body via `Promise.all`).
- `writeSiblingSetStep(parentItemId, siblings, payload)` — single `"use step"` that performs both the DB transaction (inserts 4 rows) AND the per-source JSON write (`scripts/_siblings/<parentItemId>.json`) inline, mirroring `scripts/import-questions.ts`'s `processImage` shape where the stage-1 JSON write sits alongside its DB equivalent in one synchronous block. Filesystem error after DB-commit is the trade-off the stage-1 pattern accepts; for sibling-gen the same trade-off holds (the source can be re-attempted after manually deleting the partial DB rows or extending the orchestrator with a `--json-repair` flag in a follow-up if partial-writes prove common — out-of-scope for this round).

The §4.8 idempotency check stays as-specified (DB count of generated siblings == 4 → skip), with a small extension: the orchestrator additionally warns when DB-count==4 but `scripts/_siblings/<parentItemId>.json` is absent. Warning only — no automatic repair. If the warning fires more than a handful of times during the test-run (commit 7), the round-close commit drafts a §6.14 note + an iteration commit adds the repair flag.

### 7.4 Cost telemetry shape

Per call (`logger.info`):
```
{ model, sourceItemId, subTypeId, input_tokens, output_tokens,
  cache_read_input_tokens, cache_creation_input_tokens,
  cost_estimate_usd, durationMs, siblingCount: 4 }
```

End-of-run summary (`logger.info`):
```
{ totalCalls, totalSourcesProcessed, totalSourcesSkipped,
  totalSourcesFailed, totalSiblingsWritten,
  totalInputTokens, totalOutputTokens, cacheHitRate,
  totalCostUsd, p50DurationMs, p95DurationMs,
  perSubTypeBreakdown: Record<SubTypeId, {sources, siblings, costUsd}> }
```

The per-sub-type breakdown is the input the validator round (sub-phase b) consumes to size its own per-sub-type budget.

**Dual surfacing.** Per-call telemetry surfaces in BOTH the structured logger output (run-aggregate-friendly stream; goes to stdout / log files for grep / aggregation) AND the per-source provenance JSON file at `scripts/_siblings/<parentItemId>.json` (per-source single-source-of-truth; goes to disk for inspection via `cat` / `jq` / future admin-page filesystem scan). The two surfaces are redundant by design: logger output is for the runtime operator watching a run in progress; the JSON file is for post-hoc inspection of any one source's full audit trail. End-of-run summary lives only in the logger stream (it's run-aggregate, not per-source).

### 7.5 Filterability

Sub-phase a's metadata shape supports the four canonical filter queries an admin page (sub-phase e) or any future analysis script needs. **All four use existing indexed columns or jsonb-path queries against existing indexes — no new indexes this round.**

- **Originals only** (the curated testbank, untouched by Phase 4):
    ```sql
    SELECT … FROM items WHERE source = 'real' AND status = 'live';
    ```
    Hits `items_sub_type_status_idx` (and the `source` predicate filters to ~439 rows in v1). Equivalent to the live bank as of round-open.

- **LLM siblings (any status)** (everything sub-phase a writes, regardless of sub-phase b's promotion outcome):
    ```sql
    SELECT … FROM items WHERE source = 'generated';
    ```
    Sequential scan acceptable at v1 candidate scale (~1,756 rows post-round); future admin-portal round can add an `items_source_idx` if the cardinality grows.

- **Validated LLM siblings** (sub-phase b/c/d-promoted candidates):
    ```sql
    SELECT … FROM items WHERE source = 'generated' AND status = 'live';
    ```
    Hits `items_sub_type_status_idx` via the `status='live'` predicate; the `source='generated'` filter applies in-memory. At expected post-validator scale this is well-bounded.

- **Siblings of a specific source**:
    ```sql
    SELECT … FROM items WHERE metadata_json->>'parentItemId' = '<sourceItemId>';
    ```
    Jsonb-path query without a dedicated index; acceptable at v1 candidate scale because the cardinality bound is 4 (each source has at most 4 siblings). For repeated descent queries from an admin page, a future migration can add `CREATE INDEX items_metadata_parent_item_id_idx ON items ((metadata_json->>'parentItemId'))`; not this round.

The filesystem-side filter (per §4.12's audit-trail role) complements:

- **All sibling generation runs ever performed** = `ls scripts/_siblings/*.json` returning N files where N is the count of source items that have been processed.

Admin generation page (sub-phase e) consumes these four queries plus the filesystem listing for the per-source-detail view.

## 8. Commit sequencing

> **Reconciled at round close (parent commit 9, 2026-05-08).** The original §8 ledger is preserved as a quote block at the end of this section per §6.14.20's wholesale-replacement-with-quote-preservation pattern. The actual shipped commit chain — including iteration commits between commits 7 and 8 (per parent §10's quality-drift mitigation), the narrow-scope sub-round insertion per §6.14.34 (b1 vector-similar-context), and the recovery cycle (CR-schema-fix + max_tokens-fix + antonyms cleanup) — replaces it inline below. The original ledger's commit 8 (full-bank single-shot) was structurally subsumed by the sub-round's commit 7.5.7 + recovery sequence; the original ledger's commit 9 is this commit.

### 8.1 Parent commit ledger (as shipped)

| # | Conventional message | Scope summary | Hash |
|---|---|---|---|
| 0 | `docs: add plan for phase 4 similar-item generator (sub-phase a)` | Plan-doc creation. | `9c7210f` |
| 1 | `docs(plan): refine phase 4a — resolve open Qs + add test-run gate` | Plan-doc refinement. | `b19042a` |
| 2 | `feat(items): consolidate body/option Zod schemas — delete local copies in item-templates.ts` | Body/option Zod schema consolidation. | `d88ea13` |
| 3 | `feat(generation): pricing.ts + sibling-tool.ts + sibling-schema.ts + sibling-prompts.ts + sibling-provenance.ts` | Constants + schemas + tool definition + prompt builders + provenance writer. | `a07c03f` |
| 4 | `feat(generation): sibling-generator.ts — Anthropic call + cost-telemetry log + provenance JSON write` | LLM-call wrapper. | `fd6fa0d` |
| 5 | `feat(items): ingestSiblingSet — validation primitives + transaction-based 4-sibling write` | Atomic 4-sibling write. | `71a099e` |
| 6 | `feat(workflows): sibling-generation workflow + steps (helper-extraction shape)` | Vercel Workflow shape (helper-extraction per A.6 precedent). | `d039121` |
| 7 | `feat(scripts): generate-siblings.ts — orchestration + idempotency + cost summary; smoke = test-run with 3-per-sub-type (42 sources × 4 = 168 siblings)` | Orchestration script + 42-source test-run gate. | `869d628` |
| iter #1 | `feat(generation): anchor sibling difficulty tiers to real CCAT distribution` | Iteration commit between commits 7 and 8 per §10 quality-drift mitigation. | `22c421f` |
| iter #2 | `feat(generation): de-template antonyms anchor + add cross-source-duplicate-prevention guards` | Iteration commit between iteration #1 and the sub-round insertion. | `0d3881c` |
| 7.5.0–7.5.7 | (sub-round; see §8.2) | b1 vector-similar-context sub-round (per §6.14.34 narrow-scope sub-round insertion). | (sub-round chain) |
| 8 | **SUBSUMED.** Original "full-bank single-shot" commit was structurally subsumed by sub-round commit 7.5.7 (full-bank with b1) + recovery cycle (7.5.7.r1–r5 below). | — | — |
| 9 | `docs(plan): close phase 4 sub-phase a (similar-item-generator) round + author §6.14 entries` | **THIS COMMIT.** Plan-doc status flip + §8 ledger reconciliation + §11 round-close empirical-actual + §12 round-close post-cleanup table + 12 new §6.14 entries authored. | (this commit) |

### 8.2 Sub-round commit ledger (b1 vector-similar-context, between commits 7 and 8 per §6.14.34)

The sub-round opened against `main` at HEAD `0d3881c` (post-iteration #2). Plan-doc: `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md`. Closed at sub-round commit 6 + recovery sequence.

| # | Conventional message | Scope summary | Hash |
|---|---|---|---|
| 7.5.0 | `docs(plan): add vector-similar-context sub-round plan (between commits 7 and 8)` | Sub-round plan-doc creation. | `40a2358` |
| 7.5.1 | `feat(generation): vector-similar-context injection in sibling generator` | Layer-1 single-tier K=8 neighbor injection. | `5ea9708` |
| 7.5.2 | `chore(data): re-run 42-source test with vector-similar-context` | Single-tier 42-source measurement. | `062fcf9` |
| 7.5.3 | `feat(generation): tier-stratified vector-similar-context neighbor query (b1 iteration)` | b1 architecture: K=2-per-tier × 4 tiers. | `dfed80a` |
| 7.5.4 | `chore(data): re-run 42-source test with tier-stratified vector-similar-context (b1 measurement)` | b1 measurement; PASSED stop-condition. | `e2f5304` |
| 7.5.5 | `docs(plan): revise sub-round plan for Path 1 — combine b1 tier-stratified context with layer-2 retry-on-duplicate` | Path 1 layer-2 expansion (REVERTED at 7.5.6 per §6.14.29). | `c4d8541` |
| 7.5.5.r | `docs(plan): amend sub-round plan — b1 measurement passes stop-condition; revert Path 1 layer-2 scope expansion` | Revert amendment; preserves c4d8541 framing as "considered-not-shipped" quote block. | `9f47cfb` |
| 7.5.6 | `chore(data): retire all prior-iteration generated candidates` | Pre-full-bank cleanup (per §6.14.31 destructive-operation-gate template). | `5be3c5c` |
| 7.5.7 | `chore(data): full-bank sibling generation with b1-only generator` (originally planned single-shot) | **Halted at scope-H 10% CR-failure threshold; recovery cycle below.** | (halted run; no commit hash) |

### 8.3 Recovery cycle (between sub-round commit 7.5.7's halt and the resume completion)

The full-bank attempt halted on a CR Zod-failure cluster (21+ sources rejected on `options.min(4)` schema bound). Recovery cycle ran the diagnostic + fix + smoke + cleanup + resume sequence:

| # | Conventional message | Scope summary | Hash |
|---|---|---|---|
| 7.5.7.r1 | `fix(generation): align sibling schema options.min with full-bank source distribution` | CR-schema-fix: `options.min(4) → options.min(3)` per §6.14.37 (schema-vs-bank shape mismatch). | `60bde8e` |
| 7.5.7.r2 | `chore(data): retire all source='generated' candidates after CR-schema-fix (recovery cleanup before full-bank rerun)` | Recovery cleanup; pre-rerun bank reset (per §6.14.31). | `ecca199` |
| 7.5.7.r3 | `fix(generation): raise sibling-generation max_tokens 4096→8192 + capture stop_reason/usage on parse-fail` | max_tokens fix + parse-fail observability augmentation per §6.14.33 (failure-path observability symmetry). | `7aa39d5` |
| 7.5.7.r4 | `chore(data): full-bank sibling generation (resumed after max_tokens fix; 437 of 439 sources × 4 = 1,748 candidates)` | Idempotent resume; 437/439 sources successful. | `989d6da` |
| 7.5.7.r5 | `chore(data): retire 37 convergent verbal.antonyms candidates (keep-1-per-cluster across all 4 tiers)` | Antonyms convergence cleanup per §6.14.36 (canonical-exemplar attractors at full-bank scale). | `ed730a5` |

**Final bank state at round close (parent commit 9 / this commit):** 1,711 generated candidates (1,748 − 37 antonyms cleanup); 437 of 439 sources with full 4-tier sibling sets; 2 residual baseline-LLM-noise failures (`019dfbc8-1e11` percentages, `019dfdaf-e54a` CR). Sub-phase b validator inherits this candidate set as input.

### 8.4 Original §8 ledger (preserved per §6.14.20 wholesale-replacement-with-quote-preservation)

> Original §8 ledger as authored at parent commit 1 (`b19042a`):
>
> One variable per commit per the §6.14 redirector discipline. Ten commits (commits 0–9), with commit 7's test-run gating commit 8's full-bank run per New Ask 1.
>
> | # | Conventional message | Scope summary | Dormancy |
> |---|---|---|---|
> | 0 | `docs(plan): add plan for phase 4 similar-item generator (sub-phase a)` | Plan-doc creation. **SHIPPED at `9c7210f`** (2026-05-08). | — |
> | 1 | `docs(plan): refine phase 4a — resolve open Qs + add test-run gate` | **THIS COMMIT.** Plan-doc refinement: §5 Open-Q resolutions (5 → all "Resolved 2026-05-08"), §6 collapsed to "None this round", §4.12 + §7 updates for JSON-file provenance, NEW §7.5 Filterability subsection, §8 re-sequenced to 10-row ledger with test-run gate, §10 quality-drift risk added, §11 test-run cost sub-heading, Appendix §6.14.20 paraphrase corrected. | — |
> | 2 | `feat(items): consolidate body/option Zod schemas — delete local copies in item-templates.ts` | §4.4 — delete `BodyText`, `ItemBody`, `Option`, `generatedItem` from `item-templates.ts`; rewire `itemTemplates`'s `schema` field (or remove it). All callers import from `body-schema.ts`. **(Was original commit 1.)** | Dormant: nothing consumes the deletions yet. |
> | 3 | `feat(generation): pricing.ts + sibling-tool.ts + sibling-schema.ts + sibling-prompts.ts + sibling-provenance.ts` | Constants + schemas + tool definition + prompt builders + provenance JSON writer (+ comparison-md writer for commit 7). Pure-function surface; no LLM calls; no DB writes. **(Was original commit 3 + new sibling-provenance.ts file per §4.12 / §7.3.)** | Dormant: no consumer. |
> | 4 | `feat(generation): sibling-generator.ts — Anthropic call + cost-telemetry log + provenance JSON write` | LLM-call wrapper. Returns parsed sibling-set + usage. Includes `withBackoff` per `scripts/_lib/anthropic.ts`. Verified manually against one source item via a smoke that also writes a provenance JSON to `scripts/_siblings/<id>.json`. **(Was original commit 4 + provenance JSON write call.)** | Dormant: no orchestration. |
> | 5 | `feat(items): ingestSiblingSet — validation primitives + transaction-based 4-sibling write` | New `src/server/items/ingest-siblings.ts`. Reuses `optionSchema`, `structuredExplanation`, `assertReferencedOptionsExist` from `ingest.ts`. Writes 4 rows in one tx with `status='candidate'`, `source='generated'`, `metadata_json.parentItemId`, `embedding` set inline. **(Unchanged from original commit 5.)** | Dormant: no caller. |
> | 6 | `feat(workflows): sibling-generation workflow + steps (helper-extraction shape)` | `src/workflows/sibling-generation.ts` + `src/workflows/sibling-generation-steps.ts`. Workflow file's import graph stays free of `@/logger`. End-to-end against one source item via dev Next.js. **(Unchanged from original commit 6.)** | Dormant: no orchestration script. |
> | 7 | `feat(scripts): generate-siblings.ts — orchestration + idempotency + cost summary; smoke = test-run with 3-per-sub-type (42 sources × 4 = 168 siblings)` | `scripts/generate-siblings.ts` + `scripts/_logs/siblings-generated.jsonl`. Honors `--max-sources-per-sub-type=N` (default unbounded; N=3 for the test run), `--sub-type=<id>`, `--all-sub-types` (default), `--force`, `--reset-source`, `--max-cost-usd` (default $50). End-to-end against all 14 sub-types at 3 sources each = 42 sources × 4 = 168 candidate siblings. Writes the comparison markdown at `scripts/_logs/sibling-test-run-comparison.md` (per New Ask 1). **STOP AND REPORT for Leo's quality review.** | **First non-dormant commit;** drives the test-run deliverable. |
> | 8 | `chore(data): full-bank sibling generation (remaining 397 sources × 4 = 1,588 siblings)` | Full-bank run gated on Leo's quality approval after commit 7. Just an orchestration-script invocation (no code change): `bun run scripts/generate-siblings.ts --all-sub-types --max-cost-usd 50`. The 42 sources processed in commit 7 are skipped by the §4.8 idempotency check; the remaining 397 are processed; running totals at end-of-run: 1,756 candidate rows, 439 provenance JSON files, 439 idempotency-log entries. | Non-dormant: drives the full-bank deliverable. |
> | 9 | `docs(plan): round-close — plan-doc status flip + commit-ledger reconciliation` | Plan-doc status flip to "shipped <date>" via the wholesale-replacement-with-quote-preservation pattern per §6.14.20. Round-close summary; closed-plan diff zero-line check per §6.14.20.3 against every prior closed plan; SPEC §6.14.NN candidate if a generalizable pattern surfaced (e.g., the dual-write-DB-and-JSON pattern, or the test-run-quality-gate-as-commit-boundary pattern). | — |
>
> **Notes:**
>
> - **Commit 7 is the test-run gate.** Quality review is human-in-the-loop: Leo reads `scripts/_logs/sibling-test-run-comparison.md` and either approves the full-bank run (commit 8 lands) or redirects with prompt revisions. Per the redirector convention, iteration commits between 7 and 8 (prompt revisions, re-test against the same 42 sources) are not pre-specced; each is its own redirect cycle. Iteration would use `--force` or `--reset-source` flags to re-generate against already-processed sources.
> - The dormancy chain (commits 2–6 land before any siblings are written) means each commit can be reverted independently if a bug surfaces during commit 7's smoke.
> - **Commits 7 and 8 are the only commits that ship sibling rows.** Earlier commits write zero rows.
> - Commit numbering is final at this commit; no further re-sequencing during the open-round window unless a structural redirect surfaces. Per §6.14.20, the plan flips closed-immutable at commit 9 (not at this commit).

## 9. Verification per commit

Every commit:

- `bun lint:all` passes (no biome / grit / super-lint / custom-lint failures).
- `bun typecheck` passes (project-wide; `lefthook` enforces).
- `bun test` returns 79/79 baseline (or higher if the commit adds tests).

Commit-specific gates:

- **Commit 0** (`9c7210f`, shipped): plan doc only; no code or schema changes; `git status` clean except for the new file. _Verified at ship time._
- **Commit 1 (this commit):** plan-doc edits only; lint + typecheck + 79/79 unchanged; `git status` clean except for the plan-doc edit; `git diff --stat` confirms only `docs/plans/phase4-similar-item-generator.md` changed.
- **Commit 2:** existing 79/79 still passes; no behavior change verifiable via session-engine smoke (`scripts/dev/smoke/start-session-idempotency.ts`).
- **Commit 3:** new tests for sibling-schema Zod parsing + sibling-provenance JSON-shape parsing; total test count moves from 79 to 80–82.
- **Commit 4:** manual smoke against one source item; cost-telemetry log inspected by hand; `scripts/_siblings/<id>.json` is present and matches the documented payload shape.
- **Commit 5:** new tests under `src/server/items/ingest-siblings.test.ts`; total moves further. Tests cover happy path, duplicate-option-text rejection, partial-set rejection.
- **Commit 6:** workflow import-graph audit (no `@/logger` reachable from `sibling-generation.ts`); manual workflow trigger via dev server.
- **Commit 7:** test-run completes; **168 candidate rows** present in DB (42 sources × 4 each) with `source='generated'`, `status='candidate'`, `metadata_json.parentItemId` populated; **42 provenance JSON files** at `scripts/_siblings/<parentItemId>.json`; **comparison markdown** at `scripts/_logs/sibling-test-run-comparison.md` rendered for Leo's review. Cost-summary log records the actual run cost (~$0.50–$0.84 expected per §11). STOP AND REPORT.
- **Commit 8:** full-bank run completes against the remaining 397 sources; **1,588 additional candidate rows** present (running total **1,756**); **397 additional provenance JSON files** (running total **439**); idempotency log entries match (running total 439). No code changes; commit message records the cost-summary log inline.
- **Commit 9:** closed-plan diff check zero per §6.14.20.3 against every prior closed plan. The plan flips to "shipped <date>" status; `git diff` against this plan shows only the status-flip + summary edits.

## 10. Risk / failure modes

- **LLM returns malformed JSON / fails Zod.** Per-call retry with backoff; sibling-set rejected on retry exhaustion; source skipped (per §4.9). Run-summary surfaces the failure rate; if > 10% across the run, round-close commit drafts a §6.14 entry on prompt-engineering vs Sonnet 4.6's tool-use compliance and recommends a prompt iteration before sub-phase b opens.
- **Embedding service down (OpenAI 5xx).** `embedText`'s existing error-handling throws; the workflow step retries per Vercel Workflow's `"use step"` semantics; if all retries exhaust, the sibling set is rejected per §4.10. The orchestration script's run-summary surfaces.
- **DB transaction failure mid-batch.** Single transaction at write time; PG ACID guarantees rollback on any individual insert failure. Workflow logs and re-throws.
- **Cost overrun.** §5.2 hard cap at $50 (pending confirmation). Per-call telemetry catches drift; cap fires before cost climbs past 1.1× estimate.
- **Sibling-set quality drift.** The validator round (sub-phase b) is the formal gate; this round has no automated quality check beyond Zod. The operational mitigation is the **test-run gate at commit 7** — 42 sources (3 per sub-type × 14 sub-types) produce 168 candidate siblings with a comparison-markdown surface for human review before the full-bank run lands at commit 8.
- **Quality drift surfaces at commit 7's review.** If Leo's review of `scripts/_logs/sibling-test-run-comparison.md` surfaces issues (sibling vs source comparison shows distractor-relationship drift, surface-detail collapse, difficulty-tier miscalibration, or per-sub-type quality variance), iteration commits may land between commits 7 and 8. Mitigation: redirector-driven prompt revision; re-test against the same 42 sources via `--force` or `--reset-source` to bypass the §4.8 skip-by-default idempotency. Iteration commits are not pre-specced; each is its own redirect cycle. Commit 8 (full-bank run) is gated on Leo's approval; if approval is withheld, the round can close without commit 8 (the 168 test-run candidates remain in the bank as `status='candidate'` for sub-phase b's validator to handle, or get retired in a follow-up cleanup commit).
- **Idempotency-log corruption.** The log is JSONL; parser tolerates trailing partial lines; entries are append-only. The skip-by-default behavior (§4.8) means a corrupted log at worst causes redundant generation, not data loss.
- **Concurrent runs (two `generate-siblings.ts` processes).** Not supported. The idempotency log is not file-locked; two processes might both decide a source needs generation and both fire workflows. The `parent_item_id` FK doesn't enforce uniqueness on `(parent_item_id, difficulty)` — a duplicate sibling set could land. Mitigation: documented "single-process" constraint in the script header; future round adds a lock file or per-source row-level advisory lock if concurrent runs become a need.
- **Workflow step retry races.** Per `"use step"` retry semantics, a transient failure mid-step replays the step from its arguments. If `writeSiblingSetStep` succeeds but the step return doesn't reach the workflow runtime (e.g., transient timeout), the step replays; the second insert fails on PK uniqueness for the already-written rows. The transaction is idempotent at the side-effect level (4 rows present after either path); the workflow throws on the duplicate-key error, the orchestration script records a failure, and the next run sees count=4 and skips. Acceptable shape.

## 11. Cost estimate

**LLM call cost (Anthropic Sonnet 4.6, claude-sonnet-4-6):**

- Per-call input tokens: source item (~200 tok body + options + correctAnswer + structuredExplanation prose) + system prompt with sub-type stem (~600 tok) + tool schema (~300 tok) + per-tier difficulty hints (~200 tok) ≈ **1,300 input tokens**.
- Per-call output tokens: 4 siblings × (body ~50 tok + 5 options × 8 tok + structured-explanation 3 parts × 60 tok) ≈ 4 × 270 ≈ **1,100 output tokens**.
- Per-call cost: 1,300 in × $3/M = $0.0039; 1,100 out × $15/M = $0.0165. **Per-call ≈ $0.020.**
- Total: 439 source items × $0.020 = **~$8.78** without prompt caching.

**With prompt caching (system + sub-type stem cached at 90% read):**

- Per-call cost drops to ~$0.012 (input cost drops 80%).
- Total: 439 × $0.012 = **~$5.27**.

**Embedding cost (OpenAI text-embedding-3-small):**

- 1,756 candidates × ~50 tokens each × $0.02/M = **~$0.002**.

**Aggregate estimate: $5–$10.** Headroom for retries + the 50 seed items having longer prompts (no source explanation truncation): **~$10–$15.**

**Test-run cost (commit 7 only):**

- 42 sources × $0.020/call ≈ **$0.84** (uncached).
- With prompt caching: ≈ **$0.50**.
- Negligible impact on the run-total estimate; surfaced for completeness so the test-run cost telemetry has a known plan-time anchor.

**Full-bank cost (commit 8 only, post-test-run-approval):**

- Remaining 397 sources × $0.020/call ≈ **$7.94** (uncached).
- With prompt caching: ≈ **$4.77**.
- Combined-with-test-run total: $5–$15 per the aggregate estimate above.

The architecture_plan §62 narrative ("First end-to-end candidate items land. Cost telemetry surfaces.") implies sub-phase a's primary deliverable is empirical cost data; the estimate above is plan-time only and the run-summary logs (§7.4) become the canonical cost record.

**Hard cap per §5.2 (resolved 2026-05-08): $50/run, configurable via `--max-cost-usd`.** ~3-5× headroom over the estimate.

### 11.1 Round-close empirical actual (appended at parent commit 9, 2026-05-08)

Plan-time estimate was $5–$15 (uncached–cached). Round actual cumulative cost:

| Run | Cost (LLM) |
|---|---|
| Parent commit 7 (42-source test) | ~$0.50 |
| Iteration #1 + #2 (re-runs) | ~$1.30 |
| Sub-round commit 7.5.2 (single-tier 42-source) | ~$1.30 |
| Sub-round commit 7.5.4 (b1 42-source) | ~$1.30 |
| Halted full-bank attempt (372 successful sources before halt) | $12.95 |
| 3-source CR fix smoke (60bde8e validation) | ~$0.10 |
| Resume run (65 successful + 2 failed = 67 attempts; per `989d6da`) | $2.61 |
| Antonyms cleanup (no LLM calls; pure DELETE) | $0.00 |
| **Cumulative** | **≈ $19.66** |

The actual cost is at the upper end of the plan-time estimate's headroom envelope ($10–$15) but well under the §5.2 hard cap of $50. The cost overrun against the plan-time central estimate is attributable to: (a) the iteration cycle (4 distinct full-test-set runs at 42 sources each instead of the 1 plan-time-anticipated test run); (b) the halted-then-resumed full-bank shape (372 sources processed twice — once in the halted attempt, once skip-by-idempotency in the resume — though the second pass was $0); (c) the recovery cycle's smoke runs (3-source CR fix, etc.). All three cost-overrun drivers are §6.14-captured operational lessons, not plan-time-omissions in the cost model itself.

## 12. Empirical motivation — the per-sub-type per-difficulty distribution

Audit query (run 2026-05-08 against dev DB):

```sql
SELECT sub_type_id,
  COUNT(*) FILTER (WHERE difficulty='easy')   AS easy,
  COUNT(*) FILTER (WHERE difficulty='medium') AS medium,
  COUNT(*) FILTER (WHERE difficulty='hard')   AS hard,
  COUNT(*) FILTER (WHERE difficulty='brutal') AS brutal,
  COUNT(*) AS total
FROM items
WHERE status='live'
GROUP BY sub_type_id
ORDER BY sub_type_id;
```

| sub_type_id                       | easy | medium | hard | **brutal** | total |
| --------------------------------- | ---: | -----: | ---: | ---------: | ----: |
| numerical.averages                |   10 |      7 |    1 |      **0** |    18 |
| numerical.fractions               |    4 |      4 |    1 |      **0** |     9 |
| numerical.lowest_values           |    9 |     23 |    8 |      **0** |    40 |
| numerical.number_series           |   13 |     25 |    9 |      **2** |    49 |
| numerical.percentages             |   16 |     15 |    3 |      **0** |    34 |
| numerical.ratios                  |   11 |      5 |    0 |      **0** |    16 |
| numerical.speed_distance_time     |    7 |      8 |    2 |      **0** |    17 |
| numerical.word_problems           |   13 |     14 |    2 |      **0** |    29 |
| numerical.workrate                |    2 |     12 |    1 |      **0** |    15 |
| verbal.analogies                  |   19 |     18 |    6 |      **0** |    43 |
| verbal.antonyms                   |   11 |     16 |    7 |      **1** |    35 |
| verbal.critical_reasoning         |    8 |     40 |   11 |      **0** |    59 |
| verbal.letter_series              |    5 |      7 |    4 |      **0** |    16 |
| verbal.sentence_completion        |   11 |     31 |   14 |      **3** |    59 |
| **TOTAL**                         |  139 |    225 |   69 |      **6** |   439 |

**Findings:**

- **Brutal coverage is the gaping hole.** 6 brutal items total across 14 sub-types; 11 of 14 sub-types have ZERO brutal items. Three sub-types carry the entire brutal inventory: `numerical.number_series` (2), `verbal.sentence_completion` (3), `verbal.antonyms` (1). The full-length-test fixed-curve strategy's deepest decile is structurally underserved.
- **Hard coverage has one zero cell:** `numerical.ratios` has 0 hard. Generating hard siblings for ratios sources lifts this to ≥ 11.
- **Bank pyramid is asymmetric.** Easy:Medium:Hard:Brutal at 139:225:69:6 — the hard:brutal ratio is 11.5:1, vs the medium:hard ratio of 3.3:1. Sibling generation produces uniform 4-tier coverage per source (§4.2), which moves the bank toward symmetric pyramid.
- **Smallest sub-type bank (numerical.fractions, n=9) has 1 hard, 0 brutal.** First end-to-end run (commit 7) targets this sub-type for its small size + structural representativeness (one each tier post-generation, plus the existing tier-skewed source set).
- **Coverage stats:** 50/439 source items lack `source_folder` (the seed-loader items per the testbank-re-extraction round); 389/439 carry `metadata_json.structuredExplanation`; 0/439 carry `strategy_id` (strategy-authoring round is independent and not yet shipped); 439/439 have `embedding` populated. These coverage stats inform the §5.4 source-pool filter Open Q.

**Post-round expected counts (1,756 candidate siblings written, all `status='candidate'`):**

| Tier   | Live (today) | Candidate (post-round) | Combined |
| ------ | -----------: | ---------------------: | -------: |
| easy   |          139 |                    439 |      578 |
| medium |          225 |                    439 |      664 |
| hard   |           69 |                    439 |      508 |
| brutal |            6 |                    439 |      445 |
| TOTAL  |          439 |                  1,756 |    2,195 |

Brutal moves from 6 to 445 candidates; sub-phase b's validator promotion rate determines the live count. The asymmetry inversion (brutal becoming the second-most-populous candidate tier) is a feature: brutal candidates need the most validator scrutiny, and a generous candidate pool gives the validator room to be strict.

### 12.1 Round-close post-cleanup actual (appended at parent commit 9, 2026-05-08)

Final per-sub-type-per-difficulty candidate counts after the resume run + antonyms cleanup. Bank ships to sub-phase b at **1,711 generated candidates** (1,748 pre-cleanup minus 37 antonyms convergent removals per `ed730a5`):

| sub_type_id                       | easy | medium | hard | brutal | total | note |
|-----------------------------------|-----:|-------:|-----:|-------:|------:|------|
| numerical.averages                |   18 |     18 |   18 |     18 |    72 | full coverage; 1 baseline-noise residual absorbed |
| numerical.fractions               |    9 |      9 |    9 |      9 |    36 | full coverage |
| numerical.lowest_values           |   40 |     40 |   40 |     40 |   160 | full coverage; templating artifact intact (per §6.14.36 / convergence-audit.md) |
| numerical.number_series           |   49 |     49 |   49 |     49 |   196 | full coverage |
| numerical.percentages             |   33 |     33 |   33 |     33 |   132 | 1 source residual baseline-noise (`019dfbc8-1e11`) |
| numerical.ratios                  |   16 |     16 |   16 |     16 |    64 | full coverage incl. latent 3-option source `019dfdad-f8da` (validated by 60bde8e schema fix) |
| numerical.speed_distance_time     |   17 |     17 |   17 |     17 |    68 | full coverage |
| numerical.word_problems           |   29 |     29 |   29 |     29 |   116 | full coverage |
| numerical.workrate                |   15 |     15 |   15 |     15 |    60 | full coverage |
| verbal.analogies                  |   43 |     43 |   43 |     43 |   172 | full coverage |
| **verbal.antonyms**               |   27 |     28 |   28 |     20 |   103 | **post-cleanup** (140 − 37 convergent per `ed730a5`); brutal hit hardest by SANGUINE cluster |
| verbal.critical_reasoning         |   58 |     58 |   58 |     58 |   232 | 1 source residual baseline-noise (`019dfdaf-e54a`) |
| verbal.letter_series              |   16 |     16 |   16 |     16 |    64 | full coverage |
| verbal.sentence_completion        |   59 |     59 |   59 |     59 |   236 | full coverage |
| **TOTAL**                         |  429 |    430 |  430 |    422 | 1,711 | |

**Comparison vs. plan-time projection (§12 above):**

- Plan-time projection: 1,756 candidates (439 × 4) at full coverage.
- Round-close actual: 1,711 candidates (45 fewer) — 8 candidates short from 2 baseline-LLM-noise residuals (2 sources × 4 tiers = 8) + 37 antonyms-convergence cleanup retirements per `ed730a5`.
- Tier balance is **near-square** (429/430/430/422) rather than perfectly square (439/439/439/439); the asymmetric brutal-tier dip is the antonyms cleanup signature (15 of 37 antonyms removals were brutal-tier per the SANGUINE cluster).

**Bank brutal-coverage delta** (the round's primary motivator per §12 above):

| Tier | Live (pre-round) | Live + Candidate (post-round shipped) | Delta |
|------|---:|---:|---:|
| easy | 139 | 568 | +429 |
| medium | 225 | 655 | +430 |
| hard | 69 | 499 | +430 |
| **brutal** | **6** | **428** | **+422** |
| TOTAL | 439 | 2,150 | +1,711 |

Brutal-tier coverage moves from 6 → 428 candidates (~71× growth); the gaping-hole framing in §12 is empirically addressed at sub-phase a's deliverable. Sub-phase b's validator gates promotion to live; the live-count growth is the validator round's empirical signal.

---

## Appendix — round-shape reference

This plan's structure follows the §1–§12 skeleton from the round-open brief. Closest structural precedents:

- `docs/plans/phase5-testbank-re-extraction.md` — closest structural analog (testbank-population round; multi-commit pipeline with empirical motivation).
- `docs/plans/tagger-improvement.md` — closest LLM-pipeline analog.
- `docs/plans/phase5-data-wipe.md` — `status='candidate'` pre-pin context.
- `docs/plans/practice-round.md` — most recent closed-plan structure (commit-ledger shape, decisions-section pattern).
- `docs/plans/opaque-option-ids-and-pipeline-split.md` — id-assignment seam; LLM-never-sees-ids contract.

Round-time §6.14 references invoked above:

- §6.14.18 — framework-constraint audit before pinning architectural detail at plan time. Applied at §4.7 (workflow shape verified against `embedding-backfill.ts` precedent).
- §6.14.19 — type-error-as-audit cascade pattern. Applied at §4.4 (body schema consolidation; commit 1's typecheck cascade across `item-templates.ts` consumers).
- §6.14.20 — closed-plans-immutable. This plan opens at commit 0; bounded refinement during the open-round window is permitted for Open-Q resolution and ask additions; the plan flips closed-immutable at the round-close commit (commit 9) via the wholesale-replacement-with-quote-preservation pattern. From round-close forward, the plan-doc diff stays at zero per §6.14.20.3.
- §6.14.21 — audit DB row-state against the live DB. Applied at §12 (the distribution table is from a live psql query, not from intended-state from prior commits).
- §6.14.22 — audit claims about existing code semantics against the consuming code. Applied at §1 (e.g. confirming `metadata_json.importSource` semantic from `ingest.ts` consumers, not the producer in `explain.ts`).
- §6.14.24 — lint/type-rule strictness vs spec-acceptable usage. Forward-pin: the generator's `submit_sibling_set` tool-use schema may force a `as` cast or an unused-var ignore at the SDK boundary; if so, the workaround pattern is the answer, not a `biome-ignore`.
- §6.14.25 — SQL-level NULL handling for `sql<T>` aggregate templates. Forward-pin for the per-sub-type cost-summary aggregation (commit 7's run-summary): cost-sum-over-empty is a default-meaningful (`COALESCE(SUM(...), 0)`) shape, not a misleading-default shape.
