---
title: Debug Slow Functions
product: vercel
url: /docs/functions/debug-slow-functions
type: conceptual
prerequisites:
  - /docs/functions
related:
  - /docs/functions/configuring-functions
  - /docs/cli/logs
  - /docs/cli/httpstat
  - /docs/cli/inspect
  - /docs/observability
summary: Learn about debug slow functions on Vercel.
---

# Debugging Slow Vercel Functions

Use this guide to diagnose and fix slow Vercel Functions. You'll identify which functions are slow, measure where the time is spent, and verify that your optimization works before shipping to production.

> **💡 Note:** This guide requires a linked Vercel project. Run `vercel link` in your
> project directory if you haven't already.

## Quick reference

Use this block when you already know what you're doing and want the full command sequence. Use the steps below for context and checks.

```bash filename="terminal"
# 1. Identify slow functions from production logs
vercel logs --environment production --source serverless --since 1h --json \
  | jq 'select(.statusCode != null) | {path: .path, statusCode: .statusCode}'

# 2. Measure endpoint timing (server processing = time in your function)
vercel httpstat /api/slow-endpoint

# 3. Check function configuration (memory, region, max duration)
vercel inspect <deployment-url>

# IF server processing time is high, check external API latency:
vercel logs --environment production --query "timeout" --since 1h --expand
vercel logs --environment production --query "ECONNREFUSED" --since 1h --expand

# IF first request is slow but subsequent requests are fast, check cold starts:
vercel httpstat /api/slow-endpoint    # first request (potentially cold)
vercel httpstat /api/slow-endpoint    # second request (warm)
vercel httpstat /api/slow-endpoint    # third request (warm)

# 4. After optimizing, deploy a preview and measure
vercel deploy
vercel httpstat /api/slow-endpoint --deployment <preview-url>
vercel curl /api/slow-endpoint --deployment <preview-url>

# 5. Ship to production and monitor
vercel deploy --prod
vercel logs --environment production --source serverless --since 5m
```

## 1. Identify the slow functions

Start by checking your production logs for slow requests. Filter for your function routes and look for high latency:

```bash filename="terminal"
vercel logs --environment production --source serverless --since 1h --json \
  | jq 'select(.statusCode != null) | {path: .path, statusCode: .statusCode}'
```

To see the full log output with expanded messages:

```bash filename="terminal"
vercel logs --environment production --source serverless --since 1h --expand
```

The `--source serverless` filter limits results to Vercel Functions, excluding static assets and edge requests.

> **💡 Note:** For a visual breakdown of slow routes, check the **Vercel Functions** tab in
> [Observability](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability\&title=Open+Observability)
> on the Vercel Dashboard. Sort by duration to find your slowest routes.

## 2. Measure endpoint timing

Use `vercel httpstat` to get a detailed timing breakdown for a specific endpoint. This shows DNS lookup, TCP connection, TLS handshake, server processing, and content transfer times:

```bash filename="terminal"
vercel httpstat /api/slow-endpoint
```

The **server processing** time is the portion spent inside your function. If this is the largest number, the issue is in your function code or its dependencies (database queries, external API calls).

To test against a specific deployment:

```bash filename="terminal"
vercel httpstat /api/slow-endpoint --deployment <deployment-url>
```

## 3. Check function configuration

Inspect the current deployment to see what configuration your functions are running with:

```bash filename="terminal"
vercel inspect <deployment-url>
```

Key things to check:

- **Memory**: Functions with too little memory get CPU-throttled. If your function does heavy computation, increasing memory from the default 1024 MB can reduce execution time
- **Region**: If your function is far from your data source, every database query adds latency. Check that your function region matches your database region
- **Max duration**: If your function is hitting the maximum duration limit, it may be getting terminated before completing

See [configuring functions](/docs/functions/configuring-functions) for how to adjust these settings.

## 4. Check for external API latency

Slow functions are often caused by slow external API calls rather than slow function code. Check for timeout-related errors:

```bash filename="terminal"
vercel logs --environment production --query "timeout" --since 1h --expand
```

```bash filename="terminal"
vercel logs --environment production --query "ECONNREFUSED" --since 1h --expand
```

If you find timeout or connection errors, the issue is likely with an upstream dependency rather than your function itself.

> **💡 Note:** The **External APIs** tab in
> [Observability](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability\&title=Open+Observability)
> shows latency for all external API calls made by your functions. Sort by P75
> latency to find the slowest upstream services.

## 5. Check for cold starts

Cold starts happen when a new function instance needs to be initialized. Look for patterns where the first request after a period of inactivity is slow, but subsequent requests are fast.

Run multiple requests to the same endpoint and compare timing:

```bash filename="terminal"
vercel httpstat /api/slow-endpoint
vercel httpstat /api/slow-endpoint
vercel httpstat /api/slow-endpoint
```

If the first request is significantly slower than the following ones, cold starts are the issue. Common fixes include:

- Reducing the function bundle size by removing unused dependencies
- Moving expensive initialization outside the request handler
- Increasing the memory allocation (which also increases CPU)

## 6. Make the optimization

Based on what you found, apply the fix. Common optimizations for slow functions include:

- Adding caching for database queries or external API responses
- Moving the function region closer to the data source
- Increasing function memory to reduce CPU throttling
- Reducing bundle size to speed up cold starts
- Adding connection pooling for database connections
- Parallelizing independent async operations with `Promise.all`

## 7. Deploy a preview and measure

Deploy the optimized code as a preview:

```bash filename="terminal"
vercel deploy
```

Run the same timing analysis against the preview to compare before and after:

```bash filename="terminal"
vercel httpstat /api/slow-endpoint --deployment <preview-url>
```

Also verify that the function still returns correct responses:

```bash filename="terminal"
vercel curl /api/slow-endpoint --deployment <preview-url>
```

## 8. Ship to production

Once you've confirmed the improvement, deploy to production:

```bash filename="terminal"
vercel deploy --prod
```

Monitor the production logs after deploying to confirm the latency improvement holds under real traffic:

```bash filename="terminal"
vercel logs --environment production --source serverless --since 5m
```

## Related

- [vercel logs](/docs/cli/logs)
- [vercel httpstat](/docs/cli/httpstat)
- [vercel inspect](/docs/cli/inspect)
- [Configuring functions](/docs/functions/configuring-functions)
- [Observability](/docs/observability)
- [Debugging production 500 errors](/docs/observability/debug-production-errors)


---

[View full sitemap](/docs/sitemap)
