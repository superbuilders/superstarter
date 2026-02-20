---
title: Vercel Web Analytics
product: vercel
url: /docs/analytics
type: conceptual
prerequisites:
  []
related:
  - /docs/analytics/quickstart
  - /docs/speed-insights
  - /docs/analytics/custom-events
  - /docs/feature-flags
  - /docs/analytics/using-web-analytics
summary: "With Web Analytics, you can get detailed insights into your website's visitors with new metrics like top pages, top referrers, and demographics."
---

# Vercel Web Analytics

> **🔒 Permissions Required**: Web Analytics

![Image](https://vercel.com/front/docs/analytics/visitor-chart-light.png)

Web Analytics provides comprehensive insights into your website's visitors, allowing you to track the top visited pages, referrers for a specific page, and demographics like location, operating systems, and browser information. Vercel's Web Analytics offers:

- **Privacy**: Web Analytics only stores anonymized data and [does not use cookies](#how-visitors-are-determined), providing data for you while respecting your visitors' privacy and web experience.
- **Integrated Infrastructure**: Web Analytics is built into the Vercel platform and accessible from your project's dashboard so there's no need for third-party services for detailed visitor insights.
- **Customizable**: You can configure Web Analytics to track custom events and feature flag usage to get a better understanding of how your visitors are using your website.

To set up Web Analytics for your project, see the [Quickstart](/docs/analytics/quickstart).

If you're interested in learning more about how your site is performing, use [Speed Insights](/docs/speed-insights).

## Visitors

The **Visitors** tab displays all your website's unique visitors within a selected timeframe. You can adjust the timeframe by
selecting a value from the dropdown in the top right hand corner.

You can use the [panels](#panels) section to view a breakdown of specific information, organized by the total number of visitors.

### How visitors are determined

Instead of relying on cookies like many analytics products, visitors are identified by a hash created from the incoming request. Using a generated hash provides a privacy-friendly experience for your visitors and means visitors can't be tracked between different days or different websites.

The generated hash is valid for a single day, at which point it is automatically reset.

If a visitor loads your website for the first time, we immediately track this visit as a page view. Subsequent page views are tracked through the native browser API.

## Page views

The **Page Views** tab, like the **Visitors** tab, shows a breakdown of every page loaded on your website during a certain time period.
Vercel counts page views by the **total number of views** on a page. For page views, the same visitor can view the same page multiple times resulting in multiple events.

You can use the [panels](#panels) section to view a breakdown of specific information, organized by the total number of page views.

## Bounce rate

The **Bounce rate** is the percentage of visitors who land on a page and leave without taking any further action.

The higher the bounce rate, the less engaging the page is.

### How bounce rate is calculated

> **💡 Note:** Bounce Rate (%) = (Single-Page Sessions / Total Sessions) × 100

Web Analytics defines a session as a group or page views by the same visitor. Custom events don't count towards the bounce rate.

For that reason, when filtering the dashboard for a given custom event, the bounce rate will always be 0%.

## Panels

Panels provide a way to view detailed analytics for Visitors and Page Views, such as top pages and referrers. They'll also show additional information such as the country, OS, and device or browser of your visitors, and configured options such as [custom events](/docs/analytics/custom-events) and [feature flag](/docs/feature-flags) usage.

By default, panels provide you with a list of top entries, categorized by the number of visitors. Depending on the panel, the information is displayed either as a number or percentage of the total visitors. You can click **View All** to see all the data:

![Image](https://vercel.com/front/docs/observability/panels-light-mode.png)

*Panels showing a breakdown of page view data.*

You can export up to 250 entries from the panel as a CSV file. See [Exporting data as CSV](/docs/analytics/using-web-analytics#exporting-data-as-csv) for more information.

## Bots

Web Analytics doesn't count traffic that comes from automated processes or accounts. Vercel determines this by inspecting the [User Agent](https://developer.mozilla.org/docs/Web/HTTP/Headers/User-Agent) header for incoming requests.


---

[View full sitemap](/docs/sitemap)
