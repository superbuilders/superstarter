---
title: Incremental Static Regeneration usage and pricing
product: vercel
url: /docs/incremental-static-regeneration/limits-and-pricing
type: reference
prerequisites:
  - /docs/incremental-static-regeneration
related:
  - /docs/incremental-static-regeneration
  - /docs/functions/configuring-functions/region
  - /docs/pricing/regional-pricing
  - /docs/pricing/incremental-static-regeneration
  - /docs/pricing/manage-and-optimize-usage
summary: This page outlines information on the limits that are applicable to using Incremental Static Regeneration (ISR), and the costs they can incur.
---

# Incremental Static Regeneration usage and pricing

## Pricing

Vercel offers several methods for caching data within Vercel’s managed infrastructure. [Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration) caches your data on the CDN and persists it to durable storage – data reads and writes from durable storage will incur costs.

**ISR Reads and Writes** are priced regionally based on the [Vercel function region(s)](/docs/functions/configuring-functions/region) set at your project level. See the regional [pricing documentation](/docs/pricing/regional-pricing) and [ISR cache region](#isr-cache-region) for more information.

## Usage

The table below shows the metrics for the [**ISR**](/docs/pricing/incremental-static-regeneration) section of the [**Usage** dashboard](/docs/pricing/manage-and-optimize-usage#viewing-usage).

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column. The cost for each metric is based on the request location, see the [pricing section](/docs/incremental-static-regeneration/limits-and-pricing#pricing) and choose the region from the dropdown for specific information.

### Storage

There is no limit on storage for ISR, all the data you write remains cached for the duration you specify. Only you or your team can invalidate this cache—unless it goes unaccessed for 31 days.

### Written data

The total amount of Write Units used to durably store new ISR data, measured in 8KB units.

### Read data

The total amount of Read Units used to access the ISR data, measured in 8KB units.

ISR reads and writes are measured in 8 KB units:

- **Read unit**: One read unit equals 8 KB of data read from the ISR cache
- **Write unit**: One write unit equals 8 KB of data written to the ISR cache

## ISR reads and writes price

**ISR Reads and Writes** are priced regionally based on the [Vercel function region(s)](/docs/functions/configuring-functions/region) set at your project level. See the regional [pricing documentation](/docs/pricing/regional-pricing) and [ISR cache region](#isr-cache-region) for more information.

### ISR cache region

The ISR cache region for your deployment is set at build time and is based on the [default Function region](/docs/functions/configuring-functions/region#setting-your-default-region) set at your project level. If you have multiple regions set, the region that will give you the best [cost](/docs/pricing/regional-pricing) optimization is selected. For example, if `iad1` (Washington, D.C., USA) is one of your regions, it is always selected.

For best performance, set your default Function region (and hence your ISR cache region) to be close to where your users are. Although this may affect your ISR costs, automatic compression of ISR writes will keep your costs down.

## Optimizing ISR reads and writes

You are charged based on the volume of data read from and written to the ISR cache, and the regions where reads and writes occur. To optimize ISR usage, consider the following strategies.

- For content that rarely changes, set a longer [time-based revalidation](/docs/incremental-static-regeneration/quickstart#background-revalidation) interval
- If you have events that trigger data updates, use [on-demand revalidation](/docs/incremental-static-regeneration/quickstart#on-demand-revalidation)

When attempting to perform a revalidation, if the content has no changes from the previous version, no ISR write units will be incurred. This applies to be time-based ISR as well as on-demand revalidation.

If you are seeing writes, this is because the content has changed. Here's how you can debug unexpected writes:

- Ensure you're not using `new Date()` in the ISR output
- Ensure you're not using `Math.random()` in the ISR output
- Ensure any other code which produces a non-deterministic output is not included in the ISR output

## ISR reads chart

You get charged based on the amount of data read from your ISR cache and the region(s) in which the reads happen.

When viewing your ISR read units chart, you can group by:

- **Projects**: To see the number of read units for each project
- **Region**: To see the number of read units for each region

## ISR writes chart

You get charged based on the amount of ISR write units written to your ISR cache and the region(s) in which the writes happen.

When viewing your ISR writes chart, you can group by sum of units to see a total of all writes across your team's projects.

- **Projects**: To see the number of write units for each project
- **Region**: To see the number of write units for each region


---

[View full sitemap](/docs/sitemap)
