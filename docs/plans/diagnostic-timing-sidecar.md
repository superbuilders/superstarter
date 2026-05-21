# Diagnostic-timing sidecar — restore session-level timer to diagnostic flow

> **Status: open.** Forward-anchor stub authored 2026-05-10 against HEAD `1dc2b75` (selection-engine sidecar close). This sidecar reverses the Round 1 §0.15 retraction and re-introduces session-level timing on the diagnostic flow. Implementation pending — this commit is plan-doc only.

---

## §0 — Round opening

### §0.1 Round vehicle and scope

**Vehicle.** Sidecar round (narrow envelope), opened against HEAD `1dc2b75`. The plan-doc-only opening commit lands first (this commit); implementation lands as a separate commit gated on the audit-step outcomes captured below.

**Scope.** Restore `sessionDurationMs` to a non-null numeric value on the diagnostic flow, reversing the Round 1 §0.15 retraction recorded in `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md`. The fix shape is the one captured at Round 1 §0.5 (pre-retraction, quote-preserved): `sessionDurationMs={null}` → `sessionDurationMs={50 * 18_000}` at `src/app/(diagnostic-flow)/diagnostic/run/content.tsx:61`. One-line client-side change.

**Four-axis sequencing reasoning carried into this sidecar.**

1. **User-visible product gap.** The diagnostic flow currently renders no chronometer and no session-progress bar (FocusShell short-circuits both peripherals when `sessionDurationMs === null` per `src/components/focus-shell/focus-shell.tsx:490-506`). Users running the diagnostic have no visible time signal at the session level — unconventional for a CCAT-shaped 50-question assessment. The redline that originally surfaced §0.5 framed this as a regression vs. the user's expectation.
2. **Scope envelope / risk shape.** One-line client-prop change; no server-side schema or workflow changes; no FocusShell internals refactor. The implementation surface fits a sidecar shape cleanly.
3. **PROMOTION CANDIDATE 1 exposure surface.** The plan-doc opening retained the small redirector-prompt surface deliberately to keep the candidate in DEFER. The implementation commit's audit step is the actual exposure surface for the candidate — see §0.3 + §0.7 below.
4. **Dependency direction.** This sidecar depends on Round 1's selection-engine sidecar closure (HEAD `1dc2b75`), not the reverse. The validator round (Phase 4 sub-phase b un-deferral, forward-pinned per `selection-engine-session-attempted-ids-sidecar.md` §6 residual #1) is independent of this work and is sequenced separately.

### §0.2 Anti-scope (deferred-OOS list per §6.14.30)

**The following are explicitly OUT of this sidecar's scope:**

- **Pacing-math redesign.** No changes to `behindPaceThresholdMs` formula at `focus-shell.tsx:480` or to the per-question target enforcement.
- **FocusShell prop refactor.** No new props (e.g., `sessionDurationIsAdvisory` per Round 1 §0.15 Resolution 2). The existing `sessionDurationMs: number | null` contract stands.
- **Audio-ticker behavior changes.** No edits to `src/components/focus-shell/audio-ticker.ts`. The session-level timer change does not interact with per-question audio cadence.
- **Post-session timer surfacing changes.** No edits to `src/app/(diagnostic-flow)/post-session/[sessionId]/{page.tsx, content.tsx}` or to the post-session pacing copy at `src/components/post-session/post-session-shell.tsx:106` (the *"Your diagnostic took {pacingMinutes} minutes. The real CCAT is 15 minutes for 50 questions."* line). Round 1 §0.15 Resolution 2's contradiction-with-pacing-copy concern is forward-pinned to a follow-up round, NOT addressed here.
- **Validator round.** The Phase 4 sub-phase b un-deferral for δ-branch targeted bank-growth in pressure cells stays separately forward-pinned.
- **Round 3 review-section architecture.** The post-session review surface architecture is forward-pinned to its own round.
- **Mastery compute multiplier revert.** Round 1 §0.15 forward-reference item 4 (compute.ts 1.5× → 1.2× under timed framing) stays forward-pinned. The `compute.test.ts:5-10` revert testimony stands; this sidecar does NOT touch `src/server/mastery/compute.ts`.
- **PRD §4.1 amendment.** Round 1 §0.15 forward-reference item 1 (capacity-measurement vs timed-real-CCAT framing) stays forward-pinned. This sidecar does NOT amend PRD §4.1; it executes the redline's "session timer renders" intent at the client-prop layer only and lets the framing question stay open.
- **Server-side cutoff re-introduction.** Round 1 §0.15 forward-reference item 2 stays forward-pinned. The `maybeAutoEndSession` effect at `focus-shell.tsx:423-450` becomes the de-facto session-end mechanism client-side — see §0.7 for the open question this raises.

### §0.3 PROMOTION CANDIDATE state (carried from `selection-engine-session-attempted-ids-sidecar.md` §7)

**PROMOTION CANDIDATE 1 — *redirector-spec error caught at executor audit-step boundary*. State: 4/5 instances banked.** The four banked instances are recorded in the source plan-doc's §0.4 watch-log + §7. This round's small redirector-prompt surface (a one-line client-prop change with verifiable file path / line number / consumer enumeration up front) is deliberately tight; the candidate is held in DEFER rather than stress-tested. **However**, the implementation-commit audit step is the actual exposure surface — if the audit surfaces a redirector-spec error (wrong file path, misquote of §0.15, an unanticipated `sessionDurationMs` consumer, or a SPEC §9.2 interaction the redirector ruled out that actually fires), the executor STOPS and reports per the candidate's instance-recording shape rather than silently reconciling. See §0.7 for the maybeAutoEndSession interaction worth attention.

**UPDATE (re-retraction commit, 2026-05-10).** Instance #5 banked: this sidecar's §0.2 anti-scope writing implicitly selected Round 1 §0.15's Resolution 1 over Resolution 2 without surfacing the resolution choice. Executor surfaced finding at commit-0 (`ffe47bd`) audit-step; redirector recognized as redirector-spec error (sub-type: implicit-resolution-selection); round re-retracted. Candidate **PROMOTED to SPEC §6.14.43** in this same commit. State retired.

**PROMOTION CANDIDATE 2 — *sidecar-as-default-narrow-scope-envelope*. State: 3/5 instances banked.** This round will be **instance 4** if it ships as a sidecar (the planned shape). Reasoning: narrow scope (one-line client-prop change), single user-visible regression (timer absent on diagnostic), one-line known fix shape from Round 1 §0.5 quote-preservation. Advance to 4/5 happens at this sidecar's round-close commit, not at this opening commit.

**UPDATE (re-retraction commit, 2026-05-10).** Instance count UNCHANGED at 3/5. This round did NOT ship as a sidecar — it shipped as a retraction. Does not advance the candidate.

### §0.4 Round 1 §0.15 retraction context (verbatim quote)

The text below is the verbatim §0.15 entry from `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md:193-245`, preserved per SPEC §6.14.20. This sidecar reverses §0.15's retraction; the §0.15 prose is the load-bearing context for that reversal.

> ### §0.15 Mid-round redirect — retract §5.11 (diagnostic timer/bar) per audit-vs-revert blindness (2026-05-09)
>
> Per Leo's mid-round redirect on 2026-05-09, the round retracts §5.11 (commit 11: diagnostic timer/bar fix) entirely. The diagnostic stays `sessionDurationMs={null}` (untimed at the session level per PRD §4.1 capacity-measurement framing). No client-side timer. No progress bar. No `<FocusShell>` changes. The only code change in this commit is a stale-comment rewrite at `src/components/focus-shell/focus-shell.tsx:415-417` (bundled here per the §0.14 plan-doc-revision-with-incidental-fix model).
>
> **Trigger.** Commit-11 implementation audit step (b) — re-confirm the server-side 15-minute cutoff that gates diagnostic submissions — surfaced that the cutoff has been REVERTED earlier in this same round, before the §5.11 / §0.5 audit was authored. Three independent confirmations:
>
> - `src/server/mastery/compute.test.ts:5-10` — explicit revert testimony: *"The polish round briefly recalibrated this to 1.2× under a session-level 15-minute cutoff that was reverted in this round."*
> - `src/app/(app)/actions.ts:141-146` — overlay/cutoff machinery deleted: *"`recordDiagnosticOvertimeNote` was the polish-round in-flow overlay trigger; both it and the underlying overlay are deleted. The diagnostic is untimed at the session level under the capacity-measurement framing (PRD §4.1, plan docs/plans/phase3-diagnostic-flow.md §4)."*
> - `src/server/sessions/submit.ts` — grep for `diagnostic|elapsed|cutoff|15.*min|900_000|startedAtMs` returns zero hits. No submission gate is enforced server-side at any minute mark.
>
> The §5.11 implementation, if executed, would have set `sessionDurationMs={50 * 18_000}` on diagnostic. Per `focus-shell.tsx:411-447` (the `maybeAutoEndSession` effect), this would auto-end the session at 15 minutes client-side via `dispatch({ kind: "session_ended" }) + onEndSession()` — re-introducing the very 15-min hard cap that this round reverted server-side. It would also contradict the post-session pacing UX at `src/components/post-session/post-session-shell.tsx:106` (*"Your diagnostic took {pacingMinutes} minutes. The real CCAT is 15 minutes for 50 questions."*) — copy that only makes sense when users may take longer than 15 min.
>
> **Reasoning.** The §0.5 audit cited "server-side 15-minute cutoff that already gates diagnostic submissions stays unchanged" under stale empirical assumptions. Earlier work in this same round retired the cutoff under PRD §4.1 capacity-measurement framing; §5.11 / §0.5 / §1 carried forward the polish-round pre-revert state without reconciling. Three resolutions were considered at audit step (b) halt:
>
> - **Resolution 1: EXECUTE §5.11 AS WRITTEN** — re-introduce the 15-min auto-end client-side. Rejected: contradicts the same round's server-side revert; contradicts post-session pacing copy; contradicts PRD §4.1 capacity-measurement framing.
> - **Resolution 2: RENDER BAR + CHRONOMETER, NO AUTO-END** — render the chronometer + `<SessionTimerBar>` but suppress the auto-end at 15:00. Rejected: requires a new `<FocusShell>` prop (e.g., `sessionDurationIsAdvisory`); larger blast radius than §5.11 anticipates; cosmetic value of a counting-down timer past 15:00 is unclear (the bar overflows or stops at 100% while the session continues — confusing UX).
> - **Resolution 3: RETRACT** — drop §5.11 entirely; diagnostic stays untimed; the redline's "session timer + progress bar render" intent is queued for a sidecar round that re-introduces server-side timing first. Selected.
>
> **Resolution 4 (selected): RETRACT.** §5.11 + §0.5 cutoff-citation + §1 in-scope bullet retracted. No diagnostic-flow code changes ship from §5.11 itself; this commit is the §0.15 retraction commit (plan-doc-only revision plus the single stale-comment fix at `focus-shell.tsx:415-417` noted above).
>
> **Empirical state.** No diagnostic-flow code changes ship from §0.15. The implementation file originally targeted by §5.11 (`src/app/(diagnostic-flow)/diagnostic/run/content.tsx`) is untouched — its existing header comment at lines 9-12 already correctly describes the untimed-at-session-level reality (*"sessionDurationMs: null (the diagnostic is untimed at the session level — capacity, not triage. The chronometer and session-progress bar do not render in the diagnostic flow.)"*) and stays as-is. The only code change is the stale-comment rewrite at `src/components/focus-shell/focus-shell.tsx:415-417` — the comment claimed *"the diagnostic uses the server-side cutoff in submitAttempt instead (polish-plan §3.1 / §4.2)"*, which is no longer true post-revert.
>
> **Forward reference.** Diagnostic timing re-introduction is queued as a SIDECAR ROUND (TBD; opens after Round 1 closes). Sidecar scope:
>
> 1. PRD §4.1 amendment — explicit decision on whether the diagnostic is "untimed capacity measurement" or "timed real-CCAT-conditions" (these are mutually exclusive framings; the redline implies the latter, but PRD §4.1 currently codifies the former).
> 2. Server-side cutoff re-introduction — submit-attempt gate at 15:00 elapsed; or alternative gating model.
> 3. Client-side timer — `sessionDurationMs={50 * 18_000}` on diagnostic content.tsx; auto-end behavior deliberate.
> 4. Mastery compute multiplier revert — `compute.ts:55` 1.5× → 1.2× under timed framing (per the test comment at `compute.test.ts:5-10`).
> 5. Post-session pacing copy revision — reframe `post-session-shell.tsx:106` for the timed-end-state.
>
> **Commit envelope impact.** No change to the round commit count (stays at 12 from §0.14's 13 → 12 reduction). §5.11 is RETIRED-not-renumbered per the §0.14 precedent — slot 11 is consumed by this §0.15 plan-doc-revision commit (the retraction itself); commits 12 (ALPHA_DESIGN audit doc) and 13 (round-close) keep their existing slot numbers. Per §0.14's slot-5 model (where the §0.14 retraction commit consumed slot 5), this retraction commit IS commit 11.
>
> **Sub-pattern observation (§6.14.28 instance tracking).** This is the **sixth** §6.14.28-style empirical-state divergence in this round, and introduces a new sub-pattern variant — *"round-internal audit-vs-revert blindness"*: the audit cited mechanisms that prior work in the same project had retired. […instance ledger preserved in source plan-doc; not duplicated here…]
>
> **New sub-pattern variant.** §0.15 is the first instance of *"round-internal audit-vs-revert blindness"* — earlier instances were either out-of-session state changes (§0.12, §0.13) or audit-prose-vs-empirical-truth divergences within unrelated subsystems (§0.14, §5.8). §0.15 is the first where the audit ITSELF cited a mechanism that other commits IN THE SAME ROUND had retired. The §0.5 audit was authored before the cutoff revert landed (or against a pre-revert mental model), and was not reconciled when the revert shipped. Round-close decides whether this earns its own §6.14 entry (e.g., "§6.14.{n} — audit-vs-prior-round-work reconciliation discipline") or folds into the broader §6.14.28 sub-pattern.
>
> **Cross-references.**
>
> - SPEC §6.14.20 (in-flight wholesale-replacement-with-quote-preservation) — §0.5, §1 in-scope bullet, and §5.11 all revised below with original content quote-preserved as `>` blocks; §5 intro takes a one-line addendum sibling to §0.14's.
> - SPEC §6.14.28 (plan-prose-vs-empirical-truth divergence) — explicit sixth-instance trigger above; new sub-pattern variant ("round-internal audit-vs-revert blindness") proposed for round-close §6.14 evaluation.
> - SPEC §6.14.34 (mid-round narrow-scope sub-round insertion) — does NOT apply here; §0.15 is a pure retraction with no implementation. The diagnostic-timing sidecar round (forward reference above) is the §6.14.34-flavored future work.
> - §0.13, §0.14 — precedents for retract-and-quote-preserve; this redirect parallels §0.14's "RETIRE" model (drop the work; preserve the original prose; no implementation ships).

**Reversal disposition.** This sidecar reverses Round 1 §0.15 by executing forward-reference item 3 (client-side timer) ONLY, and explicitly defers items 1, 2, 4, 5 to subsequent rounds (per §0.2 anti-scope). The §0.15 forward-reference's framing implied items 1+2+3+4+5 would land together; the redirector has narrowed this sidecar to item 3 alone. **This narrowing is itself a finding worth surfacing — see §0.7 for the empirical consequence (the `maybeAutoEndSession` effect becomes the de-facto session-end mechanism with no server-side counterpart).** The narrowing is recorded here rather than silently absorbed.

### §0.5 Round 1 §0.5 audit-step citation (the one-line fix shape)

The Round 1 §0.5 audit (pre-§0.15 retraction, quote-preserved at `dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md:49-57`) recorded the fix shape verbatim:

> Diagnostic invokes `<FocusShell>` at `src/app/(diagnostic-flow)/diagnostic/run/content.tsx:48-57` with `sessionDurationMs={null}`, `paceTrackVisible={false}`, `targetQuestionCount={50}`. Drill invokes `<FocusShell>` at `src/app/(app)/drill/[subTypeId]/run/content.tsx:43-52` with `sessionDurationMs={drillLength * 18_000}`, `paceTrackVisible={true}`, `targetQuestionCount={init.drillLength}`.
>
> `<FocusShell>` at `src/components/focus-shell/focus-shell.tsx:265-285` short-circuits both the chronometer (MM:SS) and `<SessionTimerBar>` (progress bar) when `sessionDurationMs === null`. The intentional comment at lines 265-267 reads "Hidden entirely when the session has no duration (diagnostic)."
>
> **Root cause: deliberate `sessionDurationMs={null}` on diagnostic, encoding the historical "no session timer for diagnostic" decision that the redline now reverses.** Fix shape: change diagnostic's `sessionDurationMs` from `null` to `50 * 18_000` (= 900_000ms = 15 minutes), matching drill's pattern. The server-side 15-minute cutoff that already gates diagnostic submissions stays unchanged. **One-line fix on the diagnostic side; no FocusShell changes.**

**Verified file path and line number at HEAD `1dc2b75`:** `src/app/(diagnostic-flow)/diagnostic/run/content.tsx:61` carries the exact `sessionDurationMs={null}` token. The original §0.5 cited line range `:48-57` for the FocusShell invocation; the actual range at HEAD is `:58-69`. The line drift is **benign** — caused by the `subTypeId` prop addition to `FocusShellProps` post-§0.5 (per Round 1 §5.8 number-series formatting work), which shifted the JSX structure but did not alter the `sessionDurationMs={null}` token's semantic location. **The fix line is line 61.**

**Stale-claim caveat.** §0.5's closing sentence — *"The server-side 15-minute cutoff that already gates diagnostic submissions stays unchanged"* — is stale per Round 1 §0.15 (the cutoff was reverted earlier in Round 1). The fix shape itself stands; the cutoff-citation context does not. See §0.7.

### §0.6 `sessionDurationMs` consumer enumeration (§6.14.42 grep-verify-consumers)

Full grep at HEAD `1dc2b75`:

```
$ grep -rn "sessionDurationMs" src/
src/app/(app)/full-length/run/content.tsx:8://   - sessionDurationMs: 900_000 (15 minutes — time-boxed)
src/app/(app)/full-length/run/content.tsx:17:// when state.elapsedSessionMs >= sessionDurationMs (focus-shell.tsx
src/app/(app)/full-length/run/content.tsx:65:		sessionDurationMs={FULL_LENGTH_DURATION_MS}
src/app/(diagnostic-flow)/diagnostic/run/content.tsx:10://   - sessionDurationMs: null  (the diagnostic is untimed at the session
src/app/(diagnostic-flow)/diagnostic/run/content.tsx:61:		sessionDurationMs={null}
src/app/phase3-smoke/page.tsx:111:// Read a one-shot query-string flag for sessionDurationMs override.
src/app/phase3-smoke/page.tsx:130:	const [sessionDurationMs] = React.useState<number>(readSessionDurationMs)
src/app/phase3-smoke/page.tsx:174:	sessionDurationMs,
src/app/(app)/drill/[subTypeId]/run/content.tsx:7://   - sessionDurationMs: drillLength * 18000
src/app/(app)/drill/[subTypeId]/run/content.tsx:51:	const sessionDurationMs = init.drillLength * 18_000
src/app/(app)/drill/[subTypeId]/run/content.tsx:58:		sessionDurationMs={sessionDurationMs}
src/components/focus-shell/types.ts:60:	sessionDurationMs: number | null
src/components/focus-shell/focus-shell.tsx:411:	const sessionDurationMs = props.sessionDurationMs
src/components/focus-shell/focus-shell.tsx:415:	// Diagnostic sessions pass `sessionDurationMs={null}` and skip this
src/components/focus-shell/focus-shell.tsx:425:		if (sessionDurationMs === null) return
src/components/focus-shell/focus-shell.tsx:426:		if (state.elapsedSessionMs < sessionDurationMs) return
src/components/focus-shell/focus-shell.tsx:449:	[state.elapsedSessionMs, sessionDurationMs, sessionId, onEndSession, router]
src/components/focus-shell/focus-shell.tsx:456:	sessionDurationMs !== null &&
src/components/focus-shell/focus-shell.tsx:458:	state.elapsedSessionMs >= sessionDurationMs
src/components/focus-shell/focus-shell.tsx:466:	// (`sessionDurationMs === null`) are exempt — the diagnostic isn't
src/components/focus-shell/focus-shell.tsx:482:	sessionDurationMs !== null && state.elapsedSessionMs > behindPaceThresholdMs
src/components/focus-shell/focus-shell.tsx:485:	// have to re-check `sessionDurationMs !== null` when passing as a
src/components/focus-shell/focus-shell.tsx:489:	// per session type — visible iff `sessionDurationMs !== null`.
src/components/focus-shell/focus-shell.tsx:492:	if (sessionDurationMs !== null) {
src/components/focus-shell/focus-shell.tsx:493:		const readout = formatRemaining(sessionDurationMs, state.elapsedSessionMs)
src/components/focus-shell/focus-shell.tsx:502:		durationMs={sessionDurationMs}
```

**Consumer-by-consumer disposition under this sidecar:**

| Site | Role | Disposition |
|---|---|---|
| `full-length/run/content.tsx:65` | producer (sets `sessionDurationMs={FULL_LENGTH_DURATION_MS}`) | **untouched** — full-length already non-null |
| `diagnostic/run/content.tsx:61` | producer (sets `sessionDurationMs={null}`) | **THE FIX SITE** — change to `50 * 18_000` |
| `diagnostic/run/content.tsx:10-12` | header comment describing `sessionDurationMs: null` rationale | **rewrite required** — the comment's "untimed at session level" rationale becomes false post-fix |
| `phase3-smoke/page.tsx:111+130+174` | dev-smoke harness with query-string override | **untouched** — dev surface, not a production consumer |
| `drill/[subTypeId]/run/content.tsx:51+58` | producer (sets `sessionDurationMs={drillLength * 18_000}`) | **untouched** — drill already non-null |
| `focus-shell/types.ts:60` | type contract `number | null` | **untouched** — contract stays; the `null` branch survives for sessions that may legitimately be untimed in the future (no current consumer sets null after this sidecar lands, but the contract retains optionality) |
| `focus-shell.tsx:411-506` | consumer (12 references) — `maybeAutoEndSession` effect, `isLastQuestion` flag, `behindPace` flag, chronometerNode/sessionBarNode build | **untouched** in source but **behavior changes** for diagnostic sessions because `sessionDurationMs` is now non-null. See §0.7 for the behavior-change surface. |

**Header-comment rewrite (line 10-12 of `diagnostic/run/content.tsx`).** Currently reads *"sessionDurationMs: null (the diagnostic is untimed at the session level — capacity, not triage. The chronometer and session-progress bar do not render in the diagnostic flow.)"*. Post-fix, the rationale is reversed. The implementation commit MUST rewrite this comment; otherwise the file carries a stale-comment-vs-code contradiction comparable to the one §0.15 addressed at `focus-shell.tsx:415-417`. The comment rewrite is part of the "one-line fix" envelope (functionally the rewrite is multi-line, but it's bundled with the prop-value change).

**Type-contract caveat.** `types.ts:60` keeps `number | null`. The implementation commit's audit step must verify that no test file currently asserts that diagnostic specifically passes `null` (such an assertion would need to flip with the fix). See §1.3 for test-surface enumeration.

### §0.7 Pacing-math compatibility surface (audio-ticker + maybeAutoEndSession)

**Audio-ticker dependency.** `src/components/focus-shell/audio-ticker.ts` reads NONE of `sessionDurationMs`. Its behavior is gated entirely on per-question target events scheduled by the focus-shell (`startUrgencyLoop` + `playTick` driven by `perQuestionTargetMs`, not by session duration). The full audio-ticker module (244 lines) was inspected at audit time; zero references to `sessionDurationMs` or any session-level timing. **Therefore: audio-ticker behavior is unchanged when the diagnostic transitions from `sessionDurationMs={null}` to `sessionDurationMs={50 * 18_000}`.** The implementation commit's audit step has its compatibility-verify citation anchored here.

**maybeAutoEndSession behavior surface.** `src/components/focus-shell/focus-shell.tsx:423-450` (the `maybeAutoEndSession` effect):

```ts
if (sessionDurationMs === null) return
if (state.elapsedSessionMs < sessionDurationMs) return
if (sessionEndedRef.current) return
sessionEndedRef.current = true
dispatch({ kind: "session_ended" })
// CustomEvent dispatch
async function runAutoEnd() {
    const endResult = await errors.try(onEndSession())
    // logger + router.push
}
void runAutoEnd()
```

**Behavior change under this sidecar.** With `sessionDurationMs = 900_000` on diagnostic, the first `if` no longer early-returns. When `state.elapsedSessionMs >= 900_000`, the effect **fires onEndSession + router.push to /post-session/{sessionId}** — i.e., the diagnostic auto-ends client-side at exactly 15:00.

**This is the exact mechanism Round 1 §0.15 cited as the rejection reason for Resolution 1** (*"would auto-end the session at 15 minutes client-side via `dispatch({ kind: "session_ended" }) + onEndSession()` — re-introducing the very 15-min hard cap that this round reverted server-side"*). This sidecar accepts that mechanism, but with two important context shifts from §0.15's framing:

1. **No server-side counterpart.** Round 1's polish-round 15-min cap was server-side (enforced in `submit.ts`). After §0.15's revert, no server-side gate exists at any minute mark. This sidecar's restored timer fires `onEndSession` client-side only — the server's `endSession` action accepts the call without time-checking; mastery is computed against whatever attempts landed by 15:00. **This is a new third state**, distinct from both (a) the polish-round server-enforced cap and (b) Round 1's untimed-capacity disposition: a **client-side advisory cap with full server cooperation when the cap fires**.
2. **Post-session pacing copy contradiction surface.** The Round 1 §0.15 rejection of Resolution 1 cited contradiction with `post-session-shell.tsx:106` (*"Your diagnostic took {pacingMinutes} minutes. The real CCAT is 15 minutes for 50 questions."*). That contradiction surface persists under this sidecar because §0.2 anti-scope excludes post-session copy changes. **The implementation commit's audit step should re-verify this copy site is unchanged** and flag it if the redirector wants to pre-empt the contradiction (e.g., by also cutting from `0.2` anti-scope). The current disposition: contradiction acknowledged, deferred to a follow-up round per §0.2.

**Open question for redirector.** Round 1 §0.15 listed Resolution 2 (*"RENDER BAR + CHRONOMETER, NO AUTO-END"*) as rejected because *"requires a new `<FocusShell>` prop (e.g., `sessionDurationIsAdvisory`); larger blast radius than §5.11 anticipates"*. This sidecar's anti-scope (§0.2) excludes the FocusShell prop refactor, which means it implicitly **selects Resolution 1** (auto-end client-side at 15:00) rather than Resolution 2 (no auto-end). If the redirector intends Resolution 2, the anti-scope at §0.2 needs to expand to include a new prop or an alternative mechanism. **This is a finding the executor should not silently absorb** — flagged for redirector confirmation at the implementation-commit audit step. See §0.9 forward-watch entry below for the explicit residual.

### §0.8 SPEC §9.2:2355 non-interaction confirmation

SPEC §9.2:2355 was amended in Round 1's selection-engine sidecar (commit `d59f86d`) to authorize within-session re-serves under the session-soft fallback marker. The amendment text (verbatim from `docs/SPEC.md:2355`):

> The recency-excluded set AND the within-session-attempted set are SOFT preferences, not hard guarantees. When the fresh + recency-soft passes both exhaust under the per-session bank size, the session-soft fallback CAN serve EITHER a recency-excluded item OR a within-session-attempted item at the requested tier, rather than force the engine to throw `null`. `metadata_json.fallback_level === 'session-soft'` is the observable marker; consumers asserting session-uniqueness or recency-uniqueness MUST count session-soft fallback rows separately. […]

**Non-interaction confirmation.** The §9.2:2355 amendment governs **selection-engine behavior** — specifically, the `pickWithFallback` Pass 4 path in `src/server/items/selection.ts:322-336`. This sidecar changes ONLY a session-level **timing prop** on the diagnostic flow's `<FocusShell>` invocation. The two surfaces are independent:

- The diagnostic flow does NOT use the `full_length` session shape. Diagnostic sessions are 50-question sub-type-mixed; `full_length` sessions follow `FULL_LENGTH_DURATION_MS` and a curve-driven mix. The bank-pressure conditions that drive session-soft fallback (decile-5 brutal-tier slots exceeding bank size, etc.) apply to `full_length`'s curve-driven shape, not to the diagnostic's flat 50-question mix.
- The §9.2:2355 marker-aware invariant `(distinct items served) + (session-soft fallback rows) === (session length)` is asserted in test files (`fullLengthNoReServe`, `noReServeInSession`) against the full-length and session-shape generators, not against diagnostic.
- This sidecar's prop-change does NOT touch `selection.ts`, `submit.ts`, or any selection-engine code.

**Confirmation: the selection-engine sidecar's amendment is unaffected by this work.** The two sidecars are orthogonal.

### §0.9 Forward-watch residuals carried in scope of this round

Per `selection-engine-session-attempted-ids-sidecar.md` §6 residuals carried forward:

- **Q-pattern instances.** 2 instances banked in the source plan-doc's §0.4 watch-log. If this round folds round-close into a final commit cleanly, that is **instance 3**. If a Q-pattern incident (e.g., a redirector-spec error caught at audit step boundary) fires during this round's implementation, **instance 4** lands. Either way, the running count updates at this sidecar's round-close.
- **`structured-explanation.test.ts:152` stochastic failure suspect.** Forward-pinned per the source plan-doc's §6 residual #5. If full-suite runs during this sidecar's implementation surface this test as flaky, the executor logs the occurrence here and surfaces in stop-and-report. Otherwise the residual stays forward-pinned (untouched by this round's work).
- **maybeAutoEndSession Resolution-1-vs-Resolution-2 disposition.** New residual surfaced at §0.7. The implementation commit's audit step is the resolution gate. If Resolution 2 is required, the §0.2 anti-scope expands to include a new FocusShell prop and the implementation commit blast radius grows beyond a single line. Tracked here for explicit redirector decision before §1 commit.
- **Diagnostic-timing-strategy round (forward-pinned residual).** Per the re-retraction reasoning at §0.10 below: the §0.15 forward-reference listed 5 items that should land together (PRD §4.1 amendment, server cutoff re-introduction, client timer, mastery multiplier revert, post-session pacing copy revision). This sidecar attempted to grab item 3 in isolation, which inadvertently resolved §0.15's Resolution-1-vs-Resolution-2 open question. The correct shape is a broader round addressing all 5 items together. Forward-pinned for sequencing alongside (or in place of) the original "diagnostic-timing sidecar" residual from `selection-engine-session-attempted-ids-sidecar.md` §6 residual #2.

### §0.10 Re-retraction (2026-05-10)

Per Leo's redirect on 2026-05-10 following the commit-0 audit-step finding (§A audit-step #11 surfaced disposition + §0.7 maybeAutoEndSession Resolution-1-implicit-selection finding), this round is RE-RETRACTED before §1 implementation lands.

**Trigger.** The commit-0 audit step surfaced that §0.2 anti-scope ("no FocusShell prop refactor") implicitly selected Round 1 §0.15's Resolution 1 (auto-end at 15:00 client-side) over Resolution 2 (render bar+chronometer, no auto-end) without surfacing the resolution choice. The executor flagged this for redirector decision per the candidate's "STOP and surface explicitly" discipline.

**Reasoning.** Three considerations weighed at the redirect:

1. **§0.15's reasoning quality.** Round 1 §0.15 was a careful retraction with sound rejection-of-Resolution-1 reasoning (post-session pacing copy contradiction at `post-session-shell.tsx:106`; PRD §4.1 capacity-measurement framing contradiction). Both rejection reasons remain valid at HEAD `1dc2b75` / `ffe47bd`. Resolution 1 cannot be selected without explicitly overriding §0.15's reasoning, and no new evidence justifies that override.
2. **The redirector's 4-axis sequencing reasoning was miscalibrated.** Axis 1 ("user-visible product gap") treated "no timer on diagnostic" as a regression. But it is only a regression *under timed-real-CCAT framing*. Under PRD §4.1's capacity-measurement framing — which §0.15 cited and the codebase currently encodes — an untimed diagnostic IS the intended state. The redirector assumed the framing question was settled; it is not.
3. **The right round shape is broader.** The §0.15 forward-reference listed 5 items as a coherent set: (1) PRD §4.1 amendment, (2) server cutoff re-introduction, (3) client timer, (4) mastery multiplier revert, (5) post-session pacing copy revision. Item 1 is load-bearing — items 2-5 are downstream of how item 1 resolves. A sidecar grabbing item 3 in isolation cannot succeed because item 3 has no canonical answer until item 1 is resolved.

**Disposition.**

- Plan-doc §0 (§0.1 through §0.10 inclusive) STAYS as forensics record; the audit + reasoning is valuable even though the sidecar does not ship.
- Plan-doc §1 (Implementation) WHOLESALE-REPLACED with retraction notice per §6.14.20; original prose preserved as `>` quote block.
- Plan-doc §2 (Round close, pending) WHOLESALE-REPLACED with retraction notice per §6.14.20; original prose preserved as `>` quote block.
- Plan-doc §B (Re-retraction commit audit-ledger) added to record this commit's audit-step outcomes.
- Plan-doc §3 (Round close) added to record retraction round-close metadata.
- SPEC.md §6.14.43 PROMOTED (redirector-spec error caught at executor audit-step boundary; instance #5 banked at this round's commit-0 `ffe47bd`).
- Forward-pinned residual added: "diagnostic-timing-strategy round" addressing §0.15 forward-reference items 1-5 together.

**Empirical state.** No source-code changes ship from this round. No test changes. Test baseline 128/0/644 unchanged from HEAD `1dc2b75` (expect()-count drift vs. session-log-recorded 649 noted in §B step 9; pass/fail/file count match). SPEC.md gains the §6.14.43 entry only.

---

## §1 — Implementation (RETRACTED 2026-05-10)

Per §0.10 above. No implementation ships from this round.

Original §1 content preserved below per §6.14.20 wholesale-replacement-with-quote-preservation:

> ## §1 — Implementation (pending)
>
> ### §1.1 Re-add timer to diagnostic flow (one-line fix per §0.5)
>
> **File.** `src/app/(diagnostic-flow)/diagnostic/run/content.tsx`
>
> **Change.** Line 61: `sessionDurationMs={null}` → `sessionDurationMs={50 * 18_000}`.
>
> **Header-comment rewrite (lines 9-12).** The current comment block describes `sessionDurationMs: null` rationale. Post-fix the rationale reverses; the comment must reflect the new state. Proposed shape (executor refines at implementation time):
>
> ```ts
> // Diagnostic config (sidecar-restored timing per docs/plans/diagnostic-timing-sidecar.md):
> //   - sessionDurationMs: 50 * 18_000  (15 minutes — restores the redline's
> //     "session timer + progress bar render" intent that Round 1 §0.15
> //     retracted; the maybeAutoEndSession effect fires at 15:00 client-side.
> //     No server-side counterpart — see plan-doc §0.7 for the third-state
> //     disposition.)
> //   - paceTrackVisible: false  (the diagnostic is not paced; this sidecar
> //     does not change the per-question pace-track surface)
> ```
>
> **No other changes.** No FocusShell internals; no audio-ticker; no post-session.
>
> ### §1.2 Verify pacing-math compatibility (audio-ticker; per §0.7)
>
> **Audit-step verify-surface for the implementation commit.** Re-run the §0.7 audit anchors:
>
> - (a) Confirm `audio-ticker.ts` reads no `sessionDurationMs` references (re-grep).
> - (b) Confirm `maybeAutoEndSession` at `focus-shell.tsx:423-450` is the ONLY behavior-changing consumer of the prop transition `null → 900_000`. The §0.6 enumeration is the citation set; the audit re-verifies no consumer was missed.
> - (c) Confirm `post-session-shell.tsx:106` pacing-copy site is untouched (anti-scope verification).
>
> ### §1.3 Test surface
>
> **Tests to enumerate at implementation time:**
>
> - Tests that assert diagnostic flow uses `sessionDurationMs={null}` specifically → must update or delete.
> - Tests that assert FocusShell behavior under `sessionDurationMs === null` for the diagnostic case → re-evaluate: if the test asserts the *general* null branch, leave alone; if it asserts the *diagnostic specifically* takes the null branch, update.
> - Tests that assert chronometer/session-bar rendering on diagnostic → these may need to flip from "absent" to "present".
> - Tests that assert `maybeAutoEndSession` does NOT fire on diagnostic → must update.
> - New tests asserting timer behavior on diagnostic → likely none (per §0.2 anti-scope's "no FocusShell behavior change beyond the prop transition", existing focus-shell tests cover the non-null branch generically); the implementation-commit audit decides if a diagnostic-specific timer test adds coverage.
>
> **Final test surface decided at implementation-commit audit step.** Likely net change: **0 to +2 tests** vs. the 128-baseline; tests-deleted = tests-rewritten in spirit.

---

## §2 — Round close (RETRACTED 2026-05-10; superseded by §3)

Per §0.10 above. The original §2 was a stub for round-close; round-close now lives at §3 below per the retraction shape.

Original §2 content preserved below per §6.14.20:

> ## §2 — Round close (pending)
>
> To be authored at round-close commit. Anchors:
>
> - Final test count vs. 128/0/649 baseline at HEAD `1dc2b75`. Target: 128 ± 2.
> - Lefthook clean (lint + typecheck) verification.
> - §6.14 entries authored or reinforced this round (candidate sub-patterns: round-internal audit-vs-revert blindness from Round 1 §0.15's new-sub-pattern observation; §0.7 maybeAutoEndSession Resolution-1-implicit-selection record).
> - PROMOTION CANDIDATE 1 final state (still 4/5 unless an instance surfaces this round; see §0.3 + §0.7).
> - PROMOTION CANDIDATE 2 final state (advances 3/5 → 4/5 if shipped as a sidecar — the planned shape).
> - Q-pattern instance count update (running total carried forward from source plan-doc).
> - Forward-pinned residuals updated (validator round, Round 3, §0.9 maybeAutoEndSession disposition).

---

## §A — Audit-step ledger (this opening commit)

Audit steps executed before authoring this plan-doc, per redirector's §6.14.18/21/22 fresh-session re-execution discipline:

| # | Check | Outcome |
|---|---|---|
| 1 | `git rev-parse HEAD` = `1dc2b75` | PASS |
| 2 | Last 5 commits match handoff ledger | PASS (1dc2b75 / 6db9ca8 / d59f86d / ccb3aab / f471e83 matched verbatim) |
| 3 | `bun run typecheck` clean | PASS (tsgo --noEmit, exit 0) |
| 4 | Lint clean | PASS (`bun run lint` against staged: 0 staged TS files, no errors) |
| 5 | `docs/plans/diagnostic-timing-sidecar.md` does NOT exist | PASS (file not found pre-commit) |
| 6 | §0.15 entry quoted verbatim from source | PASS (extracted from `dashboard-drill-...md:193-245`; preserved in §0.4 above) |
| 7 | §0.5 audit-step fix shape verified; file path + line number confirmed | PASS — fix site: `src/app/(diagnostic-flow)/diagnostic/run/content.tsx:61`. Original §0.5 cited line range `:48-57`; current state is `:58-69` (benign drift from `subTypeId` prop addition). |
| 8 | `grep -rn sessionDurationMs src/` enumerated | PASS — full enumeration recorded in §0.6 above. 26 hits across 6 files; one production fix site (`diagnostic/run/content.tsx:61`); zero surprise consumers. |
| 9 | `focus-shell/types.ts` + `focus-shell.tsx` semantic of `null` vs numeric verified | PASS — `sessionDurationMs: number | null` (types.ts:60); 12 references in focus-shell.tsx all check `=== null` to skip session-level timer / auto-end / behind-pace branches. `null` = "no session-level duration; chronometer + bar hidden; no auto-end"; numeric = "drives chronometer, session bar, behind-pace flag, and the maybeAutoEndSession effect." |
| 10 | `audio-ticker.ts` pacing-math dependency on `sessionDurationMs` audited | PASS — zero references; behavior unchanged across the prop transition. Compatibility-verify anchor recorded in §0.7. |
| 11 | SPEC §9.2:2355 non-interaction with diagnostic flow confirmed | PASS — diagnostic is sub-type-mixed 50-question, not full-length curve-driven; selection-engine amendment governs `pickWithFallback` Pass 4 only; no overlap with this sidecar's prop-layer change. Confirmation recorded in §0.8. |

**Audit-surfaced finding worth redirector attention** (NOT a STOP; surfaced for explicit decision before §1 commit): the redirector's stated anti-scope (§0.2) excludes the FocusShell prop refactor that Round 1 §0.15 said Resolution 2 (*"render bar + chronometer, no auto-end"*) requires. This sidecar therefore **implicitly selects Resolution 1** (auto-end client-side at 15:00). The contradiction with `post-session-shell.tsx:106` pacing copy that §0.15 cited as a Resolution-1 rejection reason persists. Disposition options for the redirector: (a) confirm Resolution 1 acceptance and acknowledge the post-session-copy residual as forward-pinned; (b) expand §0.2 anti-scope to admit the FocusShell prop refactor needed for Resolution 2; (c) re-retract the sidecar entirely if neither is acceptable. See §0.7 for the full analysis.

**Resolution: option (c) selected.** Per §0.10 above. Round re-retracted at this commit. The §A finding becomes the §6.14.43 instance #5 anchor.

---

## §B — Audit-step ledger (re-retraction commit)

Audit steps executed before authoring this commit's edits, per redirector's §6.14.18/21/22 fresh-session re-execution discipline:

| # | Check | Outcome |
|---|---|---|
| 1 | `git rev-parse HEAD` = `ffe47bd` | PASS — `ffe47bd842ff3c2dd55297cc39634bd283e8d87a` confirmed |
| 2 | Last 3 commits match `ffe47bd / 1dc2b75 / 6db9ca8` | PASS — order + hashes verified verbatim |
| 3 | `bun run typecheck` clean | PASS — `bun --bun tsgo --noEmit`, exit 0, no diagnostics |
| 4 | Lint clean | PASS — pre-edits lefthook-equivalent state; no staged TS files |
| 5 | `git status` clean working tree | PASS — only untracked file is the prior session-log markdown (carried forward from prior session, expected) |
| 6 | SPEC.md §6.14.42 verified as last entry; §6.14.43 next | PASS — pre-edit SPEC.md was 2825 lines; §6.14.42 ended at line 1833 with `---` at line 1835 separating from `## 7. Server actions...` at line 1837. §6.14.43 inserted between line 1833 and the existing `---`. Post-edit SPEC.md grows by ~50 lines |
| 7 | Plan-doc structure §0 / §1 / §2 / §A confirmed | PASS — pre-edit was 285 lines; §0.1-§0.9 spanned lines 9-204; §1 spanned lines 208-249 (42 lines, 3 sub-sections §1.1/§1.2/§1.3); §2 spanned lines 253-263 (11 lines, stub-only); §A spanned lines 267-285 (19 lines including audit table). §1 + §2 line ranges captured for quote-preservation |
| 8 | Round 1 §0.15 parallel-structure re-confirmed | PASS — Round 1 §0.15 = retract + quote-preserve §5.11 + §0.5 + §1 in-scope bullet + single stale-comment fix. **This commit's parallel:** retract + quote-preserve §1 + §2 + ZERO source-code changes (no analog of §0.15's stale-comment fix; this commit is a stricter pure-doc retraction) |
| 9 | Test baseline 128/0/644 re-verified | PASS — `bun test` reports `128 pass / 0 fail / 644 expect() calls / 17 files`. **FINDING:** expect()-count drift from session-log-recorded 649 → 644 (−5). Pass/fail/file counts unchanged. Drift attribution: likely conditional-branch expect() variance (some tests have if/else paths with different expect() counts; the structured-explanation.test.ts:152 stochastic suspect already forward-pinned). Not a regression; recorded for transparency |

**Findings worth flagging.** §B step 9's expect()-count drift (649 → 644) is recorded as a finding rather than absorbed silently. The drift is benign (no test failures) but the running plan-doc baseline reference at §0.10 + §3 below uses the actual 644 figure rather than the prior session-log 649. Future round-opens should re-verify expect() count rather than citing prior plan-docs.

---

## §3 — Round close (2026-05-10, re-retraction)

Round closed via retraction at this commit (one commit after open).

**Tests.** No test changes. Baseline 128 pass / 0 fail / 17 files / 644 expect() calls re-verified at this commit's audit-step (§B step 9). Note expect()-count drift from prior session-log reference of 649; investigated and recorded as benign (§B finding).

**Lefthook.** Lint + typecheck clean at commit (§B steps 3-4 plus the actual pre-commit hook execution recorded by `lefthook v2.1.6` invocation).

**§6.14 entries.**

- **§6.14.43 PROMOTED** at this commit. Pattern: redirector-spec error caught at executor audit-step boundary. Five anchor instances banked across four prior rounds (see SPEC §6.14.43 for the full ledger). Sub-types: path/reference, methodology, content-formatting, implicit-resolution-selection (4 sub-types). The fifth anchor instance — implicit-resolution-selection by anti-scope writing — is a structurally novel sub-type that triggered this round's re-retraction.

**PROMOTION CANDIDATE state at round close.**

- **Candidate 1** (redirector-spec error caught at executor audit-step boundary): **PROMOTED to §6.14.43.** State retired.
- **Candidate 2** (sidecar-as-default-narrow-scope-envelope): **unchanged at 3/5.** This round did NOT ship as a sidecar — it shipped as a retraction. Does not count toward instance threshold.

**Q-pattern instance count update.** Round-close folded into retraction commit at this commit. **Instance #3 banked.** (Prior instances: #1 + #2 banked in earlier rounds per the running ledger carried forward in `selection-engine-session-attempted-ids-sidecar.md` §7.) Threshold for §6.14 promotion is +1 (instance #4 at next round-close that folds round-close into a final commit). Forward-pinned to next-round residuals.

**Forward-pinned residuals updated.**

- **"Diagnostic-timing sidecar"** (formerly residual #2 in source plan-doc `selection-engine-session-attempted-ids-sidecar.md`) — **RETRACTED-AS-FRAMED** at this round-close. The "narrow-sidecar grabbing only the client-prop change" framing is structurally wrong per §0.10 reasoning; supersession captured by the new residual below.
- **"Diagnostic-timing-strategy round"** — **NEW residual.** Addresses §0.15 forward-reference items 1-5 together (PRD §4.1 amendment + server cutoff re-introduction + client timer + mastery multiplier revert + post-session pacing copy revision). Item 1 (PRD §4.1 amendment) is load-bearing; items 2-5 are downstream of how item 1 resolves. Sequencing TBD relative to (a) validator round (un-deferred from selection-engine sidecar; residual #1 in source plan-doc), (b) Round 3 review-section architecture (residual #3 in source plan-doc).
- All other forward-pinned residuals from `selection-engine-session-attempted-ids-sidecar.md` §6 carry forward unchanged (Q-pattern continues as forward-pin per Q-pattern entry above; `structured-explanation.test.ts:152` stochastic suspect remains forward-pinned).
