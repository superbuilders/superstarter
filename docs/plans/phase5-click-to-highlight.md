# Plan — Phase 5, sub-phase 4: click-to-highlight in post-session explanation review

> **Status: planning, approved, not yet implemented.** This plan was drafted audit-first against `main` post-strategy-authoring-round close (HEAD = `9c13d68` at draft time). The master plan's §6 framing is the starting point; where the audit recommends a different shape, the plan recommends that shape with rationale. Closed-plans-immutable per SPEC §6.14.20 once written. Audit-against-actual-artifact per SPEC §6.14.18 binds.

This plan covers Phase 5 sub-phase 4 — extending the post-session `<WrongItemsBrowser>` (slot 5 of the locked nine-slot ordering shipped by sub-phase 1) to render the canonical `metadata_json.structuredExplanation` form and to make explanation parts clickable, with elimination parts striking through the option ids they reference and tie-breaker parts highlighting them. It is the fourth-numbered sub-phase of Phase 5 v1 per master plan §8 sequencing, but ships fourth-or-fifth in actual run order: sub-phases 1 (post-session review surface, shipped 2026-05-04), 2 (adaptive walker, shipped 2026-05-06), and 5 (dojo UI rename + belt indicator, shipped 2026-05-06) all closed cleanly; sub-phase 3 (full-length test) is independent and unshipped. This sub-phase is **the deferred-add holder** for the `<WrongItemsBrowser>` ↔ `structuredExplanation` seam captured in `docs/plans/phase5-post-session-review.md` §15.2.

This sub-phase is **UI-heavy** per master plan §6's framing. The plan shape matches sub-phase 1's seven-commit UI-heavy template (post-session-review precedent) and sub-phase 5's six-commit UI-heavy precedent more than sub-phase 2's three-commit server-side template (adaptive-walker precedent). Alpha Style cadence re-engages at commit boundaries; render-slot locking conventions inherit from sub-phase 1 (the change is in-place inside slot 5 — no new slot, no slot reordering). Likely 4-6 commits.

## 1. Why this sub-phase, why now

Three forcing functions:

- **Predecessors shipped clean and the deferred-add seam is unambiguous.** Sub-phase 1 closed 2026-05-04 with `<WrongItemsBrowser>` rendering a sub-type-grouped, chronologically-ordered, prose-only review of wrong attempts. The §15.2 amendment was deliberately scoped: "Sub-phase 1's `WrongItem` carries only the fields its renders consume — no forward-compat fields. Sub-phase 4 will extend `WrongItem` with `structuredExplanation` atomically with the click-to-highlight UI; the prop boundary is permissive (a single component edit + a single page-query addition), not pre-populated." This sub-phase is the atomic add the seam was carved for. The other two predecessors (sub-phase 2 adaptive walker; sub-phase 5 dojo + belt indicator) are independent and don't gate this work.

- **Bank readiness: structuredExplanation is on 389 of 439 live items.** The testbank-re-extraction round (closed 2026-05-06) populated `metadata_json.structuredExplanation` on every testbank-extracted item; the strategy-authoring round (closed 2026-05-07 at `9c13d68`) did not touch the explanation pipeline. Per audit (F), 389/439 (88.6%) live items carry the structured form; the remaining 50 (the NULL-`source_folder` pre-round seed items) carry prose-only. The bank is **structured-form-ready for nearly nine in ten items**, with a known, bounded prose-only minority that the UI must gracefully accommodate. Click-to-highlight is therefore a real surface the user encounters on most wrong items they review, not a feature that fires on a thin slice of the bank.

- **Phase 5 v1 deploy gate.** Per master plan §1's no-deploy-until-feature-complete framing, Phase 5 v1 is feature-complete only when sub-phases 3 and 4 ship (sub-phases 1, 2, 5 already closed). Sub-phases 3 and 4 are independent — either order ships fine. The user's brief sequences 4 ahead of 3 because (a) the seam captured in §15.2 has been carrying a load-bearing detail for three sub-phases and resolving it tightens the post-session shell's contract, (b) the existing 389-item structured-form-ready bank is the verification surface — sub-phase 3 (full-length) needs no special structured-form work since it lands on the same `<WrongItemsBrowser>` automatically, (c) click-to-highlight has no schema migration and no new server action and is therefore the smaller-blast-radius of the two remaining sub-phases.

## 2. Audit findings against `main`

The current state, as of `main` HEAD `9c13d68`:

### 2.1 Master plan + feature-roadmap framing (audit (A))

**Master plan §6 pins the canonical click-to-highlight interpretation:**

> Render `metadata_json.structuredExplanation`'s parts as clickable elements in the wrong-items browser (built by sub-phase 1). Two interaction modes per the roadmap §3 spec: clicking the `elimination` part strikes through the option ids it referenced via `referencedOptions`; clicking the `tie-breaker` part highlights the option ids it referenced. The `recognition` part typically has empty `referencedOptions` — clicking renders no state change (or shows a small tooltip). State is per-part toggle (clicking again clears the highlight/strike); state is local to the component, not persisted.

**Feature-roadmap §3 (the source the master plan §6 references) is identical in spirit and adds:**

> Two modes per Leo's request:
> - **Strike-through eliminations**: clicking the `elimination` part strikes through the options it referenced (e.g., "cuts 'replace' and 'place' immediately" → strike `replace` and `place`).
> - **Highlight likely answers**: clicking the `tie-breaker` part highlights the options it referenced (e.g., "between 'pass' and 'sell'" → highlight both, the correct answer wins visually).
> - The `recognition` part typically has empty `referencedOptions` (it names a pattern, not specific options) — clicking it does nothing or shows a small tooltip.

The interpretation is **(b → option/stem direction) + a refinement**: clicking on **explanation parts** highlights/strikes **the corresponding options in the option list** (not the stem text). Three plausible alternative interpretations ((a) stem → explanation, (c) option → explanation, (d) other) are explicitly ruled out by both source documents. The interpretation is firm.

**SPEC §3.3.3 carries the same framing forward:**

> The structured form unlocks future click-to-highlight in post-session review (Phase 5/6): tapping a part's prose highlights the option ids it references via `referencedOptions`, with the renderer mapping opaque ids to current display positions. The data model is ready; the UI surface ships in a later phase.

The "Phase 5/6" hedge in §3.3.3 is now resolved to **Phase 5 sub-phase 4** by this plan; the doc-update at sub-phase close reconciles the framing to past-tense ("the UI surface ships in sub-phase 4 — see SPEC §10.7 for the wrong-items extension").

**PRD §6.5 does NOT yet mention click-to-highlight.** The current bullet for the wrong-items browser reads: "Any wrong items, browsable. Each shows the prompt, options, correct answer, explanation." Sub-phase 4 extends this bullet at sub-phase opening per the roadmap-flagged `PRD update required` queue (feature-roadmap §3, "PRD update required"). The PRD update is part of commit 1's doc-open per master plan §9's PRD-update-queue convention.

### 2.2 §15.2 deferred-add status (audit (B))

**The deferred-add is still pending.** Verification by direct artifact read:

- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` lines 104-108: comment reads "Per the §15.2 amendment in the plan, structuredExplanation is NOT included this commit — sub-phase 4 will add it atomically with click-to-highlight UI."
- `getWrongItemsForSession` prepared statement at the same file selects `{ attemptId, itemId, subTypeId, body, optionsJson, correctAnswer, selectedAnswer, explanation }` — no `structuredExplanation` projection. The page query does not read `metadata_json` at all.
- The `WrongItem` interface at the same file (lines ~155-166) carries no `structuredExplanation` field.
- `src/components/post-session/wrong-items-browser.tsx` line 22 comment: "Sub-phase 4 will extend WrongItem (and the page query) atomically with the click-to-highlight UI. Today the renderer reads `items.explanation` (the prose column) only."
- The component's `WrongItemCard` renders `<p className="text-foreground/70 text-sm leading-relaxed">{props.item.explanation}</p>` — prose only, no structured form.

**The amendment's framing has not shifted.** No interim round (taxonomy-restructure, data-wipe, testbank-re-extraction, tagger-improvement, strategy-authoring, dojo-belt-indicator) added the field incidentally. The pending shape — single component edit + single page-query addition — is exactly the seam the §15.2 amendment carved. Sub-phase 4 does the atomic add.

### 2.3 structuredExplanation shape (audit (C))

The Zod schema lives in two coordinated places that stay in lockstep:

- **`src/server/items/ingest.ts` (lines 17-44)** — the ingest-time schema enforced when items enter the bank (admin ingest + OCR pipeline).
- **`scripts/_lib/explain.ts` (lines 48-72)** — the OCR-pipeline-stage-2 explain-pass schema (`structuredExplanationOutput`) used by `scripts/generate-explanations.ts` and `scripts/regenerate-explanations.ts`.

Both share the identical shape (modulo type-export name):

```ts
type StructuredExplanationPart = {
    kind: 'recognition' | 'elimination' | 'tie-breaker'
    text: string
    referencedOptions: string[]  // opaque option ids drawn from the row's options_json[*].id
}

type StructuredExplanation = {
    parts: StructuredExplanationPart[]  // length 2 or 3
}
```

Refinements enforced (both schemas):

- `parts.length` is 2 or 3 (Zod `.min(2).max(3)`).
- `parts[0].kind === 'recognition'`, `parts[1].kind === 'elimination'`, `parts[2]?.kind === 'tie-breaker'` when present (Zod `.refine`).
- `referencedOptions[*]` strings are runtime-cross-checked against the item's `options_json[*].id` set at ingest time (`assertReferencedOptionsExist` in `ingest.ts`), so every referenced id IS in the rendered option list — by invariant, no missing-id rendering edge case is possible for items that passed ingest.

**Per-part data discipline.** The schema does not mandate that `recognition`'s `referencedOptions` is empty; the roadmap framing's "typically empty" matches actual data shape per audit (F)'s sub-query: most recognition parts carry zero refs, but a non-zero minority carry 1 or 4 refs. The UI design (per §3 below) treats recognition as **non-interactive** regardless of `referencedOptions` length — clicking a recognition part is a no-op visually, with optional tooltip-shaped affordance. This avoids per-item branching on whether recognition has refs and matches the roadmap's "names a pattern, not specific options" framing.

### 2.4 `<WrongItemsBrowser>` current shape (audit (D))

`src/components/post-session/wrong-items-browser.tsx` (351 lines, `"use client"`):

- **What it renders today.** Slot 5 of the post-session shell. Wrong attempts grouped by sub-type (verbal-first, alphabetical within section, matching `<AccuracySummary>` + `<LatencySummary>`); within each group, items ordered by `attempts.id` ASC (UUIDv7 = chronological). Each `<WrongItemCard>` renders: `<BodyDispatch>` (currently text-only via `<TextBody>`), an `<ol>` of `<OptionLine>` elements with display letters A-E computed at render time per SPEC §3.3.2, and a single prose `<p>` for `items.explanation`.
- **Interaction model today.** None. The component is fully static — no clicks, no hover effects, no per-item state. Display is read-only.
- **Option marking today.** ✓ on the correct option (`bg-foreground/5` + `font-medium` + ✓ marker). ✗ on the user's selected-incorrect option (line-through + ✗ marker; text contrast at `/80` per commit 5's audit revision; marker contrast at `/55` per WCAG 1.4.11). Other options render at neutral `/80`. **No destructive token on text** — accent earns placement, the ✓/✗ symbols carry the positive/negative signal.
- **Selection mechanism.** Flat vertical list, no pagination, no expansion, no modal. Per sub-phase 1's §8 recommendation: "all wrong items render in a vertical list, grouped by sub-type, with sub-type headings. No prev/next paging, no expanding accordions in v1."
- **Existing exports.** `WrongItemsBrowser`, `WrongItemCard`, `OptionLine`, `BodyDispatch`, `buildDisplayGroups`, `compareGroups`, `compareAttemptIdAsc`, `letterFor`. Pure helpers are already extracted; component composition is pre-decomposed.

**Implication for sub-phase 4.** The change is **in-place inside `<WrongItemCard>`**: the `<p>{props.item.explanation}</p>` line gets replaced by a conditional render that prefers `<StructuredExplanation>` when `structuredExplanation` is present and falls back to the prose `<p>` when absent. The option-list `<ol>` of `<OptionLine>` is also touched — each `<OptionLine>` accepts new `isStruck` / `isHighlighted` props that the `<WrongItemCard>` computes from local state. No reordering, no slot-locking change, no new slot. The card-level state holds two `Set<string>` of opaque option ids (struck / highlighted); clicking a part toggles its `referencedOptions` against the corresponding set.

### 2.5 structuredExplanation distribution across the live bank (audit (E) + (F))

Direct DB query against the local dev DB (`postgres://postgres:postgres@localhost:54320/postgres`):

```
 total | with_structured | without_structured
-------+-----------------+--------------------
   439 |             389 |                 50
```

Per `source_folder`:

| source_folder                             | total | with_structured |
|-------------------------------------------|-------|-----------------|
| (NULL — pre-round seed items)             |    50 |               0 |
| 12min_prep_practice_1 .. _6               |   204 |             204 |
| 12min_sentence_completion_2               |    20 |              20 |
| 12min_seating_arrangement                 |    15 |              15 |
| 12min_numerical_summary                   |    14 |              14 |
| 12min_analogies                           |    13 |              13 |
| 12min_assumptions_and_conclusions_2       |    12 |              12 |
| 12min_percentages                         |    12 |              12 |
| 12min_lowest_value                        |    12 |              12 |
| 12min_number_series                       |    12 |              12 |
| (others — all 100% with_structured)       |   ... |             ... |

**The split is clean: 100% of testbank-extracted items have structuredExplanation; 0% of NULL-source-folder seed items have it.** No intermediate state. The 50 seed items are the entire prose-only minority. They predate the testbank-re-extraction round's 2-pass pipeline that lands the structured form; they were ingested via the `hand-seed` import path that did not produce structured output.

**Part-count distribution among the 389 with_structured items:**

| Parts | Count |
|-------|-------|
| 2 (recognition + elimination) | 343 |
| 3 (recognition + elimination + tie-breaker) | 46 |

**referencedOptions distribution (sampled by part position):**

| Position | Observed `referencedOptions` lengths |
|----------|--------------------------------------|
| 1 (recognition) | 0, 1, 4 (mostly 0) |
| 2 (elimination) | 1, 2, 3, 4 |
| 3 (tie-breaker, when present) | 0, 1, 2, 3 |

**Implications.**

- The UI must support 2-part and 3-part renders.
- Recognition parts CAN carry refs but the design treats them as non-interactive regardless (per §3 below).
- Tie-breaker parts can have zero refs — the rendered "highlight nothing" interaction is a degenerate case but not invalid. Clicking a zero-ref part toggles the part's pressed state with no visible option-list effect; this is acceptable UX (it tells the user "I clicked something" via the part's own pressed style without confusing the option list).
- **Backfill is NOT in scope.** The 50 seed items are a known, bounded, prose-only minority. Backfilling them via an LLM run is its own round (cost: one explain-pass per item against an existing image-less ingest, requiring a separate prompt path that operates on prose-only seed items rather than screenshots). The graceful prose-fallback in the UI handles them by rendering the existing `items.explanation` prose unchanged.

### 2.6 Slot-locking inheritance from sub-phase 1 + sub-phase 5 (audit (G))

`<PostSessionShell>`'s locked nine-slot ordering (sub-phase 1 §10, extended by sub-phase 5 §2.6 commit 4):

1. Heading + brief one-line summary (+ `<BeltIndicator>` for drill mode per sub-phase 5)
2. `<TriageScoreLine>`
3. `<AccuracySummary>`
4. `<LatencySummary>`
5. **`<WrongItemsBrowser>` ← this sub-phase extends in place**
6. `<StrategySurface>`
7. `<OnboardingTargets>` (diagnostic-only)
8. Pacing-line sentence (diagnostic-only, conditional)
9. Continue CTA (non-diagnostic)

**Sub-phase 4 makes no slot-ordering change.** The change is contained to slot 5's per-item render: replace the prose `<p>` with `<StructuredExplanation>` (with prose fallback) and add card-level toggle state for strike/highlight effects on `<OptionLine>`. No new slots, no slot reordering, no new component renders outside slot 5's existing tree. Per sub-phase 5's §2.6 audit framing — "the slot-locking inheritance discipline preserves the existing ordering bit-for-bit; extensions are in-place" — sub-phase 4 inherits the discipline cleanly.

### 2.7 Alpha Style baseline drift check (audit (H))

The post-session shell was full-surface Alpha-Style-audited at sub-phase 1 commit 6 (`eaeb882`) and again at sub-phase 5 commit 5 (`c32a7fb`). Both audits closed clean (Audit Health 19/20 and clean respectively). The systemic-token framework from `.alpha-style.md` (below-3-occurrences threshold for namespaced design tokens) is in force; sub-phase 5 added two belt-namespaced tokens (`--belt-blue`, `--belt-brown`) under that framework. The `text-destructive-on-text` count holds at 1 across the post-session shell — below the 3-occurrence threshold for a structural-token addition.

**Sub-phase 4's Alpha Style cadence inherits commits 3-5's component-scoped pattern + commit 6's full-surface posture from sub-phase 1.** The strike/highlight visual treatment (per §3 below) is constrained to existing systemic tokens (foreground tints, accent token if needed) unless the audit surfaces a third occurrence elsewhere — at which point a new namespaced token earns its place. Per `.alpha-style.md` "accents earn placement" principle: the highlight color, if accent-keyed, is one of at most a few accent uses on the post-session shell.

### 2.8 SPEC drift summary

Three SPEC sections to reconcile at sub-phase close:

- **SPEC §3.3.3 (`metadata_json.structuredExplanation` shape).** The "Phase 5/6" hedge in the closing paragraph ("The data model is ready; the UI surface ships in a later phase.") reconciles to past-tense pinning sub-phase 4. The shape definition itself is unchanged.
- **SPEC §10.7 (post-session review composition).** Slot 5's bullet ("`<WrongItemsBrowser>` — sub-type grouped, chronological within group via `attempts.id` ASC, prose explanation only.") reconciles to past-tense extending the prose-only framing to the structured-form-with-prose-fallback shape that sub-phase 4 ships. The §15.2-amendment seam reference ("query carries NO `structuredExplanation` field; sub-phase 4 adds it atomically with the click-to-highlight UI") reconciles to past-tense ("query carries `structuredExplanation` projection added in sub-phase 4 — see `docs/plans/phase5-click-to-highlight.md` for the round").
- **SPEC §6.14 implementation notes.** No new note expected; the existing .18 (framework constraint audit before pinning architectural detail at plan time), .20 (closed-plans-immutable as a multi-round convention), .21 (audit DB row-state against the live DB, not against intended-state from prior commits), and .22 (audit claims about existing code semantics against the consuming code, not the producing code) are sufficient. If the implementation discovers a new framework constraint or audit-pattern signal, a new entry lands at the round-close commit.

### 2.9 PRD drift summary

**One PRD update at sub-phase opening.** PRD §6.5's existing bullet "Any wrong items, browsable. Each shows the prompt, options, correct answer, explanation." extends to add a click-to-highlight clause. Recommended language (decided at commit 1):

> Any wrong items, browsable. Each shows the prompt, options, correct answer, explanation. The explanation renders as structured parts (recognition / elimination / [optional] tie-breaker); clicking the elimination part strikes through the options it eliminates, clicking the tie-breaker part highlights the options it considers, with state toggling per click and resetting per session.

The PRD update lands in commit 1 per master plan §9's PRD-update-queue convention (sub-phases 4 and 5 carry their own PRD updates at their opening).

### 2.10 Schema readiness

- `items.metadata_json` (jsonb) — already populated by ingest with `structuredExplanation` for 389 of 439 live items. **No schema migration required.** The new page-query projection adds `metadata_json->'structuredExplanation'` to `getWrongItemsForSession`'s SELECT list; the runtime parse uses a Zod schema co-located in the renderer.
- `items.explanation` (text, nullable) — unchanged. Continues to carry the prose form. Sub-phase 4's UI prefers structured → prose fallback when structured is absent (the 50 seed items).
- `attempts.*`, `practice_sessions.*` — untouched.

**No schema migrations. No new server actions. No new cron route handlers.** The sub-phase is pure render-layer work plus a single read-side query addition.

## 3. Click-to-highlight interaction model design

Per the canonical interpretation pinned in §2.1, the design:

### 3.1 Click model

- **What's clickable.** Each rendered `StructuredExplanationPart` is a clickable surface. The unit of click is the **whole part** (the entire prose fragment of recognition / elimination / tie-breaker), not individual words within the prose. The roadmap's "tapping a part's prose" framing settles this — parts are atomic; word-level highlighting is out of scope.
- **What highlights/strikes.** Clicking the **elimination** part toggles strike-through on every option whose opaque id is in `parts[1].referencedOptions`. Clicking the **tie-breaker** part (when present) toggles highlight on every option whose opaque id is in `parts[2].referencedOptions`. Clicking the **recognition** part is a **no-op** regardless of whether `parts[0].referencedOptions` is empty or non-empty — recognition names a pattern, not specific options, and the design treats it as informational (the part renders normally — same prose, but with no `aria-pressed`, no toggle indicator, no hover affordance signaling clickability). This is decided rather than presented as an option per the working principle. Rationale: per audit (C/F), recognition refs are non-empty in a minority of items; making recognition non-interactive uniformly avoids a per-item branch on `parts[0].referencedOptions.length` and matches the roadmap's "clicking it does nothing" framing without a tooltip surface that would add a hover/focus dependency Alpha Style avoids in v1.

### 3.2 Visual treatment

- **Strike-through (elimination active).** Layered on top of `<OptionLine>`'s existing styles. Affected options (those whose opaque id is in the active strike set) gain a `line-through` text-decoration and a slightly dimmer text-color tint. The existing line-through-on-selected-incorrect treatment continues to apply independently — if the user's selected-incorrect option happens to also be in the elimination's `referencedOptions` (the common case: the user picked an option the explanation eliminates), both signals overlap. The composition reads cleanly because both signals encode the same idea ("this is wrong").
- **Highlight (tie-breaker active).** Affected options (those whose opaque id is in the active highlight set) gain a subtle background tint — recommended starting point is `bg-foreground/5` or a low-saturation accent tint, decided at commit-time per the Alpha Style audit (§6 below) — plus a left ring or subtle border emphasis. The treatment is **calmer than the correct-option ✓ treatment**: the correct option's `bg-foreground/5` + `font-medium` + ✓ stays dominant. If the highlight tint is the same `bg-foreground/5`, the disambiguation is the optional left-ring or border; if a different accent tint is chosen, both can coexist visually without conflict.
- **Recognition (non-interactive).** Renders as plain prose. No background, no border, no hover affordance. Visually distinct from elimination/tie-breaker via absence of the affordance, not via a different prose style.
- **Active part affordance.** The active (clicked / `aria-pressed="true"`) elimination or tie-breaker part renders with a subtle indicator — recommended: a small left-rule + a one-step background tint shift. This signals "this part is currently driving the option-list state." Inactive elimination/tie-breaker parts render with a hover/focus affordance signaling clickability without committing to active-state visual weight.

### 3.3 State model

- **Per-card local state.** Each `<WrongItemCard>` holds two `Set<string>` of opaque option ids: `struck` (driven by the elimination part) and `highlighted` (driven by the tie-breaker part). Toggling the elimination part replaces `struck` with `parts[1].referencedOptions` (or empties it if already active); toggling the tie-breaker part replaces `highlighted` with `parts[2].referencedOptions` (or empties it). Each part is independently toggleable; clicking elimination does NOT clear tie-breaker's state, and vice-versa.
- **Sticky vs hover.** Sticky (click-to-toggle), not hover. Hover-to-preview is excluded for v1 because (a) it adds a hover-vs-click ambiguity on touch devices that "tap = click" cleanly avoids, (b) it complicates the keyboard-activation story (focus-without-press), (c) "sticky on click; click again to clear" is the simplest mental model and matches the roadmap's "clicking again clears" implication.
- **Scope.** State is local to the `<WrongItemCard>` instance. Not persisted to URL, not persisted to localStorage, not lifted to a parent. When the user navigates away and returns to the post-session page, all cards re-mount with empty state. Per the roadmap's "state is local to the component, not persisted" framing.
- **Cross-card independence.** State in card A does NOT affect card B. Each card is independently toggleable.

### 3.4 Accessibility

- **Semantics.** Each clickable part renders as a `<button type="button">` with `aria-pressed="true|false"` reflecting its toggle state. Recognition parts (non-interactive) render as plain `<span>` or `<p>` — no button, no `aria-pressed`, no `tabindex`.
- **Keyboard activation.** `Enter` and `Space` activate the part (default `<button>` semantics). `Tab` moves focus across active-part buttons (recognition is skipped because non-interactive).
- **Focus visibility.** Active-part buttons render a visible focus ring (Alpha Style's existing focus-ring pattern, inherited from button primitives in the post-session shell).
- **Screen reader.** Each elimination/tie-breaker `<button>` carries an `aria-label` like "Toggle elimination explanation: strikes through 2 options" or similar — recommended copy decided at commit-time per the Alpha Style audit. The screen-reader announcement on toggle ("Elimination active — 2 options struck through" / "Elimination cleared") is delivered via an `aria-live="polite"` region scoped to the card; the region's content updates on each toggle. Recognition parts carry no `aria-label` because they render as plain prose.
- **Reduced motion.** Toggle transitions (background tint fade-in, strike-through animation if any) respect `prefers-reduced-motion`. Per `.alpha-style.md` design principle 5: outside the focus shell, reduced-motion suppresses decorative animation. The default toggle transition is an instant state swap with a short (≤120ms) cross-fade for the background tint; reduced-motion drops the cross-fade.

### 3.5 Mobile / touch interaction

**Tap = click.** No long-press, no swipe gestures, no double-tap zoom intercept. The design intentionally has zero touch-specific affordances beyond the basic tap-to-toggle that `<button>` semantics provide on every modern mobile browser. Per the working principle "don't pull future work forward" and audit (A)'s confirmation that the master plan does not pin a mobile-specific interaction beyond tap=click, this stays out of scope.

### 3.6 Edge cases

- **Items without `structuredExplanation` (50 seed items).** The card renders the prose `items.explanation` as before — same `<p>` element, same styles, unchanged behavior. No clickable parts. The fallback is silent — the user sees the prose explanation they would have seen pre-sub-phase-4. **The fallback is the seed-item compatibility path.**
- **Items with `structuredExplanation = { parts: [recognition, elimination] }` (no tie-breaker, 343 items).** The card renders two parts: recognition (non-interactive) + elimination (interactive). The `highlighted` set stays empty; only `struck` toggles.
- **Items with empty `referencedOptions` on the active part.** Toggling fires, the button's `aria-pressed` flips, but no option-list visual change. The button's own active-state affordance still renders (the user gets feedback that they clicked). This is a degenerate case but not invalid; the design accepts it rather than special-casing.
- **`referencedOptions` ids that don't match any option in `optionsJson`.** Per audit (C), the ingest-time `assertReferencedOptionsExist` cross-check guarantees every referenced id IS in the options list, so this case is impossible by invariant. The renderer does not need defensive code for it. If a future bug breaks the ingest invariant, the symptom is silent — the toggle fires but no option changes — which is acceptable degradation, not data corruption.
- **Body-parse or options-parse failure (already handled).** The existing `parseItem` helper in `wrong-items-browser.tsx` returns `null` on parse failure and the card renders the degraded-line fallback. Sub-phase 4's `<StructuredExplanation>` parses with its own Zod schema; on failure it falls back to the prose `<p>`. Two independent parse boundaries; one bad row still doesn't crash the list.

## 4. `structuredExplanation` field design (deferred-add)

Per audit (B), the deferred-add is in scope. The design:

### 4.1 Runtime `WrongItem` field shape

Extend the `WrongItem` interface in `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx`:

```ts
interface WrongItem {
    attemptId: string
    itemId: string
    subTypeId: SubTypeId
    body: unknown
    optionsJson: unknown
    correctAnswer: string
    selectedAnswer?: string
    explanation?: string
    structuredExplanation?: unknown  // ← new field; parsed in the renderer
}
```

The field is `unknown` at the page-query boundary (the page does not parse) and parsed via Zod in the `<StructuredExplanation>` component using the schema co-located in the renderer (or imported from a shared module — see §5.2 below). Per `rules/no-null-undefined-union.md`, the field is `T | undefined` (optional) rather than `T | null` — at the SQL boundary, `metadata_json->'structuredExplanation'` returns `null` when the key is absent; the page-query type derivation normalizes `null → undefined` at the boundary via Drizzle's type narrowing or via an explicit `.transform(v => v === null ? undefined : v)` if needed.

### 4.2 Page-query addition

Extend `getWrongItemsForSession` in the same file:

```ts
const getWrongItemsForSession = db
    .select({
        attemptId: attempts.id,
        itemId: items.id,
        subTypeId: sql<SubTypeId>`${items.subTypeId}`,
        body: items.body,
        optionsJson: items.optionsJson,
        correctAnswer: items.correctAnswer,
        selectedAnswer: attempts.selectedAnswer,
        explanation: items.explanation,
        // ← new projection:
        structuredExplanation: sql<unknown>`${items.metadataJson} -> 'structuredExplanation'`
    })
    .from(attempts)
    .innerJoin(items, eq(attempts.itemId, items.id))
    .where(...)
    .orderBy(attempts.id)
    .prepare("app_dgflow_post_session_id_wrong_items")
```

The `sql<unknown>`-typed projection is intentional — the page query does not validate the JSON shape; it streams the raw JSONB value to the renderer, which validates at render boundary per `rules/zod-usage.md`. The projection adds zero new joins and zero new index dependencies; the existing `attempts_session_id_idx` continues to satisfy the query plan.

**EXPLAIN ANALYZE check at commit 2.** Per SPEC §6.14.7, the new query plan is checked against dev-DB scale (2204 attempts in the test fixture). Expected: same plan as the current `getWrongItemsForSession` modulo a column projection — sub-2ms. If the planner picks a different shape (unexpected at JSONB-projection scale), commit 2 records the EXPLAIN output in its commit message per the SPEC §6.14.13 dev-vs-prod planner-choice convention.

### 4.3 Backward-compat: items without `structuredExplanation`

The 50 seed items return `null` from `metadata_json->'structuredExplanation'`, normalized to `undefined` at the boundary. The renderer's branch is:

```tsx
{(props.item.structuredExplanation === undefined && props.item.explanation === undefined)
    ? null
    : props.item.structuredExplanation === undefined
        ? <p className="text-foreground/70 text-sm leading-relaxed">{props.item.explanation}</p>
        : <StructuredExplanation
              raw={props.item.structuredExplanation}
              fallbackProse={props.item.explanation}
              onStrike={(ids) => setStruck(ids)}
              onHighlight={(ids) => setHighlighted(ids)}
          />
}
```

Pseudo-code; the actual renderer uses named branches per `rules/no-inline-ternary.md`. The `<StructuredExplanation>` itself accepts a `fallbackProse` prop so it can render the prose `<p>` if its own Zod parse fails (a defense-in-depth path against data drift; should never fire for items that passed ingest).

### 4.4 Backfill strategy: out of scope

The 50 NULL-source-folder seed items render with prose fallback. **Backfilling them with structuredExplanation is its own round.** Rationale:

- Scope: backfilling requires either (a) re-running an LLM explain pass against each seed item with a prose-only prompt path that the existing pipeline does not have, or (b) manually authoring 50 structured explanations.
- Cost: an LLM run is cheap but adds round-overhead (a new prompt template, a new ingest path that updates `metadata_json` without re-extracting body/options, a verification harness). Manual authoring is also non-trivial.
- Value: 50 items / 439 = 11.4% of the live bank. The graceful prose-fallback in the UI handles them adequately (the user sees prose, not structured-with-clicks). The marginal UX gain from backfilling does not justify the round-overhead at this stage.

If a future round reverses this — e.g., the prose-fallback shape generates user confusion ("why is this explanation different from others?"), or the seed items are over-served in some session distribution — the backfill becomes a standing candidate for a separate round. Sub-phase 4 does NOT pull this work forward.

### 4.5 Schema migration considerations

**None.** `metadata_json` is JSONB; the `structuredExplanation` key is already populated for 389 of 439 items. No DDL change. No new columns. No new indexes.

## 5. Component shape design

### 5.1 New component: `<StructuredExplanation>`

Lives at `src/components/post-session/structured-explanation.tsx`. `"use client"` (consumes click handlers, holds Zod parse boundary, dispatches to part renderers).

**Props:**

```tsx
interface StructuredExplanationProps {
    raw: unknown
    fallbackProse?: string
    onActiveStrikeChange: (referencedOptions: ReadonlyArray<string>) => void
    onActiveHighlightChange: (referencedOptions: ReadonlyArray<string>) => void
}
```

**Responsibilities:**

- Parse `raw` via the Zod schema co-located in this file (or imported from a shared module — see §5.2).
- On parse failure: log via Pino structured logger + render `fallbackProse` via the prose `<p>` if provided + render `null` if not.
- On parse success: render each part. Recognition → plain prose. Elimination → `<button aria-pressed>` wrapping prose. Tie-breaker (when present) → `<button aria-pressed>` wrapping prose.
- Hold per-part toggle state (which of `[elimination, tie-breaker]` is active). On toggle, emit `onActiveStrikeChange` / `onActiveHighlightChange` with the active part's `referencedOptions` (or an empty array on toggle-off).
- The component owns the prose-rendering of parts and the per-part button affordance + state. The parent `<WrongItemCard>` owns the option-list strike/highlight effects via the callbacks.

**Why this split?** The option list `<ol>` and the explanation `<StructuredExplanation>` are **siblings** inside `<WrongItemCard>`. The strike/highlight state is naturally card-level (one source of truth, two consumers). Holding state inside `<StructuredExplanation>` and emitting via callbacks lets the parent compose the state without a context provider. Per `.alpha-style.md` editorial-density principle and the `<WrongItemCard>` complexity budget, a tiny callback-emitting child is simpler than a context.

### 5.2 Zod schema location

The `structuredExplanation` Zod schema is duplicated across `src/server/items/ingest.ts` and `scripts/_lib/explain.ts` (both server-only, both identical). **Sub-phase 4 introduces a third copy** in `src/components/post-session/structured-explanation.tsx` (client-side, parses the page-query value) **rather than centralizing all three.** Rationale:

- The ingest schema and the explain-pipeline schema are server-only; the renderer schema is client-side. Centralizing forces a Next.js client-server module-boundary decision (per SPEC §6.14.18) that is not load-bearing for sub-phase 4 — the schema is small (< 30 lines) and identical across copies.
- Centralizing is a refactor; sub-phase 4 ships click-to-highlight, not a schema-centralization round.
- If a future round consolidates all three into a shared module, the diff is mechanical. Until then, the duplication cost is bounded and acknowledged.

This is a decided not-now per the working principle "don't add features beyond what the task requires." Open question §11.5 captures the position; if redline reverses, sub-phase 4's plan delta is one new file (`src/lib/structured-explanation/schema.ts` or similar) and three import edits.

### 5.3 `<WrongItemCard>` extension

The existing `WrongItemCard` in `src/components/post-session/wrong-items-browser.tsx` extends to:

- Hold two `Set<string>` of opaque option ids in `useState`: `struck` and `highlighted`.
- Pass `struck` and `highlighted` into each `<OptionLine>` so the line can compute `isStruck` (boolean: `struck.has(option.id)`) and `isHighlighted` (boolean: `highlighted.has(option.id)`).
- Replace the existing `<p>{props.item.explanation}</p>` with the conditional render from §4.3, parameterizing the two callbacks (`setStruck` and `setHighlighted`) into `<StructuredExplanation>`.

The `<OptionLine>` extends to accept `isStruck` and `isHighlighted` props and to apply the visual treatment from §3.2 (line-through for `isStruck`; background tint + emphasis for `isHighlighted`). The existing `isCorrect` and `isSelected` markers continue to compose.

### 5.4 Composition with slot 5 placement

Slot 5's outer shape is unchanged: `<WrongItemsBrowser>` renders `<WrongItemCard>` instances grouped by sub-type. The change is **inside the card**: explanation render swap + option-list prop addition. No new wrapper, no new section, no new heading.

Per sub-phase 5's §2.6 slot-locking inheritance discipline: "extensions are in-place." Sub-phase 4 conforms.

### 5.5 Alpha Style cadence inheritance

`<StructuredExplanation>` and the extended `<WrongItemCard>` are net-new component code in the post-session shell — they receive component-scoped Alpha Style `audit` at commit boundaries per sub-phase 1's §11 cadence and sub-phase 5's §6.2 precedent. The full-surface `audit` + `polish` runs at the round-close commit per sub-phase 1's commit-6 precedent and sub-phase 5's commit-5 precedent. Setup (`teach-alpha-style`) does NOT run — it ran in sub-phase 1's commit 1 and the persisted `.alpha-style.md` is inherited unchanged.

Visual-token additions (if any) follow the below-3-occurrences-systemic-token framework from `.alpha-style.md`. If the highlight tint requires a namespaced token (e.g., `--highlight-bg`), it lands as a single-occurrence token in the round's appropriate commit. Most likely: the highlight tint reuses `bg-foreground/5` (already present in the correct-option marker) with a left-ring or border distinguishing it; no new token needed.

## 6. Alpha Style cadence

### 6.1 Setup posture

`teach-alpha-style` does NOT run this sub-phase. The persisted `.alpha-style.md` from sub-phase 1's commit 1 is inherited unchanged (per master plan §10's "no standalone sub-phase 0; subsequent sub-phases inherit" framing).

### 6.2 Operational commands at commit boundaries

Per sub-phase 1's §11 cadence and sub-phase 5's §6.2 precedent:

- **Commits 1, 2 (round-open + page-query addition):** No Alpha Style operations. Commit 1 is doc-open (PRD + SPEC); commit 2 is server-side query addition + WrongItem field shape — no rendered UI delta.
- **Commit 3 (`<StructuredExplanation>` component):** Component-scoped `audit` at commit close; `normalize` on demand if `audit` flags drift. The component is net-new — likely clean from the start, but the audit confirms.
- **Commit 4 (`<WrongItemCard>` extension + `<OptionLine>` strike/highlight props + wiring):** Component-scoped `audit` at commit close. This commit is where the visual treatment lands — the strike/highlight effects, the active-part affordance, the button focus rings.
- **Commit 5 (full-surface `audit` + `polish`):** Full-surface `audit` across the post-session shell (slot 5 changed, slots 1-4 + 6-9 unchanged but re-checked for systemic-token drift); `polish` as the final quality pass per sub-phase 1's commit 6 precedent. If `audit` surfaces a P2 inline-fix, it lands here; P3 deferrals get explicit rationale per sub-phase 1 + sub-phase 5 commit-message convention.
- **Commit 6 (round-close docs):** No Alpha Style operations.

### 6.3 Design-system additions (if any)

Most likely: zero new tokens. The strike-through reuses existing `line-through` + `text-foreground/55-/80` tints; the highlight reuses `bg-foreground/5` + a left-ring or border emphasis from existing primitives. If commit 4's `audit` surfaces a third occurrence of the highlight pattern across surfaces, a namespaced token (`--highlight-bg` or similar) earns its place under `.alpha-style.md`'s below-3-systemic-token framework. Decision deferred to commit-time per `.alpha-style.md`'s discipline.

If a token IS added: it lives in `src/styles/unstyled/globals.css` in both light + dark mode declarations, registered in `@theme inline` per the existing pattern (sub-phase 5's `--belt-blue` / `--belt-brown` precedent).

## 7. Test surface

### 7.1 New tests (pure-function helper tests)

Following sub-phase 5's §7.1 pattern (no component-test infrastructure exists in tree):

- `src/components/post-session/structured-explanation.test.ts` — pure-function unit tests for the parse helper + the part-classification helper (e.g., `partsToReferencedOptions(parts) → { struckCandidates, highlightedCandidates }` if such helpers are extracted). Cases:
  - 2-part shape (recognition + elimination) parses cleanly, returns expected referencedOptions.
  - 3-part shape (recognition + elimination + tie-breaker) parses cleanly, returns expected referencedOptions for both interactive parts.
  - Out-of-order parts (elimination first) fails parse, falls back to prose.
  - Empty `referencedOptions` on a part parses cleanly, returns empty array.
  - Recognition with non-empty `referencedOptions` parses cleanly, helper still treats recognition as non-interactive.
  - Wholly-malformed input (string, null, missing parts) fails parse, falls back to prose.
- Unit tests for the `<WrongItemCard>` toggle reducer if extracted as a pure helper (e.g., `nextStrikeSet(currentSet, partRefs) → newSet`):
  - Toggling on (current empty, partRefs non-empty) → newSet === partRefs.
  - Toggling off (current === partRefs) → newSet empty.
  - Toggling re-on after off → newSet === partRefs again.

Test count growth: ~6-10 tests across the two helper files. Following sub-phase 5's commit-3 pattern (5 belt-color helper unit tests), this is a credible budget.

### 7.2 Component-render integration tests

**Real-DB harness pattern + Playwright headless visual spot-check** per sub-phase 5's §7.1 + §9 precedent. The codebase has no `.test.tsx` infrastructure (no DOM shim, no React Testing Library); the verification surface is a real-DB harness script that drives the post-session page and a Playwright headless screenshot that confirms the rendered shape. Expected harness location: `scripts/dev/smoke/phase5-sp4.ts` (or sibling per sub-phase 5's pattern).

Harness scenarios:

1. Drill session with 5 wrong items: 4 with `structuredExplanation`, 1 without. Assert: 4 cards render `<StructuredExplanation>` (Zod parses successfully, parts render as buttons); 1 card renders the prose fallback `<p>`.
2. Click the elimination part on a card with a 2-option `referencedOptions`. Assert: those two options gain line-through + dimmer text; the card's other options unchanged.
3. Click the elimination part again on the same card. Assert: line-through clears.
4. Click the tie-breaker part on a card with a 3-part structured explanation. Assert: referenced options gain background tint + emphasis; other options unchanged.
5. Click the recognition part on a card. Assert: no option-list change; no `aria-pressed` toggle (recognition is non-interactive).
6. Cross-card independence: open two cards (or scroll to two cards in the same render); click elimination on card A. Assert: card B's option list is unchanged.
7. Keyboard navigation: Tab through the wrong-items section. Assert: focus lands on each elimination + tie-breaker button (skipping recognition) in DOM order.

Playwright spot-check: take a screenshot of the post-session shell for one drill session in both states (no parts active; elimination part active on the first card) and visually confirm the rendered treatment.

### 7.3 Visual regression test infrastructure

**Out of scope for sub-phase 4.** Visual-regression infrastructure is a standing round candidate (per sub-phase 5's §7.3 framing). Sub-phase 4 rides the same Playwright spot-check pattern that sub-phase 5 established; if a future round graduates the infrastructure, sub-phase 4's spot-check is the regression target.

## 8. Sequencing and commits

5 commits expected. The cluster:

### Commit 1: `docs(prd+spec): open phase5-click-to-highlight round; PRD §6.5 click-to-highlight bullet + SPEC §3.3.3 + §10.7 narrative`

- Open the round per SPEC §6.14.20 closed-plans-immutable convention.
- Update PRD §6.5's wrong-items bullet per audit (A) §2.9 recommended language.
- Update SPEC §3.3.3 to soften the "Phase 5/6" hedge to "Phase 5 sub-phase 4" with a forward-pointer to the round plan.
- Update SPEC §10.7's slot-5 framing to flag the in-flight click-to-highlight extension (past-tense reconciliation lands in commit 6).
- No code delta.

### Commit 2: `feat(post-session): WrongItem.structuredExplanation field + page-query projection`

- Extend `WrongItem` interface in `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` with `structuredExplanation?: unknown`.
- Extend `getWrongItemsForSession` prepared statement to include `metadata_json->'structuredExplanation'` projection.
- Run EXPLAIN ANALYZE on the new query against the dev DB; record output in commit message per SPEC §6.14.7 / .13.
- The renderer is unchanged this commit — `<WrongItemsBrowser>` does not yet read the new field. The projection is dormant until commit 3 wires it.
- No Alpha Style operations.

### Commit 3: `feat(post-session): <StructuredExplanation> component + Zod parse boundary`

- Add `src/components/post-session/structured-explanation.tsx` with the Zod parse boundary, the part-renderers, the toggle state, and the callback-emitting prop shape per §5.1.
- Add `src/components/post-session/structured-explanation.test.ts` with pure-function unit tests per §7.1.
- The component is **dormant** at this commit — `<WrongItemCard>` does not yet render it. The component renders standalone in the test harness only.
- Component-scoped Alpha Style `audit` at commit close; `normalize` on demand.

### Commit 4: `feat(post-session): wire <StructuredExplanation> into <WrongItemCard>; <OptionLine> strike/highlight effects`

- Extend `<WrongItemCard>` to hold `struck` + `highlighted` `Set<string>` state, pass into `<OptionLine>` instances, render `<StructuredExplanation>` (or prose fallback) with callbacks wired to the state setters.
- Extend `<OptionLine>` to accept `isStruck` + `isHighlighted` props and apply visual treatment per §3.2.
- Component-scoped Alpha Style `audit` at commit close.
- Real-DB harness + Playwright spot-check per §7.2 lands here; harness script saved under `scripts/dev/smoke/`.

### Commit 5: `docs(spec+prd+plan): full-surface audit + polish; reconcile §10.7 + §3.3.3 to past-tense; close phase5-click-to-highlight round`

- Full-surface Alpha Style `audit` across the post-session shell + `polish` per sub-phase 1's commit-6 precedent and sub-phase 5's commit-5 precedent. Inline P2 fixes; document P3 deferrals in commit message.
- Reconcile SPEC §3.3.3's "Phase 5 sub-phase 4 in-flight" framing to past-tense pinning the round-close commit.
- Reconcile SPEC §10.7's slot-5 + §15.2-amendment-seam-reference to past-tense.
- Reconcile this plan's status header to "shipped 2026-XX-XX" with the round-close summary per sub-phase 1's + sub-phase 5's plan-close convention.
- Close the round per closed-plans-immutable.

If commit 4's audit surfaces a structurally-sized P2 that does not fit inline (e.g., a third occurrence of a pattern triggering a systemic-token addition), it gets its own commit between 4 and 5. **Allowed expansion to 6 commits** — matches sub-phase 1's seven-commit precedent for UI-heavy rounds and sub-phase 5's six-commit precedent. The commit-cluster proposal stays at 5 as the recommended baseline; growth to 6 is a runtime reaction to audit findings, not a planned commit.

**Conditional commit (NOT in baseline cluster):** A backfill commit for the 50 NULL-source-folder seed items is **out of scope** per §4.4. It is NOT in the baseline cluster, NOT a runtime reaction to audit findings, and NOT a hidden conditional.

## 9. Verification protocol carry-forward

Per sub-phase 1, sub-phase 2, and sub-phase 5 precedents:

- **`bun lint` clean / `bun typecheck` clean at every commit.**
- **`bun test` count grows.** Baseline at round-open: 60 tests (sub-phase 5 close). Expected growth: 6-10 new tests across `structured-explanation.test.ts` and the `<WrongItemCard>` toggle helper test, landing 66-70 at round close.
- **EXPLAIN ANALYZE** on the new `getWrongItemsForSession` query at commit 2 per SPEC §6.14.7 / .13.
- **Real-DB harness** at commit 4 per §7.2, scenarios 1-7. Saved under `scripts/dev/smoke/` per the smoke-script directory convention (SPEC §6.14.8).
- **Playwright headless visual spot-check** at commit 4 per sub-phase 5's pattern (the codebase has no component-test infrastructure; Playwright is the user-perceived-render verification surface).
- **Alpha Style audit at commit boundaries** per §6.2.
- **Closed-plans-immutable convention** per SPEC §6.14.20.
- **Audit-against-actual-artifact discipline** per SPEC §6.14.18 — each commit's claims about existing code semantics are verified against the consuming code, not the producing code (per .22).
- **Live-DB row-state audit** per SPEC §6.14.21 — DB-level claims (the 389/50 split, the 343/46 part-count split) are verified against the live dev DB at round-open and at round-close.
- **No new server actions, no new ownership-scoped routes** — SPEC §6.14.14 + .15 patterns NOT applicable this sub-phase.

## 10. Out of scope

Explicit list — items deliberately not addressed in sub-phase 4:

- **Sub-phase 3 (full-length test).** Independent of sub-phase 4. Either order ships fine. Sub-phase 4 does NOT pull full-length forward; full-length lands on the same `<WrongItemsBrowser>` and inherits click-to-highlight automatically when sub-phase 3 ships, but no full-length-specific work happens here.
- **Visual-regression test infrastructure.** Standing round candidate. Sub-phase 4 rides the Playwright spot-check pattern; infrastructure graduation is a separate decision.
- **`isTextOnly` filter relaxation.** Independent. Some items have non-text body kinds; the `<BodyDispatch>` switch in `<WrongItemCard>` will fail compile when new variants land — that's the existing exhaustiveness-checked pattern. Sub-phase 4 does not change body-rendering.
- **Walker behavior changes.** Sub-phase 2's territory; closed.
- **Tagger / classifier changes.** Tagger-improvement round territory; closed.
- **New strategy entries.** Strategy-authoring round territory; closed.
- **`structuredExplanation` shape changes.** Settled by the testbank-re-extraction round. Sub-phase 4 consumes the existing shape unchanged.
- **`recognition`-part tooltip / hover affordance.** Decided as non-interactive in §3.1. A future round can add a tooltip if user-research signals a need; not now.
- **Persisted toggle state (URL param, localStorage).** Decided as ephemeral local state in §3.3. A future round can add persistence if a use case surfaces; not now.
- **Word-level highlighting within parts.** Decided as part-atomic in §3.1. A future round can subdivide if a use case surfaces; not now.
- **Backfill of structuredExplanation for the 50 seed items.** Out of scope per §4.4. Standing round candidate.
- **Centralization of the structuredExplanation Zod schema across ingest / explain pipeline / renderer.** Decided as duplicated-but-bounded in §5.2. A future round can centralize; not now.
- **New session-type surfaces.** Sub-phase 3's territory.
- **Production deploy.** Per master plan §1's no-deploy-until-feature-complete framing, deploy gates on Phase 5 v1 + post-Phase-5 rounds completing.
- **Mobile-specific interaction patterns beyond tap=click.** Decided as out of scope in §3.5. Master plan does not pin mobile-specific work; not now.
- **Hover-to-preview interaction model.** Decided against in §3.3.

## 11. Open questions / resolutions

Eight questions surface from the brief plus audit-surfaced additions; each is resolved with rationale per the working principle "decisions, not options."

### 11.1 Click-to-highlight canonical interpretation per master plan

**Question.** Three plausible interpretations exist (stem → explanation; explanation → option list; option → explanation; other). The plan needs to pin one against the actual master plan + roadmap text.

**Resolution.** The canonical interpretation is **explanation part → option list**: clicking the elimination part strikes through the options it referenced; clicking the tie-breaker part highlights the options it referenced. Per audit (A): both master plan §6 and feature-roadmap §3 explicitly pin this direction with the same example phrasings ("cuts 'replace' and 'place' immediately" → strike; "between 'pass' and 'sell'" → highlight). SPEC §3.3.3 reinforces. The other interpretations are explicitly ruled out by the source documents.

### 11.2 §15.2 deferred-add status

**Question.** Is the `WrongItem.structuredExplanation` deferred-add still pending, completed, or shifted?

**Resolution. Pending.** Per audit (B), direct read of `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` and `src/components/post-session/wrong-items-browser.tsx` confirms the field is absent at runtime. The `getWrongItemsForSession` prepared statement does not project `metadata_json`; the `WrongItem` interface does not declare `structuredExplanation`; the component renders prose only. No interim round added the field incidentally. The deferred-add lands at commit 2 of this round. The `WrongItem` field + page-query projection lands together as the master plan's "atomic add" per §15.2 amendment.

### 11.3 Backfill strategy for the 50 seed items lacking structuredExplanation

**Question.** Do the 50 NULL-source-folder seed items need a structuredExplanation backfill, or can they ship with a graceful prose fallback?

**Resolution. Graceful prose fallback; backfill is out of scope.** Per audit (E/F), the 50 items are a known, bounded, prose-only minority (11.4% of the live bank). The UI's prose-fallback path renders the existing `items.explanation` `<p>` unchanged when `structuredExplanation` is absent — same as today. Backfill requires either a new LLM prompt path operating on prose-only seed items (no screenshots) or manual authoring of 50 entries; neither justifies the round-overhead at this stage. Backfill stays a standing round candidate. If a future round reverses this, the new round adds an explain-pass-on-prose pipeline + a backfill ingest path; sub-phase 4 does not pull this forward.

### 11.4 Component composition: new component vs extension of `<WrongItemsBrowser>`

**Question.** Does click-to-highlight ship as a new `<StructuredExplanation>` component, or as an extension inline inside `<WrongItemsBrowser>`?

**Resolution. New component (`<StructuredExplanation>` at `src/components/post-session/structured-explanation.tsx`).** Per §5.1: the `<StructuredExplanation>` component owns the parse boundary, the part-renderers, the per-part button state, and the callback-emitting prop shape. The parent `<WrongItemCard>` owns the option-list strike/highlight state. Splitting at this seam keeps each component's responsibility narrow: one parses + emits, the other composes + paints. Inlining the parse + part-rendering directly into `<WrongItemCard>` would balloon the card's responsibility surface and complicate Alpha Style audit at commit boundaries (one large card vs two small siblings — the smaller cohesive units audit cleaner). The seam matches sub-phase 1's `<StrategySurface>` + `<TriageScoreLine>` decomposition discipline.

### 11.5 Highlight visual treatment per Alpha Style

**Question.** What does the highlight tint look like — `bg-foreground/5` reuse, accent-keyed tint, or a new namespaced token?

**Resolution. Recommended starting point: `bg-foreground/5` reuse + a subtle left-ring or border emphasis to disambiguate from the correct-option marker.** Decision is deferred to commit 4's Alpha Style `audit` per `.alpha-style.md`'s "accents earn placement" principle and the below-3-systemic-token framework. If commit 4's audit surfaces that `bg-foreground/5` reuse is ambiguous (a third occurrence pattern emerging), a namespaced token earns its place; the most likely candidate name is `--highlight-bg`, registered in `globals.css` per sub-phase 5's `--belt-blue` / `--belt-brown` precedent. Strike-through reuses existing `line-through` + `text-foreground/55-/80` tints — no new token needed there. Final visual decision lands at commit 4; the rationale is recorded in commit 4's commit message + this plan's commit-4 line per sub-phase 5's audit-record discipline.

### 11.6 Mobile / touch interaction beyond tap=click

**Question.** Should sub-phase 4 add long-press, swipe, double-tap, or other touch-specific affordances?

**Resolution. No.** Per audit (A), the master plan does not pin mobile-specific work; per §3.5, `<button>` tap=click + `Enter`/`Space` keyboard activation covers the v1 surface area. Long-press adds a hidden affordance (worse than no affordance for a v1 surface where the click target is already large + obvious); swipe adds a touch-vs-scroll ambiguity; double-tap conflicts with browser zoom. Sub-phase 4 ships zero touch-specific affordances beyond what `<button>` semantics provide.

### 11.7 Edge case for items without structuredExplanation

**Question.** How does the UI render the 50 prose-only seed items?

**Resolution. Silent prose fallback.** Per §3.6 and §4.3: the card renders the prose `items.explanation` `<p>` unchanged when `structuredExplanation` is undefined. No "this item has no structured explanation" message, no degraded-state styling, no different prose color. The user sees the prose explanation they would have seen pre-sub-phase-4. The 50 items are indistinguishable from the 389 structured items for users who don't pay attention to whether the explanation has clickable parts; for users who do, the absence of clickable affordances on these items is silent and acceptable.

### 11.8 Test surface posture: throwaway-harness + Playwright spot-check vs introducing component-test infrastructure

**Question.** Should sub-phase 4 introduce `.test.tsx` infrastructure (DOM shim, React Testing Library, per-component component tests) — graduating the standing pattern from the throwaway-harness pattern that sub-phase 5 established?

**Resolution. Throwaway-harness + Playwright spot-check, matching sub-phase 5's posture.** Per §7.1 + §7.2: the codebase has no component-test infrastructure today. Introducing it is a standing round candidate (along with visual-regression infrastructure). Pulling it forward into sub-phase 4 expands the round's blast radius from "ship click-to-highlight" to "ship click-to-highlight + bootstrap component-test infra"; the latter is a separate decision that benefits from being scoped on its own. Sub-phase 4's verification surface (real-DB harness + Playwright spot-check + pure-function unit tests on extracted helpers) is sufficient to close the round per the precedent set by sub-phases 1, 2, and 5. If a future round graduates component-test infrastructure, sub-phase 4's post-hoc test additions are mechanical.

### 11.9 (audit-surfaced) Recognition part with non-empty referencedOptions

**Question.** Audit (F) revealed that some recognition parts carry non-empty `referencedOptions` (1 or 4 refs in the observed sample). Should the UI honor these refs and make recognition interactive when refs are non-empty?

**Resolution. No — recognition is uniformly non-interactive.** Per §3.1: making recognition non-interactive regardless of `referencedOptions` length avoids a per-item branch on `parts[0].referencedOptions.length` and matches the roadmap's "names a pattern, not specific options" framing. The non-zero-refs cases are a minority data shape that the UI deliberately under-utilizes; if a future round surfaces evidence that under-utilization meaningfully hurts review experience, the design can extend recognition to interactive — but that's a future-round decision, not a sub-phase-4 one. Per the working principle "don't pull future work forward."

### 11.10 (audit-surfaced) Zod schema centralization across ingest / explain / renderer

**Question.** The structuredExplanation Zod schema is duplicated across `src/server/items/ingest.ts`, `scripts/_lib/explain.ts`, and (after sub-phase 4) `src/components/post-session/structured-explanation.tsx`. Should sub-phase 4 centralize the three copies into a shared module?

**Resolution. No — duplicated-but-bounded.** Per §5.2: centralization forces a Next.js client-server module-boundary decision (per SPEC §6.14.18) that is not load-bearing for sub-phase 4 — the schema is small (< 30 lines), identical across copies, and each consumer is in a different runtime context (server-only ingest, server-only pipeline, client-only renderer). Centralizing is a refactor that benefits from being scoped on its own. Sub-phase 4 ships click-to-highlight; centralization stays a standing round candidate.
