---
title: Vercel Edge Config
product: vercel
url: /docs/edge-config
type: conceptual
prerequisites:
  []
related:
  - /docs/speed-insights/metrics
  - /docs/routing-middleware
  - /docs/functions
  - /docs/functions/runtimes
  - /docs/edge-config/edge-config-limits
summary: An Edge Config is a global data store that enables experimentation with feature flags, A/B testing, critical redirects, and more.
---

# Vercel Edge Config

> **🔒 Permissions Required**: Edge Config

An [Edge Config](/edge-config) is a global data store that [enables experimentation with feature flags, A/B testing, critical redirects, and IP blocking](#use-cases). It enables you to read data in the region closest to the user without querying an external database or hitting upstream servers.

With Vercel's optimizations, you can read Edge Config data at negligible latency. The vast majority of your reads will complete within 15ms [at P99](/docs/speed-insights/metrics#how-the-percentages-are-calculated "P99 latency"), or often less than 1ms.

You can use an Edge Config in [Middleware](/docs/routing-middleware) and [Vercel Functions](/docs/functions).

> **💡 Note:** Vercel's Edge Config read optimizations are **only available on the Edge and
> Node.js runtimes**. Optimizations can be enabled for other runtimes, [such as
> Ruby, Go, and Python](/docs/functions/runtimes) upon request. See [our Edge
> Config limits docs](/docs/edge-config/edge-config-limits) to learn more.

## Use cases

Edge Configs are great for data that is accessed frequently and updated infrequently. Here are some examples of storage data suitable for Edge Config:

## Getting started

You can create and manage your Edge Config from either [Vercel REST API](/docs/edge-config/vercel-api) or [Dashboard](/docs/edge-config/edge-config-dashboard). You can scope your Edge Configs to your Hobby team or [team](/docs/accounts/create-a-team), and connect them to as many projects as you want.

To get started, see [our quickstart](/docs/edge-config/get-started).

## Using Edge Config in your workflow

If you'd like to know whether or not Edge Config can be integrated into your workflow, it's worth knowing the following:

- You can have one or more Edge Configs per Vercel account, depending on your plan as explained in [Limits](/docs/edge-config/edge-config-limits)
- You can use multiple Edge Configs in one Vercel project
- Each Edge Config can be accessed by multiple Vercel projects
- Edge Configs can be scoped to different environments within projects using environment variables
- **Edge Config access is secure by default**. A [read access token](/docs/edge-config/using-edge-config#creating-a-read-access-token) is required to read from them, and an [API token](/docs/rest-api#creating-an-access-token) is required to write to them

See [our Edge Config limits docs to learn more](/docs/edge-config/edge-config-limits)

## Why use Edge Config instead of alternatives?

There are alternative solutions to Edge Config for handling A/B testing, feature flags, and IP blocking. The following table lays out how those solutions compare to Edge Config:

| **Edge Config vs alternatives** | **Read latency**                                                                                                           | **Write latency**                                                                                                           | **Redeployment required**                                                                                                       | **Added risk of downtime**                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edge Config**                 | **Ultra-low**  | **Varies**  | **No**                             | **No**             |
| Remote JSON files               | Varies                                | Varies                                                                                                                      | No       | Yes  |
| Embedded JSON files             | Lowest                                                                                                                     | Highest               | Yes         | No                                                                                                                                            |
| Environment Variables           | Lowest                                                                                                                     | Highest                           | Yes  | No                                                                                                                                            |

## Limits

To learn about Edge Config limits and pricing, see [our Edge Config limits docs](/docs/edge-config/edge-config-limits).

## More resources

- [Quickstart](/docs/edge-config/get-started)
- [Read with the SDK](/docs/edge-config/edge-config-sdk)
- [Use the Dashboard](/docs/edge-config/edge-config-dashboard)
- [Manage with the API](/docs/edge-config/vercel-api)
- [Edge Config Limits](/docs/edge-config/edge-config-limits)


---

[View full sitemap](/docs/sitemap)
