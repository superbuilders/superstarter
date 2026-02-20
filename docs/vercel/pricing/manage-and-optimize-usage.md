---
title: Manage and optimize usage
product: vercel
url: /docs/pricing/manage-and-optimize-usage
type: reference
prerequisites:
  - /docs/pricing
related:
  - /docs/dashboard-features
  - /docs/manage-cdn-usage
  - /docs/notifications
  - /docs/pricing/networking
  - /docs/pricing/serverless-functions
summary: Understand how to manage and optimize your usage on Vercel, learn how to track your usage, set up alerts, and optimize your usage to save costs.
---

# Manage and optimize usage

## What pricing plan am I on?

There are three plans on Vercel: Hobby, Pro, and Enterprise. To see which plan you are on, select your team from the [scope selector](/docs/dashboard-features#scope-selector). Next to your team name, you will see the plan you are on.

## Viewing usage

The Usage page shows the usage of all projects in your Vercel account by default. To access it, select the **Usage** tab from your Vercel [dashboard](/dashboard).

To use the usage page:

1. To investigate the usage of a specific team, use the scope selector to select your team
2. From your dashboard, select the **Usage** tab
3. We recommend you look at usage over the last 30 days to determine patterns. Change the billing cycle dropdown under Usage to **Last 30 days**
4. You can choose to view the usage of a particular project by selecting it from the dropdown
5. In the overview, you'll see an allotment indicator. It shows how much of your usage you've consumed in the current cycle and the projected cost for each item
6. Use the [**Top Paths**](/docs/manage-cdn-usage#top-paths) chart to understand the metrics causing the high usage

## Usage alerts, notification, and spend management

The usage dashboard helps you understand and project your usage. You can also set up alerts to notify you when you're approaching usage limits. You can set up the following features:

- **Spend Management**: Spend management is an opt-in feature. Pro teams can set up a spend amount for your team to trigger notifications or actions. For example a webhook or pausing your projects when you hit your set amount
- **Usage Notifications**: Usage notifications are set up automatically. Pro teams can also [configure the threshold](/docs/notifications#on-demand-usage-notifications) for usage alerts to notify you when you're approaching your usage limits

## Networking

The table below shows the metrics for the [Networking](/docs/pricing/networking) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Serverless Functions

The table below shows the metrics for the [**Serverless Functions**](/docs/pricing/serverless-functions) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Builds

The table below shows the metrics for the [**Builds**](/docs/builds/managing-builds) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Artifacts

The table below shows the metrics for the [**Remote Cache Artifacts**](/docs/monorepos/remote-caching#artifacts) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Edge Config

The table below shows the metrics for the [**Edge Config**](/docs/pricing/edge-config) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Data Cache

The table below shows the metrics for the [**Data Cache**](/docs/runtime-cache) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Incremental Static Regeneration (ISR)

The table below shows the metrics for the [**Incremental Static Regeneration**](/docs/pricing/incremental-static-regeneration) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Observability

The table below shows the metrics for the [Web Analytics](/docs/pricing/observability#managing-web-analytics-events), [Speed Insights](/docs/pricing/observability#managing-speed-insights-data-points), and [Monitoring](/docs/manage-and-optimize-observability#optimizing-monitoring-events) sections of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Image Optimization

The table below shows the metrics for the [**Image Optimization**](/docs/image-optimization/managing-image-optimization-costs) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

## Viewing Options

### Count

Count shows the **total** number of a certain metric, across all projects in your account. This is useful to understand past trends about your usage.

### Project

Project shows the total usage of a certain metric, per project. This is useful to understand how different projects are using resources and is useful to help you start understanding the best opportunities for optimizing your usage.

### Region

For region-based pricing, you can view the usage of a certain metric, per region. This is useful to understand the requests your site is getting from different regions.

### Ratio

- **Requests**: The ratio of cached vs uncached requests
- **Fast Data Transfer**: The ratio of incoming vs outgoing data transfer
- **Fast Origin Transfer**: The ratio of incoming vs outgoing data transfer
- **Serverless Functions invocations**: Successful vs errored vs timed out invocations
- **Serverless Functions execution**: Successful vs errored vs timed out invocations
- **Builds**: Completed vs errored builds
- **Remote Cache Artifacts**: Uploaded vs downloaded artifacts
- **Remote Cache total size**: Uploaded vs downloaded artifacts

### Average

This shows the average usage of a certain metric over a 24 hour period.

## More resources

For more information on Vercel's pricing, guidance on optimizing consumption, and invoices, see the following
resources:

- [How are resources used on Vercel?](/docs/pricing/how-does-vercel-calculate-usage-of-resources)
- [Understanding my invoice](/docs/pricing/understanding-my-invoice)


---

[View full sitemap](/docs/sitemap)
