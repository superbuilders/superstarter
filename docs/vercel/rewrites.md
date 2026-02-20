---
title: Rewrites on Vercel
product: vercel
url: /docs/rewrites
type: conceptual
prerequisites:
  []
related:
  - /docs/project-configuration
  - /docs/headers/cache-control-headers
  - /docs/cdn-cache/purge
  - /docs/drains/using-drains
  - /docs/observability/insights
summary: Learn how to use rewrites to send users to different URLs without modifying the visible URL.
---

# Rewrites on Vercel

A rewrite routes a request to a different destination without changing the URL in the browser. Unlike redirects, the user won't see the URL change.

There are two main types:

1. **Same-application rewrites** – Route requests to different pages within your Vercel project.
2. **External rewrites** – Forward requests to an external API or website.

The [/.well-known](# "The /.well-known directory") path is reserved and cannot be redirected or rewritten. Only
Enterprise teams can configure custom SSL. [Contact sales](/contact/sales) to
learn more.

## Setting up rewrites

Rewrites are defined in a `vercel.json` file in your project's root directory:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/source-path",
      "destination": "/destination-path"
    }
  ]
}
```

For all configuration options, see the [project configuration](/docs/project-configuration#rewrites) docs.

## Same-application rewrites

Same-application rewrites route requests to different destinations within your project. Common uses include:

- **Friendly URLs**: Transform `/products/t-shirts` into `/catalog?category=t-shirts`
- **Device-specific content**: Show different layouts based on device type
- **A/B testing**: Route users to different versions of a page
- **Country-specific content**: Show region-specific content based on the user's location

Example: Route image resize requests to a serverless function:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/resize/:width/:height",
      "destination": "/api/sharp"
    }
  ]
}
```

This converts a request like `/resize/800/600` to `/api/sharp?width=800&height=600`.

Example: Route UK visitors to a UK-specific section:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/:path((?!uk/).*)",
      "has": [
        { "type": "header", "key": "x-vercel-ip-country", "value": "GB" }
      ],
      "destination": "/uk/:path*"
    }
  ]
}
```

This routes a UK visitor requesting `/about` to `/uk/about`.

## External rewrites

External rewrites forward requests to APIs or websites outside your Vercel project, effectively allowing Vercel to function as a reverse proxy or standalone CDN. You can use this feature to:

- **Proxy API requests**: Hide your actual API endpoint
- **Combine multiple services**: Merge multiple backends under one domain
- **Create microfrontends**: Combine multiple Vercel applications into a single website
- **Add caching**: Cache external API responses on the CDN
- **Serve externally hosted content**: Serve content that is not hosted on Vercel.

Example: Forward API requests to an external endpoint:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/:path*"
    }
  ]
}
```

A request to `/api/users` will be forwarded to `https://api.example.com/users` without changing the URL in the browser.

### Caching external rewrites

External rewrites aren't cached by default. To enable caching, add the `x-vercel-enable-rewrite-caching` header to your `vercel.json`:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [{ "key": "x-vercel-enable-rewrite-caching", "value": "1" }]
    }
  ]
}
```

This tells Vercel to respect caching headers on the upstream response. Once enabled, you can control the cache duration in two ways:

1. **From your API (preferred)**: When you control the backend, return [`CDN-Cache-Control`](/docs/headers/cache-control-headers#cdn-cache-control-header) or [`Vercel-CDN-Cache-Control`](/docs/headers/cache-control-headers#cdn-cache-control-header) headers in the API response:

   ```
   CDN-Cache-Control: max-age=60
   ```

   This caches the response on the CDN for 60 seconds.

2. **From Vercel configuration**: When you can't modify the backend, set caching headers in `vercel.json` alongside `x-vercel-enable-rewrite-caching`:

   ```json filename="vercel.json"
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://api.example.com/:path*"
       }
     ],
     "headers": [
       {
         "source": "/api/:path*",
         "headers": [
           { "key": "x-vercel-enable-rewrite-caching", "value": "1" },
           {
             "key": "CDN-Cache-Control",
             "value": "max-age=60"
           }
         ]
       }
     ]
   }
   ```

   This caches the response on the CDN for 60 seconds.

For more information on caching headers, see the [Cache-Control headers documentation](/docs/headers/cache-control-headers).

> **💡 Note:** When caching external rewrites, it's best practice to also include a `Vercel-Cache-Tag` response header with a
> comma-separated list of tags so you can later [purge the CDN cache by tag](/docs/cdn-cache/purge) at your convenience.

### Draining external rewrites

You can export external rewrite data by draining logs from your application. External rewrite events appear in your runtime logs, allowing you to monitor proxy requests, track external API calls, and analyze traffic patterns to your backend services.

To get started, configure a [logs drain](/docs/drains/using-drains).

### Observing external rewrites

You can observe your external rewrite performance using Observability. The **External Rewrites** tab shows request counts, connection latency, and traffic patterns for your proxied requests, helping you monitor backend performance and validate that rewrites are working as expected.

Learn more in the [Observability Insights](/docs/observability/insights#external-rewrites) documentation.

## Framework considerations

**External rewrites** work universally with all frameworks, making them ideal for API proxying, microfrontend architectures, and serving content from external origins through Vercel's global network as a reverse proxy or standalone CDN.

For **same-application rewrites**, always prefer your framework's native routing capabilities:

- **Next.js**: [Next.js rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites)
- **Astro**: [Astro routing](/docs/frameworks/astro#rewrites)
- **SvelteKit**: [SvelteKit routing](/docs/frameworks/sveltekit#rewrites)

Use `vercel.json` rewrites for same-application routing only when your framework doesn't provide native routing features. Always consult your framework's documentation for the recommended approach.

## Testing rewrites

Use Vercel's preview deployments to test your rewrites before going to production. Each pull request creates a unique preview URL where you can verify your rewrites work correctly.

## Wildcard path forwarding

You can capture and forward parts of a path using wildcards:

```json
{
  "rewrites": [
    {
      "source": "/docs/:path*",
      "destination": "/help/:path*"
    }
  ]
}
```

A request to `/docs/getting-started/install` will be forwarded to `/help/getting-started/install`.

You can also capture multiple path segments:

```json
{
  "rewrites": [
    {
      "source": "/blog/:year/:month/:slug*",
      "destination": "/posts?date=:year-:month&slug=:slug*"
    }
  ]
}
```

## Using regular expressions

For more complex patterns, you can use regular expressions with capture groups:

```json
{
  "rewrites": [
    {
      "source": "^/articles/(\\d{4})/(\\d{2})/(.+)$",
      "destination": "/archive?year=$1&month=$2&slug=$3"
    }
  ]
}
```

This converts `/articles/2023/05/hello-world` to `/archive?year=2023&month=05&slug=hello-world`.

You can also use named capture groups:

```json
{
  "rewrites": [
    {
      "source": "^/products/(?<category>[a-z]+)/(?<id>\\d+)$",
      "destination": "/shop?category=$category&item=$id"
    }
  ]
}
```

This converts `/products/shirts/123` to `/shop?category=shirts&item=123`.

## When to use each type

- **Same-application rewrites**: Use when routing within your own application
- **External rewrites**: Use when connecting to external APIs, creating microfrontends, or using Vercel as a reverse proxy or standalone CDN for third-party content


---

[View full sitemap](/docs/sitemap)
