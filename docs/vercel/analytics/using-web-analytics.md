---
title: Using Web Analytics
product: vercel
url: /docs/analytics/using-web-analytics
type: how-to
prerequisites:
  - /docs/analytics
related:
  - /docs/analytics/filtering
  - /docs/analytics/limits-and-pricing
summary: "Learn how to use Vercel's Web Analytics to understand how visitors are using your website."
---

# Using Web Analytics

## Accessing Web Analytics

To access Web Analytics:

1. Select a project from your dashboard and navigate to the **Analytics** tab.
2. Select the [timeframe](/docs/analytics/using-web-analytics#specifying-a-timeframe) and [environment](/docs/analytics/using-web-analytics#viewing-environment-specific-data) you want to view data for.
3. Use the panels to [filter](/docs/analytics/filtering) the page or event data you want to view.

## Viewing data for a specific dimension

1. Select a project from your dashboard and navigate to the **Analytics** tab.
2. Using panels you can choose whether to view data by:
   - **Pages**: The page url (without query parameters) that the visitor viewed.
   - **Route**: The route, as defined by your application's framework.
   - **Hostname**: Use this to analyze traffic by specific domains. This is beneficial for per-country domains, or for building multi-tenant applications.
   - **Referrers**: The URL of the page that referred the visitor to your site. Referrer data is tracked for custom events and for initial pageviews according to the [Referrer-Policy HTTP header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy), and only if the referring link doesn't have the `rel="noreferrer"` attribute. Subsequent soft navigation within your application doesn't include referrer data.
   - **UTM Parameters** (available with [Web Analytics Plus](/docs/analytics/limits-and-pricing) and Enterprise): the forwarded UTM parameters, if any.
   - **Country**: Your visitors' location.
   - **Browsers**: Your visitors' browsers.
   - **Devices**: Distinction between mobile, tablet, and desktop devices.
   - **Operating System**: Your visitors' operating systems.

![Image](https://vercel.com/front/docs/observability/page-panel-light.png)

## Specifying a timeframe

1. Select a project from your dashboard and navigate to the **Analytics** tab.
2. Select the timeframe dropdown in the top-right of the page to choose a predefined timeframe. Alternatively, select the Calendar icon to specify a custom timeframe.

## Viewing environment-specific data

1. Select a project from your dashboard and navigate to the **Analytics** tab.
2. Select the environments dropdown in the top-right of the page to choose **Production**, **Preview**, or **All Environments**. Production is selected by default.

## Exporting data as CSV

To export the data from a panel as a CSV file:

1. Select the **Analytics** tab from your project's [dashboard](/dashboard)
2. From the bottom of the panel you want to export data from, click the three-dot menu
3. Select the **Export as CSV** button

The export will include up to 250 entries from the panel, not just the top entries.

## Disabling Web Analytics

1. Select a project from your dashboard and navigate to the **Analytics** tab.
2. Remove the `@vercel/analytics` package from your codebase and dependencies in order to prevent your app from sending analytics events to Vercel.
3. If events have been collected, click on the ellipsis on the top-right of the **Web Analytics** page and select **Disable Web Analytics**. If no data has been collected yet then you will see an **Awaiting Data** popup. From here you can click the **Disable Web Analytics** button:

![Image](`/docs-assets/static/docs/concepts/web-analytics/getting-started-light.png`)


---

[View full sitemap](/docs/sitemap)
