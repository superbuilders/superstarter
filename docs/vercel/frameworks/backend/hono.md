---
title: Hono on Vercel
product: vercel
url: /docs/frameworks/backend/hono
type: how-to
prerequisites:
  - /docs/frameworks/backend
  - /docs/frameworks
related:
  - /docs/git
  - /docs/deployments/environments
  - /docs/cli/init
  - /docs/routing-middleware
  - /docs/cdn
summary: Deploy Hono applications to Vercel with zero configuration. Learn about observability, ISR, and custom build configurations.
---

# Hono on Vercel

Hono is a fast and lightweight web application framework built on Web Standards. You can deploy a Hono app to Vercel with zero configuration.

## Get started with Hono on Vercel

Start with Hono on Vercel by using the following Hono template to deploy to Vercel with zero configuration:

Vercel deployments can [integrate with your git provider](/docs/git) to [generate preview URLs](/docs/deployments/environments#preview-environment-pre-production) for each pull request you make to your Hono project.

### Get started with Vercel CLI

Get started by initializing a new Hono project using [Vercel CLI init command](/docs/cli/init):

```bash filename="terminal"
vc init hono
```

This will clone the [Hono example repository](https://github.com/vercel/vercel/tree/main/examples/hono) in a directory called `hono`.

## Exporting the Hono application

To run a Hono application on Vercel, create a file that imports the `hono` package at any one of the following locations:

- `app.{js,cjs,mjs,ts,cts,mts}`
- `index.{js,cjs,mjs,ts,cts,mts}`
- `server.{js,cjs,mjs,ts,cts,mts}`
- `src/app.{js,cjs,mjs,ts,cts,mts}`
- `src/index.{js,cjs,mjs,ts,cts,mts}`
- `src/server.{js,mjs,cjs,ts,cts,mts}`

```ts filename="server.ts"
import { Hono } from 'hono';

const app = new Hono();

// ...

export default app;
```

### Local development

To run your Hono application locally, use [Vercel CLI](https://vercel.com/docs/cli/dev):

```filename="terminal"
vc dev
```

This ensures that the application will use the default export to run the same as when deployed to Vercel. The application will be available on your `localhost`.

## Middleware

Hono has the concept of "Middleware" as a part of the framework. This is different from [Vercel Routing Middleware](/docs/routing-middleware), though they can be used together.

### Hono Middleware

In Hono, [Middleware](https://hono.dev/docs/concepts/middleware) runs before a request handler in the framework's router. This is commonly used for loggers, CORS handling, or authentication. The code in the Hono application might look like this:

```ts filename="src/index.ts" framework="hono"
app.use(logger());
app.use('/posts/*', cors());
app.post('/posts/*', basicAuth());
```

More examples of Hono Middleware can be found in [the Hono documentation](https://hono.dev/docs/middleware/builtin/basic-auth).

### Vercel Routing Middleware

In Vercel, [Routing Middleware](/docs/routing-middleware) executes code before a request is processed by the application. This gives you a way to handle rewrites, redirects, headers, and more, before returning a response. See [the Routing Middleware documentation](/docs/routing-middleware) for examples.

## Serving static assets

To serve static assets, place them in the `public/**` directory. They will be served as a part of our [CDN](/docs/cdn) using default [headers](/docs/headers) unless otherwise specified in `vercel.json`.

[Hono's `serveStatic()`](https://hono.dev/docs/getting-started/nodejs#serve-static-files) will be ignored and will not serve static assets.

## Vercel Functions

When you deploy a Hono app to Vercel, your server routes automatically become [Vercel Functions](/docs/functions) and use [Fluid compute](/docs/fluid-compute) by default.

### Streaming

Vercel Functions support streaming which can be used with [Hono's `stream()` function](https://hono.dev/docs/helpers/streaming).

```ts filename="src/index.ts" framework="hono"
app.get('/stream', (c) => {
  return stream(c, async (stream) => {
    // Write a process to be executed when aborted.
    stream.onAbort(() => {
      console.log('Aborted!');
    });
    // Write a Uint8Array.
    await stream.write(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    // Pipe a readable stream.
    await stream.pipe(anotherReadableStream);
  });
});
```

## More resources

Learn more about deploying Hono projects on Vercel with the following resources:

- [Hono templates on Vercel](https://vercel.com/templates/hono)
- [Backend templates on Vercel](https://vercel.com/templates?type=backend)


---

[View full sitemap](/docs/sitemap)
