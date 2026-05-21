# Phase 4 Sub-Phase b — Validator and Admin Review

**STATUS: OPEN — round commit 0 (audit-step framework executed; §0.6 architectural-question resolutions proposed; awaiting redirector ratification before §1 opens).**

This round delivers the **candidate validator + admin review surface** that promotes Phase 4 sub-phase a's candidate inventory to live items via Posture B (validator filters first; admin reviews flagged subset; convergence requires both passes). It is the first of two implementation phases plus a round-close, expected to span 12–20 commits.

## §0 Round-frame

### §0.1 Round vehicle, scope, and §6.14.40 reconciliation

- **Vehicle:** multi-phase round, NOT a sidecar. Anticipated commit count 12–20 across §1 (validator engine + promotion workflow + admin allowlist) → §2 (admin review UI) → §3 (round close).
- **Round-open anchor:** HEAD `e9f1254` (post-round-prep clean state).
- **Reconciliation block — twelve commits between original handoff anchor `a8d83bf` and this round-open:**

| Commit | Disposition |
|---|---|
| `fa1c081` | Selection-engine sidecar #1 close-logging (past-tense narrative; sidecar already closed at `1dc2b75`). NOT a new sidecar opening. (§6.14.43 instance #7.) |
| `7258789` | `/review` surface + real day-streak read (Round 3 ad-hoc work-stream commit 1). |
| `0a4f832` / `c1ce1c6` / `67a3879` | Sound-bank rewire. Orthogonal. |
| `81819e0` | Triage retirement end-to-end (3 module deletions, 2 DB column drops, ~430 LOC). Header banners landed in PRD/SPEC/design_decisions, body prose left in present-tense (later cleaned at SPEC-B + followup). |
| `32bbbd4` | TopNav unification across authenticated surfaces. |
| `aa76394` / `810c83a` | Post-session enhancements (tabbed review interface; LatencyRangeSlider). |
| `955ad1d` | Round-prep audit-log (this round's pre-open audit synthesis). |
| `d592107` | SPEC-B body amendment (live-prose triage references removed across PRD/SPEC/design_decisions). |
| `e9f1254` | SPEC-B-followup (§10.7 slot-arithmetic claims amended for post-retirement accuracy). |

- **Round 3 disposition:** retired-as-shipped. Eight commits across one ad-hoc session per `docs/claude_logs/session_2026-05-10_10-11_review-streak-sounds-triage-removal-topnav.md`. The handoff's "three forward-pinned rounds" frame collapses to two: this validator+admin round + the diagnostic-timing-strategy round (forward-pinned at `diagnostic-timing-sidecar.md` §0.10). Round 3 components are **consumed as anchor patterns** in §2 admin UI, NOT modified.
- **Selection-engine sidecar #2 disposition:** NEVER EXISTED. ONE sidecar (`docs/plans/selection-engine-session-attempted-ids-sidecar.md`), opened at `ccb3aab`, closed at `1dc2b75`. The redirector's prior framing of `fa1c081` as "sidecar #2 opening" was a commit-message-vs-diff inversion — the commit-message's "Opened the selection-engine sidecar" is past-tense session-arc narrative; the diff content is two session-log files. Banked as §6.14.43 instance #7 at `955ad1d` audit-log §2.
- **Triage-retirement disposition:** code-retired-not-just-docs-retired. `<TriagePrompt>`, `<TriageScoreLine>`, `src/server/triage/score.ts` deleted; `attempts.triage_prompt_fired` + `attempts.triage_taken` columns dropped via `drizzle/0006_friendly_switch.sql`. Header banners + body amendments executed at SPEC-B + followup; SPEC §10.7 slot-arithmetic claims accurate post-retirement. Three smoke/lib files retain live triage code residuals (`scripts/dev/smoke/phase3-commit5.ts`, `scripts/dev/smoke/phase3-commit2-browser.ts`, `scripts/_lib/explain.ts`); deferred to a future smoke-cleanup pass per §0.2.
- **Audit-log §7.4 correction (Path 1 ratification, §6.14.43 instance #8 + new sub-type 5):** `955ad1d` audit-log §7.4 stated *"Q8 admin auth shape — TopNav unification (32bbbd4) introduced NO role-aware affordances per §4.2. Q8's 'greenfield' framing holds."* This claim contained an unjustified leap from a narrow finding ("TopNav has no role affordances") to a broad generalization ("admin infrastructure is greenfield"). The audit-log only investigated `32bbbd4` and did not verify whether admin infrastructure existed elsewhere. Empirical state at `e9f1254` falsifies the leap: `requireAdminEmail()` from `src/server/auth/admin-gate.ts` exists, with `src/config/admins.ts` email allowlist, `(admin)/layout.tsx` route gating, and an existing `/admin/ingest` route — the canonical project admin pattern per PRD §3.1. The audit-log file is preserved as forensic record per Path 1 ratification (do NOT amend in place); the leap is corrected in this plan-doc with explicit citation. §0.6 Q8 framing is anchored to the existing infrastructure, NOT to a greenfield extrapolation. **§6.14.43 instance #8 banks (new sub-type 5: propagation-through-prior-audit-log)**; SPEC §6.14.43 entry amendment to add sub-type 5 to the four-sub-type taxonomy folds at round-close per §3.
- **Grep-count drift correction:** prior commit-0 attempt's prompt cited 12/9/11 for triage residual counts in SPEC.md/PRD.md/design_decisions.md respectively; corrected to 15/12/15 per executor's `grep -c` re-measurement at this audit. No actual doc edits between `e9f1254` and now (`git diff e9f1254..HEAD -- docs/SPEC.md docs/PRD.md docs/design_decisions.md` is empty). The drift was reporting-window error in my prior stop-and-reports.

### §0.2 Anti-scope (deferred-OOS list per §6.14.30)

EXPLICITLY excluded from this round:

- **Round 3 review-section architecture.** Retired-as-shipped at the eight-commit ad-hoc session above. Components in `src/components/post-session/*`, `src/components/review/*`, `src/components/nav/page-nav.tsx`, `src/server/nav/chrome.ts`, `src/server/review/data.ts`, and the `/review` page itself are CONSUMED as anchor patterns in §2 admin UI but NOT MODIFIED.
- **Streak feature.** `src/server/dashboard/streak.{ts,test.ts}`, `streak-chip.tsx`, and the `loadNavChrome(userId)` consumer chain are fully orthogonal to validator+admin per audit-log §6. This round does not modify streak. Admin routes mount the same `<PageNav>` and inherit the streak chip without modification.
- **Diagnostic-timing-strategy round.** Forward-pinned at `diagnostic-timing-sidecar.md` §0.10. Addresses Round 1 §0.15 forward-reference items 1–5 together (PRD §4.1 amendment, server cutoff re-introduction, client timer, mastery multiplier revert, post-session pacing copy). Sequencing relative to validator+admin deferred to a later round-shape decision.
- **Sub-phase a regeneration.** No new candidates this round; the working set is the candidates extant at `e9f1254`. Authoritative count from §1 commit 0 dev-DB query; handoff (1,711) and convergence-audit.md (1,748) snapshots are both stale.
- **New item sub-types.** Round operates on the existing 14 sub-types only.
- **Parent-facing UX changes.** Post-Round-3 baseline (TopNav, /review, post-session shell, dashboard) is stable. This round consumes Round 3 components for admin UI; does NOT modify shipped parent surfaces.
- **Score-based goals follow-up.** Sidecar closed at `b6e180d`; no in-scope work this round.
- **§B.5 motion sweep / polish residuals.** From Round 2; not in this round's scope.
- **Triage code residuals in three smoke/lib files.** `scripts/dev/smoke/phase3-commit5.ts`, `scripts/dev/smoke/phase3-commit2-browser.ts`, `scripts/_lib/explain.ts` retain live triage code per audit-log §5; deferred to a future smoke-cleanup pass.
- **Selection-engine sidecar #1 stale `STATUS: OPEN` header.** Line 3 of `docs/plans/selection-engine-session-attempted-ids-sidecar.md` was not updated at round-close; minor docs-hygiene residual; deferred.
- **Validator coverage of OTHER candidate types.** v1 has only Phase 4 sub-phase a sibling-generated candidates; user-submitted items, de-novo cell-generated items, and other future candidate types are deferred (greenfield).
- **Cross-project coordination.** Superstarter, Alphastyle (sibling projects); separate threads.
- **Parallel admin auth infrastructure.** EXPLICITLY OOS per Q8 ratification (Decision D). The validator+admin round REUSES `requireAdminEmail()`; does NOT introduce `users.role` column or Auth.js v5 session-callback enrichment. Audit-log §7.4's "greenfield" framing was wrong (see §0.1).
- **HNSW/IVFFlat index introduction on `items.embedding`.** Per items.ts inline comment: *"IVFFlat / HNSW index on embedding deferred per design decision — sequential scan is faster than the index at v1 bank scale."* If validator's embedding-distance criterion (Q1) surfaces a performance issue during §1 implementation, surface as a residual rather than adding the index in-round. Pairwise-comparison cost is O(n²) on sequential scan; at ~1,700 candidates ≈ 3M comparisons; acceptable at v1 scale but degrades super-linearly.
- **NOT excluded — must be addressed:**
  - Admin allowlist population: add admin email(s) to `src/config/admins.ts` as part of §1 implementation.
  - Items table `status` enum extension: add `'rejected'` as 4th value (current values: `'live' | 'candidate' | 'retired'`).
  - Item-edit audit trail: new `item_admin_actions` table per Q7.
  - Soft-delete columns on items: `rejected_at_ms` (bigint ms), `rejected_by` (uuid FK to users.id), `rejection_reason` (nullable text).
  - Embedding-regeneration on edit semantics: Q5 resolution determines which edits trigger regen.
  - Validator one-shot Vercel Workflow shape per Q10.
  - Pressure-cell prioritization in admin queue surfacing per §0.7.

### §0.3 PROMOTION CANDIDATE state

- **Candidate 1 — Redirector-spec error caught at executor audit-step boundary.** RETIRED at `a8d83bf` (promoted to SPEC §6.14.43 with five anchor instances + four sub-types: path/reference, methodology, content-formatting, implicit-resolution-selection). Three additional instances banked during this round-prep:
  - **Instance #6:** three-assumption-decomposition pattern at the prior `e9f1254`-anchored commit-0 prompt. The redirector pre-decomposed the 9-commit drift's disposition into three assumptions (A: Round 3 ad-hoc; B: sidecar #2 in-flight; C: triage cleanup docs-only) with STOP triggers; two of three (B + C) falsified. Borderline sub-type 4 — explicit STOP triggers mitigated risk, but the assumption-decomposition pattern still carried implicit-resolution risk. Banked at the prior STOP report.
  - **Instance #7:** commit-message-vs-diff inversion on `fa1c081` (sidecar #2 framing was a misread of past-tense narrative). Sub-type 1 territory. Banked at `955ad1d` audit-log §2.
  - **Instance #8 (NEW sub-type 5: propagation-through-prior-audit-log):** `955ad1d` audit-log §7.4 made an unjustified leap from "TopNav has no role affordances" (narrow finding from `32bbbd4` diff probe) to "Q8 'greenfield' framing holds" (broad generalization). The prior commit-0 prompt absorbed §7.4's claim and presented it as confirmed empirical state. Executor's audit at the prior commit-0 attempt caught it via grep `"admin\|role\|permission" src/`. Distinct from the four established sub-types: this isn't path/reference (the audit-log path was correct); not methodology (the audit-log methodology was reasonable); not content-formatting (no formatting issue); not pure implicit-resolution-selection (the resolution was made earlier at the audit-log §7.4 level, not at the prompt level). Sub-type 5 captures the propagation chain itself: a leap upstream becomes an asserted fact downstream, multiplying as the chain continues. Banked at this commit; SPEC §6.14.43 entry amendment to add sub-type 5 to the four-sub-type taxonomy folds at round-close per §3.
- **Candidate 2 — Sidecar-as-default-narrow-scope-envelope.** UNCHANGED at 3/5 (score-goals + tooling-reliability-debug + selection-engine sidecar). This round does not ship as a sidecar; will not advance the candidate. Stays in DEFER.
- **Forensic note (round-prep evidence):** SPEC-B (`d592107`) and SPEC-B-followup (`e9f1254`) are two §6.14.41 audit-vs-revert blindness repayments of the same parent commit (`81819e0` triage retirement) within the same round-prep sequence. Forensic evidence that retirement-via-header-banner-only patterns systematically under-clean. Forward-watch: if a future retirement commit triggers a third repayment cycle, candidate for new §6.14 entry on retirement-commit-under-cleaning patterns. Recorded in §0.9.

**Round-prep + §1 instance updates (recorded for round-close §3 SPEC §6.14.43 entry amendment evaluation):**

- **Instance #6** — three-assumption-decomposition pattern at prior commit-0 attempt (banked at prior STOP report).
- **Instance #7** — commit-message-vs-diff inversion on `fa1c081` (banked at `955ad1d` audit-log §2).
- **Instance #8** — propagation-through-prior-audit-log (NEW sub-type 5; banked at `d3d3b2a` plan-doc §0.3).
- **Instance #9** — propagation-within-plan-doc (sub-type 5 territory; banked at `a0a8bb7`).
- **Instance #10** — redirector-code-draft-vs-project-convention-deviation (ongoing forward-watch; cumulative ~21 deviations across §1.2 commit-0 / commit-1 / commit-2 / §1.3 commit-0 / §1.3 commit-2; sub-type 4 pattern). Examples: `?? 0` fallback bans; `as Record<string, unknown>` casts replaced with Zod safeParse; `console.log` replaced with logger.info; `||` outside conditional position; `tier: "easy" as const` redundancy; cognitive-complexity refactors; pointless-indirection inlines; `require-logger-before-throw` violations; `noUnusedTemplateLiteral`.
- **Instance #11** — implicit-resolution-selection via metric-conflation (sub-type 4; banked at `8c4dff7` production-batch postverify `hasAnyFlag` re-baseline). The redirector's prompt expected ~435 `hasAnyFlag` candidates but the engine's union semantics produced 791; the conflation was between provenance-batch-reject criterion flag rate and engine aggregate `hasAnyFlag` rate.

Round-close §3 SPEC §6.14.43 entry amendment evaluates whether instances #8 + #9 share sub-type 5 (likely YES — both are canonical-source-deviation-multiplied-via-restatement) and whether instances #10 + #11 deserve a sub-type 6 (redirector-draft-vs-project-state divergence; distinct from sub-type 1 path/reference because the deviation surfaces at lint / postverify boundary, not at file-path boundary).

**§2 phase instance updates (recorded for round-close §3 SPEC §6.14.43 entry amendment evaluation):**

- **Instance #12** — TopNav-not-used-in-admin (sub-type 4 + 5 propagation). §0.5.2 framing inherited the audit-log §7 framing of `<PageNav>` consuming `<TopNav>` and "mounted on the new /admin/review route". Verified at §2.1 commit-0 audit step 6: admin routes do NOT render `<TopNav>`. `/admin/ingest` precedent renders chrome-light (no top nav); the auth-gate at the layout level is sufficient context. Banked at `50b91c7`.
- **Instance #13** — test infrastructure assumption (sub-type 1 path/reference). The §2.1 commit-0 redirector spec proposed JSX-render tests assuming React Testing Library or similar; codebase has no React component test infrastructure. Executor shifted tests to extracted pure-function helpers (`queue-filters.ts` + `parseAdminQueueItem` in `queue-data.ts`) — same coverage outcome via a project-canonical pattern. Banked at `50b91c7`.
- **Instance #14** — embedding scope misstatement (sub-type 5 propagation-through-prior-design). §0.6.4 Q5's embedding-regen policy lists *"body, optionsJson text"*. Verified at §2.3 commit-0 audit step 12: actual embedding scope is body-text only at both call sites (`embedding-backfill-steps.ts:64`, `sibling-generation-steps.ts:408`); neither call appends option text or explanation. RegenReason type collapsed to single `{ kind: "body-edit" }` variant matching actual scope. Banked at `a075d47`.
- **Instance #15** — edit-audit-row shape misstatement (sub-type 5 propagation-through-prior-prompt). The §2.3 commit-1 redirector spec said "before_json + after_json for changed fields only" and the §2.5 commit-0 prompt's heads-up restated the projection claim; actual `submitEditAction` implementation at §2.3 commit-1 writes FULL row snapshots (all 7 editable columns), per §0.6.6 Q7's canonical "full item snapshots" framing. Reconciled at §2.5 commit-0 audit step 12; `diffChangedKeys` audit-history-rendering helper does JSON.stringify value-comparison per key so it works regardless of whether audit rows are projections or snapshots. Banked at `d67a166`.
- **Instance #16** — validator pressure-cell zero-everywhere skip (sub-type 5 propagation-through-prior-design). The §1.2 commit-0 validator design's `loadPressureCells` iterates query-derived sub-types only (cells.map(c => c.subTypeId)), silently skipping sub-types with zero live items in any tier; the §2.6 dashboard at `pressure-cell-data.ts` iterates the canonical `@/config/sub-types` `subTypeIds`, so every sub-type contributes hard + brutal cells regardless of live state. Validator misses candidates in zero-everywhere sub-types for `validatorResult.isPressureCell`. Forward-pin: align validator at a future round so candidate marking matches the dashboard semantics. Banked at `ce09e81`.
- **Instance #17** — round-close-prompt commit-ledger omission (sub-type 1 path/reference + sub-type 5 propagation). The §2 round-close redirector prompt's "Verify §2 commit hashes are sequential" enumeration listed 16 expected commits but missed `3831c4e (§2.2 commit-0 — admin item-detail route + tabbed shell + provenance/sibling context)` between `50b91c7` and `36df558`. Caught at this commit's audit step 15. The §0.8.2 phase summary table includes the §2.2 row + the corrected substantive/drift commit counts (10 substantive + 2 sessionStorage + 5 drift, not 9 + 2 + 4 as the redirector framed). Banked at this commit.

**Note on canonical sub-type assignments post-§3 commit-1 SPEC amendment (`d6d1502`).** The plan-doc instance entries above record sub-type assignments AT TIME OF BANKING (forensic record). SPEC §6.14.43's instance-ledger table is the canonical post-amendment classification; differences:
- Instance #10: plan-doc says "sub-type 4 pattern"; SPEC reclassifies to **sub-type 6** (NEW; promoted at `d6d1502` per cumulative deviation count).
- Instance #12: plan-doc says "sub-type 4 + 5 propagation"; SPEC simplifies to **sub-type 5** (propagation dominates the catch mechanism).
- Instance #17: plan-doc says "sub-type 1 + 5 propagation"; SPEC simplifies to **sub-type 5** (same reasoning).

Future sub-type lookups consume SPEC §6.14.43; plan-doc entries are preserved for the forensic narrative of how each instance was understood at the time of banking.

**§6.14.40 reconciliation summary (Phase 4 sub-phase b):**

Five drift commits absorbed across §2 work via §6.14.40 reconciliation pattern. Each classified at the relevant per-commit HEAD-pin audit step 1 STOP, allowing execution to proceed against the new HEAD:

| # | Hash | Subject | Classification | Absorbed at |
|---|---|---|---|---|
| 1 | `5c5a5dd` | docs/claude_logs session log | (a) docs-only | pre-§2.1 commit-0 audit |
| 2 | `36df558` | sign-out button on top-nav | (a) aesthetic, non-admin | pre-§2.3 commit-0 audit |
| 3 | `920f7c9` | Next.js 16 Cache Components compat | (b) source-touching compatible | pre-§2.3 commit-0 audit |
| 4 | `800a989` | provenance + stem-options styling | (b) source-touching compatible | pre-§2.3 commit-0 audit |
| 5 | `3ac77ae` | sign-out button on diagnostic page | (a) aesthetic, non-admin | pre-§2.4 commit-0 audit |

Pattern observation: §6.14.40 discipline (HEAD-pin STOP + classification + reconciliation) prevented all 5 drifts from contaminating in-flight commit scope. Executor's audit step 1 STOP semantics caught each drift before authoring; the redirector ratified classification before proceeding.

The two source-touching drifts (#3 + #4) deserved explicit ratification because they intersected the §2 admin-review surface: `920f7c9` added `await connection()` to admin loaders for Next.js 16 Cache Components compatibility (consistent with §2.5+ patterns and adopted by all subsequent admin-side loaders); `800a989` reshaped `stem-options-tab.tsx` and `provenance-tab.tsx` CSS (purely visual, no semantic change). Both preserved verbatim in §2.3 commit-0+ work.

### §0.4 §6.14.43 sub-type 4 + 5 discipline application

Explicit declaration of the discipline state and ratifications applied at this commit:

- **Posture B ratified pre-round-open by redirector.** Recorded as ratified, not re-deliberated. Q4 (posture choice) and Q9 (phase ordering) — RESOLVED via Posture B.
- **Decision A (SPEC-section disposition):** SPEC-B + new top-level SPEC section. RATIFIED at `d592107` open. EXECUTED at `d592107` + `e9f1254`. Validator+admin SPEC content lands as a new top-level §14 (per audit step 16 proposal) authored as part of §1 round-close.
- **Decision B (audit-log file path convention):** hybrid ratified — `scripts/_logs/<date-prefix>_<topic>.md` for round-prep audit-logs combining empirical content with a date-tied scope. Ratified at `955ad1d` open.
- **Decision C (streak anti-scope):** single-sentence anti-scope sufficient ("This round does not modify the streak feature; admin routes mount the same TopNav and inherit the streak chip without modification."). Ratified pre-`955ad1d`.
- **Decision D (post-§7.4-correction):** Q8 framing reuses `requireAdminEmail()` from `src/server/auth/admin-gate.ts`. Audit-log file preserved as forensic record per Path 1 (no in-place amendment). Plan-doc carries explicit correction in §0.1 reconciliation block. RATIFIED post-executor-catch at the prior commit-0 attempt's STOP.
- **Q1, Q2, Q3, Q5, Q6, Q7, Q8, Q10 — open at this commit;** §0.6 proposes resolutions with reasoning-for + reasoning-against + confidence; redirector ratifies at stop-and-report before §1 opens. Q8 framing now anchored to existing infrastructure rather than greenfield extrapolation per Decision D.

### §0.5 Posture B + post-Round-3 anchor patterns + admin-gate reuse

#### §0.5.1 Posture B ratification

Posture B (validator-then-admin) ratified pre-commit-0:
- Validator filters first; admin reviews flagged subset.
- Human-in-the-loop ratio = empirically determined by validator flag rate (see §0.6 Q2).
- Convergence = both pass (validator flag-cleared + admin approve).
- Adversarial robustness = layered (validator catches mechanical defects; admin catches judgment-class defects).

Phase order: §1 validator engine + promotion workflow + admin allowlist → §2 admin review UI → §3 round close.

#### §0.5.2 Post-Round-3 anchor patterns for §2

Per audit step 15, the following Round-3-shipped components are CONSUMED in §2 admin UI:

| Component | Path | Role in admin UI |
|---|---|---|
| `<PageNav>` | `src/components/nav/page-nav.tsx` | `"use client"` wrapper; consumes `loadNavChrome(userId)` promise via `React.use()`; renders the existing `<TopNav>`. Mounted on the new `/admin/review` route. |
| `loadNavChrome(userId)` | `src/server/nav/chrome.ts` | Server-side parallel-load of `{ initials, streakDays }`. Reused unchanged for admin routes. |
| Past-sessions review page | `src/app/(app)/review/page.tsx` + `src/server/review/data.ts` | Anchor for admin queue's paginated-fetch shape: server component initiates promise, `<Suspense>` per-page wrapper, `"use client"` view component consumes promise. |
| `<PostSessionShell>` (post-Round-3 tabbed review interface) | `src/components/post-session/post-session-shell.tsx` (post-`aa76394`) | Anchor for admin item-detail surface: tabbed structure (proposed tabs: stem+options / explanation / provenance / audit-history). |
| `<LatencyRangeSlider>` | `src/components/post-session/latency-range-slider.tsx` (post-`810c83a`) | Anchor for range-filter affordances in the admin queue (e.g., difficulty-range filter, embedding-distance-range filter). |
| `<WrongItemsBrowser>` | `src/components/post-session/wrong-items-browser.tsx` | Anchor for item-card rendering with status badges (Correct/Incorrect/Skipped → could extend to Approved/Flagged/Rejected for admin queue). |
| `<StructuredExplanation>` | `src/components/post-session/structured-explanation.tsx` | Anchor for rendering structured explanations (recognition/elimination/tie-breaker parts) inside admin item-detail. |
| `<ItemPrompt>` | `src/components/item/item-prompt.tsx` (post-triage-retirement; live) | Reused unchanged for rendering items as they would appear to users — admin-view fidelity. |

**Note on `<PostSessionShell>` slot ordering at HEAD:** post-`81819e0` triage retirement, the shell has 7 slots (slot 2 `<TriageScoreLine>` was deleted; slot numbering preserved as a gap per SPEC §10.7's slot-locking discipline). Admin item-detail surface should account for this when reusing rendering components.

**Empirical reframe at §2.1 commit-0 (`50b91c7`).** The plan-doc-time framing — `<PageNav>` consuming `loadNavChrome(userId)` and rendering the existing `<TopNav>` "mounted on the new `/admin/review` route" — was inherited from audit-log §7 which described `/(app)/` route nav patterns. Verified at §2.1 commit-0 audit step 6: admin routes do NOT render `<TopNav>`. `/admin/ingest/page.tsx` precedent renders chrome-light: a `<main class="mx-auto max-w-3xl px-6 py-10">` with header copy, no nav surface. The auth gate at `(admin)/layout.tsx` is sufficient context — admin pages don't need parent-facing affordances (streak chip / initials menu) because they're operator surfaces, not student-facing pages. The `/admin/review` route + child item-detail route both follow this convention; the §0.5.2 table row for `<PageNav>` is no longer load-bearing for §2 work. §6.14.43 instance #12 banking; corrected at `50b91c7`.

#### §0.5.3 Admin auth reuse (per Decision D ratification)

The validator+admin round reuses the existing admin-gate infrastructure rather than introducing parallel role-shaped infrastructure. Key paths:

- **`src/server/auth/admin-gate.ts`** — exports `requireAdminEmail(): Promise<AdminContext>` where `AdminContext = { userId: string, email: string }`. Throws `ErrUnauthorized` on missing session, missing email, missing user id, or email not in allowlist. The function is the canonical project admin gate per PRD §3.1.
- **`src/config/admins.ts`** — `adminEmails: ReadonlyArray<string>` (currently empty). Adding admin emails here grants admin access via Google OAuth session match. The validator+admin round adds at least one admin email as part of §1 implementation.
- **`src/app/(admin)/layout.tsx`** — calls `requireAdminEmail()` at the route-group level; all admin routes inherit the gate. The new `/admin/review` route lands under this layout.
- **`src/app/(admin)/_admin-gate-client.tsx`** — client-side gate component consuming `AdminContext`.
- **`src/app/(admin)/admin/ingest/`** — existing admin route + `actions.ts`. Demonstrates the canonical admin-server-action pattern: each action calls `requireAdminEmail()` at the start, then runs its scoped work.
- **`src/proxy.ts`** middleware comment confirms the architecture: `/api/admin/*` for scripted/curl access (`Authorization: Bearer ${CRON_SECRET}` self-guard); `(admin)/admin/*` for form-based admin (server actions + `requireAdminEmail()`).

The new `/admin/review` route group lands at `src/app/(admin)/admin/review/` alongside the existing `/admin/ingest`. All admin server actions in the validator+admin round call `requireAdminEmail()` at entry; the returned `userId` populates `item_admin_actions.admin_user_id` per Q7.

#### §0.5.4 Architectural skeleton

- §1 introduces:
  - Schema migration: items.status enum extension (add `'rejected'`); rejected_at_ms + rejected_by + rejection_reason columns on items; new item_admin_actions table.
  - Admin allowlist population: at least one admin email added to `src/config/admins.ts`.
  - Validator engine (Q1 auto-detectable criteria implementations).
  - Validator runner (Q10 one-shot Vercel Workflow batch over candidates).
  - Promotion workflow (admin approve → status='active' + cascade).
  - Validator tests + fixtures.
- §1 does NOT add `users.role` column. Does NOT introduce Auth.js v5 session-callback enrichment.
- §2 introduces admin UI under `/admin/review` route group consuming Round 3 anchor components.
- §3 closes (test count vs e9f1254 baseline; lefthook clean; §6.14.43 instance #6/#7/#8 banking record + sub-type 5 SPEC entry amendment; PROMOTION CANDIDATE 2 final state; pressure-cell residuals forward-pinned).

### §0.6 Open architectural questions — proposed resolutions

For each: question + proposed resolution + reasoning-for + reasoning-against + confidence (HIGH / MEDIUM / LOW). LOW + MEDIUM-confidence resolutions flagged at stop-and-report for redirector ratification before §1 opens.

#### §0.6.1 Q1 — Adversarial robustness criteria

**Question (verbatim from `selection-engine-session-attempted-ids-sidecar.md` §6 #1):** *"Adversarial robustness criteria for validator."*

**Proposed resolution.** Posture B = layered. Two criterion classes:

**Auto-detectable criteria (validator):**
1. **Schema-shape conformance.** Correct-answer is one of the `optionsJson` ids; option count matches sub-type convention; required fields (stem, options, correctAnswer, explanation when applicable) present and well-typed.
2. **Tier-distribution provenance-roundtrip.** (Reframed at §1.2 commit-2 — see line-190 empirical-reframe note below; original framing *"candidate's claimed tier matches generator's claim per provenance"* preserved here only for forensic continuity. Production semantics: verifies the candidate's id appears in the parent's provenance siblings list AND the provenance file's tier label matches the DB row's `difficulty`. Catches ingest-pipeline drift.)
3. **Embedding distance from seed item.** Cosine distance to the parent source item must be in a per-sub-type-tuned range: too-close (similarity > 0.97 or 0.95 depending on sub-type's templating tolerance per convergence-audit.md) → near-duplicate flag; too-far (similarity < some threshold to be empirically calibrated) → off-topic flag. Per sub-phase-a forward-pin, siblings are EXEMPT from source↔sibling similarity comparison; the validator runs sibling↔non-source-non-sibling comparison normally (per `nearestNeighborInBank(subTypeId, embedding, { excludeParentItemId, excludeSiblingItemIds })` API shape forward-pinned at sub-phase a §4.13).
4. **Per-sub-type structural rules.** E.g., letter_series has the expected letter-pattern shape; numerical sub-types have numeric correctAnswer values; verbal antonyms options should not duplicate the stem word. Implementation: per-sub-type validator function selected via dispatch.
5. **Heuristic detectors for known sub-phase a failure modes.** Per convergence-audit.md (audit step 13):
   - `numerical.lowest_values:*` cells: TEMPLATING ARTIFACT (97.5% convergence by design — repeated phrasing "Which number has the lowest value?" / "Which expression has the lowest value?"). Validator should NOT flag these as near-duplicates; the cell-level near-duplicate check has a per-sub-type whitelist for templating-by-design cells.
   - `verbal.antonyms`: real convergence at 37.9% (e.g., 6 candidates all asking "opposite of 'frugal'"). Validator should flag these as candidate-set redundancy; admin decides whether to keep one or several.
   - `numerical.number_series`: 5.6% real convergence; minor but present.
6. **Provenance-based batch-reject heuristic.** If a generator-run with a specific `promptHash` or `templateVersion` produces candidates that systematically fail one of the above criteria at high rate (e.g., > 20%), the validator flags the entire generator-run for admin batch-reject review. Surfaces at admin queue's pressure-cell dashboard.

**Human-judgment criteria (admin):**
1. **Stem clarity / ambiguity.** Mechanical schema-conformance doesn't catch a stem that's grammatically valid but semantically ambiguous; admin reads and judges.
2. **Trap quality for trap-avoidance items.** A trap-avoidance item's correctness depends on the trap being subtle enough to be tempting but not so subtle the test-taker has no chance; this is judgment.
3. **Difficulty-tier judgment.** Does the candidate actually feel like its claimed tier? Validator's tier-distribution criterion verifies ingest-pipeline provenance-roundtrip (per §0.6.1 #2 reframe at §1 round-close); admin catches the emergent feel.
4. **Cultural / accessibility issues.** Idioms that don't translate; references that assume specific cultural background; disability-relevant rendering issues.

**Reasoning-for:** Layered detection separates concerns. Auto-detectable criteria dispose of mechanical defects at scale (the 1,748 candidates × ~6 auto-criteria = ~10,500 mechanical checks the admin doesn't do). Human-judgment criteria reserved for genuine judgment, capping admin workload at the flagged-subset size. The convergence-audit.md empirical findings (templating-artifact whitelist; antonyms convergence flagging) ground the heuristics in observed-not-imagined behavior.

**Reasoning-against:** Validator false-positives create admin overload (every flagged candidate consumes admin time even if mechanically the validator is wrong). Validator false-negatives waste admin time on items that should have been auto-rejected (admin sees a clearly-broken item that mechanical rules should have caught). The thresholds (similarity-too-close / similarity-too-far / generator-run-fail-rate-too-high) are EMPIRICAL and need calibration during §1 implementation; first-cut thresholds will be wrong in some direction. Embedding-distance criterion runs against sequential-scan-only state (no HNSW/IVFFlat index); pairwise-comparison cost is O(n²); at ~1,700 candidates ≈ 3M comparisons; performance acceptable at v1 scale but degrades super-linearly. If the comparison batch becomes a §1 implementation bottleneck, surface as a residual rather than introducing the index in-round (per §0.2 anti-scope).

**Confidence: MEDIUM.** The criteria SET is principled and empirically grounded. The THRESHOLDS are empirical-not-design and will require calibration during §1 implementation. The embedding-distance criterion's performance characteristic is acceptable at v1 scale but a known forward-pin. **Flagged for redirector ratification at stop-and-report.**

**Empirical reframe at §1.2 commit-2 (`965a056`)** — tier-distribution criterion (#2 above): the plan-doc-time framing *"candidate's claimed tier matches generator's claim per provenance"* was structurally degenerate at v1 because `items.difficulty` IS the LLM-emitted tier (siblings inserted by `siblingGenerationWorkflow` get `difficulty = <tier-key>` from the LLM payload's keyed-by-tier structure). There is no separate "actual" to compare against "claimed." Criterion reframed to **provenance-roundtrip verification**: verifies the candidate's id appears in parent's provenance sibling list AND the provenance file's tier label matches the DB row's difficulty. This catches ingest-pipeline drift (rare but possible: a mid-pipeline tier-label flip). Criterion verdict semantics unchanged (pass/flag/error); reason text updated to reflect provenance-roundtrip semantics. Full implementation in `src/server/validator/criteria/tier-distribution.ts` doc-comment.

**Calibration directive scope clarification (§1.3 commit-1 finding)**: the *"loosen if flag rate >40%; tighten if <2%"* directive applies to **tunable criteria only** (embedding-distance per-sub-type ranges, sub-phase-a-failure-modes antonyms-convergence cosine, provenance-batch-reject cohort-failure-rate threshold). Structural criteria (schema-shape, tier-distribution, per-sub-type-structural) have no tunable threshold; their flag rates report candidate-quality signal, not tuning state. At §1.3 commit-1 dry-run: schema-shape 0%, tier-distribution 0%, per-sub-type-structural 0.12% — all reading as "structurally clean candidate corpus" not as "thresholds too tight." Calibration-cycle ratification path is the dry-run output's tunable-criterion subset only.

#### §0.6.2 Q2 — Human-in-the-loop ratio measurement

**Question (verbatim from `selection-engine-session-attempted-ids-sidecar.md` §6 #1):** *"Human-in-the-loop ratio."*

**Proposed resolution.** Posture B = "some percentage." The ratio is **measured post-hoc** as `admin-reviewed / total-candidates`. The validator's flag policy is the design knob; the ratio falls out as a function of the flag policy and the candidate distribution.

**Initial flag policy:**
1. Flag any candidate that fails ANY auto-detectable criterion per Q1.
2. Flag any candidate that sits in a pressure cell (per §0.7 — cells with 0–1 live items at hard or brutal tier; brutal-tier-empty cells; the three numerical hard-tier-of-1 cells empirically identified).

The first rule guarantees admin attention on suspect items; the second rule guarantees admin attention on candidates that, if approved, would relieve bank-pressure debt. Pressure-cell flagging is the **δ-branch operationalization** of the selection-engine sidecar's δ-branch fix (the fix that retired-as-reframed during the sidecar — "validator round un-defer" was the chosen vehicle).

**Expected ratio range:** with 1,748 candidates audited per convergence-audit.md and a per-sub-type-aware flag policy, expected admin-review count is on the order of 200–400 (auto-failures) + pressure-cell cohort (sized by current bank state — query at §1 commit 0). Ratio range: 12–25%. The ratio is INFORMATIONAL; the design knob is the flag policy.

**Reasoning-for:** Pressure-cell flagging guarantees admin attention on the items that matter most for live-bank correctness (selection-engine sidecar empirical finding: full-length tests at decile 5 want 4–5 brutal slots; bank holds 6 brutal items; pigeonhole). Auto-fail flagging guarantees admin attention on suspect items. Combined, the policy is conservative (over-flag rather than under-flag) — better to have admin time wasted on a clean item than have a broken item ship.

**Reasoning-against:** Pressure-cell-pass items still consume admin attention even when validator already cleared them (low yield: admin spends time on items the validator says are fine). Inflates admin workload. Mitigation: pressure-cell candidates that the validator clears with high confidence sort to top of queue (§0.7 — fastest admin throughput on most-likely-to-ship items).

**Confidence: MEDIUM.** Tunable via flag policy; first cut is conservative. **Flagged for redirector ratification.**

#### §0.6.3 Q3 — Convergence criteria

**Question (verbatim from `selection-engine-session-attempted-ids-sidecar.md` §6 #1):** *"Convergence criteria (when does validation 'complete'?)."*

**Proposed resolution.** Two convergence levels:

**Per-item convergence:** validator-clear + admin-approve → `status='active'`. The state machine:
- `'candidate'` (current) → validator runs → either:
  - validator pass + auto-approve route → `'live'` (NOT yet implemented — would skip admin; deferred unless explicitly enabled).
  - validator pass → flagged for admin review → admin approves → `'live'`.
  - validator fail (any auto-criterion) → flagged for admin review → admin approves with edit → `'live'`; admin rejects → `'rejected'` (new status value per Q6).
  - admin rejects without explicit edit → `'rejected'`.

**Round-level convergence:** sub-phase b "completes" when EITHER:
- All pressure cells filled to a target (e.g., brutal tier ≥ 1 item per sub-type for the 14 sub-types; hard-tier-of-1 cells raised to ≥ 3 items each). This is the **δ-branch closure** condition.
- OR queue-empty (all candidates dispositioned: approved or rejected).
- Whichever ships first as a coherent v1 live bank.

Sub-phase b does NOT need to clear all candidates; it needs to close pressure-cell debt. Remaining candidates carry forward to a future bank-completion round.

**Reasoning-for:** Pressure-cell debt is the bug-driver per selection-engine sidecar's empirical findings (12% bug rate Wilson CI on `fullLengthNoReServe`; pressure cells empirically identified). Admin time is finite; clearing pressure cells unlocks correctness wins faster than clearing the full queue. The two-level convergence (per-item + round-level) lets the round close even if the queue is non-empty, as long as bank-pressure debt is resolved.

**Reasoning-against:** Round-level convergence at "pressure cells filled" leaves a partial bank; future rounds need to clear residual candidates. Could result in candidate-debt accumulating across rounds. Mitigation: round-close residual records the unprocessed-candidate count + pressure-cell residual; future rounds can resume.

**Confidence: HIGH.** Pressure-cell-first is empirically grounded (selection-engine sidecar's δ-branch reframing); two-level convergence is standard practice for bounded-time human-in-the-loop processes.

#### §0.6.4 Q5 — Edit semantics

**Question.** Which fields can admin edit on a candidate?

**Proposed resolution.** Full editability:
- `body` (stem text).
- `optionsJson` (option text + ids; ids stay opaque/UUIDv7).
- `correctAnswer` (must match one of `optionsJson` ids post-edit; validator re-runs schema-shape conformance per Q1).
- `explanation` (text).
- `metadataJson.structuredExplanation` (recognition/elimination/tie-breaker parts; if present).
- `metadataJson` ad-hoc tags (admin-flagged, admin-notes; new keys reserved at admin namespace).
- `subTypeId` (re-bucket the item; elevated audit weight — changes the item's primary cell).
- `difficulty` (re-tier the item; elevated audit weight — changes the item's per-sub-type cell).

**Embedding regeneration policy.** Triggered on edits to:
- `body`
- `optionsJson` text (text changes only; id changes do not trigger regen since the embedding is text-driven).
- `metadataJson.structuredExplanation` (no — embedding is from body+options only per `embedText` shape; verify in §1.3 implementation)

Per `src/server/generation/embeddings.ts`, the embedding model is `text-embedding-3-small` at 1536 dims via OpenAI API (`EMBEDDING_MODEL` constant). Per convention with `ingestRealItem`, the embedded text is the body text (single-pass embed of the question stem). The exact input shape is implementation detail confirmed at §1.3; the regen rule is "any edit to whatever feeds the embedding triggers regen."

**Empirical reframe at §2.3 commit-0 (`a075d47`).** The plan-doc-time framing *"body + options text"* (above) was inaccurate. Verified at §2.3 commit-0 audit step 12: actual embedding scope is **body-text only** at both call sites (`src/workflows/embedding-backfill-steps.ts:64`, `src/workflows/sibling-generation-steps.ts:408`). Neither call appends option text or explanation. `RegenReason` type collapsed to a single `{ kind: "body-edit" }` variant matching actual scope; `enqueueEmbeddingRegen` (Path A helper landed at §2.3 commit-1) takes the new body text as input and emits the regenerated 1536-dim vector. Practical consequence: edits to options text alone do NOT trigger embedding regen at v1; only stem-text edits do. §6.14.43 instance #14 banking. Forward-extension: if a future criterion needs option-text or structured-explanation embeddings, `RegenReason` variants extend in lockstep with the call-site scope.

**Audit weight escalation.** `subTypeId` and `difficulty` changes are recorded with `action_type='edit'` but flagged in the `before_json`/`after_json` snapshot pair as "bucket-change" for audit-trail filtering. Reason field strongly recommended for these edits.

**Reasoning-for:** Full editability lets admin fix small defects (typo in stem; wrong correct-answer marker; minor option-text rephrasing) without a full reject-regenerate cycle, dramatically improving admin throughput on borderline-but-fixable candidates. Embedding regen on content edit keeps semantic search consistent. Audit weight escalation on subType/difficulty changes preserves the bank's curated structure.

**Reasoning-against:** Mass edits could drift the bank from its original generator-curated shape (a sub-type's antonyms cell, edited heavily, may diverge from the cell's "feel"). Full editability raises audit-trail importance — the `item_admin_actions` table per Q7 carries the load. Embedding regen on edit is a cost surface (OpenAI API per edit); rate-limiting consideration deferred to §1 implementation. For sub-phase a's working-set of 1,748 candidates, even 100% edit rate at v1 is manageable cost (~$0.02 per 1000 embeddings at text-embedding-3-small).

**Confidence: MEDIUM.** Embedding regen cost is a known forward-pin; sub-type/difficulty edit semantics carry empirical risk. **Flagged for redirector ratification.**

#### §0.6.5 Q6 — Removal semantics + status enum extension

**Question.** Soft-delete vs hard-delete for rejected candidates? How does this interact with the existing `status` enum?

**Proposed resolution.** **Soft-delete via NEW status value `'rejected'`.** Items table `status` enum extends from `'live' | 'candidate' | 'retired'` (current per `src/db/schemas/catalog/items.ts:11`) to `'live' | 'candidate' | 'retired' | 'rejected'`.

Two rejection axes are now distinguishable:
- **`'retired'`:** authored for empirical-stats-out-of-band per PRD §3.2 step 6 (*"After 20 real-user attempts, compute observed accuracy and median latency. If they're far off, retire to status: retired"*). This is empirical-driven retirement.
- **`'rejected'`:** admin-judged-bad. This is human-driven rejection at validator+admin time, before the item ever serves users.

Three new columns on `items`:
- `rejected_at_ms` (bigint, nullable) — UTC ms timestamp of admin rejection.
- `rejected_by` (uuid, nullable, FK to users.id with ON DELETE SET NULL) — admin who rejected.
- `rejection_reason` (text, nullable) — admin's free-text justification.

Cascade safety: `attempts.itemId` references `items.id` with **NO CASCADE** per `src/db/schemas/practice/attempts.ts:13-15` (audit step 11 verified). Soft-delete on items is safe; existing attempts pin items but don't break. Candidate-status items are NEVER served per `src/server/items/queries.ts` filter shape (verified by audit step 11's expected-state but not directly grep-confirmed at this audit; §1.3 implementation cross-checks).

**Production query filter shape.** All production drill / diagnostic / full_length queries filter by `WHERE status = 'live'`. The validator+admin round adds NO new query-filter logic for `'rejected'`; the existing `status` filter excludes both `'rejected'` and `'retired'` from production paths (since both are non-`'live'`).

**Reasoning-for:** Soft-delete preserves rejection history for generator-quality analysis; rejection is reversible if admin was wrong (UPDATE status='candidate'); standard practice for audit-bearing systems. Two-axis rejection (admin-judged-bad vs empirical-stats-out-of-band) preserves debugging signal — when a generator run produces many `'rejected'` items, the prompt or template likely needs revision; when many `'retired'` items, the item-population mechanism is calibrated wrong (or users are using the items differently than expected).

**Reasoning-against:** Bloats items table over time. Mitigation: at v1 scale (1,748 candidates), table bloat is negligible; future bank-completion rounds can archive `'rejected'` items if needed.

**Confidence: HIGH.** Soft-delete is standard practice; audit trail is the value; status-enum extension is a low-risk migration; cascade safety verified.

**Spec correction at §1.1 commit**: column name `rejected_at_ms` (DB) / `rejectedAtMs` (schema property) per project `_ms` suffix convention on bigint epoch columns (PRD §8.1 + precedent at `users.createdAtMs` / `users.targetDateMs` / `users.emailVerifiedMs` / `candidate-promotion-log.decidedAtMs`). The §1.0 migration (a09b087) applied the convention correctly; this commit aligns plan-doc references in §0.2 (line 55), §0.5.4 (line 125), §0.6.5 (line 254), §0.8 (lines 393 + 408) to the canonical state.

#### §0.6.6 Q7 — Audit trail shape

**Question.** What's the shape of the item-edit audit trail?

**Proposed resolution.** New table `item_admin_actions`:

```typescript
const itemAdminActionType = pgEnum("item_admin_action_type", [
  "edit",
  "approve",
  "reject",
  "flag",
  "unflag"
])

const itemAdminActions = pgTable(
  "item_admin_actions",
  {
    id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
    itemId: uuid("item_id").notNull().references(() => items.id),
    adminUserId: uuid("admin_user_id").notNull().references(() => users.id),
    actionType: itemAdminActionType("action_type").notNull(),
    beforeJson: jsonb("before_json").notNull(), // empty object for first action on an item
    afterJson: jsonb("after_json").notNull(),
    reason: text("reason"), // nullable; required by app-level for reject; optional for others
    createdAtMs: bigint("created_at_ms", { mode: "number" })
      .notNull()
      .default(sql`(extract(epoch from now()) * 1000)::bigint`)
  },
  (table) => [
    index("item_admin_actions_item_id_created_at_idx").on(table.itemId, table.createdAtMs),
    index("item_admin_actions_admin_user_id_idx").on(table.adminUserId)
  ]
)
```

UUIDv7 + bigint ms conventions per project rules.

`adminUserId` references `users.id` directly; populated from `requireAdminEmail()` return value (`AdminContext.userId`). No `users.role` column required (per Decision D / §0.5.3).

`beforeJson` / `afterJson` carry full item snapshots at edit time. Storage cost: ~1–2 KB per action; at conservative estimate 5,000 actions over the round, ~10 MB — negligible.

**Reasoning-for:** Separation of concerns (audit trail in its own table, not bloating items.metadataJson with action history); doesn't pollute items table query shape; queryable per-item history via the composite index. The `before_json`/`after_json` snapshot pair is the canonical audit-of-change shape; allows replay-of-edits for forensics.

**Reasoning-against:** Extra join for displaying audit on item detail (mitigated by the per-item composite index covering the join). Storage cost for snapshot pairs (mitigated by negligible-at-v1-scale calculus above).

**Confidence: HIGH.** Standard audit pattern; aligns with project's UUIDv7 + bigint ms conventions; admin attribution via existing `requireAdminEmail()` return value.

**Empirical reframe at §2.5 commit-0 (`d67a166`).** The plan-doc framing above is correct (full item snapshots), but two intermediate session-prompt restatements drifted in the opposite direction: the §2.3 commit-1 spec said *"before_json + after_json for changed fields only"* and the §2.5 commit-0 prompt's heads-up restated the projection claim. Actual `submitEditAction` implementation at `4d90818` writes FULL row snapshots (all 7 editable columns) per the canonical Q7 framing here. Reconciled at §2.5 commit-0 audit step 12: `diffChangedKeys` audit-history-rendering helper at `action-history-shared.ts` does `JSON.stringify` value-comparison per key, so it works regardless of whether audit rows are projections or snapshots. UX consequence: edit entries always show `metadataJson` as changed because `submitEditAction` sets `validatorResult.staleAfterMs = Date.now()` on every edit (the staleness marker IS metadata that changed). Filtering or special-casing system-tracking metadata from the field-level diff is a v1.5 forward-pin per §0.9. §6.14.43 instance #15 banking.

#### §0.6.7 Q8 — Admin auth shape

**Question.** What admin auth shape does the validator+admin round introduce or reuse?

**Proposed resolution.** **REUSE `requireAdminEmail()` from `src/server/auth/admin-gate.ts`.** Add admin emails to `src/config/admins.ts` allowlist (currently empty per PRD §3.1 design intent — *"To grant admin access, add the user's Google account email here and ship a deploy"*). New `/admin/review` route group lands under `(admin)/layout.tsx` and inherits the allowlist gate via the layout-level `requireAdminEmail()` invocation. No `users.role` column. No new Auth.js v5 session-callback enrichment. No new migration beyond what Q6 + Q7 require for items + item_admin_actions.

Migration scope for Q8 alone: **single-line code edit** to `src/config/admins.ts` adding an admin email string to the `adminEmails` array, then ship a deploy.

**Reasoning-for:**
- **Project canonicality.** PRD §3.1 codifies email-allowlist as the canonical admin pattern; existing `/admin/ingest` route demonstrates the pattern in production with `(admin)/layout.tsx` + `requireAdminEmail()` + `(admin)/admin/ingest/actions.ts`. The validator+admin round is a coherent extension of this pattern, not a parallel infrastructure.
- **Audit attribution coverage.** `requireAdminEmail()` returns `{ userId, email }`; `userId` is the auth-table session user id, sufficient for `item_admin_actions.admin_user_id` per Q7. No additional session enrichment needed.
- **Smallest blast radius.** No schema migration to users; no Auth.js callback work; no new code surface to test.
- **Smallest deploy footprint.** Granting admin = one-line edit to a config file; revoking admin = one-line removal.

**Reasoning-against:**
- **Per-user role toggle requires code-and-deploy** rather than DB write. Users wanting per-user admin granularity at runtime need a different pattern (role column + admin UI to toggle). Mitigation: no v1 driver for per-user-role-toggle; if a future round needs it, the role column can be added then. The existing email allowlist is sufficient for v1 admin scope (a small, fixed set of admin emails).
- **Future role-set expansion** (e.g., "validator-only admin," "edit-only admin," "approve-only admin") would require column introduction. Mitigation: same as above — defer to a future round when there's an empirical driver.

**Confidence: HIGH.** Existing infrastructure (verified at audit step 12); canonical project pattern (PRD §3.1); minimal blast radius; full audit attribution coverage via existing `userId` return.

**Note on §6.14.43 instance #8 prevention.** The audit-log §7.4 originally claimed Q8 was "greenfield"; the executor's audit at the prior commit-0 attempt caught this via grep `"admin\|role\|permission" src/`. The corrective ratification (Decision D) anchored Q8 to the existing infrastructure. This plan-doc's Q8 framing is **explicit reuse**, not greenfield — preventing recurrence of the propagation chain.

#### §0.6.8 Q10 — Validator shape (one-shot vs continuous)

**Question.** Is the validator a one-shot batch over candidates, or a continuous pipeline running on new candidates as they're generated?

**Proposed resolution.** **§1 first runs validator as a one-shot Vercel Workflow batch** over the working-set candidates extant at `e9f1254`. The continuous-pipeline shape (validator runs on new candidates as they're generated, e.g., immediately after sub-phase a's `siblingGenerationWorkflow` completes) is the LATER form; deferred to a future sub-phase or made trivially extensible from §1's batch shape.

**Implementation extensibility.** §1's validator is implemented as a **callable function** that the workflow invokes per-batch. The function signature:

```typescript
// Conceptual; concrete typed signature decided at §1.3 implementation.
async function validateCandidate(itemId: string): Promise<ValidationResult>
```

Where `ValidationResult` captures pass/fail per criterion, embedding-distance computation result, structural-rule checks, etc.

The one-shot workflow (`validatorBatchWorkflow(input: { itemIds: string[] })`) iterates `validateCandidate(itemId)` per item. Future continuous pipeline calls `validateCandidate(itemId)` immediately after `siblingGenerationWorkflow` completes — same function, no refactor. The batch workflow is just one consumer of the callable.

**Vercel Workflow integration.** Sub-phase a's `siblingGenerationWorkflow` (per `src/workflows/sibling-generation.ts`) demonstrates the project pattern: workflow files are pure orchestration with `"use workflow"` directive; step bodies live in `*-steps.ts` files (e.g., `sibling-generation-steps.ts`) so the `@workflow/next` plugin's node-module guard sees no pino-reachable edge in the workflow file's import graph. Validator follows the same pattern: `validator-batch.ts` (workflow file, orchestration only) + `validator-batch-steps.ts` (step bodies with logic + logger calls).

**Reasoning-for:**
- **One-shot is the simplest viable v1 path.** The 1,748-candidate working set is finite; one-shot batch produces enough validator output to populate the admin queue.
- **Extensible architecture.** The callable-function shape lets continuous-pipeline land later as a single edge addition (sub-phase a's workflow chains into `validateCandidate` post-write); zero refactor to the validator engine itself.
- **Workflow durability.** Vercel Workflow's `"use step"` semantics give per-step retries; if a step (e.g., embedding fetch from OpenAI) fails transiently, the step retries without re-running upstream steps.

**Reasoning-against:**
- **One-shot batch leaves a gap if sub-phase a regenerates new candidates** mid-round. Mitigation: §0.2 anti-scope explicitly excludes sub-phase a regeneration during this round.
- **Workflow trigger UX is admin-action-driven** (admin clicks "run validator" in admin dashboard). Future continuous pipeline removes the human trigger. Mitigation: v1's admin trigger is acceptable; the workflow can also be triggered via `/api/admin/validator-run` for scripted access (per `src/proxy.ts` `/api/admin/*` self-guard with `Authorization: Bearer ${CRON_SECRET}` pattern).

**Confidence: HIGH.** One-shot for v1 is empirically appropriate; extensible architecture preserves continuous-pipeline option without requiring it now.

### §0.7 Pressure-cell prioritization (δ-branch operationalization)

The validator+admin round is the vehicle for the **δ-branch fix** that the selection-engine sidecar surfaced and reframed: targeted bank-growth in pressure cells (especially brutal tier and hard-tier-of-1 cells) is the actual fix to make session-soft fallback rarely fire. Sub-phase b promotes candidates → live in the cells that have empirical pressure.

**Empirical inputs** (pre-`810c83a` snapshot per selection-engine sidecar's commit-0 audit step (d); authoritative numbers from `§1` commit 0 dev-DB query):
- 2,150 total items / 439 live / 1,711 candidates at sub-phase-a close (handoff cite).
- 1,748 candidates at sub-phase-a commit-6-resume snapshot (convergence-audit.md cite). The two figures differ (1,711 vs 1,748) per snapshot timing; both stale relative to `e9f1254`.
- Brutal tier: 6 items live across only 3 of 14 sub-types. 11 of 14 sub-types have ZERO brutal-tier items.
- Hard-tier-of-1 cells: `numerical.fractions:hard=1`, `numerical.workrate:hard=1`, `numerical.averages:hard=1`.

**Authoritative numbers from §1 commit 0.** §1's first audit step queries the dev DB for `SELECT status, COUNT(*) FROM items GROUP BY status` and the full sub-type × tier matrices. These numbers replace the handoff and convergence-audit snapshots; subsequent §1 sub-section work cites them as authoritative.

**Admin queue prioritization:**
1. **Pressure-cell candidates flagged → top of admin queue.** Identified by `(sub_type_id, difficulty)` matching a pressure cell as defined by current live-bank state.
2. **Within pressure cells, sort by validator-confidence-score** (highest-confidence-pass first → fastest admin throughput on items most likely to ship).
3. **Pressure-cell debt dashboard at queue head.** Surfaces current pressure-cell residual count and the candidate cohort that could relieve each cell.

**Convergence trigger (per Q3):** sub-phase b round-level convergence at "all pressure cells filled to target" — pressure-cell debt is the pacing constraint; queue-empty is the alternative pacing constraint when all candidates have been dispositioned.

#### §0.7.1 Post-batch hasAnyFlag re-baseline (§1.3 commit-2 finding)

The plan-doc §0.7 originally framed *"~25.42% of candidates flag for admin review"* by carrying forward the `provenance-batch-reject` criterion's flag rate from §1.3 commit-1 dry-run. The empirical engine `hasAnyFlag` rate at §1.3 commit-2 production batch is **46.2% (791 of 1,711)**, computed as the union of:

- **435** candidates from criterion-6 cohort-batch-reject in three 100%-flagged cohorts (`verbal.analogies`, `numerical.lowest_values`, `verbal.antonyms`).
- **398** candidates from pressure-cell membership (with overlap with criterion-flagged).
- Individual criteria 1-5 flags in cohorts below criterion-6's 20% threshold.

Union (with overlap collapsed): **791** candidates with `hasAnyFlag = true`.

**§2 admin queue sizing implication**: queue surfaces ~791 items, not ~435. Sub-type-pattern taxonomy from the production batch's per-cohort flagged breakdown helps admin throughput:

- **Three cohort-rejection-pattern sub-types** (analogies, lowest_values, antonyms = 435 items, ~55% of queue): cohort-level decisions; admin reviews cohort archetype + applies decision en masse.
- **Eight pressure-cell-pattern sub-types** (word_problems, averages, percentages, ratios, fractions, critical_reasoning, speed_distance_time, workrate; mixed flags ~50% per sub-type): per-item attention.
- **Three clean sub-types** (sentence_completion, letter_series, number_series): sparse individual flags only (≤25% per cohort).

Admin time estimate: 6.6–19.8 hours total queue throughput at 30–90 sec/item review pace. Spreads across multiple sessions; pressure-cell prioritization (398 items) provides a natural first-priority cohort. Validator-confidence-score sort within pressure cells maximizes throughput.

**§6.14.43 instance #11 banking**: the original §0.7 framing conflated `provenance-batch-reject` criterion flag rate (25.42%) with engine `hasAnyFlag` aggregate rate (46.2%). Sub-type 4 (implicit-resolution-selection via metric-conflation). The redirector's §1.3 commit-2 prompt expected ~435 `hasAnyFlag`; postverify caught the divergence at 791. Banked at this round-close; round-close §3 records into SPEC §6.14.43 amendment evaluation.

#### §0.7.2 Pressure-cell metric dual-surface (§2.6 commit-0 finding)

Two pressure-cell metrics coexist post-`ce09e81`:

- **`queue.pressureCellCount`** (candidate-scoped, batch-time): counts CANDIDATES whose persisted `validatorResult.isPressureCell = true` from the §1.3 commit-2 production batch. The queue header surfaces this within whichever cohort tab is active. Helps admin prioritize queue work — *"which of my candidates were in pressure cells when the validator last ran?"*
- **`dashboard.totalPressureCells`** (cell-scoped, read-time): counts CELLS in the 14 sub-types × hard|brutal grid (28 positions) under target. Helps admin target the next live-bank slot to fill — *"which sub-type+difficulty needs more approvals to clear pressure?"*

Both metrics are correct; they serve different admin workflows. Numerical magnitudes differ: a single pressure cell holding 0 of 3 needed = 1 cell + 0 candidates. Per the §2.6 commit-0 working-set state at `ce09e81`: 16 pressure cells (5 hard + 11 brutal), 20 candidates needed to clear — versus the queue header's `pressureCellCount` (a different slice of the same DB).

**Two intentional divergences from the validator's `loadPressureCells` documented in `pressure-cell-data.ts`:**

1. The validator iterates sub-types derived from the live-cells query result (`cells.map(c => c.subTypeId)`), so a sub-type with ZERO live items in any tier is silently skipped — and therefore items in that sub-type's hard/brutal tier are NOT marked `isPressureCell` by the validator at batch time. The dashboard iterates the canonical `@/config/sub-types` `subTypeIds`, so every sub-type contributes hard + brutal cells regardless of live state. Dashboard's `totalPressureCells` can legitimately exceed the validator's `pressureCells.size` for empty sub-types.
2. `queue-data.pressureCellCount` and `dashboard.totalPressureCells` are the candidate-scoped vs cell-scoped surfaces named above. Same word in two registers.

**§6.14.43 instance #16 forward-pin**: validator alignment to iterate the canonical subTypeIds (so candidate marking matches the dashboard semantics) is deferred to a future round; not blocking — admins read the dashboard for the current cell-scoped state. Recorded in §0.9 forward-watch.

### §0.8 Phase shape

Provisional sub-section structure; revisable at each phase's commit-0 audit per §6.14.18/21/22.

#### §1 — Validator engine + promotion workflow + admin allowlist

- **§1.1** Schema migration: items.status enum extension (add `'rejected'`); items new columns (`rejected_at_ms`, `rejected_by`, `rejection_reason`); new `item_admin_actions` table per Q7.
- **§1.2** Admin allowlist population: add admin email(s) to `src/config/admins.ts`. **REPLACES the prior commit-0 attempt's "Auth.js role gating + session-callback enrichment" sub-section** — Q8 reuse means no role / session-callback work.
- **§1.3** Validator engine: implementations of Q1's auto-detectable criteria (schema-shape conformance; tier-distribution provenance-roundtrip per §0.6.1 #2 reframe; embedding-distance per `nearestNeighborInBank` with sibling exemption; per-sub-type structural rules; sub-phase-a-failure-mode heuristics including templating-artifact whitelist and antonyms convergence flagging; provenance-based batch-reject heuristic).
- **§1.4** Validator runner: `validator-batch.ts` Vercel Workflow over candidates; emits flag+pass dispositions; persists results (validator output landing as `metadata_json.validatorReport` keys per architecture_plan §2395 reservation, or as a new sibling table — decided at §1.3/§1.4 commit 0 audit).
- **§1.5** Promotion workflow: admin approve → status='live' + cascade (`metadata_json.promotedAt`, `metadata_json.promotedBy`); embedding regen-on-edit if Q5 edit landed during admin review.
- **§1.6** Validator tests + fixtures: unit tests for each Q1 criterion; fixtures sampled from sub-phase a candidates (with provenance preserved); integration tests at `validator-batch.ts` workflow level.
- **§1.7** §1 round-close: tests pass; lefthook clean; docs updated; §1 commit ledger.

##### §0.8.1 §1 phase summary (closed at `8c4dff7`)

§1 phase shipped across 8 commits between `d3d3b2a` (round-open) and `8c4dff7` (this round-close):

| # | Hash | Subject |
|---|---|---|
| 1 | `a09b087` | §1.0 — Schema migration: items.status enum extension (+`'rejected'`); rejected_at_ms / rejected_by / rejection_reason columns; item_admin_actions table. |
| 2 | `a0a8bb7` | §1.1 — Admin allowlist populated (`leonardiwata@gmail.com`); plan-doc Q6 spec correction (5 references). |
| 3 | `f171d35` | §1.2 commit-0 — Validator engine architecture: interface contracts, criterion stubs with intentional error verdicts. |
| 4 | `b792f45` | §1.2 commit-1 — `promptHash` backfill for sub-phase a candidates (1,711 rows; 14 cohorts; §6.14.31 destructive-operation-gate). |
| 5 | `965a056` | §1.2 commit-2 — Six criterion implementations + 26 tests. Tier-distribution reframed at empirical finding. Single-pass engine; two-phase deferred to runner. |
| 6 | `fe737fa` | §1.3 commit-0 — Validator batch runner architecture: workflow + steps + thresholds module + dry-run CLI. Persistence schema decision: `metadata_json.validatorResult`. |
| 7 | `30f1757` | §1.3 commit-1 — Threshold tuning iteration: embedding-distance defaults loosen (`defaultMin` 0.5→0.3, `defaultMax` 0.97→0.99). Cascade observed; `provenance-batch-reject` unwinds 82.70%→25.42%. |
| 8 | `8c4dff7` | §1.3 commit-2 — Production batch run: 1,711 candidates written transactionally with `validatorResult` sub-objects; thresholds-hash anchored; §6.14.31 destructive-operation-gate complete. |

**§1 deliverables:**

- **Schema:** items table extended (rejected_at_ms / rejected_by / rejection_reason); item_admin_actions table created; status enum 4 values.
- **Admin auth:** `requireAdminEmail()` allowlist populated with `leonardiwata@gmail.com`; `(admin)/layout.tsx` gating active.
- **Validator engine:** 6 criterion implementations; ValidationContext builder with pre-loaded maps; two-phase orchestration at runner level; calibrated thresholds (embedding-distance min=0.3 / max=0.99 defaults + per-sub-type overrides; antonyms-convergence 0.95; provenance-batch-reject 0.20).
- **Production batch:** 1,711 candidates carry `validatorResult`; thresholds-hash `sha256:111f631af48157...` anchors the calibration; reproducibility surface in place.
- **Tests:** 204/0/21/823 baseline (+32 tests since round-open `d3d3b2a`).

**Empirical findings landed in §0:**

- §0.6.1 #2 tier-distribution reframe (provenance-roundtrip verification).
- §0.6.1 calibration directive scope clarification (tunable-criteria only).
- §0.7.1 `hasAnyFlag` re-baseline (791 candidates flagged, not 435).
- §0.3 §6.14.43 instance ledger update (instances #6–#11 banked).

§2 phase opens against `8c4dff7` with admin queue surfacing 791 flagged candidates ranked by validator-confidence-score with pressure-cell-first sorting.

##### §0.8.2 §2 phase summary (closed at `ce09e81`)

§2 phase shipped across 10 substantive commits + 2 sessionStorage UX-persistence commits + 5 aesthetic/compatibility drift commits between `bd2820f` (§1 round-close ancestor) and `ce09e81` (§2.6 commit-0):

| # | Hash | Subject |
|---|---|---|
| 1 | `50b91c7` | §2.1 commit-0 — admin queue route + 56-cell candidate surface |
| 2 | `3831c4e` | §2.2 commit-0 — admin item-detail route + tabbed shell + provenance / sibling context |
| 3 | `a075d47` | §2.3 commit-0 — edit-form architecture (stub mutations; no DB writes) |
| 4 | `4d90818` | §2.3 commit-1 — `submitEditAction` implementation; embedding regen; audit trail; staleness; option reorder |
| 5 | `8126440` | §2.4 commit-0 — approve + reject server actions; per-item disposition UI |
| 6 | `dd3ed8a` | §2.4b — status-tab navigation (candidates / live / rejected) |
| 7 | `3a1e2ce` | §2.4 commit-1 — single + bulk re-validate actions; UI affordances |
| 8 | `d67a166` | §2.5 commit-0 — audit history rendering in item-detail tab |
| 9 | `4bdec3a` | sessionStorage filter / sort persistence per cohort |
| 10 | `18c102d` | sessionStorage status-tab persistence + back-navigation restoration |
| 11 | `ce09e81` | §2.6 commit-0 — pressure-cell dashboard at queue head |

Drift commits absorbed: `5c5a5dd` (docs/claude_logs session log; pre-§2.1); `36df558` (sign-out button on top nav; pre-§2.3); `920f7c9` (Next.js 16 Cache Components compatibility — `connection()` markers on admin loaders; pre-§2.3); `800a989` (provenance + stem-options aesthetic styling pass; pre-§2.3 commit-0 audit reconciled); `3ac77ae` (sign-out button on diagnostic page; pre-§2.4 commit-0).

**§2 deliverables:**

- **Admin queue at `/admin/review`** with status tabs (Candidates / Live / Rejected); 791 flagged candidates rendered in candidates tab; sortable + filterable (flag / pressure / sub-type / difficulty / freshness / sort key).
- **Item-detail at `/admin/review/[itemId]`** with 4-tab shell (Stem & options / Explanation / Provenance / Audit history); back-to-queue link restores the cohort tab + filter selections from sessionStorage.
- **Full edit lifecycle**: stem text, options (with reorder UI), correct-answer, explanation, structuredExplanation, sub-type, difficulty. Bucket-change confirmation modal for sub-type / difficulty edits.
- **Embedding regen on body-text edits** via `enqueueEmbeddingRegen` (Path A helper); single-variant `RegenReason` matching actual body-only scope per §0.6.4 reframe.
- **Disposition actions**: approve (with stale-verdict acknowledgement modal when applicable); reject (with required free-text reason). One-way per Q6.
- **Re-validation**: single (provenance-tab "Re-run validator" button on stale candidates); bulk (queue-head "Re-validate N stale candidates" button on candidates tab when `staleCount > 0`).
- **Audit history rendering**: per-action-type dispatch (edit / approve / reject); changed-field diff for edits via `diffChangedKeys` (JSON.stringify value-comparison); empty state preserved.
- **Pressure-cell dashboard**: 14 sub-types × 4 difficulties grid; cobalt-accented under-target hard / brutal cells; click-to-filter via URL params (`?subType=` + `?difficulty=`); precedence URL → sessionStorage → defaults for queue filter seeding.
- **SessionStorage UX persistence**: filter / sort per cohort + active status tab survive in-tab navigation.
- **Tests**: 332/0/30/~1015 baseline (+128 tests since §1 round-close 204 baseline).

**Architectural decisions banked:**

- **Form-state preservation across tab switches**: always-mount + CSS-hide ratified at §2.3 commit-1 (~10 LOC) over literal state-lift through props (~150 LOC). Inactive tabs' `React.useState` containers preserve across tab switches without prop drilling.
- **Shared-module pattern for client / server boundary** (canonical idiom now): `action-history-shared.ts` at §2.5 + `pressure-cell-shared.ts` at §2.6. Pure helpers + Zod schemas + types live in the `-shared` module so client components reach them without dragging the `db` import graph into the bundle. Two instances now establish the pattern; if a third lands, consider extracting a generic doc note.
- **Pressure-cell dual-metric semantics** per §0.7.2: candidate-scoped (queue header) vs cell-scoped (dashboard).
- **URL param seeding precedence**: URL > sessionStorage > defaults; the QueueList React `key` encodes status + URL overrides so navigating between two filtered URLs that share a status forces a fresh mount and picks up the new override values.
- **Tab-scope enforcement**: re-validate buttons + dispositions + bulk dashboard all check `status === "candidate"` before rendering.

#### §2 — Admin review UI

Provisional; revised at §2 commit 0 audit:

- **§2.1** Admin queue route: `/admin/review` under `(admin)/` layout (gated by `requireAdminEmail()` inherited from layout); paginated list (cursor-based per past-sessions review-page anchor); sortable (by validator-confidence-score, by sub-type, by tier, by created-at); filterable (by status, sub-type, tier, validator-flag-reason, pressure-cell-membership).
- **§2.2** Item detail surface: full item rendering reusing `<ItemPrompt>` + `<StructuredExplanation>` (post-triage-retirement state); provenance + validator flags surfaced (parent item id, generator model, template version, prompt hash from `scripts/_siblings/<parentItemId>.json`); audit-history tab.
- **§2.3** Edit form: per-Q5 editable fields; submit triggers `item_admin_actions` entry (Q7) + status update + embedding regen if applicable (per Q5 regen policy).
- **§2.4** Approve / Reject actions: per-Q3/Q6; reject triggers soft-delete (status='rejected' + rejected_at_ms + rejected_by + rejection_reason); approve triggers status='live' promotion.
- **§2.5** Audit history display per-item: `item_admin_actions` for the item, sorted descending by created_at_ms; before/after diff rendering for edits.
- **§2.6** Pressure-cell dashboard at queue head per §0.7: current pressure-cell residual; candidates that could relieve each cell.
- **§2.7** UI tests: component-level (item rendering; edit-form validation) + integration (route-gating; queue-pagination; approve/reject flows).
- **§2.8** §2 round-close: tests pass; lefthook clean; docs updated; §2 commit ledger.

#### §3 — Round close

- Final test count vs `e9f1254` baseline (172 / 0 / 19 / ~770 ± few expect()).
- Lefthook clean.
- §6.14 entries authored or reinforced. Specifically:
  - **SPEC §6.14.43 entry amendment:** add **sub-type 5 (propagation-through-prior-audit-log)** to the four-sub-type taxonomy. Anchor instance: this round-prep's audit-log §7.4 leap → prior commit-0 prompt absorption → executor catch.
  - **§6.14.43 instance ledger:** instances #6 + #7 + #8 banking record in round-close §6.14 forensics block.
  - **PROMOTION CANDIDATE 2 — UNCHANGED at 3/5:** this round did not ship as a sidecar.
  - **Q-pattern instance count.** 3 banked at `a8d83bf`; round-close shape (separate or folded) determines instance #4 banking.
  - **Retirement-commit-under-cleaning forward-watch:** record the `81819e0` two-repayment trail (SPEC-B + followup) as forensic evidence for a potential future §6.14 entry on retirement-commit-under-cleaning patterns.
- Convergence criteria empirically met (per Q3) or carried forward to bank-completion round.
- Live bank state post-promotion: live distribution + pressure-cell residual.
- Forward-pinned residuals updated.

### §0.9 Forward-watch residuals carried in scope

- **Q-pattern instance count:** 3 banked at `a8d83bf`. §1 round-close (this commit) does NOT fold round-close into a code-commit (this is a separate docs-only round-close commit); instance count stays at 3.
- **`structured-explanation.test.ts:152` ZodError stderr** — suspected stochastic expect()-count contributor; benign per current evidence; not investigated in this round.
- **Test expect-count determinism** — baseline trajectory through §1: 803 → 814 → 812 → 823 across §1.2 commit-2 / §1.3 commit-0 / §1.3 commit-1 / §1.3 commit-2. Stochastic-variance precedent holds (±5 expect-count drift per run).
- **§6.14.43 sub-type 4 + 5 vigilance** throughout the round. Instance #10 (cumulative ~21 convention deviations during §1) and instance #11 (`hasAnyFlag` metric-conflation) banked since §0.3 last update; SPEC entry amendment scheduled for round-close §3.
- **Pressure-cell residuals** not cleared at round-close → 398 candidates flagged per §0.7.1; admin clears via §2.
- **Triage code residuals in three smoke/lib files** → still forward-pinned; not in this round's scope.
- **Selection-engine sidecar #1 stale `STATUS: OPEN` header** → still forward-pinned; minor docs-hygiene future commit.
- **Retirement-commit-under-cleaning forward-watch.** SPEC-B + SPEC-B-followup are two §6.14.41 audit-vs-revert blindness repayments of `81819e0` (triage retirement). No third instance yet; if a future retirement commit triggers a third repayment cycle, candidate for new §6.14 entry on retirement-commit-under-cleaning patterns.
- **HNSW/IVFFlat index on `items.embedding`** deferred per design decision. §1.3 commit-2 production batch wall-clock 2.044s (1.504s in `persistResultsStep`) — well under any performance threshold; no action.
- **Authoritative item-bank counts** at round-open: §1 commit 0 dev-DB query replaced stale snapshots; 1,711 candidates / 439 live confirmed verbatim and stable across §1 phase.
- **NEW (§1 close)**: provisional sub-section numbering (§1.1 / §1.2 / ... per plan-doc §0.8) vs commit-numbering (§1.0 / §1.1 / ... per redirector convention) divergence resolved at §0.8.1 — provisional labels are scope buckets; commit numbering tracks actual commits. Both conventions coexist; no edit needed.
- **NEW (§1 close)**: sub-type-pattern taxonomy from §0.7.1 (cohort-rejection / pressure-cell / clean) — forward-pinned for §2 admin queue UI design; queue can offer "review cohort archetype + apply en masse" affordance for the 3 cohort-rejection sub-types (analogies, lowest_values, antonyms = 435 items at 100%-cohort-flagged).
- **NEW (§1 close)**: persistence reproducibility anchor — every candidate's `validatorResult.thresholdsHash` is `sha256:111f631af48157...`. Future re-runs with different thresholds get a different hash; auditing identifies which verdicts came from which threshold set.

**Updated at §2 close (`ce09e81`):**

- **§6.14.43 instances banking**: 16 instances total banked across this round (#1–#5 retired at SPEC §6.14.43 promotion at `a8d83bf`; #6–#11 banked at round-prep + §1 close; #12–#16 banked across §2; #17 banked at this commit for the §2 round-close prompt's commit-ledger omission of `3831c4e (§2.2)`). Round-close §3 SPEC §6.14.43 entry amendment evaluates whether to refine sub-type 5 (#8, #9, #14, #15, #16, partial-#17 share propagation-through-restatement-sites) into 5a / 5b / 5c sub-flavors and whether to promote sub-type 6 for redirector-draft-vs-project-state divergence (#10 cumulative ~33+, #11).
- **Test baseline**: 204 (§1 close) → 332 (§2 close at `ce09e81`); +128 tests across §2. `structured-explanation.test.ts:152` ZodError stderr remains the known stochastic expect-count contributor; benign per current evidence.

**NEW (§2 close) residuals:**

- **Integration tests deferred**: per §2.7 ratification, integration tests requiring DB harness are deferred to a future test-infra round. All §2 commits manual-verification-tested via the dev server with seeded admin sessions; pure-function helpers (queue-filters, parseAdminQueueItem, aggregateDispositionStats, isValidatorStale, diffChangedKeys, aggregatePressureCells) carry the assertion load.
- **Validator pressure-cell zero-everywhere alignment** (§6.14.43 instance #16): validator iterates query-derived sub-types; dashboard iterates canonical config. Validator misses candidates in zero-everywhere sub-types for `validatorResult.isPressureCell`. Forward-pin for a future round.
- **v1.5 UX polish**:
  - Audit-history edit entries always show `metadataJson` as changed because `submitEditAction` always sets `validatorResult.staleAfterMs = Date.now()` on every edit (per §0.6.6 Q7 reframe). Consider filtering or special-casing system-tracking metadata from the field-level diff renderer.
  - Two-stage Suspense fallback on admin routes (blank flash → skeleton → UI): minor perceived-latency gap; could be tightened by promoting the queue + item-detail Suspense fallbacks to richer skeletons.
  - Source-provenance field editing (`sourceFolder` / `sourceFilename`): not currently in `editedFields` schema; admin must surgery via SQL if a source-provenance correction is needed.
  - Per-cell dashboard click-to-filter currently scopes the candidate queue only; analogous "show me the 1 live brutal item in this cell" affordance for the live tab is not wired.
- **§2 retirement / undo affordances** (forward-pin from §2.4b ratification):
  - Retirement (live → retired) needs a separate affordance + a new `action_type` enum value. Out of scope this round.
  - Undo-reject (rejected → candidate) needs a separate affordance OR remains SQL surgery; acceptable at v1.
- ~~**§1 round-close docs-hygiene residuals**: stale tier-distribution refs at plan-doc lines 170 + 432~~ **CLEANED at §3 commit-2** (this round-close): the §0.6.1 #2 criterion heading + the human-judgment #3 reference + the §0.8 §1.3 sub-section description all updated to reflect the §1.2 commit-2 provenance-roundtrip reframe.
- **Two pressure-cell metrics coexisting**: dual-surface semantics documented at §0.7.2; future round may unify or further differentiate.
- **Shared-module pattern documentation**: now applied at two sites (`action-history-shared.ts`, `pressure-cell-shared.ts`); a third instance suggests extracting a generic note explaining the client/server bundling boundary that motivates the split.

### §0.10 Cross-project transfer note

The validator + admin review architecture proposed in this round — including the admin-gate-reuse pattern (`requireAdminEmail()` + email allowlist + `(admin)/layout.tsx` route-group gating) — is a transferable shape for sibling projects (Superstarter, Alphastyle) that need item-bank curation surfaces. Not a deliverable; flagged for cross-project handoff documentation when sibling projects open similar surfaces.

The `item_admin_actions` audit-trail pattern (UUIDv7 id + bigint ms + before/after JSONB + admin_user_id + action_type enum) is a generic audit-of-change shape that any project with admin-curated content can reuse.

### §0.11 Phase 4 sub-phase b — closed

> **Note on numbering.** This section is §0.11, not §0.10, because §0.10 was already authored at round-open as the Cross-project transfer note (above). Renumbering §0.10 to make room for the phase-close marker would have introduced cross-reference propagation surface; appending as §0.11 preserves all existing cites.

**Round closed at `d6d1502` (§3 commit-1)** → finalized at this commit (`§3 commit-2`).

**Commit lineage summary** (validator engine through admin review through SPEC documentation):

| Phase | Range | Substantive commits |
|---|---|---|
| §1 (validator engine + production batch) | `a09b087` → `8c4dff7` (closed at `bd2820f` round-close docs) | 8 substantive + 1 round-close docs commit = 9 total |
| §2 (admin review surface) | `50b91c7` → `ce09e81` (closed at `dd59020` round-close docs) | 10 substantive + 2 sessionStorage + 5 drift = 17 total |
| §3 (full-round-close docs) | `de46277` → `d6d1502` → this commit | 3 commits (§14 authoring + §6.14.43 amendment + this final close) |

Total: 24 substantive commits across the round (counting per-phase round-close docs commits but excluding pure drift commits absorbed via §6.14.40 reconciliation); 29 total commits including drift.

**Round metrics:**

- **Tests**: 204 (post-§1 round-close) → 332 (post-§2 round-close) → 333 (post-close at this commit). +129 net tests across the round.
- **Working set at production-batch baseline (`8c4dff7`)**: 1,711 candidates with `validatorResult`; 791 candidates with `hasAnyFlag = true` (46.2%); 14 cohorts (1:1 with sub-types via `promptHash` backfill); single `thresholdsHash` `sha256:111f631af48157…` anchored across all rows.
- **56-cell pressure-cell grid at `ce09e81` baseline**: 16 pressure cells (5 hard + 11 brutal); 20 candidates needed to clear.
- **Admin disposition lifecycle**: read / edit / approve (with stale-verdict ack) / reject (with required reason) / re-validate single / re-validate bulk. All actions atomic; all wrapped in `requireAdminEmail()` + Zod input validation + transactional commits.
- **SPEC additions**: §14 (validator + admin review reference, +393 lines at `de46277`); §6.14.43 amendment (+40 / -3 lines at `d6d1502`).
- **Discipline instances banked**: 12 §6.14.43 entries (#6–#17). Sub-type 5 refined definition; sub-type 6 newly promoted.

**Forward-pin index** (residuals carried out of this round; future rounds open against this list):

- **Integration tests deferred**: full server-action → DB → revalidate → re-render path. Manual-verification-tested at each §2 commit; pure-function helpers carry the assertion load. Future test-infra round addresses.
- **Validator pressure-cell zero-everywhere alignment** (§6.14.43 instance #16): validator's `loadPressureCells` iterates query-derived sub-types only, silently skipping zero-everywhere sub-types. Dashboard iterates canonical config. Validator misses candidates in zero-everywhere sub-types for `validatorResult.isPressureCell`. Forward-pin: align validator iteration in a future round so candidate marking matches dashboard semantics.
- **v1.5 UX polish residuals**:
  - Audit-history edit entries always show `metadataJson` as changed because `submitEditAction` always sets `validatorResult.staleAfterMs = Date.now()` on every edit (per §0.6.6 Q7 reframe). Consider filtering or special-casing system-tracking metadata from the field-level diff renderer.
  - Two-stage Suspense fallback on admin routes (blank flash → skeleton → UI); minor perceived-latency gap.
  - Source-provenance field editing (`sourceFolder` / `sourceFilename`); not in `editedFields` schema.
  - Per-cell dashboard click-to-filter scopes the candidate queue only; analogous "show me the 1 live brutal item in this cell" affordance for the live tab is not wired.
- **Retirement / undo affordances** (forward-pin from §2.4b ratification):
  - Retirement (live → retired) needs a separate affordance + a new `action_type` enum value. Out of scope this round.
  - Undo-reject (rejected → candidate) needs a separate affordance OR remains SQL surgery; acceptable at v1.
- **Shared-module pattern formalization trigger**: `action-history-shared.ts` (§2.5) + `pressure-cell-shared.ts` (§2.6) = 2 instances established. Third instance triggers extraction of a generic SPEC convention note explaining the client/server bundling boundary that motivates the split.
- **Two-repayment-trail forensic note**: SPEC-B (`d592107`) + SPEC-B-followup (`e9f1254`) = 2 §6.14.41 audit-vs-revert blindness repayments of `81819e0`. No third repayment yet; if a future retirement commit triggers a third repayment cycle, candidate for new §6.14 entry on retirement-commit-under-cleaning patterns.
- **Sub-type 6 forward-watch** (§6.14.43 instance #10 active record): cumulative ~33+ deviations across §1.2 — §2.6. Pattern persists across future rounds when redirector authors against remembered conventions rather than verified ones. Discipline-side guidance carries forward per SPEC §6.14.43 sub-type 6 entry.
- **Two pressure-cell metrics coexisting** (per §0.7.2): dual-surface semantics documented; future round may unify or further differentiate.

**Cross-references:**

- **SPEC §14** — production reference for everything shipped in this round.
- **SPEC §6.14.43** — discipline framework + canonical post-amendment instance ledger.
- **This plan-doc** — forensic discovery record + commit-by-commit narrative.
- **Audit-log** `scripts/_logs/2026-05-10_phase4-validator-admin-pre-open-reconciliation.md` — pre-open audit material.

**Phase 4 sub-phase b is closed.** Future work on the validator engine or admin review surface opens a new round.

## §1 Validator engine + promotion workflow + admin allowlist

*(pending; provisional sub-sections per §0.8)*

## §2 Admin review UI

*(pending; provisional sub-sections per §0.8)*

**Note for §2 commit 0:** anchor patterns from post-Round-3 components per §0.5.2 are the primary reuse surface; consume rather than rebuild.

## §3 Round close

*(pending; per §0.8)*

## §A Audit-step ledger (opening commit)

| Step | Concern | Outcome |
|------|---------|---------|
| 1 | Round-anchor verify | PASS — HEAD `e9f1254` matches re-anchored spec. |
| 2 | Lineage `e9f1254 / d592107 / 955ad1d / 810c83a / aa76394` | PASS — verbatim. |
| 3 | `bun run typecheck` clean | PASS. |
| 4 | Lint clean | PASS — `Checked 0 files`; structural lint runner clean. |
| 5 | Working tree clean pre-edit | PASS. |
| 6 | Plan-doc absent at target path | PASS. |
| 7 | Audit-log file present at `scripts/_logs/2026-05-10_phase4-validator-admin-pre-open-reconciliation.md` | PASS — readable; §7 synthesis cited in §0.1; §7.4 leap preserved as forensic record per Path 1. |
| 8 | SPEC body amendment grep counts | FINDING — current `grep -ci "triage"` returns SPEC.md 15 / PRD.md 12 / design_decisions.md 15 vs prior commit-0-attempt prompt's cited 12/9/11. Drift = +3/+3/+4. Source: my prior stop-and-reports under-counted; `git diff e9f1254..HEAD -- docs/SPEC.md docs/PRD.md docs/design_decisions.md` is empty (no actual doc edits since `e9f1254`). Counts are within the corrected baseline; no doc drift. |
| 9 | Header banner intact verification | PASS — verbatim `81819e0` banner text intact at lines 1–11/12 of SPEC.md, lines 1–13 of PRD.md, lines 1–13 of design_decisions.md. |
| 10 | Item bank state | DEFERRED — dev-DB query not executed at commit 0; deferred to §1 commit 0. Authoritative numbers replace stale handoff (1,711) and convergence-audit (1,748) snapshots there. |
| 11 | Schemas | PASS — `items.ts` confirmed (status enum 3 values: `'live' | 'candidate' | 'retired'`; embedding 1536; sourceFolder + sourceFilename provenance columns); `users.ts` confirmed (no role column); `attempts.ts` confirmed (post-triage-retirement; itemId FK no CASCADE — soft-delete safe). |
| 12 | Existing admin infrastructure | PASS — `requireAdminEmail()` at `src/server/auth/admin-gate.ts`; `adminEmails: ReadonlyArray<string>` (currently empty) at `src/config/admins.ts`; layout-level gate at `src/app/(admin)/layout.tsx`; `_admin-gate-client.tsx`; canonical `/admin/ingest` route + actions.ts pattern. PRD §3.1 codifies the pattern. **§7.4 greenfield leap CORRECTED at §0.1; Decision D anchored Q8 to reuse.** |
| 13 | Sub-phase a forensics | PASS — three open architectural questions (verbatim) located at `selection-engine-session-attempted-ids-sidecar.md` §6 #1: *"Adversarial robustness criteria for validator. Human-in-the-loop ratio. Convergence criteria (when does validation 'complete'?)."* Convergence-audit.md key findings: 1,748 candidates audited; numerical.lowest_values:* TEMPLATING ARTIFACT (97.5% by-design); verbal.antonyms real convergence (37.9%); other cells 0–5.6%. Phase 4 sub-phase a closed at parent commit 9 (2026-05-08); 1,711 candidates ready for sub-phase b; sub-phases b/c/d/e are validator/scorer/deployer/admin-generation-page. |
| 14 | ALPHA_DESIGN authenticated-product surface | PASS — §2.B "Authenticated Product Surfaces (dashboard, account, registrations)": *"Same token system as marketing, dialed down. Quiet white and near-white surfaces, minimal shadows. Brand blue used as accent only — never as background fill. Denser, more operational, more systematized than marketing. Still polished — should never read as a separate product."* Round 2 wide-token retrofit tokens (Layer A near-white + Layer B blue accent only) cited at SPEC §13. Admin queue/detail surface inherits these constraints. |
| 15 | Post-Round-3 anchor patterns | PASS — `src/components/post-session/`: belt-indicator, latency-range-slider, onboarding-targets, performance-summary, post-session-shell, result-sound-fx, strategy-surface, structured-explanation, wrong-items-browser (+ tests). `src/components/nav/`: page-nav. `src/components/dashboard/`: dashboard, top-nav, streak-chip, belt-graphic, mission-card, sparkline, stat-tile, etc. `src/components/review/`: review-card, review-row, review-view. Existing admin: `src/app/(admin)/admin/ingest/`. All anchor-pattern reuse surfaces enumerated in §0.5.2 + §0.5.3. |
| 16 | SPEC new-section landing place | PASS — last existing top-level section is `## 13. Token architecture` at line 2759. Validator+admin SPEC content lands as new top-level **§14** authored at §1 round-close per Decision A. Section name proposed: "Validator and admin review" or "Item validation and admin curation" — final naming at §1 round-close. |
| 17 | Test baseline at HEAD | PASS — `172 pass / 0 fail / 19 files / 768 expect()` at commit-0 audit run (within stochastic-variance precedent: prior runs read 644 / 649 / 768 / 769 / 771 across this round-prep sequence; expect()-count drift is benign). |
| 18 | Embedding-regeneration cost surface | PASS — `src/server/generation/embeddings.ts` exports `embedText(text: string): Promise<number[]>` wrapping OpenAI `text-embedding-3-small` at 1536 dims. Per sub-phase a §4.10 + §4.13, embeddings are computed synchronous-before-write inside a single transaction (NOT via async backfill) for siblings. Q5 regen policy: any edit to `body` text triggers regen; `optionsJson` text edits trigger regen; explanation edits don't (embedding doesn't include explanation). |
| 19 | Generator config + provenance | PASS — `src/server/generation/sibling-provenance.ts` writes per-source JSON files at `scripts/_siblings/<parentItemId>.json` with payload: `{ parentItemId, generatedAt, generatorModel, templateVersion, promptHash, source: <snapshot>, llmOutputVerbatim, siblings: [...], usage: { tokens, cost } }`. Items.metadataJson carries `parentItemId` for runtime queryability per sub-phase a §5. Validator's provenance-based batch-reject heuristic (Q1 criterion 6) reads `templateVersion` + `promptHash` to identify generator-run cohorts. |
| 20 | Vercel Workflow integration | PASS — sub-phase a uses `siblingGenerationWorkflow` at `src/workflows/sibling-generation.ts` (workflow file: pure orchestration with `"use workflow"`) + `src/workflows/sibling-generation-steps.ts` (step bodies with logic + logger). Validator follows same pattern: `validator-batch.ts` (workflow file) + `validator-batch-steps.ts` (step bodies). Per §0.6 Q10, validator engine implemented as a callable function `validateCandidate(itemId)` invoked per-batch by the workflow; extensible to continuous-pipeline by chaining post-`siblingGenerationWorkflow` without refactor. |

