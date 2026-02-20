---
title: Public Storage
product: vercel
url: /docs/vercel-blob/public-storage
type: conceptual
prerequisites:
  - /docs/vercel-blob
related:
  - /docs/vercel-blob
  - /docs/cli/blob
  - /docs/storage
  - /docs/vercel-blob/using-blob-sdk
  - /docs/storage/vercel-blob/server-upload
summary: Learn about public storage on Vercel.
---

# Public Storage

> **🔒 Permissions Required**: Vercel Blob

Public Blob stores make files accessible to anyone with the URL. Use public storage for images, videos, large media, and public assets where authentication isn't needed.

See [differences with private storage](/docs/vercel-blob#private-and-public-storage).

## Creating a public Blob store

You can create a public Blob store from the Vercel dashboard or the CLI:

- **Dashboard**:
  1. Go to your project's [**Storage** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fstores\&title=Go+to+Storage)
  2. Select **Create Database**, then choose **Blob**
  3. Select **Continue**, then set the access to **Public**
- **[CLI](/docs/cli/blob)**: Run `vercel blob create-store [name] --access public`

Your project needs a `BLOB_READ_WRITE_TOKEN` environment variable to interact with the store. When you create a Blob store from a project, this variable is added automatically. When you create a store from the team level, you'll need to [connect it to a project](/docs/storage#connecting-a-store-to-a-project) for the environment variable to be added.

## Uploading files

Upload files to a public Blob store using [`put()`](/docs/vercel-blob/using-blob-sdk#put) with `access: 'public'`:

```ts filename="app/api/upload/route.ts"
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file') as File;

  const blob = await put(file.name, file, {
    access: 'public',
  });

  return Response.json(blob);
}
```

See the [server uploads](/docs/storage/vercel-blob/server-upload) and [client uploads](/docs/storage/vercel-blob/client-upload) guides for detailed instructions on uploading files.

## Delivering public blobs

Every file uploaded to a public Blob store gets a URL in the form of `https://<store-id>.public.blob.vercel-storage.com/<pathname>`. You can use this URL directly in your HTML:

### Displaying an image

```html
<img
  src="https://my-store-id.public.blob.vercel-storage.com/avatar.png"
  alt="User avatar"
/>
```

To use [`next/image`](https://nextjs.org/docs/app/api-reference/components/image), add the blob store hostname to your `next.config.js`:

```js filename="next.config.js"
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      new URL('https://my-store-id.public.blob.vercel-storage.com/**'),
    ],
  },
};

module.exports = nextConfig;
```

Then use `Image` instead of `img`:

```jsx
import Image from 'next/image';

<Image
  src="https://my-store-id.public.blob.vercel-storage.com/avatar.png"
  alt="User avatar"
  width={200}
  height={200}
/>
```

> **💡 Note:** `next/image` with direct blob URLs only works with public Blob stores. For
> private blobs, serve files through your [Functions](/docs/functions) using
> [`get()`](/docs/vercel-blob/using-blob-sdk#get) and use the function route URL
> as the image source.

### Linking a file for download

```html
<a href="https://my-store-id.public.blob.vercel-storage.com/report.pdf?download=1">
  Download report
</a>
```

Adding `?download=1` to a blob URL forces a file download, regardless of file type. The SDK also exposes this as the `downloadUrl` property on blob objects. Without it, the URL displays the file in the browser when the MIME type supports it (images, videos, audio, PDFs, plain text, XML, and JSON). All other MIME types automatically trigger a download.

This behavior is controlled by the `content-disposition` header. Vercel Blob sets it to `inline` for displayable types and `attachment` for everything else. This also prevents hosting HTML pages on Vercel Blob.

## Caching

When you request a public blob URL, the content is cached in two places:

1. Vercel's [CDN cache](/docs/cdn-cache)
2. Your browser's cache

Both caches store blobs for up to 1 month by default to ensure optimal performance when serving content. While both systems aim to respect this duration, blobs may occasionally expire earlier.

Vercel will cache blobs up to [512 MB](/docs/vercel-blob/usage-and-pricing#size-limits). Bigger blobs will always be served from the origin (your store).

### Configuring cache duration

You can customize the caching duration using the [`cacheControlMaxAge`](/docs/vercel-blob/using-blob-sdk#put) option in the [`put()`](/docs/storage/vercel-blob/using-blob-sdk#put) and [`handleUpload`](/docs/storage/vercel-blob/using-blob-sdk#handleupload) methods.

The minimum configurable value is 60 seconds (1 minute). This represents the maximum time needed for our cache to update content behind a blob URL. For applications requiring faster updates, consider using a [Vercel function](/docs/functions) instead.

See [caching best practices](/docs/vercel-blob#caching) on the overview page for guidance on updating and overwriting blobs.

### Browser caching with conditional requests

When a browser requests a public blob URL, the CDN automatically includes an `ETag` header in the response. On subsequent requests, the browser sends an `If-None-Match` header with the cached ETag. If the blob hasn't changed, the CDN responds with `304 Not Modified` and the browser uses its cached copy, avoiding a full re-download.

This works automatically for public blobs accessed by URL. You don't need to write any code to benefit from conditional requests.

If you're using [`get()`](/docs/vercel-blob/using-blob-sdk#get) to process public blobs server-side, you can also pass the `ifNoneMatch` option to avoid re-downloading unchanged blobs:

```js
import { get } from '@vercel/blob';

const result = await get('images/hero.png', {
  access: 'public',
  ifNoneMatch: previousEtag,
});

if (result.statusCode === 304) {
  // Blob hasn't changed, use the version you already have
}
```

## SEO and search engine indexing

### Search engine visibility of blobs

While Vercel Blob URLs can be designed to be unique and unguessable (when using `addRandomSuffix: true`), they can still be indexed by search engines under certain conditions:

- If you link to blob URLs from public webpages
- If you embed blob content (images, PDFs, etc.) in indexed content
- If you share blob URLs publicly, even in contexts outside your application

By default, Vercel Blob does not provide a `robots.txt` file or other indexing controls. This means search engines like Google may discover and index your blob content if they find links to it.

### Preventing search engine indexing

If you want to prevent search engines from indexing your blob content, you need to upload a `robots.txt` file directly to your blob store:

1. Go to your [**Storage** page](https://vercel.com/d?to=%2F%5Bteam%5D%2F~%2Fstores\&title=Go+to+Storage) and select your blob store
2. Upload a `robots.txt` file to the root of your blob store with appropriate directives

Example `robots.txt` content to block all crawling of your blob store:

```
User-agent: *
Disallow: /
```

### Removing already indexed blob content

If your blob content has already been indexed by search engines:

1. Verify your website ownership in [Google Search Console](https://search.google.com/search-console/)
2. Upload a `robots.txt` file to your blob store as described above
3. Use the "Remove URLs" tool in Google Search Console to request removal

## Download charges

When a public blob is downloaded, you pay for:

1. **Browser fetches the blob**: [Blob Data Transfer](/docs/vercel-blob#blob-data-transfer) + [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer) on cache miss

Blob Data Transfer is 3x more cost-efficient than [Fast Data Transfer](/docs/cdn) on average, making public storage ideal for large media files like images, videos, and documents.

See [pricing documentation](/docs/vercel-blob/usage-and-pricing) for full details.

## Upload charges

Upload charges depend on your implementation method:

- [Client Uploads](/docs/vercel-blob/client-upload): No data transfer charges for uploads
- [Server Uploads](/docs/vercel-blob/server-upload): [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) charges apply when your Vercel application receives the file

See [pricing documentation](/docs/vercel-blob/usage-and-pricing) for full details.


---

[View full sitemap](/docs/sitemap)
