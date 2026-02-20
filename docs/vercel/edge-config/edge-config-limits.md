---
title: Edge Config Limits and pricing
product: vercel
url: /docs/edge-config/edge-config-limits
type: reference
prerequisites:
  - /docs/edge-config
related:
  - /docs/pricing/edge-config
  - /docs/edge-config/edge-config-dashboard
  - /docs/edge-config/using-edge-config
  - /docs/functions/edge-config
  - /docs/edge-config/vercel-api
summary: Learn about the Edge Configs limits and pricing based on account plans.
---

# Edge Config Limits and pricing

An [Edge Config](/edge-config) is a global data store that [enables experimentation with feature flags, A/B testing, critical redirects, and IP blocking](/edge-config#use-cases). It enables you to read data in the region closest to the user without querying an external database or hitting upstream servers.

Keep the number of stores to a minimum. Fewer large stores improve your overall latency.

## Pricing

The following table outlines the price for each resource according to the plan you are on:

## Limits by plan

The following table outlines the limits for each resource according to the plan you are on:

|                                                                                                         | Hobby                     | Pro                       | Enterprise                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [**Maximum store size**](#maximum-store-size)                                                           | 8 KB                      | 64 KB                     | 512 KBCan request higher limit by [contacting customer success](/help) |
| [**Maximum number of stores (total)**](#maximum-number-of-stores)                                       | 1                         | 3                         | 10Can request higher limit by [contacting customer success](/help)     |
| [**Maximum number of stores connected to a project**](#maximum-number-of-stores-connected-to-a-project) | 1                         | 3                         | 3                                                                                                                   |
| [**Maximum item key name length**](#maximum-item-key-name-length)                                       | 256 characters            | 256 characters            | 256 characters                                                                                                      |
| [**Write propagation**](#write-propagation)                                            | Up to 10 seconds globally | Up to 10 seconds globally | Up to 10 seconds globally                                                                                           |
| [**Backup retention**](#backup-retention)                                                               | 7 days                    | 90 days                   | 365 days                                                                                                            |

## Usage

The table below shows the metrics for the [**Edge Config**](/docs/pricing/edge-config) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

See the [manage and optimize Edge Config usage](/docs/pricing/edge-config) section for more information on how to optimize your usage.

### Reads

Reads indicate how often your project has requested access to Edge Config to retrieve data through the SDK or the REST API. Vercel counts it as one read, regardless of whether you retrieve one or all items.

### Writes

Writes represent how often you updated your Edge Config through the SDK or the REST API.

### Maximum store size

The maximum store size represents the total size limit of **each** Edge Config store, including all keys and values of the document.

### Maximum number of stores

The maximum number of stores represents the total number of Edge Config stores that you can create for your account or team.

### Maximum number of stores connected to a project

The maximum number of stores connected to a project represents the total number of Edge Config stores that you can connect to a single project. Exceeding this amount will result in an [error](/docs/edge-config/edge-config-limits#edge-config-limit-reached).

### Maximum item key name length

Each key name in your Edge Config can be up to 256 characters long. The key name must adhere to the regex pattern `^[\w-]+$`, which is equivalent to `/^[A-Za-z0-9_-]+$/`, and allows A-Z, a-z, 0-9, `_`, and `-`.

### Write propagation

When updating an item in your Edge Config, it may take up to 10 seconds for the update to be globally propagated. You should avoid using Edge Configs for frequently updated data or data that needs to be accessed immediately after updating.

### Backup retention

Backups are automatically saved when you make any changes, allowing you to [restore](/docs/edge-config/edge-config-dashboard#restoring-edge-config-backups) to a previous version. See the table above to learn about how long backups are saved for.

To learn more about backups, see [Edge Config backups](/docs/edge-config/using-edge-config#edge-config-backups)

## Reviewing Edge Config reads

The **Reads** chart shows the number of times your [Edge Config](/docs/functions/edge-config) has been read. You can filter the data by **Count** or **Projects**.

### Optimizing Edge Config reads

- Select the **Project** tab to identify which project has the most Edge Config reads
- Review how you access the stores through both the [REST API](/docs/edge-config/vercel-api) and the [SDK](/docs/edge-config/edge-config-sdk). They both count toward your reads
- Where possible, use [`getAll()`](/docs/edge-config/edge-config-sdk#read-multiple-values) instead of separate [`get(key)`](/docs/edge-config/edge-config-sdk#read-a-single-value) calls with the SDK, ensuring they count as a single read.

## Managing Edge Config writes

The **Writes** chart shows the number of times your [Edge Configs](/docs/functions/edge-config) were updated. You can filter the data by **Count** or **Edge Configs**.

### Optimizing Edge Config writes

- Select the **Edge Configs** tab to identify which Edge Config has the most Edge Config writes
- Review your points of updating the stores through the [REST API](/docs/edge-config/vercel-api) as they count towards your writes

## Troubleshooting

If reading from your Edge Config seems slower than expected, ensure that the following are true:

- You've set [the connection string](/docs/edge-config/using-edge-config#using-a-connection-string) as an environment variable
- You are using the [SDK](/docs/edge-config/edge-config-sdk) to read from your Edge Config
- You see the Edge Config icon on the row for the connected environment variable
  on the Environment Variables page of your project settings
- You are testing on your Vercel deployment, as the optimizations happen only
  when you deploy to Vercel

  ![Image](https://vercel.com/docs-assets/static/docs/storage/edge-config/edge-config-env-icon-light.png)

  *Edge Config icon with connected environment variable*
- You are testing your Vercel deployment. The optimizations happen only
  when you deploy to Vercel

### Edge Config Limit reached

**Error**: `Tried to attach 4 Edge Configs. Only 3 can be attached to one Deployment at a time.`

Depending on your plan, you can have up to 10 Edge Config stores created for your account. However, you are limited to a maximum of 3 Edge Config stores connected to any single project.

If you get this error, review your storage by visiting [the Vercel Dashboard](/dashboard), selecting your project, and selecting the **Storage** tab. You can use the search filter to see only your Edge Configs. You will have to disconnect one of the stores and redeploy your project.

To learn how to prevent this error, see [best practices](#edge-config-best-practices).

### Edge Config update rejected

Updates to items in your Edge Config will be rejected if the resulting size of your Edge Config would exceed your account plan's limits. When this happens, all members of your team will receive a [notification](/docs/notifications) from Vercel, whether the error originated in the dashboard, an API request, or an [Integration](/docs/edge-config/integrations). The Edge Config editor in your dashboard can detect many cases where the final size would exceed the limit and warn you upfront without triggering the notification.

To resolve this issue, you can:

- Delete unused entries from your Edge Config to free up space
- [Upgrade your plan](/pricing)
- [Contact sales](/contact/sales) to unlock larger Edge Config store sizes

## Edge Config best practices

- Where possible, having fewer large stores is better than having multiple small stores, as having fewer Edge Config stores requested more often leads to lower overall latency.

## Security

If you are developing locally or self-hosting, your Edge Config is loaded through the public internet network. In this case, you may wonder if it's safe to have the token as a parameter in the connection string.

- **It is safe to have the token as a parameter in the connection string**, because the SDK parses the passed string, then sends the token through an `Authorization` header instead


---

[View full sitemap](/docs/sitemap)
