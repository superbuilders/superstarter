# Plan — Phase 3 polish: practice-surface features

> **Status: planning, not yet implemented.** This plan extends `docs/plans/phase-3-practice-surface.md`. Where it disagrees with that plan, this one wins for the items it touches; everything else in the parent plan carries forward unchanged. The `docs/SPEC.md` file map for Phase 3 is not modified — every file added here is either a sibling of an existing Phase 3 file or a small in-place edit. Phase 5/6 deliverables in the parent plan (drill post-session review, NarrowingRamp, adaptive selection, full-length test, history, account deletion, click-to-highlight) carry forward unchanged.

This is the polish round that surfaced from manual verification of the Phase 3 happy path. Seven user-facing features land here, two of which (the diagnostic shuffle and the 15-minute hard cutoff) are real engine changes; one (the cutoff) is an explicit reversal of a Phase 3 design decision documented in §3 below. The rest are surface work — a new explanatory page, a logout button, a focus-shell restyle to match the reference screenshots, and two small visualizations that make the 18-second target legible.

The single design constraint that runs through every commit below: **the focus shell stays the latency anchor host, and the `<ItemSlot>` keyed mount effect is the contract.** A restyle that lifts `<ItemSlot>` into a non-keyed render silently breaks every per-question latency value Phase 3 records. This is restated in §6 and reaffirmed by an in-source comment in commit 2.

---

## 1. Goal & scope

Seven deliverables, sequenced across the commits in §10:

1. **Logout button.** A small user menu surfaced on the Mastery Map that calls Auth.js v5's `signOut()` server action. Defended placement: top-right of `(app)/page.tsx`, NOT in the `(app)/layout.tsx` header (which would bleed into the FocusShell-owned `/drill/[subTypeId]/run` viewport, violating the focus-shell's chrome-free design from PRD §5.1).

2. **Pre-diagnostic explanation page.** A new server-rendered page at `/diagnostic` that explains: 50 questions, 15 minutes, designed to train triage discipline, finishing all 50 is not the goal. Single primary CTA: "Start Diagnostic" → `/diagnostic/run`. The current diagnostic logic (in-progress-stale-finalize + `startSession` + `<FocusShell>` mount) moves wholesale to `/diagnostic/run`. The `(app)/layout.tsx` diagnostic gate's redirect target stays `/diagnostic` — users who haven't completed the diagnostic land on the explainer first.

3. **Diagnostic questions shuffled deterministically per session.** The `'fixed_curve'` strategy stops indexing the hand-tuned mix in array order. Instead, a pure function `shuffledDiagnosticOrder(sessionId)` produces a permutation of the 50 mix entries seeded by `sessionId`. Reproducibility: same sessionId → same permutation. This is a full shuffle, not a within-difficulty-band shuffle — see §4.1 for the analysis of why the existing mix order does not encode a difficulty curve.

4. **Diagnostic hard-timed at 15 minutes — REVERSAL of a Phase 3 design decision.** The diagnostic gains a session-level hard cutoff. Server-enforced in `submitAttempt` (the source of truth for "no more questions"); client-side UX flips to "this is your last question" when the clock crosses 15:00. Per the reversal-rationale in §3, the diagnostic is reframed from "pre-triage capacity baseline" to "first triage exposure," with downstream impact on the mastery model's `sourceParams('diagnostic')` latency relaxation (drop from 1.5× to 1.2×).

5. **Per-question 18-second timer surfacing.** Phase 3 hardcoded `questionTimerVisible: false`. Flip both diagnostic and drill defaults to `true` — the per-question timer surfaces the 18s target without changing behavior. This is distinct from the triage prompt (binary fire-at-18s) and from the new block-depletion visualization (#6 below).

6. **Per-question block-depletion visualization.** A row of 18 discrete blocks in the focus-shell's content area that disappear one-per-second across the 18-second window. Visual reinforcement of the 18s target, distinct from the per-question timer bar (a continuous depleting line) and the triage prompt (binary, fires at 18s). The depletion is **purely cosmetic**: triage prompt still fires at 18s, no auto-submit, session-timer is the only hard cutoff (PRD §5.1 + parent-plan §5.2 BrainLift pedagogy preserved).

7. **UI restyle of the focus shell to match `data/example_ccat_formatting/` screenshots.** Layout per the reference: large MM:SS session-timer readout top-right, thin session-progress bar below it, "Question N / 50" label, large question text in the central column, radio-style options as tall rectangular buttons, full-width "Submit Answer" CTA at the bottom of the central column. Triage prompt overlay re-docks to top-center as a transient banner so it does not compete with the bottom CTA. Both diagnostic and drill render through the same `<FocusShell>`, so the restyle covers both without a separate drill restyle pass (see §7 for why a partial restyle would ship visual inconsistency).

---

## 2. Out of scope — named explicitly

Each item below is named so a future reader does not infer scope from silence:

- **Drill UI restyle as a separate effort.** The drill route uses the same `<FocusShell>` as the diagnostic, so the restyle in #7 covers it for free. The drill **configure** page (`/drill/[subTypeId]/page.tsx`) keeps its current `alpha-style` skin — only the focus-shell session view restyles.
- **Brutal and speed-ramp drill modes.** Phase 5.
- **NarrowingRamp.** Phase 5.
- **Adaptive selection (`'adaptive'` strategy).** Phase 5; the throwing stub stays.
- **Spaced-repetition queue and review session.** Phase 5.
- **Test-day simulation, history tab, account deletion.** Phase 6.
- **Click-to-highlight in post-session review.** Phase 5/6. Phase 3's only post-session is the diagnostic onboarding capture, which renders no per-item explanation.
- **The post-completion orphan path** (`endSession` + form-action revalidation re-running `startSession` and inserting an empty row). Tracked in parent-plan §11.3 as a Phase 5 follow-up; this round does not touch it. The new `/diagnostic` → `/diagnostic/run` route move could in principle resurface it if the `/diagnostic/run` page's auto-revalidation fires after `endSession`; §11 below names the test that covers it.
- **The `fmt.ts --strip-comments` parser bug** and the lefthook format step's unbounded scope. Tracked in parent-plan §11.3 as Phase 4 prep.
- **Stage 2 OCR explanation generation** for the 99 stage-1 items. Separate workstream — surfaced in §8 pre-flight as a status check, not folded into this plan.
- **Question-timer toggle UI and `persistTimerPrefs` write path.** Phase 5. This polish round flips the default `true` for both diagnostic and drill via a server-action default change — no toggle UI, no write path.
- **Dropping the now-vestigial `practice_sessions.diagnostic_overtime_note_shown_at_ms` column.** With the 15-minute hard cutoff, the overtime-note concept becomes obsolete (the session ends at 15:00 instead of issuing a "you went over" note). The column stays in the schema unread; a follow-up cleanup commit can drop it. See §4.4.
- **A user-settings page beyond logout.** The user menu is a single signOut button. Account deletion / target re-edit / timezone live in Phase 6 settings.

---

## 3. Design-decision reversals

### 3.1 Diagnostic gains a 15-minute hard cutoff (REVERSAL of parent-plan §6.1)

**Original framing.** Parent plan §1.3 / §6.1 said: "untimed at the session level — it measures capacity, not triage." `architecture_plan.md` §"User journey data flow" §2 echoes the same: "The diagnostic is **untimed at the session level**." The diagnostic was positioned as the *pre-triage capacity baseline* against which drills then trained the triage skill on top.

**New framing.** The diagnostic now simulates the real CCAT: 50 questions in 15 minutes. The session-level 15-minute cutoff fires once, server-side, the first time `submitAttempt` runs against a session whose `Date.now() - started_at_ms >= 15 * 60_000`. The cutoff *replaces* (does not augment) the existing 15-minute "overtime note" mechanism (`practice_sessions.diagnostic_overtime_note_shown_at_ms` and the `<DiagnosticOvertimeNote>` overlay); both become unreachable. The diagnostic is now "first triage exposure," not "untimed capacity baseline."

**Rationale for the reversal.**

1. **The real CCAT is 15 minutes.** A diagnostic that does not simulate the real test's pacing produces a misleading first-day signal — the user finishes 50 items at their natural unhurried pace, then drills push them onto a tighter clock. The bigger the gap between "what diagnostic measures" and "what the test measures," the noisier the mastery model's first input.
2. **The triage skill is the hardest part of the CCAT.** Deferring triage exposure to drills means the user's first encounter with the 18s pressure happens 15 minutes into the app's life, not 0 minutes. Front-loading this is the right call: users who can't sustain triage in the diagnostic learn this on day 1 instead of day 3.
3. **The "untimed = capacity" framing was a soft claim, not load-bearing.** Re-reading parent-plan §6.1 in the context of §5.2 (the BrainLift triage discipline) and PRD §5.1 / §6.1 (the focus-shell triage prompt) — the BrainLift insight ("knowing when to abandon a question is the strategic skill that distinguishes high CCAT scorers") would *also* be served by exposing it in the diagnostic. The capacity-measurement framing was defensible but never the only defensible call.

**BrainLift impact.** The original framing positioned the diagnostic outside the triage-trainer surface — diagnostic measures, drills train. Under the timed diagnostic, the diagnostic *is* the first triage trainer. This is a defensible reframe but a real one. Phase 5 / Phase 6 must not re-derive the original framing — the timed diagnostic is now load-bearing on the BrainLift, exactly the way the per-question triage prompt is load-bearing per parent-plan §5.2. The triage prompt continues to fire at 18s in the diagnostic (it already did under the original design — `perQuestionTargetMs: 18000` per parent-plan §6.1 even with `sessionDurationMs: null`). What changes is that the *session itself* now forces the triage decision: if the user is on question 23 at minute 14, they are now visibly losing the chance to attempt 27 more items, where before the clock did not push them.

**Mastery-model impact.** `sourceParams('diagnostic')` in `src/server/mastery/compute.ts` currently returns `{ minAttempts: 3, latencyMultiplier: 1.5, allowMastered: false }`. The 1.5× latency relaxation was calibrated for untimed conditions on the assumption that a user without time pressure would think more carefully and take longer per item. Under the 15-minute cutoff, users speed up under pressure and the relaxation now risks over-crediting fast-but-careless attempts (a user who blasts through 30 items in 15 minutes at 6s each and gets 50% accuracy could end up tagged `fluent` on a sub-type that they would actually struggle with under sustained drill conditions).

The plan's call: **drop `latencyMultiplier` from 1.5 to 1.2**. Reasons:

- 1.0× over-penalizes the diagnostic-stress effect: it's still the user's first-ever exposure to the app's specific question types, and zero relaxation for novelty would push everyone toward `learning` regardless of the underlying skill.
- 1.5× is the original "untimed capacity baseline" calibration — wrong for a timed diagnostic.
- 1.2× is the middle: still acknowledges first-exposure novelty (~20% latency padding) but does not pretend the diagnostic is unhurried capacity work.

The `minAttempts: 3` and `allowMastered: false` lines are preserved unchanged — both are about the *amount* of evidence (3 attempts is still small-sample) and the *ceiling* on the diagnostic's verdict (the diagnostic is still not allowed to assign `mastered` because it's a single noisy run). Neither is about latency calibration.

**UX of the cutoff itself.** The plan picks **option (a)**: cutoff fires at the next `submitAttempt` boundary so the in-flight question gets one more submit, then the session ends. Reasons:

- Option (b) (hard cutoff with in-flight question discarded) is gentler in spec but harsher in practice: the user would finish their work on a question, click submit, and find their answer thrown away without an attempt row. That is the kind of edge case that produces angry support tickets.
- Option (a) means the session can run up to ~15:30 in the worst case (a question started at 14:59 finishes at 15:30). That ~30s overrun is an acceptable cost for the "your last submit always counts" guarantee. The mastery model is robust to it (latencies in the diagnostic already span 1–60s; one 30s outlier does not skew the median materially).

**Implementation seams.** Three changes:

1. **Server-side enforcement (canonical).** `submitAttempt` in `src/server/sessions/submit.ts` reads `practice_sessions.started_at_ms` for the session and, after writing the attempt row, computes `Date.now() - startedAtMs`. If the session is a diagnostic AND the elapsed exceeds `15 * 60_000`, return `{ nextItem: undefined }` *without* calling `getNextItem`. The server is the source of truth.
2. **Client-side hint (cosmetic).** The FocusShell's `tick` reducer sets a `sessionTimedOut` flag when `elapsedSessionMs >= sessionDurationMs && sessionType === "diagnostic"`. A small "Last question" tag appears next to the question count when set. This is cosmetic — the server's `nextItem === undefined` is what actually ends the session.
3. **`<DiagnosticOvertimeNote>` removal.** The overlay component, the reducer's `diagnostic_overtime_note_shown` action, the `DIAGNOSTIC_OVERTIME_THRESHOLD_MS` / `DIAGNOSTIC_OVERTIME_VISIBLE_MS` constants, and the `recordDiagnosticOvertimeNote` server action all become unreachable. The plan deletes all four in commit 2 of §10. The DB column `diagnostic_overtime_note_shown_at_ms` is left in place (no schema migration this round); it stops being written, which is harmless.

### 3.2 Per-question timer flips to ON by default for both diagnostic and drill

**Original framing.** Parent-plan §5.1: "the per-question timer is plumbed but `questionTimerVisible` is hardcoded `false`. The toggle UI and the `persistTimerPrefs` write path are Phase 5."

**New framing.** Default flips to `true`. The toggle UI and write path are still Phase 5 — this is a default-only change, not a UI addition. Both diagnostic and drill content components pass `initialTimerPrefs: { sessionTimerVisible: true, questionTimerVisible: true }`.

**Rationale.** Drills already have triage pressure; the timer makes that pressure legible. The diagnostic, once timed, has both session pressure and per-question pressure. Hiding the per-question timer when both are load-bearing is conservative for no benefit. Phase 5's toggle still lets users hide it if they prefer, but the default trains the right intuition.

### 3.3 The hand-tuned diagnostic mix is no longer served in array order (REVERSAL of an implicit Phase 3 contract)

**Original framing.** Parent-plan §4.2: `getNextFixedCurve` reads `diagnosticMix[attemptCount]`. Two diagnostics from the same user under the same conditions get the same sub-type-by-sub-type sequence. The mix file's per-sub-type grouping (4 verbal items per sub-type then 5 numerical items per sub-type) was the served order.

**New framing.** The 50-row mix is a **demand spec**, not a sequence. `shuffledDiagnosticOrder(sessionId)` produces a deterministic permutation of those 50 rows. Same sessionId → same order. Different sessionId → different order. The `(sub_type_id, difficulty)` tuple distribution is preserved exactly because we only permute the order, not the contents.

**Why this counts as a reversal even though the parent plan never said "served in array order on purpose."** Manual verification surfaced that the array-order-as-served-order behavior was incidentally exposed to the user — across two diagnostics in dev, the user always saw `verbal.synonyms` items first, then `verbal.antonyms`, etc. That is a property the parent plan did not name, but a real user observed it. Calling out the reversal here makes the new behavior the explicit contract.

---

## 4. Selection-engine changes

### 4.1 Diagnostic shuffle — analysis of the existing mix and the chosen shuffle granularity

The mix in `src/config/diagnostic-mix.ts` is structured as: 11 sub-type blocks, each containing 4 (verbal) or 5 (numerical) entries in `easy → medium(s) → hard` order. Concretely, the first verbal block is:

```
{ subTypeId: "verbal.synonyms", difficulty: "easy" }
{ subTypeId: "verbal.synonyms", difficulty: "medium" }
{ subTypeId: "verbal.synonyms", difficulty: "medium" }
{ subTypeId: "verbal.synonyms", difficulty: "hard" }
```

**Question: does the order encode a difficulty curve?**

No — three reasons:

1. **There is no global curve.** The 50 entries do not start easy and ramp to hard across the whole diagnostic. Each per-sub-type block ramps locally (easy → mediums → hard) and then resets back to easy at the next sub-type. The serving order would be `easy / med / med / hard / easy / med / med / hard / ...` — saw-toothed, not monotonic.
2. **The local easy → hard ordering inside a sub-type is incidental, not load-bearing.** The mix file's comment ("the tier mix favors medium with one easy and one hard (4-item blocks)…") describes a *distribution* per sub-type. The author wrote the entries in tier order for human readability of the file, not because the user was supposed to encounter them in tier order. PRD §4.1 ("hand-tuned 50-row mix") describes the mix as a tuple distribution, not a sequence.
3. **The real CCAT is not curve-ordered either.** The CCAT does not present items in increasing difficulty within a sub-type. Replicating an artifact of the mix file's authoring layout is not a goal.

**Decision: full shuffle of all 50 rows.** A single deterministic permutation seeded by `sessionId`. This:

- Preserves the tuple distribution exactly (same 11 sub-type counts, same difficulty distribution per sub-type) — we're permuting an array, not regenerating it.
- Interleaves sub-types so the user is not given 4 consecutive synonyms items, then 4 antonyms, etc. This better matches the CCAT's actual experience and prevents within-block warmup effects.
- Is reproducible per session: a future "review your diagnostic" surface can re-derive the served order from `sessionId` alone.

A within-difficulty-band shuffle was considered and rejected — there is no global band order to preserve, so the constraint would do nothing.

**Implementation:** a new pure function `shuffledDiagnosticOrder(sessionId: string): ReadonlyArray<DiagnosticEntry>` in `src/config/diagnostic-mix.ts` (sibling to the existing `diagnosticMix` export). Uses an xmur3-style string-to-32-bit hash on `sessionId` to seed a mulberry32 PRNG, then runs Fisher-Yates over a copy of `diagnosticMix`. Returns a fresh `readonly` array per call. No I/O, no DB.

The selection engine's `getNextFixedCurve` (in `src/server/items/selection.ts`) replaces its current `const slot = diagnosticMix[attemptIndex]` with `const slot = shuffledDiagnosticOrder(ctx.id)[attemptIndex]`. Memoization across calls within a single request is unnecessary — the function is cheap (50-element array, deterministic, no allocations beyond the result array) and the request-level overhead is dwarfed by the `pickItemRow` SQL call that follows.

**Determinism contract:** a unit test in commit 1 asserts (a) two calls with the same sessionId return identical arrays, (b) two calls with different sessionIds return non-identical arrays, (c) every permutation contains exactly the same multiset of `(subTypeId, difficulty)` tuples as the unshuffled mix. The third assertion is the regression test that prevents a future PR from "improving" the shuffle and accidentally dropping or duplicating an entry.

### 4.2 15-minute hard cutoff — server-side enforcement in `submitAttempt`

The cutoff lives in `src/server/sessions/submit.ts`, immediately after the `attempts` row is inserted, before the call to `getNextItem`. Pseudocode:

```ts
// existing: insert attempt row
// NEW: cutoff check (diagnostic only)
const session = await readSession(input.sessionId)  // already loaded above for the userId check
if (session.type === "diagnostic" && session.sessionDurationMs !== null) {
    const elapsedMs = Date.now() - session.startedAtMs
    if (elapsedMs >= session.sessionDurationMs) {
        logger.info(
            { sessionId: input.sessionId, elapsedMs, sessionDurationMs: session.sessionDurationMs },
            "submitAttempt: diagnostic exceeded 15-minute cutoff, ending session"
        )
        return { nextItem: undefined }
    }
}
// existing: getNextItem(sessionId)
```

A new column `practice_sessions.session_duration_ms: bigint | null` is **NOT** added — the duration is implicit in the session type (diagnostic = 15 min) and does not need to be persisted. The server reads the constant `DIAGNOSTIC_SESSION_DURATION_MS = 15 * 60_000` from a new module `src/server/sessions/diagnostic-cutoff.ts` (sibling to `abandon-threshold.ts`). The constant is also exported for the FocusShell's client-side cosmetic display via the diagnostic content component's prop wiring.

**Tripwire / observability.** The cutoff branch logs `{ sessionId, elapsedMs, sessionDurationMs }` at info level so a database-side audit can confirm cutoff-truncated sessions exist where expected. The Phase 3 mastery-recompute workflow already triggers from `endSession`; it triggers identically here (the FocusShell sees `nextItem: undefined`, calls `onEndSession`, the server action calls the underlying `endSession` which fires the workflow).

**Race with the abandon-sweep cron.** A diagnostic that hits the 15-minute cutoff at minute 14:59:30 fires `endSession` from the FocusShell which writes `ended_at_ms` and `completion_reason='completed'`. The abandon-sweep cron's WHERE clause (`ended_at_ms IS NULL`) excludes the row from the sweep. No new race introduced — the existing parent-plan §9.3 analysis applies unchanged.

### 4.3 Mastery-model latency relaxation: 1.5× → 1.2×

`sourceParams('diagnostic')` in `src/server/mastery/compute.ts` changes one literal:

```ts
// before
return { minAttempts: 3, latencyMultiplier: 1.5, allowMastered: false }
// after
return { minAttempts: 3, latencyMultiplier: 1.2, allowMastered: false }
```

The change is one literal but lands as its own commit's diff (commit 1) so the rationale in §3.1 is associated with the commit message. The existing `compute.test.ts` adds two cases: (a) a diagnostic-source attempt that lands `fluent` under 1.5× and falls to `learning` under 1.2× (the over-credit case the change is meant to prevent), (b) a diagnostic-source attempt that lands `learning` under both (the floor case — a slow, inaccurate run is still `learning` regardless of relaxation).

### 4.4 Vestigial column and dead-code removal

The `practice_sessions.diagnostic_overtime_note_shown_at_ms` column, the `recordDiagnosticOvertimeNote` server action, the `DiagnosticOvertimeNote` component, and the reducer's `diagnostic_overtime_note_shown` action and overtime-tracking fields all become unreachable under the 15-minute hard cutoff. Schema column stays (no migration this round); everything else is deleted in commit 2.

The deletion includes:

- `src/components/focus-shell/diagnostic-overtime-note.tsx` — delete.
- The `<DiagnosticOvertimeNote>` mount in `focus-shell.tsx` — delete.
- The `onRecordDiagnosticOvertime` prop in `types.ts` — delete.
- The `recordDiagnosticOvertimeNote` server action in `src/app/(app)/actions.ts` — delete.
- The reducer's `diagnostic_overtime_note_shown` action, `diagnosticOvertimeNoteShown`, `diagnosticOvertimeNoteVisibleUntilMs` fields, and the overtime branch of `reduceTick` — delete.
- The `DIAGNOSTIC_OVERTIME_THRESHOLD_MS` and `DIAGNOSTIC_OVERTIME_VISIBLE_MS` constants and their exports — delete.

The diagnostic content component (`src/app/(diagnostic-flow)/diagnostic/run/content.tsx` after the route move in commit 3) stops passing `onRecordDiagnosticOvertime` to `<FocusShell>`.

---

## 5. FocusShell changes

This is the densest commit. Three changes overlap: the restyle (#7 from §1), the per-question timer surfacing (#5), and the block-depletion visualization (#6). All three land in commit 2 because the layout grid and the content area's vertical rhythm depend on them being co-designed.

### 5.1 Layout — match `data/example_ccat_formatting/`

Per the user-described reference layout:

- **Top-right:** large MM:SS session-timer readout. Distinct from the existing low-opacity numeric next to the session-timer bar — this is the primary chronometer, full opacity, large font (~text-2xl, tabular-nums).
- **Below the readout:** a thin session-progress bar spanning the page width (the existing `<SessionTimerBar>`'s depleting line, restyled to a single 2-3px bar at the very top of the viewport).
- **Top-left or just below the bar:** "Question N / 50" label (low-opacity, ~text-sm). N derives from `props.targetQuestionCount - state.questionsRemaining + 1` (the question currently being displayed, 1-indexed).
- **Central column (max-w-2xl, vertically centered):** the question text in large font (~text-xl), the row of 18 block-depletion squares (#6 below) immediately above the options, the radio-style options as tall rectangular buttons (existing `<OptionButton>` restyled — taller padding, flush borders, the A/B/C/D/E label as a filled left tab), and a full-width "Submit Answer" CTA at the bottom.
- **Pace track:** moved to a horizontal strip just below the question count, dimmed. For diagnostic sessions the pace track stays hidden (parent-plan §6.1) — the diagnostic uses the session-timer bar plus the question count instead.

The grid template areas change from the current `[auto_1fr_auto]` rows to a three-column layout where the central column is fixed-width and the left/right columns hold the chronometer and the question count. The existing `<FocusShell>`'s outer `<div>` keeps `min-h-dvh w-full` and uses `grid-rows-[auto_auto_1fr]` so the chrome bar and question-count bar stack at the top, with the central content claiming the remaining vertical space.

### 5.2 Per-question timer surfacing

Two changes:

- **Default flips.** The diagnostic content component (commit 3 moves it to `/diagnostic/run/content.tsx`) and the drill content component (`/drill/[subTypeId]/run/content.tsx`) both pass `initialTimerPrefs: { sessionTimerVisible: true, questionTimerVisible: true }`. The `<QuestionTimerBar>` becomes visible.
- **Repositioning.** The current footer slot for `<QuestionTimerBar>` is removed under the new layout. The bar moves to a thin strip *immediately above the question text* in the central column. It depletes from full → empty across the 18-second window, restyled to match the reference (slightly taller than the session-progress bar, distinct color register so the user doesn't conflate session-time-remaining with question-time-remaining).

### 5.3 Block-depletion visualization

A new client component `src/components/focus-shell/question-block-depletion.tsx`. Renders a horizontal row of 18 small square blocks (~12px each, gap-1). Each block represents one second of the 18-second per-question window. As `state.elapsedQuestionMs` crosses each integer-second boundary, the leftmost remaining block disappears (or fades to background — the visual treatment is a CSS transition, not a re-render flicker).

Implementation notes:

- **No new reducer state.** The component reads `state.elapsedQuestionMs` (already updated every `tick`) and computes `blocksRemaining = Math.max(0, 18 - Math.floor(elapsedQuestionMs / 1000))`. Pure derivation from existing state.
- **Position.** Above the question text, full-width within the central column. Per the reference screenshots' visual rhythm.
- **Pure visual — no behavior change.** When `blocksRemaining === 0` the row goes empty. The triage prompt has already fired at the same moment (`elapsedQuestionMs >= 18000` in the reducer). No auto-submit, no clock stop. PRD §5.1 + parent-plan §5.2 BrainLift pedagogy unchanged.
- **Distinct from the per-question timer bar.** The bar is a continuous depleting line; the blocks are 18 discrete steps. They reinforce each other but encode the same timer differently — one for users who track time analogically, one for users who count down digitally.
- **Accessible.** `aria-hidden="true"` (the per-question timer bar already covers screen readers via the elapsed-time tick). The blocks are pure visual reinforcement.

### 5.4 Triage prompt re-dock

Current: `<TriagePrompt>` overlays as a floating pill at `fixed bottom-8 left-1/2`. With the new layout's full-width "Submit Answer" CTA at the bottom of the central column, the floating pill would visually compete with (or overlap) the CTA.

New dock: `fixed top-16 left-1/2 -translate-x-1/2`, slightly below the session-progress bar but above the question content. Backdrop-blur, rounded full pill. The "Best move: guess and advance" message and the (T) hotkey hint stay verbatim — that copy is BrainLift-load-bearing and PRD §6.1 specifies it. The visual register (subtle, dimmed-and-blurred over the central content) preserves the parent-plan §5.2 design that the prompt is a *peripheral* signal, not a modal blocker.

### 5.5 The latency-anchor invariant — reaffirmed

The restyle MUST NOT lift `<ItemSlot>` out of the `key={state.currentItem.id}` mount. Specifically:

- `<ItemSlot>` keeps its current shape: a thin component whose mount effect captures `performance.now()` and dispatches `set_question_started`. The parent `<FocusShell>` keeps the `key={state.currentItem.id}` on the `<ItemSlot>` JSX line.
- The restyled layout does not memoize `<ItemSlot>` to prevent its remount across item changes (no `React.memo`, no `useMemo` wrapping its children).
- The 5-minute latency tripwire in `submitAttempt` (`src/server/sessions/submit.ts`) stays in place. If a future restyle accidentally breaks the keyed mount, the tripwire throws on the first item that produces a >5min latency value.

Commit 2 adds an inline comment block in `src/components/focus-shell/focus-shell.tsx` adjacent to the `<ItemSlot key={state.currentItem.id} ... />` line:

```
// LOAD-BEARING: do not remove the `key={state.currentItem.id}` prop.
// The keyed mount is what re-runs <ItemSlot>'s mount effect, which
// captures `performance.now()` at first paint of every new item and
// dispatches `set_question_started` — the latency anchor. The
// 5-minute tripwire in src/server/sessions/submit.ts is the
// safety net; this key is the contract.
// See docs/plans/phase-3-practice-surface.md §9.1 +
// docs/plans/phase-3-polish-practice-surface-features.md §5.5.
```

The comment lives at the JSX site, not in `<ItemSlot>` itself, because the load-bearing piece is the *parent's* keying — the `<ItemSlot>` itself already has a comment block explaining the mount effect (parent-plan §9.1 + the existing `item-slot.tsx` header).

### 5.6 Cosmetic "last question" indicator

When `state.elapsedSessionMs >= sessionDurationMs && sessionType === "diagnostic" && sessionDurationMs !== null`, the question-count label flips from "Question 23 / 50" to "Question 23 / 50 — last question." Pure visual: the actual cutoff is server-side. No reducer changes — the comparison is a render-time derivation in the focus-shell component.

### 5.7 Drill UI restyle in this round? — yes, by construction

Both diagnostic and drill render through `<FocusShell>`. Restyling the focus-shell once covers both. The drill **configure** page (`/drill/[subTypeId]/page.tsx`) keeps its current alpha-style rendering — it lives in the `(app)` group and is not a focus-shell route.

The alternative (restyle focus-shell but skip drill) would ship visual inconsistency: a user starting a drill would see the alpha-style configure page, then jump into a refreshed focus-shell, with no visual continuity issue but a regression risk if the configure page's CTA visual register no longer matches the focus-shell's "Submit Answer" button. Since both surfaces are user-facing within the same flow, restyling the focus shell once and letting the drill flow inherit the new look is the smaller-scope, lower-risk path.

---

## 6. Routing changes

### 6.1 `/diagnostic` becomes the explainer; `/diagnostic/run` runs the session

**Current shape (parent plan §6.1):**

```
src/app/(diagnostic-flow)/
├── layout.tsx           — auth-only gate
├── diagnostic/
│   ├── page.tsx          — in-progress-stale-finalize + startSession + Suspense
│   └── content.tsx       — "use client", React.use(), mounts <FocusShell>
└── post-session/[sessionId]/...
```

**New shape:**

```
src/app/(diagnostic-flow)/
├── layout.tsx           — UNCHANGED, auth-only gate
├── diagnostic/
│   ├── page.tsx          — NEW: explainer + "Start Diagnostic" CTA
│   └── run/
│       ├── page.tsx       — moved from diagnostic/page.tsx, unchanged contents
│       └── content.tsx    — moved from diagnostic/content.tsx, unchanged contents
└── post-session/[sessionId]/...   — UNCHANGED
```

**`/diagnostic` page (new, replaces the existing one).** Server component, NOT async. Renders an explainer panel:

- One-line headline: "Welcome to the diagnostic."
- Three-bullet body: "50 questions in 15 minutes" / "Designed to train triage discipline" / "You are not expected to finish all 50 — that's by design."
- Single primary CTA: a `<Link href="/diagnostic/run">Start Diagnostic</Link>` rendered as a `<Button>`-sized anchor. Plain `<Link>` (not `<a>`) because `/diagnostic/run` is a static route, not a dynamic param route — `typedRoutes` accepts it.
- No skin from `alpha-style` (parent-plan constraint: focus-shell-aesthetic family). Match the focus-shell's typographic register (foreground / muted-foreground / subtle borders).

**`/diagnostic/run` page (moved from `/diagnostic/page.tsx`).** Pure file move:

- The `abandonInProgressDiagnosticsAndStart` function moves wholesale.
- The Suspense + `<DiagnosticContent>` mount moves wholesale.
- The route's only behavioral change is the import path of `<DiagnosticContent>` moving from `@/app/(diagnostic-flow)/diagnostic/content` to `@/app/(diagnostic-flow)/diagnostic/run/content`.

**Diagnostic gate (parent-plan §6.5).** Redirect target stays `/diagnostic`. Users without a completed diagnostic land on the explainer first, click Start, and end up at `/diagnostic/run`. The `(app)/layout.tsx` redirect line (`redirect("/diagnostic")`) is unchanged.

**In-progress-stale-finalize logic.** Moves with the `/diagnostic/run` page. Edge cases from parent-plan §9.4 are unchanged in behavior:

- A user who started a diagnostic, navigated away, and returned to `/` is still redirected to `/diagnostic` (the explainer). They click "Start Diagnostic." They land on `/diagnostic/run` which finalizes the orphan and starts a fresh session — same flow as before, with one extra click.
- A user who starts a diagnostic and refreshes `/diagnostic/run` directly (skipping the explainer) gets the same orphan-then-restart behavior. The explainer page is *not* a precondition — direct navigation to `/diagnostic/run` works.

**Shape of the orphan / post-completion edges under the route move.** The post-completion orphan path tracked in parent-plan §11.3 (Phase 5 follow-up) is *not* affected by this route move. The orphan is created by Next.js auto-revalidating the form-action's source route after `endSession` completes. The diagnostic content component's `endSession` is followed by `router.push("/post-session/<sessionId>")`, not a form action — so the auto-revalidation case does not apply to the diagnostic flow. The route move from `/diagnostic` → `/diagnostic/run` does not introduce a new orphan source. (The drill flow's orphan source is unchanged because the drill route layout is untouched.)

### 6.2 No other route changes

- `/post-session/[sessionId]` stays put.
- `/drill/[subTypeId]` and `/drill/[subTypeId]/run` stay put.
- `(app)/page.tsx` stays the Mastery Map — the user menu is added inside it (§7), not as a separate route.
- `/login` stays put.

---

## 7. Logout button — placement and component shape

### 7.1 Defended placement: top-right of `(app)/page.tsx`, inside the Mastery Map's `<header>`

**Why not in `(app)/layout.tsx`?** The layout wraps every `(app)` route, including `/drill/[subTypeId]/run`. The drill-run route mounts `<FocusShell>` which claims the full `min-h-dvh` viewport. A header chrome above the FocusShell would either be hidden (FocusShell's `min-h-dvh` pushes it offscreen) or visible (breaking the parent-plan §5 / PRD §5.1 chrome-free focus-shell design). Both outcomes are bad: the first wastes layout space; the second violates the design.

**Why not in the `<MasteryIcon>` grid's bottom-left avatar?** The Mastery Map's bottom-left is currently the `<TriageAdherenceLine>` slot (`<footer className="mt-auto pt-6">`). Adding an avatar there competes with the triage adherence indicator for visual real estate. A user menu deserves a dedicated mounting point, not a corner of the secondary metrics row.

**Why top-right of `(app)/page.tsx`?** Three reasons:

1. **It is the canonical home.** Every authenticated user lands on the Mastery Map after every session. A logout that lives on the home screen is discoverable without being intrusive.
2. **It does not bleed into FocusShell-owned routes.** The Mastery Map renders its own chrome; the FocusShell does not.
3. **It mirrors the `/login` pattern.** The login page is a single Google sign-in button; the user menu on the Mastery Map is its symmetric counterpart.

The user menu is **not** added to the diagnostic-flow routes. The diagnostic explainer (`/diagnostic`) is brief and the user has no reason to log out from it; the diagnostic-run route is FocusShell-owned and chrome-free; the post-session capture is a one-form sit-down. A user who wants to log out from any of these can navigate back to `/` (which redirects to `/diagnostic` for users without a completed diagnostic, but they can complete the diagnostic and return).

### 7.2 Component shape

Two new files:

- **`src/components/user-menu/user-menu.tsx`** — server component (NOT async). Renders a small popover-trigger button (the user's display name or email, ~text-sm muted-foreground, with a chevron) that on click reveals a panel with a "Sign out" button. The popover uses the existing `<Popover>` primitives if any are already in `src/components/ui/`; otherwise a minimal click-toggled `<details>`-based control to avoid a popover dependency for one screen.
- **`src/components/user-menu/sign-out-form.tsx`** — `"use client"`. Mounts a `<form action={signOutAction}>` wrapping a `<Button type="submit">Sign out</Button>`. The `signOutAction` is a server action defined in the same file (or imported from `(app)/actions.ts` if the action surface is that file's home; the parent plan hosts other server actions there).

The server action:

```ts
// src/app/(app)/actions.ts (extension)
async function signOutAction() {
    "use server"
    await signOut({ redirectTo: "/login" })
}
```

The redirect target is `/login` (not `/`), so a logged-out user lands on the sign-in page rather than bouncing off the auth gate of `(app)/layout.tsx` immediately afterward.

The menu mounts inside the existing `<header>` block in `src/components/mastery-map/mastery-map.tsx`. The `<header>` becomes a flex row with the title on the left and the user menu on the right; the `<NearGoalLine>` stays below. No layout grid changes elsewhere.

### 7.3 Reading the user identity for the menu label

The Mastery Map's server `(app)/page.tsx` already calls `auth()` via `loadUserId`. The user's name (`session.user.name`) and email (`session.user.email`) are available. The menu label is `session.user.name ?? session.user.email`-shaped — but `??` is banned by `rules/no-nullish-coalescing.md`. The menu component takes the resolved display label as a prop, computed in the server component via an explicit pre-check:

```ts
function resolveDisplayLabel(session: Session): string {
    if (session.user?.name && session.user.name.length > 0) return session.user.name
    if (session.user?.email && session.user.email.length > 0) return session.user.email
    logger.warn({ userId: session.user?.id }, "user-menu: session has neither name nor email")
    return "Account"  // last-resort label, not a fallback that hides bad data
}
```

This is a true triage at a system boundary (NextAuth session shape), not an internal `??` fallback — both upstream values are documented as nullable by NextAuth.

---

## 8. Schema changes

**Zero new columns, zero new tables, zero enum additions.**

Cross-checked against parent-plan §3 and the seed schema:

- The 15-minute hard cutoff does not need a `session_duration_ms` column — the duration is implicit in `session.type === "diagnostic"`.
- The shuffle does not need a `seed_salt` column — the seed is `practice_sessions.id` (UUIDv7), already on every row.
- The latency-relaxation change is a code-only literal swap.
- The logout button writes nothing to any user table beyond what NextAuth already manages via the adapter.
- The pre-diagnostic explainer page reads no DB.
- The per-question timer surfacing reads `users.timer_prefs_json` (already Phase 1) but only as a pass-through; the default flip is in the server-action layer, not the column.
- The block-depletion visualization is pure client-side derivation from existing reducer state.

The `practice_sessions.diagnostic_overtime_note_shown_at_ms` column is left unread but not dropped (no migration this round; cleanup commit can drop it later).

---

## 9. Pre-flight checks

Run before commit 1 begins.

### 9.1 Bank density supports the shuffle

The 55-item seed bank's coverage is per parent-plan §8: 11 sub-types × (2 easy + 2 medium + 1 hard) = 55 items. The diagnostic mix demands exactly 50 of those plus 6 tier-degraded fallbacks for the numerical mediums (parent-plan §8 verified expectation).

The shuffle does not change the demand — same multiset of `(subTypeId, difficulty)` tuples. It only changes the order. So the same fallback ladder fires the same number of times across a full diagnostic, just at different attempt indices. Concretely: the unshuffled diagnostic produces 6 tier-degraded numerical-medium attempts at attempt indices 22, 27, 32, 37, 42, 47 (the third-medium slot of each numerical sub-type). Under the shuffle, the same 6 tier-degraded attempts occur at scattered indices.

**Verification:** the new unit test `shuffledDiagnosticOrder.test.ts` (commit 1) asserts the multiset invariant. Additionally, the manual verification in commit 6 (end-to-end diagnostic) runs the existing parent-plan §10 commit-4 SQL spot-check (`SELECT count(*) FROM attempts WHERE session_id = $1 AND metadata_json->>'fallback_level' = 'tier-degraded'`) and confirms the count is still ≤ 6 under the shuffled order.

If a stage-2 OCR explanation pass has run since Phase 3 wrapped (the 99 stage-1 items getting their explanations and being promoted to `live`), the bank is denser than 55 and the fallback ladder fires less often. Either way, the shuffle behavior is unchanged — the test only asserts the ≤ 6 ceiling, not the exact value.

### 9.2 Diagnostic gate redirect-target compatibility with the route move

`(app)/layout.tsx` redirects to `/diagnostic`. Under the route move, `/diagnostic` is the new explainer page, not the diagnostic session itself. The user clicks "Start Diagnostic" → navigates to `/diagnostic/run` → session starts.

The redirect-loop edge cases from parent-plan §9.4 must still be safe:

- **In-progress diagnostic.** User starts a diagnostic, navigates to `/`, the gate redirects to `/diagnostic` (explainer). User clicks Start. `/diagnostic/run` runs `abandonInProgressDiagnosticsAndStart` which finalizes the orphan and starts fresh. ✅ No redirect loop, one extra click vs. the previous flow.
- **Direct navigation to `/diagnostic/run` for an unauthenticated user.** `(diagnostic-flow)/layout.tsx`'s auth gate runs. If unauthenticated, redirects to `/login`. ✅ Unchanged.
- **Direct navigation to `/diagnostic/run` for an authenticated user with a completed diagnostic.** No redirect. The user starts a brand-new diagnostic (orphan-then-restart behavior is bypassed since there's no in-progress row). The `(app)/layout.tsx` gate would have redirected `/` → `/diagnostic` for them ONLY if they had no completed diagnostic, but they do have one, so no redirect happens. The user can take a second diagnostic if they wanted; this is allowed and not new behavior.
- **Direct navigation to `/diagnostic` (the explainer) for an authenticated user with a completed diagnostic.** The explainer renders. The user clicks Start and runs another diagnostic. This is allowed; no loop. (If we want to prevent users from re-taking the diagnostic, that's a Phase 5/6 behavior change, not a Phase 3 polish.)

**Verification:** commit 3's smoke runs all four cases manually.

### 9.3 5-minute abandon threshold vs. 15-minute hard cutoff

The two thresholds do not interact directly:

- **Abandon threshold** (`ABANDON_THRESHOLD_MS = 5 * 60_000` in `src/server/sessions/abandon-threshold.ts`): a session with `last_heartbeat_ms < now - 5 min AND ended_at_ms IS NULL` is finalized as `'abandoned'` by the cron. Heartbeats fire every 30s while a tab is active.
- **Hard cutoff** (`DIAGNOSTIC_SESSION_DURATION_MS = 15 * 60_000`): a diagnostic session whose elapsed time at `submitAttempt` time exceeds 15 min returns `nextItem: undefined` and ends.

The interaction case: a user starts a diagnostic, heartbeats every 30s for 14 minutes, then closes the tab at minute 14. Heartbeats stop. The session is still in-progress. The 15-min hard cutoff cannot fire (no `submitAttempt` calls being made). The abandon-sweep cron fires at minute 19 (5 min after last heartbeat) and marks the session `'abandoned'` with `completion_reason = 'abandoned'`. The mastery-recompute workflow runs and produces a partial-diagnostic mastery state.

This is the same behavior the Phase 3 abandon-then-recompute design produces — no regression. The hard cutoff only fires when the user is actively submitting.

The other interaction case: a user starts a diagnostic, runs through 30 questions in 15 minutes, the cutoff fires at the 31st `submitAttempt`, `endSession` runs and writes `completion_reason = 'completed'`. The cron's WHERE clause excludes the row. ✅

### 9.4 Stage 2 OCR explanation pass status

Status check, not a blocker. If the 99 stage-1 OCR items have NOT yet been processed by the explanation generator (`scripts/generate-explanations.ts`), they remain `status='candidate'` and are not selected by the diagnostic. The diagnostic still runs against the 55-item hand-seeded bank as parent-plan §8 covers.

If the stage-2 pass HAS run since Phase 3 wrapped, the diagnostic has more items to choose from per `(sub_type_id, difficulty)` tuple, the recency-excluded set is denser, and the ≤ 6 tier-degraded fallback ceiling drops. No code change needed either way.

**Verification:** before commit 1 begins, run `bun -- bun run scripts/db/print-bank-counts.ts` (or equivalent) and record the count. If the count is > 55, note it in the commit message. If equal to 55, the bank is unchanged from Phase 3 wrap.

### 9.5 Lefthook + new biome-ignore decisions

Lefthook is wired (parent-plan §11.2). New code in this round must pass lint + typecheck on every commit. The plan does not anticipate any new biome-ignore decisions:

- The shuffle PRNG uses `Math.random` only via the deterministic mulberry32 wrapper (no biome rule fires).
- The block-depletion component uses Tailwind classes only (no `style={{}}`).
- The user menu uses the existing `<Button>` primitive (no new component dependencies).
- The route move is a file rename + small edit (no new imports beyond moves).

If a biome-ignore turns out to be necessary (e.g., a tooling-boundary surface that the biome config doesn't yet cover), follow parent-plan §11.2's precedent: add the path to the biome config rather than scatter inline ignores.

---

## 10. Sequencing and commits

Six commits, in this order. Each is independently testable; stop and report after each commit before starting the next.

### Commit 1 — `feat(server): diagnostic shuffle + 15-minute hard cutoff + 1.2× latency relaxation`

Scope: server-only. No client changes. No route changes.

Files added/modified:
- `src/config/diagnostic-mix.ts` (MOD) — add `shuffledDiagnosticOrder(sessionId: string)` export. Adds the xmur3 + mulberry32 helpers as un-exported module-internal functions. Existing `diagnosticMix` and `DiagnosticEntry` exports unchanged.
- `src/config/diagnostic-mix.test.ts` (NEW) — unit tests:
  - `same sessionId → identical permutation`
  - `different sessionIds → non-identical permutations`
  - `every permutation contains the same multiset of (subTypeId, difficulty) as diagnosticMix`
  - `permutation length === 50`
  - One regression: a hardcoded `it("uuid '0000...0001' permutes to a known sequence")` case that pins the shuffle's deterministic output for one specific seed (so a future PRNG swap is caught by a failing test, not a silent behavior change).
- `src/server/items/selection.ts` (MOD) — `getNextFixedCurve` reads `shuffledDiagnosticOrder(ctx.id)[attemptIndex]` instead of `diagnosticMix[attemptIndex]`. The error-shape `ErrDiagnosticMixOutOfRange`'s message is unchanged.
- `src/server/sessions/diagnostic-cutoff.ts` (NEW) — exports `DIAGNOSTIC_SESSION_DURATION_MS = 15 * 60_000`. Sibling to `abandon-threshold.ts`.
- `src/server/sessions/submit.ts` (MOD) — after the existing `attempts` insert and before the `getNextItem` call, add the cutoff check per §4.2. The `readSession` call is already present (Phase 3 reads it for the userId guard); reuse it.
- `src/server/mastery/compute.ts` (MOD) — `sourceParams('diagnostic')` returns `latencyMultiplier: 1.2` (was 1.5).
- `src/server/mastery/compute.test.ts` (MOD) — add the two cases from §4.3 (over-credit case and floor case).

Smoke tests:
- `bun lint && bun typecheck` — both clean.
- `bun test src/config/diagnostic-mix.test.ts` — all five cases pass.
- `bun test src/server/mastery/compute.test.ts` — existing cases still pass; new cases pass.
- A throwaway Bun script (`scripts/dev/smoke/phase3-polish-commit1.ts`, NEW; deleted at end of round) that:
  - Calls `startSession({ type: 'diagnostic' })` against the dev DB. Records the returned `sessionId`.
  - Calls `submitAttempt` 51 times in a loop with a hand-edited `practice_sessions.started_at_ms` set to (now - 16 minutes) before the 51st call.
  - Asserts that the 51st call returns `nextItem: undefined` (the cutoff fires).
  - SQL spot-check: `SELECT completion_reason FROM practice_sessions WHERE id = $1` returns `'completed'` after the FocusShell's `endSession` would have run. The script can call `endSession` directly via the underlying-function import (parent-plan commit 1 pattern with `skipWorkflowTrigger: true`).
  - Cleanup: deletes the test session.

Stop-and-report criterion: all four checks pass; the throwaway smoke script's output is pasted into the commit's report. Confirm `bun typecheck` is clean.

### Commit 2 — `feat(focus-shell): restyle + per-question timer surfacing + block depletion + remove overtime-note machinery`

Scope: client only. The FocusShell restyle, the new visualization, the per-question timer flip, the cosmetic last-question hint, and the dead-code removal of the overtime-note machinery.

Files added/modified:
- `src/components/focus-shell/focus-shell.tsx` (MOD) — new layout grid per §5.1; mount the `<QuestionBlockDepletion>` component; remove `<DiagnosticOvertimeNote>` mount; remove `onRecordDiagnosticOvertime` effect; add the load-bearing-key comment per §5.5; add the cosmetic last-question indicator per §5.6.
- `src/components/focus-shell/shell-reducer.ts` (MOD) — delete `diagnostic_overtime_note_shown` action, `diagnosticOvertimeNoteShown` field, `diagnosticOvertimeNoteVisibleUntilMs` field, the `DIAGNOSTIC_OVERTIME_THRESHOLD_MS` and `DIAGNOSTIC_OVERTIME_VISIBLE_MS` constants, the overtime branch of `reduceTick`, and the `reduceOvertimeNoteShown` helper. Update the dispatch in `dispatchSecondary` accordingly.
- `src/components/focus-shell/types.ts` (MOD) — remove `onRecordDiagnosticOvertime` from `FocusShellProps`.
- `src/components/focus-shell/diagnostic-overtime-note.tsx` (DELETE).
- `src/components/focus-shell/question-block-depletion.tsx` (NEW) — per §5.3.
- `src/components/focus-shell/question-timer-bar.tsx` (MOD) — restyle per §5.2 (move from footer to the central column's top, color-register update, full-width).
- `src/components/focus-shell/session-timer-bar.tsx` (MOD) — restyle per §5.1 (large MM:SS readout top-right, thin progress bar across the top of the page).
- `src/components/focus-shell/triage-prompt.tsx` (MOD) — re-dock per §5.4 (top-center instead of bottom-center).
- `src/components/item/option-button.tsx` (MOD) — restyle per §5.1 (taller padding, flush borders, A/B/C/D/E label as a filled left tab). Existing keyboard-nav contract unchanged.
- `src/app/(diagnostic-flow)/diagnostic/content.tsx` (MOD — until commit 3 moves it) — flip `initialTimerPrefs.questionTimerVisible` from `false` to `true`. Drop the `onRecordDiagnosticOvertime` prop wiring.
- `src/app/(app)/drill/[subTypeId]/run/content.tsx` (MOD) — flip `initialTimerPrefs.questionTimerVisible` from `false` to `true`.
- `src/app/(app)/actions.ts` (MOD) — delete `recordDiagnosticOvertimeNote` server action.

Smoke tests:
- `bun lint && bun typecheck` — both clean. The lint pass enforces `no-arrow-functions`, `no-relative-imports`, `no-inline-style`, `no-iife`, etc., on the new and modified component files.
- The existing `src/app/_phase3-smoke/page.tsx` (or `phase3-smoke/page.tsx`) is updated to mount the restyled FocusShell with stubbed handlers. Manual verification:
  - First-item paint visible immediately, layout matches `data/example_ccat_formatting/example_01.png` (within reason — exact pixel parity is not the goal).
  - Pressing `1`–`5` selects an option. Pressing `Enter` submits; latency value (debug overlay) plausible.
  - At t=18s the triage prompt overlay appears at top-center. Block depletion empties, per-question timer bar reaches zero. **No auto-submit.**
  - Per-question timer visible by default.
  - Cosmetic "last question" indicator appears when the smoke harness fakes a session-elapsed value past the cutoff.
- Browser devtools: confirm the requestAnimationFrame loop still runs at ~60 Hz; the `<Heartbeat>` component still fires `sendBeacon` every 30 s.

Stop-and-report criterion: all manual checks pass; a screenshot of the smoke page is attached to the commit's report alongside `data/example_ccat_formatting/example_01.png` for visual comparison.

### Commit 3 — `feat(routing): pre-diagnostic explainer + /diagnostic/run move`

Scope: route shape. No engine, no FocusShell.

Files added/modified:
- `src/app/(diagnostic-flow)/diagnostic/page.tsx` (REPLACED) — new explainer page per §6.1. Server component, NOT async. Renders the explainer panel + the `<Link href="/diagnostic/run">` CTA.
- `src/app/(diagnostic-flow)/diagnostic/run/page.tsx` (NEW — moved from `/diagnostic/page.tsx`) — contents unchanged from the previous `/diagnostic/page.tsx`; only the import path of `<DiagnosticContent>` updates to `@/app/(diagnostic-flow)/diagnostic/run/content`.
- `src/app/(diagnostic-flow)/diagnostic/run/content.tsx` (NEW — moved from `/diagnostic/content.tsx`) — contents unchanged.
- `src/app/(diagnostic-flow)/diagnostic/content.tsx` (DELETE — moved to `/diagnostic/run/content.tsx`).

Smoke tests:
- `bun lint && bun typecheck` — both clean.
- Sign in as a fresh user (no completed diagnostic). Navigate to `/`. Assert: redirect to `/diagnostic` (the explainer renders, NOT the FocusShell).
- Click "Start Diagnostic." Assert: lands on `/diagnostic/run` with the FocusShell mounted on the first item.
- Refresh `/diagnostic/run` mid-session (browser refresh). Assert: orphan-then-restart logic runs (the previous in-progress session is finalized as `'abandoned'`, a new session starts). Confirm via SQL: the previous session row has `completion_reason = 'abandoned'`.
- Direct navigation to `/diagnostic/run` for an unauthenticated user: redirected to `/login`. ✅ unchanged.
- Direct navigation to `/diagnostic` for an authenticated user with a completed diagnostic: explainer renders (allows re-take). Click Start: a fresh diagnostic begins.

Stop-and-report criterion: all five flow steps pass; the route tree matches §6.1.

### Commit 4 — `feat(focus-shell): client-side handling of the 15-minute cutoff`

Scope: thin client edit on top of commit 1's server-side cutoff and commit 2's restyle. The cutoff is already enforced server-side (commit 1); this commit adds the client-side cosmetic indicator and ensures the FocusShell handles `nextItem: undefined` gracefully when triggered by the cutoff (it already does — that's the same code path as the natural 50th-item end). The bulk of the work is making sure the diagnostic's `sessionDurationMs` is wired through and the cosmetic indicator is connected to it.

Files added/modified:
- `src/app/(diagnostic-flow)/diagnostic/run/content.tsx` (MOD) — change `sessionDurationMs={null}` to `sessionDurationMs={DIAGNOSTIC_SESSION_DURATION_MS}` (imported from `src/server/sessions/diagnostic-cutoff.ts` if importable from a client component, otherwise mirrored as a client-side constant in `src/components/focus-shell/types.ts` or a new sibling). Pass the diagnostic session-duration so the session-timer bar and cosmetic last-question indicator can render.
- `src/components/focus-shell/session-timer-bar.tsx` (MOD if needed) — confirm `DURATION_CLASS_BY_MS` covers `900_000` (it already does per the existing entries). The session-timer bar now renders for the diagnostic too.
- `src/components/focus-shell/focus-shell.tsx` (MOD) — derive `isLastQuestion` from `state.elapsedSessionMs >= props.sessionDurationMs && props.sessionType === "diagnostic" && props.sessionDurationMs !== null`; pass the boolean into the question-count label component (or apply the suffix inline if the count is rendered locally).

Note on import boundaries: `src/server/sessions/diagnostic-cutoff.ts` exports a numeric constant only — no I/O, no DB. Importing it from a client component is allowed under the existing rules (it does not pull a server-only dependency into the client bundle). If a future seam tightens the server-only enforcement, mirror the constant into a client-side module.

Smoke tests:
- `bun lint && bun typecheck` — both clean.
- Visual smoke: in the dev focus-shell smoke page, set the FocusShell's `sessionDurationMs={5000}` (5s for fast iteration), let the clock cross 0:00, confirm the question count label flips to "Question N / 50 — last question" and the user can still submit one more time.
- End-to-end smoke: hand-edit a diagnostic session's `started_at_ms` to (now - 14:55 min), step through one more question, watch the cutoff fire on the server's response (FocusShell's `nextItem: undefined` path triggers `onEndSession` → redirects to post-session). SQL spot-check: `completion_reason = 'completed'`, the last attempt's `latency_ms` is plausible.

Stop-and-report criterion: cosmetic indicator visible at the right moment; cutoff path produces a valid completed session row.

### Commit 5 — `feat(app): logout button via UserMenu on Mastery Map`

Scope: a small new component + one server-action addition. No route changes.

Files added/modified:
- `src/components/user-menu/user-menu.tsx` (NEW) — server component per §7.2.
- `src/components/user-menu/sign-out-form.tsx` (NEW) — `"use client"` form with the signOut server action.
- `src/app/(app)/actions.ts` (MOD) — add the `signOutAction` server action that calls `signOut({ redirectTo: "/login" })`.
- `src/components/mastery-map/mastery-map.tsx` (MOD) — restructure the `<header>` to a flex row: title on the left, `<UserMenu>` on the right.
- `src/app/(app)/page.tsx` (MOD) — pass the resolved `displayLabel` (computed from `session.user.name` or `session.user.email`) into `<MasteryMap>` as a prop. The Mastery Map forwards it to `<UserMenu>`.

Smoke tests:
- `bun lint && bun typecheck` — both clean.
- Sign in. Navigate to `/`. Confirm the user menu trigger renders top-right with the user's name (or email).
- Click the trigger, click "Sign out." Confirm: redirected to `/login`. SQL spot-check: the auth session row in the database is invalidated (NextAuth's standard signOut behavior).
- Navigate to `/` again without signing in. Redirected to `/login` (auth gate). ✅
- Sign in with a different Google account. New `users` row created if first-time, otherwise existing. The user menu now shows the new account's display label.

Stop-and-report criterion: round-trip sign-in → menu → sign-out → re-sign-in works.

### Commit 6 — `chore(verify): end-to-end polish smoke + visual diff`

Scope: a single end-to-end manual run-through of the polished diagnostic, plus targeted SQL/visual checks. No code changes (or, at most, doc updates and the deletion of the throwaway smoke script from commit 1).

Smoke tests (manual, in browser, against the dev server):
- Sign in as a fresh user. Lands on `/diagnostic` (explainer). Confirm the three-bullet body renders verbatim and the CTA reads "Start Diagnostic."
- Click Start. Lands on `/diagnostic/run`. FocusShell mounts with the restyled layout: large MM:SS top-right, thin progress bar below, "Question 1 / 50" label, large question text, 18 block-depletion squares, options as tall buttons, full-width "Submit Answer" CTA.
- Step through 10 questions deliberately slowly (~25 s each). At t=18 s on each question, confirm the triage prompt appears top-center, the per-question timer reaches zero, the block-depletion row empties. **No auto-submit.** Manually submit each.
- Confirm the served sub-types are shuffled (not all `verbal.synonyms` first). SQL spot-check: `SELECT i.sub_type_id FROM attempts a JOIN items i ON i.id = a.item_id WHERE a.session_id = $1 ORDER BY a.id` shows interleaved sub-types, not 4-in-a-row blocks.
- Hand-edit `practice_sessions.started_at_ms = now() - interval '14 minutes 55 seconds'` for the in-progress session. Submit one more question. Confirm: the cosmetic "last question" indicator appears; the next submit ends the session (FocusShell pushes to `/post-session/<sessionId>`).
- Fill in target-percentile and target-date on the post-session form. Submit. Lands on `/`.
- Confirm the user menu top-right renders with the signed-in user's name. Click → Sign out. Redirected to `/login`. ✅
- Re-sign in. Lands on `/` (Mastery Map renders; no diagnostic redirect because the diagnostic completed).
- Visual diff: open `/diagnostic/run` and compare side-by-side to `data/example_ccat_formatting/example_01.png` through `example_06.png`. Note any large mismatches; small typographic adjustments are acceptable.

SQL spot-checks:
- `SELECT count(*) FROM attempts WHERE session_id = $1 AND metadata_json->>'fallback_level' = 'tier-degraded'` ≤ 6 (parent-plan §8 ceiling, unchanged under shuffle).
- `SELECT current_state FROM mastery_state WHERE user_id = $1` shows no `'mastered'` rows (diagnostic-source still caps at `fluent`).
- `SELECT distinct served_at_tier FROM attempts WHERE session_id = $1` includes at least `easy`, `medium`, `hard` (full-tier coverage preserved post-shuffle).

Stop-and-report criterion: all manual flow steps pass; SQL spot-checks confirm shuffle-invariant behavior.

---

## 11. Risk areas

### 11.1 Shuffle interaction with the difficulty curve (none, but worth confirming)

The diagnostic mix has no global difficulty curve to disrupt (§4.1). The within-sub-type local easy → hard ordering was incidental, not load-bearing. The shuffle preserves the multiset of `(subTypeId, difficulty)` tuples exactly. **Risk: low.** The unit test in commit 1 covers the multiset-invariance regression.

A residual concern: the unshuffled mix served all easy items at attempt indices `{0, 4, 8, 12, ...}` (multiples of 4 for verbal blocks, multiples of 5 for numerical blocks) — the user always saw the first item of a sub-type as the easy. Under the shuffle, the easy items scatter across the 50 indices. If the user benefits from a "warmup easy item" at the start of each sub-type block (e.g., as a confidence-building cue before the harder items), that benefit is lost. The PRD does not promise this benefit; it was an incidental property of the mix file's authoring layout. The plan's call: this is not a real risk, just an observation. If the diagnostic UX feels jarring in dev testing, a follow-up could reintroduce a "first item is always easy" constraint by reshuffling within constraint instead of fully randomizing.

### 11.2 Mastery-model changes from the hard-timing reframe

The 1.2× latency relaxation is a calibration call without a ground truth to test against. The risk: if the actual user effect of the 15-minute cutoff is to *slow them down* (because they panic and freeze) rather than *speed them up* (because they push), 1.2× would over-penalize the slow-and-careful users.

**Mitigation:** the parameter is a single literal in `sourceParams('diagnostic')`. Adjusting it later is a one-line PR. The Phase 3 mastery-recompute already runs idempotently, so changing the constant and re-running the recompute against historical attempts produces an updated mastery-state with no user-visible step change beyond the new value. If real-user data shows the calibration is wrong, swap and recompute.

### 11.3 Focus-shell rewrite breaking latency anchors or triage prompt

The restyle is the largest single piece of churn in this round. Two specific risks:

- **Latency anchor break.** A restyle that lifts `<ItemSlot>` into a non-keyed render (e.g., wrapping it in `React.memo` with stable props, or fusing it into the FocusShell's render) silently breaks the per-item mount-effect cycle. The 5-minute tripwire in `submitAttempt` catches the worst case (latencies that would be flat-out wrong); subtle drift (latencies off by a few hundred ms because of an inadvertent layout-induced re-paint) would not be caught.
  - **Mitigation:** the comment block added at the `<ItemSlot key={...} />` JSX site (§5.5). Plus a manual smoke check in commit 6: latencies for a 10-question slow run should be in the 20–30 s band, not the 14–15 min band.
- **Triage prompt re-dock breaks the BrainLift.** The prompt's pedagogical value is its salience-without-modality. If the new top-center dock is too visually muted (overpowered by the question text below it), users will not notice. If it's too prominent (a modal blocker), it teaches the user to dismiss it as a click target rather than as a strategic cue.
  - **Mitigation:** the existing PRD §6.1 copy ("Best move: guess and advance.") is preserved verbatim. Visual register: backdrop-blur, rounded pill, foreground/80 text — the same intent as the current bottom-center implementation. Manual smoke in commit 2 confirms it appears at t=18s.

### 11.4 Route move resurfacing the post-completion orphan

The diagnostic flow uses `router.push("/post-session/<sessionId>")` after `endSession`, not a form action — so Next.js auto-revalidation does not re-run `/diagnostic/run`'s server-side `startSession`. The post-completion orphan source identified in parent-plan §11.3 specifically affects flows where `endSession` is fired from a form action with auto-revalidation against the source route. Neither `/diagnostic/run` nor the new `/diagnostic` explainer fires `endSession` from a form action. **Risk: none new.**

That said, if a future commit converts the FocusShell's `onEndSession` to be invoked from a form action for some reason, the orphan source would land on `/diagnostic/run`. Commit 6's manual smoke includes a "fresh sign-in → diagnostic → completion → check for orphan" SQL check (`SELECT count(*) FROM practice_sessions WHERE user_id = $1 AND type = 'diagnostic'` should equal exactly 1 after a normal completion).

### 11.5 Lefthook + new biome-ignore decisions

Lefthook is wired (parent-plan §11.2 / Commit B). All new code in this round must pass the pre-commit lint + typecheck. No new biome-ignore decisions are anticipated (§9.5). If one becomes necessary (e.g., the new `<UserMenu>` somehow needs an inline ignore for a rule that does not yet account for popover-trigger patterns), follow parent-plan §11.2's precedent: prefer a biome config-level adjustment over an inline `biome-ignore` comment. Document the new boundary in the commit message and in this plan's §11.5 follow-up if it surfaces.

### 11.6 The deleted overtime-note machinery and its database column

The `practice_sessions.diagnostic_overtime_note_shown_at_ms` column stops being written by commit 2. Existing rows that had the column populated stay populated; no migration. The column is now dead — no read sites, no write sites. A future cleanup commit can drop it, but doing so requires a Drizzle migration, and the cost of dropping it now (running a migration in coordination with prod data) outweighs the benefit (one nullable bigint of overhead per row).

**Risk:** if a future PR re-introduces overtime-note logic without checking that the timed-diagnostic design has supplanted it, the new logic would silently coexist with the cutoff (writing the column once but having no effect). **Mitigation:** delete the column in a Phase 4 or Phase 5 cleanup commit, when the next schema migration is being authored anyway. In the meantime, this plan documents the column as vestigial in §8.

---

## 12. Forward-looking notes

- **The `<DiagnosticOvertimeNote>` deletion is a clean signal of the reversal in §3.1.** Once deleted, the only path to "user spent more than 15 minutes on a diagnostic" is the 15-minute cutoff itself. A future Phase 6 history view that wants to surface "you finished only 23 of 50 in your diagnostic" can derive that from `attempts.count` per session — no new column needed.
- **The shuffle deterministic seeding is a Phase 5 / Phase 6 affordance.** The `shuffledDiagnosticOrder(sessionId)` function is reproducible by anyone who has the sessionId. A future review surface ("re-walk your diagnostic") can replay the same 50-item sequence by passing the same sessionId. No additional state needed.
- **The 1.2× latency relaxation is a one-line tunable.** If post-launch data shows the calibration is off, swap the literal and re-run mastery recompute. The existing `recomputeForUser(userId, subTypeId, source)` is idempotent.
- **The user-menu surface scaffolds Phase 6's full settings page.** Today: one button, "Sign out." Phase 6 adds: target-percentile re-edit, target-date re-edit, account deletion, history. The `<UserMenu>` component's panel can grow to a settings popover or link out to a dedicated `/settings` route — both options are open.
- **The block-depletion visualization is the first decorative non-data element in the focus shell.** PRD §5.1 says the periphery should be dimmed and non-interactive; the block depletion is dimmed and non-interactive but it's also above the fold in the central column. The plan treats it as an extension of the per-question timer bar (same purpose, different encoding). If user testing shows it competes for attention with the question text, the easy back-out is to move it back to the periphery alongside the per-question timer bar — both are pure derivations from `elapsedQuestionMs`, neither has any state of its own.
- **The reference-screenshot match is a directional goal, not a pixel-perfect contract.** `data/example_ccat_formatting/*.png` shows the layout intent. Typographic choices (exact font sizes, exact button heights, exact gap values) are at the implementer's discretion within the constraints of §5. A future "polish pass" can tighten the visual parity if the reference screenshots become the canonical brand-style for the focus shell.
