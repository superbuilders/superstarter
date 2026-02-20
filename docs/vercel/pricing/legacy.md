---
title: Legacy Metrics
product: vercel
url: /docs/pricing/legacy
type: reference
prerequisites:
  - /docs/pricing
related:
  - /docs/deployments/environments
  - /docs/incremental-static-regeneration
  - /docs/cdn
  - /docs/functions
summary: Learn about Bandwidth, Requests, Vercel Function Invocations, and Vercel Function Execution metrics.
---

# Legacy Metrics

## Bandwidth

Bandwidth is the amount of data your deployments have sent or received.
This chart includes traffic for both [preview](/docs/deployments/environments#preview-environment-pre-production) and
[production](/docs/deployments/environments#production-environment) deployments.

> **💡 Note:** You are not billed for bandwidth usage on [blocked or
> paused](/kb/guide/why-is-my-account-deployment-blocked#pausing-process)
> deployments.

The total traffic of your projects is the sum of the outgoing and incoming bandwidth.

- **Outgoing**: Outgoing bandwidth measures the amount of data that your deployments have **sent** to your users.
  Data used by [ISR](/docs/incremental-static-regeneration) and the responses from the [CDN](/docs/cdn) and [Vercel functions](/docs/functions) count as outgoing bandwidth
- **Incoming**: Incoming bandwidth measures the amount of data that your deployments have **received** from your users

An example of incoming bandwidth would be page views requested by the browser. All requests sent to the [CDN](/docs/cdn) and [Vercel functions](/docs/functions) are collected as incoming bandwidth.

Incoming bandwidth is usually much smaller than outgoing bandwidth for website projects.

## Requests

Requests are the number of requests made to your deployments. This chart includes traffic for both [preview](/docs/deployments/environments#preview-environment-pre-production) and [production](/docs/deployments/environments#production-environment) deployments.

Requests can be filtered by:

- **Ratio**: The ratio of requests that are cached and uncached by the [CDN](/docs/cdn)
- **Projects**: The projects that the requests are made to

## Vercel Function Invocations

Vercel Function Invocations are the number of times your [Vercel functions](/docs/functions) have received a request, excluding cache hits.

Vercel Function Invocations can be filtered by:

- **Ratio**: The ratio of invocations that are **Successful**, **Errored**, or **Timed out**
- **Projects**: The projects that the invocations are made to

## Vercel Function Execution

Vercel Function Execution is the amount of time your [Vercel functions](/docs/functions) have spent computing resources.

Vercel Function Execution can be filtered by:

- **Ratio**: The ratio of execution time that is **Completed**, **Errored**, or **Timed out**
- **Projects**: The projects that the execution time is spent on


---

[View full sitemap](/docs/sitemap)
