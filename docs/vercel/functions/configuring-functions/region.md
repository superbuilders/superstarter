---
title: Configuring regions for Vercel Functions
product: vercel
url: /docs/functions/configuring-functions/region
type: how-to
prerequisites:
  - /docs/functions/configuring-functions
  - /docs/functions
related:
  - /docs/cdn-cache
  - /docs/regions
  - /docs/pricing/regional-pricing/iad1
  - /docs/project-configuration
  - /docs/functions/runtimes
summary: Learn how to configure regions for Vercel Functions.
---

# Configuring regions for Vercel Functions

The Vercel platform caches all static content in [the CDN](/docs/cdn-cache) by default. This means your users will always get static files like HTML, CSS, and JavaScript served from the region that is closest to them. See the [regions](/docs/regions) page for a full list of our regions.

In a globally distributed application, the physical distance between your function and its data source can impact latency and response times. Therefore, Vercel allows you to specify the region in which your functions execute, ideally close to your data source (such as your [database](/marketplace/category/database)).

- By default, Vercel Functions execute in [*Washington, D.C., USA* (`iad1`)](/docs/pricing/regional-pricing/iad1) **for all new projects** to ensure they are located close to most external data sources, which are hosted on the East Coast of the USA. You can set a new default region through your [project's settings on Vercel](#setting-your-default-region)
- You can define the region in your `vercel.json` using the [`regions` setting](/docs/functions/configuring-functions/region#project-configuration)
- You can set your region in the [Vercel CLI](#vercel-cli)

## Setting your default region

The default Function region is [*Washington, D.C., USA* (`iad1`)](/docs/pricing/regional-pricing/iad1) **for all new projects**.

### Dashboard

To change the default regions in the dashboard:

1. Choose the appropriate project from your [dashboard](/dashboard) on Vercel
2. Navigate to the **Settings** tab
3. From the left side, select **Functions**
4. Use the **Function Regions** accordion to select your project's default regions:

![Image](`/docs-assets/static/docs/concepts/edge-network/regions/function-regions-selection-light.png`)

### Project configuration

To change the default region in your `vercel.json` [configuration file](/docs/project-configuration#regions), add the region code(s) to the `"regions"` key:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sfo1"]
}
```

Additionally, Pro and Enterprise users can deploy Vercel Functions to multiple regions: Pro users can deploy to up to **three** regions, and Enterprise users can deploy to unlimited regions. To learn more, see [location limits](/docs/functions/runtimes#location).

Enterprise users can also use [`functionFailoverRegions`](/docs/project-configuration#functionfailoverregions) to specify regions that a Vercel Function should failover to if the default region is out of service.

### Vercel CLI

Use the `vercel --regions` command in your project's root directory to set a region. Learn more about setting regions with the `vercel --regions` command in the [CLI docs](/docs/cli/deploy#regions).

## Available regions

To learn more about the regions that you can set for your Functions, see the [region list](/docs/regions#region-list).

## Automatic failover

Vercel Functions have multiple availability zone redundancy by default. Multi-region redundancy is available depending on your runtime.

### Node.js runtime failover

> **🔒 Permissions Required**: Setting failover regions

Enterprise teams can enable multi-region redundancy for Vercel Functions using Node.js.

To automatically failover to the closest region in the event of an outage:

1. Select your project from your team's [dashboard](/dashboard)
2. Navigate to the **Settings** tab and select **Functions**
3. Enable the **Function Failover** toggle:

   ![Image](`/docs-assets/static/docs/concepts/functions/function-failover-light.png`)

To manually specify the fallback region, you can pass one or more regions to the [`functionFailoverRegions`](/docs/project-configuration#functionfailoverregions) property in your `vercel.json` file:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functionFailoverRegions": ["dub1", "fra1"]
}
```

The region(s) set in the `functionFailoverRegions` property **must be different** from the default region(s) specified in the [`regions`](/docs/project-configuration#regions) property.

During an automatic failover, Vercel will reroute application traffic to the next closest region, meaning the order of the regions in `functionFailoverRegions` does not matter. For more information on how failover routing works, see [`functionFailoverRegions`](/docs/project-configuration#functionfailoverregions).

You can view your default and failover regions through the [deployment summary](/docs/deployments#resources-tab-and-deployment-summary):

![Image](`/docs-assets/static/docs/concepts/functions/function-failover-region-light.png`)

Region failover is supported with Secure Compute. See [Region Failover](/docs/secure-compute#region-failover) to learn more.


---

[View full sitemap](/docs/sitemap)
