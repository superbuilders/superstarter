---
title: Concurrency scaling
product: vercel
url: /docs/functions/concurrency-scaling
type: reference
prerequisites:
  - /docs/functions
related:
  - /docs/functions
  - /docs/plans
  - /docs/drains
  - /docs/runtime-logs
  - /docs/errors/FUNCTION_THROTTLED
summary: Learn how Vercel automatically scales your functions to handle traffic surges.
---

# Concurrency scaling

Vercel automatically scales your functions to handle traffic surges, ensuring optimal performance during increased loads.

## Automatic concurrency scaling

The concurrency model on Vercel refers to how many instances of your [functions](/docs/functions) can run simultaneously. All functions on Vercel scale automatically based on demand to manage increased traffic loads.

With automatic concurrency scaling, your Vercel Functions can scale to a maximum of **30,000** on Pro or **100,000** on Enterprise, maintaining optimal performance during traffic surges. The scaling is based on the [burst concurrency limit](#burst-concurrency-limits) of **1000 concurrent executions per 10 seconds**, per region. Additionally, Enterprise customers can purchase extended concurrency.

Vercel's infrastructure monitors your usage and preemptively adjusts the concurrency limit to cater to growing traffic, allowing your applications to scale without your intervention.

Automatic concurrency scaling is available on [all plans](/docs/plans).

## Burst concurrency limits

Burst concurrency refers to Vercel's ability to temporarily handle a sudden influx of traffic by allowing a higher concurrency limit.

Upon detecting a traffic spike, Vercel temporarily increases the concurrency limit to accommodate the additional load. The initial increase allows for a maximum of **1000 concurrent executions per 10 seconds**. After the traffic burst subsides, the concurrency limit gradually returns to its previous state, ensuring a smooth scaling experience.

The scaling process may take several minutes during traffic surges, especially substantial ones. While this delay aligns with natural traffic curves to minimize potential impact on your application's performance, it's advisable to monitor the scaling process for optimal operation.

You can monitor burst concurrency events using [Log Drains](/docs/drains), or [Runtime Logs](/docs/runtime-logs) to help you understand and optimize your application's performance.

If you exceed the limit, a [`503 FUNCTION_THROTTLED`](/docs/errors/FUNCTION_THROTTLED) error will trigger.


---

[View full sitemap](/docs/sitemap)
