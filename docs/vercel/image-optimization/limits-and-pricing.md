---
title: Limits and Pricing for Image Optimization
product: vercel
url: /docs/image-optimization/limits-and-pricing
type: reference
prerequisites:
  - /docs/image-optimization
related:
  - /docs/image-optimization/legacy-pricing
  - /docs/pricing/regional-pricing
  - /docs/image-optimization
  - /docs/manage-cdn-usage
  - /docs/cdn
summary: This page outlines information on the limits that are applicable when using Image Optimization, and the costs they can incur.
---

# Limits and Pricing for Image Optimization

## Pricing

> **💡 Note:** This is the default pricing option. For Enterprise teams created
> before February 18th, 2025, you will be given the choice to
> [opt-in](https://vercel.com/d?to=%2F%5Bteam%5D%2F~%2Fsettings%2Fbilling%23image-optimization-new-price\&title=Go+to+Billing+Settings)
> to this pricing plan or stay on the [legacy source
> images-based](/docs/image-optimization/legacy-pricing) pricing plan until the contract expires.

Image optimization pricing is dependent on your plan and on specific parameters outlined in the table below. For detailed pricing information for each region, review [Regional Pricing](/docs/pricing/regional-pricing#specific-region-pricing).

| Image Usage                                     | Hobby Included | On-demand Rates                                                                  |
| ----------------------------------------------- | -------------- | -------------------------------------------------------------------------------- |
| [Image transformations](#image-transformations) | 5K/month       | [$0.05 - $0.0812 per 1K](/docs/pricing/regional-pricing#specific-region-pricing) |
| [Image cache reads](#image-cache-reads)         | 300K/month     | [$0.40 - $0.64 per 1M](/docs/pricing/regional-pricing#specific-region-pricing)   |
| [Image cache writes](#image-cache-writes)       | 100K/month     | [$4.00 - $6.40 per 1M](/docs/pricing/regional-pricing#specific-region-pricing)   |

This ensures that you only pay for the optimizations when the images are used instead of the number of images in your project.

## Image transformations

Image transformations are billed for every cache MISS and STALE. The cache key is based on several inputs and differs for [local images cache key](/docs/image-optimization#local-images-cache-key) vs the [remote images cache key](/docs/image-optimization#remote-images-cache-key).

## Image cache reads

The total amount of Read Units used to access the cached image from the global cache, measured in 8KB units.

It is *not* billed for every cache HIT, only when the image needs to be retrieved from the shared global cache.

An image that has been accessed recently (several hours ago) in the same region will be cached in region and does *not* incur this cost.

## Image cache writes

The total amount of Write Units used to store the cached image in the global cache, measured in 8KB units. It is billed for every cache MISS and STALE.

## Billing

You are billed for the number of [Image Transformations](#image-transformations), [Image Cache Reads](#image-cache-reads), and [Image Cache Writes](#image-cache-writes) during the billing period.

Additionally, charges apply for [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) and [Edge Requests](/docs/manage-cdn-usage#edge-requests) when transformed images are delivered from Vercel's [CDN](/docs/cdn) to clients.

### Hobby

Image Optimization is free for Hobby users within the [usage limits](/docs/limits/fair-use-guidelines#typical-monthly-usage-guidelines). As stated in the [Fair Usage Policy](/docs/limits/fair-use-guidelines#commercial-usage), Hobby teams are restricted to non-commercial personal use only.

Vercel will send you emails as you are nearing your [usage](#pricing) limits, but you will also be advised of any alerts within the [dashboard](/dashboard).

Once you exceed the limits:

- New images will fail to optimize and instead return a runtime error response with [402 status code](/docs/errors/platform-error-codes#402:-deployment_disabled). This will trigger the [`onError`](https://nextjs.org/docs/app/api-reference/components/image#onerror) callback and show the [`alt`](https://nextjs.org/docs/app/api-reference/components/image#alt) text instead of the image
- Previously optimized images have already been cached and will continue to work as expected, without error

You will **not** be charged for exceeding the usage limits, but this usually means your application is ready to upgrade to a [Pro plan](/docs/plans/pro-plan).

If you want to continue using Hobby, read more about [Managing Usage & Costs](/docs/image-optimization/managing-image-optimization-costs) to see how you can disable Image Optimization per image or per project.

### Pro and Enterprise

Vercel will send you emails as you are nearing your [usage](#pricing) limits, but you will also be advised of any alerts within the [dashboard](/dashboard).

Pro teams can [set up Spend Management](/docs/spend-management#managing-your-spend-amount) to get notified or to automatically take action, such as [using a webhook](/docs/spend-management#configuring-a-webhook) or pausing your projects when your usage hits a set spend amount.

## Limits

For all the images that are [optimized by Vercel](/docs/image-optimization/managing-image-optimization-costs#measuring-usage), the following limits apply:

- The maximum size for an transformed image is **10 MB**, as set out in the [Cacheable Responses limits](/docs/cdn-cache#how-to-cache-responses)
- Each source image has a maximum width and height of 8192 pixels
- A source image must be one of the following formats to be optimized: `image/jpeg`, `image/png`, `image/webp`, `image/avif`. Other formats will be served as-is

See the [Fair Usage Policy](/docs/limits/fair-use-guidelines#typical-monthly-usage-guidelines) for typical monthly usage guidelines.


---

[View full sitemap](/docs/sitemap)
