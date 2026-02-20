---
title: Using Edge Config with Hypertune
product: vercel
url: /docs/edge-config/edge-config-integrations/hypertune-edge-config
type: tutorial
prerequisites:
  - /docs/edge-config/edge-config-integrations
  - /docs/edge-config
related:
  - /docs/edge-config/get-started
  - /docs/edge-config/edge-config-dashboard
  - /docs/edge-config/edge-config-sdk
  - /docs/edge-config/edge-config-limits
summary: "Learn how to use Hypertune's integration with Vercel Edge Config."
---

# Using Edge Config with Hypertune

Hypertune is a feature flag, A/B testing and app configuration platform with full type-safety and Git version control.

The Hypertune Edge Config integration synchronizes with your Functions for low latency retrieval without fetch requests.

## Prerequisites

Before using this integration, you should have the latest version of Vercel CLI.

To check your version, use `vercel --version`. To install or update Vercel CLI, use:

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

## Get Started

> **💡 Note:** If you deploy a template like the [Hypertune Flags SDK
> Example](https://vercel.com/templates/next.js/flags-sdk-hypertune-nextjs), it
> will guide you through most of these steps.

Navigate to your **Project** and click the **Flags** tab.

Install a flag provider, select **Hypertune** and click **continue**, then toggle **Enable Edge Config Syncing** on.

- ### Set up your local environment
  Open your project in your development environment and link it to Vercel.
  ```bash
  vercel link
  ```
  Once linked, you can pull the environment variables that were added to your project.
  ```bash
  vercel env pull
  ```
  You should have a `.env.local` file with the following environment variables:
  ```bash
  EXPERIMENTATION_CONFIG="..."
  EXPERIMENTATION_CONFIG_ITEM_KEY="..."
  NEXT_PUBLIC_HYPERTUNE_TOKEN="..."
  ```
  > **💡 Note:** If you don't see these environment variables, ensure your project is linked to
  > the Hypertune integration in the Flags tab.

- ### Manage your flags in Hypertune
  From the Flags tab, click **Open in Hypertune** to make changes in your Hypertune project.

  When you click **save**, changes will be synchronized to your Edge Config and ready for use.

- ### Generate a type-safe client
  Run code generation to produce the type-safe client for use with the Hypertune SDK.
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i 
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i 
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i 
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i 
      ```
    </Code>
  </CodeBlock>
  You should now have a `generated` directory with generated code reflecting your saved changes.

- ### Declare flags in your code
  You can declare server side flags using the Flags SDK with Hypertune as follows:
  ```ts filename="flags.ts" framework=all
  import {
    createSource,
    vercelFlagDefinitions as flagDefinitions,
    flagFallbacks,
    type FlagValues,
    type Context,
  } from '@/generated/hypertune';
  import { flag } from 'flags/next';
  import { createHypertuneAdapter } from '@flags-sdk/hypertune';
  import { identify } from './lib/identify';

  // Generate a Flags SDK adapter from generated Hypertune code
  const hypertuneAdapter = createHypertuneAdapter<FlagValues, Context>({
    createSource,
    flagDefinitions,
    flagFallbacks,
    identify,
  });

  // Use generated definitions to declare flags in your framework
  export const exampleFlag = flag(hypertuneAdapter.declarations.exampleFlag);
  ```
  > **💡 Note:** See the [more resources](#more-resources) section for more information about
  > the Hypertune and Flags SDK.

- ### Use flags in your app
  ```ts filename="app/page.tsx" framework=all
  import { exampleFlag } from '@/flags';

  export default async function Home() {
    const isExampleFlagEnabled = await exampleFlag();
    return <div>Example Flag is {isExampleFlagEnabled ? 'enabled' : 'disabled'}</div>;
  }
  ```

## Next steps

Learn more about Edge Config:

- [Get started with Edge Config](/docs/edge-config/get-started)
- [Manage Edge Config on the dashboard](/docs/edge-config/edge-config-dashboard)
- [View the Edge Config SDK reference](/docs/edge-config/edge-config-sdk)
- [View Edge Config limits](/docs/edge-config/edge-config-limits)

## More resources

Learn more about Hypertune and the Flags SDK adapter:

- [Hypertune App Router Quickstart](https://docs.hypertune.com/getting-started/next.js-app-router-quickstart)
- [Flags SDK Hypertune Provider](https://flags-sdk.dev/providers/hypertune)


---

[View full sitemap](/docs/sitemap)
