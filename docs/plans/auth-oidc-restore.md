# Auth OIDC Restore — Plan-Doc

Round: Auth OIDC Restore.
Round-open hash: `4ba8b6d` (HEAD at this commit-0; verified clean working tree, `origin/main...HEAD = 1 0` post-`prod-runtime-credentials-audit` close).
Round-close hash: TBD (multi-commit round; this commit is C0 — plan-doc open + probe-code skeleton-stage).
**Round status: OPEN.** Production is degraded: ~50% of `POST /diagnostic/run` server-action invocations succeed; the other ~50% fail with "x-vercel-oidc-token header missing" and hang for 300s (Vercel function max). Goal is to restore the production runtime IAM-auth path so Auth.js session lookup and downstream DB queries are reliable.

> **Round-shape decision (user instruction):** "make no assumptions and test everything." Probe-first. C1 adds a diagnostic snapshot inside `getDbPassword` recording where the OIDC token came from (request-context symbol vs env var vs absent) on every IAM-token-fetch attempt. C2 (gated) deploys. C3 inspects ~30+ requests of mixed-outcome traffic and reads the snapshot field on each. C4+ chooses the actual fix from §4 of `prod-runtime-credentials-audit` based on the C3 data — *no fix is committed before C3 produces evidence.*

---

## §0 Round metadata

### §0.1 Round name + hashes

- **Name:** Auth OIDC Restore.
- **Open hash (empirical, verified at commit-0):** `4ba8b6d` — `docs(plans): open prod-runtime-credentials-audit round with commit-0 deep audit`.
- **Concurrent rounds:** none. The just-closed `prod-runtime-credentials-audit` round forward-pinned the OIDC question into this round explicitly; this round is the realization of that pin.
- **Target close hash:** TBD.

### §0.2 Trigger

Production logs (last 6h, verified at this commit-0 audit) show:

- **Successful `POST /diagnostic/run`** calls (real user, `latencyMs: 14868`): `09:12:55`, `09:13:11`, `08:59:59`. Each emits `submitAttempt: attempt inserted` with full session/item context.
- **Failed `POST /diagnostic/run`** calls on the **same lambda instance** within seconds: `09:00:14`, `09:13:13`. Each is paired with the OIDC error `"The 'x-vercel-oidc-token' header is missing from the request"` and a final `"Vercel Runtime Timeout Error: Task timed out after 300 seconds"`.

User-observable symptom: clicking "Submit Answer" after selecting a radio button on Question 3/50 (screenshot evidence in transcript) appears to hang indefinitely — the Server Action never returns, the next item never renders, the user is stuck.

### §0.3 Scope (in-scope)

1. **C1** — Add a single one-shot snapshot logger inside `src/db/index.ts:getDbPassword` that records, on every IAM-token-fetch attempt:
   - Whether `globalThis[Symbol.for("@vercel/request-context")]` is defined at all (holder presence).
   - Whether `holder.get?.()` returns a value (request-context active).
   - Whether `headers?.["x-vercel-oidc-token"]` is present on that context.
   - Whether `process.env.VERCEL_OIDC_TOKEN` is defined as a fallback source.
   - The boolean composite is logged via `logger.info` with msg `"getDbPassword: oidc source snapshot"`.
   This is read-only instrumentation — the existing `signer.getAuthToken()` call follows unchanged.

2. **C2** — Deploy the probe to production via `vercel --prod` (or equivalent — exact CLI form decided at C2 boundary). Gated by §6.14.31.

3. **C3** — Generate ~30+ requests of mixed `POST /diagnostic/run` and `GET /` traffic (Leo or executor-authored), fetch logs via `vercel logs --since 30m --query "oidc source snapshot" --expand`, and **inspect every snapshot record to count partition cells:**

   | `hasContextHolder` | `hasContextValue` | `hasContextToken` | `hasEnvToken` | Interpretation |
   |---|---|---|---|---|
   | true / true / true / either | (count) | "OIDC succeeded for this call" |
   | true / true / **false** / false | (count) | "Request context exists but `x-vercel-oidc-token` header absent" → H3 partial-confirm |
   | true / **false** / — / false | (count) | "Holder exists but get() returned undefined" → H1 confirm (ALS lookup miss) |
   | **false** / — / — / false | (count) | "Symbol holder never installed on globalThis" → severe runtime-injection gap → H3 strong |
   | true / true / true / false then fails | (count) | "Token present but signer call still failed" → unrelated AWS-side issue |

4. **C4 +** — Based on C3 evidence, ship the fix. Three pre-authorized fix paths:

   - **C4-N — Node-runtime swap** (if H1 confirmed). Remove `"bunVersion": "1.x"` from `vercel.json` and `--bun` from `package.json` build/start scripts. Redeploy on default Node.js runtime. Re-run §0.3-C3-equivalent traffic and verify the failure cells go to 0.

   - **C4-E — Eager token capture** (if H2 confirmed). Refactor `src/db/index.ts:getDbPassword` so the IAM auth token is acquired inside a request handler's synchronous frame (via `getVercelOidcToken()` called eagerly inside the server action), then passed to `signer` as a literal token string instead of a callback. Larger surface change; only chosen if H1 swap doesn't fix it.

   - **C4-V — Platform support** (if H3 confirmed). File a Vercel support ticket with the snapshot evidence. App-side workaround = §C4-E.

5. **C5** — Remove the C1 probe instrumentation after the fix is verified. The snapshot logger is diagnostic-only; production should not carry it long-term.

6. **C6** — Functional verification: run the full diagnostic flow end-to-end on production (Q1 through Q50), confirm no stuck-on-question, no 300s timeouts in logs, no OIDC errors.

7. **C7** — Round close.

### §0.4 Anti-scope (explicit)

- **NOT** changing any Vercel project settings, OIDC Federation toggle, IAM trust policy, or env vars. The prior round confirmed all of these are correctly configured.
- **NOT** changing app-side `src/db/admin-secret.ts`, `src/auth.ts`, `src/server/sessions/*` — the failure is below the application layer, in the OIDC-source plumbing of `@vercel/oidc` + the Vercel runtime.
- **NOT** changing the `pg.Pool` size, ssl config, or any pool option other than the `password` callback wiring (and that only if C4-E is chosen).
- **NOT** introducing a separate "OIDC error handler" or retry layer at the application level. The fix must happen in the credential-acquisition path, not in retry middleware over a broken acquisition.
- **NOT** adding `@vercel/oidc` to `package.json` as a direct dependency. It is already present as a transitive of `@vercel/oidc-aws-credentials-provider`; the probe accesses the `globalThis` symbol directly with full type narrowing (no `as`, no dep addition).
- **NOT** opening sub-rounds in C1-C3. Those are pre-authorized for C4 onward.

### §0.5 Empirical audit findings at commit-0

Audit performed at HEAD = `4ba8b6d`. All findings inherit verbatim from `docs/plans/prod-runtime-credentials-audit.md` §0.5 (one round prior). The only new finding at this commit-0 is:

- **Symptom intensification observed in this round's commit-0 logs.** The prior round saw 1 OIDC error in 24h on log inspection at audit-time. The current 6h log fetch shows **5+ distinct failure-timeout pairs** across at least 2 different lambda hostnames (`169.254.45.137`, `169.254.57.77`), each interleaved with successful submits within seconds on the same instance. The failure rate has not visibly decreased since the prior round's audit; if anything, more user traffic during this window has surfaced more failures. Production is **actively degraded** and the C2 deploy gate is correspondingly urgent.

### §0.6 Doc-vs-empirical reconciliation

No new doc-vs-empirical divergences at this commit-0. The audit-round handoff is empirically intact:

- env vars: still 14h+ ago, lockstep with deployment
- code drift since deploy SHA `9a6b563`: still docs-only
- `vercel.json` config: unchanged
- runtime: still Bun

### §0.7 Destructive-operation surface

**One destructive operation** anticipated in this round: a redeploy of production at C2. Code changes are confined to a single function (`getDbPassword` in `src/db/index.ts`) and add only a `logger.info` line. The redeploy itself replaces the running production deployment with one that has the snapshot probe.

- **C2 §6.14.31 confirmation gate (REQUIRED).** Before C2 deploy:
  1. Show the diff vs `4ba8b6d` (`git diff 4ba8b6d..HEAD -- src/db/index.ts`).
  2. Show the deploy command verbatim.
  3. Wait for explicit "yes go" reply.
  4. Execute deploy. Capture output.
  5. Verify new deployment URL.
  6. Re-fetch logs immediately and confirm probe lines start appearing.

- **C4 redeploy** if/when a fix path is chosen will be a separate §6.14.31 gate.
- **C5 probe-removal redeploy** is also a §6.14.31 gate.

No data-side destructive ops (no DB writes, no env mutations).

### §0.8 §6.14.31 gate placement summary

- **Gate 1 — C2 (probe deploy).** As §0.7.
- **Gate 2 — C4 (fix deploy).** Same shape; fix-path commit + deploy command + acknowledgment.
- **Gate 3 — C5 (probe-removal deploy).** Same shape; probe-removal commit + deploy command + acknowledgment.

Three gates total. May expand if C4 splits into C4a/C4b for distinct fix paths.

### §0.9 Pre-flight readiness checklist (run at C1 boundary)

- [x] `4ba8b6d` is `origin/main` HEAD ← confirmed `git rev-list --left-right --count origin/main...HEAD = 1 0` (the 1 is `4ba8b6d` itself, locally committed but unpushed)
- [x] Production deployment 14h old, code-drift-free since `9a6b563` ← confirmed prior round §0.5.H
- [x] OIDC failures still actively firing on production ← confirmed this round §0.5 (5+ failures in 6h)
- [x] `src/db/index.ts:getDbPassword` is the canonical IAM-token entry point for runtime DB queries ← confirmed prior round §0.5.F (stack-trace frame `c` maps here)
- [x] Probe will run inside `getDbPassword` — same async frame as the failing call — so its snapshot reflects the exact context that the OIDC lookup will see ← verified by stack-trace analysis
- [ ] Executor has `vercel` CLI authenticated against project `prj_3tsohpv4YQRqNRNREHfRSoeDwQc2` ← assumed-true (last round used it); verify at C2

### §0.10 Forward-watch entries

- **Sub-type 6 count entering this round:** 4/5 (per `prod-runtime-credentials-audit` close).
- **Pre-authorized sub-rounds:**
  - `fix-path-divergence-sub-round` — triggers if C3 data shows that NONE of H1/H2/H3 cleanly partition the failure cells (e.g., the failure-cell distribution implies a fourth hypothesis we haven't enumerated). Sub-round would re-audit §4 of `prod-runtime-credentials-audit` and add hypothesis H4+.
  - `signer-network-failure-sub-round` — triggers if C3 data shows snapshots with `hasContextToken=true` paired with `signer.getAuthToken()` still failing. That implies AWS STS / RDS Signer is the problem, not OIDC plumbing. Different fix path entirely (IAM trust policy revisit, network reachability to STS endpoint, etc.).
  - `probe-instrumentation-removal-skip-sub-round` — triggers if C4 fix is so radical (e.g., rewriting the credential-acquisition path entirely) that the probe code is naturally deleted as part of C4; C5 then becomes a no-op or a doc-update.

### §0.11 Forward-pin index (updated at this commit)

Carried forward from `prod-runtime-credentials-audit`:

- **R-purveyor-companion-resources-still-up** — unchanged.
- **R-strategy-linkage-unused** — unchanged.
- **R-local-prod-rejected_by-divergence** — unchanged.
- **R-bun-async-context-loss-or-runtime-injection-gap** — REALIZED in this round (this round IS the diagnostic + fix path).
- **R-script-log-verbosity** — unchanged.
- **R-script-no-concurrency** — unchanged.

New pin from this round's commit-0:

- **R-300s-request-hang-on-credential-failure** — NEW. When `getDbPassword` throws (OIDC-source missing), the calling pg.Pool.connect rejects, but the upstream Auth.js queryWithCache wrapper does not unwind cleanly — the request hangs to the 300s function max. Independent of the OIDC fix, the failure-handling path should propagate the rejection so the request terminates immediately with a 500. Pinned for a follow-up commit after this round closes (or for §5.5 of the prior round's recommendations to be realized).

### §0.12 Controlled cold-start trigger (testing aid for C4-W validation)

**Purpose.** Unauthenticated curls do not trigger `getDbPassword` — Auth.js short-circuits when no session cookie is present, so the DB path is never entered. To exercise the cold-start OIDC injection race deliberately (rather than waiting on chance organic traffic), use an authenticated session cookie.

**Setup (one-time, manual, browser-side).**

1. Sign in to `https://18seconds.vercel.app` via Google.
2. Open browser DevTools → **Application** → **Storage** → **Cookies** → `https://18seconds.vercel.app`.
3. Locate the cookie named **`__Secure-authjs.session-token`** (Auth.js v5 default; the `__Secure-` prefix is added automatically on HTTPS — confirmed empirically by reading `node_modules/.bun/@auth+core@0.41.2/node_modules/@auth/core/lib/utils/cookie.js` line `name: \`${cookiePrefix}authjs.session-token\``).
4. Copy the cookie's **value** (a long opaque string starting with the session UUID).
5. **Do not** paste this value into any script, log line, commit, or chat transcript. Treat it like a password. When invoking the curl below, paste it directly into the terminal at the point marked `<paste-cookie-value-here>` and clear shell history if desired (`history -d $(history 1)` after invocation).

**Forcing a cold-start.** Vercel spins idle lambdas down after ~5 min. To guarantee a cold-start hit:

- **Option A — passive:** wait ≥5 min since any prior traffic to the production deployment.
- **Option B — active:** redeploy via `vercel --prod`. Every fresh deployment creates fresh lambdas; the first DB-touching request after deploy is the canonical cold-start.

**Trigger curl (one-line, paste cookie at runtime).**

```
curl -sS -o /dev/null \
  -w 'status=%{http_code} time=%{time_total}s\n' \
  'https://18seconds.vercel.app/' \
  -H 'Cookie: __Secure-authjs.session-token=<paste-cookie-value-here>'
```

`GET /` triggers the app layout's `auth()` call, which queries the sessions table by token → enters `getDbPassword` → exercises the cold-start race path if it's open.

**Observation.**

```
vercel logs https://18seconds.vercel.app \
  --no-follow --environment production --no-branch \
  --since 2m --limit 50 \
  --query "oidc poll result" --expand
```

Expected outcomes:

| Result | Interpretation |
|---|---|
| 0 entries returned | Cold-start race did NOT trigger on this lambda (token was present at entry, no poll needed). Re-try after Option A/B. |
| 1+ entries with `success=true` and small `pollMs` | C4-W fix worked. The recorded `pollMs` value is the empirical race-window duration on this lambda. Add to the data set. |
| 1+ entries with `success=false`, `pollMs=2000` | C4-W cap was reached without the token appearing. Either the race window exceeds 2s (extend cap and revisit) or a different mechanism is in play (open a sub-round and re-audit). |
| `getDbPassword: oidc source snapshot` followed by an `error` log with `rds iam auth token fetch failed` (no `oidc poll result` between them) | The fix path failed to engage — the snapshot reported `hasContextToken=true` but signer still threw. Indicates a different bug; open a sub-round. |

**Tear-down.** Nothing to clean up server-side. The cookie remains valid until Leo's session expires or is invalidated; revoking client-side is `Application` → `Cookies` → right-click → Delete.

---

## §1 Commit ledger skeleton

### §1.0 C0 — Open plan-doc + probe code skeleton (this commit)

**Operation:** Write `docs/plans/auth-oidc-restore.md` (this file) and add the C1 probe code to `src/db/index.ts`. The probe is unconditional (no env-gating) and emits a single `logger.info` per `getDbPassword` invocation. Code addition: ~25 lines, fully type-narrowed through `unknown` rather than `as`.

**Verification (in this commit's stop-and-report):**
- Plan-doc exists at `docs/plans/auth-oidc-restore.md` with line count.
- `src/db/index.ts` diff shows added imports/helpers + the snapshot logger inside `getDbPassword`, no other changes.
- `bun --bun tsgo --noEmit` passes (typecheck clean).
- `bun --bun biome lint --staged` passes.
- `git status` clean post-commit.

**Commit message shape:** `docs(plans): open auth-oidc-restore round; add OIDC source-snapshot probe to getDbPassword`.

### §1.2 C2 — Deploy probe to production [§6.14.31 gate 1]

**Operation:** `vercel --prod` (or equivalent). Capture deployment URL. Re-fetch logs.

**Verification:** New `getDbPassword: oidc source snapshot` log entries appear in production logs within ~1m of the first inbound request.

**Commit message shape:** N/A (deploy is not a git commit; the C2 boundary is the deploy itself, not a commit).

### §1.3 C3 — Capture & analyze ~30 mixed snapshots

**Operation:** Generate ~30 requests across the live diagnostic flow. Fetch logs, partition by snapshot cells, document counts.

**Verification:** A populated partition table per §0.3.C3.

**Commit message shape:** `docs(plans): auth-oidc-restore C3 — capture OIDC snapshot partition <counts>`.

### §1.4 C4-N / C4-E / C4-V — Fix path

Chosen based on C3 evidence. Each is a separate commit with its own §6.14.31 gate. Detailed sub-section to be inlined at C4 boundary.

### §1.5 C5 — Remove probe [§6.14.31 gate 3]

**Operation:** Revert the C1 probe code. Redeploy. Verify production logs no longer contain `getDbPassword: oidc source snapshot` lines.

### §1.6 C6 — Functional verification

**Operation:** Run the full diagnostic flow end-to-end on production. Confirm 50 attempts insert cleanly, no 300s timeouts.

### §1.7 C7 — Round close

Standard round-close shape.

---

## §3 Candidate patterns

No new candidates surfaced at this commit-0 beyond those carried forward from `prod-runtime-credentials-audit` §3.1-3.6. New candidates may surface at C3 (when partition data lands) or C4 (when the fix is chosen).

---

## §4 Hypothesis register (carried verbatim from `prod-runtime-credentials-audit` §4)

Inherited unchanged. Refer to the prior plan-doc for full text. Summary:

| # | Hypothesis | Confidence | Partition signature in C3 snapshot data |
|---|---|---|---|
| H1 | Bun-on-Vercel ALS propagation gap | 65% | `hasContextHolder=true`, `hasContextValue=false` on failures |
| H2 | pg.Pool callback runs detached from request scope | 25% | Failures correlate with cold-start lambda or post-idle re-acquire; otherwise overlaps H1 |
| H3 | Vercel runtime injection gap | 10% | `hasContextHolder=false` on failures, or `hasContextValue=true` but `hasContextToken=false` |

---

## §5 Round-close shape

Round closes at C7 after C6 verification passes. Round-close commit populates §6.14.43 sub-type tally and updates §0.11 forward-pin index.

**End of plan-doc at this commit-0 stage.** C1 code follows in the same commit.
