---
title: Bulk redirects
product: vercel
url: /docs/redirects/bulk-redirects
type: reference
prerequisites:
  - /docs/redirects
related:
  - /docs/redirects/bulk-redirects/getting-started
  - /docs/projects/project-configuration
summary: Learn how to import thousands of simple redirects from CSV, JSON, or JSONL files.
---

# Bulk redirects

> **🔒 Permissions Required**: Bulk Redirects

With bulk redirects, you can handle thousands of simple path-to-path or path-to-URL redirects efficiently. You can configure bulk redirects at deployment time through files in your repository, or at runtime through the dashboard, API, or CLI. They are framework agnostic and Vercel processes them before any other route specified in your deployment.

Use bulk redirects when you have thousands of redirects that do not require wildcard or header matching functionality.

## Using bulk redirects

You can configure bulk redirects at deployment time through source control, or update them immediately through the dashboard, API, or CLI. Use deployment-time redirects when you want redirects versioned with your code, or runtime redirects when you need to make changes quickly without redeploying.

| Method          | Configuration                        | When changes apply | Best for                             |
| --------------- | ------------------------------------ | ------------------ | ------------------------------------ |
| Deployment time | `bulkRedirectsPath` in `vercel.json` | On deploy          | Redirects managed in source control  |
| Runtime         | Dashboard, API, or CLI               | Immediately        | Frequent updates without redeploying |

Visit [Getting Started](/docs/redirects/bulk-redirects/getting-started) to create bulk redirects [with deployments](/docs/redirects/bulk-redirects/getting-started#deployment-time-redirects) or in the [dashboard, API, or CLI](/docs/redirects/bulk-redirects/getting-started#project-redirects).

## Available fields

Each redirect supports the following fields:

| Field                 | Type      | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | --------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`              | `string`  | Yes      | `N/A`   | An absolute path that matches each incoming pathname (excluding query string). Max 2048 characters.Example: `/old-marketing-page`                                                                                                                                                                                                                                                                                                       |
| `destination`         | `string`  | Yes      | `N/A`   | A location destination defined as an absolute pathname or external URL. Max 2048 characters.Example `/new-marketing-page`                                                                                                                                                                                                                                                                                                               |
| `permanent`           | `boolean` | No       | `false  | Toggle between permanent ([308](https://developer.mozilla.org/docs/Web/HTTP/Status/308)) and temporary ([307](https://developer.mozilla.org/docs/Web/HTTP/Status/307)) redirect.                                                                                                                                                                                                                                                                  |
| `statusCode`         |`integer`| No       |`307`  | Specify the exact status code. Can be [301](https://developer.mozilla.org/docs/Web/HTTP/Status/301), [302](https://developer.mozilla.org/docs/Web/HTTP/Status/302), [303](https://developer.mozilla.org/docs/Web/HTTP/Status/303), [307](https://developer.mozilla.org/docs/Web/HTTP/Status/307), or [308](https://developer.mozilla.org/docs/Web/HTTP/Status/308). Overrides permanent when set, otherwise defers to permanent value or default. |
|`caseSensitive`      |`boolean`| No       |`false`| Toggle whether source path matching is case sensitive.                                                                                                                                                                                                                                                                                                                                                                                            |
|`preserveQueryParams`|`boolean`| No       |`false\` | Toggle whether to preserve the query string on the redirect.                                                                                                                                                                                                                                                                                                                                                                                      |

In order to improve space efficiency, all boolean values can be the single characters `t` (true) or `f` (false).

We recommend using status code `307` or `308` to avoid the ambiguity of non `GET` methods, which is necessary when your application needs to redirect a public API.

For complete configuration details and advanced options, see the [`bulkRedirectsPath` configuration reference](/docs/projects/project-configuration#bulkredirectspath).

## Limits and pricing

Each project has a free configurable capacity of bulk redirects, and additional bulk redirect capacity can be purchased in groups of 25,000 redirects by going to the [Advanced section of your project's settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fadvanced\&title=Go+to+Project+Settings+Advanced). At runtime, requests served by bulk redirects are treated like any other request for billing purposes. For more information, see the [pricing page](https://vercel.com/pricing).

- Bulk redirects do not support wildcard or header matching
- Bulk redirects do not work locally while using `vercel dev`
- A maximum of 1,000,000 bulk redirects can be configured per project.


---

[View full sitemap](/docs/sitemap)
