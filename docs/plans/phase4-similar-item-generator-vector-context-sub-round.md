# Plan — Phase 4 sibling generator, vector-similar-context sub-round (between parent commits 7 and 8)

> **Status: open — Path 1 layer-2 revision. Plan-doc revision commit; no code, schema, migration, or generation runs ship in this commit.** Sub-round opened against `main` at HEAD `0d3881c` (post parent-iteration #2). Sub-round commits 1 (`5ea9708`), 2 (`062fcf9`), and 1.5 (`dfed80a`) shipped layer-1 (vector-context injection: single-tier K=8 → tier-stratified K=2-per-tier × 4 tiers). The parent plan (`docs/plans/phase4-similar-item-generator.md`) stays in its open-round window; this revision does NOT modify the parent plan-doc. Parent commit 8 (full-bank run, 397 remaining sources) remains **paused** until this sub-round closes; the parent round-close (parent commit 9) folds the sub-round outcomes back via the wholesale-replacement-with-quote-preservation pattern (per parent §Appendix's §6.14.20 reference).
>
> Sub-round revised length: **8 commits** (Path 1 layer-2 expansion). Original envelope was 3–4 commits with a "scope-creep signal at 5+" guardrail; this revision acknowledges a 2× expansion past that guardrail. See §11 for the discipline-question framing on what the doubled scope means for parent commit 9's fold-back.

This sub-round delivers **vector-similar-context defense in the sibling generator** as a two-layer architecture: (1) **layer-1 — vector-context injection** that pulls K nearest-neighbor items from the existing bank into the user prompt as do-not-duplicate exemplars (in-context-learning soft signal); and (2) **layer-2 — cosine-gated retry-on-duplicate** with an accumulated-retry-prompt that rejects duplicates post-generation and forces the model to retry with explicit prior-attempt exemplars (enforceable hard gate). Together they form defenses-in-depth against the canonical-exemplar convergence that prompt iteration alone failed to address in parent iteration #2.

## 1. Context — what's shipped, what convergence outcomes surfaced, why this path

**Parent-round commits shipped so far (parent §8 ledger, in execution order):**

- Commit 0 (`9c7210f`) — plan-doc.
- Commit 1 (`b19042a`) — plan refinement; Open-Q resolutions; test-run gate.
- Commit 2 (`d88ea13`) — body/option Zod-schema consolidation.
- Commit 3 (`a07c03f`) — `pricing.ts` + `sibling-tool.ts` + `sibling-schema.ts` + `sibling-prompts.ts` + `sibling-provenance.ts`.
- Commit 4 (`fd6fa0d`) — `sibling-generator.ts` Anthropic call.
- Commit 5 (`71a099e`) — `ingestSiblingSet` validation primitives + tx write.
- Commit 6 (`d039121`) — workflow + steps (helper-extraction).
- Commit 7 (`869d628`) — `scripts/generate-siblings.ts` orchestration + 42-source test run (168 siblings written).
- Iteration #1 (`22c421f`) — recalibrated brutal anchors against the real CCAT difficulty distribution.
- Iteration #2 (`0d3881c`) — de-templated the antonyms anchor; de-templated the ratios anchor; added option-distinctness rule + ref-text exact-match rule; added cross-source-duplicate-prevention guards.

**Convergence outcomes iteration #2 surfaced (the empirical baseline this sub-round must beat):**

After iteration #2's anchor de-templating + cross-source-duplicate-prevention guards, the post-iteration cross-source-duplicate verification showed:

- **`verbal.antonyms` brutal**: 3/3 sources converged to the SANGUINE exemplar. All three brutal siblings shared the same anchor word + the same distractor set; the surface-detail variation collapsed to near-zero across sources within the same sub-type + tier.
- **`numerical.fractions` brutal**: 2/3 sources converged to a "3/4 of 8/9 minus 1/6" body. Two of the three brutal-tier fractions siblings were body-identical save for option-text rotation.
- **All other 12 sub-types** at brutal tier: 0 cross-source duplicates surfaced.

The convergence pattern is structural, not addressable by further prompt iteration:

1. **Frequency bias.** Sonnet 4.6's pre-training corpus has a small set of canonical-exemplar items (SANGUINE for high-difficulty antonyms; the 3/4 × 8/9 − 1/6 chain for high-difficulty fractions). The model's next-token distribution leans into these exemplars when asked for a novel high-difficulty item in those sub-types. De-templating the system prompt removed the prompt's contribution to the bias but did not remove the model's prior over its training data.
2. **No counterfactual signal.** The system-prompt anti-copying language ("do not produce duplicate items") is a global constraint. Without an explicit list of items the model already produced (or items already in the bank), the model has no way to know which exemplars to avoid. The constraint is unactionable.
3. **Sub-phase b's validator does not address production-side convergence.** The validator's cosine-similarity threshold filters AFTER the generator emits; it cannot tell the generator to emit different items, only to discard ones too similar to existing items. With 3/3 SANGUINE convergence at the source, the validator would discard 2 of the 3 — leaving 1 SANGUINE sibling, not 3 distinct brutal antonyms. Generator-side fix is the only path to 3 distinct brutals.

**Why pulling vector-context forward into sub-phase a (vs deferring to sub-phase b's validator):**

Parent §4.13 forward-pinned the cosine-similarity threshold to sub-phase b's validator. The plan-time framing assumed the generator's output was the controlled variable and the validator was the filter. Iteration #2's convergence outcome flips the framing: the generator's output is the controlled variable AND the input — what the generator sees in its prompt determines what it emits. Showing the generator the bank's existing items is a generation-time intervention, not a validation-time filter. Putting it in sub-phase b would still leave the generator emitting SANGUINE 3/3 times; the validator would just throw away most of them, and the bank would remain SANGUINE-deficient at brutal.

The Path-A alternative (revert to parent commit 8, run the full-bank with iteration #2's generator, accept the convergence as a known artifact, address in sub-phase b) is structurally inadequate for the same reason: a full-bank run that converges 3/3 times in 2 sub-types produces a candidate pool whose effective brutal-antonym diversity is one item, not three, and whose effective brutal-fractions diversity is two items, not three. Sub-phase b's validator promotion rate gates on cosine threshold; convergent siblings get filtered, not converted. The bank is left with the same brutal-tier hole §12 of the parent plan motivated the round to fill.

Path B (this sub-round) addresses the convergence at its production site, before the candidate pool is materialized.

**Empirical b1-only result trajectory + Path 1 selection (added at this revision):**

Sub-round commit 1 (`5ea9708`) shipped layer-1 with single-tier K=8 cosine-distance neighbor query. Sub-round commit 2 (`062fcf9`) ran the 42-source measurement: antonyms-brutal convergence remained at 1/3 distinct (zero improvement vs iteration #2 baseline — all 3 sources still produced SANGUINE), fractions-brutal at 3/3 distinct (improvement) but with a quality cost (model produced medium-tier surface-shape brutals to differentiate from neighbor list). Diagnosis: the source-anchored cosine-distance neighbor query did not surface SANGUINE as a neighbor for an easy-tier antonyms source — SANGUINE lives in the brutal-tier output space, semantically distant from any easy-tier source's embedding. Sub-round commit 1.5 (`dfed80a`) addressed the tier-mismatch hypothesis: K=2-per-tier × 4 tiers ensures the brutal-tier convergence target (SANGUINE) is surfaced into every prompt's neighbor list regardless of where it ranks in flat cosine-distance ordering. Pre-flight verification confirmed SANGUINE rendered in the brutal-tier slot of an antonyms source's neighbor list.

The b1-only measurement was scheduled to follow but **Leo selected Path 1**: skip the b1-only measurement; build layer-2 (cosine-gated retry-on-duplicate with accumulated-retry-prompt) on top of dfed80a's foundation; produce a combined layer-1 + layer-2 measurement in one cycle. Path 1's framing: layer-1 is a **soft signal** (in-context-learning shifts model framing); layer-2 is an **enforceable gate** (cosine threshold rejects + forces retry). Together they form defenses-in-depth — layer-1 prevents most convergence; layer-2 catches what layer-1 misses; sub-phase b's validator catches what layer-2 misses (3-attempt hard cap = graceful degradation). Layer-2 is an **architectural addition** (new step + retry loop), not iterative tuning; per the redirect-cycle discipline this is one more architectural carve, not another prompt iteration. If the combined measurement at sub-round commit 4 fails the stop-condition (antonyms ≥ 2/3 distinct + LOQUACIOUS-shift ≤ 1 + other-12 clean), the discipline is to abandon to option (c) rather than iterate further.

## 2. Goal

Ship the combined layer-1 + layer-2 vector-similar-context defense in the sibling generator and run a combined measurement before the parent round resumes:

- **Layer 1 (already shipped at sub-round commits 1 + 1.5)**: tier-stratified neighbor query (K=2-per-tier × 4 tiers per `dfed80a`) injecting the K=8 nearest-neighbor items from the same sub-type into the user prompt as do-not-duplicate exemplars. In-context-learning shifts the model's task framing.
- **Layer 2 (this revision adds)**: cosine-gated post-generation duplicate check + retry-on-duplicate with accumulated-retry-prompt. After the generator produces a 4-sibling set, a new `checkDuplicatesStep` computes each sibling's embedding and queries the sub-type bank for cosine-similarity matches above a threshold (0.92 default; per-sub-type overrides at 0.97 for `numerical.lowest_values` and `verbal.letter_series` per the empirical pairwise cosine analysis surfaced in §4.9). If ANY of the 4 siblings fails the gate, the workflow regenerates the ENTIRE 4-sibling set (full-set regeneration per §4.12); the retry prompt accumulates ALL prior attempts' rejected outputs as additional do-not-duplicate exemplars (per §4.10). Hard cap: 3 attempts per sibling-set (per §4.11); if all 3 fail, accept the 3rd attempt and let sub-phase b's validator handle (graceful degradation).

Re-run the same 42-source test (sub-round commit 4) and apply the iteration #2 baseline measurement methodology unchanged. Combined-measurement stop-condition: **antonyms-brutal ≥ 2/3 distinct target words AND LOQUACIOUS-shift ≤ 1 of 3 AND other-12 sub-types clean** (0 cross-source body duplicates modulo the lowest_values/letter_series template-shape artifact previously surfaced in sub-round commit 2's measurement). If PASS, sub-round commit 5 retires all prior-iteration generated candidates and sub-round commit 6 runs full-bank generation (~$11–$13 LLM cost) with layer-1 + layer-2 enabled; parent commit 8 then resumes against a clean DB. If FAIL, abandon to option (c): revert sub-round commits 1 + dfed80a (layer-1 + tier-stratification + layer-2); choose between (c1) clean-slate cleanup before parent commit 8 with iteration #2 generator, or (c2) preserve iteration #2 outputs as candidates and proceed to parent commit 8 generating only the remaining 397 sources with iteration #2 generator.

## 3. Out of scope

Explicit fences for this sub-round (post-revision):

- **No change to `sibling-generator.ts`'s Anthropic call shape** beyond the user-prompt augmentation. The system prompt, tool definition, retry semantics WITHIN A SINGLE LLM call, and cost-telemetry log shape stay untouched. Layer-2's retry loop wraps the call at the workflow level; the inner generator function is unchanged.
- **No change to `sibling-tool.ts`, `pricing.ts`, `sibling-provenance.ts`** beyond what the layer-2 user-prompt augmentation requires (in practice: provenance MAY optionally record retry-attempt history but is not required to).
- **Layer-2 introduces a generation-time cosine-similarity gate.** **This loosens the original §3 fence ("No new validator surface").** Rationale: parent §4.13 forward-pinned the threshold for sub-phase b's POST-WRITE validator. Layer-2 reuses the same threshold value (0.92 default; per-sub-type overrides per §4.9) for generation-time PRE-WRITE rejection. The two checks are complementary defenses-in-depth, not a duplication: layer-2 rejects + forces retry (changes generation behavior); sub-phase b's validator rejects + flags candidate ineligible-for-promotion (changes promotion behavior). **Sub-phase b's validator surface remains out-of-scope this round** — only the threshold value is adopted forward into generation-time use.
- **No de-novo generation flow.** Parent §3's de-novo non-goal stands.
- **No walker integration.** Parent §3's walker non-goal stands.
- **No admin review UI.** Parent §3's UI non-goal stands.
- **No arithmetic-correctness instruction.** The arithmetic-correctness check is sub-phase b's job (validator-time).
- **No cache-economics fix.** The workrate id-ASC cache outlier surfaced during iteration #2 persists; that's a separate concern.
- **No HNSW/IVFFlat index on `items.embedding`.** Parent items.ts comment ("sequential scan is faster than the index at v1 bank scale") still binds; layer-2's per-sibling cosine-similarity query against a sub-type-filtered <500-row pool is still a sequential scan and stays fast.
- **No parent-plan-doc edit.** The parent plan-doc stays unchanged through this sub-round; the parent round-close commit (parent commit 9) folds this sub-round back in.
- **No SPEC.md edit.** Sub-round structural patterns ("mid-round sub-round insertion as bounded scope-expansion" + the discipline question on second-stage expansion past the original scope-creep guardrail) may surface as §6.14 candidates at parent commit 9, not at this commit.

## 4. Architecture decisions

Each decision below is resolved inline. Open Qs (if any) are listed in §5; ideally §5 is empty.

### 4.1 Where the vector query happens

**Decision:** new step `loadNearestNeighborsStep(sourceItem, k)` in `src/workflows/sibling-generation-steps.ts`. Returns `SiblingNeighbor[]` — a `{ id, body: ItemBody, options: { text: string }[], correctAnswerText: string, difficulty: ItemDifficulty }[]` array (text + options + correct answer; the LLM still never sees ids, matching the opaque-id pipeline-split contract). The workflow file `src/workflows/sibling-generation.ts` calls it after `loadSourceItemStep` and before `generateSiblingSetStep`. The generator receives the neighbors via an extended source-context object passed into `generateSiblingSetStep`.

**Rationale:** mirrors the parent round's helper-extraction pattern (steps live in `*-steps.ts`, workflow file stays free of `@/logger`). The step boundary makes the neighbor query durable under Vercel Workflow retry semantics — a transient pgvector / SQL failure replays the step from arguments. Putting the query inside `generateSiblingSetStep` would couple two retryable side-effects (DB query + LLM call) into one step, blurring the retry seam.

### 4.2 How many neighbors (K)

**Decision:** **K = 8.** CLI-flag-overridable in `scripts/generate-siblings.ts` via `--neighbors-k=N` (default 8, integer ≥ 0). K = 0 disables neighbor injection entirely (escape hatch for ablation runs / debug).

**Rationale:** K = 8 is small enough to keep prompt-token cost negligible (~1,200 input tokens per call worst-case at typical body+options sizing) and large enough to show the model a diversity floor without diluting its attention across too many in-context examples. Empirical sub-type bank sizes (parent §12) range from 9 (numerical.fractions) to 59 (verbal.critical_reasoning) — K = 8 fits inside the smallest bank's exclusion-set size. CLI-flag override lets a future iteration commit dial K without a code change.

### 4.3 Filter on the neighbor query

**Decision:** the SQL shape:

```sql
SELECT id, body, options_json, correct_answer, difficulty
FROM items
WHERE sub_type_id = $1               -- same sub-type as source
  AND id <> $2                       -- exclude the source itself
  AND id NOT IN (<existing siblings of source, by id>)  -- per parent §4.13's exemption
  AND embedding IS NOT NULL          -- safety; all 439 live items have embeddings, candidate-source siblings get embeddings synchronously per parent §4.10
ORDER BY embedding <=> $3::vector    -- pgvector cosine distance
LIMIT $4
```

Pool: includes same-tier AND cross-tier items (the model sees the broader sub-type bank, not just same-tier). Ordering: cosine distance ASCENDING (nearest neighbors first). LIMIT: K (default 8). Surface in Drizzle: prefer the `cosineDistance` helper from `drizzle-orm` (idiomatic, type-safe); fall back to `sql\`${items.embedding} <=> ${vector}::vector\`\`` template syntax if the helper doesn't support pgvector's `<=>` operator on Drizzle's `vector()` column type.

**Forward-flag (§6.14.18 framework-constraint to verify before sub-round commit 1):** there is **zero existing pgvector cosine-distance query precedent** in `src/` as of this commit (verified via codebase-memory `search_code` for `cosineDistance`, `vector_`, `l2Distance` — all zero matches; verified via `rg "embedding <=>" src/` — zero matches). Sub-round commit 1's pre-implementation audit must verify that the chosen Drizzle surface (`cosineDistance` helper or raw `sql<number>` template) actually compiles + runs against the Postgres 18 + pgvector v0.x deployment we have. If neither works as expected, the sub-round pauses for a redirect cycle.

**Why include cross-tier items in the pool:** the convergence pattern is sub-type-wide, not tier-bounded. SANGUINE exemplars in the training corpus are tagged "high-difficulty" but the canonical exemplar set leaks across tiers — the model's next-token bias for an "antonyms" item leans on the same exemplar pool regardless of the requested tier. Showing the model the WHOLE sub-type's existing exemplar set (across all difficulties) gives the strongest counterfactual signal. Same-tier-only filtering would let the model justify SANGUINE-as-brutal by pointing at the absence of a brutal SANGUINE in the same-tier list.

**Why the source-self exclusion and the existing-siblings exclusion:** the source is what the LLM is varying — including it in the "items to differ from" list is incoherent. Existing siblings of the source are by-design high-similarity to source (parent §4.13's exemption); their inclusion would mislead the model into thinking it must differ from its own prior siblings. Both exclusions are fundamental, not optional.

**Embedding source for the query vector:** the source item's `items.embedding` column (already populated at v1 for all 439 live items per parent §12). No fresh `embedText` call; the column's stored embedding is the query vector.

### 4.4 Where the prompt-builder change lives

**Decision:** `src/server/generation/sibling-prompts.ts` — `buildSiblingUserPrompt` is extended to accept the `SiblingNeighbor[]` array (or an empty array) and to render an "Existing items in this sub-type" block when the array is non-empty. Block placement: between the source rendering and the "Produce four siblings" call-to-action line.

Block shape (rendered text):

```
Existing items in this sub-type (the bank already contains these — your siblings must NOT duplicate any of these in body, anchor word, or option-set composition):
1. <body.text>
   Options: <opt1>; <opt2>; <opt3>; <opt4>; <opt5>
   Correct: <correctText>
2. ...
[K items total]

Your siblings must preserve the source's structural pattern (same operation, same number of decision-points, same distractor relationship to correct answer) but use DIFFERENT specific words / numbers / structures than any of the items listed above. Surface-detail collapse across sources is the failure mode this list exists to prevent.
```

The system prompt's GLOBAL anti-copying rule (added in iteration #2) STAYS as-is — the user-prompt block is additive, not a replacement. The system prompt now reads "do not produce duplicates" in general; the user prompt now reads "specifically these items already exist; do not duplicate them."

**Rationale:** keeping the user-prompt as the carrier of the per-source neighbor list preserves the system prompt's cacheability per sub-type (parent §11's prompt-caching estimate). User prompts are per-source by construction (source content varies); the neighbor list is also per-source; the cache cost story doesn't change in the right direction.

### 4.5 Already-written siblings within the same run

**Decision:** include siblings written earlier in the same run naturally via the SQL filter. Each completed source's 4 siblings are committed to `items` via `writeSiblingSetStep`'s transaction before the workflow returns; the next source's `loadNearestNeighborsStep` runs after that commit, so its `WHERE sub_type_id = $1 AND id <> $2 AND id NOT IN (...)` query sees the prior-source siblings as DB rows naturally. No code-side run-state tracking needed.

This means the run is **progressively self-correcting**: source 1 generates against the empty-of-generated-siblings bank; source 2 generates against the bank-plus-source-1's-siblings; source N generates against the cumulative bank-plus-all-prior-N-1-sources'-siblings. Convergence pressure decreases monotonically as the run progresses (in each sub-type).

**Rationale:** pgvector + commit-then-query at the workflow boundary is the simplest correctness story. No inter-source state, no race window. Single-process orchestration (per parent §10's documented constraint) means no concurrent writes; the read-after-commit pattern is safe. No retry race possible because the step boundary serializes within a single workflow invocation.

### 4.6 Cache-economics impact

**Decision:** the user-prompt neighbor block is per-source (varies with each source's K nearest neighbors), so it is NOT prompt-cacheable. The system prompt remains cacheable per sub-type per the parent round's existing pattern; the system-prompt cache hit rate stays high.

**Cost projection (sub-round commit 2's 42-source re-run):**

- Iteration #2 baseline: $1.289 over 42 sources (per parent commit 7's measured run).
- Additional input-token cost from K = 8 neighbors at ~150 tokens each = ~1,200 input tokens per call uncached.
- 1,200 tokens × 42 calls × $3 / 1M tokens = **$0.151** uncached additional cost.
- Estimated sub-round commit 2 cost: **$1.30 – $1.50** total. Well under parent §11's $50/run hard cap.

Sub-round commit 2 surfaces the actual measured incremental cost in its run-summary log; if the actual is materially above the projection, the round-close commit drafts a §6.14 entry on per-source-prompt-bloat-vs-cache-friendliness as a generator-design trade-off.

### 4.7 K = 8 returns fewer than 8 (small sub-types)

**Decision:** the SQL `LIMIT K` returns whatever's available (0..K rows). The user-prompt builder tolerates an empty or partial neighbor list — empty means the rendered block is omitted entirely (no "Existing items in this sub-type" header for an empty list). The model's instruction language adapts: a partial list is a partial counterfactual, which is the best the small-sub-type case allows.

**Edge case anchor:** `numerical.fractions` has 9 live items in the bank. The source-self exclusion drops it to 8; the existing-siblings exclusion (per parent §4.13) drops it further by 0..3 depending on prior-run state (sub-round commit 3 retires all generated candidates, so at sub-round commit 2's start the existing-siblings exclusion is 0). Net pool for fractions at K = 8: 8 neighbors at run-start, growing to 8 + (4 × prior-fractions-sources) as the run progresses through fractions sources.

**Rationale:** pgvector's `LIMIT` semantics are correct here; no need for a synthetic-neighbor pad or a "could not find K neighbors" warning. The smallest-sub-type case is real and the prompt builder's no-block-on-empty-list path is the right fallback.

### 4.8 Layer-2 retry-on-duplicate placement

**Decision:** new step `checkDuplicatesStep(siblings: ResolvedSiblingInput[], subTypeId, parentItemId, threshold): Promise<{ accepted: boolean; offenders: { tier: Difficulty; nearestNeighborId: string; similarity: number }[] }>` in `src/workflows/sibling-generation-steps.ts`. The step embeds each sibling's body via `embedText`, queries the sub-type bank (excluding the source item + already-ingested siblings of the source per parent §4.13's exemption) for the maximum cosine similarity, and rejects the set if ANY sibling's max cosine ≥ threshold. The retry loop lives in `src/workflows/sibling-generation.ts` — wraps `generateSiblingSetStep + checkDuplicatesStep` up to N=3 attempts (per §4.11 hard cap). On retry, the workflow passes the prior attempts' outputs into `generateSiblingSetStep` so the user-prompt builder can render them as additional anti-pattern exemplars (per §4.10).

**Rationale:** placing the gate at the workflow level (not inside `generateSiblingSetStep`) preserves the inner generator's single-call contract (one Anthropic call per invocation) and keeps the retry seam explicit + traceable in the per-source provenance JSON. The gate runs AFTER `assignIdsAndValidateStep` succeeds (so we're checking shape-valid siblings, not malformed ones); placing it BEFORE `embedSiblingStep` + `writeSiblingSetStep` avoids wasted DB writes on rejected sets — but the duplicate-check must compute embeddings to query, so `checkDuplicatesStep` itself does the embedding work; on accept, `embedSiblingStep` becomes redundant and is folded into `checkDuplicatesStep`'s output (the embeddings it computed for the cosine query). Embedding cost: 4 × `embedText` per attempt × ≤ 3 attempts = up to 12 embedding calls per source (vs the prior 4); negligible at OpenAI text-embedding-3-small pricing (~$0.000001/call).

### 4.9 Cosine-similarity threshold (default 0.92, per-sub-type overrides)

**Decision:** **0.92 default**, mirroring parent §4.13's sub-phase b forward-pin. Per-sub-type override capability via a new optional `duplicateCosineThreshold?: number` field in the `src/config/sub-types.ts` sub-type config. **Concrete overrides** (informed by the empirical pairwise cosine distribution from this commit's audit step 1):

- `numerical.lowest_values`: **0.97** (template-shaped body — "Which number has the lowest value?" — produces p50 cross-pair cosine of 1.0000; the audit shows half of all pairwise comparisons in this sub-type are exact-similarity duplicates by template alone. 0.92 would block legitimate items.)
- `verbal.letter_series`: **0.97** (template-shaped at higher tiers — top-3 cross-pair cosines include 0.9354 + 0.9025 for legitimate-but-similar items. 0.92 would produce false positives.)
- All other 12 sub-types: 0.92 (audit shows max cross-pair cosines well below 0.92 for non-duplicate items: antonyms-brutal max-non-clone 0.7484, fractions-brutal max 0.7521).

CLI-flag-overridable via `--duplicate-cosine-threshold=N` (decimal in [0.0, 1.0]; default = unset → use per-sub-type config; explicit value overrides config for ALL sub-types — useful for ablation runs).

**Rationale:** the threshold is empirically anchored, not picked from the air. This commit's audit step 1 ran pairwise cosine analysis on antonyms-brutal (n=6, 15 pairs), fractions-brutal (n=8, 28 pairs), lowest_values-all (n=88, 3828 pairs), letter_series-all (n=36, 630 pairs). The 0.92 threshold cleanly separates true duplicates (cosine = 1.0000 for byte-identical bodies; SANGUINE×SANGUINE pairs sit here) from legitimate semantic distinctness (max non-clone pair = 0.7484 in antonyms-brutal). The 0.97 override for template-shaped sub-types accommodates the structural reality that lowest_values + letter_series have intrinsically similar bodies; the override accepts true near-clones only and lets template variants pass.

**Caveat — fractions threshold limitation (surfaced for sub-phase b awareness):** fractions-brutal's max non-clone pair was 0.7521. The 0.92 threshold effectively no-ops in fractions: the model is unlikely to produce two fractions-brutal bodies with cosine ≥ 0.92 unless they are byte-identical. Layer-2 therefore does NOT address sub-round commit 2's fractions QUALITY concern (medium-tier surface-shape brutals). Quality vs duplication are different problems; quality stays validator-territory (sub-phase b's anchor-quality check, not layer-2's cosine gate).

### 4.10 Retry-prompt accumulation (user-prompt extension)

**Decision:** rejected attempts surfaced via user-prompt extension. `buildSiblingUserPrompt` accepts a new optional `priorRejectedAttempts: SubmitSiblingSetOutput[]` argument. When non-empty, the function renders an "Earlier rejected attempts" block AFTER the "Existing items in this sub-type" block (so the model sees in-bank exemplars first, then prior-attempt exemplars), with instruction language:

```
Earlier attempts produced the following siblings, which were rejected as duplicates of existing bank items. Do NOT produce siblings that match these or the items in 'Existing items in this sub-type' above.

Attempt 1 (rejected):
  easy:   <body>
  medium: <body>
  hard:   <body>
  brutal: <body>

Attempt 2 (rejected):
  ...
```

The block accumulates ACROSS attempts — attempt 3's prompt shows attempts 1 and 2's outputs. At hard-cap acceptance (per §4.11), the 3rd-attempt prompt shows attempts 1 and 2's outputs but NOT attempt 3's own output (the gate fails after generation, not before).

**Rationale:** mirrors layer-1's neighbor-block placement (user-prompt-side, source-specific, not cacheable). Audit step 2 considered system-prompt placement and rejected it: alternative system-prompt placement would break per-sub-type cache freshness on every retry. User-prompt placement preserves the system-prompt cache hit rate (sub-phase a's primary cost-economics anchor per parent §11). Bounded growth: at most 8 sibling bodies in the rejected-attempts block (2 attempts × 4 siblings) for a 3-attempt run; ~600 additional input tokens; well within Sonnet 4.6's context window and a small absolute cost increment.

### 4.11 Hard-cap-failure handling (accept 3rd attempt; log warning)

**Decision:** N=3 attempts per sibling-set. If all 3 attempts fail the cosine gate, accept the 3rd attempt's siblings; write to DB normally; log a `WARN`-level `"hard-cap-warning"` with structured context `{ sourceItemId, subTypeId, hardCapWarning: true, attemptsExhausted: 3, finalAttemptOffenders: [{ tier, nearestNeighborId, similarity }, ...] }`. The provenance JSON records all 3 attempts' outputs verbatim. Sub-phase b's validator subsequently sees the candidate row + its cosine score against the bank and decides per its own threshold whether to promote.

**Rationale:** matches parent §4.9's atomic-sibling-set contract — write all 4 siblings or write none. Skipping a source on hard-cap-failure breaks the per-source completion shape (the orchestration script's idempotency log would have a gap; the comparison markdown would have a missing row; sub-round commit 6's full-bank run would produce <1,756 candidates with no clean per-source completion record). The validator round (sub-phase b) is the formal gate; layer-2 is a generation-time bias-shift, not a hard quality gate. If the model genuinely cannot escape the canonical-exemplar pull even with explicit accumulated rejection, that's an architectural-failure signal — surfaced in the run-summary log's hard-cap-warning count for sub-round commit 4's audit and sub-round commit 6's full-bank report.

### 4.12 Atomic-sibling-set contract under retry (full-set regeneration on any tier duplicate)

**Decision:** any single tier failing the cosine gate causes FULL-SET regeneration on the next attempt. The model regenerates all 4 tiers (easy/medium/hard/brutal), not just the offending tier. The retry-prompt accumulates the prior attempt's full 4-sibling output as a do-not-duplicate exemplar.

**Rationale:** per-tier retry would couple two architectural surfaces — the tool-use schema's 4-tier shape (`submit_sibling_set` produces all four together) and the retry shape (which would need a single-tier variant). Full-set regeneration preserves the existing tool-use contract and the atomicity contract. The cost overhead is bounded: even at the worst-case 3 attempts × 4 siblings = 12 generations per source, it's still 1 LLM call per attempt (Anthropic produces all 4 tiers in one tool-use response), so cost overhead is per-attempt-not-per-tier. Surface explicitly so future readers don't infer per-tier retry from the architecture.

## 5. Resolved Qs (sub-round commit 0 framing: was "Open Qs for Leo: None")

Sub-round commit 0 (`40a2358`) opened with no Open Qs — all initial architecture decisions were resolved inline in §4.1–§4.7. The §4.3 framework-constraint flag (no pgvector cosine-distance precedent in `src/`) was a sub-round commit 1 pre-implementation audit task, not a Leo-decision Open Q — verified clean at sub-round commit 1's pre-implementation audit (`cosineDistance` from drizzle-orm runs at 3ms latency).

Path 1's layer-2 expansion at this revision adds four resolved decisions, captured here for the parent round-close commit's audit trail.

### 5.6 Cosine-similarity threshold for layer-2 generation-time gate

**Resolved 2026-05-08: 0.92 default, per-sub-type override capability via `duplicateCosineThreshold?: number` in `sub-types.ts`. Concrete overrides for `numerical.lowest_values` and `verbal.letter_series` at 0.97 (template-shaped body sub-types per audit step 1's empirical pairwise cosine distribution). CLI override via `--duplicate-cosine-threshold=N`.** Rationale: empirical anchor — the 0.92 threshold cleanly separates true clones (cosine = 1.0) from legitimate semantic distinctness (max non-clone pair in antonyms-brutal = 0.7484; in fractions-brutal = 0.7521); the 0.97 override accommodates structural template-shape in lowest_values + letter_series (lowest_values p50 cross-pair cosine = 1.0000 by template alone).

### 5.7 Retry-prompt accumulation placement

**Resolved 2026-05-08: user-prompt extension via new `priorRejectedAttempts: SubmitSiblingSetOutput[]` argument to `buildSiblingUserPrompt`; renders "Earlier rejected attempts" block after the "Existing items in this sub-type" block.** Rationale: preserves per-sub-type system-prompt cacheability (alternative system-prompt placement would break cache on every retry); bounded growth at ~600 input tokens worst-case for a 3-attempt run; mirrors layer-1's neighbor-block placement pattern.

### 5.8 Hard cap on retries

**Resolved 2026-05-08: N=3 attempts per sibling-set; if all 3 fail, accept the 3rd attempt's siblings and log `WARN`-level "hard-cap-warning". Sub-phase b's validator handles via post-write cosine threshold + reject.** Rationale: matches parent §4.9's atomic-sibling-set contract (write all 4 or write none); skipping breaks the per-source completion shape; layer-2 is a generation-time bias-shift, not a hard quality gate.

### 5.9 Atomic-sibling-set contract under retry (full-set regeneration)

**Resolved 2026-05-08: any tier failing the cosine gate causes full 4-sibling regeneration on the next attempt; not per-tier retry.** Rationale: preserves the tool-use schema's 4-tier-output contract + the atomicity contract; cost overhead is per-attempt-not-per-tier (1 LLM call regenerates all 4 tiers); per-tier retry would couple two architectural surfaces (tool-use schema + retry shape).

## 6. Sub-round commit ledger

Revised post Path 1 layer-2 expansion. Original 4-row table (commits 0/1/2/3) replaced with the 8-row table below. The original row meanings for commits 0/1/2 are preserved as already-shipped commits; commit 1.5 is inserted to record the b1 tier-stratification code commit; commit 3 in the original sense (retire prior candidates) is renumbered to commit 5; new commits 3/4/6 carry the layer-2 implementation, combined-measurement, and full-bank run.

| # | Conventional message | Scope summary | Audit gate |
|---|---|---|---|
| 0 | `docs(plan): add vector-similar-context sub-round plan (between commits 7 and 8)` | **(40a2358 SHIPPED.)** Plan-doc creation. NO code, schema, migration, or generation runs. Parent plan-doc unchanged. | — |
| 1 | `feat(generation): vector-similar-context injection in sibling generator` | **(5ea9708 SHIPPED — single-tier K=8.)** New `loadNearestNeighborsStep` (single cosine-distance query over the sub-type pool); workflow wiring; `buildSiblingUserPrompt` extended; `--neighbors-k=N` CLI flag. | One-source smoke (passed: K=8 neighbors retrieved, prompt rendered). |
| 2 | `chore(data): re-run 42-source test with vector-similar-context` | **(062fcf9 SHIPPED — single-tier measurement.)** `--force` re-run against 42 sources. Empirical baseline: antonyms-brutal 1/3 distinct (zero improvement), fractions-brutal 3/3 distinct (improvement) but with quality cost. Established layer-1-only insufficiency. | Establishes empirical baseline informing the b1 tier-stratification + Path 1 layer-2 expansion. |
| 1.5 | `feat(generation): tier-stratified vector-similar-context neighbor query (b1)` | **(dfed80a SHIPPED — K=2-per-tier × 4 tiers.)** `loadNearestNeighborsStep` modified to run 4 sequential cosine-distance queries (one per difficulty tier); workflow renames `neighborsK` → `neighborsPerTier`; CLI flag rename `--neighbors-k` → `--neighbors-per-tier`. | Pre-flight verification (passed: SANGUINE rendered in brutal-tier slot of antonyms source's neighbor list). |
| 3 | `feat(generation): layer-2 retry-on-duplicate with cosine gate + accumulated-retry-prompt` | **NEW.** Adds `checkDuplicatesStep` in `src/workflows/sibling-generation-steps.ts`; retry loop in `src/workflows/sibling-generation.ts` wrapping `generateSiblingSetStep + checkDuplicatesStep` up to N=3 attempts; `buildSiblingUserPrompt` extended with `priorRejectedAttempts` argument; new optional `duplicateCosineThreshold?: number` field in `src/config/sub-types.ts` with concrete overrides for `numerical.lowest_values` (0.97) and `verbal.letter_series` (0.97); `scripts/generate-siblings.ts` adds `--max-retries=N` (default 3) and `--duplicate-cosine-threshold=N` (default unset → use per-sub-type config) CLI flags. Hard-cap-failure logs `WARN`-level `hard-cap-warning` per §4.11. Provenance JSON records all attempts' outputs verbatim. Per §4.8 the gate folds embedding work that was previously in `embedSiblingStep` (the cosine query needs each sibling's embedding, so `checkDuplicatesStep` computes them once and passes them forward to `writeSiblingSetStep`); `embedSiblingStep` either becomes a no-op or is folded out. | Lint + typecheck + 97/97 tests pass. One-source smoke confirms duplicate-check fires on a known-duplicate fixture (e.g., re-generating an antonyms source that already has SANGUINE in the bank — first attempt should be cosine-rejected). |
| 4 | `chore(data): combined audit measurement re-run on 42 sources` | `--force` re-run against the 42 sources with layer-1 + layer-2 enabled (default `--neighbors-per-tier=2`, `--max-retries=3`). End-of-run produces run-summary log including new layer-2-specific metrics: per-sub-type retry rate (sources hitting retry; mean attempts), hard-cap-warning count, cosine-gate effectiveness (rejected-attempt counts by anchor word for antonyms, by body for fractions). Apply the iteration #2 baseline measurement methodology unchanged (B.1–B.5). **STOP AND REPORT — Leo audits combined-measurement outcomes.** | **LEO APPROVAL GATE.** Stop-condition: **antonyms-brutal ≥ 2/3 distinct AND LOQUACIOUS-shift ≤ 1 of 3 AND other-12 clean.** PASS → proceed to commit 5. FAIL → abandon to option (c) variant: revert commits 1 + dfed80a + 3; choose (c1) clean-slate cleanup before parent commit 8 with iteration #2 generator OR (c2) preserve iteration #2 outputs as candidates and proceed to parent commit 8 generating only the 397 remaining sources. |
| 5 | `chore(data): retire all prior-iteration generated candidates` | `DELETE FROM items WHERE source = 'generated';` (transactional). Remove `scripts/_siblings/*.json` files. Truncate `scripts/_logs/siblings-generated.jsonl`. **PRE-EXECUTION CONFIRMATION REQUIRED — explicit user approval at run-time before any destructive operation.** Gated on commit 4 PASS. | **PRE-DELETION DB-STATE AUDIT per §6.14.21:** count rows to be deleted (live `SELECT COUNT(*) FROM items WHERE source = 'generated';` against the actual DB — at sub-round commit 5 land time the count includes commits 1/2/1.5/4 outputs + any orphan rows from earlier partial runs). Surface count to Leo + await explicit "yes" confirmation. **POST-DELETION VERIFICATION:** `source = 'generated'` count returns 0; `scripts/_siblings/*.json` empty; idempotency log empty; `source = 'real'` count unchanged (snapshot equality). |
| 6 | `chore(data): full-bank generation with layer-1 + layer-2` | Full-bank run: `bun run scripts/generate-siblings.ts --all-sub-types --max-cost-usd=50` (no `--max-sources` flag). 439 sources × 4 = 1,756 candidates target. Wall-clock ~3–4 hours including retries. End-of-run produces full-bank run-summary log; per-sub-type-per-tier candidate count table; cumulative cost; retry-rate breakdown; hard-cap-warning count. After commit 6 lands, parent round resumes at parent commit 9 (round-close + plan-doc fold-back). | Lint + typecheck + 97/97 tests pass (no source changes; verification gates applied to confirm no drift). Per-sub-type-per-tier candidate count table surfaced. Hard-cap-warning rate < 10% (if higher, surface as architectural-failure signal in commit 6's report; Leo decides whether to revert layer-2 retroactively at parent commit 9). |

**Total sub-round commit count post-revision: 8 commits** (commits 0/1/2/1.5 already shipped; commits 3/4/5/6 ahead). Original envelope was 4 commits; revised envelope is 8 — a 2× expansion past the original "scope-creep signal at 5+" guardrail. See §11 for the discipline-question framing.

After commit 6 lands, the parent round resumes at parent commit 9 (round-close + plan-doc fold-back). Parent commit 8 in the original parent-round commit ledger is structurally absorbed into sub-round commit 6 (full-bank generation).

Iteration commits between commits 3 and 4 (if a layer-2 implementation issue surfaces during the smoke or first measurement attempt) are not pre-specced; each is its own redirect cycle. Per the discipline carve in §11, no iteration commits are permitted between commit 4 (combined measurement) and commit 5 (retire candidates) — the stop-condition at commit 4 is binary PASS/FAIL.

## 7. Schema changes

**None this sub-round.** The `items.embedding` column (parent items.ts, populated synchronously per parent §4.10) is the consumed surface. No new column, no new index, no Drizzle migration.

The IVFFlat / HNSW index on `items.embedding` is **still deferred** per the items.ts comment ("sequential scan is faster than the index at v1 bank scale"). Sub-round commit 1's `loadNearestNeighborsStep` query is sub-type-filtered (max ~59 rows in `verbal.critical_reasoning`, the largest sub-type per parent §12) and runs as a sequential scan + sort by cosine distance. Single-query latency at this scale is well under 50ms; with 4 workflow invocations per source × 42 sources = 168 step invocations at sub-round commit 2's smoke, the sequential-scan overhead is invisible against the LLM-call latency.

If post-sub-round empirical bank size grows past ~5,000 items (well past parent post-round 2,195 estimate), the index decision should be revisited — separate concern, separate round.

## 8. Cost estimate (revised for combined layer-1 + layer-2)

| Sub-round commit | Cost item | Estimate |
|---|---|---|
| 0 (40a2358 SHIPPED) | Plan-doc only | **$0.00** (actual) |
| 1 (5ea9708 SHIPPED) | One-source smoke (single-tier) | **$0.04** (actual: $0.0463 first run, $0.0290 cached) |
| 2 (062fcf9 SHIPPED) | 42-source re-run (single-tier) | **$1.332** (actual) |
| 1.5 (dfed80a SHIPPED) | One-source pre-flight smoke (no LLM call; DB+prompt only) | **$0.00** (actual) |
| 3 | One-source smoke for layer-2 with known-duplicate fixture | **~$0.04 – $0.10** (1–2 attempts × per-call cost; provoking the cosine gate may take 2 attempts) |
| 4 | 42-source combined-measurement re-run with layer-2 retries | **~$1.65 – $1.85** (sub-round commit 2 baseline $1.332 + retry overhead). Per audit step 3 projection: antonyms ~1.5–2× retry rate, fractions ~1.3× retry rate, other 12 sub-types ~1.05–1.10× retry rate → total LLM calls ~50–55 (vs 40 in commit 2) → cost ~$1.65–$1.85. |
| 5 | DB-deletion + filesystem-cleanup operations | **$0.00** (no LLM calls) |
| 6 | Full-bank generation with layer-1 + layer-2 | **~$11 – $13** (439 sources × per-call cost × ~1.10–1.15× retry-rate average across all sub-types; vs original full-bank estimate $10). Embedding cost (4 × N × ~3 attempts max) ≈ $0.005 — negligible. |
| **Sub-round total** | LLM cost only (commits 0+1+2+1.5+3+4+5+6 cumulative) | **~$14.00 – $16.50** |

Within parent §11's **$50/run hard cap** with material headroom (~$33+ remaining headroom after a worst-case ~$16.50 cumulative LLM spend across all 8 sub-round commits). Each commit's `--max-cost-usd=50` flag enforces the cap inline; if the combined measurement at commit 4 cost-overruns the projection, the cap fires and partial measurement is still rendered for Leo's audit at commit 4's STOP-AND-REPORT.

Embedding cost detail (informational; well under $0.01 cumulative): OpenAI text-embedding-3-small at ~$0.000001/call × 4 siblings × ~3 attempts max × (42 commit-4 sources + 439 commit-6 sources) ≈ $0.0058. Out of cap-binding consideration.

## 9. Verification per commit

Per the parent-round commit-verification template (parent §9):

- **Every commit:** `bun lint:all` passes; `bun typecheck` passes; `bun test` returns 97/97 baseline (or higher if the commit adds tests).
- **Sub-round commit 0 (this commit):** plan-doc only; lint + typecheck + 97/97 unchanged; `git status` shows only the new plan-doc file (`scripts/_logs/full-bank-output.log` was already untracked at sub-round-open and remains untracked, not introduced by this commit).
- **Sub-round commit 1:** new step's pgvector query verified to compile + run against the live deployment (per §4.3 forward-flag); one-source smoke produces K = 8 neighbors and a rendered user-prompt block; sibling-set still writes through the existing transaction path; no test-count regression.
- **Sub-round commit 2:** test-run completes; **168 candidate rows** present in DB with `source='generated'` + `status='candidate'` + `metadata_json.parentItemId` populated; **42 provenance JSON files** at `scripts/_siblings/<parentItemId>.json`; cost-summary log records the actual run cost (~$1.30 – $1.50 expected); convergence-rate measurement against iteration #2 baseline surfaced in the STOP-AND-REPORT message.
- **Sub-round commit 1.5 (dfed80a SHIPPED):** lint + typecheck + 97/97 unchanged; pre-flight verification confirmed SANGUINE rendered in brutal-tier slot of antonyms source's neighbor list; tier-stratified queries return per-tier counts via the new `perTier: { easy: N, medium: N, hard: N, brutal: N }` log line.
- **Sub-round commit 3 (NEW):** lint + typecheck + 97/97 unchanged; one-source smoke against an antonyms source confirms layer-2's duplicate-check fires (cosine gate rejects an attempt where a sibling's body cosine ≥ 0.92 against an in-bank exemplar); retry-prompt accumulation verified (the 2nd attempt's user prompt visibly contains the 1st attempt's rejected output rendered in the "Earlier rejected attempts" block); hard-cap-warning log fires correctly when a synthetic 3-attempts-all-fail scenario is provoked (e.g., via `--duplicate-cosine-threshold=0.5` to force aggressive rejection).
- **Sub-round commit 4 (NEW):** test-run completes; ≤168 candidate rows in DB across the 42 sources (some sources may be hard-cap-warning-accepted; row count is per-source × 4 = ≤168); 42 provenance JSON files; cost-summary log records actual run cost (~$1.65–$1.85 expected); convergence-rate measurement against iteration #2 baseline surfaced in STOP-AND-REPORT message; layer-2-specific metrics surfaced (per-sub-type retry rate, hard-cap-warning count, cosine-gate effectiveness by anchor word for antonyms / by body for fractions).
- **Sub-round commit 5 (renumbered from original commit 3):** pre-deletion confirmation logged + Leo "yes" captured; post-deletion `items WHERE source = 'generated'` count = 0; `scripts/_siblings/*.json` empty; idempotency log empty; no data leak (no row of `source = 'real'` accidentally touched — confirmed by pre-deletion + post-deletion `SELECT COUNT(*) FROM items WHERE source = 'real';` snapshot equality).
- **Sub-round commit 6 (NEW):** full-bank run completes; ≤1,756 candidate rows in DB (full-set if 0 hard-cap-warning-failures; less if some sources skip on architectural failure rather than hard-cap-accept); 439 provenance JSON files; full-bank cost-summary log; per-sub-type-per-tier candidate count table surfaced; hard-cap-warning rate surfaced. If hard-cap-warning rate ≥ 10%, surface as architectural-failure signal in commit 6's report; Leo decides at parent commit 9 whether to accept commit 6's outputs as candidates or revert layer-2 retroactively.

## 10. Risk / failure modes

- **Convergence rate doesn't drop materially despite vector-context injection.** This is the headline risk; the sub-round's empirical hypothesis may not hold. Mitigation: sub-round commit 2's STOP-AND-REPORT gate explicitly surfaces this as a Leo-decision branch (iterate K / prompt / filter, or abandon and revert to Path A). Bounded blast radius: at worst sub-round commit 1 is reverted, sub-round commit 2's 168 candidates are deleted via sub-round commit 3, and the parent round resumes at parent commit 8 with the iteration #2 generator. The sub-round's worst-case cost: $1.34 + delete operation = $1.34.
- **User-prompt token bloat overflows context window.** Mitigation: pgvector `LIMIT K` bounds the neighbor count; K = 8 keeps the addition at ~1,200 tokens worst-case; Sonnet 4.6's context window is 200K tokens (or 1M with the [1m] variant per the model-id reference in the environment context); the user prompt is ~3K tokens worst-case post-augmentation; ratio is < 2%. No risk.
- **Same-run write-then-query race.** Mitigation: per-source workflow already commits the DB transaction inside `writeSiblingSetStep` before returning; the next source's workflow invocation starts after the prior workflow returns; `loadNearestNeighborsStep`'s SELECT runs against post-commit state. No race possible in the parent round's single-process single-threaded orchestration model (parent §10's documented constraint).
- **Deletion at sub-round commit 3 fires against unintended rows.** Mitigation: the `WHERE source = 'generated'` filter is the canonical sibling-only filter (per parent §7.5's filterability surface). Pre-deletion audit + explicit Leo "yes" confirmation before any destructive op. Cross-check expected row count against actual; if mismatch, pause for redirect rather than proceed. The 50 seed items + 389 testbank-re-extracted items at `source = 'real'` are structurally untouchable by `WHERE source = 'generated'`; the filter is type-safe at the enum level.
- **pgvector cosine-distance Drizzle-surface incompatibility surfaces at sub-round commit 1.** Mitigation: forward-flagged in §4.3; sub-round commit 1's pre-implementation audit catches this before any code lands. Fallback path is the raw `sql<number>` template; both paths produce identical query semantics.
- **Per-source user prompt no longer cache-friendly.** Surfaced in §4.6; cost impact bounded to ~$0.15 over the 42-source smoke and ~$1.58 over the full-bank run. Within budget.
- **Iteration #2 baseline measurement was anecdotal, not run-summary-logged.** The 3/3 SANGUINE + 2/3 fractions-duplicate-body counts are from the post-iteration cross-source-duplicate verification (described in the brief). Sub-round commit 2's audit gate must apply the same measurement methodology to be apples-to-apples. Risk: methodology drift across the two measurements (different scan tooling, different threshold for "duplicate", etc.). Mitigation: sub-round commit 2's STOP-AND-REPORT explicitly cites the methodology used (e.g., body-text exact match for fractions; anchor-word match for antonyms) so Leo can verify the measurement is comparable to iteration #2's.

**Layer-2-specific risks (added at this revision):**

- **Cosine threshold 0.92 produces false positives in template-shaped sub-types.** lowest_values' p50 cross-pair cosine is 1.0000; letter_series' top-3 cross-pair cosines include 0.9354 + 0.9025 for legitimate items. A flat 0.92 threshold would reject most output in these sub-types as "duplicate," forcing all 3 attempts to fail and triggering hard-cap-warning at every source. Mitigation: per-sub-type override capability (§4.9), with concrete 0.97 overrides for both `numerical.lowest_values` and `verbal.letter_series`. The empirical pairwise cosine analysis informing these overrides is captured in §4.9's rationale.
- **Retry rate exceeds projection; sub-round commit 4 cost overruns.** Audit step 3's projection assumes ~50–55 LLM calls (vs commit 2's 40). If the retry-prompt accumulation doesn't shift model behavior, the model could hit the 3-attempt cap on every source — pushing total calls toward 42 × 3 = 126, cost ~$4.20 (vs $1.65–$1.85 projected). Mitigation: `--max-cost-usd=50` fires; partial measurement still rendered. The architectural-failure signal is "hard-cap-warning rate is high" — surfaced in commit 4's audit report regardless of whether the cost cap fires.
- **Hard-cap-failure rate is high (e.g., > 20% of sources fail all 3 attempts).** Generator can't escape canonical-exemplar pull even with explicit accumulated rejection. This is the architectural-failure signal: defenses-in-depth at the generation-time layer is insufficient. Mitigation: sub-round commit 4's STOP-AND-REPORT surfaces; Leo decides whether to abandon to (c) (revert layer-1 + layer-2; fall back to validator-only at sub-phase b) or accept partial improvement (PASS the stop-condition arithmetic but flag for sub-phase b's validator to handle the residual).
- **LOQUACIOUS-shift confirmed: model migrates from SANGUINE template to LOQUACIOUS template under retry pressure.** This is the "anti-pattern surfacing seeds new convergence" failure mode previously flagged at the b1 code commit's pre-flight (LOQUACIOUS surfaces at brutal-tier slot 7 alongside SANGUINE at slot 8). If the cosine gate rejects SANGUINE (which it will — body identical to in-bank SANGUINE × 4), the model picks LOQUACIOUS (which IS in the brutal-tier neighbor list, so the model has visibility into it as an anti-pattern, but the model treats listed items as templates rather than avoidance targets). Mitigation: the stop-condition explicitly tracks LOQUACIOUS-shift as a separate metric (≤ 1 of 3); if confirmed, abandon to (c) regardless of strict 2/3-distinct arithmetic, surfaced in commit 4's STOP-AND-REPORT decision options.

## 11. Closed-plan re-opening framing — how this sub-round fits §6.14.20

The parent plan-doc (`docs/plans/phase4-similar-item-generator.md`) is in its open-round window (parent commit 8 paused, parent commit 9 round-close pending). Per §6.14.20, the plan-doc is mutable during this window for bounded refinement. The parent round has already exercised this allowance once (parent commit 1's open-Q resolution edit, plus iteration commits #1 / #2's anchor de-templating).

This sub-round structurally extends §6.14.20's "open-round window for bounded refinement" pattern to a new variant: **mid-round narrow-scope sub-round insertion**. The structural shape:

- **Parent plan-doc is NOT modified by this commit.** Parent plan stays in its open-round window through parent commit 9.
- **Sub-round plan-doc is its own artifact** at `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md`. Sub-round has its own commit ledger (§6 above), its own audit gates, its own cost estimate, its own risk surface.
- **Parent commit 9 (parent round-close) absorbs the sub-round outcomes** via the wholesale-replacement-with-quote-preservation pattern: the sub-round's commit ledger gets folded into the parent §8 ledger as commits 7.5.0 – 7.5.3 (or similar numbering), with the original §8 ledger preserved as a quote block per §6.14.20.3.
- **The sub-round closes BEFORE the parent commit 9 lands.** Sub-round commit 3's clean close is a pre-condition for parent commit 8's full-bank run, which is itself a pre-condition for parent commit 9's round-close.

If the sub-round closes clean within its 3 – 4-commit envelope, the extension is a §6.14 candidate at parent commit 9 ("mid-round sub-round insertion as bounded scope-expansion") — the SPEC entry framing the structural shape: when a parent round's mid-round audit surfaces a structural issue not addressable by a single iteration commit, a sub-round with its own plan-doc + commit-ledger + audit-gates can be inserted between two parent commits, provided the sub-round's scope is bounded (<5 commits) and its outcomes fold into the parent round-close commit.

If the sub-round exceeds 5 commits or fails to produce a clean close, the structural pattern was the wrong call for this case; a future round would either keep the iteration-commit pattern for similar issues or open a sibling round explicitly.

**Discipline-question framing — second-stage expansion past the original guardrail (added at this revision):**

The original sub-round commit 0 framing established a 3–4-commit envelope with "scope-creep signal at 5+." This revision expands the envelope to 8 commits — a 2× expansion past that guardrail. The expansion is structural (Path 1 layer-2 is an architectural addition, not iterative tuning), but the doubling of scope is itself a signal worth surfacing for parent commit 9's audit-trail.

Two outcomes are possible at commit 4's combined-measurement STOP-AND-REPORT:

- **PASS path (commit 4 stop-condition met):** parent commit 9's §6.14 fold-back reads as "**generation-time vs validation-time defenses-in-depth, with empirical evidence informing sub-phase b's threshold tuning**" — a successful structural extension. The doubled scope is justified by the empirical convergence drop; the commit ledger shows defenses-in-depth resolving an issue that single-layer interventions could not.
- **FAIL path (commit 4 stop-condition not met):** parent commit 9's §6.14 fold-back reads as "**sub-round expanded twice (single-tier → tier-stratified b1 → layer-2 retry-on-duplicate); both expansions empirically inconclusive; validator was the right architectural answer all along**" — a documented mis-investment. The doubled scope produces a documented learning rather than a working defense. The discipline carve is that the commit ledger explicitly commits to the abandonment path (option c) at commit 4 FAIL rather than iterating further, preventing a third expansion.

**Either outcome is informative.** The discipline is to commit to the abandonment path if commit 4 fails the stop-condition rather than iterating further — no third expansion, no retry-of-retry, no refinement of the retry-prompt accumulation shape. Layer-2 is the last carve; what follows commit 4 FAIL is option (c) cleanup, not option (b) further iteration. This pre-commitment is the structural complement to the doubled scope: if defenses-in-depth at generation time is the right architectural shape, the empirical data should show it; if not, the discipline is to acknowledge the mis-investment in parent commit 9's fold-back as a §6.14 entry on bounded-vs-unbounded sub-round expansion patterns.

---

## Appendix — round-shape reference

Closest structural precedents:

- `docs/plans/phase4-similar-item-generator.md` — parent round; this sub-round inserts between its commits 7 and 8.
- Parent plan §10's iteration-commit pattern (parent iteration #1 = `22c421f`; iteration #2 = `0d3881c`) — sub-round insertion is a structural cousin: same redirect-cycle-per-commit discipline, same audit-first checkpoint at each commit boundary, same STOP-AND-REPORT shape at empirical-measurement gates.
- Sub-round commit 1.5 (`dfed80a`) — the b1 tier-stratification code commit; established the K=2-per-tier × 4 tiers neighbor query that layer-2 builds on.
- `docs/plans/phase5-data-wipe.md` — closest precedent for the destructive-DB-op + filesystem-cleanup commit shape (sub-round commit 5, renumbered from original commit 3).

§6.14 references invoked above:

- §6.14.18 — framework-constraint audit before pinning architectural detail at plan time. Applied at §4.3 (Drizzle pgvector cosine-distance surface; verified at sub-round commit 1's pre-implementation audit) and at §4.9 (cosine threshold pinning verified against this commit's empirical pairwise cosine analysis on antonyms-brutal, fractions-brutal, lowest_values, letter_series — anchoring the 0.92 default + 0.97 per-sub-type overrides in measured data, not plan-time assumption).
- §6.14.20 — closed-plans-immutable; open-round-window allowance for bounded refinement. Extended in this sub-round to mid-round narrow-scope sub-round insertion. **Further extended at this revision to second-stage expansion past the original 3–4-commit envelope into an 8-commit envelope (Path 1 layer-2 expansion).** Both extensions are SPEC candidates at parent commit 9 if the sub-round closes clean (or as a discipline-question entry if commit 4 fails the stop-condition per §11).
- §6.14.20.3 — closed-plan diff zero-line check. Applied at parent commit 9 against this sub-round plan-doc once it ships.
- §6.14.21 — audit DB row-state against the live DB. Applied at sub-round commit 5's pre-deletion audit (count rows to be deleted via live SELECT, not from intended-state assumption — at commit 5 land time the DB will carry commits 1/2/1.5/4 outputs + any orphan rows from the partial full-bank run noted in sub-round commit 2's pre-flight discrepancy finding).
- §6.14.22 — audit claims about existing code semantics against the consuming code. Applied at this commit's audit-first checkpoint (verified `loadNearestNeighborsStep` post-`dfed80a` tier-stratified shape, workflow chain, prompt-builder shape, items.ts schema all match the post-b1 code state, not the original sub-round commit 0's plan-time state).
