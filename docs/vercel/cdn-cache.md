---
title: Vercel CDN Cache
product: vercel
url: /docs/cdn-cache
type: conceptual
prerequisites:
  []
related:
  - /docs/regions
  - /docs/headers
  - /docs/cdn-cache/purge
  - /docs/runtime-cache
  - /docs/monorepos/remote-caching
summary: "Vercel's CDN Cache caches your content on Vercel's global network in order to serve data to your users as fast as possible. Learn how Vercel caches..."
---

# Vercel CDN Cache

Vercel's CDN caches your content (including pages, API responses, and static assets) in data centers around the world, closer to your users than your origin server. When someone requests cached content, Vercel serves it from the nearest [region](/docs/regions), cutting latency, reducing load on your origin, and making your site feel faster everywhere.

CDN caching is available for all deployments and domains on your account, regardless of the [pricing plan](https://vercel.com/pricing).

There are two ways to cache content:

- [Static file caching](#static-files-caching) is automatic for all deployments, requiring no manual configuration
- To cache dynamic content, including SSR content, you can use `Cache-Control` [headers](/docs/headers#cache-control-header). Review [How to cache responses](#how-to-cache-responses) to learn more.

To learn about cache keys, manually purging the cache, and the differences between invalidate and delete methods, see [Purging Vercel CDN cache](/docs/cdn-cache/purge)

> **💡 Note:** See [Runtime cache](/docs/runtime-cache) for caching data within your
> functions during execution and [Remote cache](/docs/monorepos/remote-caching)
> for caching build artifacts.

## When to use CDN cache

CDN cache is best when you want to cache complete HTTP responses (entire pages, API responses, or static assets) at the edge, close to your users, such as in the following scenarios:

- Static pages that are the same for all users
- API responses that don't change frequently
- Static assets like images, fonts, and JavaScript bundles
- Server-rendered pages with predictable cache lifetimes

**CDN Cache isn't the right fit when**:

- You need user-specific content without the `Vary` header (consider [Runtime Cache](/docs/runtime-cache))
- Responses include sensitive user data
- Content changes on every request to the same url

## How to cache responses

You can cache responses on Vercel with `Cache-Control` headers defined in:

1. Responses from [Vercel Functions](/docs/functions)
2. Route definitions in `vercel.json` or `next.config.js`

You can use any combination of the above options, but if you return `Cache-Control` headers in a Vercel Function, it will override the headers defined for the same route in `vercel.json` or `next.config.js`.

### Using Vercel Functions

To cache the response of Functions on Vercel's CDN, you must include [`Cache-Control`](/docs/headers#cache-control-header) headers with **any** of the following directives:

- `s-maxage=N`
- `s-maxage=N, stale-while-revalidate=Z`
- `s-maxage=N, stale-while-revalidate=Z, stale-if-error=Z`

> **💡 Note:** `proxy-revalidate` is not currently supported.

The following example demonstrates a [function](/docs/functions) that caches its response and revalidates it every 1 second:

```ts filename="app/api/cache-control-example/route.ts" framework=nextjs-app
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=1',
      'CDN-Cache-Control': 'public, s-maxage=60',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
    },
  });
}
```

```js filename="app/api/cache-control-example/route.js" framework=nextjs-app
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=1',
      'CDN-Cache-Control': 'public, s-maxage=60',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
    },
  });
}
```

```ts filename="pages/api/cache-control-example.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader('Cache-Control', 'public, s-maxage=1');

  return response.status(200).json({ name: 'John Doe' });
}
```

```js filename="pages/api/cache-control-example.js" framework=nextjs
export default function handler(request, response) {
  response.setHeader('Cache-Control', 'public, s-maxage=1');

  return response.status(200).json({ name: 'John Doe' });
}
```

```ts filename="api/cache-control-example.ts" framework=other
import type { VercelResponse } from '@vercel/node';

export default function handler(response: VercelResponse) {
  response.setHeader('Cache-Control', 'public, s-maxage=1');

  return response.status(200).json({ name: 'John Doe' });
}
```

```js filename="api/cache-control-example.js" framework=other
export default function handler(response) {
  response.setHeader('Cache-Control', 'public, s-maxage=1');

  return response.status(200).json({ name: 'John Doe' });
}
```

For direct control over caching on Vercel and downstream CDNs, you can use [CDN-Cache-Control](#cdn-cache-control) headers.

### Using `vercel.json` and `next.config.js`

You can define route headers in `vercel.json` or `next.config.js` files. These headers will be overridden by [headers defined in Function responses](#using-vercel-functions).

The following example demonstrates a `vercel.json` file that adds `Cache-Control` headers to a route:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/about.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=1, stale-while-revalidate=59"
        }
      ]
    }
  ]
}
```

If you're building your app with Next.js, you should use `next.config.js` rather than `vercel.json`. The following example demonstrates a `next.config.js` file that adds `Cache-Control` headers to a route:

```js filename="next.config.js"
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/about',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=1, stale-while-revalidate=59',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

See [the Next docs](https://nextjs.org/docs/app/api-reference/next-config-js) to learn more about `next.config.js`.

### Static Files Caching

Static files are **automatically cached on Vercel's global network** for the lifetime of the deployment after the first request.

- If a static file is unchanged, the cached value can persist across deployments due to the hash used in the filename
- Optimized images cached will persist across deployments for both [static images](/docs/image-optimization#local-images-cache-key) and [remote images](/docs/image-optimization#remote-images-cache-key)

#### Browser

- `max-age=N, public`
- `max-age=N, immutable`

Where `N` is the number of seconds the response should be cached. The response must also meet the [caching criteria](/docs/cdn-cache#how-to-cache-responses).

## Cache control options

You can cache dynamic content through [Vercel Functions](/docs/functions), including SSR, by adding `Cache-Control` [headers](/docs/headers#cache-control-header) to your response. When you specify `Cache-Control` headers in a function, responses will be cached in the region the function was requested from.

See [our docs on Cache-Control headers](/docs/headers#cache-control-header) to learn how to best use `Cache-Control` directives on Vercel's CDN.

### CDN-Cache-Control

Vercel supports two [Targeted Cache-Control headers](https://httpwg.org/specs/rfc9213.html "targeted headers for controlling the cache"):

- `CDN-Cache-Control`, which allows you to control the Vercel CDN Cache or other CDN cache *separately* from the browser's cache. The browser will not be affected by this header
- `Vercel-CDN-Cache-Control`, which allows you to specifically control Vercel's Cache. Neither other CDNs nor the browser will be affected by this header

By default, the headers returned to the browser are as follows:

- `Cache-Control`
- `CDN-Cache-Control`

`Vercel-CDN-Cache-Control` headers are not returned to the browser or forwarded to other CDNs.

To learn how these headers work in detail, see [our dedicated headers docs](/docs/headers/cache-control-headers#cdn-cache-control-header).

The following example demonstrates `Cache-Control` headers that instruct:

- Vercel's Cache to have a [TTL](https://en.wikipedia.org/wiki/Time_to_live "TTL – Time To Live") of `3600` seconds
- Downstream CDNs to have a TTL of `60` seconds
- Clients to have a TTL of `10` seconds

```js filename="app/api/cache-control-headers/route.js" framework=nextjs
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=10',
      'CDN-Cache-Control': 'max-age=60',
      'Vercel-CDN-Cache-Control': 'max-age=3600',
    },
  });
}
```

```ts filename="app/api/cache-control-headers/route.ts" framework=nextjs
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=10',
      'CDN-Cache-Control': 'max-age=60',
      'Vercel-CDN-Cache-Control': 'max-age=3600',
    },
  });
}
```

```js filename="app/api/cache-control-headers/route.js" framework=nextjs-app
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=10',
      'CDN-Cache-Control': 'max-age=60',
      'Vercel-CDN-Cache-Control': 'max-age=3600',
    },
  });
}
```

```ts filename="app/api/cache-control-headers/route.ts" framework=nextjs-app
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=10',
      'CDN-Cache-Control': 'max-age=60',
      'Vercel-CDN-Cache-Control': 'max-age=3600',
    },
  });
}
```

```js filename="api/cache-control-headers.js" framework=other
export default function handler(request, response) {
  response.setHeader('Vercel-CDN-Cache-Control', 'max-age=3600');
  response.setHeader('CDN-Cache-Control', 'max-age=60');
  response.setHeader('Cache-Control', 'max-age=10');

  return response.status(200).json({ name: 'John Doe' });
}
```

```ts filename="api/cache-control-headers.ts" framework=other
import type { VercelResponse } from '@vercel/node';

export default function handler(response: VercelResponse) {
  response.setHeader('Vercel-CDN-Cache-Control', 'max-age=3600');
  response.setHeader('CDN-Cache-Control', 'max-age=60');
  response.setHeader('Cache-Control', 'max-age=10');

  return response.status(200).json({ name: 'John Doe' });
}
```

If you set `Cache-Control` without a `CDN-Cache-Control`, the Vercel CDN strips `s-maxage` and `stale-while-revalidate` from the response before sending it to the browser. To determine if the response was served from the cache, check the [`x-vercel-cache`](#x-vercel-cache) header in the response.

### Vary header

The `Vary` response header instructs caches to use specific request headers as part of the cache key. This allows you to serve different cached responses to different users based on their request headers.

> **💡 Note:** The `Vary` header only has an effect when used in combination with
> `Cache-Control` headers that enable caching (such as `s-maxage`). Without a
> caching directive, the `Vary` header has no behavior.

When Vercel's CDN receives a request, it combines the cache key (described in the [Cache Invalidation](#cache-invalidation) section) with the values of any request headers specified in the `Vary` header to create a unique cache entry for each distinct combination.

#### Use cases

> **💡 Note:** Vercel's CDN already includes the `Accept` and `Accept-Encoding` headers as
> part of the cache key by default. You don't need to explicitly include these
> headers in your `Vary` header.

The most common use case for the `Vary` header is content negotiation, serving different content based on:

- User location (e.g., `X-Vercel-IP-Country`)
- Device type (e.g., `User-Agent`)
- Language preferences (e.g., `Accept-Language`)

**Example: Country-specific content**

You can use the `Vary` header with Vercel's `X-Vercel-IP-Country` request header to cache different responses for users from different countries:

```tsx filename="app/api/country-specific/route.ts" framework=nextjs-app
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') || 'unknown';

  // Serve different content based on country
  let content;
  if (country === 'US') {
    content = { message: 'Hello from the United States!' };
  } else if (country === 'GB') {
    content = { message: 'Hello from the United Kingdom!' };
  } else {
    content = { message: `Hello from ${country}!` };
  }

  return Response.json(content, {
    status: 200,
    headers: {
      'Cache-Control': 's-maxage=3600',
      Vary: 'X-Vercel-IP-Country',
    },
  });
}
```

```jsx filename="app/api/country-specific/route.js" framework=nextjs-app
export async function GET(request) {
  const country = request.headers.get('x-vercel-ip-country') || 'unknown';

  // Serve different content based on country
  let content;
  if (country === 'US') {
    content = { message: 'Hello from the United States!' };
  } else if (country === 'GB') {
    content = { message: 'Hello from the United Kingdom!' };
  } else {
    content = { message: `Hello from ${country}!` };
  }

  return Response.json(content, {
    status: 200,
    headers: {
      'Cache-Control': 's-maxage=3600',
      Vary: 'X-Vercel-IP-Country',
    },
  });
}
```

```tsx filename="pages/api/country-specific.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const country = req.headers['x-vercel-ip-country'] || 'unknown';

  // Serve different content based on country
  let content;
  if (country === 'US') {
    content = { message: 'Hello from the United States!' };
  } else if (country === 'GB') {
    content = { message: 'Hello from the United Kingdom!' };
  } else {
    content = { message: `Hello from ${country}!` };
  }

  // Set caching headers
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.setHeader('Vary', 'X-Vercel-IP-Country');

  res.status(200).json(content);
}
```

```jsx filename="pages/api/country-specific.js" framework=nextjs
export default function handler(req, res) {
  const country = req.headers['x-vercel-ip-country'] || 'unknown';

  // Serve different content based on country
  let content;
  if (country === 'US') {
    content = { message: 'Hello from the United States!' };
  } else if (country === 'GB') {
    content = { message: 'Hello from the United Kingdom!' };
  } else {
    content = { message: `Hello from ${country}!` };
  }

  // Set caching headers
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.setHeader('Vary', 'X-Vercel-IP-Country');

  res.status(200).json(content);
}
```

```tsx filename="api/country-specific.ts" framework=other
export default {
  fetch(request) {
    const country = request.headers.get('x-vercel-ip-country') || 'unknown';

    // Serve different content based on country
    let content;
    if (country === 'US') {
      content = { message: 'Hello from the United States!' };
    } else if (country === 'GB') {
      content = { message: 'Hello from the United Kingdom!' };
    } else {
      content = { message: `Hello from ${country}!` };
    }

    return Response.json(content, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=3600',
        Vary: 'X-Vercel-IP-Country',
      },
    });
  },
};
```

```jsx filename="api/country-specific.js" framework=other
export default {
  fetch(request) {
    const country = request.headers.get('x-vercel-ip-country') || 'unknown';

    // Serve different content based on country
    let content;
    if (country === 'US') {
      content = { message: 'Hello from the United States!' };
    } else if (country === 'GB') {
      content = { message: 'Hello from the United Kingdom!' };
    } else {
      content = { message: `Hello from ${country}!` };
    }

    return Response.json(content, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=3600',
        Vary: 'X-Vercel-IP-Country',
      },
    });
  },
};
```

#### Setting the `Vary` header

You can set the `Vary` header in the same ways you set other response headers:

**In Vercel Functions**

```tsx filename="app/api/data/route.ts" framework=nextjs-app
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return Response.json(
    { data: 'This response varies by country' },
    {
      status: 200,
      headers: {
        Vary: 'X-Vercel-IP-Country',
        'Cache-Control': 's-maxage=3600',
      },
    },
  );
}
```

```jsx filename="app/api/data/route.js" framework=nextjs-app
export async function GET(request) {
  return Response.json(
    { data: 'This response varies by country' },
    {
      status: 200,
      headers: {
        Vary: 'X-Vercel-IP-Country',
        'Cache-Control': 's-maxage=3600',
      },
    },
  );
}
```

```tsx filename="pages/api/data.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Vary', 'X-Vercel-IP-Country');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json({ data: 'This response varies by country' });
}
```

```jsx filename="pages/api/data.js" framework=nextjs
export default function handler(req, res) {
  res.setHeader('Vary', 'X-Vercel-IP-Country');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json({ data: 'This response varies by country' });
}
```

```tsx filename="api/data.ts" framework=other
export default {
  fetch(request) {
    return Response.json(
      { data: 'This response varies by country' },
      {
        status: 200,
        headers: {
          Vary: 'X-Vercel-IP-Country',
          'Cache-Control': 's-maxage=3600',
        },
      },
    );
  },
};
```

```jsx filename="api/data.js" framework=other
export default {
  fetch(request) {
    return Response.json(
      { data: 'This response varies by country' },
      {
        status: 200,
        headers: {
          Vary: 'X-Vercel-IP-Country',
          'Cache-Control': 's-maxage=3600',
        },
      },
    );
  },
};
```

**Using `vercel.json`**

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/api/data",
      "headers": [
        {
          "key": "Vary",
          "value": "X-Vercel-IP-Country"
        },
        {
          "key": "Cache-Control",
          "value": "s-maxage=3600"
        }
      ]
    }
  ]
}
```

**Using `next.config.js`**

If you're building your app with Next.js, use `next.config.js`:

```js filename="next.config.js"
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/data',
        headers: [
          {
            key: 'Vary',
            value: 'X-Vercel-IP-Country',
          },
          {
            key: 'Cache-Control',
            value: 's-maxage=3600',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

#### Multiple `Vary` headers

You can specify multiple headers in a single `Vary` value by separating them with commas:

```js
res.setHeader('Vary', 'X-Vercel-IP-Country, Accept-Language');
```

This will create separate cache entries for each unique combination of country and language preference.

#### Best practices

- Use `Vary` headers selectively, as each additional header exponentially increases the number of cache entries. This doesn't directly impact your bill, but can result in more cache misses than desired
- Only include headers that meaningfully impact content generation
- Consider combining multiple variations into a single header value when possible

## Cacheable response criteria

The `Cache-Control` field is an HTTP header specifying caching rules for client (browser) requests and server responses. A cache must obey the requirements defined in the `Cache-Control` header.

For server responses to be successfully cached with Vercel's CDN, the following criteria must be met:

- Request uses `GET` or `HEAD` method.
- Request doesn't contain `Range` header.
- Request doesn't contain `Authorization` header.
- Response uses `200`, `404`, `410`, `301`, `302`, `307` or `308` status code.
- Response doesn't exceed `10MB` in content length.
- Response doesn't contain the `set-cookie` header.
- Response doesn't contain the `private`, `no-cache` or `no-store` directives in the `Cache-Control` header.
- Response doesn't contain `Vary: *` header, which is treated as equivalent to `Cache-Control: private`.

Vercel **doesn't allow bypassing the cache for static files** by design.

## Cache invalidation

To learn about cache keys, manually purging the cache, and the differences between invalidate and delete methods, see [Purging Vercel CDN Cache](/docs/cdn-cache/purge).

## `x-vercel-cache`

The `x-vercel-cache` header is included in HTTP responses to the client, and describes the state of the cache.

See [our headers docs](/docs/headers/response-headers#x-vercel-cache) to learn more.

## Limits

Vercel's CDN Cache is segmented [by region](/docs/regions). The following caching limits apply to [Vercel Function](/docs/functions) responses:

- Max cacheable response size:
  - Streaming functions: **20MB**
  - Non-streaming functions: **10MB**
- Max cache time: **1 year**
  - `s-maxage`
  - `max-age`
  - `stale-while-revalidate`

While you can put the maximum time for server-side caching, cache times are best-effort and not guaranteed. If an asset is requested often, it is more likely to live the entire duration. If your asset is rarely requested (e.g. once a day), it may be evicted from the regional cache.

### `proxy-revalidate` and `stale-if-error`

Vercel doesn't currently support using `proxy-revalidate` and `stale-if-error` for server-side caching.


---

[View full sitemap](/docs/sitemap)
