---
title: Speed Insights Drains Reference
product: vercel
url: /docs/drains/reference/speed-insights
type: reference
prerequisites:
  - /docs/drains
related:
  - /docs/drains/using-drains
  - /docs/drains
summary: Learn about Speed Insights Drains - data formats and performance metrics configuration.
---

# Speed Insights Drains Reference

Speed Insights Drains send performance metrics and web vitals from your applications to external endpoints for storage and analysis. To enable Speed Insights Drains, [create a drain](/docs/drains/using-drains) and choose the Speed Insights data type.

Vercel sends Speed Insights data to endpoint URLs over HTTPS when your application collects performance metrics.

## Speed Insights Schema

The following table describes the possible fields that are sent via Speed Insights Drains:

| Name                   | Type   | Description                                 | Example                                          |
| ---------------------- | ------ | ------------------------------------------- | ------------------------------------------------ |
| `schema`               | string | Schema version identifier                   | `vercel.speed_insights.v1`                       |
| `timestamp`            | string | ISO timestamp when the metric was collected | `2023-09-14T15:30:00.000Z`                       |
| `projectId`            | string | Identifier for the Vercel project           | `Qmc52npNy86S8VV4Mt8a8dP1LEkRNbgosW3pBCQytkcgf2` |
| `ownerId`              | string | Identifier for the project owner            | `team_nLlpyC6REAqxydlFKbrMDlud`                  |
| `deviceId`             | number | Unique device identifier                    | 12345                                            |
| `metricType`           | string | Type of performance metric                  | `CLS`, `LCP`, `FID`, `FCP`, `TTFB`, `INP`        |
| `value`                | number | Metric value                                | 0.1                                              |
| `origin`               | string | Origin URL where the metric was collected   | `https://example.com`                            |
| `path`                 | string | URL path where the metric was collected     | `/dashboard`                                     |
| `route`                | string | Route pattern for the page                  | `/dashboard/[id]`                                |
| `country`              | string | Country code of the user                    | `US`                                             |
| `region`               | string | Region code of the user                     | `CA`                                             |
| `city`                 | string | City of the user                            | `San Francisco`                                  |
| `osName`               | string | Operating system name                       | `macOS`                                          |
| `osVersion`            | string | Operating system version                    | `13.4`                                           |
| `clientName`           | string | Client browser name                         | `Chrome`                                         |
| `clientType`           | string | Type of client                              | `browser`                                        |
| `clientVersion`        | string | Client browser version                      | `114.0.5735.90`                                  |
| `deviceType`           | string | Type of device                              | `desktop`                                        |
| `deviceBrand`          | string | Device brand                                | `Apple`                                          |
| `connectionSpeed`      | string | Network connection speed                    | `4g`                                             |
| `browserEngine`        | string | Browser engine name                         | `Blink`                                          |
| `browserEngineVersion` | string | Browser engine version                      | `114.0.5735.90`                                  |
| `scriptVersion`        | string | Speed Insights script version               | `1.0.0`                                          |
| `sdkVersion`           | string | SDK version used to collect metrics         | `2.1.0`                                          |
| `sdkName`              | string | SDK name used to collect metrics            | `@vercel/speed-insights`                         |
| `vercelEnvironment`    | string | Vercel environment                          | `production`                                     |
| `vercelUrl`            | string | Vercel deployment URL                       | `*.vercel.app`                                   |
| `deploymentId`         | string | Identifier for the Vercel deployment        | `dpl_2YZzo1cJAjijSf1hwDFK5ayu2Pid`               |
| `attribution`          | string | Attribution information for the metric      | `attribution-data`                               |

## Format

Vercel supports the following formats for Speed Insights Drains. You can configure the format when [configuring the Drain destination](/docs/drains/using-drains#configure-destination):

### JSON

Vercel sends Speed Insights data as JSON arrays containing metric objects:

```json
[
  { "schema": "vercel.speed_insights.v1", "timestamp": "2023-09-14T15:30:00.000Z", "projectId": "Qmc52npNy86S8VV4Mt8a8dP1LEkRNbgosW3pBCQytkcgf2", "ownerId": "team_nLlpyC6REAqxydlFKbrMDlud", "deviceId": 12345, "metricType": "CLS", "value": 0.1, "origin": "https://example.com", "path": "/dashboard" },
  { "schema": "vercel.speed_insights.v1", "timestamp": "2023-09-14T15:30:05.000Z", "projectId": "Qmc52npNy86S8VV4Mt8a8dP1LEkRNbgosW3pBCQytkcgf2", "ownerId": "team_nLlpyC6REAqxydlFKbrMDlud", "deviceId": 67890, "metricType": "LCP", "value": 2.5, "origin": "https://example.com", "path": "/home" }
]
```

### NDJSON

Vercel sends Speed Insights data as newline-delimited JSON objects:

```json
{"schema": "vercel.speed_insights.v1","timestamp": "2023-09-14T15:30:00.000Z","projectId": "Qmc52npNy86S8VV4Mt8a8dP1LEkRNbgosW3pBCQytkcgf2","ownerId": "team_nLlpyC6REAqxydlFKbrMDlud","deviceId": 12345,"metricType": "CLS","value": 0.1,"origin": "https://example.com","path": "/dashboard"}
{"schema": "vercel.speed_insights.v1","timestamp": "2023-09-14T15:30:05.000Z","projectId": "Qmc52npNy86S8VV4Mt8a8dP1LEkRNbgosW3pBCQytkcgf2","ownerId": "team_nLlpyC6REAqxydlFKbrMDlud","deviceId": 67890,"metricType": "LCP","value": 2.5,"origin": "https://example.com","path": "/home"}
```

## Sampling Rate

When you configure a Speed Insights Drain in the Vercel UI, you can set the sampling rate to control the volume of data sent. This helps manage costs when you have high traffic volumes.

## More resources

For more information on Speed Insights Drains and how to use them, check out the following resources:

- [Drains overview](/docs/drains)
- [Configure Drains](/docs/drains/using-drains)


---

[View full sitemap](/docs/sitemap)
