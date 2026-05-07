# 18seconds — Dashboard PRD

Ship the "Dojo" dashboard at `/`. This document is the source of truth for that screen; implement against it. When something is ambiguous, default to the visual mockup that produced this spec.

---

## 1. Context

**Product.** 18seconds is a CCAT practice app focused on hitting 40/50 by training Verbal and Numerical questions to reflex speed. The name comes from the test's pace: roughly 18 seconds per question. The app frames practice as climbing 14 belts (7 verbal subtypes, 7 numerical), white → blue → brown → black, calculated independently per subtype.

**Stack.** Next.js (App Router, Bun), Drizzle ORM (PostgreSQL with UUIDv7 PKs), Tailwind CSS, shadcn/ui, lucide-react for icons, Pino via `@/logger`, Superbuilder error handling via `@superbuilders/errors`. Bootstrapped from the superstarter template.

**Scope of this PRD.** Just the dashboard at `/`. The data layer is implemented as a typed contract with a stub returning realistic fixture data. Wiring it to real queries is a follow-up — flagged in §16.

---

## 2. Goal

A single, server-rendered screen that answers, on landing, in this order of importance:

1. **Where am I vs the goal?** Current estimated CCAT score, trend vs last sim, goal (40), days to test.
2. **What should I do today?** A smart-picked mission with a one-tap primary CTA and an "alternate" escape hatch.
3. **Where are my belts?** 14 subtype rows split into Verbal Dojo and Numerical Dojo, each with a belt indicator, progress bar, and link to the drill.
4. **How's my pace and what's queued?** Median time per question this week, count of mistakes queued for spaced review, last full sim result.

Client-side interactivity on this page is limited to navigation. No form state, no mutations from the dashboard itself.

---

## 3. Constraints (Superbuilder ruleset)

These cause lint or typecheck errors when violated. Don't fight them.

**Error handling.** No `try…catch`. No `new Error()`. Use:

```ts
import * as errors from "@superbuilders/errors"

const result = await errors.try(loadSomething())
if (result.error) {
  throw errors.wrap(result.error, "failed to load dashboard data")
}
const data = result.data
```

**Type assertions.** No `as` except `as const`. Narrow with type guards or Zod.

**Optionality.** Prefer `undefined` over `null`. Never `T | null | undefined` at function boundaries. Use `field?: T`.

**Logging.** `logger.info({ context }, "message")` — context object first, literal string second. No template literals in the message position.

**Database.** UUIDv7 PKs only. No `timestamp`/`date`/`time`/`interval` columns; recover times via `timestampFromUuidv7(id)` from `@/db/lib/uuid-time`. One table per file under `src/db/schemas/<domain>/<table>.ts`. **Do not run `db:generate` or `db:push` as part of this PRD.** The dashboard reads only; if the existing schema is missing something, surface it in your final summary and leave migration work for a human.

**Visual.** No emoji in source. No nested cards (cards inside cards). No gradient text. No `outline: none` without a `:focus-visible` replacement. Two font weights only: 400 (regular) and 500 (medium). Sentence case in headings.

---

## 4. File map

| Path | Action | Purpose |
|---|---|---|
| `src/app/page.tsx` | replace or create | Dashboard server component, composes everything |
| `src/app/layout.tsx` | modify | Load Plus Jakarta Sans + Newsreader via `next/font` |
| `src/app/globals.css` | modify | Append the design tokens block (§8) |
| `tailwind.config.ts` | modify | Extend theme to consume CSS variables (§9) |
| `src/lib/dashboard/types.ts` | create | Data contract (§5) |
| `src/lib/dashboard/data.ts` | create | `getDashboardData(userId)` server function (§6) |
| `src/lib/dashboard/helpers.ts` | create | Pure formatters and `deriveHeadline` (§7) |
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

---

## 5. Data contract

`src/lib/dashboard/types.ts`. The dashboard receives a `DashboardData` from the server function. Components consume slices via props.

```ts
export type BeltLevel = "white" | "blue" | "brown" | "black"

export interface SubtypeRow {
  /** UUIDv7 of the subtype row in core_user_subtype_ratings (or equivalent) */
  id: string
  /** URL-safe identifier, e.g. "analogies", used for links and routing */
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
    current: number
    /** Signed delta vs last full sim */
    delta: number
    /** Typically 40 */
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

---

## 6. Server data function

`src/lib/dashboard/data.ts`. Initial implementation returns stub data shaped exactly like the contract — the UI must work end-to-end against the stub before any real-DB wiring. The stub mirrors the mockup so visual regressions are catchable.

```ts
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import type { DashboardData, SubtypeRow, BeltLevel } from "./types"
import { deriveHeadline } from "./helpers"

const VERBAL_SUBTYPES: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: "analogies", name: "Analogies" },
  { slug: "synonyms", name: "Synonyms" },
  { slug: "antonyms", name: "Antonyms" },
  { slug: "sentence-completion", name: "Sentence completion" },
  { slug: "logical-deduction", name: "Logical deduction" },
  { slug: "odd-one-out", name: "Odd one out" },
  { slug: "word-pairs", name: "Word pairs" },
]

const NUMERICAL_SUBTYPES: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: "number-series", name: "Number series" },
  { slug: "word-problems", name: "Word problems" },
  { slug: "ratios-percents", name: "Ratios & percents" },
  { slug: "algebra", name: "Algebra" },
  { slug: "comparisons", name: "Comparisons" },
  { slug: "probability", name: "Probability" },
  { slug: "charts-tables", name: "Charts & tables" },
]

const STUB_VERBAL: ReadonlyArray<{ belt: BeltLevel; progress: number; atRisk: boolean }> = [
  { belt: "blue", progress: 0.62, atRisk: false },
  { belt: "brown", progress: 0.38, atRisk: false },
  { belt: "blue", progress: 0.84, atRisk: false },
  { belt: "white", progress: 0.22, atRisk: false },
  { belt: "blue", progress: 0.51, atRisk: false },
  { belt: "brown", progress: 0.19, atRisk: true },
  { belt: "white", progress: 0.44, atRisk: false },
]

const STUB_NUMERICAL: ReadonlyArray<{ belt: BeltLevel; progress: number; atRisk: boolean }> = [
  { belt: "blue", progress: 0.78, atRisk: false },
  { belt: "white", progress: 0.33, atRisk: true },
  { belt: "blue", progress: 0.56, atRisk: false },
  { belt: "blue", progress: 0.41, atRisk: false },
  { belt: "brown", progress: 0.67, atRisk: false },
  { belt: "white", progress: 0.12, atRisk: false },
  { belt: "blue", progress: 0.71, atRisk: false },
]

function buildRows(
  defs: ReadonlyArray<{ slug: string; name: string }>,
  states: ReadonlyArray<{ belt: BeltLevel; progress: number; atRisk: boolean }>,
  category: "verbal" | "numerical",
): ReadonlyArray<SubtypeRow> {
  return defs.map((def, i) => {
    const state = states[i]
    if (!state) {
      throw errors.new(`stub mismatch: missing state for ${category}/${def.slug}`)
    }
    return {
      id: `00000000-0000-7000-8000-${category}${i.toString().padStart(8, "0")}`,
      slug: def.slug,
      name: def.name,
      belt: state.belt,
      progressToNext: state.progress,
      atRisk: state.atRisk,
      href: `/practice/drill/${def.slug}`,
    }
  })
}

/**
 * Returns the dashboard payload for the given user.
 *
 * Stub implementation. Replace each block with real queries once the schema
 * is confirmed:
 *
 *   - score.current        → median of last N full_sim sessions
 *   - score.delta          → score - previous full_sim's score
 *   - mission              → derived from weakness analysis
 *                            (highest-lift subtype, see §16)
 *   - verbal/numerical     → core_user_subtype_ratings joined to subtype defs
 *   - pace.medianSeconds   → median(time_ms) over last 7 days of attempts
 *   - pace.last7Days       → grouped by day, oldest first
 *   - mistakesQueue.count  → core_user_question_states where due
 *   - lastSim              → most recent core_practice_sessions where
 *                            mode = 'full_sim'
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  logger.info({ userId }, "dashboard data requested")

  return {
    user: { firstName: "Jordan", initials: "JK", streakDays: 12 },
    greeting: {
      today: new Date(),
      headline: deriveHeadline({ delta: 2, hasSim: true }),
    },
    score: { current: 36, delta: 2, goal: 40, daysToTest: 14 },
    mission: {
      eyebrow: "Today's mission",
      title: "Tighten number series timing",
      body: "Accuracy is solid (84%) but median time is 24s — 6s above your blue-belt target. A 12-question speed drill at 18s/q.",
      primaryHref: "/practice/drill/number-series?mode=speed",
      primaryLabel: "Start drill",
      alternateHref: "/practice",
      alternateLabel: "Pick another",
    },
    verbal: buildRows(VERBAL_SUBTYPES, STUB_VERBAL, "verbal"),
    numerical: buildRows(NUMERICAL_SUBTYPES, STUB_NUMERICAL, "numerical"),
    pace: {
      medianSeconds: 19.4,
      targetSeconds: 18,
      last7Days: [
        { medianSeconds: 21.0, isToday: false },
        { medianSeconds: 19.0, isToday: false },
        { medianSeconds: 22.0, isToday: false },
        { medianSeconds: 20.0, isToday: false },
        { medianSeconds: 20.5, isToday: false },
        { medianSeconds: 18.5, isToday: false },
        { medianSeconds: 22.5, isToday: true },
      ],
    },
    mistakesQueue: { count: 23, estimatedMinutes: 8, href: "/review" },
    lastSim: {
      score: 38,
      outOf: 50,
      daysAgo: 2,
      durationSeconds: 892,
      href: "/practice/sim/last",
    },
  }
}
```

---

## 7. Helpers

`src/lib/dashboard/helpers.ts`. Pure functions, no side effects.

```ts
export function deriveHeadline(input: { delta: number; hasSim: boolean }): string {
  if (!input.hasSim) return "Let's begin."
  if (input.delta > 0) return "You're climbing."
  if (input.delta < 0) return "Reset and reload."
  return "Steady today."
}

export function formatToday(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
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

Append to `src/app/globals.css`. Existing shadcn/ui tokens are unaffected — these are additive and live alongside.

```css
@layer base {
  :root {
    /* Tinted neutrals — hue 270 keeps everything subtly blue-violet */
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
    --accent:        #4F46E5;
    --pale:          #A5B4FC;
    --lavender:      #F5F4FB;
    --lavender-line: #E5E3F5;

    /* Belts — tuned in OKLCH so promotion feels like rising lightness */
    --belt-white:      oklch(94% 0.005 270);
    --belt-white-line: oklch(82% 0.012 270);
    --belt-blue:       oklch(50% 0.200 260);
    --belt-brown:      oklch(38% 0.100 50);
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

  @media (prefers-color-scheme: dark) {
    :root {
      --bg:            oklch(15% 0.015 270);
      --surface:       oklch(18% 0.018 270);
      --surface-2:     oklch(22% 0.018 270);
      --border-soft:   oklch(28% 0.018 270);
      --border-strong: oklch(36% 0.018 270);
      --text-1:        oklch(95% 0.005 270);
      --text-2:        oklch(72% 0.012 270);
      --text-3:        oklch(55% 0.012 270);
      --belt-white:    oklch(68% 0.012 270);
      --belt-blue:     oklch(64% 0.180 260);
      --belt-brown:    oklch(55% 0.100 50);
      /* "Black" belt inverts to off-white in dark mode so the highest tier
         still has the highest contrast against the surface. */
      --belt-black:    oklch(78% 0.012 270);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  body {
    background: var(--bg);
    color: var(--text-1);
    font-family: var(--font-sans);
    font-feature-settings: "ss01", "cv11";
  }

  .tabular { font-variant-numeric: tabular-nums; }
}
```

---

## 9. Tailwind config

Extend `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  // …existing content/plugins…
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "border-soft": "var(--border-soft)",
        "border-strong": "var(--border-strong)",
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        cobalt: "var(--cobalt)",
        indigo: "var(--indigo)",
        "indigo-deep": "var(--indigo-deep)",
        accent: "var(--accent)",
        pale: "var(--pale)",
        lavender: "var(--lavender)",
        "lavender-line": "var(--lavender-line)",
        "belt-white": "var(--belt-white)",
        "belt-white-line": "var(--belt-white-line)",
        "belt-blue": "var(--belt-blue)",
        "belt-brown": "var(--belt-brown)",
        "belt-black": "var(--belt-black)",
        "pace-on": "var(--pace-on)",
        "pace-warn": "var(--pace-warn)",
        "pace-over": "var(--pace-over)",
        good: "var(--good)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
    },
  },
}

export default config
```

If shadcn/ui's existing token names collide (e.g. its own `border` color), prefix the new ones (`alpha-*`) rather than overwriting. The prefix doesn't affect the spec.

---

## 10. Components

All components are server components unless explicitly marked `"use client"`. None on this page need client-side state.

### 10.1 BeltIndicator

`src/components/dashboard/belt-indicator.tsx`

The defining visual primitive. A 22×6 colored stripe with a 4px-wide light cap on the right edge, mirroring the actual martial-arts belt-tip motif. The cap is what makes it read as a belt rather than a generic colored bar — keep it.

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
import type { BeltLevel } from "@/lib/dashboard/types"

const BELT_BG: Record<BeltLevel, string> = {
  white: "bg-belt-white border border-belt-white-line",
  blue: "bg-belt-blue",
  brown: "bg-belt-brown",
  black: "bg-belt-black",
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

One subtype row in a dojo card: belt + name + thin progress bar + chevron. The whole row is a `<Link>`. Hover lightens the surface; focus shows an inset cobalt outline (so the link border doesn't shift the row).

Props: `{ row: SubtypeRow }`.

```tsx
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { SubtypeRow } from "@/lib/dashboard/types"
import { clamp01 } from "@/lib/dashboard/helpers"
import { BeltIndicator } from "./belt-indicator"

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
          className="absolute inset-y-0 left-0 rounded-[2px] bg-accent"
        />
      </span>
      <ChevronRight aria-hidden="true" className="h-[14px] w-[14px] text-text-3" />
    </Link>
  )
}
```

### 10.3 DojoCard

`src/components/dashboard/dojo-card.tsx`

A card wrapping the header (title + subtype count) and the list of `BeltRow`s. No nested cards inside.

```tsx
import type { SubtypeRow } from "@/lib/dashboard/types"
import { BeltRow } from "./belt-row"

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
import type { DashboardData } from "@/lib/dashboard/types"

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

```tsx
import type { DashboardData } from "@/lib/dashboard/types"
import { formatToday } from "@/lib/dashboard/helpers"
import { StatTile } from "./stat-tile"

interface ScoreStripProps {
  firstName: string
  greeting: DashboardData["greeting"]
  score: DashboardData["score"]
}

export function ScoreStrip({ firstName, greeting, score }: ScoreStripProps) {
  const deltaTone = score.delta > 0 ? "good" : score.delta < 0 ? "bad" : "neutral"
  const deltaText =
    score.delta > 0
      ? `↑ ${score.delta} vs last sim`
      : score.delta < 0
        ? `↓ ${Math.abs(score.delta)} vs last sim`
        : "= last sim"

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
        value={<span className="font-serif tabular text-[22px] font-medium leading-none">{score.current}</span>}
        delta={{ text: deltaText, tone: deltaTone }}
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
            {score.daysToTest ?? "—"}
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

```tsx
import type { DashboardData } from "@/lib/dashboard/types"

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

```tsx
import Link from "next/link"
import type { DashboardData } from "@/lib/dashboard/types"

interface MistakesTileProps {
  data: DashboardData["mistakesQueue"]
}

export function MistakesTile({ data }: MistakesTileProps) {
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

Renders last sim summary, or an empty state if `data` is undefined.

```tsx
import Link from "next/link"
import type { DashboardData } from "@/lib/dashboard/types"
import { formatDuration } from "@/lib/dashboard/helpers"

interface LastSimTileProps {
  data?: DashboardData["lastSim"]
}

export function LastSimTile({ data }: LastSimTileProps) {
  if (!data) {
    return (
      <Link
        href="/practice/sim/new"
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

  const dayLabel = data.daysAgo === 0 ? "today" : data.daysAgo === 1 ? "yesterday" : `${data.daysAgo} days ago`

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

### 10.10 StreakChip

`src/components/dashboard/streak-chip.tsx`

Pill in the top-right corner of the nav. Uses lucide's `Flame` icon. Hides the icon at `streakDays === 0` and shows neutral copy.

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

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { StreakChip } from "./streak-chip"

const NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/lessons", label: "Lessons" },
  { href: "/review", label: "Review" },
  { href: "/stats", label: "Stats" },
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
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href) === true
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

`src/app/page.tsx` — server component, no `"use client"`.

```tsx
import { TopNav } from "@/components/dashboard/top-nav"
import { ScoreStrip } from "@/components/dashboard/score-strip"
import { MissionCard } from "@/components/dashboard/mission-card"
import { DojoCard } from "@/components/dashboard/dojo-card"
import { PaceMetric } from "@/components/dashboard/pace-metric"
import { MistakesTile } from "@/components/dashboard/mistakes-tile"
import { LastSimTile } from "@/components/dashboard/last-sim-tile"
import { getDashboardData } from "@/lib/dashboard/data"
// Replace with the project's existing session/auth utility:
import { requireUserId } from "@/auth"

export default async function DashboardPage() {
  const userId = await requireUserId()
  const data = await getDashboardData(userId)

  return (
    <div className="min-h-screen bg-bg text-text-1">
      <TopNav streakDays={data.user.streakDays} initials={data.user.initials} />
      <main className="mx-auto max-w-[1100px] px-7 pb-12">
        <ScoreStrip
          firstName={data.user.firstName}
          greeting={data.greeting}
          score={data.score}
        />
        <MissionCard mission={data.mission} />
        <div className="mb-[14px] grid grid-cols-1 gap-3 md:grid-cols-2">
          <DojoCard title="Verbal dojo" meta="7 subtypes" rows={data.verbal} />
          <DojoCard title="Numerical dojo" meta="7 subtypes" rows={data.numerical} />
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

If the project uses a different auth helper (e.g. `auth()` from NextAuth, or a custom session loader), substitute that here. The `userId` reaching `getDashboardData` is what matters.

---

## 12. Layout / fonts

Modify `src/app/layout.tsx` to load fonts via `next/font/google` and assign them to CSS variables. Keep existing metadata, providers, and HTML structure.

```tsx
import { Plus_Jakarta_Sans, Newsreader } from "next/font/google"

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-loaded",
})

const serif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-serif-loaded",
})

// In the <html> tag:
// <html lang="en" className={`${sans.variable} ${serif.variable}`}>
```

In `globals.css`, prepend the loaded variables to the existing stack:

```css
:root {
  --font-sans:  var(--font-sans-loaded), "Plus Jakarta Sans", "Onest", system-ui, sans-serif;
  --font-serif: var(--font-serif-loaded), "Newsreader", "Fraunces", Georgia, serif;
}
```

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
- Heading hierarchy: page-level `<h1>` is "Dashboard" (visually hidden via `sr-only` if not shown); then `<h2>` for the greeting headline; `<h3>` for each card title.

Add a visually-hidden `<h1>` at the top of `<main>`:

```tsx
<h1 className="sr-only">Dashboard</h1>
```

If `sr-only` isn't already in globals.css, add the standard utility.

---

## 15. Acceptance criteria

This PRD is "done" when all of the following are true.

**Visual.**
- [ ] Dashboard renders at `/` matching the mockup's layout, proportions, type treatment, and color use
- [ ] Cobalt accent appears in exactly four places on first paint with stub data: greeting italic, goal value, mission primary CTA, today's pace bar
- [ ] Serif (Newsreader) renders on: brand wordmark, greeting headline, every numeric value in stats and tiles, dojo card titles, mission title
- [ ] All other text is sans (Plus Jakarta Sans)
- [ ] Belt indicators render with the right-edge cap visible against `--bg`
- [ ] Both light and dark modes render without contrast violations against WCAG AA on body text

**Behavior.**
- [ ] Clicking any belt row navigates to `/practice/drill/{slug}`
- [ ] Clicking the mission's primary CTA navigates to its `primaryHref`
- [ ] Clicking the mistakes tile navigates to `/review`
- [ ] Active nav item is highlighted; others are quiet
- [ ] Streak chip hides the flame icon and shows neutral copy when `streakDays === 0`
- [ ] LastSim tile shows an empty state when `lastSim` is undefined

**Constraints (non-negotiable).**
- [ ] `bun lint:all` passes (Biome + super-lint + GritQL)
- [ ] `bun typecheck` passes
- [ ] Zero `try…catch` blocks in new files
- [ ] Zero `as` casts in new files (other than `as const`)
- [ ] Zero `null` types in new files (only `?:` optional fields)
- [ ] All new files keep one component per file under `src/components/dashboard/`
- [ ] No new database migrations are run as part of this PRD

**Motion + a11y.**
- [ ] All transitions use `--ease-out`; durations are `--d-fast` or `--d-base`
- [ ] `prefers-reduced-motion: reduce` is honored (CSS in §8 does this globally)
- [ ] Every interactive element has a visible `:focus-visible` outline
- [ ] `aria-label` is set on `BeltIndicator` and on the avatar
- [ ] Visually-hidden `<h1>Dashboard</h1>` exists at the top of `<main>`

---

## 16. Out of scope (do not implement)

These are intentionally deferred. If you find yourself reaching for them, stop and surface as a follow-up.

- **Real-data wiring.** The stub returns realistic shape; replacing it requires schema confirmation. Document any schema gaps in the implementation summary.
- **Mission picker logic.** The "best mission" computation (`frequency_on_real_test × (1 - accuracy_at_pace)`, tiebreaker by proximity to belt promotion) belongs in a separate file once the attempts schema is confirmed. The PRD's stub mission is hand-picked.
- **Belt promotion/demotion logic.** Sliding-window evaluation over last 30 attempts, accuracy + median-time gates. Lives in `src/lib/dashboard/belts.ts` in a follow-up.
- **Active session screen.** `/practice/sim/[id]` and `/practice/drill/[id]` are linked-to but not built here.
- **Post-sim review.** `/practice/[id]/review` is linked-to but not built here.
- **Lessons / pattern library.** `/lessons` is in nav but doesn't need to render anything beyond an empty state for this PRD.
- **Stats deep-dive.** `/stats` likewise.
- **Mobile design polish.** §13 covers "doesn't break"; full mobile design comes later.
- **Streak persistence.** Reading `streakDays` from real user state requires schema decisions about how to count practice days. Stub for now.
- **Settings, profile, onboarding flows.** Not on the dashboard.

---

## 17. Implementation order

Recommended sequence for the agent. Not strict, but minimizes thrash:

1. Add design tokens to `globals.css` (§8) and Tailwind config (§9) — do this first so component styling works as you build.
2. Load fonts in `layout.tsx` (§12).
3. Create `src/lib/dashboard/types.ts` and `helpers.ts` (§5, §7).
4. Create `data.ts` with the stub (§6).
5. Build leaf components first: `BeltIndicator`, `StreakChip`, `StatTile`.
6. Then composite components: `BeltRow`, `DojoCard`, `MissionCard`, `ScoreStrip`, `PaceMetric`, `MistakesTile`, `LastSimTile`, `TopNav`.
7. Wire the page in `src/app/page.tsx` (§11).
8. Run `bun lint:all` and `bun typecheck`. Fix anything that surfaces. Iterate until both pass.
9. Visual diff against the mockup. Pay attention to: cobalt-accent count, serif vs sans split, belt-cap visibility, dojo row spacing.

Once §15 acceptance is fully checked, this PRD is shipped.
