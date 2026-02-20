---
title: Using Speed Insights
product: vercel
url: /docs/speed-insights/using-speed-insights
type: how-to
prerequisites:
  - /docs/speed-insights
related:
  - /docs/analytics/using-web-analytics
  - /docs/analytics/filtering
  - /docs/speed-insights/metrics
  - /docs/speed-insights/limits-and-pricing
summary: "Learn how to use Speed Insights to analyze your application's performance data."
---

# Using Speed Insights

## Accessing Speed Insights

To access Speed Insights:

1. Select a project from your dashboard and navigate to the **Speed Insights** tab.
2. Select the [timeframe](/docs/analytics/using-web-analytics#specifying-a-timeframe) and [environment](/docs/analytics/using-web-analytics#viewing-environment-specific-data) you want to view data for.
3. Use the panels to [filter](/docs/analytics/filtering) the page or event data you want to view.

## Breaking down data in Speed Insights

Speed Insights offers a variety of views to help you analyze your application's performance data. This allows you to identify areas that need improvement and make informed decisions about how to optimize your site.

### Breakdown by route or path

To view metrics for a specific route or path:

1. Select a project from your dashboard and navigate to the **Speed Insights** tab.
2. From the left-hand panel, select the [metric](/docs/speed-insights/metrics) you want to view data for.
3. From the URL view, select the corresponding tab to view by the **Route** (the actual pages you built), or by **Path** (the URLs requested by the visitor).
4. The information is organized by performance score and sorted by data points. Scroll the list to view more all paths or routes, or click the **View all** button to view and filter all data.
5. You can also edit the [timeframe](/docs/analytics/using-web-analytics#specifying-a-timeframe) and [environment](/docs/analytics/using-web-analytics#viewing-environment-specific-data) you want to view data for.

![Image](`/docs-assets/static/docs/concepts/speed-insights/v2/kanban-light.png`)

### Breakdown by HTML elements

To view a detailed breakdown of the performance of individual HTML elements on your site:

1. Select a project from your dashboard and navigate to the **Speed Insights** tab.
2. From the left-hand panel, select the [metric](/docs/speed-insights/metrics) you want to view data for. HTML element attribution is only available for the following metrics:
   - **Interaction to Next Paint** (INP)
   - **First Input Delay** (FID)
   - **Cumulative Layout Shift** (CLS)
   - **Largest Contentful Paint** (LCP)
3. From the URL view, select the **Selectors** tab.
4. The information is organized by performance score and sorted by data points. Scroll the list to view more all elements, or click the **View all** button to view and filter all data.
5. You can also edit the [timeframe](/docs/analytics/using-web-analytics#specifying-a-timeframe) and [environment](/docs/analytics/using-web-analytics#viewing-environment-specific-data) you want to view data for.

This view is particularly useful for identifying specific elements that may be causing performance issues.

### Breakdown by country

This view is helpful for identifying regions where your application may be underperforming.

To view a geographical breakdown of your application's performance:

1. Select a project from your dashboard and navigate to the **Speed Insights** tab.
2. From the left-hand panel, select the [metric](/docs/speed-insights/metrics) you want to view data for.
3. Scroll down to the **Countries** section.
4. The map is colored based on the experience metric per country. Click on a country to view more detailed data.

![Image](`/docs-assets/static/docs/concepts/speed-insights/v2/country-map-light.png`)

## Disabling Speed Insights

You may want to disable Speed Insights in your project if you find you no longer need it. You can disable Speed Insights from within the project settings in the Vercel dashboard. If you are unsure if a project has Speed Insights enabled, see [Identifying if Speed Insights is enabled](#identifying-if-speed-insights-is-enabled).

> **💡 Note:** If you transfer a project with Speed Insights enabled from a Hobby team to a
> Pro plan, it will continue to be enabled but with increased limits, as
> documented in the [pricing docs](/docs/speed-insights/limits-and-pricing).
> This means that Speed Insights will be added to your Pro plan invoice
> automatically.

1. Select a project from your [dashboard](/dashboard).
2. Navigate to the **Speed Insights** tab.
3. Click on the ellipsis on the top-right of the Speed Insights page and select **Disable Speed Insights**.

![Image](`/docs-assets/static/docs/concepts/speed-insights/v2/disable-light.png`)

When you disable Speed Insights in the middle of your billing cycle, it will not be removed instantly. Instead it will stop collecting new data points but will continue to show already collected data until the end of the cycle, see the [prorating docs](/docs/speed-insights/limits-and-pricing#prorating) for more information.

> **💡 Note:** If you are on an Enterprise plan, check your contract entitlements as you may
> have custom limits included. If you have any questions about your
> billing/contract regarding Speed Insights you can reach out to your Customer
> Success Manager (CSM) or Account Executive (AE) for further clarification.

## Identifying if Speed Insights is enabled

If you have many projects on your Vercel account and are not sure which of them has Speed Insights enabled, you can see this from the [dashboard](/dashboard) without needing to check each project separately. The different circles in the right corner of each project card will show the Speed Insights status.

If Speed Insights is not enabled, then the circle will be gray, with the speed insights logo. For example:

![Image](`/docs-assets/static/docs/concepts/speed-insights/v2/ready-to-enable-light.png`)

If Speed Insights is enabled but no data points have been collected yet then it will show an empty circle, like the below:

![Image](`/docs-assets/static/docs/concepts/speed-insights/v2/enabled-no-data-light.png`)

If Speed Insights is enabled and data points have been collected then the circle will be colored with a number inside, similar to the below image:

![Image](`/docs-assets/static/docs/concepts/speed-insights/v2/enabled-light.png`)


---

[View full sitemap](/docs/sitemap)
