# Session log — cacheComponents-investigation round

**Round:** cacheComponents-investigation
**Open:** 2026-05-12 (commit `bcb77c3` — prior round's close commit)
**Close:** 2026-05-12 (commit `<this-commit-sha>` — C3-close)
**Duration:** one-day session
**Status:** CLOSED — root cause fixed in production

## Arc

audit → falsify-via-Option-B → empirical refutation → pivot-to-Option-A → preview-validate → ship → monitor → close.

Zero wasted commits. Zero rollbacks. Audit-first paid off.

## Empirical outcomes

1. **Submit-hangs eliminated in production.** Pre-C2 prod: ~1-in-5-to-20 hang frequency. Post-C2 prod (Leo's 50-Q full-length session): 0-in-50.
2. **Cold-start improved ~3.3×.** Pre-C2 `/api/health` cold-start = 2.9s; post-C2 = 879ms. Warm consistently sub-360ms.
3. **cacheComponents build/runtime warning eliminated.** Pre-C2 prod baseline: 4 emissions in a 177-line window. Post-C2: 0.
4. **OIDC poll fix (from `auth-oidc-restore`) confirmed working on Node runtime.** Zero `hasContextToken:false` in post-swap window.
5. **The C0 audit's articulated mechanism explained the warning but NOT the user-visible hangs.** C1 removed cacheComponents → warning gone, hangs persisted. C2 swapped Bun → Node → hangs gone. Bun is the operative cause; the deeper Next.js source mechanism remains uncharacterized.

## Notable patterns banked

- **§3.12 — Audit-articulated mechanism explains signal but not symptom.** When a clean audit-articulated mechanism exists for an observed signal, the first falsification experiment should test the mechanism *alone*, not the suspect — the signal-vs-symptom decoupling result is high-information. Count: 1/5.
- **§3.13 — Redirector-vs-tool-behavior mismatch; executor STOP catches it.** `vercel promote` was modeled as pure alias swap; actual behavior is rebuild-then-swap. Executor's "STOP if alias hasn't swapped" rule caught the divergence cleanly; redirector reconciled via web-searched docs; no rollback needed. Sibling to §3.1. Count: 1/5.

## New pins (seven added at close)

- `R-bun-nextjs16-action-stream-mechanism-uncharacterized` — deeper Next.js source mechanism unknown; someday-later academic work.
- `R-future-use-cache-requires-runtime-investigation-revisit` — if we re-enable `cacheComponents` to use `'use cache'` features, stay on Node or wait for upstream.
- `R-vercel-logs-cli-duplication-artifact` — `vercel logs` returns each event 3-12× verbatim. Methodology note.
- `R-vercel-logs-staleness` — `vercel logs` has 5-10+ minute indexing latency. Use in-browser testing for fresh-traffic signal.
- `R-end-session-perf-slow` — 50-Q `endSession` takes ~1m; pre-existing on Bun, masked by hangs until C2. Opens the next round.
- `R-vercel-workflow-pins-to-deployment-hostname` — workflows log under deployment hostname, not prod alias. Implies pinning. Worth confirming at next round's C0 audit.

## Pins retired

- `R-cacheComponents-bun-settimeout-incompat` — RESOLVED by C2 runtime swap.
- `R-no-use-cache-directive-in-app` — MOOT (cacheComponents now disabled).

## Surprise findings

- **The audit was correct about what it examined (warning emission, call fanout, runtime-swap surface) but over-reached when generalizing to the user-visible symptom.** §3.12 banked from this.
- **`vercel promote <preview-id>` rebuilds-then-swaps; it is NOT a pure alias swap.** The redirector modeled it incorrectly; the executor's discipline rule caught the divergence. §3.13 banked from this. For a true instant-alias-swap, the right command is `vercel rollback <id>`.
- **`vercel logs` duplicates events 3-12× and is stale by 5-10+ minutes.** Discovered while trying to verify post-swap traffic in real time. Banked as two separate methodology pins.
- **Cold-start performance improvement (3.3×) was a secondary benefit of the runtime swap.** Not predicted by the audit (which focused on correctness, not perf); a free win.

## Outstanding work

- **R-end-session-perf-slow** — opens the next round (`end-session-perf`). Pre-existing pre-C2 issue, just masked by mid-session hangs. 50-Q endSession path takes ~60s; happy path emits zero log lines (instrumentation gap).
- **R-bun-nextjs16-action-stream-mechanism-uncharacterized** — someday-later root-cause work. Symptoms resolved; mechanism academic. Low priority.
- **24-48h prod monitor window** — rollback target `dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6` remains Ready and re-promotable via `vercel rollback dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6 --yes` if anything regresses.

## Commit ledger (one line each)

- **C0** `d3196b4` — plan-doc + deep audit.
- **C0.5** `d02e5db` — plan-doc amendment integrating H2 search; Option B reframed as default.
- **C1** `445599b` — disable `cacheComponents`. Warning gone; hangs persisted. Preview `dpl_BWnjzqqVJoupLK8pevTWaM3H3mbS`.
- **C2** `0e759bf` — Bun → Node runtime swap. Hangs eliminated. Preview `dpl_3RQZ8nXE8GuzAtkLtQECfE33KKjD`.
- **C3-prep** — read-only state capture; rollback target identified.
- **C3-promote** — `vercel promote dpl_3RQZ... --yes`; rebuild-then-swap; new prod `dpl_HaYWegFbr7CLsY7qcS5NKcDhSv8v`.
- **C3-verify** — alias swap confirmed at `2026-05-12T18:56:22Z`; health 879ms cold / sub-360ms warm; warning absent.
- **C3-monitor** — Leo's prod 50-Q test: 0 hangs; OIDC healthy.
- **C3-close** — this commit. Plan-doc finalized; pins retired/added; session log written; local commit stack pushed to origin.

## §6.14.43 sub-type 6 tracker

Count entering this round: 4/5. Deviations observed this round: 0. Count exiting: 4/5. One more sub-type 6 in any future round triggers promotion at that round's close.
