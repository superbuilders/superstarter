# Plan — Phase 3, sub-phase 3: standard drill mode + logout button

> **Status: shipped 2026-05-04.** The four-commit sequence below landed on `main` cleanly:
>
>   - Commit 1 — `969705e` — `docs(phase3): add drill-mode sub-phase 3 plan; revise feature-roadmap priorities`
>   - Commit 2 — `b5510af` — `feat(drill-mode): empty-bank pane on configure page` (the audit findings folded into this commit's preamble per the plan's `if-clean-fold-in` path)
>   - Commit 3 — `20948de` — `feat(auth): sign-out button on Mastery Map header`
>   - Commit 4 — *this commit* — `docs: close phase3-drill-mode plan; SPEC §9.2 / §10.2 / §6.14 updates; plan corrections folded in`
>
> **Phase 3 user-facing surface is now complete end-to-end.** Sub-phase 1 + 2 + 3 ship the user happy path: sign-in → diagnostic → onboarding capture → Mastery Map (including post-diagnostic empty-state pane) → drill (including empty-bank pane) → completion → Mastery Map. Sign-out works. Sub-phase 4 (heartbeat client + cron-runner wiring) is the remaining mini-round; it doesn't change the user-facing surface, only tightens the resume window.
>
> This plan was the canonical reference for sub-phase 3 of Phase 3. The diagnostic flow (sub-phase 1) and Mastery Map (sub-phase 2) were treated as stable dependencies; their commits were not touched here. The audit-and-polish framing surfaced two SPEC-grounded plan corrections (§9.2 fallback contract: requested-not-served tier; recency soft-not-hard); both folded into commit 4's SPEC updates.

The Mastery Map's primary CTA already pushes to `/drill/[subTypeId]`, so the destination exists and is reachable. Like sub-phase 2, this is **not a greenfield round** — the drill scaffolding shipped in commit `d722017` ("feat(app): Mastery Map + standard drill flow"), pre-sub-phase-1. The audit-and-polish framing carries forward.

## 1. Why this sub-phase, why now

Three forcing functions, in order of weight:

1. **Phase 3's user-facing happy path is one sub-phase from complete.** Sub-phase 1 made the diagnostic land cleanly; sub-phase 2 made the Mastery Map render correctly through the post-diagnostic race window. The Mastery Map's CTA pushes users into the drill flow. If the drill mode has drift from sub-phase 1's framing reversal, every user hits it on their second-ever session.

2. **Drift from the focus-shell post-overhaul-fixes round is plausible.** That round (commits `a84d39d`, `2b3709d`, `25ec46f`, `e6c762e`, etc.) altered the focus-shell's session-timer-bar coloring, triage-prompt-stickiness fix, audio model, and several pace-keying details. The drill mode mounts the same `<FocusShell>` as the diagnostic, but with `sessionDurationMs > 0` (vs. diagnostic's `null`). Several focus-shell features are gated specifically on `sessionDurationMs !== null` (the auto-end effect, the `isLastQuestion` derivation, the `behindPace` derivation, the chronometer/sessionBarNode wrap — see SPEC §6.14.1). Drill mode is the surface that exercises all of those gated branches end-to-end. If anything broke under the post-overhaul changes, this round catches it.

3. **The logout button is missing.** A real user who finishes their diagnostic, lands on the Mastery Map, and wants to sign out has no way to do so without manually clearing cookies. Small fix; folded into this round so the round closes Phase 3's user-facing surface completely.

This sub-phase, like sub-phase 2, is small relative to sub-phase 1. The audit is the load-bearing piece. If the audit is clean, the round may be as small as two commits (logout button + doc close-out).

**Sub-phase 4 (heartbeats + cron-runner wiring) follows.** It is a mini-round: the cron route already exists (sub-phase 1's commit 5 documented this); what's missing is the `<Heartbeat>` client component, the `/api/sessions/[sessionId]/heartbeat` route handler, and the `vercel.json` schedule entry. None of those affect sub-phase 3's drill flow at the user-facing surface — heartbeats tighten the resume window, but drill resume isn't yet a feature.

## 2. Existing scaffolding audit

### What's in `main` today

- **`src/app/(app)/drill/[subTypeId]/page.tsx`** — drill configure page. Renders the sub-type's display name, a 5/10/20 length picker (default 10), a "Start drill" button. Form action `GET`s to `/drill/[subTypeId]/run?length=N`. **No timer-mode selector** (only `standard` is wired in Phase 3 per PRD §4.4; `speed_ramp` and `brutal` are Phase 5). **No NarrowingRamp** (PRD §5.3; Phase 5).
- **`src/app/(app)/drill/[subTypeId]/run/page.tsx`** — server component. Validates `subTypeId` + `length` searchParam, calls `startSession({ userId, type: "drill", subTypeId, timerMode: "standard", drillLength })`, drills the resulting promise to `<DrillRunContent>`. Auth-gated by `(app)/layout.tsx` (the diagnostic-completed gate).
- **`src/app/(app)/drill/[subTypeId]/run/content.tsx`** — `"use client"`. Mounts `<FocusShell>` with `sessionType="drill"`, `sessionDurationMs = drillLength × 18_000`, `paceTrackVisible: true`, `perQuestionTargetMs: 18_000`, `targetQuestionCount: drillLength`. `onEndSession` calls `endSession(sessionId)` then `router.push("/")` — drills do NOT detour through `/post-session/[sessionId]` per the polish-round design (drill post-session UI is Phase 5).
- **`src/server/items/selection.ts`** — `selectionStrategyForSession("drill", _)` returns `"uniform_band"`. The adaptive strategy is `ErrAdaptiveDeferred` ("adaptive strategy deferred to phase 5"). Drills run on `getNextUniformBand`, which picks a constant band derived from the user's `mastery_state.current_state` for the sub-type per SPEC §9.1 and walks no further within the session.
- **`src/server/sessions/start.ts`** — `startSession` materializes `recency_excluded_item_ids` for drills the same way it does for diagnostics, against a 7-day window of attempts on the same sub-type for the same user. Already verified clean by sub-phase 1's commit 1.
- **No logout button anywhere.** The `(app)/layout.tsx` and the Mastery Map shell both render the diagnostic-gate-passing header without any sign-out affordance.

### What works — verified by audit

The drill data path from configure → run → completion → Mastery Map is intact in principle. `startSession` returns a server-rendered first item; `<FocusShell>` drives `submitAttempt` for each of `drillLength` items; the last submit returns `nextItem === undefined` and the shell calls `endSession` and `router.push("/")`. The Mastery Map re-renders with updated `mastery_state` from the workflow trigger (which fires from `endSession`). **§5.2 smoke from sub-phase 1 already verified this trigger→upsert chain.**

### What's likely broken or worth verifying — for this round

Five items the audit needs to confirm or refute:

1. **Drill flow renders correctly under post-overhaul focus-shell state.** §3 below specifies the verification.
2. **Adaptive vs. uniform_band — PRD/SPEC vs. code drift.** §4 below.
3. **Recency-excluded set materialization for drills.** §5 below.
4. **Empty-bank handling.** Some sub-types currently have 0 live items (e.g., the `verbal.synonyms` bank is awaiting stage-2 explanation generation per the testbank workstream). If a user clicks "Start drill: Synonyms," what happens? §6 below.
5. **Logout button.** §7 below.

## 3. Drill flow under post-overhaul focus-shell state

### What's missing / what should exist

The focus-shell post-overhaul-fixes round (commits `a84d39d` → `e6c762e`) altered several focus-shell internals. The diagnostic flow's verification (sub-phase 1 commit 2's §4 scenarios) covered the `sessionDurationMs === null` path — the chronometer absent, sessionBarNode held to null, `behindPace` always false. The drill flow exercises the **opposite** path: `sessionDurationMs > 0`, chronometer rendering, `behindPace` color-keying live, auto-end effect armed, `isLastQuestion` flipping at the cumulative threshold.

These branches were touched in:
- `f3ed8e9` "feat(focus-shell): progression bar always blue; session bar carries pace color; reorder bars"
- `fae3501` "feat(focus-shell): split per-question timer bar into stacked primary+overflow bars with phase-keyed primary fill"
- `906c167` "feat(focus-shell): color-key question progression bar to pace deficit"
- `a84d39d` "fix(focus-shell): session bar red only AFTER current question's cumulative budget" (the SPEC §6.14.1 pace-deficit-threshold fix)
- `25ec46f` "chore(focus-shell): move 'Question N / M' label between progression bar and session timer"

Drill mode is the surface that exercises every one of these end-to-end. The plan's verification targets these specifically.

### Implementation seam

No code changes presumed. The audit either confirms clean or surfaces specific drift. If drift surfaces, the fix lives in `src/components/focus-shell/focus-shell.tsx` or its sub-components and ships as its own `fix(drill-mode): <specific drift>` commit before the logout-button commit.

### Files touched

If audit clean: none. If drift surfaces: list here.

### Verification scenarios

Real-DB harness, playwright-core directly. Matches the SPEC §6.14.1 verification protocol:

1. **Drill mounts cleanly.** Sign in as a user with a completed diagnostic + populated mastery_state. Navigate to `/drill/numerical.fractions` (a sub-type with a populated bank). Pick length 5. Submit. Land on `/drill/numerical.fractions/run?length=5`. Assert `<FocusShell>` renders; chronometer present; session-timer-bar present; question-timer dual-bar present.
2. **Pace-deficit color flip.** Drive past the cumulative per-question budget for the current question (e.g., sit on Q1 past 18s). Assert the session-timer-bar turns red. Per SPEC §6.14.1 the threshold is `(currentQuestionIndex + 1) × perQuestionTargetMs` — for Q1, 18s; the user must overshoot Q1's budget for the bar to flip.
3. **Triage prompt fires + persists across questions.** Sit on Q1 past 18s. Assert the triage prompt overlay surfaces. Take it (Space key OR click). Advance to Q2. Assert the triage prompt does NOT remain stuck on Q2 — that was the post-overhaul-fixes commit `2b3709d` fix.
4. **Auto-end at session timer zero.** Drive a drill where the session timer reaches zero. Assert `onEndSession` fires automatically and `router.push("/")` lands on the Mastery Map. Per SPEC §6.7 this is the timed-session contract.
5. **Submit-completion advances.** Drive a 5-item drill end-to-end via real submits. Assert the 5th submit returns `nextItem === undefined` and the page navigates to `/`.
6. **Mastery Map post-drill render.** From scenario 5's completion, the user lands on `/`. Assert `<MasteryMap>` renders the populated grid (the workflow's recompute fires for the sub-type just touched). The empty-state pane should NOT surface — `mastery_state` is already populated from prior sessions; the drill recompute updates the existing rows.

## 4. Adaptive vs. uniform_band — confirming the Phase-3 boundary

### What's missing / what should exist

PRD §4.2 specifies adaptive difficulty for drills: "Within a sub-type, the engine selects the next item to keep the user in the 80–85% accuracy zone." SPEC §9.1 specifies `nextDifficultyTier(ctx)` with the 0.8×/1.2× zones. **Code reality:** `selectionStrategyForSession("drill", _) === "uniform_band"`; `ErrAdaptiveDeferred = errors.new("adaptive strategy deferred to phase 5")`.

This is intentional. SPEC §9.2's table includes `drill → adaptive` as the spec, but `selection.ts:101-113` carries an explicit "Phase 5 changes the `drill → uniform_band` line to `drill → adaptive`" comment. The Phase-3 implementation uses the initial-tier table (SPEC §9.1) as a CONSTANT band for the whole drill — same band start to finish, no walking.

**Resolution: keep deferred; do not implement adaptive in sub-phase 3.** Phase 3's user-facing surface is "drill works end-to-end at a stable difficulty derived from mastery_state." Phase 5's adaptive walking is additive — it tightens the band, doesn't change the contract. Sub-phase 3 verifies that uniform_band produces a sane initial-tier per the SPEC §9.1 table for each `mastery_state.current_state` value.

### Implementation seam

None for this sub-phase. Audit only.

### Files touched

None.

### Verification scenarios

7. **Initial-tier resolution per mastery state.** Synthesize mastery_state rows for a test user with each value of `(current_state, was_mastered)`. Drive a drill for each. Assert the first served item's `served_at_tier` matches SPEC §9.1's table:

   | current_state | was_mastered=false | was_mastered=true |
   |---|---|---|
   | `learning` | `easy` | `medium` |
   | `fluent`   | `medium` | `medium` |
   | `mastered` | `hard`   | `hard` |
   | `decayed`  | `medium` | `medium` |

   New users (no `mastery_state` row) → `medium`.

8. **Uniform tier across the drill.** Drive a 5-item drill. Assert all 5 served items have the SAME `served_at_tier` (no walking). This is the no-adaptive contract.

## 5. Recency-excluded set materialization for drills

### What's missing / what should exist

Sub-phase 1's commit 1 verified `startSession`'s recency-excluded set behavior for the diagnostic case. The drill case is structurally identical — the `computeRecencyExcludedSet(userId, nowMs)` query reads attempts from the past 7 days for the user (across sub-types) and writes them into `practice_sessions.recency_excluded_item_ids: uuid[]`. The selection engine then excludes those item ids when picking new items.

**Audit point:** verify the recency-excluded set is non-empty when the user has recent attempts (e.g., the user just finished a diagnostic, then starts a drill — the drill's recency-excluded should include items the diagnostic served). Without this, the drill could re-serve items the user just saw 90 seconds ago.

### Implementation seam

None. Audit only.

### Files touched

None.

### Verification scenarios

9. **Recency-excluded includes diagnostic items.** Set up a user who just finished a 50-item diagnostic. Start a drill on a sub-type whose items the diagnostic touched. Read `practice_sessions.recency_excluded_item_ids` for the new drill row. Assert the array contains at least the diagnostic's items for that sub-type.
10. **Drill served items respect recency exclusion.** From scenario 9's setup, drive the first 5 attempts of the drill. Assert none of the served `item_id` values appear in the recency-excluded list.

## 6. Empty-bank handling

### What's missing / what should exist

Some sub-types currently have 0 live items in the dev DB. Per the testbank workstream, items live as `candidate` until stage-2 explanation generation promotes them to `live`. A user who clicks "Start drill: Synonyms" when `verbal.synonyms` has 0 live items today triggers `startSession`'s `getNextItem` selection chain, which exhausts the recency / session-soft / tier-degraded fallbacks and returns `null`. `startSession` then throws `ErrFirstItemMissing`.

The user sees an error page (Next.js's default error boundary). That's a bad UX for what's a known-empty-bank case.

**Resolution per §12.1:** add a pre-check on the configure page (`/drill/[subTypeId]`) that reads the live-item count for the sub-type. If 0, render an empty-bank pane saying "No questions available for {sub-type} yet. Try a different sub-type from the Mastery Map." (per §11.1). The pre-check is a single query (same shape as `liveCellItemCount` from `selection.test.ts`).

### Implementation seam

`src/app/(app)/drill/[subTypeId]/page.tsx` — add a read of the live-item count for the sub-type alongside the existing `resolveConfig`. Branch the render: if zero, render an `<EmptyBankPane>` instead of the length-picker form. The pre-check uses the existing `attempts_session_id_idx` is irrelevant — this is a count over `items WHERE sub_type_id = $1 AND status = 'live'`, which uses `items_sub_type_status_idx`.

### Files touched

- `src/app/(app)/drill/[subTypeId]/page.tsx` — add the pre-check + empty-bank branch.
- `src/components/drill/empty-bank-pane.tsx` (NEW) — the empty-bank render.

### Verification scenarios

11. **Empty bank renders pane, not error.** Pick a sub-type whose live-item count is 0 in the dev DB. Navigate to `/drill/<that-sub-type>`. Assert the empty-bank pane renders; no error boundary; no length-picker form. Click the "Back to Mastery Map" link; assert navigation to `/`.
12. **Populated bank renders configure form.** Pick a sub-type whose live-item count is ≥1. Navigate; assert the length-picker form renders.

## 7. Logout button

### What's missing / what should exist

A real user who finishes their diagnostic and wants to sign out has no affordance. The `(app)` layout doesn't render a sign-out link; the Mastery Map doesn't either; the focus shell deliberately strips chrome.

**Resolution:** add a "Sign out" affordance to the Mastery Map's header — top-right of the page, where actions conventionally live. Wire it to a server action that clears the NextAuth session and redirects to `/login`. NextAuth v5's `signOut()` from `@/auth` handles this in one call.

The button does NOT appear inside the focus shell (`/diagnostic/run`, `/drill/.../run`) — those routes deliberately strip non-essential chrome to maintain focus. The button does NOT appear on the diagnostic explainer (`/diagnostic`) either — users there are mid-diagnostic-flow and don't need a sign-out interruption. **Mastery Map only.**

### Implementation seam

- Server action: `signOutAction` in `src/app/(app)/actions.ts`. One call to NextAuth's `signOut({ redirectTo: "/login" })`.
- Client button: `<SignOutButton>` in `src/components/mastery-map/sign-out-button.tsx`. Form-action shape so it works without JavaScript (uses the server action directly via the form's action prop).
- Render: top-right of the Mastery Map's main element, anchored near the h1 baseline. The Map's main is `mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-6 py-12`; the sign-out anchors to the right edge of that container. As future settings/account actions land (Phase 5+ settings page, retake-diagnostic affordance, etc.), they cluster in this same header-action area; sub-phase 3 ships only sign-out.

### Files touched

- `src/app/(app)/actions.ts` — add `signOutAction`.
- `src/components/mastery-map/sign-out-button.tsx` (NEW).
- `src/components/mastery-map/mastery-map.tsx` — render `<SignOutButton>` in the header area, anchored top-right.

### Schema / state changes

None.

### Verification scenarios

13. **Sign-out button visible on Mastery Map.** Sign in. Navigate to `/`. Assert the sign-out button is present in the header area, top-right of the main container.
14. **Sign-out flow.** Click the button. Assert: (a) the NextAuth session row is deleted from `auth_sessions`; (b) the auth cookie is cleared; (c) the user is redirected to `/login`.
15. **Button NOT visible during sessions.** Navigate to `/diagnostic/run` (mid-diagnostic) — assert no sign-out button. Navigate to `/drill/<any>/run` mid-drill — same assertion.

## 8. Sequencing and commits

Up to four commits, plus an optional `fix` if §3 surfaces drift. Each commit lints, typechecks, and passes its verification scenarios before the next is started.

1. **(optional, only-if-§3-finds-drift) `fix(focus-shell): <specific drift in drill flow>`.** Lands first if a focus-shell verification scenario fails. If §3 audit is clean, this commit doesn't exist.

2. **`feat(drill-mode): empty-bank pane on configure page`.** Per §6. Adds the live-item-count pre-check + `<EmptyBankPane>` render. Verification scenarios 11–12.

3. **`feat(auth): sign-out button on Mastery Map`.** Per §7. Adds the server action + button + footer wiring. Verification scenarios 13–15.

4. **`docs: close phase3-drill-mode plan; SPEC drill-mode-section refresh; close-out`.** Plan status flip to "shipped" with the four commit hashes. SPEC §10.2 (drill walkthrough) refreshed to reflect the empty-bank pane and the no-adaptive-walking carry-forward. Architecture-plan §"User journey data flow" §5 acknowledged if needed (sentence about "configure page captures timer mode and length" — timer mode isn't captured in Phase 3, only `standard`; the existing line can stand).

## 9. Verification protocol carry-forward

Established discipline from the focus-shell post-overhaul round (`docs/plans/focus-shell-post-overhaul-fixes.md` §7) and sub-phases 1–2 (`docs/plans/phase3-diagnostic-flow.md` §9 + `docs/plans/phase3-mastery-map.md` §8) carries forward unchanged:

- `playwright-core` directly with `page.screenshot({ timeout: 30_000 })`.
- `page.mouse.move(10, 10)` before any post-click `getComputedStyle` measurement.
- Real `page.click()` for any user-interaction-gated paths (the configure page's length radios, the "Start drill" button, the sign-out button, the focus-shell's option/Submit clicks during the harness-driven drill drive).
- Real-DB harness for everything that touches `practice_sessions`, `attempts`, or `mastery_state`.
- Auth-cookie injection via the `authjs.session-token` pattern from `scripts/dev/smoke/diagnostic-mastery-recompute.ts` and `mastery-map-empty-state.ts`.
- Smoke-script directory pattern (SPEC §6.14.8): scripts that require the dev server live in `scripts/dev/smoke/`, NOT under `src/**/*.test.ts`. The §3 verification (drill flow under post-overhaul state) is a smoke; the §6 + §7 verifications can be either smokes or `bun test` (the empty-bank check is hermetic; the sign-out check needs the dev server for auth-flow verification, so smoke).
- Race-window verification pattern (SPEC §6.14.10): if any scenario depends on a brief async window, instrument the setup to reproduce stably.
- EXPLAIN ANALYZE for any new query on a hot route (the live-item-count pre-check is on a hot route — the configure page is hit on every "Start drill" click). Capture the plan in the commit message.

## 10. Out of scope

Explicit list — items deliberately not addressed in sub-phase 3:

- **Adaptive difficulty walking.** PRD §4.2 + SPEC §9.1 specify it; sub-phase 3 keeps the existing uniform_band implementation. Phase 5 ships the adaptive walker.
- **Speed-ramp and brutal drill modes.** PRD §4.4 enumerates three timer modes; only `standard` is wired. Phase 5 adds the other two.
- **NarrowingRamp.** PRD §5.3. Phase 5.
- **Drill post-session review surface.** Drills currently `router.push("/")` on completion (no `/post-session/[sessionId]` detour). PRD §6.5 specifies a post-session review for every session including drills. Phase 5 ships that.
- **Heartbeats + heartbeat route handler + cron-runner wiring.** Sub-phase 4. The cron route already exists; sub-phase 4's mini-round adds the client + handler + schedule.
- **Last-time-drill defaults.** PRD §5.2's "Defaults to the user's previous-session choice" applies to the Mastery Map's primary CTA, not the configure page's length picker. The configure page hardcodes default 10 today; that's PRD-compliant for Phase 3.
- **History tab + retake-diagnostic affordance.** Sub-phase 2's §10.3 deferred History; sub-phase 3 inherits the deferral.
- **Stats dashboard.** Roadmap Round C.

## 11. Resolutions of open questions

Two questions surfaced during plan-writing; both resolved before implementation.

### 11.1 Empty-bank pane copy

**Question:** What does the empty-bank pane say, and does it offer any next-best action?

**Resolution: simple informational pane, single CTA back to Mastery Map.** Copy (heading): "No questions available for {sub-type} yet." Body: "Try a different sub-type from the Mastery Map." Single button: "Back to Mastery Map." Phrasing matches the user's frame ("this drill isn't ready for me to use") rather than the implementation reality ("the bank is being prepared by a content workstream"). No retry button (the bank doesn't fill on user request); no auto-poll (the testbank workstream is async authoring, not a workflow). The user redirects to the Map; their other sub-types' drills work fine.

### 11.2 Sign-out button placement on the Mastery Map

**Question:** Footer (alongside the triage adherence line) or header (top-right of the Map)?

**Resolution: header, top-right.** The footer's low-contrast chrome housing the triage adherence line is intentional for *status* signals (PRD §5: "30-day rolling triage adherence in low-contrast periphery"). Sign-out is an *action*, not a status, and inheriting the periphery treatment would make it harder to find. Header placement (top-right of the main container) is where actions conventionally live; users looking to sign out scan there first. The "outside active session" framing still applies — the button does not appear inside the focus shell or on the diagnostic explainer. Future settings/account-management surfaces (Phase 5+) cluster in this same header-action area.

## 12. Open questions / resolutions

### 12.1 Empty-bank handling

**Question:** Surface the empty-bank case as a configure-page pane, OR fail through to startSession's error boundary as today?

**Resolution: surface as a pane.** The error boundary is a default Next.js error UX that doesn't tell the user what's actually wrong. A purpose-built pane explains the situation (bank being prepared) and offers a clean next step (back to Map). The pre-check is a single indexed count query; cost is rounding-error.

### 12.2 Adaptive-vs-uniform_band drift between PRD/SPEC and code

**Question:** Should sub-phase 3 implement adaptive walking now, or carry the deferral forward?

**Resolution: carry forward.** Adaptive walking is Phase 5 per `selection.ts`'s explicit comment and `ErrAdaptiveDeferred`. Implementing it in sub-phase 3 would expand scope substantially (the walker, the per-attempt tier recomputation, the served-tier vs. requested-tier distinction at fallback time, an updated SPEC §9.1 implementation note). Phase 3's contract is "drill works end-to-end at a stable mastery-state-derived band." That ships today via uniform_band; that's what sub-phase 3 verifies.

### 12.3 Sign-out button visibility

**Question:** Should the sign-out button appear on every `(app)` route, or only on the Mastery Map?

**Resolution: Mastery Map only.** The focus shell (diagnostic-run, drill-run) deliberately strips non-essential chrome to maintain user focus during a session. Adding a sign-out affordance there violates that contract. The diagnostic explainer is a transient interstitial and doesn't need it either. The Mastery Map is the user's home; system-level actions belong there.
