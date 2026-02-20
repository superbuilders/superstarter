---
title: Purging Vercel CDN Cache
product: vercel
url: /docs/cdn-cache/purge
type: reference
prerequisites:
  - /docs/cdn-cache
related:
  - /docs/deployments/generated-urls
  - /docs/deployments/promoting-a-deployment
  - /docs/image-optimization
  - /docs/functions
  - /docs/rewrites
summary: "Learn how to invalidate and delete cached content on Vercel's CDN, including cache keys and manual purging options."
---

# Purging Vercel CDN Cache

> **🔒 Permissions Required**: Cache purging

Learn how to [invalidate and delete](#programmatically-purging-vercel-cache) cached content on Vercel's CDN, including cache keys and manual purging options.

## Cache keys

Each request to Vercel's CDN has a cache key derived from the following:

- The request method (such as `GET`, `POST`, etc)
- The request URL (query strings are ignored for static files)
- The host domain
- The unique [deployment URL](/docs/deployments/generated-urls)
- The scheme (whether it's `https` or `http`)

Since each deployment has a different cache key, you can [promote a new deployment](/docs/deployments/promoting-a-deployment) to production without affecting the cache of the previous deployment.

> **💡 Note:** The cache key for Image Optimization behaves differently for [static
> images](/docs/image-optimization#local-images-cache-key) and [remote
> images](/docs/image-optimization#remote-images-cache-key).

Cache keys are not configurable. To purge the cache you must configure cache tags.

## Understanding cache purging

When you purge by cache tag, Vercel purges all three types of cache: CDN cache, Runtime Cache, and Data Cache. This ensures your content updates consistently across all layers.

### Invalidating the cache

When you invalidate a cache tag, all cached content associated with that tag is marked as stale. The next request serves the stale content instantly while revalidation happens in the background. This approach has no latency impact for users while ensuring content gets updated.

### Deleting the cache

When you delete a cache tag, the cached entries are marked for deletion. The next request fetches content from your origin before responding to the user. This can slow down the first request after deletion. If many users request the same deleted content simultaneously, it can create a cache stampede where multiple requests hit your origin at once.

### Cache tags

Cache tags (sometimes called surrogate keys) are user-defined strings that can be assigned to cached responses. These tags can later be used to purge the CDN cache.

For example, you may have a product with id `123` that is displayed on multiple pages such as `/products/123/overview`, `/products/123/reviews`, etc. If you add a unique cache tag to those pages, such as `product123`, you can invalidate that tag when the content of the product changes. You may want to add another tag `products` to invalidate all products at once.

There are several ways to add cache tags to a response:

- **`Vercel-Cache-Tag` response header**: Set the `Vercel-Cache-Tag` header on responses from [Vercel Functions](/docs/functions) or [external rewrites](/docs/rewrites#external-rewrites). The value is a comma-separated list of tags.
- **`addCacheTag()` function**: Import [addCacheTag](/docs/functions/functions-api-reference/vercel-functions-package#addcachetag) from `@vercel/functions` and pass in your tag.
- **`cacheTag()` function (Next.js only)**: Import [cacheTag](https://nextjs.org/docs/app/api-reference/functions/cacheTag) from `next/cache` and pass in your tag.

The example below sets both `Vercel-CDN-Cache-Control` and `Vercel-Cache-Tag` in a Vercel Function to ensure the response is cached and can be purged on-demand by tag at some point in the future:

```ts filename="api/product.ts"
export default {
  async fetch(request) {
    const id = new URL(request.url).searchParams.get('id');
    const res = await fetch(`https://api.example.com/${id}`);
    const product = await res.json();
    return Response.json(product, {
      headers: {
        'Vercel-CDN-Cache-Control': 'public, max-age=86400',
        'Vercel-Cache-Tag': `product-${id},products`,
      },
    });
  },
};
```

Vercel's CDN can also cache and purge responses originating outside of Vercel by using [external rewrites](/docs/rewrites#external-rewrites) with the same headers.

Functions using [ISR](/docs/incremental-static-regeneration) don't have access to the raw Response headers. You can add cache tags by importing [addCacheTag](/docs/functions/functions-api-reference/vercel-functions-package#addcachetag) from `@vercel/functions` to add tags at runtime.

If you're using Next.js, you can add cache tags by importing [cacheTag](https://nextjs.org/docs/app/api-reference/functions/cacheTag) from `next/cache` instead.

#### Cache tag case sensitivity

Cache tags are case-sensitive, meaning `product` and `Product` are treated as different tags.

#### Cache tag scope

Cache tags are scoped to your project and environment (production or preview).

When you purge a tag with the REST API, you can optionally provide a target environment such as preview or production (default is all environments).

When you purge a tag using `@vercel/functions` at runtime, the function's current environment is used which is derived from the deployment url that invoked the function.

When using [rewrites](/docs/rewrites) from a parent [project](/docs/projects) to a child project and both are on the same [team](/docs/accounts), cached responses on the parent project will also include the corresponding tags from the child project.

## Programmatically purging CDN Cache

You can purge Vercel CDN cache in any of the following ways:

- [next/cache](https://nextjs.org/docs/app/api-reference/functions/cacheTag): Use helper methods like `revalidatePath()`, `revalidateTag()`, or `updateTag()`
- [@vercel/functions](/docs/functions/functions-api-reference/vercel-functions-package): Use helper methods like `invalidateByTag()`, `dangerouslyDeleteByTag()`, `invalidateBySrcImage()`, or `dangerouslyDeleteBySrcImage()`
- [Vercel CLI](/docs/cli/cache): Use the `vercel cache invalidate` command or `vercel cache dangerously-delete` command with `--tag` or `--srcimg` options
- [REST API](/docs/rest-api/reference/endpoints/edge-cache/invalidate-by-tag): Make direct API calls to the edge cache endpoint like `/invalidate-by-tag`, `/dangerously-delete-by-tag`, `/invalidate-by-source-image`, or `/dangerously-delete-by-source-image`

## Manually purging Vercel CDN Cache

In some circumstances, you may need to delete all cached data and force revalidation. For example, you might have set a `Cache-Control` to cache the response for a month but the content changes more frequently than once a month. You can do this by purging the cache:

1. Under your project, go to the **Settings** tab.
2. In the left sidebar, select **Caches**.
3. In the **CDN Cache** section, click **Purge CDN Cache**.
4. In the dialog, you'll see two options:
   - **Invalidate**: Marks a cache tag as stale, causing cache entries associated with that tag to be revalidated in the background on the next request. This is the recommended method for most use cases.
   - **Delete**: Marks a cache tag as deleted, causing cache entries associated with that tag to be revalidated in the foreground on the next request. Use this method with caution because one tag can be associated with many paths and deleting the cache can cause many concurrent requests to the origin leading to [cache stampede problem](https://en.wikipedia.org/wiki/Cache_stampede). This option is for advanced use cases and is not recommended; prefer using Invalidate instead.
5. In the dialog, you'll see a dropdown with two options:
   - **Cache Tag**: Purge cached responses associated with a specific user-defined tag.
   - **Source Image**: Purge [Image Optimization](/docs/image-optimization) transformed images based on the original source image URL.
6. In the dialog, enter a tag or source image in the input. You can use `*` to purge the entire project.
7. Finally, click the **Purge** button in the dialog to confirm.

The purge event itself is not billed but it can temporarily increase Function Duration, Functions Invocations, Edge Function Executions, Fast Origin Transfer, Image Optimization Transformations, Image Optimization Cache Writes, and ISR Writes.

> **💡 Note:** Purge is not the same as creating a new deployment because it will also purge
> Image Optimization content, which is usually preserved between deployments, as
> well as ISR content, which is often generated at build time for new
> deployments.

## Limits

|                             | Maximum |
| --------------------------- | ------- |
| Characters per tag          | 256     |
| Tags per cached response    | 128     |
| Tags per bulk REST API call | 16      |


---

[View full sitemap](/docs/sitemap)
