# Onboarding Flow Removal — Plan-Doc

Round: Onboarding Flow Removal.
Round-open hash: `16ae176` (HEAD at C0 audit; verified clean working tree; `git rev-list --left-right --count origin/main...HEAD = 0 1` — `16ae176` is the prior round's session-log commit, locally committed but unpushed).
Round-close hash: this commit (round-close C6).
**Round status: CLOSED.**

> **Round status (CLOSED).** Forced diagnostic onboarding removed (commits `c65a8d2`, `682a752`, `f0a97e4` deployed as `dpl_5jnhDDraqEqNov5AUuHVDk9YwbSk`). Sign-in lands at dashboard; `/diagnostic` 404s. C5.5 unplanned defensive fix (commit `9ece713` deployed as `dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6`): `submit_failed` reducer action clears stuck `submitPending` on server-action failure, preserving `selectedOptionId` for user retry. Empirically validated by Leo completing a full practice test on production: hangs occurred, recovery engaged, session completed end-to-end. The underlying `cacheComponents`+Bun interaction (`R-cacheComponents-bun-settimeout-incompat`) is NOT fixed; it's now degraded-UX-but-survivable rather than user-stranding. Next round (`cacheComponents-investigation`) attacks the underlying bug.

> **Round-shape decision (closed-plan-immutable from C0).** Audit-first. C0 documented what we proposed to do without doing any of it. A user-reviewed plan was the precondition for code change. C1 onward executed the removal commit-by-commit with §6.14.31 gates wrapping every production deploy.

---

## §0 Round metadata

### §0.1 Round name + hashes

- **Name:** Onboarding Flow Removal.
- **Plan-doc filename:** `docs/plans/onboarding-flow-removal.md` (per the round-open instructions).
- **Provisional alias in prior plan-docs:** `diagnostic-onboarding-removal` (the name used by `auth-oidc-restore` §0.11 when forward-pinning this round's trigger). This plan-doc supersedes that provisional alias.
- **Open hash (empirical, verified at commit-0):** `16ae176` — `docs(claude_logs): add session log for auth-oidc-restore round, document critical finding on cacheComponents and Bun interaction`. The user's round-open prompt referenced `5ecc30c` as HEAD; the actual repo HEAD is one commit ahead at `16ae176` (the prior round's claude-log addition). The audit is performed against `16ae176`.
- **Concurrent rounds:** none. This round is the realization of `R-diagnostic-onboarding-removal-requested` from `auth-oidc-restore` §0.11.
- **Target close hash:** TBD.

### §0.2 Trigger

Leadership request relayed by Leo, captured in the previous round's §0.11 forward-pin index as `R-diagnostic-onboarding-removal-requested`. Leadership-stated timeline: **"this week."**

Goal: **Post-login lands users at the dashboard directly. Practice tests remain available as opt-in. The forced diagnostic onboarding goes away.**

Secondary effect (not the primary goal): removing `/diagnostic/run` also removes the known reproduction surface for `R-cacheComponents-bun-settimeout-incompat` (the silent-server-action-hang defect Leo hit on Q6 of his live validation). The defect itself is general and survives this round; only its currently-observed reproduction route disappears.

### §0.3 Scope (in-scope)

1. **C1 — Remove the forced-onboarding gate.** Delete the diagnostic-completion gate in `src/app/(app)/layout.tsx`. After this commit, signed-in users landing at `/` see the dashboard regardless of whether they have a `practice_sessions.type='diagnostic'` row. Layout becomes auth-only (and may be deleted entirely if `proxy.ts` already covers the auth check — decision deferred to C1 boundary).

2. **C2 — Relocate `/post-session/[sessionId]`.** The post-session review surface currently lives in `src/app/(diagnostic-flow)/post-session/[sessionId]/` but is **not diagnostic-only** — it serves drill, full_length, simulation, mistakes, and diagnostic. Move it to `src/app/(app)/post-session/[sessionId]/` so it inherits the (now auth-only) `(app)/layout.tsx`. Update the one cross-import in `src/components/post-session/post-session-shell.tsx`.

3. **C3 — Delete the diagnostic-flow route group.** With the gate gone and post-session relocated, the remaining contents of `src/app/(diagnostic-flow)/` are pure-onboarding:
   - `(diagnostic-flow)/diagnostic/page.tsx` — pre-diagnostic explainer
   - `(diagnostic-flow)/diagnostic/run/page.tsx` — diagnostic session server entry
   - `(diagnostic-flow)/diagnostic/run/content.tsx` — diagnostic FocusShell mount
   - `(diagnostic-flow)/layout.tsx` — auth-only gate (becomes orphan once the diagnostic routes are gone)
   Delete all four files. `/diagnostic` and `/diagnostic/run` become 404s.

4. **C4 — Deploy to production.** §6.14.31 gate.

5. **C5 — Functional verification on production.** Confirm: sign-in lands at dashboard; `/diagnostic` and `/diagnostic/run` 404; practice tests (drill, full-length, simulation, mistakes) still work; historical `/post-session/<id>` URLs render at the new path.

6. **C6 — Round close.**

### §0.4 Anti-scope (explicit)

- **NOT** removing the `"diagnostic"` value from the `session_type` Postgres enum. Historical `practice_sessions.type='diagnostic'` rows exist in production (and any future post-session view of them must continue to render). The enum value stays.
- **NOT** removing the diagnostic branches in code that consumes historical data:
  - `src/server/mastery/compute.ts` — diagnostic-source multiplier branch
  - `src/server/items/selection.ts` — `type === "diagnostic"` → `fixed_curve` curve selection
  - `src/server/stats/data.ts` — excludes diagnostic from stats history surface
  - `src/server/review/data.ts` — excludes diagnostic from review surface
  - `src/server/sessions/start.ts` — `diagnosticMix.length` target-question-count branch (becomes dead-via-no-caller after C3, but the dead branch is structurally harmless and removing it is mechanical refactor noise outside this round's leadership-driven scope)
  - `src/components/focus-shell/focus-shell.tsx` — diagnostic-only audio-unlock branch
  - `src/components/post-session/post-session-shell.tsx` — `isDiagnostic` branches for subhead / pacing line / `<OnboardingTargets>` trailing form
  - `src/components/post-session/onboarding-targets.tsx` — the diagnostic-completion goal-capture form
  - `src/workflows/mastery-recompute-steps.ts` — `row.type === 'diagnostic'` source mapping
  - `src/config/diagnostic-mix.ts` + `src/config/difficulty-curves.ts` — diagnostic question selection mix
  - All `*.test.ts` files that reference diagnostic as a fixture
  
  Rationale: every one of these supports rendering or processing **historical** diagnostic sessions. None of them is invoked by code we're deleting except via the action surface (`startSession`) where the diagnostic call site is the one removed file. The dead-branch elimination is a separate code-quality round (`phase5-v1-code-cleanup` already has a plan-doc and is a natural home).

- **NOT** removing the `practice_sessions.diagnostic_overtime_note_shown_at_ms` column. Already documented as "vestigial-and-unread" in the schema; column drops are destructive and need their own round. Bank as a candidate for a future cleanup round.

- **NOT** removing `src/components/post-session/onboarding-targets.tsx` or its server action `saveOnboardingTargets`. The component is rendered only when `sessionType === "diagnostic"` in `<PostSessionShell>` — a code path that becomes unreachable for *new* sessions after C3 but stays reachable for *historical* diagnostic post-session views. Removing it would crash historical post-session pages. Bank as a candidate for the same future cleanup round.

- **NOT** removing `"diagnostic"` from the Zod enum in `src/app/(app)/actions.ts:startSessionInputSchema`. The server action surface no longer has a caller invoking it with `type: "diagnostic"` after C3, but the schema match harms nothing and removing it is a mechanical refactor outside this round's scope.

- **NOT** changing `src/app/login/page.tsx`. `signIn("google", { redirectTo: "/" })` already targets `/`; with the gate removed, `/` is the dashboard. No login-flow code change required.

- **NOT** changing the abandon-sweep cron (`src/app/api/cron/abandon-sweep/route.ts`). It operates on `practice_sessions.ended_at_ms IS NULL` regardless of type; not diagnostic-specific.

- **NOT** touching the Bun runtime / `cacheComponents` defect (`R-cacheComponents-bun-settimeout-incompat`). This round operationally sidesteps the known reproduction surface; the underlying defect is for a separate round. Pin stays in §0.11.

- **NOT** opening sub-rounds for C1-C6 unless an unexpected complication appears at the C1 boundary (e.g., the relocation of `/post-session/[sessionId]` surfaces a routing or auth-gate issue that needs deeper diagnosis).

### §0.5 Empirical audit findings at commit-0

Audit performed at HEAD = `16ae176`. All findings below are read-only inspection results.

#### §0.5.A — Diagnostic-flow file inventory

| File | Lines | Role | Disposition |
|---|---|---|---|
| `src/app/(diagnostic-flow)/layout.tsx` | 43 | Auth-only gate wrapping the diagnostic + post-session routes in this group | **Delete in C3** (orphan after diagnostic routes gone; `(app)` layout already covers post-session after relocation) |
| `src/app/(diagnostic-flow)/diagnostic/page.tsx` | 113 | Pre-diagnostic explainer with "Start Diagnostic" CTA → `/diagnostic/run` | **Delete in C3** (forced-onboarding entry point) |
| `src/app/(diagnostic-flow)/diagnostic/run/page.tsx` | 67 | Server entry that calls `startSession({ userId, type: "diagnostic" })` | **Delete in C3** (only call site for `type: "diagnostic"`) |
| `src/app/(diagnostic-flow)/diagnostic/run/content.tsx` | 71 | Client wrapper mounting `<FocusShell sessionType="diagnostic">`, navigates to `/post-session/<id>` on end | **Delete in C3** |
| `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` | 463 | Post-session review server component — **shared across diagnostic + drill + full_length + simulation + mistakes** | **Relocate in C2** to `src/app/(app)/post-session/[sessionId]/page.tsx` |
| `src/app/(diagnostic-flow)/post-session/[sessionId]/content.tsx` | 35 | Client wrapper consuming `loadSession` promise; imports `SessionInfo` type from sibling page | **Relocate in C2** alongside its sibling page |

**Critical finding:** Item 5 above (`/post-session/[sessionId]/page.tsx`) is **not diagnostic-only** despite being filed under `(diagnostic-flow)`. Its doc comment explicitly states "**Does not redirect non-diagnostic session types** (sub-phase 1 commit 1 lifted that gate)" and its `headingFor()` function in the consumer shell returns `"Drill review"` / `"Practice test review"` / null for non-diagnostic types. A naive `rm -rf src/app/(diagnostic-flow)/` would delete the post-session review surface for every session type. This is the audit's most consequential finding and drives the C2/C3 split.

#### §0.5.B — Dashboard route identification

- **Path:** `/` — server-rendered by `src/app/(app)/page.tsx` (65 lines).
- **Renders:** `<Dashboard dataPromise={loadUserId().then(load)} />` where `load = getDashboardData(userId)`.
- **Auth gates today (in `(app)/layout.tsx`):**
  1. `auth()` returns a session with `user.id`, else `redirect("/login")`.
  2. The user has at least one `practice_sessions` row of `type='diagnostic'` with `ended_at_ms IS NOT NULL` AND `completion_reason != 'abandoned'`, else `redirect("/diagnostic")`.
- **The gate is the forced-onboarding mechanism.** There is no separate "post-onboarding redirect" — the post-login `signIn("google", { redirectTo: "/" })` lands the user at `/`, the (app) layout's gate runs, and if the user has not completed a diagnostic the gate redirects to `/diagnostic`. Remove the gate's second check and the dashboard renders directly.

#### §0.5.C — Post-login redirect mechanism

`src/app/login/page.tsx`:
```ts
async function signInWithGoogle() {
  "use server"
  await signIn("google", { redirectTo: "/" })
}
```

That's the entire post-login redirect. NextAuth's `signIn` writes the session cookie and 302s to `/`. The forced-onboarding routing decision lives entirely in `(app)/layout.tsx`'s `requireDiagnosticGate()` — there is no NextAuth callback, no middleware redirect, no client-side `useEffect` rerouting. Remove the gate's diagnostic check (lines 27-52 of `(app)/layout.tsx`) and the post-login flow lands at `/` as desired.

The `src/proxy.ts` middleware only checks auth (signed-in vs out) and never participates in the onboarding decision. It needs no change.

#### §0.5.D — Shared vs onboarding-specific classification

**Database tables:**

| Table | Status | Notes |
|---|---|---|
| `users` | **KEEP** | Auth + dashboard target fields (`target_score`, `target_date_ms`). |
| `auth_sessions` | **KEEP** | NextAuth session storage. |
| `accounts` | **KEEP** | NextAuth provider linking. |
| `verification_tokens` | **KEEP** | NextAuth. |
| `items` | **KEEP** | Test bank — used by drill, full_length, simulation, mistakes, and (historically) diagnostic. |
| `item_admin_actions` | **KEEP** | Admin review surface. |
| `item_user_reports` | **KEEP** | User-reported issues. |
| `sub_types` | **KEEP** | Taxonomy used by drill / practice tests. |
| `strategies` | **KEEP** | Surfaced by post-session shell for struggled sub-types. |
| `practice_sessions` | **KEEP** | Holds historical diagnostic rows alongside drill / full_length / simulation / mistakes. **The `type='diagnostic'` enum value stays.** |
| `attempts` | **KEEP** | Per-question attempts — every session type writes here. |
| `mastery_state` | **KEEP** | Driven by the mastery-recompute workflow; consumes diagnostic-source attempts. |
| `user_sub_type_belts` | **KEEP** | Drill belt indicator data. |
| `candidate_promotion_log` | **KEEP** | Item-pipeline ops table. |

**Schema columns:** `practice_sessions.diagnostic_overtime_note_shown_at_ms` is already documented as vestigial-and-unread. Not removed in this round (column drop is destructive and orthogonal to leadership's ask). Banked as a future-cleanup candidate.

**Server actions (`src/app/(app)/actions.ts`):**

| Action | Status | Notes |
|---|---|---|
| `signOutAction` | **SHARED** | Used by every signed-in page (including `/diagnostic`'s sign-out button — that import disappears with C3 but the action stays). |
| `startSession` | **SHARED** | Zod schema includes `"diagnostic"`; only the deleted `/diagnostic/run/page.tsx` invokes it with that type. Schema enum stays (defensive; tightening it is mechanical refactor noise outside scope). |
| `submitAttempt` | **SHARED** | Drill / full_length / simulation / mistakes / (historical) diagnostic all call it. |
| `endSession` | **SHARED** | Same as above. |
| `saveOnboardingTargets` | **DIAGNOSTIC-ONLY (kept)** | Used only by `<OnboardingTargets>` which renders only on `sessionType === "diagnostic"` post-session view. Historical diagnostic post-session pages will still render the form. Kept (banked for future cleanup). |
| `updateGoal` | **SHARED** | Dashboard editor — wired to `<GoalEditor>`. |
| `updateTargetDate` | **SHARED** | Dashboard editor. |

**Components:**

| Component | Status | Notes |
|---|---|---|
| `<OnboardingTargets>` (`src/components/post-session/onboarding-targets.tsx`) | **DIAGNOSTIC-ONLY (kept)** | Rendered only by `<PostSessionShell>` when `sessionType === "diagnostic"`. Kept for historical session rendering. |
| `<PostSessionShell>` (`src/components/post-session/post-session-shell.tsx`) | **SHARED** | Has `isDiagnostic` branches for `subhead`, `pacingLine`, `trailingSection` — all kept (rendering historical sessions correctly). Import path of the `SessionInfo`-related types needs updating in C2 when the page moves. |
| `<FocusShell>` (`src/components/focus-shell/focus-shell.tsx`) | **SHARED** | Has a diagnostic-only audio-unlock branch (line 391). Dead-via-no-caller after C3 but harmless; kept. |

**Routes outside `(diagnostic-flow)`:** none are diagnostic-only. The `(app)` group's `/`, `/drill`, `/full-length`, `/lessons`, `/mistakes`, `/review`, `/stats` are all practice-test / dashboard surfaces and survive untouched.

#### §0.5.E — Cron audit

`vercel.json` declares exactly one cron:

```json
{ "path": "/api/cron/abandon-sweep", "schedule": "0 4 * * *" }
```

`src/app/api/cron/abandon-sweep/route.ts` reads `practice_sessions WHERE last_heartbeat_ms < cutoff AND ended_at_ms IS NULL` — not type-filtered. Every session type's abandoned rows are swept by the same job. No diagnostic-specific behavior; survives unchanged.

#### §0.5.F — Test files referencing diagnostic

The grep surfaced ~8 test files using `"diagnostic"` as a fixture (`server/mastery/compute.test.ts`, `server/items/selection.test.ts`, `server/post-session/end-session-tier.test.ts`, `config/diagnostic-mix.test.ts`, etc.). All test the **underlying processing logic** (mastery curves, item selection, post-session aggregation) — none test the deleted routes. They continue to exercise valid code paths (the historical-data processing branches we're keeping) and stay untouched.

### §0.6 Doc-vs-empirical reconciliation

The prior round (`auth-oidc-restore`) forward-pinned this round as `R-diagnostic-onboarding-removal-requested` (§0.11) and referenced it under the provisional name `diagnostic-onboarding-removal`. The user's round-open prompt specifies the round name as `onboarding-flow-removal`. This plan-doc uses `onboarding-flow-removal` per the user's instruction and notes the prior alias for cross-reference.

The prior round also forward-pinned `R-cacheComponents-bun-settimeout-incompat` and explicitly noted that "the successor round will sidestep this defect operationally by removing the affected routes." That note is **accurate** — C3 of this round deletes `/diagnostic/run`, which is where the defect was observed live. But it is also **partial**: the defect is a general interaction between Bun + Next.js 16 `cacheComponents` + Server Actions, not a `/diagnostic/run`-specific bug. After this round, the defect's reproduction surface is gone *until* a similar `cacheComponents`+server-action interaction recurs on another route. The §0.11 pin for this defect stays open.

No other doc-vs-empirical divergences at this commit-0.

### §0.7 Destructive-operation surface

| Step | Op | Destructive? | Gate |
|---|---|---|---|
| C1 | Edit `src/app/(app)/layout.tsx` (remove diagnostic gate block) | local; reversible via `git revert` | none |
| C2 | `git mv` two files into `src/app/(app)/post-session/[sessionId]/` + update one import path in `<PostSessionShell>` | local; reversible | none |
| C3 | `rm` four files under `src/app/(diagnostic-flow)/` + the route-group directory itself | local; reversible via git | none |
| C4 | `vercel --prod` deploy with the C1+C2+C3 changes live | **destructive** — replaces production deployment | **§6.14.31 gate (REQUIRED)** |
| C5 | Functional verification (browser-side) | read-only | none |
| C6 | Round-close commit | local | none |

**One destructive operation** anticipated: the C4 production deploy. **§6.14.31 confirmation gate (REQUIRED).** Before C4:
1. Show the diff vs `16ae176` for every changed file (`git diff 16ae176..HEAD`).
2. Show the deploy command verbatim (`vercel --prod` or the documented equivalent from `docs/plans/deployment-runbook.md`).
3. Wait for explicit "yes go" reply.
4. Execute deploy. Capture the deploy URL + the `dpl_*` ID.
5. Re-fetch a 5-minute window of production logs after deploy; confirm zero 500-error spikes on dashboard load and zero broken redirects from `/`.

No data-side destructive ops in this round (no DB writes, no env mutations, no migrations).

### §0.8 §6.14.31 gate placement summary

- **Gate 1 — C4 (production deploy).** As §0.7.

One gate total. May expand to two if a hotfix sub-round is needed post-deploy (would be authorized at the time, not pre-authorized here).

### §0.9 Pre-flight readiness checklist (run at C1 boundary)

- [x] Working tree clean at C0 (`git status` = "nothing to commit, working tree clean")
- [x] HEAD verified at `16ae176`
- [x] `origin/main...HEAD = 0 1` (one commit ahead — the prior round's claude-log commit unpushed; will be carried along on the next push, no isolation concern)
- [x] Diagnostic-flow file inventory complete (§0.5.A)
- [x] `/post-session/[sessionId]` confirmed shared across session types (§0.5.A)
- [x] Dashboard route + gate location identified (§0.5.B)
- [x] Cron audit complete — no diagnostic-specific scheduled work (§0.5.E)
- [x] Test files referencing diagnostic — all test underlying processing logic, not the deleted routes (§0.5.F)
- [ ] User explicit "open C1" before any code change

### §0.10 Forward-watch (this round, monitor across commits)

- **W-relocation-import-fanout** — Moving `/post-session/[sessionId]/page.tsx` changes its module path. The one in-tree consumer is `src/components/post-session/post-session-shell.tsx` line 25, which imports types from `@/app/(diagnostic-flow)/post-session/[sessionId]/page`. After C2 this becomes `@/app/(app)/post-session/[sessionId]/page`. Watch for additional import sites surfacing after C2 (full-tree grep is part of C2's pre-commit check); the type is `export type { ... }` so TypeScript will flag any miss at build time.

- **W-typed-routes-cache-staleness** — Next.js maintains a typed-routes cache against the route tree. Deleting `/diagnostic` and `/diagnostic/run` while the typed-routes cache still contains them could surface as a transient typecheck failure or a phantom dead-link from another file. Watch for `<Link href="/diagnostic"...>` references at C3 boundary — the grep already showed `(diagnostic-flow)/diagnostic/page.tsx:102` as the only such reference, and that file itself is deleted in C3. After C3, run `bun run typecheck` and confirm clean.

- **W-historical-post-session-render-regression** — Historical diagnostic sessions (rows with `type='diagnostic'` in `practice_sessions`) still render via `/post-session/<id>` after relocation. `<PostSessionShell>` still has `isDiagnostic` branches that render `<OnboardingTargets>` + diagnostic-specific copy. Watch at C5 verification: a historical diagnostic post-session URL should still render without errors. (If we don't have a known historical diagnostic session ID handy, generating one is out-of-scope; production verification covers the dashboard + practice-test paths. The historical render path is logically unchanged by this round's edits.)

- **W-cacheComponents-bun-defect-on-other-routes** — With `/diagnostic/run` gone, the live reproduction surface for `R-cacheComponents-bun-settimeout-incompat` disappears. Watch production logs for the warning `"Next.js cannot guarantee that Cache Components will run as expected..."` on `/drill/<subTypeId>/run`, `/full-length/run`, or any other server-action endpoint. The defect is general; its reproduction is route-incidental.

### §0.11 Forward-pin index (updated at round-close)

Pins **carried forward** from `auth-oidc-restore` §0.11 (unchanged at this round's close):

- **R-purveyor-companion-resources-still-up** — unchanged.
- **R-strategy-linkage-unused** — unchanged.
- **R-local-prod-rejected_by-divergence** — unchanged.
- **R-script-log-verbosity** — unchanged.
- **R-script-no-concurrency** — unchanged.
- **R-300s-request-hang-on-credential-failure** — unchanged status, lower priority now (overshadowed by the cacheComponents+Bun severity downgrade below; both pins point at the same underlying Bun runtime story).
- **R-probe-removal-pending** — unchanged (OIDC probe code in `src/db/index.ts` still present; scheduled for removal in a follow-up round, now that the empirical-validation gap has closed — see "Pins retired" below).
- **R-poll-loop-50ms-minimum-overhead** — unchanged.

Pins **carried forward** from this round's commit-0:

- **R-vestigial-diagnostic-overtime-column** — unchanged. `practice_sessions.diagnostic_overtime_note_shown_at_ms` is a NULLable bigint column that no code writes or reads. Documented as "vestigial-and-unread" in the schema comments. Banked for a future column-cleanup round (column drops are destructive and need their own §6.14.31 gate). Low priority.
- **R-onboarding-targets-form-on-historical-views** — unchanged. `<OnboardingTargets>` renders on any `sessionType === "diagnostic"` post-session view, including historical ones. Bank for the same future cleanup round that retires the diagnostic-flow's dead branches.
- **R-startSession-zod-still-accepts-diagnostic** — unchanged. `src/app/(app)/actions.ts:startSessionInputSchema` still includes `"diagnostic"` in its `z.enum([...])`. After C3 there is no caller invoking the action with that type. Bank for future cleanup.

Pin **severity-updated** at this round's close:

- **R-cacheComponents-bun-settimeout-incompat** — **status changes from "blocking" to "degraded UX, survivable."** Underlying bug remains: the Bun-runtime / `cacheComponents` / Server-Action interaction reproduces on `/full-length/run` submits AND was observed on `/full-length/configure` page-load RSC streaming during Leo's C5 verification (so the round-open hypothesis "reproduction surface disappears with `/diagnostic/run`" was wrong — the bug is **route-incidental, not route-specific**). The user-stranding behavior is, however, resolved by C5.5's `submit_failed` reducer action (commit `9ece713`): when a server-action invocation fails on the client, the shell now clears `submitPending` and the user can retry. Empirically validated end-to-end by Leo (see §6.8). Next round (`cacheComponents-investigation`) attacks the underlying interaction, with a likely intervention being the Bun → Node.js runtime swap.

Pins **retired** at this round's commit-0 (recorded at open, unchanged at close):

- ~~**R-diagnostic-onboarding-removal-requested**~~ — **REMOVED**. Realized-by-execution: this round is the realization. Pin retired at the C0 landing; leadership ask transitioned from "banked future work" to "active in-progress round" and is now "shipped."

Pins **retired** at this round's close:

- ~~**R-oidc-fix-empirical-validation-gap**~~ — **REMOVED (validated)**. The 24-48h monitoring window is dispositive after this round's C5.6 5-minute baseline: 4 `hasContextToken=false` snapshots fired, the poll loop engaged (commit `820fad7`), and all 14 requests returned 200. This is the first organic evidence in production traffic that (a) the cold-start race against the OIDC source IS reproducible under normal load and (b) the C4-W poll-before-`getAuthToken` fix handles it correctly. No special bake required; the fix has now been observed in action.

Pins **newly opened** at this round's close:

- **R-stale-comments-after-route-removal** — Three documentary comments in the live tree reference the deleted `/diagnostic` route or the now-deleted source files: `src/server/dashboard/pace.ts:26` (already repointed during C2), `src/server/review/data.ts:3` ("its surface lives in /diagnostic"), and `src/components/focus-shell/focus-shell.tsx:175,:179,:200` (the three-layer audio-unlock-defense block, whose Layer 1 prose specifically motivates the mount-effect via `/diagnostic`'s SPA `<Link>` entry path). All compile-clean; the failures are purely documentary. Cosmetic. Bank for a future code-cleanup round (or fold into the same round that drops the schema's vestigial diagnostic column).

- **R-phantom-vercel-deployment** — During C5.6's `vercel ls` snapshot, an adjacent deployment `https://18seconds-7z66w5vyl-ryo-iwatas-projects.vercel.app` appeared with age 5m, attributed to `leonardiwata-2680`, status Ready/Production — 1 minute "before" my C5.6 deployment `q6kk6g5ua`. I did not create it. Plausible explanations: (a) a previous failed `vercel --prod` attempt by Leo that completed Ready out-of-band, (b) Vercel CLI's two-phase upload-then-promote producing two records, (c) an automated job. It's **inert** (alias resolves to the C5.6 deployment, not this one). Low priority. Worth a 30-second `vercel inspect 18seconds-7z66w5vyl-ryo-iwatas-projects.vercel.app` by Leo at his convenience to identify origin.

### §0.12 Sub-round triggers (pre-authorized)

- **`post-session-relocation-blockage-sub-round`** — fires if C2's `git mv` surfaces a Next.js routing or auth-gate issue that prevents `/post-session/<id>` from resolving under `(app)`. Scope: diagnose the blockage, choose between (a) keep post-session under its own route group, (b) move to top-level outside any group, (c) refactor `(app)/layout.tsx` to accommodate. Out-of-scope: any change to `<PostSessionShell>`'s data contract.

- **`hotfix-deploy-sub-round`** — fires if C5 verification surfaces a production-affecting bug introduced by the C1-C3 changes. Scope: identify the bug, write the minimal fix, deploy under a second §6.14.31 gate. Out-of-scope: scope creep.

---

## §1 Commit Ledger

| Step | Type | Status | Hash | Detail |
|---|---|---|---|---|
| **C0** | git commit | **completed** | `ecf03bb` | Plan-doc open + commit-0 audit |
| **C1** | code edit | **completed** | `c65a8d2` | Removed diagnostic-completion gate from `src/app/(app)/layout.tsx` (15 ins / 42 del) |
| **C2** | code edit | **completed** | `682a752` | Relocated `/post-session/[sessionId]` from `(diagnostic-flow)/` to `(app)/`; updated 9 import sites + 1 comment (audit said 1; redirector audit-miscount banked as §3.10) |
| **C3** | code edit | **completed** | `f0a97e4` | Deleted `src/app/(diagnostic-flow)/` (4 files, 290 deletions). `/diagnostic` and `/diagnostic/run` now 404. |
| **C4** | deploy (gate 1) | **completed** | n/a | `vercel --prod` deployed C1+C2+C3 as `dpl_5jnhDDraqEqNov5AUuHVDk9YwbSk` at `2026-05-12T11:11:46-05:00`. Build duration ~3m. Cache restored from prior deployment. |
| **C5** | functional verify | **completed (with findings)** | n/a | Core acceptance checks PASSED: sign-in → dashboard, `/diagnostic` 404, `/diagnostic/run` 404 (screenshot evidence), `/full-length/configure` + `/full-length/run` load. **Surfaced two bugs:** (i) transient RSC streaming failure on `/full-length/configure` (one occurrence, recovered on reload — pre-existing cacheComponents+Bun manifestation, not C1-C3-introduced), (ii) silent `submitPending` strand on `/full-length/run` after a few questions — pre-existing in `focus-shell.tsx`, never previously surfaced because it requires sustained submit volume to hit the failure race. |
| **C5.5** | code edit (UNPLANNED, user-authorized) | **completed** | `9ece713` | `submit_failed` reducer action in `src/components/focus-shell/shell-reducer.ts` + 3 dispatch sites in `src/components/focus-shell/focus-shell.tsx` + 8 unit tests in `src/components/focus-shell/shell-reducer.test.ts`. Clears `submitPending` on server-action failure; preserves `questionStartedAtMs` (retry latency anchored to original paint) and `selectedOptionId` (user's choice persists). Retroactively framed as a mid-round defensive-fix sub-round. |
| **C5.6** | deploy (gate 2) | **completed** | n/a | `vercel --prod` deployed C5.5 as `dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6` at `2026-05-12T11:48:44-05:00`. Build duration ~2m21s. Build cache restored from `dpl_5jnhDDraqEqNov5AUuHVDk9YwbSk`. Bundle 26.9KB (3-file diff). |
| **C5.7** | empirical validation | **completed** | n/a | Leo manually exercised the fix path on production: ran a full 50-question practice test end-to-end. Multiple `submitPending` hangs occurred (the underlying `cacheComponents`+Bun bug is unaddressed); recovery engaged on each (button re-enabled, click handler accepted retry); session reached the post-session review screen. Strongest possible empirical evidence: defensive fix engaged repeatedly in real conditions and produced the intended outcome. |
| **C6** | git commit | **this commit** | (round-close) | Populate §6, mark all prior steps complete, update §0.11 forward-pin index, push origin/main. |

---

## §3 Candidate patterns

**Carryover from prior rounds** (preserved per closed-plan-immutable):

- §3.1 through §3.7 — see `auth-oidc-restore.md` §3 and `prod-runtime-credentials-audit.md` §3 for definitions. All carry forward unchanged.

**Recurrences this round** (incremented counts; canonical definitions in prior plan-docs):

- §3.8 — audit-named consumer-reference counts unreliable; always re-grep at commit boundary. **Now 1/5** (incremented this round at C2; details in §6.9).
- §3.9 — stale `.next/dev/types/validator.ts` breaks `tsgo --noEmit` after Next.js route moves. **Now 2/5** (incremented this round at C2 and C3; details in §6.9).

**NEW from this round** (canonical definitions; recurrence counts in §6.9):

- **§3.10 — User-direct executor prompts during an in-progress round can override the redirector-planned next step.** Treatment: attribute commit-shape deviations to user authorization, NOT to executor deviation. Surfaced this round via C5.5 (Leo's "Fix this issue" prompt during C5 verification inserted an unplanned defensive-fix sub-round between the planned C5 and C6). **Count: 1/5.**

- **§3.11 — Defensive recovery shipped without a root-cause fix transforms a critical bug into a survivable inconvenience.** Distinguished from the banned "silently swallow errors with a fallback" anti-pattern by three properties: (a) the recovery surfaces to the user via a retry-able UI; (b) the original error still logs; (c) the underlying fix is still owed and tracked as a pin. Surfaced this round via C5.5's `submit_failed` reducer action (commit `9ece713`), which makes the `cacheComponents`+Bun server-action-flake survivable while the underlying interaction remains open as `R-cacheComponents-bun-settimeout-incompat`. **Count: 1/5.**

---

## §6 ROUND-CLOSE STATUS

### §6.1 Outcome

All scoped goals (§0.3 C1-C6) achieved. UX flow change shipped: forced diagnostic onboarding is gone; sign-in lands at dashboard; `/diagnostic` and `/diagnostic/run` return 404. Practice tests remain available as opt-in. Historical post-session URLs render at the new `(app)/post-session/[sessionId]/` path.

**Bonus:** an unplanned defensive fix (C5.5) shipped during the same round, validated end-to-end on production traffic (C5.7). The fix is independent of the round's UX-flow goal but came directly out of C5 verification surfacing the `submitPending` strand, which is itself a manifestation of the (unresolved) `cacheComponents`+Bun interaction the round had operationally hoped to sidestep by deleting `/diagnostic/run`.

### §6.2 Commit ledger (actuals)

| Step | Hash | Detail |
|---|---|---|
| C0 | `ecf03bb` | Plan-doc open + commit-0 audit |
| C1 | `c65a8d2` | Removed diagnostic-completion gate from `(app)/layout.tsx` |
| C2 | `682a752` | Relocated `/post-session/[sessionId]` from `(diagnostic-flow)/` to `(app)/`; 9 import sites updated (audit said 1 — see §3.10) |
| C3 | `f0a97e4` | Deleted `src/app/(diagnostic-flow)/` (4 files, 290 deletions) |
| C4 | deploy `dpl_5jnhDDraqEqNov5AUuHVDk9YwbSk` | `vercel --prod` at `2026-05-12T11:11:46-05:00` (~3m build, alias on `18seconds.vercel.app`) |
| C5 | verification | Core checks PASSED; surfaced (i) transient RSC streaming failure on `/full-length/configure` and (ii) `submitPending` strand on `/full-length/run` after a few questions |
| C5.5 (UNPLANNED, user-authorized) | `9ece713` | `submit_failed` reducer action + 3 dispatch sites in `focus-shell.tsx` + 8 unit tests in `shell-reducer.test.ts` |
| C5.6 | deploy `dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6` | `vercel --prod` at `2026-05-12T11:48:44-05:00` (~2m21s build, cache restored from C4) |
| C5.7 | empirical validation | Leo completed a full 50-question practice test on production. Multiple hangs occurred; recovery engaged on each; session reached review screen. |
| C6 | (this commit) | Round close |

Round-open hash: `16ae176`. Round-close hash: this commit.

### §6.3 §6.14.31 gates fired

**2 gates** — both for production deploys:

1. **C4** — `dpl_5jnhDDraqEqNov5AUuHVDk9YwbSk` (C1+C2+C3 to prod).
2. **C5.6** — `dpl_2oT9L3jixcX7ni5tQE4ac25kFpA6` (C5.5 defensive fix to prod).

Both gates: pre-deploy timestamp captured, deploy run, post-deploy timestamp captured, 30s settle, 5m log baseline pulled and reported. Both deploys: zero 5xx, zero new error patterns, expected pre-existing patterns only (Cache Components build-time warning at C5.6; OIDC source-snapshot mixed token state at C5.6 — see §6.10 finding 3).

### §6.4 Sub-rounds fired

**1 sub-round** — `C5.5` (the `submit_failed` defensive fix), retroactively framed as a user-authorized mid-round defensive-fix sub-round. Pre-authorized at C0 only as the generic `hotfix-deploy-sub-round` placeholder (§0.12); the concrete scope (`submitPending` recovery) was authorized by Leo directly during C5 verification when the bug surfaced. Standard `hotfix-deploy-sub-round` scope guardrails applied: identify bug, minimal fix, deploy under a second §6.14.31 gate, no scope creep.

### §6.5 Cost ledger

- **2 deploys** — C4 + C5.6. Each `vercel --prod` execution at this project's build scale costs ~$0.01 (build minutes + bandwidth on the small upload). **Total: ~$0.02.**
- **No DB ops**, no third-party API calls in this round.
- **No off-Vercel resources** consumed.

### §6.6 §6.14.43 sub-type 6 count update

- **Entering this round:** 4/5
- **Deviations during this round (executor-attributable):** 0. C5.5 was user-authorized; the audit-miscount at C2 was redirector-attributable, not executor; the C2/C3 stale-validator footgun was harness-attributable (Next.js generated artifact, not a process step).
- **Exiting this round:** **4/5** (no change).

### §6.7 Wall-clock

Round opened in this session at the `ecf03bb` commit; closed at this commit. Approximate wall-clock from C0 to C6 ≈ **~2.5 hours of session time**, with most of the elapsed time in: build durations for the two prod deploys (~5 min combined), Leo's C5 manual verification of the dashboard / diagnostic 404 / practice-test load, the C5 → C5.5 diagnostic work (logs analysis + code reading + patch + tests), and Leo's C5.7 full-test run.

### §6.8 Empirical validation summary

- **Sign-in lands at dashboard:** PASS (Leo confirmed manually after C4 deploy).
- **`/diagnostic` returns 404:** PASS (10× confirmed in C4-window logs; route-resolver hit on the new build).
- **`/diagnostic/run` returns 404:** PASS (screenshot evidence from Leo + 10× confirmed in C4-window logs).
- **Practice test loads:** PASS (`/full-length/configure` + `/full-length/run` both 200, `getNextFixedCurve: served` server-pino lines emit as expected).
- **Practice test submits — pre-fix:** intermittent hangs (cacheComponents+Bun bug surfaces after a few questions; user stranded with `submitPending=true`). All 5 of Leo's POSTs in the C5 session returned 200 server-side with `submitAttempt: attempt inserted` confirmations — the failure is purely client-side, hence invisible in Vercel logs (pino → `console.log` in browser).
- **Practice test submits — post-C5.6:** intermittent hangs **persist** (root cause unaddressed) BUT recovery engages every time. Button re-enables, click handler accepts retry, retry succeeds (or hangs and recovers again). Leo's C5.7 full-test session: multiple hangs, every one recovered, session **reached the post-session review screen**.
- **Practice test `endSession`:** PASS at C5.7 (took a bit, but completed; same `endSession` server action, same revalidatePath flow — no regression from C5.5).
- **Retroactive validation of OIDC C4-W fix (commit `820fad7`, from the prior round):** the C5.6 5m baseline showed **4 `hasContextToken=false`** OIDC source snapshots fired in normal traffic, the poll loop engaged correctly, and **all 14 in-window requests returned 200**. First organic evidence in production that the cold-start race occurs in real traffic AND that the fix handles it. Closes `R-oidc-fix-empirical-validation-gap` (see §0.11 retirements).

### §6.9 Candidate patterns surfaced

- **§3.8** (banked from earlier rounds; recurrence this round): audit-named consumer-reference counts are unreliable; always re-grep at commit boundary. **Count: 1/5.** Triggered at C2 when the C0 audit named 1 consumer site for the `(diagnostic-flow)/post-session/[sessionId]/page` import path but the actual repo had 9 (8 type-import sites plus 1 documentary comment). C2 caught this with a pre-commit `grep` and updated all 9; had the executor trusted the audit count, 5 downstream files would have continued referencing a deleted module after commit.

- **§3.9** (banked from earlier round): stale `.next/dev/types/validator.ts` breaks `tsgo --noEmit` after Next.js route moves; clear before quality gates. **Count: 2/5** (incremented from 1/5 — recurred at C3). At C2 the stale validator referenced the old `(diagnostic-flow)/post-session/[sessionId]/page.js` and tripped the pre-commit typecheck hook; at C3 the same artifact recurred against the deleted `/diagnostic` and `/diagnostic/run` routes. In both cases, `rm .next/dev/types/validator.ts` restored a clean typecheck. The artifact is gitignored and regenerates on next `next dev` run — the failure mode is purely on cold-pre-commit hooks. Worth folding into a lefthook pre-commit step that proactively clears `.next/dev/types/` whenever staged paths touch `src/app/**`.

- **§3.10** (NEW this round, 1/5): user-direct executor prompts during an in-progress round can override the redirector-planned next step. C5.5 was scoped on the fly by Leo when he saw a screenshot of a stuck Submit button and wrote "Fix this issue. Make no assumptions and test everything." The redirector's plan called for `C5 → C6 round close`; the executor instead got `C5 → C5.5 unplanned fix → C5.6 unplanned deploy → C5.7 unplanned validation → C6`. Deviation-tracking treatment: attribute commit shape to user authorization, NOT to executor deviation. Pattern is worth naming so future rounds expect to absorb 1-2 user-injected mid-round commits without confusion about §6.14.43 attribution.

- **§3.11** (NEW this round, 1/5): defensive recovery shipped without a root-cause fix renders a critical bug merely annoying. The `submit_failed` fix is the case study: it does not fix the underlying `cacheComponents`+Bun server-action-flake; it only ensures the user can retry rather than reload-with-progress-loss. The transformation is from "session-destroying" to "minor inconvenience that resolves itself within a click." This is often the correct first-strike when the root-cause investigation will take a separate round. Worth naming so it doesn't get confused with the (banned) anti-pattern of "silently swallowing errors with a fallback" — the key distinguisher is **the recovery surfaces to the user via the retry-able UI, the original error still logs, and the underlying fix is still owed**.

### §6.10 CRITICAL FINDINGS

1. **`cacheComponents`+Bun bug is route-incidental, not `/diagnostic`-specific.** The round-open §0.4 anti-scope explicitly noted that this round "operationally sidesteps the known reproduction surface" by deleting `/diagnostic/run`. **That hypothesis was wrong.** During C5 verification on the new deployment (with `/diagnostic` already 404), the same defect reproduced (a) on `/full-length/run` submit (stuck `submitPending`) and (b) transiently on `/full-length/configure` page-load RSC streaming (raw RSC payload rendered as text instead of hydrated UI). The reproduction surface is **any Bun-runtime / `cacheComponents` / Server-Action interaction**, not the specific route. Underlying root cause remains unaddressed; the next round (`cacheComponents-investigation`) attacks the underlying interaction, with a likely intervention being a Bun → Node.js runtime swap.

2. **`submitPending` defensive fix (commit `9ece713`) empirically validated.** During Leo's C5.7 full 50-question practice test on production, multiple hangs occurred; the C5.5 `submit_failed` recovery engaged on each; session reached the post-session review screen. This is the strongest available empirical evidence: the fix transforms the bug from "user stranded mid-session with a disabled button and only a session-destroying reload as recovery" to "user clicks again, success" — survivable. The fix is independent of the underlying cause and continues to be load-bearing until the cause is addressed.

3. **OIDC C4-W fix (commit `820fad7` from `auth-oidc-restore`) empirically validated by retroactive observation in this round's C5.6 5-minute log baseline.** 4 `hasContextToken=false` snapshots fired in 5 minutes of normal traffic — meaning the cold-start race against the OIDC source IS reproducible in real production load — and the poll loop engaged correctly, allowing all 14 in-window requests to return 200 with no user-visible impact. Closes `R-oidc-fix-empirical-validation-gap` from the prior round's pin list. This was a no-additional-work validation: the C5.6 baseline pull happened to land in a window where the cold-start race occurred organically.

### §6.11 Forward-pin index updates (recap of §0.11 changes)

See §0.11 for the full updated index. Summary of deltas this round:

- **Removed (validated/realized):** `R-oidc-fix-empirical-validation-gap` (closed by §6.10 finding 3); `R-diagnostic-onboarding-removal-requested` (already removed at C0 — round IS the realization).
- **Severity-downgraded:** `R-cacheComponents-bun-settimeout-incompat` from "blocking" to "degraded UX, survivable" (per §6.10 findings 1 + 2).
- **Newly opened:** `R-stale-comments-after-route-removal` (cosmetic; 3 doc-comment sites), `R-phantom-vercel-deployment` (inert phantom `7z66w5vyl` adjacent to C5.6 deploy; low priority).
- **Carried forward unchanged:** every other pin (R-purveyor-companion-resources-still-up, R-strategy-linkage-unused, R-local-prod-rejected_by-divergence, R-script-log-verbosity, R-script-no-concurrency, R-300s-request-hang-on-credential-failure, R-probe-removal-pending, R-poll-loop-50ms-minimum-overhead, R-vestigial-diagnostic-overtime-column, R-onboarding-targets-form-on-historical-views, R-startSession-zod-still-accepts-diagnostic).

### §6.12 Successor round trigger

**`cacheComponents-investigation`** — opens at the user's discretion to attack the underlying Bun-runtime / `cacheComponents` / Server-Action interaction (per §6.10 finding 1). Pre-authorized intervention space: Bun → Node.js runtime swap; experimentation on a preview deployment first to isolate which of `cacheComponents`, the Bun runtime, or Server Actions' RSC payload encoding is the load-bearing factor. Out-of-scope for that round: any UX-flow change; any other dead-code cleanup banked here.

Secondary candidate: **`diagnostic-dead-code-cleanup`** — drops the schema's vestigial `diagnostic_overtime_note_shown_at_ms` column, removes `<OnboardingTargets>` + `saveOnboardingTargets`, tightens the `startSession` Zod enum, retires the diagnostic branches in mastery/selection/post-session-shell, and updates the three stale documentary comments (`R-stale-comments-after-route-removal`). Lower priority; not blocking.

---
