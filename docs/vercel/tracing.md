---
title: Tracing
product: vercel
url: /docs/tracing
type: how-to
prerequisites:
  []
related:
  - /docs/drains/reference/traces
  - /docs/tracing/session-tracing
  - /docs/tracing/instrumentation
  - /docs/runtime-logs
  - /docs/drains
summary: Learn how to trace your application to understand performance and infrastructure details.
---

# Tracing

In observability, tracing is the process of collecting and analyzing how a request or operation flows through your application and through Vercel's infrastructure. Traces are used to explain how your application works, debug errors, and identify performance bottlenecks.

You can think of a trace as the story of a single request:

**Request arrives at Vercel CDN -> Middleware executes -> Function handler processes request -> Database query runs -> Response returns to client**

Each step in this process is a **span**. A span is a single unit of work in a trace. Spans are used to measure the performance of each step in the request and include a name, a start time, an end time, and a duration.

## Automatic instrumentation

Vercel automatically instruments your application without needing any additional code changes. When you have set up [Trace Drains](/docs/drains/reference/traces) or enabled [Session Tracing](/docs/tracing/session-tracing) for your Vercel Functions, you'll be able to visualize traces for:

- **Vercel infrastructure**: You'll be able to view spans showing the lifecycle of each invocation of your Vercel Functions and how it moves through Vercel's infrastructure, including routing, middleware, caching, and other infrastructure details.
- **Outbound HTTP calls**: The HTTP requests made from your function will be displayed as fetch spans, displaying information on the length of time, location, and other attributes.

For additional tracing, such as framework spans, you can install the [@vercel/otel](/docs/tracing/instrumentation) package to use the OpenTelemetry SDK. In addition, you can [add custom spans](/docs/tracing/instrumentation#adding-custom-spans) to your traces to capture spans and gain more visibility into your application.

## Session tracing

To visualize traces in your dashboard, you need to enable session tracing using the Vercel toolbar. Session tracing captures infrastructure, framework, and fetch spans for requests made during **your** individual session, making them available in the logs dashboard for debugging and performance monitoring.

You can initiate a session trace in two ways:

- **Page Trace**: Trace a single page load to see how that specific request flows through your application.
- **Session Trace**: Start an ongoing trace that captures all requests from your browser until you stop it or clear cookies.

For detailed instructions on starting traces, managing active sessions, and viewing previous traces, see the [Session Tracing](/docs/tracing/session-tracing) documentation.

## Using OpenTelemetry

Vercel uses [OpenTelemetry](https://opentelemetry.io/), an open standard for collecting traces from your application. In order to capture framework and custom spans, install the `@vercel/otel` package. This package provides helper methods to make it easier to instrument your application with OpenTelemetry.

See the [Instrumentation](/docs/tracing/instrumentation) guide to set up OpenTelemetry for your project.

## Viewing traces in the dashboard

Once you have enabled session tracing, you can visualize traces in your dashboard:

1. Select your team from the scope selector and select your project.
2. Select the [**Logs** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Flogs\&title=Go+to+Logs).
3. Use the tracing icon  in the filter bar to filter to traces. You can filter traces using [all the same filters available](/docs/runtime-logs#log-filters) in the **Logs** tab of the dashboard. To view traces for requests to your browser, press the user icon next to the Traces icon.
4. Find the request you want to view traces for and click the **Trace** button at the bottom of the request details panel. This will open the traces for that request:

   ![Image](https://vercel.com/front/docs/observability/trace-panel-2-light.png?lightbox)

### Anatomy of a trace

When you view a trace in the dashboard, you see a timeline visualization of how a request flows through your application and Vercel's infrastructure. Each horizontal bar in the visualization is a **span**, which represents a single unit of work with a start time, end time, and duration.

When session tracing is enabled, your traces display the following types of spans:

| Span type                | Visual appearance                    | Description                                                                                                                                                                    |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Infrastructure spans** | Black and white with a triangle icon | Capture how requests move through Vercel's infrastructure, including routing, middleware, and caching.                                                                         |
| **Fetch spans**          | Green                                | Represent HTTP requests made from your functions.                                                                                                                              |
| **Framework spans**      | Blue                                 | Appear when you [instrument your application](/docs/tracing/instrumentation) with OpenTelemetry. Next.js 13.4+ automatically contributes spans for routes and rendering tasks. |
| **Custom spans**         | Blue                                 | [Custom instrumentation](/docs/tracing#adding-custom-spans) you can add to your application using OpenTelemetry.                                                               |

To view details of a span, click on the span in the trace. The sidebar will display the span's details. For infrastructure spans, a "what is this?" explanation will be provided.

To view trace spans in more detail, click and drag to zoom in on a specific area of the trace. You can also use the zoom controls in the bottom right corner of the trace.

## Exporting traces to a third party

You can export traces to a third party observability provider using [Vercel Drains](/docs/drains). This can be done either by sending traces to a custom HTTP endpoint, or by using a [native integration from the Vercel Marketplace](/marketplace/category/observability).

See the [Vercel Drains](/docs/drains) page to learn how to set up a Drain to export traces to a third party observability provider.

### Using custom OpenTelemetry setup with Sentry

If you want to trace your Vercel application using `@vercel/otel` while also using Sentry SDK v8+, you need to configure them to work together. The Sentry SDK [automatically sets up OpenTelemetry by default](https://docs.sentry.io/platforms/javascript/guides/nextjs/opentelemetry/), which can conflict with Vercel's OpenTelemetry setup and break trace propagation.

To use both together, configure Sentry to work with your custom OpenTelemetry setup by following the [Sentry custom setup documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/opentelemetry/custom-setup/).

> **💡 Note:** **Using Vercel OTel instead of Sentry:** If you prefer to use Vercel's
> OpenTelemetry setup instead of Sentry's OTel instrumentation, add
> `skipOpenTelemetrySetup: true` to your Sentry initialization in your
> `instrumentation.ts` file. This resolves conflicts between Vercel's OTel and
> Sentry v8+ that can prevent traces from reaching downstream providers.

## More resources

- [Using Vercel Drains](/docs/drains)
- [Trace Drains](/docs/drains/reference/traces)
- [Learn about the Vercel toolbar](/docs/vercel-toolbar)
- [Session Tracing](/docs/tracing/session-tracing)


---

[View full sitemap](/docs/sitemap)
