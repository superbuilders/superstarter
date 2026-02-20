---
title: Skew Protection
product: vercel
url: /docs/skew-protection
type: conceptual
prerequisites:
  []
related:
  - /docs/environment-variables/system-environment-variables
  - /docs/deployments/managing-deployments
  - /docs/observability/monitoring
  - /docs/cli/deploy
  - /docs/deployment-retention
summary: "Learn how Vercel's Skew Protection ensures that the client and server stay in sync for any particular deployment."
---

# Skew Protection

> **🔒 Permissions Required**: Skew Protection

[Version skew](https://www.industrialempathy.com/posts/version-skew/) occurs when different versions of your application run on client and server, causing application errors and other unexpected behavior. For example, imagine your newest deployment modifies the data structure by adding a required field to a user's profile. Older clients wouldn't expect this new field, leading to errors when they submit it.

Vercel's Skew Protection resolves this problem at the platform and framework layer by using [version locking](https://www.industrialempathy.com/posts/version-skew/#version-locking), which ensures client and server use the exact same version. In our example, outdated clients continue to communicate with servers that understand the old data structure, while updated clients use the most recent deployment.

![Image](`/front/docs/deployments-basics/nested-layouts-light.png`)

By implementing Skew Protection, you can reduce user-facing errors during new rollouts and boost developer productivity, minimizing concerns about API compatibility across versions.

## Enable Skew Protection

Projects created after November 19th 2024 using one of the [supported frameworks](#supported-frameworks) already have Skew Protection enabled by default.

For older projects, you can enable Skew Protection in your project's settings.

1. Ensure your project has the [Automatically expose system environment variables](/docs/environment-variables/system-environment-variables#automatically-expose-system-environment-variables) setting enabled
2. Select the project in the Vercel dashboard
3. Select the **Settings** tab in the top menu
4. Select the **Advanced** tab in the side menu
5. Scroll down to **Skew Protection** and enable the switch
6. You can optionally set a custom maximum age (see [limitations](#limitations))
7. [Redeploy](/docs/deployments/managing-deployments#redeploy-a-project) your latest production deployment.

![Image](`/front/docs/projects/skew-protection-light.jpg`)

## Custom Skew Protection Threshold

In some cases, you may have problematic deployments you want to ensure no longer resolves requests from any other active clients.

Once you deploy a fix, you can set a Skew Protection threshold with the following:

1. Select the deployment that fixed the problem in the deployment list
2. Select the  button (near the **Visit** button)
3. Click **Skew Protection Threshold**
4. Click **Set** to apply the changes

This ensure that deployments created before the fixed deployment will no longer resolve requests from outdated clients.

![Image](`/front/docs/skew-protection/configure-skew-protection-light.png`)

## Monitor Skew Protection

You can observe how many requests are protected from version skew by visiting the [Monitoring](/docs/observability/monitoring) page in the Vercel dashboard.

For example, on the `requests` event, filter where `skew_protection = 'active'`.

You can view Edge Requests that are successfully fulfilled without the need for skew protection by using `skew_protection = 'inactive'`.

![Image](`/front/docs/projects/skew-protection-monitoring-query-light-colinUpdate.png`)

## Supported frameworks

Skew Protection is available with zero configuration when using the following frameworks:

- [Next.js](#skew-protection-with-next.js)
- [SvelteKit](#skew-protection-with-sveltekit)
- [Qwik](#skew-protection-with-qwik)
- [Astro](#skew-protection-with-astro)
- Nuxt ([coming soon](https://github.com/nitrojs/nitro/issues/2311))

Other frameworks can implement Skew Protection by checking if `VERCEL_SKEW_PROTECTION_ENABLED` has value `1`
and then appending the value of `VERCEL_DEPLOYMENT_ID` to each request using **one of the following** options.

- `dpl` query string parameter:

  ```ts filename="option1.ts"
  const query =
    process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1'
      ? `?dpl=${process.env.VERCEL_DEPLOYMENT_ID}`
      : '';

  const res = await fetch(`/get${query}`);
  ```

- `x-deployment-id` header:

  ```ts filename="option2.ts"
  const headers =
    process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1'
      ? { 'x-deployment-id': process.env.VERCEL_DEPLOYMENT_ID }
      : {};

  const res = await fetch('/get', { headers });
  ```

- `__vdpl` cookie:

  ```ts filename="option3.ts"
  export default function handler(req, res) {
    if (
      process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1' &&
      req.headers['sec-fetch-dest'] === 'document'
    ) {
      res.setHeader('Set-Cookie', [
        `__vdpl=${process.env.VERCEL_DEPLOYMENT_ID}; HttpOnly`,
      ]);
    }
    res.end('<h1>Hello World</h1>');
  }
  ```

### Skew Protection with Next.js

> **⚠️ Warning:** If you're building outside of Vercel using `vercel build` and then deploying with `vercel
>   deploy --prebuilt`, Skew Protection requires additional configuration.For more information on prebuilt workflows, see [When not to use --prebuilt](/docs/cli/deploy#when-not-to-use---prebuilt).

If you are using Next.js 14.1.4 or newer, there is no additional configuration needed to [enable Skew Protection](#enable-skew-protection).

Older versions of Next.js require additional [`next.config.js`](https://nextjs.org/docs/app/api-reference/next-config-js) configuration.

### Skew Protection with SvelteKit

If you are using SvelteKit, you will need to install `@sveltejs/adapter-vercel` version 5.2.0 or newer in order to [enable Skew Protection](#enable-skew-protection).

Older versions can be upgraded by running `npm i -D @sveltejs/adapter-vercel@latest`.

### Skew Protection with Qwik

If you are using Qwik 1.5.3 or newer, there is no additional configuration needed to [enable Skew Protection](#enable-skew-protection).

Older versions can be upgraded by running `npm i @builder.io/qwik@latest`.

### Skew Protection with Astro

If you are using Astro, you will need to install `@astrojs/vercel` version 9.0.0 or newer in order to [enable Skew Protection](#enable-skew-protection).

```js {8} filename="astro.config.mjs"
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // ...
  output: 'server',
  adapter: vercel({
    skewProtection: true,
  }),
});
```

Older versions can be upgraded by running `npm i -D @astrojs/vercel@latest`.

## Limitations

Skew Protection is available for all deployment environments for Pro and Enterprise teams. You can configure a custom maximum age up to, but not exceeding, your project's [retention policy](/docs/deployment-retention).

Vercel automatically adjusts the maximum age to 60 days for requests from Googlebot and Bingbot in order to handle any delay between document crawl and render.

Deployments that have been deleted either manually or automatically using a [retention policy](/docs/deployment-retention) will not be accessible through Skew Protection.

## More resources

- [Version Skew Protection blog](/blog/version-skew-protection)
- [Version Skew](https://www.industrialempathy.com/posts/version-skew/)


---

[View full sitemap](/docs/sitemap)
