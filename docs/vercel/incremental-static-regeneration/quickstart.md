---
title: Getting started with ISR
product: vercel
url: /docs/incremental-static-regeneration/quickstart
type: tutorial
prerequisites:
  - /docs/incremental-static-regeneration
related:
  - /docs/incremental-static-regeneration/limits-and-pricing
  - /docs/observability/monitoring
summary: Learn how to use Incremental Static Regeneration (ISR) to regenerate your pages without rebuilding and redeploying your site.
---

# Getting started with ISR

This guide will help you get started with using Incremental Static Regeneration (ISR) on your project, showing you how to regenerate your pages without rebuilding and redeploying your site. When a page with ISR enabled is regenerated, the most recent data for that page is fetched, and its cache is updated. There are two ways to trigger regeneration:

- **Background revalidation** – Regeneration that recurs on an interval
- **On-demand revalidation** – Regeneration that occurs when you send certain API requests to your app

## Background Revalidation

**Background revalidation** allows you to purge the cache for an ISR route automatically on an interval.

> For \["nextjs"]:

When using Next.js with the `pages` router, you can enable ISR by adding a `revalidate` property to the object returned from `getStaticProps`:

> For \["nextjs-app"]:

When using Next.js with the App Router, you can enable ISR by using the `revalidate` route segment config for a layout or page.

> For \["sveltekit"]:

To deploy a SvelteKit route with ISR, export a config object with an `isr` property. The following example demonstrates a SvelteKit route that Vercel will deploy with ISR, revalidating the page every 60 seconds:

> For \["nuxt"]:

To enable ISR in a Nuxt route, add a `routeRules` option to your , as shown in the example below:

```ts filename="apps/example/page.tsx" framework=nextjs-app
export const revalidate = 10; // seconds
```

```js filename="apps/example/page.jsx" framework=nextjs-app
export const revalidate = 10; // seconds
```

```ts filename="pages/example/index.tsx" framework=nextjs
export async function getStaticProps() {
  /* Fetch data here */

  return {
    props: {
      /* Add something to your props */
    },
    revalidate: 10, // Seconds
  };
}
```

```js filename="pages/example/index.jsx" framework=nextjs
export async function getStaticProps() {
  /* Fetch data here */

  return {
    props: {
      /* Add something to your props */
    },
    revalidate: 10, // Seconds
  };
}
```

```ts filename="example-route/+page.server.ts" framework=sveltekit
export const config = {
  isr: {
    expiration: 10,
  },
};
```

```js filename="example-route/+page.server.js" framework=sveltekit
export const config = {
  isr: {
    expiration: 10,
  },
};
```

```ts filename="nuxt.config.ts" framework=nuxt
export default defineNuxtConfig({
  routeRules: {
    // This route will be revalidated
    // every 10 seconds in the background
    '/blog-posts': { isr: 10 },
  },
});
```

```js filename="nuxt.config.js" framework=nuxt
export default defineNuxtConfig({
  routeRules: {
    // This route will be revalidated
    // every 10 seconds in the background
    '/blog-posts': { isr: 10 },
  },
});
```

### Example

The following example renders a list of blog posts from a demo site called `jsonplaceholder`, revalidating every 10 seconds or whenever a person visits the page:

> For \['sveltekit']:

First, create a  file that exports your `config` object with `isr` configured and fetches your data:

> For \['sveltekit']:

Then, create a  file that renders the list of blog posts:

> For \['nuxt']:

After enabling ISR in your  file [as described above](#background-revalidation), create an API route that fetches your data:

> For \['nuxt']:

Then, fetch the data and render it in a `.vue` file:

```ts v0="build" filename="pages/blog-posts/index.tsx" framework=nextjs
export async function getStaticProps() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = await res.json();

  return {
    props: {
      posts,
    },
    revalidate: 10,
  };
}

interface Post {
  title: string;
  id: number;
}

export default function BlogPosts({ posts }: { posts: Post[] }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

```js v0="build" filename="pages/blog-posts/index.jsx" framework=nextjs
export async function getStaticProps() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = await res.json();

  return {
    props: {
      posts,
    },
    revalidate: 10,
  };
}

export default function BlogPosts({ posts }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

```ts v0="build" filename="app/blog-posts/page.tsx" framework=nextjs-app
export const revalidate = 10; // seconds

interface Post {
  title: string;
  id: number;
}

export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = (await res.json()) as Post[];
  return (
    <ul>
      {posts.map((post: Post) => {
        return <li key={post.id}>{post.title}</li>;
      })}
    </ul>
  );
}
```

```js v0="build" filename="app/blog-posts/page.jsx" framework=nextjs-app
export const revalidate = 10; // seconds

export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = await res.json();

  return (
    <ul>
      {posts.map((post) => {
        return <li key={post.id}>{post.title}</li>;
      })}
    </ul>
  );
}
```

To test this code, run the appropriate `dev` command for your framework, and navigate to the `/blog-posts/` route.

You should see a bulleted list of blog posts.

## On-Demand Revalidation

**On-demand revalidation** allows you to purge the cache for an ISR route whenever you want, foregoing the time interval required with background revalidation.

> For \['sveltekit']:

To trigger revalidation with SvelteKit:

1. Set an `BYPASS_TOKEN` Environment Variable with a secret value
2. Assign your Environment Variable to the `bypassToken` config option for your route:

3) Send a `GET` or `HEAD` API request to your route with the following header:

```bash
x-prerender-revalidate: bypass_token_here
```

> For \['nuxt']:

To trigger revalidation with Nuxt:

1. Set an `BYPASS_TOKEN` Environment Variable with a secret value
2. Assign your Environment Variable to the `bypassToken` config option in `nitro.config` file:

3) Assign your Environment Variable to the `bypassToken` config option in `nuxt.config` file:

4. Send a `GET` or `HEAD` API request to your route with the following header:

```bash
x-prerender-revalidate: bypass_token_here
```

> For \["nextjs", "nextjs-app"]:

To revalidate a page on demand with Next.js:

1. Create an Environment Variable which will store a revalidation secret
2. Create an API Route that checks for the secret, then triggers revalidation

The following example demonstrates an API route that triggers revalidation if the query paramater `?secret` matches a secret Environment Variable:

```js v0="build" filename="pages/api/revalidate.js" framework=nextjs
export default async function handler(request, response) {
  // Check for secret to confirm this is a valid request
  if (request.query.secret !== process.env.MY_SECRET_TOKEN) {
    return response.status(401).json({ message: 'Invalid token' });
  }

  try {
    // This should be the actual path, not a rewritten path
    // e.g. for "/blog-posts/[slug]" this should be "/blog-posts/1"
    await response.revalidate('/blog-posts');
    return response.json({ revalidated: true });
  } catch (err) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return response.status(500).send('Error revalidating');
  }
}
```

```ts v0="build" filename="pages/api/revalidate.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== process.env.MY_SECRET_TOKEN) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    // This should be the actual path, not a rewritten path
    // e.g. for "/blog-posts/[slug]" this should be "/blog-posts/1"
    await res.revalidate('/blog-posts');
    return res.json({ revalidated: true });
  } catch (err) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return res.status(500).send('Error revalidating');
  }
}
```

```ts v0="build" filename="app/api/revalidate/route.ts" framework=nextjs-app
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== process.env.MY_SECRET_TOKEN) {
    return new Response('Invalid credentials', {
      status: 401,
    });
  }

  revalidatePath('/blog-posts');

  return Response.json({
    revalidated: true,
    now: Date.now(),
  });
}
```

```js v0="build" filename="app/api/revalidate/route.js" framework=nextjs-app
import { revalidatePath } from 'next/cache';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== process.env.MY_SECRET_TOKEN) {
    return new Response('Invalid credentials', {
      status: 401,
    });
  }

  revalidatePath('/blog-posts');

  return Response.json({
    revalidated: true,
    now: Date.now(),
  });
}
```

> For \["nextjs"]:

> For \["nextjs", "nextjs-app", "sveltekit"]:

See the [background revalidation section above](#background-revalidation) for a full ISR example.

## Templates

## Next steps

Now that you have set up ISR, you can explore the following:

- [Explore usage and pricing](/docs/incremental-static-regeneration/limits-and-pricing)
- [Monitor ISR on Vercel through Observability](/docs/observability/monitoring)


---

[View full sitemap](/docs/sitemap)
