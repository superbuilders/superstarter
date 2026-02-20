---
title: Vercel Blob Pricing
product: vercel
url: /docs/vercel-blob/usage-and-pricing
type: reference
prerequisites:
  - /docs/vercel-blob
related:
  - /docs/vercel-blob/using-blob-sdk
  - /docs/pricing/networking
  - /docs/cdn
  - /docs/vercel-blob/client-upload
  - /docs/manage-cdn-usage
summary: Learn about the pricing for Vercel Blob.
---

# Vercel Blob Pricing

> **🔒 Permissions Required**: Vercel Blob

## Usage

Vercel Blob usage is measured based on the following:

- **Storage Size**: Monthly average of your blob store size (GB-month)
- **Simple Operations**: Counts when a blob is accessed by its URL and it's a cache MISS or when using the [`head()`](/docs/vercel-blob/using-blob-sdk#head) method
- **Advanced Operations**: Counts when using [`put()`](/docs/vercel-blob/using-blob-sdk#put), [`copy()`](/docs/vercel-blob/using-blob-sdk#copy), or [`list()`](/docs/vercel-blob/using-blob-sdk#list) methods
- **Blob Data Transfer**: Charged when blobs are downloaded or viewed
- **[Edge Requests](/docs/pricing/networking#edge-requests)**: Each blob access by its URL counts as one Edge Request, regardless if it's a MISS or HIT
- **[Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer)**: Applied only for cache MISS scenarios

See the [usage details](#usage-details) and [pricing example](#pricing-example) sections for more information on how usage is calculated.

> **💡 Note:** Stored files are referred to as "blobs" once they're in the storage system,
> following cloud storage terminology.

## Pricing

| Resource | Price |
|----------|-------|
| [Blob Simple Operations](/docs/vercel-blob/usage-and-pricing#pricing) | Regional |
| [Blob Advanced Operations](/docs/vercel-blob/usage-and-pricing#pricing) | Regional |
| [Blob Data Transfer](/docs/vercel-blob/usage-and-pricing#pricing) | Regional |


> **💡 Note:** [Edge Requests](/docs/pricing/networking#edge-requests) and [Fast Origin
> Transfer](/docs/pricing/networking#fast-origin-transfer) for blobs are billed
> at standard [CDN rates](/docs/cdn#pricing). The included resource usage for
> the Hobby plan is shared across all Vercel services in your project.

## Usage details

- Cache HITs do not count as Simple Operations
- Cache HITs do not incur Fast Origin Transfer charges
- The maximum size of a blob in cache is [512 MB](/usage-and-pricing#size-limits). Any blob larger than this will generate a cache MISS on every access, resulting in a Fast Origin Transfer and Edge Request charge each time it is accessed
- Uploads do not incur data transfer charges when using [Client Uploads](/docs/vercel-blob/client-upload)
- Uploads incur [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) charges when using [Server Uploads](/docs/vercel-blob/server-upload) if your Vercel application is the one receiving the file upload
- [Multipart uploads](/docs/vercel-blob/using-blob-sdk#multipart-uploads) count as multiple Advanced Operations: one when starting, one per part, one for completion
- [`del()`](/docs/vercel-blob/using-blob-sdk#del) operations are free
- **Dashboard interactions count as operations**: Each time you interact with the Vercel dashboard to browse your blob store, upload files, or view blob details, these actions count as Advanced Operations and will appear in your usage metrics.

## Private and public storage delivery costs

Private and public Blob stores are priced the same for storage, operations, and uploads. The difference is in how files are delivered, which affects data transfer costs.

**Private blob delivery** (e.g. a 10 KB document served through a [Function](/docs/functions)):

- Your Function fetches the blob from the store, then streams it to the browser
- You pay [Blob Data Transfer](/docs/vercel-blob#blob-data-transfer) + [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer) on cache miss for the Function-to-store fetch, plus [Fast Data Transfer](/docs/cdn) + [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer) for the Function-to-browser response

**Public blob delivery** (e.g. a 150 KB image on a page):

- The browser fetches the blob directly from the store
- You pay [Blob Data Transfer](/docs/vercel-blob#blob-data-transfer) + [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer) on cache miss
- Blob Data Transfer (BDT) is 3x more cost-efficient than Fast Data Transfer (FDT) on average

For full details on how delivery works, see [delivering private blobs](/docs/vercel-blob/private-storage#delivering-private-blobs) and [delivering public blobs](/docs/vercel-blob/public-storage#delivering-public-blobs).

## Hobby

Vercel Blob is free for Hobby users within the [usage limits](#pricing).

Vercel will send you emails as you are nearing your usage limits. You **will not pay for any additional usage**. However, you will not be able to access Vercel Blob if limits are exceeded. In this scenario, you will have to wait until 30 days have passed before using Blob storage again.

## Pro

You pay for usage using your [monthly credit allocation](/docs/plans/pro-plan#credit-and-usage-allocation) which switches to on-demand once you have used your included credits.

Pro teams can [set up Spend Management](/docs/spend-management#managing-your-spend-amount) to get notified or to automatically take action, such as [using a webhook](/docs/spend-management#configuring-a-webhook) or pausing your projects when your usage hits a set spend amount.

## Enterprise

Vercel Blob is available for all Enterprise teams at the same price as Pro. Contact your account team for pricing or support questions.

## Pricing Example

Let's say during one month of usage, you upload 120,000 blobs of which 30% (36,000 blobs) are uploaded using multipart uploads with 5 parts each.
Your storage averages 50 GB and your blobs are downloaded 2.5 million times, with a 70% cache HIT ratio (meaning 30% or 750,000 downloads are cache MISSes), for a total of 350 GB of data transfer.

Here's the cost breakdown:

- **Storage**: 50 GB total - 5 GB included = 45 GB extra at $0.023/GB = $1.04
- **Simple Operations**: 750K (30% cache MISSes of 2.5M downloads + head calls) - 100K included = 650K extra at $0.40/1M = $0.26
- **Advanced Operations**:
  - Single uploads: 84K (70% of 120K blobs)
  - Multipart uploads: 36K × (1 start + 5 parts + 1 completion) = 252K operations
  - Total: 336K - 10K included = 326K extra at $5.00/1M = $1.63
- **Data Transfer** (iad1): 350 GB total - 100 GB included = 250 GB extra at $0.050/GB = $12.50
- **Edge Requests**: 2.5M requests (all downloads) - 10M included = $0.00
- **Fast Origin Transfer** (iad1): 105 GB (30% cache MISSes of 350 GB) - 100 GB included = 5 GB extra at $0.06/GB = $0.30

**Total**: $15.73/month

## Limits

Vercel Blob has certain [limits](/docs/limits) that you should be aware of when designing your application.

### Operation rate limits

| Plan       | Simple Operations | Advanced Operations |
| ---------- | ----------------- | ------------------- |
| Hobby      | 1,200/min (20/s)  | 900/min (15/s)      |
| Pro        | 7,200/min (120/s) | 4,500/min (75/s)    |
| Enterprise | 9,000/min (150/s) | 7,500/min (125/s)   |

**Note:** Rate limits are based on the number of operations, not HTTP requests. For example, when using `del([pathnames])` to delete multiple blobs in one call, each blob deletion counts as a separate operation toward your rate limit. Deleting 100 blobs in a batch counts as 100 operations, not one.

### Size limits

- **Cache Size Limit**: 512 MB per blob
  - Blobs larger than 512 MB will not be cached
  - Accessing these blobs will always count as a cache MISS (generating one [Simple Operation](/docs/vercel-blob#simple-operations))
  - These large blobs will also incur [Fast Origin Transfer](/docs/manage-cdn-usage#fast-origin-transfer) charges for each access

- **Maximum File Size**: 5TB (5,000GB)
  - This is the absolute maximum size for any individual file uploaded to Vercel Blob
  - For files larger than 100MB, we recommend using [multipart uploads](/docs/vercel-blob#multipart-uploads)

## Observability

You can monitor and analyze your Vercel Blob usage with the [Observability tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F~%2Fobservability%2Fblob\&title=Go+to+Blob+Observability) in the Vercel Dashboard.


---

[View full sitemap](/docs/sitemap)
