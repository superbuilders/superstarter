---
title: Getting Started
product: vercel
url: /docs/flags/flags-explorer/getting-started
type: tutorial
prerequisites:
  - /docs/flags/flags-explorer
  - /docs/flags
related:
  - /docs/vercel-toolbar
  - /docs/vercel-toolbar/in-production-and-localhost
  - /docs/cli
  - /docs/cli/link
  - /docs/flags/flags-explorer/reference
summary: Learn about getting started on Vercel.
---

# Getting started with Flags Explorer

> **🔒 Permissions Required**: Flags Explorer

This guide walks you through connecting your application to the Flags Explorer, so you can use it to view and override your application's feature flags. This works with any framework, any feature flag provider and even custom setups.

## Prerequisites

- Set up the [Vercel Toolbar](/docs/vercel-toolbar) for development by following [adding the Vercel Toolbar to local and production environments](/docs/vercel-toolbar/in-production-and-localhost#)
- You should have the latest version of Vercel CLI installed. To check your version, use `vercel --version`. To [install](/docs/cli#installing-vercel-cli) or update Vercel CLI, use:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i vercel
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i vercel
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i vercel
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i vercel
      ```
    </Code>
  </CodeBlock>
- Ensure your local directory [links](/docs/cli/link) to a Vercel project. You can use `vercel link` from root of your project to link it to your Vercel account or use:
  ```bash filename="Terminal"
  vercel link [path-to-directory]
  ```

## Quickstart

- ### Add the Flags SDK to your project
  Install the `flags` package. This package provides convenience methods, components, and types that allow your application to communicate with the Flags Explorer.
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i flags
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i flags
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i flags
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i flags
      ```
    </Code>
  </CodeBlock>

- ### Adding a `FLAGS_SECRET`
  This secret is used to encrypt and sign overrides, and so Flags Explorer can make authenticated requests to the `/.well-known/vercel/flags` Discovery Endpoint we'll create in the next step.

  Run your application locally with Vercel Toolbar enabled and open Flags Explorer from the toolbar. Click on "Start setup" to begin the onboarding flow, then click on "Create secret" to automatically generate and add a new `FLAGS_SECRET` environment variable to your project.

  Pull your environment variables to make them available to your project locally.
  ```bash filename="Terminal"
  vercel env pull
  ```
  If you prefer to create the secret manually, see the instructions in the [Flags Explorer Reference](/docs/flags/flags-explorer/reference#flags_secret-environment-variable).

- ### Creating the Flags Discovery Endpoint
  Your application needs to expose an endpoint that Flags Explorer queries to get your feature flags. Flags Explorer will make an authenticated request to this Discovery Endpoint to receive your application's feature flag definitions. This endpoint can communicate the name, origin, description, and available options of your feature flags.

  **Using the Flags SDK for Next.js**

  Ensure you completed the setup of the [Flags SDK for Next.js](https://flags-sdk.dev/docs/getting-started/next). You should have installed the `flags` package and have a `flags.ts` file at the root of your project which exposes your feature flags as shown below.
  ```ts filename="flags.ts" framework=nextjs
  import { flag } from 'flags/next';

  export const exampleFlag = flag({
    key: 'example-flag',
    description: 'An example feature flag',
    decide() {
      return false;
    },
  });
  ```
  ```js filename="flags.js" framework=nextjs
  import { flag } from 'flags/next';

  export const exampleFlag = flag({
    key: 'example-flag',
    description: 'An example feature flag',
    decide() {
      return false;
    },
  });
  ```
  ```ts filename="flags.ts" framework=nextjs-app
  import { flag } from 'flags/next';

  export const exampleFlag = flag({
    key: 'example-flag',
    description: 'An example feature flag',
    decide() {
      return false;
    },
  });
  ```
  ```js filename="flags.js" framework=nextjs-app
  import { flag } from 'flags/next';

  export const exampleFlag = flag({
    key: 'example-flag',
    description: 'An example feature flag',
    decide() {
      return false;
    },
  });
  ```
  Create your Flags Discovery Endpoint using the snippet below.
  ```ts filename="pages/api/vercel/flags.ts" framework=nextjs
  import type { NextApiRequest, NextApiResponse } from 'next';
  import { verifyAccess, version } from 'flags';
  import { getProviderData } from 'flags/next';
  import * as flags from '../../../flags';

  export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse,
  ) {
    const access = await verifyAccess(request.headers['authorization']);
    if (!access) return response.status(401).json(null);

    const apiData = getProviderData(flags);

    response.setHeader('x-flags-sdk-version', version);
    return response.json(apiData);
  }
  ```
  ```js filename="pages/api/vercel/flags.js" framework=nextjs
  import { verifyAccess, version } from 'flags';
  import { getProviderData } from 'flags/next';
  import * as flags from '../../../flags';

  export default async function handler(request, response) {
    const access = await verifyAccess(request.headers['authorization']);
    if (!access) return response.status(401).json(null);

    const apiData = getProviderData(flags);

    response.setHeader('x-flags-sdk-version', version);
    return response.json(apiData);
  }
  ```
  ```ts filename="app/.well-known/vercel/flags/route.ts" framework=nextjs-app
  import { getProviderData, createFlagsDiscoveryEndpoint } from 'flags/next';
  import * as flags from '../../../../flags';

  export const GET = createFlagsDiscoveryEndpoint(() => getProviderData(flags));
  ```
  ```js filename="app/.well-known/vercel/flags/route.js" framework=nextjs-app
  import { getProviderData, createFlagsDiscoveryEndpoint } from 'flags/next';
  import * as flags from '../../../../flags';

  export const GET = createFlagsDiscoveryEndpoint(() => getProviderData(flags));
  ```
  This endpoint uses `verifyAccess` to prevent unauthorized requests, and the `getProviderData` function to automatically generate the feature flag definitions based on the feature flags you have defined in code. See the [Flags SDK API Reference](https://flags-sdk.dev/docs/api-reference/frameworks/next#getproviderdata) for more information.
  > For \['nextjs']:
  If you are using the Pages Router, you will need to add the following to your `next.config.js`. This is because the Pages Router can't specify API routes outside of the `api` folder. This means you need a [rewrite](https://nextjs.org/docs/pages/api-reference/next-config-js/rewrites).
  ```js filename="next.config.js"
  module.exports = {
    async rewrites() {
      return [
        {
          source: '/.well-known/vercel/flags',
          destination: '/api/vercel/flags',
        },
      ];
    },
  };
  ```
  If you are using the Flags SDK with adapters, use the `getProviderData` function exported by your flag provider's adapter to load flag metadata from your flag providers. See the [Flags SDK Adapters API Reference](https://flags-sdk.dev/docs/adapters/supported-providers) for more information, and [mergeProviderData](https://flags-sdk.dev/docs/api-reference/core/core#mergeproviderdata) to combine the feature flags defined in code with the metadata of providers.

  **Using the Flags SDK for SvelteKit**

  If you are using the Flags SDK for SvelteKit then the `createHandle` function will automatically create the Discovery Endpoint for you. Learn more about [using the Flags SDK for SvelteKit](https://flags-sdk.dev/docs/getting-started/sveltekit).

  **Using a custom setup**

  Learn how to manually return feature flag definitions in the [Flags Explorer Reference](/docs/flags/flags-explorer/reference#verifying-a-request-to-the-discovery-endpoint).

- ### Handling overrides
  You can now use the Flags Explorer to create feature flag overrides. When you create an override Flags Explorer will set a cookie containing those overrides. Your application can then read this cookie and respect those overrides. You can optionally check the signature on the overrides cookie to ensure it originated from a trusted source.

  **Using the Flags SDK for Next.js**

  Feature flags defined in code using the Flags SDK for Next.js will automatically handle overrides set by the Flags Explorer.

  **Using the Flags SDK for SvelteKit**

  Feature flags defined in code using the Flags SDK for SvelteKit will automatically handle overrides set by the Flags Explorer.

  **Using a custom setup**

  If you have a custom feature flag setup, or if you are using the SDKs of feature flag providers directly, you need to manually handle the overrides set by the Flags Explorer.

  Learn how to read the overrides cookie in the [Flags Explorer Reference](/docs/flags/flags-explorer/reference#override-cookie).

- ### Emitting flag values (optional)
  You can optionally make the Flags Explorer aware of the actual value each feature flag resolved to while rendering the current page by rendering a `<FlagValues />` component. This is useful for debugging. Learn how to emit flag values in the [Flags Explorer Reference](/docs/flags/flags-explorer/reference#values).

  ![Image](`/docs-assets/static/docs/workflow-collaboration/feature-flags/flags-explorer-default-value-light.png`)

  If you emit flag values to the client it's further possible to annotate your Web Analytics events with the feature flags you emitted. Learn how to [integrate with Web Analytics](/docs/flags/observability/web-analytics).

- ### Review
  You should now be able to see your feature flags in Flags Explorer. You should also be able to set overrides that your application can respect by using the Flags SDK or reading the `vercel-flag-overrides` cookie manually. If you added the `FlagValues` component, you should be able to see the actual value each flag resolved to while rendering the current page.

## More resources

- [Flags Explorer Reference](/docs/flags/flags-explorer/reference)
- [Flags SDK](/docs/flags/flags-sdk-reference)
- [Feature Flags using Next.js example](/templates/next.js/shirt-shop-feature-flags)


---

[View full sitemap](/docs/sitemap)
