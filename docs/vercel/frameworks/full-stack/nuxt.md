---
title: Nuxt on Vercel
product: vercel
url: /docs/frameworks/full-stack/nuxt
type: conceptual
prerequisites:
  - /docs/frameworks/full-stack
  - /docs/frameworks
related:
  - /docs/functions
  - /docs/incremental-static-regeneration
  - /docs/cdn
  - /docs/image-optimization
  - /docs/speed-insights
summary: "Learn how to use Vercel's features with Nuxt."
---

# Nuxt on Vercel

Nuxt is an open-source framework that streamlines the process of creating modern Vue apps. It offers server-side rendering, SEO features, automatic code splitting, prerendering, and more out of the box. It also has [an extensive catalog of community-built modules](https://nuxt.com/modules), which allow you to integrate popular tools with your projects.

You can deploy Nuxt static and server-side rendered sites on Vercel with no configuration required.

## Getting started

### Choosing a build command

The following table outlines the differences between `nuxt build` and `nuxt generate` on Vercel:

| Feature                                              | `nuxt build`                               | `nuxt generate` |
| ---------------------------------------------------- | ------------------------------------------ | --------------- |
| Default build command                                | Yes                                        | No              |
| Supports all Vercel features out of the box          | Yes                                        | Yes             |
| [Supports SSR](#server-side-rendering-ssr)           | Yes                                        | No              |
| [Supports SSG](#static-rendering)                    | Yes, [with nuxt config](#static-rendering) | Yes             |
| [Supports ISR](#incremental-static-regeneration-isr) | Yes                                        | No              |

In general, `nuxt build` is likely best for most use cases. Consider using `nuxt generate` to build [fully static sites](#static-rendering).

## Editing your Nuxt config

You can configure your Nuxt deployment by creating a Nuxt config file in your project's root directory. It can be a TypeScript, JavaScript, or MJS file, but **[the Nuxt team recommends using TypeScript](https://nuxt.com/docs/getting-started/configuration#nuxt-configuration)**. Using TypeScript will allow your editor to suggest the correct names for configuration options, which can help mitigate typos.

Your Nuxt config file should default export `defineNuxtConfig` by default, which you can add an options object to.

The following is an example of a Nuxt config file with no options defined:

```ts filename="nuxt.config.ts" framework=all
export default defineNuxtConfig({
  // Config options here
});
```

```js filename="nuxt.config.js" framework=all
export default defineNuxtConfig({
  // Config options here
});
```

[See the Nuxt Configuration Reference docs for a list of available options](https://nuxt.com/docs/api/configuration/nuxt-config/#nuxt-configuration-reference).

### Using `routeRules`

With the `routeRules` config option, you can:

- Create redirects
- Modify a route's response headers
- Enable ISR
- Deploy specific routes statically
- Deploy specific routes with SSR
- and more

> **💡 Note:** At the moment, there is no way to configure route deployment options within
> your page components, but development of this feature is in progress.

The following is an example of a Nuxt config that:

- Creates a redirect
- Modifies a route's response headers
- Opts a set of routes into client-side rendering

```js filename="nuxt.config.js" framework=all
export default defineNuxtConfig({
  routeRules: {
    '/examples/*': { redirect: '/redirect-route' },
    '/modify-headers-route': { headers: { 'x-magic-of': 'nuxt and vercel' } },
    // Enables client-side rendering
    '/spa': { ssr: false },
  },
});
```

```ts filename="nuxt.config.ts" framework=all
export default defineNuxtConfig({
  routeRules: {
    '/examples/*': { redirect: '/redirect-route' },
    '/modify-headers-route': { headers: { 'x-magic-of': 'nuxt and vercel' } },
    // Enables client-side rendering
    '/spa': { ssr: false },
  },
});
```

To learn more about `routeRules`:

- [Read Nuxt's reference docs to learn more about the available route options](https://nuxt.com/docs/guide/concepts/rendering#route-rules)
- [Read the Nitro Engine's Cache API docs to learn about cacheing individual routes](https://nitro.unjs.io/guide/cache)

## Vercel Functions

[Vercel Functions](/docs/functions) enable developers to write functions that use resources that scale up and down based on traffic demands. This prevents them from failing during peak hours, but keeps them from running up high costs during periods of low activity.

Nuxt deploys routes defined in `/server/api`, `/server/routes`, and `/server/middleware` as one server-rendered Function by default. Nuxt Pages, APIs, and Middleware routes get bundled into a single Vercel Function.

The following is an example of a basic API Route in Nuxt:

```ts filename="server/api/hello.ts" framework=all
export default defineEventHandler(() => 'Hello World!');
```

```js filename="server/api/hello.js" framework=all
export default defineEventHandler(() => 'Hello World!');
```

You can test your API Routes with `nuxt dev`.

## Reading and writing files

You can read and write server files with Nuxt on Vercel. One way to do this is by using Nitro with Vercel Functions and a Redis driver such as the [Upstash Redis driver](https://unstorage.unjs.io/drivers/upstash). Use Nitro's [server assets](https://nitro.unjs.io/guide/assets#server-assets) to include files in your project deployment. Assets within `server/assets` get included by default.

To access server assets, you can use Nitro's [storage API](https://nitro.unjs.io/guide/storage):

```ts filename="server/api/storage.ts" framework=all
export default defineEventHandler(async () => {
  // https://nitro.unjs.io/guide/assets#server-assets
  const assets = useStorage('assets:server');
  const users = await assets.getItem('users.json');
  return {
    users,
  };
});
```

```js filename="server/api/storage.js" framework=all
export default defineEventHandler(async () => {
  // https://nitro.unjs.io/guide/assets#server-assets
  const assets = useStorage('assets:server');
  const users = await assets.getItem('users.json');
  return {
    users,
  };
});
```

To write files, mount [Redis storage](https://nitro.unjs.io/guide/storage) with a Redis driver such as the [Upstash Redis driver](https://unstorage.unjs.io/drivers/upstash).

First, [install Upstash Redis from the Vercel Marketplace](https://vercel.com/marketplace/upstash) to get your Redis credentials.

Then update your  file:

```ts filename="nuxt.config.ts" framework=all
export default defineNuxtConfig({
  $production: {
    nitro: {
      storage: {
        data: { driver: 'upstash' },
      },
    },
  },
});
```

```js filename="nuxt.config.js" framework=all
export default defineNuxtConfig({
  $production: {
    nitro: {
      storage: {
        data: { driver: 'upstash' },
      },
    },
  },
});
```

Use with the storage API.

```ts filename="server/api/storage.ts" framework=all
export default defineEventHandler(async (event) => {
  const dataStorage = useStorage('data');
  await dataStorage.setItem('hello', 'world');
  return {
    hello: await dataStorage.getItem('hello'),
  };
});
```

```js filename="server/api/storage.js" framework=all
export default defineEventHandler(async (event) => {
  const dataStorage = useStorage('data');
  await dataStorage.setItem('hello', 'world');
  return {
    hello: await dataStorage.getItem('hello'),
  };
});
```

[See an example code repository](https://github.com/pi0/nuxt-server-assets/tree/main).

## Middleware

Middleware is code that executes before a request gets processed. Because Middleware runs before the cache, it's an effective way of providing personalization to statically generated content.

Nuxt has two forms of Middleware:

- [Server middleware](#nuxt-server-middleware-on-vercel)
- [Route middleware](#nuxt-route-middleware-on-vercel)

### Nuxt server middleware on Vercel

In Nuxt, modules defined in `/server/middleware` will get deployed as [server middleware](https://nuxt.com/docs/guide/directory-structure/server#server-middleware). Server middleware should not have a return statement or send a response to the request.

Server middleware is best used to read data from or add data to a request's `context`. Doing so allows you to handle authentication or check a request's params, headers, url, [and more](https://www.w3schools.com/nodejs/obj_http_incomingmessage.asp).

The following example demonstrates Middleware that:

- Checks for a cookie
- Tries to fetch user data from a database based on the request
- Adds the user's data and the cookie data to the request's context

```ts filename="server/middleware/auth.ts" framework=all
import { getUserFromDBbyCookie } from 'some-orm-package';

export default defineEventHandler(async (event) => {
  // The getCookie method is available to all
  // Nuxt routes by default. No need to import.
  const token = getCookie(event, 'session_token');

  // getUserFromDBbyCookie is a placeholder
  // made up for this example. You can fetch
  // data from wherever you want here
  const { user } = await getUserFromDBbyCookie(event.request);

  if (user) {
    event.context.user = user;
    event.context.session_token = token;
  }
});
```

```js filename="server/middleware/auth.js" framework=all
import { getUserFromDBbyCookie } from 'some-orm-package';

export default defineEventHandler(async (event) => {
  // The getCookie method is available to all
  // Nuxt routes by default. No need to import.
  const token = getCookie(event, 'session_token');

  // getUserFromDBbyCookie is a placeholder
  // made up for this example. You can fetch
  // data from wherever you want here
  const { user } = await getUserFromDBbyCookie(event.request, event.response);

  if (user) {
    event.context.user = user;
    event.context.session_token = token;
  }
});
```

You could then access that data in a page on the frontend with the [`useRequestEvent`](https://nuxt.com/docs/api/composables/use-request-event) hook. This hook is only available in routes deployed with SSR. If your page renders in the browser, `useRequestEvent` will return `undefined`.

The following example demonstrates a page fetching data with `useRequestEvent`:

```tsx filename="example.vue" framework=all
<script>
  const event = useRequestEvent();
  const user = ref(event.context?.user);
</script>

<template>
    <div v-if="user">
      <h1>Hello, {{ user.name }}!</h1>
    </div>
    <div v-else>
      <p>Authentication failed!</p>
    </div>
</template>
```

```js filename="example.vue" framework=all
<script>
  const event = useRequestEvent();
  const user = ref(event.context?.user);
</script>

<template>
    <div v-if="user">
      <h1>Hello, {{ user.name }}!</h1>
    </div>
    <div v-else>
      <p>Authentication failed!</p>
    </div>
</template>
```

### Nuxt route middleware on Vercel

Nuxt's route middleware runs before navigating to a particular route. While server middleware runs in Nuxt's [Nitro engine](https://nitro.unjs.io/), route middleware runs in Vue.

Route middleware is best used when you want to do things that server middleware can't, such as redirecting users, or preventing them from navigating to a route.

The following example demonstrates route middleware that redirects users to a secret route:

```ts filename="middleware/redirect.ts" framework=all
export default defineNuxtRouteMiddleware((to) => {
  console.log(
    `Heading to ${to.path} - but I think we should go somewhere else...`,
  );

  return navigateTo('/secret');
});
```

```js filename="middleware/redirect.js" framework=all
export default defineNuxtRouteMiddleware((to) => {
  console.log(
    `Heading to ${to.path} - but I think we should go somewhere else...`,
  );

  return navigateTo('/secret');
});
```

By default, route middleware code will only run on pages that specify them. To do so, within the `<script>` tag for a page, you must call the `definePageMeta` method, passing an object with `middleware: 'middleware-filename'` set as an option.

The following example demonstrates a page that runs the above redirect middleware:

```tsx filename="redirect.vue" framework=all
<script>
definePageMeta({
  middleware: 'redirect'
})
</script>

<template>
  <div>
    You should never see this page
  </div>
</template>
```

```jsx filename="redirect.vue" framework=all
<script>
definePageMeta({
  middleware: 'redirect'
})
</script>

<template>
  <div>
    You should never see this page
  </div>
</template>
```

To make a middleware global, add the `.global` suffix before the file extension. The following is an example of a basic global middleware file:

```ts filename="example-middleware.global.ts" framework=all
export default defineNuxtRouteMiddleware(() => {
  console.log('running global middleware');
});
```

```js filename="example-middleware.global.js" framework=all
export default defineNuxtRouteMiddleware(() => {
  console.log('running global middleware');
});
```

[See a detailed example of route middleware in Nuxt's Middleware example docs](https://nuxt.com/docs/examples/routing/middleware).

**Middleware with Nuxt on Vercel enables you to:**

- Redirect users, and prevent navigation to routes
- Run authentication checks on the server, and pass results to the frontend
- Scope middleware to specific routes, or run it on all routes

[Learn more about Middleware](https://nuxt.com/docs/guide/directory-structure/middleware)

## Server-Side Rendering (SSR)

Server-Side Rendering (SSR) allows you to render pages dynamically on the server. This is useful for pages where the rendered data needs to be unique on every request. For example, checking authentication or looking at the location of an incoming request.

Nuxt allows you to deploy your projects with a strategy called [Universal Rendering](https://nuxt.com/docs/guide/concepts/rendering#universal-rendering). In concrete terms, this allows you to deploy your routes with SSR by default and opt specific routes out [in your Nuxt config](#editing-your-nuxt-config).

When you deploy your app with Universal Rendering, it renders on the server once, then your client-side JavaScript code gets interpreted in the browser again once the page loads.

On Vercel, Nuxt apps are server-rendered by default

**SSR with Nuxt on Vercel:**

- Scales to zero when not in use
- Scales automatically with traffic increases
- Allows you to opt individual routes out of SSR [with your Nuxt config](https://nuxt.com/docs/getting-started/deployment#client-side-only-rendering)

[Learn more about SSR](https://nuxt.com/docs/guide/concepts/rendering#universal-rendering)

## Client-side rendering

If you deploy with `nuxt build`, you can opt nuxt routes into client-side rendering using `routeRules` by setting `ssr: false` as demonstrated below:

```ts filename="nuxt.config.ts" framework=all
export default defineNuxtConfig({
  routeRules: {
    // Use client-side rendering for this route
    '/client-side-route-example': { ssr: false },
  },
});
```

```js filename="nuxt.config.js" framework=all
export default defineNuxtConfig({
  routeRules: {
    // Use client-side rendering for this route
    '/client-side-route-example': { ssr: false },
  },
});
```

## Static rendering

To deploy a fully static site on Vercel, build your project with `nuxt generate`.

Alternatively, you can statically generate some Nuxt routes at build time using the `prerender` route rule in your :

```ts filename="nuxt.config.ts" framework=all
export default defineNuxtConfig({
  routeRules: {
    // prerender index route by default
    '/': { prerender: true },
    // prerender this route and all child routes
    '/prerender-multiple/**': { prerender: true },
  },
});
```

```js filename="nuxt.config.js" framework=all
export default defineNuxtConfig({
  routeRules: {
    // prerender index route by default
    '/': { prerender: true },
    // prerender this route and all child routes
    '/prerender-multiple/**': { prerender: true },
  },
});
```

> **💡 Note:** To verify that a route is prerendered at build time, check
> `useNuxtApp().payload.prerenderedAt`.

## Incremental Static Regeneration (ISR)

[Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration) allows you to create or update content *without* redeploying your site. ISR has two main benefits for developers: better performance and faster build times.

To enable ISR in a Nuxt route, add a `routeRules` option to your , as shown in the example below:

```ts filename="nuxt.config.ts" framework=all
export default defineNuxtConfig({
  routeRules: {
    // all routes (by default) will be revalidated every 60 seconds, in the background
    '/**': { isr: 60 },
    // this page will be generated on demand and then cached permanently
    '/static': { isr: true },
    // this page is statically generated at build time and cached permanently
    '/prerendered': { prerender: true },
    // this page will be always fresh
    '/dynamic': { isr: false },
  },
});
```

```js filename="nuxt.config.js" framework=all
export default defineNuxtConfig({
  routeRules: {
    // all routes (by default) will be revalidated every 60 seconds, in the background
    '/**': { isr: 60 },
    // this page will be generated on demand and then cached permanently
    '/static': { isr: true },
    // this page is statically generated at build time and cached permanently
    '/prerendered': { prerender: true },
    // this page will be always fresh
    '/dynamic': { isr: false },
  },
});
```

You should use the `isr` option rather than `swr` to enable ISR in a route. The `isr` option enables Nuxt to use Vercel's Cache.

**using ISR with Nuxt on Vercel offers:**

- Better performance with our global [CDN](/docs/cdn)
- Zero-downtime rollouts to previously statically generated pages
- Global content updates in 300ms
- Generated pages are both cached and persisted to durable storage

[Learn more about ISR with Nuxt](https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering).

## Redirects and Headers

You can define redirects and response headers with Nuxt on Vercel in your :

```js filename="nuxt.config.js" framework=all
export default defineNuxtConfig({
  routeRules: {
    '/examples/*': { redirect: '/redirect-route' },
    '/modify-headers-route': { headers: { 'x-magic-of': 'nuxt and vercel' } },
  },
});
```

```ts filename="nuxt.config.ts" framework=all
export default defineNuxtConfig({
  routeRules: {
    '/examples/*': { redirect: '/redirect-route' },
    '/modify-headers-route': { headers: { 'x-magic-of': 'nuxt and vercel' } },
  },
});
```

## Image Optimization

[Image Optimization](/docs/image-optimization) helps you achieve faster page loads by reducing the size of images and using modern image formats.

When deploying to Vercel, images are automatically optimized on demand, keeping your build times fast while improving your page load performance and [Core Web Vitals](/docs/speed-insights).

To use Image Optimization with Nuxt on Vercel, follow [the Image Optimization quickstart](/docs/image-optimization/quickstart) by selecting **Nuxt** from the dropdown.

**Using Image Optimization with Nuxt on Vercel:**

- Requires zero-configuration for Image Optimization when using `@nuxt/image`
- Helps your team ensure great performance by default
- Keeps your builds fast by optimizing images on-demand

[Learn more about Image Optimization](/docs/image-optimization)

## Open Graph Images

Dynamic social card images allow you to create a unique image for pages of your site. This is great for sharing links on the web through social platforms or text messages.

To generate dynamic social card images for Nuxt projects, you can use [`nuxt-og-image`](https://nuxtseo.com/og-image/getting-started/installation). It uses the main Nuxt/Nitro [Server-side rendering(SSR)](#server-side-rendering-ssr) function.

The following example demonstrates using Open Graph (OG) image generation with [`nuxt-og-image`](https://nuxtseo.com/og-image/getting-started/installation):

1. Create a new OG template

```ts filename="components/OgImage/Template.vue" framework=all
<script setup lang="ts">
  withDefaults(defineProps<{
    title?: string
  }>(), {
    title: 'title',
  })
</script>
<template>
  <div class="h-full w-full flex items-start justify-start border border-blue-500 border-12 bg-gray-50">
    <div class="flex items-start justify-start h-full">
      <div class="flex flex-col justify-between w-full h-full">
        <h1 class="text-[80px] p-20 font-black text-left">
          {{ title }}
        </h1>
        <p class="text-2xl pb-10 px-20 font-bold mb-0">
          acme.com
        </p>
      </div>
    </div>
  </div>
</template>
```

```js filename="components/OgImage/BlogPost.vue" framework=all
<script setup lang="js">
  withDefaults(defineProps(), {
    title: 'title',
  })
</script>
<template>
  <div class="h-full w-full flex items-start justify-start border border-blue-500 border-12 bg-gray-50">
    <div class="flex items-start justify-start h-full">
      <div class="flex flex-col justify-between w-full h-full">
        <h1 class="text-[80px] p-20 font-black text-left">
          {{ title }}
        </h1>
        <p class="text-2xl pb-10 px-20 font-bold mb-0">
          acme.com
        </p>
      </div>
    </div>
  </div>
</template>
```

2. Use that OG image in your pages. Props passed get used in your open graph images.

```ts filename="pages/index.vue" framework=all
<script lang="ts" setup>
defineOgImageComponent('Template', {
  title: 'Is this thing on?'
})
</script>
```

```js filename="pages/index.vue" framework=all
<script lang="js" setup>
defineOgImageComponent('Template', {
  title: 'Is this thing on?'
})
</script>
```

To see your generated image, run your project and use Nuxt DevTools. Or you can visit the image at its URL `/__og-image__/image/og.png`.

[Learn more about OG Image Generation with Nuxt](https://nuxtseo.com/og-image/getting-started/installation).

## Deploying legacy Nuxt projects on Vercel

The Nuxt team [does not recommend deploying legacy versions of Nuxt (such as Nuxt 2) on Vercel](https://github.com/nuxt/vercel-builder#readme), except as static sites. If your project uses a legacy version of Nuxt, you should either:

- Implement [Nuxt Bridge](https://github.com/nuxt/bridge#readme)
- Or [upgrade with the Nuxt team's migration guide](https://nuxt.com/docs/migration/overview)

If you still want to use legacy Nuxt versions with Vercel, you should only do so by building a static site with `nuxt generate`. **We do not recommend deploying legacy Nuxt projects with server-side rendering**.

## More benefits

See [our Frameworks documentation page](/docs/frameworks) to learn about the benefits available to **all** frameworks when you deploy on Vercel.

## More resources

Learn more about deploying Nuxt projects on Vercel with the following resources:

- [Deploy our Nuxt Alpine template](/templates/nuxt/alpine)
- [See an example of Nuxt Image](/docs/image-optimization/quickstart)


---

[View full sitemap](/docs/sitemap)
