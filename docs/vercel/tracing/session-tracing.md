---
title: Session tracing
product: vercel
url: /docs/tracing/session-tracing
type: how-to
prerequisites:
  - /docs/tracing
related:
  - /docs/vercel-toolbar/in-production-and-localhost
  - /docs/runtime-logs
  - /docs/functions/runtimes/edge
  - /docs/vercel-toolbar
  - /docs/observability
summary: Learn how to trace your sessions to understand performance and infrastructure details.
---

# Session tracing

With session tracing, you can use the Vercel toolbar to trace **your** sessions and view the corresponding spans in the logs dashboard. This is useful for debugging and monitoring performance, and identifying bottlenecks.

A session trace is initiated through the Vercel toolbar, either through a [Page Trace](/docs/tracing/session-tracing#run-a-page-trace) or a [Session Trace](/docs/tracing/session-tracing#run-a-session-trace). It is active for the person who initiated the trace on their browser indefinitely, until it is stopped or cookies are cleared.

## Prerequisites

- A Vercel account. If you don't have one, you can [sign up for free](https://vercel.com/signup).
- A Vercel project that is deployed to preview or production. You cannot create and run a session trace for a local deployment.
- [The toolbar enabled](/docs/vercel-toolbar/in-production-and-localhost) in your preview or production environment.

## Run a session trace

1. In the Vercel toolbar on your deployment, click (or search for) **Tracing**.
2. Select **Start Tracing Session**. Once enabled, the page will reload to activate the session trace.
3. From the toolbar, you can then using the **Tracing** icon to select any of the following options:
   - **View Page Trace**: View the trace for the current page. Selecting this option will open the trace for the current page in a new tab. This is the same as [running a page trace](/docs/tracing/session-tracing#run-a-page-trace).
   - **View Session Traces**: View all traced requests from your active session. Selecting this option will open the dashboard to the **Logs** tab, filtered to the session ID, and the tracing filter applied.
   - **Stop Tracing Session**: Stop tracing the current session.
   - **Restart Tracing Session**: Restart tracing the current session.

![Image](https://vercel.com/front/docs/observability/session-trace-options-light.png)

## Run a page trace

To run a trace on a specific page, you can run a **Page Trace**:

1. In your deployment, open the Vercel toolbar and scroll down to **Tracing**.
2. Select **Run Page Trace**.
3. The page will reload, and a toast will indicate the status of the trace. Once the trace has propagated, the toast will indicate that the trace is complete and ready to view.
4. Click the toast to view the trace in a new browser tab under the **Logs** tab of the dashboard.

## View previous session traces

1. In the Vercel toolbar on your deployment, click (or search for) **Tracing**.
2. Select **View Previous Session Traces**.
3. The dashboard will open to the **Logs** tab, filtered to the session ID, and the tracing filter applied - indicated by the Traces icon  in the filter bar.

You can filter traces using [all the same filters available](/docs/runtime-logs#log-filters) in the **Logs** tab of the dashboard. To view traces for requests to your browser, press the user icon next to the Traces icon.

![Image](https://vercel.com/front/docs/observability/previous-session-traces-light.png?lightbox)

## Usage and pricing

Tracing is available on all plans with a limit up to **1 million spans per month, per team**.

| Plan       | Monthly span limit per team |
| ---------- | --------------------------- |
| Hobby      | 1 million                   |
| Pro        | 1 million                   |
| Enterprise | 1 million                   |

## Limitations

Custom spans from functions using the [Edge runtime](/docs/functions/runtimes/edge) are not supported.

## More resources

- [Learn about the Vercel toolbar](/docs/vercel-toolbar)
- [Explore Observability on Vercel](/docs/observability)


---

[View full sitemap](/docs/sitemap)
