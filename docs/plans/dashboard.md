# Plan — Dashboard ("Dojo home")

> **Status: planning, approved, not yet implemented.** This plan was drafted audit-first against `main` HEAD `8ab7b40` (2026-05-07; one commit past Phase 5 v1 feature-complete at `8a10fb1`). The PRD at `docs/plans/DASHBOARD_PRD.md` is the source of truth for the *what*; this plan is the source of truth for the *how* — commit sequencing, audit findings against `main`, decisions surfaced for Leo, and acceptance criteria. Closed-plans-immutable per SPEC §6.14.20 once written.

This plan covers shipping the "Dojo" dashboard at `/`, migrating the current Mastery Map at `(app)/page.tsx` to `/drill`, and stubbing out `/lessons`, `/stats`, `/review` so the new TopNav has zero 404 targets. The dashboard is a server-rendered, read-only screen behind the existing `(app)/layout.tsx` auth + diagnostic-completed gate; client-side interactivity is limited to navigation. No mutations, no form state.

This is the **first post-Phase-5-v1 feature round.** The deploy gate from master plan §1 lifted at `8a10fb1`; the pre-deploy cleanup arc the master plan sketches (and the post-Phase-5 sequence the sub-phase 3 round-close summary names) is upstream of this; the dashboard is a clean greenfield render-layer change with stubbed data wiring per PRD §19.

## 1. Why this round, why now

Three forcing functions:

- **Phase 5 v1 is feature-complete.** Every sub-phase shipped. The home route currently shows the Mastery Map — a useful sub-type picker but not the strategic-orientation surface that the post-deploy product needs. The dashboard is the first surface that a returning user sees, and per PRD §2 it answers four questions (where am I vs goal, what should I do today, where are my belts, how's my pace) that the Mastery Map can't.
- **Nav deadlocks.** The dashboard introduces a five-item top nav (`/`, `/drill`, `/lessons`, `/review`, `/stats`); only `/` and `/drill/[subTypeId]` exist today. Without stubbing the other three, the nav 404s. PRD §4.3 + §11.5 mandate stub pages and a Mastery Map migration so every nav target resolves.
- **Stub-first data layer.** Every data feed except `loadUserProfile` is stubbed (PRD §6.2–§6.7, §19). The follow-up PRDs that replace each stub (Sim Scoring, Pace-Strip, Belts, Goal Score, Mission Picker, Streaks, Mistakes, Lessons, Stats — see PRD §19) are independent and can land in any order. The dashboard's UI must be visually correct against the stubbed empty-state values *first*, so the stub-replacement PRDs don't have to re-litigate render decisions.

The cost of this round is bounded — no new database migrations run (the `user_sub_type_belts` schema in PRD §18 is added as a Drizzle definition but `db:generate`/`db:push` is left for the Belts PRD per PRD §16); no changes to selection, scoring, focus shell, or post-session surfaces; and the only existing-code rewrites are (a) the Mastery Map page-mount move (`(app)/page.tsx` → `(app)/drill/page.tsx`) and (b) the root `layout.tsx` font swap.

## 2. Audit findings against `main`

The current state, as of `main` HEAD `8ab7b40`:

### 2.1 Checkpoint A — Mastery Map mount point

**Claim under audit (PRD §11.5).** "The current `(app)/page.tsx` ships a functional Mastery Map" and needs to migrate to `(app)/drill/page.tsx`.

**Verdict: confirmed.** `src/app/(app)/page.tsx` is the Mastery Map server component. It initiates four parallel promises (`masteryStatesPromise`, `nearGoalPromise`, `triagePromise`, `recommendedSubTypePromise`) and hands them to `<MasteryMap>` (a client component) under `React.Suspense` — the canonical RSC pattern per `rules/rsc-data-fetching-patterns.md`. The page imports `<MasteryMap>` from `@/components/mastery-map/mastery-map`. Components under `src/components/mastery-map/` are: `computing-state.tsx`, `mastery-icon.tsx`, `mastery-map.tsx`, `near-goal-line.tsx`, `sign-out-button.tsx`, `start-session-button.tsx`, `triage-adherence-line.tsx`. Migration is a page-level move; the `<MasteryMap>` component subtree is unchanged.

**Implication for the plan.** Commit 4 (Mastery Map migration; see §5) is a copy of `(app)/page.tsx` to `(app)/drill/page.tsx`. The `<SignOutButton>` rendered inside the current page subtree stays — `/drill` index inherits it.

### 2.2 Checkpoint B — Auth + diagnostic gate

**Claim under audit (PRD §11).** "The page sits behind the `(app)/layout.tsx` gate, which is already enforcing both auth and 'diagnostic completed'. No new gating is required from this PRD."

**Verdict: confirmed.** `src/app/(app)/layout.tsx` is a server component that initiates `requireDiagnosticGate()` and awaits it inside an inner async component under a Suspense boundary (the canonical "gate then render" shape, per the rsc rules). `requireDiagnosticGate` does two things: (1) `auth()` + redirect to `/login` if no session, and (2) a Drizzle `select()` against `practice_sessions` filtered to `userId + type='diagnostic' + endedAtMs IS NOT NULL + completionReason != 'abandoned'`, redirecting to `/diagnostic` if no row matches. Both gates run before any child page renders.

**Implication for the plan.** The dashboard inherits both gates for free. The dashboard's own `loadUserId()` (PRD §11) is belt-and-suspenders — `auth()` already ran one layer up — but matches the existing convention from `(app)/page.tsx:46-52`. No new layout or auth code is added by this round.

### 2.3 Checkpoint C — `users.targetDateMs`

**Claim under audit (PRD §5.1).** `testDate` → `targetDateMs` (epoch ms; convert via `new Date(ms)`; days-to-test = `Math.ceil((targetDateMs - Date.now()) / 86_400_000)`). The column is nullable.

**Verdict: confirmed.** `src/db/schemas/auth/users.ts:11` declares `targetDateMs: bigint("target_date_ms", { mode: "number" })` — nullable (no `.notNull()`). The current `(app)/page.tsx:80` already reads it via `loadTargetDateMs(userIdPromise)` and treats `null` as "not set". The PRD's days-to-test formula is correct.

**Implication for the plan.** `loadUserProfile` in PRD §6.1 reads this column directly. The `daysToTest === undefined` branch in `<ScoreStrip>` (em-dash render) is the correct empty-state for first-run users.

### 2.4 Checkpoint D — `users.targetPercentile` (intentionally not read)

**Claim under audit (PRD §5.1, §6.1).** `target_percentile` exists on `users` but is intentionally NOT read by the dashboard. Goal in `<ScoreStrip>` is a raw target score (out of 50), stubbed to `40`, not a percentile.

**Verdict: confirmed.** `src/db/schemas/auth/users.ts:10` declares `targetPercentile: integer("target_percentile")` (nullable). The current Mastery Map's `near-goal-line.tsx` derivation reads it (via `loadTargetPercentile` upstream of `deriveNearGoal`). PRD §6.1's `STUB_GOAL_SCORE = 40` constant decouples the dashboard from this column entirely. Goal Score PRD (PRD §19) decides whether to add a sibling column or alias.

**Implication for the plan.** No code change to `users.ts` schema. The Mastery Map (now under `/drill`) keeps reading `target_percentile` for its near-goal-line; the dashboard ignores it. This is a deliberate two-domain split.

### 2.5 Checkpoint E — Practice-sessions enum value for full sims

**Claim under audit (PRD §5.1, §6.4).** "`mode = 'full_sim'` → `type = 'simulation'` (the enum value is `simulation`, not `full_sim`)." `getLastFullSim` is described as "most recent practice_sessions row where type = 'simulation' AND ended_at_ms IS NOT NULL."

**Verdict: CONTRADICTED by the codebase.** The `session_type` enum at `src/db/schemas/practice/practice-sessions.ts:5-10` is `["diagnostic", "drill", "full_length", "simulation"]` — *both* `full_length` and `simulation` are valid values. The Phase 5 sub-phase 3 round-close (commit `9376423`, `61a650c`) shipped the full-length flow with `type: "full_length"` end-to-end:

- `src/app/(app)/full-length/run/page.tsx:33` — `type: "full_length"`
- `src/app/(app)/full-length/run/content.tsx:64` — `sessionType="full_length"`
- `src/server/sessions/start.ts:97` — `if (input.type === "full_length" || input.type === "simulation") return 50`
- `src/server/items/selection.ts:106-107` — `'full_length' → 'fixed_curve'`, `'simulation' → 'fixed_curve'`
- `src/app/(app)/actions.ts:36` — zod enum includes both

There are no `practice_sessions` rows of type `'simulation'` in the v1 product flow today. The `'simulation'` enum value is reserved for a future test-day-simulation surface (master plan §11 defers it; absent in v1). Every full sim a user takes has `type = 'full_length'`.

**The PRD's mapping is wrong.** PRD §6.4's stub `getLastFullSim` says:
> When real: most recent `practice_sessions` row where `type = 'simulation'` AND `ended_at_ms IS NOT NULL`.

The correct future-shape is `type = 'full_length'` (or `type IN ('full_length', 'simulation')` if the Sim Scoring PRD wants to lump them).

**Implication for the plan.** This is a doc-only contradiction in the PRD that does NOT block this round (the helper is stubbed to `undefined`; nothing reads the comment). But the PRD comment text needs correcting at the implementation commit so future-Claude reading the comment doesn't write the wrong query when the Sim Scoring PRD lands. Surfaced for Leo as **decision E** in §3.

### 2.6 Checkpoint F — `attempts` lacks standalone `userId`

**Claim under audit (PRD §5.1).** "No standalone `userId` column — join through `practice_sessions.userId`."

**Verdict: confirmed.** `src/db/schemas/practice/attempts.ts:9-11` shows `attempts.sessionId` references `practice_sessions.id` (cascade delete). The columns are: `id`, `sessionId`, `itemId`, `selectedAnswer`, `correct`, `latencyMs`, `servedAtTier`, `fallbackFromTier`, `triagePromptFired`, `triageTaken`, `metadataJson`. No `userId` column. Existing code already uses the session-join pattern (e.g. `src/server/post-session/end-session-tier.ts`, `src/server/triage/score.ts`) — every "attempts by user" query joins through `practice_sessions`.

**Implication for the plan.** When the Pace-Strip / Mistakes / Streaks PRDs replace stubs, the queries will join `attempts INNER JOIN practice_sessions ON attempts.session_id = practice_sessions.id` and filter on `practice_sessions.user_id`. This is already the project's pattern; no new index needed.

### 2.7 Checkpoint G — `mastery_state.current_state` (NOT belts)

**Claim under audit (PRD §5.1).** "`mastery_state.current_state` is a 4-value enum `learning | fluent | mastered | decayed` — different conceptual axis from belts (`white | blue | brown | black`). Don't try to alias them; treat them as parallel domains."

**Verdict: confirmed.** `src/db/schemas/practice/mastery-state.ts:5` declares `mastery_level` enum as `["learning", "fluent", "mastered", "decayed"]`; the column is `current_state`. Belts (`white | blue | brown | black`) is a separate 4-value typedef in `src/server/dashboard/types.ts` per the PRD's data contract; `<BeltIndicator>` for the post-session shell maps tier (`easy | medium | hard | brutal`) to belt color via `tierToBeltColor`. So there are now THREE 4-tuples in the codebase:

- mastery state: `learning | fluent | mastered | decayed` — written by triage; consumed by `<MasteryMap>` and `near-goal-line.tsx`.
- session-end tier: `easy | medium | hard | brutal` — derived from walker's effective difficulty over the last N attempts; consumed by post-session `<BeltIndicator>`.
- dashboard belt: `white | blue | brown | black` — owned by `user_sub_type_belts` (stub schema; no rows yet); consumed by dashboard `<BeltStripe>`.

These domains intersect on the dashboard *visually only* (post-session belt color and dashboard belt color are both four-tier ladders, both using the same names). PRD §5.1's "parallel domains" framing is correct.

**Implication for the plan.** The dashboard `<BeltStripe>` consumes the dashboard belt (`SubtypeRow.belt`). The Belts PRD will own the mastery-state-to-belt mapping (or an entirely new evaluator that doesn't touch mastery_state at all). This round leaves all 14 sub-types at white belt via the stubbed `loadAllBelts`.

### 2.8 Checkpoint H — Spaced-review schema absent

**Claim under audit (PRD §5.1, §6.7).** "`core_user_question_states` (mistakes queue) — DOES NOT EXIST. Spaced review was cut from v1 (see feature-roadmap reconciliation, `064a386`). The mistakes-tile count is stubbed to 0 until a Mistakes PRD lands; the framing in §10.8 is 'wrong answers to review', not 'spaced review due'."

**Verdict: confirmed.** `ls src/db/schemas/practice/` returns only `attempts.ts`, `mastery-state.ts`, `practice-sessions.ts`. There is no `user_question_states` or equivalent spaced-review queue. A grep for `user_question_states` and `spaced.*review` across `src/` returns no matches. The cut from v1 is real; PRD §10.8's "wrong answers to review" framing is the correct v1 surface.

**Implication for the plan.** `<MistakesTile>` empty-state ("No mistakes to review") and zero-count framing are correct against the stubbed `countMistakes` returning 0. The Mistakes PRD will not need a new schema if it counts wrong attempts via `attempts.correct = false` joined through sessions; the schema-add only happens if it tracks per-question review acknowledgment. This round does NOT pre-empt that decision.

### 2.9 Checkpoint I — `--belt-blue` / `--belt-brown` already in `globals.css`

**Claim under audit (PRD §8 audit note).** "`--belt-blue` and `--belt-brown` are **shared** with the post-session `<BeltIndicator>` (drill-mode session-end heading). Any change to those values affects both surfaces. Implementation must keep existing values OR namespace dashboard variants."

**Verdict: confirmed.** `src/styles/unstyled/globals.css:41-42` (light) and `:79-80` (dark) declare:

```
:root {
  --belt-blue: oklch(0.55 0.16 245);
  --belt-brown: oklch(0.4 0.07 50);
}
.dark {
  --belt-blue: oklch(0.65 0.18 245);
  --belt-brown: oklch(0.55 0.09 50);
}
```

Surfaced via `@theme inline` at `:115-116` as `--color-belt-blue` / `--color-belt-brown`. The block has a long comment naming Phase 5 sub-phase 5 commit 3 as the introduction point and §6.14.18 as the audit-against-actual-artifact rationale.

**Implication for the plan.** Per PRD §8 audit note recommendation 1 ("keep existing values"), commit 1's CSS append does NOT redeclare `--belt-blue` or `--belt-brown` — only adds `--belt-white`, `--belt-white-line`, `--belt-black`, plus the new neutrals/brand/pace tokens. The dashboard `<BeltStripe>` consumes the existing values via `bg-belt-blue` / `bg-belt-brown`. If a visual diff at commit 13 (click-through audit per PRD §17 step 13) finds the dashboard stripe under-saturated against the new tinted neutrals, the fallback is to namespace `--dashboard-belt-blue` / `--dashboard-belt-brown` — NOT to retune the existing tokens (which would silently regress the post-session indicator). This is a runtime-verification decision per SPEC §6.14.23, not a static-trace decision.

### 2.10 Checkpoint J — `<BeltIndicator>` collision

**Claim under audit (PRD §10.1 audit note).** "There is **already** a `<BeltIndicator>` component in the tree at `src/components/post-session/belt-indicator.tsx` (Phase 5 sub-phase 5, `b31d8cb`) — a heading-attached indicator that maps a session's effective difficulty tier (easy/medium/hard/brutal) to a belt color. The dashboard component is a different visual primitive (22×6 colored stripe with right-edge cap) operating on a different semantic axis. Two distinct components, two distinct names. The dashboard variant is `<BeltStripe>`."

**Verdict: confirmed.** `src/components/post-session/belt-indicator.tsx` exports `BeltIndicator`, `BeltColor`, `BeltIndicatorProps`, `beltColorDisplayName`, `tierDisplayName`, `tierToBeltColor`. It accepts a `Difficulty` tier prop and renders inside the post-session shell heading row. The dashboard variant at `src/components/dashboard/belt-stripe.tsx` (PRD §10.1) accepts a `BeltLevel` prop and renders 14 times (once per sub-type row). Different files, different exports, different visual primitives.

**Implication for the plan.** The PRD's rename from "BeltIndicator" (in the original mockup-aligned naming) to "BeltStripe" (the dashboard-internal name) is the correct decision. Commit 5 (leaf components) creates `belt-stripe.tsx`; the post-session `belt-indicator.tsx` is untouched. Acceptance criterion §15 ("Drill post-session `<BeltIndicator>` looks unchanged from `8a10fb1` baseline") is verified by visual diff at commit 13.

### 2.11 Checkpoint K — Auth.js v5 `session.user.id`

**Claim under audit (PRD §6.1 audit note).** "Verify the Auth.js v5 session callback in `@/auth` actually attaches `user.id` to the session object. Auth.js v5 doesn't do this by default; it requires a `session` callback that copies `token.sub` into `session.user.id`. If a typecheck error surfaces on `session.user.id`, the callback needs widening."

**Verdict: confirmed (with caveat). `session.user.id` works today, but for a different reason than the PRD assumes.** `src/auth.ts` configures NextAuth v5 with `session: { strategy: "database" }` — *not* JWT. With the database strategy, Auth.js fetches the session row via the adapter (`bigintAdapter(db)`) and attaches the `users.id` to `session.user.id` automatically; no custom `session` callback is needed. The PRD's audit warning ("Auth.js v5 doesn't do this by default") is correct for the JWT strategy but doesn't apply here.

Existing code that already exercises `session.user.id` end-to-end:
- `src/app/(app)/page.tsx:48` — `session.user.id` in the Mastery Map's `loadUserId`.
- `src/app/(app)/layout.tsx:31` — `session.user.id` in `requireDiagnosticGate`.
- `src/app/(app)/full-length/run/page.tsx`, `src/app/(app)/drill/[subTypeId]/run/page.tsx` — same pattern.

All of these typecheck and run today. The dashboard's `loadUserId` (PRD §11) is structurally identical and will work without modification.

**Implication for the plan.** No custom auth callback added by this round. Acceptance criterion: dashboard's `loadUserId` typechecks against the existing `auth()` return type with no widening.

### 2.12 Other audit findings (not part of A–K but worth surfacing)

These came up during the A–K audit and warrant Leo's attention.

**Finding 1 — sub-type `displayName` is Title Case, PRD claims sentence case.** `src/config/sub-types.ts` declares `displayName` as Title Case ("Sentence Completion", "Letter Series", "Word Problems") but PRD §5 says: "Display name in sentence case, e.g. 'Sentence completion'." The dashboard renders `row.name` (= `s.displayName` from the config) directly via `<BeltStripe ariaContext={row.name}>` and the row's text label. There are two ways to resolve:

- (a) Render Title Case as-is (matches the existing `<MasteryMap>` rendering, which also shows Title Case via `subTypes.find(...).displayName`).
- (b) Apply a sentence-case transformer in `loadAllBelts` before returning `row.name`.

Recommendation: **(a) — keep Title Case.** The PRD's sentence-case framing is aspirational; aligning with the existing Mastery Map rendering preserves cross-surface consistency (the same sub-type label appears at `/drill` and on the dashboard belt row). If sentence case is a hard product preference, the right place to fix it is `src/config/sub-types.ts` (one-line edit per displayName), not a dashboard-local transformer — that way every consumer (Mastery Map, post-session shell, dashboard) reads the same string.

Surfaced for Leo as **decision F** in §3.

**Finding 2 — PRD §6.1 example violates `no-nullish-coalescing` rule.** The PRD's `loadUserProfile` example contains:

```ts
const fullName = row.name ?? "Friend"
```

This is banned by `rules/no-nullish-coalescing.md`. The correct shape per the rule is to validate-and-throw if the user has no name (treating it as a data-integrity violation), or to redirect to a setup flow. Both are heavier than the PRD intends. A pragmatic resolution that respects the rule:

```ts
const fullName = row.name === null ? "Friend" : row.name
```

This is an explicit ternary assigned to a `const`, which is allowed by `rules/no-inline-ternary.md`. It surfaces the null-as-empty-state intent without `??`. The first-name extraction `row.name.split(" ")[0]` then narrows because `row.name` is no longer `null` inside the else branch.

But there's a deeper question: **should `users.name` be nullable at all?** Auth.js's Google adapter populates `name` from the OAuth profile, which always provides a name. The `users.name` column is `varchar(256)` without `.notNull()` purely because the Auth.js adapter type uses a `string | null` shape. In practice, every row should have a name. A defensive validate-and-throw shape is more honest than a "Friend" fallback:

```ts
if (row.name === null) {
  logger.error({ userId }, "dashboard profile: user has no name (auth invariant broken)")
  throw errors.new("user has no name")
}
const fullName = row.name
```

Surfaced for Leo as **decision G** in §3.

**Finding 3 — root `layout.tsx` has stale Title.** `src/app/layout.tsx:11-12` declares `metadata.title = "Todos"` — superstarter leftover. The PRD §12 swaps fonts but doesn't mention title metadata. PRD-aligned title: `"18seconds"` (matches the brand wordmark in `<TopNav>`).

Surfaced for Leo as **decision H** in §3.

**Finding 4 — couldn't visually inspect `dashboard_reference.png`.** A session-level hook (`~/.claude/hooks/cbm-code-discovery-gate`) blocks `Read` on every invocation in a way that prevents loading the PNG. The PRD prose is the input I worked from; PRD §1 explicitly names the mockup as the tiebreaker for ambiguity, but I have not seen it. **I cannot verify any layout/proportion/color claim that isn't in the PRD's prose.** This may be irrelevant — the PRD was reconciled against the mockup at `8a10fb1` and the prose is meant to be sufficient — but Leo should be aware that my "consistency with the mockup" claims are second-hand. Surfaced as **decision I** in §3.

## 3. Open decisions surfaced for Leo

These are points where the audit found the PRD ambiguous, self-inconsistent, or contradicted by the codebase. Numbered E onward (decisions A–D were resolved by the audit findings above; A–D = "PRD claim verified, no decision needed").

### Decision E — fix the `getLastFullSim` comment to use `'full_length'` not `'simulation'`? **RESOLVED: option 2.**

**Context.** Audit checkpoint E (§2.5) showed the PRD's claim that full sims are stored with `type = 'simulation'` is wrong — they're stored with `type = 'full_length'`. The helper is stubbed in this round, but the inline comment that names the future query shape is a load-bearing breadcrumb for the Sim Scoring PRD.

**Resolution.** Option 2 — the helper comment in `score.ts` reads `type IN ('full_length', 'simulation')`. Covers a future test-day-sim surface without re-litigation. Lands at the (re-numbered) commit that creates the data layer (former §5 commit 6, now commit 5 post-merge).

### Decision F — sub-type display name case. **RESOLVED: keep Title Case.**

See finding 1 in §2.12. Title Case (status quo) vs sentence case (PRD's prose).

**Resolution.** Keep Title Case. `loadAllBelts` returns `s.displayName` directly with no transformer. Cross-surface consistency with `<MasteryMap>` preserved. If sentence case is desired later, fix at `src/config/sub-types.ts` source.

### Decision G — `users.name` nullable handling. **RESOLVED: option 3 (validate-and-throw).**

See finding 2 in §2.12.

**Resolution.** Validate-and-throw if `row.name === null`. The Google adapter always populates `name`; null is a data-integrity violation, not a legitimate empty state. `loadUserProfile` logs `error` + throws via `errors.new("user has no name")` per the project's error-handling convention. No "Friend" fallback. No `??`.

### Decision H — root `layout.tsx` `metadata.title`. **RESOLVED: change to `"18seconds"` in commit 1 (post-merge).**

See finding 3 in §2.12. Current value: `"Todos"` (starter leftover). One-line edit, no scope risk.

### Decision I — visual reference. **RESOLVED: Leo eyeballs at commit 11 (page mount, post-merge).**

See finding 4 in §2.12. The implementation matches the PRD's prose closely; any place where the prose under-specifies, the implementation defaults to Alpha defaults from `docs/ALPHA_DESIGN.md`. If commit 11 surfaces a mockup regression that PRD prose didn't catch, that's a PRD bug to fix in a follow-up — not a re-architect. Visual diff is Leo's responsibility at commit 11 (post-merge re-numbering).

## 4. Things `docs/ALPHA_DESIGN.md` specifies that the PRD under-specifies

Read against `docs/ALPHA_DESIGN.md` (the Alpha design system reference distilled from the `alpha-style` skill suite):

- **Surface type.** ALPHA §2 defines three surface types: A (flagship marketing), B (authenticated product), C (local campaign). The dashboard is unambiguously **type B** — quiet, denser, more operational. The PRD doesn't classify; the implementation should default to B's discipline (minimal shadows, brand blue as accent only, never as background fill).
- **Body weight in dark mode.** ALPHA §3 says "Reduce body weight slightly (e.g., 350 instead of 400) — light-on-dark looks heavier." PRD §3 says "Two font weights only: 400 (regular) and 500 (medium)." Plus Jakarta Sans does not ship a 350 weight in `next/font/google` (weights are 200/300/400/500/600/700/800). The closest practical implementation is to use `font-weight: 300` for body text in `.dark` if the visual diff at commit 13 finds light-on-dark looks too heavy. Surfaced here, not as a hard decision — defer to commit 13's visual review.
- **Container queries.** ALPHA §5 says "Viewport queries → page layouts. Container queries → components." The PRD uses viewport breakpoints (`md:grid-cols-2`) for the dashboard's two-column dojo grid. This is a page-layout decision, so viewport queries are correct here; flagging only because the dashboard's *components* (DojoCard, MissionCard) could in principle benefit from container-query-driven adaptation. Out of scope; noting for a future polish round.
- **60/30/10 visual weight.** ALPHA §3 names the rule. The PRD's "cobalt accent appears in exactly four places on first paint" (acceptance criterion §15) is consistent with the 10% rule. Implementation should preserve this — the `<MissionCard>` eyebrow, the `<ScoreStrip>` italic ("You're climbing."), the `<ScoreStrip>` Goal value, and the `<PaceMetric>` today bar are the four. **In the stub case**, the delta arrow and the today pace bar fall back; PRD §15 names this explicitly.
- **Empty states are onboarding (ALPHA §9).** PRD's empty states for `<LastSimTile>` ("Take your first sim →") and `<MistakesTile>` ("No mistakes to review · Wrong answers from past sessions land here") follow this. PRD's `deriveHeadline({ delta: undefined, hasSim: false }) → "Let's begin."` is briefer than ALPHA's "(1) acknowledge briefly. (2) explain the value of filling. (3) provide a clear action." The implementation can stay with "Let's begin." (clean, on-brand, the explain-the-value piece is in the mission card body) — but Leo may want a slightly fuller line here.
- **Cards-overused rule.** ALPHA §5 says "never nest cards inside cards." PRD §3 enforces "no nested cards." `<MissionCard>` contains two button `<Link>`s, not cards — fine. `<DojoCard>` contains `<BeltRow>`s, which are list items with hover states — also fine, not cards. `<ScoreStrip>` uses `<StatTile>` which is a label+value composition without surface — ALPHA-consistent.
- **Focus rings outside the element.** ALPHA §7 says rings are "2–3px thick, **outside** the element, ≥3:1 contrast against neighbors." PRD §10.2 uses `focus-visible:-outline-offset-2` (inset) for `<BeltRow>` because the row's grid layout can't accommodate an outside ring without shifting siblings. This is a deliberate deviation — PRD §10.2 names it ("focus shows an inset cobalt outline (so the link border doesn't shift the row)"). Cobalt against the lavender hover fill is ≥3:1; consistent with the spirit of ALPHA's rule.
- **No bounce/elastic/overshoot.** ALPHA §6 forbids these on trust-critical surfaces. PRD §8 uses `--ease-out: cubic-bezier(0.25, 1, 0.5, 1)` (= ALPHA's `--ease-out-quart` recommended default). Consistent.
- **Buttons say what they do.** ALPHA §9: "Verb + object. Never 'OK', 'Submit', 'Yes/No'." PRD's CTA labels: "Start full sim" (verb+object ✓), "Pick a drill" (verb+object ✓). Consistent.
- **Tinted neutrals.** ALPHA §3: "Tint all neutrals slightly toward Alpha's blue-violet hue (~0.005–0.01 chroma at hue 250)." PRD §8 uses `oklch(... 0.005 270)` to `oklch(... 0.020 270)` — hue 270 (blue-violet, slightly more violet than ALPHA's 250). The deviation from hue 250 to 270 is small and intentional (PRD §8 names it as "tinted neutrals — hue 270 keeps everything subtly blue-violet"). Non-load-bearing but worth noting to Leo.
- **Color is rare; cobalt as accent only.** ALPHA §3: "Blue is an accent, not a wash. Anchor brand surfaces in tinted lavender/near-white." PRD §8 implements this precisely — `--bg` is `oklch(98% 0.005 270)` (tinted near-white), cobalt only via `--cobalt`, used at <10% of pixel weight. Consistent.

## 5. Commit sequence

This round is best sequenced as a 12-commit chain. Each commit is independently reviewable, lint-clean, typecheck-clean, and ships a coherent slice of the dashboard. The order minimizes thrash — design tokens land first so component styling works as components are built; stub helpers land before the data orchestrator; the orchestrator lands before the page; the click-through audit is the last commit before round-close.

The original draft of this plan named 13 commits with a separate "round-open docs" commit ahead of the tokens commit. At plan approval, those two were merged: commit 1 ships the plan-doc with redlines applied, the design tokens, the `@theme inline` extensions, the font swap, and the `metadata.title` fix as a single atomic round-open. The plan-doc itself was committed as a draft at `e1d135d` (the commit that created `docs/plans/dashboard.md`); commit 1 (post-merge) re-opens it via `Edit` to apply the four approval-time redlines (status block, decisions E–I resolutions, and this very re-numbered commit table) and lands the code in the same commit.

| # | Title | Files touched | Verifies |
|---|---|---|---|
| 1 | plan-doc redlines + design tokens + `@theme inline` + font swap + `metadata.title` (decision H) | `docs/plans/dashboard.md`, `src/styles/unstyled/globals.css`, `src/app/layout.tsx` | `bun lint:all` + `bun typecheck`; `bun test` count unchanged (79); existing post-session `<BeltIndicator>` visually unchanged (manual diff against `/drill/[subTypeId]` post-session); browser tab title shows "18seconds" |
| 2 | stub schema + barrel registration | `src/db/schemas/practice/user-sub-type-belts.ts`, `src/db/schema.ts` | typecheck (no migration runs) |
| 3 | Mastery Map migration: copy `(app)/page.tsx` to `(app)/drill/page.tsx`; verify `/drill` renders identically to current `/` | `src/app/(app)/drill/page.tsx` (new) | route-level click-through; `/drill` index renders the Mastery Map; `(app)/page.tsx` is now stale-but-not-yet-deleted |
| 4 | stub pages: `/lessons`, `/stats`, `/review` | `src/app/(app)/lessons/page.tsx`, `src/app/(app)/stats/page.tsx`, `src/app/(app)/review/page.tsx` (all new) | typecheck; 200 status on all three |
| 5 | data layer: types, helpers, stub helpers, orchestrator | `src/server/dashboard/types.ts`, `helpers.ts`, `belts.ts`, `mission.ts`, `score.ts`, `streak.ts`, `pace.ts`, `mistakes.ts`, `data.ts` (all new) | typecheck; per-helper stub returns deterministic empty values; orchestrator type-checks against `DashboardData` |
| 6 | leaf components: `BeltStripe`, `StatTile`, `StreakChip` | `src/components/dashboard/belt-stripe.tsx`, `stat-tile.tsx`, `streak-chip.tsx` (all new) | typecheck; ad-hoc visual check |
| 7 | composite components 1: `BeltRow`, `DojoCard`, `MissionCard` | `src/components/dashboard/belt-row.tsx`, `dojo-card.tsx`, `mission-card.tsx` (all new) | typecheck |
| 8 | composite components 2: `ScoreStrip`, `PaceMetric`, `MistakesTile`, `LastSimTile` | `src/components/dashboard/score-strip.tsx`, `pace-metric.tsx`, `mistakes-tile.tsx`, `last-sim-tile.tsx` (all new) | typecheck; empty-state branches render correctly against stub values |
| 9 | nav + client wrapper: `TopNav`, `Dashboard` | `src/components/dashboard/top-nav.tsx`, `dashboard.tsx` (all new) | typecheck; `usePathname` active-route highlights correctly |
| 10 | page mount: replace `(app)/page.tsx` content with the dashboard server component | `src/app/(app)/page.tsx` | dashboard renders at `/`; Mastery Map at `/drill` is unchanged |
| 11 | full-surface Alpha Style audit + polish (parallels Phase 5 sub-phase 3 commit 5) | varies — typically 1–2 surfaces touched | ad-hoc visual audit; cobalt-rule-of-4, serif/sans split, belt-cap visibility, dojo row spacing; **decision I visual diff** vs `dashboard_reference.png` |
| 12 | round-close: full lint pass; PR-quality click-through audit; reconcile this plan-doc to past-tense per §6.14.20 (wholesale-replacement-with-quote-preservation) | this plan-doc + possibly SPEC | every nav target, every CTA, every belt row, alternate CTA on mission card; light + dark mode; both Suspense states |

**Commit-message convention.** Per the Phase 5 sub-phases' precedent: `feat(<surface>): <terse summary>` for code commits, `docs(spec+plan): <terse summary>` for the round-close. Each commit message body names the audit findings or decisions it consumes (e.g. commit 1's body: "applies decisions E–I from `docs/plans/dashboard.md` §3 + audit-first findings 1–5"). Co-author trailer per the user's git convention.

**Branching.** This is a single-branch round (no nested feature branches). Commits land on `main` after each one is lint+typecheck-clean. No remote pushes from Claude.

## 6. Acceptance criteria

Mirrors PRD §15. The PRD's checklist is canonical; this section names how each item is verified during the round.

**Visual.**
- [ ] Dashboard renders at `/` matching the mockup. *Verified at commit 11 by Leo (per decision I).*
- [ ] Cobalt accent appears in exactly four places on first paint. *Verified at commit 11 by visual count: mission eyebrow, greeting italic, Goal value, today pace bar.*
- [ ] Serif (Newsreader) on: brand wordmark, greeting headline, every numeric value in stats and tiles, dojo card titles, mission title. *Verified at commit 11.*
- [ ] All other text is sans (Plus Jakarta Sans). *Verified at commit 11.*
- [ ] Belt stripes render with the right-edge cap visible against `--bg` (all 14 white in stub). *Verified at commit 11 in light + dark.*
- [ ] Both light and dark modes render without WCAG AA violations. *Verified at commit 11 via DevTools accessibility audit.*
- [ ] Drill post-session `<BeltIndicator>` looks unchanged from `8a10fb1` baseline. *Verified at commit 1 (after font swap) and commit 11 (after full polish) by side-by-side comparison.*

**Behavior.**
- [ ] Belt row → `/drill/{subTypeId}` (URL-encoded). *Verified at commit 7.*
- [ ] Mission primary → `/full-length/configure`. *Verified at commit 10.*
- [ ] Mission alternate → `/drill`. *Verified at commit 10.*
- [ ] Active nav highlighted; others quiet. *Verified at commit 9.*
- [ ] Streak chip neutral copy when `streakDays === 0`. *Verified at commit 6.*
- [ ] LastSim tile empty state when `lastSim` undefined. *Verified at commit 8.*
- [ ] ScoreStrip em-dashes for `current` and `daysToTest` when undefined. *Verified at commit 8.*
- [ ] Goal renders `40` (no `%`). *Verified at commit 8.*
- [ ] MistakesTile copy contains no spaced-review framing. *Verified at commit 8 via grep on the rendered text.*
- [ ] All five nav items resolve to a 200. *Verified at commit 4 (stubs) + commit 10 (dashboard) + commit 12 (click-through).*
- [ ] `/drill` (no segment) renders the migrated Mastery Map. *Verified at commit 3.*

**Constraints (non-negotiable).**
- [ ] `bun lint:all` passes (Biome + super-lint + GritQL). *Verified at commit 12.*
- [ ] `bun typecheck` passes. *Verified at commit 12.*
- [ ] Zero `try…catch` in new files. *Enforced by `rules/no-try.md`; lint-verified.*
- [ ] Zero `as` casts (other than `as const`). *Enforced by `rules/no-as-type-assertion.md`; lint-verified.*
- [ ] Zero `null` types in new files (only `?:` optional). *Enforced by `rules/no-null-undefined-union.md`; lint-verified.*
- [ ] One component per file under `src/components/dashboard/`; one helper per file under `src/server/dashboard/`. *Enforced by code review.*
- [ ] No `db:generate` / `db:push` / `db:migrate` run. *Verified at commit 2 — schema is added but not migrated.*
- [ ] No collision between `<BeltStripe>` and post-session `<BeltIndicator>`. *Verified at commit 6 (filename/export-name distinct).*

**Motion + a11y.**
- [ ] All transitions use `--ease-out`; durations `--d-fast` or `--d-base`. *Verified at commit 11.*
- [ ] `prefers-reduced-motion: reduce` honored (existing rule in `globals.css` carries). *Verified at commit 12.*
- [ ] Every interactive element has visible `:focus-visible` outline. *Verified at commit 12 via keyboard tab-through.*
- [ ] `aria-label` on `<BeltStripe>` and avatar. *Verified at commit 6 (BeltStripe) + commit 9 (avatar).*
- [ ] Visually-hidden `<h1>Dashboard</h1>` at top of `<main>`. *Verified at commit 10.*

## 7. Risks and known unknowns

- **Mockup divergence (decision I).** I haven't seen `dashboard_reference.png`. Commit 11 visual diff is the safety net; if a regression vs the mockup surfaces that the PRD prose didn't catch, it's a PRD bug, not a re-architect.
- **Font loading visual shift.** Swapping fonts at commit 1 is a global change; if Plus Jakarta Sans's metrics differ from Inter enough that any non-dashboard surface looks visibly different, fix at commit 11 (full-surface polish). PRD §12 names the audit ("If any non-dashboard surface still depends on the Geist/Inter wiring, namespace the fonts as `--font-sans-dashboard` instead").
- **`<MasteryMap>` link audit (PRD §11.5).** PRD names "anywhere a 'back to picker' or similar UI references `/`" as a rewrite target. Commit 3's verification step includes a grep across `src/` for in-app links to `/` whose semantic intent is "the picker." Post-session "Continue" CTAs land on `/` (= dashboard) — not a regression per PRD §11.5.
- **Token alias collisions (PRD §8.1).** The PRD's `--alpha-accent` rename (vs shadcn's `--accent`) avoids one collision but the broader audit at commit 1 should grep for any utility class that the new tokens inadvertently shadow. `bg-bg` (the `--bg` utility) in particular needs verification — Tailwind v4's JIT may have an opinion about a utility class named `bg-bg`. If it doesn't render, fall back to `bg-[var(--bg)]` arbitrary syntax for the affected surfaces.
- **Dark-mode pacing of the visual diff.** PRD requires both light and dark to be WCAG-AA-clean. Commit 12's diff covers this, but if the round-close finds dark-mode contrast issues that need a token retune, the retune of `--text-2` / `--text-3` / `--border-soft` is in dark-mode-only and doesn't risk the post-session `<BeltIndicator>` — those four tokens are dashboard-namespaced.
- **Decision G (users.name nullable).** Pending Leo's pick. If "validate-and-throw" is chosen, the dashboard surface is one redirect-or-throw away from a broken first-name read. If the upstream Auth.js Google adapter ever emits `null` for `name`, the dashboard 500s. This is a strict-correctness vs graceful-degradation tradeoff; my recommendation is throw, but Leo may prefer "Friend" for resilience.

## 8. Out of scope

Mirrors PRD §16 — restated here for completeness so this plan-doc is a self-contained round artifact.

- Real-data wiring of every helper. Stubs land per PRD §19; replacements are independent follow-up PRDs.
- Belt promotion/demotion logic (Belts PRD).
- Mission picker logic (Mission Picker PRD).
- Goal score persistence (Goal Score PRD).
- Active session screen (`/full-length/run` and `/drill/[subTypeId]/run` already exist).
- Post-sim review and post-session UI (already exist; not modified by this round).
- Lessons content, Stats deep-dive, Review surface (stub pages only this round).
- Spaced review (cut from v1; framing avoided in MistakesTile copy).
- Streak persistence and computation (Streaks PRD).
- Mobile design polish (PRD §13 covers "doesn't break"; full mobile design later).
- Settings, profile, onboarding flows.
- Score estimation algorithm (Sim Scoring PRD).

## 9. Stub-removal follow-ups

Mirrors PRD §19 — restated as the operational chain so post-round work has a clear sequencing.

| Order | Follow-up PRD | Replaces | Decision E touchpoint |
|---|---|---|---|
| 1 | Sim Scoring PRD | `computeScoreEstimate`, `getLastFullSim` | Decision E lands here — the helper comment in `score.ts` is the breadcrumb |
| 2 | Pace-Strip PRD | `computePaceWeek` | uuidv7-time-bound helper from `@/db/lib/uuid-time` for the range filter |
| 3 | Belts PRD | `loadAllBelts` + `user_sub_type_belts` migration | `db:generate` / `db:push` run here, not this round |
| 4 | Goal Score PRD | `STUB_GOAL_SCORE` in `loadUserProfile` | Decides whether to replace `users.target_percentile`, alias to it, or add new column |
| 5 | Mission Picker PRD | `pickTodaysMission` | Weakness-analysis ranking (`frequency_on_real_test × (1 - accuracy_at_pace)`) |
| 6 | Streaks PRD | `computeStreak` | Defines what counts as a "practice day" |
| 7 | Mistakes PRD | `countMistakes` + stubbed `/review` page | Wrong-answer review UI |
| 8 | Lessons PRD | stubbed `/lessons` page | Content authoring + lesson framework |
| 9 | Stats PRD | stubbed `/stats` page | Analytics surface design + queries |

After all nine land, the dashboard is fully real-data and zero stubs remain. None of them are blocked by this round; this round's job is to ship the render layer + stub layer such that each follow-up is a one-helper, one-file replacement.
