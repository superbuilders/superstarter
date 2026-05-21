# Session Log: auth-oidc-restore Round + cacheComponents/Bun Critical Finding

**Date:** 2026-05-12, roughly 09:00 → 10:46 -05:00 (this session); cumulative session including the prior `prod-runtime-credentials-audit` round opening earlier stretches ~10 hours of investigation thread.
**Duration:** ~1h 45m of active work this final segment; ~10h cumulative across both rounds and the live-hang interrupt.
**Focus:** Ship a fix for the production OIDC cold-start race causing diagnostic-submit hangs. During validation, discover an unrelated `cacheComponents` + Bun `setTimeout` interaction that is the actual cause of user-visible submit-hangs; document it for the next round.

## What Got Done

- **Opened `prod-runtime-credentials-audit` round** (commit `4ba8b6d`): audit-only round confirming OIDC `x-vercel-oidc-token` failures are live, intermittent, and originate inside `@vercel/oidc-aws-credentials-provider`'s sync token-lookup path. Registered top hypotheses H1 (Bun ALS gap), H2 (`pg.Pool` callback scope), H3 (runtime injection gap).
- **Opened `auth-oidc-restore` round** (commit `68b89ba`): wrote `docs/plans/auth-oidc-restore.md` and added diagnostic probe code to `src/db/index.ts`:
  - `snapshotOidcSources()` + `readVercelContextValue()` + `extractOidcTokenFromContext()` helpers, strict `unknown`-narrowing throughout (no `as`, no `any`, no added dependency).
  - One `logger.info` line per `getDbPassword` invocation: `"getDbPassword: oidc source snapshot"` carrying 4 booleans (`hasContextHolder`, `hasContextValue`, `hasContextToken`, `hasEnvToken`).
- **Deployed probe to production** (`dpl_GC1AWkGzUQzqz9kbX3XZZFUHwCG1`, URL `18seconds-qsab4xs1s-...`, ~09:30 -05:00). §6.14.31 gate-1 fired and confirmed.
- **C3 partition analysis** captured 19 snapshots in a 10-min window: 17 successes vs 2 failures. Both failures on lambda `169.254.35.81` at +0ms and +7ms after cold-start; same lambda 5.5s later: success. **H1 and H2 REJECTED**, **H4 (Vercel cold-start OIDC injection race) confirmed.**
- **Wrote C4-W fix** (commit `820fad7`):
  - Added `waitForOidcToken(maxWaitMs, intervalMs)` helper in `src/db/index.ts`. Polls every 50ms up to 2000ms cap when entry-snapshot shows no OIDC source.
  - Modified `getDbPassword` to invoke the helper conditionally and emit `"getDbPassword: oidc poll result"` with `{pollMs, success}` on engagement.
  - Added §0.12 plan-doc section: controlled cold-start trigger procedure using the `__Secure-authjs.session-token` cookie (cookie name confirmed empirically from `@auth/core` source).
- **Deployed C4-W fix** (`dpl_BnKMmLsVk1gRzebR9zZwKgv4DcYH`, URL `18seconds-5o6nwtyli-...`, pre 10:08:11, ready 10:10:38 -05:00). Health-check `GET /api/health` returned `200 {"ok":true}` in 1.098s. §6.14.31 gate-2 fired.
- **First validation attempt:** organic + curl-burst traffic. 0 poll-result lines, all snapshots `hasContextToken=true`. INCONCLUSIVE.
- **Redeployed for compressed-timing race trigger** (`dpl_FvqLdLzL5p4k3CbVuVZRdbbe9ssL`, URL `18seconds-1bbmerywu-...`, pre 10:21:11, ready 10:22:51 -05:00). §6.14.31 gate-2a fired.
- **Leo fired 8 authenticated curls within ~10s of deploy-ready.** Burst-1 timing 1.353s (cold-start init); others 0.22-0.30s. Still 0 poll-result lines, all snapshots `hasContextToken=true`. Race could not be deliberately reproduced. INCONCLUSIVE for race-trigger; OIDC errors and 300s timeouts both absent.
- **Started round-close work, then URGENT interrupted.** Leo reported live submit-hang on Q6 of `/diagnostic/run`.
- **Read-only diagnostic of the live hang** (no commits, no deploys): pulled production logs, parsed structured records:
  - Q6 `POST /diagnostic/run` at `10:28:10.397 -05:00` recorded `status=200, source=serverless` server-side.
  - Only log line was the Bun-runtime `"Next.js cannot guarantee that Cache Components will run as expected due to the current runtime's implementation of setTimeout()"` warning.
  - **NO `submitAttempt: attempt inserted` log** (Q1-Q5 each had one).
  - **NO `Vercel Runtime Timeout` fired** despite 5+ minutes elapsing past the suspected hang start.
  - Heartbeats from the same lambda `169.254.74.97` continued normally with `status=204` every 30s through the hang window.
  - Concluded: NOT an OIDC issue. The OIDC fix is working as designed. This is a separate `cacheComponents` + Bun `setTimeout` defect.
- **Resumed round-close** (commit `5ecc30c`): updated `docs/plans/auth-oidc-restore.md` to `CLOSED`, added §6 ROUND-CLOSE STATUS with §6.1 outcome, §6.2 commit ledger, §6.3 gates, §6.4 sub-rounds, §6.5 cost, §6.6 sub-type 6 count, §6.7 wall-clock, §6.8 empirical validation summary, §6.9 candidate patterns (banked §3.7 at 1/5), **§6.10 CRITICAL FINDING** documenting the `cacheComponents` discovery, §6.11 handoff. Rewrote §0.11 forward-pin index with 6 R-* entries.
- **Pushed to origin** (`68b89ba..5ecc30c main -> main`). First explicit `git push` of the session — the auto-push behavior observed earlier had stopped.

## Issues & Troubleshooting

- **Problem:** Earlier-session commits auto-pushed to `origin/main` without me running `git push`.
  - **Cause:** Unidentified external tool (IDE plugin, file-watcher, or one of the user-config Claude plugins) was auto-pushing on commit. Not from lefthook (pre-commit only runs lint+typecheck) and not from Claude config (no auto-push hook found).
  - **Fix:** Behavior self-disabled around commit `820fad7` and stayed off through round-close. Final round-close commit `5ecc30c` required explicit `git push origin main`. Flagged but not blocking.

- **Problem:** `vercel logs --level error` filter did not return the OIDC error despite it being logged at Pino level 50 (error).
  - **Cause:** Vercel's log-level filter doesn't map cleanly to Pino's level field as expected.
  - **Fix:** Switched to `--query "x-vercel-oidc-token"` / `--query "oidc"` for substring matching. Worked reliably.

- **Problem:** `--since 24h --limit 5000` query for log aggregation returned only the most recent ~9.6 minutes (with 4549 records) because the project has high heartbeat + user-activity volume.
  - **Cause:** Vercel logs API caps at the most-recent N events when a high-volume project is queried.
  - **Fix:** Used narrower `--since` windows targeted at specific timestamps when older data was needed.

- **Problem:** Probe code initially failed biome lint with cognitive complexity 33 (vs max 15).
  - **Cause:** All `unknown`-narrowing inline in a single `snapshotOidcSources()` function.
  - **Fix:** Refactored into three functions (`readVercelContextValue`, `extractOidcTokenFromContext`, `snapshotOidcSources`); each well under threshold.

- **Problem:** Probe code initially used `process.env.VERCEL_OIDC_TOKEN` directly, failing biome's `noProcessEnv` rule.
  - **Cause:** Forgot to use the typed `env` wrapper.
  - **Fix:** Switched to `env.VERCEL_OIDC_TOKEN` (the field was already declared in `src/env.ts`'s schema).

- **Problem:** First burst plan (100 unauthenticated curls) generated 0 new probe snapshot lines.
  - **Cause:** Auth.js short-circuits the DB session lookup when no session cookie is present, so `getDbPassword` is never called.
  - **Fix:** Documented authenticated-curl procedure in §0.12 using Leo's `__Secure-authjs.session-token` cookie; verified cookie name from `@auth/core`'s `cookie.js` source.

- **Problem:** Compressed-timing curl-after-deploy attempts (twice) couldn't reproduce the cold-start OIDC race.
  - **Cause:** (a) the race window appears <10ms based on C3 data, but deploy→first-curl interval was ~9-53s — well past the window; (b) `pg.Pool` reuses warm connections, so subsequent curls on the same lambda bypass the `password` callback entirely (this is the new candidate pattern §3.7).
  - **Fix:** No fix attempted. Accepted that empirical poll-path validation remains pending an organic occurrence. Banked as `R-oidc-fix-empirical-validation-gap`.

- **Problem:** Harness blocked `sleep 30` between deploy-ready and health-check.
  - **Cause:** Sandbox blocks long leading sleeps.
  - **Fix:** Curled immediately (deployment was already in `READY` state per Vercel API).

- **Problem:** Q6 submit-hang did NOT match any OIDC pattern.
  - **Cause:** Different mechanism entirely. Vercel marked `status=200` server-side, only log line was the Bun `cacheComponents` warning, no `submitAttempt: attempt inserted` log, no `Vercel Runtime Timeout`, healthy heartbeats throughout. Hypothesis: Bun `setTimeout` + Next.js 16 `cacheComponents` + Server Action response-streaming has a pathological failure mode where the action body terminates without completing OR the response stream closes prematurely without the client knowing.
  - **Fix:** None applied this round. Banked as **`R-cacheComponents-bun-settimeout-incompat`** (high priority). The next round (`diagnostic-onboarding-removal`) will operationally sidestep by removing the affected routes.

## Decisions Made

- **Probe-only first, no assumptions.** User explicitly chose strict empirical validation over the faster "swap to Node.js runtime" path despite production being degraded.
- **C4-W (poll-and-wait barrier)** chosen over C4-N (runtime swap) and C4-E (eager token capture). C3 partition data rejected H1 (which underlies C4-N), and C4-W is the smallest-diff fix consistent with H4.
- **2000ms cap on the poll loop** (vs the discussed 500ms alternative). Wide safety margin above the empirical <10ms race window without risk of approaching the 300s function timeout.
- **Keep probe code in production at round-close** for 24-48h organic monitoring. Validates poll-path engagement if/when an organic race occurs.
- **Close `auth-oidc-restore` as `CLOSED` (SUCCESS)** even though poll-path engagement remained unvalidated. The scoped goal (OIDC errors stop) was achieved (0 errors / 0 timeouts in 27 observed snapshots).
- **Treat the Q6 hang as a separate bug**, not a "fix-the-fix" concern. Different mechanism, different surface, different round.
- **Read-only mode during the live hang.** No code changes, no deploys; the in-flight hang itself was the diagnostic window.
- **Manual `git push`** at round-close rather than relying on the earlier auto-push side-effect.

## Current State

**Production:**
- Deployment: `dpl_FvqLdLzL5p4k3CbVuVZRdbbe9ssL` (commit `820fad7`), aliased to `https://18seconds.vercel.app`.
- OIDC fix live and operationally healthy: 27 observed snapshots all `hasContextToken=true`, 0 errors, 0 poll engagements in the validation windows.
- Probe code retained in `src/db/index.ts`: `snapshotOidcSources`, `readVercelContextValue`, `extractOidcTokenFromContext`, `waitForOidcToken`, plus two `logger.info` emissions inside `getDbPassword` (~70 lines total).

**Known active defects on production:**
- `R-cacheComponents-bun-settimeout-incompat` — observed live on Leo's Q6 `POST /diagnostic/run` at `10:28:10.397 -05:00`. Server marks `status=200`, action body never completes, client hangs. The only known reproducer surface is the diagnostic flow.

**Repo state:**
- Branch `main` at `5ecc30c`, up to date with `origin/main`.
- Working tree clean.
- Two rounds CLOSED this session: `prod-runtime-credentials-audit`, `auth-oidc-restore`.

**Plan-docs written/updated:**
- `docs/plans/prod-runtime-credentials-audit.md` — opened + closed earlier in the session (audit-only).
- `docs/plans/auth-oidc-restore.md` — opened, ran through C0/C2/C3/C4/C2a, closed at 488 lines.

## Next Steps

1. **Open `diagnostic-onboarding-removal` round.** Leadership-requested, timeline: this week. Removes the forced-diagnostic onboarding flow (post-login → dashboard directly). Side-effect: removes the routes where `R-cacheComponents-bun-settimeout-incompat` was observed live. Practice tests remain available.
2. **Monitor the OIDC probe for 24-48h.** If `getDbPassword: oidc poll result` lines accumulate organically with `success=true` + small `pollMs`, the C4-W fix is empirically validated. If none accumulate, accept the fix as a non-harmful safety net.
3. **Open `oidc-probe-removal`** (or fold into a broader cleanup pass) after the monitoring window. Removes the ~70 lines of probe code from `src/db/index.ts`.
4. **Flip `waitForOidcToken` to check-then-wait order.** Currently `await`s `setTimeout` BEFORE the first snapshot check, adding a guaranteed 50ms floor to any cold-start-engaged invocation. Banked as `R-poll-loop-50ms-minimum-overhead`. Fold into the probe-removal round.
5. **Decide long-term resolution for `R-cacheComponents-bun-settimeout-incompat`.** Options: (a) swap production runtime from Bun to Node.js, (b) disable `cacheComponents` for affected routes, (c) wait for a Bun runtime upgrade. Even after the diagnostic flow is removed in step 1, this defect may surface in other Server-Action surfaces; resolution remains valuable.
6. **`R-300s-request-hang-on-credential-failure`** stays banked at lower priority. Only re-engages if a future regression re-opens the OIDC source-missing path. Worth fixing in a small commit if and when the failure-handling path is touched for other reasons.
