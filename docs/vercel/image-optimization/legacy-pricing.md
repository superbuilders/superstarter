---
title: Legacy Pricing for Image Optimization
product: vercel
url: /docs/image-optimization/legacy-pricing
type: reference
prerequisites:
  - /docs/image-optimization
related:
  - /docs/image-optimization/limits-and-pricing
  - /docs/manage-cdn-usage
  - /docs/cdn
  - /docs/limits/fair-use-guidelines
  - /docs/errors/platform-error-codes
summary: This page outlines information on the pricing and limits for the source images-based legacy option.
---

# Legacy Pricing for Image Optimization

## Pricing

> **💡 Note:** This legacy pricing option is only available to Enterprise teams
> created before February 18th, 2025, who are given the choice to
> [opt-in](https://vercel.com/d?to=%2F%5Bteam%5D%2F~%2Fsettings%2Fbilling%23image-optimization-new-price\&title=Go+to+Billing+Settings)
> to the [transformation images-based pricing
> plan](/docs/image-optimization/limits-and-pricing) or stay on this legacy
> source images-based pricing plan until the contract expires.

Image Optimization pricing is dependent on your plan and how many unique [source images](#source-images) you have across your projects during your billing period.

| Resource                                           | Price                  |
| -------------------------------------------------- | ---------------------- |
| [Image Optimization Source Images](#source-images) | $5.00 per 1,000 Images |

## Usage

The table below shows the metrics for the Image Optimization section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

Usage is not incurred until an image is requested.

### Source Images

A source image is the value that is passed to the `src` prop. A single source image can produce multiple optimized images. For example:

- Usage: `<Image src="/hero.png" width="700" height="745" />`
- Source image: `/hero.png`
- Optimized image: `/_next/image?url=%2Fhero.png&w=750&q=75`
- Optimized image: `/_next/image?url=%2Fhero.png&w=828&q=75`
- Optimized image: `/_next/image?url=%2Fhero.png&w=1080&q=75`

For example, if you have passed 6000 source images to the `src` prop within the last billing cycle, your bill will be $5 for image optimization.

## Billing

You are billed for the **number of unique [source images](#source-images) requested during the billing period**.

Additionally, charges apply for [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) when optimized images are delivered from Vercel's [CDN](/docs/cdn) to clients.

### Hobby

Image Optimization is free for Hobby users within the [usage limits](/docs/limits/fair-use-guidelines#typical-monthly-usage-guidelines). As stated in the [Fair Usage Policy](/docs/limits/fair-use-guidelines#commercial-usage), Hobby teams are restricted to non-commercial personal use only.

Vercel will send you emails as you are nearing your [usage](#pricing) limits, but you will also be advised of any alerts within the [dashboard](/dashboard).

Once you exceed the limits:

- New [source images](#source-images) will fail to optimize and instead return a runtime error response with [402 status code](/docs/errors/platform-error-codes#402:-deployment_disabled). This will trigger the [`onError`](https://nextjs.org/docs/app/api-reference/components/image#onerror) callback and show the [`alt`](https://nextjs.org/docs/app/api-reference/components/image#alt) text instead of the image
- Previously optimized images have already been cached and will continue to work as expected, without error

You will **not** be charged for exceeding the usage limits, but this usually means your application is ready to upgrade to a [Pro plan](/docs/plans/pro-plan).

If you want to continue using Hobby, read more about [Managing Usage & Costs](/docs/image-optimization/managing-image-optimization-costs) to see how you can disable Image Optimization per image or per project.

### Pro and Enterprise

For Teams on Pro trials, the [trial will end](/docs/plans/pro-plan/trials#post-trial-decision) if your Team uses over 2500 source images. For more information, see the [trial limits](/docs/plans/pro-plan/trials#trial-limitations).

Vercel will send you emails as you are nearing your [usage](#pricing) limits, but you will also be advised of any alerts within the [dashboard](/dashboard). Once your team exceeds the **5000 source images** limit, you will continue to be charged **$5 per 1000 source images** for on-demand usage.

Pro teams can [set up Spend Management](/docs/spend-management#managing-your-spend-amount) to get notified or to automatically take action, such as [using a webhook](/docs/spend-management#configuring-a-webhook) or pausing your projects when your usage hits a set spend amount.

## Limits

For all the images that are optimized by Vercel, the following limits apply:

- The maximum size for an optimized image is **10 MB**, as set out in the [Cacheable Responses limits](/docs/cdn-cache#how-to-cache-responses)
- Each [source image](#source-images) has a maximum width and height of 8192 pixels
- A [source image](#source-images) must be one of the following formats to be optimized: `image/jpeg`, `image/png`, `image/webp`, `image/avif`. Other formats will be served as-is

See the [Fair Usage Policy](/docs/limits/fair-use-guidelines#typical-monthly-usage-guidelines) for typical monthly usage guidelines.


---

[View full sitemap](/docs/sitemap)
