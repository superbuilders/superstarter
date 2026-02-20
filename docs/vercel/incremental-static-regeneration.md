---
title: Incremental Static Regeneration (ISR)
product: vercel
url: /docs/incremental-static-regeneration
type: reference
prerequisites:
  []
related:
  - /docs/cdn
  - /docs/frameworks/sveltekit
  - /docs/frameworks/nuxt
  - /docs/frameworks/astro
  - /docs/frameworks/gatsby
summary: "Learn how Vercel's Incremental Static Regeneration (ISR) provides better performance and faster builds."
---

# Incremental Static Regeneration (ISR)

> **🔒 Permissions Required**: Incremental Static Regeneration

Incremental Static Regeneration (ISR) allows you to create or update content on your site without redeploying. ISR's main benefits for developers include:

1. **Better Performance:** Static pages can be consistently fast because ISR allows Vercel to cache generated pages in every region on [our global CDN](/docs/cdn) and persist files into durable storage
2. **Reduced Backend Load:** ISR helps reduce backend load by using a durable cache as well as request collapsing during revalidation to make fewer requests to your data sources
3. **Faster Builds:** Pages can be generated when requested by a visitor or through an API instead of during the build, speeding up build times as your application grows

ISR is available to applications built with:

- [Next.js](#using-isr-with-next.js)
- [SvelteKit](/docs/frameworks/sveltekit#incremental-static-regeneration-isr)
- [Nuxt](/docs/frameworks/nuxt#incremental-static-regeneration-isr)
- [Astro](/docs/frameworks/astro#incremental-static-regeneration)
- [Gatsby](/docs/frameworks/gatsby#incremental-static-regeneration)
- Or any custom framework solution that implements the [Build Output API](/docs/build-output-api/v3)

## Using ISR with Next.js

> For \['nextjs']:

Next.js will automatically create a Vercel Function that can revalidate when you use `getStaticProps` with `revalidate`. `getStaticProps` does not have access to the incoming request, which prevents accidental caching of user data for increased security.

> For \['nextjs-app']:

Next.js will automatically create a Vercel Function that can revalidate when you add `next: { revalidate: 10 }` to the options object passed to a `fetch` request.

The following example demonstrates a Next.js page that uses ISR to render a list of blog posts:

```ts v0="build" filename="pages/blog-posts/index.tsx" framework=nextjs
export async function getStaticProps() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = await res.json();

  return {
    props: {
      posts,
    },
    revalidate: 10,
  };
}

interface Post {
  title: string;
  id: number;
}

export default function BlogPosts({ posts }: { posts: Post[] }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

```js v0="build" filename="pages/blog-posts/index.jsx" framework=nextjs
export async function getStaticProps() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = await res.json();

  return {
    props: {
      posts,
    },
    revalidate: 10,
  };
}

export default function BlogPosts({ posts }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

```ts v0="build" filename="app/blog-posts/page.tsx" framework=nextjs-app
export const revalidate = 10; // seconds

interface Post {
  title: string;
  id: number;
}

export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = (await res.json()) as Post[];
  return (
    <ul>
      {posts.map((post: Post) => {
        return <li key={post.id}>{post.title}</li>;
      })}
    </ul>
  );
}
```

```js v0="build" filename="app/blog-posts/page.jsx" framework=nextjs-app
export const revalidate = 10; // seconds

export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = await res.json();

  return (
    <ul>
      {posts.map((post) => {
        return <li key={post.id}>{post.title}</li>;
      })}
    </ul>
  );
}
```

> For \['nextjs-app']:

To learn more about using ISR with Next.js in the App router, such as enabling on-demand revalidation, see [the official Next.js documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration).

> For \['nextjs']:

To learn more about using ISR with Next.js in the Pages router, such as enabling on-demand revalidation, see [the official Next.js documentation](https://nextjs.org/docs/pages/building-your-application/rendering/incremental-static-regeneration).

## Using ISR with SvelteKit or Nuxt

- See [our dedicated SvelteKit docs](/docs/frameworks/sveltekit#incremental-static-regeneration-isr) to learn how to use ISR with your SvelteKit projects on Vercel
- See [our dedicated Nuxt docs](/docs/frameworks/nuxt#incremental-static-regeneration-isr) to use ISR with Nuxt

## Using ISR with the Build Output API

When using the Build Output API, the Vercel Functions generated for your ISR routes are called [Prerender Functions](/docs/build-output-api/v3#vercel-primitives/prerender-functions).

Build Output API Prerender Functions are [Vercel functions](/docs/functions) with accompanying JSON files that describe the Function's cache invalidation rules. See [our Prerender configuration file docs](/docs/build-output-api/v3/primitives#prerender-configuration-file) to learn more.

## Differences between ISR and `Cache-Control` headers

Both ISR and `Cache-Control` headers help reduce backend load by serving cached content instead of making requests to your data source. However, there are key architectural differences between the two.

- **Shared global cache:** ISR has **cache shielding** built-in automatically, which helps improve the cache `HIT` ratio. The cache for your ISR route's Vercel Function output is distributed globally. In the case of a cache `MISS`, it looks up the value in a single, global bucket. With only [`cache-control` headers](/docs/cdn-cache), caches expire (by design) and are not shared across [regions](/docs/regions)
- **300ms global purges:** When revalidating (either time-based or on-demand), your ISR route's Vercel Function is re-run, and the cache is brought up to date with the newest content within 300ms in all regions globally
- **Instant rollbacks:** ISR allows you to roll back instantly and not lose your previously generated pages by persisting them between deployments
- **Request collapsing:** ISR knows parameters ahead of time so that multiple requests for the same content are collapsed into one function invocation thereby reducing load and preventing cache stampedes
- **Simplified caching experience**: ISR abstracts common issues with HTTP-based caching implementations, adds additional features for availability and global performance, and provides a better developer experience

See [our Cache control options docs](/docs/cdn-cache#cache-control-options) to learn more about `Cache-Control` headers.

### ISR vs `Cache-Control` comparison table

## On-demand revalidation limits

On-demand revalidation is scoped to the domain and deployment where it occurs, and doesn't affect subdomains or other deployments.

For example, if you trigger on-demand revalidation for `example-domain.com/example-page`, it won't revalidate the same page served by subdomains on the same deployment, such as `sub.example-domain.com/example-page`.

See [Revalidating across domains](/docs/cdn-cache#revalidating-across-domains) to learn how to get around this limitation.

## Revalidation failure handling

When ISR attempts to revalidate a page, the revalidation request may fail due to network issues, server errors, or invalid responses. Vercel includes built-in resilience to ensure your application continues serving stale content even when revalidation fails.

If a revalidation request encounters any of the following conditions, it's considered a failure:

- **Network errors:** Timeouts, connection failures, or other transport-layer issues
- **Invalid HTTP status codes:** Any status code other than 200, 301, 302, 307, 308, 404, or 410
- **Server errors:** Lambda execution failures or runtime errors

When a revalidation failure occurs, Vercel implements a graceful degradation strategy:

1. **Stale content is preserved:** The existing cached version of the page continues to be served to users. Your site remains functional even when revalidation fails.
2. **Short retry window:** The cached page is given a Time-To-Live (TTL) of 30 seconds. This means Vercel will attempt to revalidate the page again after 30 seconds.

## ISR pricing

When using ISR with a framework on Vercel, a function is created based on your framework code. This means that you incur usage when the ISR [function](/docs/pricing/serverless-functions) is invoked, when [ISR reads and writes](/docs/pricing/incremental-static-regeneration) occur, and on the [Fast Origin Transfer](/docs/manage-cdn-usage#fast-origin-transfer):

- **You incur usage when the function is invoked** – ISR functions are invoked whenever they revalidate in the background or through [on-demand revalidation](/docs/incremental-static-regeneration/quickstart#on-demand-revalidation)
- **You incur ISR writes when new content is stored in the ISR cache** – Fresh content returned by ISR functions is persisted to durable storage for the duration you specify, until it goes unaccessed for 31 days
- **You incur ISR reads when content is accessed from the ISR cache** – The content served from the ISR cache when there is a cache miss
- **You add to your [Fast Origin Transfer](/docs/manage-cdn-usage#fast-origin-transfer) usage**

Explore your [usage top paths](/docs/limits/usage#top-paths) to better understand ISR usage and pricing.

## More resources

- [Quickstart](/docs/incremental-static-regeneration/quickstart)
- [Monitor ISR on Vercel](/docs/observability/monitoring)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/data-fetching/caching)


---

[View full sitemap](/docs/sitemap)
