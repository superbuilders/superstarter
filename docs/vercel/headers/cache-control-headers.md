---
title: Cache-Control headers
product: vercel
url: /docs/headers/cache-control-headers
type: reference
prerequisites:
  - /docs/headers
related:
  - /docs/project-configuration
  - /docs/functions
summary: Learn about the cache-control headers sent to each Vercel deployment and how to use them to control the caching behavior of your application.
---

# Cache-Control headers

You can control how Vercel's CDN caches your Function responses by setting a [Cache-Control headers](https://developer.mozilla.org/docs/Web/HTTP/Headers/Cache-Control "Cache Control") header.

## Default `cache-control` value

The default value is `cache-control: public, max-age=0, must-revalidate` which instructs both the CDN and the browser not to cache.

## Recommended settings

We recommend that you set your cache to`max-age=0, s-maxage=86400`, adjusting 86400 to the number of seconds you want the response cached. This configuration tells browsers not to cache, allowing Vercel's CDN to cache responses and invalidate them when deployments update.

## `s-maxage`

This directive sets the number of seconds a response is considered "fresh" by the CDN. After this period ends, Vercel's CDN will serve the "stale" response from the edge until the response is asynchronously revalidated with a "fresh" response to your Vercel Function.

Vercel's proxy consumes `s-maxage` for all requests. After processing it, the CDN does not include it in the final HTTP response to the client.

### `s-maxage` example

The following example instructs the CDN to cache the response for 60 seconds. A response can be cached a minimum of `1` second and maximum of `31536000` seconds (1 year).

```js filename="cache-response"
Cache-Control: s-maxage=60
```

## `stale-while-revalidate`

This `cache-control` directive allows you to serve content from the Vercel CDN cache while simultaneously updating the cache in the background with the response from your function. It is useful when:

- Your content changes frequently, but regeneration is slow, such as content that relies on an expensive database query or upstream API request
- Your content changes infrequently but you want to have the flexibility to update it without waiting for the cache to expire

Vercel's proxy consumes `stale-while-revalidate` for all requests. After processing it, the CDN does not include it in the final HTTP response to the client. This allows you to deliver the latest content to your visitors right after creating a new deployment (as opposed to waiting for browser cache to expire). It also prevents content-flash.

### SWR example

The following example instructs the CDN to:

- Serve content from the cache for 1 second
- Return a stale request (if requested after 1 second)
- Update the cache **in the background** asynchronously (if requested after 1 second)

```js filename="swr-on-edge-network"
Cache-Control: s-maxage=1, stale-while-revalidate=59
```

The first request is served synchronously. Subsequent requests are served from the cache and revalidated asynchronously if the cache is "stale".

If you need to do a *synchronous* revalidation you can set the `pragma: no-cache` header along with the `cache-control` header. This can be used to understand how long the background revalidation took. It sets the `x-vercel-cache` header to `REVALIDATED`.

> **💡 Note:** Many browser developer tools set `pragma: no-cache` by default, which reveals
> the true load time of the page with the synchronous update to the cache.

## `stale-if-error`

When you set the `stale-if-error` HTTP Cache-Control extension, the CDN serves a stale response when an error is encountered instead of returning the error to the client. Examples of errors are: 500 Internal Server Error, a network failure, or a DNS error.

The following example instructs the CDN to:

```
Cache-Control: max-age=604800, stale-if-error=86400
```

1. Cache and serve a successful response fresh for 7 days (604800 seconds). The CDN will not attempt to revalidate during this period.
2. Attempt revalidation after 7 days. The CDN will not cache any error from the origin and instead serve the stale response for up to 1 additional day (86400 seconds).
3. If the origin never returns a successful response after that 1 day (86400 seconds) period, the CDN will stop serving the stale response and users will see the error from the origin.

Vercel's proxy consumes `stale-if-error` for all requests. After processing it, the CDN does not include it in the final HTTP response to the client.

## `proxy-revalidate`

This directive is currently not supported.

## Using `private`

Using the `private` directive specifies that the response can only be cached by the client and **not by Vercel's CDN**. Use this directive when you want to cache content on the user's browser, but prevent caching on Vercel's CDN.

## `Pragma: no-cache`

When Vercel's CDN receives a request with `Pragma: no-cache` (such as when the browser devtools are open), it will revalidate any stale resource synchronously, instead of in the background.

## CDN-Cache-Control Header

Sometimes the directives you set in a `Cache-Control` header can be interpreted differently by the different CDNs and proxies your content passes through between the origin server and a visitor's browser. To explicitly control caching you can use targeted cache control headers.

The `CDN-Cache-Control` and `Vercel-CDN-Cache-Control` headers are response headers that can be used to specify caching behavior on the CDN.

You can use the same directives as [`Cache-Control`](#default-cache-control-value), but `CDN-Cache-Control` is only used by the CDN.

## Behavior

Origins can set the following headers:

- `Vercel-CDN-Cache-Control`
- `CDN-Cache-Control`
- `Cache-Control`

When multiple of the above headers are set, Vercel's CDN will use the following priority to determine the caching behavior:

### `Vercel-CDN-Cache-Control`

`Vercel-CDN-Cache-Control` is exclusive to Vercel and has top priority, whether it's defined in a Vercel Function response or a `vercel.json` file. It controls caching behavior only within Vercel's Cache. Vercel's proxy consumes this header for all requests. After processing it, the CDN does not include it in the final HTTP response to the client.

### `CDN-Cache-Control`

`CDN-Cache-Control` is second in priority after `Vercel-CDN-Cache-Control`, and **always** overrides `Cache-Control` headers, whether defined in a Vercel Function response or a `vercel.json` file.

By default, `CDN-Cache-Control` configures Vercel's Cache and is used by other CDNs, allowing you to configure intermediary caches. If `Vercel-CDN-Cache-Control` is also set, `CDN-Cache-Control` only influences other CDN caches.

### `Cache-Control`

`Cache-Control` is a web standard header and last in priority. If neither `CDN-Cache-Control` nor `Vercel-CDN-Cache-Control` are set, this header will be used by Vercel's Cache before being forwarded to the client.

You can still set `Cache-Control` while using the other two, and it will be forwarded to the client as is.

> **💡 Note:** If only `Cache-Control` is used, Vercel strips the `s-maxage` directive from
> the header before it's sent to the client.

## Cache-Control comparison tables

The following tables demonstrate how Vercel's Cache behaves in different scenarios:

### Functions have priority over config files

`Cache-Control` headers returned from Vercel Functions take priority over `Cache-Control` headers from `next.config.js` or `vercel.json` files.

| Parameter                                 | Value                               |
| ----------------------------------------- | ----------------------------------- |
| Vercel Function response headers          | `Cache-Control: s-maxage=60`        |
| `vercel.json` or `next.config.js` headers | `Cache-Control: s-maxage: 120`      |
| Cache behavior                            | 60s TTL                             |
| Headers sent to the client                | `Cache-Control: public, max-age: 0` |

### `CDN-Cache-Control` priority

`CDN-Cache-Control` has priority over `Cache-Control`, even if defined in `vercel.json` or `next.config.js`.

| Parameter                                 | Value                                                       |
| ----------------------------------------- | ----------------------------------------------------------- |
| Vercel Function response headers          | `Cache-Control: s-maxage=60`                                |
| `vercel.json` or `next.config.js` headers | `CDN-Cache-Control: max-age=120`                            |
| Cache behavior                            | 120s TTL                                                    |
| Headers sent to the client                | `Cache-Control: s-maxage=60 CDN-Cache-Control: max-age=120` |

### `Vercel-CDN-Cache-Control` priority

`Vercel-CDN-Cache-Control` has priority over both `CDN-Cache-Control` and `Cache-Control`. It only applies to Vercel, so it is not returned with the other headers, which will control cache behavior on the browser and other CDNs.

| Parameter                                 | Value                                                              |
| ----------------------------------------- | ------------------------------------------------------------------ |
| Vercel Function response headers          | `CDN-Cache-Control: max-age=120`                                   |
| `vercel.json` or `next.config.js` headers | `Cache-Control: s-maxage=60 Vercel-CDN-Cache-Control: max-age=300` |
| Cache behavior                            | 300s TTL                                                           |
| Headers sent to the client                | `Cache-Control: s-maxage=60 CDN-Cache-Control: max-age=120`        |

## Which Cache-Control headers to use with CDNs

- If you want to control caching similarly on Vercel, CDNs, and the client, use `Cache-Control`
- If you want to control caching on Vercel and also on other CDNs, use `CDN-Cache-Control`
- If you want to control caching only on Vercel, use `Vercel-CDN-Cache-Control`
- If you want to specify different caching behaviors for Vercel, other CDNs, and the client, you can set all three headers

## Example usage

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

## Custom Response Headers

Using configuration, you can assign custom headers to each response.

Custom headers can be configured with the `headers` property in [`next.config.js`](https://nextjs.org/docs/api-reference/next.config.js/headers) for Next.js projects, or it can be configured in [`vercel.json`](/docs/project-configuration#headers) for all other projects.

Alternatively, a [Vercel Function](/docs/functions) can assign headers to the [Response](https://nodejs.org/api/http.html#http_response_setheader_name_value) object.

> **💡 Note:** Response headers `x-matched-path`, `server`, and `content-length` are reserved
> and cannot be modified.


---

[View full sitemap](/docs/sitemap)
