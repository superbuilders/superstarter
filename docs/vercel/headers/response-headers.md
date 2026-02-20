---
title: Response headers
product: vercel
url: /docs/headers/response-headers
type: reference
prerequisites:
  - /docs/headers
related:
  - /docs/cdn-cache
  - /docs/headers
  - /docs/headers/cache-control-headers
  - /docs/deployments/environments
  - /docs/deployments
summary: Learn about the response headers sent to each Vercel deployment and how to use them to process responses before sending a response.
---

# Response headers

The following headers are included in Vercel deployment responses and indicate certain factors of the environment. These headers can be viewed from the Browser's Dev Tools or using an HTTP client such as `curl -I <DEPLOYMENT_URL>`.

## `cache-control`

Used to specify directives for caching mechanisms in both the [Network layer cache](/docs/cdn-cache) and the browser cache. See the [Cache Control Headers](/docs/headers#cache-control-header) section for more detail.

If you use this header to instruct the CDN to cache data, such as with the [`s-maxage`](/docs/headers/cache-control-headers#s-maxage) directive, Vercel returns the following `cache-control` header to the client:

-`cache-control: public, max-age=0, must-revalidate`

## `content-length`

An integer that indicates the number of bytes in the response.

## `content-type`

The [media type](https://developer.mozilla.org/docs/Web/HTTP/Basics_of_HTTP/MIME_types) that describes the nature and format of the response.

## `date`

A timestamp indicating when the response was generated.

## `server: Vercel`

Shows where the request came from. This header can be overridden by other proxies (e.g., Cloudflare).

## `strict-transport-security`

A header often abbreviated as [HSTS](https://developer.mozilla.org/docs/Glossary/HSTS) that tells browsers that the resource should only be requested over HTTPS. The default value is `strict-transport-security: max-age=63072000` (2 years)

## `x-robots-tag`

Present only on:

- [Preview deployments](/docs/deployments/environments#preview-environment-pre-production)
- Outdated [production deployments](/docs/deployments). When you [promote a new deployment to production](/docs/deployments/promoting-a-deployment), the `x-robots-tag` header will be sent to requests for outdated production deployments

We add this header automatically with a value of `noindex` to **prevent** search engines from crawling your Preview Deployments and outdated Production Deployments, which could cause them to penalize your site for duplicate content.

You can prevent this header from being added to your Preview Deployment by:

- [Assigning a production domain](/docs/domains/working-with-domains/assign-domain-to-a-git-branch) to it
- Disabling it manually [using vercel.json](/docs/project-configuration#headers)

## `x-vercel-cache`

The `x-vercel-cache` header is primarily used to indicate the cache status of static assets and responses from Vercel's CDN. For dynamic routes and fetch requests that utilize the [Vercel Runtime Cache](/docs/runtime-cache), this header will often show `MISS` even if the data is being served from the Runtime Cache. Use [custom headers](/docs/headers/cache-control-headers#custom-response-headers) or [runtime logs](/docs/runtime-logs) to determine if a fetch response was served from the Runtime Cache.

The following values are possible when the content being served [is static](/docs/cdn-cache#static-files-caching) or uses [a Cache-Control header](/docs/headers#cache-control-header):

### `MISS`

The response was not found in the cache and was fetched from the origin server.

![Image](`/docs-assets/static/docs/concepts/edge-network/x-vercel-cache-miss2x.png?lightbox`)

### `HIT`

The response was served from the cache.

![Image](`/docs-assets/static/docs/concepts/edge-network/x-vercel-cache-hit2x.png?lightbox`)

### `STALE`

The response was served from the cache but the content is no longer fresh, so a background request to the origin server was made to update the content.

Cached content can go stale for several different reasons such as:

- Response included `stale-while-revalidate` Cache-Control response header.
- Response was served from [ISR](/docs/incremental-static-regeneration) with a revalidation time in frameworks like Next.js.
- On-demand using `@vercel/functions` like [`invalidateByTag()`](/docs/functions/functions-api-reference/vercel-functions-package#invalidatebytag).
- On-demand using framework-specific functions like [`revalidatePath()`](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) or [`revalidateTag()`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) with lifetimes in Next.js.
- On-demand using the Vercel dashboard [project purge settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fcaches\&title=Cache+Purge+Settings) to invalidate by tag.

See [purging the cache](/docs/cdn-cache/purge) for more information.

![Image](`/docs-assets/static/docs/concepts/edge-network/x-vercel-cache-stale2x.png?lightbox`)

### `PRERENDER`

The response was served from static storage. An example of prerender is in `Next.js`, when setting `fallback:true` in `getStaticPaths`. However, `fallback:blocking` will not return prerender.

![Image](`/docs-assets/static/docs/concepts/edge-network/x-vercel-cache-prerender2x.png?lightbox`)

### `REVALIDATED`

The response was served from the origin server after the cache was deleted so it must be revalidated in the foreground.

The cached content can be deleted in several ways such as:

- On-demand using `@vercel/functions` like [`dangerouslyDeleteByTag()`](/docs/functions/functions-api-reference/vercel-functions-package#dangerouslydeletebytag).
- On-demand using framework-specific functions like [`revalidatePath()`](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) or [`revalidateTag()`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) without a lifetime in Next.js.
- On-demand using the Vercel dashboard [project purge settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fcaches\&title=Cache+Purge+Settings) to delete by tag.

See [purging the cache](/docs/cdn-cache/purge) for more information.

![Image](`/docs-assets/static/docs/concepts/edge-network/x-vercel-cache-revalidated2x.png?lightbox`)

## `x-vercel-id`

This header contains a list of [Vercel regions](/docs/regions) your request hit, as well as the region the function was executed in (for both Edge and Serverless).

It also allows Vercel to automatically prevent infinite loops.


---

[View full sitemap](/docs/sitemap)
