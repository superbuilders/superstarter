---
title: Monitoring Reference
product: vercel
url: /docs/query/monitoring/monitoring-reference
type: reference
prerequisites:
  - /docs/query/monitoring
  - /docs/query
related:
  - /docs/manage-cdn-usage
  - /docs/fluid-compute
  - /docs/functions/usage-and-pricing
  - /docs/cdn-cache
  - /docs/errors
summary: This reference covers the clauses, fields, and variables used to create a Monitoring query.
---

# Monitoring Reference

## Visualize

The `Visualize` clause selects what query data is displayed. You can select one of the following fields at a time, [aggregating](#aggregations) each field in one of several ways:

| **Field Name**                    | **Description**                                                                                                                  | **Aggregations**                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Edge Requests**                 | The number of [Edge Requests](/docs/manage-cdn-usage#edge-requests)                                                              | Count, Count per Second, Percentages                   |
| **Duration**                      | The time spent serving a request, as measured by Vercel's CDN                                                                    | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Incoming Fast Data Transfer**   | The amount of [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) used by the request.                               | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Outgoing Fast Data Transfer**   | The amount of [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) used by the response.                              | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Function Duration**             | The amount of [Vercel Function duration](/docs/fluid-compute#pricing-and-usage), as measured in GB-hours.                        | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Function Invocations**          | The number of [Vercel Function invocations](/docs/functions/usage-and-pricing#managing-function-invocations)                     | Count, Count per Second, Percentages                   |
| **Function Duration**             | The amount of [Vercel Function duration](/docs/functions/usage-and-pricing#managing-function-duration), as measured in GB-hours. | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Function CPU Time**             | The amount of CPU time a Vercel Function has spent responding to requests, as measured in milliseconds.                          | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Incoming Fast Origin Transfer** | The amount of [Fast Origin Transfer](/docs/manage-cdn-usage#fast-origin-transfer) used by the request.                           | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Outgoing Fast Origin Transfer** | The amount of [Fast Origin Transfer](/docs/manage-cdn-usage#fast-origin-transfer) used by the response.                          | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Provisioned Memory**            | The amount of memory provisioned to a Vercel Function.                                                                           | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Peak Memory**                   | The maximum amount of memory used by Vercel Function at any point in time.                                                       | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Requests Blocked**              | All requests blocked by either the system or user.                                                                               | Count, Count per Second, Percentages                   |
| **Incoming Legacy Bandwidth**     | Legacy Bandwidth sent from the client to Vercel                                                                                  | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Outgoing Legacy Bandwidth**     | Legacy Bandwidth sent from Vercel to the client                                                                                  | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Total Legacy Bandwidth**        | Sum of Incoming and Outgoing Legacy Bandwidth                                                                                    | Sum, Sum per Second, Min/Max, Percentages, Percentiles |

### Aggregations

The visualize field can be aggregated in the following ways:

| **Aggregation**                          | **Description**                                                                                                                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Count**                                | The number of requests that occurred                                                                                                                                                                                                                      |
| **Count per Second**                     | The average rate of requests that occurred                                                                                                                                                                                                                |
| **Sum**                                  | The sum of the field value across all requests                                                                                                                                                                                                            |
| **Sum per Second**                       | The sum of the field value as a rate per second                                                                                                                                                                                                           |
| **Minimum**                              | The smallest observed field value                                                                                                                                                                                                                         |
| **Maximum**                              | The largest observed field value                                                                                                                                                                                                                          |
| **Percentiles (75th, 90th, 95th, 99th)** | Percentiles for the field values. For example, 90% of requests will have a duration that is less than the 90th percentile of duration.                                                                                                                    |
| **Percentages**                          | Each group is reported as a percentage of the ungrouped whole. For example, if a query for request groups by hosts, one host may have 10% of the total request count. Anything excluded by the `where` clause is not counted towards the ungrouped whole. |

Aggregations are calculated within each point on the chart (hourly, daily, etc depending on the selected granularity) and also across the entire query window

## Where

The `Where` clause defines the conditions to filter your query data. It only fetches data that meets a specified condition based on several [fields](/docs/query/monitoring/monitoring-reference#group-by-and-where-fields) and operators:

| **Operator** | **Description**                                                                                                                                                                                                                                                                                                                                                                                     |     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `=`          | The operator that allows you to specify a single value                                                                                                                                                                                                                                                                                                                                              |
| `in`         | The operator that allows you to specify multiple values. For example, `host in ('vercel.com', 'nextjs.com')`                                                                                                                                                                                                                                                                                        |
| `and`        | The operator that displays a query result if all the filter conditions are `TRUE`                                                                                                                                                                                                                                                                                            |
| `or`         | The operator that displays a query result if at least one of the filter conditions are `TRUE`                                                                                                                                                                                                                                                                                |
| `not`        | The operator that displays a query result if the filter condition(s) is `NOT TRUE`                                                                                                                                                                                                                                                                                           |
| `like`       | The operator used to search a specified pattern. This is case-sensitive. For example, `host like 'acme.com'`. You can also use `_` to match any single character and `%` to match any substrings. For example, `host like 'acme_.com'` will match with `acme1.com`, `acme2.com`, and `acme3.com`. `host like 'acme%'` will also have the same matches. To do a case-insensitive search, use `ilike` |
| `startsWith` | Filter data values that begin with some specific characters                                                                                                                                                                                                                                                                                                                                         |
| `match`      | The operator used to search for patterns based on a regular expression ([`Re2`](https://github.com/google/re2/wiki/Syntax) syntax). For example, `match(user_agent, 'Chrome/97.*')`                                                                                                                                                                                                                 |

> **⚠️ Warning:** String literals must be surrounded by single quotes. For example, `host =
>   'vercel.com'`.

## Group by

The `Group By` clause calculates statistics for each combination of [field](#group-by-and-where-fields) values. Each group is displayed as a separate color in the chart view, and has a separate row in the table view.

For example, grouping by `host` and `status` will display data broken down by each combination of `host` and `status`.

## Limit

The `Limit` clause defines the maximum number of results displayed. If the number of query results is greater than the `Limit` value, then the remaining results are compiled as **Other(s)**.

## Group by and where fields

There are several fields available for use within the [where](#where) and [group by](#group-by) clauses:

| **Field Name**    | **Description**                                                                                                                                                                                                                                                                  |     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `host`            | Group by the request's domains and subdomains                                                                                                                                                                                                                                    |
| `path_type`       | Group by the request's [resource type](#path-types)                                                                                                                                                                                                                              |
| `project_id`      | Group by the request's project ID                                                                                                                                                                                                                                                |
| `status`          | Group by the request's HTTP response code                                                                                                                                                                                                                                        |
| `source_path`     | The mapped path used by the request. For example, if you have a dynamic route like `/blog/[slug]` and a blog post is `/blog/my-blog-post`, the `source_path` is `/blog/[slug]`                                                                                                   |
| `request_path`    | The path used by the request. For example, if you have a dynamic route like `/blog/[slug]` and a blog post is `/blog/my-blog-post`, the `request_path` is `/blog/my-blog-post`                                                                                                   |
| `cache`           | The [cache](/docs/cdn-cache#x-vercel-cache) status for the request                                                                                                                                                                                                               |
| `error_details`   | Group by the [errors](/docs/errors) that were thrown on Vercel                                                                                                                                                                                                                   |
| `deployment_id`   | Group by the request's deployment ID                                                                                                                                                                                                                                             |
| `environment`     | Group by the environment (`production` or [`preview`](/docs/deployments/environments#preview-environment-pre-production))                                                                                                                                                        |
| `request_method`  | Group by the HTTP request method (`GET`, `POST`, `PUT`, etc.)                                                                                                                                                                                                                    |
| `http_referer`    | Group by the HTTP referer                                                                                                                                                                                                                                                        |
| `public_ip`       | Group by the request's IP address                                                                                                                                                                                                                                                |
| `user_agent`      | Group by the request's user agent                                                                                                                                                                                                                                                |
| `asn`             | The [autonomous system number (ASN)](# "ASN") for the request. This is related to what network the request came from (either a home network or a cloud provider) |
| `bot_name`        | Group by the request's bot crawler name. This field will contain the name of a known crawler (e.g. Google, Bing)                                                                                                                                                                 |
| `region`          | Group by the [region](/docs/regions) the request was routed to                                                                                                                                                                                                                   |
| `waf_action`      | Group by the WAF action taken by the [Vercel Firewall](/docs/security/vercel-waf) (`deny`, `challenge`, `rate_limit`, `bypass` or `log`)                                                                                                                                         |
| `action`          | Group by the action taken by [Vercel DDoS Mitigations](/docs/security/ddos-mitigation) (`deny` or `challenge`)                                                                                                                                                                   |
| `skew_protection` | When `active`, the request would have been subject to [version skew](/docs/deployments/skew-protection) but was protected. When `inactive`, the request did not require skew protection to be fulfilled.                                                                         |

### Path types

All your project's resources like pages, functions, and images have a path type:

| **Path Type**     | **Description**                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `static`          | A static asset (`.js`, `.css`, `.png`, etc.)                                                                                        |
| `func`            | A [Vercel Function](/docs/functions)                                                                                                |
| `external`        | A resource that is outside of Vercel. This is usually caused when you have [rewrite rules](/docs/project-configuration#rewrites)    |
| `edge`            | A [Vercel Function](/docs/functions) using [Edge runtime](/docs/functions/runtimes/edge)                                            |
| `prerender`       | A pre-rendered page built using [Incremental Static Regeneration](/docs/incremental-static-regeneration)                            |
| `streaming_func`  | A [streaming Vercel Function](/docs/functions/streaming-functions)                                                                  |
| `background_func` | The [Incremental Static Regeneration Render Function](/docs/incremental-static-regeneration) used to create or update a static page |

## Chart view

![Image](`/docs-assets/static/docs/monitoring/monitoring-top-bar-light.png`)

In the chart view (vertical bar or line), `Limit` is applied at the level of each day or hour (based the value of the **Data Granularity** dropdown). When you hover over each step of the horizontal axis, you can see a list of the results returned and associated colors.

## Table view

In the table view (below the chart), `Limit` is applied to the sum of requests for the selected query window so that the number of rows in the table does not exceed the value of `Limit`.

## Example queries

On the left navigation bar, you will find a list of example queries to get started:

| **Query Name**                            | **Description**                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Requests by Hostname                      | The total number of requests for each `host`                                                      |
| Requests Per Second by Hostname           | The total number of requests per second for each `host`                                           |
| Requests by Project                       | The total number of requests for each `project_id`                                                |
| Requests by IP Address                    | The total number of requests for each `public_ip`                                                 |
| Requests by Bot/Crawler                   | The total number of requests for each `bot_name`                                                  |
| Requests by User Agent                    | The total number of requests for each `user_agent`                                                |
| Requests by Region                        | The total number of requests for each `region`                                                    |
| Bandwidth by Project, Hostname            | The outgoing bandwidth for each `host` and `project_id` combination                               |
| Bandwidth Per Second by Project, Hostname | The outgoing bandwidth per second for each `host` and `project_id`                                |
| Bandwidth by Path, Hostname               | The outgoing bandwidth for each `host` and `source_path`                                          |
| Request Cache Hits                        | The total number of request cache hits for each `host`                                            |
| Request Cache Misses                      | The total number of request cache misses for each`host`                                           |
| Cache Hit Rates                           | The percentage of cache hits and misses over time                                                 |
| 429 Status Codes by Host, Path            | The total 429 (Too Many Requests) status code requests for each `host` and `source_path`          |
| 5XX Status Codes by Host, Path            | The total 5XX (server-related HTTPS error) status code requests for each `host` and `source_path` |
| Execution by Host, Path                   | The total billed Vercel Function usage for each `host` and `source_path`                          |
| Average Duration by Host, Path            | The average duration for each `host` and `source_path`                                            |
| 95th Percentile Duration by Host, Path    | The p95 duration for each `host` and `source_path`                                                |


---

[View full sitemap](/docs/sitemap)
