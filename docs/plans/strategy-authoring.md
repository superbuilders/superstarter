# Strategy authoring — content round for the 3 unauthored sub-types

> **Status: planning, approved, not yet implemented.** Round opens against `main` at HEAD `047faff` post-phase5-dojo-belt-indicator-close. This is the sixth operational round in Phase 5: taxonomy-restructure (`1710a91`) → data-wipe (`54775a9`) → testbank-re-extraction (closed `9c99103` + round-close) → adaptive-walker (closed `58b2b10`) → tagger-improvement (closed `4b84299` + round-close) → dojo-belt-indicator (closed `047faff`) → this round.
>
> Operational content-authoring round to close the strategy-library gap left over from the taxonomy-restructure round's Q4 resolution. Closes the `Partial<Record<SubTypeId, ...>>` typing in `src/config/strategies.ts` by populating `numerical.workrate`, `numerical.speed_distance_time`, and `numerical.lowest_values` with three strategy entries each (one per `kind` enum value: `recognition` / `technique` / `trap`), bringing the strategy library from 33 entries × 11 sub-types to 42 entries × 14 sub-types under the same per-sub-type discipline.
>
> Closed-immutable per SPEC §6.14.20 once written. Audit-against-actual-artifact per §6.14.18 binds. The §2 audit findings reproduced against the live dev DB at plan-write are captured in `scripts/_logs/strategy-authoring-baseline-2026-05-07.txt`.
>
> **Round-close summary.** *Pending.*

---

## 1. Why this round, why now

The taxonomy-restructure round (`docs/plans/phase5-taxonomy-restructure.md`, closed 2026-05-04) restructured the v1 sub-type taxonomy from 11 to 14 sub-types. Three of the new numerical sub-types — `numerical.workrate`, `numerical.speed_distance_time`, and `numerical.lowest_values` — were intentionally omitted from `src/config/strategies.ts` per Q4 of that round, with the type narrowing from `Record<SubTypeId, StrategyEntry[]>` to `Partial<Record<SubTypeId, StrategyEntry[]>>` and the seed script (`src/db/scripts/seed-strategies.ts`) gaining an `if (!entries) continue` guard. That pin deferred the strategy-authoring work to a separate round so the taxonomy round could ship config + schema-seed cleanly without blocking on content.

Three predecessor rounds have since landed:

- **Testbank re-extraction round** (`docs/plans/phase5-testbank-re-extraction.md`) — re-ran the OCR pipeline under the new taxonomy and repopulated the seed bank. The bank now has live items in all 14 sub-types.
- **Tagger improvement round** (`docs/plans/tagger-improvement.md`) — broadened the `workrate` rule, sharpened the `ratios` carve-out, and re-tagged the full bank. The two non-brutal zero cells flagged in the testbank-re-extraction round-close (`numerical.workrate.easy` and `numerical.lowest_values.hard`) populated to 2 and 8 items respectively. All 3 unauthored sub-types now have empirical depth across multiple difficulties (per §2(d)).
- **Phase-5 sub-phase 1 (post-session review)** — shipped `<StrategySurface>` (`src/components/post-session/strategy-surface.tsx`) and the strategy-selection module (`src/server/post-session/strategy-selection.ts`). The post-session shell consumes one strategy per struggled sub-type, with kind preference driven by failure mode (fast-wrong → `trap`, slow-wrong / slow-but-right → `recognition`, `technique` as fallback).
- **Phase-5 sub-phase 2 (adaptive walker)** — shipped the difficulty-walker that serves items from the bank. The walker degrades gracefully to sister-tier when a (sub-type × tier) cell is empty, but pedagogy improves when fallback is the exception.

The remaining gap: a user who completes a drill in any of the 3 unauthored sub-types and triggers the "struggled" condition (accuracy < 70% OR median latency > sub-type threshold) sees their sub-type silently dropped from `<StrategySurface>` because the selection function's `strategiesForSubType === undefined || .length === 0` guard short-circuits with no entry to surface. The post-session shell's "Strategies to review" section either renders empty (if the user only struggled with these 3 sub-types) or renders an incomplete subset (if they struggled with a mix that includes some authored and some unauthored).

This round is bounded in scope: 9 new strategy entries authored against the existing schema; no schema changes; no UI changes; no walker behavior changes; no taxonomy changes; no expansion of the 3-entries-per-sub-type convention. The round opens with a doc-and-audit-baseline commit (per the testbank-re-extraction precedent), then a content-authoring commit (config + seed-script run), then a cross-doc reconciliation commit (PRD §6.4 + SPEC §4.2 + feature-roadmap.md L204 flip "11 currently-authored sub-types" → "14"), then plan-close.

---

## 2. Audit findings

> **Audit per SPEC §6.14.18 + §6.14.21.** Findings reproduced against the live dev DB and the on-disk source as of 2026-05-07.

### 2(a) `strategies` table schema

```
                       Table "public.strategies"
   Column    |         Type          | Collation | Nullable | Default
-------------+-----------------------+-----------+----------+----------
 id          | uuid                  |           | not null | uuidv7()
 sub_type_id | character varying(64) |           | not null |
 kind        | strategy_kind         |           | not null |
 text        | text                  |           | not null |
Indexes:
    "strategies_pkey" PRIMARY KEY, btree (id)
    "strategies_sub_type_idx" btree (sub_type_id)
Foreign-key constraints:
    "strategies_sub_type_id_sub_types_id_fk" FOREIGN KEY (sub_type_id) REFERENCES sub_types(id)
Referenced by:
    TABLE "items" CONSTRAINT "items_strategy_id_strategies_id_fk" FOREIGN KEY (strategy_id) REFERENCES strategies(id)
```

The `strategy_kind` enum values are `{recognition, technique, trap}` (`SELECT enum_range(NULL::strategy_kind);`). There is **no `ordering` / `position` / `difficulty` / `tier` column** — entries are keyed by `(sub_type_id, kind)` semantically, though the pair is not enforced by a UNIQUE index (per SPEC §3 / `strategies.ts`). The on-disk source schema at `src/db/schemas/catalog/strategies.ts` matches the live shape verbatim. The `items.strategy_id` foreign key exists but is unused at present (no item populates it; the bank's `strategy_id` column is fully NULL). This means strategies are surfaced *post-session* via the struggled-sub-type derivation, not *per-item* via a foreign-key reference. The new entries do not need to satisfy any per-item linkage discipline.

### 2(b) Existing strategy-entry distribution

```
        sub_type_id         | count
----------------------------+-------
 numerical.averages         |     3
 numerical.fractions        |     3
 numerical.number_series    |     3
 numerical.percentages      |     3
 numerical.ratios           |     3
 numerical.word_problems    |     3
 verbal.analogies           |     3
 verbal.antonyms            |     3
 verbal.critical_reasoning  |     3
 verbal.letter_series       |     3
 verbal.sentence_completion |     3
(11 rows)
```

Confirmed: 11 sub-types × 3 entries = 33 rows. The 3 unauthored sub-types (`numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values`) have zero rows each — they do not appear in the `GROUP BY` output. Cross-tabulating against `kind`:

```
        sub_type_id         |    kind     | count
----------------------------+-------------+-------
 numerical.averages         | recognition |     1
 numerical.averages         | technique   |     1
 numerical.averages         | trap        |     1
 ...
```

Every authored sub-type has exactly one entry per kind. Total = 11 sub-types × 3 kinds × 1 entry each = 33. The discipline is "exactly one entry per `(sub_type_id, kind)` pair." The new 9 entries follow the same shape: 3 sub-types × 3 kinds × 1 entry each = 9.

### 2(c) Existing-entry content discipline

All 33 entries pulled from `SELECT sub_type_id, kind, text FROM strategies ORDER BY sub_type_id, kind` and read end-to-end. Implicit discipline extracted across six axes:

- **Length** — 1-2 sentences, ~18 to ~45 words per entry (range observed: from `verbal.sentence_completion.technique` at 18 words ("On double-blank questions, eliminate any option whose first word fails before evaluating the second word.") to `numerical.percentages.recognition` at 28 words). SPEC §6.4 confirms "Each entry is 1–2 sentences." Recognition tends shortest, trap moderate, technique often longest because techniques carry a worked formula or substitution template.
- **Tone** — Imperative second-person dominant ("Read the target word", "Don't pick an option", "Anchor every fraction"), with descriptive third-person for tactic explanations ("'Up 50% then down 50%' lands at 75% of the original, not 100%"). No first-person. No marketing-tone hedging ("you might want to consider"); direct.
- **Structure** — Single tactic-sentence + a parenthetical concrete-example or numeric-anchor. Concrete-anchor examples: `(7/13 < 1/2, 14/15 ≈ 1)`, `(A=1, B=2, …)`, `(3:2 means 3 cats per 2 dogs)`, `(David west of Katrina; Nathan west of David → N-D-K)`, `(×3 for 30%, ×7 for 70%)`. The anchors are load-bearing — they're the difference between a generic test-prep tip and a sub-type-specific tactic.
- **Cadence** — Three *orthogonal* tactics per sub-type, not three drilldowns of one tactic. The kind enum encodes the orthogonality: **`recognition`** = how to spot the problem's structure quickly; **`technique`** = how to compute/solve it efficiently once spotted; **`trap`** = the most common error or distractor pattern. Reading across all 11 authored sub-types confirms the discipline holds — recognition entries lead with parsing/identifying ("Skim the question for the units it asks for"), technique entries lead with a computational tactic ("Compute the delta from the mean and redistribute"), trap entries lead with a warning ("Don't reflexively find a common denominator").
- **Specificity** — Concrete to the sub-type's problem patterns; not generic test-taking advice. Each entry references operators, numeric anchors, or named pitfalls specific to the sub-type. Generic advice (e.g., "read carefully", "manage your time") never appears.
- **Ordering significance** — None at the column level (no `ordering` field). Semantic role is carried entirely by `kind`. The strategy-selection module (`src/server/post-session/strategy-selection.ts:65`) selects exactly one entry per struggled sub-type via `pickOneStrategy`, with primary/fallback kind preference driven by `deriveFailureMode`. The `<StrategySurface>` component sorts the *displayed list* by section (verbal-first) then alphabetical sub-type displayName — not by kind.

### 2(d) Sample items per unauthored sub-type

Pulled via `SELECT difficulty, body->>'text' FROM items WHERE sub_type_id = '…' AND status='live' ORDER BY difficulty, id`. Live-item difficulty distribution:

```
          sub_type_id          | difficulty | count
-------------------------------+------------+-------
 numerical.lowest_values       | easy       |     9
 numerical.lowest_values       | medium     |    23
 numerical.lowest_values       | hard       |     8
 numerical.speed_distance_time | easy       |     7
 numerical.speed_distance_time | medium     |     8
 numerical.speed_distance_time | hard       |     2
 numerical.workrate            | easy       |     2
 numerical.workrate            | medium     |    12
 numerical.workrate            | hard       |     1
```

All three sub-types have ≥1 item per difficulty post-tagger-improvement. Bank depth is sufficient to ground the strategy authoring.

**`numerical.workrate` patterns observed (sample of 8 stems):**

- *Unit-rate scaling:* "If 8 parts take 20 minutes to make, how many minutes does it take to make 6 parts?" (easy — the canonical example pinned in tagger-improvement commit 3.6's prompt rubric).
- *Unit-rate scaling, decimal output:* "A printer prints 12 pictures in 28 minutes. How long would it take the printer to print 9 pictures?" (easy).
- *Combined-work canonical (1/A + 1/B = 1/T):* "Pipe A fills a tank in 6 hours; pipe B fills it in 12 hours. If both run together, how long do they take to fill the tank?" (medium).
- *Ratio-of-rates with cross-rate scaling:* "Julie delivers 3 letters in 5 mins, and Lucia delivers 4 letters in 3 mins. How many letters will Lucia deliver while Julie is delivering 18 letters?" (medium).
- *Combined-work, find-one-rate-given-the-pair:* "Emily 7h alone; with Marcus 4h together; how long does Marcus take alone?" (medium — requires solving 1/7 + 1/M = 1/4 for M).
- *Resource-required from rate × time × demand:* "1500 houses, 9:30–13:30, 80% have mail, each postman 60 houses/h. How many postmen?" (medium).
- *Combined-work with one rate expressed as a multiple:* "Layla 3h; Hellen takes twice as long; together?" (medium).
- *Pipe in/pipe out (signed rates):* implied by the bank's medium tier — combined-work where one rate subtracts.

Three problem-pattern clusters: (i) unit-rate scaling (proportional), (ii) combined-work `1/A + 1/B = 1/T` (additive rates), (iii) cross-rate scaling between two workers operating in parallel.

**`numerical.speed_distance_time` patterns observed (sample of 8 stems):**

- *Linear scaling at constant speed:* "A train travels 60 miles in 1.5 hours. At the same speed, how far does it travel in 4 hours?" (easy).
- *Compute-time from distance + speed:* "If a car travels at 65 miles per hour, how many hours will it take to travel 520 miles?" (easy).
- *Compute-arrival-time from departure + speed + distance:* "Jesse walks at 4 km/h; school 3 km away; needs to be there at 3pm; what time should she leave?" (easy — and the inverse: "Jody leaves 08:30 at 5 mph, arrives 09:06, what's the distance?").
- *Compute-average-speed:* "A runner completes a 10 km race in 50 minutes. What is the average speed in km/h?" (easy).
- *Two-mover relative position:* "Dan walks 100 m in 1 min; Peter walks 400 m in 5 min. How far ahead after 10 min?" (easy — degenerate, both walk at 100 / 80 m/min, gap derives from rate-difference × time).
- *Unit-conversion-heavy:* "A rocket travels 2 km per ¼ second. How many km in 7 seconds?" (medium — cleanly proportional, but the time-unit fragment is the trap).
- *Upstream / downstream (compound rates):* "Boat 120 km downstream in 4 hours; stream speed 5 km/h; speed of boat in still water?" (easy — but tier-edge; requires recognizing that `downstream_rate = boat + stream`).

Three problem-pattern clusters: (i) `distance = speed × time` solved-for-the-missing-variable, (ii) unit-conversion (km↔miles, hours↔minutes, seconds↔fractions of seconds), (iii) compound-rate scenarios where the surface speed splits into a vehicle component plus a medium component (upstream/downstream, with-wind/against-wind).

**`numerical.lowest_values` patterns observed (sample of 14 stems across difficulties):**

The stem is uniformly "Which number has the lowest value?" or its inverse "Which number has the highest value?" — the comparison universe lives entirely in `options_json`. Sampled options:

- *Pure decimal arithmetic comparison:* `[".3 * .5", ".4 – .15", ".25+ .18", ".6 – .41"]` (easy — multiply two small decimals vs subtract).
- *Mixed decimal / fraction / arithmetic-expression comparison:* `["0.03", "3/10", "0.3", "0.2+0.15", "2/3"]` (easy — comparing across notations).
- *Fraction-of-quantity comparison:* `["1/8 of 32", "1/9 of 27", "2/7 of 21", "1/6 of 30", "2"]` (easy — each option computes to a small integer).
- *Inverse direction (highest):* `["3×0.03", "2×0.03", "2×0.025", "0.3×0.2", "5×0.01"]` (easy — same family, find the largest).
- *Decimal-vs-fraction with fractional ½-anchor:* `["0.6", "2/3", "5/6", "0.5", "0.674"]` (easy).
- *Multi-step subtraction (sample from 12min_lowest_value q03):* "lowest of `.4-1/4, .55-1/3, .38-1/5, .75-4/6`" (medium — each subtraction crosses a decimal-fraction boundary).
- *Cross-multiplication comparison (q09):* "lowest of `2/11, 3/15, 4/18, 5/16`" (medium — pairwise cross-multiply).
- *Multi-step multiplication (q12):* "lowest of `.25*.5, .15*.15, .1*.2, .3*.6`" (medium — each option multiplies two small decimals).

Three problem-pattern clusters: (i) cross-notation comparison (decimals vs fractions vs arithmetic-expressions), (ii) compute-each-option-then-compare (where the expressions resolve to comparable scalars), (iii) anchor-and-eliminate (use a reference point — ½, 1, a known integer — to discard candidates without computing).

### 2(e) Strategy-surface render confirmation

`<StrategySurface>` (`src/components/post-session/strategy-surface.tsx`) is `"use client"` and purely presentational. It receives `strategies: ReadonlyArray<SurfacedStrategy>` already pre-selected upstream — one entry per struggled sub-type — and renders a list with `displayName` prefix in `font-medium` followed by the strategy text. The list sorts by section (verbal first) then alphabetical by `displayName`; **kind is not a sort key at render time**. The empty-state branch renders `"No sub-types flagged this session — keep going."` when the array is length-zero. There is no per-kind UI distinction (no badge, no icon, no copy-cadence change between recognition / technique / trap entries) — the kind affects which entry is selected upstream, not how it's displayed.

The selection logic (`src/server/post-session/strategy-selection.ts`):

- `deriveStruggledSubTypes(accuracy, latency)` returns the list of sub-types where the user's session accuracy < 70% OR median latency > the sub-type's `latencyThresholdMs` from `src/config/sub-types.ts`.
- `buildStruggleContexts(...)` maps each struggled sub-type to a `FailureMode`: `fast-wrong` (low accuracy + within latency threshold), `slow-wrong` (low accuracy + over threshold), `slow-but-right` (within-accuracy + over threshold), or `not-struggled`.
- `preferredKind(mode)` returns `{ primary, fallback }`: fast-wrong → `(trap, technique)`; slow-wrong → `(recognition, technique)`; slow-but-right → `(recognition, technique)`.
- `pickOneStrategy(strategies, mode)` picks the first entry matching `primary`, falls back to `fallback`, then last-resort to "any strategy that exists for this sub-type."
- `selectStrategiesForStruggledSubTypes(...)` orchestrates: for each struggled sub-type, look up the strategies (via `groupStrategiesBySubType`), and if `strategiesForSubType === undefined || strategiesForSubType.length === 0` then `continue` (silently drop the sub-type).

The selection logic guarantees a `kind` of each variety must exist for the sub-type to render any entry under any failure mode without falling through to "any" (the last-resort branch). **This is the load-bearing constraint on the new entries: each of the 3 sub-types needs one of each kind.** Without all three kinds, the failure-mode → kind preference becomes lossy (a fast-wrong session falls through to "any" if no `trap` exists). The discipline enforced by §2(b)'s "exactly one entry per `(sub_type_id, kind)` pair" thus carries forward naturally.

### 2(f) Schema-evolution check

`src/config/strategies.ts` is currently typed as `Partial<Record<SubTypeId, ReadonlyArray<StrategyEntry>>>`, with a header comment naming the three pending sub-types and pointing at this round. `src/db/scripts/seed-strategies.ts:24-25` reads `strategyConfig[subTypeId]` and continues if `!entries`. After authoring, two distinct paths are open:

- **Path A (recommended):** Flip the type to full `Record<SubTypeId, ReadonlyArray<StrategyEntry>>` once all 14 sub-types are populated. This makes the type-system enforce completeness — any future taxonomy add will fail-loud at typecheck if its strategies are not authored. The `if (!entries) continue` guard in `seed-strategies.ts` becomes structurally unreachable but stays in place as defense-in-depth (low cost, removable in a follow-up cleanup if desired).
- **Path B:** Leave as `Partial<Record<...>>` indefinitely. Lower-risk if future taxonomy adds will routinely defer strategy authoring; higher risk of strategy-library gaps going unnoticed.

§8 adopts Path A as a recommendation; the type tightening is part of commit 2 (the same commit that adds the entries).

The `strategy_views` table referenced in earlier rounds was dropped in v1-code-cleanup commit 4 (per SPEC §3.4 + §3.5 callouts) — irrelevant to this round; flagging only because grep'ing for "strategies" in SPEC.md surfaces it.

---

## 3. Content-discipline pins (load-bearing)

The 9 new entries must satisfy the discipline extracted in §2(c). Decisions, not options:

| Axis | Pin | Source |
|------|-----|--------|
| **Length** | 1–2 sentences, ~18–45 words per entry. Aim for ~25 words median, matching the 33 existing entries' shape. | §2(c); SPEC §6.4. |
| **Tone** | Imperative second-person primary; descriptive third-person for tactic explanation. No first-person, no hedging. | §2(c). |
| **Structure** | Single tactic-sentence with a concrete numeric anchor or worked-example phrase in parentheses (or after an em-dash). The anchor is load-bearing. | §2(c). |
| **Cadence** | Three orthogonal tactics per sub-type, one per kind. Recognition = parse-fast tactic; technique = compute-efficiently tactic; trap = error-pattern warning. | §2(c) + §2(e). |
| **Specificity** | Tactic refers to operators, numeric anchors, or pitfalls *specific to the sub-type's problem patterns* surfaced in §2(d). Generic test-prep advice is disqualifying. | §2(c) + §2(d). |
| **Ordering significance** | None at the data level (no `ordering` column). `kind` carries semantic role. Each `(sub_type_id, kind)` pair has exactly one entry. | §2(a) + §2(b) + §2(e). |
| **Punctuation** | The existing entries use real Unicode characters (em-dash `—`, multiplication `×`, division `÷`, approximation `≈`) directly, not ASCII placeholders. Match this — the post-session surface renders them verbatim. | §2(c). |

---

## 4. New entries' content design (framework only)

The plan does not pin the exact text of the 9 entries — that is commit-time work (§5). It pins the framework that each entry must satisfy: which sub-type problem-pattern grounds the tactic, and which kind it slots into.

### 4.1 `numerical.workrate` — 3 entries

Tactic-to-kind mapping informed by §2(d)'s three problem-pattern clusters:

- **`recognition`** — Tactic must distinguish unit-rate-scaling problems (linear / proportional shape: "if 8 parts take 20 min, how long for 6") from combined-work problems (additive-rates shape: "1/A + 1/B = 1/T"). Recognition tactic: skim for whether the problem describes one rate scaled by a quantity (proportional) vs two rates running in parallel (additive). The CCAT canonical example "If 8 parts take 20 minutes to make, how many minutes does it take to make 6 parts?" lives here per the tagger-improvement round's commit-3.6 rubric.
- **`technique`** — Tactic must address combined-work computation. The closed-form `1/A + 1/B = 1/T → T = (A·B)/(A+B)` is the workhorse for two-worker combined-work. Cross-rate scaling between two parallel workers ("how many letters does Lucia deliver while Julie does 18") reduces to a ratio-of-rates × known-quantity computation.
- **`trap`** — Tactic must address the most common workrate error: averaging the rates instead of inverting them. "If A takes 6h and B takes 12h, together they take (6+12)/2 = 9h" is the textbook wrong-answer; the correct answer is `(6·12)/(6+12) = 4h`. The trap entry warns against arithmetic-mean intuition on rates.

### 4.2 `numerical.speed_distance_time` — 3 entries

Tactic-to-kind mapping informed by §2(d)'s three problem-pattern clusters:

- **`recognition`** — Tactic must reduce every SDT problem to the `d = s × t` relationship and identify the missing variable. Recognition tactic: read the question for the *unit it asks for* (km, hours, mph) and the two given quantities; the missing one is the answer.
- **`technique`** — Tactic must address unit-conversion. Most CCAT SDT problems mix units (km/h with minutes, mph with miles, m/s with km). The technique entry pins a unit-normalization step before the arithmetic: convert both given quantities to compatible units (typically the unit the question asks for) before computing.
- **`trap`** — Tactic must address compound-rate scenarios (upstream/downstream, with-wind/against-wind) where the surface rate decomposes into vehicle-rate ± medium-rate. The trap is to use the surface rate where the vehicle's still-water (or no-wind) rate is required.

### 4.3 `numerical.lowest_values` — 3 entries

Tactic-to-kind mapping informed by §2(d)'s three problem-pattern clusters:

- **`recognition`** — Tactic must recognize that the question's stem ("Which has the lowest value?") is uniform across the bank; the work is in the options. Recognition tactic: scan the options' notation mix (decimals, fractions, arithmetic expressions, fraction-of-quantity) before computing — the comparison strategy depends on the notation mix.
- **`technique`** — Tactic must address anchor-and-eliminate. Use a reference point (½, 1, a known integer) to discard candidates without computing each one in full. Cross-multiplication for two-fraction comparisons; estimation for decimal multiplication ("`0.3 × 0.2 ≈ 0.06`, so it's smaller than `0.5`"). Avoids the trap of computing every option exactly.
- **`trap`** — Tactic must address direction-flips. Some items are phrased as "lowest" and some as "highest"; misreading the direction is the most common error on this sub-type. Also: notation traps (mistaking `0.03` for `0.3`, mistaking `1/9` for `1/8`).

### 4.4 Cross-references with the established discipline

Each of the 9 entries authored at commit 2 must:

1. Match the §3 length / tone / structure / cadence / specificity pins;
2. Slot into one of the three `kind` enum values, with each sub-type getting exactly one of each kind;
3. Reference at least one concrete numeric anchor or worked-example phrase from §2(d)'s sampled-item patterns;
4. Survive a side-by-side read against three randomly-sampled existing entries from §2(c) without feeling stylistically off.

The framework above is what commit 2 satisfies. The exact wording is commit-time work.

---

## 5. Authoring approach

**Decision: LLM-assisted draft + hand-curation, single pass.**

Rationale:

- The existing 33 entries' style — idiomatic English, specific numeric anchors, concrete operator references, occasional irreverent register ("Don't fall in love with the first pattern that fits two terms") — is consistent with hand-authored writing or carefully-curated LLM output. The taxonomy-restructure round's plan-close summary ("3 entries × 11 currently-authored sub-types … distilled from `docs/CCAT-categories.md`") confirms the existing entries were generated based on example problems and reference material; no commit-history evidence pins authored-vs-generated unambiguously, but the discipline is consistent enough that LLM-with-curation is plausible.
- Hand-authoring 9 entries is feasible (~1 hour of focused work) and gives the strongest discipline control. LLM-assist with parity prompting (provide all 33 existing entries as exemplars, the 3 sub-types' problem-pattern clusters from §2(d), and the §3 / §4 constraints, then hand-curate the output) is faster and gives better consistency to the existing 33 entries than freehand authoring.
- The cost envelope is sub-$1 either way (9 short generations at any current Claude model tier; e.g., Sonnet 4.6 at ~$3/$15 per Mtok costs cents for a single 33-exemplar prompt). Negligible.

The **recommended workflow** for commit 2:

1. Construct a prompt containing: all 33 existing entries verbatim grouped by sub-type, the §2(d) sample-item patterns for the 3 unauthored sub-types, the §3 discipline pins, and the §4 tactic-to-kind mapping. Ask for 9 entries (3 per sub-type, one per kind) matching the discipline.
2. Read the output entry-by-entry. Discard / re-roll any entry that fails the §3.4 cross-discipline check (length, tone, structure, cadence, specificity, punctuation).
3. Hand-edit any entry that's structurally right but stylistically off (a phrase choice, a worded anchor, an operator).
4. Side-by-side spot-check: read each new entry against 3 random existing entries from the same kind across other sub-types. Confirm tonal parity.
5. Land in `src/config/strategies.ts` in the same alphabetical grouping the existing config uses (the `Partial<Record>` body is grouped verbal-first then alphabetical by sub-type — the new 3 numerical sub-types insert in the appropriate slots).

Single pass — no iterative re-rolls beyond initial discard. If the first LLM pass produces output that fails §3 in more than ~3 entries, the round falls back to hand-authoring (§8 Q2 captures this fallback).

---

## 6. Schema / seed insertion path

**Decision: edit `src/config/strategies.ts` + run `bun run src/db/scripts/seed-strategies.ts` against the dev DB. No migration.**

Rationale:

- The existing 33 entries live in `src/config/strategies.ts` (a TS-config file) and are seeded into the DB via `src/db/scripts/seed-strategies.ts`. The seed script uses deterministic UUIDv7 (`deterministicUuidv7(\`strategy:${subTypeId}:${index}\`)`) and `onConflictDoUpdate` keyed on `strategies.id`, making the script idempotent — re-running it inserts new rows for newly-added sub-types and updates any existing rows whose text changed.
- A migration would be the wrong shape: strategies are seed data, not schema. The schema (table + columns + enum + FK + index) is unchanged.
- The flow at commit 2:
  1. Edit `src/config/strategies.ts`: add three entries each for `numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values`. Tighten the type from `Partial<Record<SubTypeId, ReadonlyArray<StrategyEntry>>>` to `Record<SubTypeId, ReadonlyArray<StrategyEntry>>` per §2(f) Path A.
  2. Update the comment block at the top of `strategies.ts` (lines 10–15) — remove the `Partial<Record>` rationale paragraph, replace with a one-line note that all 14 sub-types are now authored and pointing at this round's plan.
  3. Run `bun run src/db/scripts/seed-strategies.ts` against the dev DB. Expect log output `{ total: 42 }` — 33 existing UPSERT'd cleanly + 9 new INSERT'd.
  4. Verify post-run: `psql … -c "SELECT sub_type_id, count(*) FROM strategies GROUP BY sub_type_id ORDER BY sub_type_id;"` shows 14 rows × 3 entries = 42.
- The `if (!entries) continue` guard in `seed-strategies.ts:25` becomes structurally unreachable but stays in place as defense-in-depth — removing it is a separate optional cleanup.

The same insertion path was used for the existing 33 entries (per `seed-strategies.ts`'s shape and the commit history of `src/config/strategies.ts`); this round follows the established convention.

---

## 7. Verification protocol

This round's verification is content-quality + completeness, not behavior-correctness. Specific gates:

### 7.1 Lint / typecheck / test gates

- `bun lint` clean.
- `bun typecheck` clean. The `Partial<Record>` → `Record` tightening at §6 is the only type-shape change; `seed-strategies.ts`'s `if (!entries) continue` guard handles `entries: ReadonlyArray<StrategyEntry> | undefined` cleanly even after the tightening (the guard becomes structurally unreachable, not a type error).
- `bun test` count holds at the post-data-wipe baseline (37/37 pre-tagger-improvement; the tagger-improvement round closed at 49/49 per its §11; the testbank-re-extraction round closed at 60/60 per the local commit history hint of "bun test 60/60 holds" in feature-roadmap.md). Expected count at this round's open: pull from the pre-round audit at commit-1's body. **No test surface changes anticipated** — strategy entries are data, not behavior. If any test references the 11-sub-types-with-strategies count or asserts `strategies.has(subTypeId) === false` for the unauthored 3, that test pre-dates this round and gets updated as part of commit 2's cascade. (None known at plan-time; surface during commit-1 audit.)

### 7.2 Post-authoring strategy-table state

```sql
SELECT sub_type_id, count(*)
FROM strategies
GROUP BY sub_type_id
ORDER BY sub_type_id;
```

Must show 14 rows. Each `count = 3`. No sub-types missing.

```sql
SELECT sub_type_id, kind, count(*)
FROM strategies
WHERE sub_type_id IN ('numerical.workrate','numerical.speed_distance_time','numerical.lowest_values')
GROUP BY sub_type_id, kind
ORDER BY sub_type_id, kind;
```

Must show 9 rows. Each `count = 1`. One row per `(sub_type_id, kind)` pair across `{recognition, technique, trap}`.

### 7.3 Per-entry length consistency

Manual spot-check at commit 2: each new entry's word count is between 18 and 45, with median target ~25. A small dev-only assertion (`bun -e "..."`) reading from `src/config/strategies.ts` and emitting per-entry word counts is acceptable but not required.

### 7.4 Per-entry alignment with §4 tactic-to-kind mapping

Manual spot-check at commit 2: read each entry against §4.1 / §4.2 / §4.3 and confirm the entry slots into the correct (problem-pattern-cluster × kind) cell. Specifically:

- `numerical.workrate.recognition` references unit-rate-vs-combined-work distinction (or the canonical "8 parts in 20 min" example).
- `numerical.workrate.technique` references the closed-form `(A·B)/(A+B)` or its equivalent setup.
- `numerical.workrate.trap` warns against averaging rates instead of inverting.
- `numerical.speed_distance_time.recognition` references reading-for-units-asked or the missing-variable-of-`d=s×t`.
- `numerical.speed_distance_time.technique` references unit-normalization.
- `numerical.speed_distance_time.trap` references compound-rate decomposition (upstream/downstream, with/against wind).
- `numerical.lowest_values.recognition` references options-notation-scanning.
- `numerical.lowest_values.technique` references anchor-and-eliminate / cross-multiplication / estimation.
- `numerical.lowest_values.trap` references direction-flips (lowest vs highest) or notation-confusion.

### 7.5 Per-entry tonal parity vs existing 33

Manual spot-check at commit 2: for each new entry, read against three random existing entries (one from each kind, drawn from any of the 11 authored sub-types). Confirm: imperative second-person tone matches; concrete-anchor structure matches; sentence length within range.

### 7.6 Strategy-surface render check (live drill)

End-to-end smoke against the dev environment:

1. `bun --hot ./src/index.ts` (dev server up).
2. Sign in to the dev account.
3. Run `/practice/numerical.workrate/drill` to completion. Force a "struggled" condition by intentionally answering ≥30% of items wrong (or running slow enough to exceed the sub-type's `latencyThresholdMs`). Reach the post-session surface.
4. Verify `<StrategySurface>` (selector: `[data-testid="post-session-strategy-surface-section"]`) renders the new `numerical.workrate` entry. The kind selected depends on failure mode; any of recognition / technique / trap is acceptable as long as one renders.
5. Repeat steps 3–4 for `numerical.speed_distance_time` and `numerical.lowest_values`.
6. Optional: run a mixed-sub-type session (the diagnostic-mix path) and verify the "Strategies to review" section shows entries for *all* struggled sub-types in the verbal-first-then-alphabetical sort, with no gaps where the 3 previously-unauthored sub-types would have been silently dropped.

The render check is observational; no automated assertion. The smoke confirms the round's user-facing impact.

### 7.7 Live-DB audit per SPEC §6.14.21

Out-of-band, after commit 2 lands:

```sql
-- post-authoring distribution
SELECT sub_type_id, count(*) FROM strategies GROUP BY sub_type_id ORDER BY sub_type_id;
-- expect 14 rows × 3 entries

SELECT count(*) FROM strategies;
-- expect 42

-- distinct (sub_type_id, kind) pairs
SELECT count(DISTINCT (sub_type_id, kind)) FROM strategies;
-- expect 42

-- no orphans (sub_type_id values not in sub_types.id)
SELECT s.sub_type_id FROM strategies s LEFT JOIN sub_types st ON s.sub_type_id = st.id WHERE st.id IS NULL;
-- expect 0 rows (FK already enforces; sanity check)
```

If any query diverges from expected, halt commit-2 close and reconcile. The data-wipe-needed pattern (per SPEC §6.14.NN, captured 2026-05-06) applies if the dev DB carries stale rows from a prior attempted seed; preferred resolution is `DELETE FROM strategies` followed by full re-seed, rather than UPSERT-only.

---

## 8. Sequencing and commits

**4 commits total.** Probable shape:

1. **Commit 1 — `docs(plans): open strategy-authoring round; capture audit baseline`.** Writes this plan to `docs/plans/strategy-authoring.md`. Captures §2 audit findings reproduced against live DB at commit time (in the plan body, since the plan is closed-immutable per SPEC §6.14.20 once written — the audit baseline lives in §2 of this very document). No code changes. No DB changes.
2. **Commit 2 — `feat(strategies): author 9 new strategy entries; seed dev DB; tighten Partial<Record> → Record`.** Edits `src/config/strategies.ts`: adds 3 entries each for `numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values`, totaling 9 new entries. Tightens the type from `Partial<Record<SubTypeId, ReadonlyArray<StrategyEntry>>>` to `Record<SubTypeId, ReadonlyArray<StrategyEntry>>`. Updates the file's header comment to remove the deferred-authoring rationale. Runs `bun run src/db/scripts/seed-strategies.ts` against the dev DB and includes the post-run state in the commit body (`14 sub-types × 3 entries = 42 strategies`). Lint / typecheck / test gates per §7.1 must pass.
3. **Commit 3 — `docs(spec+prd+roadmap): flip "11 currently-authored sub-types" → "14"; close strategy-library gap`.** Three-way cross-doc reconciliation per the resolution-7 invariant from the taxonomy-restructure round: PRD §6.4, SPEC §4.2, `docs/plans/feature-roadmap.md` L204. Replaces "3 entries × 11 currently-authored sub-types — 5 verbal + 6 numerical, excluding `numerical.workrate`, `numerical.speed_distance_time`, and `numerical.lowest_values`, which are pending a separate strategy-authoring round" with "3 entries × 14 sub-types — 5 verbal + 9 numerical (42 total)." Stylistic phrasing varies; semantically identical across the three living docs. SPEC §3 strategy-table description ("Three strategies per sub-type seeded from `src/config/strategies.ts`") loses the parenthetical exclusion list. Cross-doc verified at commit-3 close.
4. **Commit 4 — `docs(plan): close strategy-authoring round; reconcile findings`.** Updates this plan's round-close summary at the top of §0 (the blockquote header) and any §11-style findings section (added if any cross-cutting lessons surfaced during commits 2–3 worth carrying forward into the next round's plan-time reading). Per `~/.claude/CLAUDE.md`, even a quiet round earns a tracking entry; the §11 lessons section is added at commit-4 close and not before.

**Conditional Commit 5 — `chore(diagnostic-mix): revert workrate-easy + lowest_values-hard tier substitutions`** — out of scope for this round per §9, listed here only as a reminder of the follow-up candidate.

The 4-commit projection assumes commit 2 succeeds in its single LLM-pass-with-hand-curation path. If commit 2 falls back to hand-authoring (per §8 Q2's fallback clause), the projection holds at 4; the per-commit time scales but the structure is unchanged.

---

## 9. Out of scope

- **Phase-5 sub-phase 3 (continuous mode) and sub-phase 4 (test simulation).** Independent surfaces; orthogonal to strategy authoring.
- **Visual-regression test infrastructure.** Independent.
- **`isTextOnly` filter relaxation.** Independent.
- **Walker behavior.** Settled in sub-phase 2 (post-session-review round); the walker degrades gracefully on empty cells, and this round's 9 new entries do not change walker selection.
- **Tagger / classifier behavior.** Settled in the tagger-improvement round; this round consumes the bank as-is.
- **Schema migrations on `strategies`.** Out of scope; the table shape supports the 9 new rows without any schema change.
- **Re-authoring or revising the existing 33 entries.** Out of scope; this round is purely additive. Any tonal drift surfaced during the §7.5 parity check that points at an existing entry rather than a new one is a candidate for a future operational round, not this one.
- **UI changes to `<StrategySurface>`.** Out of scope; the new entries render via the existing component verbatim. Per-kind UI distinction (badges, icons, copy-cadence change) is an open-ended design question, not a content-completeness fix; out of scope here.
- **New strategy entries beyond the 9.** The 3-entries-per-sub-type convention is established by the existing 33; this round preserves it. Authoring a 4th entry per sub-type, or per-difficulty entries, requires a schema change (an `ordering` or `difficulty` column) and a UI change to `<StrategySurface>`'s selection logic; out of scope.
- **Tier-specific or difficulty-keyed strategies.** Out of scope; entries are sub-type-keyed only per the existing schema.
- **`diagnostic-mix.ts` tier-substitution revert.** Per `docs/plans/tagger-improvement.md` §10, the testbank-re-extraction round commit 5 substituted `numerical.workrate` easy → medium and `numerical.lowest_values` hard → medium in the diagnostic mix because those cells were empty at the time. The tagger-improvement round populated those cells (workrate.easy: 0 → 2; lowest_values.hard: 0 → 8), so the substitutions are now technically unnecessary. Reverting them is a hand-curated edit on a calibration-critical file and is independent of strategy authoring; out of scope here. Candidate for a follow-up operational round (potentially bundled with commits 4 + 5 above as a single chore round).
- **Wiring `items.strategy_id`.** Per §2(a), the FK exists but no item populates it. Wiring it would be a per-item linkage feature requiring extract/tagger pipeline changes; orthogonal to this round.
- **Per-difficulty strategy variants.** Out of scope; the post-session selection logic does not consume difficulty.
- **Production deploy.** Gated on Leo's no-deploy-until-feature-complete decision per the testbank-re-extraction round's framing; this is dev-only.

---

## 10. Open questions / resolutions

The plan's audit (§2) resolves most of the structural questions surfaced in the prompt's open-questions list. Recording all six explicitly with resolutions for redline:

### 10.1 Q1 — §3 content-discipline pins per audit-extracted discipline

**Resolved at plan-time per §2(c) and §3.** Length: 1–2 sentences, 18–45 words. Tone: imperative second-person + descriptive third-person. Structure: tactic-sentence + concrete-anchor parenthetical. Cadence: three orthogonal tactics, one per kind. Specificity: sub-type-specific, no generic test-prep advice. Ordering: no significance at the data level. Punctuation: real Unicode em-dash / × / ÷ / ≈.

### 10.2 Q2 — §5 authoring approach (hand vs LLM-assisted)

**Resolved: LLM-assisted draft + hand-curation, single pass, with hand-authoring fallback if first-pass output fails the §3 discipline in >3 of 9 entries.** Rationale per §5: the existing 33 entries' style is consistent with carefully-curated LLM output; LLM-assist with parity prompting (provide all 33 entries as exemplars + the §2(d) sample-item patterns + the §3 / §4 constraints) gives the strongest tonal consistency to the existing entries. Cost envelope sub-$1.

### 10.3 Q3 — §6 schema/seed insertion path

**Resolved: edit `src/config/strategies.ts` + run `bun run src/db/scripts/seed-strategies.ts`. No migration.** Rationale per §6: existing 33 entries follow this path; the seed script uses deterministic UUIDv7 + `onConflictDoUpdate` keyed on `strategies.id`, making it idempotent. Schema is unchanged; a migration would be the wrong shape for seed data. Includes the type tightening from `Partial<Record>` → `Record` per §2(f) Path A.

### 10.4 Q4 — Audit-surfaced ambiguity in existing entries' discipline

**Resolved: target the median entry shape (~25 words, single tactic-sentence + parenthetical anchor), not the longest or shortest.** Per §2(c), entries range from 18 to ~45 words. The median is ~25; the long-tail entries (e.g., `numerical.fractions.technique` at 32 words with a worked-example phrase) are stylistically appropriate where the tactic itself is computational and benefits from a substitution example. New entries should match the median by default; long-tail length is acceptable where the tactic is computational (most likely on the technique-kind entries for `workrate` and `speed_distance_time`).

### 10.5 Q5 — Whether `kind` ordering carries semantic meaning at render time

**Resolved: no.** Per §2(e), `<StrategySurface>` sorts the displayed list by section (verbal-first) then alphabetical sub-type displayName; kind is not a sort key. The kind enum's semantic role is *upstream* — `pickOneStrategy` selects per failure mode. The new 9 entries do not need to satisfy any per-render-order discipline. The exact ordering of the 3 entries within `src/config/strategies.ts`'s array literal for each new sub-type can match the existing convention (recognition, technique, trap — visible in every existing sub-type's array per §2(c)).

### 10.6 Q6 — Whether to open with a doc-only commit or content-first

**Resolved: open with a doc-only commit (commit 1) per the testbank-re-extraction round's audit-baseline-capture pattern.** Rationale: the §2 audit findings (live-DB schema, distribution, sample items, render confirmation, schema-evolution check) are load-bearing and immutable per SPEC §6.14.20; capturing them in commit 1 separates "what the round saw at start" from "what the round changed" cleanly. Commit 2 (content + seed run) follows; commit 3 (cross-doc) and commit 4 (plan close) close the round.

### 10.7 Q7 (audit-surfaced) — Whether the strategy-library composition framing in PRD §6.4 / SPEC §4.2 / feature-roadmap.md L204 should be updated as part of this round or carried in a separate doc-only round

**Resolved: in this round, at commit 3.** Rationale: the three-way cross-doc consistency was established by the taxonomy-restructure round's resolution 7. The composition framing's "11 currently-authored sub-types" wording is the round-trigger; flipping it to "14 sub-types — 5 verbal + 9 numerical (42 total)" closes the gap that opened the round. Carrying the cross-doc reconciliation in a separate round would split the round-shape unnecessarily and risks the three docs drifting in the interim.

### 10.8 Q8 (audit-surfaced) — Whether to remove the `if (!entries) continue` guard in `seed-strategies.ts:25`

**Resolved: leave in place.** Rationale per §6: removing it is a separate optional cleanup. After commit 2's `Partial<Record>` → `Record` tightening, the guard becomes structurally unreachable but stays as defense-in-depth. The cost of leaving it is one branch and a half-line comment; the cost of removing it is a small additional diff in commit 2 with no functional benefit. If a future taxonomy add re-introduces a deferred-authoring window, the guard becomes load-bearing again.

### 10.9 Q9 (audit-surfaced) — Whether to capture a SPEC §6.14.NN entry from this round

**Recommended: no, unless a cross-cutting lesson surfaces during commits 2–3.** Rationale: this is a content round; no architectural lessons are anticipated. The closest candidate is "post-deferred-authoring type-tightening: when a `Partial<Record>` resolution from a prior round resolves, flip to full `Record` + leave the seed-skip guard in place as defense-in-depth," which is a small operational discipline rather than a load-bearing framework constraint. If commit 2 surfaces something framework-shaped (e.g., a Drizzle / Next.js boundary issue analogous to the post-session-review round's §6.14.18 example), capture it in commit 4 as a §6.14.NN entry; otherwise omit. Commit 4 makes the call at round-close.

---

> **Note on plan-prompt scope.** Per the plan-prompt's "What NOT to do" instructions, this plan does not pin the exact text of the 9 new strategy entries; the framework in §3 + §4 + §5 + §7 is what commit 2 satisfies. The plan does not propose taxonomy or schema changes, does not expand to walker / tagger behavior, and does not include implementation timelines beyond the commit-cluster sequencing in §8.
