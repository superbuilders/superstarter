---
title: Vercel Function Logs
product: vercel
url: /docs/functions/logs
type: reference
prerequisites:
  - /docs/functions
related:
  - /docs/drains
  - /docs/runtime-logs
  - /docs/functions/streaming-functions
  - /docs/incremental-static-regeneration
  - /docs/cdn-cache
summary: Use runtime logs to debug and monitor your Vercel Functions.
---

# Vercel Function Logs

Vercel Functions allow you to debug and monitor your functions using runtime logs. Users on the Pro and Enterprise plans can use Vercel's support for [Log Drains](/docs/drains) to collect and analyze your logs using third-party providers. Functions have full support for the [`console`](https://developer.mozilla.org/docs/Web/API/Console) API, including `time`, `debug`, `timeEnd`, and more.

## Runtime Logs

You can view [runtime logs](/docs/runtime-logs#what-are-runtime-logs) for all Vercel Functions in real-time from [the **Logs** tab](/docs/runtime-logs#view-runtime-logs) of your project's dashboard. You can use the various filters and options to find specific log information. These logs are held for an [amount of time based on your plan](/docs/runtime-logs#limits).

When your function is [streaming](/docs/functions/streaming-functions), you'll get the following:

- You can [view the logs](/docs/runtime-logs#view-runtime-logs) in real-time from the **Logs** tab of your project's dashboard.
- Each action of writing to standard output, such as using `console.log`, results in a separate log entry.
- Each of the logs are 256 KB **per line**.
- The path in streaming logs will be prefixed with a forward slash (`/`).

For more information, see [Runtime Logs](/docs/runtime-logs).

> **💡 Note:** These changes in the frequency and format of logs will affect Log Drains. If
> you are using Log Drains we recommend ensuring that your ingestion can handle
> both the new format and frequency.

### Number of logs per request

When a Function on a specific path receives a user request, you *may* see more than one log when the application renders or regenerates the page.

This can occur in the following situations:

1. When a new page is rendered
2. When you are using [Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration)

In the case of ISR, multiple logs are the result of:

- A [stale](/docs/cdn-cache#cache-invalidation) page having to be regenerated. For stale pages, both HTML (for direct browser navigation) and JSON (for Single Page App (SPA) transitions) are rendered simultaneously to maintain consistency
- On-demand ISR happening with `fallback` set as [`blocking`](/docs/incremental-static-regeneration/quickstart). During on-demand ISR, the page synchronously renders (e.g., HTML) upon request, followed by a background revalidation of both HTML and JSON versions

### Next.js logs

In Next.js projects, logged functions include API Routes (those defined in  or ).

Pages that use SSR, such as those that call `getServerSideProps` or export [`revalidate`](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration), will also be available both in the filter dropdown and the real time logs.


---

[View full sitemap](/docs/sitemap)
