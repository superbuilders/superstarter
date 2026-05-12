# Onboarding Flow Removal — Plan-Doc

Round: Onboarding Flow Removal.
Round-open hash: `16ae176` (HEAD at C0 audit; verified clean working tree; `git rev-list --left-right --count origin/main...HEAD = 0 1` — `16ae176` is the prior round's session-log commit, locally committed but unpushed).
Round-close hash: TBD.
**Round status: OPEN (commit-0 audit).**

> **Round-shape decision.** Audit-first. C0 (this commit) documents what we propose to do without doing any of it. A user-reviewed plan is the precondition for any code change. C1 onward executes the removal commit-by-commit with §6.14.31 gates wrapping every production deploy.

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

Pins carried forward from `auth-oidc-restore` §0.11 (unchanged at this round's commit-0):

- **R-purveyor-companion-resources-still-up** — unchanged.
- **R-strategy-linkage-unused** — unchanged.
- **R-local-prod-rejected_by-divergence** — unchanged.
- **R-script-log-verbosity** — unchanged.
- **R-script-no-concurrency** — unchanged.
- **R-300s-request-hang-on-credential-failure** — unchanged.
- **R-oidc-fix-empirical-validation-gap** — unchanged (the 24-48h monitoring window remains in progress).
- **R-probe-removal-pending** — unchanged (oidc probe code in `src/db/index.ts` still present; scheduled for removal in a follow-up round after the monitoring window).
- **R-poll-loop-50ms-minimum-overhead** — unchanged.
- **R-cacheComponents-bun-settimeout-incompat** — **carried forward**. This round operationally sidesteps the known reproduction route (`/diagnostic/run`) but does not address the underlying defect. The defect remains active on every Bun-runtime / `cacheComponents` / Server-Action surface. Update at this round's close: if any new occurrence is observed on a non-diagnostic route during C5 verification, log it inline in §6.

Pins **retired** at this round's commit-0:

- ~~**R-diagnostic-onboarding-removal-requested**~~ — **REMOVED**. Realized-by-execution: this round is the realization. The pin retires the moment C0 lands; the leadership ask transitions from "banked future work" to "active in-progress round."

New pins opened at this round's commit-0:

- **R-vestigial-diagnostic-overtime-column** — `practice_sessions.diagnostic_overtime_note_shown_at_ms` is a NULLable bigint column that no code writes or reads. Documented as "vestigial-and-unread" in the schema comments. Banked for a future column-cleanup round (column drops are destructive and need their own §6.14.31 gate). Low priority.

- **R-onboarding-targets-form-on-historical-views** — `<OnboardingTargets>` renders on any `sessionType === "diagnostic"` post-session view, including historical ones. A user viewing their long-ago-completed diagnostic post-session would still see (and could re-submit through) the goal-capture form. Harmless (the action writes to the same `users.target_score` / `users.target_date_ms` columns that `<GoalEditor>` and `<TargetDateEditor>` on the dashboard write), but visually it implies "set your goal" on a page that is no longer a goal-setting surface. Bank for the same future cleanup round that retires the diagnostic-flow's dead branches.

- **R-startSession-zod-still-accepts-diagnostic** — `src/app/(app)/actions.ts:startSessionInputSchema` still includes `"diagnostic"` in its `z.enum([...])`. After C3 there is no caller invoking the action with that type, so the enum entry is effectively dead. Bank for future cleanup; tightening the enum is mechanical, but removing it now would block any latent test or admin tool from creating a diagnostic session (and we may yet discover such a caller).

### §0.12 Sub-round triggers (pre-authorized)

- **`post-session-relocation-blockage-sub-round`** — fires if C2's `git mv` surfaces a Next.js routing or auth-gate issue that prevents `/post-session/<id>` from resolving under `(app)`. Scope: diagnose the blockage, choose between (a) keep post-session under its own route group, (b) move to top-level outside any group, (c) refactor `(app)/layout.tsx` to accommodate. Out-of-scope: any change to `<PostSessionShell>`'s data contract.

- **`hotfix-deploy-sub-round`** — fires if C5 verification surfaces a production-affecting bug introduced by the C1-C3 changes. Scope: identify the bug, write the minimal fix, deploy under a second §6.14.31 gate. Out-of-scope: scope creep.

---

## §1 Commit Ledger

| Step | Type | Status | Hash | Detail |
|---|---|---|---|---|
| **C0** | git commit | **pending (this commit)** | TBD | Plan-doc open + commit-0 audit |
| **C1** | code edit | pending | TBD | Remove diagnostic-completion gate from `src/app/(app)/layout.tsx` |
| **C2** | code edit | pending | TBD | Relocate `/post-session/[sessionId]` from `(diagnostic-flow)/` to `(app)/`, update `<PostSessionShell>` import path |
| **C3** | code edit | pending | TBD | Delete `src/app/(diagnostic-flow)/` (4 files + the group dir) |
| **C4** | deploy (gate 1) | pending | n/a | `vercel --prod` — production deploy gated by §6.14.31 |
| **C5** | functional verify | pending | n/a | Sign-in lands at dashboard; `/diagnostic` 404s; practice tests work; historical post-session URLs render at the new path |
| **C6** | git commit | pending | TBD | Round close — populate §6 |

---

## §3 Candidate patterns

**Carryover from prior rounds** (preserved per closed-plan-immutable):

- §3.1 through §3.7 — see `auth-oidc-restore.md` §3 and `prod-runtime-credentials-audit.md` §3 for definitions. All carry forward unchanged.

**NEW from this round:** none yet at C0. Round-close commit will populate any patterns surfaced during C1-C5 execution.

---

## §6 ROUND-CLOSE STATUS

**Populated at C6.** Skeleton structure mirrors `auth-oidc-restore.md` §6:

- §6.1 Outcome
- §6.2 Commit ledger (actuals)
- §6.3 §6.14.31 gates fired
- §6.4 Sub-rounds
- §6.5 Cost ledger
- §6.6 §6.14.43 sub-type 6 count update (entering: 4/5, target exit: 4/5)
- §6.7 Wall-clock
- §6.8 Empirical validation summary (sign-in → dashboard; /diagnostic 404; practice tests intact)
- §6.9 Candidate patterns surfaced
- §6.10 Critical findings (if any)
- §6.11 Forward-pin index updates (recap of §0.11 changes)
- §6.12 Successor round trigger (if any)

The skeleton is intentionally empty at C0; values populate as the round executes.

---
