---
title: Astro on Vercel
product: vercel
url: /docs/frameworks/frontend/astro
type: conceptual
prerequisites:
  - /docs/frameworks/frontend
  - /docs/frameworks
related:
  - /docs/functions/runtimes
  - /docs/analytics
  - /docs/analytics/quickstart
  - /docs/build-output-api/v3/configuration
  - /docs/deployments/vercel-ignore
summary: "Learn how to use Vercel's features with Astro"
---

# Astro on Vercel

Astro is an all-in-one web framework that enables you to build performant static websites. People choose Astro when they want to build content-rich experiences with as little JavaScript as possible.

You can deploy a static Astro app to Vercel with zero configuration.

## Get Started with Astro on Vercel

## Using Vercel's features with Astro

To deploy a server-rendered Astro app, or a static Astro site with Vercel features like Web Analytics and Image Optimization, you must:

1. Add [Astro's Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel) to your project. There are two ways to do so:

   <CodeBlock>
     <Code tab="pnpm">
       ```bash
       pnpm i @astrojs/vercel
       ```
     </Code>
     <Code tab="yarn">
       ```bash
       yarn i @astrojs/vercel
       ```
     </Code>
     <Code tab="npm">
       ```bash
       npm i @astrojs/vercel
       ```
     </Code>
     <Code tab="bun">
       ```bash
       bun i @astrojs/vercel
       ```
     </Code>
   </CodeBlock>

   - Or, manually installing the [`@astrojs/vercel`](https://www.npmjs.com/package/@astrojs/vercel) package. You should manually install the adapter if you don't want an opinionated initial configuration

     <CodeBlock>
       <Code tab="pnpm">
         ```bash
         pnpm i @astrojs/vercel
         ```
       </Code>
       <Code tab="yarn">
         ```bash
         yarn i @astrojs/vercel
         ```
       </Code>
       <Code tab="npm">
         ```bash
         npm i @astrojs/vercel
         ```
       </Code>
       <Code tab="bun">
         ```bash
         bun i @astrojs/vercel
         ```
       </Code>
     </CodeBlock>

2) Configure your project. In your  file, import either the `serverless` or `static` plugin, and set the output to `server` or `static` respectively:

   #### \['Serverless SSR'

   ```js filename="astro.config.mjs" framework=all
   import { defineConfig } from 'astro/config';
   // Import /serverless for a Serverless SSR site
   import vercelServerless from '@astrojs/vercel/serverless';

   export default defineConfig({
     output: 'server',
     adapter: vercelServerless(),
   });
   ```

   ```ts filename="astro.config.ts" framework=all
   import { defineConfig } from 'astro/config';
   // Import /serverless for a Serverless SSR site
   import vercelServerless from '@astrojs/vercel/serverless';

   export default defineConfig({
     output: 'server',
     adapter: vercelServerless(),
   });
   ```

   #### 'Static']

   ```js filename="astro.config.mjs" framework=all
   import { defineConfig } from 'astro/config';
   // Import /static for a static site
   import vercelStatic from '@astrojs/vercel/static';

   export default defineConfig({
     // Must be 'static' or 'hybrid'
     output: 'static',
     adapter: vercelStatic(),
   });
   ```

   ```ts filename="astro.config.ts" framework=all
   import { defineConfig } from 'astro/config';
   // Import /static for a static site
   import vercelStatic from '@astrojs/vercel/static';

   export default defineConfig({
     // Must be 'static' or 'hybrid'
     output: 'static',
     adapter: vercelStatic(),
   });
   ```

3) Enable Vercel's features using Astro's [configuration options](#configuration-options). The following example  enables Web Analytics and adds a maximum duration to Vercel Function routes:

   ```js filename="astro.config.mjs" framework=all
   import { defineConfig } from 'astro/config';
   // Also can be @astrojs/vercel/static
   import vercel from '@astrojs/vercel/serverless';

   export default defineConfig({
     // Also can be 'static' or 'hybrid'
     output: 'server',
     adapter: vercel({
       webAnalytics: {
         enabled: true,
       },
       maxDuration: 8,
     }),
   });
   ```

   ```ts filename="astro.config.ts" framework=all
   import { defineConfig } from 'astro/config';
   // Also can be @astrojs/vercel/static
   import vercel from '@astrojs/vercel/serverless';

   export default defineConfig({
     // Also can be 'static' or 'hybrid'
     output: 'server',
     adapter: vercel({
       webAnalytics: {
         enabled: true,
       },
       maxDuration: 8,
     }),
   });
   ```

### Configuration options

The following configuration options enable Vercel's features for Astro deployments.

| Option                                                                                                                         | type                 | Rendering          | Purpose                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`maxDuration`](/docs/functions/runtimes#max-duration)                                                                         | `number`             | Serverless         | Extends or limits the maximum duration (in seconds) that Vercel functions can run before timing out.                                                                                                        |
| [`webAnalytics`](/docs/analytics)                                                                                              | `{enabled: boolean}` | Static, Serverless | Enables Vercel's [Web Analytics](/docs/analytics). See [the quickstart](/docs/analytics/quickstart) to set up analytics on your account.                                                                    |
| [`imageService`](https://docs.astro.build/en/guides/integrations-guide/vercel/#imageservice)                                   | `boolean`            | Static, Serverless | For astro versions `3` and up. Enables an automatically [configured service](https://docs.astro.build/en/reference/image-service-reference/#what-is-an-image-service) to optimize your images.              |
| [`devImageService`](https://docs.astro.build/en/guides/integrations-guide/vercel/#devimageservice)                             | `string`             | Static, Serverless | For astro versions `3` and up. Configure the [image service](https://docs.astro.build/en/reference/image-service-reference/#what-is-an-image-service) used to optimize your images in your dev environment. |
| [`imagesConfig`](/docs/build-output-api/v3/configuration#images)                                                               | `VercelImageConfig`  | Static, Serverless | Defines the behavior of the Image Optimization API, allowing on-demand optimization at runtime. See [the Build Output API docs](/docs/build-output-api/v3/configuration#images) for required options.       |
| [`functionPerRoute`](https://docs.astro.build/en/guides/integrations-guide/vercel/#function-bundling-configuration)            | `boolean`            | Serverless         | API routes are bundled into one function by default. Set this to true to split each route into separate functions.                                                                                          |
| [`edgeMiddleware`](https://docs.astro.build/en/guides/integrations-guide/vercel/#vercel-edge-middleware-with-astro-middleware) | `boolean`            | Serverless         | Set to `true` to automatically convert Astro middleware to Routing Middleware, eliminating the need for a  file.                                                |
| [`includeFiles`](https://docs.astro.build/en/guides/integrations-guide/vercel/#includefiles)                                   | `string[]`           | Serverless         | Force files to be bundled with your Vercel functions.                                                                                                                                                       |
| [`excludeFiles`](https://docs.astro.build/en/guides/integrations-guide/vercel/#excludefiles)                                   | `string[]`           | Serverless         | Exclude files from being bundled with your Vercel functions. Also available with [`.vercelignore`](/docs/deployments/vercel-ignore#)                                                                        |

For more details on the configuration options, see [Astro's docs](https://docs.astro.build/en/guides/integrations-guide/vercel/#configuration).

## Server-Side Rendering

Using SSR, or [on-demand rendering](https://docs.astro.build/en/guides/server-side-rendering/) as Astro calls it, enables you to deploy your routes as Vercel functions on Vercel. This allows you to add dynamic elements to your app, such as user logins and personalized content.

You can enable SSR by [adding the Vercel adapter to your project](#using-vercel's-features-with-astro).

If your Astro project is statically rendered, you can opt individual routes. To do so:

1. Set your `output` option to `hybrid` in your `<PreferredExtension filename="astro.config" mjs />`:

   ```js filename="astro.config.mjs" framework=all
   import { defineConfig } from 'astro/config';
   import vercel from '@astrojs/vercel/serverless';

   export default defineConfig({
     output: 'hybrid',
     adapter: vercel({
       edgeMiddleware: true,
     }),
   });
   ```

   ```ts filename="astro.config.ts" framework=all
   import { defineConfig } from 'astro/config';
   import vercel from '@astrojs/vercel/serverless';

   export default defineConfig({
     output: 'hybrid',
     adapter: vercel({
       edgeMiddleware: true,
     }),
   });
   ```

2. Add `export const prerender = false;` to your components:

   ```tsx filename="src/pages/mypage.astro"
   ---
   export const prerender = false;
   // ...
   ---
   <html>
     <!-- Server-rendered page here... -->
   </html>
   ```

**SSR with Astro on Vercel:**

- Scales to zero when not in use
- Scales automatically with traffic increases
- Has zero-configuration support for [`Cache-Control` headers](/docs/cdn-cache), including `stale-while-revalidate`

[Learn more about Astro SSR](https://docs.astro.build/en/guides/server-side-rendering/)

### Static rendering

Statically rendered, or pre-rendered, Astro apps can be deployed to Vercel with zero configuration. To enable Vercel features like Image Optimization or Web Analytics, see [Using Vercel's features with Astro](#using-vercel's-features-with-astro).

You can opt individual routes into static rendering with `export const prerender = true` as shown below:

```tsx filename="src/pages/mypage.astro"
---
export const prerender = true;
// ...
---
<html>
  <!-- Static, pre-rendered page here... -->
</html>
```

**Statically rendered Astro sites on Vercel:**

- Require zero configuration to deploy
- Can use Vercel features with&#x20;

[Learn more about Astro Static Rendering](https://docs.astro.build/en/core-concepts/rendering-modes/#pre-rendered)

## Incremental Static Regeneration

[Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration) allows you to create or update content without redeploying your site. ISR has two main benefits for developers: better performance and faster build times.

To enable ISR in Astro, you need to use the [Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/) and set `isr` to `true` in your configuration in `astro.config.mjs`:

```js filename="astro.config.mjs" framework=all
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  // ...
  output: 'server',
  adapter: vercel({
    isr: true,
  }),
});
```

> **💡 Note:** ISR function requests do not include search params, similar to requests in
> static mode.

**Using ISR with Astro on Vercel offers:**

- Better performance with our global [CDN](/docs/cdn)
- Zero-downtime rollouts to previously statically generated pages
- Global content updates in 300ms
- Generated pages are both cached and persisted to durable storage

[Learn more about ISR with Astro.](https://docs.astro.build/en/guides/integrations-guide/vercel/#isr)

## Vercel Functions

[Vercel Functions](/docs/functions) use resources that scale up and down based on traffic demands. This makes them reliable during peak hours, but low cost during slow periods.

When you [enable SSR with Astro's Vercel adapter](#using-vercel's-features-with-astro), **all** of your routes will be server-rendered as Vercel functions by default. Astro's [Server Endpoints](https://docs.astro.build/en/core-concepts/endpoints/#server-endpoints-api-routes) are the best way to define API routes with Astro on Vercel.

When defining an Endpoint, you must name each function after the HTTP method it represents. The following example defines basic HTTP methods in a Server Endpoint:

```ts filename="src/pages/methods.json.ts" framework=all
import { APIRoute } from 'astro/dist/@types/astro';

export const GET: APIRoute = ({ params, request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a GET!',
    }),
  );
};

export const POST: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a POST!',
    }),
  );
};

export const DELETE: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a DELETE!',
    }),
  );
};

// ALL matches any method that you haven't implemented.
export const ALL: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: `This was a ${request.method}!`,
    }),
  );
};
```

```js filename="src/pages/methods.json.js" framework=all
export const GET = ({ params, request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a GET!',
    }),
  );
};

export const POST = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a POST!',
    }),
  );
};

export const DELETE = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a DELETE!',
    }),
  );
};

export const ALL = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: `This was a ${request.method}!`,
    }),
  );
};
```

> **💡 Note:** Astro removes the final file during the build process, so the name of the file
> should include the extension of the data you want serve (for example
> `example.png.js` will become
> `/example.png`).

**Vercel Functions with Astro on Vercel:**

- Scale to zero when not in use
- Scale automatically as traffic increases

[Learn more about Vercel Functions](/docs/functions)

## Image Optimization

[Image Optimization](/docs/image-optimization) helps you achieve faster page loads by reducing the size of images and using modern image formats. When deploying to Vercel, images are automatically optimized on demand, keeping your build times fast while improving your page load performance and [Core Web Vitals](/docs/speed-insights/metrics#core-web-vitals-explained).

Image Optimization with Astro on Vercel is supported out of the box with Astro's `Image` component. See [the Image Optimization quickstart](/docs/image-optimization/quickstart) to learn more.

**Image Optimization with Astro on Vercel:**

- Requires zero-configuration for Image Optimization when using Astro's `Image` component
- Helps your team ensure great performance by default
- Keeps your builds fast by optimizing images on-demand

[Learn more about Image Optimization](/docs/image-optimization)

## Middleware

[Middleware](/docs/routing-middleware) is a function that execute before a request is processed on a site, enabling you to modify the response. Because it runs before the cache, Middleware is an effective way to personalize statically generated content.

[Astro middleware](https://docs.astro.build/en/guides/middleware/#basic-usage) allows you to set and share information across your endpoints and pages with a  file in your `src` directory. The following example edits the global `locals` object, adding data which will be available in any `.astro` file:

```ts filename="src/middleware.ts" framework=all
// This helper automatically types middleware params
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(({ locals }, next) => {
  // intercept data from a request
  // optionally, modify the properties in `locals`
  locals.title = 'New title';

  // return a Response or the result of calling `next()`
  return next();
});
```

```js filename="src/middleware.js" framework=all
export function onRequest({ locals }, next) {
  // intercept data from a request
  // optionally, modify the properties in `locals`
  locals.title = 'New title';

  // return a Response or the result of calling `next()`
  return next();
}
```

> **💡 Note:** , which has to be placed at the root directory of your project, outside
> `src`.

To add custom properties to `locals` in `middleware.ts`, you must declare a global namespace in your `env.d.ts` file:

```ts filename="src/env.d.ts"
declare namespace App {
  interface Locals {
    title?: string;
  }
}
```

You can then access the data you added to `locals` in any `.astro` file, like so:

```jsx filename="src/pages/middleware-title.astro"
---
const { title } = Astro.locals;
---
<h1>{title}</h1>
<p>The name of this page is from middleware.</p>
```

### Deploying middleware at the Edge

You can deploy Astro's middleware at the Edge, giving you access to data in the `RequestContext` and `Request`, and enabling you to use [Vercel's Routing Middleware helpers](/docs/routing-middleware/api#routing-middleware-helper-methods), such as [`geolocation()`](/docs/routing-middleware/api#geolocation) or [`ipAddress()`](/docs/routing-middleware/api#geolocation).

To use Astro's middleware at the Edge, set `edgeMiddleware: true` in your  file:

```js filename="astro.config.mjs" framework=all
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    edgeMiddleware: true,
  }),
});
```

```ts filename="astro.config.ts" framework=all
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    edgeMiddleware: true,
  }),
});
```

> **💡 Note:** If you're using [Vercel's Routing
> Middleware](#using-vercel's-edge-middleware), you do not need to set
> `edgeMiddleware: true` in your
> &#x20;file.

See Astro's docs on [the limitations and constraints](https://docs.astro.build/en/guides/integrations-guide/vercel/#limitations-and-constraints) for using middleware at the Edge, as well as [their troubleshooting tips](https://docs.astro.build/en/guides/integrations-guide/vercel/#troubleshooting).

#### Using `Astro.locals` in Routing Middleware

The `Astro.locals` object exposes data to your `.astro` components, allowing you to dynamically modify your content with middleware. To make changes to `Astro.locals` in Astro's middleware at the edge:

1. Add a new middleware file next to your  and name it . This file name is required to make changes to [`Astro.locals`](https://docs.astro.build/en/reference/api-reference/#astrolocals). If you don't want to update `Astro.locals`, this step is not required
2. Return an object with the properties you want to add to `Astro.locals`:

   For TypeScript, you must install [the `@vercel/functions` package](/docs/routing-middleware/api#routing-middleware-helper-methods):

   <CodeBlock>
     <Code tab="pnpm">
       ```bash
       pnpm i @vercel/functions
       ```
     </Code>
     <Code tab="yarn">
       ```bash
       yarn i @vercel/functions
       ```
     </Code>
     <Code tab="npm">
       ```bash
       npm i @vercel/functions
       ```
     </Code>
     <Code tab="bun">
       ```bash
       bun i @vercel/functions
       ```
     </Code>
   </CodeBlock>

   Then, type your middleware function like so:

   ```ts filename="src/vercel-edge-middleware.ts" framework=all
   import type { RequestContext } from '@vercel/functions';

   // Note the parameters are different from standard Astro middleware
   export default function ({
     request,
     context,
   }: {
     request: Request;
     context: RequestContext;
   }) {
     // Return an Astro.locals object with a title property
     return {
       title: "Spider-man's blog",
     };
   }
   ```

   ```js filename="src/vercel-edge-middleware.js" framework=all
   // Note the parameters are different from standard Astro middleware
   export default function ({ request, context }) {
     // Return an Astro.locals object with a title property
     return {
       title: "Spider-man's blog",
     };
   }
   ```

### Using Vercel's Routing Middleware

Astro's middleware, which should be in , is distinct from Vercel Routing Middleware, which should be a  file at the root of your project.

Vercel recommends using framework-native solutions. You should use Astro's middleware over Vercel's Routing Middleware wherever possible.

If you still want to use Vercel's Routing Middleware, see [the Quickstart](/docs/routing-middleware/getting-started) to learn how.

### Rewrites

**Rewrites only work for static files with Astro**. You must use [Vercel's Routing Middleware](/docs/routing-middleware/api#match-paths-based-on-conditional-statements) for rewrites. You should not use `vercel.json` to rewrite URL paths with astro projects; doing so produces inconsistent behavior, and is not officially supported.

### Redirects

In general, Vercel recommends using framework-native solutions, and Astro has [built-in support for redirects](https://docs.astro.build/en/core-concepts/routing/#redirects). That said, you can also do redirects with [Vercel's Routing Middleware](/docs/routing-middleware/getting-started).

#### Redirects in your Astro config

You can do redirects on Astro with  the `redirects` config option as shown below:

```ts filename="astro.config.ts" framework=all
import { defineConfig } from 'astro/config';

export default defineConfig({
  redirects: {
    '/old-page': '/new-page',
  },
});
```

```js filename="astro.config.mjs" framework=all
import { defineConfig } from 'astro/config';

export default defineConfig({
  redirects: {
    '/old-page': '/new-page',
  },
});
```

#### Redirects in Server Endpoints

You can also return a redirect from a Server Endpoint using the [`redirect`](https://docs.astro.build/en/core-concepts/endpoints/#redirects) utility:

```ts filename="src/pages/links/[id].ts" framework=all
export async function GET({ params, redirect }): APIRoute {
  return redirect('/redirect-path', 307);
}
```

```js filename="src/pages/links/[id].js" framework=all
import { getLinkUrl } from '../db';

export async function GET({ redirect }) {
  return redirect('/redirect-path', 307);
}
```

#### Redirects in components

You can redirect from within Astro components with [`Astro.redirect()`](https://docs.astro.build/en/reference/api-reference/#astroredirect):

```tsx filename="src/pages/account.astro"
---
import { isLoggedIn } from '../utils';

const cookie = Astro.request.headers.get('cookie');

// If the user is not logged in, redirect them to the login page
if (!isLoggedIn(cookie)) {
  return Astro.redirect('/login');
}
---

<h1>You can only see this page while logged in</h1>
```

**Astro Middleware on Vercel:**

- Executes before a request is processed on a site, allowing you to modify responses to user requests
- Runs on *all* requests, but can be scoped to specific paths [through a `matcher` config](/docs/routing-middleware/api#match-paths-based-on-custom-matcher-config)
- Uses Vercel's lightweight Edge Runtime to keep costs low and responses fast

[Learn more about Routing Middleware](/docs/routing-middleware)

## Caching

Vercel automatically caches static files at the edge after the first request, and stores them for up to 31 days on Vercel's CDN. Dynamic content can also be cached, and both dynamic and static caching behavior can be configured with [Cache-Control headers](/docs/headers#cache-control-header).

The following Astro component will show a new time every 10 seconds. It does so by setting a 10 second max age on the contents of the page, then serving stale content while new content is being rendered on the server when that age is exceeded.

[Learn more about Cache Control options](/docs/headers#cache-control-header).

```jsx filename="src/pages/ssr-with-swr-caching.astro"
---
Astro.response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate');
const time = new Date().toLocaleTimeString();
---

<h1>{time}</h1>
```

### CDN Cache-Control headers

You can also control how the cache behaves on any CDNs you may be using outside of Vercel's CDN with CDN Cache-Control Headers.

The following example tells downstream CDNs to cache the content for 60 seconds, and Vercel's CDN to cache it for 3600 seconds:

```jsx filename="src/pages/ssr-with-swr-caching.astro"
---
Astro.response.headers.set('Vercel-CDN-Cache-Control', 'max-age=3600',);
Astro.response.headers.set('CDN-Cache-Control', 'max-age=60',);
const time = new Date().toLocaleTimeString();
---

<h1>{time}</h1>
```

[Learn more about CDN Cache-Control headers](/docs/headers/cache-control-headers#cdn-cache-control-header).

**Caching on Vercel:**

- Automatically optimizes and caches assets for the best performance
- Requires no additional services to procure or set up
- Supports zero-downtime rollouts

## Speed Insights

[Vercel Speed Insights](/docs/speed-insights) provides you with a detailed view of your website's performance metrics, facilitating informed decisions for its optimization. By [enabling Speed Insights](/docs/speed-insights/quickstart), you gain access to the Speed Insights dashboard, which offers in-depth information about scores and individual metrics without the need for code modifications or leaving the dashboard.

To enable Speed Insights with Astro, see [the Speed Insights quickstart](/docs/speed-insights/quickstart).

**To summarize, using Speed Insights with Astro on Vercel:**

- Enables you to track traffic performance metrics, such as [First Contentful Paint](/docs/speed-insights/metrics#first-contentful-paint-fcp), or [First Input Delay](/docs/speed-insights/metrics#first-input-delay-fid)
- Enables you to view performance metrics by page name and URL for more granular analysis
- Shows you [a score for your app's performance](/docs/speed-insights/metrics#how-the-scores-are-determined) on each recorded metric, which you can use to track improvements or regressions

[Learn more about Speed Insights](/docs/speed-insights)

## More benefits

See [our Frameworks documentation page](/docs/frameworks) to learn about the benefits available to **all** frameworks when you deploy on Vercel.

## More resources

Learn more about deploying Astro projects on Vercel with the following resources:

- [Vercel CLI](/docs/cli)
- [Vercel Function docs](/docs/functions)
- [Astro docs](https://docs.astro.build/en/guides/integrations-guide/vercel)


---

[View full sitemap](/docs/sitemap)
