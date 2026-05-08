# Plan — Phase 4 similar-item generator (sub-phase a)

> **Status: open. Plan-doc commit (round commit 0); no code, schema, or migration changes shipped here.** Round opens against `main` at HEAD `977cdbe` (post §6.14 promotion sub-round). Phase 5 v1 is closed end-to-end (diagnostic + post-session + click-to-highlight + dojo + full-length + dashboard + practice surfaces all shipped); 24 unpushed commits on main; testbank carries 439 live items across the 14-sub-type taxonomy. This is the first of five sub-phases under Phase 4 (LLM question generation, feature-roadmap #4 / Round D); sub-phases b/c/d/e (validator, scorer, deployer, admin generation page) follow.

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

### 4.12 Ingest-seam reuse vs new write path

**Decision:** introduce a new `ingestSiblingSet(siblings: SiblingItemInput[], parentItemId: string)` function in a new file `src/server/items/ingest-siblings.ts`. It reuses the validation primitives from `ingest.ts` (`optionSchema`, `structuredExplanation`, `assertReferencedOptionsExist`) but not `ingestRealItem` itself, because (a) `ingestRealItem` hardcodes `status='live'` and `source='real'`; (b) `ingestRealItem` triggers the async `embeddingBackfillWorkflow` which is the wrong shape per §4.10; (c) the input contract is per-sibling-set, not per-item. The validation primitives stay shared (one `optionSchema` constant exported from `ingest.ts`, imported by `ingest-siblings.ts`) so any future drift surfaces as a typecheck error.

**Rationale:** `ingestRealItem` is the seed-loader + OCR-pipeline path; refactoring it to be parameterizable on `(status, source, parentItemId, embeddingMode)` would widen the surface for two consumers (real-ingest, sibling-ingest) and obscure the contract. A second function with shared primitives is cheaper.

### 4.13 Embedding similarity threshold for siblings — forward-pin to validator (sub-phase b); not implemented this round

**Decision:** the cosine-similarity check at PRD's 0.92 threshold is **not implemented this round**. Sub-phase a writes `candidate` rows with `embedding` populated; sub-phase b's validator runs the threshold check at validation-time. The forward-pin convention for sub-phase b (recorded here so it's not re-litigated): siblings of a given source are exempt from source↔sibling similarity comparison (siblings are by-design high-similarity to source); they are subject to sibling↔non-source-non-sibling comparison normally. Implementation of the exemption belongs in the `nearestNeighborInBank` helper that the validator calls — likely shape: `nearestNeighborInBank(subTypeId, embedding, { excludeParentItemId, excludeSiblingItemIds })`.

**Rationale:** §13 of the architecture plan reserves cosine-similarity as a validator concern, not a generator concern. Implementing the threshold inside the generator would require duplicating the helper and making sub-phase b's API unstable. The forward-pin is recorded here so when sub-phase b opens, the audit-first checkpoint surfaces the exemption decision as already-pinned rather than as a new question.

## 5. Open Qs for Leo

These items require Leo's decision before commit 1 of implementation. Each is surfaced with the recommendation and the trade-off.

### 5.1 Provenance shape — column or jsonb?

The `items` table has no parent-item linkage column today. Two options:

- **Option A: `parent_item_id uuid` column with FK to `items(id)` (nullable; NULL for non-generated items).** Indexable, FK-enforced, simple.
- **Option B: `metadata_json.parentItemId` (no schema change; key in the existing jsonb column).** No migration; adds zero new columns; all metadata stays consolidated in one jsonb. Queryability is jsonb-path-based.

**Recommendation: Option A.** Future admin generation page (sub-phase e) wants per-source-item descent queries ("show me all generated siblings of item X"); FK-enforced column queries are faster + more durable than jsonb-path queries (per the testbank-re-extraction round's Q1 redline rationale, §2(c) of `docs/plans/phase5-testbank-re-extraction.md`). Cost is one Drizzle migration commit; benefit is queryability for the lifetime of the data. **Open Q: confirm.**

### 5.2 Cost-budget kill-switch — hard cap per run?

The full-run estimate is ~$10–$45 (§11) depending on cache hit rate and explanation-included-in-tool-call shape. A runaway prompt or a prompt-caching miss could push higher. Three options:

- **Option A: $50/run hard cap, configurable via `--max-cost-usd`. Orchestration script tallies cost after each call and aborts if cumulative exceeds cap.**
- **Option B: no hard cap; rely on rate-limit + monitoring.**
- **Option C: hard cap at 2x estimate ($90), sized to absorb pricing surprises.**

**Recommendation: Option A.** The cost telemetry shape (§4.6) already tracks per-call cost; a hard cap is one additional check per call. $50 is comfortable headroom over the $10–$45 estimate; if the cap fires it's a real signal worth investigating. **Open Q: confirm cap value.**

### 5.3 Sub-type filtering — staged or all-at-once?

The 14 sub-types could be generated in one run (single Bun script invocation processing all 439 sources) or staged (one run per sub-type). Staged is operationally safer for the first run (per-sub-type quality spot-check before committing to the next sub-type's run); all-at-once is ~10x faster end-to-end.

**Recommendation: staged-default with `--sub-type=<id>` flag, all-at-once via `--all-sub-types` flag.** Implementation cost is identical (one CLI flag); the operational discipline of per-sub-type runs is valuable for the first round even if subsequent rounds run all-at-once. **Open Q: confirm staging shape.**

### 5.4 Source-pool filter — all 439 or only the 389 with structuredExplanation?

The 50 seed items lack `metadata_json.structuredExplanation`. Generating siblings from a source without a structured explanation means the generator has less context — only the `body.text`, `options[].text`, and `correctAnswer`. The generator can still produce siblings with their own structured explanation, but the cross-pollination from source-explanation to sibling-explanation is absent.

**Recommendation: generate from all 439.** The 50 seed items still carry a high-quality `body` and `options`; the LLM can produce a structured explanation for the sibling without seeing the source's. The empirical degradation (if any) shows up in sub-phase b's validator confidences and can be remedied in a future seed-backfill round. **Open Q: confirm.**

### 5.5 `correctAnswer` resolution shape

§4.5 says the generator emits `correctAnswerText` and the server resolves text→id post-`assignOptionIds`. A subtle concern: if the generator emits multiple options with identical text (low probability but non-zero), the text→id resolution is ambiguous. Two handling options:

- **Option A: reject the sibling set entirely if any duplicate option texts.**
- **Option B: resolve `correctAnswerText` to the first matching option's id; warn but accept.**

**Recommendation: Option A.** Duplicate option text is itself a bad-question signal; the validator round would reject it anyway. Failing fast at the generator's post-processing surface saves a validator-round round-trip. **Open Q: confirm.**

## 6. Schema changes

**One migration commit.** Single Drizzle migration adding:

- `parent_item_id uuid` column on `items`, nullable, with FK to `items(id) ON DELETE SET NULL`. (Pending Open Q 5.1; if Leo picks Option B, this section reduces to "none — provenance lives in `metadata_json.parentItemId`.")
- Index `items_parent_item_id_idx` on `(parent_item_id)` to support per-source descent queries.

No enum migrations. `item_difficulty` already includes `brutal`; `item_status` already includes `candidate`; `item_source` already includes `generated`. (Confirmed via `psql` audit in §12 source data; this is the load-bearing reason this round can ship without an enum migration commit.)

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
3. Build a `Map<text, id>` from the result (rejected on duplicate text per Open Q 5.5).
4. Resolve `correctAnswerText` via the map → `correctAnswer` id; reject if no match.
5. For each `structuredExplanation.parts[*].referencedOptionTexts`, resolve via the map → ids; reject on miss.
6. Assemble `IngestSiblingItemInput` and validate via the sibling-set Zod schema.
7. Compute embedding via `embedText(body.text)`.
8. Write all 4 in one transaction with `parent_item_id`, `status='candidate'`, `source='generated'`, `metadata_json.generatorModel = 'claude-sonnet-4-6'`, `metadata_json.templateVersion = 1`, `metadata_json.parentItemId = <source>` (also stored in metadata_json for redundancy with the column, matching the testbank-re-extraction round's two-place pattern for `importSource`).

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
├── pricing.ts                           # NEW: cost-estimate helper for Sonnet 4.6 pricing
└── embeddings.ts                        # EXISTING: embedText reused

scripts/
└── generate-siblings.ts                 # NEW: Bun-runnable orchestration; enumerates eligible items, fires workflow, accumulates telemetry

scripts/_logs/
└── siblings-generated.jsonl             # NEW: idempotency log keyed on parentItemId
```

Each step:

- `loadSourceItemStep(itemId)` — selects body, options, correctAnswer, explanation (optional metadata_json.structuredExplanation), sub_type_id, strategy_id.
- `generateSiblingSetStep(source)` — Anthropic call; returns parsed sibling set + usage telemetry.
- `assignIdsAndValidateStep(siblingSet)` — runs §7.2 steps 1–6 per sibling.
- `embedSiblingStep(siblings)` — 4 sequential `embedText` calls (parallelizable in step body via `Promise.all`).
- `writeSiblingSetStep(parentItemId, siblings)` — single transaction; inserts 4 rows.

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

## 8. Commit sequencing

One variable per commit per the §6.14 redirector discipline. Eight commits:

| # | Commit name | Scope | Verification gate | Dormancy |
|---|-------------|-------|-------------------|----------|
| 0 | `docs(plan): add plan for phase 4 similar-item generator (sub-phase a)` | This file. | typecheck + test + lint clean (no code changes); plan is closed-immutable per §6.14.20 once round opens (and this commit opens the round). | — |
| 1 | `feat(items): consolidate body/option Zod schemas — delete local copies in item-templates.ts` | §4.4 — delete `BodyText`, `ItemBody`, `Option`, `generatedItem` from `item-templates.ts`; rewire `itemTemplates`'s `schema` field (or remove it). All callers import from `body-schema.ts`. | Typecheck clean (callers compile); existing 79/79 tests pass; no behavior change. | Dormant: nothing consumes the deletions yet. |
| 2 | `feat(db): add items.parent_item_id column + items_parent_item_id_idx + drizzle migration` | §6 — schema migration commit. **Pending Open Q 5.1; if Option B picked, this commit collapses into commit 5's metadata writes.** | Migration applies cleanly against dev DB; existing 439 rows have `parent_item_id IS NULL`; FK constraint accepts NULL inserts. | Dormant: column unused. |
| 3 | `feat(generation): pricing.ts + sibling-tool.ts + sibling-schema.ts + sibling-prompts.ts` | Constants + schemas + tool definition + prompt builders. Pure-function surface; no LLM calls; no DB writes. | Typecheck clean; sibling-schema's Zod parsing covered by 1-2 unit tests under `src/server/generation/sibling-schema.test.ts`. | Dormant: no consumer. |
| 4 | `feat(generation): sibling-generator.ts — Anthropic call + cost-telemetry log` | LLM-call wrapper. Returns parsed sibling-set + usage. Includes `withBackoff` per `scripts/_lib/anthropic.ts`. Verified manually against one source item via a smoke. | Manual smoke (one source item, dev API key); typecheck + lint + 79/79 unchanged. | Dormant: no orchestration. |
| 5 | `feat(items): ingestSiblingSet — validation primitives + transaction-based 4-sibling write` | New `src/server/items/ingest-siblings.ts`. Reuses `optionSchema`, `structuredExplanation`, `assertReferencedOptionsExist` from `ingest.ts`. Writes 4 rows in one tx with `status='candidate'`, `source='generated'`, `parent_item_id` (and `metadata_json.parentItemId` redundancy), `embedding` set inline. | Unit tests under `src/server/items/ingest-siblings.test.ts` for the happy path, the duplicate-option-text rejection, the partial-set rejection. | Dormant: no caller. |
| 6 | `feat(workflows): sibling-generation workflow + steps (helper-extraction shape)` | `src/workflows/sibling-generation.ts` + `src/workflows/sibling-generation-steps.ts`. Workflow file's import graph stays free of `@/logger`. End-to-end against one source item via dev Next.js. | Workflow file's import graph audit (no `@/logger` reachable); manual smoke with `bun --hot ./src/index.ts` running and a curl to a smoke route firing the workflow. | Dormant: no orchestration script. |
| 7 | `feat(scripts): generate-siblings.ts — orchestration + idempotency + cost summary` | `scripts/generate-siblings.ts` + `scripts/_logs/siblings-generated.jsonl`. Honors `--sub-type`, `--all-sub-types`, `--force`, `--reset-source`, `--max-cost-usd`. End-to-end against one sub-type (smallest = `numerical.fractions` at 9 sources × 4 = 36 candidates); cost telemetry confirmed. | Run completes; 36 candidate rows present in DB with correct `parent_item_id`; cost-summary log matches expectation; lint + typecheck + 79/79 + new unit tests pass. | **First non-dormant commit;** drives the round's deliverable. |
| 8 | `docs(plan): round-close — plan-doc status flip + commit-ledger reconciliation` | Plan-doc status flip to "shipped <date>"; round-close summary; closed-plan diff zero-line check per §6.14.20; SPEC §6.14.NN candidate if a generalizable pattern surfaced. | `git diff HEAD -- docs/plans/phase4-similar-item-generator.md` returning a non-zero diff (this commit's status flip + summary edits) but every prior closed plan returning zero. | — |

**Notes:**

- Commit 7 is the round's largest scope by line count but the smallest by behavior surface — it just orchestrates already-tested seams. The dormancy chain (commits 1-6 land before any siblings are written) means each commit can be reverted independently if a bug surfaces during commit 7's smoke.
- If Open Q 5.1 resolves to Option B (metadata_json), commit 2 collapses and the commit count drops to 7. The round-close commit 8 records the collapse per §6.14.19.
- **No commit ships sibling rows other than commit 7.** Earlier commits write zero rows.

## 9. Verification per commit

Every commit:

- `bun lint:all` passes (no biome / grit / super-lint / custom-lint failures).
- `bun typecheck` passes (project-wide; `lefthook` enforces).
- `bun test` returns 79/79 baseline (or higher if the commit adds tests).

Commit-specific gates:

- **Commit 0 (this commit):** plan doc only; no code or schema changes; `git status` clean except for the new file.
- **Commit 1:** existing 79/79 still passes; no behavior change verifiable via session-engine smoke (`scripts/dev/smoke/start-session-idempotency.ts`).
- **Commit 2:** dev DB migration applies; `\d items` in psql shows new column + index; `SELECT COUNT(*) FROM items WHERE parent_item_id IS NULL` returns 439.
- **Commit 3:** new tests for sibling-schema Zod parsing; total test count moves from 79 to 80-82.
- **Commit 4:** manual smoke against one source item; cost-telemetry log inspected by hand.
- **Commit 5:** new tests under `ingest-siblings.test.ts`; total moves further.
- **Commit 6:** workflow import-graph audit; manual workflow trigger via dev server.
- **Commit 7:** end-to-end run against one sub-type (`numerical.fractions`, 9 sources); 36 candidate rows present with correct provenance; per-sub-type breakdown log; idempotency log carries 9 entries.
- **Commit 8:** closed-plan diff check zero per §6.14.20.3.

## 10. Risk / failure modes

- **LLM returns malformed JSON / fails Zod.** Per-call retry with backoff; sibling-set rejected on retry exhaustion; source skipped (per §4.9). Run-summary surfaces the failure rate; if > 10% across the run, round-close commit drafts a §6.14 entry on prompt-engineering vs Sonnet 4.6's tool-use compliance and recommends a prompt iteration before sub-phase b opens.
- **Embedding service down (OpenAI 5xx).** `embedText`'s existing error-handling throws; the workflow step retries per Vercel Workflow's `"use step"` semantics; if all retries exhaust, the sibling set is rejected per §4.10. The orchestration script's run-summary surfaces.
- **DB transaction failure mid-batch.** Single transaction at write time; PG ACID guarantees rollback on any individual insert failure. Workflow logs and re-throws.
- **Cost overrun.** §5.2 hard cap at $50 (pending confirmation). Per-call telemetry catches drift; cap fires before cost climbs past 1.1× estimate.
- **Sibling-set quality drift.** The validator round (sub-phase b) is the formal gate; this round has no quality check beyond Zod. A spot-check of 5 candidate sibling sets per sub-type before commit 7's full-bank run is the operational mitigation. If drift is > expected, prompt iteration lands as a follow-up commit before scaling to all sub-types via `--all-sub-types`.
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

The architecture_plan §62 narrative ("First end-to-end candidate items land. Cost telemetry surfaces.") implies sub-phase a's primary deliverable is empirical cost data; the estimate above is plan-time only and the run-summary logs (§7.4) become the canonical cost record.

**Hard cap recommendation per §5.2: $50/run.** ~3-5× headroom over the estimate.

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
- §6.14.20 — closed-plans-immutable. This plan flips to closed-immutable at commit 0 (round open).
- §6.14.21 — audit DB row-state against the live DB. Applied at §12 (the distribution table is from a live psql query, not from intended-state from prior commits).
- §6.14.22 — audit claims about existing code semantics against the consuming code. Applied at §1 (e.g. confirming `metadata_json.importSource` semantic from `ingest.ts` consumers, not the producer in `explain.ts`).
- §6.14.24 — lint/type-rule strictness vs spec-acceptable usage. Forward-pin: the generator's `submit_sibling_set` tool-use schema may force a `as` cast or an unused-var ignore at the SDK boundary; if so, the workaround pattern is the answer, not a `biome-ignore`.
- §6.14.25 — SQL-level NULL handling for `sql<T>` aggregate templates. Forward-pin for the per-sub-type cost-summary aggregation (commit 7's run-summary): cost-sum-over-empty is a default-meaningful (`COALESCE(SUM(...), 0)`) shape, not a misleading-default shape.
