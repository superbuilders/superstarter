---
title: Monitoring
product: vercel
url: /docs/query/monitoring
type: conceptual
prerequisites:
  - /docs/query
related:
  - /docs/observability/monitoring/monitoring-reference
  - /docs/observability/monitoring/quickstart
  - /docs/notebooks
  - /docs/plans/pro-plan
  - /docs/observability/observability-plus
summary: Query and visualize your Vercel usage, traffic, and more with Monitoring.
---

# Monitoring

**Monitoring** allows you to visualize and quantify the performance and traffic of your projects on Vercel. You can use [example queries](/docs/observability/monitoring/monitoring-reference#example-queries) or create [custom queries](/docs/observability/monitoring/quickstart#create-a-new-query) to debug and optimize bandwidth, errors, performance, and bot traffic issues in a production or preview deployment.

> **🔒 Permissions Required**: Monitoring

![Image](`/docs-assets/static/docs/concepts/dashboard/monitoring-tab-light.png`)

## Monitoring chart

Charts allow you to explore your query results in detail. Use filters to adjust the date, data granularity, and chart type (line or bar).

![Image](`/docs-assets/static/docs/concepts/dashboard/query-graphs.png`)

Hover and move your mouse across the chart to view your data at a specific point in time. For example, if the data granularity is set to **1 hour**, each point in time will provide a one-hour summary.

![Image](`/docs-assets/static/docs/concepts/dashboard/tool-tip.png`)

## Example queries

To get started with the most common scenarios, use our **Example Queries**. You cannot edit or add new example queries. For a list of the available options, view our [example queries docs](/docs/observability/monitoring/monitoring-reference#example-queries).

## Save new queries

You can no longer save new Monitoring queries as the feature has now been sunset.

Instead, use observability queries, which can be saved into [Notebooks](/docs/notebooks).

### Manage saved queries

You can manage your saved personal and team queries from the query console. Select a query from the left navigation bar and click on the vertical ellipsis (⋮) in the upper right-hand corner. You can choose to **Duplicate**, **Rename**, or **Delete** the selected query from the dropdown menu.

![Image](`/docs-assets/static/docs/concepts/dashboard/manage-query.png`)

*Duplicate, Rename and Delete a query from the query editor.*

Duplicating a query creates a copy of the query in the same folder. You cannot copy queries to another folder. To rename a saved query, use the ellipses (⋮) drop-down menu or directly click its title to edit.

Deleting a saved personal or team query is permanent and irreversible. To delete a saved query, click the **Delete** button in the confirmation modal.

## Error messages

You may encounter errors such as **invalid queries** when using Monitoring. For example, defining an incorrect location parameter generates an invalid query. In such cases, no data appears.

## Enable Monitoring

You can no longer enable **Monitoring** on [Pro](/docs/plans/pro-plan) plans as the feature has now been sunset.

Get the most comprehensive suite of tools, including queries, by enabling [Observability Plus](/docs/observability/observability-plus).

## Disable Monitoring

1. Go to your team **Settings** > **Billing**
2. Scroll to the **Observability Plus** section
3. Set the toggle to the disabled state

## Manage IP Address visibility for Monitoring

> **🔒 Permissions Required**: Managing IP Address visibility

Vercel creates events each time a request is made to your website. These events include unique parameters such as execution time and bandwidth used.

Certain events such as `public_ip` may be considered personal information under certain data protection laws. To hide IP addresses from your Monitoring queries:

1. Go to the Vercel [dashboard](/dashboard) and ensure your team is selected in the scope selector.
2. Go to the **Settings** tab and navigate to **Security & Privacy**.
3. Under **IP Address Visibility**, toggle the switch next to off so the text reads **IP addresses are hidden in your Monitoring queries.**.

> **💡 Note:** For business purposes, such as DDoS mitigation, Vercel will still collect IP
> addresses.

For a complete list of fields, see the [visualize clause](/docs/observability/monitoring/monitoring-reference#visualize) docs.

## Monitoring sunset

From the end of billing cycle in Nov 2025, Vercel will sunset Monitoring for pro plans. Pro users will no longer see the Monitoring tab. Current enterprise users with monitoring access will keep the deprecated version of monitoring.
If you want to continue using the full Monitoring capabilities or purchase a product similar to Monitoring, consider moving to [Query](/docs/observability/query).

- Enable [Observability Plus](/docs/observability/observability-plus) to continue using query features.
- Save queries in **Observability** [Notebooks](/docs/observability/query#save-query).

## More resources

For more information on what to do next, we recommend the following articles:

- [Quickstart](/docs/observability/monitoring/quickstart): Learn how to create and run a query to understand the top bandwidth images on
  your website
- [Reference](/docs/observability/monitoring/monitoring-reference): Learn about the clauses, fields, and variables used to create a Monitoring
- [Limits and Pricing](/docs/observability/monitoring/limits-and-pricing): Learn about our limits and pricing when using Monitoring. Different limitations are applied depending on your plan.


---

[View full sitemap](/docs/sitemap)
