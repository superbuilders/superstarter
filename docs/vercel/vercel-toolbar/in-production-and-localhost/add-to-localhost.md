---
title: Add the Vercel Toolbar to your local environment
product: vercel
url: /docs/vercel-toolbar/in-production-and-localhost/add-to-localhost
type: how-to
prerequisites:
  - /docs/vercel-toolbar/in-production-and-localhost
  - /docs/vercel-toolbar
related:
  - /docs/cli/link
  - /docs/cli
  - /docs/projects/overview
  - /docs/accounts
summary: Learn how to use the Vercel Toolbar in your local environment.
---

# Add the Vercel Toolbar to your local environment

To enable the toolbar in your local environment, add it to your project using the [`@vercel/toolbar`](https://www.npmjs.com/package/@vercel/toolbar) package, or with an injection script.

- ### Install the `@vercel/toolbar` package and link your project
  Install the package using the following command:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i @vercel/toolbar
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i @vercel/toolbar
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i @vercel/toolbar
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i @vercel/toolbar
      ```
    </Code>
  </CodeBlock>
  Then link your local project to your Vercel project with the [`vercel link`](/docs/cli/link) command using [Vercel CLI](/docs/cli).
  ```bash filename="terminal"
  vercel link [path-to-directory]
  ```

- ### Add the toolbar to your project
  > For \['nextjs', 'nextjs-app']:
  To use the Vercel Toolbar locally in a Next.js project, define `withVercelToolbar` in your `next.config.js` file and export it, as shown below:
  > For \['sveltekit']:
  To use the Vercel Toolbar locally in a SvelteKit project, add the `vercelToolbar` plugin to your `vite.config.js` file, as shown below:
  > For \['nuxt']:
  To use the Vercel Toolbar locally in a Nuxt project, install the Nuxt module:
  > For \['other']:
  The toolbar works locally out of the box with Next.js. To use it with a framework other than Next.js, you can add the following script tag, filling in the relevant info where required:
  ```js filename="next.config.js" framework=nextjs-app
  /** @type {import('next').NextConfig} */
  const createWithVercelToolbar = require('@vercel/toolbar/plugins/next');
  const nextConfig = {
    // Config options here
  };

  const withVercelToolbar = createWithVercelToolbar();
  // Instead of module.exports = nextConfig, do this:
  module.exports = withVercelToolbar(nextConfig);
  ```
  ```ts filename="next.config.ts" framework=nextjs-app
  import type { NextConfig } from 'next';
  import createWithVercelToolbar from '@vercel/toolbar/plugins/next';

  const nextConfig: NextConfig = {
    // Config options here
  };

  const withVercelToolbar = createWithVercelToolbar();
  // Instead of export default nextConfig, do this:
  export default withVercelToolbar(nextConfig);
  ```
  ```js filename="next.config.js" framework=nextjs
  /** @type {import('next').NextConfig} */
  const createWithVercelToolbar = require('@vercel/toolbar/plugins/next');
  const nextConfig = {
    // Config options here
  };

  const withVercelToolbar = createWithVercelToolbar();
  // Instead of module.exports = nextConfig, do this:
  module.exports = withVercelToolbar(nextConfig);
  ```
  ```ts filename="next.config.ts" framework=nextjs
  import type { NextConfig } from 'next';
  import createWithVercelToolbar from '@vercel/toolbar/plugins/next';

  const nextConfig: NextConfig = {
    // Config options here
  };

  const withVercelToolbar = createWithVercelToolbar();
  // Instead of export default nextConfig, do this:
  export default withVercelToolbar(nextConfig);
  ```
  ```js filename="vite.config.js" framework=sveltekit
  import { sveltekit } from '@sveltejs/kit/vite';
  import { vercelToolbar } from '@vercel/toolbar/plugins/vite';
  import { defineConfig } from 'vite';

  export default defineConfig({
    plugins: [sveltekit(), vercelToolbar()],
  });
  ```
  ```ts filename="vite.config.ts" framework=sveltekit
  import { sveltekit } from '@sveltejs/kit/vite';
  import { vercelToolbar } from '@vercel/toolbar/plugins/vite';
  import { defineConfig } from 'vite';

  export default defineConfig({
    plugins: [sveltekit(), vercelToolbar()],
  });
  ```
  ```tsx filename="index.ts" framework=other
  <script
    src="https://vercel.live/_next-live/feedback/feedback.js"
    data-explicit-opt-in="true"
    data-owner-id="user-id-or-team-id-here"
    data-project-id="project-id-here"
    data-branch="branch-name-here"
  ></script>
  ```
  ```jsx filename="index.js" framework=other
  <script
    src="https://vercel.live/_next-live/feedback/feedback.js"
    data-explicit-opt-in="true"
    data-owner-id="user-id-or-team-id-here"
    data-project-id="project-id-here"
    data-branch="branch-name-here"
  ></script>
  ```
  > For \['other']:
  To find your project ID, see [project ID](/docs/projects/overview#project-id). To find your user or team ID, see [Find your Team ID](/docs/accounts#find-your-team-id).
  > For \['nextjs-app']:
  Then add the following code to your `layout.tsx` or `layout.jsx` file:
  ```tsx filename="app/layout.tsx" framework=nextjs-app
  import { VercelToolbar } from '@vercel/toolbar/next';

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const shouldInjectToolbar = process.env.NODE_ENV === 'development';
    return (
      <html lang="en">
        <body>
          {children}
          {shouldInjectToolbar && <VercelToolbar />}
        </body>
      </html>
    );
  }
  ```
  ```jsx filename="app/layout.jsx" framework=nextjs-app
  import { VercelToolbar } from '@vercel/toolbar/next';

  export default function RootLayout(children) {
    const shouldInjectToolbar = process.env.NODE_ENV === 'development';
    return (
      <html lang="en">
        <body>
          {children}
          {shouldInjectToolbar && <VercelToolbar />}
        </body>
      </html>
    );
  }
  ```
  > For \['nextjs']:
  Then add the following code to your `_app.tsx` or `_app.jsx` file:
  ```ts filename="pages/_app.tsx" framework=nextjs
  import { VercelToolbar } from '@vercel/toolbar/next';
  import type { AppProps } from 'next/app';

  export default function MyApp({ Component, pageProps }: AppProps) {
    const shouldInjectToolbar = process.env.NODE_ENV === 'development'
    return (
      <>
        <Component {...pageProps} />
        {shouldInjectToolbar && <VercelToolbar />}
      </>
    );
  }
  ```
  ```js filename="pages/_app.jsx" framework=nextjs
  import { VercelToolbar } from '@vercel/toolbar/next';

  export default function MyApp({ Component, pageProps }) {
    const shouldInjectToolbar = process.env.NODE_ENV === 'development';
    return (
      <>
        <Component {...pageProps} />
        {shouldInjectToolbar && <VercelToolbar />}
      </>
    );
  }
  ```
  > For \['sveltekit']:
  Then add the following code to your root `+layout.svelte` file:
  ```ts filename="src/routes/+layout.svelte" framework=sveltekit
  <script lang="ts">
    import { mountVercelToolbar } from '@vercel/toolbar/vite';
    import { onMount } from 'svelte';
    import { dev } from '$app/environment';

    if (dev) {
      onMount(() => mountVercelToolbar());
    }
  </script>
  ```
  ```js filename="src/routes/+layout.svelte" framework=sveltekit
  <script>
    import { mountVercelToolbar } from '@vercel/toolbar/vite';
    import { onMount } from 'svelte';
    import { dev } from '$app/environment';

    if (dev) {
      onMount(() => mountVercelToolbar());
    }
  </script>
  ```
  > For \['nuxt']:
  This will automatically add the `@vercel/toolbar` module to your Nuxt configuration file.
  ```js filename="nuxt.config.js" framework=nuxt
  export default defineNuxtConfig({
    modules: ['@vercel/toolbar'],
  });
  ```
  ```ts filename="nuxt.config.ts" framework=nuxt
  export default defineNuxtConfig({
    modules: ['@vercel/toolbar'],
  });
  ```
  You do not need to configure anything else.


---

[View full sitemap](/docs/sitemap)
