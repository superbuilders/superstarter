# Plan — Focus-shell post-overhaul fixes and features

> **Status: shipped 2026-05-04 across seven commits — `4eff72c` (commit 1, bug fix), `07ae25b` (commit 2, urgency-loop introduction), `af9a088` (commit 2.5, hybrid restoration), `67942e3` (commit 2.6, placeholder cleanup), `fae3501` (commit 3, stacked timer bars), `906c167` (commit 4, pace-keyed progression), `9bd90e7` (commit 4 follow-up, duplicate-key fix), and the doc commit at the head of `main`. The text below describes the design as shipped; some sections (notably §3 and §6) walked back from earlier drafts during implementation, and the document reflects the delivered behavior rather than the design history. Commit messages carry the intermediate-decision history.**

The focus-shell overhaul (the prior round, commits `3734b5c..415d969`) shipped a structurally-correct shell — three bars in the chrome row, audio cues at the per-question target, session-timer auto-redirect, typography aligned to the target screenshots. Dogfooding then surfaced one regression and five tuning items, plus one in-flight bug surfaced during implementation. They were bundled into a single round because they share the same component surface and the same playwright-core verification protocol — verifying them together amortized the harness setup cost.

## 1. Why these items, why this ordering

The work clustered into three themes:

- **Triage post-flow integrity (item 1).** A regression: after the user took the triage prompt, the new item painted but didn't accept input. Load-bearing — without a working triage take, the pedagogical core of the focus shell (the "abandon and advance" decision) can't be exercised. Blocked Phase 3 dogfooding.
- **Audio escalation (items 2–4, collapsed into a single hybrid rule).** The synthesized dong from the prior round was too gentle and silence past the target let users linger without escalation. The shipped solution is a hybrid: synth ticks pre-target plus a randomly-picked MP3 looping post-target until advance — see §3.
- **Richer timing visualization (items 5, 6).** A stacked pair of per-question bars to show "approaching deadline" + "past deadline" without changing the no-auto-submit rule, plus a pace-deficit color flip on the question progression bar so users can see at a glance whether they're behind on the session as a whole.

The bug fix shipped first in its own commit so subsequent feature commits could verify against a working triage flow. The audio commits landed next (cheaper to verify than the dual-bar visual). The visual commits (timer-bar split + pace-keyed progression) landed last, with the doc commit closing the round.

## 2. Item 1 — Triage take strands the user on the next item (BUG)

### What's broken

After the user takes the triage prompt — by clicking the prompt button or pressing Space — the network round-trip completes, the next item's text and options paint into the DOM, but the user can't interact with the rendered next item. Reproduction is reported as 100% on Phase 3 dogfood drills. SPEC §6.7 specifies that `triage_take` "submits whatever the user has selected, blank if nothing" and that `triageTaken = true` only if taken within 3000ms of `triagePromptFiredAtMs`; the spec's flow assumes seamless advance.

The bug surfaces on the triage path but not on the regular Submit-button path, even though both flows route through `submitPending: true` and the same `runSubmitWhenPending` effect, because the entry conditions differ:

- The Submit-button entry has `triagePromptFired: false` for the entire flow (Submit before the per-question target) OR `triagePromptFired: true` (Submit after the per-question target). In the latter case, the triage prompt overlay is mounted during the network await and kept visible until `advance` resets `triagePromptFired: false`. Same as the triage-take path on that axis.
- The triage-take entry adds: the user's click landed on the `<TriagePrompt>` button (sets `document.activeElement`), and `<InterQuestionCard>` opacities up over the entire viewport during the await. After advance, both overlays unmount.

### Candidate root causes (must be diagnosed empirically before fix)

Read in priority order:

1. **`submitPending` doesn't clear cleanly on advance.** Today the flag is cleared only by `set_question_started` from the new `<ItemSlot>`'s mount effect (`shell-reducer.ts` line ~256, comment block at line ~54). The reducer comment explicitly chooses this path to close a double-Enter race during the await window. If React 19's reconciliation defers the keyed `<ItemSlot>` remount across a transition (Cache Components are enabled in this project — see `next.config.*`), the mount effect doesn't fire promptly, `submitPending` stays true, and the Submit button stays disabled. **Option clicks would still work, but Submit clicks register as no-ops.** The user perceives this as "the page doesn't respond."
2. **`<InterQuestionCard>` blocks pointer events past its visibility window.** The card is `fixed inset-0 bg-background/60 backdrop-blur-sm` with no `pointer-events-none`. While `props.visible === true` is the canonical gate, if the React commit phase orders advance's commit before the card's render-tree update (a single-frame race in dev), pointer events on the new item could be intercepted for one frame.
3. **Stale `stateRef.current` in the Space-key handler.** `stateRef` is synced via a `useEffect` on `[state]`; effects run after commit. Between the `advance` commit and the `syncStateRef` effect, a Space keypress reads stale `triagePromptFired: true` and stale `submitPending: true`. The handler short-circuits on submitPending so no double-take fires, but `event.preventDefault()` runs before the short-circuit — a Space keypress in this window is silently swallowed.
4. **`<ItemSlot>` mount effect doesn't fire because the key didn't actually change.** If the server returns the same `nextItem.id` as the current `currentItem.id` (a server-side bug that surfaces here as a UI dead-end), React doesn't unmount/remount, the empty-deps mount effect doesn't fire, `submitPending` never clears. Long shot, but worth a sanity check — the server's `submitAttempt` flow could in principle return the same item under some failure mode.

### What it should do

After the user takes the triage prompt:

- The next item paints (current behavior — works).
- All overlays clear within one render frame (current behavior — works on the surface).
- The Submit button becomes enabled (broken).
- Option buttons accept clicks and the click dispatches `select` (probably works; symptom is broader than just Submit).
- The Space key on the new item is a no-op (because `triagePromptFired: false`) (current behavior — works).

The fix should be the **smallest change that makes the triage-take flow indistinguishable from the regular-submit flow** at the user-interaction level past advance.

### Implementation seam

Recommended fix path, contingent on diagnosis:

- **If candidate #1 is the cause** (most likely): clear `submitPending: false` inside `reduceAdvance` directly, in addition to the existing clear in `set_question_started`. The reducer comment (lines 53–60) currently argues the clear should happen at `set_question_started` to close the double-Enter race during the await. That race only exists when `submitPending` is true AND the await is in flight — neither condition holds after `advance` (the await completed and dispatched advance), so clearing in advance is safe. Keep the `set_question_started` clear in place as belt-and-suspenders for any future flow that doesn't go through advance.
- **If candidate #2 is also a contributor**: add `pointer-events-none` to `<InterQuestionCard>`'s outermost div. The card is purely decorative (the comment at `inter-question-card.tsx:8` says "Just a soft visual transition"); blocking pointer events serves no design intent.
- **If candidate #3 is observed**: add a `useLayoutEffect` (instead of `useEffect`) for `syncStateRef`. Layout effects fire synchronously after commit, eliminating the stale-state window for the Space-key handler. Safe because `stateRef` is only read by event handlers, never during render.
- **If candidate #4 is observed**: the bug is server-side, not in the focus shell. Out of scope for this commit; surface as a separate finding to investigate the server's `submitAttempt`.

The plan's expected fix is candidates #1 + #2 together (one-line reducer change + one-className change). Candidate #3 likely doesn't actually surface (the Space-press window is microseconds) but is cheap to mitigate proactively.

### Reducer / state changes

Specific additions to `reduceAdvance` in `src/components/focus-shell/shell-reducer.ts`:

```
// in reduceAdvance, alongside existing resets:
submitPending: false,           // NEW — fix candidate #1
```

The `set_question_started` handler retains its existing `submitPending: false` clear; the two clears are now redundant but the redundancy is the point (defense-in-depth across the two paths into "next item is interactable").

No new `ShellState` fields. No new action variants.

### Verification scenarios

Single regression test, run against a real drill (since the smoke route's `onEndSession` is a stub but `onSubmitAttempt` cycles items):

1. Start a 5-question drill, sign in via the harness's auth-cookie injection (per the established protocol).
2. Wait for the per-question timer to cross 18s (or fast-forward via `?per-question` smoke flag if added; otherwise 18s wall).
3. Click the triage prompt (or press Space).
4. Wait for the new item to render (poll for `data-testid="question-progression-bar" data-filled` to advance — the second segment should be filled).
5. Click an option button on the new item. Assert the button's `aria-pressed` flips to `true`.
6. Click Submit. Assert the Submit button responds (the next item paints, or the session ends — either way, advance progresses).
7. Repeat for the Space-key entry path (press Space during a question target overrun) and confirm the same outcome.

Negative control: run the same scenario on the current `main` branch BEFORE the fix and confirm the click on the option button does NOT register (`aria-pressed` stays false). This confirms the harness reproduces the bug.

## 3. Items 2–4 — Hybrid audio model: synth ticks pre-target, sample loop post-target (FEATURE)

### What's broken (and what isn't)

The prior round's audio fired a soft 880 Hz tick at integer seconds 10–17, a synthesized 220 Hz dong at second 18, then silence. Two of those layers were keepers; one wasn't:

- The pre-target tick cadence is good — eight ticks in the second half of the per-question target give the user an unmistakable "approaching deadline" cue. Volume (0.12 peak gain) is at-the-floor of audible, but not unworkable; tuning is a separate decision from architecture.
- The synth dong was too gentle. Users heard it and kept working.
- Silence past the target let users linger indefinitely without escalation.

The shipped solution preserves the ticks and replaces the dong + post-target silence with a randomly-picked MP3 looping until advance.

### What it does

**Hybrid audio. Two distinct paths:**

1. **Pre-target ticks** — synthesized 880 Hz sine pip at every integer second `s` where `halfTarget < s < target`. For an 18-second target: ticks at seconds 10, 11, 12, 13, 14, 15, 16, 17. ~50 ms each, peak gain 0.12. Same as the prior round.
2. **Post-target urgency loop** — when `elapsedQuestionMs` first crosses `perQuestionTargetMs`, a randomly-picked MP3 from the session-start bank pick begins looping (`source.loop = true`, peak gain ~0.8). The loop's first second of playback is the new "you've hit target" signal, replacing the synth dong.

The loop stops on item advance via a cleanup-on-`currentItem.id`-change effect — uniformly handles every advance path (Submit click, Space-triage take, click-triage take, server-end). The same file plays for every question in the session; a hard refresh re-picks.

Pedagogical contract: silence in the first half of the question (0 to half-target), ticks in the second half (half-target to target), looped sample from target until advance.

### Bank of sounds

Curated MP3 files live at `data/sounds/` (top-level files only — subdirectories like `success/`, `failure/`, `ticks/` are NOT enumerated by the manifest generator). The directory is the source of truth: adding a top-level `*.mp3` extends the random pool without code changes.

File requirements:
- MP3 format (`*.mp3`). Browsers all decode it.
- Designed to loop cleanly (no abrupt start or end click). Curator's responsibility.
- Reasonably small. ~50–300 KB at moderate bitrate is fine; the browser caches after first decode.
- Provenance must be CC0 / public-domain or owned-content. (The placeholder `LICENSE.md` Claude Code added during commit 2 was deleted in commit 2.6 — the curator tracks provenance separately.)

### Implementation surface

Three files (plus the build-time copy script):

- **`scripts/copy-sounds-to-public.ts`** — Bun script (EXEMPT from project ruleset). Reads `data/sounds/*.mp3`, copies into `public/audio/sounds/`, and emits `src/config/sound-bank.ts` exporting `SOUND_BANK_URLS: readonly string[]`. Hooked into `package.json`'s `predev` and `prebuild` lifecycle. The generated manifest file is checked into git so first-start has it on hand.
- **`src/components/focus-shell/audio-ticker.ts`** — exports `unlockAudio` (creates AudioContext + picks bank URL + fetches/decodes buffer; called from option-select / Submit / Space-triage handlers), `playTick` (synth pre-target tick), `startUrgencyLoop` (post-target sample loop start), `stopUrgencyLoop` (loop stop). Each successful play emits a `window.CustomEvent('audio-ticker', { detail: { kind, ... } })` for harness instrumentation; `kind ∈ { "tick", "urgency-loop-start", "urgency-loop-stop" }`.
- **`src/components/focus-shell/focus-shell.tsx`** — three effects driving the audio:
  - **Pre-target tick effect**: cross-second detection via a `useRef`-tracked previous integer-second value. Fires `playTick()` for every `s` where `halfSec < s < targetSec`. Reset on item advance.
  - **Loop-start effect**: fires when `elapsedQuestionMs >= perQuestionTargetMs` AND `urgencyLoopStartedForCurrentQuestion: false`. Calls `startUrgencyLoop()` and dispatches `urgency_loop_started`.
  - **Loop-stop effect**: cleanup-on-`currentItem.id`-change calls `stopUrgencyLoop()`. Uniform across all advance paths.

### Reducer state

One added field in `ShellState`:

```
urgencyLoopStartedForCurrentQuestion: boolean
```

Initial value: `false`. Reset to `false` in `reduceAdvance` (mirrors the existing audio-flag-reset pattern). One added action variant `{ kind: "urgency_loop_started" }`; idempotent set-true via `dispatchSecondary`.

The pre-existing `dongPlayedForCurrentQuestion` field is removed (the synth dong was permanently dropped); pre-target ticks use refs only, no reducer state.

### Verification scenarios (delivered)

Run on the smoke route at `/phase3-smoke?qt=true`. All scenarios passed during the round (commits 2 and 2.5).

1. **Loop starts at target.** `urgency-loop-start` fires within ~100 ms of `elapsedQuestionMs` crossing `perQuestionTargetMs`. AudioBufferSourceNode has `loop === true`.
2. **Loop stops on advance.** `urgency-loop-stop` fires within ~500 ms of Submit click.
3. **Same file across questions.** Two consecutive `urgency-loop-start` events (Q1 and Q2 of the same session) carry identical `detail.url`.
4. **Different files across sessions.** 5 hard-refreshed sessions produce ≥ 2 distinct URLs.
5. **Silent with `?qt=false`.** Both ticks AND loop-start are silent for the entire question.
6. **Silent before first interaction.** With no clicks, no audio events fire — AudioContext is never created; calls return silently.
7. **Triage take stops the loop.** Pressing Space at the triage prompt fires exactly one `urgency-loop-stop`.
8. **Q2 loop fires only after Q2's target.** No loop-start on Q2 until Q2's `elapsedQuestionMs` crosses `perQuestionTargetMs`.
9. **Pre-target ticks at seconds 10–17.** 8 `tick` CustomEvents at integer-second elapsed values [10, 11, 12, 13, 14, 15, 16, 17]. Anchored on animation-clock, not harness wall-clock — see §6.14.3 of SPEC.
10. **Second 18 is loop-start, not tick.** Tick absent at elapsed=18s; loop-start present at the same moment. Clean handoff.
11. **No ticks after target.** Zero tick events with `elapsedQuestionMs >= 18000` over a 25-second observation window.

## 4. Item 5 — Two stacked per-question timer bars with phase-keyed colors (FEATURE — significant)

### What's missing

The current `<QuestionTimerBar>` (post-commit 5) shows ONE bar that fills red 0→100% over `perQuestionTargetMs` and stays at 100% past the target. It can't express the user's first-window-vs-overflow distinction, and its "always red" framing doesn't reward the user for being early in the question (where blue-as-time-remaining would).

### What it should do

Two stacked bars in the chrome row, replacing the single `<QuestionTimerBar>`:

**Top (primary) bar**: covers `[0, perQuestionTargetMs)`.

- Fill ratio: `min(elapsedQuestionMs / perQuestionTargetMs, 1.0)`.
- Color: BLUE for `elapsedQuestionMs < perQuestionTargetMs / 2`; RED for `elapsedQuestionMs >= perQuestionTargetMs / 2`. **The entire current fill turns red at the half-target boundary — discrete flip, not a gradient.** Not a position-on-bar split; a time-elapsed split that retroactively repaints the whole filled region.
- After `elapsedQuestionMs >= perQuestionTargetMs`, the bar caps at 100% red (same as today's single bar).

**Bottom (overflow) bar**: covers `[perQuestionTargetMs, 2 * perQuestionTargetMs)`.

- Fill ratio: `clamp((elapsedQuestionMs - perQuestionTargetMs) / perQuestionTargetMs, 0, 1)`.
- Empty for `elapsedQuestionMs < perQuestionTargetMs`.
- Fills 0→100% red for `elapsedQuestionMs in [perQuestionTargetMs, 2 * perQuestionTargetMs)`.
- Caps at 100% red beyond `2 * perQuestionTargetMs`. No third bar; the visual maxes out at "two full red bars."

Same length, height, gray track, label position as today's single bar. The label "Per question time" continues to sit beneath the bottom bar (single label for the stack, not per-bar).

### Implementation seam — bar topology

Recommend: split into two siblings inside a new wrapper.

- New `<QuestionTimerBarStack>` parent at `src/components/focus-shell/question-timer-bar-stack.tsx`. Owns the gray track shape, the label, and the layout rhythm.
- Renamed-into-stack `<QuestionTimerBarPrimary>` (the existing `<QuestionTimerBar>` component, refactored to take a phase-keyed fill — see below).
- New `<QuestionTimerBarOverflow>` sibling, structurally similar to primary but uses `animation-delay:18000ms` to start filling after the primary completes.
- `<FocusShell>` swaps its `<QuestionTimerBar>` import for `<QuestionTimerBarStack>`. Same prop signature (`itemId`, `perQuestionTargetMs`).

This matches the bar-per-component pattern from the existing chrome row (`<QuestionProgressionBar>`, `<SessionTimerBar>`) and keeps each component's responsibility narrow. The wrapper owns layout; each bar component owns its own fill.

The existing `<QuestionTimerBar>` file gets renamed-and-refactored rather than deleted-and-replaced — preserves git blame for the commit-5 work.

### Implementation seam — primary bar phase-keyed fill

The CSS-keyframe `transform: scaleX` approach from commits 4-5 doesn't natively support a discrete color flip mid-animation. Three options were considered:

1. **Two stacked fill elements (blue underneath, red on top) with the red one's transform delayed by `perQuestionTargetMs/2`.** Cheap and matches the existing pattern.
2. **A single fill with a CSS `background: linear-gradient(...)` whose stop position is animated.** Complex; gradients animate at the GPU layer but sub-stop animation is fragile cross-browser.
3. **Drop the keyframe approach entirely; drive width from React state via inline style or CSS variable on every RAF tick.** Most flexible but conflicts with `rules/no-inline-style.md` and adds React work per frame.

The user's prompt recommended option 1 ("two stacked fills with delayed-start red overlay, cheapest, matches existing pattern"). On closer inspection, **option 1 as described doesn't satisfy the spec** — at t = 13.5s with target = 18s, blue's scaleX is 0.75 (75% width) and red's scaleX is 0.5 (50% width with delay+duration of 9s); red would overlay blue 0-50%, leaving blue 50-75% visible. The result is a MIXED bar (red 0-50%, blue 50-75%, gray 75-100%), which contradicts "the entire fill segment becomes red — NOT a static gradient."

**Revised recommendation: two stacked fills with a synchronous opacity flip at half-target.** Both layers grow with the same `animate-fill-bar` keyframe over the full `perQuestionTargetMs`. The blue layer is fully opaque during phase 1 and fully transparent during phase 2; the red layer is fully transparent during phase 1 and fully opaque during phase 2. Implementation:

- Add to `src/styles/unstyled/globals.css`:

  ```css
  @keyframes opacity-visible-then-hidden {
      0%      { opacity: 1; }
      49.99%  { opacity: 1; }
      50%     { opacity: 0; }
      100%    { opacity: 0; }
  }
  @keyframes opacity-hidden-then-visible {
      0%      { opacity: 0; }
      49.99%  { opacity: 0; }
      50%     { opacity: 1; }
      100%    { opacity: 1; }
  }
  ```

- Primary bar's blue fill: animated by both `animate-fill-bar` (transform) and `opacity-visible-then-hidden` (opacity), same duration.
- Primary bar's red fill: animated by both `animate-fill-bar` (transform) and `opacity-hidden-then-visible` (opacity), same duration.
- Both layers start at the same time on item mount.

The 49.99% / 50% pair gives the discrete flip. CSS animation interpolation at exactly 50% is undefined across browsers; the 0.01% gap forces a discrete jump.

### Implementation seam — overflow bar fill

Structurally identical to today's `<QuestionTimerBar>`: gray track + single red fill with `animate-fill-bar` over `[animation-duration:18000ms]`. The only difference is `[animation-delay:18000ms]` — fill starts 18s after item mount.

Tailwind needs to extract the delay class. Either:

- Add `[animation-delay:18000ms]` as a literal class string in the source (Tailwind v4 JIT picks it up as an arbitrary property).
- Or add a `DELAY_CLASS_BY_MS` map in `timer-bar.tsx` mirroring `DURATION_CLASS_BY_MS`.

The first form is simpler for a single delay value. Use it; if speed-ramp / brutal modes ever need a different per-question target, refactor to the map at that point.

### Reducer / state changes

None. `state.elapsedQuestionMs` already exists and is what drives the existing single bar. The new layered structure consumes only `itemId` and `perQuestionTargetMs` from props, same as today.

### Verification scenarios

`playwright-core` measurements at multiple time samples on the smoke route (using `?per-question` smoke flag if added, or 18s wall-clock):

| t (ms) | Primary expected fill ratio | Primary expected color | Overflow expected fill ratio | Overflow expected color |
|---|---|---|---|---|
| 0 | 0.00 | (none — empty) | 0.00 | (none — empty) |
| 4500 | 0.25 | blue | 0.00 | empty |
| 8990 | ~0.5 | blue | 0.00 | empty |
| 9010 | ~0.5 | red | 0.00 | empty |
| 13500 | 0.75 | red | 0.00 | empty |
| 17990 | ~1.0 | red | 0.00 | empty |
| 18010 | 1.0 (capped) | red | ~0.001 | red |
| 22500 | 1.0 (capped) | red | 0.25 | red |
| 27000 | 1.0 | red | 0.5 | red |
| 36000 | 1.0 | red | 1.0 | red |
| 50000 | 1.0 | red | 1.0 (capped) | red |

Each row is a sample. Capture via `getBoundingClientRect().width` of `[data-testid="question-timer-primary-fill"]` (sum across both layers' bounding rects, or pick whichever has opacity > 0) divided by the track's width. Color via `getComputedStyle(...).backgroundColor`, asserting against the lab() form of `bg-blue-600` and `bg-red-600` from the project's Tailwind config.

Mouse movement to (10, 10) before each measurement to clear hover state, per the established protocol.

Color-flip verification specifically: capture at t=8990ms and t=9010ms (40ms apart, straddling the half-target boundary). Assert primary's visible color is blue at t=8990 and red at t=9010. The 20ms tolerance window accounts for animation interpolation.

## 5. Item 6 — Question progression bar color-keyed to pace deficit (FEATURE)

### What's missing

`<QuestionProgressionBar>` (post-commit 3) renders all filled segments solid blue, regardless of session pacing. There's no visual signal when the user is consuming time faster than questions — a state where the user is on track to run out the session timer before completing the question target.

### What it should do

When the user is "behind pace" — defined as `elapsedSessionMs / sessionDurationMs > currentQuestionIndex / targetQuestionCount` — the progression bar's filled segments turn red. When ahead of pace (or exactly on pace), they stay blue.

Specifics:

- The color flip is **all filled segments at once**, not segment-by-segment. K filled segments turn red when behind, all blue when ahead.
- Strict greater-than comparison: equal time-ratio and questions-ratio is "on pace" → blue.
- Diagnostic case (`sessionDurationMs === null`): blue always. There's no pace to compare against.
- Threshold check is per-render (driven by the existing RAF tick), not edge-triggered. The user can flicker between behind and ahead if they answer fast enough to catch up — the bar reflects current state continuously.

Worked examples (from the user's prompt):

- Q2 of 50, t=10/15min: time ratio 0.67, questions ratio 0.02 → `0.67 > 0.02` → behind → RED.
- Q49 of 50, t=13/15min: time ratio 0.87, questions ratio 0.96 → `0.87 > 0.96` → false → ahead → BLUE.

### Implementation seam

Recommend: compute `behindPace` in `<FocusShell>`, pass to `<QuestionProgressionBar>` as a new `behindPace: boolean` prop. Keeps the bar component a pure presenter; aligns with the existing pattern where the shell owns timer state and the bar components just render.

In `focus-shell.tsx`:

```tsx
const currentQuestionIndex = props.targetQuestionCount - state.questionsRemaining
const behindPace =
  sessionDurationMs !== null &&
  state.elapsedSessionMs / sessionDurationMs > currentQuestionIndex / props.targetQuestionCount

// pass to <QuestionProgressionBar behindPace={behindPace} ... />
```

In `question-progression-bar.tsx`:

```tsx
interface QuestionProgressionBarProps {
  totalQuestions: number
  questionsRemaining: number
  behindPace: boolean        // NEW
}

// inside renderSegment:
const fillClass = filled
  ? (behindPace ? "bg-red-600" : "bg-blue-600")
  : "bg-gray-200"
```

The diagnostic case is handled by the `sessionDurationMs !== null` clause in the shell's computation — if duration is null, `behindPace` is always false, segments stay blue. No conditional inside the bar.

The legacy `paceTrackVisible` prop on `FocusShellProps` (vestigial per the comment at `focus-shell.tsx:339`) is unrelated and untouched.

### Reducer / state changes

None. The computation is derived from existing state (`elapsedSessionMs`, `questionsRemaining`) and props (`sessionDurationMs`, `targetQuestionCount`).

### Verification scenarios

Drive the smoke route with three scripted scenarios:

1. **Ahead-of-pace baseline**: cold start of a 5-question drill (90s session). At t=1s on question 1: time ratio 0.011, questions ratio 0.0 → behind (any time ratio > 0 is behind on question 1). Sample the segment color via `getComputedStyle`. Assert red.
2. **Behind by construction**: same drill, wait until t=20s on question 1: time ratio 0.22, questions ratio 0.0 → behind. Assert red.
3. **Catch up**: submit through to question 5 quickly (within ~10s wall). At question 5 with elapsed ~10s: time ratio 0.11, questions ratio 0.8 → ahead. Assert blue. (Question 5 catches up because the question ratio jumped to 0.8.)
4. **Diagnostic exemption**: navigate to `/diagnostic/run`. Sample the segment color. Assert blue regardless of elapsed time (the prop sees `sessionDurationMs === null` and short-circuits).

Note: scenarios 1-3 above use `currentQuestionIndex` which is the index of the *current* question (0-based). On question 1 of 5, currentQuestionIndex = 0, questions ratio = 0. The behind-pace condition `time > 0` is always true the moment any time has elapsed on question 1 — meaning the bar is red from the very start of every drill. This is consistent with the user's spec (Q2 of 50 at 10/15 min has questions ratio 1/50 = 0.02; the user computes the ratio based on the current question's index).

Worth flagging: if the user wants the bar to be blue at the start of question 1 (when "0% through" both axes is on-pace by intuition), the threshold should use `currentQuestionIndex + 1` instead of `currentQuestionIndex` for the questions-ratio side. As specified in the prompt, current rule is `currentQuestionIndex / targetQuestionCount`, which makes Q1 always start red. **Resolved during implementation (see §9): use `currentQuestionIndex` as written. Q1 starts red the moment any time elapses; that's intentional, not a regression.**

## 6. Sequencing and commits — what shipped

Seven commits, in order. Numbered with `.5` and `.6` suffixes where the original five-commit plan grew during implementation; the suffixes are preserved in the git history so the audio walkback (commit 2 → 2.5) and the placeholder cleanup (commit 2.6) read as a coherent in-flight design adjustment rather than retconned single commits.

1. **Commit 1 — `fix(focus-shell): reset interactivity state on advance after triage take`** (`4eff72c`). `reduceAdvance` adds `submitPending: false`, `<InterQuestionCard>` gets `pointer-events-none`, `syncStateRef` switches to `useLayoutEffect`. Diagnostic finding: the actual root cause was candidate #4 from §2 (server returns the same `nextItem.id`), not #1. The plan-recommended fixes still apply as defense-in-depth and end up masking the server-side bug — see §8.
2. **Commit 2 — `feat(focus-shell): replace tick/dong audio with random session-picked looping sample`** (`07ae25b`). First audio commit. Drops `playTick`, `playDong`, the per-second cross-detection. Introduces `unlockAudio` + `pickSessionSound` + `startUrgencyLoop` + `stopUrgencyLoop`. Adds `data/sounds/` + `scripts/copy-sounds-to-public.ts` + the generated `src/config/sound-bank.ts` manifest. Removes `dongPlayedForCurrentQuestion`; adds `urgencyLoopStartedForCurrentQuestion`.
3. **Commit 2.5 — `feat(focus-shell): restore pre-target synth ticks; loop only fires post-target`** (`af9a088`). Audio walkback. `playTick` is restored alongside the urgency loop. The synth dong stays gone (the loop's first second of playback replaces it). The result is the hybrid model documented in §3. Committing this as a separate step (rather than amending commit 2) preserves the design-decision history.
4. **Commit 2.6 — `chore(focus-shell): remove placeholder sound files; let real bank stand alone`** (`67942e3`). Cleanup. Deletes the two CC0 placeholder MP3s + their `LICENSE.md` that commit 2 added for end-to-end verification. The user has their own curated bank; the placeholders are dead weight.
5. **Commit 3 — `feat(focus-shell): split per-question timer bar into stacked primary+overflow bars with phase-keyed primary fill`** (`fae3501`). New `<QuestionTimerBarStack>` wrapper, renamed-and-refactored `<QuestionTimerBarPrimary>` (two stacked layers with a discrete opacity flip at half-target), new `<QuestionTimerBarOverflow>`. Three new keyframe / utility variables in `globals.css`. Surfaced two Tailwind v4 footguns documented in SPEC §6.14.2. Followed by a small fix (`9bd90e7`) that gave the two primary-bar fill layers distinct keys after the React duplicate-key warning surfaced in dogfooding.
6. **Commit 4 — `feat(focus-shell): color-key question progression bar to pace deficit`** (`906c167`). New `behindPace` prop on `<QuestionProgressionBar>`, computation in `<FocusShell>`. Smallest feature commit; per §9 resolution 1, Q1 starts red intentionally.
7. **Commit 5 — `docs: update SPEC §6 and architecture_plan for post-overhaul fixes`** (this commit). SPEC §6.6 grows the timer-bar split, the progression-bar pace-color, and the two-reds-coexist paragraph. SPEC §6.12 is rewritten around the hybrid model. SPEC §6.14 is new (implementation notes for contributors capturing the five learned-the-hard-way items). `architecture_plan.md`'s focus-shell paragraph gains three sentences. This plan is rewritten to match delivered behavior.

Each commit lands lint-clean, typecheck-clean, and verification-pass.

## 7. Verification protocol carry-forward

Established discipline from the prior overhaul round (commits 1–7 of `docs/plans/phase-3-polish-practice-surface-features.md`) carries forward and was used unchanged across this round:

- `playwright-core` directly with `page.screenshot({ timeout: 30_000 })`. No MCP `browser_take_screenshot` calls.
- `page.mouse.move(10, 10)` before any post-click `getComputedStyle` measurement, to clear hover state.
- Multi-sample timing measurements for animated bars — multiple time points across the animation curve.
- CustomEvent dispatch from new audio paths for harness instrumentation. Event kinds in the round: `tick`, `urgency-loop-start`, `urgency-loop-stop`.
- Real-DB harness for items that touch the server-action path. Item 1 needed a real drill (not the smoke route's stub `onSubmitAttempt`) because the bug is on the post-network-roundtrip path.
- For the bug fix specifically: a regression test that drives a triage-take advance and asserts the next item's option-click registers a state change. Negative control on `main` BEFORE the fix; positive on the fix branch.

Two additions surfaced during this round and are recorded for future use:

- **Animation-time anchoring** (SPEC §6.14.3): when verifying CSS keyframes with sub-second precision, sample on `element.getAnimations()[0].currentTime` rather than harness wall-clock. Removes 150–300 ms of harness-vs-animation skew.
- **Headless Chromium autoplay policy** (SPEC §6.14.4): AudioContext requires both `--autoplay-policy=no-user-gesture-required` AND a real `page.click()` (NOT programmatic `.click()`) to reach `state === "running"`. Production clicks satisfy this naturally; harness-only consideration.

Throwaway harness scripts under `scripts/_<commit>-harness.ts` are moved out of the project tree before commit so `tsgo` doesn't include them in typecheck.

## 8. Out of scope

Explicit list — items deliberately not addressed in this round:

- Changes to the triage prompt's content or rendering. The prompt fires correctly; only post-take state-reset was broken.
- Changes to `sessionDurationMs` semantics or the auto-redirect from the prior round's commit 7.
- Changes to the diagnostic flow (the `sessionDurationMs === null` exemption flows through unchanged).
- New audio for non-question events (session-end, item-correct, etc.).
- Changes to question / option text typography (the prior round's commit 8 ended that thread).
- A "behind pace" warning beyond the progression-bar color — no toast, no banner, no overlay.
- A configurable per-question target. 18s stays the v1 target; 12s for speed-ramp stays untouched.
- The vestigial `paceTrackVisible` prop on `FocusShellProps`. Still unread; remove in a future cleanup commit, not here.
- **Per-user audio preferences** (e.g., a user toggle for "skip the urgency loop"). The existing `timerPrefs.questionTimerVisible` toggle gates both ticks and the loop in lockstep; no separate audio toggle ships in this round.
- **Audio volume tuning beyond the shipped values.** Pre-target tick peak gain stayed at the prior-round value (0.12); the urgency-loop sample gain is 0.8. Both are tunable in `src/components/focus-shell/audio-ticker.ts` if dogfooding surfaces audibility issues; that's a one-line change, not a structural concern.

### Server-side follow-up filed for separate investigation

- **`getNextUniformBand`'s session-soft fallback can re-serve session-attempted items.** When a sub-type's bank is small (e.g., the seeded `numerical.fractions` bank with 5 items), the recency + session-exclusion chain can exhaust uniqueness and the server returns `nextItem.id === currentItem.id`. The focus shell now masks this client-side via the `submitPending: false` clear in `reduceAdvance` (commit 1) — the user is unblocked even when the same item is re-served. The server-side aspect remains a real bug worth investigating: the fallback chain in `src/server/items/selection.ts` should either prefer items not yet attempted in this session (more aggressive uniqueness within the recency window) OR surface a UI hint when the user is being shown a duplicate item. **Filed as a separate concern, not part of this round.**

### Doc drift accepted (separate doc-only commit)

- **SPEC §6.2's `ShellState` / `ShellAction` shapes are still stale.** They don't reflect `submitPending`, `urgencyLoopStartedForCurrentQuestion`, or `sessionEnded`. Refresh belongs in a separate doc-only commit alongside the §6.8 keyboard-shortcut and §6.10 diagnostic-overtime cleanups.
- **SPEC §6.10 diagnostic-overtime-note text describes machinery that was removed** in the prior round; the §6.7 cross-reference still points at obsolete text. Same separate doc commit.
- **`<TriagePrompt>`'s `z-50` and `<InterQuestionCard>`'s implicit z-auto could collide** in unusual stack contexts (e.g., a future modal on top of the focus shell). Not a current bug; flag for whoever introduces such a modal.

## 9. Resolutions of open questions

Four questions surfaced during drafting; all four were resolved during implementation. The answers are folded into the §2–§5 design sections; recorded here for traceability.

1. **Item 6 (§5)'s threshold semantics on question 1.** **Resolution:** use `currentQuestionIndex / targetQuestionCount` as written (no `+1` shift). Q1 starts red the moment any time elapses; that's intentional. Switching to `(currentQuestionIndex + 1) / N` would invert the semantics for every other question — Q49 of 50 at the late-session edge would suddenly read as behind. The §11.1-style worked examples in the original prompt rely on the index-based ratio; honoring those keeps the semantics consistent end-to-end.
2. **Sound-bank initial seed.** **Resolution:** path (b) during implementation. Commit 2 added two CC0 / public-domain MP3s sourced from Wikimedia Commons (`File:LA2_kitchen_clock.ogg` and `File:Old_school_bell_1.ogg`, trimmed and re-encoded via ffmpeg) plus a `data/sounds/LICENSE.md` documenting their provenance. Commit 2.6 then deleted them once Leo's curated bank was in place. The intermediate step exercised the random-pick + decode + playback path end-to-end.
3. **Sound-manifest discovery mechanism.** **Resolution:** path (a). `scripts/copy-sounds-to-public.ts` runs at `predev` / `prebuild` time, copies top-level `data/sounds/*.mp3` into `public/audio/sounds/`, and emits `src/config/sound-bank.ts` exporting `SOUND_BANK_URLS: readonly string[]`. The generated manifest is checked into git so first-start has it on hand. Subdirectories under `data/sounds/` (`success/`, `failure/`, `ticks/`, `almost/`) are deliberately NOT enumerated; the bank is top-level files only.
4. **Item 1's `useLayoutEffect` for `stateRef` sync.** **Resolution:** apply preemptively. One-character change with no risk profile (the ref is read only by event handlers, never during render). Defense-in-depth across the candidate-#3 stale-state window. Shipped in commit 1.