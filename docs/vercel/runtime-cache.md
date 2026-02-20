---
title: Runtime Cache
product: vercel
url: /docs/runtime-cache
type: conceptual
prerequisites:
  []
related:
  - /docs/cdn-cache
  - /docs/monorepos/remote-caching
  - /docs/regions
  - /docs/functions/functions-api-reference/vercel-functions-package
  - /docs/runtime-cache/data-cache
summary: Vercel Runtime Cache is a specialized cache that stores responses from data fetches in Vercel functions
---

# Runtime Cache

> **🔒 Permissions Required**: Runtime Cache

Runtime cache is a regional, ephemeral cache you can use for storing and retrieving data across Vercel Functions, Routing middleware, and build execution within a Vercel region. It lets you cache data close to where your code runs, reduce duplicate work, and control invalidation with TTLs and tags.

> **💡 Note:** Runtime cache may not share the same cache between build time and runtime depending on whether the region where the build executed matches the runtime region.

- Find out [how runtime cache works](#how-runtime-cache-works)
- [When to use it](#when-to-use-runtime-cache)
- Get started with the [framework-specific examples](#using-runtime-cache)

> **💡 Note:** For caching complete HTTP responses (entire pages, API responses) in Vercel regions, see [CDN cache](/docs/cdn-cache). For caching build artifacts, see [Remote cache](/docs/monorepos/remote-caching).

## When to use runtime cache

Runtime cache is best when your functions fetch the same data multiple times or perform expensive computations that can be reused, such as in the following scenarios:

- API calls that return the same data across multiple requests
- Database queries that don't change frequently
- Expensive computations you want to reuse
- Data fetching in server components or API routes

Runtime cache is not a good fit for:

- User-specific data that differs for each request
- Data that must be fresh on every request
- Complete HTTP responses (use [CDN cache](/docs/cdn-cache) instead)

## How runtime cache works

Runtime cache stores data in a non-durable cache close to where your function executes. Each [region](/docs/regions) where your function runs has its own cache, allowing reads and writes to happen in the same region for low latency. It has the following characteristics:

- **Regional**: Each region has its own cache
- **Isolated**: Runtime cache is isolated per Vercel project and deployment environment (`preview` and `production`)
- **Persistent across deployments**: Cached data persists across deployments and can be invalidated through time-based expiration or by calling `expireTag`
- **Ephemeral**: Each project has a storage limit. When your project reaches this limit, Vercel evicts (removes) the entries that haven't been accessed recently to free up space for new entries
- **Automatic**: When runtime cache is enabled, Vercel handles caching for you
- **Framework-agnostic**: Works with all frameworks

The cache sits between your function and your data source, reducing the need to repeatedly fetch the same data. See [limits and usage](#limits-and-usage) for information on item size, tags per item, and maximum tag length.

## Using runtime cache

You can cache your Vercel function with any framework by using the functions of the helper method [`getCache`](/docs/functions/functions-api-reference/vercel-functions-package#getcache).

### Runtime cache with any framework

This example caches data fetched from the API so that it expires after 1 hour and adds a tag to the cache entry so you can invalidate it later from code:

```ts filename="api/your-function.ts"

import { getCache } from '@vercel/functions';

export default {
  async fetch(request) {
    const cache = getCache();

    // Get a value from cache
    const value = await cache.get('somekey');

    if (value) {
      return new Response(JSON.stringify(value));
    }

    const res = await fetch('https://api.vercel.app/blog');
    const originValue = await res.json();

    // Set a value in cache with TTL and tags
    await cache.set('somekey', originValue, {
      ttl: 3600, // 1 hour in seconds
      tags: ['example-tag'],
    });

    return new Response(JSON.stringify(originValue));
  },
};
```

### Runtime cache with Next.js

With Next.js, you can use runtime cache or data cache in the following ways:

| Next.js version      | Runtime cache                                                                                                                                         | Data cache                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Next.js 16 and above | [`use cache: remote`](#using-use-cache:-remote) or [fetch with `getCache`](/docs/functions/functions-api-reference/vercel-functions-package#getcache) | [fetch with `force-cache`](#using-fetch-with-force-cache)                            |
| Next.js 15           | [fetch with `getCache`](/docs/functions/functions-api-reference/vercel-functions-package#getcache)                                                    | [fetch](/docs/runtime-cache/data-cache) or [`unstable_cache`](#using-unstable_cache) |
| Next.js 14 and below | [fetch with `getCache`](/docs/functions/functions-api-reference/vercel-functions-package#getcache)                                                    | [fetch](/docs/runtime-cache/data-cache)                                              |

### Next.js 16 and above

With Next.js 16, you have two options for runtime caching:

- **`use cache: remote`**: A directive that caches entire functions or components with Runtime cache. Requires enabling `cacheComponents` in your config.
- **`fetch` with `force-cache`**: Caches individual fetch requests without additional configuration with [Data cache](/docs/runtime-cache/data-cache).

#### Using use cache: remote

Use the `use cache: remote` directive at the file, component, or function level to cache the output of a function or component.

> **💡 Note:** `use cache` is in-memory by default. This means that it is ephemeral, and disappears when the instance that served the request is shut down. `use cache: remote` is a declarative way telling the system to store the cached output in a remote cache such Vercel runtime cache.

First, enable the `cacheComponents` flag in your `next.config.ts` file:

```ts filename="next.config.ts"
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

Then, use the `use cache: remote` directive in your code. This example caches data so that it expires after 1 hour and adds a tag to the cache entry so you can invalidate it later from code:

```ts filename="app/page.tsx"
import { cacheLife, cacheTag } from 'next/cache';

export default async function Page() {
  const data = await getData();

  return (
    <main>
      <h1>Data</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}

async function getData() {
  'use cache: remote'
  cacheTag('example-tag')
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/data');
  return response.json();
}
```

You can also use runtime cache in API routes:

```ts filename="app/api/products/route.ts"
import { cacheLife } from 'next/cache';

export async function GET() {
  const data = await getProducts();
  return Response.json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

#### Using fetch with force-cache

If you don't enable `cacheComponents`, you can use `fetch` with `cache: 'force-cache'` to cache individual fetch requests:

```ts filename="app/page.tsx"
export default async function Page() {
  const res = await fetch('https://api.example.com/blog', {
    cache: 'force-cache',
    next: {
      revalidate: 3600, // revalidate in background every hour
      tags: ['blog'],
    },
  });
  const data = await res.json();

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
```

### Next.js 15

In Next.js 15, use the `fetch()` API with `cache: 'force-cache'` or `unstable_cache` for runtime caching with [Data cache](/docs/runtime-cache/data-cache).

#### Using fetch with cache options

Use `cache: 'force-cache'` to persist data in the cache:

```ts filename="app/page.tsx"
export default async function Page() {
  const res = await fetch('https://api.example.com/blog', {
    cache: 'force-cache',
  });
  const data = await res.json();

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
```

For time-based revalidation, combine `cache: 'force-cache'` with the `next.revalidate` option:

```ts filename="app/page.tsx"
export default async function Page() {
  const res = await fetch('https://api.example.com/blog', {
    cache: 'force-cache',
    next: {
      revalidate: 3600, // revalidate in background every hour
    },
  });
  const data = await res.json();

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
```

For tag-based revalidation, combine `cache: 'force-cache'` with the `next.tags` option:

```ts filename="app/page.tsx"
export default async function Page() {
  const res = await fetch('https://api.example.com/blog', {
    cache: 'force-cache',
    next: {
      tags: ['blog'],
    },
  });
  const data = await res.json();

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
```

Then invalidate the cache using `revalidateTag`:

```ts filename="app/actions.ts"
'use server';

import { revalidateTag } from 'next/cache';

export async function invalidateBlog() {
  revalidateTag('blog');
}
```

#### Using unstable\_cache

For non-fetch data sources, use `unstable_cache`:

```ts filename="app/page.tsx"
import { unstable_cache } from 'next/cache';

const getCachedData = unstable_cache(
  async () => {
    // Fetch from database, API, or other source
    const data = await db.query('SELECT * FROM posts');
    return data;
  },
  ['posts'], // Cache key
  {
    revalidate: 3600, // 1 hour
    tags: ['posts'],
  }
);

export default async function Page() {
  const data = await getCachedData();

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
```

### Next.js 14 and below

If you're using Next.js 14 or below, see [Data Cache](/docs/runtime-cache/data-cache) for the legacy caching approach or use the framework-agnostic [`getCache`](/docs/functions/functions-api-reference/vercel-functions-package#getcache) function.

### Revalidation

You can control how long data stays cached using the following revalidation options:

#### Time-based revalidation

This example revalidates the cache every hour:

> **💡 Note:** The Next.js examples are for Next.js 15 and above. For Next.js 14 and below, see [Data Cache](/docs/runtime-cache/data-cache).

```ts filename="pages/api/products.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const data = await getProducts();
  return response.status(200).json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheTag('products')
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

```js filename="pages/api/products.js" framework=nextjs
import { cacheLife, cacheTag } from 'next/cache';

export default async function handler(request, response) {
  const data = await getProducts();
  return response.status(200).json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheTag('products')
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

```ts filename="app/api/products/route.ts" framework=nextjs-app
import { cacheLife } from 'next/cache';

export async function GET() {
  const data = await getProducts();
  return Response.json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

```js filename="app/api/products/route.js" framework=nextjs-app
import { cacheLife } from 'next/cache';

export async function GET() {
  const data = await getProducts();
  return Response.json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

```ts filename="api/products.ts" framework=other
import { getCache } from '@vercel/functions';

export default {
  async fetch(request: Request) {
    const cache = getCache();

    // Try to get from cache
    const cachedData = await cache.get('products');

    if (cachedData) {
      return Response.json(cachedData);
    }

    // Fetch from origin
    const response = await fetch('https://api.example.com/products');
    const data = await response.json();

    // Store in cache with TTL
    await cache.set('products', data, {
      ttl: 3600, // 1 hour in seconds
    });

    return Response.json(data);
  },
};
```

```js filename="api/products.js" framework=other
import { getCache } from '@vercel/functions';

export default {
  async fetch(request) {
    const cache = getCache();

    // Try to get from cache
    const cachedData = await cache.get('products');

    if (cachedData) {
      return Response.json(cachedData);
    }

    // Fetch from origin
    const response = await fetch('https://api.example.com/products');
    const data = await response.json();

    // Store in cache with TTL
    await cache.set('products', data, {
      ttl: 3600, // 1 hour in seconds
    });

    return Response.json(data);
  },
};
```

#### Tag-based revalidation

This example associates the `products` tag with the data:

```ts filename="pages/api/products.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const data = await getProducts();
  return response.status(200).json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheTag('products')
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

```js filename="pages/api/products.js" framework=nextjs
import { cacheLife, cacheTag } from 'next/cache';

export default async function handler(request, response) {
  const data = await getProducts();
  return response.status(200).json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheTag('products')
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

```ts filename="app/api/products/route.ts" framework=nextjs-app
import { cacheLife, cacheTag } from 'next/cache';

export async function GET() {
  const data = await getProducts();
  return Response.json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheTag('products')
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

```js filename="app/api/products/route.js" framework=nextjs-app
import { cacheLife, cacheTag } from 'next/cache';

export async function GET() {
  const data = await getProducts();
  return Response.json(data);
}

async function getProducts() {
  'use cache: remote'
  cacheTag('products')
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

```ts filename="api/products.ts" framework=other
import { getCache } from '@vercel/functions';

export default {
  async fetch(request: Request) {
    const cache = getCache();

    // Try to get from cache
    const cachedData = await cache.get('products');

    if (cachedData) {
      return Response.json(cachedData);
    }

    // Fetch from origin
    const response = await fetch('https://api.example.com/products');
    const data = await response.json();

    // Store in cache with TTL and tags
    await cache.set('products', data, {
      ttl: 3600, // 1 hour in seconds
      tags: ['products'],
    });

    return Response.json(data);
  },
};
```

```js filename="api/products.js" framework=other
import { getCache } from '@vercel/functions';

export default {
  async fetch(request) {
    const cache = getCache();

    // Try to get from cache
    const cachedData = await cache.get('products');

    if (cachedData) {
      return Response.json(cachedData);
    }

    // Fetch from origin
    const response = await fetch('https://api.example.com/products');
    const data = await response.json();

    // Store in cache with TTL and tags
    await cache.set('products', data, {
      ttl: 3600, // 1 hour in seconds
      tags: ['products'],
    });

    return Response.json(data);
  },
};
```

You can then revalidate the cache for any data associated with the `products` tag by using the `revalidateTag` function. For example, use a server action:

```ts filename="app/actions.ts"
import { revalidateTag } from 'next/cache';

export async function invalidateProductsCache() {
  revalidateTag('products');
}
```

#### Path-based revalidation

This example revalidates the cache for the `/products` path using a server action:

```ts filename="app/actions.ts"
import { revalidatePath } from 'next/cache';

export async function POST() {
  revalidatePath('/products');
}
```

## Working with CDN cache

Runtime cache can work alongside CDN caching in two ways:

1. **With [Vercel ISR](/docs/incremental-static-regeneration)**: Vercel handles CDN caching for your pages and routes, while runtime cache stores the data fetches within your functions
2. **With manual CDN caching** (shown below): You set `Cache-Control` headers to cache HTTP responses at the CDN, while runtime cache stores data fetches within your functions

This section covers the manual approach. If you're using [Vercel ISR](/docs/incremental-static-regeneration), runtime cache operates independently as described in [limits and usage](#limits-and-usage).

When you've set up runtime cache with a serverless function and manual CDN caching, the following happens:

1. Your function runs and checks the runtime cache in the region where it is executed for data
2. If that region's runtime cache has the data, it returns the data immediately
3. If not, your function fetches the data from origin and stores it in that region's runtime cache
4. Your function generates a response using the data
5. If you configured [CDN cache](/docs/cdn-cache) via `Cache-Control` headers, it will cache the complete response in [Vercel regions](/docs/regions)

This example uses runtime cache to fetch and cache product data, and CDN cache to cache the complete API response:

```ts filename="app/api/products/route.ts"
import { cacheLife } from 'next/cache';

export async function GET() {
  const products = await getProducts();

  return new Response(JSON.stringify(products), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60', // CDN caches for 60 seconds
    },
  });
}

async function getProducts() {
  'use cache: remote' // Runtime cache
  cacheLife({ expire: 3600 }) // 1 hour

  const response = await fetch('https://api.example.com/products');
  return response.json();
}
```

In this example:

- Runtime cache stores product data in the region for 1 hour (3600 seconds)
- CDN cache stores the complete HTTP response in the regional cache for 60 seconds
- If the CDN cache expires, the function runs but can still use runtime-cached data
- If both caches expire, the function fetches fresh data from the origin

## Observability

You can observe your project's Runtime cache usage in the [**Runtime Cache**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fobservability%2Fruntime-cache\&title=Go+to+Runtime+cache+Observability) section of the [**Observability**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability\&title=Try+Observability) tab under your project in the Vercel dashboard.

The **Runtime Cache** section provides graphs for:

- Cache reads and writes
- Cache hit rate
- On-demand revalidations

You can also see a tabular list of runtime cache tags used in your project with cache reads, writes, hit rate, and revalidation times.

## Limits and usage

| Runtime Cache property | Limit     |
| ---------------------- | --------- |
| Item size              | 2 MB      |
| Tags per item          | 64 tags   |
| Maximum tag length     | 256 bytes |

> **💡 Note:** TTL and tag updates aren't reconciled between deployments. If you need to update cache behavior after a deployment, purge the runtime cache or modify the cache key.

Runtime cache operates independently from [Incremental Static Regeneration](/docs/incremental-static-regeneration). If you use both caching layers, manage them separately using their respective invalidation methods or use the same cache tag for both to manage them together.

### Storage and eviction

Each project has a fixed storage limit. When your project reaches this limit, Vercel uses a least recently used (LRU) eviction policy: it removes the entries that haven't been accessed recently first. You can monitor your cache size and eviction activity in the [**Runtime Cache**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fobservability%2Fruntime-cache\&title=Go+to+Runtime+cache+Observability) section of the **Observability** tab.

Usage of runtime cache is charged. Learn more about [pricing](/docs/pricing/regional-pricing).


---

[View full sitemap](/docs/sitemap)
