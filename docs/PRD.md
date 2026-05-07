# 18 Seconds — Product Requirements Document

A self-service web application for adults preparing for the Criteria Cognitive Aptitude Test (CCAT). Users practice over 1–4 week prep cycles, building speed and accuracy across the 14 text-based question sub-types that v1 covers.

The CCAT itself is 50 multiple-choice questions in 15 minutes (~18 seconds per question). v1 of 18 Seconds covers the 14 text-based sub-types defined below. No calculator. Score is raw correct out of 50; average is 24/50.

For the full taxonomy of CCAT question types and their strategic notes, see the companion reference document `CCAT-categories.md`.

---

## 1. Product Summary

### Goals

Existing CCAT prep tools are question banks with timers. 18 Seconds is a mastery engine: it tracks user performance per sub-type, generates new practice items on demand, surfaces the user's specific weaknesses, and trains the strategic skills that distinguish high CCAT scorers (notably, knowing when to abandon a question).

### Non-goals

- General aptitude prep beyond the CCAT (no Wonderlic, no UCAT, no SAT).
- Mobile-native apps. Web only, responsive design.
- Multi-user features (leaderboards, social, cohorts, sharing).
- Live tutoring, chat with an AI, or any direct LLM-to-user interaction.
- Payments, accounts beyond auth, marketing pages.

### Users

Adults preparing for the CCAT as part of a hiring screen. Self-motivated, short prep horizons (days to weeks), already capable. The app assumes the user knows what the CCAT is and why they're studying.

---

## 2. Domain Model

### Sub-types

v1 of 18 Seconds covers 14 text-based sub-types: 5 verbal and 9 numerical. The system treats each sub-type as an independent skill with its own mastery state, item bank, and latency threshold.

The 14 v1 sub-types use the following identifiers (used throughout the codebase as the canonical sub-type IDs):

**Verbal (5):**
- `verbal.antonyms`
- `verbal.analogies`
- `verbal.sentence_completion`
- `verbal.critical_reasoning` *(renamed from `verbal.logic` 2026-05-04 — critical reasoning subsumes syllogisms, spatial-direction problems, and the original logic content)*
- `verbal.letter_series` *(moved from numerical to verbal 2026-05-04 — alphabet-position pattern reads as verbal in CCAT taxonomy; id stays `letter_series`, only the section changes)*

**Numerical (9):**
- `numerical.number_series`
- `numerical.word_problems` (arithmetic word problems and basic algebra)
- `numerical.fractions`
- `numerical.percentages`
- `numerical.averages` *(split from `numerical.averages_ratios` 2026-05-04)*
- `numerical.ratios` *(split from `numerical.averages_ratios` 2026-05-04)*
- `numerical.workrate` *(added 2026-05-04 — combined-work / rate-of-completion problems; 15s latency threshold)*
- `numerical.speed_distance_time` *(added 2026-05-04 — solve for any of speed / distance / time given the other two; 15s latency threshold)*
- `numerical.lowest_values` *(added 2026-05-04 — quick comparison of small numeric expression sets, pick smallest or largest; 12s latency threshold)*

> **`verbal.synonyms` cut from v1 2026-05-04.** Synonyms are not present on the real CCAT placement exam — zero observations across 65 captured items in `data/testbank/12min_prep_practice_{1,2}`. The seed file `src/db/seeds/items/data/verbal-synonyms.ts` was deleted and all consumer references updated in commit `5e43eaa` of the taxonomy-restructuring round.

The exact sub-type list is configurable via a single source-of-truth config file at `src/config/sub-types.ts`. Initial implementation should support adding a new sub-type by adding a config entry plus an item template — no other code changes.

### Items

Every practice question (an "item") has:

- A unique ID (UUIDv7 per the Superbuilder Ruleset)
- A sub-type (one of the 14 IDs above)
- A difficulty tier: `easy` | `medium` | `hard` | `brutal`
- A source: `real` | `generated`
- A status: `live` | `candidate` | `retired`
- A prompt (plain text in v1; the body schema uses a discriminated union that admits one variant today and stays open to future image-bearing variants)
- Answer options (typically 4–5)
- The correct answer
- An optional explanation
- An optional strategy hint (referenced by ID; see Strategy Library)
- An embedding vector (1536 dimensions, computed at ingest/generation time)
- Generation metadata (if generated): template ID, generator model, validator outcome, quality score

### Mastery state

Each user has a per-sub-type mastery state, computed from their last 10 attempts on that sub-type:

- **Learning** — accuracy below 70%, or fewer than 5 attempts.
- **Fluent** — accuracy ≥ 80% but median latency above the sub-type's threshold.
- **Mastered** — accuracy ≥ 80% AND median latency ≤ threshold.
- **Decayed** — was mastered, but recent attempts have dropped below the threshold; queued for review.

Latency thresholds are per sub-type, set tighter than 18 seconds. Initial values live in `src/config/sub-types.ts` alongside the sub-type list.

### Sessions

A session is a contiguous block of practice. Three session types:

1. **Diagnostic** — 50-question calibration, runs once on first use.
2. **Drill** — single-sub-type, configurable length and timer mode.
3. **Full-length test** — 50 questions across all sub-types, real-test pace.

Test-day simulation (section 4.6) is a variant of full-length test, not a separate session type.

### Attempts

Every answered question produces an attempt record:

- Item ID
- User ID
- Session ID
- Selected answer (or null if skipped/timed out)
- Correct (boolean)
- Latency in milliseconds (from question render to answer submit)
- Triage prompt fired (boolean)
- Triage prompt taken (boolean)

---

## 3. Item Bank

### 3.1 Real-item ingest

The seed bank is built from screenshots of actual CCAT items, via two parallel ingest paths:

1. **Manual entry through an internal admin form.** The admin types or pastes the question text, options, correct answer, and explanation; an LLM call tags the sub-type and difficulty tier; the admin can override before saving. This path covers small batches and one-off items. Access is gated behind a hardcoded list of admin email addresses in `src/config/admins.ts`.
2. **OCR pipeline for bulk ingest from screenshot folders.** A two-pass LLM pipeline (extract / explain) reads CCAT practice-test PNGs, classifies the sub-type and difficulty, captures the answer key from the screenshot, and synthesizes a triage-style explanation. The explain pass takes the source PNG as a vision-input alongside the text content so chart-bearing items can describe their chart data quantitatively in the recognition step. Implemented as offline scripts (`scripts/import-questions.ts`, `scripts/generate-explanations.ts`). The legacy solve+verify branch is preserved as a defensive fallback for source classes where answers are not visible (unreached for the v1 testbank under the post-2026-05-05 screenshot drops). Source provenance — the originating folder under `data/testbank/` and the PNG filename — is recorded in `items.source_folder` + `items.source_filename` columns at ingest time, queryable by future admin-portal filters. The same admin route is the write boundary, so the bank shape is identical regardless of which path the item came in through.

In both cases the item is saved with `source: real`, `status: live`, and an embedding is computed and stored. The admin page is not exposed to end users.

### 3.2 LLM item generation pipeline

A server-side pipeline generates new items from templates. The pipeline is the centerpiece of the application's architecture and must be clearly structured.

**Pipeline stages:**

1. **Template selection.** Each sub-type has one or more templates stored in the codebase as structured prompts (e.g., "Generate a CCAT antonym question. Provide a target word, 5 options, and the correct answer. The correct option should be the clearest opposite. Difficulty: {tier}.").

2. **Generation.** Call the generator LLM with the template and target difficulty. Request a structured response (JSON) containing prompt, options, correct answer, explanation.

3. **Validation.** Call a different LLM with the generated item and a validator prompt. The validator checks: (a) is the answer actually correct, (b) is the question unambiguous, (c) does it match the difficulty tier, (d) is it materially different from existing items in the same sub-type (uniqueness check via embedding cosine similarity, threshold 0.92).

4. **Quality scoring.** Compute a difficulty estimate from item characteristics (option count, prompt length, semantic distance between distractors). Store as metadata.

5. **Candidate deployment.** The item enters the bank with `source: generated`, `status: candidate`. It can be served to users.

6. **Promotion or retirement.** After 20 real-user attempts, compute observed accuracy and median latency. If they fall in the expected range for the difficulty tier, promote to `status: live`. If they're far off, retire to `status: retired`.

**Hard rule:** The LLM is never exposed to the end user. No chat, no tutor, no user-facing AI generation. The pipeline runs server-side and produces structured items rendered through the same UI as real items.

### 3.3 Bank separation

Two banks are tracked:

- **Real items** — small (~150 items at launch), high trust. Used for the diagnostic and the test-day simulation. `source: real`.
- **Generated items** — large (grows over time), used for daily drill, spaced-repetition review, and adaptive sessions. `source: generated`.

The user is never told which bank an item came from. The system tracks the source for quality monitoring.

---

## 4. Engine

### 4.1 Diagnostic onboarding

First time a user opens the app, they take a 50-question calibration test before anything else. No tutorial, no settings, no profile setup beyond auth.

The diagnostic samples items across the 14 v1 sub-types using a hand-tuned mix. Brutal-tier items are excluded. The allocation totals 50 items, derived empirically from the per-sub-type distribution across the six `12min_prep_practice_{1..6}/` source folders (204 prep-practice items total) under a clamped-proportional rule: 14 sub-types × 3-entry floor + 8 entries allocated proportionally via largest-remainders to the most-prevalent sub-types. The 3-entry floor satisfies SPEC §9.3's mastery-computation per-sub-type-floor of >= 3 attempts; without it, a sub-type that drops below 3 entries would leave its mastery state at `unknown` post-diagnostic, defeating the diagnostic's calibration purpose. The 8-entry proportional bonus distributes empirical-frequency weight across the top 8 sub-types (the bottom 6 stay at the 3-floor). Two forced tier substitutions accommodate empirical bank-distribution gaps: `numerical.workrate` substitutes a `medium` for `easy` (no easy items in the bank), and `numerical.lowest_values` substitutes a `medium` for `hard` (no hard items). The mix is defined in `src/config/diagnostic-mix.ts`. `targetQuestionCountFor` in `src/server/sessions/start.ts` derives from `diagnosticMix.length` per the data-wipe-round derivation fix; future mix changes propagate automatically. It runs in the same focus-mode shell as regular practice (see section 5).

Output: a per-sub-type mastery estimate computed from the diagnostic attempts. The user lands on the Mastery Map (section 5.2) with mastery icons populated and a recommended first session queued up.

### 4.2 Adaptive difficulty

Within a sub-type, the engine selects the next item to keep the user in the 80–85% accuracy zone. Implementation:

- Track running accuracy and latency over the last 10 attempts in the current sub-type within the current session.
- If accuracy ≥ 90% AND latency comfortably under threshold → step up one difficulty tier.
- If accuracy ≤ 60% OR latency well above threshold → step down one tier.
- Otherwise hold.

The engine never serves the same item twice in a session. Across sessions, items can repeat per the spaced-repetition rules.

**Dojo framing — shipping in Phase 5 sub-phase 5 (v1 user-facing).** The adaptive walker above is being framed to the user as "dojo mode" — a martial-arts metaphor for practice-with-resistance. The post-session review surface (PRD §6.5) renders a colored belt indicator showing the highest tier the walker reached during the session: white = easy, blue = medium, brown = hard, black = brutal. The metaphor is copy-layer; the engine, tier names, and walker behavior in this section are unchanged. See `docs/plans/phase5-dojo-belt-indicator.md` for the round.

### 4.3 Spaced-repetition review queue

> **Cut from v1 2026-05-04.** Section preserved as historical reference. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04 for rationale. v1 ships adaptive difficulty per drill (§4.2) without a cross-session SM-2 ladder; review-queue resurfacing is deferred to a later round.

Items the user got wrong (or got right but slowly, missing the mastery latency) enter a review queue. Items resurface at intervals: 1 day, 3 days, 7 days, 21 days. Use a simple SM-2 style schedule.

A "review" session pulls only items currently due. Available from the Mastery Map as a single button when due items exist.

### 4.4 Drill modes

> **Speed-ramp and Brutal drill modes cut from v1 2026-05-04.** Section preserved as historical reference. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04 for rationale. v1 ships **Standard** drill mode only (18s/question, adaptive difficulty mix per §4.2). The "Brutal" *drill mode* (hard-only timer mode) is cut; the **Brutal difficulty tier** in the item bank (§2 Items) is unaffected and remains in v1 — the adaptive walker (§4.2) can still serve Brutal-tier items inside Standard drills.

Per-sub-type drills support three timer modes:

- **Standard:** 18 seconds per question, default difficulty mix.
- **Speed ramp:** 12 seconds per question, easier difficulty mix.
- **Brutal:** 18 seconds per question, hard items only.

Drill length is configurable (default 10 questions). The drill runs through all questions, then surfaces the post-session review (section 6.5).

### 4.5 Full-length practice test

50 questions in 15 minutes, real-test difficulty mix and randomized interleaving across the v1 sub-types (verbal and numerical, no section breaks). Pulls from the real-items bank when possible. Exits to the post-session review on completion or timeout.

### 4.6 Test-day simulation mode

Identical to the full-length practice test but with stricter UI: no pause button, no visible question-skip indicators, randomized cross-sub-type interleaving and increasing difficulty matching the real Criteria On-Demand Assessment platform's progression curve. Used as a final dress rehearsal before a real test. Available from the Mastery Map but not the default session option.

---

## 5. Interface

### 5.1 The focus-mode shell

> **Timer-toggles cut from v1 2026-05-04** (both question-timer toggle and session-timer toggle, per the user-facing toggle UI and per-user persistence). Section preserved as historical reference. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04 for rationale. In v1, timer visibility is **static per session type**: session timer + pace track ON for full-length tests, simulations, drills, and the diagnostic; question timer OFF everywhere (the underlying 18-second elapsed-time tracking still drives the triage prompt — only the visible chronometer is hidden). The focus-mode shell itself is core to v1 and ships as specified below; only the toggle controls and the per-user-persisted visibility state are cut.

Every practice session — diagnostic, drill, full-length test, and simulation — runs inside a shell with strict UI rules.

**During a question:**

- The current question is the only fully-illuminated element. Periphery is dimmed (~20% brightness).
- No visible progress count (no "12 of 50" or percentage).
- No navigation chrome, sidebars, or notifications.
- Single salient target: the question and its answer options.

**Timers:**

The shell supports three independent peripheral elements: the session timer, the pace track, and the question timer. All three sit in the periphery, dimmed to match the surrounding chrome, and never overlap the question content. The shell tracks elapsed time internally regardless of which elements are visible.

- **Session timer (overall).** A countdown for the full session length (e.g., 15:00 for a full-length test, 3:00 for a 10-question speed drill), rendered as a horizontal bar spanning the periphery. The bar starts full at the start of the session and depletes from the left edge inward as time elapses, so the remaining-time portion shrinks toward the right edge of the screen. A small numeric readout (e.g., `8:42`) sits at the right end of the bar for users who want exact remaining time. Default state: ON for full-length tests, simulations, drills, and the diagnostic.

- **Pace track (overall).** A second horizontal bar rendered immediately below the session timer bar, divided into discrete blocks — one block per question in the session (e.g., 50 blocks for a full-length test, 10 for a 10-question drill). Each block is sized to represent the per-question pace target, so the total length of the pace track matches the total length of the session timer when the user is exactly on pace. For most sessions, each block represents 18 seconds of session time; for speed-ramp drills, each block represents the tighter target (e.g., 12 seconds). The block size is configured per session type and per drill mode. When the user submits an answer, the leftmost block in the pace track is removed (the track shortens from the left edge inward). The visual relationship between the pace track and the session timer bar tells the user, at a glance:
    - **Pace track shorter than session timer remaining** → user is ahead of pace. They have surplus time.
    - **Pace track longer than session timer remaining** → user is behind pace. They are spending more than the per-question target on average.
    - **Pace track equal to session timer remaining** → user is exactly on pace.

  Both bars share the same visual register (same height, same color treatment, same dimming). The pace track is non-interactive — it is purely a visualization of the question-budget remaining versus the time-budget remaining. The pace track's visibility is tied to the session timer's visibility (toggling one toggles both).

- **Question timer (per-question).** An 18-second countdown for the current question (or the per-question target for the active drill mode, if different), rendered as a horizontal bar that depletes from the left edge inward, so the remaining-time portion shrinks toward the right edge of the screen. The bar starts full when the question renders and reaches zero at the per-question target. When it reaches zero, the triage prompt fires. Default state: OFF for all session types unless the user enables it. The user can toggle it mid-session without ending the question.

When any element is toggled OFF, its visual element is fully hidden (not greyed out). Timer visibility state is persisted per user (so if a user turns the question timer on during one drill, it stays on for their next drill until they toggle it off).

**Triage prompt (see section 6.1):**

When a question's elapsed time exceeds 18 seconds, the periphery flashes a single message: "Best move: guess and advance." This is the only mid-question UI element that appears regardless of timer settings.

**Implementation note:** Build the shell as a reusable component (e.g., `<FocusShell>{children}</FocusShell>`). All session types render through it. The shell owns the dimming, all three timers, the triage prompt, the timer toggle controls, and the inter-question card.

### 5.2 Mastery Map (home screen)

The default screen on app open (after auth and post-diagnostic). Contents:

- **Today's near goal.** One categorical target rendered as a single line of text. Examples: "Master Number Series by Friday — 2 sessions to go." or "Finish today's drill — 1 session left." Computed from current mastery state plus user's target date (section 6.3).
- **Sub-type mastery icons.** 14 icons in a grid, grouped by section (verbal: 5 icons; numerical: 9 icons). Each icon shows mastery state via fill: `mastered` (filled), `fluent` (half-filled), `learning` (outlined), `not yet attempted` (locked). No percentages, no numbers, no scores beneath the icons.
- **Start session button.** Single primary CTA labeled with the next recommended session ("Start drill: Number Series"). One button. No menu of options.
- **Secondary actions.** Small, low-contrast: "Review (3 due)" if review items exist, "Full-length test," "Test-day simulation," "History."

What's NOT on this screen: percentage progress, calendar view, multi-week roadmap, achievements, motivational messages, anything decorative.

### 5.3 NarrowingRamp (pre-session protocol)

> **Cut from v1 2026-05-04.** Section preserved as historical reference. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04 for rationale. v1 launches sessions directly from the Mastery Map start-session button without the 75-second pre-session protocol; the if-then-plan stored on the session, visual narrowing step, session brief, and launch countdown are all deferred. The mid-session if-then plan-trigger flash is also deferred — the generic triage prompt (§6.1) fires instead.

An optional 75-second protocol that runs before any drill, full-length test, or simulation. The user can skip it via a small link, but it's the default flow. Not used before the diagnostic.

**Sequence:**

1. **Obstacle scan (30s).** A prompt: "What's most likely to cost you points today?" Three suggested options surface based on the user's current weakest sub-types and recent failure patterns. User picks one. An if-then plan is suggested via LLM or preset (e.g., "If I've spent 18 seconds on a question, I will guess and advance"). User can accept the suggestion or write their own. The plan is stored on the session.

2. **Visual narrowing (15s).** A central fixation point appears. Periphery dims fully. A small target moves slowly across the screen; the user follows it with their eyes. No interaction required. Ends with a brief pulse on the central point.

3. **Session brief (15s).** A categorical preview, plain text: "Today's session: Number Series drill. 10 questions. 12 seconds each." No success language. No "you've got this." No imagery.

4. **Launch (15s).** A 5-second countdown with the periphery already dimmed. The first question appears.

Mid-session, if the user's stored if-then plan's trigger fires (e.g., they cross 18 seconds on a question and the plan was about triage), the periphery flashes their own committed response back at them rather than the generic triage prompt.

### 5.4 History tab

A simple chronological list of past sessions. Each row: date, session type, sub-type(s) covered, accuracy, median latency. Click into a row to see the per-question breakdown. Available from a small link on the Mastery Map. Not on the default screen.

---

## 6. Speed-Test-Specific Features

### 6.1 Triage trainer

When the timer for the current question crosses 18 seconds, the focus shell flashes a single message in the periphery: "Best move: guess and advance." If the user clicks it (or presses a configured shortcut), they advance with whatever option is currently selected (or a random one if none).

Each triage event is logged on the attempt:
- Prompt fired: yes/no
- User took the prompt: yes/no (computed: did the user submit within ~3 seconds of the prompt firing?)
- Question outcome: correct, incorrect, skipped

The user's **triage score** = % of questions where the prompt fired AND the user took it. Surfaced in post-session review and on the Mastery Map (small, secondary).

### 6.2 Speed ramp drill mode

> **Cut from v1 2026-05-04** (same feature as §4.4 speed-ramp drill mode). Section preserved as historical reference. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04 for rationale.

Already specified in section 4.4. Tighter timer (12s vs 18s) on easier items. The intent is to train above the target tempo so target tempo feels manageable.

### 6.3 Score-to-target calibration

A single setting on the user record: target percentile (e.g., "top 20%") and target date. Drives the "today's near goal" line on the Mastery Map.

Logic for the near-goal line:
- Compute remaining sub-types not yet mastered.
- Compute days remaining until target date.
- Recommended sessions per day = `ceil(remaining_subtypes * 2 / days_remaining)`.
- The Mastery Map line reflects the user's current trajectory: ahead, on track, or behind.

Adjust the line daily based on actual progress. No graphs. One line of text.

### 6.4 Strategy library

A small library of plain-text strategy notes, three per sub-type for the 11 currently-authored sub-types (33 total: 3 entries × 11 sub-types — 5 verbal + 6 numerical, excluding `numerical.workrate`, `numerical.speed_distance_time`, and `numerical.lowest_values`, which are pending a separate strategy-authoring round). The three entries per sub-type differ by **kind**: one recognition tip, one technique tip, one trap-avoidance tip. Stored in the codebase at `src/config/strategies.ts` (generated based on example problems and reference material) as a `Partial<Record<SubTypeId, ...>>` so the three pending sub-types omit cleanly. Examples:

- Number series: "Test differences between consecutive terms before testing ratios."
- Antonyms: "When two answers seem opposite, the correct answer is usually the more general opposite."

Strategies surface in two places, both *outside* an active question:

1. After a session, in the post-session review (section 6.5), paired with sub-types where the user struggled.
2. From the Mastery Map history tab, browsable by sub-type.

Strategies never appear during an active question.

### 6.5 Post-session review

> **Code shipped 2026-05-04 (Phase 5 sub-phase 1).** The review surface lands on `/post-session/[sessionId]` for every session type (drill / diagnostic / full_length / simulation). Diagnostic mode additionally renders the existing `<OnboardingTargets>` form + conditional pacing-line. See SPEC §10.7 for the shipped composition; `docs/plans/phase5-post-session-review.md` for the round; commits `c1ee435` (round setup + shell-shape refactor + drill landing flip) → `eaeb882` (`<StrategySurface>` + drill Continue button + full-surface audit + polish).

After every session (drill, full-length test, simulation, diagnostic), the user lands on a review screen. Contents:

- Triage score for the session (rendered first per the calibration-discipline framing in §1).
- Accuracy summary by sub-type (categorical: ✓ / ✗ counts, no percentages on this screen).
- Median latency by sub-type, with the threshold marked.
- Any wrong items, browsable. Each shows the prompt, options, correct answer, explanation.
- Surfaced strategies for sub-types where the user struggled (one strategy per struggled sub-type; failure-mode-driven kind preference: fast-wrong → trap, slow-wrong / slow-but-right → recognition; technique as universal fallback).
- Diagnostic only: `<OnboardingTargets>` (target percentile + target date capture). Primary "Save and continue"; smaller "Skip for now" link.
- Diagnostic only, conditional on session duration > 15 minutes: a derived pacing-line sentence ("Your diagnostic took N minutes. The real CCAT is 15 minutes for 50 questions.").
- Drill / full-length / simulation: a single "Continue" button → `/`. Diagnostic mode dismisses via the `<OnboardingTargets>` form; both flows call `router.push("/")`.

> **30-second strategy-review gate cut from v1 2026-05-04** (post-full-length only). Paragraph below preserved as historical reference. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04 for rationale. In v1, the post-session review is dismissible immediately for **all** session types (drill, full-length, simulation, diagnostic). The rest of §6.5 (the post-session review surface itself — accuracy, latency, triage score, wrong items, surfaced strategies) remains in scope and shipped 2026-05-04.

After a full-length practice test only, an additional 30-second strategy-review prompt runs before the user can dismiss the screen. The system picks one strategy (paired with the question type the user struggled most with in the test) and displays it. The user must view it before "completing" the test in the system.

Drills and the diagnostic skip the 30-second strategy-review gate; their post-session review is dismissible immediately.

---

## 7. Tech Stack

The stack is anchored on the Superbuilders [`superstarter`](https://github.com/superbuilders/superstarter) Next.js template. The rationale is twofold: it ships with the conventions and tooling Alpha's engineering team uses internally (so anyone reviewing the code recognizes the patterns immediately), and it eliminates a half-day of toolchain setup so the build can focus on the application itself.

### Foundation (inherited from superstarter)

- **Framework:** Next.js (App Router) with React 19. Server components for data fetching; client components for the focus shell, timers, and admin forms.
- **Runtime & package manager:** Bun.
- **Database:** PostgreSQL via Drizzle ORM. AWS RDS in production with IAM auth via OIDC federation (no DB passwords in env). Local development uses a Docker-hosted Postgres pointed at via `DATABASE_URL`.
- **Hosting:** Vercel, with Vercel ↔ AWS OIDC federation pre-configured by the IaC package (`packages/superstarter-iac`).
- **Linting & formatting:** Biome with the custom GritQL ruleset (the "Superbuilder Ruleset"). Enforced via Lefthook pre-commit hook.
- **Error handling:** [`@superbuilders/errors`](https://github.com/superbuilders/errors) — the Go-inspired explicit-error-return pattern. `try/catch` and `new Error()` are banned by the ruleset.
- **Logging:** Pino via the `@/logger` wrapper provided by superstarter. Structured key-value attributes only; no string interpolation.
- **Environment variables:** T3 Env for typed, validated environment access.
- **TypeScript:** TypeScript 7 beta via `tsgo`. Falls back to `@typescript/typescript6` aliased as `typescript` for packages that require the legacy peer.

### Authentication

- **Auth.js v5** (`next-auth@beta`) with the Drizzle adapter (`@auth/drizzle-adapter`).
- **Provider:** Google OAuth only. No email/password, no other providers.
- **Setup:** Google OAuth client created in Google Cloud Console (Web application type), with localhost and production callback URLs registered. Three env vars: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`.
- **Schema customization:** Auth.js's default schema uses `timestamp` columns. The Superbuilder Ruleset bans these, so the Drizzle adapter is configured with a custom schema that uses `bigint` (epoch milliseconds) for `expires`, `emailVerified`, etc.

### LLM integration (server-side only)

- **Generator:** `@anthropic-ai/sdk` calling Claude Sonnet 4. Stronger at structured creative output for the item templates.
- **Validator:** `openai` SDK calling GPT-4o. Different model from the generator to reduce shared-bias errors per the Generation Pipeline spec (section 3.2).
- **Embeddings:** OpenAI `text-embedding-3-small` for the validator's uniqueness check. Cheap, fast, sufficient for the in-bank-similarity comparison.
- **Hard rule:** All LLM calls happen in server-side modules. No client-side SDK usage. No streaming responses to the user. No chat surface.

### Vector search

- **`pgvector`** as a Postgres extension for storing and querying item embeddings. Added to the IaC config alongside `pgcrypto`.
- **Schema:** one `embedding vector(1536)` column on the `items` table.
- **Query pattern:** cosine similarity, fetched via Drizzle using a custom column type for `vector`.

### Async work

- **Vercel Workflows** (`"use workflow"` / `"use step"` directives, already wired up by superstarter).
- **Workflow uses:**
    - The generation pipeline (generate → validate → score → deploy), one workflow per item with retries.
    - Recomputing user mastery state after a session.
    - ~~Refreshing the spaced-repetition queue.~~ **Cut from v1 2026-05-04** — spaced-repetition queue cut (§4.3 cut marker). The `reviewQueueRefreshWorkflow` was never shipped; v1 has no SR queue work. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.
    - Backfilling embeddings for newly-ingested real items.
- **Synchronous path** (not workflows): every user-facing interaction. Question render → answer submit → next question stays a single round trip.

### Frontend

- **Styling:** Tailwind CSS 4 via shadcn/ui (already installed at `src/components/ui/` in superstarter).
- **Animations:** Framer Motion for the focus shell's dimming transitions, inter-question card fades, the visual narrowing protocol, and the timer bar depletion.
- **Optimistic updates:** React 19's `useOptimistic` hook for answer submission. Optimistically advance the UI; persist the attempt asynchronously.
- **Icons:** Lucide React for the Mastery Map's mastery-state icons.
- **Design system (optional):** The [`alpha-style`](https://github.com/PSkinnerTech/alpha-style) skill bundle, installed into the AI coding tool (`npx skills add PSkinnerTech/alpha-style`). Applied selectively: invoked for the Mastery Map, post-session review, history tab, and admin pages; explicitly opted out of inside the focus shell, which deliberately departs from Alpha's polished aesthetic.

### Focus shell implementation specifics

- Single component (`<FocusShell>{children}</FocusShell>`) with internal state for timer visibility, dim level, current item, and elapsed time. Not fragmented across multiple components — visual coherence depends on shared state.
- **Layout:** CSS Grid with named template areas (`header` for timer bars and pace track, `content` for the salient question, `footer` for the question timer when enabled, `peripheral` for the triage prompt overlay). Dimming is animated by tweening `opacity` on each named area independently.
- **Timer animations:** `requestAnimationFrame` (not `setInterval`). Smoother depletion, easier pause/resume, no clock drift.
- **Latency measurement:** the `Performance` API (`performance.now()`). Sub-millisecond precision. Latency starts at first paint of the question, ends at submit click.

### What's intentionally not in the stack

For clarity on what won't be installed and why:

- **No tRPC.** Server actions cover all client-server communication.
- **No global state library** (Redux, Zustand, Jotai). Server state is in Postgres; client state is component-local. The focus shell's complexity is manageable with `useReducer`.
- **No client-side query library** (TanStack Query, SWR). Server components handle fetching.
- **No Redis.** Postgres is sufficient for ~~the spaced-repetition queue and~~ session state at this scale. (**Cut from v1 2026-05-04** — SR queue cut, §4.3 cut marker. The no-Redis decision still stands; the rationale just leans on session state alone in v1. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.)
- **No payments, email service, analytics SDK, notification system, or CDN configuration.** Out of scope per section 10.

### Required external accounts and credentials

- **AWS account** with credentials in `~/.aws/credentials` and a default VPC in `us-east-1` (for production IaC).
- **Vercel team** (not just a personal account — OIDC federation requires a team slug).
- **Google Cloud Console project** for the OAuth client.
- **Anthropic API key** with billing enabled (~$50 credit recommended for development).
- **OpenAI API key** with billing enabled (~$50 credit recommended; the validator chain runs the bill faster than the generator alone).

### Local development fallback

If AWS or Vercel team accounts aren't yet provisioned, the application can run locally without the production IaC. Use a Docker-hosted Postgres pointed at via `DATABASE_URL` instead of the IAM-auth pool. The application code is identical; only the database connection module differs. Production deployment requires the full IaC.

---

## 8. Architecture

### 8.1 Data model

All `id` columns use UUIDv7 (per the Superbuilder Ruleset). All time-bearing columns are `bigint` epoch milliseconds (no `timestamp`/`date`/`time`/`interval` per the ruleset). One table per file under `src/db/schemas/`, organized by domain.

The Auth.js tables (`users`, `accounts`, `sessions`, `verification_tokens`) are maintained by the Drizzle adapter with custom `bigint` schemas as noted in section 7. The application-specific tables below are additional.

> **Partial cut from v1 2026-05-04.** Schema sketch below preserved as historical reference; two callouts per the round's on-disk-code-surface convention (cleanup deferred to the v1-code-cleanup follow-up round, not this round):
> - `sessions.narrowing_ramp_completed` + `sessions.if_then_plan` columns: NarrowingRamp protocol cut (§5.3 marker). Both columns **were dropped from tree** in v1-code-cleanup commit 3 (`938f771`, 2026-05-04) via migration `0001_true_young_avengers.sql`.
> - `review_queue` table: spaced-repetition queue cut (§4.3 marker). The table **was dropped from tree** in v1-code-cleanup commit 4 (`37ad762`, 2026-05-04) via migration `0002_tranquil_mach_iv.sql`; the schema file `src/db/schemas/review/review-queue.ts` was deleted alongside the `review/` directory.
>
> See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04. The detailed SPEC counterparts are at SPEC §3.4 + §3.5 cut markers.

```
users (id, email, name, image, target_percentile, target_date_ms,
       timer_prefs_json, created_at_ms)
sub_types (id, name, section, latency_threshold_ms)
items (id, sub_type_id, difficulty, source, status, prompt, options_json,
       correct_answer, explanation, strategy_id, embedding, metadata_json,
       created_at_ms)
sessions (id, user_id, type, started_at_ms, ended_at_ms,
          narrowing_ramp_completed, if_then_plan)
attempts (id, session_id, item_id, selected_answer, correct, latency_ms,
          triage_prompt_fired, triage_taken, created_at_ms)
mastery_state (user_id, sub_type_id, current_state, updated_at_ms)
review_queue (id, user_id, item_id, due_at_ms, interval_days)
strategies (id, sub_type_id, text)
```

Notes:

- `users.password_hash` is intentionally absent — Auth.js with Google OAuth does not store passwords.
- `users.timer_prefs_json` stores the per-user toggle state for the session timer, pace track, and question timer (per section 5.1).
- `users.target_date_ms` and `created_at_ms` use the `_ms` suffix as a convention to make the epoch-millisecond format explicit and grep-able.
- `items.embedding` is a `vector(1536)` column managed via the pgvector custom Drizzle type.

### 8.2 Generation pipeline

The pipeline lives behind an internal API route (`POST /api/admin/generate-items`), gated by the admin email check. Triggered manually for v1 (admin runs it to top up the bank). Output: candidate items written to the database.

The pipeline is structured as a single module at `src/server/generation/pipeline.ts` with the four stages clearly separated:

- `generateItem(template, difficulty)` → raw item from generator LLM
- `validateItem(item, existingBank)` → pass/fail with reasons
- `scoreItem(item)` → quality + difficulty estimate
- `deployItem(item)` → write to DB as candidate

This structure is itself a deliverable. The README must walk through it explicitly.

The pipeline runs as a Vercel Workflow (one workflow invocation per item) so individual stages can retry independently and the admin trigger doesn't block on long generation times.

### 8.3 Performance targets

- Question render to first paint: < 200ms.
- Latency measurement starts at first paint of the question, ends at submit click (`performance.now()` precision).
- Generation pipeline runs async; users never wait on it.
- Mastery state recomputation: async via workflow after a session ends; the user can leave the post-session review while the recomputation finishes in the background.

---

## 9. Build Order

A 2-week build plan, in priority order.

**Week 1:**

1. Auth (Google OAuth via Auth.js with `bigint` schema customization) + database schema + sub-type config.
2. Real-item ingest admin page; seed ~150 items by hand.
3. Focus shell component + diagnostic flow.
4. Mastery state computation + Mastery Map screen.
5. Drill mode (standard timer only, with session timer and pace track).

**Week 2:**

6. LLM generation pipeline (generator + validator + scorer + deploy).
7. Adaptive difficulty ~~+ spaced-repetition queue~~. (**Cut from v1 2026-05-04** — SR queue cut, §4.3 marker. Adaptive difficulty stays in v1 — Phase 5 sub-phase 2. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.)
8. Triage trainer ~~+ speed ramp + brutal drill modes + question timer toggle~~. (**Cut from v1 2026-05-04** — speed-ramp + brutal drill modes (§4.4 marker) + question-timer toggle (§5.1 marker) all cut. Triage trainer stays in v1. See `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.)
9. ~~NarrowingRamp +~~ score-to-target + post-session review. (**NarrowingRamp cut from v1 2026-05-04** — §5.3 marker. Score-to-target and post-session review both stay in v1; **post-session review shipped Phase 5 sub-phase 1, 2026-05-04.** See `docs/plans/phase5-post-session-review.md` and `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04.)
10. Strategy library + test-day simulation mode + history tab.

**Cuts if behind:** test-day simulation, history tab detail views. The mastery model, generation pipeline, focus shell, and Mastery Map are non-negotiable.

> **2026-05-04 reconciliation.** The NarrowingRamp visual-narrowing clause was struck from this list because the entire NarrowingRamp protocol is now cut from v1 (see §5.3 marker). The original clause read: *"NarrowingRamp's visual narrowing step (keep the obstacle scan and brief)"* — moot now that the whole protocol is deferred. The build order itself (steps 1–10) is preserved as historical reference; for current Phase 5 v1 scope see `docs/plans/feature-roadmap.md` § Cut from v1 2026-05-04 and `docs/plans/phase5-master-plan.md`.

---

## 10. Out of Scope (for v1)

- Mobile apps.
- Multi-language support.
- Account recovery flows (Google OAuth handles this).
- Analytics dashboards beyond what's on the Mastery Map and history tab.
- Item difficulty tuning via crowdsourced data (manual difficulty tagging is sufficient).
- A/B testing infrastructure for UI variants.
- Notification systems (email, push, SMS).
- Payments or subscriptions.
- Any social or sharing features.
- Offline mode.

---

## Companion Documents

- `CCAT-categories.md` — taxonomy and strategic notes for the 18 CCAT sub-types. Used as input to the strategy library and the generation pipeline's templates.