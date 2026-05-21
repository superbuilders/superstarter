---
name: timeback-client
description: Set up browser-side activity tracking using the Timeback SDK's Activity class. Covers React, Vue, Svelte, and Solid adapters, plus framework-agnostic createClient. Handles the full activity lifecycle — start, pause, resume, end with metrics, automatic heartbeats, and visibility-aware time tracking. Always TypeScript, even when the backend is Python. Use when a browser app needs to track learning activities and report XP.
---

# Timeback Client (Browser Activity Tracking)

Wire up client-side activity tracking in a browser app using the SDK's `Activity` class.
This handles the full lifecycle: start, pause/resume, heartbeat time tracking, and
completion with metrics.

This skill is **always TypeScript** — the browser SDK is TypeScript regardless of the
backend language. Even if the server is Python (FastAPI, Django), the frontend uses
the Timeback client SDK.

The SDK provides framework-specific adapters:

| Framework | Import | Pattern |
|---|---|---|
| React / Next.js | `@timeback/sdk/react` | `TimebackProvider` + `useTimeback()` hook |
| Vue / Nuxt | `@timeback/sdk/vue` | `TimebackProvider` + `useTimeback()` composable |
| Svelte / SvelteKit | `@timeback/sdk/svelte` | `initTimeback()` + `timeback` store |
| Solid / SolidStart | `@timeback/sdk/solid` | `TimebackProvider` + `useTimeback()` |
| No framework | `@timeback/sdk/client` | `createClient()` directly |

This skill has three phases with a **hard gate** between discovery and implementation.
No code is written until the developer reviews and approves the activity map.

```
Phase 1: Discovery     → Agent scans, writes findings to timeback-integration.md
Phase 2: Sign-off      → Developer reviews each activity, approves XP/time decisions
                          ── GATE: nothing proceeds until approved ──
Phase 3: Implementation → Agent writes code for approved activities only
```

## Prerequisites

- `timeback-server` must be completed:
  - Server SDK instance created (`createTimeback()` / `TimebackFastAPI()` / `TimebackDjango()`)
  - Framework adapter mounted (serves `/api/timeback/*` routes)
  - Auth/identity configured
- The auth provider and email accessor must be documented in `timeback-integration.md`

## Resume

Read `timeback-integration.md` at the project root.

- If the **Activity Map** section has entries and all are marked `Approved: Yes`,
  skip to Phase 3 (implementation).
- If the Activity Map has entries with `Approved: Pending`, skip to Phase 2
  (developer sign-off).
- If the Activity Map is empty or missing, start at Phase 1 (discovery).
- If `timeback-client` is already marked complete in the Status section, verify
  the implementation is still in place and skip to the end.

## How It Works

The client SDK provides a browser-side `Activity` class that:

- Starts an activity and begins heartbeat time tracking (every 15 seconds)
- Automatically pauses when the tab becomes hidden and resumes when visible
- Sends a `sendBeacon` on page exit to capture final time
- Ends the activity with optional completion metrics (XP, scores, progress)
- Enforces **one activity at a time** — end the current before starting another

The client communicates with the server adapter (mounted in `timeback-server`) via
HTTP requests to `/api/timeback/*`.

---

## Phase 1: Discovery

Scan the codebase and write findings to the **Activity Map** section of
`timeback-integration.md`. **No code is generated in this phase.**

### 1a. Identify Subjects and Grades

Search for subject/topic references (constants, enums, config files, curriculum
definitions) and map each to a Timeback course reference:

- Subject + grade → `{ subject: 'Math', grade: 3 }`
- Course code → `{ code: 'CS-101' }`

Valid subjects: `Math`, `Reading`, `Science`, `Social Studies`, `Writing`,
`Language`, `Vocabulary`, `FastMath`, `Other`, `None`.

If subjects don't map cleanly, ask the developer.

### 1b. Find Activity Start AND End Points

Search for **start points** (component mounts, "Start" buttons, route navigation)
and **end points** (submit handlers, score displays, "Done" buttons).

### 1c. Inventory Available Metrics

At each end point, determine what data is available: XP/points calculations,
question counts, correct answer counts, mastered unit counts, progress tracking.

Do **not** assume every activity earns XP. Some activities (reading a lesson,
exploring a dashboard) may only warrant time tracking.

### 1d. Determine Lesson Progress

Look for content manifests, route definitions, or constants that define the total
number of activities per course — needed for `pctComplete` calculation.

If not statically determinable, ask the developer.

### 1e. Write the Activity Map

For each activity found, add an entry to `timeback-integration.md`:

```markdown
### [Type]: [Activity Name]
- **Location**: `[file path]`
- **Start**: [where the activity begins]
- **End**: [where the activity completes]
- **Earns XP**: [Proposed: Yes / No]
- **XP Formula**: [from codebase if found, or "ask developer" if not]
- **Available Metrics**: [what data exists at the end point]
- **Track Time**: [Proposed: Yes / No]
- **Course**: [subject, grade]
- **Approved**: Pending
```

Propose `Earns XP: Yes` only when scoring data exists at the end point.
Propose `Track Time: Yes` for browser activities, `No` for instant operations.

**Do not invent XP formulas.** If the codebase has existing scoring/points logic,
reference it. If not, write "ask developer" — the developer owns the XP formula.

### 1f. Verify Courses Are Provisioned

```bash
npx timeback resources push --env staging --dry-run
```

If `ids` are null or missing, run without `--dry-run`.

---

## Phase 2: Developer Sign-off

Present the Activity Map and get explicit approval for each activity.
**No code is written until all target activities are approved.**

For each activity, ask the developer to confirm or change:

1. **Earns XP?** — Not every module should award XP. Time-only tracking is valid
   for content browsing, review pages, dashboards, etc.
2. **XP Formula** — If yes, confirm the formula. If no scoring logic was found in the
   codebase, the developer must define one. Do not invent a formula.
3. **Track Time?** — Confirm heartbeat tracking. Most browser activities should;
   brief or non-instructional pages may not.
4. **Course mapping** — Confirm subject and grade.

After review, update `timeback-integration.md` with decisions and mark
`Approved: Yes`. Activities the developer defers stay `Approved: Pending`.

**Proceed to Phase 3 only when at least one activity is approved.**

---

## Phase 3: Implementation

Wire the approved activities. Only touch activities marked `Approved: Yes`.

### 3a. Install `@timeback/sdk`

Check if already installed (the server skill may have installed it). If not:

```bash
bun add @timeback/sdk    # or npm install / pnpm add / yarn add
```

### 3b. Set Up the Client SDK

**React / Next.js** — wrap the app with `TimebackProvider`:

```typescript
'use client'; // required for Next.js App Router — layouts/pages are server components by default

import { TimebackProvider } from '@timeback/sdk/react';

function App({ children }) {
  return (
    <TimebackProvider>
      {children}
    </TimebackProvider>
  );
}
```

`TimebackProvider` accepts an optional `client` prop. Use this when you need a
custom client (e.g., with the `bearer` plugin for external auth):

```typescript
import { TimebackProvider } from '@timeback/sdk/react';
import { createClient, bearer } from '@timeback/sdk/client';

const client = createClient({
  plugins: bearer({ getToken: () => getAccessToken() }),
});

function App({ children }) {
  return (
    <TimebackProvider client={client}>
      {children}
    </TimebackProvider>
  );
}
```

**Vue / Nuxt** — wrap the app with `TimebackProvider`:

```typescript
import { TimebackProvider } from '@timeback/sdk/vue';
```

Use `<TimebackProvider>` as a wrapper component around your app or the relevant subtree.

**Svelte / SvelteKit** — initialize in a layout or root component:

```typescript
import { initTimeback, timeback } from '@timeback/sdk/svelte';

initTimeback();
```

Then access `$timeback` in components via the store. Svelte uses a reactive store
pattern rather than hooks — check `$timeback` is defined before use.

**Solid / SolidStart** — wrap the app with `TimebackProvider`:

```typescript
import { TimebackProvider } from '@timeback/sdk/solid';
```

Use `<TimebackProvider>` as a wrapper. Access with `useTimeback()` in child components.

**No framework** — use `createClient` directly:

```typescript
import { createClient } from '@timeback/sdk/client';

const timeback = createClient({
  defaultCourse: { subject: 'Math', grade: 3 },   // optional — single-course apps only
});
```

For apps serving **multiple courses** (e.g., Math Grades 1-3), omit `defaultCourse`
and pass `course` explicitly in every `activity.start()` call instead.

### 3c. Wire Activity Lifecycle

For each approved activity, the wiring depends on two decisions from the Activity Map:

| Earns XP | Track Time | What to wire |
|---|---|---|
| Yes | Yes | `start()` + `end({ xpEarned, ... })` — full completion + time |
| Yes | No | `start({ time: false })` + `end({ xpEarned, ... })` — completion only |
| No | Yes | `start()` + `end()` — time tracking only, no completion event |
| No | No | Skip entirely |

**React — using `useTimeback` hook:**

```typescript
import { useTimeback, type Activity } from '@timeback/sdk/react';
import { useEffect, useRef } from 'react';

function QuizComponent({ quizId, quizName }) {
  const timeback = useTimeback();
  const activityRef = useRef<Activity | null>(null);

  useEffect(() => {
    if (!timeback) return;

    activityRef.current = timeback.activity.start({
      id: quizId,
      name: quizName,
      course: getCourseForActivity(quizId),
      onError: (error, context) => {
        console.error('Activity error:', error, context);
      },
    });

    return () => {
      activityRef.current?.end();
      activityRef.current = null;
    };
  }, [timeback, quizId]);

  if (!timeback) return null;

  async function handleSubmit(results) {
    await activityRef.current?.end({
      xpEarned: xpEarned, // use the app's scoring logic — see Activity Map
      totalQuestions: results.total,
      correctQuestions: results.correct,
      pctComplete: calculateProgress(),
    });
    activityRef.current = null;
  }
}
```

**Key wiring rules:**

- `course` can be hardcoded when an activity always belongs to one course, or
  resolved at runtime (from user profile, route params, content metadata) when the
  same component serves multiple courses
- Use the XP formula from the Activity Map — do not invent one
- `end(metrics)` sends `ActivityCompletedEvent` + final `TimeSpentEvent`
- `end()` with no metrics sends only final `TimeSpentEvent` (time-only activities)
- Store the `Activity` instance in a `useRef` (React) to access across renders
- The SDK enforces **one activity at a time** — end the current before starting another
- Clean up in `useEffect` return to handle unmount/navigation

### 3d. Update Integration File

After wiring all approved activities, update `timeback-integration.md`:

1. Mark `timeback-client` as complete in the Status section
2. Confirm the Activity Map reflects what was actually implemented

---

## API Reference

### Imports

```
React:
  import { TimebackProvider, useTimeback, SignInButton } from '@timeback/sdk/react'
  import { useTimebackVerification, useTimebackProfile } from '@timeback/sdk/react'
  import type { Activity } from '@timeback/sdk/react'

Vue:
  import { TimebackProvider, useTimeback, SignInButton } from '@timeback/sdk/vue'
  import { useTimebackVerification, useTimebackProfile } from '@timeback/sdk/vue'
  import type { Activity } from '@timeback/sdk/vue'

Svelte:
  import { initTimeback, timeback, timebackProfile, timebackVerification } from '@timeback/sdk/svelte'
  import { SignInButton } from '@timeback/sdk/svelte'
  import type { Activity } from '@timeback/sdk/svelte'

Solid:
  import { TimebackProvider, useTimeback, SignInButton } from '@timeback/sdk/solid'
  import { createTimebackVerification, createTimebackProfile } from '@timeback/sdk/solid'
  import type { Activity } from '@timeback/sdk/solid'

No framework:
  import { createClient } from '@timeback/sdk/client'
  import type { Activity } from '@timeback/sdk/client'
```

### Additional hooks and components

| Export | Purpose |
|---|---|
| `useTimebackVerification()` | Check if the current user is verified in Timeback |
| `useTimebackProfile()` | Get the current user's Timeback profile |
| `SignInButton` | Pre-built sign-in button for SSO identity mode |

### `createClient()`

```
createClient({
  defaultCourse?: { subject: string, grade: number } | { code: string },
  baseURL?: string,                   // override API base URL
  fetch?: TimebackFetch,              // custom fetch implementation
  plugins?: TimebackClientPlugin | TimebackClientPlugin[],   // e.g., bearer plugin for custom auth
  credentials?: RequestCredentials,   // fetch credentials mode
})
```

For apps using external auth providers (e.g., Auth0), use the `bearer` plugin to
attach tokens to SDK requests:

```typescript
import { createClient, bearer } from '@timeback/sdk/client';

const timeback = createClient({
  plugins: bearer({ getToken: () => getAccessToken() }),
});
```

### `activity.start()`

```
timeback.activity.start({
  id: string,                                           // required
  name: string,                                         // required
  course: { subject: string, grade: number }            // required (or use defaultCourse)
        | { code: string },
  time?: TimeTrackingOptions | false,                   // false disables heartbeats
  process?: boolean,                                    // batch processing mode
  runId?: string,                                       // correlation ID for server-side linking
  onError?: (error: Error, context: ActivityErrorContext) => void,
  onPause?: () => void,
  onResume?: () => void,
  onFlush?: (elapsedMs: number) => void,
})

// Returns: Activity instance
```

**`useTimeback()` returns `TimebackClient | undefined`** — it returns `undefined`
during SSR and before hydration. Always null-check before using:
`if (!timeback) return null;`

**`onError` is important for production apps** — heartbeat failures are non-fatal
and would otherwise be silent. Use it to log or report tracking failures.

### `activity.end()`

```
// Time-only (no completion event):
await activity.end()

// With completion (sends ActivityCompletedEvent + TimeSpentEvent):
await activity.end({
  xpEarned: number,                   // required for completion
  totalQuestions?: number,             // optional — pair with correctQuestions
  correctQuestions?: number,           // optional — pair with totalQuestions
  masteredUnits?: number,              // optional
  pctComplete?: number,               // optional
  time?: {                             // optional — override tracked time
    active: number,
    inactive?: number,
  },
})
```

### `activity.pause()` / `activity.resume()`

```
activity.pause()    // pauses heartbeats, marks time as inactive
activity.resume()   // resumes heartbeats, marks time as active
```

The SDK automatically calls pause/resume on tab visibility changes. Manual calls
are for app-specific pausing (e.g., opening a modal, switching to a non-activity view).

---

## Error Recovery

| Error | Cause | Fix |
|---|---|---|
| "Another activity is already in progress" | Called `start()` without ending previous | End the current activity before starting another |
| Heartbeat 401 | Server auth misconfigured | Check `createTimeback()` identity config and env vars on the server |
| Submit 400 | Missing required metrics | Ensure `xpEarned` is provided in `end()` for completion |
| Course not found | Course not in `timeback.config.json` | Run `npx timeback resources push --env staging` |
| Network errors in heartbeat | Connectivity issue | `onError` callback fires — non-fatal, tracking continues |
| `TimebackProvider` missing | Component not wrapped | Ensure the provider wraps the app or the relevant subtree |

## Constraints

- **One activity at a time** — the SDK enforces this
- **`xpEarned` is required for completion** — `end()` without it sends only time tracking
- **`totalQuestions` and `correctQuestions` are paired** — send both or neither
- **Browser-only** — this skill is for client-side code; use `activity.record()` (in `timeback-server`) for server-side
- **Server adapter required** — the client SDK sends HTTP to `/api/timeback/*`; the adapter must be mounted
- **Subjects must be valid** — `Math`, `Reading`, `Science`, `Social Studies`, `Writing`, `Language`, `Vocabulary`, `FastMath`, `Other`, `None`
- **Always TypeScript** — even with a Python backend, the browser SDK is TypeScript
