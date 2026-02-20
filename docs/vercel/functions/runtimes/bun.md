---
title: Using the Bun Runtime with Vercel Functions
product: vercel
url: /docs/functions/runtimes/bun
type: reference
prerequisites:
  - /docs/functions/runtimes
  - /docs/functions
related:
  - /docs/project-configuration
  - /docs/incremental-static-regeneration
  - /docs/routing-middleware
  - /docs/functions/runtimes/node-js
  - /docs/fluid-compute
summary: Learn how to use the Bun runtime with Vercel Functions to create fast, efficient functions.
---

# Using the Bun Runtime with Vercel Functions

> **🔒 Permissions Required**: The Bun runtime

Bun is a fast, all-in-one JavaScript runtime that serves as an alternative to Node.js.

Bun provides Node.js API compatibility and is generally faster than Node.js for CPU-bound tasks. It includes a bundler, test runner, and package manager.

## Configuring the runtime

For all frameworks, including Next.js, you can configure the runtime in your `vercel.json` file using the [`bunVersion`](/docs/project-configuration#bunversion) property.

Once you configure the runtime version, Vercel manages the Bun minor and patch versions automatically, meaning you only need to set the major version. Currently, `"1.x"` is the only valid value.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "bunVersion": "1.x"
}
```

> **💡 Note:** Vercel manages the Bun minor and patch versions automatically. `1.x` is the
> only valid value currently.

## Framework-specific considerations

### Next.js

When using Next.js, and [ISR](/docs/incremental-static-regeneration), you must change your `build` and `dev` commands in your package.json file to use the Bun runtime:

**Before:**

```json filename="package.json"
{
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}
```

**After:**

```json filename="package.json"
{
  "scripts": {
    "dev": "bun run --bun next dev",
    "build": "bun run --bun next build"
  }
}
```

### Routing Middleware

The Bun runtime works with [Routing Middleware](/docs/routing-middleware) the same way as the Node.js runtime once you set the `bunVersion` in your `vercel.json` file. Note that you'll also have to set the runtime config to `nodejs` in your  file.

## Feature support

The Bun runtime on Vercel supports most Node.js features. The main differences relate to automatic source maps, bytecode caching, and request metrics on the `node:http` and `node:https` modules. Request metrics using `fetch` work with both runtimes.

See the table below for a detailed comparison:

## Supported APIs

Vercel Functions using the Bun runtime support [most Node.js APIs](https://bun.sh/docs/runtime/nodejs-apis), including standard Web APIs such as the [Request and Response Objects](/docs/functions/runtimes/node-js#node.js-request-and-response-objects).

## Using TypeScript with Bun

Bun has built-in TypeScript support with zero configuration required. The runtime supports files ending with `.ts` inside of the `/api` directory as TypeScript files to compile and serve when deploying.

```typescript filename="api/hello.ts"
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const name = url.searchParams.get('name') || 'World';

    return Response.json({ message: `Hello ${name}!` });
  },
};
```

## Performance considerations

Bun is generally faster than Node.js, especially for CPU-bound tasks. Performance varies by workload, and in some cases Node.js may be faster depending on the specific operations your function performs.

## When to use Bun

Bun is best suited for new workloads where you want a fast, all-in-one toolkit with built-in support for TypeScript, JSX, and modern JavaScript features. Consider using Bun when:

- You want faster execution for CPU-bound tasks
- You prefer zero-config TypeScript and JSX support
- You're starting a new project and want to use modern tooling

Consider using Node.js instead if:

- Node.js is already installed on your project and is working for you
- You need automatic source maps for debugging
- You need request metrics on the `node:http` or `node:https` modules

Both runtimes run on [Fluid compute](/docs/fluid-compute) and support the same core Vercel Functions features.


---

[View full sitemap](/docs/sitemap)
