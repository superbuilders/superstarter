---
title: Limits and Pricing for Monitoring
product: vercel
url: /docs/query/monitoring/limits-and-pricing
type: reference
prerequisites:
  - /docs/query/monitoring
  - /docs/query
related:
  - /docs/observability
  - /docs/observability/limits-and-pricing
  - /docs/observability/monitoring/monitoring-reference
summary: Learn about our limits and pricing when using Monitoring. Different limitations are applied depending on your plan.
---

# Limits and Pricing for Monitoring

## Pricing

Monitoring has become part of Observability, and is therefore included with Observability Plus at no additional cost. If you are currently paying for Monitoring, you should [migrate](/docs/observability#enabling-observability-plus) to Observability Plus to get access to additional product features with a longer retention period for the same base fee.

Even if you choose not to migrate to Observability Plus, Vercel will automatically move you to the new pricing modal of $1.20 per 1 million events, as shown below. If you do not migrate to Observability Plus, you will not be able to access Observability Plus features on the **Observability** tab.

To learn more, see [Limits and Pricing for Observability](/docs/observability/limits-and-pricing).

## Limitations

| Limit          | Pro           | Enterprise              |
| -------------- | ------------- | ----------------------- |
| Data retention | 30 days       | 90 days                 |
| Granularity    | 1 day, 1 hour | 1 day, 1 hour, 5 minute |

## How are events counted?

Vercel creates an event each time a request is made to your website. These events include unique parameters such as execution time. For a complete list, [see the visualize clause docs](/docs/observability/monitoring/monitoring-reference#visualize).


---

[View full sitemap](/docs/sitemap)
