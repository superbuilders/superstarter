---
title: Manage and optimize usage for Observability
product: vercel
url: /docs/manage-and-optimize-observability
type: reference
prerequisites:
  []
related:
  - /docs/speed-insights/metrics
  - /docs/observability
  - /docs/manage-cdn-usage
  - /docs/analytics
  - /docs/analytics/package
summary: Learn how to understand the different charts in the Vercel dashboard, how usage relates to billing, and how to optimize your usage of Web Analytics...
---

# Manage and optimize usage for Observability

The Observability section covers usage for Observability, Monitoring, Web Analytics, and Speed insights.

## Plan usage

| Resource | Price |
|----------|-------|
| [Speed Insights Data Points](/docs/speed-insights/metrics#understanding-data-points) | $0.65 |
| [Observability Plus Events](/docs/observability#tracked-events) | $1.20 per 1,000,000 Data Events |


## Managing Web Analytics events

The **Events** chart shows the number of page views and custom events that were tracked across all of your projects. You can filter the data by **Count** or **Projects**.

Every plan has an included limit of events per month. On Pro, Pro with Web Analytics Plus, and Enterprise plans, you're billed based on the usage over the plan limit. You can see the total number of events used by your team by selecting **Count** in the chart.

> **💡 Note:** Speed Insights and Web Analytics require scripts to do collection of [data
> points](/docs/speed-insights/metrics#understanding-data-points). These scripts
> are loaded on the client-side and therefore may incur additional usage and
> costs for [Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) and [Edge
> Requests](/docs/manage-cdn-usage#edge-requests).

### Optimizing Web Analytics events

- Your usage is based on the total number of events used across all projects within your team. You can see this number by selecting **Projects** in the chart, which will allow you to figure out which projects are using the most events and can therefore be optimized
- Reduce the amount of custom events they send. Users can find the most sent events in the [events panel](/docs/analytics#panels) in Web Analytics
- Use [beforeSend](/docs/analytics/package#beforesend) to exclude page views and events that might not be relevant

## Managing Speed Insights data points

You are initially billed a set amount for each project on which you enable Speed Insights. Each plan includes a set number of data points. After that, you're charged a set price per unit of additional data points.

Data points are a single unit of information that represent a measurement of a specific Web Vital metric during a user's visit to your website. Data points get collected on hard navigations. See [Understanding Data Points](/docs/speed-insights/metrics#understanding-data-points) for more information.

> **💡 Note:** Speed Insights and Web Analytics require scripts to do collection of [data
> points](/docs/speed-insights/metrics#understanding-data-points). These scripts
> are loaded on the client-side and therefore may incur additional usage and
> costs for [Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) and [Edge
> Requests](/docs/manage-cdn-usage#edge-requests).

### Optimizing Speed Insights data points

- To reduce cost, you can change the sample rate at a project level by using the `@vercel/speed-insights` package as explained in [Sample rate](/docs/speed-insights/package#samplerate). You can also provide a cost limit under your team's Billing settings page to ensure no more data points are collected for the rest of the billing period once the limit has been reached
- Use [beforeSend](/docs/speed-insights/package#beforesend) to exclude page views and events that might not be relevant
- You may want to [disable speed insights](/docs/speed-insights/disable) for projects that no longer need it. This will stop data points getting collected for a project

## Managing Monitoring events

> **💡 Note:** Monitoring has become part of Observability, and is therefore included with
> Observability Plus at no additional cost. If you are currently paying for
> Monitoring, you should
> [migrate](/docs/observability#enabling-observability-plus) to Observability
> Plus to get access to additional product features with a longer retention
> period for the same [base
> fee](/docs/observability/limits-and-pricing#pricing).

Vercel creates an event each time a request is made to your website. These events include unique parameters such as execution time and bandwidth used. For a complete list, see the [visualize](/docs/observability/monitoring/monitoring-reference#visualize) and [group by](/docs/observability/monitoring/monitoring-reference#group-by) docs.

You pay for monitoring based on the **total** number of events used above the included limit included in your plan. You can see this number by selecting **Count** in the chart.

You can also view the number of events used by each project in your team by selecting **Projects** in the chart. This will show you the number of events used by each project in your team, allowing you to optimize your usage.

### Optimizing Monitoring events

Because events are based on the amount of requests to your site, there is no way to optimize the number of events used.

## Optimizing drains usage

You can optimize your log drains usage by:

- [**Filtering by environment**](/docs/drains/reference/logs#log-environments): You can filter logs by environment to reduce the number of logs sent to your log drain. By filtering by only your [production environment](/docs/deployments/environments#production-environment) you can avoid the costs of sending logs from your [preview deployments](/docs/deployments/environments#preview-environment-pre-production)
- [**Sampling rate**](/docs/drains/reference/logs#sampling-rate): You can reduce the number of logs sent to your log drain by using a sampling rate. This will send only a percentage of logs to your log drain, reducing the number of logs sent and the cost of your log drain

## Managing Observability events

Vercel creates one or many events each time a request is made to your website. To learn more, see [Events](/docs/observability#tracked-events).

You pay for Observability Plus based on the **total** number of events used above the included limit included in your plan.

The Observability chart allows you to view by the total **Count**, **Event Type**, or **Projects** over the selected time period.

### Optimizing Observability events

Because events are based on the amount of requests to your site, there is no way to optimize the number of events used.


---

[View full sitemap](/docs/sitemap)
