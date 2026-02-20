---
title: Configuring Maximum Duration for Vercel Functions
product: vercel
url: /docs/functions/configuring-functions/duration
type: how-to
prerequisites:
  - /docs/functions/configuring-functions
  - /docs/functions
related:
  - /docs/functions/usage-and-pricing
  - /docs/functions/limitations
  - /docs/project-configuration
  - /docs/fluid-compute
summary: Learn how to set the maximum duration of a Vercel Function.
---

# Configuring Maximum Duration for Vercel Functions

The maximum duration configuration determines the longest time that a function can run. This guide will walk you through configuring the maximum duration for your Vercel Functions.

## Consequences of changing the maximum duration

You are charged based on the amount of time your function has run, also known as its *duration*. It specifically refers to the *actual time* elapsed during the entire invocation, regardless of whether that time was actively used for processing or spent waiting for a streamed response. To learn more see [Managing function duration](/docs/functions/usage-and-pricing#managing-function-duration).

For this reason, Vercel has set a [default maximum duration](/docs/functions/limitations#max-duration) for functions, which can be useful for preventing runaway functions from consuming resources indefinitely.

If a function runs for longer than its set maximum duration, Vercel will terminate it. Therefore, when setting this duration, it's crucial to strike a balance:

1. Allow sufficient time for your function to complete its normal operations, including any necessary waiting periods (for example, streamed responses).
2. Set a reasonable limit to prevent abnormally long executions.

## Maximum duration for different runtimes

The method of configuring the maximum duration depends on your framework and runtime:

#### Node.js, Next.js (>= 13.5 or higher), SvelteKit, Astro, Nuxt, and Remix

For these runtimes / frameworks, you can configure the number of seconds directly in your function:

```ts v0="build" {1} filename="app/api/my-function/route.ts" framework=nextjs-app
export const maxDuration = 5; // This function can run for a maximum of 5 seconds

export function GET(request: Request) {
  return new Response('Vercel', {
    status: 200,
  });
}
```

```js v0="build" {1} filename="app/api/my-function/route.js" framework=nextjs-app
export const maxDuration = 5; // This function can run for a maximum of 5 seconds

export function GET(request) {
  return new Response('Vercel', {
    status: 200,
  });
}
```

```ts v0="build" {4-6} filename="pages/api/handler.ts" framework=nextjs
import { NextApiRequest, NextApiResponse } from 'next';

// This function can run for a maximum of 5 seconds
export const config = {
  maxDuration: 5,
};

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.status(200).json({
    body: request.body,
    query: request.query,
    cookies: request.cookies,
  });
}
```

```js v0="build" {2-4} filename="pages/api/handler.js" framework=nextjs
// This function can run for a maximum of 5 seconds
export const config = {
  maxDuration: 5,
};

export default function handler(request, response) {
  response.status(200).json({
    body: request.body,
    query: request.query,
    cookies: request.cookies,
  });
}
```

```ts {2-4} filename="app/routes/function/my-function.ts" framework=remix
// This function can run for a maximum of 5 seconds
export const config = {
  maxDuration: 5,
};

export default function Serverless() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Configuring maxDuration</h1>
    </div>
  );
}
```

```js {2-4} filename="app/routes/function/my-function.js" framework=remix
// This function can run for a maximum of 5 seconds
export const config = {
  maxDuration: 5,
};

export default function Serverless() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Configuring maxDuration</h1>
    </div>
  );
}
```

```js {7} filename="svelte.config.js" framework=sveltekit
import adapter from '@sveltejs/adapter-vercel';

// This function can run for a maximum of 5 seconds
export default {
  kit: {
    adapter: adapter({
      maxDuration: 5,
    }),
  },
};
```

```ts {7} filename="svelte.config.js" framework=sveltekit
import adapter from '@sveltejs/adapter-vercel';

// This function can run for a maximum of 5 seconds
export default {
  kit: {
    adapter: adapter({
      maxDuration: 5,
    }),
  },
};
```

```js {8} filename="astro.config.mjs" framework=astro
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// This function can run for a maximum of 5 seconds
export default defineConfig({
  output: 'server',
  adapter: vercel({
    maxDuration: 5,
  }),
});
```

```ts {8} filename="astro.config.mjs" framework=astro
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// This function can run for a maximum of 5 seconds
export default defineConfig({
  output: 'server',
  adapter: vercel({
    maxDuration: 5,
  }),
});
```

```js {7} filename="nitro.config.ts" framework=nuxt
import { defineNitroConfig } from 'nitropack';

// This function can run for a maximum of 5 seconds
export default defineNitroConfig({
  vercel: {
    functions: {
      maxDuration: 5,
    },
  },
});
```

```ts {7} filename="nitro.config.ts" framework=nuxt
import { defineNitroConfig } from 'nitropack';

// This function can run for a maximum of 5 seconds
export default defineNitroConfig({
  vercel: {
    functions: {
      maxDuration: 5,
    },
  },
});
```

```json {5,8} filename="vercel.json" framework=other
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.js": {
      "maxDuration": 30 // This function can run for a maximum of 30 seconds
    },
    "api/*.js": {
      "maxDuration": 15 // These functions can run for a maximum of 15 seconds
    }
  }
}
```

#### Other Frameworks and runtimes, Next.js versions older than 13.5, Go, Python, or Ruby

For these runtimes and frameworks, configure the `maxDuration` property of the [`functions` object](/docs/project-configuration#functions) in your `vercel.json` file:

```json {5,8,11} filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.js": {
      "maxDuration": 30 // This function can run for a maximum of 30 seconds
    },
    "api/*.js": {
      "maxDuration": 15 // This function can run for a maximum of 15 seconds
    },
    "src/api/*.js": {
      "maxDuration": 25 // You must prefix functions in the src directory with /src/
    }
  }
}
```

If your Next.js project is configured to use [src directory](https://nextjs.org/docs/app/building-your-application/configuring/src-directory), you will need to prefix your function routes with `/src/` for them to be detected.

> **💡 Note:** The order in which you specify file patterns is important. For more
> information, see [Glob
> pattern](/docs/project-configuration#glob-pattern-order).

## Setting a default maximum duration

While Vercel specifies [defaults](/docs/functions/limitations#max-duration) for the maximum duration of a function, you can also override it in the following ways:

### Dashboard

1. From your [dashboard](/dashboard), select your project and go to the **Settings** tab.
2. From the left side, select the **Functions** tab and scroll to the **Function Max Duration** section.
3. Update the **Default Max Duration** field value and select **Save**.

### `vercel.json` file

```json {4-5} filename="vercel.json" framework=nextjs-app
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "app/api/**/*": {
      "maxDuration": 5
    }
  }
}
```

```json {3-4} filename="pages/api/handler.js" framework=nextjs
{
  "functions": {
    "pages/api/**/*": {
      "maxDuration": 5
    }
  }
}
```

```json {4-5} filename="vercel.json" framework=remix
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "app/routes/**/*": {
      "maxDuration": 5 // All functions can run for a maximum of 5 seconds
    }
  }
}
```

```json {4-5} filename="vercel.json" framework=other
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "path/to/dir/**/*": {
      "maxDuration": 5 // All functions can run for a maximum of 5 seconds
    }
  }
}
```

This glob pattern will match *everything* in the specified path, so you may wish to be more specific by adding a file type, such as `app/api/**/*.ts` instead.

## Duration limits

Vercel Functions have the following defaults and maximum limits for the duration of a function with [fluid compute](/docs/fluid-compute) (enabled by default):

|            | Default          | Maximum           |
| ---------- | ---------------- | ----------------- |
| Hobby      | 300s (5 minutes) | 300s (5 minutes)  |
| Pro        | 300s (5 minutes) | 800s (13 minutes) |
| Enterprise | 300s (5 minutes) | 800s (13 minutes) |

If you have disabled fluid compute, the following defaults and maximum limits apply:

|            | Default | Maximum           |
| ---------- | ------- | ----------------- |
| Hobby      | 10s     | 60s (1 minute)    |
| Pro        | 15s     | 300s (5 minutes)  |
| Enterprise | 15s     | 900s (15 minutes) |


---

[View full sitemap](/docs/sitemap)
