# cacheComponents Investigation — Plan-Doc

Round: cacheComponents Investigation.
Round-open hash: `bcb77c3` (HEAD at C0 audit; verified clean working tree; `git rev-list --left-right --count origin/main...HEAD = 0 1` — `bcb77c3` is the prior `onboarding-flow-removal` round's close commit, locally committed but unpushed at C0 of this round).
Round-close hash: TBD.
**Round status: OPEN — commit-0 audit only.**

> **Round-shape decision (closed-plan-immutable from C0).** Audit-only commit-0. No production deploys, no runtime swaps, no code changes. C0 deeply audits the failure mechanism — reads Next.js 16's cacheComponents implementation, locates the warning emission site, identifies every call path, and articulates a hypothesis register with concrete falsification tests. A user-reviewed plan is the precondition for any code change or experiment. C1+ will execute the chosen experiment (likely: Bun → Node.js runtime swap on a Vercel preview deployment) and either confirm or refute the root-cause hypothesis.

---

## §0 Round metadata

### §0.1 Round name + hashes

- **Name:** cacheComponents Investigation.
- **Plan-doc filename:** `docs/plans/cacheComponents-investigation.md`.
- **Open hash (empirical, verified at commit-0):** `bcb77c3` — `docs(plans): close onboarding-flow-removal ...`. Working tree clean (`git status` — clean). One commit ahead of `origin/main` (the prior round's session-log commit `927e7b0` and round-close commit `bcb77c3` are local-committed-but-unpushed; the user explicitly does not push at round close).
- **Concurrent rounds:** none.
- **Target close hash:** TBD.

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

Pin **under active investigation this round** (status remains "degraded UX, survivable" until empirical resolution):

- **R-cacheComponents-bun-settimeout-incompat** — refined in §0.6 from "three-way interaction" to "two-way interaction (Bun + cacheComponents)"; Server Actions are a consequence surface, not a causal factor. Root-cause hypothesis (H1) and falsification test articulated in §4. Closure of this pin is the goal of this round.

Pins **newly opened** at this round's commit-0:

- **R-no-use-cache-directive-in-app** — Our app sets `cacheComponents: true` in `next.config.ts` but uses zero `'use cache'` directives, zero `cacheLife` calls, and zero `cacheTag` calls. The only cacheComponents-adjacent code is `connection()` in `queue-data.ts` (per-request marker, the opposite of caching). This means we pay the full cacheComponents-staged-rendering cost (and now its Bun-incompatibility) without using any of the cacheComponents features. Worth re-evaluating after the runtime-swap experiment whether `cacheComponents: true` is even providing value to our app — but disabling it is H3's falsification test, not a default action.

### §0.12 Sub-round triggers (pre-authorized)

- **`preview-deploy-blockage-sub-round`** — fires if C1's preview deploy fails to build (e.g., Node.js incompatibility in our codebase that Bun was masking). Scope: identify the incompatibility, decide between (a) fix the incompatibility, (b) abandon the swap, (c) escalate to user. Out-of-scope: scope creep into unrelated codebase fixes.

- **`bun-upgrade-experiment-sub-round`** — fires if W-bun-1.4+-fix surfaces a Bun release that claims to fix the `_idleStart` compatibility. Scope: try the upgrade on preview before the runtime swap; if it works, that's the lower-friction fix. Out-of-scope: trying any Bun version older than what production currently runs.

---

## §1 Commit Ledger

- **C0 — Plan-doc + commit-0 audit.** Commit `d3196b4`. No code changes. Plan-doc lands at `docs/plans/cacheComponents-investigation.md`. Round-open hash `bcb77c3`; this commit is C0.
- **C0.5 — Plan-doc amendment: integrate H2 search findings; reframe Option B as first-line intervention.** This commit. No code changes. Documents upstream stall (Bun and Vercel both have open issues, no shipping fix), refutes H2 (§0.5 Finding 7 added; §4 H2 confidence → REFUTED), restructures §5 to present Option B (disable `cacheComponents`) as the new default first-line intervention and Option A (runtime swap) as the alternative. §0.4 anti-scope updated; §0.6 reconciled; §0.10 retires `W-bun-1.4+-fix`; §4 H1 gets an Option-B falsification angle note; §4 H3 deprioritized.
- **C1+ — TBD pending user authorization on the recommended experiment in §5.**

---

## §3 Candidate patterns

**Carryover from prior rounds** (preserved per closed-plan-immutable):

- §3.1 through §3.11 — see `auth-oidc-restore.md` §3, `prod-runtime-credentials-audit.md` §3, and `onboarding-flow-removal.md` §3 for canonical definitions. All carry forward unchanged. No recurrences this round at C0 (commit-0 is plan-doc-only).

**NEW from this round at C0:** none yet. New patterns surface during execution, not during audit. Pattern candidates will be evaluated at each subsequent commit boundary.

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

**Round-open at C0. Round-close pending.**

The round closes when **R-cacheComponents-bun-settimeout-incompat** is either:
- (a) **Retired (validated)** — runtime swap or alternative intervention is in production and empirical evidence shows the warning + both symptoms have disappeared, OR
- (b) **Refined and rebanked** — H1 is refuted, the actual root cause is documented in a successor round's plan-doc, and the pin is updated with the refined causal model.

Round close will include:
- Final §1 commit ledger.
- §6.X round-close summary with deploy IDs, validation evidence, and pin disposition.
- §0.11 forward-pin index update.
- §3 candidate-pattern recurrence counts.

---
