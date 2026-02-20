---
title: Getting Started
product: vercel
url: /docs/microfrontends/quickstart
type: conceptual
prerequisites:
  - /docs/microfrontends
related:
  - /docs/projects/overview
  - /docs/dashboard-features
  - /docs/deployments/environments
  - /docs/microfrontends/configuration
  - /docs/microfrontends/path-routing
summary: Learn about getting started on Vercel.
---

# Getting started with microfrontends

This quickstart guide will help you set up microfrontends on Vercel. Microfrontends can be used with different frameworks, and separate frameworks can be combined in a single microfrontends group.

## Prerequisites

- Have at least two [Vercel projects](/docs/projects/overview#creating-a-project) created on Vercel that will be part of the same microfrontends group.

## Key concepts

Before diving into implementation, it's helpful to understand these core concepts:

- **Default app**: The main application that manages the `microfrontends.json` configuration file and handles routing decisions. The default app will also handle any request not handled by another microfrontend.
- **Shared domain**: All microfrontends appear under a single domain, allowing microfrontends to reference relative paths that point to the right environment automatically.
- **Path-based routing**: Requests are automatically directed to the appropriate microfrontend based on URL paths.
- **Independent deployments**: Teams can deploy their microfrontends without affecting other parts of the application.

## Set up microfrontends on Vercel

- ### Create a microfrontends group
  1. Navigate to [your Vercel dashboard](/dashboard) and make sure that you have selected your team from the [scope selector](/docs/dashboard-features#scope-selector).
  2. Visit the **Settings** tab.
  3. Find the **Microfrontends** tab from the Settings navigation menu.
  4. Click **Create Group** in the upper right corner.
  5. Follow the instructions to add projects to the microfrontends group and choose one of those applications to be the *default application*.
  Creating a microfrontends group and adding projects to that group does not change any behavior for those applications until you deploy a `microfrontends.json` file to production.

- ### Define `microfrontends.json`
  Once the microfrontends group is created, you can define a `microfrontends.json` file at the root in the default application. This configuration file is only needed in the default application, and it will control the routing for microfrontends. In this example, `web` is the default application.

  Production behavior will not be changed until the `microfrontends.json` file is merged and promoted, so you test in the [Preview](/docs/deployments/environments#preview-environment-pre-production) environment before deploying changes to production.

  On the Settings page for the new microfrontends group, click the **Add Config** button to copy the `microfrontends.json` to your code.

  You can also create the configuration manually in code:
  ```json filename="microfrontends.json"
  {
    "$schema": "https://openapi.vercel.sh/microfrontends.json",
    "applications": {
      "web": {
        "development": {
          "fallback": "TODO: a URL in production that should be used for requests to apps not running locally"
        }
      },
      "docs": {
        "routing": [
          {
            "group": "docs",
            "paths": ["/docs/:path*"]
          }
        ]
      }
    }
  }
  ```
  Application names in `microfrontends.json` should match the Vercel project names, see the [microfrontends configuration](/docs/microfrontends/configuration) documentation for more information.

  See the [path routing](/docs/microfrontends/path-routing) documentation for details on how to configure the routing for your microfrontends.

- ### Install the `@vercel/microfrontends` package
  In the directory of the microfrontend application, install the package using the following command:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i @vercel/microfrontends
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i @vercel/microfrontends
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i @vercel/microfrontends
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i @vercel/microfrontends
      ```
    </Code>
  </CodeBlock>
  You need to perform this step for every microfrontend application.

- ### Set up microfrontends with your framework
  Once the `microfrontends.json` file has been added, Vercel will be able to start routing microfrontend requests to each microfrontend. However, the specifics of each framework, such as JS, CSS, and images, also need to be routed to the correct application.
  > For \['nextjs-app', 'nextjs']:
  To handle JavaScript and CSS assets in Next.js, add the `withMicrofrontends`
  wrapper to your `next.config.js` file.
  > For \['nextjs-app', 'nextjs']:
  > For \['nextjs-app', 'nextjs']:
  The `withMicrofrontends` function will automatically add an [asset
  prefix](/docs/microfrontends/path-routing#asset-prefix) to the application so
  that you do not have to worry about that. Next.js applications that use
  [`basePath`](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath)
  are not supported right now.
  > For \['sveltekit']:
  To handle static assets for [SvelteKit](/docs/frameworks/sveltekit), add the `withMicrofrontends` wrapper around your SvelteKit configuration:
  > For \['sveltekit']:
  Then, add the microfrontends plugin to your Vite configuration:
  ```ts filename="vite.config.ts" framework=sveltekit
  import { microfrontends } from '@vercel/microfrontends/experimental/vite';

  export default defineConfig({
    plugins: [microfrontends()],
  });
  ```
  ```js filename="vite.config.js" framework=sveltekit
  import { microfrontends } from '@vercel/microfrontends/experimental/vite';

  export default defineConfig({
    plugins: [microfrontends()],
  });
  ```
  > For \['sveltekit']:
  This requires version `1.0.1` of the `@vercel/microfrontends` package or higher.
  > For \['vite']:
  To handle static assets for [Vite](/docs/frameworks/vite), add the following
  plugin to your Vite configuration:
  > For \['vite']:
  The Vite plugin by default will prefix static assets with a unique path prefix. Using a [base path](https://vite.dev/guide/build#public-base-path) is discouraged, but if you are using one, you can pass that to the `microfrontends` plugin:

  The specified `basePath` must then also be listed in the `microfrontends.json` file:
  ```json filename="microfrontends.json" framework=vite
  "applications": {
    "docs": {
      "routing": [
        {
          "paths": ["/my-base-path/:path*"]
        }
      ],
    }
  }
  ```
  Vite support requires version `1.0.1` of the `@vercel/microfrontends` package or higher.
  > For \['other']:
  For other frameworks not listed here, you will need to manually ensure that assets for child applications have a unique path prefix to be routed to the correct microfrontend. This will depend on your specific framework. Once you have that unique path prefix, add it to the list of `paths` in `microfrontends.json`.

  For example, if you choose `/docs-assets` to be the unique asset prefix for the Docs application, you will need to move all JS and CSS assets under the `/docs-assets` directory when deployed on Vercel and then add `/docs-assets/:path*` to `microfrontends.json`:
  ```json filename="microfrontends.json" framework=other
  "applications": {
    "docs": {
      "routing": [
        {
          "paths": ["/docs-assets/:path*"]
        }
      ],
    }
  }
  ```
  Any static asset not covered by the framework instructions above, such as images or any file in the `public/` directory, will also need to be added to the microfrontends configuration file or be moved to a path prefixed by the application's asset prefix. An asset prefix of `/vc-ap-<hash of application name>` (in `2.0.0`, or `/vc-ap-<application name>` in prior versions) is automatically set up by the Vercel microfrontends support.

- ### Run through steps 3 and 4 for all microfrontend applications in the group
  Set up the other microfrontends in the group by running through steps [3](#install-the-@vercel/microfrontends-package) and [4](#set-up-microfrontends-with-your-framework) for every application.

- ### Set up the local development proxy
  To provide a seamless local development experience, `@vercel/microfrontends` provides a microfrontends aware local development proxy to run alongside your development servers. This proxy allows you to only run a single microfrontend locally while making sure that all microfrontend requests still work.

  If you are using [Turborepo](https://turborepo.com), the proxy will automatically run when you [run the development task](/docs/microfrontends/local-development#starting-local-proxy) for your microfrontend.

  If you don't use `turbo`, you can set this up by adding a script to your `package.json` like this:
  ```json {2} filename="package.json"
  "scripts": {
    "proxy": "microfrontends proxy --local-apps my-local-app-name"
  }
  ```
  Next, use the auto-generated port in your `dev` command so that the proxy knows where to route the requests to:
  ```json filename="package.json"
  "scripts": {
    "dev": "next dev --port $(microfrontends port)"
  }
  ```
  Once you have your application and the local development proxy running (either via `turbo` or manually), visit the "Microfrontends Proxy" URL in your terminal output. Requests will be routed to your local app or your production fallback app. Learn more in the [local development guide](/docs/microfrontends/local-development).

- ### Deploy your microfrontends to Vercel
  You can now deploy your code to Vercel. Once live, you can then visit the domain for that deployment and visit any of the paths configured in `microfrontends.json`. These paths will be served by the other microfrontend applications.

  In the example above, visiting the `/` page will see the content from the `web` microfrontend while visiting `/docs` will see the content from the `docs` microfrontend.
  > **💡 Note:** Microfrontends functionality can be tested in
  > [Preview](/docs/deployments/environments#preview-environment-pre-production)
  > before deploying the code to production.

## Next steps

- Learn how to use the `@vercel/microfrontends` package to manage [local development](/docs/microfrontends/local-development).
- For polyrepo setups (separate repositories), see the [polyrepo configuration guide](/docs/microfrontends/local-development#polyrepo-setup).
- [Route more paths](/docs/microfrontends/path-routing) to your microfrontends.
- To learn about other microfrontends features, visit the [Managing Microfrontends](/docs/microfrontends/managing-microfrontends) documentation.
- [Set up the Vercel Toolbar](/docs/microfrontends/managing-microfrontends/vercel-toolbar) for access to developer tools to debug and manage microfrontends.

Microfrontends changes how paths are routed to your projects. If you encounter any issues, look at the [Testing & Troubleshooting](/docs/microfrontends/troubleshooting) documentation or [learn how to debug routing on Vercel](/kb/guide/debug-routing-on-vercel).


---

[View full sitemap](/docs/sitemap)
