# Session Log: cacheComponents Investigation — round opened, executed, shipped to prod, closed

**Date:** 2026-05-12, ~12:00 PM – 2:33 PM CDT
**Duration:** ~2.5 hours
**Focus:** Open and fully execute the cacheComponents-investigation round end-to-end: deep audit → preview falsification → production runtime swap → close. Eliminate user-facing submit-hangs caused by Bun + Next.js 16 interaction.

## What Got Done

- **C0 (`d3196b4`):** Wrote 339-line plan-doc at `docs/plans/cacheComponents-investigation.md` containing a deep audit of Next.js 16's `cacheComponents` source. Located the exact warning emission site (`node_modules/next/dist/server/app-render/app-render-scheduling.js:99`) and traced `createAtomicTimerGroup` → `runInSequentialTasks` to 16 call sites in `app-render.js`. Confirmed the codebase uses zero `'use cache'` / `cacheLife` / `cacheTag` directives. Articulated H1/H2/H3 hypothesis register with falsification tests. Inventoried the ~4-line runtime-swap surface (`vercel.json` `bunVersion` + `package.json` `--bun` flags).
- **C0.5 (`d02e5db`):** Plan-doc amendment integrating H2 search findings. Documented upstream stall: `vercel/next.js#87630` Open, `oven-sh/bun#26021` merged but incomplete, `oven-sh/bun#27060` rejected by Bun maintainer `190n` ("Bun does not intend to honor `_idleStart` mutations"), `vercel/next.js#88514` Draft. H2 empirically refuted. Restructured §5 to make Option B (disable cacheComponents) the default first-line intervention and Option A (runtime swap) the alternative.
- **C1 (`445599b`):** Removed `cacheComponents: true` from `next.config.ts`. Deployed preview `dpl_BWnjzqqVJoupLK8pevTWaM3H3mbS` at `https://18seconds-r8mxxmeho-...`. Leo's 50-Q in-browser test: warning gone, but hangs persisted at ~1-in-5-to-20. cacheComponents-mechanism empirically refuted as operative cause.
- **C2 (`0e759bf`):** Removed `"bunVersion": "1.x"` from `vercel.json`; dropped `--bun` flag from `build` and `start` scripts in `package.json`. Other Bun-using scripts (`dev`, `db:*`, `lint`, `typecheck`) preserved. Deployed preview `dpl_3RQZ8nXE8GuzAtkLtQECfE33KKjD` at `https://18seconds-27qljlni7-...`. Build 33% faster than C1. Leo's 50-Q in-browser test: 0-in-50 hangs. Bun runtime confirmed as operative cause.
- **C3-prep:** Read-only state capture. Identified `dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6` (commit `9ece713`) as rollback target. Production log baseline: 4 cacheComponents warning emissions in 177-line window, 20 healthy OIDC poll lines, 0 errors.
- **C3-promote:** Ran `vercel promote dpl_3RQZ8nXE8GuzAtkLtQECfE33KKjD --yes`. Triggered a rebuild (not an atomic alias swap — documented Vercel behavior for preview→prod promotion). New production deployment `dpl_HaYWegFbr7CLsY7qcS5NKcDhSv8v` built from commit `0e759bf` with prod env vars.
- **C3-verify:** Polled rebuild to Ready (~4m 24s). Alias swap to new deployment confirmed at `2026-05-12T18:56:22Z`. Post-swap health: 879ms cold-start (vs old prod's 2.9s — 3.3× faster), 282–358ms warm. 0 warning emissions, 0 level-40+ errors in post-swap window.
- **C3-monitor:** Leo completed a full 50-Q production session: 0 submit-hangs, OIDC healthy, no errors. End-session perf surfaced as a separate pre-existing concern.
- **C3-close (`a830b23`):** Plan-doc finalized end-to-end: §0.1 drift fix (per §6.14.28), §1 ledger filled with 8 stage entries, §6 round-close section added with 8 subsections (H1/H2/H3 dispositions, empirical wins, audit-first reflection, sub-type 6 tracker, deploy IDs), §0.11 pin index updated (2 retired, 6 added), §3 patterns banked (§3.12 + §3.13). Session log added at `docs/claude_logs/session_2026-05-12_cacheComponents-investigation.md`.
- **Push:** Fast-forward push `bcb77c3..a830b23  main -> main`. All 6 commits (carry-in session log + 5 round commits) now on origin/main.

## Issues & Troubleshooting

- **Problem:** Conversation-context plan-doc claimed `bcb77c3` was unpushed at C0 of this round, but empirically `bcb77c3` was on origin/main (pushed at the prior round's close).
  - **Cause:** Redirector-vs-empirical drift in the C0 plan-doc text. The git output at C0 ("ahead by 1 commit") was about `927e7b0` (the prior round's session log), not the pair `bcb77c3` + `927e7b0`.
  - **Fix:** Caught at C3-close. Plan-doc §0.1 amended in two places with explicit drift note ("Drift caught at C3-close per §6.14.28"). Empirically verified `bcb77c3` on origin/main via `git branch -r --contains bcb77c3`.

- **Problem:** `vercel promote dpl_3RQZ... --yes` did NOT swap the production alias as the C3-promote prompt assumed. The alias still resolved to old prod after the command returned success.
  - **Cause:** Redirector-vs-tool-behavior mismatch. The prompt modeled `vercel promote` as a pure alias-swap; actual Vercel behavior is **rebuild-then-swap** — the preview's source is re-built with prod env vars, and the alias swaps atomically on build completion. The command output said "Successfully created new deployment" rather than "promoted".
  - **Fix:** Executor's discipline rule ("STOP if alias hasn't swapped after promote") fired correctly. Reported and stopped without retrying or rolling back. Redirector confirmed rebuild-then-swap was correct Vercel behavior via web-searched docs; C3-verify proceeded to poll the new deployment and verify the auto-swap on Ready. Banked as new pattern §3.13.

- **Problem:** First Edit attempt on `package.json` failed with "File has not been read yet."
  - **Cause:** The harness requires Read before Edit even when the file's contents are visible elsewhere (output of `cat | jq` earlier in the session doesn't count).
  - **Fix:** Read `package.json` first (just the relevant section), then re-ran the Edit. No code impact.

- **Problem:** `vercel logs --since 10m` errored with "The --follow flag does not support filtering. Remove: --since".
  - **Cause:** `vercel logs` implicit-follows when given a deployment URL; `--since` is incompatible with follow. Vercel CLI doesn't surface this clearly.
  - **Fix:** Used `--no-follow --limit 200 --expand` instead. Sufficient for post-deploy verification.

- **Problem:** Vercel CLI logs duplicated each event 3–12× and were 5–10+ minutes stale.
  - **Cause:** `vercel logs` CLI artifact: duplicates events in its output, and the log indexing lags real-time by several minutes.
  - **Fix:** No code fix; both behaviors banked as forward pins (`R-vercel-logs-cli-duplication-artifact`, `R-vercel-logs-staleness`). Methodology adjustment: rely on in-browser testing for fresh-traffic signal, not on `vercel logs`.

- **Problem:** Health-check on preview returned 401 instead of 200.
  - **Cause:** Vercel Deployment Protection gates preview URLs behind auth by default. The 401 came from Vercel's edge before reaching the function.
  - **Fix:** Recognized as expected (URL reachable, just unauthenticated). In-browser testing by Leo resolved auth automatically. Build-log warning absence served as the meaningful pre-Leo signal at the preview stage.

- **Problem:** Build-log warning grep'd as "absent" but I wasn't sure if that was a false-negative (warning fires only at runtime, not build).
  - **Cause:** The cacheComponents warning fires when `createAtomicTimerGroup` is exercised during page rendering — which happens during static-page generation at build time, AND at runtime on every dynamic render. C1's build-time absence was a real signal because static generation under cacheComponents would have emitted the warning during build.
  - **Fix:** Confirmed by reading the warning emission code path and verifying the build's static-page-generation phase would have exercised `createAtomicTimerGroup`. Build-time absence is meaningful.

## Decisions Made

- **Option B (disable cacheComponents) first, Option A (runtime swap) as fallback.** Reasoning: Option B is one line vs Option A's four lines; our app uses zero cacheComponents features so disabling is functionally a no-op; testing the cacheComponents-mechanism in isolation gives a higher-information experimental result than testing both at once.
- **H2 search before C1.** Reasoning: 10 minutes of checking upstream stops us from wasting a preview deploy if a fix already exists. The search did its job — refuted H2 cleanly and unlocked Option B reframing.
- **C2 stacked on top of C1 rather than reverting C1.** Reasoning: removing cacheComponents is harmless on Node (we don't use it anyway). Keeping C1 in place lets the next experiment vary only the runtime, isolating the variable. Also: if the runtime swap later turns out wrong, we have one revert per intervention rather than two coupled reverts.
- **Promote via `vercel promote` rather than another `vercel deploy --prod`.** Reasoning: promote ensures the prod deployment is built from the *exact same source* as the validated C2 preview (just with prod env vars). `vercel deploy --prod` would have re-uploaded files from the working tree — equivalent in this case but less direct.
- **Audit-first commit-0.** Reasoning: the prior round's pin had three candidate interventions; without an audit, we'd be guessing. The audit ended up identifying the exact code mechanism behind the warning (high-confidence), letting us design experiments that would discriminate between candidate causes.
- **Don't push at round boundaries before C3-close.** Reasoning: matches the user's established convention. Round-close push is atomic — one push at the end after all the validation evidence is in the plan-doc.
- **Surgical edits to plan-doc, no wholesale rewrites.** Reasoning: §6.14.20. Each plan-doc edit was a `str_replace` against verbatim anchors; preserves historical text for closed-plan-immutable.
- **Don't expand C0.5's edit scope to fix §0.1 drift.** Reasoning: the C0.5 prompt's Edit 7 condition was specific to `927e7b0` existence and didn't fire. Per §6.14.20 surgical-edit discipline, I flagged the bcb77c3-pushed issue in unexpected findings and deferred the fix to C3-close where it was explicitly authorized.

## Current State

- **Production** (`https://18seconds.vercel.app`) is serving `dpl_HaYWegFbr7CLsY7qcS5NKcDhSv8v`, built from commit `0e759bf`. Configuration: `cacheComponents` disabled, Node.js runtime (no Bun).
- **Symptoms:** Submit-hangs eliminated (0-in-50 on Leo's full-length validation session). Cold-start improved from 2.9s to 879ms (~3.3× faster). cacheComponents build/runtime warning gone from logs.
- **Rollback path intact:** `dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6` (commit `9ece713`, old C5.5 defensive-fix deploy) remains Ready and re-promotable for the next 24–48h via `vercel rollback dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6 --yes`.
- **Plan-doc** at `docs/plans/cacheComponents-investigation.md` (479 lines) is finalized and closed. §0.11 pin index has 2 retired (`R-cacheComponents-bun-settimeout-incompat`, `R-no-use-cache-directive-in-app`) and 6 newly opened.
- **Sub-type 6 tracker:** 4/5 entering this round, 4/5 exiting. Zero sub-type 6 deviations this round.
- **Git state:** clean working tree, HEAD = `a830b23`, origin/main = `a830b23`. All 6 commits pushed.
- **Local development unchanged:** the `dev` script still uses `bun next dev`. The runtime swap affected only production build/start scripts and `vercel.json`.

## Next Steps

1. **Open `end-session-perf` round.** `R-end-session-perf-slow` is now the highest-priority open pin: 50-Q `endSession` path takes ~1 minute end-to-end with zero log emissions on the happy path. Pre-existing on Bun, masked by C2-eliminated hangs. C0 audit should focus on instrumenting `endSession` first (no log emissions today means we can't see where the time goes), then identify the bottleneck.
2. **24–48h monitor window on the C2 production.** Watch for any regression Leo might catch in real usage. Rollback ready via `vercel rollback dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6 --yes`.
3. **Workflow-hostname-pinning investigation** (`R-vercel-workflow-pins-to-deployment-hostname`). Could fold into the `end-session-perf` round's C0 audit since mastery-recompute workflows are on the endSession path. If workflows pin to specific deployment hostnames, every promotion creates an in-flight-workflow cutover window that may need attention.
4. **Defer indefinitely:** `R-bun-nextjs16-action-stream-mechanism-uncharacterized` (the deeper Next.js source mechanism for Bun + server-action hangs). Symptoms resolved; the audit is academic. Pin stays open as a someday-later research note.
5. **Defer:** `R-future-use-cache-requires-runtime-investigation-revisit`. Only relevant if we want to use `'use cache'` / `cacheLife` features later. Currently no driving use case.
