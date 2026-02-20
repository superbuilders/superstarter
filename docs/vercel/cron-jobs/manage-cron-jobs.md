---
title: Managing Cron Jobs
product: vercel
url: /docs/cron-jobs/manage-cron-jobs
type: reference
prerequisites:
  - /docs/cron-jobs
related:
  - /docs/cron-jobs
  - /docs/cron-jobs/usage-and-pricing
  - /docs/functions
  - /docs/functions/runtimes
  - /docs/runtime-logs
summary: Learn how to manage Cron Jobs effectively in Vercel. Explore cron job duration, error handling, deployments, concurrency control, local execution,...
---

# Managing Cron Jobs

> **🔒 Permissions Required**: Cron Jobs

## Viewing cron jobs

To view your active cron jobs:

1. Select your project from the Vercel dashboard
2. Select the **Settings** tab
3. Select the **Cron Jobs** tab from the left sidebar

## Cron jobs maintenance

- **Updating Cron Jobs**: Change the [expression](/docs/cron-jobs#cron-expressions) in `vercel.json` file or the function's configuration, and then redeploy
- **Deleting Cron Jobs**: Remove the configuration from the `vercel.json` file or the function's configuration, and then redeploy
- **Disabling Cron Jobs**: Navigate to the **Cron Jobs** tab and then click the **Disable Cron Jobs** button

> **⚠️ Warning:** Disabled cron jobs will still be listed and will count towards your [cron jobs
> limits](/docs/cron-jobs/usage-and-pricing)

## Securing cron jobs

It is possible to secure your cron job invocations by adding an environment variable called `CRON_SECRET` to your Vercel project. We recommend using a random string of at least 16 characters for the value of `CRON_SECRET`. A password generator, like [1Password](https://1password.com/password-generator/), can be used to create one.

The value of the variable will be automatically sent as an `Authorization` header when Vercel invokes your cron job. Your endpoint can then compare both values, the authorization header and the environment variable, to verify the authenticity of the request.

> **💡 Note:** You can use App Router [Route
> Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
> to secure your cron jobs, even when using the Pages Router.

```ts filename="app/api/cron/route.ts" framework=nextjs
import type { NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  return Response.json({ success: true });
}
```

```js filename="app/api/cron/route.js" framework=nextjs
export function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  return Response.json({ success: true });
}
```

```ts filename="app/api/cron/route.ts" framework=nextjs-app
import type { NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  return Response.json({ success: true });
}
```

```js filename="app/api/cron/route.js" framework=nextjs-app
export function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  return Response.json({ success: true });
}
```

```ts filename="api/cron/route.ts" framework=other
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const authHeader = request.headers.get('authorization');
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return response.status(401).json({ success: false });
  }

  response.status(200).json({ success: true });
}
```

```js filename="api/cron/route.js" framework=other
export default function handler(request) {
  const authHeader = request.headers.get('authorization');
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return response.status(401).json({ success: false });
  }

  response.status(200).json({ success: true });
}
```

The `authorization` header will have the `Bearer` prefix for the value.

> For \['nextjs-app', 'nextjs']:

For those using TypeScript versions below 5.2, it's important to adapt the code to `import NextResponse from 'next/server'` and use `NextResponse.json` for the response. This ensures compatibility with earlier TypeScript versions in Next.js applications. In TypeScript 5.2 and above, the standard `new Response` pattern should be used.

## Cron job duration

The duration limits for Cron jobs are identical to those of [Vercel Functions](/docs/functions#limits). See the [`maxDuration`](/docs/functions/runtimes#max-duration) documentation for more information.

In most cases, these limits are sufficient. However, if you need more processing time, it's recommended to split your cron jobs into different units or distribute your workload by combining cron jobs with regular HTTP requests with your API.

## Cron job error handling

Vercel will not retry an invocation if a cron job fails. You can check for error [logs](/docs/runtime-logs) through the **View Log** button in the **Cron Jobs** tab.

## Cron jobs with dynamic routes

Cron jobs can be created for [dynamic routes](https://nextjs.org/docs/routing/dynamic-routes):

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/sync-slack-team/T0CAQ10TZ",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/sync-slack-team/T4BOE34OP",
      "schedule": "0 5 * * *"
    }
  ]
}
```

## Handling nonexistent paths

If you create a cron job for a path that doesn't exist, it generates a [404 error](/docs/errors/platform-error-codes#404:-not_found). However, **Vercel still executes your cron job**. You can analyze your logs to check if there are any issues.

## Cron jobs and deployments

Creating a new deployment will not interrupt your running cron jobs; they will continue until they finish.

## Controlling cron job concurrency

If your cron job runs longer than the interval between invocations, Vercel can trigger a second instance while the first is still running. This can lead to race conditions, duplicate processing, or data corruption.

To prevent concurrent runs, use a lock mechanism like [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) in your cron job. A lock ensures only one instance runs at a time by checking if another instance is already active before starting.

You can also prevent overlapping runs by:

- **Reducing execution time**: Optimize your job to finish before the next invocation
- **Setting timeouts**: Use [`maxDuration`](/docs/functions/runtimes#max-duration) to force long-running jobs to stop
- **Increasing the interval**: Run your cron job less frequently

### Cron jobs and idempotency

Vercel's event-driven system can occasionally deliver the same cron event more than once. This means your job might run twice for a single scheduled execution.

Design your operations to be **idempotent** so they produce the same result even when executed multiple times. For example:

- **Good**: "Set user status to active" (running twice has the same effect)
- **Bad**: "Increment user credit by 10" (running twice doubles the credit)

To make operations idempotent:

- Use unique IDs to track which events you've already processed
- Check state before making changes (e.g., "if not already active, then activate")
- Store results with timestamps or version numbers

Use both locks (to prevent concurrent runs) and idempotency (to handle duplicate events safely) together for the most reliable cron jobs

## Running cron jobs locally

Cron jobs are API routes. You can run them locally by making a request to their endpoint. For example, if your cron job is in `/api/cron`, you could visit the following endpoint in your browser: `http://localhost:3000/api/cron`. You should be aware that while your browser may follow redirects, [cron job invocations in production will not](#cron-jobs-and-redirects) follow redirects.

There is currently no support for `vercel dev`, `next dev`, or other framework-native local development servers.

## Cron jobs and redirects

Cron jobs do not follow redirects. When a cron-triggered endpoint returns a 3xx redirect status code, the job completes without further requests. Redirect responses are treated as final for each invocation.

The view logs button on the cron job overview can be used to verify the response of the invocations and gain further insights.

## Cron jobs logs

Cron jobs are logged as function invocations from the **Logs** tab of your projects [dashboard](/dashboard). You can view the logs for a cron job from the list on the [Cron jobs settings page](/docs/cron-jobs/manage-cron-jobs#viewing-cron-jobs) of the project:

1. From the list of cron jobs, select **View Logs**.
2. This will take you to the [runtime logs](/docs/runtime-logs#request-path) view with a `requestPath` filter to your cron job such as `requestPath:/api/my-cron-job`.

See [how to view runtime logs](/docs/runtime-logs#view-runtime-logs) for more information.

Note that when cron jobs respond with a redirect or a cached response, they will not be shown in the logs.

## Cron jobs accuracy

Hobby users have two cron job restrictions. First, cron jobs can only run [once per day](/docs/cron-jobs/usage-and-pricing#hobby-scheduling-limits). Expressions that run more frequently will fail deployment. Second, Vercel may invoke these cron jobs at any point within the specified hour to help distribute load across all accounts. For example, an expression like `0 8 * * *` could trigger an invocation anytime between `08:00:00` and `08:59:59`.

For all other teams, cron jobs will be invoked within the minute specified. For instance, the expression `5 8 * * *` would trigger an invocation between `08:05:00` and `08:05:59`.

## Rollbacks with cron jobs

If you [Instant Rollback](/docs/instant-rollback) to a previous deployment, active cron jobs **will not** be updated. They will continue to run as scheduled until they are manually disabled or updated.


---

[View full sitemap](/docs/sitemap)
