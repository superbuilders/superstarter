---
title: Monitoring Quickstart
product: vercel
url: /docs/query/monitoring/quickstart
type: tutorial
prerequisites:
  - /docs/query/monitoring
  - /docs/query
related:
  - /docs/plans/pro-plan
  - /docs/plans/enterprise
  - /docs/observability
  - /docs/observability/monitoring/monitoring-reference
  - /docs/observability/monitoring
summary: "In this quickstart guide, you'll discover how to create and execute a query to visualize the most popular posts on your website."
---

# Monitoring Quickstart

## Prerequisites

- Make sure you upgrade to [Pro](/docs/plans/pro-plan) or [Enterprise](/docs/plans/enterprise) plan.
- Pro and Enterprise teams should [Upgrade to Observability Plus](/docs/observability#enabling-observability-plus) to access Monitoring.

## Create a new query

In the following guide you will learn how to view the most requested posts on your website.

- ### Go to the dashboard
  1. Navigate to the **Monitoring** tab from your Vercel dashboard
  2. Click the **Create New Query** button to open the query builder
  3. Click the **Edit Query** button to configure your query with clauses
  ![Image](`/docs-assets/static/docs/concepts/dashboard/edit-query-light.png`)

- ### Add Visualize clause
  The [Visualize](/docs/observability/monitoring/monitoring-reference#visualize") clause specifies which field in your query will be calculated. Set the **Visualize** clause to `requests` to monitor the most popular posts on your website.

  Click the **Run Query** button, and the [Monitoring chart](/docs/observability/monitoring#monitoring-chart) will display the total number of requests made.

  ![Image](`/docs-assets/static/docs/concepts/dashboard/set-visualize-light.png`)

- ### Add Where clause
  To filter the query data, use the [Where](/docs/observability/monitoring/monitoring-reference#where) clause and specify the conditions you want to match against. You can use a combination of [variables and operators](/docs/observability/monitoring/monitoring-reference#where) to fetch the most requested posts. Add the following query statement to the **Where** clause:
  ```sql filename=Where
  host = 'my-site.com' and like(request_path, '/posts%')
  ```
  This query retrieves data with a host field of `my-site.com` and a `request_path` field that starts with /posts.

  The `%` character can be used as a wildcard to match any sequence of characters after `/posts`, allowing you to capture all `request_path` values that start with that substring.

  ![Image](`/docs-assets/static/docs/concepts/dashboard/set-where-light.png`)

- ### Add Group By clause
  Define a criteria that groups the data based on the selected attributes. The grouping mechanism is supported through the [Group By](/docs/observability/monitoring/monitoring-reference#group-by) clause.

  Set the Group By clause to `request_path`.

  With **Visualize**, **Where**, and **Group By** fields set, the [Monitoring chart](/docs/observability/monitoring#monitoring-chart) now shows the sum of `requests` that are filtered based on the `request_path`.

  ![Image](`/docs-assets/static/docs/concepts/dashboard/set-groupby-light.png`)

- ### Add Limit clause
  To control the number of results returned by the query, use the [**Limit**](/docs/observability/monitoring/monitoring-reference#limit) clause and specify the desired number of results. You can choose from a few options, such as 5, 10, 25, 50, or 100 query results. For this example, set the limit to 5 query results.

  ![Image](`/docs-assets/static/docs/concepts/dashboard/set-limit-light.png`)

- ### Save and Run Query
  Save your query and click the  button to generate the final results. The Monitoring chart will display a comprehensive view of the top 5 most requested posts on your website.

  ![Image](`/docs-assets/static/docs/concepts/dashboard/top-posts-eg-light.png`)


---

[View full sitemap](/docs/sitemap)
