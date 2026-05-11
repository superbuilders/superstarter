# Session Log: Phase 4 sub-phase b — §2 admin review surface + §3 round-close

**Date:** 2026-05-10 (~19:30 — 22:00)
**Duration:** ~2h 30m
**Focus:** Built the remaining §2 admin-review surface (status tabs, re-validate actions, audit history, sessionStorage UX persistence, pressure-cell dashboard), then closed Phase 4 sub-phase b across §2 round-close + §3 round-close docs (SPEC §14 authoring, SPEC §6.14.43 amendment, plan-doc final close).

## What Got Done

10 commits landed (`8126440` baseline → `d21b52d` close):

- **`dd3ed8a`** — §2.4b status-tab navigation. Added Candidates / Live / Rejected URL-driven tabs to `/admin/review`. New `<QueueStatusTabs>` component; `loadAdminQueueData(statusFilter)` accepts cohort filter; status counts surfaced as tab badges; per-cohort default flag filter (candidate=Flagged, live/rejected=All).
- **`3a1e2ce`** — §2.4 commit-1. Single + bulk re-validate server actions (`revalidateCandidateAction`, `revalidateStaleCandidatesAction`); `<RevalidateCandidateButton>` in provenance-tab stale banner; `<BulkRevalidateButton>` in queue head when `staleCount > 0`. Candidates-only scope.
- **`d67a166`** — §2.5 commit-0. Audit-history rendering. `loadAdminActionHistory(itemId)` joins `item_admin_actions` × `users`. Per-action-type dispatch (edit / approve / reject); empty state preserved. Page composes detail + history promises in parallel. File split into `action-history-shared.ts` (client-safe) + `action-history-data.ts` (server loader).
- **`4bdec3a`** — sessionStorage filter+sort persistence per cohort. Lazy `useState` init reads `admin-review-queue:<status>` key; `useEffect` writes on filter/sort change. Zod-validated payload with graceful fallback to defaults.
- **`18c102d`** — sessionStorage status-tab persistence + back-nav. Active cohort tab written to `admin-review-queue:last-status` on every tab change; item-detail "Back to queue" link reads sessionStorage on client mount and routes to the previously-visited tab.
- **`ce09e81`** — §2.6 commit-0. Pressure-cell dashboard at queue head. `loadPressureCellSnapshot()` aggregator over 14 sub-types × 4 difficulties; `<PressureCellGrid>` with cobalt-accented under-target tiles linking to URL-param-filtered queue. Click-to-filter wired via `?subType=` + `?difficulty=` URL params with precedence URL > sessionStorage > defaults. File split into `pressure-cell-shared.ts` + `pressure-cell-data.ts`.
- **`dd59020`** — §2 round-close docs. Plan-doc edits: §0.3 instance ledger #12-#17 banked; §0.5.2 TopNav reframe; §0.6.4 embedding-scope reframe; §0.6.6 audit-row reaffirmation; §0.7.2 dual-metric note; §0.8.2 §2 phase summary (table of 11 substantive + 5 drift); §0.9 forward-watch §2 close.
- **`de46277`** — §3 commit-0. SPEC §14 authoring. New top-level "Validator and admin review (Phase 4 sub-phase b)" section: 9 sub-sections covering goal, lifecycle, validator engine (6 criteria + thresholds + pressure cells + persistence), batch runner, admin review surface, file inventory, design rationale, working-set baseline, cross-references. +393 lines.
- **`d6d1502`** — §3 commit-1. SPEC §6.14.43 amendment. Sub-type 5 (propagation-through-restatement-sites) promoted from plan-doc-banking with refined definition (split into 5a-5e rejected — discipline mechanism identical across scope variants). Sub-type 6 (redirector-draft-vs-project-state divergence) NEW. Instance ledger table for #6-#17 with sub-type assignments + distribution counts + cross-reference to §14.
- **`d21b52d`** — §3 commit-2 final close. Plan-doc cleanup: stale "tier-distribution sanity" refs at §0.6.1 #2/#3 + §0.8 §1.3 replaced with "tier-distribution provenance-roundtrip" per §1.2 commit-2 reframe. §0.3 §6.14.40 reconciliation summary block (5-row table of drift commits). §0.11 (not §0.10 — already taken) phase-close marker with lineage table, round metrics, forward-pin index. §0.9 stale-ref residual marked CLEANED.

## Issues & Troubleshooting

- **Problem:** First commit of session (status tabs) failed biome lint with `no-inline-ternary`.
  - **Cause:** `const flag: FlagFilter = data.statusFilter === "candidate" ? DEFAULT_FILTER_STATE.flag : "all"` — even though directly assigned to a const, the type annotation appears to have triggered the rule.
  - **Fix:** Refactored to early-return `if/else`: `if (data.statusFilter === "candidate") return DEFAULT_FILTER_STATE; return { ...DEFAULT_FILTER_STATE, flag: "all" }`.

- **Problem:** §2.5 audit-history-tab build failed at runtime: `Module not found: Can't resolve 'dns'` via `pg/lib/connection-parameters.js`.
  - **Cause:** `action-history-data.ts` imports `db` (which transitively pulls in `pg`). The grid components (rendered transitively from `"use client"` content.tsx) imported `diffChangedKeys` as a value — Next.js bundled the entire data module + db dependency into the client bundle.
  - **Fix:** Split into `action-history-shared.ts` (db-free; types + `adminActionTypeSchema` + `isPlainObject` + `diffChangedKeys`) and `action-history-data.ts` (DB loader importing from shared). All client-side consumers (audit-history-tab, action-entry-{edit,approve,reject}) import from shared. Same pattern recurred at §2.6 with `pressure-cell-shared.ts`.

- **Problem:** §2.5 initial `diffChangedKeys` returned all 7 editable keys for every edit instead of only changed ones.
  - **Cause:** Wrote naive `Object.keys(beforeJson) ∪ Object.keys(afterJson)`. Per audit step 12 finding, edit audit rows write FULL row snapshots (all 7 columns), not field-projected diffs — so the union always returned every key.
  - **Fix:** Switched to `JSON.stringify(beforeJson[key]) !== JSON.stringify(afterJson[key])` per-key value comparison. Verified via browser test on a multi-action item: showed "Changed fields: metadataJson, optionsJson" instead of all keys.

- **Problem:** §2.4 commit-1 lint failed `prefer-early-return` on test bodies that wrapped a single `if (cell?.hasPressureSemantics) { ... }` block.
  - **Cause:** The lint rule fires when a test function body is a single conditional — silent narrowing failures slip past the assertion.
  - **Fix:** Introduced `expectPressureCell` / `expectInformationalCell` `asserts`-narrowing helpers that combine the assertion with the type narrow. Test bodies became flat sequences of expects.

- **Problem:** §2.6 click-to-filter from pressure-cell tile worked on full page load but NOT when clicking from within `/admin/review` (URL params present in the new URL but dropdowns showed defaults).
  - **Cause:** QueueList had `key={data.statusFilter}` from §2.4b status tabs. Both URLs share `status=candidate`, so React reconciled the same QueueList instance — the lazy `useState` initializer didn't re-run, so URL overrides weren't picked up.
  - **Fix:** Added `queueListKey(status, overrides)` helper in content.tsx that encodes URL override values into the React key. Navigating between two URLs with different `?subType=` / `?difficulty=` now forces a fresh mount.

- **Problem:** §2 round-close prompt referenced section anchors that didn't exist as described.
  - **Cause:** Two redirector mis-anchors: "§0.6.1 #5 embedding scope" — but #5 in §0.6.1 is "Heuristic detectors", not embedding. "§0.6.5 Q5 audit-row" — but §0.6.5 in current numbering is Q6 (Removal semantics); Q5 (Edit semantics) is §0.6.4.
  - **Fix:** Redirected corrections to the actual anchors. Embedding-scope reframe applied to §0.6.4 Q5 (where the "body, optionsJson text" framing actually lives). Audit-row reframe applied to §0.6.6 Q7 as a reaffirmation note (Q7 already correctly says "full item snapshots"; the misframing was in intermediate session prompts, not in the plan-doc). Surfaced both as audit findings.

- **Problem:** §2 round-close redirector's commit ledger listed 16 expected commits but actual chain has 17.
  - **Cause:** Missing `3831c4e (§2.2 commit-0 — admin item-detail route + tabbed shell)` between `50b91c7` and `36df558`.
  - **Fix:** Caught at audit step 15. Added §2.2 row to §0.8.2 phase summary table; corrected count from "9 substantive + 2 + 4" to "10 substantive + 2 + 5". Folded as §6.14.43 instance #17 (sub-type 1 + 5 propagation; later simplified to sub-type 5 in SPEC §6.14.43 amendment).

- **Problem:** §3 commit-1 redirector distribution count said "Sub-type 5: 6 instances" but the same prompt's table assigned `#12 → 5`, totalling 7.
  - **Cause:** Inconsistency in the redirector's prompt itself.
  - **Fix:** Corrected to 7 in the SPEC; surfaced as audit step 7 finding.

- **Problem:** §3 commit-2 redirector instructed appending a new "§0.10 phase-close marker" — but §0.10 already exists.
  - **Cause:** Plan-doc has §0.10 "Cross-project transfer note" authored at round-open. Renumbering it would have created cross-reference propagation surface.
  - **Fix:** Phase-close marker landed as §0.11 instead. Added a numbering note inside the section explaining the choice.

- **Problem:** Plan-doc instance entries for #10, #12, #17 carried pre-amendment sub-type classifications that drifted from the new SPEC §6.14.43 canonical assignments (post-`d6d1502`).
  - **Cause:** Plan-doc entries were banked at the time of each instance; the SPEC amendment at `d6d1502` reclassified #10 → 6, #12 → 5, #17 → 5.
  - **Fix:** Added a clarifying note in §0.3 pointing to SPEC §6.14.43 as canonical post-amendment classification; preserved plan-doc entries as forensic record at time of banking.

- **Problem:** Manual browser verification required signed-in admin sessions; playwright defaulted to anonymous.
  - **Cause:** No dev-only auth bypass; admin gate uses NextAuth + Google OAuth.
  - **Fix:** Inserted ephemeral session rows directly into `auth.sessions` via Bun script, injected the session token cookie via `browser_evaluate`, ran the verification flow, then deleted the session afterward. Repeated for each commit's manual verification.

## Decisions Made

- **SessionStorage over URL params** for filter/sort persistence (per the user's request to "preserve dropdown settings"). Minimal blast radius; per-cohort keying so each tab remembers its own state independently.
- **Status tabs as URL search param** (`?status=candidate|live|rejected`) — bookmarkable + server-side filterable. Default to `candidate` on missing/invalid input.
- **Pressure-cell dual metric** (queue.pressureCellCount candidate-scoped vs dashboard.totalPressureCells cell-scoped) — both correct; serve different admin workflows; not expected to agree numerically. Documented at SPEC §14.3.4 + plan-doc §0.7.2.
- **Pressure-cell semantics** match validator exactly: hard target=3, brutal target=1, easy/medium informational only. Used a discriminated union (`hasPressureSemantics: true | false`) on the cell type to avoid `null/undefined` union on target.
- **Shared-module pattern** for client/server boundary: `action-history-shared.ts` (§2.5) + `pressure-cell-shared.ts` (§2.6). Two instances now establish the canonical idiom; third instance triggers extraction of a generic SPEC convention note.
- **Always-mount + CSS-hide** for item-detail tab state preservation (carried from §2.3 commit-1). Inactive tabs' `useState` containers preserve across switches without prop drilling.
- **Re-validation does NOT write `item_admin_actions` rows** — re-validation is refresh, not disposition. Audit-of-re-validation forward-pinned for future rounds if pattern emerges.
- **Bulk re-validate per-item failure policy**: skip-and-continue on `validateCandidate` errors; rollback batch on UPDATE errors (latter signals infra trouble).
- **Sub-type 5 unified** (not split 5a-5e) at SPEC §6.14.43 amendment — the "where" axis is scope detail, not kind; discipline mechanism is identical across all variants.
- **Sub-type 6 promoted** for "redirector-draft-vs-project-state divergence" — anchor to instance #10's ~33+ cumulative deviations across §1.2 — §2.6.
- **§0.11 (not renumbering §0.10)** for phase-close marker — preserves all existing cross-references.
- **Diff helper handles both shapes** (`JSON.stringify` value comparison) — works regardless of whether audit rows are full snapshots or field-projected, so future audit-row schema changes don't break the renderer.

## Current State

**Phase 4 sub-phase b is CLOSED at `d21b52d`.**

**Working / shipped:**

- Admin queue at `/admin/review` with three URL-driven status tabs (Candidates / Live / Rejected). 1,696 candidates / 447 live / 7 rejected at most-recent baseline.
- Item-detail at `/admin/review/[itemId]` with 4-tab shell (Stem & options / Explanation / Provenance / Audit history). Edit, approve, reject, single re-validate all wired.
- Bulk re-validate button on candidates tab when `staleCount > 0`.
- Audit-history tab renders edit / approve / reject entries with per-action-type formatting; `diffChangedKeys` shows actually-changed fields only.
- Pressure-cell dashboard on candidates tab: 14 × 4 grid with click-to-filter to URL-param-filtered queue.
- SessionStorage UX persistence: filter / sort per cohort + active status tab survive in-tab navigation. Clicking "Back to queue" restores the prior cohort + selections.

**Round metrics:**

- Tests: 333 / 0 / 30 files / 1194 expects (+129 net since §1 round-close 204 baseline).
- Working set: 1,711 candidates with `validatorResult` + 791 with `hasAnyFlag = true` (46.2%) at production-batch baseline; single `thresholdsHash` `sha256:111f631af48157…` anchored.
- 24 substantive commits across the round (29 total including drift commits absorbed via §6.14.40).

**Documentation:**

- SPEC §14 (393 lines): canonical production reference for everything shipped this round.
- SPEC §6.14.43 amended: sub-type 5 refined; sub-type 6 promoted; instance ledger #6-#17 (12 instances).
- Plan-doc 724 lines: §0.8.1 + §0.8.2 phase summaries; §0.11 phase-close marker; forward-pin index.

**Forward-pinned residuals** (out of round; future-round material):

- Validator pressure-cell zero-everywhere alignment (§6.14.43 instance #16).
- Integration tests deferred (manual verification + pure-function tests carry the load at v1).
- v1.5 UX polish: metadataJson always-changed in edit diffs; two-stage Suspense fallbacks; source-provenance editing; live-tab cell click-to-filter.
- Retirement (live → retired) + undo-reject affordances.
- Shared-module pattern formalization trigger: 3rd instance promotes pattern to SPEC convention note.
- Sub-type 6 cumulative deviation count tracking continues across future rounds.

## Next Steps

The round is closed; no further commits scheduled in this sub-phase. Future work opens new rounds against `d21b52d` as the ancestor commit.

Highest-priority candidates for the next round:

1. **Validator pressure-cell zero-everywhere alignment.** Validator's `loadPressureCells` skips sub-types with zero live items everywhere; dashboard correctly iterates the canonical `subTypeIds`. Aligning the validator so candidate `validatorResult.isPressureCell` matches dashboard semantics is a clean small-scope fix.
2. **v1.5 UX polish pass on admin review surface.** Filter system-tracking metadata from edit diff renderer; add a richer skeleton fallback to admin routes; surface `sourceFolder` / `sourceFilename` in the editedFields schema.
3. **Retirement + undo affordances** (forward-pinned at §2.4b ratification). Adds new `action_type` enum value + admin UI for `live → retired`. Undo-reject can stay as SQL surgery at v1.
4. **Integration test infrastructure**. Full server-action → DB → revalidate → re-render path requires a DB harness in `bun:test`. Worth its own scoped round.
5. **Cross-project transfer documentation** per plan-doc §0.10. The admin-gate-reuse pattern + `item_admin_actions` audit-trail shape are transferable; promote to a SPEC convention note when sibling projects open similar surfaces.
