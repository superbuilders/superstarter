---
title: Data Cache for Next.js
product: vercel
url: /docs/runtime-cache/data-cache
type: conceptual
prerequisites:
  - /docs/runtime-cache
related:
  - /docs/frameworks/nextjs
  - /docs/runtime-cache
  - /docs/cdn-cache
  - /docs/deployments/environments
  - /docs/incremental-static-regeneration
summary: Vercel Data Cache is a specialized cache that stores responses from data fetches in Next.js App Router
---

# Data Cache for Next.js

> **🔒 Permissions Required**: Data Cache

Data cache is a specialized, granular cache introduced with Next.js 13 for storing [segment-level data](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating) while using [Next.js App Router](/docs/frameworks/nextjs). When using [Next.js caching APIs](https://nextjs.org/docs/app/getting-started/caching-and-revalidating) such as `fetch` or `unstable_cache`, Vercel automatically scaffolds globally distributed infrastructure for you with no additional configuration.

- Find out [how Data cache works](#how-data-cache-works)
- [When to use it](#when-to-use-data-cache)
- Get started with the [examples](#using-data-cache)

> **💡 Note:** For Next.js 15 and above, see [Runtime Cache](/docs/runtime-cache) for the recommended caching approach. Data cache is for Next.js 14 and below.

## When to use data cache

Data cache is best when your Next.js App Router pages fetch data that can be reused across requests:

- API calls that return the same data across multiple requests
- Database queries that don't change frequently
- Data fetching in server components or route handlers
- Pages with a mix of static and dynamic data

Data cache is not a good fit for:

- User-specific data that differs for each request
- Data that must be fresh on every request
- Complete HTTP responses (use [CDN Cache](/docs/cdn-cache) instead)
- Next.js 15 and above (use [Runtime Cache](/docs/runtime-cache) instead)

## How Data cache works

Data cache stores data in a regional cache close to where your function executes. It has the following characteristics:

- **Regional**: Every region in which your function runs has an independent cache, so data used in server-side rendering or route handlers is cached close to where the function executes
- **Isolated**: Data cache is isolated per Vercel project and [deployment environment](/docs/deployments/environments) (`production` or `preview`)
- **Persistent across deployments**: Cached data persists across deployments unless you explicitly invalidate it
- **Time-based revalidation**: All cached data can define a revalidation interval, after which the data is marked as stale, triggering a re-fetch from origin
- **On-demand revalidation**: Any data can be triggered for revalidation on-demand, regardless of the revalidation interval. The revalidation propagates to all regions within 300ms
- **Tag-based revalidation**: Next.js allows associating tags with data, which can be used to revalidate all data with the same tag at once with [`revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- **Ephemeral**: Each project has a storage limit. When your project reaches this limit, Vercel evicts (removes) the entries that haven't been accessed recently to free up space for new entries

## Using data cache

When you deploy a Next.js project that uses [App Router](https://nextjs.org/docs/app) to Vercel, data cache is automatically enabled to cache [segment-level data](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating) alongside ISR.

### Time-based revalidation

```ts v0="build" filename="app/page.tsx" framework=nextjs
type BlogPosts = Awaited<ReturnType<typeof getStaticProps>>['props']['blog'];

export default function Page({ blog }: { blog: BlogPosts }) {
  return (
    <main>
      <pre>{JSON.stringify(blog, null, 2)}</pre>
    </main>
  );
}

export async function getStaticProps() {
  const res = await fetch('https://api.vercel.app/blog');
  const blog = await res.json();

  return {
    props: {
      blog,
    },
    revalidate: 3600, // 1 hour
  };
}
```

```js v0="build" filename="app/page.jsx" framework=nextjs
export default function Page({ blog }) {
  return (
    <main>
      <pre>{JSON.stringify(blog, null, 2)}</pre>
    </main>
  );
}

export async function getStaticProps() {
  const res = await fetch('https://api.vercel.app/blog');
  const blog = await res.json();

  return {
    props: {
      blog,
    },
    revalidate: 3600, // 1 hour
  };
}
```

```ts v0="build" filename="app/page.tsx" framework=nextjs-app
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog', {
    next: {
      revalidate: 3600, // 1 hour
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

```js v0="build" filename="app/page.jsx" framework=nextjs-app
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog', {
    next: {
      revalidate: 3600, // 1 hour
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

### Tag-based revalidation

```ts v0="build" filename="app/page.tsx" framework=all
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog', {
    next: {
      tags: ['blog'], // Invalidate with revalidateTag('blog') on-demand
    },
  });
  const data = await res.json();

  return '...';
}
```

```js v0="build" filename="app/page.jsx" framework=all
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog', {
    next: {
      tags: ['blog'], // Invalidate with revalidateTag('blog') on-demand
    },
  });
  const data = await res.json();

  return '...';
}
```

```ts v0="build" filename="app/actions.ts" framework=all
'use server';

import { revalidateTag } from 'next/cache';

export default async function action() {
  revalidateTag('blog');
}
```

```js v0="build" filename="app/actions.js" framework=all
'use server';

import { revalidateTag } from 'next/cache';

export default async function action() {
  revalidateTag('blog');
}
```

### Revalidation behavior

Vercel persists cached data across deployments, unless you explicitly invalidate it using framework APIs like `res.revalidate`, `revalidateTag`, and `revalidatePath`, or by [manually purging the cache](#manually-purging-data-cache). Cache is **not** updated at build time. When invalidated, Vercel updates the data at run time, triggered by the next request to the invalidated path.

When the system triggers a revalidation, Vercel marks the corresponding path or cache tag as stale in every region. The next request to that path or tag, regardless of the region, initiates revalidation and updates the cache globally. Vercel purges and updates the regional cache in all regions within 300ms.

## Manually purging data cache

In some circumstances, you may need to delete all cached data and force revalidation. You can do this by purging the data cache:

1. Under your project, go to the **Settings** tab.
2. In the left sidebar, select **Caches**.
3. In the **Data Cache** section, click **Purge Data Cache**.
4. In the dialog, confirm that you wish to delete and click the **Continue & Purge Data Cache** button.

Purging your data cache will create a temporary increase in request times for users as new data needs to be refetched.

## Observability

You can observe your project's data cache usage in the [**Runtime Cache section of Observability**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fobservability%2Fruntime-cache\&title=Go+to+Observability+Runtime+Cache) tab under your project in the Vercel dashboard. The Runtime Cache tab provides visibility into what's stored in your project's data cache along with insights like your cache hit rate and the number of cache reads, cache writes, and on-demand revalidations.

You can also track data cache usage per request in the [**Logs**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Flogs\&title=Logs+tab) tab under the log's request metrics section.

## Limits and usage

| Data cache property | Limit                               |
| ------------------- | ----------------------------------- |
| Item size           | 2 MB (items larger won't be cached) |
| Tags per item       | 128 tags                            |
| Maximum tag length  | 256 bytes                           |

### Storage and eviction

Each project has a fixed storage limit for cached data. When your project reaches this limit, Vercel uses a least recently used (LRU) eviction policy: it removes the entries that haven't been accessed recently first. You can monitor your cache size and eviction activity in the [**Runtime Cache section of Observability**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fobservability%2Fruntime-cache\&title=Go+to+Observability+Runtime+Cache) tab under your project.

### How data cache works with other caches

Data cache works alongside [Incremental Static Regeneration](/docs/incremental-static-regeneration) (ISR) and [CDN Cache](/docs/cdn-cache):

| Scenario                                      | Cache layer      |
| --------------------------------------------- | ---------------- |
| Entirely static pages                         | ISR              |
| Pages with mix of static and dynamic data     | Data cache + ISR |
| Data fetched during function execution        | Data cache       |
| Complete HTTP responses (images, fonts, etc.) | CDN cache        |

When a page contains entirely static data, Vercel uses ISR to generate the whole page. When a page contains a mix of static and dynamic data, the dynamic data is re-fetched when rendering the page. Data cache stores the static portion to avoid slow origin fetches.

Both Data cache and ISR support time-based revalidation, on-demand revalidation, and tag-based revalidation.

## More resources

- [Explore Vercel regions](/docs/regions)
- [Next.js App Router template](/templates/next.js/app-directory)
- [Learn how Data cache works in Next.js](https://nextjs.org/docs/app/deep-dive/caching#data-cache)


---

[View full sitemap](/docs/sitemap)
