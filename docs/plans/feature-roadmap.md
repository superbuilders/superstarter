# 18 Seconds — Feature Roadmap (post-Phase 3 close)

This document collects features Leo wants to build, reconciles them against what's already shipped or in-PRD-but-not-yet-shipped, and adds Alpha/Superbuilders-relevant performance features that improve CCAT prep outcomes. Status as of 2026-05-04: Phase 3 closed end-to-end (sub-phases 1 + 2 + 3 + 4 all shipped). The user-facing happy path runs against real items; sub-phase 4 commit 3 is the in-flight close-out doc commit. Production-deploy coupling is unblocked, and a deploy-and-dogfood interlude gates Phase 5 planning detail.

The features are grouped by what they actually are: some are already in the PRD (and just need to get built), some extend the PRD with new scope, and some are net-new ideas worth deciding to build or not build. Several features will require PRD updates at plan-time — those are flagged inline (`PRD update required`) and aggregated in the "PRD-update queue" section.

---

## Categorization summary

| # | Feature | Status | Effort | Priority | PRD update? |
|---|---------|--------|--------|----------|---|
| 1 | Practice tests (full-length) | PRD §4.5; Phase 5 deliverable | M | High (Phase 5) | — |
| 2 | Admin question portal | Net-new (PRD has admin ingest only) | M | Medium (post-Phase 5) | Required |
| 3 | Click-to-highlight explanation review | Architecturally enabled; net-new UI | M | High (Phase 5; depends on post-session review surface) | Required |
| 4 | LLM question generation | PRD §3.2; Phase 4 not yet started | L | High (post-Phase 5; multi-round) | — |
| 5 | Helpful explanations | Already shipped (BrainLift fast-triage explain prompt) | — | — | — |
| 6 | Stats / progress dashboard | Extends PRD §6; ships paired with #10 | M | High (post-Phase 5) | — |
| 7 | Dojo mode (adaptive drill) | PRD §4.2 + UI rename/belt indicator | S | Medium (Phase 5 small extension) | Required |
| 8 | Independent timer mode | Net-new | S | Low-Medium (mini-round) | Required |
| 9 | CCAT lessons | Net-new (PRD has strategies, not lessons) | L | Medium | — |
| 10 | Test history | PRD §6.6; ships paired with #6 | M | High (post-Phase 5) | — |
| 11 | Vocab study guide | Net-new | M | Medium | — |
| 12 | Logout button | **SHIPPED** (sub-phase 3, commit `20948de`) | — | — | — |
| A1 | Cohort comparisons (Alpha-relevant) | Considered, not prioritized | M | — | — |
| A3 | Pattern-recognition speed drills | Considered, not prioritized | M | — | — |
| A5 | Spaced-repetition tightening | Cut from v1 2026-05-04 | — | — | — |

A2 (Confidence calibration tracking), A4 (Pre-session readiness check), and A5 (Spaced-repetition tightening) were cut on 2026-05-04 — see "Open product questions" → Resolved (A2 + A4) and "Cut from v1 2026-05-04" (A5 + four sub-features cut alongside it).

---

## PRD-update queue

Five features in this roadmap require PRD updates before plan-time. Each PRD update is its own commit, scoped to the one feature that needs it, and lands at the START of the round that builds the feature — NOT in this roadmap revision. Listed here as a sequencing reminder so the round-opening commit doesn't surprise anyone:

- **#2 Admin question portal** — expands PRD §3.1 (admin ingest only) to include list/detail/edit/bulk-action surfaces. PRD update is small (one section addition).
- **#3 Click-to-highlight explanation review** — UI surface for the structured-explanation contract that Phase 2 already shipped architecturally. PRD addition belongs in §6.5 (post-session review).
- **#7 Dojo mode** — rename from "drill" to "dojo" + belt-indicator UI extends PRD §4.2's drill-mode framing. PRD update is naming + a UI-surface paragraph.
- **#8 Independent timer mode** — net-new feature, not in PRD at all. PRD addition belongs in §4 (engine surfaces) as a new sub-section.

Two features that EXTEND existing PRD sections without requiring an update because their addition is already specified:
- #6 Stats dashboard extends PRD §6 (Mastery Map already covers some of it).
- #10 Test history is PRD §6.6.

---

## 1. Practice tests (full-length)

**Status: PRD §4.5; not yet built. Phase 5 deliverable per the architecture plan.**

The PRD already specifies this: 50 questions in 15 minutes, real-test difficulty mix and randomized interleaving across the v1 sub-types, pulls from the real-items bank when possible, exits to post-session review on completion or timeout. Full-length tests are independent of skill level — same content distribution as the real CCAT.

**What Leo's request adds**: confirmation that this should be representative of an actual exam from the testbank (not adaptive). The PRD already specifies this as `selectionStrategy: "fixed_curve"` from `src/config/diagnostic-mix.ts` (or a sibling for full-length). The sampling logic is structurally identical to the diagnostic — only the difficulty mix and the session timer differ.

**What's missing technically**:
- Full-length-specific config in `src/config/diagnostic-mix.ts` (or a parallel `src/config/full-length-mix.ts`)
- Route wiring for `/full-length/run` + post-session
- Session timer = 15 minutes (vs. diagnostic's untimed)

**Scope estimate**: ~3-4 commits (audit Phase 5 scaffolding, mix config, route, session-engine wiring, doc updates). Pattern matches sub-phase 1 (diagnostic flow). The 30-second strategy-review gate that PRD §6.5 specifies for full-length-only is cut from v1 — see "Cut from v1 2026-05-04".

---

## 2. Admin question portal

**Status: Net-new. PRD §3.1 specifies admin ingest form only; viewing/reviewing isn't covered.** *PRD update required* (expands §3.1 with list/detail/edit/bulk-action surfaces; one PRD-section addition).

Today: admin ingest form lets Leo (or other admins on the ALLOW-list at `src/config/admins.ts`) create new items one at a time. There's no list view, no filter, no edit-existing-item path, no review-quality-of-existing-items path.

**What this feature is**:
- A list view of all items, filterable by `(subTypeId, difficulty, status, source)`.
- Per-item detail view showing the prompt, options, correct answer, explanation, structured-explanation, embedding metadata, validator outcome (for generated items), and attempt history (how often served, how often correct, median latency).
- Edit-in-place for any field. Edits write a new row with `status: candidate` if the item is `live` (preserving the original); admin-only "promote edit" action lifts the candidate to `live` and retires the original.
- Bulk actions: mark `retired`, regenerate explanation (calls `scripts/regenerate-explanations.ts`'s logic via a server action), recompute embedding.

**Why this matters**: As the bank grows past ~150 items (Phase 4's generation pipeline lands more items, plus the OCR-imported 99 stage-1 items waiting for stage-2 explanations), Leo needs a way to spot-check quality without running SQL. Generated items especially — the validator catches obvious failures, but edge-case ambiguity is something only a human reviewer catches.

**Scope estimate**: ~6-8 commits (list route, detail route, edit form, server actions for edit/retire/regenerate, attempt-stats query, doc updates). Mid-sized round; not blocking Phase 5.

---

## 3. Click-to-highlight in post-session explanation review

**Status: Architecturally enabled (Phase 2 shipped opaque option ids + structured explanations); net-new UI.** *PRD update required* (UI surface in PRD §6.5 post-session review). **Dependency:** requires Phase 5's post-session review surface to ship first; this feature is the second commit on top of that surface, not a parallel one.

Phase 2's structured-explanation contract (`{parts: [{kind, text, referencedOptions}]}`) is forward investment for exactly this feature. Each explanation part already records which option ids it references; the rendered prose is a deterministic projection.

**What this feature is**: in the post-session review, when the user is reading the explanation for an item they got wrong (or right), clicking on a part of the explanation highlights or strikes through the option ids it references.

Two modes per Leo's request:
- **Strike-through eliminations**: clicking the `elimination` part strikes through the options it referenced (e.g., "cuts 'replace' and 'place' immediately" → strike `replace` and `place`).
- **Highlight likely answers**: clicking the `tie-breaker` part highlights the options it referenced (e.g., "between 'pass' and 'sell'" → highlight both, the correct answer wins visually).
- The `recognition` part typically has empty `referencedOptions` (it names a pattern, not specific options) — clicking it does nothing or shows a small tooltip.

**Why this matters for CCAT prep**: the post-session review is where users actually learn. Passive reading of explanation prose is a known weak signal; making the explanation interactive forces engagement with the recognize/eliminate/decide structure that the BrainLift fast-triage framing teaches.

**What's missing technically**:
- Post-session review surface (Phase 5 deliverable; not built yet).
- Client component that consumes `metadata_json.structuredExplanation` and renders parts as clickable elements.
- State management for which option ids are currently struck/highlighted (per-part toggle).

**Scope estimate**: ~3-5 commits, conditional on Phase 5's post-session review surface being built first. Could land as part of the Phase 5 post-session round (recommended) or as a feature-flagged addition after.

---

## 4. LLM question generation

**Status: PRD §3.2; Phase 4 deliverable. Not yet started.**

Already specified in the PRD: four-stage server pipeline (`generateItem → validateItem → scoreItem → deployItem`) orchestrated as a Vercel Workflow. Generator: Claude Sonnet 4 emitting structured JSON. Validator: GPT-4o, 1-5 confidence per check. Scorer: weighted sum. Deployer: writes with `status: candidate`, embedding included.

**What's already in place**: the generator's Zod schema templates at `src/config/item-templates.ts`. The opaque-ids architecture from Phase 2 means the generation pipeline inherits opaque-id semantics for free.

**Open product calls** (from architecture plan, not yet decided):
- Per-sub-type generation rate and target bank size (the PRD's bank-target grid is 14 × 4 = 56 cells).
- How aggressive validator confidence thresholds are (the PRD says ≥4 on all four checks AND nearest-neighbor cosine < 0.92).
- Candidate-promotion shadow mode duration (PRD §4: 30 days before enforcement).

**Scope estimate**: Phase 4 is its own multi-round body of work. Probably 3-4 sub-phases (generator + templates, validator wiring, scorer + deployer, admin generation page).

---

## 5. Helpful explanations

**Status: Already shipped. The BrainLift fast-triage explain prompt is the most product-distinctive piece of the project.**

The four-pass OCR pipeline's explain pass produces structured triage explanations: recognition (name the pattern), elimination (single cut rule, not multi-step derivation), conditional tie-breaker (only when elimination doesn't cover all wrong options).

Where it currently shows up: rendered as `items.explanation` text after the user submits an item. Phase 5's post-session review surface uses this directly; click-to-highlight (#3 above) extends the render shape to interactive.

No scope here — feature exists. Worth reaffirming because the rest of the roadmap depends on the explain contract being settled.

---

## 6. Stats / progress dashboard

**Status: Mastery Map covers per-sub-type mastery state and triage adherence; extending to richer stats is net-new.**

What the Mastery Map shows today:
- 14-icon grid with mastery state (learning / fluent / mastered / decayed)
- Single-line "today's near goal" derived from mastery state + target percentile + target date
- 30-day rolling triage adherence

What Leo's request adds:
- **Per-sub-type accuracy over time** (line chart, last N sessions or last 30 days)
- **Per-sub-type latency over time** (line chart, median latency per session)
- **Per-practice-test breakdown** (how each full-length test went: total accuracy, sub-type breakdown, time used)
- **Streak / consistency tracking** (how many days in a row the user has practiced)

**Why this matters**: short prep horizons (PRD §1: "days to weeks") mean users want to see whether their daily practice is producing measurable improvement. The Mastery Map answers "where do I stand right now?" but not "am I getting better?"

**What's missing technically**:
- Aggregation queries over `attempts` joined to `practice_sessions` for per-session and per-day rollups
- Server-rendered `/stats` route or tab
- Chart rendering (recharts is already in the React-artifact toolchain for this project — usable elsewhere too, or pick one of: recharts, chart.js, plain SVG)
- Per-test detail route (`/history/[sessionId]` shows the test and per-question outcomes)

**Scope estimate**: ~4-6 commits (route, queries, chart components, per-test detail view). Overlaps with #10 (history) — they should ship together as one stats-and-history round.

---

## 7. Dojo mode (adaptive drill that escalates)

**Status: shipped 2026-05-06 across Phase 5 sub-phase 5 (six commits).** PRD §4.2 + SPEC §10.2 + §10.7 reconciled past-tense at round close.

Six-commit round ledger:
- Commit 1 — `8fc6957` — round-open docs (PRD §4.2 + SPEC §10.2 + §10.7 dojo + belt-indicator narrative).
- Commit 2 — `b53d2c2` — `getEndSessionTierForDrill` query + types (dormant; sibling-module placement at `src/server/post-session/end-session-tier.ts`; +5 integration tests).
- Commit 3 — `b31d8cb` — `<BeltIndicator>` component + `tierToBeltColor` helper (dormant; +6 unit tests; two new belt-namespaced tokens `--belt-blue` / `--belt-brown`).
- Commit 4 — `c3c5a88` — wire BeltIndicator into shell heading; drill heading expansion (dormancy chain unblocks atomically; real-DB harness 5/5 scenarios pass).
- Commit 5 — `c32a7fb` — dojo rename across drill route + Mastery Map CTA + run skeleton; full-surface audit + polish (4 copy strings across 3 files; full-surface Alpha Style audit clean; polish no-op).
- Commit 6 — *this commit* — round-close doc reconciliation.

**What landed**:
- **Naming**: User-facing "drill" copy renamed to "dojo" — Mastery Map CTA "Enter dojo: {sub-type}", drill configure subhead "Standard timing. Pick a session length and enter the dojo." + submit "Enter dojo", run skeleton "Preparing your dojo session…". Code-internal vocabulary (`'drill'` session-type, `/drill/[subTypeId]` URL, `DrillConfigure`/`DrillRunContent` identifiers, `data-testid="drill-empty-bank-pane"`) stays.
- **Visual feedback**: `<BeltIndicator>` at slot 1 of the post-session shell (heading-area expansion, drill-mode only). 4-color compressed mapping: white = easy, blue = medium, brown = hard, black = brutal. Audit (D) of the plan recommended 4-color over the original 6-color sketch — the walker has 4 tiers; compressing the canonical white→yellow→green→blue→brown→black palette to 4 keeps each color's signal high and matches the walker's tier domain exactly. The belt body is an SVG rounded-rectangle in the tier color with a contrast textile-stripe at the right end; ARIA carries the full readable phrasing for SR / colorblind parity.
- **Session-end summary**: "You reached the {color} belt on {sub-type}." copy lives inside `<BeltIndicator>`. Pre-floor (fewer than `ADAPTIVE_FLOOR_ATTEMPTS=10` attempts) appends "(calibrating)" so the user knows the walker hasn't stepped yet.
- **Walker output sourcing**: the indicator reads `(fallback_from_tier ?? served_at_tier)` of the most-recent attempt — the tier the walker REQUESTED, not what the bank served — per SPEC §9.2 verification clarification.

**Test count**: 49 → 60 (+11) across commits 2 + 3. Holds at 60 across commits 4 + 5 + 6 (commit-render integration verified via real-DB harness + Playwright headless visual spot-check, not committed component tests — the codebase has no component-test infrastructure per the audit-against-actual-artifact finding).

---

## 8. Independent timer mode

**Status: Net-new. Not in PRD.** *PRD update required* (new sub-section in PRD §4 engine-surfaces).

Use the focus shell's timer + audio + bar chrome as a standalone tool — no questions, no options, just a Submit button + the dual-bar per-question timer + the urgency-loop audio + the session timer bar.

**The use case**: a user wants to take a practice test from a different source (e.g., a paper booklet, a friend's flashcard, an online practice site that doesn't have its own timer). They start the independent timer, answer the question on the external source, click Submit when they're done, advance to the next "blank" question. The chrome trains pace discipline without the app providing content.

**Why this matters for CCAT prep**: a real CCAT prep cycle includes content from multiple sources (Criteria's own free practice test, paper books, friend's questions). The 18-second pace discipline is what 18 Seconds uniquely trains. Letting users use the timer chrome alone extends the pace-training surface beyond the app's own bank.

**What's missing technically**:
- Route: `/timer` (or `/dojo/timer` if it lives under dojo mode).
- A new session type with `selectionStrategy: "blank"` — no item selection, just the timer infrastructure.
- The focus shell already supports rendering with arbitrary `<ItemSlot>` content; a blank-question variant can be built as a new `<ItemSlot>` variant that renders just "Question N" with no prompt/options.
- Configurable session length and per-question target (e.g., 50 questions × 18s, or 10 × 30s for SAT-style timing).

**Scope estimate**: ~3-4 commits (route, blank-question item variant, session-type config, doc updates). Smaller than most rounds; could slot in as a quick mini-round.

---

## 9. CCAT lessons (per-sub-type teaching content)

**Status: Net-new. PRD has strategies (3 per sub-type, plain-text notes); Leo's request is more substantial.**

The PRD's strategy library is small: 3 entries per sub-type × 11 currently-authored sub-types = 33 entries (5 verbal + 6 numerical, excluding `numerical.workrate`, `numerical.speed_distance_time`, and `numerical.lowest_values`, which are pending a separate strategy-authoring round). Each entry is a paragraph or two of plain text. The strategies surface in post-session review (paired with sub-types the user struggled with) and on the history tab.

Leo's request — "lessons for CCAT test taking for certain groups of problems" — implies something larger: structured tutorial content per sub-type, walking the user through what the sub-type tests, common patterns, worked examples, and common traps.

**What this feature is**:
- A `/lessons/[subTypeId]` route per sub-type (14 routes for v1).
- Each lesson is a long-form structured doc: introduction, 3-5 worked examples (with full explanations using the BrainLift fast-triage framing), common patterns, common traps, practice-tips section.
- Lessons are static content (markdown rendered via MDX or similar) — no LLM generation.
- Cross-link from the Mastery Map: "Learn more about [sub-type]" link from each icon.

**Why this matters for CCAT prep**: high-scoring CCAT performers have explicit pattern recognition for each sub-type. Time-pressured pattern recognition is what 18 Seconds trains; the lessons would teach what the patterns ARE, before the user starts practicing under time pressure. This is the "study mode" complement to drill mode.

**Authoring overhead**: this is the most labor-intensive feature on the list because the content is hand-written. 14 lessons × ~1500-3000 words each = 21k-42k words of careful pedagogical content. Could be scaffolded by an LLM and edited; can't be entirely LLM-generated without quality drift.

**Scope estimate**: ~3-4 commits for the technical surface (route, MDX rendering, cross-links from Mastery Map, doc updates). The content itself is a separate workstream — probably 2-4 weeks of writing per Leo's pace, depending on how thorough.

---

## 10. Test history (with go-back-to-any-problem)

**Status: PRD §6.6 specifies a history tab. Not yet built.**

What the PRD specifies: history tab on the Mastery Map, browsable by sub-type or by session, click-into-session shows per-item attempts.

**What Leo's request adds (not new)**: explicit ability to go back to any problem from any past test. This is what `/history/[sessionId]` was already going to be.

**What's missing technically**:
- `/history` route — list of past sessions, filterable by type (diagnostic / drill / full-length / simulation).
- `/history/[sessionId]` — per-test breakdown showing all 50 (or N) items in order, with per-item: prompt, user's answer, correct answer, latency, whether user took triage, explanation.
- `/history/[sessionId]/item/[itemId]` (optional) — drilled-down per-item view for re-reading the explanation. Could fold into per-test breakdown if the page stays manageable.
- Aggregation queries.

**Why this matters for CCAT prep**: revisiting questions you got wrong is a known-effective study technique. The CCAT specifically tests pattern recognition, so seeing the same item type in multiple contexts (during a drill, then again during a full-length test, then in history review) reinforces the pattern.

**Scope estimate**: ~4-5 commits. Overlaps significantly with #6 (stats dashboard) — they should ship as one round titled "stats and history." Together: ~6-8 commits.

---

## 11. Vocab study guide

**Status: Net-new. Not in PRD.**

The verbal section's two vocabulary-bound sub-types (antonyms, analogies) reward an expanded vocabulary: if you don't know the word, no amount of pattern recognition saves you. The CCAT's vocabulary skews toward GRE-level words — recondite, perfunctory, sanguine, etc.

**What this feature is**:
- A vocabulary list, organized by frequency or difficulty.
- Per-word: the word, definition, part of speech, example sentence, synonyms, antonyms (where applicable).
- Flashcard-style review: show the word, user thinks of definition, click to reveal, mark known/unknown.
- Spaced-repetition queue (SM-2-style, similar to PRD §4.3's review queue) so unknown words resurface.

**Why this matters for CCAT prep**: among the 14 v1 sub-types, two are vocabulary-bound (antonyms, analogies). A user who struggles on antonyms can't drill their way to mastery without expanding their vocabulary. The strategy library helps with elimination tactics ("pick the more general opposite") but doesn't help if the user doesn't know the candidate words.

**Source for the vocab list**: ~500-1000 high-frequency CCAT-style words. Existing GRE vocab lists (Magoosh, Manhattan Prep) are reasonable starting points, filtered to words that actually show up in CCAT-style questions. The OCR-imported 99 stage-1 items can be mined for vocab to seed the list.

**Scope estimate**: ~5-7 commits (vocab schema, list-render route, flashcard component, spaced-repetition queue, source-the-word-list workstream). Authoring the word list is parallel work to the technical scope.

---

## 12. Logout button

**Status: SHIPPED.** Sub-phase 3 commit `20948de` added `<SignOutButton>` to the Mastery Map's header (top-right). Calls Auth.js v5's `signOut({ redirectTo: "/login" })`. Visible on `/` only — explicitly absent from focus-shell routes (`/diagnostic/run`, `/drill/[subTypeId]/run`) and from the diagnostic explainer.

Verified end-to-end via `scripts/dev/smoke/sign-out-button.ts`: button renders on `/`; absent in focus shell; click clears the auth_sessions row and redirects to `/login`; post-logout `GET /` redirects to `/login` via the (app) gate. No further work.

---

## Alpha/Superbuilders-relevant additions

Features Leo didn't list but that align with how Alpha/Superbuilders cohorts measurably improve performance outcomes. Each grounded in a specific reason CCAT performance gets better with practice.

### A1. Cohort comparisons

**Status: Considered, not prioritized.** Cohort comparisons need a user base big enough for cohorts to be statistically meaningful — premature for the current scale. Revisit once user volume justifies it.

Show the user's stats relative to a cohort: "you're scoring at the 70th percentile among users prepping in the same window." Anonymized aggregate, no leaderboard, no individual identifiability.

**Why it matters**: Alpha-style cohort dynamics are a known motivator. Users prep harder when they have a relative-position signal. The PRD non-goal of "no leaderboards, no social, no cohorts" specifically rules out individual identifiability — but anonymized percentile positioning isn't social, it's stats.

**Scope estimate**: ~3-4 commits (aggregate query, percentile computation, render on Mastery Map periphery and post-session review).

---

### A2. Confidence calibration tracking

**Status: Cut 2026-05-04.** See "Open product questions" → Resolved for the decision context.

---

### A3. Pattern-recognition speed drills

**Status: Considered, not prioritized.** Overlaps with adaptive drill mode in ways that aren't clearly net-additive as a discrete feature. Revisit as a possible variant inside Dojo mode (#7) rather than as a standalone surface.

A drill mode where each "question" is a short pattern (e.g., a number series with one missing term, a single analogy, a single synonym) shown for a fixed short window (3-5 seconds), then the user types or selects the answer. Trains the recognize-fast skill in isolation from elimination/decision.

**Why it matters**: CCAT speed comes from pattern recognition, not from doing-arithmetic-faster. Isolated pattern-recognition training is a known-effective sub-skill drill, particularly for verbal.antonyms/analogies and numerical.number_series/verbal.letter_series.

**Different from the regular drill**: the regular drill exercises the full triage loop (recognize → eliminate → decide). The pattern-recognition drill exercises only recognize. Faster cycle, more reps per minute.

**Scope estimate**: ~4-5 commits. Could share infrastructure with #8 (independent timer) since both are timer-led variants on the focus shell.

---

### A4. Pre-session readiness check

**Status: Cut 2026-05-04.** See "Open product questions" → Resolved for the decision context.

---

### A5. Spaced-repetition queue tightening

**Status: Cut from v1 2026-05-04.** See "Cut from v1 2026-05-04" section for the decision context.

---

## Recommended sequencing

Based on what's user-facing, what unblocks subsequent rounds, what's grounded in the BrainLift fast-triage framing, and post-Phase 3 dogfood signal informing Phase 5+ priorities:

**Round A — Logout button + sub-phase 3 (drill mode polish). SHIPPED 2026-05-04.** Three commits: `969705e` (plan), `b5510af` (empty-bank pane), `20948de` (sign-out button), `c54f4e2` (close-out). Logout shipped per #12 above. Drill mode audited green against post-sub-phase-1 state; empty-bank pane covers zero-live-item sub-types.

**Round B — Sub-phase 4 (heartbeats + cron-runner wiring). SHIPPED 2026-05-04** (close-out commit in flight). Four commits: `6016275` (plan), `9ce8325` (security fix — ownership-scope on heartbeat route), `78eb047` (smoke), close-out. Audit surfaced and closed a pre-deploy security gap; plan-prompt's expected three-piece build collapsed to a one-piece security-scope add since client + route + cron entry already existed.

**Round Bx — Deploy-and-dogfood interlude. DEFERRED 2026-05-04** until Phase 5 + post-Phase-5 rounds complete, per Leo's no-deploy-until-feature-complete decision. The original framing positioned Bx as the gate on Phase 5 planning detail; that gate is overridden — Phase 5 sub-phase planning starts now (against `main`'s current state, without dogfood signal informing the carve). Bx returns as a non-feature round at whatever future point Leo elects to deploy. No code commits when it runs; the work is dogfood + observation against the then-current feature surface.

**Round C — Stats dashboard + history (combined; #6 + #10).** First post-Phase-3 user-facing round, post-dogfood. ~6-8 commits. The data already exists in `attempts` + `practice_sessions`; this round is rendering it usefully. Does NOT depend on Phase 5 — can ship in parallel with or before Phase 5 sub-phases if dogfood signal favors stats over engine completeness.

**Round E — Phase 5 master arc (v1 scope).** The next major engine-completeness arc. Master plan at `docs/plans/phase5-master-plan.md` carves Phase 5 v1 into five sub-phases (down from seven; see "Cut from v1 2026-05-04" for the cuts). Sub-phase contents:

  - **Sub-phase 1 — Post-session review surface** (the foundation; sub-phases 3 + 4 + 5 all build on it). PRD §6.5 minus the strategy-review gate which is cut from v1.
  - **Sub-phase 2 — Adaptive difficulty walker** (closes the `ErrAdaptiveDeferred` placeholder in `selection.ts`). Foundation for sub-phase 5's belt indicator.
  - **Sub-phase 3 — Full-length test, no strategy gate** (#1; PRD §4.5). Lands on sub-phase 1's review surface.
  - **Sub-phase 4 — Click-to-highlight in post-session explanation review** (#3; PRD §6.5 extension). Builds on sub-phase 1's wrong-items browser.
  - **Sub-phase 5 — Dojo UI rename + belt indicator** (#7). Belt lives on the post-session summary only (focus-shell exclusion). Visualizes sub-phase 2's adaptive walker.

  Estimated total: ~16-22 commits across the five sub-phases. Per-sub-phase planning happens AT ROUND-START. Each sub-phase follows the `docs/plans/phase3-*.md` pattern.

**Round D — Phase 4 sub-phases (LLM generation; #4).** Sequencing position is post-Phase 5 despite the lower phase number. The PRD's candidate-promotion shadow-mode (30 days before enforcement) wants a mature testbank before generated items start landing — Phase 5's full-length-test framing surfaces real-user accuracy/latency signal that the validator can calibrate against. Multi-round body of work: generator sub-phase, validator sub-phase, scorer + deployer sub-phase, admin generation page sub-phase. Likely 3-4 weeks of work.

**Round F — Admin question portal (#2).** Mid-sized round. Lower priority because it's not user-facing, but needed once the bank exceeds Leo's manual-review capacity. Slots after Round D since Round D's generated items are the volume that triggers the need.

**Round G — CUT 2026-05-04.** Both component features (#A2 confidence calibration and #A4 pre-session readiness check) cut. See "Open product questions" → Resolved.

**Round H — Dojo mode UI (#7) + independent timer (#8).** Belt-indicator UI for adaptive drills (depends on Round E's adaptive walking shipping first), plus the standalone timer surface. ~5-7 commits combined. Could split if dogfood signal favors timer over dojo or vice versa.

**Round I — Vocab study guide (#11).** Schema + flashcard route + spaced-repetition for vocab (re-uses Round E's spaced-repetition primitives). Word list authoring is parallel work. ~5-7 commits + vocab list workstream.

**Round J — Lessons (#9).** Most labor-intensive content workstream of any feature. Technical surface is small (~3-4 commits); content authoring is weeks.


---

## Out of scope (explicit non-goals)

These are PRD non-goals or have been explicitly considered and rejected:

- General aptitude prep beyond CCAT (non-goal per PRD §1).
- Mobile-native apps (web only per PRD §1).
- Live tutoring or AI chat (non-goal per PRD §1).
- Direct individual leaderboards (PRD §1; cohort comparisons in #A1 are anonymized aggregates only).

---

## Cut from v1 2026-05-04

Five surfaces from the original Phase-5 architecture-plan-line-66 list cut from v1 on 2026-05-04 as part of v1 scope tightening. Each cut defers to v2 — these are not permanent non-goals. The cuts are doc-only this round (master plan, roadmap, architecture-plan, PRD, SPEC); on-disk code surface (schema files, columns, server actions, reducer state) stays in tree as cut-from-v1-marked vestigial. Code-side cleanup is a deliberate follow-up round, planned after the v1-cuts pass lands.

- **Spaced-repetition queue (was A5).** SM-2 ladder + `review_queue` table + queue-refresh workflow + `/review` session route + Mastery Map "Review (N due)" button. Cut from v1; defer to v2. Rationale: v1 scope tightening — the queue's value is real but its surface area (table, workflow, route, Mastery Map button, route handler) is the largest unbuilt piece in Phase 5; deferring it concentrates v1 on the higher-leverage post-session-review + full-length surfaces. The schema file `src/db/schemas/review/review-queue.ts` stays on disk; the `'review_queue'` selection-strategy throwing-stub stays in `src/server/items/selection.ts` as a defensive guard against impossible state in v1.

- **Strategy-review gate (was bundled with #1 practice tests).** The 30-second post-full-length strategy gate per PRD §6.5. Cut from v1; defer to v2. Rationale: v1 scope tightening — the gate adds friction to full-length completion that we don't yet have signal to justify, and the `strategy_views` LEFT-JOIN deterministic-pick logic adds complexity that the post-session review surface doesn't otherwise need. Full-length tests still ship (sub-phase 3 of Phase 5 v1); they just land on the same post-session review surface as drills, no gate. The schema file `src/db/schemas/ops/strategy-views.ts` stays on disk.

- **Speed-ramp + brutal drill modes.** PRD §4.4's two non-standard timer modes for drills (12s perQuestionTargetMs for speed-ramp; brutal-only items for brutal). Cut from v1; defer to v2. Rationale: v1 scope tightening — the standard-timer drill mode covers the dominant practice loop, and the speed-ramp + brutal modes add a timer-mode-selector UI surface plus per-mode initial-tier branches in `initialTierFor` whose value is unproven without dogfood signal. The `practice_sessions.timer_mode` enum stays as `['standard', 'speed_ramp', 'brutal']`; only `'standard'` is written in v1. Distinction worth pinning: "brutal" as a difficulty TIER (per `item_difficulty` enum, mastery-state references, fallback-walking) STAYS — it's load-bearing for the existing drill engine. Only "brutal" as a drill MODE is cut.

- **Question-timer toggle + session-timer toggle.** PRD §5.1's per-user toggles for the question-timer bar (default-OFF) and session-timer bar (default depends on session type). Cut from v1; defer to v2. Rationale: v1 scope tightening — both toggles add preference-state machinery (`users.timer_prefs_json` column writes, `persistTimerPrefs` server action, `<TimerToggle>` UI surface in the focus shell, `timerPrefs` reducer state) for what's effectively a power-user accessibility feature. v1 ships with PRD §5.1's defaults baked in: session bar always-visible during timed sessions, question bar always default-OFF (no UI toggle to flip it). The `users.timer_prefs_json` column stays on disk; `persistTimerPrefs` stays on disk; the `timerPrefs` reducer state stays on disk. The two toggles cut together because the preference-state-machinery cost is the same whether one or both ship.

- **NarrowingRamp pre-session protocol.** PRD §5.3's 75-second pre-session sequence (obstacle scan + visual narrowing + session brief + countdown launch). Cut from v1; defer to v2. Rationale: same friction-grounded reasoning that drove the A4 (pre-session readiness check) cut on 2026-05-04 — pre-session protocols add friction to session start whose value is unproven without dogfood signal. Consistent with A4's cut from commit `064a386`. The `practice_sessions.narrowing_ramp_completed` and `if_then_plan` columns stay on disk and are written by `startSession` with default values (always `false`/`null` in v1 since no caller passes `ifThenPlan`).

---

## Open product questions for Leo

### Resolved

1. **A2 (confidence calibration): cut. Decision date 2026-05-04.** Leo's 2026-05-04 directive: cut entirely from scope. Round G evaporates (its other component, A4, also cut — see below).

2. **A4 (pre-session readiness): cut. Decision date 2026-05-04.** Leo's 2026-05-04 directive: cut entirely from scope. The metacognitive framing in Leo's earlier feature list is set aside; the prior sub-phase-2-close demotion ("adds friction; defer until evidence users want it") effectively stands as the durable position.

### Forward-looking (don't block current rounds)

1. **Lessons authoring (#9): how thorough?** A 1500-word lesson per sub-type vs. a 3000-word lesson is a meaningfully different investment. Worth deciding before lesson authoring starts.

2. **Vocab study guide (#11): how long is the list?** 500 words is a reasonable starter; 1000+ words is more comprehensive but takes longer to populate. Bigger lists also make spaced repetition more meaningful but increase the time-to-completion for users who want to "study the whole list."

3. **Independent timer (#8) vs. dojo mode (#7) overlap.** They share the focus-shell-as-engine pattern but serve different use cases. Worth deciding whether they're discrete features or two configurations of one feature ("blank items + adaptive blanks" as a unified interface).

4. **Stats dashboard (#6) chart granularity.** Per-session line charts? Per-day rollups? Both? Most useful is probably per-session (one point per session) for sessions and per-day rollup for sub-type accuracy/latency. Worth confirming before chart rendering work starts.

---

## Notes for the next planning round

The next planning round is **Round Bx — deploy-and-dogfood**, which is non-feature work. After Round Bx closes, whatever round Leo picks next, the planning prompt should:

- Reference the relevant section of this roadmap.
- Confirm whether the round is "build per the PRD" (e.g., #1 full-length tests, #4 generation pipeline, #10 history, #A5 spaced repetition — all already PRD'd) vs. "extends scope" (everything else).
- If the round needs a PRD update (per the PRD-update queue above), the round's first commit lands the PRD update; this is separate from the per-round plan commit. Round-opening shape is `docs(prd): <feature> — § update` → `docs(plans): add <round> plan` → implementation commits → `docs: close <round>`.
- Pull the right verification protocol items from SPEC §6.14 (the implementation-notes section that's grown to 16 entries through Phase 3 and is the generalizable cheat sheet for future rounds).
- Note any deploy-coupling — Phase 3 is fully production-ready as of sub-phase 4 close; subsequent rounds either ship independently or couple with later rounds.

**Round-Bx-specific planning notes** (the dogfood interlude): no per-round plan file is required. The "round" is a deploy + observation window. Useful pre-round artifacts: a dogfood-signal-collection checklist (what to observe, what to log), an empty Round-C-or-Round-E pick decision document that fills in based on signal. These can live as inline notes in this roadmap or as a `docs/plans/round-bx-dogfood-notes.md` if Leo prefers a dedicated file.

**Round-C planning notes** (when Round Bx closes and Round C is picked): the natural shape is the same audit-then-build pattern that worked in sub-phases 2-4. Audit existing `attempts` + `practice_sessions` query patterns + check whether any aggregations already exist (e.g., `triageRolling30d` from sub-phase 1), identify drift from current Mastery Map render, ship targeted fixes + new aggregations + chart components.
