---
title: Vercel Blob
product: vercel
url: /docs/vercel-blob
type: conceptual
prerequisites:
  []
related:
  - /docs/functions
  - /docs/vercel-blob/using-blob-sdk
  - /docs/vercel-blob/private-storage
  - /docs/vercel-blob/public-storage
  - /docs/cli/blob
summary: Vercel Blob is a scalable, and cost-effective object storage service for static assets, such as images, videos, audio files, and more.
---

# Vercel Blob

> **🔒 Permissions Required**: Vercel Blob

## Use cases

[Vercel Blob](/storage/blob) is an object storage service for uploading files at build time or at runtime (for example, when users submit files). Common use cases include:

- Files for display and download such as avatars, screenshots, cover images, and videos
- Large files such as video and audio to take advantage of the global network
- Files that you would normally store in an external file storage solution like Amazon S3. With your project hosted on Vercel, you can readily access and manage these files with Vercel Blob

> **💡 Note:** Stored files are referred to as "blobs" once they're in the storage system,
> following cloud storage terminology.

## Private and public storage

Files are private or public depending on the store you create. The access mode defines how files are accessed and delivered. Use the following table to understand the differences between the two modes:

|              | Private storage                                                                               | Public storage                             |
| ------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Write access | Authenticated                                                                                 | Authenticated                              |
| Read access  | Authenticated (token required)                                                                | Anyone with the URL                        |
| Delivery     | Through your [Functions](/docs/functions) via [`get()`](/docs/vercel-blob/using-blob-sdk#get) | Direct blob URL                            |
| Best for     | Sensitive documents, user content, custom auth                                                | Large media, images, videos, public assets |

> **⚠️ Warning:** It's important to choose the correct access mode for your use case since you cannot change it after the creation of a blob store.

Learn more about [private storage](/docs/vercel-blob/private-storage) and [public storage](/docs/vercel-blob/public-storage).

## Getting started

```js
import { put } from '@vercel/blob';

const blob = await put('avatar.jpg', imageFile, {
  access: 'private' /* or 'public' */
});
```

You can create and manage your Vercel Blob stores from your [account dashboard](/dashboard) or the [Vercel CLI](/docs/cli/blob). You can create blob stores in any of the 20 [regions](/docs/regions#region-list) to optimize performance and meet data residency requirements. You can scope your Vercel Blob stores to your Hobby team or [team](/docs/accounts/create-a-team), and connect them to as many projects as you want.

To get started, see the [server-side](/docs/storage/vercel-blob/server-upload), or [client-side](/docs/storage/vercel-blob/client-upload) quickstart guides. Or visit the full API reference for the [Vercel Blob SDK](/docs/storage/vercel-blob/using-blob-sdk).

## Using Vercel Blob in your workflow

If you'd like to know whether or not Vercel Blob can be integrated into your workflow, it's worth knowing the following:

- You can have one or more Vercel Blob stores per Vercel account
- You can use multiple Vercel Blob stores in one Vercel project
- Each Vercel Blob store can be accessed by multiple Vercel projects
- Read access:
  - With private Blob stores: all read access requires authentication
  - With public Blob stores: blob URLs are accessible to anyone with the link
- To add to or remove from the content of a Blob store, a valid [token](/docs/storage/vercel-blob/using-blob-sdk#read-write-token) is required

### Transferring to another project

If you need to transfer your blob store from one project to another project in the same or different team, review [Transferring your store](/docs/storage#transferring-your-store).

## Caching

Vercel's [CDN cache](/docs/cdn-cache) caches all blobs (private and public) for up to 1 month by default. You can customize this duration with the `cacheControlMaxAge` option when uploading.

The difference is in how the cache is reached:

- **Public blobs**: The browser hits the CDN cache directly. Both the CDN and browser cache the blob. See [public storage caching](/docs/vercel-blob/public-storage#caching) for full details.
- **Private blobs**: Your [Function](/docs/functions) fetches the blob through the CDN, then streams the response to the browser. You separately control browser caching through the `Cache-Control` header on your Function's response. See [private storage caching](/docs/vercel-blob/private-storage#caching) for recommendations.

### Important considerations when updating blobs

When you delete or update (overwrite) a blob, the changes may take up to 60 seconds to propagate through our cache. However, browser caching presents additional challenges:

- While our cache can update to serve the latest content, browsers will continue serving the cached version
- To force browsers to fetch the updated content, add a unique query parameter to the blob URL:

```html
<img
  src="https://1sxstfwepd7zn41q.public.blob.vercel-storage.com/blob-oYnXSVczoLa9yBYMFJOSNdaiiervF5.png?v=123456"
/>
```

For more information about updating existing blobs, see the [overwriting blobs](#overwriting-blobs) section.

### Best practice: Treat blobs as immutable

For optimal performance and to avoid caching issues, consider treating blobs as immutable objects:

- Instead of updating existing blobs, create new ones with different pathnames (or use `addRandomSuffix: true` option)
- This approach avoids unexpected behaviors like outdated content appearing in your application

There are still valid use cases for mutable blobs with shorter cache durations, such as a single JSON file that's updated every 5 minutes with a top list of sales or other regularly refreshed data. For these scenarios, set an appropriate `cacheControlMaxAge` value and be mindful of caching behaviors.

## Overwriting blobs

By default, Vercel Blob prevents you from accidentally overwriting existing blobs by using the same pathname twice. When you attempt to upload a blob with a pathname that already exists, the operation will throw an error.

### Using `allowOverwrite`

To explicitly allow overwriting existing blobs, you can use the `allowOverwrite` option:

```js
const blob = await put('user-profile.jpg', imageFile, {
  access: 'private' /* or 'public' */,
  allowOverwrite: true, // Enable overwriting an existing blob with the same pathname
});
```

This option is available in these methods:

- `put()`
- In client uploads via the `onBeforeGenerateToken()` function

### When to use overwriting

Overwriting blobs can be appropriate for certain use cases:

1. **Regularly updated files**: For files that need to maintain the same URL but contain updated content (like JSON data files or configuration files)
2. **Content with predictable update patterns**: For data that changes on a schedule and where consumers expect updates at the same URL

When overwriting blobs, be aware that due to [caching](#caching), changes won't be immediately visible. The minimum time for changes to propagate is 60 seconds, and browser caches may need to be explicitly refreshed.

### Alternatives to overwriting

If you want to avoid overwriting existing content (recommended for most use cases), you have two options:

1. **Use `addRandomSuffix: true`**: This automatically adds a unique random suffix to your pathnames:

```js
const blob = await put('avatar.jpg', imageFile, {
  access: 'private' /* or 'public' */,
  addRandomSuffix: true, // Creates a pathname like 'avatar-oYnXSVczoLa9yBYMFJOSNdaiiervF5.jpg'
});
```

2. **Generate unique pathnames programmatically**: Create unique pathnames by adding timestamps, UUIDs, or other identifiers:

```js
const timestamp = Date.now();
const blob = await put(`user-profile-${timestamp}.jpg`, imageFile, {
  access: 'private' /* or 'public' */
});
```

## Conditional writes

Conditional writes use the `ifMatch` option to implement optimistic concurrency control. When writing, pass a known ETag from a previous upload, [`get()`](/docs/vercel-blob/using-blob-sdk#get), or [`head()`](/docs/vercel-blob/using-blob-sdk#head) call. The operation only succeeds if the blob hasn't changed since that ETag was issued. If another process modified the blob in between, the ETag won't match and the SDK throws a `BlobPreconditionFailedError`.

This works the same way for both private and public storage, and is available on [`put()`](/docs/vercel-blob/using-blob-sdk#put), [`copy()`](/docs/vercel-blob/using-blob-sdk#copy), and [`del()`](/docs/vercel-blob/using-blob-sdk#del):

```js
import { head, put, BlobPreconditionFailedError } from '@vercel/blob';

// 1. Read the current blob and its ETag
const metadata = await head('config.json');

// 2. Write with the ETag — only succeeds if the blob hasn't changed
try {
  await put('config.json', JSON.stringify(newConfig), {
    access: 'private' /* or 'public' */,
    allowOverwrite: true,
    ifMatch: metadata.etag,
  });
} catch (error) {
  if (error instanceof BlobPreconditionFailedError) {
    // The blob was modified by another process — retry or handle the conflict
  }
  throw error;
}
```

Use conditional writes when multiple processes or users may update the same blob concurrently, such as shared configuration files or collaborative documents.

## Conditional reads

Conditional reads use the `ifNoneMatch` option on [`get()`](/docs/vercel-blob/using-blob-sdk#get) to avoid re-downloading blobs that haven't changed. Pass the ETag you received from a previous response, and if the blob is unchanged, `get()` returns `statusCode: 304` with `stream: null` instead of the full file content.

How conditional reads work depends on how blobs are delivered:

- **Private blobs**: Your [Function](/docs/functions) fetches the blob using `get()` with `ifNoneMatch`, then forwards the `304` or `200` response to the browser. See [browser caching with conditional requests](/docs/vercel-blob/private-storage#browser-caching-with-conditional-requests) for a full example.
- **Public blobs**: The CDN handles conditional requests automatically. When a browser requests a public blob URL, the CDN includes an ETag in the response. On repeat requests, the browser sends `If-None-Match` and the CDN returns `304 Not Modified` when the blob hasn't changed. See [browser caching](/docs/vercel-blob/public-storage#browser-caching-with-conditional-requests) for details.

## Blob Data Transfer

Understanding Blob Data Transfer helps you manage your [usage and pricing](/docs/vercel-blob/usage-and-pricing). Blob Data Transfer applies to **public blob** downloads and to your [Functions](/docs/functions) fetching private blobs from the store. When delivering private blobs to end users, [Fast Data Transfer](/docs/cdn) applies on the Function response. See [delivery costs](/docs/vercel-blob/usage-and-pricing#private-and-public-storage-delivery-costs).

Vercel Blob delivers content through a specialized network optimized for static assets:

- **Region-based distribution**: Content is served from 20 regional hubs strategically located around the world
- **Optimized for non-critical assets**: Well-suited for content "below the fold" that isn't essential for initial page rendering metrics like First Contentful Paint (FCP) or Largest Contentful Paint (LCP)
- **Cost-optimized for large assets**: 3x more cost-efficient than [Fast Data Transfer](/docs/cdn) on average
- **Great for media delivery**: Ideal for large media files like images, videos, and documents

While [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) provides city-level, ultra-low latency, Blob Data Transfer prioritizes cost-efficiency for larger assets where ultra-low latency isn't essential.

Blob Data Transfer fees apply only to downloads (outbound traffic), not uploads. See download charges for [private storage](/docs/vercel-blob/private-storage#download-charges) and [public storage](/docs/vercel-blob/public-storage#download-charges), or the [pricing documentation](/docs/vercel-blob/usage-and-pricing) for full details.

## Upload charges

Client uploads have no data transfer charges. Server uploads incur [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) charges when your Vercel application receives the file. See download and upload charge details on the [private storage](/docs/vercel-blob/private-storage#upload-charges) and [public storage](/docs/vercel-blob/public-storage#upload-charges) pages.

## Choosing your Blob store region

You can create Blob stores in any of the 20 [regions](/docs/regions#region-list). Use the region selector in the dashboard at blob store creation time, or use the [CLI](/docs/cli/blob) with the `--region` option.

Select a region close to your customers and functions to minimize upload time. Region selection also helps meet data regulatory requirements. Vercel Blob [pricing](/docs/vercel-blob/usage-and-pricing) is regionalized, so check the pricing for your selected region.

You cannot change the region once the store is created.

## Simple operations

Simple operations in Vercel Blob are specific read actions counted for billing purposes:

- When the [`head()`](/docs/vercel-blob/using-blob-sdk#head) method is called to retrieve blob metadata
- When a blob is accessed by its URL and it's a cache MISS

A cache MISS occurs when the blob is accessed for the first time or when its previously cached version has expired. Note that blob URL access resulting in a cache HIT does not count as a Simple Operation.

## Advanced operations

Advanced operations in Vercel Blob are write, copy, and listing actions counted for billing purposes:

- When the [`put()`](/docs/vercel-blob/using-blob-sdk#put) method is called to upload a blob
- When the [`upload()`](/docs/vercel-blob/using-blob-sdk#upload) method is used for client-side uploads
- When the [`copy()`](/docs/vercel-blob/using-blob-sdk#copy) method is called to copy an existing blob
- When the [`list()`](/docs/vercel-blob/using-blob-sdk#list) method is called to list blobs in your store

### Dashboard usage counts as operations

Using the Vercel Blob file browser in your dashboard will count as operations. Each time you refresh the blob list, upload files through the dashboard, or view blob details, these actions use the same API methods that count toward your usage limits and billing.

Common dashboard actions that count as operations:

- **Refreshing the file browser**: Uses `list()` to display your blobs
- **Uploading files via dashboard**: Uses `put()` for each file uploaded
- **Viewing blob details**: May trigger additional API calls
- **Navigating folders**: Uses `list()` with different prefixes

If you notice unexpected increases in your operations count, check whether team members are browsing your blob store through the Vercel dashboard.

For [multipart uploads](#multipart-uploads), multiple advanced operations are counted:

- One operation when starting the upload
- One operation for each part uploaded
- One operation for completing the upload

Delete operations using the [`del()`](/docs/vercel-blob/using-blob-sdk#del) are free of charge. They are considered advanced operations for [operation rate limits](/docs/vercel-blob/usage-and-pricing#operation-rate-limits) but not for billing.

## Storage calculation

Vercel Blob measures your storage usage by taking snapshots of your blob store size every 15 minutes and averages these measurements over the entire month to calculate your GB-month usage. This approach accounts for fluctuations in storage as blobs are added and removed, ensuring you're only billed for your actual usage over time, not peak usage.

The Vercel dashboard displays two metrics:

- **Latest value**: The most recent measurement of your blob store size
- **Monthly average**: The average of all measurements throughout the billing period (this is what you're billed for)

**Example:**

1. Day 1: Upload a 2GB file → Store size: 2GB
2. Day 15: Add 1GB file → Store size: 3GB
3. Day 25: Delete 2GB file → Store size: 1GB

Month end billing:

- Latest value: 1GB
- Monthly average: ~2GB (billed amount)

If no changes occur in the following month (no new uploads or deletions), each 15-minute measurement would consistently show 1 GB. In this case, your next month's billing would be exactly 1 GB/month, as your monthly average would equal your latest value.

## Multipart uploads

Vercel Blob supports [multipart uploads](/docs/vercel-blob/using-blob-sdk#multipart-uploads) for large files, which provides significant advantages when transferring substantial amounts of data.

Multipart uploads work by splitting large files into smaller chunks (parts) that are uploaded independently and then reassembled on the server. This approach offers several key benefits:

- **Improved upload reliability**: If a network issue occurs during upload, only the affected part needs to be retried instead of restarting the entire upload
- **Better performance**: Multiple parts can be uploaded in parallel, significantly increasing transfer speed
- **Progress tracking**: More granular upload progress reporting as each part completes

We recommend using multipart uploads for files larger than 100 MB. Both the [`put()`](/docs/vercel-blob/using-blob-sdk#put) and [`upload()`](/docs/vercel-blob/using-blob-sdk#upload) methods handle all the complexity of splitting, uploading, and reassembling the file for you.

For billing purposes, multipart uploads count as multiple advanced operations:

- One operation when starting the upload
- One operation for each part uploaded
- One operation for completing the upload

This approach ensures reliable handling of large files while maintaining the performance and efficiency expected from modern cloud storage solutions.

## Durability and availability

Vercel Blob leverages [Amazon S3](https://aws.amazon.com/s3/) as its underlying storage infrastructure, providing industry-leading durability and availability:

- **Durability**: Vercel Blob offers 99.999999999% (11 nines) durability. This means that even with one billion objects, you could expect to go a hundred years without losing a single one.
- **Availability**: Vercel Blob provides 99.99% (4 nines) availability in a given year, ensuring that your data is accessible when you need it.

These guarantees are backed by [S3's robust architecture](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html), which includes automatic replication and error correction mechanisms.

## Folders and slashes

Vercel Blob has folders support to organize your blobs:

```js
const blob = await put('folder/file.txt', 'Hello World!', { access: 'private' /* or 'public' */ });
```

The path `folder/file.txt` creates a folder named `folder` and a blob named `file.txt`. To list all blobs within a folder, use the [`list`](/docs/storage/vercel-blob/using-blob-sdk#list-blobs) function:

```js
const listOfBlobs = await list({
  cursor,
  limit: 1000,
  prefix: 'folder/',
});
```

You don't need to create folders. Upload a file with a path containing a slash `/`, and Vercel Blob will interpret the slashes as folder delimiters.

In the Vercel Blob file browser on the Vercel dashboard, any pathname with a slash `/` is treated as a folder. However, these are not actual folders like in a traditional file system; they are used for organizing blobs in listings and the file browser.

## Blob sorting and organization

Blobs are returned in **lexicographical order** by pathname (not creation date) when using [`list()`](/docs/vercel-blob/using-blob-sdk#list). Numbers are treated as characters, so `file10.txt` comes before `file2.txt`.

**Sort by creation date:** Include timestamps in pathnames:

```js
const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
await put(`reports/${timestamp}-quarterly-report.pdf`, file, {
  access: 'private' /* or 'public' */
});
```

**Use prefixes for search:** Consider lowercase pathnames for consistent matching:

```js
await put('user-uploads/avatar.jpg', file, { access: 'private' /* or 'public' */ });
const userUploads = await list({ prefix: 'user-uploads/' });
```

For complex sorting, sort results client-side using `uploadedAt` or other properties.

## More resources

- [Private Storage](/docs/vercel-blob/private-storage)
- [Public Storage](/docs/vercel-blob/public-storage)
- [Client Upload Quickstart](/docs/storage/vercel-blob/client-upload)
- [Server Upload Quickstart](/docs/storage/vercel-blob/server-upload)
- [Vercel Blob SDK](/docs/storage/vercel-blob/using-blob-sdk)
- [Vercel Blob CLI](/docs/cli/blob)
- [Vercel Blob Pricing](/docs/vercel-blob/usage-and-pricing)
- [Vercel Blob Security](/docs/storage/vercel-blob/security)
- [Vercel Blob Examples](/docs/storage/vercel-blob/examples)
- [Observability](/docs/observability)


---

[View full sitemap](/docs/sitemap)
