---
name: timeback-migrate
description: Migrate an app from direct Timeback API calls to the SDK. Scans for raw HTTP calls (OAuth token management, OneRoster queries, Caliper event sends, Edubridge/QTI/PowerPath calls), proposes an SDK equivalent for each supported direct call and flags unsupported or ambiguous cases for developer review, generates or updates timeback.config.json to reference existing Timeback courses only, and incrementally replaces approved direct calls with SDK methods while preserving behavior and verifying each category before cleanup. This is NOT the integrate flow — the app is already working with Timeback, we're swapping the plumbing.
---

# Timeback Migrate

Migrate an existing Timeback integration from direct API calls to the SDK.

This skill is for apps that **already work with Timeback** — they authenticate via
OAuth, query OneRoster, send Caliper events, etc. — but do it through raw HTTP calls
instead of the SDK. The migration incrementally replaces hand-rolled plumbing with SDK
methods and removes code the SDK makes redundant (token management, URL construction,
Caliper envelope building). Only the transport layer changes — product behavior is
preserved.

## When to Use

Use when a developer has an existing, working Timeback integration implemented with
raw HTTP or custom auth/event plumbing and wants to replace those calls with the
official SDK without changing product behavior.

**Prerequisites:**

- The app is already making authenticated calls to Timeback APIs
- API credentials exist (may be stored under different env var names than the SDK
  expects)
- The developer can identify which Timeback environment the app targets (staging,
  production, or local)

## When NOT to Use

- **Greenfield integration** — the app has no Timeback code yet (use the integrate
  flow instead)
- **App does not successfully call Timeback** — fix the existing integration first
- **Adding a single new endpoint** — just add the new SDK call; a full migration is
  overkill
- **Config or debug tasks** — adjusting env vars, fixing a broken token, or
  debugging a single API call is not a migration
- **Browser-only SDK setup** — if only client-side tracking is needed and there is no
  server-side Timeback code, use the client setup flow instead

## Resume

If `timeback-migration.md` exists at the project root, read it and check the Status
section.

- If all phases are complete, verify the migration is still in place and skip to the
  end.
- If partial progress is documented, resume from the first incomplete phase.
- If the file doesn't exist, start from Phase 1.

---

## Migration Workflow

### Phase 1: Audit

Scan the codebase for direct Timeback integration patterns. **No code is changed in
this phase.** The goal is a complete inventory of what needs to migrate.

#### 1a. Detect Language and Framework

| Signal | Language |
|--------|----------|
| `package.json` exists | TypeScript / JavaScript |
| `pyproject.toml`, `requirements.txt`, or `Pipfile` exists | Python |
| Both exist | Ask which codepath owns the Timeback integration |

Detect the framework (Next.js, Express, FastAPI, Django, etc.) — this determines
which SDK adapter to use later.

#### 1b. Find Credentials and Token Management

Search for how the app authenticates with Timeback APIs:

| Pattern | What to look for |
|---------|-----------------|
| OAuth token fetch | `grant_type=client_credentials`, calls to `*/oauth2/token` or `*/auth/*/token` |
| Token caching | Token stores, expiry checks, `expires_in` handling |
| Token refresh | Interceptors, middleware, retry-on-401 logic |
| Credential env vars | `CLIENT_ID`, `CLIENT_SECRET`, `API_KEY` — may not match SDK naming |
| Base URL config | Timeback API host constants, URL builders |

Record where credentials are stored, where tokens are fetched/cached, where base URLs
are defined, and which files are involved.

#### 1c. Find Direct API Calls

Search for raw HTTP calls to Timeback endpoints. Common patterns:

- **OneRoster:** URLs containing `oneroster/rostering/v1p2/` or `oneroster/gradebook/v1p2/`
- **Caliper:** URLs containing `caliper/event` or `events/1.0`, manual envelope construction (`@context`, `sensor`, `sendTime`, `data[]`)
- **Edubridge:** URLs containing `edubridge`
- **QTI:** URLs containing `qti`
- **PowerPath:** URLs containing `powerpath`

For each call found, record the file path, HTTP method and endpoint path, what data
is sent or received, and the surrounding function context. Line numbers are useful
but not required — the file path and a brief code snippet are sufficient to
identify the call.

#### 1d. Discover Existing Courses

Search for course references embedded in the direct API calls:

| Source | What to extract |
|--------|----------------|
| Caliper event payloads | `subject`, `grade`, `course.name`, `sensor` URL |
| OneRoster course queries | Course `sourcedId` values, subject/grade mappings |
| Hardcoded constants | Subject strings, grade numbers, course codes |
| Config files | Any app-specific config that maps subjects to Timeback concepts |
| Sensor URLs | These encode the app identity (e.g., `https://myapp.com`) |

Build a list of courses the app is already reporting against. These are **proposals**
— the developer will confirm them at Gate 1.

#### 1e. Discover Auth System

Find how the app obtains the current user's email in a request handler. This is
needed for the SDK's identity config.

Look for auth providers (Clerk, Auth0, NextAuth, Django auth, etc.), session/JWT
handling, and where the user's email is accessible. If the mechanism is unclear,
flag it — the developer will clarify at Gate 1.

#### 1f. Write the Migration Manifest

Create `timeback-migration.md` at the project root:

```markdown
# Timeback Migration

## Status
- [ ] Phase 1: Audit
- [ ] Phase 2: Config & SDK Setup
- [ ] Phase 3: Migrate API Calls
- [ ] Phase 4: Cleanup & Verify

## Project
- **Framework**: [detected framework]
- **Language**: [TypeScript or Python]
- **Package Manager**: [detected package manager]
- **Architecture**: [Browser app / Server-only / Both]

## Existing Credentials
- **Client ID env var**: [current env var name, e.g., `TB_CLIENT_ID`]
- **Client Secret env var**: [current env var name, e.g., `TB_CLIENT_SECRET`]
- **Environment**: [staging / production / local]

## Auth
- **Provider**: [discovered provider, or "unclear — needs confirmation"]
- **Email accessor**: [code to get email, or "needs confirmation"]

## Discovered Courses (proposed)
| Subject | Grade / Code | Existing ID | Source | Confirmed |
|---------|-------------|-------------|--------|-----------|
| [subject] | [grade or courseCode] | [sourcedId if found] | [where found] | Pending |

## Token Management (to remove)
- **Token fetch**: `[file]` — [description]
- **Token cache**: `[file]` — [description]
- **Token refresh**: `[file]` — [description]

## API Call Inventory
### [Category]: [Description]
- **File**: `[file path]`
- **Current**: `[brief code snippet or description]`
- **Proposed SDK replacement**: `[SDK method]`
- **Status**: Pending / Approved / No SDK equivalent / Excluded
```

Mark Phase 1 as complete. Proceed to **Gate 1**.

---

### Phase 2: Config & SDK Setup

#### 2a. Map Environment Variables

Check if the app's existing env var names match what the SDK expects:

| SDK expects | Common alternatives |
|---|---|
| `TIMEBACK_CLIENT_ID` | `TB_CLIENT_ID`, `TIMEBACK_API_CLIENT_ID`, `CLIENT_ID` |
| `TIMEBACK_CLIENT_SECRET` | `TB_CLIENT_SECRET`, `TIMEBACK_API_CLIENT_SECRET`, `CLIENT_SECRET` |
| `TIMEBACK_ENV` | `TB_ENV`, `TIMEBACK_ENVIRONMENT`, `NODE_ENV` mapping |

If the names differ, present options to the developer at **Gate 2**.

#### 2b. Build `timeback.config.json`

The SDK requires `timeback.config.json` to resolve courses. The courses already exist
in Timeback — **do not create new courses**.

**Step 1: Look up existing course IDs**

Try the CLI first. If it fails (not installed, auth not configured, wrong runtime),
fall back to having the developer provide the course IDs directly.

```bash
# Primary — adjust runner to match the project (npx, bunx, pnpm exec, etc.)
npx timeback api oneroster courses list --env staging --limit 50
```

If the CLI is unavailable, ask the developer:

```
I need the Timeback course IDs for the courses this app reports against.
You can find them in the Timeback dashboard, or run:
  npx timeback api oneroster courses list --env staging

Please provide the staging (and production, if known) course IDs for:
  - [subject] Grade [grade]
  - ...
```

Match discovered courses (from Phase 1d) to the API results by subject, grade,
and/or title. If the match is ambiguous, flag it for **Gate 3**.

**Step 2: Determine the sensor URL**

The sensor URL is typically the app's production origin. Look for it in existing
Caliper events (the `sensor` field in envelopes), launch URLs, or app constants.
If not found, ask the developer at Gate 3.

**Step 3: Generate the config**

Courses can be identified by `subject` + `grade` (grade-based apps) or by
`courseCode` (grade-less apps). Use whichever pattern matches the existing code.

```json
{
  "name": "[app name]",
  "sensor": "[sensor URL from existing events or app origin]",
  "launchUrl": "[app production URL]",
  "courses": [
    {
      "subject": "[subject]",
      "grade": "[grade, if grade-based]",
      "courseCode": "[code, if grade-less]",
      "ids": {
        "staging": "[matched staging course ID]",
        "production": "[matched production course ID, if known]"
      }
    }
  ]
}
```

Present to the developer at **Gate 3** for confirmation.

Do **not** run `timeback init --sync` or `timeback resources push` — the courses
already exist. The config just needs to reference them.

#### 2c. Install the SDK

**TypeScript:**

```bash
bun add @timeback/sdk    # or npm install / pnpm add / yarn add
```

**Python (FastAPI):**

```bash
uv add "timeback-sdk[fastapi]"    # or pip install
```

**Python (Django):**

```bash
uv add "timeback-sdk[django]"    # or pip install
```

**Python (Flask / other):**

```bash
uv add timeback-core    # or pip install
```

If the app previously used individual Timeback client packages (`@timeback/core`,
`@timeback/oneroster`, `@timeback/caliper`), keep them installed until Phase 4 —
removing them mid-migration could break things.

#### 2d. Create the Server SDK Instance

Create the SDK module (e.g., `src/lib/timeback.ts` or `app/timeback_server.py`).

**TypeScript:**

```typescript
import { createTimeback } from '@timeback/sdk';

export const timeback = await createTimeback({
  env: process.env.TIMEBACK_ENV as 'staging' | 'production' | 'local',
  api: {
    clientId: process.env.TIMEBACK_CLIENT_ID!,
    clientSecret: process.env.TIMEBACK_CLIENT_SECRET!,
  },
  identity: {
    mode: 'custom',
    getEmail: async (req: Request) => {
      // Wire up from Phase 1e findings
    },
  },
});
```

`createTimeback()` is async — always `await` the result. The config uses `api:` for
credentials, not `auth:` (that's the `@timeback/core` direct client interface).

The SDK also supports `mode: 'sso'` for SSO-based identity, but `mode: 'custom'` is
the right choice for migration since the app already has its own auth.

**Python (FastAPI):**

```python
import os
from fastapi import Request
from timeback import ApiCredentials, CustomIdentityConfig, TimebackConfig
from timeback.server.adapters.fastapi import TimebackFastAPI

async def get_email(request: Request) -> str:
    # Wire up from Phase 1e findings
    raise NotImplementedError("Wire up your auth here")

timeback = TimebackFastAPI(TimebackConfig(
    env=os.environ.get("TIMEBACK_ENV", "staging"),
    api=ApiCredentials(
        client_id=os.environ["TIMEBACK_CLIENT_ID"],
        client_secret=os.environ["TIMEBACK_CLIENT_SECRET"],
    ),
    identity=CustomIdentityConfig(
        mode="custom",
        get_email=get_email,
    ),
))
```

#### 2e. Mount the Framework Adapter

Mount the SDK's HTTP handler at a route prefix (typically `/api/timeback`). The
exact pattern depends on the framework:

- **Next.js:** Route handler at `app/api/timeback/[...path]/route.ts`
- **Express:** `app.all('/api/timeback/*', timeback.handler)`
- **FastAPI:** `app.mount('/api/timeback', timeback.app)`
- **Django:** URL pattern in `urls.py`

If the app already has routes at `/api/timeback/*`, ask the developer what path
prefix to use.

Mark Phase 2 as complete.

---

### Phase 3: Migrate API Calls

Work through the approved API Call Inventory. Only migrate calls marked
`Approved` at Gate 1.

**Migration order** — work in dependency order to keep the app functional:

1. OneRoster read calls (queries) — lowest risk, no side effects
2. Caliper event sends — replace envelope construction with SDK methods
3. Edubridge / QTI / PowerPath calls — if present
4. Token management removal — last, after nothing depends on it

For each migrated call group, record in `timeback-migration.md`:

| Call | Original | SDK Replacement | Verified |
|------|----------|-----------------|----------|
| [description] | `[old code snippet]` | `[new SDK call]` | [ ] |

#### 3a. OneRoster Calls

Replace raw HTTP calls with SDK client methods. See the SDK Reference section for
the full mapping table.

Replace manual query string construction with SDK filter syntax:

```typescript
// Before: fetch(`...users?filter=email='${email}'`)
// After:
const users = await timeback.api.oneroster.users.list({
  where: { email },
});
```

If the existing code paginates manually, replace with `.listAll()` (auto-paginates)
or `.stream()` (async iterator) where appropriate.

#### 3b. Caliper Event Sends

**If the app sends activity completion events + time tracking:**

Replace with `activity.record()` (server-side):

```typescript
await timeback.activity.record({
  user: { email: userEmail },
  activity: {
    id: activityId,
    name: activityName,
    course: { subject: 'Math', grade: 3 },
  },
  metrics: {
    xpEarned: score,
    totalQuestions: total,
    correctQuestions: correct,
  },
});
```

**If the app sends raw Caliper events that don't fit the activity pattern:**

Use the Caliper client directly:

```typescript
await timeback.api.caliper.events.send(sensorUrl, [eventPayload]);
```

If any Caliper event mapping is ambiguous, present the current event and proposed
replacement to the developer at **Gate 4**. Do not assume a mapping is correct.

#### 3c. Edubridge / QTI / PowerPath Calls

Replace with the corresponding SDK sub-client. See the SDK Reference section for
the full method list.

#### 3d. Browser-Side Migration (if applicable)

If the app has browser-side code making direct Timeback calls:

1. Set up `TimebackProvider` (React) or equivalent for the framework
2. Replace client-side direct calls with the browser SDK's Activity class
3. Ask the developer whether browser-side calls should go through the SDK's client
   adapter (recommended) or remain as direct calls

#### 3e. No SDK Equivalent

If a direct API call has no known SDK equivalent:

1. Mark it as `No SDK equivalent` in the migration manifest
2. Leave it as a raw call
3. Ask the developer whether to wrap it in a thin compatibility layer or leave it raw
4. Document the rationale for exclusion

Do not invent SDK methods that don't exist.

Mark Phase 3 as complete.

---

### Phase 4: Cleanup & Verify

#### 4a. Remove Token Management

Remove token fetch functions, cache/store modules, refresh interceptors, and
retry-on-401 middleware — the SDK handles this.

**Chesterton's Fence:** Before removing any token management code, verify it is only
used for Timeback API calls. If it's shared with other services, leave it in place
and only remove the Timeback-specific parts.

#### 4b. Remove Dead Code

Remove code the SDK replaces: Timeback URL constants, custom Caliper envelope
builders, OneRoster response type definitions, Timeback-specific HTTP client wrappers.

Same Chesterton's Fence rule — only remove code exclusively used for Timeback API
calls. If a utility is shared, leave it.

#### 4c. Remove Unused Dependencies

Present proposed removals to the developer at **Gate 5**. Check if each package is
used elsewhere before proposing removal.

#### 4d. Verify

**Run checks:**

TypeScript:
```bash
bun run check    # types + lint
bun run test     # unit tests
```

Python:
```bash
just check       # or the project's configured linter/type checker
just test        # or pytest, etc.
```

**Scan for remaining direct calls:**

Search for Timeback hostnames (`alpha-1edtech`, `caliper.`, `oneroster`), OAuth
token endpoint patterns, and Caliper envelope construction (`@context.*caliper`).
Migrate any remaining calls or confirm with the developer they are intentionally
direct.

**Verify credentials through the SDK (if CLI is available):**

```bash
npx timeback api oneroster users list --limit 1 --env staging
```

If the CLI is unavailable, verify by running the app and confirming a OneRoster
query or Caliper event succeeds through the SDK.

Mark Phase 4 as complete.

---

## Decision Gates

These are explicit checkpoints where the agent must stop and wait for developer
confirmation before proceeding. Do not skip gates.

### Gate 1: Confirm Audit Inventory (after Phase 1)

Present the full migration manifest and ask the developer to confirm or correct:

- Are the discovered API calls complete? Any calls the audit missed?
- Are the proposed SDK replacements correct?
- Should any calls be excluded from migration (kept as raw)?
- Is the auth system detection correct?
- Are the discovered courses correct?

Mark approved calls as `Approved` and excluded calls as `Excluded` with rationale.

### Gate 2: Confirm Env Var Strategy (Phase 2a)

If existing env var names don't match SDK expectations, present options:

1. Add SDK-expected names to `.env` (keep old ones for other uses)
2. Rename existing vars to match the SDK
3. Pass existing vars explicitly in the SDK config

### Gate 3: Confirm Course & Config Mapping (Phase 2b)

Present the generated `timeback.config.json` and ask:

- Do the course IDs match the app's current setup?
- Is the sensor URL correct?
- Any courses missing or mismatched?
- For grade-less apps: are the course codes correct?

### Gate 4: Confirm Ambiguous Event Mappings (Phase 3b)

For any Caliper event where the SDK mapping is not obvious, present the original
event payload alongside the proposed SDK replacement and ask the developer to confirm
the mapping preserves behavior.

### Gate 5: Approve Dependency Cleanup (Phase 4c)

Before removing any dependencies, present the list and ask:

- Which packages are safe to remove?
- Are any of the proposed removals used by other parts of the app?

---

## Constraints and Safety

### Core Rules

- **Never create new courses** — `timeback.config.json` only references existing courses
- **Never run `timeback init --sync`** — that provisions new courses; use API lookup
- **Never remove shared code** — only remove utilities exclusively used for Timeback
- **Never hardcode credentials** — use environment variables
- **Preserve behavior** — the same events fire, the same queries run; only transport changes
- **Propose, don't assume** — present mappings for developer review; do not assume
  an SDK equivalent is correct when the mapping is ambiguous
- **`createTimeback()` is async** — always `await` the result
- **SDK uses `api:` config** — not `auth:` (that's the `@timeback/core` interface)
- **Subjects must be valid** — `Math`, `Reading`, `Science`, `Social Studies`,
  `Writing`, `Language`, `Vocabulary`, `FastMath`, `Other`, `None`

### Success Criteria

Migration is complete when all of these are true:

- [ ] No remaining approved raw Timeback calls (all `Approved` items migrated)
- [ ] Type checks and linting pass (`bun run check` or equivalent)
- [ ] Tests pass (`bun run test` or equivalent)
- [ ] `timeback.config.json` is present and references correct courses
- [ ] At least one end-to-end user flow manually verified
- [ ] All excluded direct calls documented with rationale in `timeback-migration.md`
- [ ] All decision gates completed

### Error Recovery

| Error | Cause | Fix |
|-------|-------|-----|
| Course ID mismatch | Config course doesn't match existing Timeback course | Re-run course lookup, verify IDs with developer |
| Auth error (401) | SDK credentials misconfigured | Check env var names match SDK expectations |
| Missing `timeback.config.json` | Config not generated | Run Phase 2b |
| `activity.record()` validation error | Missing required fields | Compare old event payload with SDK requirements |
| Module not found | SDK not installed | Re-run install from Phase 2c |
| Type errors after migration | SDK types differ from hand-rolled types | Update consuming code to match SDK response types |
| Tests failing | Response shapes changed | Update test assertions to match SDK response format |
| CLI not available | Not installed or auth not configured | Use fallback path (ask developer for IDs, verify via app) |

---

## SDK Reference

For mapping direct calls to SDK methods.

- **TypeScript:** `timeback.api` returns the `TimebackClient` (lazy getter).
- **Python:** Use `timeback.instance.api` (adapters don't expose `.api` directly).

`timeback.api` provides sub-clients: `oneroster`, `caliper`, `edubridge`, `qti`,
`powerpath`, `clr`, `case`, `webhooks`.

### OneRoster

All resources support `.list()`, `.listAll()`, `.first()`, `.stream()`, `.get(id)`,
`.exists(id)`. Resources with write access also support `.create(data)`,
`.update(id, data)`, `.upsert(id, data)`, `.delete(id)`.

| Direct call | SDK equivalent |
|---|---|
| `GET .../users` | `timeback.api.oneroster.users.list()` |
| `GET .../users/{id}` | `timeback.api.oneroster.users.get(id)` |
| `GET .../students` | `timeback.api.oneroster.students.list()` |
| `GET .../classes` | `timeback.api.oneroster.classes.list()` |
| `GET .../enrollments` | `timeback.api.oneroster.enrollments.list()` |
| `GET .../courses` | `timeback.api.oneroster.courses.list()` |
| `GET .../orgs` | `timeback.api.oneroster.orgs.list()` |
| `GET .../schools` | `timeback.api.oneroster.schools.list()` |
| `GET .../results` | `timeback.api.oneroster.results.list()` |
| `GET .../lineItems` | `timeback.api.oneroster.lineItems.list()` |
| `GET .../categories` | `timeback.api.oneroster.categories.list()` |
| `GET .../demographics` | `timeback.api.oneroster.demographics.list()` |
| `GET .../schools/{id}/classes` | `timeback.api.oneroster.schools(id).classes()` |
| `GET .../classes/{id}/students` | `timeback.api.oneroster.classes(id).students()` |
| `GET .../schools/{id}/students` | `timeback.api.oneroster.schools(id).students()` |
| `GET .../classes/{id}/teachers` | `timeback.api.oneroster.classes(id).teachers()` |
| `POST .../users` | `timeback.api.oneroster.users.create(data)` |
| `PUT .../users/{id}` | `timeback.api.oneroster.users.update(id, data)` |
| `DELETE .../users/{id}` | `timeback.api.oneroster.users.delete(id)` |

Read-only resources (no create/update/delete): `students`, `teachers`.

Resources with full CRUD: `users`, `classes`, `courses`, `enrollments`, `orgs`,
`schools`, `results`, `lineItems`, `categories`, `demographics`.

**Filtering:**

```typescript
timeback.api.oneroster.users.list({ where: { email: 'user@school.edu' } })
timeback.api.oneroster.users.list({ where: { role: { in: ['teacher', 'aide'] } } })
timeback.api.oneroster.users.list({ where: { status: { ne: 'deleted' } } })
```

**Python:** Use `snake_case` for method and property names (e.g., `line_items`,
`send_activity`, `get_placement`, `assessment_tests`).

### Caliper

```
timeback.api.caliper.events
  .send(sensor, events)
  .sendActivity(sensor, input)
  .sendTimeSpent(sensor, input)
  .sendEnvelope(envelope)
  .validate(envelope)
  .list(params)
  .get(externalId)
```

### Edubridge

```
timeback.api.edubridge.analytics
  .getActivity(params)
  .getWeeklyFacts(params)
  .getEnrollmentFacts(params)
  .getHighestGradeMastered(studentId, subject)
```

### QTI

```
timeback.api.qti.assessmentTests
  .list(params)  .get(identifier)
  .create(body)  .update(identifier, body)  .delete(identifier)
  .getQuestions(identifier)  .updateMetadata(identifier, body)
```

Additional resources: `assessmentItems`, `stimuli`, `validate`, `lesson`, `general`.

### PowerPath

```
timeback.api.powerpath.placement
  .getPlacement(studentId)
  .getAllPlacementTests(params)
  .getCurrentLevel(params)
  .getNextPlacementTest(params)
  .getSubjectProgress(params)
  .resetUserPlacement(input)
```

### Activity (server-side)

```typescript
await timeback.activity.record({
  user: { email },
  activity: {
    id: string,
    name: string,
    course: { subject, grade } | { code: string },
  },
  metrics: {
    xpEarned: number,           // required
    totalQuestions?: number,
    correctQuestions?: number,
    masteredUnits?: number,
    pctComplete?: number,
  },
  time?: {                      // optional — emits TimeSpentEvent when provided
    startedAt?: Date | string,
    endedAt?: Date | string,
    activeMs?: number,
    inactiveMs?: number,
  },
  runId?: string,               // correlates with client-side heartbeats
});
```
