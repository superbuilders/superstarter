---
title: Limits and Pricing for Speed Insights
product: vercel
url: /docs/speed-insights/limits-and-pricing
type: reference
prerequisites:
  - /docs/speed-insights
related:
  - /docs/spend-management
  - /docs/speed-insights/package
  - /docs/speed-insights/managing-usage
  - /docs/pricing/observability
  - /docs/speed-insights/metrics
summary: Learn about our limits and pricing when using Vercel Speed Insights. Different limitations are applied depending on your plan.
---

# Limits and Pricing for Speed Insights

> **🔒 Permissions Required**: Speed Insights

## Pricing

Speed Insights is available on the Hobby, Pro, and Enterprise plans.

On the Hobby plan, Speed Insights is free and can be enabled on **one** project with a [set allotment](/docs/speed-insights/limits-and-pricing#limitations) of data points.

On the Pro plan, the **base** fee for Speed Insights is $10 per-project, per-month.

The following table outlines the price for each resource according to the plan you are on.

Pro teams can [set up Spend Management](/docs/spend-management#managing-your-spend-amount) to get notified or to automatically take action, such as [using a webhook](/docs/spend-management#configuring-a-webhook) or pausing your projects when your usage hits a set spend amount.

## Limitations

Once you've enabled Speed Insights, different limitations are applied depending on your plan:

|                                         | Hobby  | Pro     | Enterprise |
| --------------------------------------- | ------ | ------- | ---------- |
| Reporting Window for Data Points        | 7 Day  | 30 Days | 90 Days    |
| Maximum Number of Data Points per Month | 10,000 | None    | None       |

Once the maximum limit of data points is reached, no more data points will be recorded until the current day has passed. On the next day, the recording will resume. When recording is paused, you can still access all existing data points.

You can reduce the number of data points collected by adjusting the [Sample Rate](#sample-rate) at the project level by using the `@vercel/speed-insights`. To learn more, see [Sample Rate](/docs/speed-insights/package#samplerate).

## Sample rate

By default, all incoming data points are used to calculate the scores you're being presented with on the Speed Insights view.

To reduce cost, you can change the sample rate at a project level by using the `@vercel/speed-insights` package as explained in [Sample rate](/docs/speed-insights/package#samplerate). For a comprehensive guide on reducing usage, including using `beforeSend` to filter specific pages, see [Managing Usage & Costs](/docs/speed-insights/managing-usage).

## Prorating

Teams on the Pro or Enterprise plan will immediately be charged the base fee when enabling Speed Insights for each project. However, you will only be charged for the remaining time in your billing cycle. For example:

- If ten days are remaining in your current billing cycle — *that's roughly 30% of your billing cycle* – you will only pay around 3 USD for each project that has Speed Insights enabled. For every new billing cycle after that, you'll be charged a total 10 USD for each project at the beginning of the cycle.
- If you disable Speed Insights before the billing cycle ends Vercel will continue to show the already collected data points until the end of that specific billing cycle. However, no new data will be recorded.
- Once the billing cycle is over, Speed Insights will automatically turn off, and you will lose access to existing data. You won't be refunded any amounts already paid. Also, you cannot export the Speed Insights data for later use
- If you decide to re-enable the feature after cancellation, you won't be charged when you enable it. Instead, the usual 10 USD base fee will apply at the beginning of every upcoming billing cycle

## Usage

The table below shows the metrics for the [**Observability**](/docs/pricing/observability) section of the **Usage** dashboard where you can view your Speed Insights usage.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

See the [manage and optimize Observability usage](/docs/pricing/observability) section for more information on how to optimize your usage.

> **💡 Note:** Speed Insights and Web Analytics require scripts to do collection of [data
> points](/docs/speed-insights/metrics#understanding-data-points). These scripts
> are loaded on the client-side and therefore may incur additional usage and
> costs for [Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) and [Edge
> Requests](/docs/manage-cdn-usage#edge-requests).


---

[View full sitemap](/docs/sitemap)
