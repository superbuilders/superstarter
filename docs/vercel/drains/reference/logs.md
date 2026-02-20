---
title: Log Drains Reference
product: vercel
url: /docs/drains/reference/logs
type: reference
prerequisites:
  - /docs/drains
related:
  - /docs/drains/using-drains
  - /docs/functions
  - /docs/deployments/configure-a-build
  - /docs/project-configuration
  - /docs/rewrites
summary: Learn about Log Drains - data formats, sources, environments, and security configuration.
---

# Log Drains Reference

Log Drains forward logs from your deployments to external endpoints for storage and analysis. You can configure Log Drains in two ways:

- **[Custom endpoint](/docs/drains/using-drains#custom-endpoint)**: Send logs to any HTTP endpoint you configure
- **[Native integration](/docs/drains/using-drains#native-integrations)**: Use integrations from the Vercel Marketplace like [Dash0](https://vercel.com/marketplace/dash0)

Vercel sends logs to endpoints over HTTPS every time your deployments generate logs. Multiple logs may be batched into a single request when possible to optimize delivery performance. In the dashboard, use **Additional configuration for logs** to control the sources, environments, and sampling rules described below.

## Logs Schema

The following table describes the possible fields that are sent via Log Drains:

| Name                     | Type   | Required | Description                                                            | Example                                                                                                                                                                |
| ------------------------ | ------ | -------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | string | Yes      | Unique identifier for the log entry                                    | `1573817187330377061717300000`                                                                                                                                         |
| `deploymentId`           | string | Yes      | Identifier for the Vercel deployment                                   | `dpl_233NRGRjVZX1caZrXWtz5g1TAksD`                                                                                                                                     |
| `source`                 | enum   | Yes      | Origin of the log                                                      | `build`, `edge`, `lambda`, `static`, `external`, `firewall`, or `redirect`                                                                                             |
| `host`                   | string | Yes      | Hostname of the request                                                | `test.vercel.app`                                                                                                                                                      |
| `timestamp`              | number | Yes      | Unix timestamp when the log was generated                              | 1573817187330                                                                                                                                                          |
| `projectId`              | string | Yes      | Identifier for the Vercel project                                      | `gdufoJxB6b9b1fEqr1jUtFkyavUU`                                                                                                                                         |
| `level`                  | enum   | Yes      | Log severity level                                                     | `info`, `warning`, `error`, or `fatal`                                                                                                                                 |
| `message`                | string | No       | Log message content (may be truncated if over 256 KB)                  | `Adding customer to database...`                                                                                                                                       |
| `buildId`                | string | No       | Identifier for the Vercel build                                        | `bld_cotnkcr76` (only present on build logs)                                                                                                                           |
| `entrypoint`             | string | No       | Entrypoint for the request                                             | `api/index.js`                                                                                                                                                         |
| `destination`            | string | No       | Origin of the external content                                         | `https://vitals.vercel-insights.com/v1` (only on `external` and `redirect` logs)                                                                                       |
| `path`                   | string | No       | Function or dynamic path of the request                                | `/dynamic/[route].json`                                                                                                                                                |
| `type`                   | string | No       | Log output type                                                        | `command`, `stdout`, `stderr`, `exit`, `deployment-state`, `delimiter`, `middleware`, `middleware-invocation`, `edge-function-invocation`, `metric`, `report`, `fatal` |
| `statusCode`             | number | No       | HTTP status code of the request                                        | 200 (`-1` means no response returned and the lambda crashed)                                                                                                           |
| `requestId`              | string | No       | Identifier of the request                                              | `643af4e3-975a-4cc7-9e7a-1eda11539d90`                                                                                                                                 |
| `environment`            | enum   | No       | Deployment environment                                                 | `production` or `preview`                                                                                                                                              |
| `branch`                 | string | No       | Git branch name                                                        | `main`                                                                                                                                                                 |
| `ja3Digest`              | string | No       | JA3 fingerprint digest                                                 | `769c83e5b...`                                                                                                                                                         |
| `ja4Digest`              | string | No       | JA4 fingerprint digest                                                 | `t13d1516h2...`                                                                                                                                                        |
| `edgeType`               | enum   | No       | Type of edge runtime                                                   | `edge-function` or `middleware`                                                                                                                                        |
| `projectName`            | string | No       | Name of the Vercel project                                             | `my-app`                                                                                                                                                               |
| `executionRegion`        | string | No       | Region where the request is executed                                   | `sfo1`                                                                                                                                                                 |
| `traceId`                | string | No       | Trace identifier for distributed tracing                               | `1b02cd14bb8642fd092bc23f54c7ffcd`                                                                                                                                     |
| `spanId`                 | string | No       | Span identifier for distributed tracing                                | `f24e8631bd11faa7`                                                                                                                                                     |
| `trace.id`               | string | No       | Trace                                                                  | `1b02cd14bb8642fd092bc23f54c7ffcd`                                                                                                                                     |
| `span.id`                | string | No       | Span                                                                   | `f24e8631bd11faa7`                                                                                                                                                     |
| `proxy`                  | object | No       | Contains information about proxy requests                              | See proxy fields below                                                                                                                                                 |
| `proxy.timestamp`        | number | Yes\*    | Unix timestamp when the proxy request was made                         | 1573817250172                                                                                                                                                          |
| `proxy.method`           | string | Yes\*    | HTTP method of the request                                             | `GET`                                                                                                                                                                  |
| `proxy.host`             | string | Yes\*    | Hostname of the request                                                | `test.vercel.app`                                                                                                                                                      |
| `proxy.path`             | string | Yes\*    | Request path with query parameters                                     | `/dynamic/some-value.json?route=some-value`                                                                                                                            |
| `proxy.userAgent`        | array  | Yes\*    | User agent strings of the request                                      | `["Mozilla/5.0..."]`                                                                                                                                                   |
| `proxy.region`           | string | Yes\*    | Region where the request is processed                                  | `sfo1`                                                                                                                                                                 |
| `proxy.referer`          | string | No       | Referer of the request                                                 | `*.vercel.app`                                                                                                                                                         |
| `proxy.statusCode`       | number | No       | HTTP status code of the proxy request                                  | 200 (`-1` means revalidation occurred in the background)                                                                                                               |
| `proxy.clientIp`         | string | No       | Client IP address                                                      | `120.75.16.101`                                                                                                                                                        |
| `proxy.scheme`           | string | No       | Protocol of the request                                                | `https`                                                                                                                                                                |
| `proxy.responseByteSize` | number | No       | Size of the response in bytes                                          | 1024                                                                                                                                                                   |
| `proxy.cacheId`          | string | No       | Original request ID when request is served from cache                  | `pdx1::v8g4b-1744143786684-93dafbc0f70d`                                                                                                                               |
| `proxy.pathType`         | string | No       | How the request was served based on its path and project configuration | `func`, `prerender`, `background_func`, `edge`, `middleware`, `streaming_func`, `partial_prerender`, `external`, `static`, `not_found`, `unknown`, `api`               |
| `proxy.pathTypeVariant`  | string | No       | Variant of the path type                                               | `api`                                                                                                                                                                  |
| `proxy.vercelId`         | string | No       | Vercel-specific identifier                                             | `sfo1::abc123`                                                                                                                                                         |
| `proxy.vercelCache`      | enum   | No       | Cache status sent to the browser                                       | `MISS`, `HIT`, `STALE`, `BYPASS`, `PRERENDER`, `REVALIDATED`                                                                                                           |
| `proxy.lambdaRegion`     | string | No       | Region where lambda function executed                                  | `sfo1`                                                                                                                                                                 |
| `proxy.wafAction`        | enum   | No       | Action taken by firewall rules                                         | `log`, `challenge`, `deny`, `bypass`, `rate_limit`                                                                                                                     |
| `proxy.wafRuleId`        | string | No       | ID of the firewall rule that matched                                   | `rule_gAHz8jtSB1Gy`                                                                                                                                                    |

\*Required when `proxy` object is present

## Format

Vercel supports the following formats for Log Drains. You can configure the format when [configuring the Drain destination](/docs/drains/using-drains#configure-destination):

### JSON

Vercel sends logs as JSON arrays containing log objects:

```json
{ "id": "1573817187330377061717300000", "deploymentId": "dpl_233NRGRjVZX1caZrXWtz5g1TAksD", "source": "build", "host": "my-app-abc123.vercel.app", "timestamp": 1573817187330, "projectId": "gdufoJxB6b9b1fEqr1jUtFkyavUU", "level": "info", "message": "Build completed successfully", "buildId": "bld_cotnkcr76", "type": "stdout", "projectName": "my-app" }
{ "id": "1573817250283254651097202070", "deploymentId": "dpl_233NRGRjVZX1caZrXWtz5g1TAksD", "source": "lambda", "host": "my-app-abc123.vercel.app", "timestamp": 1573817250283, "projectId": "gdufoJxB6b9b1fEqr1jUtFkyavUU", "level": "info", "message": "API request processed", "entrypoint": "api/index.js", "requestId": "643af4e3-975a-4cc7-9e7a-1eda11539d90", "statusCode": 200, "path": "/api/users", "executionRegion": "sfo1", "environment": "production", "traceId": "1b02cd14bb8642fd092bc23f54c7ffcd", "spanId": "f24e8631bd11faa7", "trace.id": "1b02cd14bb8642fd092bc23f54c7ffcd", "span.id": "f24e8631bd11faa7", "proxy": { "timestamp": 1573817250172, "method": "GET", "host": "my-app.vercel.app", "path": "/api/users?page=1", "userAgent": ["Mozilla/5.0..."], "referer": "https://my-app.vercel.app", "region": "sfo1", "statusCode": 200, "clientIp": "120.75.16.101", "scheme": "https", "vercelCache": "MISS" } }
```

### NDJSON

Vercel sends logs as newline-delimited JSON objects:

```json
{"id": "1573817187330377061717300000","deploymentId": "dpl_233NRGRjVZX1caZrXWtz5g1TAksD","source": "build","host": "my-app-abc123.vercel.app","timestamp": 1573817187330,"projectId": "gdufoJxB6b9b1fEqr1jUtFkyavUU","level": "info","message": "Build completed successfully","buildId": "bld_cotnkcr76","type": "stdout","projectName": "my-app"}
{"id": "1573817250283254651097202070","deploymentId": "dpl_233NRGRjVZX1caZrXWtz5g1TAksD","source": "lambda","host": "my-app-abc123.vercel.app","timestamp": 1573817250283,"projectId": "gdufoJxB6b9b1fEqr1jUtFkyavUU","level": "info","message": "API request processed","entrypoint": "api/index.js","requestId": "643af4e3-975a-4cc7-9e7a-1eda11539d90","statusCode": 200,"path": "/api/users","executionRegion": "sfo1","environment": "production","traceId": "1b02cd14bb8642fd092bc23f54c7ffcd","spanId": "f24e8631bd11faa7","trace.id": "1b02cd14bb8642fd092bc23f54c7ffcd","span.id": "f24e8631bd11faa7","proxy": {"timestamp": 1573817250172,"method": "GET","host": "my-app.vercel.app","path": "/api/users?page=1","userAgent": ["Mozilla/5.0..."],"referer": "https://my-app.vercel.app","region": "sfo1","statusCode": 200,"clientIp": "120.75.16.101","scheme": "https","vercelCache": "MISS"}}
```

## Log Sources

When you configure a Log Drain, select which sources to collect in **Additional configuration for logs**:

| value      | Details                                                                                                                                                        |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `static`   | Requests to static assets like HTML and CSS files                                                                                                              |
| `lambda`   | Output from Vercel Functions like [API Routes](/docs/functions)                                                                                                |
| `edge`     | Output from Vercel Functions using Edge runtime                                                                                                                |
| `build`    | Output from the [Build Step](/docs/deployments/configure-a-build)                                                                                              |
| `external` | External [rewrites](/docs/project-configuration#rewrites) to a different domain. Includes [cached external rewrites](/docs/rewrites#caching-external-rewrites) |
| `firewall` | Outputs log data from requests denied by [Vercel Firewall](/docs/vercel-firewall) rules                                                                        |
| `redirect` | Requests that are redirected by [redirect rules](/docs/project-configuration#redirects)                                                                        |

## Log Environments

Use the same panel to choose which environments send logs to your drain:

| value        | Details                                                                                                 |
| :----------- | :------------------------------------------------------------------------------------------------------ |
| `production` | Logs from production deployments with assigned domain(s)                                                |
| `preview`    | Logs from deployments accessed through the [generated deployment URL](/docs/deployments/generated-urls) |

## Sampling Rate

Sampling rules let you control how much log data each drain receives. Use them to send the right volume of data for observability and cost targets. To add sampling rules:

1. If no rules exist, click **Add sampling rule**.
2. Choose the environment you want to sample from.
3. Set the sampling percentage.
4. (Optional) Specify a request path prefix. Leave it blank to apply the rule to every path.

Example workflows:

- Launch-day monitoring: sample **100%** of production traffic when you launch a new feature, then decrease to **10%** once traffic stabilizes.
- Static coverage: always collect **5%** from `/docs` so you can spot regressions on a static documentation site.

Rules run from top to bottom. Requests that match a rule use that rule’s sampling rate, and any other requests are dropped. If you do not add rules, the drain forwards **100%** of data to the destination.

## More resources

For more information on Log Drains and how to use them, check out the following resources:

- [Drains overview](/docs/drains)
- [Configure Drains](/docs/drains/using-drains)


---

[View full sitemap](/docs/sitemap)
