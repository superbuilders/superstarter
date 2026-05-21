# Plan — Phase 3, sub-phase 4: heartbeats + cron-runner wiring

> **Status: shipped 2026-05-04.** The four-commit sequence below landed on `main` cleanly:
>
>   - Commit 1 (plan) — `6016275` — `docs(phase3): add heartbeats-and-cron sub-phase 4 plan`
>   - Commit 2 (security fix) — `9ce8325` — `fix(heartbeat): scope route UPDATE by cookie user_id (Shape A — inline subquery)`
>   - Commit 3 (smoke) — `78eb047` — `test(heartbeat): route-level live-fire smoke for ownership-scope contract`
>   - Commit 4 (close-out) — *this commit* — `docs: close phase3-heartbeats-and-cron plan; SPEC §6.11 + §7.7 + §6.14 reconciliations; Phase 3 close`
>
> **Phase 3 is complete end-to-end.** Sub-phases 1 + 2 + 3 + 4 shipped the user-facing happy path AND the background-state-management infrastructure. Production-deploy coupling is unblocked — deploy-and-dogfood is the next move before Phase 5 (full-length tests + spaced-repetition + post-session review with click-to-highlight) starts.
>
> This plan was the canonical reference for sub-phase 4. The audit during plan-writing surfaced that all three deliverables originally scoped (heartbeat client, route handler, vercel.json cron) already existed on main; the load-bearing finding was a security gap on the existing route (no ownership check, sessionId-trusting). Commit 2 closed that gap via Shape A (inline subquery). Commit 3 formalized commit 2's manual verification as a four-scenario hermetic smoke that locks in the uniform-204 ownership-opacity contract. Commit 4 (this one) reconciled SPEC §6.11 and §7.7 to match shipped reality and added three new SPEC §6.14 implementation notes (uniform-response-code-for-ownership-opacity, hermetic-smoke-with-per-run-isolation, auth-shape-audit-before-pinning-a-perf-justified-design).

The audit-and-polish framing carries forward from sub-phases 2 and 3. **All three deliverables the prompt names already exist in the codebase**:

- `src/components/focus-shell/heartbeat.tsx` — the `<Heartbeat>` client component (recursive `setTimeout` cadence + `pagehide` listener via `AbortController`). Mounted in `focus-shell.tsx` at line 544 (verified during planning).
- `src/app/api/sessions/[sessionId]/heartbeat/route.ts` — the POST handler. Idempotent (the UPDATE includes `ended_at_ms IS NULL` so heartbeats race-cleanly with `endSession` and the abandon-sweep cron). Returns 204 unconditionally (errors logged, no 5xx leakage).
- `vercel.json` — already lists the cron entry: `{ "path": "/api/cron/abandon-sweep", "schedule": "* * * * *" }`.

Plus a deliberate proxy carve-out: `src/proxy.ts`'s `config.matcher` excludes `api/sessions/[^/]+/heartbeat`, AND `PUBLIC_PREFIXES` includes `/api/cron`. Both carve-outs are documented inline in `proxy.ts` and in the heartbeat route handler's header.

**Sub-phase 4's job is correspondingly small**: confirm the existing pieces fit together end-to-end (client → route → cron-finalize → workflow-side-effect), document the deliberate auth-skip rationale, and reconcile the SPEC drift against shipped reality. Two commits, possibly three if drift surfaces during verification.

## 1. Why this sub-phase, why now

Two forcing functions:

1. **This closes Phase 3.** Sub-phase 1 + 2 + 3 shipped the user-facing happy path. The heartbeat-and-abandon-sweep machinery is the last Phase-3 surface; it doesn't change what the user sees but it tightens the "user closed the tab and came back" resume-window contract from "5+ minutes since session insertion" (sub-phase 1's contract, the only abandonment signal `startSession` synchronously consumes today) to "30+ seconds since the last heartbeat" (sub-phase 4's tightened contract). For a user who briefly switches tabs at minute 4 of a drill and comes back at minute 6, sub-phase 1 says "stale, start fresh"; sub-phase 4 says "fresh, resume what you were doing" iff the heartbeat client kept the session marked alive. The user's surface doesn't change, but the resume-window correctness improves.

2. **Phase 3 deploy is gated on this round.** Sub-phase 1 + 2 + 3 sit on `main`; `vercel.json`'s cron entry is already in place but the route fires only in production (or preview deployments with cron config), not local dev. Holding the deploy until sub-phase 4 lets the round close cleanly: the next deploy pushes a Phase-3-complete state, with heartbeats firing in production (where Vercel's cron runtime takes over), the abandon-sweep route running every minute, and the workflow trigger producing mastery_state upserts on stale sessions.

This sub-phase, like sub-phases 2 and 3, is small relative to sub-phase 1. The audit is the load-bearing piece. If the audit is clean, the round may be as small as one smoke commit + one doc commit.

**After this round.** Deploy-and-dogfood is the next move (Phase 3 complete). Phase 5 is the next major arc; Phase 4 (LLM generation pipeline) and the roadmap's Round C (stats dashboard + history) are also in the queue but neither blocks deploy.

## 2. Existing scaffolding audit

### What's in `main` today

- **`src/components/focus-shell/heartbeat.tsx`** (74 lines). Mounts a recursive `setTimeout` loop with `HEARTBEAT_INTERVAL_MS = 30_000`, plus a `pagehide` event listener wired through `AbortController` for clean unmount. Each tick calls `navigator.sendBeacon('/api/sessions/${sessionId}/heartbeat', new Blob([""], {type: "text/plain"}))`. Body is empty — sessionId is in the path. Cleanup on unmount: `clearTimeout` on the pending tick + `controller.abort()` on the pagehide listener.

- **`src/components/focus-shell/focus-shell.tsx`** mounts `<Heartbeat sessionId={props.sessionId} />` as a sibling to `<ItemSlot>` (line 544). The mount is unconditional — both `/diagnostic/run` and `/drill/[subTypeId]/run` get the heartbeat client because both render through `<FocusShell>`.

- **`src/app/api/sessions/[sessionId]/heartbeat/route.ts`** (54 lines). POST handler. Reads `params.sessionId`, runs an UPDATE on `practice_sessions` setting `last_heartbeat_ms = (extract(epoch from now()) * 1000)::bigint` WHERE `id = $1 AND ended_at_ms IS NULL`. Returns 204 unconditionally. Errors logged at error level; row-missing-or-ended logged at debug level. **No `auth()` call** — the route is on the public side of the proxy carve-out.

- **`src/proxy.ts`** has `PUBLIC_PREFIXES` including `/api/cron` and `config.matcher` carving out `api/sessions/[^/]+/heartbeat`. Both carve-outs are documented inline; the heartbeat carve-out's rationale (avoid 120 extra DB reads per session per tab against `auth_sessions`) is in the route handler's header.

- **`src/app/api/cron/abandon-sweep/route.ts`** validates `Authorization: Bearer ${env.CRON_SECRET}`, runs the cron-compatible UPDATE shape (`ended_at_ms = last_heartbeat_ms + HEARTBEAT_GRACE_MS`, `completion_reason = 'abandoned'`) WHERE `last_heartbeat_ms < cutoff AND ended_at_ms IS NULL`. Sub-phase 1's commit 1 verification scenario 4 already confirmed the UPDATE shape matches `startSession`'s synchronous finalization. The §5.2 smoke (`scripts/dev/smoke/diagnostic-mastery-recompute.ts`) verified the cron→workflow→mastery_state chain end-to-end.

- **`vercel.json`** lists the cron entry. `bunVersion: "1.x"`, `regions: ["iad1"]`, `crons: [{ path: "/api/cron/abandon-sweep", schedule: "* * * * *" }]`.

- **`src/server/sessions/abandon-threshold.ts`** exports `ABANDON_THRESHOLD_MS = 5 * 60_000` (5 minutes) and `HEARTBEAT_GRACE_MS = 30_000` (30 seconds), shared between `startSession`'s synchronous path and the cron's path.

### What works — verified by audit

The data path from heartbeat-client → route handler → DB → cron → workflow → mastery_state is intact end-to-end. Each link has prior verification:

- Heartbeat client → route: covered by the heartbeat client's recursive `setTimeout` shape and the `pagehide` listener; no specific smoke yet but the contract is straightforward.
- Route → `last_heartbeat_ms` bumped: covered by the route's idempotent UPDATE.
- Cron → finalize stale rows: covered by sub-phase 1 commit 1 scenario 4.
- Cron → workflow → mastery_state upserts: covered by `scripts/dev/smoke/diagnostic-mastery-recompute.ts`.

The missing verification is the **end-to-end live-fire path**: a real heartbeat client beaconing → real route updating `last_heartbeat_ms` → manual cron POST observing the bumped value as still-fresh → the same row aged past the threshold → cron finalizes it. §3 below specifies the smoke.

### What the audit surfaced — load-bearing finding

The plan's first draft assumed the SPEC's "reads auth(), verifies the session belongs to the user" contract was satisfied by something — auth() in the route, an ownership check in the proxy, or equivalent. **It is not satisfied anywhere.** Concrete fact-finding:

- **Heartbeat route handler** (`src/app/api/sessions/[sessionId]/heartbeat/route.ts:28-49`). The POST handler reads `params.sessionId` from the URL path (no cookie access, no `auth()` call). The UPDATE WHERE clause (line 35) is:

  ```ts
  .where(and(eq(practiceSessions.id, sessionId), isNull(practiceSessions.endedAtMs)))
  ```

  No `user_id` clause. The route trusts the sessionId parameter — anyone who knows a sessionId can heartbeat it.

- **Proxy** (`src/proxy.ts:46-48`). The `config.matcher` carves the heartbeat path OUT of the proxy entirely:

  ```ts
  matcher: [
      "/((?!_next/static|_next/image|favicon|\\.well-known/workflow/|api/sessions/[^/]+/heartbeat).*)"
  ]
  ```

  The `auth()` call inside `proxyHandler` never fires for heartbeat requests. There's no "ownership check in the middleware that the route relies on" — the middleware simply doesn't run.

- **Session strategy** (`src/auth.ts:14`). `session: { strategy: "database" }`. The cookie is a session token (not a JWT); resolving cookie → user_id requires a DB lookup against `auth_sessions`. The user's prompt suggested "user_id read from the JWT, no auth_sessions DB hit" as a possibility — that's not applicable here. **Any ownership check on this route inevitably costs at least one DB read.**

- **Threat model.** UUIDv7 session ids have a 48-bit time prefix; the remaining 80 bits are random. Guessing a live sessionId is hard but not impossibly hard for a determined attacker who can probe at scale. Spoofed heartbeats can suppress another user's abandon-finalization, keeping their session in an in-progress state past the 5-minute cron threshold. Bounded damage (an attacker can keep a session "alive" but cannot read attempts, submit answers, or finalize the session — the route's UPDATE only writes `last_heartbeat_ms`), but real. **Pre-deploy is the right time to close this.**

The §7.7 SPEC contract ("verifies the session belongs to the user") is the RIGHT contract; the shipped route drifted from it during the proxy-carve-out optimization. The reconciliation direction therefore flips from the first-draft plan: rather than rewriting SPEC §7.7 to match shipped (no `auth()`), the route handler is amended to satisfy the SPEC's contract — with the implementation refined to keep DB cost bounded.

### What's likely worth verifying — for this round

Three items the audit needs to confirm or refute:

1. **Ownership check absent (FOUND, see above).** Drives commit 1 in the revised sequencing.
2. **Heartbeat client behavior under tab-backgrounding.** Documented in §10.1.
3. **Route handler idempotency under race conditions.** The UPDATE's `ended_at_ms IS NULL` guard makes it race-clean against `endSession` and the cron's UPDATE; verify under deliberate race scenarios. Stays in the live-fire smoke (§5).

## 3. Live-fire heartbeat smoke

### What's missing / what should exist

A smoke that exercises the full client→route→cron path in one run:

1. Set up a fresh user + an in-progress diagnostic session.
2. Mount `/diagnostic/run` in headless Chromium (auth-cookie injection per the established pattern).
3. Observe the network: assert at least one POST to `/api/sessions/${sessionId}/heartbeat` lands within ~35 seconds of mount (the first tick is at 30s; allow 5s of harness slack).
4. Read `practice_sessions.last_heartbeat_ms` for the session: assert it's been bumped recent-of-mount (within the last 10 seconds).
5. Manually age `last_heartbeat_ms` to 6 minutes ago (past `ABANDON_THRESHOLD_MS`).
6. Manually POST `/api/cron/abandon-sweep` (the same shape as `scripts/dev/smoke/diagnostic-mastery-recompute.ts`).
7. Assert the session's `completion_reason = 'abandoned'` and `ended_at_ms = aged_heartbeat + HEARTBEAT_GRACE_MS`.

### Implementation seam

`scripts/dev/smoke/heartbeat-cron-end-to-end.ts` (NEW). Mirrors the sign-out smoke's auth-cookie injection. Wait conditions use real wall-clock (the 30s heartbeat tick is the smallest meaningful interval here); the smoke runtime is ~40-50 seconds dominated by the wait-for-first-heartbeat assertion.

The "tab-backgrounded throttling" verification is harder to exercise from headless Chromium since "background" is a browser-level state. **Resolution per §10.1: skip the backgrounding-specific verification.** The recursive-setTimeout + sendBeacon shape already mitigates the canonical concern; verifying the foreground path is sufficient evidence the implementation works as designed.

### Files touched

- `scripts/dev/smoke/heartbeat-cron-end-to-end.ts` (NEW).

### Schema / state changes

None.

### Verification scenarios (this commit's deliverable IS the verification — meta-clarification)

The smoke's three pass conditions are the verification. If all three pass:
1. Network observation confirms heartbeat client fires at 30s.
2. DB read confirms route handler bumps `last_heartbeat_ms`.
3. DB read after manual cron POST confirms the row finalizes correctly.

## 4. Heartbeat client behavior — auxiliary checks

### What's missing / what should exist

Two specific behaviors worth confirming inside the smoke from §3 (or as separate scenarios):

1. **`pagehide` fires the beacon.** Trigger pagehide via `page.close()` in Playwright; observe a final beacon in the network log immediately before the close.
2. **Component unmount cleans up.** Navigate away from `/diagnostic/run` (e.g., to `/`); observe no further beacons land.

Both verifications are cheap to slot into the §3 smoke. Combined runtime adds ~5 seconds.

### Files touched

None additional (these scenarios live inside the §3 smoke).

### Schema / state changes

None.

## 5. Route handler idempotency under race

### What's missing / what should exist

The route's UPDATE includes `ended_at_ms IS NULL` so heartbeats race-cleanly with `endSession`. Verify by:

1. Drive a heartbeat that races with `endSession` for the same session: dispatch a beacon, immediately call `endSession`, assert the session row's `ended_at_ms` is set (not overwritten by a later heartbeat) and `last_heartbeat_ms` reflects whichever order won.
2. Drive a heartbeat that races with the cron's UPDATE: age `last_heartbeat_ms` to past the threshold, then dispatch a beacon AND POST the cron route in close succession; assert `completion_reason = 'abandoned'` (the cron's WHERE clause caught the row before the heartbeat could refresh it) OR the heartbeat won and the row stays in-progress (the heartbeat's UPDATE bumped `last_heartbeat_ms` past the cron's cutoff).

The race outcomes are observable in the row state; either is correct as long as the row is consistent (no half-updated mix).

### Implementation seam

These scenarios live in the §3 smoke as data-only checks (no client-side observation needed). They drive both writers via direct DB calls / fetch and assert the row state.

### Files touched

None additional.

### Schema / state changes

None.

## 6. SPEC reconciliation

### What's missing / what should exist

SPEC §7.7 currently says: "Reads `auth()`, verifies the session belongs to the user." This contract is correct; the shipped route drifted from it (§2 audit). The reconciliation direction is therefore **fix the code, not the SPEC**: commit 1 amends the route handler to satisfy the §7.7 contract via an inline ownership scope. The doc commit then keeps §7.7 close to its existing language and adds notes about:

- The proxy carve-out (`api/sessions/[^/]+/heartbeat`) remaining in place — it skips the proxy's session-resolution layer, but the route now does its own minimal ownership check inline.
- The implementation choice (single SQL JOIN against `auth_sessions` vs. calling `auth()` directly) that closes the security gap while keeping the per-heartbeat DB cost bounded to one query (one indexed lookup against `auth_sessions`, plus the existing UPDATE against `practice_sessions`).

Also reconcile SPEC §6.11's claim that the route "updates `last_heartbeat_ms = Date.now()`" — the actual implementation uses `(extract(epoch from now()) * 1000)::bigint`, which is server-clock-based rather than passing a JS-side `Date.now()`. Functionally equivalent under sane clock-skew assumptions; the SPEC text should match the actual SQL.

### Implementation seam

**All SPEC work lands in commit 3 — no SPEC edits in commit 1's scope.** Commit 1 touches code only (the route handler + its colocated comment headers); commit 3 touches docs only (`SPEC.md` and the plan's shipped header). This separation matters because the SPEC update describes the shape commit 1 actually shipped — writing the SPEC ahead of the code risks the doc drifting from whatever final shape lands. Two specific subsections to confirm in commit 3:

- **§6.11 (Heartbeat).** Two reconciliations: (a) clock-source phrasing — "updates `last_heartbeat_ms = Date.now()`" → "updates `last_heartbeat_ms` to server-side `(extract(epoch from now()) * 1000)::bigint`" (functionally equivalent under sane clock skew, but the SPEC text should match the actual SQL); (b) add a sentence noting the route's ownership-scope contract is enforced inline via the auth-sessions subquery from commit 1's UPDATE shape.

- **§7.7 (`recordHeartbeat`).** The "verifies the session belongs to the user" contract is preserved; the description of HOW it's verified updates to reflect commit 1's inline-subquery shape (Shape A from §7) rather than calling `auth()` directly. Add the proxy-carve-out + single-round-trip rationale per §7's pinning of Shape A.

Neither §6.11 nor §7.7 carry into commit 1 or commit 2. The doc commit is doc-only; the SPEC-text-vs-shipped-code drift Phase 3 has been disciplined about (see SPEC §6.14.11) is enforced here too: code first, doc reconciliation second, no overlap.

### Files touched

- `docs/SPEC.md` §6.11 — clock-source phrasing + ownership-scope sentence.
- `docs/SPEC.md` §7.7 — confirm "verifies the session belongs to the user" contract; describe the inline-subquery implementation + single-round-trip rationale.
- `docs/plans/phase3-heartbeats-and-cron.md` — status flip to "shipped" with all three commit hashes.

### Schema / state changes

None.

### Verification scenarios

None (doc-only).

## 7. Sequencing and commits

Three commits. The §2 audit surfaced a load-bearing security gap (no ownership check on the heartbeat route); the round opens with the fix rather than running the smoke against vulnerable code. Each commit lints, typechecks, and passes its verification scenarios before the next is started.

1. **`fix(heartbeat): scope route UPDATE by cookie user_id`.** Per §2's load-bearing finding. Adds a session-token cookie read inside the route handler and amends the UPDATE WHERE clause to scope by user_id resolved from `auth_sessions`.

   **Shape A pinned (inline subquery, single round-trip).** Read the session-token cookie from the request, run a single SQL statement whose UPDATE WHERE clause includes a subquery against `auth_sessions` to resolve user_id inline. Concretely:

   ```sql
   UPDATE practice_sessions
   SET last_heartbeat_ms = (extract(epoch from now()) * 1000)::bigint
   WHERE id = $sessionId
     AND ended_at_ms IS NULL
     AND user_id = (
         SELECT user_id FROM auth_sessions
         WHERE session_token = $cookieValue
           AND expires_ms > (extract(epoch from now()) * 1000)::bigint
     )
   RETURNING id
   ```

   The `expires_ms > now` check goes inside the subquery's WHERE clause, not as a separate SELECT — keeps the round-trip count at exactly one. Both indexed lookups (the `auth_sessions` token lookup and the `practice_sessions` PK) execute inline.

   **Cookie name.** Auth.js v5 names the session-token cookie environment-awarely: `authjs.session-token` in dev (HTTP), `__Secure-authjs.session-token` in production (HTTPS). Read both; the route should use the same env-aware naming Auth.js's own `auth()` helper uses internally rather than hardcoding the dev-only name. (This is the bug-source future-Claude will hit if the cookie name is hardcoded — works locally, fails in preview/production.)

   **Why Shape A and not Shape B.** Shape B (call `auth()` from inside the handler, then run the UPDATE with the resolved user_id) was considered and rejected:

   - Both shapes incur the `auth_sessions` DB read — the database session strategy means it cannot be avoided. The original perf rationale for the proxy carve-out (avoid 120× per-session per-tab DB reads) is moot under either shape; the gap-closure write is happening regardless.
   - The remaining axis is round-trip count. Shape B is two round-trips per heartbeat (auth() → auth_sessions; UPDATE → practice_sessions); Shape A is one round-trip (the UPDATE-with-subquery). For a 30s-cadence hot path that the original SPEC §6.11 explicitly named "Fast" as a constraint on, **one round-trip beats two**. Latency win is small in absolute terms (~5-15ms per heartbeat depending on PG round-trip latency) but consistent and the right default.
   - Shape B remains documented here so future contributors reading this plan don't have to re-derive the rejection rationale. **Do not switch to Shape B without a reason that overrides the round-trip-count argument.**

   **Idempotency contract preserved.** An unknown-or-mismatched `(sessionId, user_id)` pair, an expired token, a missing cookie, and a finalized session row all land as a 204 no-op with zero rows in the UPDATE's RETURNING (which the route already handles via the "row missing or already ended" debug-log path). No leakage of session existence or ownership through differing response codes. Errors logged at error level; non-error mismatches logged at debug. Same return-204-unconditionally posture as the existing handler.

2. **`test(heartbeat): live-fire smoke for client → route → cron-finalize chain, with ownership-scope regression coverage`.** Per §3 + §4 + §5, plus explicit ownership-scope verification (commit 1 fix is one careless refactor away from a regression without a negative-path test).

   Adds `scripts/dev/smoke/heartbeat-cron-end-to-end.ts`. Smoke runtime ~40-50 seconds (dominated by the 30s wait for the first foreground beacon). Real-DB harness creates two test users (A and B) with auth-session cookies for each. Verification scenarios in three groups:

   **Live-fire chain (§3 + §4 + §5):**
   - Three pass conditions: foreground heartbeat-client beacons fire within 35s of mount; route handler bumps `last_heartbeat_ms` to within 10s of the smoke's wall-clock time; manual aging + cron POST finalizes the row to `completion_reason = 'abandoned'` with `ended_at_ms = aged_heartbeat + HEARTBEAT_GRACE_MS`.
   - Pagehide + unmount cleanup (§4): `page.close()` triggers a final beacon; navigating away from the focus shell stops further beacons.
   - Race idempotency (§5): two race scenarios driven via direct DB calls + concurrent fetch — heartbeat racing with `endSession`, heartbeat racing with the cron's UPDATE. Final row state must be consistent (no half-updated mix).

   **Ownership-scope regression coverage (NEW, drives commit 1 verification):**
   - **Happy path.** User A signs in (cookie A injected), starts a session, drives one beacon to `/api/sessions/${A_session}/heartbeat`. Assert response 204 AND `practice_sessions.last_heartbeat_ms` for A's session advances (DB read, not response shape).
   - **Negative path.** User A's session exists with last_heartbeat_ms at known time T0. User B signs in (separate cookie B from a separate auth-session row). Drive a beacon from B's cookie context to `/api/sessions/${A_session}/heartbeat` (the URL contains A's sessionId; the cookie is B's). Assert `practice_sessions.last_heartbeat_ms` for A's session is **unchanged** (still T0) — verified via DB read, NOT via response code, since the route returns 204 idempotently to avoid leaking ownership info.

   The smoke's two-user setup mirrors the sign-out smoke's auth-cookie injection: insert two users + two `auth_sessions` rows; create two browser contexts each with a different cookie; drive scenarios by switching contexts. Cleanup: delete both auth-session rows at smoke end.

   **Response-shape decision.** The route returns 204 unconditionally for both happy and negative paths (no leakage of ownership through differing codes). Verification uses DB-state inspection per SPEC §6.14.12. If commit-time judgment changes this to 4xx for the negative path (e.g., to make debugging easier), update both the route and this smoke's expectation; the **DB-side assertion stays load-bearing regardless**.

3. **`docs: close phase3-heartbeats-and-cron plan; SPEC §6.11 + §7.7 reconciliation; Phase 3 close-out`.** Per §6. Plan status flip to "shipped" with the commit hashes filled in. SPEC §7.7 confirms the "verifies the session belongs to the user" contract is satisfied (now describing the inline-JOIN or `auth()`-call shape that landed in commit 1); SPEC §6.11 clock-source phrasing reconciled to match the actual SQL. Architecture-plan paragraph (User journey data flow §6) reaffirmed if needed; the existing text already says "the client `sendBeacon`s a heartbeat every 30 seconds plus a `pagehide` 'leaving' signal" so likely no change. **Phase 3 close-out** added to the round's report and to the plan's shipped header — this commit closes the entire Phase 3 arc, not just sub-phase 4.

## 8. Verification protocol carry-forward

Established discipline from prior sub-phases carries forward unchanged:

- `playwright-core` directly with `page.screenshot({ timeout: 30_000 })`.
- Real `page.click()` for any user-interaction-gated paths (the heartbeat smoke doesn't need clicks; navigation is via `page.goto`).
- Real-DB harness for `practice_sessions` reads and writes.
- Auth-cookie injection via the `authjs.session-token` pattern from `scripts/dev/smoke/sign-out-button.ts` (the most recent smoke). Reuse the same setup helper shape.
- Smoke-script directory pattern (SPEC §6.14.8): the heartbeat smoke is environment-dependent (needs the dev server running) and lives in `scripts/dev/smoke/`, not under `src/**/*.test.ts`.
- DB-state verification (SPEC §6.14.12): the smoke checks both the network observation (heartbeat fires) AND the DB-row state (`last_heartbeat_ms` bumped). Either alone would be insufficient.
- Network-observation patterns: Playwright's `page.on('request', ...)` is the established shape for capturing beacon URLs.

## 9. Out of scope

Explicit list — items deliberately not addressed in sub-phase 4:

- **Candidate-promotion cron (`/api/cron/candidate-promotion`).** PRD §4 / SPEC §7.12. Phase 6's territory; the route shape exists in SPEC but the cron entry isn't in `vercel.json` and the route handler isn't built. Sub-phase 4 wires only the abandon-sweep cron.
- **Heartbeat for non-focus-shell routes.** The heartbeat client mounts inside `<FocusShell>`; routes outside the shell (Mastery Map, drill configure, post-session, etc.) don't fire heartbeats. That's correct — heartbeats track in-flight session liveness, not user presence on the app.
- **Multi-tab heartbeat coordination.** A user with two tabs on `/diagnostic/run` for the same session fires heartbeats from both. The route's UPDATE is idempotent on `last_heartbeat_ms`; whichever tab's beacon arrives last wins, but both keep the row "fresh" cumulatively. No coordination needed.
- **Heartbeat-driven session-resume UI.** A "you have a diagnostic in progress, continue or restart?" banner. Phase 5+. Sub-phase 1's `startSession` already silently resumes when the heartbeat is fresh; sub-phase 4 doesn't change that contract.
- **Per-session option shuffling, click-to-highlight, full-length tests, spaced repetition.** Phase 5/6 territory.
- **Drill post-session review.** Phase 5.
- **Stats dashboard + history.** Roadmap Round C.
- **Adaptive difficulty walking.** Phase 5 — the `ErrAdaptiveDeferred` placeholder in `selection.ts` remains.

## 10. Open questions / resolutions

Two questions surfaced during plan-writing; both resolved before implementation.

### 10.1 Tab-backgrounding behavior — what actually happens, and is it correct?

**Question:** Heartbeats fire from a foreground tab cleanly (recursive `setTimeout` + `sendBeacon`, every 30s). What happens when the tab is backgrounded — and is whatever happens the *correct* behavior?

**The actual behavior, stated explicitly:** Chrome throttles `setTimeout` callbacks in backgrounded tabs to roughly **once per minute** after the tab has been hidden for ~5 minutes (and more aggressively in some configurations — Chromium's `IntensiveWakeUpThrottling` policy applies after ~5 min hidden, capping wake-ups at 1/min). Once throttling kicks in, the heartbeat cadence drops from one beacon every 30 seconds to one beacon roughly every 60 seconds. With `HEARTBEAT_GRACE_MS = 30_000` and `ABANDON_THRESHOLD_MS = 5 * 60_000`, the math says: a backgrounded tab whose heartbeats space out to 60+ seconds will have its `last_heartbeat_ms` cross the 5-minute abandon threshold, the cron will sweep the row, and the session will be finalized as `'abandoned'`. The user, if they return to the tab, will find their session gone — `startSession` on next interaction inserts a fresh row.

**Resolution: this IS the intended behavior.** A user who backgrounds their tab during a timed drill or diagnostic IS abandoning the session in the sense that matters — they're no longer in the focus shell, the timed contract no longer holds, and resuming midway would corrupt the latency signal the mastery model depends on. The browser-level throttling is upstream of any choice this codebase makes; rather than fighting it (e.g., with a service worker keeping the connection alive, or a `Page Visibility API` listener that pauses-instead-of-abandons the session), we let the throttling produce the correct outcome via the existing cron path. A user who briefly tab-switches and returns within the 5-minute window resumes cleanly via `startSession`'s fresh-resume path (the heartbeat client's first wake-up after the tab is foregrounded refreshes `last_heartbeat_ms`); a user who leaves the tab for 5+ minutes gets their session finalized, which is correct.

**Implication for the smoke:** the tab-backgrounding scenario is hard to exercise from headless Chromium AND verifies behavior the design relies on (browser-level throttling driving the correct cron outcome) rather than behavior this codebase implements. Skipping the backgrounded-tab scenario in the smoke is the right call; the verification scenarios that matter are the foreground-cadence one (§3) and the manual-aging cron-finalize one (§3 + §5).

### 10.2 SPEC §7.7 auth-skip reconciliation

**Question:** Should sub-phase 4 reconcile SPEC §7.7 to match shipped reality (no `auth()`), OR add `auth()` back to the route to match the SPEC's prior contract?

**Resolution: reconcile SPEC, keep the route as-is.** The route handler's auth-skip is a deliberate trade-off documented in both `route.ts` and `proxy.ts`. Adding `auth()` back would cost 120× per-session per-tab DB reads against `auth_sessions`, which is the canonical hot-path pattern this codebase tries to avoid. The SPEC drift is a documentation lag; the right fix is to update the SPEC to capture the trade-off explicitly, not to undo the trade-off. The SPEC update lands in commit 3.
