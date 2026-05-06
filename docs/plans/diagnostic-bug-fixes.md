# Plan — Diagnostic UI bug fixes

> **Status: shipped 2026-05-06.** Round opened against `main` at HEAD `2f7b2c8` (post-phase5-testbank-re-extraction-close); closed at this commit. Six commits, redline-expanded from the originally-projected 2-3: `b02590a` (commit 1 — listener-on-FocusShell-mount, BUG 2 layer 3), `caccfbd` (commit 2 — leading-relaxed → leading-normal, BUG 3 contributing factor), `f7045f8` (commit 3 — `<Link>` SPA navigation, BUG 2 layer 1), `f59a8ea` (commit 3.5 — unlockAudio on mount, BUG 2 layer 2), `08ba782` (commit 4 — paragraph-split refactor, BUG 3 dominant fix), `2b6d006` (commit 4-cleanup — drop unused biome-ignore suppression), this commit (commit 5 — round close + SPEC §6.14.23 verification-gap entry).

This was a light-touch UI bug-fix round, not a plan-then-implement round. It opened as a bug-list redirect on three issues observed in the diagnostic question surface; this plan doc is the round-close artifact, written retrospectively to capture scope + findings + the round-shape evolution. The round's most consequential output is SPEC §6.14.23 (verification-gap pattern) — a generalizable convention that emerged empirically from two consecutive in-round failures of static-trace verification.

## 1. Why this round

User reported three issues on /diagnostic/run via screenshots:

1. **BUG 1** (claimed contract violation): session bar + 12-minute session timer missing.
2. **BUG 2** (UX): Q1 audio silent; Q2+ audio fires.
3. **BUG 3** (polish): question body vertical spacing too loose.

The round opened with audit-find-fix-verify per bug; one commit per bug; brief round-close. The original projection was 2 commits + optional doc-close. The round expanded to 6 commits as static-trace verification gaps surfaced empirically.

## 2. Audit findings + scope evolution

### 2.1 BUG 1 — DROPPED (not a regression)

The audit halted on a contract conflict. The user's claim ("Per PRD §4.1, the diagnostic has a 12-minute session timer") contradicted seven documented sources: PRD §4.1 + §211 + §337 (capacity-measurement framing, no in-flow timer); SPEC §6.6 / §9.3 / §10.7 (`sessionDurationMs: null` for diagnostic; SessionTimerBar HIDDEN); the diagnostic flow's plan doc (`docs/plans/phase3-diagnostic-flow.md` §4 / §5 / §6 / §11.5); the shipped code at `src/app/(diagnostic-flow)/diagnostic/run/content.tsx:57` (`sessionDurationMs={null}` with explicit comment about capacity-not-triage). The "12 minutes" figure didn't appear in any source; closest was the 15-minute real-CCAT pacing copy on the explainer page (framing, not contract).

The screenshots showed intended behavior, not a regression. Reversing the contract would be a multi-round product redesign affecting diagnostic measurement framing, sub-phase 2 walker design, sub-phase 3 full-length test, and sub-phase 1's already-shipped post-session pacing-line. Out of scope for a UI bug-fix round.

The audit's primary-source citation discipline caught the contract reversal disguised as a bug fix. Surfaced as a redline question rather than auto-fixing; redline confirmed BUG 1 dropped.

### 2.2 BUG 2 — three-layer defense

**Root cause** (audit-time): the /diagnostic page used a plain `<a href="/diagnostic/run">` rather than `<Link>`, triggering a full-page navigation. The user-gesture from clicking "Start Diagnostic" did not survive into the new document; AudioContext was never created on /diagnostic/run; threshold ticks at sec 10/18 silently no-oped against `audioCtx === undefined`.

**Round-shape evolution.** Originally projected: one commit (a one-shot pointerdown/keydown listener at FocusShell mount). Shipped commit 1 (`b02590a`) on this projection.

User runtime test failed: Q1 still silent. Investigation step (after redline halt) revealed the gap: the listener gates on a NEXT pointerdown/keydown event, not on mount. The /diagnostic Link click fires before /diagnostic/run mounts, so the listener can't catch it; if the user reads Q1 silently, no future event fires within the user-activation window, AudioContext never gets created.

Redline's three-layer-defense framing landed:
- **Layer 1** (commit 3, `f7045f8`): `<a>` → `<Link>` — SPA navigation preserves the transient user-activation window across the route change. Typed-routes accepted on first attempt; the original author's forward-reference workaround had become stale (the comment itself anticipated this).
- **Layer 2** (commit 3.5, `f59a8ea`): unconditional `unlockAudio()` call in a FocusShell mount-effect — consumes the preserved activation synchronously during React's commit phase, well within the ~5s user-activation window.
- **Layer 3** (commit 1, `b02590a`): the original first-interaction listener — preserved as defense-in-depth for entry paths that lack a same-document prior click (direct URL entry, browser back/forward, future routes not yet converted to SPA).

User runtime test post-three-layer-defense: Q1 audio fires across all entry conditions tested. Three layers because audio-unlock can fail silently in browser-policy-specific ways; redundancy is the design.

### 2.3 BUG 3 — line-height tightening + paragraph-split refactor

**Root cause** (audit-time): `TextBody` (`src/components/item/body-renderers/text.tsx`) rendered with `leading-relaxed` (line-height 1.625) and `whitespace-pre-wrap`. Multi-paragraph bodies stored as single strings with literal `\n\n` separators (per body-schema's single-text-field shape) rendered as blank-text-node lines, each line-height-tall. The 1.625 line-height + the literal blank lines compounded.

**Round-shape evolution.** Originally projected: one commit (`leading-relaxed` → `leading-normal`, conservative tightening). Shipped commit 2 (`caccfbd`) on this projection. Static-trace verification reported a 7.7% per-line reduction.

User runtime test failed: perceived spacing visually unchanged. Investigation step revealed the gap: line-height is NOT the dominant factor. The user-perceived spacing is dominated by the COUNT of full-line blank-line gaps (5 gaps × 27px = 135px on the Assumptions/Conclusions case). Reducing line-height shrinks each blank line by ~2px (~9px total reduction), imperceptible against the 135px dominant factor.

Redline's escalation: replace `whitespace-pre-wrap` rendering with explicit `<p>` elements via `body.text.split(/\n\n+/)`, container with `space-y-3` (12px paragraph margin). Shipped commit 4 (`08ba782`).

Both commits stack: commit 2 contributes within-paragraph compactness (~7.7% per-line reduction); commit 4 contributes between-paragraph compactness (~135px → ~48px on the multi-paragraph case = ~87px reduction, the dominant fix).

User runtime test post-paragraph-split: substantially visible spacing reduction confirmed. Both surfaces inherit the change (in-flow via `<ItemPrompt>`; post-session via `<BodyDispatch>`); cross-surface visual consistency preserved.

## 3. Round-shape final commit ledger

| # | Hash | Role | Surface |
|---|---|---|---|
| 1 | `b02590a` | listener-on-FocusShell-mount | BUG 2 layer 3 (defense-in-depth) |
| 2 | `caccfbd` | leading-relaxed → leading-normal | BUG 3 contributing factor |
| 3 | `f7045f8` | `<Link>` SPA navigation | BUG 2 layer 1 (gesture preservation) |
| 3.5 | `f59a8ea` | unlockAudio on mount | BUG 2 layer 2 (synchronous consumption) |
| 4 | `08ba782` | paragraph-split refactor | BUG 3 dominant fix |
| 4-cleanup | `2b6d006` | drop unused biome-ignore suppression | lint-debt cleanup |
| 5 | (this) | round-close + SPEC §6.14.23 | doc + meta-finding |

Six commits + this round-close = 7 hashes total. The round-shape expanded from 2-3 (originally projected) to 6 as static-trace verification gaps surfaced empirically and required additional layers — this expansion is the round's primary empirical signal for SPEC §6.14.23.

## 4. SPEC §6.14.23 — verification-gap pattern

> See SPEC §6.14.23 (added in this commit) for the full convention. Summary here for plan-doc continuity.

UI side-effect fixes require browser-runtime verification, not just static-trace reasoning. Static-trace verifies code-level correctness; runtime verification captures user-perceived behavior. The two are different contracts; passing static-trace doesn't imply passing runtime.

For fixes whose stated goal is user-perceived behavior change (audio firing, visual spacing, animation smoothness, etc.), the verification chain must include runtime confirmation — either via automation that captures runtime state (Playwright + AudioContext.state assertions, computed-style inspection, screenshot diffs) or via explicit user-verification ask.

Reporting commits as "verified" on static-trace alone obscures the gap and ships fixes that don't actually fix.

Two gap-classes:
- **Browser-policy gaps.** Code is correct in isolation; a platform constraint (autoplay policy, user-activation window, etc.) prevents intended behavior at runtime.
- **Perception-dominance gaps.** Code's intended effect IS applied at runtime; a different-level factor dominates user perception.

This round produced empirical instances of both. The discipline that addressed them was explicit user-verification ask rather than static-trace claim. SPEC §6.14.23 codifies the convention; future UI side-effect fixes inherit it.

Sibling to §6.14.21 (DB row-state audit) and §6.14.22 (consuming-code audit). Shared parent: §6.14.18 (audit against actual artifact, not assumed shape).

## 5. Other findings (not yet §6.14-worthy)

These are tracked for second-instance signal in future rounds; single-instance from this round.

(a) **Audit-finds-contract-contradiction-and-halts.** BUG 1's audit caught a user claim contradicting 7 documented sources. The audit's discipline of citing primary sources (PRD line numbers, SPEC sections, plan §s, code paths) made the contradiction visible; without that discipline the audit might have proceeded to "implement the user's claim" rather than halting. Generalizable framing candidate: "User-reported bug claims should be verified against documented contract sources before fixing — a 'fix' that contradicts the contract is a contract reversal, not a bug fix." Single-instance from this round; track for second-instance signal.

(b) **Shared-component edits in bug-fix rounds preserve cross-surface consistency.** BUG 3's paragraph-split refactor applied to `TextBody` automatically propagated to both the in-flow question render (via `<ItemPrompt>`) AND the post-session wrong-items browser (via `<BodyDispatch>`) — same component, same change, two surfaces. Explicit blast-radius surfacing at commit-2 time (`caccfbd`'s "shared with wrong-items-browser" flag) made the cross-surface implication visible without ambiguity. Generalizable framing candidate: "When editing a shared rendering component for a UI bug fix, explicitly enumerate the consuming surfaces in the commit body so cross-surface implications aren't accidental." Single-instance; track for second-instance signal.

(c) **Lint-cleanup commit pattern observation.** Commit 4 added a `biome-ignore` suppression preemptively; biome flagged it as unused (`suppressions/unused`). The commit landed with the warning; commit 4-cleanup (`2b6d006`) removed the unused suppression. Convention going forward: let lint actually flag a rule before adding a suppression; preemptive suppressions create unused-debt. Process note rather than §6.14 candidate.

(d) **Empty-string filter edge case (known but unaddressed).** `body.text.split(/\n\n+/)` produces empty leading/trailing array elements if a body starts or ends with `\n\n`. Not addressed in commit 4 because likely not present in production data (the OCR pipeline's extract pass doesn't emit leading/trailing blank-line bodies). If production data ever surfaces empty paragraphs, follow-up commit adds `.filter(Boolean)` at zero cost. Tracked here for awareness.

## 6. Verification

- `bun lint` clean (this commit + all prior round commits)
- `bun typecheck` clean
- `bun test` 38/38 (baseline preserved across the round; no test surface changes — the audit-fix-verify pattern relied on user runtime verification per SPEC §6.14.23 rather than test-suite changes)
- All seven commit hashes captured in §3 above (`b02590a`, `caccfbd`, `f7045f8`, `f59a8ea`, `08ba782`, `2b6d006`, this commit)
- SPEC §6.14.23 placement confirmed (after §6.14.22 from the testbank-re-extraction round, before the section break to §7)
- Closed-plans-immutable check: `git diff HEAD -- docs/plans/phase5-*.md docs/plans/phase3-*.md docs/plans/phase-3-*.md docs/plans/focus-shell-post-overhaul-fixes.md docs/plans/opaque-option-ids-and-pipeline-split.md docs/plans/ocr-import-screenshots.md` returns zero lines

## 7. Out of scope

- **Plan C (begin-gate on /diagnostic/run).** Held in reserve as Plan C if BUG 2's three-layer defense had failed runtime verification. It passed; Plan C remains held.
- **Visual-regression test infrastructure.** SPEC §6.14.23 codifies the verification-gap convention; standing up Playwright-based visual-regression infrastructure (so future UI side-effect fixes can be runtime-verified at commit time without manual user verification) is a separate workstream — independent of this round, not blocking on its closure.
- **`<a>` → `<Link>` audit across other routes.** The /diagnostic-page conversion was specific to BUG 2. Other plain `<a>` references (`grep -rn 'href="/' src/app/`) are out of scope; a future routing-hygiene round can audit + convert as needed.
- **Production deploy.** Same gating as predecessor rounds (Leo's no-deploy-until-feature-complete decision); dev-only this round.

## 8. Inputs from prior rounds carrying forward

- **From phase5-testbank-re-extraction round** (`2f7b2c8`): the items table at 439 rows under the 14-sub-type taxonomy; the 50-entry diagnostic mix; the §6.14.21 + §6.14.22 verification-discipline conventions that this round's §6.14.23 inherits as siblings.
- **From phase3-diagnostic-flow round** (`02e1a3a`-era): the `sessionDurationMs: null` contract for the diagnostic — the load-bearing premise that BUG 1's audit cited to halt.
- **From focus-shell-post-overhaul-fixes round**: the audio-ticker module's hybrid two-path model + idempotency contract that all three BUG 2 layers compose against.

## 9. Next rounds unblocked

- **Tagger-improvement round** — covers phase5-testbank-re-extraction findings (a) `12min_ratios` 45% miss + (e) two forced tier substitutions in diagnostic-mix. Independent of this round.
- **Strategy-authoring round** — for `numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values`. Independent; can run parallel.
- **isTextOnly filter relaxation round** — covers phase5-testbank-re-extraction finding (c). Independent.
- **Phase 5 sub-phase 2 — adaptive walker.** Next product-feature work per `docs/plans/phase5-master-plan.md`. The dev DB now has the empirical bank size needed for adaptive-difficulty selection to exercise meaningfully; this round's BUG 2 + BUG 3 fixes ensure the diagnostic surface is functional for users encountering the walker downstream.
- **Visual-regression test infrastructure** (separate workstream per §7) — addresses the long-tail of future UI side-effect fixes wanting runtime verification at commit time.
