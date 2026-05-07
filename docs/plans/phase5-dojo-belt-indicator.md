# Plan — Phase 5, sub-phase 5: Dojo UI rename + belt indicator

> **Status: planning, approved, not yet implemented.** This plan was drafted audit-first against `main` post-tagger-improvement-round close (HEAD = `9acf9a2` at draft time). The master plan's §7 framing is the starting point; where the audit recommends a different shape, the plan recommends that shape with rationale. **Closed-plans-immutable per SPEC §6.14.20 once written.**

This plan covers Phase 5 sub-phase 5 — the dojo-mode UI rename plus the belt-indicator visualization of the adaptive walker's per-session tier walk. It is the fifth and final sub-phase of Phase 5 v1 per master plan §8 sequencing. Predecessors: sub-phase 1 (post-session review surface, shipped 2026-05-04) and sub-phase 2 (adaptive walker, shipped 2026-05-06). Sub-phases 3 (full-length test) and 4 (click-to-highlight) are independent of this sub-phase and remain unshipped; they are not gated on sub-phase 5 and sub-phase 5 is not gated on them. The user's brief affirms ordering 5 ahead of 3/4 against the master plan §8 sequencing — rationale: belt indicator depends only on sub-phases 1 + 2, both shipped.

This sub-phase is **UI-heavy** per master plan §7's "largest UX shift" framing. The plan shape matches sub-phase 1's seven-commit UI-heavy template (post-session-review precedent) more than sub-phase 2's three-commit server-side template (adaptive-walker precedent). Alpha Style cadence re-engages at commit boundaries; render-slot locking conventions inherit from sub-phase 1.

## 1. Why this sub-phase, why now

This is Phase 5's last sub-phase. Three forcing functions:

- **Dependencies are both shipped.** Sub-phase 1 (post-session review surface, foundation for the belt indicator's render slot) closed clean 2026-05-04. Sub-phase 2 (adaptive walker, the belt indicator's data source) closed clean 2026-05-06 with `nextDifficultyTier` / `AdaptiveContext` / `initialTierFor` exported from `src/server/items/selection.ts` for downstream consumption. The belt indicator visualizes the walker's current tier; without the walker the belt would be static and misleading. Both prerequisites are settled.

- **Bank has empirical depth across all 56 tier cells (post-tagger-improvement).** The adaptive-walker round close-out flagged `numerical.workrate.easy = 0` and `numerical.lowest_values.hard = 0` as fallback-handled cells; the just-closed tagger-improvement round (`9acf9a2`, 2026-05-06) populated both — bank is now 439 items across 14 sub-types with both non-brutal zero cells filled. The walker can step meaningfully through the full tier range on every sub-type the user touches. The belt indicator's "what tier did the walker reach?" surface is correspondingly truthful for every sub-type.

- **Sub-phase 5 unblocks Phase-5-v1 round close.** Per master plan §8, sub-phase 5 is sequencing-position-5 (last). Once it ships, Phase 5 v1 is feature-complete — the next operational round is the post-Phase-5 cleanup / dogfood / deploy sequence (Round Bx is no longer "next"; per master plan §1's no-deploy-until-feature-complete decision, deploy gates on Phase 5 + post-Phase-5 rounds completing). Independent sub-phases 3 (full-length) and 4 (click-to-highlight) can ship in any order relative to sub-phase 5 (no dependency in either direction); the user's brief deliberately runs sub-phase 5 ahead of 3/4 because the dojo metaphor + belt is the largest UX shift and benefits from landing while the post-session shell is freshly-clean from sub-phase 1.

**Sub-phase 5 ahead of 3 + 4.** Master plan §8 carves the sequencing as 1 → 2 → 3 → 4 → 5; the user's brief overrides this for 5 ahead of 3 + 4 because (a) belt indicator depends only on shipped predecessors, (b) full-length and click-to-highlight are independent of belt and don't lose by waiting, (c) the dojo rename touches surfaces that 3 and 4 will inherit cleanly (full-length lands on the same post-session shell; click-to-highlight extends the same wrong-items browser). Re-sequencing is reversible without rework if a future round flips back.

## 2. Audit findings against `main`

The current state, as of `main` HEAD `9acf9a2`:

### 2.1 Master plan framing of sub-phase 5 (audit (A))

Master plan §7 frames sub-phase 5 as **one bundled sub-phase** containing both the rename and the belt indicator: "Dojo mode UI rename + belt indicator on post-session summary." The scope paragraph reads: "Rename 'drill' copy to 'dojo' wherever user-facing (not in code-internal session-type values), add `<BeltIndicator>` component that visualizes the adaptive walker's current tier as a martial-arts belt color (white → yellow → green → blue → brown → black mapped to easy / medium / hard / brutal — exact mapping decision deferred to sub-phase plan), and update the post-session summary copy from generic accuracy stats to 'you reached [tier] on [sub-type]' framing." Rough commit count is 3-4 per master plan.

Two specific phrasings from the master plan are load-bearing for §3 below:
- "exact mapping decision deferred to sub-phase plan" — the belt color → tier mapping is for this plan to settle.
- "the mid-session focus-shell chrome row does NOT carry the belt indicator unless this sub-phase's plan rationales otherwise at plan-time" (§7 + §12.4).

The master plan's bundling is firm but not absolute: §12.4 explicitly invites a sub-phase-plan-time rationale to override the focus-shell exclusion, and by extension the bundling shape itself is open to revision if the audit surfaces blast-radius signal. This plan §3 settles the bundling question against current audit (B).

### 2.2 Existing dojo-metaphor terminology in the codebase (audit (B))

Greenfield in code; the dojo metaphor exists only in planning docs. Search results across `src/`:

- **Zero hits for "dojo"** in `src/`. The metaphor has not started landing in code copy yet.
- **Zero hits for "belt"** as a noun in user-facing context. Existing matches are unrelated comments ("belt-and-suspenders" defensive-coding shorthand in `src/app/(app)/page.tsx` and `src/components/focus-shell/shell-reducer.ts` — code idiom, not user-facing copy; safe to leave alone).

Search results across user-facing copy strings (excluding code-internal session-type enum values, comments, and test fixtures):

- **"drill" / "Drill" user-facing strings:** Found in five places worth surface-listing for §4:
  - `src/components/mastery-map/start-session-button.tsx`: button label `"Start drill: {displayName}"` — primary CTA on Mastery Map.
  - `src/app/(app)/drill/[subTypeId]/page.tsx`: configure-page subhead `"Standard timing. Pick a length and start."` (no "drill" word but the page is the drill configure surface) and submit-button label `"Start drill"`.
  - `src/app/(app)/drill/[subTypeId]/run/page.tsx`: skeleton fallback copy `"Preparing your drill…"`.
  - `src/components/drill/empty-bank-pane.tsx`: `data-testid="drill-empty-bank-pane"` (test attribute; renames if the rename touches test selectors — see §4 verification).
  - `src/components/post-session/post-session-shell.tsx`: heading branch — non-diagnostic mode renders `"Session complete"` (not "Drill complete"); already generic. The `SessionTypeForShell = "diagnostic" | "drill" | "full_length" | "simulation"` type union is internal-not-user-facing; stays.
- **"Mastery Map"** is the title of the home screen — a single occurrence in `src/components/mastery-map/mastery-map.tsx` (`<h1>Mastery Map</h1>`). Also the cross-reference in `<EmptyBankPane>` body copy ("Try a different sub-type from the Mastery Map.") and "Back to Mastery Map" CTA. Master plan §7 does NOT call for renaming "Mastery Map"; the rename target is "drill → dojo," not "Mastery Map → Dojo Map." Audit confirms: out of scope unless §3 expands.

**Code-internal terminology stays.** The session-type enum value `"drill"` (in `practice_sessions.type`, `selectionStrategyForSession`, `startSession` input, `actions.ts` zod enum, `selection.test.ts` fixtures) is NOT user-facing and stays. Master plan §7's parenthetical "not in code-internal session-type values" pins this. Schema columns, type unions, function names with `drill` in their identifier (`getNextAdaptive` formerly `getNextUniformBand`, `DrillRunContent`, `DrillConfigure`, `DrillLength`, `startDrill`, `asDrillLength`) all stay — they are implementation vocabulary, not user-facing copy.

**URL paths stay.** `/drill/[subTypeId]` and `/drill/[subTypeId]/run` remain unchanged. Renaming the URL would (a) break any user bookmarks (low risk in v1 pre-deploy but real), (b) cascade into `next/link` href references and route-group structure, (c) expand the rename's blast radius for negligible UX gain (the URL bar is rarely the user's first signal of mode). The audit recommendation: URL stays `/drill/`, only the user-facing copy renames. Masters plan does not mandate URL rename; this is the conservative read.

**Blast radius summary.** The rename's user-facing surface is **5 small copy strings** across **3 files**: (1) `<StartSessionButton>` label (one string), (2) drill configure page submit-button + page subhead (two strings; subhead arguably non-drill-specific), (3) drill run-page skeleton fallback (one string). Plus optional: (4) `<EmptyBankPane>` body copy mentioning "Mastery Map" (the cross-reference) — Mastery Map stays, so this is a non-rename. The rename is **lighter than the master plan implied**; this informs §3.

### 2.3 Walker output shape — what surfaces need the tier (audit (C))

`nextDifficultyTier(ctx: AdaptiveContext): Difficulty` returns `"easy" | "medium" | "hard" | "brutal"` per `src/server/items/selection.ts:207`. The walker decides REQUESTED tier per attempt; the bank may serve a different tier (tier-degraded fallback). Per SPEC §9.2 verification clarification, the requested tier is `(fallbackFromTier ?? servedAtTier)`.

**Three candidate surfaces for belt-indicator render:**

1. **Per-attempt (in-flow during drill).** Live tier readout inside `<FocusShell>` chrome row or as an overlay. **Excluded by the focus-shell exclusion** per master plan §10 + §12.4 + .alpha-style.md "focus-shell exclusion is permanent for v1." The focus shell's visual language is tuned for triage pressure; introducing a non-pace, non-triage visual element would muddle the discipline. Master plan §12.4 invites a plan-time override but the rationale must address (a) introducing a non-pace visual element into a chrome row whose every element is already pace-keyed, and (b) potentially distracting from the 18-second triage prompt. **§3 does NOT override.**

2. **Per-session-summary (post-session).** Show the user the tier reached during the session that just ended. Renders in the existing `<PostSessionShell>` (sub-phase 1's surface). Drill mode only (other session types use `'fixed_curve'` strategy and have no tier walk). **This is the master plan §7's pinned location.**

3. **Per-sub-type (Mastery Map view of the user's current tier per sub-type).** Render belts on the 14-icon grid, showing what tier the walker most-recently-reached for each sub-type. Requires reading the most-recent drill session's last attempt's `(fallbackFromTier ?? servedAtTier)` per sub-type — a per-sub-type query, not per-session. **NOT in master plan §7 scope.** The walker's per-session output is ephemeral; "the belt you reached on this sub-type" across sessions is a different feature and is post-Phase-5 work (the feature-roadmap entry would call it "per-sub-type belt history" or fold into a future Mastery Map enhancement).

**Recommendation**: belt indicator surface is **post-session only** per master plan §7, audit affirms.

### 2.4 Belt-indicator visual shape (audit (D))

The "belt" metaphor maps to martial-arts belt colors. Master plan §7 names a 6-color palette (white → yellow → green → blue → brown → black) but the walker has only 4 tiers (easy/medium/hard/brutal). The mapping is under-determined; this plan picks one.

Two natural mappings:

- **4-tier compressed mapping**: white = easy, blue = medium, brown = hard, black = brutal. Picks 4 from the canonical 6, drops yellow + green. Aligns 1:1 with walker tiers.
- **6-tier expanded mapping**: stretches across all 6 colors with intermediate "you walked from easy through medium to hard" being expressible as multiple-belts-worth-of-progression. Requires the indicator to track tier-change history within a session, not just the current tier.

The feature-roadmap §7 sketch ("white belt → yellow → green → blue → brown → black, mapping to easy / medium / hard / brutal / etc.") leaves "etc." undefined. **Recommendation in §5: 4-tier compressed mapping** — it matches the walker's tier domain exactly, doesn't require history-tracking schema, and reads cleanly as "you reached the brown belt on antonyms this session." See §5 for the specific color picks + rationale.

### 2.5 Alpha Style baseline drift check (audit (E))

`.alpha-style.md` last-modified `2026-05-04 23:56` (commit `c1ee435`, sub-phase 1 commit 1). Since then:
- Sub-phase 2 shipped (server-side; no UI touch).
- Three operational rounds (taxonomy-restructure, data-wipe, testbank-re-extraction) — server/data; no UI touch.
- Diagnostic-bug-fixes round (audio-on-Q1 + line-height-tightening; touched FocusShell which is **excluded from Alpha Style** per the .alpha-style.md "load-bearing boundary").
- Tagger-improvement round (server/data; no UI touch).

**No design-system drift.** All UI commits since sub-phase 1 close were inside the focus-shell exclusion or were server-only. The Alpha Style baseline carries forward unchanged into sub-phase 5. No `teach-alpha-style` re-run needed.

**Sub-phase 5 will be the second sub-phase to invoke Alpha Style operational commands** (`audit / normalize / polish`); the .alpha-style.md "operational commands cadence" section mentions sub-phase 1's specific cadence — the file's per-sub-phase cadence note at lines 36-40 stays as historical reference; sub-phase 5 sets its own cadence per §6 below.

### 2.6 Slot-locking inheritance (audit (F))

Sub-phase 1's `<PostSessionShell>` defines a locked nine-slot ordering (see `src/components/post-session/post-session-shell.tsx` lines 22-32):

1. Heading + brief one-line summary
2. `<TriageScoreLine>`
3. `<AccuracySummary>`
4. `<LatencySummary>`
5. `<WrongItemsBrowser>`
6. `<StrategySurface>`
7. `<OnboardingTargets>` (diagnostic-only)
8. Pacing-line sentence (diagnostic-only, conditional)
9. Continue CTA (non-diagnostic)

The belt indicator is net-new and needs a slot. Two options:

- **Option (a): expand the heading (slot 1) to include the belt + tier-reached copy.** The heading is "Diagnostic complete" / "Session complete"; sub-phase 5 expands the non-diagnostic branch to include `<BeltIndicator>` + "you reached [tier] on [sub-type]" copy. Doesn't disrupt slots 2-9.
- **Option (b): add a new slot — slot 1.5 between heading and `<TriageScoreLine>`.** Renumbers downstream slots; slot count goes to 10. More invasive but separates the belt as a distinct review element.

**Recommendation in §5: option (a)** — expand the heading branch. The belt + tier-reached copy is **a session-level summary**, not a separate review element peer to triage / accuracy / latency. It belongs in the heading area as the visual anchor of the post-session render. Doesn't disrupt the existing slot-locking; sub-phase 4's wrong-items browser extension stays untouched.

### 2.7 Mastery Map current state (audit (G))

`<MasteryMap>` (`src/components/mastery-map/mastery-map.tsx`) renders:
- Header: `<h1>Mastery Map</h1>` + `<NearGoalLine>` + `<SignOutButton>`
- 14-icon grid grouped by section (verbal / numerical) — `<MasteryIcon>` per sub-type, drives off `mastery_state.current_state`
- Primary CTA: `<StartSessionButton>` (the "Start drill: {displayName}" button)
- Footer: `<TriageAdherenceLine>` (rolling 30-day, low-contrast peripheral indicator)

The "Review (N due)" button was cut from v1 (PRD §4.3 + SPEC §3.5 cut markers); the master plan's §1 + §2 cuts list confirms. The Mastery Map is **post-cut clean** — no surface elements pending future restoration in v1.

**Belt indicator on Mastery Map: out of scope** per audit (C) recommendation. Per-sub-type "your latest belt across all your drill sessions" is not master plan §7 scope; lives as post-Phase-5 work if it surfaces. Mastery Map is untouched in this sub-phase except for the `<StartSessionButton>` label rename if §3 includes the rename (per audit (B)'s 5-string blast radius).

### 2.8 Drill route current state (audit (H))

The drill route renders:
- `/drill/[subTypeId]/page.tsx`: configure page (length picker 5/10/20, "Start drill" submit button).
- `/drill/[subTypeId]/run/page.tsx` + `content.tsx`: kicks off `startSession({ type: "drill", ... })` and mounts `<FocusShell>` with drill config. Skeleton fallback "Preparing your drill…".
- The focus shell renders mid-session; chrome row is the post-overhaul-fixes-tuned dual-bar timer + pace track + question timer + audio.

**No belt indicator in the drill route** per the focus-shell exclusion. Sub-phase 5 touches:
- Configure page copy (rename "Start drill" → dojo equivalent if §3 includes rename).
- Run-page skeleton copy (rename "Preparing your drill…" → dojo equivalent).
- Possibly the `<EmptyBankPane>`'s nav copy (one cross-reference; see audit (B)).

**Drill route is light-touch.** The bulk of sub-phase 5's work lands on the post-session surface, not the drill route.

### 2.9 SPEC drift summary

Two SPEC sections to reconcile at sub-phase close:
- **SPEC §10.2 (Drill walkthrough).** The "drill" copy reframes to dojo per the rename if §3 includes it. The §10.2 narrative itself describes the engine's drill mode, not user-facing copy; the rename is a thin doc-update. The "Phase 3 ships only `standard` timer mode" parenthetical (line 2074) and the post-cleanup line 2076 already reflect Phase 5 sub-phase 1's drill landing flip; sub-phase 5's SPEC update is purely the dojo-rename narrative addition.
- **SPEC §6.5 (Post-session review).** Add the belt-indicator narrative as part of the post-session review composition. Past-tense reconciliation: SPEC §6.5 already names the post-session shipped at sub-phase 1 close; sub-phase 5 appends the belt-indicator addition.

**PRD update required.** PRD §4.2 (adaptive difficulty) is the canonical spec for the walker's behavior; sub-phase 5 extends it with the dojo metaphor + belt-indicator UI surface paragraph. Per master plan §9's PRD-update queue convention, this PRD update lands in sub-phase 5's opening commit (before the rename or belt-indicator commits).

### 2.10 Schema readiness

- `attempts.servedAtTier` (Difficulty enum) — already populated by every drill attempt. Reading the last-attempt's tier per session is a session-scoped query against the attempts table; same `attempts_session_id_idx` index that the walker uses. **Reusable as-is.**
- `mastery_state` — read for the initial-tier derivation if the belt-indicator's "starting tier" line wants to render `initialTierFor(masteryState)`. Per-user-per-sub-type lookup; existing `readMasteryStateFor` pattern.
- `practice_sessions.type` — already drives the post-session shell's session-type-aware dispatch. Belt indicator renders only for `type === "drill"`.

**No schema migrations required.** The belt indicator is a derivation + render layer over existing tables.

## 3. Scope decision: bundle vs split

The plan must choose how to scope sub-phase 5. Three options:

- **Option (i): bundle rename + belt indicator together.** Master plan §7's framing.
- **Option (ii): belt-indicator-only this sub-phase; rename is sub-phase 5b or later round.** Belt indicator depends on shipped walker; rename is terminology-only and lower-priority.
- **Option (iii): rename-only this sub-phase; belt indicator is sub-phase 5b or later round.** Rename establishes the metaphor; indicator is the payoff.

### Recommendation: Option (i) — bundle rename + belt indicator

**Rationale**, grounded in audit (B)'s blast-radius finding:

- **Rename blast radius is small** — 5 user-facing copy strings across 3 files. The audit corrected the master plan's implied weight ("rename 'drill' copy to 'dojo' wherever user-facing" sounded heavier than it is in practice). A small rename folded into a UI-heavy round is cleaner than splitting it into a follow-up round of its own.
- **The dojo metaphor is the framing for the belt** — shipping the belt without the rename leaves users with "you reached the brown belt on a *drill*" copy that's metaphor-incoherent. Shipping rename without the belt leaves the user with `dojo` copy and no visible payoff for the rename. The two halves earn each other.
- **One coherent UX shift** — the master plan §7's "largest UX shift" framing is correct *because* of the bundling; splitting reduces each half's individual UX-shift weight to "trivial copy edit" + "isolated indicator," and the metaphor's coherence dissolves.
- **Round close-out is cleaner** — bundled, one PRD update + one SPEC update lands at round close. Split, the rename half becomes a follow-up doc-only round, which is a worse use of round-formatting overhead.

**Predecessor template**: this matches sub-phase 1's "ship the surface AND the supporting routing flip together" precedent (sub-phase 1 bundled the drill-landing-flip with the new components in one round). Splitting is the wrong default.

**Commit count under option (i): 5-7.** See §8 for the cluster proposal.

## 4. Dojo UI rename design

### 4.1 Surface inventory + rename mapping

Per audit (B), the user-facing strings are limited. The rename mapping:

| File | Line | Current | New | Notes |
|---|---|---|---|---|
| `src/components/mastery-map/start-session-button.tsx` | 26 | `"Start drill: {displayName}"` | `"Enter dojo: {displayName}"` | Primary CTA on Mastery Map. "Enter" reads as the "step into" framing for the dojo metaphor. |
| `src/app/(app)/drill/[subTypeId]/page.tsx` | 119 | `"Standard timing. Pick a length and start."` | `"Standard timing. Pick a session length and enter the dojo."` | Configure-page subhead. Reframes "start" → "enter the dojo." |
| `src/app/(app)/drill/[subTypeId]/page.tsx` | 129 | `"Start drill"` | `"Enter dojo"` | Configure-page submit-button. Pairs with the heading. |
| `src/app/(app)/drill/[subTypeId]/run/page.tsx` | 90 | `"Preparing your drill…"` | `"Preparing your dojo session…"` | Skeleton fallback. "Dojo session" reads better than bare "dojo" here. |

The post-session non-diagnostic heading (`"Session complete"`) stays generic — it covers drill, full-length, and simulation. Rendering "Dojo session complete" on a full-length post-session would be incorrect. The dojo framing applies specifically to the drill session type; the post-session shell carries the per-session-type awareness and §5 below adds drill-specific dojo copy via the belt-indicator slot.

**Out-of-scope copy**:
- `"Mastery Map"` heading + cross-references — stays. Master plan §7 does not rename Mastery Map; rename is "drill" → "dojo," not "Mastery Map" → "Dojo Map." A future round may revisit; out of scope here.
- `"No questions available for {displayName} yet."` (`<EmptyBankPane>`) — neutral, no "drill" word; stays. The pane's body copy ("Try a different sub-type from the Mastery Map.") references the unchanged "Mastery Map"; stays.
- `<DrillRunContent>` / `<DrillConfigure>` / `DrillLength` / `startDrill` — internal identifiers, not user-facing. Stay.
- Test fixture strings ("drill" in `selection.test.ts`'s test names + bodies) — internal. Stay.

### 4.2 Test-attribute renames (or not)

`<EmptyBankPane>` carries `data-testid="drill-empty-bank-pane"`. Two options:
- Leave as-is. `data-testid` is internal; no user-visible change. Future test code continues to find the pane by current id.
- Rename to `data-testid="dojo-empty-bank-pane"` (or `data-testid="empty-bank-pane"` neutral). Risk: any existing test that asserts the testid breaks.

**Recommendation: leave as-is.** Testids are non-user-facing; the rename is scoped to user-visible copy only. The "code-internal vocabulary stays" principle applies to testids the same way it applies to function names.

### 4.3 Component / file renames (or not)

`src/components/drill/empty-bank-pane.tsx` lives in a `drill/` directory. Three options:
- Rename `drill/` → `dojo/`. Cascades into every import path.
- Move `empty-bank-pane.tsx` to a neutral location (e.g., `src/components/post-session/` or `src/components/`).
- Leave as-is.

**Recommendation: leave as-is.** The directory is implementation vocabulary, not user-facing. Renaming the directory breaks `git blame` continuity, churns import paths, and provides zero user-visible benefit. The "internal identifiers stay" principle holds.

### 4.4 Rename blast radius

- **3 files modified** (`start-session-button.tsx`, drill `page.tsx`, drill run `page.tsx`).
- **5 copy strings changed** (one CTA, one subhead, two button labels, one skeleton).
- **Zero file renames**, zero directory renames, zero import-path churn.
- **Zero test fixture updates**: existing tests assert behavior, not specific copy strings. (Verified by reading sub-phase 1's verification protocol — the wrong-items / accuracy / latency tests don't assert "drill" or "dojo" specifically; they assert components render rows with correct semantic content.)
- **Zero schema migrations**, zero DB column renames.
- **Zero URL / route changes.**

**Internationalization considerations**: not applicable in v1 (single-language English). If a future i18n round lands, the rename strings become i18n keys at that round's commit.

### 4.5 Documentation updates from rename

- **PRD §4.2** — append a paragraph naming the dojo metaphor + belt-indicator UI surface. PRD update lands in sub-phase 5's opening commit per master plan §9's PRD-update queue convention.
- **SPEC §10.2** — add a sentence acknowledging the dojo rename in the drill walkthrough. The §10.2 narrative remains engine-focused (it describes routing, configure, run, post-session); the dojo rename is a copy-layer reframe and gets a single sentence.
- **`docs/plans/feature-roadmap.md` §7** — already names the dojo rename; update to past-tense at round close. Same convention as sub-phases 1 and 2.

## 5. Belt indicator design

### 5.1 Visual shape

`<BeltIndicator>` renders as a horizontal belt-shape graphic (a small SVG strip with a rounded-rectangle "belt" + a single textile "stripe" representing the tier reached) plus a text label ("Brown belt — Hard tier"). Renders inside the heading area (slot 1's expansion per audit (F)) of the non-diagnostic post-session shell.

Two visual elements compose the indicator:
- **Belt graphic** — an SVG strip styled per Alpha Style. Color encodes the tier (per §5.2). The belt itself is the visual anchor; the graphic is small (compatible with the editorial typography hierarchy — does not dominate the heading).
- **Text label** — "{Color} belt — {Tier} tier" (e.g., "Brown belt — Hard tier"). Color name first because the belt is the metaphor's primary affordance; tier name second because the user knows the difficulty system.

**Why a belt SVG and not a badge or progress bar**: a badge implies achievement-unlocked-once (the belt is per-session, not lifetime); a progress bar implies the user is mid-progression (the belt is the *result*, not the journey). The belt-shape SVG is the metaphor's most direct visual.

### 5.2 Belt color → tier mapping

Per audit (D), the 4-tier compressed mapping is recommended over the 6-tier expanded mapping. Specific colors:

| Walker tier | Belt color | Token color | Rationale |
|---|---|---|---|
| `easy` | White | `oklch(--bg-foreground)` (light surface w/ outline) | Beginner. Universally understood as "starting belt" in martial arts. |
| `medium` | Blue | Alpha Style accent blue | Mid-progression. The blue accent token is established Alpha Style territory; reuses a known token. |
| `hard` | Brown | A custom warm-neutral (e.g., oklch warm 0.45) | Senior. Brown reads as "earned." Skips green to keep the palette tight (4 colors, not 6). |
| `brutal` | Black | `text-foreground` near-black | Mastered. Universally understood as "highest belt." |

**Why skip yellow + green**: per audit (D), the canonical 6-color sequence stretches the color range thinner than the walker's 4 tiers warrant. A yellow → green progression would imply two intermediate steps the walker doesn't actually carve. Compression to 4 keeps each color's signal high.

**Why blue for medium, not green**: Alpha Style's brand palette uses blue + indigo accents deliberately (.alpha-style.md "accents earn placement"). Reusing the blue accent token here keeps the palette cohesive. Green would be a net-new color in the design system for marginal metaphorical fidelity.

**Color tokens, not raw colors**: the four belt colors map to design-system tokens, not raw oklch values. This way Alpha Style audits + future light/dark theme work pick up the tokens consistently. Specific token names land at commit time per the Alpha Style operational discipline (§6).

### 5.3 Where it renders

Per audit (C) and audit (F), the belt indicator renders **inside the heading area (slot 1) of the post-session shell**, drill-mode only:

- **Drill mode**: heading expands from `"Session complete"` to `"Session complete"` + `<BeltIndicator>` + `"You reached the {color} belt on {sub-type}."` copy.
- **Diagnostic mode**: belt indicator NOT rendered (diagnostic uses `'fixed_curve'` strategy; no walker, no belt to show).
- **Full-length mode** (sub-phase 3, future): belt indicator NOT rendered (full-length uses `'fixed_curve'`; same reasoning).
- **Simulation mode** (out of v1): belt indicator NOT rendered.

**Rationale for drill-mode-only**: the belt visualizes the walker; no walker = no belt. Rendering an "easy belt — initial tier" indicator on a non-drill session would be pedagogically wrong (the user didn't walk to easy, they took a fixed-curve session that has no walking concept).

**The mid-session focus-shell chrome row does NOT carry the belt indicator** per master plan §10's focus-shell exclusion + §12.4's pinned-resolution. This plan does NOT override the pin; the rationale (introduces non-pace visual element + potential triage-prompt distraction) remains compelling. Belt indicator is post-session-only.

### 5.4 Data flow

1. **Server-side**: post-session `page.tsx` fires a new query against `attempts` for the current session, returning the **last attempt's `(fallbackFromTier ?? servedAtTier)`** as the `requestedTier` per SPEC §9.2's "Verification reads REQUESTED tier, not served tier" clarification. This is the tier the walker MOST RECENTLY DECIDED — the tier the user is "at" at session end.
2. **Per the master plan §7 framing**, the indicator could also surface `initialTierFor(masteryState)` as the "starting tier" — render "you went from easy belt to brown belt" if start ≠ end. Per §5.5 below, v1 ships **end-tier only** (current-belt-reached); the start-vs-end framing is a future enhancement.
3. **Sub-type**: the session's `practice_sessions.subTypeId` (drill is sub-type-locked); read once, drilled into the indicator's copy.
4. **Pre-floor handling**: if the session has fewer than 10 attempts (the walker's floor), the walker never stepped — the user's session-end tier equals the initial tier from `mastery_state`. Per §5.5 below, the indicator labels this case.

**New page query**: `getEndSessionTierForDrill(sessionId)` returning `{ tier: Difficulty; attemptCount: number; isPreFloor: boolean }`. Rationale: the walker can also be re-derived in-page from the attempts list, but a one-shot last-attempt query is cleaner and the existing `attempts_session_id_idx` covers it. The query is colocated in `page.tsx` per `rules/rsc-data-fetching-patterns.md` (same convention sub-phase 1 used for the four review aggregations).

### 5.5 Edge cases

- **Pre-floor (fewer than 10 attempts).** Walker's floor at `last10Correct.length < 10` means the tier is the initial tier from `mastery_state`. Indicator labels this: "{Color} belt (calibrating)." The "(calibrating)" suffix tells the user the walker hasn't moved yet — the belt is the starting point, not an earned step.
- **Tier-clamped (walker hit easy floor or brutal ceiling).** The walker's `stepDown("easy") = "easy"` and `stepUp("brutal") = "brutal"` clamp at the bounds. Indicator renders the clamped tier with no special label — "white belt" or "black belt" reads naturally as "you're at the floor / ceiling."
- **Tier-degraded fallback served.** Per SPEC §9.2 clarification: requested tier IS the served tier when no fallback fired, otherwise it's whatever `fallbackFromTier` records. The indicator reads `(fallbackFromTier ?? servedAtTier)` — what the engine REQUESTED. The user sees the tier the walker decided, not what the bank could fulfill. This is the pedagogically correct read (the walker's pedagogy is "where you are"; the bank is implementation detail).
- **Zero-attempt session (session abandoned before any submit).** Indicator does not render. Slot stays clean. (Sub-phase 1's `<WrongItemsBrowser>` empty-state precedent — render nothing rather than render an empty container.)
- **Mastery_state race window.** Sub-phase 1's §15.5 audit confirmed the post-session render does not read `mastery_state`; the four sub-phase-1 queries all read `attempts` + `items` + `strategies` + `practice_sessions`, all written synchronously by `endSession` (or earlier). The belt indicator's `getEndSessionTierForDrill` is also `attempts`-only (no `mastery_state` read). **No race window.** The "(calibrating)" pre-floor branch reads `attemptCount` from `attempts`, not from `mastery_state`. The belt indicator inherits sub-phase 1's race-free property.

### 5.6 Alpha Style component shape

`<BeltIndicator>` is a new client component at `src/components/post-session/belt-indicator.tsx`. Composes from existing primitives:
- **SVG belt graphic**: similar shape pattern to `<LatencySummary>`'s `<LatencyTrack>` (sub-phase 1 commit 4 precedent — SVG with `currentColor` Tailwind binding for theming).
- **Typography**: editorial heading-adjacent text per .alpha-style.md "editorial typography over dashboard density." Pairs with the heading's existing `font-semibold text-2xl tracking-tight`.
- **Spacing**: `space-y-3` per the post-session shell's other top-of-page primitives.
- **No new structural tokens**: reuses the four belt colors from existing or one net-new design token. .alpha-style.md "accents earn placement" pin allows the new brown token if a single-occurrence + below-3 systemic-token threshold is documented in commit message (per sub-phase 1 commit 6's `text-destructive-on-text` pattern).

The component is **pure presentational**: receives `tier: Difficulty`, `subTypeDisplayName: string`, `isPreFloor: boolean` as props; renders the SVG + label.

### 5.7 Accessibility

- **Color alone is not accessible** — every belt color comes with a text label ("Brown belt — Hard tier"). The label is the SR-readable signal.
- **ARIA**: `<BeltIndicator>` has `role="img"` and `aria-label="{Color} belt; {tier} tier{; calibrating if pre-floor}."` so the SVG belt-shape is announced as a single image.
- **WCAG AA contrast**: each belt color's text label uses `text-foreground` (full-contrast) for the primary line; the metaphor's color sits in the SVG, not in the label's text color (avoids the sub-WCAG-AA problem sub-phase 1 commit 4 documented for `text-destructive`).
- **Reduced-motion**: no animation in v1. The belt is static. .alpha-style.md "respect prefers-reduced-motion outside the focus shell" stays satisfied trivially.

## 6. Alpha Style cadence

### 6.1 Setup posture

`teach-alpha-style` does NOT re-run. Audit (E) confirmed no design-system drift since sub-phase 1's setup. The .alpha-style.md baseline is current; sub-phase 5 inherits it without re-setup.

### 6.2 Operational commands at commit boundaries

Match sub-phase 1's incremental + full-surface cadence per .alpha-style.md "Operational commands cadence" framing:

- **Commit-scoped `audit`** at each new-component commit (the belt-indicator commit; possibly the heading-expansion commit if it lands separately). Component-scoped, focused on what just changed.
- **Full-surface `audit` + `polish`** at the round-close commit before the doc-reconciliation commit. Captures inter-component drift across the now-complete post-session shell with the belt indicator integrated.
- **`normalize`** runs on demand if `audit` flags drift.

Audit / normalize / polish output captured in commit messages, same convention as sub-phase 1.

### 6.3 Design-system additions (if any)

The brown belt color may introduce a net-new design token. Per .alpha-style.md "accents earn placement," document at the introducing commit:
- The single-occurrence rule: token used in one place only (the `<BeltIndicator>`).
- Below-3 systemic-token threshold: if the brown token is used only once across the post-session shell (just the `<BeltIndicator>`), no structural-token addition needed (matches sub-phase 1 commit 6's pattern).
- If brown ends up appearing in 3+ places (unlikely; the indicator is one place), elevate to a structural design-system token at that point.

The white / blue / black belt colors all reuse existing tokens (light-surface neutrals, the established blue accent, the foreground near-black). No design-system additions for those.

## 7. Test surface

### 7.1 New tests

- **Belt-color → tier mapping (pure-function unit tests).** A small `tierToBeltColor(tier: Difficulty): BeltColor` helper inside `belt-indicator.tsx` (or sibling). Four scenarios: easy → white, medium → blue, hard → brown, brutal → black. Pure unit tests in the same file, matching `accuracy-summary.tsx`'s `compareRows` + `buildDisplayRows` exported-helpers convention from sub-phase 1.
- **Belt-indicator rendering edge cases (component tests via the test infrastructure already established for sub-phase 1's components).** Scenarios:
  - Pre-floor (attempt count < 10): renders "(calibrating)" suffix.
  - Tier-clamped at easy: renders "white belt — Easy tier."
  - Tier-clamped at brutal: renders "black belt — Brutal tier."
  - Tier-degraded fallback served: renders the requested tier, not the served tier (asserts the `fallbackFromTier ?? servedAtTier` pattern).
  - Zero-attempt session: renders nothing (component returns null).
- **`getEndSessionTierForDrill` query (integration test against real DB).** Insert a fixture session with N attempts at varying tiers; assert the query returns the last-attempt's tier (and the pre-floor branch correctly).

**New test count**: ~4 unit tests on the helper + ~5 component tests on the indicator + ~3 integration tests on the query = ~12 net-new tests. Project baseline post-sub-phase-2 close = 49; post-sub-phase-5 close ≈ 61. Final count captured at sub-phase close.

### 7.2 Existing tests that need updates

- **No drill-tests-asserting-drill-copy** confirmed at audit time. Test fixtures in `selection.test.ts` use `"drill"` as a session-type enum value (internal); tests don't render the user-facing copy.
- **Sub-phase 1's post-session-shell tests** assert slot-locking by `data-testid` markers (`post-session-slot-triage-score`, etc.). The belt indicator goes inside the heading slot — no new testid for slot-locking; the heading's existing `data-testid="post-session-heading"` covers the expanded heading. **No sub-phase-1 test updates required.**
- **Mastery Map tests** (if any assert the "Start drill: ..." button copy) need a one-line update for the rename. Audit at commit time identifies any concrete cases.

### 7.3 Visual regression test infrastructure

Per the diagnostic-bug-fixes round close (commit `d90200d`) and SPEC §6.14.23 (verification-gap pattern, UI side-effect), visual-regression infrastructure is a standing round candidate. **Out of scope for sub-phase 5.** The belt indicator's render is exercised by the component tests + the end-to-end real-DB harness; standing up screenshot-diff infrastructure is a separate round per the existing roadmap.

If commit-time experience surfaces a visual regression that the component tests miss, the round candidate's priority elevates. Sub-phase 5 does not pull it in.

## 8. Sequencing and commits

**Six commits, in order.** Per master plan §7's rough estimate of 3-4 plus the §3 bundling rationale and the audit-surfaced rename + indicator scopes, sub-phase 5 lands at the upper end. Each commit lints, typechecks, and passes its own verification scenarios before the next is started.

1. **`docs(prd+spec): open phase5-dojo-belt-indicator round; PRD §4.2 + SPEC §6.5 + §10.2 dojo + belt-indicator narrative`.** First commit — lands the PRD and SPEC framing for the metaphor + visualization before any code. Per master plan §9's PRD-update queue convention. Doc-only.

   Verification: closed-plans-immutable check on prior-shipped plan files; PRD §4.2 reads dojo-aware; SPEC §10.2 + §6.5 acknowledge the new surface.

2. **`feat(post-session): getEndSessionTierForDrill query + types`.** Server-side: add the page-level prepared statement + `TierForDrillSession` derived type per §5.4. No render changes. Sub-phase 1 precedent: this matches commit 2 of the post-session-review round (server-aggregations-before-render).

   Verification: §7.1 integration tests pass; EXPLAIN ANALYZE captured for the new query in commit message per SPEC §6.14.7; `bun test` count grows by ~3.

3. **`feat(post-session): BeltIndicator component + tier-color mapping`.** Adds `<BeltIndicator>` per §5.1-§5.7 + the `tierToBeltColor` helper + the unit tests. Component is dormant until commit 4 wires it into the shell — just like sub-phase 2's commit 1 dormant pattern. Component-scoped Alpha Style `audit` at commit close.

   Verification: §7.1 unit + component tests pass; `bun test` count grows by ~9; component-scoped Alpha Style audit clean for `<BeltIndicator>`.

4. **`feat(post-session): wire BeltIndicator into shell heading; drill heading expansion`.** Wires `<BeltIndicator>` into `<PostSessionShell>`'s heading area, drill-mode-only (per §5.3). Adds the "you reached the {color} belt on {sub-type}." copy. Sub-phase 1's slot-locking convention is preserved — the belt lives inside slot 1's heading, not in a new slot. Page passes the new tier data via the existing prop-drilling pattern.

   Verification: §7.1 component tests via the integrated shell; drill post-session render shows the belt + copy; diagnostic / full-length / simulation post-session do NOT render the belt; `bun test` baseline holds.

5. **`feat(ui): dojo rename across drill route + Mastery Map CTA + run skeleton; full-surface audit + polish`.** Per §4.1 surface inventory: the 5 copy-string changes across 3 files. Bundles with the round's full-surface `audit` across the now-complete post-session + drill route surfaces, and the `polish` final pass.

   Verification: §4 verification scenarios; full-surface Alpha Style audit clean; polish clean; `bun test` baseline holds (no test updates expected per §7.2).

6. **`docs(spec+plan): reconcile §10.2 + §6.5 to past-tense; close phase5-dojo-belt-indicator round`.** Doc-only. SPEC §10.2 + §6.5 narratives flip to past-tense ("dojo rename shipped 2026-XX-XX," "belt indicator on post-session summary shipped"). PRD §4.2 doesn't need a second pass (the opening commit's PRD update is forward-looking; the close commit doesn't re-edit). Feature-roadmap §7 entry flips to past-tense + lands the commit hashes. This plan's status flips to "shipped." Closed-plans-immutable convention applies post-close.

   Verification: closed-plans-immutable check; `git diff` against prior-shipped plan files (sub-phases 1, 2; testbank-re-extraction round; tagger-improvement round) returns zero lines.

**Commit count: 6.** Above the master plan §7's 3-4 estimate but justified by (a) the §3 bundling decision absorbing rename + indicator, (b) the doc-open + doc-close pair (the master plan's count likely assumed PRD update folded into a code commit; per the existing PRD-update queue convention this stays a separate commit), (c) the dormant-component-then-wire pattern that sub-phase 2 established (commit 3 + commit 4 split is cleaner than a combined commit per the closed-plans-immutable framework — closed sub-phase 1's commit 6 also bundled multiple components but landed them in slots that were locked at commit 1, so each component was an additive write into a pre-shaped slot; sub-phase 5's belt is a single component but the heading-expansion is a structural shell change worth its own commit so the dormancy + wiring split holds value).

## 9. Verification protocol carry-forward

Established discipline from sub-phases 1 and 2 carries forward unchanged:

- **`bun lint`** clean, **`bun typecheck`** clean, **`bun test`** count grows from 49 (post-sub-phase-2 baseline) to ~61 across commits 2 + 3, holds across commits 4 + 5 + 6.
- **`playwright-core` directly** with `page.screenshot({ timeout: 30_000 })`. No MCP `browser_take_screenshot`.
- **`page.mouse.move(10, 10)`** before any post-click `getComputedStyle` measurement.
- **Real-DB harness for end-to-end belt indicator rendering**. A throwaway `scripts/_belt-indicator-harness.ts`-style script (moved to `/tmp/` before commit per SPEC §6.14.15 + the existing convention) drives multiple drills with seeded `mastery_state` rows + varying attempt-window shapes (high accuracy, low accuracy, mixed, pre-floor, tier-clamped) and asserts the belt indicator's render matches the walker's contract end-to-end. Captures harness output in commit 4's message.
- **EXPLAIN ANALYZE** on the new `getEndSessionTierForDrill` query in commit 2 per SPEC §6.14.7. Plan choice (Index Scan on `attempts_session_id_idx` expected; Bitmap Heap Scan on dev DB acceptable per SPEC §6.14.13).
- **Pino structured-log capture** for any error-state assertions; not anticipated as a primary verification surface this sub-phase.
- **Real-DB harness moves to `/tmp/`** before commit so `tsgo` doesn't pick it up.
- **Alpha Style audit at commit boundaries** per §6.

**SPEC §6.14 conventions inherited.** The relevant ones for this sub-phase:

- **§6.14.7 EXPLAIN ANALYZE for hot-route queries** — the `getEndSessionTierForDrill` query in commit 2.
- **§6.14.11 audit-tighter-than-contract pattern** — for the belt-color mapping (§5.2), the SPEC §9.1 walker contract is unchanged; sub-phase 5's contract is the mapping table itself. If verification fails on first run, inspect the table in §5.2 before rewriting code.
- **§6.14.13 dev-vs-prod planner choice** — applies to the new query at v1 scale.
- **§6.14.18 audit-against-actual-artifact** — the audit in §2 corrected the master plan's implied weight on the rename's blast radius (5 strings, not "every drill copy in the codebase"). The discipline of citing the actual on-disk strings before designing flagged the lighter-than-implied scope; this informed §3's bundling decision.
- **§6.14.20 closed-plans-immutable** — applies post-write. This plan's text is closed once committed; if a redline conversation surfaces a revision before commit 1 lands, the revision is in-place. Once commit 1 lands, the plan is closed.
- **§6.14.23 verification-gap (UI side-effect)** — applies if the belt indicator's render exhibits a side-effect that component tests miss. Sub-phase 5 does NOT stand up visual-regression infrastructure (per §7.3); the convention is recorded for round-close decision.

**Closed-plans-immutable convention** applies post-write. Mid-round revisions are allowed against this plan's draft until commit 1 lands; once landed, the plan is closed. Per SPEC §6.14.20, the closed shape is the auditable record.

## 10. Out of scope

Explicit list — items deliberately NOT addressed in sub-phase 5:

- **Sub-phase 3 (full-length test).** Independent of sub-phase 5. Master plan §5 + §8. Sub-phase 5 ships ahead of sub-phase 3 in this round-sequencing override; sub-phase 3 lands separately on its own carving.
- **Sub-phase 4 (click-to-highlight in post-session explanation review).** Independent of sub-phase 5. Master plan §6 + §8. Wraps the wrong-items browser; sub-phase 5 does not touch the wrong-items browser.
- **Strategy-authoring for the 3 unauthored sub-types** (workrate, speed_distance_time, lowest_values). Independent round per the testbank-re-extraction + tagger-improvement round closes. The belt indicator does not read `strategies`.
- **Visual-regression test infrastructure.** Standing round candidate per the diagnostic-bug-fixes round close + SPEC §6.14.23. Not pulled into sub-phase 5; if commit-time experience surfaces a regression that component tests miss, the candidate's priority elevates as a separate round.
- **Walker behavior changes.** Settled in sub-phase 2. Sub-phase 5 reads the walker's output, never modifies it.
- **Tagger / classifier changes.** Settled in tagger-improvement round (closed `9acf9a2`). Sub-phase 5 does not touch the bank.
- **Schema migrations.** None anticipated. The walker's data is on disk in `attempts.servedAtTier` + `attempts.fallbackFromTier`; the indicator is a derivation + render layer.
- **Mastery Map belt indicators.** Per audit (G), per-sub-type lifetime belt is post-Phase-5 work; out of master plan §7 scope.
- **In-flow (focus-shell) belt indicator.** Per master plan §10 + §12.4 + .alpha-style.md focus-shell exclusion. This plan does NOT override.
- **6-color expanded belt mapping** (white → yellow → green → blue → brown → black). Audit (D) recommends 4-color compressed. The 6-color framing was the master plan §7 sketch; the plan-time decision stays at 4.
- **URL path renames** (`/drill/` → `/dojo/`). Per audit (B), code-internal vocabulary stays.
- **Internal identifier renames** (`<DrillRunContent>`, `DrillLength`, etc.). Per audit (B), code-internal vocabulary stays.
- **`<EmptyBankPane>` cross-reference rename** ("Mastery Map" stays per master plan §7's "drill" → "dojo" pin, not "Mastery Map" → "Dojo Map").
- **Production deploy.** Same gating as predecessor rounds (Leo's no-deploy-until-feature-complete decision per master plan §1).
- **PRD edits beyond §4.2 sub-phase-5-extension.** Other PRD sections stay untouched.

## 11. Open questions / resolutions

Six questions surfaced during drafting; recommendations recorded for redline. Plan-time pins are firm but a Leo redline can revise any of them before commit 1 lands.

### 11.1 Bundle vs split (rename + belt indicator)

**Question.** Per the user's brief, the plan must choose between bundling rename + indicator together (option (i)), shipping indicator-only (option (ii)), or rename-only (option (iii)).

**Recommendation: option (i) — bundle.** Per §3, audit (B) finds the rename's blast radius is small (5 strings, 3 files), the dojo metaphor is the framing for the belt (separating leaves the metaphor incoherent), and master plan §7 frames them as one sub-phase. The split would be the wrong default. If Leo redlines as "split," the recommended split is option (ii) — belt-indicator-first; rename as a follow-up doc-only round. Splitting to option (iii) (rename-first; belt-indicator later) leaves users with `dojo` copy and no payoff.

### 11.2 Walker tier → belt color/label mapping

**Question.** Master plan §7 names a 6-color sketch (white → yellow → green → blue → brown → black) but the walker has 4 tiers. What's the v1 mapping?

**Recommendation: 4-tier compressed mapping per §5.2** — easy = white, medium = blue, hard = brown, brutal = black. Skips yellow + green. Matches the walker's tier domain exactly; reuses the established Alpha Style blue accent token; introduces at most one net-new design token (brown). The 6-color expanded mapping would imply intermediate steps the walker doesn't carve and would stretch the design-system token surface for marginal metaphor fidelity.

### 11.3 Belt indicator surface(s)

**Question.** Where does the belt indicator render — drill in-flow vs. post-session only vs. both vs. Mastery Map per-sub-type?

**Recommendation: post-session only, drill-mode only per §5.3.** Per master plan §10's focus-shell exclusion + §12.4's pinned resolution, the in-flow surface is excluded; the rationale (introducing non-pace visual element + potential triage-prompt distraction) remains compelling. Per audit (G), Mastery Map per-sub-type belt is post-Phase-5 work (different feature: lifetime belt vs. per-session belt). Per audit (C), only drill mode produces a walker output to visualize; diagnostic / full-length / simulation use `'fixed_curve'` and have no walker.

### 11.4 Alpha Style cadence engagement

**Question.** Re-engage full sub-phase-1 audit/normalize/polish cadence (~3 incremental + 1 full-surface + 1 polish) vs. lighter cadence (~1 component-scoped + 1 full-surface)?

**Recommendation: lighter cadence per §6** — component-scoped audit at commit 3 (the new `<BeltIndicator>`); full-surface audit + polish at commit 5 (after rename + heading-expansion). Sub-phase 5 ships fewer net-new components than sub-phase 1 (one indicator vs. four review-element components), so the per-component audit cadence is correspondingly tighter. Audit (E) confirms no design-system drift since sub-phase 1; the baseline is current. If commit 3's audit surfaces unexpected issues, the cadence elevates to incremental at commit 4 and 5 as well.

### 11.5 Pre-floor display

**Question.** When fewer than 10 attempts have landed (walker's floor), the indicator shows the initial tier from `mastery_state`. Two display options: (a) hidden until 10-attempt floor reached, (b) shows initial tier with "(calibrating)" label.

**Recommendation: option (b) — shows initial tier with "(calibrating)" suffix per §5.5.** Hiding the indicator below 10 attempts means most drills (length 5 default-options 5/10/20; length-5 drills never cross the floor) render no belt — pedagogically wrong for a v1 ship. Showing the initial tier with "(calibrating)" suffix tells the user where they're starting AND that the belt hasn't moved yet. This is the metaphor-coherent way to handle the floor.

### 11.6 Mastery Map integration

**Question.** Belt indicator visible per-sub-type on Mastery Map, OR Mastery Map untouched?

**Recommendation: Mastery Map untouched** per audit (G) + master plan §7 scope. Per-sub-type lifetime-belt is a different feature (cross-session vs. per-session) requiring different data plumbing (need to read each sub-type's most-recent drill session's last attempt — a sub-type-keyed cross-session query). Master plan §7 names only the post-session summary; expansion to Mastery Map is post-Phase-5 work. The Mastery Map's `<StartSessionButton>` rename ("Start drill" → "Enter dojo") is the only Mastery Map touch in this sub-phase.

### 11.7 (audit-surfaced) Heading-expansion vs. new slot

**Question.** Audit (F) surfaced two options for the belt indicator's render slot in `<PostSessionShell>`: expand the heading (slot 1) to include the belt + copy, OR add a new slot 1.5 between heading and `<TriageScoreLine>`.

**Recommendation: expand the heading (option (a)) per §5.3.** The belt + tier-reached copy is a session-level summary, not a separate review element peer to triage / accuracy / latency — it belongs in the heading area. Doesn't disrupt the existing slot-locking; sub-phase 4's wrong-items browser extension stays untouched. Option (b) (new slot) is more invasive and reads as "the belt is a separate review element," which mis-frames the metaphor.

### 11.8 (audit-surfaced) Test attribute renames

**Question.** Does the rename touch `data-testid` markers (e.g., `drill-empty-bank-pane`)?

**Recommendation: leave testids as-is per §4.2.** Testids are non-user-facing; the rename is scoped to user-visible copy only. Renaming testids would break any existing tests asserting them and provides zero user-visible benefit. The "code-internal vocabulary stays" principle applies to testids the same way it applies to function names + URL paths.

---

> **No code was written. No files were created.** This is a plan document only. Implementation begins at commit 1 once the plan is approved.

