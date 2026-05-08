# Plan — Phase 4 sibling generator, vector-similar-context sub-round (between parent commits 7 and 8)

> **Status: open. Sub-round plan-doc commit (sub-round commit 0); no code, schema, migration, or generation runs ship in this commit.** Sub-round opens against `main` at HEAD `0d3881c` (post parent-iteration #2). The parent plan (`docs/plans/phase4-similar-item-generator.md`) stays in its open-round window; this commit does NOT modify the parent plan-doc. Parent commit 8 (full-bank run, 397 remaining sources) is **paused** until this sub-round closes; the parent round-close (parent commit 9) folds the sub-round outcomes back via the wholesale-replacement-with-quote-preservation pattern (per parent §Appendix's §6.14.20 reference).
>
> Sub-round expected length: 3–4 commits (this plan-doc + code + test-run + retire-prior-candidates). If implementation grows past 5 commits, surface as a scope-creep signal at the next commit boundary.

This sub-round delivers **vector-similar-context injection** in the sibling generator. The hypothesis: pulling K nearest-neighbor items from the existing bank into the user prompt — alongside the source — shifts the LLM's task framing from "generate a polysemous antonym" to "generate a polysemous antonym not in this set," leveraging in-context-learning to mitigate the canonical-exemplar convergence that prompt iteration alone failed to address in parent iteration #2.

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

## 2. Goal

Ship vector-similar-context injection in the sibling generator: a new `loadNearestNeighborsStep` queries `items.embedding` for the K nearest neighbors within the source's sub-type (excluding the source itself + already-ingested siblings of the source), and the user prompt is extended to render those neighbors as an explicit "Existing items in this sub-type" block with anti-duplication instruction language. Re-run the same 42-source test run (parent commit 7's smoke set) and measure the convergence rate against iteration #2's baseline (3/3 SANGUINE at antonyms-brutal → target ≤ 1/3; 2/3 duplicate-body at fractions-brutal → target 0/3). After the convergence drop is approved by Leo, retire all prior-iteration generated candidates (DB rows + provenance JSON files + idempotency log) so parent commit 8's full-bank run produces 1,756 candidates from a single coherent generator configuration.

## 3. Out of scope

Explicit fences for this sub-round:

- **No change to `sibling-generator.ts`'s Anthropic call shape** beyond the user-prompt augmentation. The system prompt, tool definition, retry semantics, and cost-telemetry log shape stay untouched.
- **No change to `sibling-tool.ts`, `sibling-schema.ts`, `pricing.ts`, `sibling-provenance.ts`** beyond what the user-prompt augmentation requires (in practice: zero — the augmentation is purely on the user-prompt rendering side; provenance may optionally record the K neighbor IDs but is not required to).
- **No new validator surface.** The cosine-similarity threshold check stays at sub-phase b. This sub-round is generation-time intervention, not validation-time filter.
- **No de-novo generation flow.** Parent §3's de-novo non-goal stands.
- **No walker integration.** Parent §3's walker non-goal stands.
- **No admin review UI.** Parent §3's UI non-goal stands.
- **No arithmetic-correctness instruction.** The arithmetic-correctness check is sub-phase b's job (validator-time).
- **No cache-economics fix.** The workrate id-ASC cache outlier surfaced during iteration #2 persists; that's a separate concern.
- **No HNSW/IVFFlat index on `items.embedding`.** Parent items.ts comment ("sequential scan is faster than the index at v1 bank scale") still binds; K=8 over a sub-type-filtered <500-row pool is a sequential scan and stays fast.
- **No parent-plan-doc edit.** The parent plan-doc stays unchanged through this sub-round; the parent round-close commit (parent commit 9) folds this sub-round back in.
- **No SPEC.md edit.** Sub-round structural pattern ("mid-round sub-round insertion as bounded scope-expansion") may surface as a §6.14 candidate at parent commit 9, not at this commit.

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

## 5. Open Qs for Leo

**None.** All architecture decisions are resolved inline in §4 with rationale captured. Sub-round commit 1 is unblocked from this commit's land.

The §4.3 framework-constraint flag (no pgvector cosine-distance precedent in `src/`) is a sub-round commit 1 pre-implementation audit task, not a Leo-decision Open Q — it's a technical verification with a known fallback path (`cosineDistance` helper preferred; raw `sql<number>` template fallback). Both paths produce the same query semantics; the choice is mechanical.

## 6. Sub-round commit ledger

| # | Conventional message | Scope summary | Audit gate |
|---|---|---|---|
| 0 | `docs(plan): add vector-similar-context sub-round plan (between commits 7 and 8)` | **THIS COMMIT.** Plan-doc creation at `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md`. NO code, schema, migration, or generation runs. Parent plan-doc unchanged. | — |
| 1 | `feat(generation): vector-similar-context injection in sibling generator` | New `loadNearestNeighborsStep` in `src/workflows/sibling-generation-steps.ts` (per §4.1). Workflow wiring in `src/workflows/sibling-generation.ts` to call the new step between `loadSourceItemStep` and `generateSiblingSetStep`. `buildSiblingUserPrompt` in `src/server/generation/sibling-prompts.ts` extended to render the "Existing items in this sub-type" block (per §4.4). `scripts/generate-siblings.ts` `--neighbors-k=N` flag added (per §4.2). Pre-implementation audit task: verify the Drizzle pgvector cosine-distance surface compiles + runs (per §4.3 forward-flag). Pure additions; no breaking changes to existing call signatures. Manual one-source smoke against the same `numerical.fractions` source item used in parent commits 4/6's smokes; confirm K = 8 neighbors retrieved; confirm prompt rendering matches §4.4 shape; confirm the sibling-set still parses and writes through the existing transaction path. | One-source smoke: K = 8 neighbors retrieved, user-prompt block rendered, sibling-set written. Lint + typecheck + 97/97 tests pass. |
| 2 | `chore(data): re-run 42-source test with vector-similar-context` | `--force` re-run against the same 42 sources used in parent commit 7's test run (3 sources per sub-type × 14 sub-types). Just an orchestration-script invocation; no code change. End-of-run produces the run-summary log (cost, latency, per-sub-type breakdown) plus the 168-sibling candidate set in DB and 42 provenance JSON files. **STOP AND REPORT — Leo audits convergence rate vs iteration #2's baseline.** Specifically: cross-source-duplicate scan at antonyms-brutal (was 3/3 SANGUINE, target ≤ 1/3); cross-source-duplicate scan at fractions-brutal (was 2/3 "3/4 of 8/9 minus 1/6", target 0/3); spot-check the other 12 sub-types for any newly-introduced convergence regressions. | **LEO APPROVAL GATE.** Empirical convergence rate must drop materially before sub-round proceeds. Decision options surfaced for Leo: (a) approve sub-round commit 3, retire prior candidates, resume parent commit 8; (b) iterate K, prompt wording, or filter shape via a sub-round iteration commit; (c) abandon sub-round, revert sub-round commit 1, fall back to parent Path A (full-bank run with iteration #2's generator, accept convergence as artifact). |
| 3 | `chore(data): retire all prior-iteration generated candidates` | `DELETE FROM items WHERE source = 'generated';` (transactional; cascade-aware per the parent round's FK shape — note that no FK references `items.id` from any sibling-related parent table this round, so cascade is a non-issue). Remove `scripts/_siblings/*.json` files (per parent §4.12's per-source provenance JSON layout). Truncate `scripts/_logs/siblings-generated.jsonl` (idempotency log; per parent §4.8). **PRE-EXECUTION CONFIRMATION REQUIRED — explicit user approval at run-time before any destructive operation.** | **PRE-DELETION DB-STATE AUDIT per §6.14.21:** count rows to be deleted (expected: 168 from parent commit 7 + 168 from sub-round commit 2 = 336 candidate rows; cross-check against actual via `SELECT COUNT(*) FROM items WHERE source = 'generated';`). Surface the count to Leo + await explicit "yes" confirmation. **POST-DELETION VERIFICATION:** `SELECT COUNT(*) FROM items WHERE source = 'generated';` returns 0; `ls scripts/_siblings/*.json 2>/dev/null \| wc -l` returns 0; `wc -l scripts/_logs/siblings-generated.jsonl` returns 0 (or file removed). |

After sub-round commit 3 lands clean, the parent round resumes at parent commit 8 (full-bank run, now over a clean DB state, with vector-context-enabled generator). Parent commit 8 produces 1,756 candidates from a single coherent generator configuration — no iteration-mix in the bank.

Iteration commits between sub-round commits 2 and 3 (if Leo's audit at commit 2 surfaces a need for K-tuning, prompt-rewording, or filter-shape adjustment) are not pre-specced; each is its own redirect cycle, mirroring the parent round's iteration-commit pattern (parent §10).

## 7. Schema changes

**None this sub-round.** The `items.embedding` column (parent items.ts, populated synchronously per parent §4.10) is the consumed surface. No new column, no new index, no Drizzle migration.

The IVFFlat / HNSW index on `items.embedding` is **still deferred** per the items.ts comment ("sequential scan is faster than the index at v1 bank scale"). Sub-round commit 1's `loadNearestNeighborsStep` query is sub-type-filtered (max ~59 rows in `verbal.critical_reasoning`, the largest sub-type per parent §12) and runs as a sequential scan + sort by cosine distance. Single-query latency at this scale is well under 50ms; with 4 workflow invocations per source × 42 sources = 168 step invocations at sub-round commit 2's smoke, the sequential-scan overhead is invisible against the LLM-call latency.

If post-sub-round empirical bank size grows past ~5,000 items (well past parent post-round 2,195 estimate), the index decision should be revisited — separate concern, separate round.

## 8. Cost estimate

| Sub-round commit | Cost item | Estimate |
|---|---|---|
| 0 (this commit) | Plan-doc only; no LLM, no embeddings, no DB ops | **$0.00** |
| 1 | One-source smoke (similar to parent commits 4/6 smokes) | **~$0.04** |
| 2 | 42-source re-run with vector-context-injection | **~$1.30 – $1.50** (parent commit 7 baseline $1.289 + ~$0.15 from larger user prompts; sub-round commit 2's run-summary log surfaces actual) |
| 3 | DB-deletion + filesystem-cleanup operations | **$0.00** (no LLM calls) |
| **Sub-round total** | LLM cost only | **~$1.34 – $1.54** |

Plus a **possible** ~$1 – 2 in additional generator calls during parent commit 8's full-bank run if the per-source user prompt's neighbor block adds ~150 tokens per neighbor × K = 8 = ~1,200 tokens × 439 sources × $3 / 1M tokens = **+$1.58** worst-case uncached. Within parent §11's $5–$15 aggregate estimate; well under the $50/run hard cap.

Parent §11's hard cap of $50/run still binds. Sub-round commit 2 enforces it via the existing `--max-cost-usd` flag.

## 9. Verification per commit

Per the parent-round commit-verification template (parent §9):

- **Every commit:** `bun lint:all` passes; `bun typecheck` passes; `bun test` returns 97/97 baseline (or higher if the commit adds tests).
- **Sub-round commit 0 (this commit):** plan-doc only; lint + typecheck + 97/97 unchanged; `git status` shows only the new plan-doc file (`scripts/_logs/full-bank-output.log` was already untracked at sub-round-open and remains untracked, not introduced by this commit).
- **Sub-round commit 1:** new step's pgvector query verified to compile + run against the live deployment (per §4.3 forward-flag); one-source smoke produces K = 8 neighbors and a rendered user-prompt block; sibling-set still writes through the existing transaction path; no test-count regression.
- **Sub-round commit 2:** test-run completes; **168 candidate rows** present in DB with `source='generated'` + `status='candidate'` + `metadata_json.parentItemId` populated; **42 provenance JSON files** at `scripts/_siblings/<parentItemId>.json`; cost-summary log records the actual run cost (~$1.30 – $1.50 expected); convergence-rate measurement against iteration #2 baseline surfaced in the STOP-AND-REPORT message.
- **Sub-round commit 3:** pre-deletion confirmation logged + Leo "yes" captured; post-deletion `items WHERE source = 'generated'` count = 0; `scripts/_siblings/*.json` empty; idempotency log empty; no data leak (no row of `source = 'real'` accidentally touched — confirmed by pre-deletion + post-deletion `SELECT COUNT(*) FROM items WHERE source = 'real';` snapshot equality).

## 10. Risk / failure modes

- **Convergence rate doesn't drop materially despite vector-context injection.** This is the headline risk; the sub-round's empirical hypothesis may not hold. Mitigation: sub-round commit 2's STOP-AND-REPORT gate explicitly surfaces this as a Leo-decision branch (iterate K / prompt / filter, or abandon and revert to Path A). Bounded blast radius: at worst sub-round commit 1 is reverted, sub-round commit 2's 168 candidates are deleted via sub-round commit 3, and the parent round resumes at parent commit 8 with the iteration #2 generator. The sub-round's worst-case cost: $1.34 + delete operation = $1.34.
- **User-prompt token bloat overflows context window.** Mitigation: pgvector `LIMIT K` bounds the neighbor count; K = 8 keeps the addition at ~1,200 tokens worst-case; Sonnet 4.6's context window is 200K tokens (or 1M with the [1m] variant per the model-id reference in the environment context); the user prompt is ~3K tokens worst-case post-augmentation; ratio is < 2%. No risk.
- **Same-run write-then-query race.** Mitigation: per-source workflow already commits the DB transaction inside `writeSiblingSetStep` before returning; the next source's workflow invocation starts after the prior workflow returns; `loadNearestNeighborsStep`'s SELECT runs against post-commit state. No race possible in the parent round's single-process single-threaded orchestration model (parent §10's documented constraint).
- **Deletion at sub-round commit 3 fires against unintended rows.** Mitigation: the `WHERE source = 'generated'` filter is the canonical sibling-only filter (per parent §7.5's filterability surface). Pre-deletion audit + explicit Leo "yes" confirmation before any destructive op. Cross-check expected row count against actual; if mismatch, pause for redirect rather than proceed. The 50 seed items + 389 testbank-re-extracted items at `source = 'real'` are structurally untouchable by `WHERE source = 'generated'`; the filter is type-safe at the enum level.
- **pgvector cosine-distance Drizzle-surface incompatibility surfaces at sub-round commit 1.** Mitigation: forward-flagged in §4.3; sub-round commit 1's pre-implementation audit catches this before any code lands. Fallback path is the raw `sql<number>` template; both paths produce identical query semantics.
- **Per-source user prompt no longer cache-friendly.** Surfaced in §4.6; cost impact bounded to ~$0.15 over the 42-source smoke and ~$1.58 over the full-bank run. Within budget.
- **Iteration #2 baseline measurement was anecdotal, not run-summary-logged.** The 3/3 SANGUINE + 2/3 fractions-duplicate-body counts are from the post-iteration cross-source-duplicate verification (described in the brief). Sub-round commit 2's audit gate must apply the same measurement methodology to be apples-to-apples. Risk: methodology drift across the two measurements (different scan tooling, different threshold for "duplicate", etc.). Mitigation: sub-round commit 2's STOP-AND-REPORT explicitly cites the methodology used (e.g., body-text exact match for fractions; anchor-word match for antonyms) so Leo can verify the measurement is comparable to iteration #2's.

## 11. Closed-plan re-opening framing — how this sub-round fits §6.14.20

The parent plan-doc (`docs/plans/phase4-similar-item-generator.md`) is in its open-round window (parent commit 8 paused, parent commit 9 round-close pending). Per §6.14.20, the plan-doc is mutable during this window for bounded refinement. The parent round has already exercised this allowance once (parent commit 1's open-Q resolution edit, plus iteration commits #1 / #2's anchor de-templating).

This sub-round structurally extends §6.14.20's "open-round window for bounded refinement" pattern to a new variant: **mid-round narrow-scope sub-round insertion**. The structural shape:

- **Parent plan-doc is NOT modified by this commit.** Parent plan stays in its open-round window through parent commit 9.
- **Sub-round plan-doc is its own artifact** at `docs/plans/phase4-similar-item-generator-vector-context-sub-round.md`. Sub-round has its own commit ledger (§6 above), its own audit gates, its own cost estimate, its own risk surface.
- **Parent commit 9 (parent round-close) absorbs the sub-round outcomes** via the wholesale-replacement-with-quote-preservation pattern: the sub-round's commit ledger gets folded into the parent §8 ledger as commits 7.5.0 – 7.5.3 (or similar numbering), with the original §8 ledger preserved as a quote block per §6.14.20.3.
- **The sub-round closes BEFORE the parent commit 9 lands.** Sub-round commit 3's clean close is a pre-condition for parent commit 8's full-bank run, which is itself a pre-condition for parent commit 9's round-close.

If the sub-round closes clean within its 3 – 4-commit envelope, the extension is a §6.14 candidate at parent commit 9 ("mid-round sub-round insertion as bounded scope-expansion") — the SPEC entry framing the structural shape: when a parent round's mid-round audit surfaces a structural issue not addressable by a single iteration commit, a sub-round with its own plan-doc + commit-ledger + audit-gates can be inserted between two parent commits, provided the sub-round's scope is bounded (<5 commits) and its outcomes fold into the parent round-close commit.

If the sub-round exceeds 5 commits or fails to produce a clean close, the structural pattern was the wrong call for this case; a future round would either keep the iteration-commit pattern for similar issues or open a sibling round explicitly.

---

## Appendix — round-shape reference

Closest structural precedents:

- `docs/plans/phase4-similar-item-generator.md` — parent round; this sub-round inserts between its commits 7 and 8.
- Parent plan §10's iteration-commit pattern (parent iteration #1 / #2) — sub-round insertion is a structural cousin: same redirect-cycle-per-commit discipline, same audit-first checkpoint at each commit boundary, same STOP-AND-REPORT shape at empirical-measurement gates.
- `docs/plans/phase5-data-wipe.md` — closest precedent for the destructive-DB-op + filesystem-cleanup commit shape (sub-round commit 3).

§6.14 references invoked above:

- §6.14.18 — framework-constraint audit before pinning architectural detail at plan time. Applied at §4.3 (Drizzle pgvector cosine-distance surface; verified at sub-round commit 1's pre-implementation audit).
- §6.14.20 — closed-plans-immutable; open-round-window allowance for bounded refinement. Extended in this sub-round to mid-round narrow-scope sub-round insertion. SPEC candidate at parent commit 9 if the sub-round closes clean.
- §6.14.20.3 — closed-plan diff zero-line check. Applied at parent commit 9 against this sub-round plan-doc once it ships.
- §6.14.21 — audit DB row-state against the live DB. Applied at sub-round commit 3's pre-deletion audit (count rows to be deleted via live SELECT, not from intended-state assumption).
- §6.14.22 — audit claims about existing code semantics against the consuming code. Applied at this commit's audit-first checkpoint (verified `loadSourceItemStep` shape, workflow chain, prompt-builder shape, items.ts schema all match the round-open code state, not the parent-plan-time state).
