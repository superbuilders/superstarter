---
title: Functions API Reference
product: vercel
url: /docs/functions/functions-api-reference
type: reference
prerequisites:
  - /docs/functions
related:
  - /docs/functions/functions-api-reference/vercel-functions-package
  - /docs/project-configuration
  - /docs/functions/configuring-functions
  - /docs/functions/configuring-functions/runtime
  - /docs/functions/configuring-functions/region
summary: Learn about available APIs when working with Vercel Functions.
---

# Functions API Reference

> For \["nextjs-app"]:

Functions are defined similar to a [Route Handler](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) in Next.js. When using Next.js App Router, you can define a function in a file under  in your project. Vercel will deploy any file under `app/api/` as a function.

> For \["nextjs"]:

While you can define a function with a traditional [Next.js API Route](https://nextjs.org/docs/api-routes/introduction), they do not support streaming responses. To stream responses in Next.js, you must use [Route Handlers in the App Router](https://nextjs.org/docs/app/building-your-application/routing/route-handlers "Route Handlers"), even if the rest of your app uses the Pages Router. This will not alter the behavior of your application.

You can create an `app` directory at the same level as your `pages` directory.
Then, define your function in .

> For \["other"]:

You can create a function in other frameworks or with no frameworks by defining your function in a file under `/api` in your project. Vercel will deploy any file in the `/api` directory as a function.

## Function signature

Vercel Functions use a Web Handler, which consists of the `request` parameter that is an instance of the web standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) API. Next.js [extends](https://nextjs.org/docs/app/api-reference/functions/next-request) the standard `Request` object with additional properties and methods.

| Parameter | Description                                                                                                                           | Next.js                                                                        | Other Frameworks                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `request` | An instance of the `Request` object                                                                                                   | [`NextRequest`](https://nextjs.org/docs/api-reference/next/server#nextrequest) | [`Request`](https://developer.mozilla.org/docs/Web/API/Request)                               |
| `context` |  Deprecated, use [`@vercel/functions`](/docs/functions/functions-api-reference/vercel-functions-package#waituntil) instead | N/A                                                                            | [`{ waitUntil }`](/docs/functions/functions-api-reference/vercel-functions-package#waituntil) |

> For \['nextjs']:

```ts v0="build" filename="app/api/hello/route.ts" framework=nextjs
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js v0="build" filename="app/api/hello/route.js" framework=nextjs
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

```ts filename="api/hello.ts" framework=other
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js filename="api/hello.js" framework=other
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

```ts v0="build" filename="app/api/hello/route.ts" framework=nextjs-app
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js v0="build" filename="app/api/hello/route.js" framework=nextjs-app
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

> For \["nextjs"]:

The above shows how you can use a [Route Handlers in the App Router](https://nextjs.org/docs/app/building-your-application/routing/route-handlers "Route Handlers") in your Pages app and is advantageous because it allows you to use a common signature, web standards, and stream responses.

> For \["other"]:

### `fetch` Web Standard

Vercel Functions also support the `fetch` Web Standard export, used by many frameworks like [Hono](https://hono.dev), [ElysiaJS](https://elysiajs.com), [H3](https://h3.dev), and various JavaScript runtimes to enhance interoperability with zero-config. It uses the Web Handlers syntax and allows you to handle all HTTP methods inside a single function.

```ts filename="api/hello.ts" framework=all
export default {
  fetch(request: Request) {
    return new Response('Hello from Vercel!');
  },
};
```

```js filename="api/hello.js" framework=all
export default {
  fetch(request) {
    return new Response('Hello from Vercel!');
  },
};
```

### Cancel requests

> **💡 Note:** This feature is only available in the Node.js runtime.

Cancelling requests is useful for cleaning up resources or stopping long-running tasks when the client aborts the request — for example, when a user hits stop on an AI chat or they close a browser tab.

To cancel requests in Vercel Functions

1. In your `vercel.json` file, add `"supportsCancellation": true` to the [specific paths](/docs/project-configuration#key-definition) you want to opt-in to cancellation for your functions. For example, to enable everything, use `**/*` as the glob or `app/**/*` for app router:

   ```json filename="vercel.json"  {5}
   {
     "regions": ["iad1"],
     "functions": {
       "api/*": {
         "supportsCancellation": true
       }
     }
   }
   ```

   When you have enabled cancellation, anything that must be completed in the event of request cancellation should be put in a `waitUntil` or `after` promise. If you don't, there is no guarantee that code will be executed after the request is cancelled.

2. Use the `AbortController` API in your function to cancel the request. This will allow you to clean up resources or stop long-running tasks when the client aborts the request:

   ```ts filename="api/abort-controller/route.ts" {2, 4-7, 13}
   export async function GET(request: Request) {
     const abortController = new AbortController();

     request.signal.addEventListener('abort', () => {
       console.log('request aborted');
       abortController.abort();
     });

     const response = await fetch('https://my-backend-service.example.com', {
       headers: {
         Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
       },
       signal: abortController.signal,
     });

     return new Response(response.body, {
       status: response.status,
       headers: response.headers,
     });
   }
   ```

> For \["nextjs", "other"]:

## `config` object

### `config` properties

The table below shows a highlight of the valid config options. For detailed information on all the config options, see the [Configuring Functions](/docs/functions/configuring-functions) docs.

| Property                                                        | Type     | Description                                                                                                                                                                               |
| --------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`runtime`](/docs/functions/configuring-functions/runtime)      | `string` | This optional property defines the runtime to use, and if not set the runtime will default to `nodejs`.                                                                                   |
| [`regions`](/docs/functions/configuring-functions/region)       | `string` | This optional property and can be used to specify the [region](/docs/regions#region-list) in which your function should execute. This can only be set when the `runtime` is set to `edge` |
| [`maxDuration`](/docs/functions/configuring-functions/duration) | `int`    | This optional property can be used to specify the maximum duration in seconds that your function can run for. This can't be set when the `runtime` is set to `edge`                       |

> For \["nextjs-app"]:

## Route segment config

To configure your function when using the App Router in Next.js, you use [segment options](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config), rather than a `config` object.

```ts filename="app/api/example/route.ts" framework=all
export const runtime = 'nodejs';
export const maxDuration = 15;
```

```js filename="app/api/example/route.ts" framework=all
export const maxDuration = 15;
```

The table below shows a highlight of the valid config options. For detailed information on all the config options, see the [Configuring Functions](/docs/functions/configuring-functions) docs.

| Property                                                          | Type     | Description                                                                                                                                                                                |
| ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`runtime`](/docs/functions/configuring-functions/runtime)        | `string` | This optional property defines the runtime to use, and if not set the runtime will default to `nodejs`.                                                                                    |
| [`preferredRegion`](/docs/functions/configuring-functions/region) | `string` | This optional property and can be used to specify the [regions](/docs/regions#region-list) in which your function should execute. This can only be set when the `runtime` is set to `edge` |
| [`maxDuration`](/docs/functions/configuring-functions/duration)   | `int`    | This optional property can be used to specify the maximum duration in seconds that your function can run for. This can't be set when the `runtime` is set to `edge`                        |

## `SIGTERM` signal

> **💡 Note:** This feature is supported on the Node.js and Python runtimes.

A `SIGTERM` signal is sent to a function when it is about to be terminated, such as during scale-down events. This allows you to perform any necessary cleanup operations before the function instance is terminated.

Your code can run for up to 500 milliseconds after receiving a `SIGTERM` signal. After this period, the function instance will be terminated immediately.

```ts filename="api/hello.ts" framework=all
process.on('SIGTERM', () => {
  // Perform cleanup operations here
});
```

```js filename="api/hello.js" framework=all
process.on('SIGTERM', () => {
  // Perform cleanup operations here
});
```

## The `@vercel/functions` package

The `@vercel/functions` package provides a set of helper methods and utilities for working with Vercel Functions.

### Helper methods

- [**`waitUntil()`**](/docs/functions/functions-api-reference/vercel-functions-package#waituntil): This method allows you to extend the lifetime of a request handler for the duration of a given Promise . It's useful for tasks that can be performed after the response is sent, such as logging or updating a cache.
- [**`getEnv`**](/docs/functions/functions-api-reference/vercel-functions-package#getenv): This function retrieves System Environment Variables exposed by Vercel.
- [**`geolocation()`**](/docs/functions/functions-api-reference/vercel-functions-package#geolocation): Returns location information for the incoming request, including details like city, country, and coordinates.
- [**`ipAddress()`**](/docs/functions/functions-api-reference/vercel-functions-package#ipaddress): Extracts the IP address of the request from the headers.
- [**`invalidateByTag()`**](/docs/functions/functions-api-reference/vercel-functions-package#invalidatebytag): Marks a cache tag as stale, causing cache entries associated with that tag to be revalidated in the background on the next request.
- [**`dangerouslyDeleteByTag()`**](/docs/functions/functions-api-reference/vercel-functions-package#dangerouslydeletebytag): Marks a cache tag as deleted, causing cache entries associated with that tag to be revalidated in the foreground on the next request.
- [**`invalidateBySrcImage()`**](/docs/functions/functions-api-reference/vercel-functions-package#invalidatebysrcimage): Marks all cached content associated with a source image as stale, causing those cache entries to be revalidated in the background on the next request. This invalidates all cached transformations of the source image.
- [**`dangerouslyDeleteBySrcImage()`**](/docs/functions/functions-api-reference/vercel-functions-package#dangerouslydeletebysrcimage): Marks all cached content associated with a source image as deleted, causing those cache entries to be revalidated in the foreground on the next request. Use this method with caution because deleting the cache can cause many concurrent requests to the origin leading to [cache stampede problem](https://en.wikipedia.org/wiki/Cache_stampede).
- [**`getCache()`**](/docs/functions/functions-api-reference/vercel-functions-package#getcache): Obtain a [`RuntimeCache`](/docs/functions/functions-api-reference/vercel-functions-package#getcache) object to interact with the [Vercel Runtime Cache](/docs/runtime-cache).

See the [`@vercel/functions`](/docs/functions/functions-api-reference/vercel-functions-package) documentation for more information.

## The `@vercel/oidc` package

> **💡 Note:** The `@vercel/oidc` package was previously provided by
> `@vercel/functions/oidc`.

The `@vercel/oidc` package provides helper methods and utilities for working with OpenID Connect (OIDC) tokens.

### OIDC Helper methods

- [**`getVercelOidcToken()`**](/docs/functions/functions-api-reference/vercel-functions-package#getverceloidctoken): Retrieves the OIDC token from the request context or environment variable.

See the [`@vercel/oidc`](/docs/functions/functions-api-reference/vercel-functions-package) documentation for more information.

## The `@vercel/oidc-aws-credentials-provider` package

> **💡 Note:** The `@vercel/oidc-aws-credentials-provider` package was previously provided by
> `@vercel/functions/oidc`.

The `@vercel/oidc-aws-credentials-provider` package provides helper methods and utilities for working with OpenID Connect (OIDC) tokens and AWS credentials.

### AWS Helper methods

- [**`awsCredentialsProvider()`**](/docs/functions/functions-api-reference/vercel-functions-package#awscredentialsprovider): This function helps in obtaining AWS credentials using Vercel's OIDC token.

See the [`@vercel/oidc-aws-credentials-provider`](/docs/functions/functions-api-reference/vercel-functions-package) documentation for more information.

## More resources

- [Streaming Data: Learn about streaming on Vercel](/docs/functions/streaming)


---

[View full sitemap](/docs/sitemap)
