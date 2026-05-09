# Plan — Post-Session Audit Fixes + Wide Token Retrofit (Round 2)

> **Status: planning (commit 0 — plan-doc creation + §0 audit findings).** Body sections (§1 scope fence, §2 captured-from-redline anchors, §5 commit ledger, §6 verification, §7 resolutions, §8 round-close residuals) are intentionally deferred until Leo redirects post-§0. Per the round-opening redline's stop-and-report contract: *"Do NOT proceed to commit 1. Wait for redirect."*
>
> **Round opened against `main` at HEAD `ebb8489`** (Round 1 round-close commit; post-amend hash on linear history). Cross-doc reference value `6122366` carried by Round 1 `§5.13` and the audit doc's frontmatter is the *pre-amend* round-close hash — orphan-trending in git's object DB but NOT an ancestor of HEAD; both hashes are kept verbatim in their respective frozen artifacts per SPEC §6.14.20 (closed-plans-immutable). Round 2's empirical anchor is `ebb8489`; cross-doc citations honor `6122366`.
>
> **Round 1 close-time:** 2026-05-09. **Round 2 commit-0 (this plan-doc):** 2026-05-09 (same-day open).
>
> **Inputs feeding this plan-doc**:
> - Round 1 plan-doc (closed): `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md`.
> - Audit doc (Round 1 commit 12, frozen): `docs/audits/post-session-review-surface-alpha-design.md` — 18 findings (0 P0 / 2 P1 / 7 P2 / 9 P3) + 2 POSITIVE callouts.
> - SPEC §6.14.40 (redirector-vs-empirical-state) + §6.14.41 (audit-vs-revert blindness) — Round 1 round-close promotions; Round 2 inherits as discipline anchors.
> - Leo's 2026-05-09 redirect: three additions on top of the audit's §C rollup (wide-scope retrofit, belt-logo unification, combined accuracy+latency table).

---

## §0 — Commit-0 audit findings

Eight audit steps per the round-opening redline. Each finding ends with a positional conclusion (one-line scope flag, schema-vs-empirical classification, or open question for Leo). All file paths are anchored to the repo root.

### §0.1 Round 1 close-hash capture (audit step #1)

**Round 1 plan-doc status pin** at `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md:1` reads `"Status: shipped 2026-05-09."` The §5.13 round-close entry self-pins the round-close commit at `6122366` (pre-amend), with the prose explicitly noting *"the amend operation that backfills this very value into the §5.13 entry recomputes the commit hash, so this value is the round-close commit's pre-amend ancestor — the canonical 'round-close artifact excluding its own self-reference backfill' hash."*

**Empirical git state.** `git log --oneline -25` (audit-time) shows:

```
98b54e5  docs(logs): add session logs for Round 1 close, dashboard belt fixes, and sorting features
ebb8489  docs(plan): close round 1 (dashboard-drill-diagnostic bug-fix + design-retrofit)
699d5f9  docs(audit): post-session review surface ALPHA_DESIGN audit (Round 2 prep)
81fcea5  docs(plan): retract §5.11 + fix stale focus-shell comment
8bae610  style(drill): reduce focus-shell top whitespace
4f67590  fix(drill): warning-once + post-target ticks (Path C, SPEC §6.12 amendment)
[...]
```

`git merge-base --is-ancestor 6122366 HEAD` returns false; `--is-ancestor ebb8489 HEAD` returns true. The pre-amend `6122366` object is still in git's object DB (cat-file resolves) but is not on any branch's linear history — it is the orphan ancestor of the post-amend round-close commit.

**Conclusion.** Round 2's empirical round-open anchor is **`ebb8489`** (linear-history round-close on `main`). The cross-doc reference value `6122366` (Round 1 §5.13 + audit-doc frontmatter) is preserved verbatim in those frozen artifacts per SPEC §6.14.20; Round 2's plan-doc cites both forms with their distinct meanings. Recording this dual-hash framing here so that future audits + reviews understand the Round-1-self-reference-paradox without re-deriving it.

### §0.2 Audit doc cross-reference (audit step #2)

**Audit doc path verified.** `docs/audits/post-session-review-surface-alpha-design.md` exists; 527 lines; structure per `git ls-tree HEAD docs/audits/`. Frontmatter lines 1-8 declare:

| Field | Value | Audit-time verification |
|---|---|---|
| Round-close hash | `6122366` | Pre-amend orphan; not ancestor of `HEAD`; resolves via `git cat-file`. Round 2 cites as cross-doc anchor only. |
| ALPHA_DESIGN.md hash | `28d6260` | `git log --oneline 28d6260 -1` confirms the commit subject `"docs: add comprehensive Alpha Design Guide for product development"`. |
| Audit-time HEAD hash | `81fcea5` | `git log --oneline 81fcea5 -1` confirms `"docs(plan): retract §5.11 + fix stale focus-shell comment"`. Audit was authored at HEAD = `81fcea5` (pre-round-close-commit), which is consistent with the audit being commit 12 of 13 in Round 1's ledger. |

**Conclusion.** All three frontmatter hashes are verifiable git objects. The round-close hash is the single self-reference paradox per §0.1; the other two pin existing linear-history commits. Round 2's plan-doc treats all three as canonical references; no re-derivation required.

### §0.3 Wide scope inventory — bifurcated token landscape (audit step #3) — **scope-flag SF-A**

Walked all authenticated routes + supporting components. Per-surface foundation-token consumption follows.

#### §0.3.a Token landscape is bifurcated (Layer A vs Layer B)

`src/styles/unstyled/globals.css` defines TWO parallel token systems, with explicit comment-block discipline at lines 43-54 marking the architectural decision:

> *"Dashboard tokens (Dashboard PRD §8). Additive layer on top of the existing shadcn neutrals + sub-phase-5 belt tokens. The shadcn neutrals (`--background`, `--foreground`, `--card`, `--border`, `--muted`, `--accent`, `--primary`, etc.) are NOT touched — the dashboard components reference these new `--bg`, `--surface`, `--text-1`, etc. tokens directly, leaving the existing surfaces (post-session shell, mastery map, focus shell, full-length flow) on the shadcn tokens unchanged."*

The two layers:

| Layer | Tokens | Tinting | Hue / chroma |
|---|---|---|---|
| **Layer A — shadcn foundation (the §B.1 retrofit targets)** | `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring` (18 in `:root` lines 8-25) + `--chart-1..5` (5 at lines 103-107) + `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring` (8 at lines 109-116) — **31 color/border tokens total** | **Pure grayscale** (chroma = 0) — confirmed by audit doc §B.1 evidence + globals.css lines 8-25 verbatim | n/a |
| **Layer B — Alpha-tinted product tokens** | `--bg`, `--surface`, `--surface-2`, `--text-1`, `--text-2`, `--text-3`, `--border-soft`, `--border-strong`, `--cobalt`, `--indigo`, `--indigo-deep`, `--alpha-accent`, `--pale`, `--lavender`, `--lavender-line`, `--belt-white`, `--belt-white-line`, `--belt-blue`, `--belt-brown`, `--belt-black`, `--belt-tip-red`, `--pace-on/warn/over`, `--good` (25 color/border tokens) | **Alpha-tinted** (hue 270, chroma 0.005-0.020) | hue 270 |

#### §0.3.b Per-surface token consumers

| Surface / route | Layer A consumed | Layer B consumed |
|---|---|---|
| `/` (dashboard) | `border-border` (single ref via `subtype-sort-selector.tsx`) | `--text-1/2/3`, `--bg`, `--surface`, `--surface-2`, `--cobalt`, `--alpha-accent`, `--belt-*`, `--pace-*`, `--lavender*`, `--good` (extensive across ~10 components in `src/components/dashboard/`) |
| `/drill/[subTypeId]/run` | `text-foreground`, `bg-foreground`, `bg-background`, `border-foreground`, `text-muted-foreground` (via FocusShell + ItemSlot + ItemPrompt + body-renderers + `<EmptyBankPane>`) | none observed |
| `/diagnostic/run` | same as drill (FocusShell shared) + page-level: `bg-primary`, `text-primary-foreground`, `ring-ring`, `text-foreground`, `text-muted-foreground` | none observed |
| `/full-length/run` | same as drill (FocusShell shared) | none observed |
| `/full-length/configure` | `text-muted-foreground` (+ shadcn UI primitives) | none observed |
| `/post-session/[sessionId]` | `text-foreground`, `text-muted-foreground`, `bg-foreground`, `bg-background`, `border-foreground`, `border-input`, `fill-foreground`, `fill-card`, `fill-background`, `ring-foreground`, `ring-ring`, `stroke-foreground`, `text-destructive` | none observed |
| `/login` | `text-muted-foreground` (via shadcn UI primitives) | none observed |
| `/admin/ingest` | `text-destructive`, `text-muted-foreground`, `bg-background`, `border-border`, `border-input` (via shadcn UI primitives) | none observed |
| `/review`, `/lessons`, `/stats` (stub pages) | none | `text-text-1`, `text-text-2`, `text-cobalt` (already on Layer B) |
| `/phase3-smoke` | (consumed via referenced UI primitives) | (consumed via referenced UI primitives) |
| **shadcn UI primitives** (`src/components/ui/*` — 11 files: alert-dialog, badge, button, card, combobox, dropdown-menu, field, input-group, input, select, textarea) | **all foundation tokens** (`bg-primary`, `bg-secondary`, `bg-accent`, `bg-muted`, `bg-card`, `bg-popover`, `bg-destructive`, `bg-input`, `bg-border`, `border-*`, `ring-*`, `text-{accent,card,popover,primary,secondary}-foreground`, `text-foreground`, `text-muted-foreground`, `text-destructive`) | none |

#### §0.3.c Audit-surfaced scope-flag SF-A — bifurcated retrofit semantics

The redline's framing — *"§B.1 retrofit affects ALL authenticated product surfaces, not just post-session"* — assumes a single token system. Empirically the system is bifurcated: the dashboard surface (Round 1's commit 1 + 2 + 4 product) is **already Alpha-tinted via Layer B** and would NOT visually change under a Layer-A-only retrofit. The §B.1 retrofit's actual visually-affected surface is: drill / diagnostic / full-length focus shell, post-session view, login + admin pages (via shadcn UI primitives), and the shadcn UI primitives themselves. Stub pages (/review, /lessons, /stats) and the dashboard inherit no Layer-A foundation chroma so they are visually unaffected.

This is a §6.14.40 (redirector-vs-empirical-state) instance: the redline's "wide scope" framing does NOT match the empirical token-architecture decision recorded in `globals.css` lines 43-54. Three policy options for Leo to disambiguate:

- **Option α (literal redline interpretation; recommended).** Retrofit Layer A only. Add hue-270 chroma 0.005-0.012 tints to `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--accent`, `--accent-foreground`, `--secondary`, `--secondary-foreground`, plus dark-mode counterparts. Layer B unchanged. Visual delta: focus shell + post-session + login + admin + UI primitives shift from pure-gray to faintly-tinted-lavender. Dashboard unchanged. Cost: one CSS file, one commit. **Recommended** because it executes the audit doc's §B.1 fix-shape literally, preserves Round 1's Layer-B work, and keeps blast radius bounded.
- **Option β (consolidation).** Retire Layer A in favor of Layer B everywhere. Migrate every `text-foreground` → `text-text-1`, `bg-background` → `bg-bg`, etc., across drill / diagnostic / focus-shell / post-session / login / admin / ALL shadcn UI primitives. Massive blast radius (50+ files); shadcn primitives ship written against foundation-token names and the Tailwind v4 `@theme` mapping would need re-anchoring. Out of scope for Round 2 per the redline's commit envelope estimate (13-14 commits).
- **Option γ (hybrid: dual-layer codified).** Do Option α + author a SPEC entry codifying the dual-layer architecture (Layer A = "shadcn primitive tokens, Alpha-tinted at chroma 0.005-0.012 to dial down the gray neutrality"; Layer B = "Alpha product tokens, hue 270 at chroma 0.012-0.020 with brand additions"). Light additional commit for the SPEC text; closes the implicit-architecture-decision gap in `globals.css` lines 43-54.

**Resolution proposal.** Default to **Option α** unless Leo redirects toward γ. The Open Q is logged as **§0.10 Q5** below.

**Conclusion.** Round 2's commit 1 audit-step expansion: enumerate each Layer-A consumer + verify post-retrofit AA (the audit doc's `--muted-foreground` ≈ 4.0:1 residual is system-level — confirmed sub-AA at `<OnboardingTargets>` skip-link AND any other `text-muted-foreground` body-text consumer inherits the same gap). Tee-captured screenshot walk per surface before/after.

### §0.4 Combined accuracy+latency table — data-shape probe (audit step #4)

#### §0.4.a Current data shapes

`src/components/post-session/accuracy-summary.tsx` consumes `PerSubTypeAccuracy[]` shaped `{ subTypeId: SubTypeId, correct: number, total: number }` (one row per touched sub-type).

`src/components/post-session/latency-summary.tsx` consumes `PerSubTypeLatency[]` shaped `{ subTypeId: SubTypeId, medianLatencyMs: number }` (one row per touched sub-type).

Both queries (defined inline at `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx:75-101`) are **structurally identical**: same `FROM attempts INNER JOIN items ON attempts.itemId = items.id`, same `WHERE attempts.sessionId = $sessionId`, same `GROUP BY items.subTypeId`. They differ only in the projected aggregates (`COUNT(*) FILTER (WHERE correct)` + `COUNT(*)` vs `percentile_cont(0.5) WITHIN GROUP (ORDER BY latencyMs)`). Each touched sub-type produces both an accuracy row AND a latency row — by construction they always travel together.

#### §0.4.b Merge plan

**Recommended: SQL-level consolidation.** Replace the two prepared statements with one returning `{ subTypeId, correct, total, medianLatencyMs }` per row. Single `GROUP BY items.subTypeId`, single round-trip. Effective net diff at the page layer: -10/+12 lines.

Alternative (rejected): client-side merge via `mergeByKey(accuracy, latency, "subTypeId")`. Adds runtime work, an indirect data shape, and offers no flexibility benefit (the two queries are constitutionally yoked).

#### §0.4.c Component-name proposal

Three candidates, ranked:

1. **`<PerformanceSummary>`** — descriptive; "performance" captures both accuracy + latency cleanly. Fits Alpha §9 ("specific over generic"). **Recommended.**
2. `<PerformanceTable>` — accurate but slightly more generic ("table" is a layout primitive name, not a domain name).
3. `<PerSubTypeBreakdown>` — describes the row axis but loses the "what" (which axis is being broken down?).

Logged as **§0.10 Q1** below.

#### §0.4.d Estimated commit size

| Action | Lines |
|---|---|
| Delete `accuracy-summary.tsx` | -115 |
| Delete `latency-summary.tsx` | -208 |
| Create `performance-summary.tsx` (combined component, retains `LatencyTrack` SVG, single sort, single SUB_TYPE_BY_ID, two-column row renderer) | +220-260 |
| Page-level: combine 2 prepared statements → 1; consolidate `accuracy[]` + `latency[]` data props → single `performance[]` | -8/+10 |
| `<PostSessionShell>` consumer prop changes (`accuracy` + `latency` → `performance`) | -3/+3 |
| Test files (if `accuracy-summary.test.ts` or `latency-summary.test.ts` exist — neither does at audit time) | n/a |
| **Net** | **~-110 to -90 lines (consolidation win)** |

#### §0.4.e Dependency closures resolved by this commit

- §B.3 sub-type sort DRY drift — for `<AccuracySummary>` + `<LatencySummary>` only (the combined component has ONE `compareRows`, ONE `SUB_TYPE_BY_ID`). The §B.3 commit still needs to handle `<StrategySurface>` + `<WrongItemsBrowser>` independently.
- §B.2 empty-state harmonization — for these two components only (the combined component's empty path is governed by ONE decision: render heading + empty-state copy, OR `return null`, but consistently). The §B.2 commit still needs to verify `<StrategySurface>` + `<WrongItemsBrowser>`'s empty-state copy aligns.

**Risk note.** The latency track marker uses `text-destructive` for above-threshold rendering. After the §B.1 Layer-A retrofit (Option α), `--destructive` itself stays AA-grade per the audit doc's §A.3 PASS at line 132 (`"the destructive token is button/border-grade, not body-text-grade"`); the marker is a 5px SVG circle, not body text, so the AA gate is at 3:1 (non-text contrast) which the destructive token already clears. No regression expected. Verification at retrofit time captures empirical contrast post-tint.

### §0.5 `<BeltIndicator>` Option β feasibility (audit step #5)

#### §0.5.a Structural anatomy

`src/components/post-session/belt-indicator.tsx` (188 lines):
- Lines 86-113: `BELT_STYLE_BY_COLOR` — local 4-entry record mapping belt color → `{ bodyClass, stripeClass }` Tailwind classes (uses Layer-A `fill-card`, `fill-foreground`, `fill-foreground/30`, `fill-foreground/40`, `fill-background/40` + Layer-B `fill-belt-blue`, `fill-belt-brown`).
- Lines 121-125: derive `color: BeltColor`, `colorName: string`, `tierName: string`, `style: BeltStyle` from `props.tier`.
- Lines 127-135: calibrating-suffix logic + JSX tag for `(calibrating)` rendering when `props.isPreFloor === true`.
- Lines 137-184: JSX. Outer `<div role="img" aria-label>` wrapper (lines 138-145). **Inline SVG body (lines 146-171)** — viewBox 100×16, two `<rect>` children (belt body + textile-stripe). Visible text label `<p>` (lines 172-182) wired to `colorName`, `subTypeDisplayName`, `calibratingTag`.

`src/components/dashboard/belt-graphic.tsx` (87 lines):
- Self-contained `<svg>` with `viewBox="0 0 100 22"` + `preserveAspectRatio="none"`. Two `<rect>` children (full-width body + tip-rect at `x=74..88`). Uses Layer-B `--belt-{white,blue,brown,black}` + `--belt-tip-red`. Black-belt body uses `--belt-black` (tinted near-black) + tip = `--belt-tip-red` (BJJ canon). White belt has hairline border via `stroke-belt-white-line`.
- Props: `beltColor: BeltLevel`, `className?: string`, `ariaLabel?: string`. Type-compatible with `<BeltIndicator>`'s local `BeltColor` (verified: `BeltLevel = "white" | "blue" | "brown" | "black"` at `src/server/dashboard/types.ts:19` is structurally identical to the local `BeltColor` type in `belt-indicator.tsx:57`).

#### §0.5.b Option β refactor shape (visual unification, calibration label preserved)

Replace lines 146-171 of `belt-indicator.tsx` (the inline `<svg>...<rect>...<rect>...</svg>`) with a single `<BeltGraphic beltColor={color} className="..." ariaLabel="..." />` invocation. Lines 172-182 (the `<p>` text label with `(calibrating)` suffix) stay intact. `BELT_STYLE_BY_COLOR` becomes dead — delete (~18 lines). Add `import { BeltGraphic } from "@/components/dashboard/belt-graphic"`.

Net diff estimate: -50 lines deleted, +5 lines added. Bounded.

#### §0.5.c Cross-cutting concerns

1. **Token-system shift (positive cascade).** Post-session belt currently uses Layer-A `fill-card` (white body) + `fill-foreground` (black body) + `fill-foreground/40` (white stripe) + `fill-background/40` (black stripe). After Option β, all four ranks consume Layer-B `fill-belt-{white,blue,brown,black}` + `fill-belt-tip-red`. This **resolves Round 1 §8 residual #9** automatically (post-session black belt currently `fill-foreground` ≈ pure-grayscale near-black; after refactor it's `fill-belt-black` ≈ tinted near-black, hue 270, matching the dashboard belt). The audit doc's §A.2.f1 + §B.1's `<BeltIndicator>` cross-implication both close.
2. **BJJ-canonical tip-stripe replaces textile-stripe.** Current `<BeltIndicator>` renders a stylized textile-stripe (small `3w × 10h` rect at `x=82, y=3..13`). After Option β it renders the BJJ-canonical full-height tip rect (`x=74..88`) — which is the actual rank-stripe semantic from the discipline. This is the FEATURE INTENT per Leo's redirect (visual unification with the dashboard belt).
3. **viewBox / aspect-ratio.** `<BeltIndicator>` currently uses viewBox 100×16; `<BeltGraphic>` uses viewBox 100×22 with `preserveAspectRatio="none"`. The consumer (post-session belt-indicator div) controls rendered aspect via `className="h-4 w-full max-w-[12rem]"`. The aspect-ratio change is small (16→22 ≈ 1.4× taller per unit width); visual review at commit time decides whether to pass `className="h-5 w-full max-w-[12rem]"` (preserve total visual height) or `h-4` (slimmer) or other.
4. **Calibrating suffix preserved.** Lines 127-135 + the `{calibratingTag}` JSX at line 181 stay unchanged. Option β scope: visual unified, calibration-label logic preserved.
5. **Audit's §A.2.f1 calibrating-suffix transition (P3, deferred).** NOT touched by Option β. Stays out-of-scope per the round-opening fence (P3 polish; future round).
6. **Cross-belt-consumer scope.** The audit step's Open Q4 (other belt-rendering surfaces) — confirmed: only `<BeltStripe>` (dashboard, already on `<BeltGraphic>`) and `<BeltIndicator>` (post-session). No mastery-map / belt-progression surface exists at audit time. Scope is bounded to `<BeltIndicator>` per Leo's redirect default.

**Conclusion.** Option β is **structurally feasible**. Bounded refactor; positive cascade on §B.1 cross-implication; no blockers. Recommended as the round's belt-logo unification approach.

### §0.6 Round 1 residuals disposition (audit step #6)

Round 1 plan-doc §8 enumerates 12 residuals + the §6.14.28 sub-pattern instance ledger. Round 2 disposition per residual:

| # | Round 1 residual | Round 2 disposition |
|---|---|---|
| 1 | Commit 7 partial-fix — drill ranking refresh (`loadAllBelts()` stub) | **Inherited; not closed by Round 2.** Forward-pinned to Belts PRD round. |
| 2 | Commit 4 audit-step (d) blocked — non-white belt visual review | **Inherited; not closed by Round 2.** Same root cause as #1; same forward-pin. |
| 3 | Commit 8 number-series shape coverage (`isSequenceText` heuristic vs sub-phase a's 196 candidates) | **Inherited; not closed by Round 2.** Forward-pinned to post-Belts-PRD or sub-phase b validator round. |
| 4 | Commit 9 SPEC §6.12 amendment scope: light-vs-medium divergence | **Closed in Round 1** (ACCEPT-AS-SHIPPED disposition). No Round 2 action. |
| 5 | Commit 9 naming debt: `urgencyLoop` semantic | **Inherited; not closed by Round 2.** Forward-pinned (OPTIONAL future round, mechanical rename only). |
| 6 | Commit 10 already-on-disk small §6.14.28 instance | **Closed in Round 1** (captured-as-shipped). No Round 2 action. |
| 7 | Diagnostic timing reintroduction (sidecar round) | **Inherited; sidecar opens at Leo's discretion.** Explicitly out-of-scope per the round-opening fence (`§1` deferred-OOS list). |
| 8 | §B.1 foundation-tokens retrofit (highest-leverage Round 2 fix) | **CLOSED BY ROUND 2 commit 1**, with caveat per §0.3 above (Layer-A scope; Open Q5 disambiguates Option α/β/γ). |
| 9 | §B.1 cross-implication for `<BeltIndicator>` (post-session black `--foreground` vs dashboard `#000000`) | **CLOSED BY ROUND 2** via belt-logo unification per §0.5 (Option β). Resolves automatically — post-session belt migrates to Layer-B `--belt-*` tokens. |
| 10 | `--muted-foreground` ≈ 4.0:1 system-level | **Closed by Round 2** (verification-gap subset). §B.1 retrofit raises chroma + drops lightness to AA. Round 2 commit 1's audit step enumerates all `text-muted-foreground` consumers + verifies post-retrofit per WCAG 1.4.3. |
| 11 | Real-device verification gaps (§B.4 touch-target + §B.6 mobile responsive) | **§B.4 closed-by-Round-2** commit per the in-scope list (`pointer: coarse` media query + `py-3` bump on form fields + interactive paragraphs). **§B.6 verification-gap residual carries forward** as Round 2 commit-0 audit step (real-device walk if devices available; else flag as Round-3-or-later). |
| 12 | Hook re-enable (environmental, not project) | **Out-of-scope; environmental.** Re-enable per Leo's earlier direction; not a Round 2 deliverable. |

The `§6.14.28 sub-pattern instance ledger` from Round 1 (six instances + one new sub-pattern variant promoted to §6.14.41) is fully closed in Round 1's plan-doc. Round 2 inherits §6.14.40 + §6.14.41 as discipline anchors per `§3` cross-references.

### §0.7 Audit-skill convention re-check (audit step #7)

The audit-skill's `SKILL.md` lives at `~/.claude/plugins/marketplaces/alpha-style/.claude/skills/audit/SKILL.md` (not `/mnt/skills/audit/SKILL.md` as the redline cited; the `/mnt/` path was the redline's hypothesis-shape, not an empirical path). The skill's severity-scoring is per-dimension on a 0-4 scale rather than P0/P1/P2/P3 directly, but maps cleanly:

| Skill score | Maps to | Audit-doc convention |
|---|---|---|
| 0 = Inaccessible (fails WCAG A) / Severe issues / Multiple anti-patterns | P0 — Blocking | Audit doc legend at line 41: *"Ships a regression: blocks production, breaks accessibility (WCAG AA), or violates SPEC."* |
| 1 = Major gaps / Major problems | P1 — Major | Audit doc legend at line 42: *"Substantive design violation: anti-pattern from §10, contrast failure on body text, broken interactive state, or systemic Alpha-token drift."* |
| 2 = Partial / Some optimization | P2 — Minor | Audit doc legend at line 43: *"Design-coherence drift: deviates from token system, awkward layout, copy-voice drift, missing affordance, or DRY duplication."* |
| 3-4 = Good / Excellent | P3 — Polish | Audit doc legend at line 44: *"Polish opportunity: small alignment issues, minor typography choices, micro-interaction gaps, copy refinements."* |

Round 1 round-close §6.14 audit-skill convention check (per Round 1 §5.13 + line 761 of Round 1 plan) noted a **legend-prose drift** in Round 1's audit doc: "the audit doc's legend prose drifts slightly: it frames P0 as including WCAG-AA breakage where the skill places WCAG AA at P1." Round 2's findings inherit Round 1's convention — Round 1's audit doc IS the source-of-truth-for-classifications. The skip-link contrast (audit §A.4.f1) classified P1 maps to skill's "Major gaps" cleanly; the foundation tokens (audit §B.1) classified P1 also maps to skill's "Major gaps." No drift requiring re-classification.

**Conclusion.** Round 2's findings are tagged P1/P2/P3 consistently with both the audit doc's legend and the skill's per-dimension scoring. No re-classification. Minor observation: if Round 2 surfaces any new finding that is Strict-WCAG-AA-failing-but-not-blocking-production, it should be P1 per the skill's convention, not P0.

### §0.8 SPEC §6.14.40 / §6.14.41 confirmation (audit step #8)

Verified via `grep -nE "§6\.14\.[0-9]+" docs/SPEC.md`:

- **§6.14.40 — Redirector-vs-empirical-state divergence (sub-pattern of §6.14.28).** Promoted at Round 1 close (line 1773 of `docs/SPEC.md`). Captured 2026-05-09. Five Round 1 instances substantiate the promotion: §0.12 (SVG location), §0.14 (deriveHeadline State-C), §5.8 finding (a) (`item.subType.id` reachability), §5.8 finding (b) (canonical sub-type id format), and §0.13 (Wikimedia → first-party SVG, with §6.14.28 undertones). **Discipline rule:** *"audit-step's first action is empirical-state capture; redirector's specification is hypothesis-to-verify, not fact-to-implement."*
- **§6.14.41 — Audit-vs-revert blindness (audit cites mechanism no longer extant).** Promoted at Round 1 close (line ≈1797 of `docs/SPEC.md`). Single Round 1 instance (§0.15 retraction). Adversarial direction (cite-without-verify silently re-introduces a retired mechanism). **Discipline rule:** *"audit-step citations of project mechanisms (routes, functions, gates, cutoffs, validators) must include grep-verify-existence as an explicit sub-step. When audit prose cites 'the {X} cutoff' or 'the {Y} gate' or 'the {Z} validator,' the audit-step's pre-flight greps the cited mechanism's identifier across the codebase and confirms presence (NOT just shape — presence). Cite-without-verify is the adversarial-direction §6.14.28 anti-pattern."*

Round 2's `§3` (TBD body) cross-references both as load-bearing Round-2 audit-step disciplines. The audit-step (a) for any Round 2 commit that cites a project mechanism MUST include a grep-verify-existence pre-flight per §6.14.41; the audit-step's first action is empirical-state capture per §6.14.40. The §0.3 finding above is itself a §6.14.40 instance (redirector's "wide scope" framing → empirical token-architecture-decision corrects it).

### §0.9 Wide-scope inventory residual — verification-gap surfaces

Three surfaces NOT walked in detail at audit time (deferred to Round 2 commit-0 follow-up if scope expands):

1. `/phase3-smoke` page — appears to be a dev-only smoke harness for phase-3 surfaces. Token consumption is via referenced UI primitives (Layer A) but the surface is non-production. Round 2 retrofit MAY visually affect it; flag-to-confirm-on-walk.
2. `<MasteryMap>` component — referenced in `globals.css` line 47 comment (*"existing surfaces (post-session shell, mastery map, focus shell, full-length flow)"*) but no `mastery-map` directory found at `src/components/`. Either renamed or absorbed into another component since the comment was authored. Round 2 commit-0 follow-up: grep `mastery` + `MasteryMap` to identify the empirical state of this referenced surface; flag if it's still consuming Layer A.
3. `/admin/ingest` form interactivity — Round 2's `pointer: coarse` retrofit affects `px-3 py-2` form fields per §B.4. The admin form re-uses shadcn UI primitives (input, button, etc.); whether the Round 2 `pointer: coarse` rule lands at the primitive level (cascading benefit) or at the form-call-site level (admin form gets it for free either way) is a small commit-time decision.

These are NOT scope-flags; they are commit-1-pre-flight enumerations. Round 2 commit 1's audit step expands §0.3.b above with screenshots + per-surface diff captures.

### §0.10 Open Qs surfaced for Leo to resolve before commit 1

| Q | Question | Resolution proposal |
|---|---|---|
| **Q1** | **Combined-table component naming.** Per §0.4.c, three candidates: `<PerformanceSummary>`, `<PerformanceTable>`, `<PerSubTypeBreakdown>`. | **Recommend `<PerformanceSummary>`** (descriptive; "performance" captures both axes; fits §9 specific-over-generic). Awaiting Leo's pick. |
| **Q2** | **Wide-scope retrofit surface boundaries.** Per §0.3.c. The audit walk surfaced no unexpected admin/dev surfaces — only the `/phase3-smoke` dev page (non-production) inherits Layer A via UI primitives. Should Round 2 explicitly INCLUDE or EXCLUDE `/phase3-smoke` from per-surface verification? | **Recommend EXCLUDE** (`/phase3-smoke` is non-production; Round 2 verification effort does not need to cover it). Flag if Leo prefers IN. |
| **Q3** | **`<BeltIndicator>` Option β verification.** Per §0.5. Confirmed structurally feasible. | **Recommend PROCEED with Option β.** Bounded refactor; positive cascade on §B.1 cross-implication; no blockers. Awaiting Leo's confirm. |
| **Q4** | **Belt-logo unification scope.** Per the round-opening framing, default is "only post-session `<BeltIndicator>`." Audit step 5 confirmed only TWO belt-rendering surfaces exist (`<BeltStripe>` already on `<BeltGraphic>`; `<BeltIndicator>` not yet). No additional consumers (mastery-map / belt-progression) found. | **Recommend "only `<BeltIndicator>`" (default).** No additional consumers to scope. |
| **Q5** *(audit-surfaced)* | **§B.1 retrofit semantics — Option α / β / γ.** Per §0.3.c, the bifurcated token landscape (Layer A grayscale + Layer B Alpha-tinted, both intentional per `globals.css:36-46`) means the redline's "wide retrofit" needs disambiguation. | **Recommend Option α** (Layer A retrofit only; Layer B unchanged; bounded blast radius). Option γ adds a SPEC entry codifying the dual-layer architecture for future-author clarity (light extra commit). Awaiting Leo's pick. |
| **Q6** *(audit-surfaced)* | **§B.6 mobile responsive real-device walk.** Round 1 §8 residual #11 forward-pinned this to Round 2 commit-0 audit. Audit-time decision: real iPhone + Android availability? | If devices available, in-scope as a Round 2 commit-0 follow-up; else **defer to Round 3 or later** with verification-gap residual carry-forward. Awaiting Leo's confirm. |

### §0.11 Audit-surfaced scope-change flags

| ID | Flag | Round 2 disposition |
|---|---|---|
| **SF-A** | Bifurcated token landscape — redline's "wide scope" framing does not match empirical token architecture. | **Surfaced as Open Q5.** Defaults to Option α (Layer A retrofit only). Round 2 commit envelope unchanged under default; Option γ adds 1 light commit. |
| **SF-B** | `<MasteryMap>` referenced in `globals.css` comment but no matching directory. | Out-of-band flag for Round 2 commit-0 follow-up grep; not commit-envelope-blocking. |
| **SF-C** | `/phase3-smoke` non-production surface inherits Layer A. | Surfaced as Open Q2; default-EXCLUDE. |
| **SF-D** | §B.6 mobile responsive verification — Round 1 forward-pin to Round 2 commit-0 audit. | Surfaced as Open Q6; conditional on real-device availability. |

### §0.12 Commit envelope estimate (post-audit)

The round-opening redline estimated **13-14 commits + round-close**. Audit-surfaced refinement:

| # | Commit | Status |
|---|---|---|
| 0 | Plan-doc creation + §0 audit findings (this commit) | Authoring now |
| 1 | §B.1 wide token retrofit (Layer A, Option α default) + screenshot walk | Stop-and-report after authoring |
| 2 | §A.4.f1 onboarding skip-link contrast (P1 single-line fix) | Stop-and-report |
| 3 | Combined `<PerformanceSummary>` (replaces `<AccuracySummary>` + `<LatencySummary>`); folds §B.3 sort-DRY + §B.2 empty-state for these two | Stop-and-report |
| 4 | `<BeltIndicator>` Option β refactor (consume `<BeltGraphic>` internally) | Stop-and-report |
| 5 | §A.4.f2 onboarding error-state slot (P2) | Stop-and-report |
| 6 | §A.4.f3 onboarding blur-validation (P2) | Stop-and-report |
| 7 | §B.4 touch-target `pointer: coarse` (covers §A.4.f4 + §A.7.f2) | Stop-and-report |
| 8 | §B.2 empty-state harmonization for remaining components (`<StrategySurface>`, `<WrongItemsBrowser>`) — verify post-commit-3 alignment | Stop-and-report |
| 9 | §B.3 shared `_lib/sub-type-display.ts` extraction (for `<StrategySurface>` + `<WrongItemsBrowser>` post-commit-3) | Stop-and-report |
| 10 | §A.5.f1 continue-button copy refinement | Stop-and-report |
| 11 | §A.7.f1 structured-explanation rest-state affordance | Stop-and-report |
| 12 | §A.9.f1 wrong-items group heading style | Stop-and-report |
| 13 | §A.4.f5 + §A.4.f6 skip-link copy + focus-visible class (P3 polish) | Stop-and-report |
| 14 | (optional, conditional on Q5=γ) SPEC dual-layer codification | Stop-and-report |
| 15 | Round-close commit (administrative) | — |

**Empirical estimate: 13 implementation commits + 1 round-close (= 14) under default Q5=α; 14 + 1 (= 15) if Q5=γ.** Tracks the round-opening 13-14 envelope estimate.

> **Footnote (added 2026-05-09 at commit-3 prep time per §0.14 retirement).** This §0.12 table was authored at commit-0 prep time before Leo resolved Q5 to γ; the table's slot numbering is historical (commit 1 = retrofit slot under default α; SPEC dual-layer commit was slot 14 conditional on γ). After Q5=γ resolved at commit-1 prep, §5 ledger re-anchored: commit 1 = SPEC dual-layer codification (§5.1); commit 2 = Layer-A retrofit (§5.2); commit 3 = §A.4.f1 skip-link RETIRED-not-renumbered per §0.14; commit 4 = combined `<PerformanceSummary>` (§5.4); ... ; commit 15 = round-close (§5.15). **§5 is the authoritative ledger going forward; this §0.12 table stays as commit-0-time historical artifact per §6.14.20 closed-plans-immutable spirit.**

### §0.13 Stop-and-report

This plan-doc is the commit-0 deliverable. Per the round-opening contract, Round 2 stops here and reports findings. No body sections (§1 scope-fence, §2 captured-from-redline, §3 SPEC §6.14 cross-references, §4 cost envelope, §5 commit ledger, §6 verification protocol, §7 resolutions log, §8 round-close residuals) authored until Leo redirects.

### §0.15 Mid-round Option-4 split — commit 5 audit (c) surfaced `strategy-selection.ts` cascade; §5.4 split into §5.4 + §5.4b (2026-05-09)

Per Leo's 2026-05-09 redirect (commit-5 audit-step (c) STOP-AND-REPORT): commit 5's pre-flight grep for `PerSubTypeAccuracy` + `PerSubTypeLatency` consumers surfaced `src/server/post-session/strategy-selection.ts` (228 lines, 4 public functions, 2 page-level call sites) as a major server-side consumer beyond the deletion-target components. The redirect's original commit-5 framing assumed only the components consumed those types; empirical state contradicted.

**Resolution: Option 4 (split into bounded commits).** Commit 5 ships the combined `<PerformanceSummary>` + SQL consolidation + transient projection shims (sync `projectAccuracy` + `projectLatency` helpers at page level; `Pick<PerSubTypePerformance, ...>` types preserved); commit §5.4b refactors `strategy-selection.ts` to consume `PerSubTypePerformance` directly + deletes the shims + deletes the per-axis types. Two commits land the same scope as a single Option-1 absorption but with each commit's blast radius bounded.

**Why this is a §6.14.40 (redirector-vs-empirical-state) instance.** The round-opening redline + my §0.4 audit-step probe both characterized `<AccuracySummary>` + `<LatencySummary>` as the only consumers of `PerSubTypeAccuracy` + `PerSubTypeLatency` types. Empirical reality (caught at commit-5 audit-step (c) per the discipline): `strategy-selection.ts` is a downstream consumer with 4 functions taking the per-axis arrays as separate params + internal app-code Map-intersection on `subTypeId`. The audit-step (c) framing — "grep for callers" — is the canonical pre-flight that surfaces this kind of cascade; cite-without-verify (e.g., reading the audit doc's §B.3 evidence + assuming no other consumers exist) is the adversarial-direction §6.14.41 anti-pattern.

**Round 2 §6.14.40 instance count this round: 3** (SF-A bifurcated tokens at §0.3 + §A.4.f1 supersession at §0.14 + this strategy-selection cascade resolved via Option 4 split). All three benign-direction (caught by audit-first discipline before code shipped). Round 1 had 5 §6.14.40 instances (including §6.14.41 promotion); Round 2 trends similarly — 3 instances at the §5.4 mark, all closed cleanly without rework.

**Disposition.**
- §5.4 entry rewritten as commit-5/2 of Option 4 split (Files touched + audit-step + implementation-notes capture transient-shim discipline). Original §5.4 prose preserved per §6.14.20 quote-preservation block.
- §5.4b NEW entry (between §5.4 and §5.5): full ledger entry for the `strategy-selection.ts` refactor + shim cleanup. Commit envelope updates 15 → 16 (per Option 4 split).
- §1.2 + §4 + §7 envelope updates capture the new total.
- §8 forward-pin: any commit-5b residuals surfaced during commit-5b's audit step land in §8 at round-close.

### §0.14 Mid-round retirement — §5.3 (§A.4.f1 onboarding skip-link contrast) superseded by commit 2 system-level retrofit (2026-05-09)

Per Leo's 2026-05-09 redirect (commit-3 prep): commit 3 (originally `fix: §A.4.f1 onboarding skip-link contrast`) is **RETIRED-as-superseded** because commit 2's `--muted-foreground` lightness drop (0.556 → 0.45) + chroma bump already raised the skip-link's empirical contrast to **AAA-grade** via the system-level cascade. Path A (retire) selected over Path B (defense-in-depth class swap) per the redirect's recommendation + the empirical contrast measurements captured at commit 2.

**Empirical evidence (audit step (a) at commit-3 prep time, 2026-05-09).**
- Skip-link line at `src/components/post-session/onboarding-targets.tsx:129`: `className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"`. Hover state goes to `--foreground` (19.23:1, AAA-grade). Rest state on `--muted-foreground`.
- Form container at line 76 carries no background of its own (`className="space-y-6"`) — the skip-link sits on `--background` (page-level surface).
- Post-retrofit `--muted-foreground` (oklch 0.45 0.012 270) vs `--background` (oklch 0.99 0.005 270): **7.23:1 — AAA**, captured at `scripts/_logs/round-2-retrofit-screenshots/contrast-check.log`.
- The audit doc's §A.4.f1 finding (P1, sub-AA on skip-link) was framed as a per-consumer single-line fix (`text-muted-foreground → text-foreground/80`). Commit 2's system-level retrofit closed the underlying concern (sub-AA `--muted-foreground`) at the token-definition layer, where all consumers of `text-muted-foreground` benefit symmetrically. The per-consumer class swap would over-correct to ~11.5:1 (`--foreground/80` alpha-blended on `--background`) when 7.23:1 already clears AAA with comfortable margin.

**Why this is a §6.14.40 (redirector-vs-empirical-state) instance, benign direction.** The round-opening redline's commit ledger pinned §A.4.f1 as a P1 single-line fix at commit 3 — a hypothesis-shape based on the audit doc's frozen-at-Round-1-close framing. Commit 2's empirical contrast gate at commit-time superseded the hypothesis: the system-level fix made the per-consumer fix redundant. The audit-step-(a) flag at §5.3 (*"after commit 2's --muted-foreground retrofit may have raised contrast already; confirm whether the f1 fix is still needed"*) was the canonical pre-flight that caught this. **Round 2 §6.14.40 instance count this round: 2** (SF-A bifurcated tokens + this §A.4.f1 supersession). Both benign-direction; both caught by audit-first discipline.

**Disposition.**
- §5.3 entry RETIRED-as-superseded; original prose preserved per §6.14.20 quote-preservation discipline (see §5.3 quote-block).
- Commit envelope updates: commits 4-15 keep their existing slot numbers (§0.14 retire-not-renumber per Round 1 §0.13/§0.14/§0.15 precedent). New empirical commit envelope: **14 total** (1 plan-doc creation + 12 implementation + 1 round-close — was 15; commit 3 slot consumed by THIS plan-doc revision commit, which logs the retirement decision).
- §7 resolutions log: §A.4.f1 disposition explicitly logged as RESOLVED-via-commit-2-system-level-cascade (rather than RESOLVED-via-commit-3-class-swap).
- §8 round-close residuals: no new residual; the original §A.4.f1 fix is closed at the system level.

This commit ships the plan-doc revision only; no `src/` files touched. Next commit (originally commit 4: combined `<PerformanceSummary>`) keeps its existing §5.4 slot number.

---

## §1 — Round scope (per Leo's 2026-05-09 redirect — Q1-Q6 + SF-A/B/C/D resolved)

### §1.1 In-scope (the round-opening redline, quote-anchored)

> *"P1 batch: §B.1 — Foundation token Alpha-tinting retrofit. WIDE scope: walks all authenticated surfaces (dashboard, drill, diagnostic, full-length, focus shell, post-session, review-section-stub-if-exists). Pre-retrofit audit walk + retrofit + per-surface verification. §A.4.f1 — Onboarding skip-link contrast (`text-muted-foreground` → `text-foreground/80`)."*
>
> *"Belt-logo unification (Leo's feature ask, scoped to Round 2): `<BeltIndicator>` refactor to consume `<BeltGraphic>` internally. Option β: visual unified, calibration-label logic preserved."*
>
> *"Combined accuracy+latency table (Leo's feature ask, scoped to Round 2): combine `<AccuracySummary>` and `<LatencySummary>` into a single component rendering one row per sub-type with accuracy column + latency column. Resolves §B.3 sort-DRY for these two components automatically. Folds §B.2 partial (empty-state harmonization for these two components)."*
>
> *"P2 batch: §A.4.f2 onboarding error-state slot, §A.4.f3 onboarding blur-validation, §B.4 touch-target `pointer: coarse`, §B.2 empty-state harmonization for any remaining components, §B.3 shared `_lib/sub-type-display.ts` extraction, §A.5.f1 Continue button copy, §A.7.f1 structured-explanation rest-state affordance, §A.9.f1 wrong-items group heading style."*
>
> *"P3 batch (selective subset): §A.4.f5 skip-link copy, §A.4.f6 skip-link `focus-visible:` class."*

### §1.2 Q5 = Option γ — adds SPEC dual-layer codification commit

Per Leo's redirect, Q5 lands as **Option γ** (Layer-A retrofit + SPEC dual-layer codification). The SPEC commit is a new entry (commit 1 in the round's ledger), authored standalone before the Layer-A retrofit (commit 2) so the SPEC entry exists as the authoritative cross-reference for the retrofit's commit body. Empirical commit envelope: **16 commits** post-§5.4a insertion + post-§5.4b insertion (= 14 post-§0.14 retirement + 1 §5.4a NEW + 1 §5.4b NEW − 0 §5.10 RETIRED; §5.10 stays empty-not-renumbered for cross-reference stability). Net commit count tracks the round-opening 13-14 envelope estimate at the +3 mark (γ adds SPEC codification; §5.4a adds lib-extraction-before-combine; §5.4b adds the strategy-selection cascade refactor surfaced by commit-5 audit-step (c) per §0.15).

### §1.3 Explicitly deferred out-of-scope (per round-opening redline + audit-time forward-pins)

The following surfaces / features / refactors are explicitly NOT in Round 2 scope. Each maps to a future round per the cross-reference column.

| Deferred item | Forward-pin |
|---|---|
| Generalize post-session components to render historical sessions (review-section architecture) | **Round 3** (review-section architecture) |
| New `/review/[sessionId]` route + data layer for historical session retrieval | **Round 3** |
| Time-per-question line chart with right/wrong-colored dots | **Round 4** (review-specific features) |
| Filter UI (right/wrong, sub-type, time-spent) on review-section wrong-items | **Round 4** |
| All-questions-by-default rendering (review section only; post-session keeps wrong-items-only per current PRD) | **Round 4** |
| Per-question time-spent display | **Round 4** |
| Overall score on top (review section) | **Round 4** |
| Diagnostic timing reintroduction — PRD §4.1 amendment + server cutoff + client timer + mastery compute multiplier revert + post-session pacing copy revision | **Diagnostic-timing sidecar round** (per Round 1 §0.15; opens at Leo's discretion) |
| §B.5 motion sweep (shell stagger, latency-marker slide-in, structured-explanation transition-colors) | **Future polish round** |
| §A.2.f1 belt-indicator calibrating-suffix transition | **Future polish round** |
| §A.3.f1 latency-marker entrance animation | **Future polish round** |
| §A.7.f3 structured-explanation active-state transition | **Future polish round** |
| §A.9.f2 wrong-items marker tooltip | **Future polish round** |
| Sub-phase b validator (1,711 candidates at `status='candidate'`) | **Indefinitely deferred** (per Round 1 context) |
| §B.6 mobile responsive real-device walk | **Round 3+** (Q6 resolution; verification gap carries forward) |
| `<MasteryMap>` referenced in `globals.css:50` comment but no matching directory | **SF-B grep follow-up at commit 2 pre-flight** (cleanup or stale-prose call; not commit-envelope-blocking) |
| `/phase3-smoke` non-production surface | **Out of Round 2 verification** (Q2 resolution; non-production) |
| Hook re-enable (`~/.claude/hooks/cbm-code-discovery-gate`) | **Environmental, not project** |

---

## §2 — Captured anchors (per Q1-Q6 resolutions)

### §2.1 Combined-table component name (Q1)

`<PerformanceSummary>`. Replaces `<AccuracySummary>` + `<LatencySummary>`. Single row per touched sub-type, two columns: ✓/✗ counts (preserves PRD §6.5 categorical-no-percentages mandate) + median latency with the threshold-mark SVG track. Single sort, single `SUB_TYPE_BY_ID` Map. Folds §B.3 sort-DRY for these two components and §B.2 empty-state harmonization for these two components.

### §2.2 §B.1 retrofit semantics (Q5 → Option γ)

**Layer-A scope only** (Option α-equivalent retrofit) + **SPEC dual-layer codification commit** (the γ delta over α). The SPEC entry is the authoritative dual-layer architecture documentation. The Layer-A retrofit (commit 2) executes the audit doc's §B.1 fix-shape literally: hue-270 chroma 0.005-0.012 tints on the 31 Layer-A color/border tokens (light + dark mode counterparts). Layer B (the 25 Alpha-tinted product tokens) stays unchanged.

### §2.3 `<BeltIndicator>` Option β (Q3)

Proceed with Option β refactor: post-session `<BeltIndicator>`'s inline SVG body (lines 146-171 of `belt-indicator.tsx`) replaced with `<BeltGraphic>` from `src/components/dashboard/belt-graphic.tsx`. Calibrating-suffix logic + visible text label preserved (lines 127-135 + 172-182 of `belt-indicator.tsx`). `BELT_STYLE_BY_COLOR` constant becomes dead — delete. Net diff: -50 / +5. Positive cascade: post-session belt migrates from Layer-A `--card` / `--foreground` to Layer-B `--belt-*` tokens, automatically closing Round 1 §8 residual #9.

### §2.4 Belt-logo unification scope (Q4)

Only `<BeltIndicator>`. Audit step 5 confirmed only TWO belt-rendering surfaces exist (`<BeltStripe>` already on `<BeltGraphic>`; `<BeltIndicator>` not yet). No mastery-map / belt-progression surface; no additional consumers.

### §2.5 `/phase3-smoke` excluded (Q2)

Non-production smoke harness; not in Round 2 verification surface walk.

### §2.6 §B.6 mobile real-device walk deferred (Q6)

Real iPhone + Android assumed unavailable at Round 2 audit time. §B.6 verification-gap residual carries forward to Round 3+. Round 2 commit 2's per-surface verification uses DevTools emulation only (with verification-gap-flag in commit body).

### §2.7 Per-surface screenshot-capture protocol (Round 2-specific verification addition)

Commit 2 (Layer-A retrofit) captures per-surface screenshots for forward-traceability. Storage path: `scripts/_logs/round-2-retrofit-screenshots/{surface-name}-{pre|post}.png`. Surfaces walked (per §0.3.b Layer-A consumer list): drill / diagnostic / full-length / post-session / login / admin/ingest + each shadcn UI primitive consumer in dev. Stored under `scripts/_logs/` per Round 1's `tee` discipline (§6.14.38 sibling).

---

## §3 — Cross-references to SPEC §6.14 (audit-first checkpoint canon)

Round 2 inherits Round 1's discipline patterns:

- **§6.14.18, §6.14.21, §6.14.22** — audit-first checkpoint per-commit. Each Round 2 commit's prep includes a cheap pre-flight audit before any code change.
- **§6.14.20** — wholesale-replacement-with-quote-preservation for plan-doc revisions; closed-plans-immutable for Round 1's plan + audit doc.
- **§6.14.28** — plan-prose-vs-empirical-truth divergence (parent pattern).
- **§6.14.30** — additive-feature-cascade-undercount (defense: Round 2's deferred-out-of-scope list per the round-opening fence — Round 3 + Round 4 + diagnostic-timing sidecar are the explicit forward-pins).
- **§6.14.31** — destructive-operation-gate template.
- **§6.14.34** — mid-round narrow-scope sub-round insertion.
- **§6.14.38** — tee-captured stdout for any long-running verification.
- **§6.14.40** *(Round 1 round-close addition)* — redirector-vs-empirical-state divergence sub-pattern. Round 2's audit step 3 surfaced one explicit instance (SF-A: bifurcated token landscape); per-commit audit steps expected to surface more.
- **§6.14.41** *(Round 1 round-close addition)* — audit-vs-revert blindness. Round 2's per-commit audit steps include grep-verify-existence as a sub-step for any audit-prose cite of project mechanisms.

---

## §4 — Cost envelope

No LLM cost this round (no generation / validation work). Round cost is engineer-time only. Empirical commit envelope per §1.2 + §5 (post-§0.14 retirement + §5.4a + §5.4b insertions): **16 commits** (1 plan-doc creation + §5.1 SPEC + §5.2 Layer-A retrofit + §5.3 RETIRED-not-renumbered + §5.4a lib extraction + §5.4 combined component + §5.4b strategy-selection cascade refactor + §5.5-§5.9 (5 commits) + §5.10 RETIRED-not-renumbered + §5.11-§5.14 (4 commits) + §5.15 round-close). Estimated wall time: **1-2 days** at the round's typical commit pace.

---

## §5 — Commit ledger

Per Round 1's discipline: each entry carries a hash placeholder (backfilled at round-close per §5.15 amend pattern), files-touched list, audit step, implementation notes, verification step, and stop-and-report contract.

### §5.1 — Commit 1: SPEC dual-layer token codification (Option γ.2 — new top-level §13)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `docs/SPEC.md` — NEW top-level section §13 ("Token architecture") inserted after §12 (Build order). No existing SPEC entries modified. Cross-references to existing §6.14.18 (audit-against-actual-artifact) + line 1309 (PRD-prose-claims-vs-globals.css) + line 2573 (belt-indicator extension shipping note) added inline.
- `docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md` — body §1-§8 finalized in this commit (the round-open plan-doc creation that the redline labeled "commit 0" is fused into commit 1 because the body finalization is tightly-coupled prep for the SPEC entry; the §0 audit findings authored in the prior turn ship in this same commit).

**Audit step.** Pre-flight executed at commit-1 prep time (this commit): (a) re-read `globals.css` lines 26-80 verbatim — surfaced two small §6.14.28 instances (line-number drift 36-46 → 43-54; Layer-B inventory drift `--indigo-deep`, `--pale`, `--lavender-line` missed in §0.3.a). Both corrected in-place in §0.3 since the plan-doc was uncommitted (no §6.14.20 immutability bound); (b) SPEC §6.14 numbering — confirmed last entry is `#### 6.14.41`; new entry will NOT reuse `§6.14.42` (Option γ.2 chosen over γ.1 because token architecture is foundational documentation, not a discipline-rule pattern); (c) existing SPEC token-architecture content audit — line 1309 (PRD-prose-claims-vs-globals.css) is the only existing tangential reference; line 2573 (belt-indicator extension) cites belt tokens but does not codify the dual-layer architecture; (d) Layer-B inventory completeness — full re-grep against `:root` confirmed 25 color/border tokens (vs the 22 captured in §0.3.a's first authoring; three additions per §0.3.a's correction above).

**Implementation notes.** Per §2.2 + Q5=γ. New SPEC §13 — "Token architecture" — sits at top-level alongside §1-§12. Section structure: §13.1 Overview (two-layer system); §13.2 Why two layers (rationale); §13.3 Per-layer chroma + hue rules; §13.4 Authoritative inventory (full Layer-A and Layer-B token lists with line citations); §13.5 Decision rule for new tokens (default Layer B for product-domain concepts; Layer A only for shadcn-primitive coverage extension); §13.6 Cross-references (`globals.css` line 43-54 comment-block, SPEC line 1309 + line 2573, ALPHA_DESIGN §3, Round 2 plan-doc §0.3 + §2.2). The Layer-A retrofit (commit 2) executes against the inventory codified here; future authors discover the architecture via SPEC, not just the inline comment.

**Verification.** Render-check `docs/SPEC.md` post-edit; confirm §13 reads clean against §1-§12; confirm cross-references resolve (§6.14.18 exists; line 1309 exists; line 2573 exists). Confirm `docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md` body sections (§1-§8) are finalized + cross-references to SPEC §13 resolve. No code change in this commit; no test runs needed beyond render-check.

**Stop-and-report.** Do not proceed to commit 2 until redirect.

### §5.2 — Commit 2: §B.1 Layer-A token retrofit + per-surface screenshot walk + SF-B grep follow-up

**Hash:** `<TBD>`.

**Files touched.**
- `src/styles/unstyled/globals.css` — `:root` lines 8-25 (Layer-A foundation, light mode) + lines 109-116 (Layer-A sidebar tokens) + lines 103-107 (Layer-A chart tokens — only those used as text/border in shadcn primitives) + `.dark` mirror block (lines 120+ light-mode counterparts).
- `scripts/_logs/round-2-retrofit-screenshots/` (NEW directory) — pre/post per-surface screenshots per §2.7.

**Audit step.** Pre-flight: (a) re-read `globals.css` `:root` + `.dark` blocks in full; capture pre-retrofit oklch values per token. (b) per-surface screenshot pre-retrofit walk (drill / diagnostic / full-length / post-session / login / admin/ingest); store at `scripts/_logs/round-2-retrofit-screenshots/{surface}-pre.png`. (c) **SF-B grep follow-up**: `grep -rE "MasteryMap|mastery-map|mastery_map" src/` to identify the empirical state of the `<MasteryMap>` reference in `globals.css:50` comment. If found → audit confirms current state; if not → flag as stale-prose for separate cleanup (not Round 2 commit-envelope-blocking, but log the finding). (d) audit doc §B.1 line-by-line — confirm the recommended hue-270 chroma 0.005-0.012 ranges are still authoritative (per the audit doc's frozen-at-Round-1-close state).

**Implementation notes.** Per §2.2. Add hue-270 chroma 0.005-0.012 tints to: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, plus dark-mode counterparts. Sidebar tokens + chart tokens stay grayscale unless a Layer-A consumer surfaces a sub-AA contrast post-retrofit. The `--muted-foreground` retrofit pairs the chroma bump with a lightness drop (~0.556 → ~0.45 in light mode; verify empirical post-tint contrast against `--card`'s post-retrofit value reaches AA ≥ 4.5:1 per WCAG 1.4.3). Tee-captured stdout (per §6.14.38) for any long-running screenshot capture script. Per-surface verification before AND after; commit body cites empirical contrast measurements per Layer-A consumer.

**Verification.** Per-surface visual diff (pre vs post screenshots); confirm intended faint-lavender shift on focus shell + post-session + login + admin; confirm dashboard + stub pages unchanged. Contrast measurement for `--muted-foreground` (every consumer per §0.3.b) reaches AA ≥ 4.5:1. `bun test` clean (no tests rely on token oklch values directly; sanity check). Lint + typecheck clean.

**Stop-and-report.** Do not proceed to commit 3 until redirect.

> **§6.14.28 audit-surfaced empirical correction (commit-2 commit-time addendum, 2026-05-09).** Three audit-step findings, all resolved without scope expansion; recorded for forward-traceability.
>
> **Finding 1 — chart-tokens + dark-mode `--sidebar-primary` are already-chromatic; not Layer-A pure-grayscale retrofit territory.** Audit step (a) re-read of `globals.css` lines 103-107 (`:root --chart-1..5`) confirmed the light-mode chart palette is at chroma 0.105-0.245 with hues 251-265 (NOT pure-grayscale at chroma=0). The dark-mode `.dark --sidebar-primary` (line 168) is at chroma 0.243 hue 264. SPEC §13.4.1 lists both under Layer A's 31-token inventory, but the §B.1 retrofit (hue-270 chroma 0.005-0.012) targets only the **pure-grayscale subset** of Layer A — empirically 26 tokens (18 :root foundation at lines 8-25 + 8 sidebar at lines 109-116). Chart palette + dark `--sidebar-primary` remain at their existing chromatic values, consistent with their pre-Round-2 state. Net retrofit scope: **26 × 2 modes = 52 token-mode pairs touched**, NOT 31 × 2 = 62 as a literal §13.4.1 reading would suggest. SPEC §13 stays unchanged at this commit; future SPEC revisions may add a clarifying note to §13.3 / §13.4.1 distinguishing "Layer A inventory" (31 tokens) from "Round-2-retrofit subset of Layer A" (26 tokens).
>
> **Finding 2 — SF-B residual resolved as stale-prose; forward-pin to round-close.** Audit step (c) `grep -rE "MasteryMap|mastery-map|mastery_map" src/` returned only one comment-line reference at `src/components/dashboard/belt-row.tsx` (citing the absorbed `src/components/mastery-map/start-session-button.tsx` precedent in narrative-only prose). `find src/components -type d` empirically confirmed NO `src/components/mastery-map/` directory exists; `find src -path "*mastery-map*"` returned empty. The `<MasteryMap>` component referenced in `globals.css:50` ("post-session shell, **mastery map**, focus shell, full-length flow") was absorbed into `src/components/dashboard/` as part of the dashboard-PRD redesign earlier in Phase 5; the comment prose is stale. Per §0.11 SF-B forward-pin disposition ("separate cleanup commit"), commit 2 does NOT modify the comment-block — keeping retrofit + cleanup scopes separate. Forward-pinned to round-close cleanup commit; tracked in §8 round-close residuals.
>
> **Finding 3 — empirical contrast measurements post-retrofit confirm AAA-grade closure of Round 1 §8 residual #10.** Audit steps (e) + (f) ran via `scripts/_logs/round-2-retrofit-screenshots/contrast-check.ts` (committed for forward-traceability per §6.14.38 tee-discipline). Pre-retrofit `--muted-foreground` (oklch 0.556 0 0) vs `--muted` (oklch 0.97 0 0) measured **4.34:1 — SUB-AA**, confirming the audit doc's "system-level ≈ 4.0:1" framing. Post-retrofit `--muted-foreground` (oklch 0.45 0.012 270) vs `--muted` (oklch 0.97 0.008 270) measures **6.82:1 — AAA**. Vs `--background` (oklch 0.99 0.005 270): **7.23:1 — AAA**. Dark-mode `--muted-foreground` preserved at lightness 0.708 (chroma-only retrofit) maintains 7.63:1 / 5.83:1 (AAA pre + post). **Round 1 §8 residual #10 closes with AAA-grade margin.** Border 1.26:1 / 1.23:1 (pre / post) is below the WCAG 1.4.11 3:1 floor — but borders are decorative/structural per shadcn convention; not a §B.1 target; out of scope for Round 2 (note for forward-future-round if a border-as-UI-component-state surface emerges).

### §5.3 — Commit 3: §A.4.f1 onboarding skip-link contrast — RETIRED per §0.14

**Hash:** `<TBD; this slot consumed by the plan-doc revision commit that authored §0.14 + this retirement marker per §0.14 retire-not-renumber model>`.

RETIRED-as-superseded per §0.14 mid-round retirement (2026-05-09). Commit 3 in the ledger is now the plan-doc revision commit that authored §0.14 and the §5.3 retirement marker (i.e., this very commit) — no `src/` files touched. The audit-step (a) finding from the commit-3 prep time IS the empirical justification for retirement: commit 2 (`bd5af4f`) shipped `--muted-foreground` light-mode oklch(0.556 0 0) → oklch(0.45 0.012 270), which raises the skip-link's contrast against `--background` to **7.23:1 (AAA)** at the system level. The audit doc's §A.4.f1 per-consumer fix-shape (`text-muted-foreground → text-foreground/80`) is no longer needed — the underlying concern is closed at the token-definition layer per the §6.14.40 (redirector-vs-empirical-state) discipline (commit 2's empirical contrast gate superseded the audit doc's pre-Round-2 hypothesis-shape framing). Commit slot 3 is RETIRED-not-renumbered per SPEC §6.14.20 in-flight discipline (commits 4-15 keep their existing slot numbers).

> **Original §5.3 (pre-§0.14 retirement, preserved per SPEC §6.14.20).**
>
> ### §5.3 — Commit 3: §A.4.f1 onboarding skip-link contrast (P1 single-line)
>
> **Hash:** `<TBD>`.
>
> **Files touched.**
> - `src/components/post-session/onboarding-targets.tsx` — single class swap on the "Skip for now" button: `text-muted-foreground` → `text-foreground/80` (matches the surface's documented AA-discipline pattern per audit doc §B.7).
>
> **Audit step.** Pre-flight: (a) read `onboarding-targets.tsx` skip-link region; confirm the audit doc's §A.4.f1 finding is structurally accurate (after commit 2's `--muted-foreground` retrofit may have raised contrast already; confirm whether the f1 fix is still needed). If commit 2's retrofit already lifted `--muted-foreground` to AA, this commit reduces to a no-op + audit-trail note. (b) Surrounding interactive states (focus-visible, hover, active) — confirm the `text-foreground/80` swap doesn't drop a state below AA.
>
> **Implementation notes.** Per audit doc §A.4.f1 fix-shape. Single-line edit. If commit 2's retrofit closed the AA gap, this commit becomes redundant — disposition decision at commit-3 prep time (either retire as RETIRED-superseded or ship as defense-in-depth).
>
> **Verification.** Visual diff of post-session onboarding section; manual contrast measurement (DevTools or browser pick-ratio); confirm AA ≥ 4.5:1.
>
> **Stop-and-report.** Do not proceed to commit 4 until redirect.

### §5.4a — Commit 4 (inserted): extract shared `_lib/sub-type-display.ts` (supersedes original §5.10)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/_lib/sub-type-display.ts` — NEW (~52 lines). Exports `SUB_TYPE_BY_ID: ReadonlyMap<SubTypeId, SubTypeConfig>` (canonical Map; replaces 4 local Maps) + `compareBySubTypeDisplay(a: SubTypeIdHaver, b: SubTypeIdHaver): number` (verbal-section-first, alphabetical-by-displayName-within-section; validates meta exists via `errors.new()` defensive throw with `logger.error` — defense-in-depth since `buildDisplayRows` upstream filters undefined-meta cases).
- `src/components/post-session/_lib/sub-type-display.test.ts` — NEW (~75 lines). 6 test cases: SUB_TYPE_BY_ID size + shape coverage; comparator verbal-vs-numerical ordering; alphabetical-within-section; identical-id zero; full 15-sub-type sort invariant. The throw-on-unknown-id path is unreachable through type-safe call sites + the project's `no-as-type-assertion` rule prohibits bypassing the type system to test it; defensive branch documented in implementation comment + this test note.
- `src/components/post-session/accuracy-summary.tsx` — drop local `SUB_TYPE_BY_ID` + `compareRows`; import shared. Drop `subTypes` from imports (still need `SubTypeId`). Drop `compareRows` from exports.
- `src/components/post-session/latency-summary.tsx` — same shape.
- `src/components/post-session/strategy-surface.tsx` — drop local `SUB_TYPE_BY_ID` + `compareDisplay`; import shared. Drop `subTypes` from imports. Drop `compareDisplay` from exports.
- `src/components/post-session/wrong-items-browser.tsx` — drop local `SUB_TYPE_BY_ID` + `compareGroups`; import shared. Drop `subTypes` from imports. Drop `compareGroups` from exports.

**Audit step.** Pre-flight: (a) read all 4 components' compare functions verbatim — confirmed body-identical (verbal-first ternary + `localeCompare` on `displayName`). (b) confirmed canonical `subTypes` source at `@/config/sub-types` with `SubTypeConfig` exported. (c) confirmed generic `SubTypeIdHaver { subTypeId: SubTypeId }` accepts all 4 row types (`DisplayRow` × 3, `DisplayGroup` × 1). (d) decided **add tests** since the lib is shared infrastructure — ~75 lines covering 6 invariant cases. (e) confirmed original §5.10 fully superseded — no remaining scope after §5.4a; RETIRED-as-superseded with quote-preservation per §6.14.20. (f) confirmed no external consumers of the dropped local exports (`compareRows`, `compareGroups`, `compareDisplay`, `SUB_TYPE_BY_ID`, `buildDisplayRows`) via grep — safe to drop from export lists.

**Implementation notes.** Per Leo's 2026-05-09 redirect (reorder §5.10 before §5.4 so `<PerformanceSummary>` imports the canonical lib from day one; avoids retrofit pass at original §5.10 slot). The lib's `compareBySubTypeDisplay` looks up meta inside the comparator (handles any `SubTypeIdHaver`); each component still pre-projects `displayName` + `section` into its `DisplayRow` / `DisplayGroup` shape via the shared `SUB_TYPE_BY_ID.get()` pattern (preserves render-time behavior — no architectural shift to look-up-on-demand).

**Verification.** `bun test` — 117 pass (was 111; +6 from new test file) / 0 fail / 16 files (was 15). Lint (Biome + super-lint) clean across 1128 files (was 1126; +2 lib + test). Typecheck (tsgo --noEmit) clean. Behavior preservation: same sort output across all 4 components (verbal-first, alphabetical-within-section); test invariants encode this empirically.

**Stop-and-report.** Do not proceed to §5.4 (combined `<PerformanceSummary>`) until redirect.

### §5.4 — Commit 5 (Option 4 split, part 1/2): combined `<PerformanceSummary>` + SQL consolidation + transient projection shims

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/performance-summary.tsx` — NEW (~190 lines). Combined renderer: 3-column CSS grid per row (sub-type label | ✓/✗ counts | latency value + `<LatencyTrack>` SVG); render-heading-+-empty-state for zero rows ("No sub-type performance data this session."); `<dl>` semantic preserved (one `<dt>` paired with two `<dd>`s per row); `<LatencyTrack>` SVG sub-component lifted verbatim from deleted `<LatencySummary>`; AA-discipline comment block preserved.
- `src/components/post-session/performance-summary.test.ts` — NEW (~95 lines, 11 test cases via Test option B logic-only — no React testing library installed; matches existing test discipline). Covers `buildDisplayRows` (3 cases: empty, single-row meta projection, sort verbal-first / alphabetical-within-section) + `formatSeconds` (3 cases: exact representation, integer seconds, zero) + `markerPosition` (5 cases: equal-to-threshold = 50, half-threshold = 25, double-clamps-100, over-double-clamps-100, negative-clamps-0).
- `src/components/post-session/accuracy-summary.tsx` — DELETED (104 lines post-§5.4a; was 115 pre-§5.4a).
- `src/components/post-session/latency-summary.tsx` — DELETED (197 lines post-§5.4a; was 208 pre-§5.4a).
- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` — replace `getPerSubTypeAccuracy` + `getPerSubTypeLatency` with single `getPerSubTypePerformance` prepared statement; add `PerSubTypePerformance` type derivation; add transient `projectAccuracy` + `projectLatency` sync projection shims (deleted at §5.4b); `PerSubTypeAccuracy` + `PerSubTypeLatency` types redefined as `Pick<PerSubTypePerformance, ...>` (still consumed by `strategy-selection.ts`); `SessionInfo` bundle replaces `accuracy` + `latency` fields with single `performance` field; doc-comment at top updated.
- `src/app/(diagnostic-flow)/post-session/[sessionId]/content.tsx` — drop `accuracy` + `latency` props on `<PostSessionShell>`; pass `performance` instead (Option F2 — shell prop surface stays clean; `accuracy` + `latency` variables remain at page level for `strategy-selection.ts` consumption via projection shims).
- `src/components/post-session/post-session-shell.tsx` — drop `PerSubTypeAccuracy` + `PerSubTypeLatency` imports + `<AccuracySummary>` + `<LatencySummary>` imports + `accuracy` + `latency` props; add `PerSubTypePerformance` import + `<PerformanceSummary>` import + `performance` prop; collapse former slots 3 + 4 into single slot rendering `<PerformanceSummary>`; update doc-comment header (slot 4 empty-not-renumbered).

**Audit step.** Pre-flight: (a) re-confirm deletion-target inventory — both files' verbatim shapes captured at prior-halt audit (a); structural identity for SQL consolidation re-verified; (b) confirm `attempts.latencyMs` is non-nullable per `src/db/schemas/practice/attempts.ts:18` (`integer("latency_ms").notNull()`); (c) **scope-flag at this step surfaced `src/server/post-session/strategy-selection.ts` as a downstream consumer** of `PerSubTypeAccuracy` + `PerSubTypeLatency` — 4 functions, 2 page-level call sites, no tests; redirect resolved as Option 4 split (this commit + §5.4b for `strategy-selection.ts` refactor); (d) combined SQL query verified (FROM/WHERE/GROUP BY identical to the two it replaces; projections add both aggregates); (e) page-level shape probe complete (transient shims live alongside the consolidated fetcher with bounded comment block; deleted at §5.4b); (f) Option F2 selected for `<PostSessionShell>` prop reshape (drop `accuracy` + `latency` props; `performance` only); (g) Test option B (logic-only) selected — no React testing library installed; (h) empty-state copy approved; (i) `<dl>` semantic preserved with 3-column grid per row + `<PerformanceRow>` sub-component (decided over `<table>` to preserve editorial-feel; column-header announcements deferred; 8rem-wide latency column gives `<LatencyTrack>` SVG useful render width).

**Implementation notes.** Per §2.1 + §0.4 + Leo's Option 4 redirect. Single DB round-trip per page load (down from 2). The `Pick<PerSubTypePerformance, ...>` derivation pattern preserves structural compatibility with `strategy-selection.ts`'s existing `PerSubTypeAccuracy` / `PerSubTypeLatency` consumption — same shape, derived from canonical source. Closes audit doc §B.2 (empty-state harmonization for these two) + §B.3 (sort-DRY for these two; lib already extracted at §5.4a). Round 2 §6.14.40 instance count this round: **3** (SF-A bifurcated tokens at §0.3 + §A.4.f1 supersession at §0.14 + this strategy-selection cascade resolved via Option 4 split). All three benign-direction; all caught by audit-first discipline before code shipped.

**Verification.** `bun test` — 128 pass / 0 fail / 17 files (was 117 / 16; +11 from new test file). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean. Visual diff in dev DEFERRED to manual review by Leo (per §6 + the round's screenshot-deferred discipline).

**Stop-and-report.** Do not proceed to commit §5.4b until redirect.

> **Original §5.4 (pre-Option-4-split, preserved per SPEC §6.14.20).**
>
> ### §5.4 — Commit 4: combined `<PerformanceSummary>` (replaces `<AccuracySummary>` + `<LatencySummary>`)
>
> **Hash:** `<TBD>`.
>
> **Files touched.**
> - `src/components/post-session/performance-summary.tsx` — NEW component (~220-260 lines).
> - `src/components/post-session/accuracy-summary.tsx` — DELETE (115 lines).
> - `src/components/post-session/latency-summary.tsx` — DELETE (208 lines).
> - `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` — replace `getPerSubTypeAccuracy` + `getPerSubTypeLatency` with single `getPerSubTypePerformance` prepared statement (`{ subTypeId, correct, total, medianLatencyMs }`). Update `accuracy: PerSubTypeAccuracy[]` + `latency: PerSubTypeLatency[]` props on `<PostSessionShell>` to single `performance: PerSubTypePerformance[]`. Update type exports.
> - `src/components/post-session/post-session-shell.tsx` — consume `performance` prop instead of `accuracy` + `latency`; render `<PerformanceSummary>` instead of `<AccuracySummary>` + `<LatencySummary>`.
>
> **Audit step.** Pre-flight: (a) re-read `accuracy-summary.tsx` + `latency-summary.tsx` + the page-level prepared statements verbatim; confirm structural identity per §0.4.a. (b) Confirm `attempts.latencyMs` is non-nullable per `src/db/schemas/practice/attempts.ts` (a touched sub-type ALWAYS has a median latency value; safe to combine queries with no LEFT JOIN). (c) Confirm no other consumer imports `<AccuracySummary>` / `<LatencySummary>` / their type exports — grep for both component names + `PerSubTypeAccuracy` + `PerSubTypeLatency` across `src/`.
>
> **Implementation notes.** Per §2.1 + §0.4. Single SQL query with both aggregates; single `SUB_TYPE_BY_ID` Map; single `compareRows`; row renderer carries two-column layout (✓/✗ counts on left, latency value + LatencyTrack SVG on right). The LatencyTrack sub-component preserved verbatim (still uses `text-destructive` for above-threshold; AA verified post-commit-2 retrofit). Empty-path: `return null` if zero rows (consistent with the audit doc's §B.2 inconsistency observation; if §B.2 commit-9 shifts to "render heading + empty-state copy", this component absorbs that shift symmetrically). Closes audit doc §B.3 sort-DRY for these two components automatically (one `compareRows` instead of two).
>
> **Verification.** Run a session in dev; confirm post-session view renders `<PerformanceSummary>` with both axes per row, sorted verbal-first / alphabetical-within-section. `bun test` for any test file referencing the old types (none expected per audit step (c)). Lint + typecheck clean. Render-test: zero-touched-sub-types session → component returns null (no orphan section heading); single-touched-sub-type session → one row.
>
> **Stop-and-report.** Do not proceed to commit 5 until redirect.

### §5.4b — Commit 5b (Option 4 split, part 2/2): refactor `strategy-selection.ts` to consume `PerSubTypePerformance` + delete transient shims + delete `PerSubTypeAccuracy` / `PerSubTypeLatency` types

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/server/post-session/strategy-selection.ts` — 4 public functions refactored (`isStruggled`, `deriveStruggledSubTypes`, `buildStruggleContexts`, `selectStrategiesForStruggledSubTypes`) from per-axis arrays to single `PerSubTypePerformance` array param. Internal Map-intersection at the prior lines 118-125 + 155-158 collapsed into single iterations over consolidated rows. Imports updated (drop `PerSubTypeAccuracy` + `PerSubTypeLatency`; add `PerSubTypePerformance`). Top doc-comment line 30 updated (`<LatencySummary>` → `<PerformanceSummary>`). Net file size: 228 → **212 lines** (−16; Map-collapse + signature-rename savings).
- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` — deleted: `PerSubTypeAccuracy` + `PerSubTypeLatency` type definitions (the `Pick<>`-derivations from §5.4); `projectAccuracy` + `projectLatency` sync projection helper functions; the `TRANSIENT PROJECTION TYPES + SHIMS — deleted at commit §5.4b` comment block; `accuracy = projectAccuracy(...)` + `latency = projectLatency(...)` variable assignments. Updated: 2 call sites (`deriveStruggledSubTypes(performance)` + `selectStrategiesForStruggledSubTypes(performance, ...)`); type exports (drop `PerSubTypeAccuracy` + `PerSubTypeLatency`); doc-comments at top + at the `Chain: derive struggled` block + at the `getPerSubTypePerformance` prepared-statement preamble (now cite §5.4 + §5.4b end-to-end consolidation).
- `src/server/post-session/end-session-tier.ts` — single doc-comment line cite refresh: `(PerSubTypeAccuracy etc.)` → `(PerSubTypePerformance etc.; was per-axis ... pre-Round-2-§5.4 consolidation)`.

**Audit step.** Pre-flight: (a) re-read `strategy-selection.ts` end-to-end + verify post-commit-5 line count (228 lines, unchanged from pre-commit-5 since commit 5 didn't touch this file); capture each function signature + body verbatim. (b) Single-iteration collapse semantics verified: pre-refactor's `seen` Set built from union of two per-axis Maps' keys; post-refactor iterates `performance` rows directly — each row carries both axes by construction (per `attempts.latency_ms NOT NULL` + the consolidated SQL's single GROUP BY); intersection edge case (`acc?` undefined / `lat?` undefined) eliminated by the structural invariant. (c) Test cascade probe: zero hits via `grep -rE "isStruggled|deriveStruggledSubTypes|buildStruggleContexts|selectStrategiesForStruggledSubTypes" src/ --include='*.test.ts'` — no test cascade. (d) Pre-deletion type consumers: `page.tsx` (transient region from commit 5) + `strategy-selection.ts` (refactors here) + `end-session-tier.ts` (comment-only doc reference). Post-deletion grep confirms zero across `src/`. (e) Page-level variable cleanup: `\baccuracy\b|\blatency\b|projectAccuracy|projectLatency|PerSubTypeAccuracy|PerSubTypeLatency` as **identifiers** has zero hits post-refactor (matches in narrative doc-comments preserved as conceptually-correct rule descriptions). (f) `errors.try` discipline: `strategy-selection.ts` is pure synchronous logic — no `errors.try` patterns to preserve.

**Implementation notes.** Cascade resolution per §0.15 (Round 2 §6.14.40 instance #3 — closed; no new §6.14.40 instance surfaced at this commit). The post-refactor invariant is structurally stronger than pre-refactor: post-consolidation each touched sub-type has both axes per row, eliminating the missing-axis-data edge case that pre-consolidation theoretically allowed (but empirically never produced). Behavior-preserving for the input space; eliminates an unreachable edge-case branch. Round 2 §6.14.40 instance count this round: **3** (SF-A bifurcated tokens at §0.3 + §A.4.f1 supersession at §0.14 + the strategy-selection cascade resolved across §5.4 + §5.4b per §0.15). All three benign-direction; all caught by audit-first discipline before code shipped.

**Verification.** `bun test` — 128 pass / 0 fail / 17 files (matches commit-5; no test cascade). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean — zero unused-import warnings on `PerSubTypeAccuracy` / `PerSubTypeLatency` (deletions cascaded cleanly). Empirical single-DB-round-trip preserved (no new query introduced; consolidated fetcher from §5.4 unchanged).

**Stop-and-report.** Do not proceed to commit 6 (`<BeltIndicator>` Option β refactor per §5.5) until redirect.

### §5.5 — Commit 6: `<BeltIndicator>` Option β refactor (consume `<BeltGraphic>`)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/belt-indicator.tsx` — file size 189 → **134 lines** (−55, close to the −50 audit-time estimate). Replaced inline `<svg>...<rect>...<rect>...</svg>` body (former lines 146-171) with single `<BeltGraphic beltColor={color} ariaLabel={ariaLabel} className="h-5 w-full max-w-[12rem]" />` invocation. Deleted: `BeltStyle` interface (former lines 86-89); `BELT_STYLE_BY_COLOR` constant (former lines 96-113); `style = BELT_STYLE_BY_COLOR[color]` lookup at former line 125; local `BeltColor` type union (former line 57); `BeltColor` from the export list. Added: `import { BeltGraphic } from "@/components/dashboard/belt-graphic"` + `import type { BeltLevel } from "@/server/dashboard/types"`. Function signatures `tierToBeltColor` + `beltColorDisplayName` shifted return/param type from `BeltColor` to `BeltLevel` (canonical type origin). Top doc-comment block updated to reflect post-refactor framing (Round 2 §5.5 cascade + Round 1 §8 residual #9 closure). **Accessibility refinement:** outer wrapper dropped `role="img"` + `aria-label` (`<BeltGraphic>` carries its own internal `role="img"` + the full tier+calibrating phrasing via the `ariaLabel` prop; nested `role="img"` was a SR anti-pattern); visible text label below preserves WCAG 1.4.1 (color-not-alone-carries-meaning).
- `src/components/post-session/belt-indicator.test.ts` — **NO CHANGES** (test file consists entirely of pure-function unit tests on `tierToBeltColor` / `beltColorDisplayName` / `tierDisplayName` outputs; zero JSX render assertions; zero inline-SVG class-string assertions; zero aria-label assertions). Test count unchanged at 6 pass / 6 expect calls.

**Audit step.** Pre-flight: (a) re-read `belt-indicator.tsx` + `belt-graphic.tsx` end-to-end — confirmed structural anatomy at §0.5.b line numbers (BELT_STYLE_BY_COLOR at 96-113 + inline SVG at 146-171 + calibrating-suffix at 127-135 + visible text at 172-182); commit 2's Layer-A retrofit didn't affect `<BeltGraphic>` (Layer-B consumer unchanged). (b) Type compatibility: `BeltLevel` at `src/server/dashboard/types.ts:19` structurally identical to local `BeltColor`; **zero external consumers** of the local `BeltColor` export (grep confirmed); decision: import `BeltLevel` directly + drop local type. (c) Test cascade: read `belt-indicator.test.ts` (66 lines, 6 tests); all assertions are string-literal compares on pure-function outputs; zero JSX/SVG assertions; **zero test changes required**. (d) viewBox / aspect-ratio decision: BeltGraphic native viewBox 100×22 vs prior `<BeltIndicator>` viewBox 100×16; passed `className="h-5 w-full max-w-[12rem]"` per redirect's Option D1 default (25% height bump matches BeltGraphic's native aspect; closer visual parity with dashboard `<BeltStripe>`); **surfaced in stop-and-report for Leo's visual review pre-commit-7**. (e) Calibrating-suffix preserved verbatim: lines 127-135 (suffix logic) + line 181 (`{calibratingTag}` JSX) intact post-refactor (now at lines ≈92-100 + ≈121 in the 134-line file). (f) Cross-belt-consumer scope re-confirmed: `<BeltStripe>` (dashboard) + `<BeltLegend>` (dashboard, added between §0.5 and now — already on `<BeltGraphic>`) + `<BeltIndicator>` (post-session, refactors here) + `<BeltGraphic>` (primitive). All three non-primitive surfaces consume the canonical primitive post-refactor. (g) Token-system shift verification: pre-refactor uses `fill-card` + `fill-foreground` + `fill-foreground/30` + `fill-foreground/40` + `fill-background/40` + `stroke-foreground/30` (all Layer A); post-refactor (via `<BeltGraphic>`) uses `fill-belt-{white,blue,brown,black}` + `fill-belt-tip-red` + `stroke-belt-white-line` (all Layer B). **Total Layer A → Layer B migration; zero residue in code** (only narrative doc-comment references).

**Implementation notes.** Per §2.3 + §0.5.b + Leo's Option β redirect. Bounded refactor (−55 / +0 net for code; doc-comment block expanded ~10 lines for cascade-trail). Closes **Round 1 §8 residual #9** automatically — post-session black belt migrates from `--foreground` (Layer-A pure-grayscale near-black, post-Round-2-retrofit hue-270 chroma 0.012) to `--belt-black` (Layer-B tinted near-black at hue 270 chroma 0.020); visual unification with dashboard `<BeltStripe>`'s belt rendering complete. **BJJ-canonical tip-rect treatment** replaces the prior textile-stripe (former lines 161-170) — the visual semantic shifts from "stylized cloth-detail" to "actual rank-stripe per BJJ canon." Per Leo's redirect intent (visual unification).

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 5b; no test cascade — pure-function tests preserved). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean. Layer-A residue grep (`fill-card|fill-foreground|fill-background|stroke-foreground|<svg`) returns only doc-comment matches; zero code matches. Visual diff DEFERRED to manual review by Leo per the round's screenshot-deferred discipline (§6 + §2.7); audit-step (d) surfaced the h-5 vs h-4 decision for visual review.

**Stop-and-report.** Do not proceed to commit 7 (§5.6 onboarding error-state slot per §A.4.f2) until redirect.

### §5.6 — Commit 7: §A.4.f2 onboarding error-state slot (P2)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — added: `submitError: string \| null` useState peer + `SUBMIT_ERROR_COPY` module-level constant + `ONBOARDING_ERROR_ID` module-level constant + `formDescribedBy` computed ref (extracted per `no-inline-ternary`) + form-level `aria-describedby` attribute + conditional error `<p>` region between date field and action row. Updated: `onSave` clears `submitError` at retry boundary and sets it on `result === null` branch. File size 142 → **169 lines** (+27).

**Audit step.** Pre-flight: (a) re-read `onboarding-targets.tsx` end-to-end — captured form structure (space-y-6 rhythm; percentile select + date input + action row), submission handler `onSubmit` → `onSave` (lines 78-81 + 43-61), existing error-handling pattern (`.catch()` returns null + `setSubmitting(false)`; no UI feedback — matches audit doc §A.4.f2 evidence). (b) ALPHA_DESIGN §9 Error Formula re-read: every error answers (1) what happened, (2) why, (3) how to fix; templates per situation (Network: "We couldn't reach [thing]. Check your connection..."; Server: "Something went wrong on our end..."); Tone (Error row): "Empathetic, helpful". §7 Forms: "Errors below the field, connected via aria-describedby." (c) **aria-describedby wiring decision: Option A1 form-level** (single error region; cleanest semantic). (d) **`role="alert"` selected over `role="status"`** — submit-failure is user-blocking; assertive announce appropriate. (e) **Error copy: `"We couldn't save your targets. Please try again."`** — generic fallback (no error-type info available at the `.catch()` boundary; per redirect's "If no error-type info: render generic fallback"). Adapted from §9 Network template; covers (1) what + (3) fix; (2) why is implicit ("we couldn't" = our problem). (f) **State management: clear-on-retry** — `setSubmitError(null)` at start of `onSave`; success navigates away (no clear-on-success path). (g) **Visual styling: quiet text-only** — `text-foreground/80 text-sm`; no bordered callout; no `text-destructive` on body text (audit doc §A.3 sub-AA evidence). Aligns with surface's editorial discipline + ALPHA_DESIGN §7 "Crisp, legible, emotionally calm — Alpha forms are not loud." (h) Test cascade: no `onboarding-targets.test.ts` exists; **no test cascade; no new tests authored** (matches predecessor coverage; the existing pure-function `belt-indicator.test.ts` precedent applies — render-test infrastructure not in the project).

**Implementation notes.** Per audit doc §A.4.f2 + ALPHA_DESIGN §9 + Leo's commit-7 redirect. Error region renders ONLY when `submitError !== null` (no empty `<p>` shipping in success path). `aria-describedby` cleanly toggles between `ONBOARDING_ERROR_ID` and `undefined` via `formDescribedBy` extracted const (per `no-inline-ternary`). `role="alert"` triggers immediate SR announce. `data-testid="onboarding-targets-error"` for harness selectors. The existing `.catch()` Promise pattern preserved (out of scope for this commit; not refactored to `errors.try` per `simplify` discipline).

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 6; no test cascade). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean. Manual SR verification DEFERRED to Leo's review (per the round's screenshot-deferred discipline + the SR test framing in the audit step (g) verification step).

**Stop-and-report.** Do not proceed to commit 8 (§5.7 onboarding blur-validation per §A.4.f3) until redirect.

### §5.7 — Commit 8: §A.4.f3 onboarding blur-validation (P2)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — added: module-level `DATE_PAST_ERROR_COPY` constant; module-level `DATE_ERROR_ID` constant; module-level `validateDateNotPast(value: string): string \| null` pure-function helper (parses ISO `YYYY-MM-DD` to local-midnight Date; compares against local startOfToday; returns error string if past, `null` if valid or empty); component-level `dateError: string \| null` useState peer; `dateDescribedBy` extracted const for `aria-describedby`. `onSave` got submit-time re-validation gate (closes type-and-submit-without-blur edge case). Date input got `onBlur` handler (sets dateError) + updated `onChange` handler (clears dateError on next interaction). Per-field error region rendered conditionally below the date input. File size 169 → **234 lines** (+65).

**Audit step.** Pre-flight: (a) re-read `onboarding-targets.tsx` post-commit-7 — captured 4 useStates (`percentile`, `dateString`, `submitting`, `submitError`), date input at lines 127-136 with `onChange` only (no `onBlur`), no field-level validation pre-submit. (b) Date-parsing decision: `<input type="date">` produces `YYYY-MM-DD` strings; `Date.parse` / `new Date(string)` interpret as **UTC midnight** (ECMAScript spec for date-only ISO); user mental model is local-calendar; **manually parse Y/M/D + construct local-midnight Date** + compare against local `startOfToday` (set hours 0/min 0/sec 0/ms 0). Helper inline at module top (not extracted to lib — bounded scope; one consumer per `simplify` discipline). No existing date helpers found at `src/lib/` or `src/components/post-session/_lib/`; no extraction needed. (c) Far-future + percentile validation **deferred**: no clear upper bound for parent-set test-prep dates (future-future is legitimate); percentile select constrained to fixed `TARGET_PERCENTILES` set + empty allowed (skip path) so no failure mode reachable through UI. (d) Per-field state pattern: **clear-on-onChange + re-validate-on-blur**. User's first interaction after seeing an error clears the error; the next blur re-validates. (e) Date echo: per Leo's E1 redirect — **errors only**, no positive-feedback rendering. (f) Per-field error styling: **`text-foreground/80 text-sm`** matching commit 7's pattern; sits within field's `space-y-2` rhythm. (g) Error copy: **`"Target date can't be in the past. Pick a future date."`** per redirect's first phrasing (Alpha §9 Error Formula: (1) what + (3) fix; (2) why is implicit). (h) `aria-describedby` per-field: `aria-describedby={dateDescribedBy}` on the date input; toggles between `DATE_ERROR_ID` and `undefined` via extracted const (per `no-inline-ternary`). (i) Test cascade: no `onboarding-targets.test.ts` exists; **no tests added** (matches predecessor coverage; the timezone-correctness concern is real but bounded — if bugs surface in dev, add `_lib/date-validation.test.ts` as a follow-up).

**Implementation notes.** Per audit doc §A.4.f3 + ALPHA_DESIGN §7 ("Validate on blur, not every keystroke") + Leo's commit-8 redirect. Two error regions now render in this surface: form-level (`submitError`, commit 7) + field-level (`dateError`, this commit). They are independent — form-level is for save-failures (server-side); field-level is for client-side validation. Both styled identically (`text-foreground/80 text-sm` + `role="alert"`); both use stable id-based `aria-describedby` wiring. **Submit-time re-validation** added at the top of `onSave` as defense-in-depth against the type-and-submit-without-blur edge case; if `validateDateNotPast(dateString)` returns non-null, set `dateError` + early return (no save attempt; no submitError set; no setSubmitting). The percentile select is unchanged (no validation surface; constrained values).

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 7; no test cascade — pure-function helper has no co-located tests yet). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean. Manual blur-test in dev DEFERRED to Leo's review per the round's screenshot-deferred discipline.

**Stop-and-report.** Do not proceed to commit 9 (§5.8 touch-target `pointer: coarse` per §B.4) until redirect.

### §5.8 — Commit 9: §B.4 touch-target `pointer: coarse` (P2; covers §A.4.f4 + §A.7.f2)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — `<select>` + `<input type="date">` got `pointer-coarse:min-h-11` (Path A revised — `min-height: 44px` enforcement on touch only). Skip-link `<button>` got `relative` + `pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-top-3 pointer-coarse:before:-bottom-3 pointer-coarse:before:content-['']` (Path B — pseudo-element extends hit area to ~44px on touch without visual change on desktop). Biome's nursery `useSortedClasses` rule fired on the `pointer-coarse:min-h-11` insertions; safe-fix re-sorted Tailwind classes per the rule's prescribed order (`block pointer-coarse:min-h-11 w-full ...`).
- `src/components/post-session/structured-explanation.tsx` — `interactiveBaseClass` + `interactiveActiveClass` constants (lines 137-141 pre-commit) updated: prepended `relative` + appended `pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-top-1 pointer-coarse:before:-bottom-1 pointer-coarse:before:content-['']` (Path B; +8px total vertical extension → ~47px hit area on touch). Comment block expanded with the §5.8 cascade explanation. Recognition `<p>` is non-interactive — not touched.

**Audit step.** Pre-flight: (a) Tailwind v4 variant verification — `grep -rE "pointer-coarse:|pointer-fine:" src/` returned **zero hits**; this commit establishes the project convention. Tailwind v4.2.4 supports `pointer-coarse:` variant + chained variants (`pointer-coarse:before:absolute`) per Tailwind v4's variant composition system. (b) **Pseudo-element vs py-bump per element type** — pseudo-elements (`::before`, `::after`) DO NOT render on **replaced elements** (`<select>`, `<input>`) per CSS spec; Path B is structurally infeasible there. Path A revised from `py-3` to `pointer-coarse:min-h-11` because `py-2`→`py-3` (35px→43px) wouldn't reliably reach ≥44px floor; `min-h-11` (44px) enforces the floor regardless of font-size or border math. Path B (pseudo-element) preserved for `<button>` elements where `::before` renders correctly. (c) Surface enumeration verified: `<select>` percentile + `<input type="date">` (Path A); skip-link `<button>` (Path B); elimination + tie-breaker `<button>` in `<StructuredExplanation>` (Path B); recognition `<p>` is non-interactive (N/A). Submit `<Button>` primitive (`shadcn/ui` h-9 = 36px sub-44) — **SKIPPED** per audit step decision: audit doc §A.4.f4 didn't explicitly flag it; primitive-level treatment would affect every Button consumer in the app; scope expansion deferred. (d) Test cascade probe: `structured-explanation.test.ts` exists but contains zero className-asserting tests (parser-logic + boundary tests only); zero cascade. (e) DevTools emulation only; real-device verification deferred per Q6 (Round 3+).

**Implementation notes.** Per audit doc §B.4 + §A.4.f4 + §A.7.f2 + ALPHA_DESIGN §5/§8 + Leo's commit-9 redirect. **Per-element-type strategy** (replaced vs button) is the load-bearing structural decision; the audit doc's "pseudo-element preferred for visual stability" guidance applies only to `<button>` elements where pseudo-elements render. Pointer-fine (desktop) layout + visuals stay bit-for-bit identical post-commit; the `pointer-coarse:` variant guards every change. The pseudo-elements expand hit area without changing the visible button's box (no layout shift on touch). The form fields' `min-h-11` enforces a slight visual height bump on touch — acceptable per audit doc §B.4 fix-shape framing ("`py-3` (~16px vertical)") + native form-chrome conventions.

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 8; no test cascade). Lint (Biome + super-lint) clean across 1128 files post-`useSortedClasses`-safe-fix. Typecheck (tsgo --noEmit) clean. DevTools emulation deferred to Leo's review per the round's screenshot-deferred discipline.

**Stop-and-report.** Do not proceed to commit 10 (§5.9 empty-state harmonization per §B.2) until redirect.

**Stop-and-report.** Do not proceed to commit 9 until redirect.

### §5.9 — Commit 10: §B.2 empty-state harmonization (Outcome B — token-level drift)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/strategy-surface.tsx` — empty-state `<p>` className: `text-foreground/60` → **`text-foreground/80`** (1-line; AA-discipline align with `<PerformanceSummary>` canonical pattern).
- `src/components/post-session/wrong-items-browser.tsx` — empty-state `<p>` className: `text-foreground/60` → **`text-foreground/80`** (1-line; same).

**Audit step.** Pre-flight: (a) **`<PerformanceSummary>` canonical pattern** captured at lines 181-194 of `performance-summary.tsx`: `<section aria-labelledby="post-session-performance-heading" className="space-y-3" data-testid="post-session-performance-summary-section">` + always-rendered `<h2 className="font-medium text-foreground text-sm tracking-tight">` + ternary on empty: `<p className="text-foreground/80 text-sm">No sub-type performance data this session.</p>`. (b) **`<StrategySurface>`**: section structure aligned (`aria-labelledby` + `space-y-3` + heading-always-visible + ternary). Empty `<p>` uses **`text-foreground/60`** + copy `"No sub-types flagged this session — keep going."`. (c) **`<WrongItemsBrowser>`**: section structure aligned (`aria-labelledby` + `space-y-4` + heading-always-visible + ternary). Empty `<p>` uses **`text-foreground/60`** + copy `"No wrong items this session."`. (d) **Drift assessment: Outcome B** — both `<StrategySurface>` and `<WrongItemsBrowser>` empty-state `<p>`s use `text-foreground/60` (~4.4:1 alpha-blended contrast, borderline AA) where canonical pattern uses `text-foreground/80` (~7.2:1, AAA). Same AA-discipline framing the surface uses everywhere else (audit doc §A.4.f1 + §B.7). Token-level drift, not cosmetic. (e) Decision threshold: AA-grade styling drift IS in-scope per audit step (e); cosmetic copy-tone variations (e.g., StrategySurface's "keep going" suffix vs WrongItemsBrowser's terse copy) are NOT drift — preserved per per-component editorial voice.

**Implementation notes.** Per audit doc §B.2 fix-shape + audit step (e) decision threshold. Two-line align (one className per file). Section structure / heading style / heading-always-visible / ternary-on-empty all already align across all 3 (`<PerformanceSummary>` + `<StrategySurface>` + `<WrongItemsBrowser>`); only the `text-foreground/60` opacity drift on the empty-state `<p>`s required correction. Copy-tone preserved per component (StrategySurface's "keep going" suffix is calm-not-motivational and within the surface's editorial voice; not changed).

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 9; no test cascade — `text-foreground/60` → `text-foreground/80` is opacity-only). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean. Manual empty-state visual diff DEFERRED to Leo's review per the round's screenshot-deferred discipline.

**Stop-and-report.** Do not proceed to commit 11 (§5.11 continue-button copy per §A.5.f1) until redirect.

**Stop-and-report.** Do not proceed to commit 10 until redirect.

### §5.10 — Commit 10: §B.3 shared `_lib/sub-type-display.ts` — RETIRED per §5.4a

**Hash:** RETIRED — slot consumed by §5.4a's pre-pone of the same extraction (Leo's 2026-05-09 redirect; original §5.10 reduces to zero scope after §5.4a migrates all 4 components in a single pass).

RETIRED-as-superseded per §5.4a (2026-05-09). Commit 10 in the ledger is now empty — the shared `_lib/sub-type-display.ts` extraction was pre-poned to §5.4a (commit 4) so `<PerformanceSummary>` (commit 5) imports the canonical lib from day one. The original §5.10 scope (extract for `<StrategySurface>` + `<WrongItemsBrowser>` post-commit-4 fold) was absorbed into §5.4a's single-pass migration of all 4 components. Commit slot 10 is RETIRED-not-renumbered per SPEC §6.14.20 in-flight discipline (commits 11-15 keep their existing slot numbers).

> **Original §5.10 (pre-§5.4a retirement, preserved per SPEC §6.14.20).**
>
> ### §5.10 — Commit 10: §B.3 shared `_lib/sub-type-display.ts` (remaining components)
>
> **Hash:** `<TBD>`.
>
> **Files touched.**
> - `src/components/post-session/_lib/sub-type-display.ts` — NEW. Exports `SUB_TYPE_BY_ID: Map<SubTypeId, SubTypeMeta>` + `compareBySubTypeDisplay(a, b): number`.
> - `src/components/post-session/strategy-surface.tsx` — replace local `SUB_TYPE_BY_ID` + `compareGroups` with imports.
> - `src/components/post-session/wrong-items-browser.tsx` — replace local `SUB_TYPE_BY_ID` + `compareDisplay` with imports.
>
> **Audit step.** Pre-flight: (a) re-read all four components' compare functions (already collapsed to two post-commit-4: `<PerformanceSummary>` + `<StrategySurface>` + `<WrongItemsBrowser>`; `<PerformanceSummary>` may also import the shared lib). (b) confirm `compareRows` body in `<PerformanceSummary>` matches the body in `<StrategySurface>` + `<WrongItemsBrowser>` (verbal-first, alphabetical-within-section). (c) decide `<PerformanceSummary>` consumption: import shared OR keep local (since commit 4 already collapsed two — slight argument for shared if commit 10's extraction lands the canonical version).
>
> **Implementation notes.** Per audit doc §B.3 fix-shape. Net reduction ~20 lines across the three files (was 4 components in audit doc; commit 4 already collapsed to 3). Reduces future drift risk.
>
> **Verification.** `bun test` (any sort tests still pass against the shared lib). Lint + typecheck clean.
>
> **Stop-and-report.** Do not proceed to commit 11 until redirect.

### §5.11 — Commit 11: §A.5.f1 continue-button copy refinement

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/post-session-shell.tsx` — Continue button label inside `<ContinueButton>` sub-component (line 175 pre-commit): `Continue` → **`Continue to dashboard`**. Single-line copy edit.

**Audit step.** Pre-flight: (a) located `<ContinueButton>` sub-component at lines 165-178 of `post-session-shell.tsx`. Synchronous `router.push("/")` navigation; no async work between click and navigation. Bare `Continue` JSX text content inside `<Button>` primitive. (b) **No loading-state variant** — `router.push` is synchronous; no `"Continuing…"` parallel copy to update. Skip. (c) `grep -rE "\"Continue\"|>Continue<" src/components/post-session/` returned zero unexpected hits; only the target site. Lowercase "Save and continue" in `<OnboardingTargets>`'s submit copy is correctly excluded (audit doc §A.4 evidence: "verb + object, good"; not in scope). (d) `grep -rE "i18n|useTranslation|next-intl" src/` returned **zero hits** — no translation infrastructure; copy edit lives inline in JSX. (e) **Final wording: `"Continue to dashboard"`** per plan-doc default + Leo's redirect. Preserves "continue" framing of the surface; satisfies ALPHA_DESIGN §9 specific-over-generic ("Verb + object. Never 'OK', 'Submit', 'Yes/No', 'Click here'.").

**Implementation notes.** Per audit doc §A.5.f1 + ALPHA_DESIGN §9 + Leo's commit-11 redirect. Single-line copy edit; button styling + click handler + `data-testid` unchanged. Aria-label inherited from text content (no separate aria-label override). Destination consistent across session types (`router.push("/")` regardless of diagnostic / drill / full-length / simulation; the `<ContinueButton>` is rendered for non-diagnostic sessions per `<PostSessionShell>`'s `else` branch, where `/` is unambiguously the dashboard).

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 10; no test cascade). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean. Manual visual diff DEFERRED to Leo's review per the round's screenshot-deferred discipline.

**Stop-and-report.** Do not proceed to commit 12 (§5.12 structured-explanation rest-state affordance per §A.7.f1) until redirect.

### §5.12 — Commit 12: §A.7.f1 structured-explanation rest-state affordance

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/structured-explanation.tsx` — added imports `ChevronRightIcon` from `lucide-react` + `cn` from `@/lib/utils`. Both interactive `<button>` elements (elimination + tie-breaker) wrapped their text content in `<span className="flex items-start justify-between gap-3">` + appended a right-aligned `<ChevronRightIcon aria-hidden="true" className="mt-1 size-3 shrink-0 text-foreground/60 [rotate-90 when active]">`. Recognition `<p>` (non-interactive) **unchanged**.

**Audit step.** Pre-flight: (a) re-read post-commit-9 `structured-explanation.tsx` end-to-end. Captured: 3 paragraph slots — recognition (`<p className={recognitionClass}>` at line 235; non-interactive); elimination (`<button aria-label={...} aria-pressed={eliminationActive} className={eliminationClass} type="button">` at lines 238-247); tie-breaker (same shape at lines 249-260, gated on `tieBreaker !== undefined`). Both buttons already carry `aria-pressed` (toggle-button pattern) — important for audit step (f) below. `interactiveBaseClass` + `interactiveActiveClass` constants (post-commit-9) carry the pseudo-element + `pointer-coarse:` chains for §B.4 hit-area expansion; preserved verbatim. (b) **Icon library: `lucide-react`** — `grep -rE "from \"lucide-react\"" src/` returned 5 hits across `belt-row.tsx` (`ChevronRightIcon`), `dropdown-menu.tsx` (`ChevronRightIcon`), `combobox.tsx`, `select.tsx`, `streak-chip.tsx`. Established project convention. Imported `ChevronRightIcon` (not `ChevronRight` — matches existing `ChevronRightIcon` casing). (c) **Rotation pattern: CSS class toggle, no transition.** Per surface's no-motion-at-v1 discipline (audit doc §B.5 — "Zero motion across the entire surface (P3, polish opportunity)"); single icon import + `rotate-90` Tailwind utility on active state; instant rotate matches editorial-restraint surface. (d) **Layout: flex right-aligned via `<span className="flex items-start justify-between gap-3">` wrapper inside `<button>`.** Text content moves into `<span className="flex-1">` to take available space; chevron is sibling. `items-start` + `mt-1` keeps chevron aligned with the first line of text on multi-line prose; `gap-3` (12px) provides breathing room. (e) **Active-state plumbing: existing `eliminationActive` / `tieBreakerActive` booleans reused** for the `cn(... && "rotate-90")` chevron class. No parallel state introduced. (f) **ARIA decision: KEEP existing `aria-pressed`; do NOT swap to `aria-expanded`.** Per W3C ARIA Authoring Practices: `aria-pressed` is correct for toggle-buttons (state-bearing; affects sibling region — these buttons toggle strike/highlight overlays on the OPTIONS list, not collapsible content under the button itself); `aria-expanded` is for disclosure widgets (revealing collapsible content). Empirical state already correctly uses `aria-pressed`; the redirect's "add aria-expanded" recommendation assumed no existing aria-state attr; surfaced as audit-step deviation. (g) Test cascade: zero — `structured-explanation.test.ts` is parser-logic + boundary tests only; zero JSX / className / aria assertions; no updates needed. (h) Recognition parity verified: `<p className={recognitionClass}>{recognition.text}</p>` at line 235 stays unchanged; no chevron added. The chevron-on-interactive vs no-chevron-on-recognition asymmetry IS the affordance signal — recognition reads as "info," interactive reads as "click me."

**Implementation notes.** Per audit doc §A.7.f1 + ALPHA_DESIGN §7 + Leo's commit-12 redirect. Chevron at `size-3` (12px) keeps visual footprint minimal per editorial-restraint discipline. `text-foreground/60` color (~4.4:1 alpha-blended on `--background`) is acceptable for a decorative icon (non-text contrast floor is 3:1 per WCAG 1.4.11; the `aria-hidden="true"` makes the icon non-content; the toggle state is communicated semantically via `aria-pressed`, not via icon color). Rotation: instant `rotate-90` on active; no transition (preserves surface's static-render discipline). Recognition paragraph asymmetry: chevron on interactive paragraphs only — affordance signal that distinguishes interactive prose from informational prose.

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 11; no test cascade). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean. Manual visual diff DEFERRED to Leo's review per the round's screenshot-deferred discipline.

**Stop-and-report.** Do not proceed to commit 13 (§5.13 wrong-items group heading per §A.9.f1) until redirect.

### §5.13 — Commit 13: §A.9.f1 wrong-items group heading style (Option A — sentence-cased)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/wrong-items-browser.tsx` — group heading className: `font-medium text-foreground/80 text-xs uppercase tracking-wide` → **`font-semibold text-foreground/80 text-sm`**. Element type `<h3>` unchanged. Top-of-file doc-comment block at line 43 updated to reflect new visual treatment + cite Round 2 §5.13 + ALPHA_DESIGN §4 editorial-warmth bias rationale (preserves the historical "uppercase tracked label" framing in the cite for future-author archeology).

**Audit step.** Pre-flight: (a) Group heading located at line 372 of `wrong-items-browser.tsx`: `<h3 className="font-medium text-foreground/80 text-xs uppercase tracking-wide">{group.displayName}</h3>`. Single-instance `<h3>` repeated per group via `groups.map()`. (b) Section heading parity verified at line 350-354: `<h2 className="font-medium text-foreground text-sm tracking-tight" id="post-session-wrong-items-heading">Items you got wrong</h2>`. Post-edit hierarchy distinguishes via **weight + opacity axis** (section: `font-medium` + full-opacity; group: `font-semibold` + opacity-reduced) instead of size + uppercase axis. Same `text-sm` size on both; group reads as subordinate-but-readable due to the opacity reduction (~80% of foreground). (c) Tracking-wide removal verified — `tracking-wide` is paired with `uppercase` for letter-spacing on small-caps treatment; both retired together when the heading goes sentence-cased. No other styles depend on the tracking value. (d) Test cascade: no `wrong-items-browser.test.ts` exists. **Zero cascade.** (e) Visual hierarchy snapshot: pre-edit was section (`text-sm font-medium tracking-tight` full-opacity) → group (`text-xs uppercase tracking-wide font-medium` reduced-opacity) → item content. Post-edit: section unchanged → group (`text-sm font-semibold` reduced-opacity sentence-cased) → item content unchanged. Squint test: section is the loudest (full-opacity); group is quieter despite heavier weight (opacity reduction dominates); items are quietest. Hierarchy stays cleanly distinguishable.

**Implementation notes.** Per audit doc §A.9.f1 + ALPHA_DESIGN §4 editorial-warmth bias + Leo's Option A pick (over Option B uppercase + text-sm bumped). Single-line className change at line 372 + accompanying doc-comment refresh at line 43. **Mobile-readability concern resolved** — pre-edit `text-xs uppercase tracking-wide` (~12px wide-set caps) was documented as harder to scan on mobile than sentence-cased `text-sm` (14px). Post-edit eliminates the §4 mobile-readability concern while preserving distinguishable visual hierarchy via the weight+opacity axis. Token usage stays Layer A only (post-commit-2 retrofit).

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 12; no test cascade). Lint (Biome + super-lint) clean across 1128 files. Typecheck (tsgo --noEmit) clean. Manual visual diff DEFERRED to Leo's review per the round's screenshot-deferred discipline.

**Stop-and-report.** Do not proceed to commit 14 (§5.14 skip-link copy + focus-visible per §A.4.f5 + §A.4.f6) until redirect.

### §5.14 — Commit 14: §A.4.f5 + §A.4.f6 skip-link copy + focus-visible class (P3 polish bundled)

**Hash:** `<TBD; backfilled at round-close>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — skip-link `<button>` (lines 216-224 pre-commit): copy `"Skip for now"` → **`"Skip and go to dashboard"`** (§A.4.f5); className gained `focus-visible:outline-2 focus-visible:outline-foreground/30 focus-visible:outline-offset-2` (§A.4.f6, matches `<StructuredExplanation>` `interactiveBaseClass` canonical pattern). Top-of-file doc-comment block at lines 10-15 updated to reflect new copy + cite Round 2 §5.14 + ALPHA_DESIGN §9 verb+object guidance (preserves the historical "Skip for now" framing in the cite for future-author archeology). Biome's `useSortedClasses` rule fired on the `focus-visible:*` insertions; safe-fix re-sorted Tailwind classes (no behavior change).

**Audit step.** Pre-flight: (a) Skip-link located at lines 216-224 of `onboarding-targets.tsx`. Element: `<button type="button">` with `onClick={function onSkip() { router.push("/") }}`. Pre-edit copy: `"Skip for now"`. Pre-edit className: `relative text-muted-foreground text-sm underline-offset-4 pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-top-3 pointer-coarse:before:-bottom-3 pointer-coarse:before:content-[''] hover:text-foreground hover:underline` (post-commit-9 pseudo-element + pointer-coarse: chains preserved; `text-muted-foreground` preserved per §0.14 retirement — system-level retrofit at commit 2 lifted to AAA-grade). (b) `<StructuredExplanation>` canonical focus-visible pattern verified via `interactiveBaseClass` line 149 of `structured-explanation.tsx`: `focus-visible:outline-2 focus-visible:outline-foreground/30 focus-visible:outline-offset-2`. Match exactly. Post-commit-12 state of canonical pattern unchanged from audit-time framing. (c) Pseudo-element + focus-visible composition: focus-visible outline applies to `<button>` element directly; `::before` is absolute-positioned child node; outline renders around button visible bounds (the visible text region), not around the expanded `::before` hit area. DevTools verification deferred to Leo's review per the round's screenshot-deferred discipline. (d) Action-row layout (`<div className="flex items-center justify-between gap-4">`) sanity check: outline is rendered outside element bounds via `outline-offset` (doesn't affect flow); layout rhythm preserved post-edit. (e) Copy destination accuracy: `router.push("/")` → dashboard. `"Skip and go to dashboard"` is empirically correct + parallels commit 11's `"Continue to dashboard"` framing for verb+object explicit-destination consistency. (f) `grep -rE "Skip for now|Skip and|skip-link|skipOnboarding" src/components/post-session/` returned only the target site's instance + the doc-comment cite. **No parallel skip-links elsewhere in the surface.** (g) Test cascade: no `onboarding-targets.test.ts` exists. **Zero cascade.**

**Implementation notes.** Per audit doc §A.4.f5 + §A.4.f6 + ALPHA_DESIGN §9 verb+object guidance + Leo's commit-14 redirect. Bundled two-edit polish:
- Copy: `"Skip for now"` → `"Skip and go to dashboard"` (§A.4.f5). Parallel framing with commit 11's `"Continue to dashboard"` — both buttons now specify destination explicitly.
- Focus-visible: added `focus-visible:outline-2 focus-visible:outline-foreground/30 focus-visible:outline-offset-2` (§A.4.f6). Matches the canonical pattern from `<StructuredExplanation>` for surface-level a11y consistency. Outline outset prevents the focus ring from clipping against the surrounding action-row layout.

Pseudo-element `::before` (commit 9 hit-area expansion for `pointer: coarse`) coexists with the new focus-visible outline cleanly — outline is parent-bound (button bounds); pseudo-element is child-of-button positioned absolute. No interaction.

**Verification.** `bun test` 128 pass / 0 fail / 17 files (matches commit 13; no test cascade). Lint (Biome + super-lint) clean across 1128 files post-`useSortedClasses`-safe-fix. Typecheck (tsgo --noEmit) clean. Manual keyboard-tab + DevTools focus-ring inspection DEFERRED to Leo's review per the round's screenshot-deferred discipline.

**Stop-and-report.** Do not proceed to commit 15 (round-close) until redirect.

### §5.15 — Round-close commit (administrative)

**Hash:** `<TBD>`.

**Files touched.**
- `docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md` — status flip "planning" → "shipped {date}"; hash backfill across §5.1-§5.14; §7 resolutions log finalized; §8 round-close residuals enumerated.
- `docs/SPEC.md` — any §6.14 promotions surfaced during the round (TBD per round-close decision; default DEFER if no multi-instance pattern emerges).

**Audit step.** Pre-flight executed at round-close: (a) `git log --oneline` from round-open `ebb8489` to HEAD; capture all Round 2 commit hashes for backfill; (b) `git status --short` confirms clean working tree; (c) closed-plans-immutable verified per §6.14.20; (d) audit-skill convention re-check (per §0.7); (e) §6.14 promotion candidates enumerated + decided.

**Implementation notes.** Plan-doc finalization per the round-close redirect's enumerated content. Hash backfill via amend-pattern (CLAUDE.md normally prefers new commits, but the redirect explicitly authorizes amend for self-referential round-close-hash backfill, per Round 1 precedent).

**Verification.** Render-check the plan-doc post-edit; confirm all hash placeholders resolved; pre-commit lint + typecheck pass.

**Stop-and-report.** Round 2 complete. Round 3 (review-section architecture) opens at Leo's discretion.

---

## §6 — Verification protocol carry-forward

Per Round 1 §6 + Round 2-specific additions:

- **Per-commit verification.** Each §5.{n} entry above has its own verification step. Visual reviews on `/post-session/[sessionId]/...` are the canonical signal for post-session-component-touching commits (commits 3-7, 9-14). For the `--muted-foreground` retrofit (commit 2), per-surface visual review on `/`, `/drill/...`, `/diagnostic/...`, `/full-length/...`, `/post-session/...`, `/login`, `/admin/ingest`. `bun test` is the canonical signal for test-touching commits — anticipated only at commits 4 + 5 (component refactors with co-located test files).
- **Real-DB harness.** All audit-step probes that read DB state (e.g., commit 4's accuracy + latency aggregation testing) run against the dev DB, not mocked, per project discipline.
- **No new smokes.** This round doesn't add smoke scripts. Existing smokes under `scripts/dev/smoke/` continue unchanged.
- **`tee` for any long-running stdout** per §6.14.38; not anticipated this round (no long-running pipelines), except commit 2's screenshot-capture script if scripted (manual screenshot capture is the default).
- **Round 2-specific addition: per-commit screenshot capture for commit 2** per §2.7. Stored at `scripts/_logs/round-2-retrofit-screenshots/{surface-name}-{pre|post}.png` for forward-traceability.

---

## §7 — Resolutions log

Final state for each Open Q + scope flag (per Leo's 2026-05-09 redirect):

- **Q1 combined-table component naming:** **RESOLVED — `<PerformanceSummary>`** (Q1 resolution per §2.1 + commit 4).
- **Q2 wide-scope retrofit surface boundaries:** **RESOLVED — exclude `/phase3-smoke`** (Q2 resolution per §2.5; non-production).
- **Q3 `<BeltIndicator>` Option β verification:** **RESOLVED — proceed** (Q3 resolution per §2.3 + commit 5).
- **Q4 belt-logo unification scope:** **RESOLVED — only `<BeltIndicator>`** (Q4 resolution per §2.4; no other consumers found).
- **Q5 §B.1 retrofit semantics:** **RESOLVED — Option γ** (Q5 resolution per §2.2 + commit 1 SPEC codification + commit 2 Layer-A retrofit). Commit envelope updated from 13-14 to **15 total** per §1.2.
- **Q6 §B.6 mobile real-device walk:** **RESOLVED — defer to Round 3+** (Q6 resolution per §2.6; verification-gap residual carries forward).
- **SF-A bifurcated token landscape:** **RESOLVED via Q5 = γ** (SPEC §13 codifies dual-layer architecture; Layer-A retrofit operates on a defined scope).
- **SF-B `<MasteryMap>` referenced but absent:** **RESOLVED at commit 2 pre-flight as STALE-PROSE** (per §5.2 audit step (c) + §6.14.28 commit-2 addendum Finding 2). No `src/components/mastery-map/` directory exists; the component was absorbed into `src/components/dashboard/` as part of the dashboard-PRD redesign. The `globals.css:50` comment-block prose listing "mastery map" as a non-touched surface is stale. Forward-pinned to round-close cleanup (small one-line edit), tracked in §8.
- **SF-C `/phase3-smoke` non-production:** **RESOLVED via Q2** (excluded from Round 2 verification surface walk).
- **SF-D §B.6 mobile real-device verification:** **RESOLVED via Q6** (deferred to Round 3+).
- **§A.4.f1 onboarding skip-link contrast (P1):** **RESOLVED via Round 2 commit 2 system-level cascade** (per §0.14 + §5.3 retirement). Empirical post-retrofit contrast: 7.23:1 (AAA). Per-consumer class swap (audit doc §A.4.f1 fix-shape `text-muted-foreground → text-foreground/80`) was retired-as-superseded — the underlying concern closed at the token-definition layer where every consumer benefits symmetrically.
- **§B.3 sub-type sort-DRY drift (P2):** **RESOLVED via Round 2 commit 4 (§5.4a)** — single shared `_lib/sub-type-display.ts` extracted with `SUB_TYPE_BY_ID` + `compareBySubTypeDisplay` consumed by all 4 components (`<AccuracySummary>`, `<LatencySummary>`, `<StrategySurface>`, `<WrongItemsBrowser>`) in a single-pass migration. Original §5.10 (extract-after-combine) RETIRED-not-renumbered as superseded; §5.4a (extract-before-combine) lands the canonical lib so `<PerformanceSummary>` (commit 5 = §5.4) imports from day one. Net DRY win: 4 local Maps + 4 compare functions → 1 of each, +75 lines of test coverage.
- **§B.2 empty-state inconsistency (P2):** **RESOLVED via Round 2 commits §5.4 + §5.9**. §5.4 absorbed the `<AccuracySummary>` + `<LatencySummary>` fold (combined `<PerformanceSummary>` renders heading + empty-state copy `"No sub-type performance data this session."`). §5.9 audit-step (a-e) verified section-structure alignment across `<PerformanceSummary>` + `<StrategySurface>` + `<WrongItemsBrowser>` (all 3 use `aria-labelledby` + always-rendered heading + ternary-on-empty); surfaced **token-level drift** on empty-state `<p>`s (StrategySurface + WrongItemsBrowser used `text-foreground/60` ≈ 4.4:1 borderline-AA where canonical uses `text-foreground/80` ≈ 7.2:1 AAA). §5.9 shipped 2-line align (`/60` → `/80`). Per-component copy-tone preserved (StrategySurface's "keep going" suffix; WrongItemsBrowser's terse copy) — within editorial-voice latitude.
- **`strategy-selection.ts` cascade (audit-surfaced):** **RESOLVED via Round 2 commits §5.4 + §5.4b** (Option 4 split). §5.4 shipped the combined component + SQL consolidation + transient projection shims; §5.4b refactored `strategy-selection.ts` to consume `PerSubTypePerformance` directly (4 function signature changes + Map-intersection collapse to single iteration), deleted the projection shims + per-axis types from `page.tsx`, and refreshed the `end-session-tier.ts` doc-comment cite. The cascade was caught at commit 5's audit step (c) STOP-AND-REPORT — Round 2 §6.14.40 instance #3 per §0.15. All three Round-2 §6.14.40 instances closed clean without rework.
- **Round 1 §8 residual #9 (`<BeltIndicator>` cross-implication for §B.1):** **RESOLVED via Round 2 commit §5.5** (`<BeltIndicator>` Option β refactor). Post-session belt migrated from Layer-A tokens (`fill-card` / `fill-foreground` / etc.) to Layer-B tokens (`--belt-{white,blue,brown,black}` + `--belt-tip-red` via `<BeltGraphic>` primitive). Visual unification with dashboard `<BeltStripe>`'s belt rendering complete; BJJ-canonical tip-rect treatment replaces the prior textile-stripe. Net diff: 189 → 134 lines (−55) in `belt-indicator.tsx`; zero test-cascade (pure-function tests preserved); zero external consumers of dropped `BeltColor` type. Outer `role="img"` + duplicate aria-label dropped to avoid SR nested-role anti-pattern; `<BeltGraphic>` carries the full tier+calibrating phrasing internally; visible text label preserves WCAG 1.4.1.
- **§A.4.f2 onboarding error-state slot (P2):** **RESOLVED via Round 2 commit §5.6**. Added `aria-describedby`-wired form-level `role="alert"` region rendering `"We couldn't save your targets. Please try again."` (generic-fallback per ALPHA_DESIGN §9 Error Formula; `.catch()` boundary surfaces no error-type info). Quiet text-only styling (`text-foreground/80 text-sm`) per surface's editorial discipline + audit doc §A.3 sub-AA evidence on body-text destructive. Clear-on-retry state pattern; success navigates away. Net diff: +27 lines.
- **§A.4.f3 onboarding blur-validation (P2):** **RESOLVED via Round 2 commit §5.7**. Added per-field `onBlur` handler on the date input + `validateDateNotPast(value)` pure-function helper (manually parses `YYYY-MM-DD` to local-midnight Date; compares against local `startOfToday`; handles the `Date.parse`-as-UTC ECMAScript pitfall). Field-level `aria-describedby`-wired `role="alert"` region renders `"Target date can't be in the past. Pick a future date."` per Alpha §9. State pattern: clear-on-onChange + re-validate-on-blur. Submit-time re-validation gate added in `onSave` (closes the type-and-submit-without-blur edge case). Far-future + percentile validation **deferred**: no clear failure modes (future-future legitimate; percentile constrained to fixed set + empty-allowed skip path). Net diff: +65 lines.
- **§B.4 touch-targets sub-44px on form + interactive paragraphs (P2):** **RESOLVED via Round 2 commit §5.8**. Per-element-type strategy: replaced elements (`<select>`, `<input type="date">`) got `pointer-coarse:min-h-11` (≥44px enforcement on touch); `<button>` elements (skip-link in `<OnboardingTargets>`; elimination + tie-breaker in `<StructuredExplanation>`) got `relative` + `pointer-coarse:before:absolute … before:content-['']` pseudo-element extending hit area without desktop visual change. Submit `<Button>` primitive **SKIPPED** (out of bounded scope; primitive-level treatment would affect every Button consumer in the app). Pointer-fine (desktop) layout + visuals stay bit-for-bit identical. Real-device verification deferred per Q6.
- **§A.4.f4 onboarding form fields + skip-link sub-44px (P2):** **RESOLVED via Round 2 commit §5.8** (composed with §B.4 above; same per-element strategy applied to all `<OnboardingTargets>` fields + skip-link).
- **§A.7.f2 structured-explanation interactive paragraphs sub-44px (P2):** **RESOLVED via Round 2 commit §5.8** (composed with §B.4 above; pseudo-element approach applied to elimination + tie-breaker `<button>` constants).
- **§A.5.f1 continue-button copy refinement (P2):** **RESOLVED via Round 2 commit §5.11**. `<ContinueButton>` text content `"Continue"` → `"Continue to dashboard"` per ALPHA_DESIGN §9 specific-over-generic ("Verb + object. Never 'OK', 'Submit', 'Yes/No', 'Click here'."). Single-line copy edit; preserves the surface's "continue" framing. Destination is consistent across non-diagnostic session types (`router.push("/")`).
- **§A.7.f1 structured-explanation rest-state affordance (P2):** **RESOLVED via Round 2 commit §5.12**. Added right-aligned `<ChevronRightIcon>` (lucide-react, size-3 ≈12px) to the elimination + tie-breaker interactive paragraphs; rotates 90° on active state via `cn(... && "rotate-90")` class toggle (no transition per surface's no-motion-at-v1 discipline). Recognition `<p>` (non-interactive) unchanged — the chevron-on-interactive vs no-chevron-on-recognition asymmetry IS the affordance signal. Existing `aria-pressed` semantic preserved (toggle-button pattern; correct per W3C ARIA APG); `aria-expanded` rejected at audit step (f) — these buttons affect sibling regions (option-list strike/highlight overlays), not collapsible content under the button itself.
- **§A.9.f1 wrong-items group heading style (P2):** **RESOLVED via Round 2 commit §5.13** (Option A — sentence-cased). `<h3>` className: `font-medium text-foreground/80 text-xs uppercase tracking-wide` → `font-semibold text-foreground/80 text-sm`. Visual hierarchy preserved via **weight + opacity axis** (section heading `font-medium` + full-opacity; group heading `font-semibold` + opacity-reduced) instead of size + uppercase. Mobile-readability concern (audit doc §A.9.f1 evidence: text-xs wide-set uppercase pushes against ALPHA_DESIGN §4) resolved by sentence-casing at text-sm. Doc-comment block updated to reflect new treatment + cite Round 2 §5.13 + §4 rationale.
- **§A.4.f5 skip-link copy refinement (P3):** **RESOLVED via Round 2 commit §5.14**. `"Skip for now"` → `"Skip and go to dashboard"` per ALPHA_DESIGN §9 verb+object guidance. Parallel framing with commit 11's `"Continue to dashboard"` — both action-row buttons now specify destination explicitly. Doc-comment block at top of file refreshed to cite the new copy + Round 2 §5.14 framing.
- **§A.4.f6 skip-link `focus-visible:` class (P3):** **RESOLVED via Round 2 commit §5.14**. Added `focus-visible:outline-2 focus-visible:outline-foreground/30 focus-visible:outline-offset-2` to skip-link className — matches `<StructuredExplanation>` `interactiveBaseClass` canonical pattern for surface-level a11y consistency. Outline outset prevents clipping against the surrounding action-row flex layout. Pseudo-element `::before` (commit 9 hit-area) coexists cleanly with focus-visible outline (outline is parent-bound; pseudo-element is absolute-positioned child).

---

## §8 — Round-close residuals + forward pins

Forward-pinned at audit time (round-close updates this list with empirical residuals as commits ship):

1. **Round 3 (review-section architecture).** Generalize post-session components for historical session viewing; new route + data layer. Out of scope per §1.3.
2. **Round 4 (review-specific features).** Time-per-question line chart with right/wrong dots; filter UI; all-questions-by-default; per-question time display; overall score on top. Out of scope per §1.3.
3. **Diagnostic-timing sidecar round.** PRD §4.1 amendment + server cutoff + client timer + mastery compute multiplier revert + post-session pacing copy revision. Per Round 1 §0.15. Opens at Leo's discretion. Out of scope per §1.3.
4. **§B.5 motion sweep + remaining P3 polish (§A.2.f1, §A.3.f1, §A.7.f3, §A.9.f2).** Future polish round. Out of scope per §1.3.
5. **Sub-phase b validator.** Indefinitely deferred per Round 1 context.
6. **SF-B stale-prose cleanup (forward-pinned to round-close cleanup commit per §5.15 or a small dedicated commit).** Resolved at commit 2 pre-flight as stale-prose (per §5.2 audit step (c) + commit-2 §6.14.28 addendum Finding 2). The `globals.css:50` comment block lists "mastery map" as a non-touched surface, but no `src/components/mastery-map/` directory exists (absorbed into `src/components/dashboard/`). Single-line edit at round-close: drop "mastery map" from the comment-block surface list, OR replace with "dashboard" if a positive-naming retrofit is preferred.
7. **§B.6 mobile real-device walk.** Deferred to Round 3+ per Q6.
8. **Hook re-enable.** Environmental, not project. Re-enable per Leo's earlier direction.
