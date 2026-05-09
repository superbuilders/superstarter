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

### §0.13 Stop-and-report

This plan-doc is the commit-0 deliverable. Per the round-opening contract, Round 2 stops here and reports findings. No body sections (§1 scope-fence, §2 captured-from-redline, §3 SPEC §6.14 cross-references, §4 cost envelope, §5 commit ledger, §6 verification protocol, §7 resolutions log, §8 round-close residuals) authored until Leo redirects.

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

Per Leo's redirect, Q5 lands as **Option γ** (Layer-A retrofit + SPEC dual-layer codification). The SPEC commit is a new entry (commit 1 in the round's ledger), authored standalone before the Layer-A retrofit (commit 2) so the SPEC entry exists as the authoritative cross-reference for the retrofit's commit body. Empirical commit envelope updates from 13 implementation commits (the round-opening redline's estimate) to 14 implementation commits + 1 round-close = **15 total**.

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

No LLM cost this round (no generation / validation work). Round cost is engineer-time only. Empirical commit envelope per §1.2 + §5: **15 commits** (1 plan-doc creation + 13 implementation + 1 round-close, with the SPEC dual-layer codification per Q5=γ counted as commit 1). Estimated wall time: **1-2 days** at the round's typical commit pace.

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

### §5.3 — Commit 3: §A.4.f1 onboarding skip-link contrast (P1 single-line)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — single class swap on the "Skip for now" button: `text-muted-foreground` → `text-foreground/80` (matches the surface's documented AA-discipline pattern per audit doc §B.7).

**Audit step.** Pre-flight: (a) read `onboarding-targets.tsx` skip-link region; confirm the audit doc's §A.4.f1 finding is structurally accurate (after commit 2's `--muted-foreground` retrofit may have raised contrast already; confirm whether the f1 fix is still needed). If commit 2's retrofit already lifted `--muted-foreground` to AA, this commit reduces to a no-op + audit-trail note. (b) Surrounding interactive states (focus-visible, hover, active) — confirm the `text-foreground/80` swap doesn't drop a state below AA.

**Implementation notes.** Per audit doc §A.4.f1 fix-shape. Single-line edit. If commit 2's retrofit closed the AA gap, this commit becomes redundant — disposition decision at commit-3 prep time (either retire as RETIRED-superseded or ship as defense-in-depth).

**Verification.** Visual diff of post-session onboarding section; manual contrast measurement (DevTools or browser pick-ratio); confirm AA ≥ 4.5:1.

**Stop-and-report.** Do not proceed to commit 4 until redirect.

### §5.4 — Commit 4: combined `<PerformanceSummary>` (replaces `<AccuracySummary>` + `<LatencySummary>`)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/performance-summary.tsx` — NEW component (~220-260 lines).
- `src/components/post-session/accuracy-summary.tsx` — DELETE (115 lines).
- `src/components/post-session/latency-summary.tsx` — DELETE (208 lines).
- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` — replace `getPerSubTypeAccuracy` + `getPerSubTypeLatency` with single `getPerSubTypePerformance` prepared statement (`{ subTypeId, correct, total, medianLatencyMs }`). Update `accuracy: PerSubTypeAccuracy[]` + `latency: PerSubTypeLatency[]` props on `<PostSessionShell>` to single `performance: PerSubTypePerformance[]`. Update type exports.
- `src/components/post-session/post-session-shell.tsx` — consume `performance` prop instead of `accuracy` + `latency`; render `<PerformanceSummary>` instead of `<AccuracySummary>` + `<LatencySummary>`.

**Audit step.** Pre-flight: (a) re-read `accuracy-summary.tsx` + `latency-summary.tsx` + the page-level prepared statements verbatim; confirm structural identity per §0.4.a. (b) Confirm `attempts.latencyMs` is non-nullable per `src/db/schemas/practice/attempts.ts` (a touched sub-type ALWAYS has a median latency value; safe to combine queries with no LEFT JOIN). (c) Confirm no other consumer imports `<AccuracySummary>` / `<LatencySummary>` / their type exports — grep for both component names + `PerSubTypeAccuracy` + `PerSubTypeLatency` across `src/`.

**Implementation notes.** Per §2.1 + §0.4. Single SQL query with both aggregates; single `SUB_TYPE_BY_ID` Map; single `compareRows`; row renderer carries two-column layout (✓/✗ counts on left, latency value + LatencyTrack SVG on right). The LatencyTrack sub-component preserved verbatim (still uses `text-destructive` for above-threshold; AA verified post-commit-2 retrofit). Empty-path: `return null` if zero rows (consistent with the audit doc's §B.2 inconsistency observation; if §B.2 commit-9 shifts to "render heading + empty-state copy", this component absorbs that shift symmetrically). Closes audit doc §B.3 sort-DRY for these two components automatically (one `compareRows` instead of two).

**Verification.** Run a session in dev; confirm post-session view renders `<PerformanceSummary>` with both axes per row, sorted verbal-first / alphabetical-within-section. `bun test` for any test file referencing the old types (none expected per audit step (c)). Lint + typecheck clean. Render-test: zero-touched-sub-types session → component returns null (no orphan section heading); single-touched-sub-type session → one row.

**Stop-and-report.** Do not proceed to commit 5 until redirect.

### §5.5 — Commit 5: `<BeltIndicator>` Option β refactor (consume `<BeltGraphic>`)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/belt-indicator.tsx` — replace inline SVG body (lines 146-171) with `<BeltGraphic beltColor={color} ariaLabel="..." className="..." />`. Delete `BELT_STYLE_BY_COLOR` constant (lines 96-113). Add import for `<BeltGraphic>`. Calibrating-suffix logic (lines 127-135 + 181) preserved verbatim.
- Possibly `src/components/post-session/belt-indicator.test.ts` — if existing tests assert on the inline-SVG class strings, update; if they assert on aria-label / data-testid only, no change.

**Audit step.** Pre-flight: (a) re-read `belt-indicator.tsx` + `belt-graphic.tsx` to confirm Option β still feasible (§0.5 captured at audit time; commit-2 retrofit may have shifted Layer-A consumers but `<BeltGraphic>` consumes Layer B which is unaffected). (b) Type compatibility: `BeltLevel` from `@/server/dashboard/types` vs local `BeltColor` — confirmed identical in §0.5.a. (c) Read `belt-indicator.test.ts` (if it exists) + identify class-string assertions that need updating. (d) Visual: open post-session view in dev; pre-refactor screenshot at default size (`h-4 w-full max-w-[12rem]`); plan post-refactor className for visual height parity (likely `h-5` since BeltGraphic's viewBox is 22 vs 16).

**Implementation notes.** Per §2.3 + §0.5.b. Bounded refactor (-50 / +5). Closes Round 1 §8 residual #9 automatically (post-session black belt migrates from `--foreground` to `--belt-black`).

**Verification.** Visual diff of post-session belt-indicator (each tier — easy/medium/hard/brutal × pre-floor / post-floor combinations). Confirm: BJJ-canonical tip-rect replaces textile-stripe; calibrating-suffix renders unchanged; aria-label phrasing intact; sub-type display name + color name in visible text intact. `bun test src/components/post-session/belt-indicator.test.ts` clean. Lint + typecheck clean.

**Stop-and-report.** Do not proceed to commit 6 until redirect.

### §5.6 — Commit 6: §A.4.f2 onboarding error-state slot (P2)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — add `aria-describedby`-wired inline error region per ALPHA_DESIGN §9 error formula. Render on submit-failure with §9-aligned error-formula copy ("plain-language → cause → fix").

**Audit step.** Pre-flight: (a) read `onboarding-targets.tsx` end-to-end; identify form structure + submission handler. (b) audit doc §A.4.f2 fix-shape — confirm the error region attaches to the form-level container (not per-field). (c) ALPHA_DESIGN §9 verbatim re-read for the error formula's prescribed pattern.

**Implementation notes.** Per audit doc §A.4.f2. Error-state slot lives below form fields, above the submit button. `aria-describedby={errorId}` on the form; `<div id={errorId} role="alert">` containing the error text. Empty when no error. Error copy follows §9: plain-language summary → cause → suggested fix.

**Verification.** Trigger submit failure in dev (e.g., disable network); confirm error region renders, screen reader announces (test with VoiceOver or Orca). Lint + typecheck clean.

**Stop-and-report.** Do not proceed to commit 7 until redirect.

### §5.7 — Commit 7: §A.4.f3 onboarding blur-validation (P2)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — add `onBlur` validation handler per field. Inline confirmation / error feedback at field-blur per ALPHA_DESIGN §7.

**Audit step.** Pre-flight: (a) re-read `onboarding-targets.tsx` post-commit-6; confirm field structure; (b) ALPHA_DESIGN §7 verbatim re-read for blur-validation pattern (confirm vs revert decision); (c) accessibility — confirm blur-validation doesn't introduce focus-trap or aria-live thrashing.

**Implementation notes.** Per audit doc §A.4.f3. Per-field validation on blur. Inline confirmation icon (✓) or error message wired via `aria-describedby` per field. Compose with commit 6's form-level error region (per-field + form-level errors render symmetrically).

**Verification.** Manual blur-validation test in dev across all form fields. Lint + typecheck clean.

**Stop-and-report.** Do not proceed to commit 8 until redirect.

### §5.8 — Commit 8: §B.4 touch-target `pointer: coarse` (P2; covers §A.4.f4 + §A.7.f2)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — `@media (pointer: coarse)` rule bumping form-field `py-2` → `py-3` (or pseudo-element absolute hit-target).
- `src/components/post-session/structured-explanation.tsx` — same media query treatment for interactive paragraphs.

**Audit step.** Pre-flight: (a) audit doc §B.4 + §A.4.f4 + §A.7.f2 verbatim re-read; (b) decide between `py` bump and pseudo-element approach (per audit doc §B.4: "pseudo-element absolute-positioned hit target on each interactive element (preferred for visual stability)"). Default to pseudo-element. (c) browser DevTools `pointer: coarse` emulation pre-commit + post-commit visual.

**Implementation notes.** Per audit doc §B.4 fix-shape. Pseudo-element pattern: `before:absolute before:inset-x-0 before:-top-1 before:-bottom-1 before:content-['']` + `relative` parent — extends hit area without changing visual size. Conditional via Tailwind v4 `pointer-coarse:` variant (verify Tailwind v4 syntax at audit step).

**Verification.** DevTools `pointer: coarse` emulation; confirm hit area ≥ 44×44 on form fields + interactive paragraphs; confirm visual size unchanged on `pointer: fine`. Lint + typecheck clean.

**Stop-and-report.** Do not proceed to commit 9 until redirect.

### §5.9 — Commit 9: §B.2 empty-state harmonization (remaining components)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/strategy-surface.tsx` — verify empty-state copy alignment with the post-commit-4 `<PerformanceSummary>` decision (the §B.2 remaining-components scope is `<StrategySurface>` + `<WrongItemsBrowser>`; commit 4 already covered the AccuracySummary + LatencySummary fold).
- `src/components/post-session/wrong-items-browser.tsx` — same alignment.

**Audit step.** Pre-flight: (a) re-read `<PerformanceSummary>` post-commit-4 — capture its empty-state decision (return null vs render heading + empty-state copy). (b) confirm `<StrategySurface>` + `<WrongItemsBrowser>` already render heading + empty-state copy per audit doc §B.2 evidence at line 380-381. (c) decide single empty-state model: either ALL render heading + copy, OR ALL return null. The audit doc recommends the former.

**Implementation notes.** Per audit doc §B.2 fix-shape. If commit 4 chose "return null" for `<PerformanceSummary>`, this commit revises commit 4 to render heading + copy and aligns the other two. If commit 4 chose "render heading + copy", this commit confirms `<StrategySurface>` + `<WrongItemsBrowser>` are already aligned (no-op) and the commit retires as RETIRED-already-aligned. Either way, ONE empty-state model across all four components.

**Verification.** Render-test each component with empty rows. Visual consistency check.

**Stop-and-report.** Do not proceed to commit 10 until redirect.

### §5.10 — Commit 10: §B.3 shared `_lib/sub-type-display.ts` (remaining components)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/_lib/sub-type-display.ts` — NEW. Exports `SUB_TYPE_BY_ID: Map<SubTypeId, SubTypeMeta>` + `compareBySubTypeDisplay(a, b): number`.
- `src/components/post-session/strategy-surface.tsx` — replace local `SUB_TYPE_BY_ID` + `compareGroups` with imports.
- `src/components/post-session/wrong-items-browser.tsx` — replace local `SUB_TYPE_BY_ID` + `compareDisplay` with imports.

**Audit step.** Pre-flight: (a) re-read all four components' compare functions (already collapsed to two post-commit-4: `<PerformanceSummary>` + `<StrategySurface>` + `<WrongItemsBrowser>`; `<PerformanceSummary>` may also import the shared lib). (b) confirm `compareRows` body in `<PerformanceSummary>` matches the body in `<StrategySurface>` + `<WrongItemsBrowser>` (verbal-first, alphabetical-within-section). (c) decide `<PerformanceSummary>` consumption: import shared OR keep local (since commit 4 already collapsed two — slight argument for shared if commit 10's extraction lands the canonical version).

**Implementation notes.** Per audit doc §B.3 fix-shape. Net reduction ~20 lines across the three files (was 4 components in audit doc; commit 4 already collapsed to 3). Reduces future drift risk.

**Verification.** `bun test` (any sort tests still pass against the shared lib). Lint + typecheck clean.

**Stop-and-report.** Do not proceed to commit 11 until redirect.

### §5.11 — Commit 11: §A.5.f1 continue-button copy refinement

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/post-session-shell.tsx` — Continue button label: `"Continue"` → `"Go to dashboard"` or `"Continue to dashboard"` (per audit doc §A.5.f1 + ALPHA_DESIGN §9 specific-over-generic).

**Audit step.** Pre-flight: (a) read the button context + surrounding copy; (b) audit doc §A.5.f1 verbatim; (c) ALPHA_DESIGN §9 button-copy guidance — confirm the recommended wording.

**Implementation notes.** Single-line copy edit. Pick `"Continue to dashboard"` over `"Go to dashboard"` for consistency with the surface's "continue" framing. Final wording at commit-time review.

**Verification.** Visual diff of post-session shell footer; confirm copy reads as specific-over-generic.

**Stop-and-report.** Do not proceed to commit 12 until redirect.

### §5.12 — Commit 12: §A.7.f1 structured-explanation rest-state affordance

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/structured-explanation.tsx` — add rest-state visual cue (chevron, dotted underline, or text-tint shift) per audit doc §A.7.f1.

**Audit step.** Pre-flight: (a) read structured-explanation interactive paragraph rendering; (b) audit doc §A.7.f1 + ALPHA_DESIGN §7; (c) decide between three affordance shapes (chevron icon — most explicit; dotted underline — minimal; text-tint shift — quietest); pick at commit-time.

**Implementation notes.** Per audit doc §A.7.f1. Default to chevron icon (most explicit affordance signal). Alternative shapes documented in commit body for future iteration.

**Verification.** Visual diff of structured-explanation cards; confirm rest-state affordance reads clearly.

**Stop-and-report.** Do not proceed to commit 13 until redirect.

### §5.13 — Commit 13: §A.9.f1 wrong-items group heading style

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/wrong-items-browser.tsx` — group heading style per audit doc §A.9.f1 (e.g., `text-sm` sentence-cased + `font-semibold` or `text-sm uppercase`).

**Audit step.** Pre-flight: (a) read wrong-items group heading rendering; (b) audit doc §A.9.f1 verbatim; (c) ALPHA_DESIGN §4 typography hierarchy — confirm the style choice aligns.

**Implementation notes.** Per audit doc §A.9.f1. Decide at commit-time between sentence-cased + `font-semibold` (warmer) vs uppercase (more systematic). Likely sentence-cased per Alpha §4 editorial-warmth bias.

**Verification.** Visual diff of wrong-items section group headings.

**Stop-and-report.** Do not proceed to commit 14 until redirect.

### §5.14 — Commit 14: §A.4.f5 + §A.4.f6 skip-link copy + focus-visible class (P3 polish)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/post-session/onboarding-targets.tsx` — skip-link copy refinement (§A.4.f5) + `focus-visible:` class addition (§A.4.f6).

**Audit step.** Pre-flight: (a) audit doc §A.4.f5 + §A.4.f6 verbatim; (b) read skip-link region post-commit-3 (which already swapped the contrast class).

**Implementation notes.** Per audit doc §A.4.f5 + §A.4.f6. Two micro-edits: copy + focus-visible ring class.

**Verification.** Visual diff + keyboard tab to skip-link; confirm `:focus-visible` ring renders ≥3:1.

**Stop-and-report.** Do not proceed to round-close until redirect.

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
