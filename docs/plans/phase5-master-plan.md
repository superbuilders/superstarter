# Plan — Phase 5 master arc: engine completeness (v1 scope)

> **Status: planning, approved, not yet implemented.** This is a master plan — sub-phase carving only. NO per-sub-phase implementation detail; those plans get drafted at each sub-phase's start, against then-current state, the way Phase 3's four sub-phase plans were (`docs/plans/phase3-{diagnostic-flow,mastery-map,drill-mode,heartbeats-and-cron}.md`).

Phase 5 is the next major engine-completeness arc after Phase 3 closed end-to-end on 2026-05-04. The arc was originally scoped per `docs/architecture_plan.md` line 66 to cover *"Adaptive difficulty (drills) + spaced-repetition queue + review session + speed-ramp/brutal modes + question-timer toggle + NarrowingRamp + strategy review gate + full-length test"* — eight surfaces. **Five of those surfaces were cut from v1 on 2026-05-04** (see §1's v1-scope-tightening note). The v1 arc is correspondingly tighter: five sub-phases that ship the post-session review surface, adaptive walker, full-length test (no strategy gate), click-to-highlight, and Dojo mode UI rename + belt indicator. Sub-phase 1 lands the foundation surface that several others build on; sub-phase 2 closes the adaptive-difficulty deferral that sub-phase 5 depends on; the rest layer features in dependency order.

## 1. Why this round, why now

Four forcing functions:

1. **Phase 3 closed clean.** Sub-phases 1 + 2 + 3 + 4 shipped the user-facing happy path and the background-state-management infrastructure. No outstanding-and-blocking items from Phase 3 carry into Phase 5.

2. **Engine completeness is the next coherent arc.** Roadmap Round C (stats + history) is independent and could ship before, after, or in parallel; Round D (Phase 4 LLM generation) is sequenced post-Phase-5 per the candidate-promotion-shadow-mode rationale. That leaves Phase 5 as the next major user-visible arc.

3. **Round Bx (deploy-and-dogfood interlude) is being skipped per Leo's "no-deploy-until-feature-complete" decision.** The roadmap currently names Round Bx as the next move and states it "gates Phase 5 planning detail." That sequencing is explicitly being overridden — Phase 5 sub-phase planning starts now, against `main`'s current state, without dogfood signal informing the carve. The roadmap amendment to flip Round Bx from "next" to "deferred until Phase 5 + post-Phase-5 rounds complete" lands in the round's commit 2 (feature-roadmap edit).

4. **v1 scope tightening (2026-05-04).** Five surfaces from the original Phase-5 architecture-plan list were cut from v1: spaced-repetition queue + review session, the 30-second strategy-review gate, speed-ramp + brutal drill modes, the question-timer toggle (and the session-timer toggle alongside it — same friction logic), and the NarrowingRamp pre-session protocol. The cuts collectively remove all the friction-heavy, schema-heavy, and pre-session-only surfaces from v1; what remains is the user-facing polish on the existing drill loop plus the full-length test that PRD §1 names as the highest-leverage retention surface. Cuts are doc-only in this round — code-surface cleanup (vestigial schema files, columns, server actions, reducer state) is a deliberate follow-up round, planned after this one lands.

The cost of skipping dogfood is real but bounded: Phase 5's sub-phases each follow the audit-and-polish pattern that worked through Phase 3's four sub-phases — each sub-phase opens with an audit of `main`'s relevant state at sub-phase start, which catches drift the dogfood-signal would have surfaced earlier but doesn't prevent shipping. The accumulated SPEC §6.14 implementation notes (16 entries through Phase 3, especially .11 audit-tighter-than-contract, .14 uniform-response-code-for-ownership-opacity, .15 hermetic-smoke-with-per-run-isolation, .16 auth-shape audit) are the discipline that compensates.

**Alpha Style adoption.** Phase 5 also adopts Alpha Style as the design system for non-focus-shell UI; the focus shell's tuned visual language is preserved as-is. See §10 for the boundary, the rationale, and the round-opening setup hook that runs in sub-phase 1.

## 2. Phase 5 scope inventory — partially shipped vs net-new vs cut-from-v1

Phase 5's surface area is broad. To carve it cleanly, distinguish what `main` already carries vs what's net-new for v1 vs what's been cut from v1.

### Already partially shipped on `main`

- **Drill mode (uniform_band).** Sub-phase 3 closed. Drills run with a constant requested tier derived from `mastery_state` per SPEC §9.1's initial-tier table; tier-degraded fallback handles bank exhaustion. `selection.ts` carries `ErrAdaptiveDeferred` as a placeholder for the adaptive walker.
- **Diagnostic post-session form.** Sub-phase 1 shipped `<OnboardingTargets>` + the derived pacing-line at `/post-session/[sessionId]`. PRD §6.5's full review surface (accuracy-by-sub-type, median-latency-by-sub-type, triage score, wrong-items browser, surfaced strategies) is NOT yet built — only the onboarding form + pacing line.
- **Triage scoring (`triageRolling30d`, `triageScoreForSession`).** `src/server/triage/score.ts` from Phase 3. Already covers per-session and 30-day-rolling shapes; reusable by Phase 5's post-session review surface.
- **`<FocusShell>` configuration props.** `sessionDurationMs`, `perQuestionTargetMs`, `paceTrackVisible`, `targetQuestionCount`, `initialTimerPrefs.questionTimerVisible` — all wired. Phase 5 v1 uses only the standard-mode (18s perQuestionTargetMs) configuration.
- **Pure-function helpers.** `recomputeForUser`, `computeMastery`, `deriveNearGoal`, `recommendedNextSubType` all exist.

### Net-new for Phase 5 v1

- Post-session review surface for every session type (PRD §6.5, minus the strategy-review gate which is cut).
- Adaptive difficulty walker (closes `ErrAdaptiveDeferred`).
- Full-length test (`/full-length` route + cross-sub-type-interleaved curve + 15-min session timer; no strategy gate per the cut).
- Click-to-highlight in post-session explanation review (PRD §6.5 extension; consumes structured-explanation contract).
- Dojo mode UI rename + belt-indicator on post-session summary (PRD §4.2 extension; UI naming + tier visualization).

### Cut from v1 (doc-only this round; code cleanup is a follow-up round)

- **Spaced-repetition queue + review session + Mastery Map "Review (N due)" button.** Schema file `src/db/schemas/review/review-queue.ts` stays on disk; SPEC marks it cut-from-v1. The `'review_queue'` selection-strategy throwing-stub stays in `src/server/items/selection.ts` as a defensive guard against impossible state in v1.
- **30-second strategy-review gate after full-length.** Schema file `src/db/schemas/ops/strategy-views.ts` stays on disk; SPEC marks it cut-from-v1.
- **Speed-ramp + brutal drill modes.** `practice_sessions.timer_mode` enum stays as `['standard', 'speed_ramp', 'brutal']`; SPEC marks `speed_ramp` and `brutal` as cut-from-v1, only `'standard'` written.
- **Question-timer toggle AND session-timer toggle.** Both default per PRD §5.1 (session bar always-visible during timed sessions; question bar default-OFF). `users.timer_prefs_json` column, `persistTimerPrefs` server action, and the `timerPrefs` reducer state all become vestigial; SPEC marks cut-from-v1.
- **NarrowingRamp pre-session protocol.** `practice_sessions.narrowing_ramp_completed` and `if_then_plan` columns become vestigial (always default-written); SPEC marks cut-from-v1.

### Out of Phase 5 scope (no behavior change vs. prior plan)

- Test-day simulation (PRD §4.6) — Phase 6 per `docs/architecture_plan.md` build-sequencing.
- History tab (#10), stats dashboard (#6), independent timer (#8) — post-Phase-5 rounds with their own roadmap entries.
- Phase 4 LLM generation pipeline.
- Account deletion, candidate-promotion-cron-runner — Phase 6.
- Code-surface cleanup of vestigial v1-cut artifacts (the schema files, columns, server actions, reducer state listed above) — separate follow-up round, deliberately scoped.

## 3. Sub-phase 1 — Post-session review surface

**Title.** Post-session review surface (PRD §6.5 foundation; v1 cuts the strategy-review gate per §1).

**Scope.** Build the post-session review screen that PRD §6.5 specifies for every session type EXCEPT the 30-second strategy-review gate (cut from v1): accuracy summary by sub-type (categorical ✓/✗, no percentages), median latency by sub-type with threshold marked, triage score, wrong-items browser (each shows prompt + options + correct answer + explanation), surfaced strategies for sub-types where the user struggled. Lands at `/post-session/[sessionId]` for drill + diagnostic + (sub-phase 3) full-length. Replaces the diagnostic-only onboarding-form that Phase 3 sub-phase 1 shipped (the form moves into the new surface as a diagnostic-only section). Does NOT include: click-to-highlight (sub-phase 4); the strategy-review gate (cut from v1).

**Dependencies.** None within Phase 5; depends on Phase 3's `triageScoreForSession` + `mastery_state` + `attempts` schema (all on `main`).

**Rough commit count.** 4-6.

**Recommended sequencing position.** Sub-phase 1. Sub-phases 3 (full-length needs the review surface for non-gate part) and 4 (click-to-highlight builds on top) both depend on this surface existing first.

**Cross-cutting concerns.** SPEC §6.5 update (post-session review schema + render). New components under `src/components/post-session/`. No schema migrations expected — all data already in `attempts` + `practice_sessions` + `items`. The surface needs `<WrongItemsBrowser>`, `<AccuracySummary>`, `<LatencySummary>`, `<StrategySurface>` components. All net-new components are Alpha-Style-styled per §10; sub-phase 1's opening commit also runs `teach-alpha-style` as the round's one-time setup so subsequent sub-phases inherit it.

## 4. Sub-phase 2 — Adaptive difficulty walker

**Title.** Adaptive difficulty walker (closes `ErrAdaptiveDeferred`).

**Scope.** Implement `nextDifficultyTier` per SPEC §9.1: track running accuracy and latency over the last 10 in-session attempts on the current sub-type; step up when accuracy ≥ 90% AND latency comfortably under threshold; step down when accuracy ≤ 60% OR latency well above threshold; otherwise hold. Replace `selection.ts`'s `selectionStrategyForSession("drill", _) === "uniform_band"` with `"adaptive"`. The walker reads `served_at_tier` (not `items.difficulty`) so fallback-served items affect the walk based on what the user actually experienced. Per SPEC §9.1 the 0.8×/1.2× zone widths match PRD §4.2's "comfortably under" / "well above" framing.

**Dependencies.** None within Phase 5; the existing `mastery_state` + `attempts` schema and the `getNextUniformBand` shape carry forward.

**Rough commit count.** 3-4.

**Recommended sequencing position.** Sub-phase 2. Independent of sub-phase 1; runs in parallel if useful, but the carving lists it as 2 because sub-phase 5 (dojo belt indicator) depends on adaptive walking to visualize the walk in real time.

**Cross-cutting concerns.** SPEC §9.1 + §9.2 reconciliation (the SPEC's `drill → adaptive` table row already matches the implementation that this sub-phase ships; the existing `Phase 5 changes the drill → uniform_band line to drill → adaptive` comment in `selection.ts:101-113` becomes the marker that lifts). No schema changes. Drill-mode smoke (`scripts/_sp3-audit.ts`-equivalent) needs re-run against the walker shape. Server-side; no UI surface; Alpha Style not applicable.

## 5. Sub-phase 3 — Full-length test (no strategy gate)

**Title.** Full-length test (PRD §4.5; v1 cuts the 30-second strategy-review gate per §1).

**Scope.** Build `/full-length/run` route (server component initiating `startSession({ type: "full_length" })`), `src/config/full-length-mix.ts` with the 50-item cross-sub-type-interleaved difficulty curve (or sibling structure to `diagnostic-mix.ts` — naming/location decision deferred to sub-phase plan), 15-minute session timer (`sessionDurationMs: 900_000`), real-bank-first selection with generated-fallback (per PRD §4.5 "pulls from the real-items bank when possible"). After a full-length submit, the user lands on the post-session review surface (sub-phase 1) — same render as drill post-session, no full-length-specific gate. The `dismissPostSession` server action that PRD §6.5 + SPEC §7.5 + SPEC §10.3 originally tied to `<StrategyReviewGate>` is not built in v1 (the gate is cut).

**Dependencies.** Sub-phase 1 (post-session review surface — full-length lands on the same review surface as drill).

**Rough commit count.** 3-4.

**Recommended sequencing position.** Sub-phase 3.

**Cross-cutting concerns.** No schema migration in v1 (the `strategy_views` table that the cut gate would have written stays on-disk as cut-from-v1 vestigial; see §1). New `src/config/full-length-mix.ts` (or sibling). SPEC §10.3 (full-length walkthrough) update — describe the v1-scope path that lands on the post-session surface without the gate. The full-length configure page is Alpha-Style-styled per §10; the in-session focus shell is the standard focus-shell exclusion.

## 6. Sub-phase 4 — Click-to-highlight in post-session review

**Title.** Click-to-highlight in post-session explanation review (PRD §6.5 extension).

**Scope.** Render `metadata_json.structuredExplanation`'s parts as clickable elements in the wrong-items browser (built by sub-phase 1). Two interaction modes per the roadmap §3 spec: clicking the `elimination` part strikes through the option ids it referenced via `referencedOptions`; clicking the `tie-breaker` part highlights the option ids it referenced. The `recognition` part typically has empty `referencedOptions` — clicking renders no state change (or shows a small tooltip). State is per-part toggle (clicking again clears the highlight/strike); state is local to the component, not persisted.

**Dependencies.** Sub-phase 1 (the wrong-items browser is the host surface). Phase 2's structured-explanation contract is already shipped on `main` so the data path is intact.

**Rough commit count.** 3-4.

**Recommended sequencing position.** Sub-phase 4. Depends on sub-phase 1; fits naturally after sub-phase 3 because the surface sub-phase 3 extends (full-length post-session) inherits the click-to-highlight behavior automatically.

**Cross-cutting concerns.** New `<StructuredExplanation>` component that consumes the existing `metadata_json.structuredExplanation` shape. SPEC §6.5 + §3.3.3 reference. No schema changes. PRD update flagged in roadmap (§3 click-to-highlight) lands in this sub-phase's opening commit. The `<StructuredExplanation>` component renders inside sub-phase 1's wrong-items browser and inherits Alpha Style from that surface per §10; no separate Alpha Style work in this sub-phase.

## 7. Sub-phase 5 — Dojo mode UI rename + belt indicator

**Title.** Dojo mode UI rename + belt indicator on post-session summary (roadmap #7; v1 cuts the NarrowingRamp half of the original sub-phase 7 per §1).

**Scope.** Rename "drill" copy to "dojo" wherever user-facing (not in code-internal session-type values), add `<BeltIndicator>` component that visualizes the adaptive walker's current tier as a martial-arts belt color (white → yellow → green → blue → brown → black mapped to easy / medium / hard / brutal — exact mapping decision deferred to sub-phase plan), and update the post-session summary copy from generic accuracy stats to "you reached [tier] on [sub-type]" framing. The belt indicator lives only on the post-session summary; the mid-session focus-shell chrome row does NOT carry the belt indicator (the focus-shell exclusion from §10).

**Dependencies.** Sub-phase 2 (adaptive walker — belt indicator visualizes the walk; without the walker the belt is static and misleading). Sub-phase 1 (post-session summary is where the belt indicator renders).

**Rough commit count.** 3-4.

**Recommended sequencing position.** Sub-phase 5. Depends on sub-phases 1 + 2; ships last because it's the largest UX shift and benefits from the rest of Phase 5 being stable first.

**Cross-cutting concerns.** No schema changes (the belt indicator reads adaptive-walker output from sub-phase 2; "you reached [tier]" copy reads the same data the adaptive walker tracks). New `<BeltIndicator>` component on the post-session summary. SPEC §10.2 (drill walkthrough) updates for the dojo-rename copy. PRD update flagged in roadmap (§7 dojo mode rename + belt indicator) lands in this sub-phase's opening commit. `<BeltIndicator>` lives on the post-session summary only and inherits the post-session surface's Alpha Style per §10; the mid-session focus shell does NOT carry the belt indicator unless this sub-phase's plan rationales otherwise at plan-time.

## 8. Sequencing recommendation

Sub-phase order: **1 → 2 → 3 → 4 → 5** as carved above. The critical-path reasoning:

- **1 first** (post-session review surface): two downstream sub-phases (3 full-length, 4 click-to-highlight) build on it. Sub-phase 5 (dojo belt indicator) also renders on the post-session summary so depends transitively. Shipping it first unblocks the most parallelism.
- **2 second** (adaptive walker): sub-phase 5 (dojo belt indicator) depends on it. Independent of 1, but landing 1 first lets the adaptive walker's verification check the post-session per-sub-type-latency aggregation as the in-session walker's external observable.
- **3 third** (full-length test, no gate): consumer of 1's review surface. Higher user value than the remaining sub-phases per PRD §1's full-length-test framing.
- **4 fourth** (click-to-highlight): UX polish on top of 1's surface, inherited automatically by 3's full-length post-session.
- **5 fifth** (dojo UI rename + belt indicator): largest UX shift; benefits from the rest of Phase 5 being stable.

Sub-phases 1+2 can run in parallel if a second contributor lands; the carving assumes serial-from-`main` for one contributor.

**Sub-phase 1 entry point: post-session review surface.** Recommended over full-length tests as the entry point because (a) full-length depends on it (the review surface is the destination after a full-length submit), (b) the review surface unblocks more downstream sub-phases, (c) it has no Phase 5 dependencies, (d) it's the smallest "load-bearing for downstream" sub-phase in the round. Full-length first would require building a partial post-session surface inside sub-phase 3 that sub-phase 1 then reworks — clear duplication.

## 9. Cross-cutting concerns

Concerns that span multiple sub-phases and benefit from being acknowledged at master-plan time so per-sub-phase plans don't re-derive them:

**Post-session review surface as foundation.** Sub-phase 1's deliverable — a per-session review at `/post-session/[sessionId]` — is the surface sub-phases 3 (full-length lands on it), 4 (click-to-highlight extends it), and 5 (belt indicator renders on it) all build on. Naming and prop shape decisions in sub-phase 1 ripple. The sub-phase 1 plan should call this out and design its prop boundary explicitly.

**Adaptive walker as foundation.** Sub-phase 2's deliverable — `nextDifficultyTier` and the `selectionStrategyForSession("drill", _) === "adaptive"` flip — is what sub-phase 5 reads. The dojo belt indicator visualizes the walk. Sub-phase 2's verification surface (probably a smoke that drives a drill, asserts tier transitions on accuracy/latency thresholds) is what sub-phase 5 inherits.

**Schema migrations.** None expected for v1. The cut-from-v1 schema files (`review_queue`, `strategy_views`) stay on disk; the cut-from-v1 columns (`practice_sessions.narrowing_ramp_completed`, `if_then_plan`, `users.timer_prefs_json`) stay populated with default values. Sub-phase 5's belt indicator reads adaptive-walker output, not a stored column. If a sub-phase plan determines a v1-scope schema addition is needed, that lands at sub-phase opening atomically with the code that consumes it.

**SPEC sections to update at sub-phase close.** Sub-phase 1: §6.5, §10.x walkthroughs. Sub-phase 2: §9.1 + §9.2. Sub-phase 3: §10.3 (full-length walkthrough — describe the v1 no-gate path). Sub-phase 4: §6.5 click-to-highlight. Sub-phase 5: §10.2 drill walkthrough (dojo rename) + §6.5 belt indicator on post-session summary. Each sub-phase's close-out commit handles its SPEC delta; no global SPEC pass at round end.

**PRD updates.** Two sub-phases carry PRD-update commits at their opening (per the roadmap's PRD-update queue): sub-phase 4 (click-to-highlight; PRD §6.5 extension) and sub-phase 5 (dojo rename + belt indicator; PRD §4.2 extension). Sub-phases 1, 2, 3 build per existing PRD specs and don't need PRD updates; sub-phase 3's full-length test is PRD §4.5 minus the gate (the gate cut is documented at PRD §6.5 in this round's commit 5, not at sub-phase 3 opening).

**Verification protocol carry-forward.** The `playwright-core` discipline + real-DB harness pattern + smoke-script directory pattern + the SPEC §6.14 implementation notes (especially .14 uniform-response-code, .15 hermetic-smoke isolation, .16 auth-shape audit) all carry forward unchanged. Each sub-phase's verification follows the precedent.

**Alpha Style as the design system for non-focus-shell UI.** Phase 5 adopts Alpha Style for every net-new (and several already-shipped) non-focus-shell surfaces. The boundary is load-bearing — the focus shell's visual language is preserved as-is — and the round-opening setup hook lives in sub-phase 1's first commit. See §10 for the full boundary, the focus-shell-exclusion rationale, and the per-sub-phase setup posture.

## 10. Alpha Style as the design system for non-focus-shell UI

**What Alpha Style is.** Alpha Style is a design system from the Superstarter repo (`PSkinnerTech/alpha-style`), based on `pbakaus/impeccable` and Anthropic's frontend-design skill, tuned to Alpha's brand language: light-first, editorial, polished, confident, premium, trust-first UX, with blue and indigo accents used deliberately rather than everywhere. It installs via `npx skills add PSkinnerTech/alpha-style` or via Claude Code's `/plugin marketplace add PSkinnerTech/alpha-style`. The setup command is `teach-alpha-style`, which gathers Alpha-specific product context and persists it for subsequent passes. Operational commands include `audit`, `critique`, `normalize`, `polish`, `typeset`, `arrange`, `colorize`, `animate`, `overdrive`.

**Boundary — what gets Alpha Style.** Every non-focus-shell UI surface Phase 5 v1 builds or touches: the post-session review surface and all its components from sub-phase 1 (`<WrongItemsBrowser>`, `<AccuracySummary>`, `<LatencySummary>`, `<StrategySurface>`); the full-length configure page (sub-phase 3); the click-to-highlight `<StructuredExplanation>` rendering on the wrong-items browser (sub-phase 4; inherits from sub-phase 1's surface); the dojo-mode rename + `<BeltIndicator>` on the post-session summary (sub-phase 5); plus the already-shipped Mastery Map, drill configure page, header chrome, sign-out, navigation, auth screens, error screens, and empty states. These surfaces collectively constitute the "outside the active session" UX where editorial polish and trust signals are load-bearing for adoption.

**Boundary — what is excluded.** The `<FocusShell>` and all its children — the chrome row with three bars, `<ItemSlot>`, `<TriagePrompt>`, `<InterQuestionCard>`, audio-tied animations — are explicitly out of Alpha Style's scope. The belt indicator lives only on the post-session summary; the mid-session focus-shell chrome row does NOT carry the belt indicator unless sub-phase 5's plan rationales otherwise at plan-time. Any in-question rendering — item prompts, options, immediate post-submit feedback — is excluded for the same reason as the focus shell. The exclusion is permanent for v1, not a deferred decision.

**Rationale for the focus-shell exclusion.** The focus shell's visual language was tuned through 8+ commits in the post-overhaul-fixes round (see `docs/plans/focus-shell-post-overhaul-fixes.md`). The dual-bar per-question timer, the chrome row layout, the blue-to-red color flip at half-target, the hybrid synth-tick + sampled-loop audio model, and the pace-keyed coloring on the question progression bar are all load-bearing for the 18-second triage discipline that is the product's core differentiation per the BrainLift insight (PRD §1, §6.1). Generic design-system normalization would muddle this — Alpha Style's editorial-polished aesthetic is the right register for "you're choosing what to study" surfaces but the wrong register for "you're under 18-second pressure deciding to triage" surfaces. Two different jobs, two different visual languages, one shared user.

**Setup posture.** `teach-alpha-style` runs as a one-time setup command in sub-phase 1's opening commit. Sub-phase 1 is the first net-new UI surface Phase 5 v1 builds (the post-session review surface), so threading the setup there means subsequent sub-phases inherit the Alpha-style context without per-sub-phase setup work. No standalone sub-phase 0 is needed for this. Each subsequent sub-phase calls Alpha Style's operational commands (`audit` to check existing surfaces, `normalize` to align new surfaces, `polish` to finish before commit) at the appropriate point inside its own implementation, per the per-sub-phase plan that sub-phase opens with.

## 11. Out of scope

Explicit list — items deliberately NOT addressed in Phase 5 v1:

- **The five v1-cut surfaces** (spaced-repetition queue + review session, strategy-review gate, speed-ramp + brutal drill modes, question-timer + session-timer toggles, NarrowingRamp). Their existing schema files / columns / server actions / reducer state stay on `main`; SPEC marks them cut-from-v1. Code-surface cleanup is a separate follow-up round.
- **Phase 4 (LLM generation pipeline).** Its own phase; planned at its own start. Roadmap Round D.
- **Test-day simulation (PRD §4.6).** Phase 6 per `docs/architecture_plan.md` build-sequencing.
- **Admin question portal (#2), stats dashboard (#6), test history (#10), independent timer (#8), CCAT lessons (#9), vocab study guide (#11).** Post-Phase-5 rounds; each has its own roadmap entry.
- **Round Bx (deploy-and-dogfood interlude).** Deferred per Leo's no-deploy-until-feature-complete decision (see §1). Roadmap amendment lands in this round's commit 2.
- **PRD edits beyond the v1-cuts pass.** Per the existing PRD-update-queue convention, sub-phase-specific PRD updates are per-sub-phase commits at sub-phase start. Sub-phase 4 (click-to-highlight) and sub-phase 5 (dojo) carry their own PRD updates at opening; no other PRD edits in this master plan.
- **Per-sub-phase implementation detail.** Each sub-phase's plan is drafted at its own opening, audit-first, against then-current `main` state.

## 12. Open questions / resolutions

Open questions / resolutions captured during master-plan drafting. As of 2026-05-04, all four open questions (§12.1 / §12.2 / §12.3 / §12.4) are resolved. Sub-phase 1 can start.

### 12.1 A4 (pre-session readiness check) status

**Question.** A4 was CUT in commit `064a386` on 2026-05-04 with the sub-phase-2-close demotion ("adds friction; defer until evidence users want it") affirmed as durable. An earlier feature-list paste re-included A4 with the metacognitive framing.

**Resolution.** A4 stays cut per Leo's 2026-05-04 instruction. The cut from commit `064a386` stands as durable. No action required; sub-phase plans for Phase 5 proceed without A4 in scope.

### 12.2 Sub-phase 1 entry point

**Question.** Should Phase 5 open with sub-phase 1 (post-session review surface) or sub-phase 3 (full-length tests)?

**Resolution.** Sub-phase 1 = post-session review surface confirmed 2026-05-04. Rationale per §8 carries forward; reasonable people could prefer "ship the highest-user-value feature first" but the duplication cost makes the foundation-first call right.

### 12.3 Round Bx amendment

**Question.** The roadmap's Round Bx (deploy-and-dogfood interlude) is currently named as the next move and described as "gates Phase 5 planning detail." This master plan explicitly skips Round Bx per Leo's no-deploy-until-feature-complete decision. The roadmap needs a one-line amendment.

**Resolution.** Deferral language confirmed 2026-05-04 per Leo's instruction. Round Bx flips to "deferred until Phase 5 + post-Phase-5 rounds complete" as part of this round's commit 2 (feature-roadmap edit), not a separate follow-up.

### 12.4 Alpha Style boundary edge case — resolved, flagged for sub-phase override

**Status: resolved-but-flagged, NOT open.** With NarrowingRamp cut from v1, only one Alpha Style edge case remains; capturing it here so a sub-phase plan that wants to deviate has to argue against the pin rather than picking up an undefined boundary.

**Edge case: belt-indicator placement.** §10 pins the belt indicator to the post-session summary only; the mid-session focus-shell chrome row does NOT carry the belt indicator. Rationale: the focus-shell exclusion treats the chrome row as load-bearing for triage discipline and excludes generic-design-system additions. A belt indicator mid-session would (a) introduce a non-pace visual element into a chrome row whose every element is already pace-keyed, and (b) potentially distract from the 18-second triage prompt the chrome row is built around. Sub-phase 5's plan can override this pin if it has a rationale that addresses both concerns.

**No action required from Leo.** The edge case is resolved by the §10 pin; it is not an open question. It is flagged here so that sub-phase 5's plan starts from the pinned position rather than from "what should we do here?"
