---
title: Vercel Sandbox pricing and limits
product: vercel
url: /docs/vercel-sandbox/pricing
type: reference
prerequisites:
  - /docs/vercel-sandbox
related:
  - /docs/notifications
  - /docs/plans/hobby
  - /docs/plans/pro-plan
  - /docs/spend-management
  - /docs/vercel-sandbox/concepts/snapshots
summary: "Understand how Vercel Sandbox billing works, what's included in each plan, and the limits that apply."
---

# Vercel Sandbox pricing and limits

Vercel Sandbox usage is metered across several dimensions. This page explains how billing works for each plan, what limits apply, and how to estimate costs.

## Pricing

On each billing cycle, Hobby plans receive a monthly allotment of Sandbox usage at no cost. Pro and Enterprise plans are charged based on usage.

Once you exceed your included limit on Hobby, sandbox creation is [paused](#hobby) until the next billing cycle. Pro and Enterprise usage is charged against your account.

## Billing information

### Hobby

Sandbox is free for Hobby users within the usage limits detailed above.

Vercel sends you [notifications](/docs/notifications#on-demand-usage-notifications) as you approach your usage limits. You **will not be charged** for any additional usage. Once you exceed the limits, sandbox creation is paused until 30 days have passed since you first used the feature.

To continue using Sandbox after exceeding your limits, [upgrade to Pro](/docs/plans/hobby#upgrading-to-pro).

### Pro

All Sandbox usage on Pro plans is charged against your [$20/month credit](/docs/plans/pro-plan#credit-and-usage-allocation). After the credit is exhausted, usage is billed at the rates shown above.

To control costs, configure [Spend Management](/docs/spend-management) to receive alerts or pause projects when you reach a specified amount.

### Enterprise

Enterprise plans use the same list pricing as Pro. Contact your account team for volume discounts or higher limits.

[Contact sales](/contact/sales) for custom pricing.

## Understanding the metrics

Vercel tracks Sandbox usage across five metrics. Select a metric in the pricing table above to jump to its description.

### Active CPU

The amount of time your code actively uses the CPU, measured in hours. Time spent waiting for I/O (such as network requests, database queries, or AI model calls) does not count toward Active CPU.

### Provisioned Memory

The memory allocated to your sandbox (in GB) multiplied by the time it runs (in hours). Each vCPU includes 2 GB of memory. For example, a 4 vCPU sandbox with 8 GB of memory running for 30 minutes uses:

```
8 GB × 0.5 hours = 4 GB-hours
```

### Sandbox Creations

The number of times you call `Sandbox.create()`. Each creation counts as one, regardless of how long the sandbox runs.

### Network

The total data transferred in and out of your sandbox, measured in GB. This includes package downloads, API calls, and traffic through exposed ports.

### Snapshot Storage

The storage used by [snapshots](/docs/vercel-sandbox/concepts/snapshots), measured in GB per month.

## Example calculations

The following examples show estimated costs for common scenarios on Pro/Enterprise plans.

| Scenario           | Duration | vCPUs | Memory | Active CPU Cost | Memory Cost | Total  |
| ------------------ | -------- | ----- | ------ | --------------- | ----------- | ------ |
| Quick test         | 2 min    | 1     | 2 GB   | $0.004          | $0.001      | ~$0.01 |
| AI code validation | 5 min    | 2     | 4 GB   | $0.02           | $0.007      | ~$0.03 |
| Build and test     | 30 min   | 4     | 8 GB   | $0.26           | $0.08       | ~$0.34 |
| Long-running task  | 2 hr     | 8     | 16 GB  | $2.05           | $0.68       | ~$2.73 |

> **💡 Note:** These estimates assume 100% CPU utilization. Actual Active CPU costs are often lower because time spent waiting for I/O is not billed.

Sandbox creation costs are minimal at $0.60 per million creations ($0.0000006 per creation).

## Limits

### Resource limits

| Resource                   | Limit |
| -------------------------- | ----- |
| Maximum vCPUs per sandbox  | 8     |
| Memory per vCPU            | 2 GB  |
| Maximum memory per sandbox | 16 GB |
| Open ports per sandbox     | 4     |

### Runtime limits

The default timeout is 5 minutes. You can configure this using the `timeout` option when creating a sandbox, and extend it using `sandbox.extendTimeout()`. See [Working with Sandbox](/docs/vercel-sandbox/working-with-sandbox#execute-long-running-tasks) for details.

| Plan       | Maximum duration |
| ---------- | ---------------- |
| Hobby      | 45 minutes       |
| Pro        | 5 hours          |
| Enterprise | 5 hours          |

### Concurrency limits

| Plan       | Concurrent sandboxes |
| ---------- | -------------------- |
| Hobby      | 10                   |
| Pro        | 2,000                |
| Enterprise | 2,000                |

### Rate limits

The number of vCPUs you can allocate to new sandboxes is rate-limited by plan.

| Plan       | vCPU allocation limit   |
| ---------- | ----------------------- |
| Hobby      | 40 vCPUs per 10 minutes |
| Pro        | 200 vCPUs per minute    |
| Enterprise | 400 vCPUs per minute    |

For example, with the Pro plan limit of 200 vCPUs per minute, you can create 25 sandboxes with 8 vCPUs each, or 100 sandboxes with 2 vCPUs each, every minute.

[Contact sales](/contact/sales) if you need higher rate limits.

### Snapshot expiration

Snapshots expire after **30 days by default**. You can configure the [expiration time](/docs/vercel-sandbox/concepts/snapshots#snapshot-limits) to control how long snapshots are retained.

### Regions

Currently, Vercel Sandbox is only available in the `iad1` region.

## Managing costs

To optimize your Sandbox costs:

- **Set appropriate timeouts**: Use the shortest timeout that works for your task
- **Right-size resources**: Start with fewer vCPUs and scale up only if needed
- **Stop sandboxes promptly**: Call `sandbox.stop()` when done rather than waiting for timeout
- **Monitor usage**: Check the [Usage dashboard](https://vercel.com/d?to=%2Fdashboard%2F%5Bteam%5D%2Fusage\&title=Show+Usage+Page) to track your sandbox consumption

For more details on sandbox lifecycle management, see [Working with Sandbox](/docs/vercel-sandbox/working-with-sandbox).


---

[View full sitemap](/docs/sitemap)
