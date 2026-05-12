# cacheComponents Investigation — Plan-Doc

Round: cacheComponents Investigation.
Round-open hash: `bcb77c3` (HEAD at C0 audit; verified clean working tree; `git rev-list --left-right --count origin/main...HEAD = 0 1` at C0 — `bcb77c3` is the prior `onboarding-flow-removal` round's close commit, **pushed to origin at that round's close**. The single locally-unpushed commit at C0 of this round was `927e7b0` (the prior round's session-log commit, not `bcb77c3`). The original §0.1 text was wrong on this point; corrected at C3-close per §6.14.28 (redirector-vs-empirical drift).
Round-close hash: this commit (C3-close).
**Round status: CLOSED — root cause fixed in production. Hangs eliminated; cold-start improved ~3.3×.**

> **Round-shape decision (closed-plan-immutable from C0).** Audit-only commit-0. No production deploys, no runtime swaps, no code changes. C0 deeply audits the failure mechanism — reads Next.js 16's cacheComponents implementation, locates the warning emission site, identifies every call path, and articulates a hypothesis register with concrete falsification tests. A user-reviewed plan is the precondition for any code change or experiment. C1+ will execute the chosen experiment (likely: Bun → Node.js runtime swap on a Vercel preview deployment) and either confirm or refute the root-cause hypothesis.

---

## §0 Round metadata

### §0.1 Round name + hashes

- **Name:** cacheComponents Investigation.
- **Plan-doc filename:** `docs/plans/cacheComponents-investigation.md`.
- **Open hash (empirical, verified at commit-0):** `bcb77c3` — `docs(plans): close onboarding-flow-removal ...`. Working tree clean (`git status` — clean). One commit ahead of `origin/main` at C0. **Drift caught at C3-close (§6.14.28):** the original §0.1 text claimed both `bcb77c3` and `927e7b0` were local-committed-but-unpushed at C0. Empirically `bcb77c3` was already on origin/main at this round's C0 (pushed at the prior round's close); only `927e7b0` (the prior round's session-log commit) was unpushed. The "one commit ahead" was `927e7b0` alone, not the pair. Corrected here at C3-close.
- **Concurrent rounds:** none.
- **Target close hash:** this commit (C3-close).

### §0.2 Trigger

Severity-downgraded pin `R-cacheComponents-bun-settimeout-incompat` from the closed `onboarding-flow-removal` round (§0.11, status changed at that round's close from "blocking" to "degraded UX, survivable"). Underlying defect:

> Bun runtime + Next.js 16 `cacheComponents` + Server Actions interaction causes server actions to **silently fail**: `status=200` is recorded server-side AND the Bun-runtime warning `"Next.js cannot guarantee that Cache Components will run as expected due to the current runtime's implementation of setTimeout()"` is emitted, but the action body never completes its work (no business-logic log line emitted) and the client hangs awaiting response data that never streams.

Goal of this round: **identify the root cause of the cacheComponents+Bun+server-action interaction, and determine whether the Bun → Node.js runtime swap is the right fix or whether a more targeted intervention exists.**

The defect is currently **survivable** thanks to commit `9ece713` (`submit_failed` reducer action shipped under the prior round's C5.5 sub-round): when a server-action invocation fails on the client, the shell clears `submitPending` and the user can retry. But the root cause remains open, and the symptom now reproduces on `/full-length/run` (server-action submit) **and** `/full-length/configure` (page-load RSC streaming). Both surfaces remain in production-facing use.

### §0.3 Scope (in-scope)

1. **C0 — Deep audit (this commit).** Read Next.js 16.2.4's cacheComponents/staged-rendering source. Locate the verbatim warning emission site. Map every call site of the affected primitives. Inventory our app's usage of cacheComponents-adjacent features. Inventory the runtime-swap surface (`vercel.json`, `package.json` scripts, dependencies). Articulate a hypothesis register with concrete falsification tests. **No code change. No deploy. Plan-doc + commit only.**

2. **C1 onward — TBD pending user authorization.** Most likely C1: deploy a Vercel **preview** (not production) with Node.js runtime (`vercel.json` `bunVersion` removed, `package.json` build/start scripts swapped to plain `next build` / `next start`). Reproduce the failure mode on the preview URL with a multi-question full-length practice session. If the warning disappears AND submit-hangs disappear AND RSC-payload-as-text is no longer observed → **H1 confirmed** (Bun's `setTimeout` `_idleStart` absence is the root cause). Proceed to C2 (production runtime swap under §6.14.31 gate).

If preview behaves identically to prod (defect persists on Node.js) → **H1 refuted**, redirect to H2/H3.

### §0.4 Anti-scope (explicit)

- **NOT** deploying to production this round until the preview experiment confirms the fix. Production deploys go through a §6.14.31 gate after preview validation.
- **REFRAMED at C0.5 (2026-05-12).** The original C0 anti-scope said *"NOT disabling `cacheComponents: true` as a first-line intervention; that is H3's falsification test."* C0.5's H2 search (see §0.5 Finding 7) refuted the wait-for-upstream option: both Bun and Vercel/Next.js have stalled at the issue. Combined with §0.5 Finding 3 (our app uses zero `'use cache'` / `cacheLife` / `cacheTag` directives), **disabling `cacheComponents` is now a first-line intervention**, not a fallback. The change is one line in `next.config.ts` and directly removes the broken `runInSequentialTasks` code path without touching the runtime. Side effect: loses the future ability to add `'use cache'` features until upstream resolves; `await connection()` in `src/server/admin/queue-data.ts:284` becomes a no-op (default render is dynamic, which is what `connection()` was already forcing). The original "fallback intervention, not a default" framing is **superseded**. See §5 for the restructured C1 plan.
- **NOT** patching Next.js source in `node_modules/`. The defect is in Next.js's interaction with Bun, not in Next.js itself.
- **NOT** filing a Bun bug report or a Next.js GitHub issue this round. We may do that as a follow-up after the root cause is empirically validated — premature reporting risks miscaracterization. The Next.js source file (`app-render-scheduling.js` line 99) already invites a GitHub issue, but we don't have a minimal repro to attach yet.
- **NOT** changing the local `dev` script (`bun next dev`). Local dev is unaffected by the production runtime swap; the dev script is a different invocation path.
- **NOT** touching the `submit_failed` reducer action (commit `9ece713`) or any defensive recovery in `<FocusShell>`. The defensive fix stays in place regardless of root-cause resolution — it's the user-facing safety net.

### §0.5 Empirical audit findings at commit-0

#### Finding 1 — Warning emission site is **deterministic and known**

File: `node_modules/next/dist/server/app-render/app-render-scheduling.js`, line 99:

```js
function warnAboutTimers() {
    console.warn("Next.js cannot guarantee that Cache Components will run as expected due to the current runtime's implementation of `setTimeout()`.\nPlease report a github issue here: https://github.com/vercel/next.js/issues/new/");
}
```

This is called in three branches within the same file (`createAtomicTimerGroup`):

- **Branch A (the actual Bun trigger, line 167-168):** when `timer._idleStart` is **not present** on the setTimeout return value, the function gives up patching and warns. Bun's setTimeout returns a timer object that does **not** have an `_idleStart` property — this branch fires on every render. The Next.js source explicitly anticipates this case with the inline comment on line 153-154:

```js
// NodeJS timers have a `_idleStart` property, but it doesn't exist e.g. in Bun.
// If it's not present, we'll warn and try to continue.
```

- **Branch B (line 173-181):** an unexpected error while reading/writing `_idleStart`. Fallback path that calls `warnAboutTimers()`. Unlikely to be our branch.

- **Branch C (line 129-133):** a setImmediate fired between two consecutive setTimeouts, indicating that the patching attempt failed. Could fire on Node, in principle, if `_idleStart` patching itself fails. On Bun this branch is unreachable because Branch A already disabled patching.

**Implication:** the warning is a *consequence* of Bun's setTimeout shape (no `_idleStart`), not a *symptom* of broken setTimeout semantics. The actual broken behavior is the **silent loss of atomic timer-group guarantees**: subsequent timers in the group may execute in different event-loop iterations rather than the same one.

#### Finding 2 — `createAtomicTimerGroup` is used **everywhere** in the cacheComponents render path

`createAtomicTimerGroup` is consumed by `runInSequentialTasks` (`node_modules/next/dist/server/app-render/app-render-render-utils.js`), which in turn is called from **16 distinct sites** in `app-render.js`. Sample call site (lines 499-515):

```js
const flightReadableStream = await runInSequentialTasks(()=>{
    stageController.advanceStage(RenderStage.Static);
    const stream = workUnitAsyncStorage.run(requestStore, renderToReadableStream, rscPayload, clientModules, {...});
    const [dynamicStream, staticStream] = stream.tee();
    countStaticStageBytes(staticStream, stageController).then(resolveStaticStageByteLength);
    return dynamicStream;
}, ()=>{
    // ... drain microtask queue so the stale time iterable is closed before advancing
    void finishStaleTimeTracking(staleTimeIterable);
}, ()=>{
    stageController.advanceStage(RenderStage.Dynamic);
});
```

This is the **staged rendering pattern**: render a Static stage, drain microtasks, advance to Dynamic stage. `runInSequentialTasks` is designed to make those three tasks execute in three sequential event-loop iterations *without other work interleaving between them*. On Node, `_idleStart` patching guarantees this. On Bun, it does not.

The 16 call sites cover the full RSC rendering pipeline: initial RSC stream emission, runtime prefetch, final-stream emission, prerender, instant-validation. Every page render with `cacheComponents: true` traverses at least one of these paths.

#### Finding 3 — Our app uses **zero explicit `'use cache'` directives**

Repository-wide grep:

```sh
grep -rn "^[[:space:]]*[\"']use cache[\"']" src/  # 0 matches
grep -rn "'use cache'\|\"use cache\"" src/  # only comments (queue-data.ts:283)
grep -rn "cacheLife\|cacheTag\|unstable_cache" src/  # 0 matches
```

The only cacheComponents-adjacent reference is `await connection()` in `src/server/admin/queue-data.ts:284`, which is the **opposite** of `'use cache'` — it marks a loader as per-request (un-cacheable) so Pino's internal `Date.now()` read doesn't trip the cacheComponents prerender check.

**Implication:** even though our app does not opt into the `'use cache'` feature, **`cacheComponents: true` in `next.config.ts` still routes every render through `runInSequentialTasks`** for the basic Static → Dynamic stage transition. The warning fires on every render. The atomic-timer-group guarantee fails on every render. The defect surface is the entire app, not a specific route.

This explains why the bug reproduces on routes like `/full-length/configure` (read-only page) and not just on routes with server actions (`/full-length/run`): the staged-rendering machinery runs regardless of whether the request triggers a write.

#### Finding 4 — Server-action flow has no cacheComponents-specific code path

`src/app/(app)/actions.ts`'s `submitAttempt`, `endSession`, `startSession` etc. all follow the same shape:

1. Zod-parse input.
2. `auth()` → `requireUserId()`.
3. Call the underlying `@/server/sessions/*` function.
4. (mutating actions only) `revalidatePath()` calls.

The `revalidatePath()` calls are interesting because they invalidate Next.js's path-based cache, which in turn is consumed by the staged-rendering machinery on the next render. But the action itself (the function that runs server-side in response to the client POST) is a separate code path from `runInSequentialTasks` — server actions go through Next.js's action-router, not the RSC render path.

So **why do server actions hang?** Hypothesis: the client-side POST response from a server action is itself encoded as an RSC payload (Next.js's "action result" return shape is a flight stream), and that response stream is emitted via the staged-rendering machinery. If the atomic-timer-group guarantee fails during that stream emission, the stream can stall mid-flight — the server logs the function body completing (status=200, no error) but the response stream never reaches the client.

This matches the observed symptom exactly: server logs show 200, no error; client hangs waiting for response data that never arrives.

#### Finding 5 — RSC-payload-as-text symptom is the same root cause

Leo observed that pages occasionally render the raw RSC flight payload as visible text. This is what happens when the **client** receives a response with the wrong content-type or a malformed stream. If a staged render emits the Static stream but never advances to Dynamic (because the atomic-timer-group failed), the client receives a truncated or improperly-framed flight payload and falls back to rendering it as text.

Both the submit-hangs and the RSC-as-text symptoms have a single root cause: **`runInSequentialTasks` not running tasks in the same event-loop iteration on Bun**.

#### Finding 6 — Runtime-swap surface is tiny and isolated

`vercel.json`:
```json
{
  "bunVersion": "1.x",
  "regions": ["iad1"],
  "crons": [{ "path": "/api/cron/abandon-sweep", "schedule": "0 4 * * *" }]
}
```

`package.json` (build + start, the production-runtime-binding scripts):
```json
"build": "bun --bun next build",
"start": "bun --bun next start",
```

Local dev (`dev` script) is `bun next dev` (no `--bun` flag) — Bun launches Next dev, but the dev render-worker runs under a different (non-`--bun`) execution context. This means local dev does NOT reproduce the production runtime behavior (and historically has NOT reproduced the bug locally). The runtime swap affects only production.

Other Bun-tied surfaces:
- `db/scripts/*` use `bun --bun run`. Not affected by the runtime swap (these are scripts, not the Next.js server runtime).
- `bun:sqlite` / `Bun.file` / `Bun.serve` API usage in app code: grep returns zero matches in `src/`. The codebase happens to use only standard Node.js APIs (`pg`, not `Bun.sql`; `pino`, not custom logger; standard `fetch`). The Bun runtime is essentially being used as a faster Node.js — there is no Bun-API lock-in.
- `serverExternalPackages: ["pg", "pino", "pino-pretty"]` in `next.config.ts`: this means `pg` runs as a Node.js external package on the server (not bundled), which is a Node-vs-Bun-agnostic config. Unchanged by the runtime swap.

**Implication:** removing `bunVersion` from `vercel.json` and removing `--bun` flags from `build` and `start` in `package.json` is the complete runtime-swap intervention. Total change: ~4 lines.

#### Finding 7 — Upstream-fix status (H2 search, 2026-05-12)

C0's §5 pre-step authorized a 10-minute upstream-issue search before committing to C1. The redirector executed that search at C0.5. Result:

| Reference | Project | Date | Status (as of 2026-05-12) |
|---|---|---|---|
| `vercel/next.js#87630` | Next.js issue (original) | 2025-12-22 | Open |
| `oven-sh/bun#25639` | Bun issue (original) | 2025-12-22 | Closed by PR #26021 |
| `oven-sh/bun#26021` | Bun PR — added `_idleStart` getter/setter | merged 2026-01-13 | Merged (shipped in Bun ≥1.3.6) |
| `oven-sh/bun#26508` | Bun issue (deeper — fix was incomplete) | 2026-01-27 | Open |
| `oven-sh/bun#27060` | Bun PR — cache scheduling time | 2026-02-16 | Open, 11+ CI failures, rejected by Bun maintainer `190n` |
| `vercel/next.js#88514` | Next.js PR — postMessage-based scheduling (alternative) | early 2026 | Draft |

Key citation from `oven-sh/bun#27060` (Bun maintainer `190n` comment, Feb 16, 2026):

> "This doesn't fix the linked issue. The issue is not to do with the orders timers run in on their own. The issue is that Next.js expects to be able to control when timers run by modifying `_idleStart`, which Bun does not do."

Net status: neither Bun nor Vercel/Next.js has shipped a fix; both upstream paths are stalled. PR #26021 (merged in Bun 1.3.6+) added the `_idleStart` property surface but Bun **ignores mutations to it** — meaning newer Bun versions may stop emitting the warning while the symptom persists silently (a worse failure mode than the current one, because we lose the warning as a diagnostic signal). Our local Bun is `1.3.10` which contains #26021 but not the deeper fix (which hasn't merged anywhere). The Bun maintainer's stated position is that Bun does NOT intend to honor `_idleStart` mutations, so the Bun-side fix path is operationally dead.

**Implication:** there is no targeted upstream fix to wait for. The intervention must be on our side. **Empirically refutes H2 (§4).** The two viable interventions are now Option A (runtime swap, original C0 default) and Option B (disable `cacheComponents`). §5 is restructured at C0.5 to present Option B as the new default first-line intervention.

### §0.6 Doc-vs-empirical reconciliation

The prior round's `onboarding-flow-removal.md` §0.11 pin (`R-cacheComponents-bun-settimeout-incompat`) described the defect as a Bun + Next.js 16 cacheComponents + Server Actions **three-way interaction**. The C0 audit refines this:

- **Confirmed:** the warning fires whenever cacheComponents is enabled AND Bun is the runtime. The Server Actions part is **not a third causal factor** — it's an additional reproduction surface because server-action responses are themselves RSC-streamed via the same `runInSequentialTasks` primitive.
- **Refined:** the defect is correctly characterized as a **two-way interaction** (Bun + cacheComponents). Server Actions are a *consequence* surface, not a causal factor.
- **Confirmed:** the `onboarding-flow-removal` round's late-stage finding ("the bug is route-incidental, not route-specific") is exactly correct. Every route is affected; the bug only *becomes user-visible* when a render or response stream happens to lose its atomic-timer-group guarantee, which is a probabilistic event tied to event-loop scheduling jitter under Bun.

The prior round's hypothesis register (long-term resolution paths: (a) swap to Node.js, (b) disable cacheComponents, (c) wait for Bun upgrade) **stands unchanged** in its options enumeration. This round adds confidence ranking and chooses (a) as the highest-confidence falsification test.

**2026-05-12 H2 pre-step refinement.** The C0 plan-doc proposed a 10-minute upstream-issue search as a §5 pre-step. The redirector executed that search. Result: both Bun and Vercel/Next.js have open issues tracking the defect; the Bun-side fix attempt (PR #26021, merged Jan 13) was incomplete; the deeper-fix PR (#27060) was rejected by a Bun maintainer who said Bun does not intend to honor `_idleStart` mutations; Vercel's runtime-agnostic alternative (PR #88514) is still Draft. H2 is empirically refuted. The original §5 framing of Option A (runtime swap) as the highest-confidence falsification test still holds for H1, but the H2-search outcome also unlocks Option B (disable cacheComponents) as a smaller, runtime-preserving first-line intervention. §0.4 anti-scope updated accordingly; §5 restructured to put Option B first.

### §0.7 Destructive-operation surface

C0 is read-only. No destructive operations.

C1+ (provisional, pending authorization):
- **Vercel preview deploy** — non-destructive. Preview URLs are isolated; production alias is not touched.
- **Edits to `vercel.json` and `package.json`** — reversible via git revert.
- **Production runtime swap** — destructive in the sense that it changes the production runtime; reversible by `git revert` + re-deploy, but in-flight requests during the transition are an exposure surface. Production swap requires a §6.14.31 gate.

### §0.10 Forward-watch (this round, monitor across commits)

- **W-bun-as-launcher-vs-bun-as-runtime** — `bun next dev` (the `dev` script) uses Bun as a launcher but the actual Next dev worker may run under a Node-shim or under Bun's runtime depending on Bun's behavior. Empirically we do not see the cacheComponents warning in local dev logs — either dev mode skips `runInSequentialTasks` entirely, OR the dev worker isn't using Bun's runtime, OR both. If we proceed to C1's preview experiment, we should grep dev logs for the warning before/after the swap to confirm whether dev was ever affected. If dev was never affected, the swap-on-preview is even more dispositive.

- **W-runtime-prefetch-paths** — Next.js 16's runtime-prefetch (line 491 in `app-render.js`: `void cacheSignal.cacheReady().then(...spawnRuntimePrefetchWithFilledCaches...)`) is a fire-and-forget background task. If it fails silently on Bun (because of the same `runInSequentialTasks` failure mode), it would never surface as a user-visible error but might cause stale data to persist longer than intended. Worth checking after the runtime swap whether any "stale dashboard" complaints clear up.

- **W-svelte-and-other-frameworks** — The Next.js source comment "doesn't exist e.g. in Bun" suggests this is a known Bun limitation that affects *any* Next.js 16 app on Bun, not something specific to our codebase. Worth a quick GitHub-issues search at C1 boundary to see if this is already a tracked issue (which would shorten the fix timeline). Out of C0 scope.

- ~~**W-bun-1.4+-fix**~~ — **RETIRED 2026-05-12 by H2 search (§0.5 Finding 7).** Empirically falsified: Bun PR #26021 (merged Jan 13, shipped in 1.3.6+) added the `_idleStart` getter/setter surface but Bun ignores mutations to it. The deeper-fix PR #27060 was rejected by Bun maintainer `190n` on Feb 16 with the explicit statement that Bun does not intend to honor `_idleStart` mutations. No Bun release in any timeline addresses this. The `bun-upgrade-experiment-sub-round` trigger in §0.12 is correspondingly stale (Bun-upgrade-alone will not resolve the issue) but stays in the doc as a closed-plan-immutable record of what we tried.

### §0.11 Forward-pin index (updated at round-close)

Pins **carried forward** from `onboarding-flow-removal` §0.11 (status unchanged at C0):

- **R-purveyor-companion-resources-still-up** — unchanged.
- **R-strategy-linkage-unused** — unchanged.
- **R-local-prod-rejected_by-divergence** — unchanged.
- **R-script-log-verbosity** — unchanged.
- **R-script-no-concurrency** — unchanged.
- **R-300s-request-hang-on-credential-failure** — unchanged.
- **R-probe-removal-pending** — unchanged.
- **R-poll-loop-50ms-minimum-overhead** — unchanged.
- **R-vestigial-diagnostic-overtime-column** — unchanged.
- **R-onboarding-targets-form-on-historical-views** — unchanged.
- **R-startSession-zod-still-accepts-diagnostic** — unchanged.
- **R-stale-comments-after-route-removal** — unchanged.
- **R-phantom-vercel-deployment** — unchanged.

Pins **retired** at this round's close (preserved historically; flagged as retired):

- ~~**R-cacheComponents-bun-settimeout-incompat**~~ — **RESOLVED 2026-05-12 by C2 runtime swap.** Original characterization (Bun + cacheComponents two-way interaction) was empirically refined during execution: C1 disabled cacheComponents on Bun and the warning disappeared, but **submit-hangs persisted at ~1-in-5-to-20** in Leo's 50-Q preview test — refuting cacheComponents as the operative cause. C2 swapped Bun → Node (keeping cacheComponents off) and hangs went to **0-in-50** in Leo's 50-Q preview test, then 0-in-50 again on prod after promotion (`dpl_HaYWegFbr7CLsY7qcS5NKcDhSv8v` built from commit `0e759bf`). The Bun runtime is the operative cause. The cacheComponents-leg of the original two-way model contributes only the build/runtime *warning*, not the user-visible hang. The deeper Next.js source mechanism remains uncharacterized — see new pin `R-bun-nextjs16-action-stream-mechanism-uncharacterized`.

- ~~**R-no-use-cache-directive-in-app**~~ — **MOOT 2026-05-12.** With `cacheComponents: true` removed from `next.config.ts` at C1, the directive surfaces are now inaccessible anyway. The pin's premise ("we pay the cacheComponents cost without using cacheComponents features") is no longer load-bearing. If we ever want to use `'use cache'` features in the future, see the new pin `R-future-use-cache-requires-runtime-investigation-revisit`.

Pins **newly opened** at this round's close:

- **R-bun-nextjs16-action-stream-mechanism-uncharacterized** — The C0 audit articulated a clean mechanism for the build-time warning (Bun's missing `_idleStart` → `runInSequentialTasks` atomicity break → cacheComponents staged-rendering stream-stall). That mechanism explained the warning. **It did NOT explain the user-visible submit-hangs**, because C1 removed cacheComponents (taking `runInSequentialTasks` off the render path entirely) yet the hangs persisted. C2's Bun → Node swap eliminated the hangs, confirming Bun as the operative cause, but the **exact Next.js source mechanism** by which Bun + Next.js 16 server-action streaming produces hangs (independent of `runInSequentialTasks`) was never identified. Symptoms are resolved in production. Mechanism-level root cause is someday-later work. **Priority: low** — the fix works empirically; the audit is academic.

- **R-future-use-cache-requires-runtime-investigation-revisit** — If we ever want to use `'use cache'` / `cacheLife` / `cacheTag` features in the codebase, we must either (a) keep Node runtime permanently (re-enabling `cacheComponents: true` on Node is the simplest path; Node honors `_idleStart` mutations so the staged-rendering primitive works correctly), OR (b) wait for upstream resolution (Bun honoring `_idleStart` mutations OR `vercel/next.js#88514`'s postMessage-based scheduling shipping). Current path of least resistance: stay on Node. **Priority: low** — no current use case demands these features.

- **R-vercel-logs-cli-duplication-artifact** — `vercel logs --limit N` returns each log event 3-12 times verbatim (observed 2026-05-12 at C3-verify and again at end-session-perf log capture). Absolute event counts from `vercel logs` should be deduplicated before quantitative reasoning. Qualitative interpretation (present/absent, healthy/error) still works. **Priority: medium-low** — affects log-based diagnostics methodology, not production behavior.

- **R-vercel-logs-staleness** — `vercel logs` for prod returned identical content at C3-verify (`14:16 UTC`) and at end-session-perf log capture (`14:24 UTC`, 8 min later) despite known prod traffic in between. Vercel CLI log pull has 5–10+ minute indexing latency or caching. Use-case impact: real-time post-deploy verification is unreliable; rely on direct in-browser testing for fresh-traffic signal. **Priority: medium-low** — methodology, not a production defect.

- **R-end-session-perf-slow** — 50-question full-length `endSession` path takes ~1 minute end-to-end. The `endSession` happy-path emits zero log lines today (only a level-40 warn when finalized-twice). Optimization blocked on instrumentation. Investigation deferred to a successor `end-session-perf` round (to be opened next). **Note:** this issue was pre-existing on Bun production, just masked by the more-visible mid-session hangs that C2 eliminated. **Priority: medium** — user-visible 60s wait at the end of every full-length session.

- **R-vercel-workflow-pins-to-deployment-hostname** — Vercel Workflow POST `/.well-known/workflow/v1/step` and `/.well-known/workflow/v1/flow` invocations log under the **deployment hostname** (e.g., `18seconds-gxbup1hfw-...`), not the prod alias `18seconds.vercel.app`. Suggests workflows are pinned to specific deployments rather than the floating alias. Worth confirming during end-session-perf C0 audit — has implications for how mastery recompute runs during post-promotion cutover windows. **Priority: medium** — could affect every promotion if workflows-in-flight reference the pre-promotion deployment.

### §0.12 Sub-round triggers (pre-authorized)

- **`preview-deploy-blockage-sub-round`** — fires if C1's preview deploy fails to build (e.g., Node.js incompatibility in our codebase that Bun was masking). Scope: identify the incompatibility, decide between (a) fix the incompatibility, (b) abandon the swap, (c) escalate to user. Out-of-scope: scope creep into unrelated codebase fixes.

- **`bun-upgrade-experiment-sub-round`** — fires if W-bun-1.4+-fix surfaces a Bun release that claims to fix the `_idleStart` compatibility. Scope: try the upgrade on preview before the runtime swap; if it works, that's the lower-friction fix. Out-of-scope: trying any Bun version older than what production currently runs.

---

## §1 Commit Ledger

- **C0 — Plan-doc + commit-0 audit.** Commit `d3196b4`. No code changes. Plan-doc lands at `docs/plans/cacheComponents-investigation.md`. Round-open hash `bcb77c3`; this commit is C0.

- **C0.5 — Plan-doc amendment: integrate H2 search findings; reframe Option B as first-line intervention.** Commit `d02e5db`. No code changes. Documents upstream stall (Bun and Vercel both have open issues, no shipping fix), refutes H2 (§0.5 Finding 7 added; §4 H2 confidence → REFUTED), restructures §5 to present Option B (disable `cacheComponents`) as the new default first-line intervention and Option A (runtime swap) as the alternative. §0.4 anti-scope updated; §0.6 reconciled; §0.10 retires `W-bun-1.4+-fix`; §4 H1 gets an Option-B falsification angle note; §4 H3 deprioritized.

- **C1 — Disable `cacheComponents: true` in `next.config.ts`.** Commit `445599b`. Single-line removal. Preview deploy `dpl_BWnjzqqVJoupLK8pevTWaM3H3mbS` at `https://18seconds-r8mxxmeho-ryo-iwatas-projects.vercel.app`. Build warning gone; build duration 2m, no errors. Leo's 50-Q in-browser preview test: **submit-hangs persisted at ~1-in-5-to-20**, defensive fix (commit `9ece713`) recovered each hang cleanly. **cacheComponents-mechanism refuted as the operative cause of user-facing hangs.** The C0 audit-articulated mechanism explained only the build warning. Pivot to H3/runtime-swap (Option A) for C2.

- **C2 — Bun → Node runtime swap.** Commit `0e759bf`. Removed `"bunVersion": "1.x"` from `vercel.json`; dropped `--bun` flag from `build` and `start` scripts in `package.json` (3 lines deleted, 2 inserted). Other Bun-using scripts (`dev`, `db:*`, `lint`, `typecheck`) unchanged. Preview deploy `dpl_3RQZ8nXE8GuzAtkLtQECfE33KKjD` at `https://18seconds-27qljlni7-ryo-iwatas-projects.vercel.app`. Build duration ~1m (33% faster than C1). Leo's 50-Q in-browser preview test: **0-in-50 submit-hangs.** Bun runtime confirmed as the operative cause. Secondary win: ~3.3× cold-start improvement (Node vs Bun on Vercel) measured at C3-verify.

- **C3-prep — Read-only state capture; rollback target identification.** No commits. Captured current production deployment (`dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6`, commit `9ece713`, age 2h, healthy) as rollback target; identified C2 preview `dpl_3RQZ8nXE8GuzAtkLtQECfE33KKjD` as promotion target. Production log baseline: 4 cacheComponents warning emissions in 177-line window, 20 healthy `hasContextToken:true` OIDC poll lines, 0 errors. Rollback command constructed but not executed.

- **C3-promote — `vercel promote dpl_3RQZ8nXE8GuzAtkLtQECfE33KKjD --yes`.** No git commits. Destructive operation (§6.14.31, pre-authorized). **Surprise finding:** `vercel promote` did NOT do an atomic alias swap on the existing deployment; instead it triggered a **rebuild** (Vercel's documented behavior for preview→prod promotion), creating new production deployment `dpl_HaYWegFbr7CLsY7qcS5NKcDhSv8v` from commit `0e759bf` with prod env vars. The executor's §6 discipline rule ("STOP if alias hasn't swapped") fired correctly. Executor stopped; redirector reviewed via web-searched docs, confirmed rebuild-then-swap was correct behavior, and proceeded to C3-verify. No rollback needed. New §3.13 pattern banked from this episode.

- **C3-verify — Wait for rebuild to complete; verify alias swap; post-swap health checks.** No commits. Read-only polling + verification. Rebuild completed in ~4m 24s. Alias `https://18seconds.vercel.app` swapped to `dpl_HaYWegFbr7CLsY7qcS5NKcDhSv8v` atomically on build completion. Post-swap health: 879ms cold-start (vs old prod's 2.9s — **3.3× faster**), 282–358ms warm. Post-swap log window: 0 cacheComponents warning emissions, 0 level-40+ pino, 0 errors. Rollback target `dpl_2oT9L3...` remained Ready and re-promotable.

- **C3-monitor — Leo's in-browser end-to-end validation on production.** No commits. Leo completed a 50-question full-length practice session on production: **0 submit-hangs**, OIDC poll healthy throughout, no errors. End-session path emerged as a separate concern (~1 minute total wait, no log emissions on happy path) — banked as `R-end-session-perf-slow` for a successor round. Pre-existing on Bun, just masked by the more-visible mid-session hangs that C2 eliminated.

- **C3-close — This commit.** Plan-doc finalized: §0.1 drift fix (per §6.14.28); §1 ledger filled; §6 round-close section added (H1/H2/H3 dispositions, empirical wins); §0.11 pin index updated (2 retired, 7 added); §3 new patterns banked (§3.12 audit-mechanism-vs-symptom 1/5, §3.13 redirector-vs-tool-behavior 1/5); §6.14.43 sub-type 6 tracker updated (4/5 → 4/5, no sub-type 6 deviations this round). Session log added at `docs/claude_logs/session_2026-05-12_cacheComponents-investigation.md`. Local commit stack pushed to origin at this commit.

---

## §3 Candidate patterns

**Carryover from prior rounds** (preserved per closed-plan-immutable):

- §3.1 through §3.11 — see `auth-oidc-restore.md` §3, `prod-runtime-credentials-audit.md` §3, and `onboarding-flow-removal.md` §3 for canonical definitions. All carry forward unchanged. No recurrences this round.

**NEW from this round** (canonical definitions; counts at this round's close):

- **§3.12 — Audit-articulated mechanism explains the warning/signal but not the symptom.** When a code-level audit articulates a clean mechanism for an observed signal (e.g., a warning emission), that mechanism may turn out to explain only the signal, not the user-visible failure mode — even when both share the same suspect (e.g., the runtime). Discrimination requires falsifying the mechanism while keeping the suspect, which is what C1 did this round: removing `cacheComponents` took `runInSequentialTasks` off the render path entirely, eliminating the warning, but the hangs persisted — proving the audit-articulated mechanism was orthogonal to the user-facing defect. The fix (C2 runtime swap) addresses the suspect; the mechanism remains uncharacterized. **Treatment:** when a clean audit-articulated mechanism is available, design the first falsification experiment to test the mechanism alone, not the suspect — the answer (signal-vs-symptom decoupling) is high-information regardless of outcome. **Count: 1/5.**

- **§3.13 — Redirector-assumed tool behavior diverges from actual tool behavior; executor's discipline-rule STOP catches the mismatch; mid-execution adjustment without rollback.** Sibling to §3.1 (executor-vs-redirector divergence) and §3.10 (user-direct prompt override). Specific to *third-party tool* behavior rather than executor or user behavior. Example surfaced this round: the redirector's C3-promote prompt modeled `vercel promote <preview-id>` as a **pure alias swap**; the actual Vercel behavior is **rebuild-then-swap** (the preview source is re-built with prod env vars and the alias swaps atomically on build completion). The executor's "STOP if alias hasn't swapped after promote" discipline rule fired correctly, the executor reported without retrying or rolling back, the redirector reviewed via web-searched docs and confirmed the rebuild-then-swap was correct behavior, and execution resumed on the next prompt. **Treatment:** when a tool's CLI surface or platform behavior is the load-bearing assumption of a prompt, write the executor's discipline rule to catch the assumed-vs-actual divergence (e.g., "STOP if X hasn't happened by step N"), not to retry. The STOP-and-report path lets the redirector reconcile the mental model without polluting in-flight execution state. **Count: 1/5.**

---

## §4 Hypothesis register

Three hypotheses, ranked by C0-audit confidence. Each has a concrete falsification test.

### H1 — Bun's missing `_idleStart` on setTimeout timers causes `runInSequentialTasks` to lose its atomic-timer-group guarantee, which under load produces intermittent stream-emission failures.

**Confidence: HIGH.**

- The exact mechanism is documented in Next.js source (`app-render-scheduling.js` line 153-154 explicitly names Bun as the failure case).
- The reproduction surface (every cacheComponents render path) matches the observed symptom distribution (route-incidental, not route-specific).
- Both observed symptoms (submit-hangs AND RSC-as-text) have a unified explanation through this mechanism.
- The defensive recovery in `<FocusShell>` (commit `9ece713`) demonstrably handles the *consequence* of the failure but does nothing about the *cause* — consistent with H1.

**Falsification test (preview-deploy):** swap to Node.js runtime on a Vercel preview deployment. Run a multi-question full-length practice session.
- If the warning disappears AND submit-hangs disappear AND RSC-as-text disappears → **H1 confirmed**. Proceed to production swap.
- If any of the symptoms persist on Node.js → **H1 refuted**. Redirect to H2/H3.

**Note added at C0.5 (2026-05-12):** Option B (disable `cacheComponents` on Bun) is an *alternative* falsification angle for H1 — both interventions test the same two-way root cause (Bun + cacheComponents). Removing either side of the interaction predicts symptom-disappearance under H1. Option B is the new §5 default because it's a smaller, runtime-preserving change; Option A remains the fallback if Option B's preview test fails. Both falsifications point at the same root-cause statement; only the experimental knob differs.

### H2 — cacheComponents has a documented Bun-incompatibility tracked upstream that we haven't seen yet, with a different fix path than the runtime swap.

**Confidence: REFUTED (2026-05-12 by C0.5 H2 search).** Originally LOW-MEDIUM at C0.

- The Next.js source's invitation to "report a github issue here" implies the issue is *not yet* widely tracked, but a search of vercel/next.js issues is warranted before the runtime swap (cheap, 10 minutes).
- A Bun upgrade in the 1.4+ line may already include the fix (W-bun-1.4+-fix). Current production Bun is `1.x` (per `vercel.json`'s `bunVersion: "1.x"` — Vercel resolves this to the latest stable, which may already be 1.4+).

**Refutation evidence (2026-05-12).** Full table + maintainer quote in §0.5 Finding 7. Summary: the issue *is* tracked upstream — `vercel/next.js#87630` (Open since 2025-12-22) and `oven-sh/bun#25639` (Closed by `oven-sh/bun#26021` which shipped in Bun 1.3.6+ as an `_idleStart` getter/setter surface only). The follow-up Bun issue `oven-sh/bun#26508` (Open) and PR `oven-sh/bun#27060` (Open, 11+ CI failures) attempted the deeper fix. Bun maintainer `190n` rejected `#27060` on 2026-02-16 with: *"This doesn't fix the linked issue. The issue is not to do with the orders timers run in on their own. The issue is that Next.js expects to be able to control when timers run by modifying `_idleStart`, which Bun does not do."* Vercel's alternative is `vercel/next.js#88514` (postMessage-based scheduling) — still Draft, no merge date. **There is no targeted upstream fix to adopt.** The falsification-test text below is preserved as a historical record of the C0 plan.

**Falsification test (pre-swap):** before C1's preview deploy, do a 10-minute search of:
1. `github.com/vercel/next.js/issues` for `"cannot guarantee" cacheComponents`.
2. `github.com/oven-sh/bun/issues` for `_idleStart Next.js`.
3. Bun's latest release notes for setTimeout / timer compatibility fixes.

If a known issue with a targeted fix exists → adopt the targeted fix instead of the runtime swap. If nothing is found → H2 is operationally refuted, proceed with H1's falsification test. **Executed at C0.5; outcome: refuted, see above.**

### H3 — The defect is not cacheComponents-specific but a broader Bun + Next.js 16 server-action or RSC-streaming incompatibility.

**Confidence: LOW (deprioritized at C0.5).**

- The Next.js source unambiguously names cacheComponents as the affected feature and `runInSequentialTasks` as the affected primitive. The 16 call sites of `runInSequentialTasks` are all within `app-render.js` (the RSC render path), not in the server-action router or the action-result encoding path.
- However, the staged-rendering machinery *does* emit server-action result streams via the same RSC infrastructure. So while cacheComponents is the proximate cause, the symptom surfaces in server-action paths because those paths consume the broken primitive.
- If H1's runtime swap fixes the symptom, H3 collapses into H1 (the fix is the same). If H1's runtime swap does NOT fix the symptom, H3 becomes relevant.

**Reframing note (2026-05-12 at C0.5).** With Option B (disable `cacheComponents` on Bun) now the §5 default, the new C1 experiment *is* — operationally — "disable cacheComponents while keeping Bun." Under H1, that should resolve the symptom. Under H3, it should ALSO resolve the symptom (cacheComponents was the proximate carrier of the broader incompatibility). So Option B's success does NOT cleanly discriminate H1 from H3 — both predict symptom-disappearance. The pure H3 discriminator remains "disable cacheComponents on Node.js" (which would say: "the issue persists with cacheComponents off AND Bun off"), but executing that requires Option A first and is no longer the first-line experiment. H3 is not falsified; it is deprioritized in favor of practical symptom resolution via Option B.

**Falsification test (only if Option B is refuted, OR if we later want to cleanly discriminate H1 from H3):** on the Node.js preview, disable `cacheComponents: true` in `next.config.ts`. Redeploy. Reproduce.
- If the symptom persists with cacheComponents disabled on Node.js → H3 confirmed, the issue is broader than cacheComponents. Escalate scope.
- If the symptom disappears with cacheComponents disabled → the cacheComponents-specific story holds (whether on Bun or Node.js).

---

## §5 Recommended next actions (C1+, pending user authorization)

> **Restructured at C0.5 (2026-05-12).** The original C0 default (Option A — Node.js runtime swap) is now the *alternative* path. The new default is Option B (disable `cacheComponents`, keep Bun) for the reasons in the rationale below. The C0 text for Option A is preserved verbatim as the alternative-path section.

### Default recommendation: Vercel preview deploy with `cacheComponents` disabled (keep Bun)

**Rationale:**
- **Smaller change than the runtime swap.** One line in `next.config.ts` (`cacheComponents: true` → removed or set to `false`) vs. ~4 lines across `vercel.json` + `package.json` for the runtime swap.
- **Zero functional impact.** Our app uses zero `'use cache'` / `cacheLife` / `cacheTag` directives (§0.5 Finding 3). Disabling cacheComponents loses a feature we are not using.
- **Directly removes the broken code path.** `runInSequentialTasks` only runs under cacheComponents staged rendering; disabling cacheComponents short-circuits the `_idleStart` patching attempt entirely, regardless of runtime.
- **Preserves Bun runtime.** All other Bun-tied surfaces (build speed, package install, script execution) are unchanged.
- **Trivially reversible.** Single-line revert restores cacheComponents whenever upstream resolves (`oven-sh/bun#26508` or `vercel/next.js#88514`).
- **Side effect:** `await connection()` in `src/server/admin/queue-data.ts:284` becomes a no-op (default render is dynamic without cacheComponents, which is the same behavior `connection()` was already forcing). Harmless.

**C1 commit shape (provisional):**
1. C1a — Edit `next.config.ts`: remove the `cacheComponents: true` line (or set to `false`).
2. C1b — Commit. Do NOT push to main.
3. C1c — `vercel deploy` (no `--prod` flag) → preview deployment.
4. C1d — Manual reproduction test on the preview URL: multi-question full-length practice session. Watch for the warning in deployment logs (it should be absent). Watch for submit-hangs / RSC-as-text (they should be absent).

**Decision boundary at C1d:**
- All three indicators clean → H1 confirmed (via Option B's symptom-disappearance angle). Open C2 (production deploy under §6.14.31 gate).
- Any indicator persists → H1 refuted in an unexpected way (or H3 active). Pause and assess. Most likely next step: try Option A (runtime swap) on a separate preview to cleanly discriminate.

**Anti-scope reminder:** C1 does NOT touch production. C1 does NOT remove the defensive fix in `<FocusShell>`. C1 is the experiment, not the resolution.

### Alternative path: Vercel preview deploy with Node.js runtime (preserved verbatim from C0)

**Use this path if** Option B's preview deploy does NOT resolve the symptoms (which would refute H1's Option-B angle), **or if** we later want to restore the ability to use `cacheComponents` features and the upstream postMessage-based scheduling (`vercel/next.js#88514`) lands.

**Rationale (original C0):**
- H1 is the highest-confidence hypothesis. Its falsification test (runtime swap on preview) is the highest-information experiment available.
- Preview deploys are isolated. Production alias is not touched. Risk to live users is zero.
- The change surface is tiny (~4 lines: `vercel.json` `bunVersion` removal + `package.json` build/start `--bun` flag removal). Trivially reversible.
- If H1 is confirmed, we have a clear path to production swap under a §6.14.31 gate.
- If H1 is refuted, we have crisp falsification data and redirect to H2/H3 with zero production exposure.

**C1 commit shape (original C0, preserved):**
1. Pre-step (zero-commit): 10-minute H2 search of GitHub issues + Bun release notes. If a targeted fix surfaces, adopt it instead. **Executed at C0.5; refuted (§0.5 Finding 7).**
2. C1a — Edit `vercel.json`: remove `"bunVersion": "1.x"` line.
3. C1b — Edit `package.json`: change `"build": "bun --bun next build"` → `"build": "next build"` and `"start": "bun --bun next start"` → `"start": "next start"`.
4. C1c — Commit. Do NOT push to main.
5. C1d — `vercel deploy` (no `--prod` flag) → preview deployment.
6. C1e — Manual reproduction test on the preview URL: multi-question full-length practice session. Watch for the warning in deployment logs (it should be absent). Watch for submit-hangs / RSC-as-text (they should be absent).

**Decision boundary at C1e:**
- All three indicators clean → H1 confirmed. Open C2 (production swap under §6.14.31 gate).
- Any indicator dirty → H1 refuted. Pause to assess. Open H2/H3 follow-up under a sub-round.

### Alternative path if H1 is refuted

Trigger a fresh investigation sub-round to:
- Re-test with `cacheComponents: false` on Node.js (H3 falsification).
- File a Next.js issue with the empirical evidence (warning + symptom both persisting on Node.js would be a Next.js bug, not a Bun bug).
- Consider downgrading Next.js to a pre-cacheComponents version, or disabling cacheComponents in our config as a permanent workaround.

---

## §6 ROUND-CLOSE STATUS

**Round CLOSED at C3-close (this commit).** `R-cacheComponents-bun-settimeout-incompat` retired via outcome path (a): runtime swap shipped to production; warning + user-visible hangs both empirically eliminated.

### §6.1 H1 final disposition

H1 was framed at C0 as: *"Bun's missing `_idleStart` on setTimeout timers causes `runInSequentialTasks` to lose its atomic-timer-group guarantee, which under load produces intermittent stream-emission failures."*

**Empirical refinement:**

- **cacheComponents-leg of H1: refuted.** C1 removed `cacheComponents: true` from the config, taking `runInSequentialTasks` off the render path entirely (verified: the build warning disappeared from both build-time and runtime logs). Hangs persisted at ~1-in-5-to-20 on preview. The audit-articulated mechanism explained only the warning, not the symptom (banked as §3.12).
- **Bun-leg of H1: confirmed.** C2 kept cacheComponents off AND swapped Bun → Node. Hangs went to 0-in-50 on preview, then 0-in-50 on prod after promotion. The Bun runtime is the operative cause of the user-facing defect.

**Cleanly restated final causal model:** the Bun runtime (independent of cacheComponents) produces intermittent hangs in Next.js 16 server-action streaming. The cacheComponents staged-rendering primitive (`runInSequentialTasks`) is a *separate* Bun incompatibility that produces a (now eliminated) build warning but not the user-visible hangs. The two were observationally co-located but mechanistically independent.

### §6.2 H2 final disposition

**Refuted empirically at C0.5** by the H2 search (§0.5 Finding 7). Upstream is stalled: Bun maintainer `190n` explicitly rejected the fix path (`oven-sh/bun#27060`) on 2026-02-16 with *"Bun does not intend to honor `_idleStart` mutations"*; Vercel's runtime-agnostic alternative (`vercel/next.js#88514`, postMessage-based scheduling) is still Draft. No targeted upstream fix to adopt now or in any visible timeline. Forward-watch `W-bun-1.4+-fix` retired at C0.5 on this evidence.

### §6.3 H3 final disposition

H3 was framed at C0 as: *"The defect is not cacheComponents-specific but a broader Bun + Next.js 16 server-action or RSC-streaming incompatibility."* C0.5 deprioritized H3 in favor of practical symptom resolution.

**Empirically: confirmed via symptom resolution.** C1 disabled cacheComponents on Bun → hangs persisted → H1's cacheComponents-leg eliminated → the only remaining variable was Bun itself. C2 swapped to Node → hangs eliminated → H3's "broader Bun-incompat" claim is what the data fit best.

**Clean H1-vs-H3 discrimination NOT performed.** Doing so would have required testing cacheComponents-on-Node (re-enabling cacheComponents while keeping Node runtime) to see whether the cacheComponents-leg of H1 had any independent effect. This is academic now — symptoms are resolved without performing the discrimination, and re-enabling cacheComponents in production would be a regression risk for no operational benefit. Banked under `R-future-use-cache-requires-runtime-investigation-revisit`.

### §6.4 What the audit got right vs. what it missed

**Got right (§0.5 Finding 7):** the H2 upstream search at C0.5 — saved us from waiting for a non-existent Bun fix.

**Got right (§0.5 Finding 6):** the runtime-swap surface inventory — 4 lines across `vercel.json` + `package.json`, no Bun-API lock-in in `src/`. C2 swap built and ran cleanly on first try; the audit's prediction was exactly correct.

**Missed:** the audit articulated a beautiful mechanism for the cacheComponents/Bun-`_idleStart` interaction explaining the build warning, then implicitly extrapolated that this mechanism also explained the user-visible hangs. C1's empirical result decoupled the two. **The audit was correct about what it directly examined (the warning's emission site and call-fanout); it over-reached when generalizing to the user-facing symptom.** The deeper mechanism for Bun + Next.js 16 server-action streaming hangs is uncharacterized at the Next.js source level — banked as `R-bun-nextjs16-action-stream-mechanism-uncharacterized`.

### §6.5 Empirical wins

1. **Submit-hangs eliminated in production.** Pre-C2 prod: ~1-in-5-to-20 hang frequency, defensive recovery survivable. Post-C2 prod: 0-in-50 on Leo's full-length session.
2. **Cold-start performance improved ~3.3×.** Pre-C2 prod: `/api/health` cold-start = 2.9s. Post-C2 prod: 879ms. Warm sub-360ms. Direct measurement at C3-verify.
3. **cacheComponents warning eliminated.** Pre-C2 prod baseline (last 5min): 4 emissions in a 177-line window. Post-C2 prod (same query shape): 0 emissions.
4. **OIDC poll fix (from `auth-oidc-restore` round) confirmed working on Node runtime.** No `hasContextToken:false` lines in post-swap window; OIDC was already runtime-agnostic but worth confirming.
5. **Round arc executed cleanly:** audit → falsify-via-Option-B → empirical refutation → pivot-to-Option-A → preview-validate → ship → monitor → close. Zero wasted commits. Zero rollbacks.

### §6.6 Audit-first paid off

Every commit was guided by the prior commit's empirical outcome:

- C0 audit identified two candidate interventions (Option A runtime swap, Option B disable cacheComponents).
- C0.5 H2 search refuted the wait-for-upstream path and reframed Option B as the smaller first experiment.
- C1 executed Option B and produced the highest-information result possible: *the warning's mechanism was real, but it wasn't the symptom's mechanism*. Without C0's audit, we would not have known what we were testing precisely enough to interpret the C1 result.
- C2 executed Option A on top of Option B (kept cacheComponents off, added runtime swap) and produced the confirmed fix.
- C3 promoted, verified, and monitored.

The alternative path — guessing and shipping the runtime swap first — would have eliminated the symptom but left us thinking cacheComponents was the cause. The empirical discrimination performed by C1 → C2 is durable knowledge. **Cost:** one extra preview deploy. **Value:** a correct causal model that won't lead us astray when we revisit `use cache` features later.

### §6.7 §6.14.43 sub-type 6 tracker

Sub-type 6 (executor-disregards-explicit-redirector-instruction) recurrence-counter status:

- **Count entering this round:** 4/5 (from `onboarding-flow-removal` close).
- **Sub-type 6 deviations observed this round:** **0.**
- **Count exiting this round:** **4/5.**

The §0.1 drift caught at C3-close was §6.14.28-shaped (redirector-vs-empirical doc divergence), not sub-type 6. The C3-promote mental-model error was §3.13-shaped (redirector-vs-tool-behavior; executor's STOP rule caught it correctly), not sub-type 6. The redirector's mid-execution scope adjustment at C0.5 (H2 search) was prompt-authorized, not executor deviation.

**One more sub-type 6 deviation in any future round triggers promotion at that round's close.**

### §6.8 Deploy IDs for the record

- **Round-open prod (also the rollback target at C3 time):** `dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6` — commit `9ece713` (C5.5 defensive-fix deploy from prior `onboarding-flow-removal` round). Still Ready as of round-close; re-promotable via `vercel rollback dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6 --yes` during the 24–48h monitor window.
- **C1 preview:** `dpl_BWnjzqqVJoupLK8pevTWaM3H3mbS` — commit `445599b` — `https://18seconds-r8mxxmeho-ryo-iwatas-projects.vercel.app`. cacheComponents-off, Bun-on. Validated as warning-free but hang-bearing.
- **C2 preview:** `dpl_3RQZ8nXE8GuzAtkLtQECfE33KKjD` — commit `0e759bf` — `https://18seconds-27qljlni7-ryo-iwatas-projects.vercel.app`. cacheComponents-off, Node-on. Validated as warning-free AND hang-free. The promotion source.
- **Round-close prod (the new production):** `dpl_HaYWegFbr7CLsY7qcS5NKcDhSv8v` — built from commit `0e759bf` at C3-promote-time with prod env vars. Aliased at `https://18seconds.vercel.app` from `2026-05-12T18:56:22Z` onward.

---
