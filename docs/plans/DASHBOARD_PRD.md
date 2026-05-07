# 18seconds — Dashboard PRD

Ship the "Dojo" dashboard at `/`. This document is the source of truth for that screen; implement against it. When something is ambiguous, default to the visual mockup in `docs/plans/dashboard_reference.png` that produced this spec.

This rev of the PRD has been reconciled against the actual codebase as of 2026-05-07. Tables, helpers, and file paths now match what's there, with column-mapping tables where names drifted and stub helpers/schemas where the dashboard's data needs outrun what's been built. The visual spec (layout, tokens, cobalt rule, belt mechanics) is unchanged.

---

## 1. Context

**Product.** 18seconds is a CCAT practice app focused on hitting the user's target percentile by training Verbal and Numerical questions to reflex speed. The name comes from the test's pace: roughly 18 seconds per question. The app frames practice as climbing 14 belts (5 verbal sub-types + 9 numerical sub-types per `src/config/sub-types.ts`), white → blue → brown → black, calculated independently per sub-type.

**Stack.** Next.js 16 (App Router, Bun, `cacheComponents` on), Drizzle ORM (PostgreSQL 18 with native `uuidv7()`), Tailwind CSS v4 (no `tailwind.config.ts` — theme tokens live in `src/styles/unstyled/globals.css` via `@theme inline`), shadcn/ui primitives, lucide-react for icons, Pino via `@/logger`, Auth.js v5 (NextAuth) via `@/auth`, Superbuilder error handling via `@superbuilders/errors`.

**Scope of this PRD.** Just the dashboard at `/` (which under the App Router lives at `src/app/(app)/page.tsx`, replacing the current Mastery Map placeholder there). The data layer is implemented as a typed contract whose helpers are a mix of **real reads** (against existing tables) and **stubs** (returning sensible mock values where the upstream feature isn't built yet). Every stub is labeled and scheduled against a follow-up PRD in §19.

---

## 2. Goal

A single, server-rendered screen that answers, on landing, in this order of importance:

1. **Where am I vs the goal?** Current estimated CCAT score, trend vs last sim, goal (default 40), days to test.
2. **What should I do today?** A smart-picked mission with a one-tap primary CTA and an "alternate" escape hatch.
3. **Where are my belts?** 14 sub-type rows split into Verbal Dojo and Numerical Dojo, each with a belt indicator, progress bar, and link to the drill.
4. **How's my pace and what's queued?** Median time per question this week, count of mistakes queued for spaced review, last full sim result.

Client-side interactivity on this page is limited to navigation. No form state, no mutations from the dashboard itself.

---

## 3. Constraints (Superbuilder ruleset)

These cause lint or typecheck errors when violated. Don't fight them.

**Error handling.** No `try…catch`. No `new Error()`. Use:

```ts
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

const result = await errors.try(loadSomething())
if (result.error) {
  logger.error({ error: result.error }, "dashboard data load failed")
  throw errors.wrap(result.error, "dashboard data load")
}
const data = result.data
```

**Type assertions.** No `as` except `as const`. Narrow with type guards or Zod.

**Optionality.** Prefer `undefined` over `null`. Never `T | null | undefined` at function boundaries. Use `field?: T`.

**Logging.** Pino object-first. `logger.info({ context }, "message")` — context object first, literal string second. No template literals in the message position. Always log before `throw`.

**Database.** UUIDv7 PKs only (`.default(sql\`uuidv7()\`)`). No `timestamp`/`date`/`time`/`interval` columns; recover times via `timestampFromUuidv7(id)` from `@/db/lib/uuid-time` (real path, real export). One table per file under `src/db/schemas/<domain>/<table>.ts`. **Do not run `db:generate`, `db:push`, or `db:migrate` as part of this PRD.** The dashboard reads only; if a real read can't be wired without a migration, the helper stays stubbed and the migration goes into a follow-up PRD (§19).

**Visual.** No emoji in source. No nested cards (cards inside cards). No gradient text. No `outline: none` without a `:focus-visible` replacement. Two font weights only: 400 (regular) and 500 (medium). Sentence case in headings.

**RSC data fetching.** Per `rules/rsc-data-fetching-patterns.md`: server components must NOT be `async`. Initiate fetches as promises and pass them through; consume with `React.use()` inside client components, behind a `<React.Suspense>` boundary. The dashboard page in §11 follows this pattern.

---

## 4. File map

The dashboard replaces the current `(app)/page.tsx` (Mastery Map placeholder). It inherits the existing `(app)/layout.tsx` auth + diagnostic-completed gate.

| Path | Action | Purpose |
|---|---|---|
| `src/app/(app)/page.tsx` | replace | Dashboard server component (composes everything) |
| `src/app/layout.tsx` | modify | Swap in Plus Jakarta Sans + Newsreader via `next/font/google` (currently Inter + Geist) |
| `src/styles/unstyled/globals.css` | modify | Append the design tokens block (§8) inside the existing `@theme inline` |
| `src/server/dashboard/types.ts` | create | Data contract (§5) |
| `src/server/dashboard/data.ts` | create | `getDashboardData(userId)` server function (§6) |
| `src/server/dashboard/helpers.ts` | create | Pure formatters and `deriveHeadline` (§7) |
| `src/server/dashboard/belts.ts` | create | `loadAllBelts(userId)` — STUB (§19) |
| `src/server/dashboard/mission.ts` | create | `pickTodaysMission(userId)` — STUB (§19) |
| `src/server/dashboard/score.ts` | create | `computeScoreEstimate(userId)`, `getLastFullSim(userId)` — STUB (§19) |
| `src/server/dashboard/streak.ts` | create | `computeStreak(userId)` — STUB (§19) |
| `src/server/dashboard/pace.ts` | create | `computePaceWeek(userId)` — STUB (§19) |
| `src/components/dashboard/belt-indicator.tsx` | create | §10.1 |
| `src/components/dashboard/belt-row.tsx` | create | §10.2 |
| `src/components/dashboard/dojo-card.tsx` | create | §10.3 |
| `src/components/dashboard/mission-card.tsx` | create | §10.4 |
| `src/components/dashboard/stat-tile.tsx` | create | §10.5 |
| `src/components/dashboard/score-strip.tsx` | create | §10.6 |
| `src/components/dashboard/pace-metric.tsx` | create | §10.7 |
| `src/components/dashboard/mistakes-tile.tsx` | create | §10.8 |
| `src/components/dashboard/last-sim-tile.tsx` | create | §10.9 |
| `src/components/dashboard/streak-chip.tsx` | create | §10.10 |
| `src/components/dashboard/top-nav.tsx` | create | §10.11 |
| `src/db/schemas/practice/user-sub-type-belts.ts` | create (stub) | §18 — minimal schema for future belt-promotion logic |

Domain helpers live under `src/server/dashboard/` because this codebase places server-only domain logic there (`src/server/mastery/`, `src/server/triage/`, `src/server/sessions/`). Avoid `src/lib/dashboard/` — `src/lib/` in this repo is reserved for shared client-safe utilities (today only `cn`).

---

## 5. Data contract

`src/server/dashboard/types.ts`. The dashboard receives a `DashboardData` from the server function. Components consume slices via props.

```ts
export type BeltLevel = "white" | "blue" | "brown" | "black"

export interface SubtypeRow {
  /** sub_types.id (a varchar slug like "verbal.analogies") */
  id: string
  /** URL-safe identifier — same string as id today */
  slug: string
  /** Display name in sentence case, e.g. "Sentence completion" */
  name: string
  belt: BeltLevel
  /** 0..1, fraction of promotion window met. Clamped at the call site. */
  progressToNext: number
  /** True if recent accuracy < 65% or median time > target by 30%+ */
  atRisk: boolean
  /** Where "drill this" navigates */
  href: string
}

export interface DashboardData {
  user: {
    firstName: string
    initials: string
    streakDays: number
  }
  greeting: {
    today: Date
    /** Derived editorial line: "You're climbing.", "Steady today.", etc. */
    headline: string
  }
  score: {
    /** Latest estimate; undefined when no full sim has been taken */
    current?: number
    /** Signed delta vs previous full sim; undefined when fewer than 2 sims */
    delta?: number
    /** Per users.target_percentile, default 40 when null */
    goal: number
    daysToTest?: number
  }
  mission: {
    eyebrow: string
    title: string
    body: string
    primaryHref: string
    primaryLabel: string
    alternateHref: string
    alternateLabel: string
  }
  verbal: ReadonlyArray<SubtypeRow>
  numerical: ReadonlyArray<SubtypeRow>
  pace: {
    medianSeconds: number
    /** Hard target (18) */
    targetSeconds: number
    /** Length 7, oldest first */
    last7Days: ReadonlyArray<{ medianSeconds: number; isToday: boolean }>
  }
  mistakesQueue: {
    count: number
    estimatedMinutes: number
    href: string
  }
  lastSim?: {
    score: number
    outOf: number
    daysAgo: number
    durationSeconds: number
    href: string
  }
}
```

`current` and `delta` are now optional because the codebase does not yet store a per-sim score; stub returns `undefined` and the UI renders an em-dash. See §10.6.

---

## 5.1 Real schema mapping

The original draft of this PRD assumed a set of `core_*`-prefixed tables that don't exist by that name. Here is what's actually there (in `src/db/schemas/`) and how it maps:

| PRD assumed name | Actual table | Status | Column mapping |
|---|---|---|---|
| `core_users` | `users` (`auth/users.ts`) | EXISTS, drift | `firstName` → derive from `name`. `goalScore` → `targetPercentile` (default 40 when null). `testDate` → `targetDateMs` (epoch ms; convert via `new Date(ms)`; days-to-test = `Math.ceil((targetDateMs - Date.now()) / 86_400_000)`). `id` (uuidv7) matches. |
| `core_subtypes` | `sub_types` (`catalog/sub-types.ts`) | EXISTS, drift | `id` is `varchar(64)` (e.g. `"verbal.analogies"`), NOT a uuid. `name` matches. `section` matches the `verbal | numerical` split. `latencyThresholdMs` is an additional column the dashboard can ignore. The 14 sub-type defs are duplicated in `src/config/sub-types.ts` (`subTypeIds`, `subTypes`); read display names from there. |
| `core_practice_sessions` | `practice_sessions` (`practice/practice-sessions.ts`) | EXISTS, drift | `mode = 'full_sim'` → `type = 'simulation'` (the enum value is `simulation`, not `full_sim`). `startedAt` → `startedAtMs` (epoch). `endedAt` → `endedAtMs` (epoch, nullable). No `score` column — the score has to be derived from joined `attempts` rows or stubbed. |
| `core_question_attempts` | `attempts` (`practice/attempts.ts`) | EXISTS, drift | `correct: boolean`, `latencyMs: integer`, `sessionId`, `itemId`. No standalone `userId` column — join through `practice_sessions.userId`. |
| `core_user_subtype_ratings` (PRD's belt source) | `mastery_state` (`practice/mastery-state.ts`) | EXISTS, semantic drift | `mastery_state.current_state` is a 4-value enum `learning | fluent | mastered | decayed` — different conceptual axis from belts (`white | blue | brown | black`). Don't try to alias them; treat them as parallel domains. The dashboard reads belts from a new `user_sub_type_belts` table (§18 stub schema), and belt-promotion logic is a future PRD. |
| `core_user_question_states` (mistakes queue) | — | DOES NOT EXIST | Spaced review is out of scope (§16). The mistakes-tile count is hardcoded to 0 by the stub helper (`countDueMistakes`). Schema for this lands in the spaced-review PRD. |

Tables that exist in the codebase but are not load-bearing for the dashboard: `accounts`, `sessions` (auth), `verification_tokens`, `items`, `strategies`, `candidate_promotion_log`. See appendix "Bonus reads (future)" at the end.

---

## 6. Server data function

`src/server/dashboard/data.ts`. Initial implementation composes a mix of stubbed helpers and (future) real reads. The UI must work end-to-end against the stub helpers before any real-DB wiring lands.

Each helper is in its own file under `src/server/dashboard/` so a follow-up PRD can replace one stub at a time without touching the orchestrator.

```ts
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import { loadAllBelts } from "@/server/dashboard/belts"
import { deriveHeadline } from "@/server/dashboard/helpers"
import { pickTodaysMission } from "@/server/dashboard/mission"
import { computePaceWeek } from "@/server/dashboard/pace"
import {
  computeScoreEstimate,
  getLastFullSim
} from "@/server/dashboard/score"
import { computeStreak } from "@/server/dashboard/streak"
import { countDueMistakes } from "@/server/dashboard/mistakes"
import type { DashboardData } from "@/server/dashboard/types"

interface UserProfile {
  id: string
  firstName: string
  initials: string
  goal: number
  daysToTest?: number
}

/**
 * Returns the dashboard payload for the given user.
 *
 * Helper status as of this PRD:
 *
 *   - loadUserProfile        → real read (auth/users)            §6.1
 *   - loadAllBelts           → STUB                              §19
 *   - pickTodaysMission      → STUB                              §19
 *   - computeScoreEstimate   → STUB                              §19
 *   - computeStreak          → STUB                              §19
 *   - computePaceWeek        → STUB                              §19
 *   - countDueMistakes       → STUB                              §19
 *   - getLastFullSim         → STUB                              §19
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  logger.info({ userId }, "dashboard data requested")

  const profileResult = await errors.try(loadUserProfile(userId))
  if (profileResult.error) {
    logger.error({ error: profileResult.error, userId }, "dashboard profile load failed")
    throw errors.wrap(profileResult.error, "dashboard profile load")
  }
  const profile = profileResult.data

  const [
    verbal,
    numerical,
    mission,
    score,
    streakDays,
    pace,
    mistakesCount,
    lastSim
  ] = await Promise.all([
    loadAllBelts(userId, "verbal"),
    loadAllBelts(userId, "numerical"),
    pickTodaysMission(userId),
    computeScoreEstimate(userId),
    computeStreak(userId),
    computePaceWeek(userId),
    countDueMistakes(userId),
    getLastFullSim(userId)
  ])

  return {
    user: {
      firstName: profile.firstName,
      initials: profile.initials,
      streakDays
    },
    greeting: {
      today: new Date(),
      headline: deriveHeadline({ delta: score.delta, hasSim: lastSim !== undefined })
    },
    score: {
      current: score.current,
      delta: score.delta,
      goal: profile.goal,
      daysToTest: profile.daysToTest
    },
    mission,
    verbal,
    numerical,
    pace: {
      medianSeconds: pace.medianMs / 1000,
      targetSeconds: 18,
      last7Days: pace.perDayMs.map((ms, i) => ({
        medianSeconds: ms / 1000,
        isToday: i === pace.perDayMs.length - 1
      }))
    },
    mistakesQueue: {
      count: mistakesCount,
      estimatedMinutes: Math.max(1, Math.round(mistakesCount * 0.35)),
      href: "/review"
    },
    lastSim
  }
}
```

### 6.1 `loadUserProfile` (real read)

`src/server/dashboard/data.ts` (private to the file). Reads `users` directly. This is the only real-read helper inlined in the orchestrator file because every other concern has its own module.

```ts
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schemas/auth/users"

const DEFAULT_GOAL = 40

async function loadUserProfile(userId: string): Promise<UserProfile> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      targetPercentile: users.targetPercentile,
      targetDateMs: users.targetDateMs
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const row = rows[0]
  if (row === undefined) {
    logger.error({ userId }, "dashboard profile: user row missing")
    throw errors.new("dashboard profile: user row missing")
  }
  const fullName = row.name ?? "Friend"
  const firstName = fullName.split(" ")[0] ?? fullName
  const initials = initialsFor(fullName)
  const goal = row.targetPercentile ?? DEFAULT_GOAL
  const nowMs = Date.now()
  const daysToTest =
    row.targetDateMs === null
      ? undefined
      : Math.max(0, Math.ceil((row.targetDateMs - nowMs) / 86_400_000))
  return { id: row.id, firstName, initials, goal, daysToTest }
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase()
  const first = parts[0]?.[0] ?? ""
  const last = parts[parts.length - 1]?.[0] ?? ""
  return `${first}${last}`.toUpperCase()
}
```

### 6.2 `loadAllBelts` (stub)

`src/server/dashboard/belts.ts`. Reads belt level + progress for one section. Until belt-promotion logic exists (out of scope per §16), this returns 14 white-belt rows split as 5/9.

```ts
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import { type SubTypeId, subTypes } from "@/config/sub-types"
import type { BeltLevel, SubtypeRow } from "@/server/dashboard/types"

// TODO(stub): wire to real data in the Belts PRD (§19).
// When real: read user_sub_type_belts joined to sub_types, ordered by
// the canonical config order. atRisk computed off rolling-30d attempts.
export async function loadAllBelts(
  userId: string,
  section: "verbal" | "numerical"
): Promise<ReadonlyArray<SubtypeRow>> {
  logger.debug({ userId, section }, "loadAllBelts stub: returning all-white")
  return subTypes
    .filter((s) => s.section === section)
    .map((s) => ({
      id: s.id,
      slug: s.id,
      name: s.displayName,
      belt: "white" satisfies BeltLevel,
      progressToNext: 0,
      atRisk: false,
      href: `/drill/${encodeURIComponent(s.id)}`
    }))
}
```

The drill href is `/drill/<subTypeId>` to match the existing route at `src/app/(app)/drill/[subTypeId]/`. The slug is the dotted form (`verbal.analogies`); URL-encode it on emit.

### 6.3 `pickTodaysMission` (stub)

`src/server/dashboard/mission.ts`. Until the weakness-analysis pipeline lands, returns a static "take your baseline simulation" mission.

```ts
import { logger } from "@/logger"
import type { DashboardData } from "@/server/dashboard/types"

// TODO(stub): wire to real data in the Mission Picker PRD (§19).
// When real: rank sub-types by frequency_on_real_test × (1 - accuracy_at_pace),
// tie-break by proximity to belt promotion.
export async function pickTodaysMission(userId: string): Promise<DashboardData["mission"]> {
  logger.debug({ userId }, "pickTodaysMission stub: returning baseline-sim mission")
  return {
    eyebrow: "Today's mission",
    title: "Take your baseline simulation",
    body: "We'll calibrate your belts and recommend daily missions from your first sim onward.",
    primaryHref: "/full-length/configure",
    primaryLabel: "Start full sim",
    alternateHref: "/diagnostic",
    alternateLabel: "Quick diagnostic"
  }
}
```

The primary route maps to the existing full-length flow at `src/app/(app)/full-length/configure/`. The alternate maps to the existing diagnostic flow at `src/app/(diagnostic-flow)/diagnostic/`.

### 6.4 `computeScoreEstimate` + `getLastFullSim` (stub)

`src/server/dashboard/score.ts`. The codebase doesn't yet persist a per-sim score column; both helpers stub out.

```ts
import { logger } from "@/logger"
import type { DashboardData } from "@/server/dashboard/types"

interface ScoreEstimate {
  current?: number
  delta?: number
}

// TODO(stub): wire to real data in the Sim Scoring PRD (§19).
// When real: median of last N simulation sessions' computed scores.
export async function computeScoreEstimate(userId: string): Promise<ScoreEstimate> {
  logger.debug({ userId }, "computeScoreEstimate stub: returning empty")
  return { current: undefined, delta: undefined }
}

// TODO(stub): wire to real data in the Sim Scoring PRD (§19).
// When real: most recent practice_sessions row where type = 'simulation'
// AND ended_at_ms IS NOT NULL.
export async function getLastFullSim(userId: string): Promise<DashboardData["lastSim"]> {
  logger.debug({ userId }, "getLastFullSim stub: returning undefined")
  return undefined
}
```

### 6.5 `computeStreak` (stub)

`src/server/dashboard/streak.ts`.

```ts
import { logger } from "@/logger"

// TODO(stub): wire to real data in the Streaks PRD (§19).
// When real: count of consecutive UTC days with at least one attempt
// joined through practice_sessions.user_id = userId.
export async function computeStreak(userId: string): Promise<number> {
  logger.debug({ userId }, "computeStreak stub: returning 0")
  return 0
}
```

### 6.6 `computePaceWeek` (stub)

`src/server/dashboard/pace.ts`.

```ts
import { logger } from "@/logger"

interface PaceWeek {
  medianMs: number
  /** Length 7, oldest first; today is the last entry */
  perDayMs: ReadonlyArray<number>
}

// TODO(stub): wire to real data in the Pace-Strip PRD (§19).
// When real: median(latency_ms) over the last 7 days of attempts joined
// to practice_sessions.user_id = userId, bucketed by floor((now - id-time)
// / 86_400_000). Use uuidv7LowerBound() for the time-range filter.
export async function computePaceWeek(userId: string): Promise<PaceWeek> {
  logger.debug({ userId }, "computePaceWeek stub: returning zero-week")
  return { medianMs: 0, perDayMs: [0, 0, 0, 0, 0, 0, 0] }
}
```

### 6.7 `countDueMistakes` (stub)

`src/server/dashboard/mistakes.ts`.

```ts
import { logger } from "@/logger"

// TODO(stub): wire to real data in the Spaced Review PRD (§19).
// When real: count(*) of user_question_states where userId = $1 and
// next_due_ms <= now_ms.
export async function countDueMistakes(userId: string): Promise<number> {
  logger.debug({ userId }, "countDueMistakes stub: returning 0")
  return 0
}
```

The dashboard's empty-state branches (LastSim tile, ScoreStrip dashes, zero-pace bars, zero-mistakes copy) light up correctly with these stubs and will switch on automatically as each helper is replaced.

---

## 7. Helpers

`src/server/dashboard/helpers.ts`. Pure functions, no side effects.

```ts
export function deriveHeadline(input: { delta?: number; hasSim: boolean }): string {
  if (!input.hasSim) return "Let's begin."
  if (input.delta === undefined) return "Steady today."
  if (input.delta > 0) return "You're climbing."
  if (input.delta < 0) return "Reset and reload."
  return "Steady today."
}

export function formatToday(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const sPadded = s.toString().padStart(2, "0")
  return `${m}:${sPadded}`
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
```

---

## 8. Design tokens

This codebase already ships shadcn/ui tokens (`--background`, `--foreground`, `--primary`, `--card`, `--border`, etc.) plus two pre-existing belt tokens (`--belt-blue`, `--belt-brown`). The dashboard adds an additive layer on top of those — never overwriting an existing token.

Append the block below to `src/styles/unstyled/globals.css` inside the existing `:root { … }` block (and a parallel block under `.dark { … }` for dark-mode overrides). The existing `@theme inline` block also needs new entries to surface the new tokens to Tailwind v4 (§9).

```css
:root {
  /* Tinted neutrals — hue 270 keeps everything subtly blue-violet.
     Do not duplicate --background / --foreground; alias them in §8.1. */
  --bg:            oklch(98% 0.005 270);
  --surface:       oklch(100% 0 0);
  --surface-2:     oklch(96% 0.008 270);
  --border-soft:   oklch(91% 0.012 270);
  --border-strong: oklch(82% 0.018 270);
  --text-1:        oklch(20% 0.020 270);
  --text-2:        oklch(45% 0.020 270);
  --text-3:        oklch(62% 0.015 270);

  /* Brand */
  --cobalt:        #1e00ff;
  --indigo:        #0D0050;
  --indigo-deep:   #110068;
  --alpha-accent:  #4F46E5;   /* renamed from --accent: shadcn already owns --accent. */
  --pale:          #A5B4FC;
  --lavender:      #F5F4FB;
  --lavender-line: #E5E3F5;

  /* Belts — tuned in OKLCH so promotion feels like rising lightness.
     --belt-blue and --belt-brown already exist in this file (Phase 5
     sub-phase 5 commit 3). Do NOT redeclare; the values below are the
     dashboard's targets and should replace the existing values in-place. */
  --belt-white:      oklch(94% 0.005 270);
  --belt-white-line: oklch(82% 0.012 270);
  --belt-blue:       oklch(50% 0.200 260);   /* was 0.55/0.16 */
  --belt-brown:      oklch(38% 0.100 50);    /* was 0.40/0.07 */
  --belt-black:      oklch(22% 0.020 270);

  /* Pace status */
  --pace-on:    oklch(55% 0.180 240);
  --pace-warn:  oklch(70% 0.160 70);
  --pace-over:  oklch(58% 0.200 25);
  --good:       oklch(58% 0.160 145);

  /* Type */
  --font-sans:  "Plus Jakarta Sans", "Onest", system-ui, sans-serif;
  --font-serif: "Newsreader", "Fraunces", Georgia, serif;

  /* Type scale — 5 sizes, 1.25 ratio, body fixed */
  --t-xs: 0.75rem;
  --t-sm: 0.875rem;
  --t-base: 1rem;
  --t-lg: 1.25rem;
  --t-xl: 1.563rem;
  --t-display: clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem);

  /* Spacing on 4pt */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-12: 48px;

  /* Radii + motion */
  --r-sm: 6px;
  --r-md: 10px;
  --r-lg: 14px;
  --ease-out: cubic-bezier(0.25, 1, 0.5, 1);
  --d-fast: 120ms;
  --d-base: 240ms;
  --d-slow: 380ms;
}
```

Dark-mode block (mirrors the existing `.dark` rule):

```css
.dark {
  --bg:            oklch(15% 0.015 270);
  --surface:       oklch(18% 0.018 270);
  --surface-2:     oklch(22% 0.018 270);
  --border-soft:   oklch(28% 0.018 270);
  --border-strong: oklch(36% 0.018 270);
  --text-1:        oklch(95% 0.005 270);
  --text-2:        oklch(72% 0.012 270);
  --text-3:        oklch(55% 0.012 270);
  --belt-white:    oklch(68% 0.012 270);
  --belt-blue:     oklch(64% 0.180 260);   /* in-place upgrade */
  --belt-brown:    oklch(55% 0.100 50);    /* in-place upgrade */
  --belt-black:    oklch(78% 0.012 270);   /* inverts to off-white */
}
```

The reduced-motion media query and the `body { font-family … }` rule from the original draft already exist in this file (Tailwind's `bg-background text-foreground` reset at the bottom). Reuse those rather than re-adding them. Add `.tabular { font-variant-numeric: tabular-nums; }` if it isn't present.

### 8.1 Token alias table

The dashboard does not introduce a competing color system; it bridges to the existing one. Prefer the dashboard tokens in new components (§10), but never overwrite an existing shadcn token.

| Dashboard token (this PRD) | Pre-existing token (`globals.css`) | Reconciliation |
|---|---|---|
| `--bg` | `--background` | Both exist; dashboard tokens are tinted (hue 270), shadcn's are flat neutrals. Dashboard components reference `--bg` directly via `bg-bg` (§9). Do not change `--background`. |
| `--surface` | `--card` | Components reference `bg-surface`. The card primitive (`src/components/ui/card.tsx`) keeps using `bg-card` and is unchanged. |
| `--text-1` | `--foreground` | Reference `text-text-1` for new components; existing components keep `text-foreground`. |
| `--text-2` / `--text-3` | `--muted-foreground` | Replace shadcn's single muted with the dashboard's two-tier hierarchy in new components only. |
| `--border-soft` | `--border` | New components use `border-border-soft`; shadcn's existing `border-border` reset stays. |
| `--alpha-accent` | `--accent` | The PRD's accent indigo (`#4F46E5`) collides with shadcn's neutral `--accent`. Renamed `--alpha-accent` so the existing accent (used by the focus shell, mastery map, etc.) stays correct. The mission card's progress bar references `bg-alpha-accent`. |
| `--belt-blue`, `--belt-brown` | same names | Already in `globals.css`. The dashboard's values are an in-place upgrade per the table above; visual diff the existing belt-indicator component (`mastery-icon.tsx` does NOT use these tokens, so no regression risk there) before merging. |
| `--belt-white`, `--belt-black` | — | New. |
| `--cobalt`, `--indigo`, `--pale`, `--lavender`, `--pace-*`, `--good` | — | New. No collisions. |

There is no `tailwind.config.ts` in this repo (Tailwind v4); §9 explains how to surface these tokens to the JIT.

---

## 9. Tailwind config (v4)

This codebase uses Tailwind v4 via `@tailwindcss/postcss`. Theme extension lives in CSS, not a JS config file. Add the new tokens to the existing `@theme inline { … }` block in `src/styles/unstyled/globals.css` (right after the existing `--color-belt-blue`, `--color-belt-brown` lines):

```css
@theme inline {
  /* …existing entries unchanged… */

  /* Dashboard tokens (Dashboard PRD §9) */
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border-soft: var(--border-soft);
  --color-border-strong: var(--border-strong);
  --color-text-1: var(--text-1);
  --color-text-2: var(--text-2);
  --color-text-3: var(--text-3);
  --color-cobalt: var(--cobalt);
  --color-indigo: var(--indigo);
  --color-indigo-deep: var(--indigo-deep);
  --color-alpha-accent: var(--alpha-accent);
  --color-pale: var(--pale);
  --color-lavender: var(--lavender);
  --color-lavender-line: var(--lavender-line);
  --color-belt-white: var(--belt-white);
  --color-belt-white-line: var(--belt-white-line);
  --color-belt-black: var(--belt-black);
  --color-pace-on: var(--pace-on);
  --color-pace-warn: var(--pace-warn);
  --color-pace-over: var(--pace-over);
  --color-good: var(--good);

  --font-serif: var(--font-serif);   /* surfaces font-serif utility */
  /* --font-sans is already mapped above; do not duplicate. */
}
```

Tailwind v4 derives `bg-*`, `text-*`, `border-*` etc. utilities from `--color-*` automatically. So `bg-surface` and `text-text-1` will exist after this block lands — no further config needed.

---

## 10. Components

All components are server components unless explicitly marked `"use client"`. Only `TopNav` (§10.11) needs to be a client component because it reads `usePathname` for active-route detection.

### 10.1 BeltIndicator

`src/components/dashboard/belt-indicator.tsx`

The defining visual primitive. A 22×6 colored stripe with a 4px-wide light cap on the right edge, mirroring the actual martial-arts belt-tip motif. The cap is what makes it read as a belt rather than a generic colored bar — keep it.

Note: the existing `src/components/mastery-map/mastery-icon.tsx` is a different visual language (filled / half-filled book/calculator icons mapped from `mastery_state`). Do not unify the two — they serve different surfaces (Mastery Map vs Dashboard) and the Mastery Map remains in place as its own internal page.

Props:

```ts
interface BeltIndicatorProps {
  belt: BeltLevel
  /** Sentence-cased category name for the aria-label, e.g. "Analogies" */
  ariaContext?: string
  className?: string
}
```

Implementation:

```tsx
import type { BeltLevel } from "@/server/dashboard/types"

const BELT_BG: Record<BeltLevel, string> = {
  white: "bg-belt-white border border-belt-white-line",
  blue: "bg-belt-blue",
  brown: "bg-belt-brown",
  black: "bg-belt-black"
}

interface BeltIndicatorProps {
  belt: BeltLevel
  ariaContext?: string
  className?: string
}

export function BeltIndicator({ belt, ariaContext, className }: BeltIndicatorProps) {
  const label = ariaContext ? `${ariaContext}: ${belt} belt` : `${belt} belt`
  return (
    <span
      className={`relative inline-block h-[6px] w-[22px] rounded-[1px] ${BELT_BG[belt]} ${className ?? ""}`}
      role="img"
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className="absolute -right-[1px] -top-[1.5px] -bottom-[1.5px] w-[4px] rounded-[1px] bg-bg"
      />
    </span>
  )
}
```

The cap uses `bg-bg` so it disappears against the page surface, creating the optical illusion of a wrapped belt edge. Don't use white — that fails in dark mode.

### 10.2 BeltRow

`src/components/dashboard/belt-row.tsx`

One sub-type row in a dojo card: belt + name + thin progress bar + chevron. The whole row is a `<Link>`. Hover lightens the surface; focus shows an inset cobalt outline (so the link border doesn't shift the row).

Props: `{ row: SubtypeRow }`.

```tsx
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { SubtypeRow } from "@/server/dashboard/types"
import { clamp01 } from "@/server/dashboard/helpers"
import { BeltIndicator } from "@/components/dashboard/belt-indicator"

interface BeltRowProps {
  row: SubtypeRow
}

export function BeltRow({ row }: BeltRowProps) {
  const pct = clamp01(row.progressToNext) * 100
  return (
    <Link
      href={row.href}
      className="grid grid-cols-[24px_1fr_64px_16px] items-center gap-[10px] border-b border-border-soft px-4 py-[9px] text-sm transition-colors duration-150 ease-out last:border-b-0 hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cobalt"
    >
      <BeltIndicator belt={row.belt} ariaContext={row.name} />
      <span className="flex items-center gap-[6px] font-medium text-text-1">
        <span>{row.name}</span>
        {row.atRisk ? (
          <span
            aria-label="at risk"
            title="Recent accuracy or pace has slipped — refresher recommended"
            className="h-[6px] w-[6px] rounded-full bg-pace-over"
          />
        ) : null}
      </span>
      <span className="relative h-[3px] overflow-hidden rounded-[2px] bg-surface-2">
        <span
          style={{ width: `${pct}%` }}
          className="absolute inset-y-0 left-0 rounded-[2px] bg-alpha-accent"
        />
      </span>
      <ChevronRight aria-hidden="true" className="h-[14px] w-[14px] text-text-3" />
    </Link>
  )
}
```

### 10.3 DojoCard

`src/components/dashboard/dojo-card.tsx`

A card wrapping the header (title + sub-type count) and the list of `BeltRow`s. No nested cards inside.

```tsx
import type { SubtypeRow } from "@/server/dashboard/types"
import { BeltRow } from "@/components/dashboard/belt-row"

interface DojoCardProps {
  title: string
  meta: string
  rows: ReadonlyArray<SubtypeRow>
}

export function DojoCard({ title, meta, rows }: DojoCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
      <header className="flex items-baseline justify-between border-b border-border-soft px-4 pb-2 pt-3">
        <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] text-text-1">
          {title}
        </h3>
        <span className="text-[11px] uppercase tracking-[0.06em] text-text-3">
          {meta}
        </span>
      </header>
      <ul className="divide-none">
        {rows.map((row) => (
          <li key={row.id}>
            <BeltRow row={row} />
          </li>
        ))}
      </ul>
    </section>
  )
}
```

### 10.4 MissionCard

`src/components/dashboard/mission-card.tsx`

Two-column card: text block on the left (eyebrow → serif title → body), CTAs on the right. Primary button is a filled dark pill (`bg-text-1 text-bg`); alternate is a quiet outlined button.

```tsx
import Link from "next/link"
import type { DashboardData } from "@/server/dashboard/types"

interface MissionCardProps {
  mission: DashboardData["mission"]
}

export function MissionCard({ mission }: MissionCardProps) {
  return (
    <section className="mb-[14px] grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-border-soft bg-surface px-5 py-4">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-cobalt">
          {mission.eyebrow}
        </p>
        <h3 className="mb-1 font-serif text-[16px] font-medium tracking-[-0.005em] text-text-1">
          {mission.title}
        </h3>
        <p className="text-[13px] leading-relaxed text-text-2">{mission.body}</p>
      </div>
      <div className="flex gap-2">
        <Link
          href={mission.alternateHref}
          className="rounded-md border border-border-strong bg-surface px-3 py-[7px] text-[13px] font-medium text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
        >
          {mission.alternateLabel}
        </Link>
        <Link
          href={mission.primaryHref}
          className="rounded-md border border-text-1 bg-text-1 px-3 py-[7px] text-[13px] font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
        >
          {mission.primaryLabel}
        </Link>
      </div>
    </section>
  )
}
```

### 10.5 StatTile

`src/components/dashboard/stat-tile.tsx`

Generic small stat. Used three times in `ScoreStrip` and as the body of `MistakesTile` / `LastSimTile`.

Props:

```ts
interface StatTileProps {
  label: string
  /** May contain a serif numeral as a `<span className="font-serif">` */
  value: React.ReactNode
  /** Optional trend hint, "↑ 2" / "↓ 1" / "= 0" */
  delta?: { text: string; tone: "good" | "neutral" | "bad" }
  /** "right" stacks values right-aligned; "left" left-aligns */
  align?: "left" | "right"
  /** "accent" colors the value cobalt — use sparingly */
  tone?: "default" | "accent"
}
```

The serif/tabular-nums treatment lives on `value` itself; consumers decide. Implementation is straightforward; no need to spell out.

### 10.6 ScoreStrip

`src/components/dashboard/score-strip.tsx`

The "greeting + 3 stats" row directly below the nav. Renders the editorial date eyebrow, the headline (with italic emphasis), and three `StatTile`s right-aligned: estimated score (with delta), goal (cobalt), days to test.

Empty-state behavior: when `score.current === undefined` (the stub case), the value renders as an em-dash (`—`) in the same serif-tabular slot, and the delta tile is omitted.

```tsx
import type { DashboardData } from "@/server/dashboard/types"
import { formatToday } from "@/server/dashboard/helpers"
import { StatTile } from "@/components/dashboard/stat-tile"

interface ScoreStripProps {
  firstName: string
  greeting: DashboardData["greeting"]
  score: DashboardData["score"]
}

export function ScoreStrip({ firstName, greeting, score }: ScoreStripProps) {
  const hasDelta = score.delta !== undefined
  const deltaTone =
    score.delta === undefined
      ? "neutral"
      : score.delta > 0
        ? "good"
        : score.delta < 0
          ? "bad"
          : "neutral"
  let deltaText = "= last sim"
  if (score.delta !== undefined) {
    if (score.delta > 0) deltaText = `↑ ${score.delta} vs last sim`
    else if (score.delta < 0) deltaText = `↓ ${Math.abs(score.delta)} vs last sim`
  }
  const currentDisplay = score.current !== undefined ? score.current : "—"

  return (
    <section className="mb-5 grid grid-cols-[1fr_auto_auto_auto] items-end gap-6 border-b border-border-soft pb-5">
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-[0.06em] text-text-3">
          {formatToday(greeting.today)}
        </p>
        <h2 className="font-serif text-[22px] font-medium leading-[1.15] tracking-[-0.015em] text-text-1">
          Good morning, {firstName}.{" "}
          <em className="font-normal italic text-cobalt">{greeting.headline}</em>
        </h2>
      </div>
      <StatTile
        label="Est. score"
        value={
          <span className="font-serif tabular text-[22px] font-medium leading-none">
            {currentDisplay}
          </span>
        }
        delta={hasDelta ? { text: deltaText, tone: deltaTone } : undefined}
        align="right"
      />
      <StatTile
        label="Goal"
        value={<span className="font-serif tabular text-[22px] font-medium leading-none">{score.goal}</span>}
        align="right"
        tone="accent"
      />
      <StatTile
        label="Days to test"
        value={
          <span className="font-serif tabular text-[22px] font-medium leading-none">
            {score.daysToTest === undefined ? "—" : score.daysToTest}
          </span>
        }
        align="right"
      />
    </section>
  )
}
```

### 10.7 PaceMetric

`src/components/dashboard/pace-metric.tsx`

Wider tile with label, big serif value (median seconds, one decimal), sub-text ("Median per question · target 18s"), and a 7-bar mini chart. Today's bar uses cobalt; the rest use `pale`. Bar height is normalized against the largest median in the array, capped at 100%.

When the stub returns all-zero `medianSeconds`, every bar renders at minimum height (1%) and the value reads `0.0s`. Mediocre but correct empty-state.

```tsx
import type { DashboardData } from "@/server/dashboard/types"

interface PaceMetricProps {
  pace: DashboardData["pace"]
}

export function PaceMetric({ pace }: PaceMetricProps) {
  const max = Math.max(...pace.last7Days.map((d) => d.medianSeconds), 1)
  return (
    <section className="rounded-md bg-surface-2 px-4 py-[14px]">
      <p className="mb-1 text-[12px] uppercase tracking-[0.05em] text-text-3">Pace this week</p>
      <p className="font-serif tabular text-[22px] font-medium leading-none text-text-1">
        {pace.medianSeconds.toFixed(1)}s
      </p>
      <p className="mt-1 text-[12px] text-text-2">
        Median per question · target {pace.targetSeconds}s
      </p>
      <div className="mt-2 grid h-[22px] grid-cols-7 items-end gap-[3px]">
        {pace.last7Days.map((d, i) => {
          const h = Math.round((d.medianSeconds / max) * 100)
          return (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className={`rounded-[2px] ${d.isToday ? "bg-cobalt" : "bg-pale"}`}
              aria-label={`${d.medianSeconds.toFixed(1)}s${d.isToday ? " (today)" : ""}`}
            />
          )
        })}
      </div>
    </section>
  )
}
```

### 10.8 MistakesTile

`src/components/dashboard/mistakes-tile.tsx`

Small tile linking to `/review`. Shows count and estimated minutes.

When the stub returns `count = 0`, render an empty-state copy ("No mistakes queued") in place of the count; the tile is still a link to `/review` so the route remains discoverable.

```tsx
import Link from "next/link"
import type { DashboardData } from "@/server/dashboard/types"

interface MistakesTileProps {
  data: DashboardData["mistakesQueue"]
}

export function MistakesTile({ data }: MistakesTileProps) {
  if (data.count === 0) {
    return (
      <Link
        href={data.href}
        className="block rounded-md bg-surface-2 px-4 py-[14px] transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
      >
        <p className="mb-1 text-[12px] uppercase tracking-[0.05em] text-text-3">Mistakes due</p>
        <p className="font-serif text-[16px] font-medium leading-tight text-text-1">No mistakes queued</p>
        <p className="mt-1 text-[12px] text-text-2">Spaced review unlocks after your first sim</p>
      </Link>
    )
  }
  return (
    <Link
      href={data.href}
      className="block rounded-md bg-surface-2 px-4 py-[14px] transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
    >
      <p className="mb-1 text-[12px] uppercase tracking-[0.05em] text-text-3">Mistakes due</p>
      <p className="font-serif tabular text-[22px] font-medium leading-none text-text-1">
        {data.count}
      </p>
      <p className="mt-1 text-[12px] text-text-2">
        Spaced review · {data.estimatedMinutes} min
      </p>
    </Link>
  )
}
```

### 10.9 LastSimTile

`src/components/dashboard/last-sim-tile.tsx`

Renders last sim summary, or an empty state if `data` is undefined (the stub case).

```tsx
import Link from "next/link"
import type { DashboardData } from "@/server/dashboard/types"
import { formatDuration } from "@/server/dashboard/helpers"

interface LastSimTileProps {
  data?: DashboardData["lastSim"]
}

export function LastSimTile({ data }: LastSimTileProps) {
  if (!data) {
    return (
      <Link
        href="/full-length/configure"
        className="block rounded-md bg-surface-2 px-4 py-[14px] transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
      >
        <p className="mb-1 text-[12px] uppercase tracking-[0.05em] text-text-3">Last full sim</p>
        <p className="font-serif text-[16px] font-medium leading-tight text-text-1">
          Take your first sim →
        </p>
        <p className="mt-1 text-[12px] text-text-2">Establishes your baseline</p>
      </Link>
    )
  }

  let dayLabel = `${data.daysAgo} days ago`
  if (data.daysAgo === 0) dayLabel = "today"
  else if (data.daysAgo === 1) dayLabel = "yesterday"

  return (
    <Link
      href={data.href}
      className="block rounded-md bg-surface-2 px-4 py-[14px] transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
    >
      <p className="mb-1 text-[12px] uppercase tracking-[0.05em] text-text-3">Last full sim</p>
      <p className="font-serif tabular text-[22px] font-medium leading-none text-text-1">
        {data.score}
        <span className="ml-1 text-[13px] font-normal text-text-3">/ {data.outOf}</span>
      </p>
      <p className="mt-1 text-[12px] text-text-2">
        {dayLabel} · {formatDuration(data.durationSeconds)}
      </p>
    </Link>
  )
}
```

The empty-state primary CTA links to `/full-length/configure` to match the existing route.

### 10.10 StreakChip

`src/components/dashboard/streak-chip.tsx`

Pill in the top-right corner of the nav. Uses lucide's `Flame` icon. Hides the icon at `streakDays === 0` and shows neutral copy. The stub helper returns 0, so the neutral copy is the default first-run state.

```tsx
import { Flame } from "lucide-react"

interface StreakChipProps {
  streakDays: number
}

export function StreakChip({ streakDays }: StreakChipProps) {
  if (streakDays === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-2 px-[10px] py-[4px] text-[12px] font-medium text-text-2">
        Start your streak
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full bg-lavender px-[10px] py-[4px] text-[12px] font-medium text-indigo">
      <Flame aria-hidden="true" className="h-[13px] w-[13px]" />
      <span>{streakDays}-day streak</span>
    </span>
  )
}
```

### 10.11 TopNav

`src/components/dashboard/top-nav.tsx`

Three-column header: brand on the left, primary nav in the middle, streak + avatar on the right. Mark the active route as a filled chip; others as quiet text.

Use Next.js `usePathname` for active-route detection. This component must be a client component (`"use client"` at the top) because of pathname access.

The nav links currently include routes that are not yet built (Lessons, Stats, Review). They render as quiet links but lead to placeholder/404 pages. Out-of-scope per §16; do not add scaffolding pages here.

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { StreakChip } from "@/components/dashboard/streak-chip"

const NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Dashboard" },
  { href: "/drill", label: "Practice" },
  { href: "/lessons", label: "Lessons" },
  { href: "/review", label: "Review" },
  { href: "/stats", label: "Stats" }
]

interface TopNavProps {
  streakDays: number
  initials: string
}

export function TopNav({ streakDays, initials }: TopNavProps) {
  const pathname = usePathname()
  return (
    <header className="mx-auto mb-5 flex max-w-[1100px] items-center justify-between border-b border-border-soft px-7 pb-[14px] pt-4">
      <Link
        href="/"
        className="font-serif text-[18px] font-medium tracking-[-0.01em] text-indigo"
      >
        18seconds
      </Link>
      <nav className="flex gap-[2px]">
        {NAV.map((item) => {
          let active = false
          if (item.href === "/") active = pathname === "/"
          else active = pathname?.startsWith(item.href) === true
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "rounded-md bg-surface-2 px-[10px] py-[6px] text-[13px] font-medium text-text-1"
                  : "rounded-md px-[10px] py-[6px] text-[13px] text-text-2 transition-colors hover:bg-lavender"
              }
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="flex items-center gap-[10px]">
        <StreakChip streakDays={streakDays} />
        <span
          aria-label="account"
          className="grid h-7 w-7 place-items-center rounded-full bg-lavender text-[11px] font-medium text-indigo"
        >
          {initials}
        </span>
      </div>
    </header>
  )
}
```

---

## 11. Page composition

`src/app/(app)/page.tsx` — server component, no `"use client"`. Replaces the current Mastery Map content at this path. The page sits behind the `(app)/layout.tsx` gate, which is already enforcing both auth and "diagnostic completed". No new gating is required from this PRD.

The page follows the project's RSC pattern: it stays non-async, initiates the data promise, and consumes it inside a Suspense boundary via a client wrapper.

```tsx
// src/app/(app)/page.tsx
import * as React from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getDashboardData } from "@/server/dashboard/data"
import { Dashboard } from "@/components/dashboard/dashboard"

async function loadUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  return session.user.id
}

function DashboardPage() {
  const dataPromise = loadUserId().then(function load(userId) {
    return getDashboardData(userId)
  })
  return (
    <React.Suspense fallback={<DashboardSkeleton />}>
      <Dashboard dataPromise={dataPromise} />
    </React.Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg text-text-1">
      <main className="mx-auto max-w-[1100px] px-7 pt-12">
        <p className="text-text-3 text-sm">Loading…</p>
      </main>
    </div>
  )
}

export default DashboardPage
```

The `Dashboard` client component (`src/components/dashboard/dashboard.tsx`) consumes the promise via `React.use()` and renders the screen. It is the only client component in the data path and contains no state of its own — just the promise unwrap and the layout.

```tsx
// src/components/dashboard/dashboard.tsx
"use client"

import * as React from "react"
import { TopNav } from "@/components/dashboard/top-nav"
import { ScoreStrip } from "@/components/dashboard/score-strip"
import { MissionCard } from "@/components/dashboard/mission-card"
import { DojoCard } from "@/components/dashboard/dojo-card"
import { PaceMetric } from "@/components/dashboard/pace-metric"
import { MistakesTile } from "@/components/dashboard/mistakes-tile"
import { LastSimTile } from "@/components/dashboard/last-sim-tile"
import type { DashboardData } from "@/server/dashboard/types"

interface DashboardProps {
  dataPromise: Promise<DashboardData>
}

export function Dashboard({ dataPromise }: DashboardProps) {
  const data = React.use(dataPromise)
  return (
    <div className="min-h-screen bg-bg text-text-1">
      <TopNav streakDays={data.user.streakDays} initials={data.user.initials} />
      <main className="mx-auto max-w-[1100px] px-7 pb-12">
        <h1 className="sr-only">Dashboard</h1>
        <ScoreStrip
          firstName={data.user.firstName}
          greeting={data.greeting}
          score={data.score}
        />
        <MissionCard mission={data.mission} />
        <div className="mb-[14px] grid grid-cols-1 gap-3 md:grid-cols-2">
          <DojoCard title="Verbal dojo" meta={`${data.verbal.length} sub-types`} rows={data.verbal} />
          <DojoCard title="Numerical dojo" meta={`${data.numerical.length} sub-types`} rows={data.numerical} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <PaceMetric pace={data.pace} />
          <MistakesTile data={data.mistakesQueue} />
          <LastSimTile data={data.lastSim} />
        </div>
      </main>
    </div>
  )
}
```

The meta string is computed off `data.verbal.length` / `data.numerical.length` rather than hardcoded so the 5/9 split that comes out of the stub belt loader stays in sync with whatever shape the real loader eventually returns.

---

## 12. Layout / fonts

Modify `src/app/layout.tsx` to load Plus Jakarta Sans + Newsreader via `next/font/google` and assign them to CSS variables. The existing `Inter` and `Geist` loaders should be removed (they were superstarter defaults; nothing else uses them after this PRD lands — verify before deleting).

```tsx
// src/app/layout.tsx
import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Newsreader } from "next/font/google"
import type * as React from "react"
import "@/styles/unstyled/index.css"
import { cn } from "@/lib/utils"

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-loaded"
})

const serif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-serif-loaded"
})

const metadata: Metadata = {
  title: "18seconds",
  description: "CCAT mastery training",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }]
}

function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(sans.variable, serif.variable)}>
      <body>{children}</body>
    </html>
  )
}

export { metadata }
export default RootLayout
```

In `globals.css`, redefine the font tokens to consume the loaded variables (overriding the bare-string defaults from §8):

```css
:root {
  --font-sans:  var(--font-sans-loaded), "Plus Jakarta Sans", "Onest", system-ui, sans-serif;
  --font-serif: var(--font-serif-loaded), "Newsreader", "Fraunces", Georgia, serif;
}
```

The existing `--font-sans` declaration in `globals.css` (which currently aliases shadcn's `--font-sans`) will need to be reconciled — the dashboard tokens use the same name. If any non-dashboard surface still depends on the Geist/Inter wiring, namespace the fonts as `--font-sans-dashboard` instead.

---

## 13. Responsive behavior

Below 768px (Tailwind's `md`), the dashboard collapses gracefully. No mobile design polish is in scope, but the page must not break:

- `ScoreStrip` 4-column grid wraps via `grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto]` at the sm breakpoint
- The two `DojoCard`s stack at mobile (already `grid-cols-1 md:grid-cols-2`)
- The bottom 3-tile strip stacks at mobile (already `grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr]`)
- `MissionCard` lets buttons wrap below the body text below `sm`

A real mobile pass is a follow-up PRD.

---

## 14. Accessibility

Required, not nice-to-have:

- `BeltIndicator` carries `role="img"` with a meaningful `aria-label` ("Analogies: blue belt"). Don't hide it from assistive tech — it's a meaningful state, not decoration.
- All interactive elements (rows, buttons, tiles, chips) have a `:focus-visible` ring in cobalt at 2px. Inset where the row's border can't shift.
- The "at-risk" dot has both `aria-label="at risk"` and a `title` for hover context. Pure color is not the only signal — atypical row state is also conveyed by the dot's existence.
- All icons (`ChevronRight`, `Flame`) are `aria-hidden="true"`; they're decorative because adjacent text carries the meaning.
- Heading hierarchy: page-level `<h1>` is "Dashboard" (visually hidden via `sr-only`); then `<h2>` for the greeting headline; `<h3>` for each card title.

If `sr-only` isn't already in `globals.css`, add the standard utility.

---

## 15. Acceptance criteria

This PRD is "done" when all of the following are true.

**Visual.**
- [ ] Dashboard renders at `/` matching the mockup's layout, proportions, type treatment, and color use
- [ ] Cobalt accent appears in exactly four places on first paint (with stubs returning empty state, two of them — the delta arrow and the today pace bar — fall back to the cobalt-only goal value and greeting italic; both still cobalt)
- [ ] Serif (Newsreader) renders on: brand wordmark, greeting headline, every numeric value in stats and tiles, dojo card titles, mission title
- [ ] All other text is sans (Plus Jakarta Sans)
- [ ] Belt indicators render with the right-edge cap visible against `--bg` (all 14 white in the stub case)
- [ ] Both light and dark modes render without contrast violations against WCAG AA on body text

**Behavior.**
- [ ] Clicking any belt row navigates to `/drill/{subTypeId}` (URL-encoded)
- [ ] Clicking the mission's primary CTA navigates to `/full-length/configure`
- [ ] Clicking the mission's alternate CTA navigates to `/diagnostic`
- [ ] Active nav item is highlighted; others are quiet
- [ ] Streak chip hides the flame icon and shows neutral copy when `streakDays === 0` (the default stub state)
- [ ] LastSim tile shows an empty state when `lastSim` is undefined (the default stub state)
- [ ] ScoreStrip renders em-dashes for `current` and `daysToTest` when those are undefined

**Constraints (non-negotiable).**
- [ ] `bun lint:all` passes (Biome + super-lint + GritQL)
- [ ] `bun typecheck` passes
- [ ] Zero `try…catch` blocks in new files
- [ ] Zero `as` casts in new files (other than `as const`)
- [ ] Zero `null` types in new files (only `?:` optional fields)
- [ ] All new files keep one component per file under `src/components/dashboard/` and one helper per file under `src/server/dashboard/`
- [ ] No new database migrations are run as part of this PRD (the stub schema in §18 is added to `src/db/schemas/practice/` but `db:generate`/`db:push` is left for the follow-up PRD that wires real reads)

**Motion + a11y.**
- [ ] All transitions use `--ease-out`; durations are `--d-fast` or `--d-base`
- [ ] `prefers-reduced-motion: reduce` is honored (CSS in §8 + existing rule in `globals.css`)
- [ ] Every interactive element has a visible `:focus-visible` outline
- [ ] `aria-label` is set on `BeltIndicator` and on the avatar
- [ ] Visually-hidden `<h1>Dashboard</h1>` exists at the top of `<main>`

---

## 16. Out of scope (do not implement)

These are intentionally deferred. If you find yourself reaching for them, stop and surface as a follow-up.

- **Real-data wiring of every helper.** The PRD ships with a defined contract and stubbed helpers (§19). Replacing each stub with a real read is a follow-up PRD, listed in §19 by name.
- **Belt promotion/demotion logic.** Sliding-window evaluation over last 30 attempts, accuracy + median-time gates. Lives in `src/server/belts/` in a follow-up.
- **Mission picker logic.** Weakness analysis (`frequency_on_real_test × (1 - accuracy_at_pace)`) tied to belt-promotion proximity. Follow-up.
- **Active session screen.** `/full-length/run` and `/drill/[subTypeId]/run` already exist and are linked-to from the dashboard; they are not modified by this PRD.
- **Post-sim review and post-session UI.** Already exists at `(diagnostic-flow)/post-session/[sessionId]` for the diagnostic, and extends to full-length in a separate post-session round. Linked-to from the dashboard but not changed here.
- **Lessons / pattern library, Stats deep-dive, Review.** `/lessons`, `/stats`, `/review` are in the nav but their pages are not built here. Clicking them today returns a 404; a follow-up PRD adds at least an empty state.
- **Spaced review.** No `user_question_states` schema yet; the mistakes count is hard-stubbed to 0. Spaced-review PRD adds the schema and the real read.
- **Streak persistence and computation.** Out-of-scope; stubbed to 0.
- **Mobile design polish.** §13 covers "doesn't break"; full mobile design comes later.
- **Settings, profile, onboarding flows.** Not on the dashboard.
- **Score estimation algorithm.** Stubbed to undefined; lives in a Sim Scoring PRD that has to land before the dashboard's score strip is meaningful.

---

## 17. Implementation order

Recommended sequence. Not strict, but minimizes thrash:

1. Add design tokens to `src/styles/unstyled/globals.css` (§8) and the `@theme inline` extensions (§9) — do this first so component styling works as you build.
2. Swap fonts in `src/app/layout.tsx` (§12).
3. Create `src/server/dashboard/types.ts` and `helpers.ts` (§5, §7).
4. Create the helper stubs (§6.2–§6.7) — each in its own file under `src/server/dashboard/`.
5. Create `src/server/dashboard/data.ts` and `loadUserProfile` (§6, §6.1) — the only real-read entry point.
6. Add the stub schema `src/db/schemas/practice/user-sub-type-belts.ts` (§18) and register it in `src/db/schema.ts`. Do NOT run `db:generate` or `db:push`.
7. Build leaf components first: `BeltIndicator`, `StreakChip`, `StatTile`.
8. Then composite components: `BeltRow`, `DojoCard`, `MissionCard`, `ScoreStrip`, `PaceMetric`, `MistakesTile`, `LastSimTile`, `TopNav`.
9. Build the client wrapper `src/components/dashboard/dashboard.tsx` and replace `src/app/(app)/page.tsx` (§11).
10. Run `bun lint:all` and `bun typecheck`. Fix anything that surfaces. Iterate until both pass.
11. Visual diff against the mockup. Pay attention to: cobalt-accent count, serif vs sans split, belt-cap visibility, dojo row spacing.

Once §15 acceptance is fully checked, this PRD is shipped.

---

## 18. New stubs (this PRD)

A single new schema lands as part of this PRD. It has no read paths in the dashboard yet (the `loadAllBelts` helper is stubbed to all-white), but it gives the follow-up Belts PRD a place to land without a schema change in the same change set as the read logic.

### `src/db/schemas/practice/user-sub-type-belts.ts`

```ts
// STUB: minimal schema for dashboard read paths; expand in the Belts PRD.
//
// One row per (user, sub_type). Stores the user's current belt level,
// fractional progress toward the next promotion, and a precomputed
// at-risk flag (so the dashboard query is a single index scan, not a
// rolling-window aggregate every page load).
//
// Migration deliberately deferred: the dashboard ships with `loadAllBelts`
// returning 14 white-belt rows, so no rows of this table are read by the
// dashboard yet. The Belts PRD adds the migration, the seed, and the
// promotion-evaluation cron that writes here.

import { sql } from "drizzle-orm"
import { bigint, boolean, pgEnum, pgTable, primaryKey, real, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { subTypes } from "@/db/schemas/catalog/sub-types"

const beltLevel = pgEnum("belt_level", ["white", "blue", "brown", "black"])

const userSubTypeBelts = pgTable(
  "user_sub_type_belts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subTypeId: varchar("sub_type_id", { length: 64 })
      .notNull()
      .references(() => subTypes.id),
    belt: beltLevel("belt").notNull().default("white"),
    progressToNext: real("progress_to_next").notNull().default(0),
    atRisk: boolean("at_risk").notNull().default(false),
    updatedAtMs: bigint("updated_at_ms", { mode: "number" })
      .notNull()
      .default(sql`(extract(epoch from now()) * 1000)::bigint`)
  },
  (table) => [
    primaryKey({
      name: "user_sub_type_belts_user_sub_type_pk",
      columns: [table.userId, table.subTypeId]
    })
  ]
)

export { beltLevel, userSubTypeBelts }
```

Register in `src/db/schema.ts`:

```ts
import * as practiceUserSubTypeBeltsSchema from "@/db/schemas/practice/user-sub-type-belts"
// …
const dbSchema = {
  // …existing schemas…
  ...practiceUserSubTypeBeltsSchema
}
```

### Schemas deliberately NOT added by this PRD

- **`user_question_states`** (spaced-review queue). Out of scope per §16. Schema lands with the Spaced Review PRD; until then, `countDueMistakes` returns 0 and the mistakes tile renders its empty state.
- **A "score per sim" column or table.** The codebase's `practice_sessions` table has no score field today. Whether the score lives as a derived view, a denormalized column, or a separate `sim_results` table is a Sim Scoring PRD decision; this PRD declines to pre-empt it.

---

## 19. Stubs and follow-ups

Single source of truth for what's stubbed and what fills it. Each stub has:
- a fixed return value (so the UI is deterministic),
- a `// TODO(stub)` comment in the helper file pointing at the follow-up PRD,
- a future PRD name that will replace the stub.

### Auth (no stub)

Auth is real. The dashboard reads the signed-in user via `auth()` from `@/auth` and pulls profile fields from the existing `users` table. No `getCurrentUser()` stub is needed — `core_users` was the PRD's name; the actual `users` table exists with column drift (mapped in §5.1).

### Belts (stub)

| Helper | Returns | Follow-up |
|---|---|---|
| `loadAllBelts(userId, "verbal")` | 5 white-belt rows from `subTypes.filter(s => s.section === "verbal")`, all `progressToNext: 0`, all `atRisk: false`, `href = /drill/<id>` | **Belts PRD** — sliding-window promotion, atRisk computation, `user_sub_type_belts` real read |
| `loadAllBelts(userId, "numerical")` | 9 white-belt rows from `subTypes.filter(s => s.section === "numerical")`, same shape | same |

### Question bank / mission (stub)

| Helper | Returns | Follow-up |
|---|---|---|
| `pickTodaysMission(userId)` | static `{ eyebrow: "Today's mission", title: "Take your baseline simulation", body: "We'll calibrate your belts and recommend daily missions from your first sim onward.", primaryHref: "/full-length/configure", primaryLabel: "Start full sim", alternateHref: "/diagnostic", alternateLabel: "Quick diagnostic" }` | **Mission Picker PRD** — weakness-analysis ranking |

### Attempts / sessions (stub)

| Helper | Returns | Follow-up |
|---|---|---|
| `computeScoreEstimate(userId)` | `{ current: undefined, delta: undefined }` | **Sim Scoring PRD** — defines how a sim turns into a 0–50 score and whether it's stored or derived |
| `getLastFullSim(userId)` | `undefined` | **Sim Scoring PRD** — most recent `practice_sessions` row where `type = 'simulation'` AND `endedAtMs IS NOT NULL`, with computed score |
| `computePaceWeek(userId)` | `{ medianMs: 0, perDayMs: [0, 0, 0, 0, 0, 0, 0] }` | **Pace-Strip PRD** — median over 7 days of attempts joined to `practice_sessions.user_id`, bucketed via `uuidv7LowerBound` |
| `computeStreak(userId)` | `0` | **Streaks PRD** — defines what counts as a "practice day" and the consecutive-day count |
| `countDueMistakes(userId)` | `0` | **Spaced Review PRD** — adds `user_question_states` schema + due-row count |

### Schema (one stub)

| Schema | Status | Follow-up |
|---|---|---|
| `user_sub_type_belts` (§18) | Defined in `src/db/schemas/practice/`, registered in barrel, but no migration run, no rows read | **Belts PRD** — runs `db:generate`/`db:push`, seeds initial white-belt rows, wires the real `loadAllBelts` |

### Stub-removal order (suggested)

1. **Sim Scoring PRD** — unblocks the score strip and the LastSim tile. Two helpers replaced.
2. **Pace-Strip PRD** — unblocks the bottom-strip pace tile. One helper replaced.
3. **Belts PRD** — runs the migration for `user_sub_type_belts`, replaces `loadAllBelts`. The dashboard now shows real belts.
4. **Mission Picker PRD** — replaces `pickTodaysMission`. The dashboard's mission becomes dynamic.
5. **Streaks PRD** — replaces `computeStreak`.
6. **Spaced Review PRD** — adds `user_question_states` schema and replaces `countDueMistakes`.

After all six follow-ups land, the dashboard is fully real-data — no stubs remain.

---

## Appendix: Bonus reads (future)

Tables present in the codebase that the dashboard *could* use but does not in v1. Listed here so future PRDs can reach for them without re-discovering:

- **`mastery_state`** (`practice/mastery-state.ts`) — 4-level mastery (`learning | fluent | mastered | decayed`) per (user, sub_type). Already populated by the diagnostic flow. Could feed an "early signal" version of `loadAllBelts` before the belts table is wired (e.g. learning → white, fluent → blue, mastered → black, decayed → brown), but the semantics aren't a clean 1:1 — flagged as a Belts PRD discussion.
- **`candidate_promotion_log`** (`ops/candidate-promotion-log.ts`) — item-level promotion log (whether an item entered the live bank). Useful for an admin surface; not for the dashboard.
- **`strategies`** (`catalog/strategies.ts`) — sub-type-scoped recognition/technique/trap blurbs. Could power a "today's strategy" tile in a future dashboard rev.
- **`accounts` / `sessions` / `verification_tokens`** — Auth.js plumbing. Read only by the auth library.
- **`items`** (`catalog/items.ts`) — the question bank. The dashboard does not read items directly; it reads attempts.
- **`practiceSessions.recencyExcludedItemIds`** — useful for the mission picker (avoid re-serving recent items) but not for the dashboard.
