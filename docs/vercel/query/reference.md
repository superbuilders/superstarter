---
title: Query Reference
product: vercel
url: /docs/query/reference
type: reference
prerequisites:
  - /docs/query
related:
  - /docs/pricing/networking
  - /docs/functions/usage-and-pricing
  - /docs/pricing/incremental-static-regeneration
  - /docs/query/monitoring/monitoring-reference
  - /docs/cdn-cache
summary: This reference covers the dimensions and operators used to create a query.
---

# Query Reference

## Metric

The metric selects what query data is displayed. You can choose one field at a time, and the same metric can be applied to different event types. For instance, **Function Wall Time** can be selected for edge, serverless, or middleware functions, aggregating each field in various ways.

| **Field Name**                    | **Description**                                                                                                           | **Aggregations**                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Edge Requests**                 | The number of [Edge Requests](/docs/pricing/networking#edge-requests)                                                     | Count, Count per Second, Percentages                   |
| **Duration**                      | The time spent serving a request, as measured by Vercel's CDN                                                             | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Incoming Fast Data Transfer**   | The incoming amount of [Fast Data Transfer](/docs/pricing/networking#fast-data-transfer) used by the request.             | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Outgoing Fast Data Transfer**   | The outgoing amount of [Fast Data Transfer](/docs/pricing/networking#fast-data-transfer) used by the response.            | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Total Fast Data Transfer**      | The total amount of [Fast Data Transfer](/docs/pricing/networking#fast-data-transfer) used by the response.               | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Function Invocations**          | The number of [Function invocations](/docs/functions/usage-and-pricing#managing-function-invocations)                     | Count, Count per Second, Percentages                   |
| **Function Duration**             | The amount of [Function duration](/docs/functions/usage-and-pricing#managing-function-duration), as measured in GB-hours. | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Function CPU Time**             | The amount of CPU time a Vercel Function has spent responding to requests, as measured in milliseconds.                   | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Incoming Fast Origin Transfer** | The amount of [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer) used by the request.                  | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Outgoing Fast Origin Transfer** | The amount of [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer) used by the response.                 | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Provisioned Memory**            | The amount of memory provisioned to a Vercel Function.                                                                    | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Peak Memory**                   | The maximum amount of memory used by Vercel Function at any point in time.                                                | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Requests Blocked**              | All requests blocked by either the system or user.                                                                        | Count, Count per Second, Percentages                   |
| **ISR Read Units**                | The amount of [Read Units](/docs/pricing/incremental-static-regeneration) used to access ISR data                         | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **ISR Write Units**               | The amount of [Write Units](/docs/pricing/incremental-static-regeneration) used to store new ISR data                     | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **ISR Read/Write**                | The amount of ISR operations                                                                                              | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Time to First Byte**            | The time between the request for a resource and when the first byte of a response begins to arrive.                       | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Function Wall Time**            | The duration that a Vercel Function has run                                                                               | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Firewall Actions**              | The incoming web traffic observed by firewall rules.                                                                      | Sum, Sum per Second, Unique, Percentages,              |
| **Optimizations**                 | The number of image transformations                                                                                       | Sum, Sum per Second, Unique, Percentages,              |
| **Source Size**                   | The source size of image optimizations                                                                                    | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Optimized Size**                | The optimized size of image optimizations                                                                                 | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Compression Ratio**             | The compression ratio of image optimizations                                                                              | Sum, Sum per Second, Min/Max, Percentages, Percentiles |
| **Size Change**                   | The size change of image optimizations                                                                                    | Sum, Sum per Second, Min/Max, Percentages, Percentiles |

### Aggregations

Metrics can be aggregated in the following ways:

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

Aggregations are calculated within each point on the chart (hourly, daily, etc) and also across the entire query window.

## Filter

The filter bar defines the conditions to filter your query data. It only fetches data that meets a specified condition based on several [fields](/docs/query/monitoring/monitoring-reference#group-by-and-where-fields) and operators:

| **Operator**                  | **Description**                                                                                              |     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | --- |
| `is`, `is not`                | The operator that allows you to specify a single value                                                       |
| `is any of `, `is not any of` | The operator that allows you to specify multiple values. For example, `host in ('vercel.com', 'nextjs.com')` |
| `startsWith`                  | Filter data values that begin with some specific characters                                                  |
| `endsWith`                    | Filter data values that end with specific characters                                                         |
| `>,>=,<,<=`                   | Numerical operators that allow numerical comparisons                                                         |

## Group by

The `Group By` clause calculates statistics for each combination of [field](#group-by-and-where-fields) values. Each group is displayed as a separate color in the chart view, and has a separate row in the table view.

For example, grouping by `Request HostName` and `HTTP Status` will display data broken down by each combination of `Request Hostname` and `HTTP Status`.

## Group by and where fields

There are several fields available for use within the [Filter](#filter) and [group by](#group-by):

| **Field Name**      | **Description**                                                                                                                                                                                                                                                                  |     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `Request Hostname`  | Group by the request's domains and subdomains                                                                                                                                                                                                                                    |
| `project`           | Group by the request's project                                                                                                                                                                                                                                                   |
| `Deployment ID`     | Group by the request's deployment ID                                                                                                                                                                                                                                             |
| `HTTP Status`       | Group by the request's HTTP response code                                                                                                                                                                                                                                        |
| `route`             | The mapped path used by the request. For example, if you have a dynamic route like `/blog/[slug]` and a blog post is `/blog/my-blog-post`, the `route` is `/blog/[slug]`                                                                                                         |
| `Request Path`      | The path used by the request. For example, if you have a dynamic route like `/blog/[slug]` and a blog post is `/blog/my-blog-post`, the `request_path` is `/blog/my-blog-post`                                                                                                   |
| `Cache Result`      | The [cache](/docs/cdn-cache#x-vercel-cache) status for the request                                                                                                                                                                                                               |
| `environment`       | Group by the environment (`production` or [`preview`](/docs/deployments/environments#preview-environment-pre-production))                                                                                                                                                        |
| `Request Method`    | Group by the HTTP request method (`GET`, `POST`, `PUT`, etc.)                                                                                                                                                                                                                    |
| `Referrer URL`      | Group by the HTTP referrer URL                                                                                                                                                                                                                                                   |
| `Referrer Hostname` | Group by the HTTP referrer domain                                                                                                                                                                                                                                                |
| `Client IP`         | Group by the request's IP address                                                                                                                                                                                                                                                |
| `Client IP Country` | Group by the request's IP country                                                                                                                                                                                                                                                |
| `Client User Agent` | Group by the request's user agent                                                                                                                                                                                                                                                |
| `AS Number`         | The [autonomous system number (ASN)](# "ASN") for the request. This is related to what network the request came from (either a home network or a cloud provider) |
| `CDN Region`        | Group by the [region](/docs/regions) the request was routed to                                                                                                                                                                                                                   |
| `ISR Cache Region`  | Group by the ISR cache region                                                                                                                                                                                                                                                    |
| `Cache Result`      | Group by cache result                                                                                                                                                                                                                                                            |
| `WAF Action`        | Group by the WAF action taken by the [Vercel Firewall](/docs/security/vercel-waf) (`deny`, `challenge`, `rate_limit`, `bypass` or `log`)                                                                                                                                         |
| `WAF Rule ID`       | Group by the firewall rule ID                                                                                                                                                                                                                                                    |
| `Skew Protection`   | When `active`, the request would have been subject to [version skew](/docs/skew-protection) but was protected, otherwise `inactive`.                                                                                                                                             |


---

[View full sitemap](/docs/sitemap)
