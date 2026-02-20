---
title: Features
product: vercel
url: /docs/build-output-api/features
type: conceptual
prerequisites:
  - /docs/build-output-api
related:
  - /docs/project-configuration
  - /docs/build-output-api/v3/configuration
  - /docs/build-output-api/v3/
  - /docs/build-output-api/v3/primitives
summary: Learn how to implement common Vercel platform features through the Build Output API.
---

# Features

This section describes how to implement common Vercel platform features through the
Build Output API through a combination of platform primitives, configuration and
helper functions.

## High-level routing

The `vercel.json` file supports an [easier-to-use syntax for routing through properties
like `rewrites`, `headers`, etc](/docs/project-configuration). However, the
[`config.json` "routes" property](/docs/build-output-api/v3/configuration#routes) supports a
lower-level syntax.

The `getTransformedRoutes()` function from the [`@vercel/routing-utils` npm package](https://www.npmjs.com/package/@vercel/routing-utils)
can be used to convert this higher-level syntax into the lower-level format that is
supported by the Build Output API. For example:

```typescript
import { writeFileSync } from 'fs';
import { getTransformedRoutes } from '@vercel/routing-utils';

const { routes } = getTransformedRoutes({
  trailingSlash: false,
  redirects: [
    { source: '/me', destination: '/profile.html' },
    { source: '/view-source', destination: 'https://github.com/vercel/vercel' },
  ],
});

const config = {
  version: 3,
  routes,
};
writeFileSync('.vercel/output/config.json', JSON.stringify(config));
```

#### `cleanUrls`

The [`cleanUrls: true` routing feature](/docs/project-configuration#cleanurls) is a special case because, in addition to the routes
generated with the helper function above, it *also* requires that the static HTML files
have their `.html` suffix removed.

This can be achieved by utilizing the [`"overrides"` property in the `config.json` file](/docs/build-output-api/v3/configuration#overrides):

```typescript
import { writeFileSync } from 'fs';
import { getTransformedRoutes } from '@vercel/routing-utils';

const { routes } = getTransformedRoutes({
  cleanUrls: true,
});

const config = {
  version: 3,
  routes,
  overrides: {
    'blog.html': {
      path: 'blog',
    },
  },
};
writeFileSync('.vercel/output/config.json', JSON.stringify(config));
```

## Routing Middleware

An Edge Runtime function can act as a "middleware" in the HTTP request lifecycle for
a Deployment. Middleware is useful for implementing functionality that may be
shared by many URL paths in a Project (e.g. authentication),
before passing the request through to the underlying resource (such as a page or asset)
at that path.

A Routing Middleware is represented on the file system in the same format as an [Edge
Function](/docs/build-output-api/v3/#vercel-primitives/edge-functions). To use the middleware,
add additional rules in the [`routes` configuration](/docs/build-output-api/v3/configuration#routes)
mapping URLs (using the `src` property) to the middleware (using the `middlewarePath` property).

### Routing Middleware example

The following example adds a rule that calls the `auth` middleware for any URL that
starts with `/api`, before continuing to the underlying resource:

```json
  "routes": [
    {
      "src": "/api/(.*)",
      "middlewareRawSrc": ["/api"],
      "middlewarePath": "auth",
      "continue": true
    }
  ]
```

## Draft Mode

When using [Prerender Functions](/docs/build-output-api/v3/primitives#prerender-functions), you may want to implement "Draft Mode" which would allow you to bypass the caching aspect of prerender functions. For example, while writing draft blog posts before they are ready to be published.

To implement this, the `bypassToken` of the `<name>.prerender-config.json` file should be set to a randomized string that you generate at build-time. This string should not be exposed to users / the client-side, except under authenticated circumstances.

To enable "Draft Mode", a cookie with the name `__prerender_bypass` needs to be set (i.e. by a Vercel Function) with the value of the `bypassToken`. When the Prerender Function endpoint is accessed while the cookie is set, then "Draft Mode" will be activated, bypassing any caching that Vercel would normally provide when not in draft mode.

## On-Demand Incremental Static Regeneration (ISR)

When using [Prerender Functions](/docs/build-output-api/v3/primitives#prerender-functions), you may want to implement "On-Demand Incremental Static Regeneration (ISR)" which would allow you to invalidate the cache at any time.

To implement this, the `bypassToken` of the `<name>.prerender-config.json` file should be set to a randomized string that you generate at build-time. This string should not be exposed to users / the client-side, except under authenticated circumstances.

To trigger "On-Demand Incremental Static Regeneration (ISR)" and revalidate a path to a Prerender Function, make a `GET` or `HEAD` request to that path with a header of `x-prerender-revalidate: <bypassToken>`. When that Prerender Function endpoint is accessed with this header set, the cache will be revalidated. The next request to that function should return a fresh response.


---

[View full sitemap](/docs/sitemap)
