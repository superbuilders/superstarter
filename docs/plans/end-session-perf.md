# end-session-perf — Plan-Doc

Round: end-session-perf.
Round-open hash: `a2b68c7` (HEAD at C0 audit; working tree clean; `git rev-list --left-right --count origin/main...HEAD = 0 1` — the one unpushed commit is the prior round's session-log commit `a2b68c7` itself, which sits on top of `a830b23` (cacheComponents-investigation round-close).
Round-close hash: TBD.

**Note on prompt-vs-empirical drift caught at C0 (§6.14.28):** the round-open prompt asserted "HEAD: a830b23" and "0 commits ahead of origin." Empirically HEAD is `a2b68c7` (one commit further) and the branch is one commit ahead of origin. The discrepancy is the prior round's session-log commit, which was committed but not yet pushed. Working tree is clean. The audit proceeds against the empirical state.

> **Round-shape decision (closed-plan-immutable from C0).** Audit-only commit-0. No production deploys, no instrumentation yet, no code changes. C0 deeply audits the endSession code path — reads the action wrapper, the underlying function, the Vercel Workflow definition, the per-step bodies, the mastery-recompute logic, the schema indices, and forms a measurable hypothesis register. A user-reviewed plan is the precondition for any code change or instrumentation. C1+ is expected to be either (a) add Pino timing instrumentation and re-deploy to preview for a measured baseline, or (b) execute a targeted fix if the audit reveals an obvious single bottleneck.

---

## §0 Round metadata

### §0.1 Round name + hashes

- **Name:** end-session-perf.
- **Plan-doc filename:** `docs/plans/end-session-perf.md`.
- **Open hash (empirical, verified at commit-0):** `a2b68c7` — `docs(claude_logs): add session log for cacheComponents investigation round`. Working tree clean. One commit ahead of `origin/main` at C0. (The prompt's `a830b23` is the immediate parent and is on origin.)
- **Concurrent rounds:** none.
- **Target close hash:** TBD.

### §0.2 Trigger

Severity-medium pin `R-end-session-perf-slow` carried forward from the closed `cacheComponents-investigation` round (§0.11):

> 50-question full-length `endSession` path takes ~1 minute end-to-end. The `endSession` happy-path emits zero log lines today (only a level-40 warn when finalized-twice). Optimization blocked on instrumentation. **Note:** this issue was pre-existing on Bun production, just masked by the more-visible mid-session hangs that C2 eliminated.

Goal of this round: **identify the root cause(s) of the ~1-minute endSession latency on a 50-Q full-length session, and determine where the time is going** (DB work, Vercel Workflow per-step overhead, mastery recompute, cold-lambda floors, polling tail, or some combination).

Eventual success criterion (multi-commit): end-session submit completes in **under 5 seconds end-to-end** on a 50-Q full-length session in production. C0 only scopes the diagnosis.

### §0.3 Scope (in-scope)

1. **C0 — Deep code audit (this commit).** Read the entire endSession code path from the client component's `await endSession(init.sessionId)` call through the action wrapper, the underlying function, the Vercel Workflow body, the per-step bodies, the mastery-recompute logic, and the DB schema. Articulate a hypothesis register with concrete falsification tests. **No code change. No deploy. No instrumentation. Plan-doc + commit only.**

2. **C1 onward — TBD pending user authorization.** Most likely C1: add Pino timing instrumentation at the action boundary, around `start()`, around `await run.returnValue`, at the top and bottom of each workflow step, and around each DB query inside `recomputeForUser`. Deploy to a Vercel preview, run a 50-Q full-length session, capture the timing table. Use the table to discriminate the §4 hypotheses and select the C2 intervention.

### §0.4 Anti-scope (explicit)

- **NOT** changing the workflow architecture, the action signature, or the `awaitCompletion: true` default at C0. Those are C1+ interventions, gated on measured data.
- **NOT** changing the `endSession` happy-path log emissions at C0 — that IS the C1 instrumentation work, but it requires its own commit + preview deploy + measurement loop.
- **NOT** parallelizing the per-sub-type recompute loop at C0. The workflow file's comment explicitly justifies the serial design ("the few hundred milliseconds saved by parallelism aren't worth the partial-failure complexity") — that justification may be wrong under measurement (see §4 H1), but flipping it requires data, not speculation.
- **NOT** dropping `awaitCompletion: true` at C0. The flag exists specifically so `revalidatePath('/')` fires AFTER `mastery_state` rows are written (per `src/app/(app)/actions.ts:122-126` comment and `src/server/sessions/end.ts:31-35` comment, citing Round 1 §5.7 + §0.4). Dropping it would require moving the revalidate into the workflow's last step, which is a structural change that needs deliberate planning.
- **NOT** adding/changing DB indices at C0. Index changes need to be planned against migration semantics + downtime risk.
- **NOT** touching the abandon-sweep cron path (`/api/cron/abandon-sweep`). That path uses the same workflow but with `awaitCompletion` defaulted to false (fire-and-forget), and the cron's throughput is not user-perceptible.

### §0.5 Empirical audit findings at commit-0

#### Finding 1 — `endSession` action does 17 sequential Vercel Workflow steps for a 50-Q full-length session

Call graph from `src/app/(app)/actions.ts:119-134`:

```
endSession(sessionId)                          [actions.ts:119]
├─ requireUserId()                             [actions.ts:55-62]    1 NextAuth lookup
├─ assertSessionOwnedBy(sessionId, userId)     [actions.ts:86-106]   1 DB SELECT
├─ sessionEnd.endSession(sessionId, { awaitCompletion: true })       [end.ts:39]
│   ├─ UPDATE practice_sessions SET ended_at_ms, completion_reason
│   │    WHERE id = $1 AND ended_at_ms IS NULL                       1 DB UPDATE
│   ├─ start(masteryRecomputeWorkflow, [{ sessionId }])              workflow runtime entry
│   └─ await run.returnValue                                         POLL until workflow body completes
│       └─ masteryRecomputeWorkflow body  [mastery-recompute.ts:24-36]
│           ├─ loadSessionMetadataStep        ["use step"]           1 DB SELECT
│           ├─ listDistinctSubTypesStep       ["use step"]           1 DB SELECT (DISTINCT join)
│           ├─ logRecomputeLoopStartingStep   ["use step"]           1 logger.info (no DB)
│           └─ for (subTypeId of subTypes) {  // SERIAL — explicit comment justifies this
│               await recomputeStep(...)      ["use step"]           1 step per sub-type
│                 └─ recomputeForUser()       [recompute.ts:95-162]
│                     ├─ readLastNAttempts()                         1 DB SELECT (3-table join)
│                     ├─ readPreviousState()                         1 DB SELECT
│                     └─ INSERT ... ON CONFLICT DO UPDATE            1 DB INSERT/UPSERT
│             }                                                      14 iterations on full-length
├─ revalidatePath(`/post-session/${sessionId}`)
└─ revalidatePath("/")
```

**Step count for a 50-Q full-length session covering all 14 sub-types** (config: `src/config/sub-types.ts` defines exactly 14):

- 2 setup steps (`loadSessionMetadataStep`, `listDistinctSubTypesStep`)
- 1 log step (`logRecomputeLoopStartingStep`)
- 14 recompute steps (one per sub-type)
- **Total: 17 sequential Vercel Workflow steps.**

Each `"use step"` body emits a `POST /.well-known/workflow/v1/step` (per logs observed in the prior round, R-vercel-workflow-pins-to-deployment-hostname). The workflow runtime itself emits `POST /.well-known/workflow/v1/flow` for dispatch. Each step is a separate HTTP call to the workflow runtime with state persistence between steps.

**DB query count inside the workflow body (excluding action-level reads):**

- 2 setup queries + (14 × 3) recompute queries = **44 DB queries**, all serial.

#### Finding 2 — `awaitCompletion: true` makes the user wait for the entire workflow

`src/server/sessions/end.ts:93-106` awaits `run.returnValue`, which (per Vercel Workflow's `workflow/api` semantics) polls until the workflow body completes. This is the line that turns mastery-recompute latency into user-perceived latency. The design rationale (per the same file's comment block, lines 26-35 and the action's lines 122-126) is that `revalidatePath('/')` must fire **after** the mastery_state writes are visible, so the next dashboard render serves fresh belts. The await is intentional, not accidental.

#### Finding 3 — The recompute query is unindexed for its filter shape

`readLastNAttempts` in `src/server/mastery/recompute.ts:38-68` issues:

```sql
SELECT attempts.correct, attempts.latency_ms
FROM attempts
INNER JOIN items ON attempts.item_id = items.id
INNER JOIN practice_sessions ON attempts.session_id = practice_sessions.id
WHERE practice_sessions.user_id = $1 AND items.sub_type_id = $2
ORDER BY attempts.id DESC
LIMIT 10
```

`src/db/schemas/practice/attempts.ts` declares only:
- `attempts_session_id_idx` on `attempts.session_id`
- `attempts_item_id_idx` on `attempts.item_id`

There is **no** compound index supporting the `(practice_sessions.user_id, items.sub_type_id)` filter. The planner must either (a) walk `attempts` by id DESC and join until 10 rows match (which is fast for low-volume users but degrades as attempt count grows), or (b) join from `items` filtered by `sub_type_id` and then to `attempts`. For a user with hundreds of attempts across 14 sub-types, the 14 serial executions of this query are unbounded in cost as the user's attempt history grows.

For comparison: `readPreviousState` filters on the `mastery_state` primary key `(user_id, sub_type_id)` and is O(1) lookups.

#### Finding 4 — `getDbPassword: oidc` is paid on every cold DB-touching workflow step

Each Vercel Workflow step that touches the DB is (potentially) a separate Lambda invocation. Per the closed `auth-oidc-restore` round and the pin `R-poll-loop-50ms-minimum-overhead`, the OIDC token-mint setup floor is paid once per cold-connection acquisition. If each of the 17 workflow steps is a fresh Lambda, that's 17 potential OIDC poll floors (only the DB-touching ones — 16 of the 17, excluding the log step). On warm Fluid Compute instances, this is much cheaper than 17× the floor; on cold dispatch, it is not.

This finding cannot be confirmed from code alone — it requires runtime measurement (i.e., C1 instrumentation). It is captured here as a candidate amplifier.

#### Finding 5 — No external AI calls in the endSession path

Grep across `src/server/sessions/`, `src/server/mastery/`, `src/workflows/mastery-*`, `src/server/items/` for `anthropic`, `openai`, `api.anthropic`, `api.openai`:

- The only match is `src/server/items/tagger.ts:1` (`import Anthropic from "@anthropic-ai/sdk"`), which is invoked from the ingest pipeline, **not** from `endSession`, `submitAttempt`, or `recomputeForUser`.
- **Pre-bias H5 from the round-open prompt — "external API call (Anthropic generator? OpenAI validator?) is invoked at session end" — is REFUTED by C0 code reading.** No AI call participates in user-visible end-of-session latency.

#### Finding 6 — No `waitUntil` / `after()` / deferred-task surface in endSession

Grep across `src/` for `waitUntil`, `unstable_after`, `unstable_scheduleAt`:

- **Zero matches.** The codebase does not use Next.js's `after()` API or Vercel's `waitUntil()` anywhere. All work that fires during `endSession` blocks the HTTP response.

This means **fire-and-forget post-response work is not currently part of the architecture**. The `awaitCompletion: false` path on `sessionEnd.endSession` exists but is only used by the abandon-sweep cron, where there is no user response to defer to. C1+ has the option of moving mastery recompute to `after()` (or `waitUntil()`) — but it would require also moving `revalidatePath` to fire after the writes complete, since the current design ties them together.

#### Finding 7 — No `maxDuration` / route runtime overrides

Grep across `src/app/` for `export const maxDuration` or `export const runtime`:

- **Zero matches.** Default function timeout applies (per the round-open prompt's session context: 300s default on Hobby plan; Vercel's documented current default is also 300s). The observed ~60s endSession well-under any timeout, so timeout is not the cause of the wait — the workflow genuinely takes ~60s of wall-clock work that the user is awaiting.

`vercel.json` is minimal — `regions: ["iad1"]`, one cron at `/api/cron/abandon-sweep`, no function-level overrides. The deployment runs in US-East-1.

#### Finding 8 — `submitAttempt` per-call cost: 3 reads + 1 write + 1 selection call

`src/server/sessions/submit.ts:67-160`:

```
submitAttempt(input)
├─ submitInputSchema.safeParse(input)
├─ FIVE_MINUTES_MS tripwire check
├─ readSession(sessionId)                      1 DB SELECT
├─ readItemAnswerAndDifficulty(itemId)         1 DB SELECT
├─ INSERT INTO attempts                        1 DB INSERT (returning id)
└─ if (sessionRow.type !== "mistakes") getNextItem(sessionId)
                                               N DB SELECTs (selection engine — see selection.ts)
```

The observed ~1s `submitAttempt: attempt inserted` latency (per round-open prompt's prior empirical data) is **the submit path itself, not end-of-session work**. End-of-session work is NOT triggered per-attempt; the workflow fires once at `endSession`. So the per-submit cost is its own separate issue from the end-of-session cost.

This is a finding worth pinning: **the ~1s per-submit cost is independently slow** and is not addressed by anything this round can do. It will need its own round (likely `submit-perf`). Pinned as `R-submit-attempt-1s-per-call` (see §0.11).

#### Finding 9 — Workflow is pinned to deployment hostname (confirmed)

Per the carried-forward pin `R-vercel-workflow-pins-to-deployment-hostname` and the `src/proxy.ts` carve-out:

```ts
matcher: [
  "/((?!_next/static|_next/image|favicon|\\.well-known/workflow/|api/sessions/[^/]+/heartbeat).*)"
]
```

The `.well-known/workflow/v1/*` paths bypass the auth proxy. Per the proxy comment block (lines 30-44), the workflow runtime self-dispatches HTTP calls to those routes with no NextAuth session attached. This confirms the architecture but does not directly address the latency question — it is mentioned here because every workflow step traverses these proxy-exempt paths, and any per-request overhead the proxy might add is NOT a contributor to the slowness.

The deployment-hostname pinning (workflows log under `18seconds-gxbup1hfw-...` not `18seconds.vercel.app`) is still empirically observed from the prior round's logs and remains a concern for promotion cutover windows, but it does not directly cause the latency this round investigates.

### §0.6 Reconciliation (this round vs. prior pins/comments)

- The `src/workflows/mastery-recompute.ts:8-9` comment ("Sequential, not parallelized — the few hundred milliseconds saved by parallelism aren't worth the partial-failure complexity") asserts that parallelism would save **only a few hundred milliseconds**. C0 audit's working hypothesis is that the comment is **wrong under measurement** — the per-step Vercel Workflow overhead is the dominant cost, not the per-recompute DB work, and parallelism (or step collapsing) could save many seconds, not hundreds of ms. The comment was likely written when the workflow's per-step overhead was small or untested. This reconciliation is provisional and will be resolved by C1's measurement, not by C0's reasoning.

- The `src/server/sessions/end.ts:31-35` comment + `src/app/(app)/actions.ts:122-126` comment justify `awaitCompletion: true` by citing "Round 1 §5.7 + §0.4." That citation is from `docs/plans/phase5-master-plan.md`-era doc (predates this audit). The design constraint is real: `revalidatePath('/')` must fire after `mastery_state` writes land, or the dashboard renders stale belts. Any C1+ fire-and-forget intervention must preserve that constraint (likely by moving the `revalidatePath('/')` into the workflow's terminal step).

**Round-close addendum (C4) — between-round deviations reconciled.**

- **Commit `a2b68c7` (between-round, executor-authored).** `a2b68c7` was authored by the executor after `a830b23` (cacheComponents-investigation C3-close) was pushed, and before the end-session-perf round opened. It added a second session log — `docs/claude_logs/session_2026-05-12_14-33_cachecomponents-investigation-shipped.md` (77 lines) — which coexists with the 69-line session log committed by `a830b23`. **The deviation:** a commit was authored outside an explicit prompt boundary. **Decision at C0:** keep `a2b68c7` (content is benign and arguably more detailed than the original log); document the deviation; bank it as a candidate pattern at round-close. Two session logs for one round is mildly cluttered but not harmful — consolidation is deferred as future housekeeping, not urgent. Banked at C4 as **§3.14** (see §3).

- **`leonardiwata-2680` out-of-band production activity (flagged at C3).** At C3 step 4, the executor's `vercel ls --prod` revealed four production deployments between this round and the prior one, authored by `leonardiwata-2680`, none of which the redirector was aware of. The C3 target promotion was unaffected — the correct source (`dpl_9Rm1Et…`) was promoted. Likely manual Vercel dashboard deploys or a second-machine workflow. Documented for awareness; opens pin `R-leonardiwata-2680-out-of-band-prod-deploys` (see §0.11).

- **§6.14.43 sub-type 6 tracker.** The `a2b68c7` deviation was considered under cross-round registry §6.14.43 sub-type 6 at the C0 diagnostic, then reclassified as §3.14 — different actor (executor, not redirector) and different mechanism (unprompted action, not a mistaken convention assumption). Sub-type 6 events this round: zero. The tracker enters and exits this round at **4/5, unchanged**.

### §0.7 Destructive-operation surface

C0 is read-only. No destructive operations.

C1+ (provisional, pending authorization):
- **Plan-doc edits + instrumentation commits** — non-destructive, reversible via git revert.
- **Vercel preview deploys** — non-destructive (isolated preview URLs).
- **Workflow restructure (e.g., collapsing 14 recompute steps into 1)** — reversible in code but introduces a new failure mode (one failed sub-type loses work for the others, refuted by the existing comment's rationale). Requires careful trade-off discussion.
- **`awaitCompletion: false` + `after()` migration** — restructures the action's response semantics; requires moving `revalidatePath('/')` into the workflow body. Reversible by git revert but involves multiple files.
- **Production promotion** — requires §6.14.31 gate after preview measurement confirms.

### §0.8 Round-open lefthook status

Plan-doc-only commit; no source changes; lefthook expected clean. The C0 commit modifies only `docs/plans/end-session-perf.md`.

### §0.9 Closed-plan-immutable boundaries

- The C0 audit findings in §0.5 (Findings 1-9) are factual reads of the code at hash `a2b68c7`. They are immutable in the sense that they reflect the code at C0; any later code change does not retroactively edit this section.
- The hypothesis register in §4 is immutable in shape (the four hypotheses + the refuted fifth) but confidence levels may be updated at later commits as data lands.
- The recommended C1 in §5 is immutable as a record of "this is what we planned at C0"; later commits may diverge but must explain why.

### §0.10 Forward-watch (this round, monitor across commits)

- **W-step-vs-db-attribution** — until C1 instrumentation lands, we cannot distinguish "per-step Vercel Workflow overhead" from "per-DB-query overhead inside steps." Both predict that 17 sequential operations × per-op cost = ~60s. The discriminator is per-step vs per-query timing, which only instrumentation produces.

- **W-oidc-floor-per-step** — per Finding 4, each cold-lambda workflow step potentially pays the OIDC token-mint floor. C1 instrumentation should grep for the `getDbPassword: oidc source snapshot` log line in the workflow-step logs; absence on subsequent steps (= warm reuse) is one possibility, presence on every step is another. The two predict different total costs.

- **W-submit-cost-independent** — Finding 8 raised the ~1s-per-submit cost. C1 instrumentation deployed for endSession will probably also illuminate per-submit costs as a side effect (since `submitAttempt` already logs). If the per-submit cost compresses dramatically after the endSession fix (e.g., because they share a cold-lambda warmup floor), that's a finding. If it stays at ~1s, it confirms `R-submit-attempt-1s-per-call` is independent and needs its own round.

- **W-distinct-subtype-count-on-full-length** — Finding 1 asserts 14 sub-types because the config defines 14 and a full-length covers all of them. C1 instrumentation should log `subTypeCount` from `logRecomputeLoopStartingStep` to verify; if it's < 14 on some full-length sessions (e.g., because no items existed for some sub-type, or the session ended early), the step count is smaller and the slowness model needs adjustment.

- **W-polling-tail** — `await run.returnValue` polls the workflow runtime. The polling interval is not visible from our code; it lives in `node_modules/workflow/api`. C1 may include a `node_modules/workflow/api` read to characterize the polling cadence. If the interval is ~500ms-1s, "polling tail" adds ~250-500ms of mean delay beyond the actual workflow completion. Not the dominant factor under H1, but worth noting.

### §0.11 Forward-pin index (updated at round-close)

Pins **carried forward** from `cacheComponents-investigation` §0.11 (status unchanged at C0 unless noted):

- **R-purveyor-companion-resources-still-up** — unchanged.
- **R-strategy-linkage-unused** — unchanged.
- **R-local-prod-rejected_by-divergence** — unchanged.
- **R-script-log-verbosity** — unchanged.
- **R-script-no-concurrency** — unchanged.
- **R-300s-request-hang-on-credential-failure** — unchanged.
- **R-probe-removal-pending** — unchanged.
- **R-poll-loop-50ms-minimum-overhead** — unchanged. **Relevant to this round** — the OIDC poll-loop floor is a candidate amplifier for the per-workflow-step cold-start cost (see Finding 4).
- **R-vestigial-diagnostic-overtime-column** — unchanged.
- **R-onboarding-targets-form-on-historical-views** — unchanged.
- **R-startSession-zod-still-accepts-diagnostic** — unchanged.
- **R-stale-comments-after-route-removal** — unchanged.
- **R-phantom-vercel-deployment** — unchanged.
- **R-vercel-logs-cli-duplication-artifact** — unchanged. **Relevant to this round** — methodology pin; do not use `vercel logs --limit N` as forensic data; rely on direct in-browser testing and on-host Pino emissions captured at preview.
- **R-vercel-logs-staleness** — unchanged. Same relevance.
- **R-vercel-workflow-pins-to-deployment-hostname** — unchanged at C0 (re-confirmed at Finding 9 as a real architectural property, not a misobservation). May become C1+ relevant if we measure on a preview URL but workflow steps execute on a different deployment.
- **R-bun-nextjs16-action-stream-mechanism-uncharacterized** — unchanged.

Pins **promoted** at this round's open:

- **R-end-session-perf-slow** — promoted from "deferred to successor round" to **THIS round's working brief**. The pin remains active until the round closes with a confirmed fix or a confirmed defer-to-successor.

New pins **opened** at this round's C0:

- **R-submit-attempt-1s-per-call** — `submitAttempt` (per `src/server/sessions/submit.ts`) appears to take ~1 second per call in production (per round-open prompt's empirical data: 973ms, 986ms, 1038ms observed mid-session). The submit path does ~3 DB reads + 1 DB write + 1 selection call. The cost is NOT end-of-session-coupled (no workflow fires from submit). Independent perf concern, likely needs a successor `submit-perf` round. **Priority: medium** — additive ~50s across a 50-Q session in addition to the end-session ~60s; user-visible per-question latency.

- **R-mastery-recompute-query-unindexed-for-filter-shape** — `readLastNAttempts` (per `src/server/mastery/recompute.ts:38-68`) joins `attempts × items × practice_sessions` and filters on `(practice_sessions.user_id, items.sub_type_id)`, but neither column is directly indexed at `attempts`. Only `attempts.session_id` and `attempts.item_id` are indexed. For a heavy user the planner cost is unbounded as attempt history grows. **Priority: low-medium** — currently a tail effect; will become primary as user attempt-count grows.

- **R-workflow-comment-stale-on-parallelism-savings** — `src/workflows/mastery-recompute.ts:8-9` comment asserts parallelism saves "only a few hundred milliseconds." If C1 measurement shows the per-step Vercel Workflow overhead is the dominant cost, this comment is wrong by an order of magnitude and the design rationale ("partial-failure complexity not worth a few hundred ms") needs reconsideration. **Priority: low** — code comment hygiene, but it currently encodes a design constraint that may not survive measurement.

### §0.11-RC Round-close pin reconciliation (C4)

**Pins RETIRED at round-close:**

- **`R-end-session-perf-slow` — RESOLVED** at C2/C3. 50-Q full-length `endSession` went 13.6s → 2.27s measured (6× improvement, well under the <5s criterion). Mechanism: workflow step collapse eliminated per-boundary dispatch overhead. Prod confirmed smooth by the user on `dpl_GK52EP42MKndso7ZWehtzQoLCdNu`.
- **`R-mastery-recompute-query-unindexed-for-filter-shape` — REFUTED** at C1. Measured per-query times were 2–96ms (median ≈5ms). The unindexed filter shape is not a measurable cost at current scale; indexing is not warranted. (If user attempt-history grows by orders of magnitude this could re-surface, but there is no evidence for it now.)
- **`R-workflow-comment-stale-on-parallelism-savings` — MOOT** at C2. The workflow body was collapsed; the stale comment asserting "parallelism saves only a few hundred ms" was removed with the code it annotated.

**Pins in the OPEN set at round-close:**

- **`R-submit-attempt-1s-per-call`** (opened at C0 Finding 8; carries forward unresolved). Each `submitAttempt` averages ≈1s. Affects per-question latency, not end-of-session. Future `submit-perf` round target. **Priority: medium.**
- **`R-await-completion-polling-tail-1.75s`** (new at C4). `endSession` has ≈1.75s of residual latency after C2 (2.27s total − ≈422ms collapsed step work ≈ 1.85s of workflow dispatch + start + polling tail). Addressable via **Path C**: move `revalidatePath` into the workflow tail and switch to `awaitCompletion: false` + `after()`, which would drop user-perceived latency to ≈300–500ms. **Not urgent** — current latency is well within target. Open for a future round only if ever needed.
- **`R-prod-domain-mismatch-18seconds-tech-vs-vercel-app`** (new at C4). The redirector's model carried an incorrect `18seconds.tech` assumption; the actual prod alias is `https://18seconds.vercel.app`. No custom `.tech` domain is attached. Banked for future prompt-template correctness. **Priority: low.**
- **`R-leonardiwata-2680-out-of-band-prod-deploys`** (new at C4). Four prod deployments by `leonardiwata-2680` landed between the cacheComponents-investigation close and end-session-perf C3, outside redirector awareness (see §0.6). Likely intentional manual deploys or a second-machine workflow. Flag for awareness; not blocking. Worth a one-line check-in with Leo at some point ("are you doing manual deploys outside our rounds?"). **Priority: low.**

**Carried-forward pins** (from the §0.11 C0 list above) — status unchanged at round-close; they were not in this round's scope.

### §0.12 Trigger conditions for successor rounds

- **`submit-perf` sub-round / successor round** — fires if C1 measurement isolates the per-submit ~1s cost as independent of end-of-session work (W-submit-cost-independent confirmed).
- **`mastery-recompute-query-index` sub-round** — fires if C1 measurement attributes a significant fraction of recomputeStep latency to the unindexed query specifically (not to Vercel Workflow per-step overhead).
- **`workflow-step-architecture` sub-round** — fires if C1 measurement confirms per-step overhead dominates and we want to restructure (collapse 14 recomputes to 1 step, or migrate the workflow to a single-shot function, or move to `after()` with the revalidate moved into the workflow tail). Likely C2 of this round, not a separate round.

---

## §1 Commit ledger

### C0 — audit (commit `06b1930`)

- **Type:** plan-doc, read-only audit, no source changes.
- **Files touched:** `docs/plans/end-session-perf.md` (new).
- **Code changes:** none.
- **Deploys:** none.
- **Lefthook status:** clean (plan-doc only).
- **Outcome:** 17-step workflow + 44 serial DB queries identified (§0.5 Findings 1–9). §4 hypothesis register opened. §5 recommended C1 articulated. Round opened.

### C1 — instrumentation (commit `7eb56d5`, preview `dpl_9gWMRpgikeQaSYLfEfwVQV5hL2Xn`)

- **Type:** Pino timing instrumentation; preview deploy; measurement.
- **Change:** 26 timing logs added across 4 files (action wrapper, `end.ts`, workflow steps, `recompute.ts`).
- **Measurement:** preview 50-Q full-length run measured `endSession:action:complete` `totalMs` = **13.6s**.
- **Outcome:** H1 reframed from "per-step *work*" to "per-step *transitions*"; H3 and H4 refuted. Step *transitions* identified as ≈700ms each — 15 transitions × ≈700ms ≈ 10s of pure boundary overhead.

### C2 — collapse (commit `10555f2`, preview `dpl_9Rm1EtBrEhWtgv7Y6j3or9X5TUVA`)

- **Type:** workflow restructure — collapse 4 workflow steps into 1 (`recomputeAllForSession`).
- **Change:** the old 4 step functions kept exported for a one-line revert.
- **Measurement:** preview 50-Q full-length run measured `endSession:action:complete` `totalMs` = **2.27s** (subjective ≈4.75s).
- **Outcome:** 6× improvement; hit the <5s success criterion.

### C3 — production promotion (deployment `dpl_GK52EP42MKndso7ZWehtzQoLCdNu`)

- **Type:** `vercel promote` of the C2 preview to production.
- **Note:** `vercel promote` triggered a rebuild-then-swap (per §3.13, now banked at 2/5 in the cross-round registry).
- **Verification:** step 4 confirmed current prod before promotion; surfaced `leonardiwata-2680` out-of-band deploys (see §0.6).
- **Outcome:** prod 50-Q full-length confirmed smooth by the user. Round-close authorized.

### C4 — round-close (this commit)

- **Type:** plan-doc, doc-only. No code touched, no deploys.
- **Files touched:** `docs/plans/end-session-perf.md`.
- **Outcome:** §0.6 reconciliation extended; §3.14/§3.15/§3.16 patterns banked; §4 final state recorded; §0.11 pins reconciled (3 retired, 4 in the open set); §6 round-close shape filled. Round CLOSED.

---

## §3 Candidate patterns (carryover; no new at C0)

C0 introduces no new patterns. The endSession code already follows the established error-handling, structured-logging, and no-relative-import patterns. The audit identifies one piece of comment-as-design-rationale that may need revision (see `R-workflow-comment-stale-on-parallelism-savings` in §0.11), but that's not a new pattern, just a fact about an existing pattern's load-bearing rationale.

### §3 round-close banking (C4)

Three cross-round patterns are banked at this round's close, each at first occurrence (1/5).

#### §3.14 — Executor takes a between-round, prompt-unauthorized action

An executor performs an action — typically an autonomous "improvement" commit — without an explicit prompt authorizing it.

- **Characteristics:** happens at the boundary between two prompts, when the executor has finished a stop-and-report and would normally idle. The action is usually benign or even useful (the executor is trying to do good work). The deviation is procedural: a commit lands without the redirector's prompt authorizing it.
- **Discriminator from §6.14.43 sub-type 6:** sub-type 6 is the *redirector* assuming a project convention that doesn't match reality. §3.14 is the *executor* taking unprompted action. Different actor, different mechanism.
- **First occurrence:** `a2b68c7` — the second cacheComponents session log, authored after the C3-close push of the prior round (see §0.6).
- **Prevention adopted in this round:** an explicit "STOP HERE. No further commits, edits, deploys, or runs until the next prompt arrives." line at the end of every prompt from step 41 onward.
- **Prevention outcome:** across C1 (step 41), C2 (step 42), C3 (step 43) of this round — zero recurrences. The prevention worked on first application.
- **Status: 1/5.**

#### §3.15 — Audit-confident hypothesis refuted by measurement (right direction, wrong mechanism)

A C0 audit produces a hypothesis at HIGH confidence from code-reading and architectural reasoning. The measurement step (C1) confirms the audit identified the correct general *area* but reveals the *mechanism* is different from what was assumed. Without measurement, the next round (C2) would have optimized the wrong thing within the correct area, yielding no speedup.

- **First occurrence:** end-session-perf C0 held H1 ("per-step Vercel Workflow overhead × 17 sequential steps dominates") at HIGH confidence in its "per-step *work* dominates" form. C1 measurement reframed it to "per-step *transitions* dominate" — same direction (workflow overhead) but a different mechanism (boundary transitions, not per-step DB cost). Had C2 instead indexed `readLastNAttempts` on the strength of H3, the speedup would have been ≈0 because per-query times were already 2–50ms.
- **Implication:** when the C0 audit produces a HIGH-confidence hypothesis, the C1 measurement step is non-negotiable. The temptation to skip C1 and go straight to a C2 fix on audit confidence is dangerous — audits read *code*, measurements read *behavior*, and they don't always agree on mechanism.
- **Prevention:** keep the measurement-first discipline. A HIGH-confidence C0 hypothesis *increases* (not decreases) the value of C1 measurement.
- **Status: 1/5.**

#### §3.16 — Redirector's model of out-of-band system state goes stale between rounds

Between rounds, system state may change without the redirector's awareness — manual deploys, second-machine activity, dashboard actions, scheduled jobs, third-party-triggered events. The redirector enters the next round with a model that assumes state is what it was at the prior round-close. Acting on a stale model can fail safely (caught by a verification step) or fail dangerously (no verification step, wrong assumption acted upon).

- **First occurrence:** end-session-perf C3 — the redirector's prompt stated current prod was `dpl_HaYWegFbr7CLsY7qcS5NKcDhSv8v` (from the prior round's C3-close). The executor's `vercel ls --prod` revealed four newer prod deployments from `leonardiwata-2680` between rounds. The C3 verification step (step 4: "confirm current prod") surfaced the divergence before promotion, so no harm done.
- **Related shape, same round:** the redirector's health-check commands targeted `https://18seconds.tech/api/health`, which doesn't resolve. The actual prod alias is `https://18seconds.vercel.app`. This is a stale *domain* assumption rather than a stale *state* assumption — a slightly different shape, still under the §3.16 umbrella.
- **Prevention:** pre-action prompts include explicit verification steps for the system state being acted upon (current prod, current branch, current alias). The C3 prompt's step 4 ("Confirm current prod and the preview being promoted") was exactly this prevention pattern and worked correctly.
- **Status: 1/5.**

---

## §4 Hypothesis register

Four hypotheses ranked by C0-audit confidence. Each has a concrete falsification test that C1 instrumentation will execute. A fifth pre-bias hypothesis from the round-open prompt (external AI call) is refuted at C0 by code reading (Finding 5).

### H1 — Per-step Vercel Workflow overhead × 17 sequential steps is the dominant cost

**Confidence: HIGH.**

- The architecture from Finding 1 is unambiguous: 17 sequential `"use step"` invocations for a 14-sub-type full-length session.
- Each step is a separate HTTP exchange with the workflow runtime (`POST /.well-known/workflow/v1/step` per the prior round's log observations).
- Per-step overhead in Vercel Workflow includes: workflow-runtime dispatch, state persistence between steps, Lambda warm-or-cold pickup, OIDC handshake for DB-touching steps (potentially), and the step body itself.
- If each step costs ~2-4 seconds (well within published Vercel Workflow per-step characteristics for workflows that touch DB), 17 × 3s = ~51 seconds, matching the observed ~60 seconds.
- The workflow file's comment ("few hundred ms saved by parallelism") was almost certainly written before measuring per-step overhead at production scale and is likely wrong.

**Falsification test (C1 instrumentation):** add `logger.info { stepStartMs, stepEndMs, deltaMs }` at the top and bottom of each `"use step"` body in `src/workflows/mastery-recompute-steps.ts`. Add `logger.info { actionStartMs, postUpdateMs, postStartMs, postReturnValueMs }` around the equivalent points in `src/server/sessions/end.ts` and `src/app/(app)/actions.ts`. Deploy to a Vercel preview, run a 50-Q full-length session, capture the per-step + per-DB-query timing table.

- If the **sum of step deltas** is approximately equal to the **postReturnValueMs − postStartMs delta** → per-step overhead is the dominant cost. **H1 confirmed.** Proceed to step-count reduction (e.g., collapse 14 recomputes into 1 step, or migrate to a parallel fan-out).
- If the sum of step deltas is **much less than** the postReturnValueMs − postStartMs delta → much of the wait is **not** in step bodies; it's in workflow dispatch / polling tail / state persistence between steps. Still confirms a workflow-overhead-dominant story, just shifts the fix toward "use fewer workflow boundaries" rather than "make steps faster."
- If the sum of step deltas is dominated by **DB-query latency inside the steps** rather than the step boundaries themselves → **H1 refuted in favor of H3** (DB-query cost, see below).

### H2 — `await run.returnValue` polling cadence adds a measurable tail latency on top of the workflow body's actual completion time

**Confidence: MEDIUM-LOW.**

- `run.returnValue` (per the Vercel Workflow SDK) is a getter that resolves when the workflow body completes. Implementation likely involves polling the workflow runtime's status endpoint.
- If the polling interval is ~500ms or ~1s, the user-perceived wait can be up to one polling period longer than the actual workflow completion.
- At 17 steps × ~3s = ~51s body time, even a 1s polling tail is only 2% of the total — small in relative terms but possibly worth fixing if other costs come down.

**Falsification test:** read `node_modules/workflow/api` to find the `Run.returnValue` implementation and identify the polling interval. Cross-check with C1's `postReturnValueMs - workflow-body-completed-log-ms` delta — if the gap is consistently close to the polling interval, this is the polling tail.

- If the gap is large (e.g., 1-3s on every session) and matches a polling cadence → **H2 confirmed**. Fix is either upstream (rely on a push-style completion signal if Vercel Workflow exposes one) or downstream (the move to `after()` makes this irrelevant since we no longer await).
- If the gap is small or noisy → **H2 disconfirmed** as a meaningful contributor.

### H3 — The serial 14 sub-type recompute loop is dominated by DB-query cost (not by workflow step overhead), driven by the unindexed `readLastNAttempts` query

**Confidence: MEDIUM-LOW.**

- Per Finding 3, `readLastNAttempts` filters by `(practice_sessions.user_id, items.sub_type_id)` without an index supporting that filter shape. The 3-table join + ORDER BY id DESC LIMIT 10 may be much slower than expected at production scale, especially for heavy users.
- 14 × 200-500ms per query family (read-attempts + read-state + upsert) = 3-7 seconds, NOT 60 seconds — so H3 alone cannot explain the full observation, but it could be a meaningful contributor stacked on top of H1.
- H3 is RAISED here as a hypothesis worth measuring even if it's not the primary cause, because the unindexed-query issue is independently a future-degrading problem (see `R-mastery-recompute-query-unindexed-for-filter-shape`).

**Falsification test:** in C1 instrumentation, time each individual DB query inside `recomputeForUser` (`readLastNAttempts`, `readPreviousState`, the upsert). Sum across the 14 iterations.

- If per-query times are < 100ms each and the 14-iteration sum is < 5 seconds → **H3 refuted as a primary cost**. The slowness is in the workflow boundaries, not the queries.
- If `readLastNAttempts` is consistently > 500ms (especially for heavy users) → **H3 confirmed**. Even if step-collapse fixes the primary issue, the query needs indexing too.
- If `readLastNAttempts` p99 is >> p50 across iterations → there's heavy-user tail risk; index addition becomes a higher-priority follow-up.

### H4 — Cold-Lambda + OIDC poll-loop floor is paid per workflow step, amplifying the per-step cost

**Confidence: MEDIUM.**

- Per Finding 4 and `R-poll-loop-50ms-minimum-overhead`, the OIDC token-mint setup is paid on every cold DB-touching invocation. If each workflow step is a fresh Lambda (or even a warm Lambda with a cold DB connection), the OIDC floor stacks per step.
- This is a sub-component of H1's "per-step overhead" — it's H1 with a specific mechanism named. Confirming H4 confirms H1; refuting H4 narrows H1's mechanism elsewhere (e.g., workflow-runtime dispatch cost rather than DB-connection cold-start).

**Falsification test:** in C1 preview logs, grep for `getDbPassword: oidc source snapshot` emissions per workflow step. Count: how many of the 16 DB-touching steps emit this line? Cross-check with per-step delta.

- If every (or nearly every) DB-touching step emits the OIDC line, AND per-step delta correlates with the line's typical duration → **H4 confirmed**. Fix: warm-pooled DB connections / extend Lambda reuse across the workflow body / share a single connection across all 14 recomputes (which is naturally what happens if we collapse to one step — see H1's fix).
- If only the first DB-touching step emits the OIDC line and subsequent steps reuse a warm connection → **H4 refuted**. H1's per-step cost is in workflow-runtime dispatch, not DB-connection setup. Fix: workflow boundary reduction (same direction, different mechanism).

### H5 — (REFUTED at C0) External AI call (Anthropic / OpenAI) is invoked at end-of-session

**Confidence: REFUTED.**

The round-open prompt listed this as a pre-bias hypothesis. Finding 5 refutes it by code reading:

- Grep across `src/server/sessions/`, `src/server/mastery/`, `src/workflows/mastery-*`, `src/server/items/` for `anthropic`, `openai`, `api.anthropic`, `api.openai` returns exactly one match: `src/server/items/tagger.ts:1`, which is invoked from the **ingest pipeline** (not from any user-facing session lifecycle code).
- The endSession path makes no external HTTP calls beyond the Vercel Workflow runtime's own `.well-known/workflow/v1/*` dispatches.

**No falsification test needed; H5 is closed at C0.**

### §4 final state (round-close, C4)

| Hyp | C0 confidence | Final disposition |
|-----|---------------|-------------------|
| **H1** | HIGH | **REFUTED in original form** ("per-step *work* dominates"); **CONFIRMED in reframed form** ("per-step *transitions* dominate") at HIGH confidence after C1 measurement. |
| **H2** (polling tail) | MEDIUM-LOW | **Partially confirmed.** Accounts for ≈1.75s of residual latency after C2; addressable via Path C if ever needed (see pin `R-await-completion-polling-tail-1.75s`). |
| **H3** (unindexed query) | MEDIUM-LOW | **REFUTED at HIGH confidence.** C1 measured per-query times of 2–96ms (median ≈5ms); indexing would not have helped. |
| **H4** (OIDC floor per step) | MEDIUM | **REFUTED implicitly.** No OIDC-per-step overhead observed; connection reuse working. |
| **H5** (external AI call) | REFUTED at C0 | Stayed refuted — no external AI calls in the endSession path. |
| **W** (sub-type count) | assumed 14 at C0 | **Confirmed at 14** in C2 prod data. C0 audit assumed 14; C1 saw 12; C2 saw 14 — minor variance from session content. |

The dominant lesson: H1 was directionally right and mechanistically wrong, and only C1 measurement caught the distinction. Banked as pattern §3.15.

---

## §5 Recommended next actions (C1+, pending user authorization)

**Recommended C1: Add Pino timing instrumentation across the endSession path; deploy to a Vercel preview; capture a measured baseline.**

Pre-bias from the round-open prompt was "instrument first, then act unless the audit reveals a single obvious bottleneck." The audit reveals **a strongly-suspected bottleneck (H1: 17 sequential workflow steps)** but does NOT reveal a single obvious mechanism within that — H1, H2, H3, H4 all predict aspects of the observation, and the fix depends on which combination dominates.

**Concretely, C1 should add:**

1. **Action-level timing** in `src/app/(app)/actions.ts:119-134`:
   - At entry, log `{ sessionId, t0 }`.
   - Before/after `assertSessionOwnedBy`: log delta.
   - Before/after `sessionEnd.endSession`: log delta.
   - Before/after each `revalidatePath`: log delta.
   - Log a final `endSession action complete { totalMs }` so we can correlate with HTTP-response time.

2. **Underlying-fn timing** in `src/server/sessions/end.ts`:
   - Around the UPDATE.
   - Around `start(masteryRecomputeWorkflow, ...)`.
   - Around `await run.returnValue`.

3. **Per-step timing** in `src/workflows/mastery-recompute-steps.ts`:
   - At top + bottom of each step (`loadSessionMetadataStep`, `listDistinctSubTypesStep`, `logRecomputeLoopStartingStep`, `recomputeStep`).

4. **Per-DB-query timing** in `src/server/mastery/recompute.ts`:
   - Around `readLastNAttempts`.
   - Around `readPreviousState`.
   - Around the upsert.

5. **Decide deploy target.** Either:
   - **(preferred) preview deploy** — isolated, no production impact, but workflow execution behavior on preview should be checked to match prod (per Finding 9, workflows pin to deployment hostnames; a preview's workflows run against the preview's runtime, which matches what we want).
   - **production deploy with instrumentation** — gives more realistic load patterns, but adds Pino noise to production logs and slightly slows production momentarily. **Not recommended** for C1 — Leo can reproduce on preview with one full-length run.

6. **Run a 50-Q full-length on the preview.** Capture the full Pino log stream. Build the timing table:
   - `action_total_ms`
   - `assert_owned_ms`
   - `update_session_ms`
   - `workflow_start_ms`
   - `workflow_await_ms` (= `postReturnValueMs - postStartMs`)
   - per step: `loadMeta_ms`, `listDistinct_ms`, `logStart_ms`, `recompute_step_ms[0..13]`
   - per recompute step: `readAttempts_ms`, `readState_ms`, `upsert_ms`
   - sum of recompute_step deltas vs. workflow_await delta → gap = workflow-runtime overhead between steps
   - revalidate path deltas

7. **Discriminate the hypotheses** using the §4 falsification tests. Move to C2.

**Alternative C1 (rejected at C0):** skip instrumentation, go directly to a fix — collapse the 14 recompute steps into one step. Rejected because:

- We don't yet know whether per-step overhead actually dominates (could be DB-query cost; H1 vs H3).
- We don't know whether the polling tail is significant (H2).
- A fix without measurement risks moving an unknown amount of latency without confirming we addressed the actual bottleneck. The §6.14.45 discipline of "measure-first when audit shows mechanism but not magnitude" applies.

**Expected C2 (provisional, pending C1 data):**

- **If H1 confirmed by C1 (per-step overhead dominates):** collapse `recomputeStep` from N invocations to 1 invocation that does the for-loop internally. Step count drops from 17 to 4. Expected speedup: ~3-4× (proportional to step-count reduction).
- **If H1 + H3 both confirmed:** step collapse + add a compound index for `readLastNAttempts`'s filter shape (e.g., `attempts(session_id, item_id)` covering index plus a `items(sub_type_id)` index if not already present).
- **If H2 confirmed alongside H1:** consider the `awaitCompletion: false` + `after()` migration in addition to step collapse. The revalidate moves into the workflow tail step.

**Expected C3 (provisional):** verify on preview, then promote to production behind §6.14.31 gate. Re-measure on prod. If success criterion met (< 5s end-to-end), close round.

---

## §6 Round-close (C4)

**Round status: CLOSED.**

The round closed on the first of its three anticipated conditions: *"C1+ measurement + C2+ fix lands and is verified to bring the 50-Q end-session below 5 seconds on production."* (The other two anticipated conditions — interim mitigation, or root cause being immovably upstream — did not apply.)

### §6.1 Outcome

- 50-Q full-length `endSession` latency: **13.6s → 2.27s measured** (≈4.75s subjective), a **6× improvement**, comfortably under the <5s success criterion (§0.2).
- **Mechanism:** four Vercel Workflow steps were collapsed into one (`recomputeAllForSession`), eliminating ≈10s of per-boundary dispatch overhead. The slowness was *step transitions*, not step *work* — a distinction only C1 measurement surfaced (banked as §3.15).
- Production confirmed smooth by the user on a full 50-Q run against `dpl_GK52EP42MKndso7ZWehtzQoLCdNu`.

### §6.2 Round-close actions taken (C4)

- §0.6 reconciliation extended: `a2b68c7` between-round commit and `leonardiwata-2680` out-of-band prod activity documented.
- §3 banking: §3.14, §3.15, §3.16 banked at 1/5 each (first occurrence).
- §4 final state recorded: H1 refuted-then-reframed-confirmed; H2 partially confirmed; H3/H4/H5 refuted; W confirmed at 14.
- §1 commit ledger extended with the C0–C4 cycle entries.
- §0.11-RC pin reconciliation: 3 retired (`R-end-session-perf-slow`, `R-mastery-recompute-query-unindexed-for-filter-shape`, `R-workflow-comment-stale-on-parallelism-savings`); 4 in the open set at close (`R-submit-attempt-1s-per-call`, `R-await-completion-polling-tail-1.75s`, `R-prod-domain-mismatch-18seconds-tech-vs-vercel-app`, `R-leonardiwata-2680-out-of-band-prod-deploys`).

### §6.3 Cross-round registry — §6.14.43 sub-type 6 tracker

Entering this round: 4/5. Sub-type 6 events this round: zero — the `a2b68c7` deviation was considered under sub-type 6 at the C0 diagnostic but reclassified as §3.14 (executor unprompted action, not a redirector convention misassumption). Exiting this round: **4/5, unchanged.**

### §6.4 Residual / deferred

- `R-await-completion-polling-tail-1.75s` — the ≈1.75s residual is addressable via Path C but is not urgent (latency is within target).
- `R-submit-attempt-1s-per-call` — per-question submit latency, out of this round's scope; future `submit-perf` round.
- The two coexisting cacheComponents session logs (see §0.6) — consolidation deferred as non-urgent housekeeping.
- §0.10 forward-watch W-* items were superseded by the §4 final-state dispositions (W-step-vs-db-attribution answered by C1; W-oidc-floor-per-step → H4 refuted; W-submit-cost-independent → confirmed, pinned; W-distinct-subtype-count → W confirmed at 14; W-polling-tail → H2 partially confirmed, pinned). They are left in place as a historical record of the C0 watch list.

The round-close commit was pushed to `origin/main`.
