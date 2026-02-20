---
title: Observability Insights
product: vercel
url: /docs/observability/insights
type: reference
prerequisites:
  - /docs/observability
related:
  - /docs/functions
  - /docs/manage-cdn-usage
  - /docs/image-optimization
  - /docs/incremental-static-regeneration
  - /docs/storage/vercel-blob
summary: List of available data sources that you can view and monitor with Observability on Vercel.
---

# Observability Insights

Vercel organizes Observability through sections that correspond to different features and traffic sources that you can view, monitor and filter.

## Vercel Functions

The **Vercel Functions** tab provides a detailed view of the performance of your Vercel Functions. You can see the number of invocations and the error rate of your functions. You can also see the performance of your functions broken down by route.

For more information, see [Vercel Functions](/docs/functions). See [understand the cost impact of function invocations](/kb/guide/understand-cost-impact-of-function-invocations) for more information on how to optimize your functions.

### CPU Throttling

When your function uses too much CPU time, Vercel pauses its execution periodically to stay within limits. This means your function may take longer to complete, which, in a worst-case scenario, can cause timeouts or slow responses for users.

CPU throttling itself isn't necessarily a problem as it's designed to keep functions within their resource limits. Some throttling is normal when your functions are making full use of their allocated resources. In general, low throttling rates (under 10% on average) aren't an issue. However, if you're seeing high latency, timeouts, or slow response times, check your CPU throttling metrics. High throttling rates can help explain why your functions are performing poorly, even when your code is optimized.

To reduce throttling, optimize heavy computations, add caching, or increase the memory size of the affected functions.

## External APIs

You can use the **External APIs** tab to understand more information about requests from your functions to external APIs. You can organize by number of requests, p75 (latency), and error rate to help you understand potential causes for slow upstream times or timeouts.

### External APIs Recipes

- [Investigate Latency Issues and Slowness on Vercel](/kb/guide/investigate-latency-issues-and-slowness)

## Middleware

The **Middleware** observability tab shows invocation counts and performance metrics of your application's middleware.

Observability Plus users receive additional insights and tooling:

- Analyze invocations by request path, matched against your middleware config
- Break down middleware actions by type (e.g., redirect, rewrite)
- View rewrite targets and frequency
- Query middleware invocations using the query builder

## Edge Requests

You can use the **Edge Requests** tab to understand the requests to each of static and dynamic routes through the global network. This includes the number of requests, the regions, and the requests that have been cached for each route.

It also provides detailed breakdowns for individual bots and bot categories, including AI crawlers and search engines.

Additionally, Observability Plus users can:

- Filter traffic by bot category, such as AI
- View metrics for individual bots
- Break down traffic by bot or category in the query builder
- Filter traffic by redirect location
- Break down traffic by redirect location in the query builder

## Fast Data Transfer

You can use the **Fast Data Transfer** tab to understand how data is being transferred within the global network for your project.

For more information, see [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer).

## Image Optimization

The **Image Optimization** tab provides deeper insights into image transformations and efficiency.

It contains:

- Transformation insights: View formats, quality settings, and width adjustments
- Optimization analysis: Identify high-frequency transformations to help inform caching strategies
- Bandwidth savings: Compare transformed images against their original sources to measure bandwidth reduction and efficiency
- Image-specific views: See all referrers and unique variants of an optimized image in one place

For more information, see [Image Optimization](/docs/image-optimization).

## ISR (Incremental Static Regeneration)

You can use the **ISR** tab to understand your revalidations and cache hit ratio to help you optimize towards cached requests by default.

For more information on ISR, see [Incremental Static Regeneration](/docs/incremental-static-regeneration).

## Blob

Use the **Vercel Blob** tab to gain visibility into how Blob stores are used across your applications.
It allows you to understand usage patterns, identify inefficiencies, and optimize how your application stores and serves assets.

At the team level, you will access:

- Total data transfer
- Download volume
- Cache activity
- API operations

You can also drill into activity by user agent, edge region, and client IP.

Learn more about [Vercel Blob](/docs/storage/vercel-blob).

## Build Diagnostics

You can use the **Build Diagnostics** tab to view the performance of your builds. You can see the build time and resource usage for each of your builds. In addition, you can see the build time broken down by each step in the build and deploy process.

To learn more, see [Builds](/docs/deployments/builds).

## AI Gateway

With the AI Gateway you can switch between ~100 AI models without needing to manage API keys, rate limits, or provider accounts.

The **AI Gateway** tab surfaces metrics related to the AI Gateway, and provides visibility into:

- Requests by model
- Time to first token (TTFT)
- Request duration
- Input/output token count
- Cost per request (free while in alpha)

You can view these metrics across all projects or drill into per-project and per-model usage to understand which models are performing well, how they compare on latency, and what each request would cost in production.

For more information, see [the AI Gateway announcement](/blog/ai-gateway).

## Sandbox

With [Vercel Sandbox](/docs/vercel-sandbox), you can safely run untrusted or user-generated code on Vercel in an ephemeral compute primitive using the `@vercel/sandbox` SDK.

You can view a list of sandboxes that were started for this project. For each sandbox, you can see:

- Time started
- Status such as pending or stopped
- Runtime such as `node24`
- Resources such as `4x CPU 8.19 KB`
- Duration it ran for

Clicking on a sandbox item from the list takes you to the detail page that provides detailed information, including the URL and port of the sandbox.

## External Rewrites

The **External Rewrites** tab gives you visibility into how your external rewrites are performing at both the team and project levels. For each external rewrite, you can see:

- Total external rewrites
- External rewrites by hostnames

Additionally, Observability Plus users can view:

- External rewrite connection latency
- External rewrites by source/destination paths

To learn more, see [External Rewrites](/docs/rewrites#external-rewrites).

## Microfrontends

Vercel's microfrontends support allows you to split large applications into smaller ones to move faster and develop with independent tech stacks.

The **Microfrontends** tab provides visibility into microfrontends routing on Vercel:

- The response reason from the microfrontends routing logic
- The path expression used to route the request to that microfrontend

For more information, see [Microfrontends](/docs/microfrontends).


---

[View full sitemap](/docs/sitemap)
