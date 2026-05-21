---
name: timeback-server
description: Set up the Timeback server SDK in a TypeScript or Python project. Installs the right package, discovers the auth system, creates the server SDK instance with identity config, mounts the framework adapter, and wires server-side activity.record() for server-only apps. Handles both TypeScript (@timeback/sdk) and Python (timeback-sdk or timeback-core) with framework-specific adapters. Use when a developer needs to set up Timeback's server-side infrastructure.
---

# Timeback Server

Install the SDK, configure identity/auth, mount the framework adapter, and — for
server-only apps — wire `activity.record()` at completion endpoints.

This skill handles all server-side Timeback setup. It branches by **language** (TypeScript
vs Python) and by **framework** (Next.js, Express, FastAPI, Django, Flask, etc.).

For browser apps, this skill sets up the server half. The client half (Activity class,
time tracking) is handled by `timeback-client`.

## Prerequisites

- `timeback-init` must be completed:
  - Environment variables configured (`.env` has `TIMEBACK_CLIENT_ID`, `TIMEBACK_CLIENT_SECRET`, `TIMEBACK_ENV`)
  - `timeback.config.json` exists with provisioned course IDs
  - `timeback-integration.md` exists with project details filled in

## Resume

Read `timeback-integration.md` at the project root.

- If `timeback-server` is already marked complete, verify the SDK is installed and
  the server module exists. If so, skip to the end.
- If partial progress is documented (e.g., auth discovered but not wired), resume
  from the relevant step.
- If only `timeback-init` is complete, start at Step 1.

---

## Step 1: Install Packages

Read the **Language** and **Framework** from `timeback-integration.md` and install
the correct package.

### TypeScript

Always install `@timeback/sdk` — it includes `@timeback/core` as a dependency:

```bash
bun add @timeback/sdk    # or npm install / pnpm add / yarn add
```

### Python (FastAPI)

```bash
uv add "timeback-sdk[fastapi]"    # or pip install
```

### Python (Django)

```bash
uv add "timeback-sdk[django]"    # or pip install
```

### Python (Flask / other)

Install the standalone client for manual Caliper event tracking:

```bash
uv add timeback-core    # or pip install
```

---

## Step 2: Discover the Auth System

Search the codebase for how the app authenticates users. The goal is to answer one
question: **In a server-side request handler, how do you get the current user's email?**

Look for:

- **Auth providers** — Clerk, Auth0, NextAuth/Auth.js, Firebase Auth, Supabase Auth,
  Cognito, Passport.js, Django auth, Flask-Login, FastAPI dependencies, Authlib, etc.
- **Session/JWT** — session middleware, JWT verification, token decoding
- **User model** — where the user's email is stored and accessible in request handlers

### Common patterns by stack

| Stack | How to get email |
|-------|-----------------|
| Next.js + Clerk | `const { emailAddresses } = await currentUser()` → `emailAddresses[0].emailAddress` |
| Next.js + NextAuth | `const session = await getServerSession(); session.user.email` |
| Next.js + Auth.js v5 | `const session = await auth(); session.user.email` |
| Next.js + Supabase | `const { data: { user } } = await supabase.auth.getUser(); user.email` |
| Express + Passport | `req.user.email` |
| Express + JWT | `const decoded = jwt.verify(token, secret); decoded.email` |
| Fastify + @fastify/session | `request.session.user.email` |
| Electron + local auth | Check IPC handlers or local user store |
| FastAPI + custom JWT | `request.state.user.email` or dependency injection |
| FastAPI + OAuth2 | Dependency that returns decoded token |
| Django | `request.user.email` |
| Django REST Framework | `request.user.email` |
| Flask + Flask-Login | `current_user.email` |
| Flask + Flask-JWT | `get_jwt_identity()` → look up user |

If you can't determine how to get the email, ask the developer.

---

## Step 3: Create the Server SDK Instance

Create the SDK module based on the project's language and framework. Place it where
the project keeps shared utilities (e.g., `src/lib/timeback.ts`, `app/timeback_server.py`).

### TypeScript

`createTimeback()` is **async** — it must be awaited. The config uses `api:` (not `auth:`):

```typescript
import { createTimeback } from '@timeback/sdk';

export const timeback = await createTimeback({
  env: process.env.TIMEBACK_ENV as 'staging' | 'production',
  api: {
    clientId: process.env.TIMEBACK_CLIENT_ID!,
    clientSecret: process.env.TIMEBACK_CLIENT_SECRET!,
  },
  identity: {
    mode: 'custom',
    getEmail: async (req: Request) => {
      // Replace with the actual auth lookup from Step 2
      throw new Error('Wire up your auth here');
    },
  },
});
```

**Notes:**

- `env` accepts `'local'`, `'staging'`, `'production'`, or any string. Use `'local'`
  during development — it maps to `staging` for API calls but enables local-specific behavior.
- The env var names (`TIMEBACK_CLIENT_ID`, etc.) are a convention — `createTimeback()`
  does not auto-read them. Some official examples use `TIMEBACK_API_CLIENT_ID` instead.
  Either works as long as `.env` and the code match.
- For frameworks that don't auto-load `.env` (Express, Fastify, plain Node), install
  `dotenv` and add `import 'dotenv/config'` at the app entry point.
- For top-level `await`, the project must use ESM (`"type": "module"` in `package.json`)
  or wrap in an async bootstrap function.

**For Timeback SSO** (users sign in via Timeback instead of the app's own auth):

```typescript
import { createTimeback } from '@timeback/sdk';

export const timeback = await createTimeback({
  env: process.env.TIMEBACK_ENV as 'staging' | 'production',
  api: {
    clientId: process.env.TIMEBACK_CLIENT_ID!,
    clientSecret: process.env.TIMEBACK_CLIENT_SECRET!,
  },
  identity: {
    mode: 'sso',
    clientId: process.env.TIMEBACK_SSO_CLIENT_ID!,
    clientSecret: process.env.TIMEBACK_SSO_CLIENT_SECRET!,
    redirectUri: '/api/auth/sso/callback/timeback',
    buildState: ({ url }) => {
      // Return state to persist across the SSO redirect
      return { returnTo: url.searchParams.get('returnTo') ?? '/dashboard' };
    },
    getUser: async (req) => {
      // Return the current session user, or undefined if not signed in
      return undefined;
    },
    onCallbackSuccess: async (ctx) => {
      // Save user to session, then redirect — must return a Response
      return ctx.redirect(ctx.state?.returnTo ?? '/dashboard');
    },
    onCallbackError: async (ctx) => {
      // Handle error — must return a Response
      return ctx.redirect('/auth/error');
    },
  },
});
```

SSO auto-registers identity routes: `/identity/signin`, `/identity/callback`, `/identity/signout`.

**SSO callback context** — `onCallbackSuccess` and `onCallbackError` both receive a
context object and must return a `Response`. The success context provides:

- `ctx.user` — authenticated user (`{ id, email, name, school, grade }`)
- `ctx.state` — state from `buildState` (if provided)
- `ctx.req` — the incoming callback request
- `ctx.redirect(url, headers?)` — helper to create a redirect response
- `ctx.json(data, status?, headers?)` — helper to create a JSON response

### Python (FastAPI)

```python
import os
from fastapi import FastAPI, Request
from timeback import ApiCredentials, CustomIdentityConfig, TimebackConfig
from timeback.server.adapters.fastapi import TimebackFastAPI

async def get_email(request: Request) -> str:
    # Replace with the actual auth lookup from Step 2
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

**For Timeback SSO** (users sign in via Timeback instead of the app's own auth):

```python
import os
from fastapi import FastAPI, Request
from timeback import ApiCredentials, SsoIdentityConfig, TimebackConfig, TimebackIdentity
from timeback.server.adapters.fastapi import TimebackFastAPI

async def get_session_user(request: Request):
    session = request.session.get("timeback_user")
    if not session:
        return None
    return TimebackIdentity(
        id=session["id"],
        email=session["email"],
        name=session.get("name"),
    )

async def handle_sso_success(ctx):
    ctx.request.session["timeback_user"] = {
        "id": ctx.user.id,
        "email": ctx.user.email,
        "name": ctx.user.name,
    }

timeback = TimebackFastAPI(TimebackConfig(
    env=os.environ.get("TIMEBACK_ENV", "staging"),
    api=ApiCredentials(
        client_id=os.environ["TIMEBACK_CLIENT_ID"],
        client_secret=os.environ["TIMEBACK_CLIENT_SECRET"],
    ),
    identity=SsoIdentityConfig(
        mode="sso",
        client_id=os.environ["TIMEBACK_SSO_CLIENT_ID"],
        client_secret=os.environ["TIMEBACK_SSO_CLIENT_SECRET"],
        get_user=get_session_user,
        on_callback_success=handle_sso_success,
    ),
))
```

SSO auto-registers identity routes: `/identity/signin`, `/identity/callback`, `/identity/signout`.

### Python (Django)

```python
import os
from timeback import ApiCredentials, CustomIdentityConfig, TimebackConfig
from timeback.server.adapters.django import TimebackDjango

async def get_email(request) -> str:
    return request.user.email

timeback = TimebackDjango(TimebackConfig(
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

### Python (Flask / other — standalone client)

For frameworks without a built-in adapter, use `timeback-core` directly:

```python
import os
from timeback_core import TimebackClient

timeback = TimebackClient(
    env=os.environ["TIMEBACK_ENV"],
    client_id=os.environ["TIMEBACK_CLIENT_ID"],
    client_secret=os.environ["TIMEBACK_CLIENT_SECRET"],
)
```

Add `python-dotenv` and call `load_dotenv()` at the app entry point if the framework
doesn't load `.env` automatically.

---

## Step 4: Mount the Framework Adapter

### TypeScript

Each framework has a dedicated adapter:

| Framework | Import | Pattern |
|---|---|---|
| Next.js | `@timeback/sdk/nextjs` | Route handler exports |
| Express | `@timeback/sdk/express` | Middleware mount |
| SvelteKit | `@timeback/sdk/svelte-kit` | `hooks.server.ts` handler |
| SolidStart | `@timeback/sdk/solid-start` | Middleware |
| TanStack Start | `@timeback/sdk/tanstack-start` | Handler |
| Nuxt | `@timeback/sdk/nuxt` | Server middleware |
| Bun / Deno / Workers | `@timeback/sdk/native` | Native handler |

**Next.js (App Router)** — create `app/api/timeback/[...timeback]/route.ts`:

```typescript
import { toNextjsHandler } from '@timeback/sdk/nextjs';
import { timeback } from '@/lib/timeback';

export const { GET, POST } = toNextjsHandler(timeback);
```

**Next.js SSO callback** — if using SSO identity mode, create the OAuth callback
route at the path matching your `redirectUri`. For example, if `redirectUri` is
`'/api/auth/sso/callback/timeback'`, create `app/api/auth/sso/callback/timeback/route.ts`:

```typescript
import { timeback } from '@/lib/timeback';

export async function GET(req: Request) {
  return await timeback.handle.identity.callback(req);
}
```

This explicit callback route is needed for Next.js and TanStack Start (shown in their
adapter examples below). SvelteKit, SolidStart, and Nuxt handle the callback
automatically via the `callbackPath` option in their middleware handlers.

**Express** — mount as middleware:

```typescript
import { toExpressMiddleware } from '@timeback/sdk/express';
import { timeback } from './lib/timeback';

app.use('/api/timeback', toExpressMiddleware(timeback));
```

**SvelteKit** — create `src/hooks.server.ts`:

```typescript
import { building } from '$app/environment';
import { timeback } from '$lib/timeback';
import { svelteKitHandler } from '@timeback/sdk/svelte-kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = ({ event, resolve }) => {
  return svelteKitHandler({
    timeback,
    event,
    resolve,
    building,
    callbackPath: '/api/auth/sso/callback/timeback',
  });
};
```

**SolidStart** — create `src/middleware.ts`:

```typescript
import { createMiddleware } from '@solidjs/start/middleware';
import { timeback } from '~/lib/timeback';
import { solidStartHandler } from '@timeback/sdk/solid-start';

export default createMiddleware({
  onRequest: [
    async event => {
      const response = await solidStartHandler({
        timeback,
        event,
        callbackPath: '/api/auth/sso/callback/timeback',
      });
      if (response) return response;
    },
  ],
});
```

**TanStack Start** — create `src/routes/api/timeback/$.ts` (catch-all route):

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { toTanStackStartHandler } from '@timeback/sdk/tanstack-start';
import { timeback } from '@/lib/timeback';

const handlers = toTanStackStartHandler(timeback);

export const Route = createFileRoute('/api/timeback/$')({
  server: { handlers },
});
```

For SSO callback, create a separate route at `src/routes/api/auth/sso/callback/timeback.ts`:

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router';
import { timeback } from '@/lib/timeback';

export const Route = createFileRoute('/api/auth/sso/callback/timeback')({
  server: {
    handlers: {
      GET: async ({ request }) => timeback.handle.identity.callback(request),
    },
  },
});
```

**Nuxt** — create `server/middleware/timeback.ts`:

```typescript
import { nuxtHandler } from '@timeback/sdk/nuxt';
import { timeback } from '../lib/timeback';

export default defineEventHandler(async event => {
  const response = await nuxtHandler({
    timeback,
    event,
    callbackPath: '/api/auth/sso/callback/timeback',
  });
  if (response) return response;
});
```

**Bun / Deno / Workers** — use the native adapter:

```typescript
import { toNativeHandler } from '@timeback/sdk/native';
import { timeback } from './lib/timeback';

const handler = toNativeHandler(timeback);
```

### Edge runtimes — `createTimebackIdentity()`

`createTimeback()` requires a full Node.js or Bun runtime. For edge runtimes
(Vercel Edge, Cloudflare Workers, Deno Deploy), use `createTimebackIdentity()`
instead — it handles identity/SSO without the full server SDK:

```typescript
import { createTimebackIdentity } from '@timeback/sdk/identity';

export const timebackIdentity = createTimebackIdentity({
  env: process.env.TIMEBACK_ENV as 'staging' | 'production',
  identity: {
    mode: 'sso',
    clientId: process.env.TIMEBACK_SSO_CLIENT_ID!,
    clientSecret: process.env.TIMEBACK_SSO_CLIENT_SECRET!,
    redirectUri: '/api/auth/sso/callback/timeback',
    getUser: async (req) => undefined,
    onCallbackSuccess: async (ctx) => ctx.redirect('/dashboard'),
    onCallbackError: async (ctx) => ctx.redirect('/auth/error'),
  },
});
```

Note: `createTimebackIdentity()` takes only `env` and `identity` — no `api` credentials.
It handles SSO identity flows without the full API client.

This is a subset of the full SDK — it handles identity routes but does not
provide `activity.record()` or `user.verify()`. Use it when deploying to edge
and pair with a separate Node.js endpoint for activity tracking if needed.

### Python (FastAPI)

```python
app = FastAPI()
app.include_router(timeback.router, prefix="/api/timeback")
```

### Python (Django)

In `urls.py`:

```python
from app.timeback_server import timeback

urlpatterns = [
    path("api/timeback/", include(timeback.urlpatterns)),
]
```

### Python (Flask / other)

No adapter to mount. Activity tracking uses manual Caliper calls (see Step 5).

---

## Step 5: Server-Only Activity Tracking

> **Browser apps**: skip this step. Activity tracking is handled by the `timeback-client`
> skill using the client-side Activity class. The adapter mounted in Step 4 serves the
> HTTP routes the client SDK communicates with.

For server-only apps (API backends, batch processors, mobile backends), use
`activity.record()` to report completions at your endpoints.

### TypeScript — `activity.record()`

```typescript
await timeback.activity.record({
  user: {
    email: userEmail,
    timebackId: timebackUserId,       // optional — correlates with known Timeback user
  },
  activity: {
    id: activityId,
    name: 'Quiz: Fractions',
    course: { subject: 'Math', grade: 3 },   // or { code: 'CS-101' }
  },
  metrics: {
    xpEarned: xpEarned, // use the app's scoring logic — see Activity Map
    totalQuestions: score.total,               // optional — pair with correctQuestions
    correctQuestions: score.correct,            // optional — pair with totalQuestions
    masteredUnits: masteredCount,               // optional
    pctComplete: progressPct,                   // optional
  },
  time: {                                       // optional — omit if no time data
    startedAt: startTime,                       // Date | string — optional
    endedAt: endTime,                           // Date | string — optional
    activeMs: activeDuration,                   // number — optional
    inactiveMs: idleDuration,                   // number — optional
  },
  runId: correlationId,                         // optional — links to client-side session
});
```

**Behavior:**

- `metrics` is required — `xpEarned` triggers the `ActivityCompletedEvent`
- When `time` is also provided, sends a `TimeSpentEvent` alongside the completion
- `totalQuestions` and `correctQuestions` must be sent together or not at all
- `metrics` is required — `xpEarned` must always be provided

### Python (FastAPI / Django with adapter) — `activity.record()`

```python
await timeback.activity.record({
    "user": {
        "email": user.email,
        "timeback_id": timeback_user_id,    # optional
    },
    "activity": {
        "id": str(quiz.id),
        "name": quiz.title,
        "course": {"subject": "Math", "grade": 3},
    },
    "metrics": {
        "xp_earned": xp_earned, # use the app's scoring logic — see Activity Map
        "total_questions": score.total,
        "correct_questions": score.correct,
        "pct_complete": progress_pct,
    },
    "time": {
        "started_at": started_at,           # optional
        "ended_at": ended_at,               # optional
        "active_ms": duration_ms,           # optional
        "inactive_ms": idle_ms,             # optional
    },
    "run_id": correlation_id,               # optional
})
```

### Python (Flask / other — manual Caliper)

Create a tracking module (e.g., `app/timeback_activity.py`):

```python
import json
from pathlib import Path
from app.timeback_client import timeback
from timeback_caliper.types import (
    ActivityCompletedInput,
    TimebackActivityContext,
    TimebackActivityMetric,
    TimebackApp,
    TimebackUser,
    TimeSpentInput,
    TimeSpentMetric,
)

_config = None

def _load_config():
    global _config
    if _config is None:
        config_path = Path(__file__).resolve().parents[1] / "timeback.config.json"
        with open(config_path) as f:
            _config = json.load(f)
    return _config

async def track_activity(
    user_email: str,
    activity_id: str,
    activity_name: str,
    subject: str,
    grade: int | None = None,
    metrics: dict | None = None,
    active_seconds: int | None = None,
    pct_complete: int | None = None,
):
    cfg = _load_config()
    sensor_id = cfg["sensor"]
    app_name = cfg["name"]

    actor = TimebackUser(
        id=f"{sensor_id}/users/{user_email}",
        type="TimebackUser",
        email=user_email,
    )
    activity_object = TimebackActivityContext(
        id=f"{sensor_id}/activities/{activity_id}",
        type="TimebackActivityContext",
        subject=subject,
        app=TimebackApp(name=app_name),
        course={"name": f"{subject} Grade {grade}" if grade else subject},
        activity={"name": activity_name},
    )

    if metrics:
        await timeback.caliper.events.send_activity(
            sensor_id,
            ActivityCompletedInput(
                actor=actor,
                object=activity_object,
                metrics=[
                    TimebackActivityMetric(type=k, value=v)
                    for k, v in metrics.items() if v is not None
                ],
            ),
        )

    if active_seconds and active_seconds > 0:
        await timeback.caliper.events.send_time_spent(
            sensor_id,
            TimeSpentInput(
                actor=actor,
                object=activity_object,
                metrics=[TimeSpentMetric(type="active", value=min(active_seconds, 86400))],
            ),
        )
```

For sync views (Django without ASGI or Flask), wrap with `async_to_sync(track_activity)(...)`
or `asyncio.run(track_activity(...))`.

### User resolution (standalone client only)

For Flask / other frameworks using `timeback-core`, create a user resolution utility
(e.g., `app/timeback_users.py`):

```python
from app.timeback_client import timeback

_user_cache: dict[str, dict] = {}

async def resolve_timeback_user(email: str) -> dict:
    cached = _user_cache.get(email)
    if cached:
        return cached

    users = await timeback.oneroster.users.list_all(where={"email": email}, limit=2)
    if len(users) == 0:
        raise ValueError(f"No Timeback user found for {email}")
    if len(users) > 1:
        raise ValueError(f"Multiple Timeback users found for {email}")

    _user_cache[email] = users[0]
    return users[0]
```

---

## Step 6: Verify

### Verify auth credentials

```bash
npx timeback api oneroster users list --limit 1 --env staging
```

If this returns a user record, credentials are valid.

### Verify adapter (FastAPI / Django)

```bash
curl http://localhost:PORT/api/timeback/user/verify
```

---

## Step 7: Update Integration File

Update `timeback-integration.md`:

1. Mark `timeback-server` as complete in the Status section:
   ```
   - [x] timeback-server
   ```

2. Fill in the **Auth** section:
   ```markdown
   ## Auth
   - **Provider**: [discovered provider, e.g., Clerk, NextAuth, Django auth]
   - **Email accessor**: [code to get email, e.g., `currentUser().emailAddresses[0].emailAddress`]
   - **Identity mode**: [custom or sso]
   ```

---

## Error Recovery

| Error | Cause | Fix |
|-------|-------|-----|
| Module not found | Package not installed | Re-run the install command from Step 1 |
| Auth error (401) | SDK credentials invalid | Verify `TIMEBACK_CLIENT_ID` and `TIMEBACK_CLIENT_SECRET` in `.env` |
| User not found | Email doesn't exist in Timeback | Confirm the email is provisioned. Try switching `TIMEBACK_ENV`. |
| Multiple users found | Ambiguous email | Check for duplicate users in OneRoster. Contact Timeback support. |
| `get_email` / `getEmail` returns undefined | App auth not wired correctly | Check that auth middleware runs before Timeback routes |
| SSO callback fails | SSO credentials wrong | Verify `TIMEBACK_SSO_CLIENT_ID` and `TIMEBACK_SSO_CLIENT_SECRET` |
| `createTimeback() requires Node.js or Bun` | Called on edge runtime | Use `createTimebackIdentity()` for edge |
| `activity.record()` validation error | Missing required fields | Check user email, activity fields, and `xpEarned` in metrics |
| `SynchronousOnlyOperation` (Django) | Async call in sync view | Use `async_to_sync()` wrapper |

## Constraints

- **Never hardcode credentials** — always use environment variables
- **Never expose the server SDK in browser code** — Timeback server modules are server-side only
- **`createTimeback()` is async** — always `await` the result
- **SDK uses `api:` config** — not `auth:` (that's the `@timeback/core` interface)
- **`metrics` is required** — `xpEarned` must always be provided in `activity.record()`
- **`totalQuestions` and `correctQuestions` are paired** — send both or neither
- **Subjects must be valid** — `Math`, `Reading`, `Science`, `Social Studies`, `Writing`, `Language`, `Vocabulary`, `FastMath`, `Other`, `None`
- **Max time per metric**: 86400 seconds (24 hours) for Caliper events
- **Python 3.12+** required for Python SDK
