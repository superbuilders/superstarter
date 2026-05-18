---
name: timeback-integrate
description: Full end-to-end Timeback integration. Discovers the app's domain (subjects, grades, activities, auth system), detects the language and architecture, then delegates to the correct sub-skills to wire everything up. After running this, the app reports XP, matches users by email, tracks time-on-task, and fires Caliper events automatically. Use when a developer wants a complete Timeback integration in one step.
---

# Timeback Integrate

Full end-to-end integration. This skill discovers the app's domain, detects the language
and architecture, then orchestrates sub-skills to produce a working Timeback integration.

After running this skill, the app should:
- Match users by email to Timeback accounts
- Report XP and activity metrics on every quiz/lesson/assignment completion
- Track lesson progress (`pctCompleteApp`)
- Track time-on-task automatically (heartbeats, pause/resume, visibility)

## Workflow Overview

```
1. Resume check
   └── Read timeback-integration.md → skip completed steps

2. Discover the app
   ├── Language & framework
   ├── Architecture (browser app vs server-only)
   ├── Subjects & grades
   ├── Activities & start/end points
   ├── Metrics available
   ├── Auth system
   └── Total lesson count

3. Write timeback-integration.md with discovery findings

4. Present summary → get developer confirmation

5. Run sub-skills:

   All apps:            Browser apps also run:
   ├── timeback-init    └── timeback-client
   └── timeback-server      (activity discovery, sign-off, Activity class wiring)

6. Create verification endpoint → verify everything works
```

---

## Resume

If `timeback-integration.md` exists at the project root, read it and check the
Status section.

- If all steps (init, server, and client if applicable) are marked complete, skip
  to Phase 4 (verification).
- If some steps are complete, skip to the first incomplete sub-skill in Phase 3.
- If the Activity Map section has entries with `Approved: Pending`, the client
  skill will handle sign-off when it runs (browser apps), or proceed to server-only
  wiring in Phase 3b.
- If the file doesn't exist, start from Phase 1.

---

## Phase 1: Discover the App

Read the codebase to understand the app's domain and map it to Timeback concepts.
Try to infer what you can, then ask the developer to confirm or fill gaps.

### 1a. Language and framework

Detect the language first — this determines which branches the sub-skills follow.

| Signal | Language |
|--------|----------|
| `package.json` exists | TypeScript / JavaScript |
| `pyproject.toml`, `requirements.txt`, or `Pipfile` exists | Python |
| Both exist | Ask the developer |

Also detect the framework — this affects injection patterns:

**TypeScript**: Next.js (App Router vs Pages), Express, Fastify, Hono, Remix, Electron
**Python**: FastAPI (with Server SDK), Django, Flask, plain Python

### 1b. Architecture

Determine if the app has a **browser-based frontend** (React, Vue, etc.) or is
**server-only** (API backend, mobile backend, batch processor, CLI tool).

This is critical because it determines which sub-skills run and the activity tracking
approach:

| Architecture | Sub-skills | Activity approach |
|---|---|---|
| **Browser app** (React, Next.js, Vue, Svelte, etc.) | init → server → **client** | SDK's client-side `Activity` class — automatic heartbeats, visibility, pause/resume |
| **Server-only** (API, Express, FastAPI, batch) | init → server | Server-side `activity.record()` — completion + optional time data |
| **Python backend + JS frontend** | init → server → **client** | Python adapter serves routes, TS SDK `Activity` class on frontend |

### 1c. Subjects and grades

Search for subject/topic references:

- Constants, enums, config files containing subject names
  (Math, Reading, Science, Social Studies, Writing, Language, Vocabulary, etc.)
- Grade-level references (grade selectors, K-12 constants, user profile fields)
- Course configuration objects, curriculum definitions, content manifests

Map to Timeback course references:

| App concept | Timeback mapping |
|-------------|-----------------|
| Subject + grade level | `{ subject: 'Math', grade: 3 }` |
| Course code (no grade) | `{ code: 'CS-101' }` |

Valid Timeback subjects: `Math`, `Reading`, `Science`, `Social Studies`, `Writing`,
`Language`, `Vocabulary`, `FastMath`, `Other`, `None`.

### 1d. Activities — start and end points

Search for learning activities and identify **where they start** and **where they end**:

| Activity type | What to look for |
|---|---|
| Quizzes / assessments | Quiz components, answer submission handlers, score calculation |
| Lessons | Lesson pages, content viewers, "complete" buttons |
| Assignments | Submission handlers, upload handlers, grading |
| Practice | Interactive exercises, drill modes, game loops |

For each activity, find both:

**Start point** — where the user begins the activity:
- Component mount, page load, "Start" button, route navigation

**End point (completion)** — where the activity completes and results are available:
- Submit/complete handlers, score display, server actions, API endpoints

Record for each:

- File path and function name
- **Type**: API route, server action, Express handler, Django view, Flask route, etc.
- Activity identifier (slug, route param, database ID)
- Human-readable activity name
- What metrics are available at the end point

### 1e. Available metrics

At each completion point, determine which Timeback metrics can be populated:

| Timeback metric | What to look for |
|---|---|
| `xpEarned` | XP/points calculation, score formulas, reward logic. **Required.** Look for existing point systems, scoring functions, or reward calculations in the codebase first. If none exist, ask the developer to define one. |
| `totalQuestions` | Question count, quiz length, number of items |
| `correctQuestions` | Correct answer count, score numerator |
| `masteredUnits` | Units/concepts mastered, skill completion counts |

### 1f. Auth system

Search for how the app authenticates users:

- Auth providers (Clerk, Auth0, NextAuth, Firebase, Supabase, Cognito, Passport,
  Django auth, Flask-Login, FastAPI dependencies)
- Session middleware, JWT verification, token decoding
- User model — where is the email stored and accessible?

Determine: **In a server-side handler, how do you get the current user's email?**

### 1g. Total lessons/activities

Determine the total number of activities per course for `pctComplete` calculation:

- Content manifests or lesson configs
- Route definitions for lesson pages
- Database seeds, content generation scripts
- Constants defining lesson counts

---

## Phase 2: Write Integration File and Present Summary

Create `timeback-integration.md` at the project root with all discovery findings.
This file persists across sessions — if context is lost, the agent reads it to
understand the current state.

Write the file with this structure:

```markdown
# Timeback Integration

## Status
- [ ] timeback-init
- [ ] timeback-server
- [ ] timeback-client

## Project
- **Framework**: [detected framework]
- **Language**: [TypeScript or Python]
- **Package Manager**: [detected package manager]
- **Architecture**: [Browser app / Server-only / Python backend + JS frontend]

## Auth
- **Provider**: [discovered provider]
- **Email accessor**: [code to get email]
- **Identity mode**: [custom or sso, or "TBD" if not yet determined]

## Courses
- [subject], Grade [grade] → `{ subject: "[subject]", grade: [grade] }`

## Activity Map

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

Then present a summary to the developer for confirmation:

```
Timeback Integration Summary
=============================
App: [app name from package.json or pyproject.toml]
Framework: [detected framework]
Language: [TypeScript / Python]
Architecture: [Browser app / Server-only / Python backend + JS frontend]

Subjects & Grades:
  - Math (Grade 3) → { subject: "Math", grade: 3 }
  - Reading (Grade 3) → { subject: "Reading", grade: 3 }

Activities Found: [count] (details in timeback-integration.md)
Auth: [provider] → [how to get email]
Total Lessons: [count] per course

Activity Tracking Approach:
  [Browser-based → SDK Activity class / Server-only → activity.record()]

Proceed with integration? [Y/n]
```

Ask the developer to confirm or correct any mappings before continuing.
The Activity Map entries stay `Approved: Pending` — for browser apps, the
`timeback-client` skill handles per-activity sign-off during its Phase 2.

---

## Phase 3: Run Sub-Skills

Execute sub-skills in order. The architecture (browser app vs server-only) determines
which skills run.

### 3a. timeback-init

Follow the `timeback-init` skill to:
- Detect the project setup (language, framework, package manager)
- Configure environment variables
- Guide the developer through CLI setup (`timeback credentials add` + `timeback init --sync`)
- Wait for `timeback.config.json` to exist with provisioned course IDs
- Create/update `timeback-integration.md`

### 3b. timeback-server

Follow the `timeback-server` skill to:
- Install the correct SDK package (`@timeback/sdk`, `timeback-sdk[fastapi]`, `timeback-sdk[django]`, or `timeback-core`)
- Discover the auth system and determine how to get the user's email
- Create the server SDK instance with identity config
- Mount the framework adapter

**For server-only apps**, the server skill also handles activity tracking:
- Wire `activity.record()` at each approved completion endpoint from the Activity Map
- Use the XP formulas and time tracking decisions from Phase 2
- For Django/Flask without adapter, create the manual Caliper `track_activity()` module

### 3c. timeback-client (browser apps only)

> **Server-only apps**: skip this step. Activity tracking is handled by `timeback-server`
> using `activity.record()`.

Follow the `timeback-client` skill to:
- Run activity discovery sign-off (developer approves each activity's XP/time decisions)
- Set up the framework adapter (`TimebackProvider` for React/Vue/Solid, `initTimeback()` for Svelte, or `createClient()` directly)
- Wire the Activity class lifecycle at each approved activity's start/end points

The client skill is **always TypeScript**, even when the backend is Python. The browser
SDK is TypeScript regardless of the server language.

---

## Phase 4: Verify

### 4a. Create a verification endpoint

Generate a `GET /api/timeback/verify` endpoint that checks two things and returns
JSON with `{ status: "ready" | "issues_found", results: { ... } }`:

1. **Auth** — Call `timeback.api.checkAuth()` (TS SDK instance) or
   `await timeback.instance.api.check_auth()` (Python). Both work because the
   `api` property is a lazy getter that returns the underlying `TimebackClient`.
   Report ok/fail.
2. **Courses** — Read `timeback.config.json`, check that all courses have `ids`
   populated for the current `TIMEBACK_ENV`. Report count of synced vs unsynced.

Adapt the endpoint to the app's framework (Next.js route handler, Express route,
FastAPI router, Django view). The pattern is the same — try each check, catch errors,
return a JSON summary.

Tell the developer:

```
Verification endpoint created. Visit in your browser:

  http://localhost:[port]/api/timeback/verify
```

### 4b. Run verification

Hit the endpoint and check all results are `ok: true`.

If any fail:
- `auth: false` → check `.env` credentials
- `courses: false` → run `npx timeback resources push --env staging`

### 4c. Present final checklist

```
Integration Checklist
======================
[x] SDK installed and configured
[x] Server adapter mounted (activity routes available)
[x] Environment variables configured (.env)
[x] .env is in .gitignore
[x] timeback.config.json created with course definitions
[x] Courses pushed to staging (npx timeback resources push)
[x] Activity tracking wired (start + end points)
[x] Time-on-task tracking enabled (automatic via SDK Activity class)
[x] Verification endpoint created and all checks pass

Manual testing (do these in the running app):
[ ] Sign in as a test user
[ ] Start an activity (quiz, lesson, etc.) — confirm heartbeats begin
[ ] Complete the activity — confirm XP and metrics are reported
[ ] Visit /api/timeback/verify to confirm auth and courses
[ ] Verify the activity event appears in Timeback Studio (`bunx timeback studio`)
[ ] Check that time-on-task data is recorded (active seconds)
[ ] Test pause behavior (switch tabs, come back)

Before going to production:
[ ] Switch TIMEBACK_ENV from staging to production
[ ] Run: npx timeback resources push --env production
[ ] Update .env with production credentials
[ ] Verify /api/timeback/verify passes in production
```
