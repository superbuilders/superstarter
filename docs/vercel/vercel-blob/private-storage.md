---
title: Private Storage
product: vercel
url: /docs/vercel-blob/private-storage
type: conceptual
prerequisites:
  - /docs/vercel-blob
related:
  - /docs/vercel-blob/using-blob-sdk
  - /docs/cli
  - /docs/vercel-blob
  - /docs/cli/blob
  - /docs/storage
summary: Learn about private storage on Vercel.
---

# Private Storage

> **🔒 Permissions Required**: Vercel Blob

> **💡 Note:** Private storage requires a private Blob store and is available starting with:* `@vercel/blob` [TypeScript SDK](/docs/vercel-blob/using-blob-sdk) >= 2.3
> * `vercel` [Python SDK](https://github.com/vercel/vercel-py) >= 0.5.0
> * `vc` [Vercel CLI](/docs/cli) >= 50.20.0

Private Blob stores require authentication for all read and write operations, ensuring files are only accessible to authenticated requests. Use private storage for sensitive documents, user content, and applications with custom authentication.

See [differences with public storage](/docs/vercel-blob#private-and-public-storage).

## Creating a private Blob store

You can create a private Blob store from the Vercel dashboard or the CLI:

- **Dashboard**:
  1. Go to your project's [**Storage** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fstores\&title=Go+to+Storage)
  2. Select **Create Database**, then choose **Blob**
  3. Select **Continue**, then set the access to **Private**
- **[CLI](/docs/cli/blob)**: Run `vercel blob create-store [name] --access private`

Your project needs a `BLOB_READ_WRITE_TOKEN` environment variable to interact with the store. When you create a Blob store from a project, this variable is added automatically. When you create a store from the team level, you'll need to [connect it to a project](/docs/storage#connecting-a-store-to-a-project) for the environment variable to be added.

## Uploading files

Upload files to a private Blob store using [`put()`](/docs/vercel-blob/using-blob-sdk#put) with `access: 'private'`:

```ts filename="app/api/upload/route.ts"
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file') as File;

  const blob = await put(file.name, file, {
    access: 'private',
  });

  return Response.json(blob);
}
```

See the [server uploads](/docs/storage/vercel-blob/server-upload) and [client uploads](/docs/storage/vercel-blob/client-upload) guides for detailed instructions on uploading files.

## Delivering private blobs

Every file uploaded to a private Blob store gets a URL in the form of `https://<store-id>.private.blob.vercel-storage.com/<pathname>`. This URL is not publicly accessible. You can only fetch its content using the [`get()`](/docs/vercel-blob/using-blob-sdk#get) SDK method or by passing the `BLOB_READ_WRITE_TOKEN` directly (see [accessing without the SDK](#accessing-without-the-sdk)).

To serve private blobs to your users, create a route that authenticates the request, fetches the blob using `get()`, and streams the response. For example, a route like `https://example.com/api/file?pathname=documents/report.pdf`:

```ts filename="app/api/file/route.ts" framework=nextjs-app
import { type NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(request: NextRequest) {
  // Your auth goes here: await authRequest(request)

  const pathname = request.nextUrl.searchParams.get('pathname');

  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
  }

  const result = await get(pathname, { access: 'private' });

  if (result?.statusCode !== 200) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
    },
  });
}
```

```js filename="app/api/file/route.js" framework=nextjs-app
import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(request) {
  // Your auth goes here: await authRequest(request)

  const pathname = request.nextUrl.searchParams.get('pathname');

  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
  }

  const result = await get(pathname, { access: 'private' });

  if (result?.statusCode !== 200) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
    },
  });
}
```

```ts filename="pages/api/file.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';
import { get } from '@vercel/blob';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  // Your auth goes here: await authRequest(request)

  const pathname = request.query.pathname as string;

  if (!pathname) {
    return response.status(400).json({ error: 'Missing pathname' });
  }

  const result = await get(pathname, { access: 'private' });

  if (result?.statusCode !== 200) {
    return response.status(404).send('Not found');
  }

  response.setHeader('Content-Type', result.blob.contentType);
  Readable.fromWeb(result.stream).pipe(response);
}
```

```js filename="pages/api/file.js" framework=nextjs
import { Readable } from 'node:stream';
import { get } from '@vercel/blob';

export default async function handler(request, response) {
  // Your auth goes here: await authRequest(request)

  const { pathname } = request.query;

  if (!pathname) {
    return response.status(400).json({ error: 'Missing pathname' });
  }

  const result = await get(pathname, { access: 'private' });

  if (result?.statusCode !== 200) {
    return response.status(404).send('Not found');
  }

  response.setHeader('Content-Type', result.blob.contentType);
  Readable.fromWeb(result.stream).pipe(response);
}
```

```ts filename="api/file.ts" framework=other
import { get } from '@vercel/blob';

export default async function handler(request: Request) {
  // Your auth goes here: await authRequest(request)

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get('pathname');

  if (!pathname) {
    return new Response(JSON.stringify({ error: 'Missing pathname' }), {
      status: 400,
    });
  }

  const result = await get(pathname, { access: 'private' });

  if (result?.statusCode !== 200) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
    },
  });
}
```

```js filename="api/file.js" framework=other
import { get } from '@vercel/blob';

export default async function handler(request) {
  // Your auth goes here: await authRequest(request)

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get('pathname');

  if (!pathname) {
    return new Response(JSON.stringify({ error: 'Missing pathname' }), {
      status: 400,
    });
  }

  const result = await get(pathname, { access: 'private' });

  if (result?.statusCode !== 200) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
    },
  });
}
```

See the [`get()` API reference](/docs/vercel-blob/using-blob-sdk#get) for full option details and return values.

## Accessing without the SDK

You can access private blobs directly using the `BLOB_READ_WRITE_TOKEN`:

```bash filename="Terminal"
curl https://my-store-id.private.blob.vercel-storage.com/my-file.png \
  -H "Authorization: Bearer $BLOB_READ_WRITE_TOKEN"
```

## Caching

Private blobs have two layers of caching:

1. **CDN cache** (between your [Function](/docs/functions) and the blob store): When your Function fetches a private blob, the request goes through Vercel's [CDN cache](/docs/cdn-cache). If the blob is already cached, no [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer) is charged. You control the CDN cache duration with the [`cacheControlMaxAge`](/docs/vercel-blob/using-blob-sdk#put) option when uploading (defaults to 1 month), the same way as [public blobs](/docs/vercel-blob/public-storage#caching).
2. **Browser cache** (between the browser and your Function): You control this through the `Cache-Control` header on your Function's response.

If you don't set a `Cache-Control` header, Vercel sends `Cache-Control: public, max-age=0, must-revalidate` by default. The browser keeps the response on disk but always revalidates with your server before using it, so your auth logic runs on every request and the user always gets the correct content.

Since you're serving private blobs, we recommend setting `Cache-Control: private, no-cache`. This restricts caching to the browser only while still allowing efficient `304` responses:

```ts
const result = await get(pathname, { access: 'private' });

return new NextResponse(result.stream, {
  headers: {
    'Content-Type': result.blob.contentType,
    'Cache-Control': 'private, no-cache',
  },
});
```

For sensitive data (tokens, banking, PII), use `Cache-Control: private, no-store` instead. Nothing is stored on disk and every request is a full fetch.

### Browser caching with conditional requests

When you set `Cache-Control: private, no-cache`, the browser caches the response but revalidates on every request by sending an `If-None-Match` header with the ETag it received previously. You can forward this header to the blob store to get a `304 Not Modified` response when the blob hasn't changed, avoiding re-downloading the full file:

```ts filename="app/api/file/route.ts" framework=nextjs-app
import { type NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(request: NextRequest) {
  // Your auth goes here: await authRequest(request)

  const pathname = request.nextUrl.searchParams.get('pathname');
  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
  }

  const result = await get(pathname, {
    access: 'private',
    ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
  });

  if (!result) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Blob hasn't changed — tell the browser to use its cached copy
  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      ETag: result.blob.etag,
      'Cache-Control': 'private, no-cache',
    },
  });
}
```

```js filename="app/api/file/route.js" framework=nextjs-app
import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(request) {
  // Your auth goes here: await authRequest(request)

  const pathname = request.nextUrl.searchParams.get('pathname');
  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
  }

  const result = await get(pathname, {
    access: 'private',
    ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
  });

  if (!result) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Blob hasn't changed — tell the browser to use its cached copy
  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      ETag: result.blob.etag,
      'Cache-Control': 'private, no-cache',
    },
  });
}
```

```ts filename="pages/api/file.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';
import { get } from '@vercel/blob';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  // Your auth goes here: await authRequest(request)

  const pathname = request.query.pathname as string;
  if (!pathname) {
    return response.status(400).json({ error: 'Missing pathname' });
  }

  const result = await get(pathname, {
    access: 'private',
    ifNoneMatch: (request.headers['if-none-match'] as string) ?? undefined,
  });

  if (!result) {
    return response.status(404).send('Not found');
  }

  // Blob hasn't changed — tell the browser to use its cached copy
  if (result.statusCode === 304) {
    response.setHeader('ETag', result.blob.etag);
    response.setHeader('Cache-Control', 'private, no-cache');
    return response.status(304).end();
  }

  response.setHeader('Content-Type', result.blob.contentType);
  response.setHeader('ETag', result.blob.etag);
  response.setHeader('Cache-Control', 'private, no-cache');
  Readable.fromWeb(result.stream).pipe(response);
}
```

```js filename="pages/api/file.js" framework=nextjs
import { Readable } from 'node:stream';
import { get } from '@vercel/blob';

export default async function handler(request, response) {
  // Your auth goes here: await authRequest(request)

  const { pathname } = request.query;
  if (!pathname) {
    return response.status(400).json({ error: 'Missing pathname' });
  }

  const result = await get(pathname, {
    access: 'private',
    ifNoneMatch: request.headers['if-none-match'] ?? undefined,
  });

  if (!result) {
    return response.status(404).send('Not found');
  }

  // Blob hasn't changed — tell the browser to use its cached copy
  if (result.statusCode === 304) {
    response.setHeader('ETag', result.blob.etag);
    response.setHeader('Cache-Control', 'private, no-cache');
    return response.status(304).end();
  }

  response.setHeader('Content-Type', result.blob.contentType);
  response.setHeader('ETag', result.blob.etag);
  response.setHeader('Cache-Control', 'private, no-cache');
  Readable.fromWeb(result.stream).pipe(response);
}
```

```ts filename="api/file.ts" framework=other
import { get } from '@vercel/blob';

export default async function handler(request: Request) {
  // Your auth goes here: await authRequest(request)

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get('pathname');
  if (!pathname) {
    return new Response(JSON.stringify({ error: 'Missing pathname' }), {
      status: 400,
    });
  }

  const result = await get(pathname, {
    access: 'private',
    ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
  });

  if (!result) {
    return new Response('Not found', { status: 404 });
  }

  // Blob hasn't changed — tell the browser to use its cached copy
  if (result.statusCode === 304) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      ETag: result.blob.etag,
      'Cache-Control': 'private, no-cache',
    },
  });
}
```

```js filename="api/file.js" framework=other
import { get } from '@vercel/blob';

export default async function handler(request) {
  // Your auth goes here: await authRequest(request)

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get('pathname');
  if (!pathname) {
    return new Response(JSON.stringify({ error: 'Missing pathname' }), {
      status: 400,
    });
  }

  const result = await get(pathname, {
    access: 'private',
    ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
  });

  if (!result) {
    return new Response('Not found', { status: 404 });
  }

  // Blob hasn't changed — tell the browser to use its cached copy
  if (result.statusCode === 304) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      ETag: result.blob.etag,
      'Cache-Control': 'private, no-cache',
    },
  });
}
```

How it works:

1. **First request**: `get()` returns `statusCode: 200` with `stream` and an `ETag`. The browser caches the response.
2. **Subsequent requests**: The browser sends `If-None-Match` with the cached ETag. When forwarded to the blob store, `get()` returns `statusCode: 304` with `stream: null` — no data is re-downloaded.

> **⚠️ Warning:** Avoid caching private blob responses in Vercel's CDN cache (e.g. with
> `s-maxage`) and avoid relying on middleware for auth. While both can work, a
> middleware bug or misconfiguration could expose cached private content to the
> wrong users.Instead, always verify auth directly in your route handler, right next to the
> [`get()`](/docs/vercel-blob/using-blob-sdk#get) call.

See [Cache-Control headers](/docs/headers/cache-control-headers) for more details.

Learn more about [Vercel's CDN cache](/docs/cdn-cache).

## Custom domains

Since private blobs are delivered through your own [Functions](/docs/functions), you can serve them from any custom domain. A common pattern is to create a dedicated Vercel project (e.g. "assets") for blob delivery:

1. Create a new Vercel project with a route handler that serves private blobs (as shown in [delivering private blobs](#delivering-private-blobs))
2. [Connect your private Blob store](/docs/storage#connect-a-store-to-a-project) to this project
3. [Assign a custom domain](/docs/projects/domains/managing-domains) to the project (e.g. `content.mywebsite.com`)

Requests to `content.mywebsite.com/api/file?pathname=documents/report.pdf` will then go through your auth logic and stream the blob to the user.

## SEO and search engine indexing

Private blobs cannot be indexed by search engines since all read access requires authentication.

## Download charges

When serving private blobs through [Functions](/docs/functions), you pay for:

1. **Function fetches the blob from the store**: [Blob Data Transfer](/docs/vercel-blob#blob-data-transfer) + [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer) on cache miss
2. **Function responds to the browser**: [Fast Data Transfer](/docs/cdn) + [Fast Origin Transfer](/docs/pricing/networking#fast-origin-transfer)

Recommendations:

- Private Blob stores are ideal for smaller sensitive files or when you need precise auth control
- We do not recommend serving files larger than 100 MB through private Blob stores unless traffic is low
- For large public media, use [public storage](/docs/vercel-blob/public-storage) which benefits from BDT rates (3x cheaper than FDT)

See [pricing documentation](/docs/vercel-blob/usage-and-pricing) for full details.

## Upload charges

Upload charges depend on your implementation method:

- [Client Uploads](/docs/vercel-blob/client-upload): No data transfer charges for uploads
- [Server Uploads](/docs/vercel-blob/server-upload): [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) charges apply when your Vercel application receives the file

See [pricing documentation](/docs/vercel-blob/usage-and-pricing) for full details.


---

[View full sitemap](/docs/sitemap)
