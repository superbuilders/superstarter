---
title: Using Edge Config with DevCycle
product: vercel
url: /docs/edge-config/edge-config-integrations/devcycle-edge-config
type: tutorial
prerequisites:
  - /docs/edge-config/edge-config-integrations
  - /docs/edge-config
related:
  - /docs/cli
  - /docs/projects/overview
  - /docs/edge-config/get-started
  - /docs/edge-config/edge-config-sdk
  - /docs/edge-config/edge-config-dashboard
summary: "Learn how to use Edge Config with Vercel's DevCycle integration."
---

# Using Edge Config with DevCycle

This guide will help you get started with using Vercel's DevCycle integration with Edge Config. This integration allows you to use Edge Config as a configuration source for your DevCycle feature flags.

> **🔒 Permissions Required**: The DevCycle Edge Config integration

DevCycle is a feature management platform designed for developers. DevCycle allows you to work with feature flags more naturally, where you write code, so you can deliver better features, faster.

With DevCycle and Vercel Edge Config the decision logic for your features lives with your hosted site, so you can run your feature rollouts or experiments with ultra-low latency.

## Prerequisites

Before using this integration, you should have:

1. The latest version of Vercel CLI. To check your version, use `vercel --version`. To [install](/docs/cli#installing-vercel-cli) or update Vercel CLI, use:
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
2. A project. If you don't have one, you can run the following terminal commands to create a Next.js project:

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

1. A Vercel project. If you don't have one, see [Creating a Project](/docs/projects/overview#creating-a-project)
2. An Edge Config. If you don't have one, follow [the Edge Config quickstart](/docs/edge-config/get-started)
3. The Edge Config SDK:
   <CodeBlock>
     <Code tab="pnpm">
       ```bash
       pnpm i @vercel/edge-config
       ```
     </Code>
     <Code tab="yarn">
       ```bash
       yarn i @vercel/edge-config
       ```
     </Code>
     <Code tab="npm">
       ```bash
       npm i @vercel/edge-config
       ```
     </Code>
     <Code tab="bun">
       ```bash
       bun i @vercel/edge-config
       ```
     </Code>
   </CodeBlock>

- ### Set up the DevCycle integration
  Visit [the DevCycle page in the Integration Marketplace](/marketplace/devcycle) and select the **Add Integration** button. From the modal that opens:
  1. Select your Vercel team and project.
  2. Continue and log into DevCycle.
  3. Select the DevCycle Organization and Project you want to use with Vercel Edge Config.
  4. Connect your DevCycle project to an existing or new Edge Config store.
  5. Click **Finish Setup**.

- ### Install the DevCycle Edge Config package
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i @devcycle/vercel-edge-config @vercel/edge-config
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i @devcycle/vercel-edge-config @vercel/edge-config
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i @devcycle/vercel-edge-config @vercel/edge-config
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i @devcycle/vercel-edge-config @vercel/edge-config
      ```
    </Code>
  </CodeBlock>

- ### Use the DevCycle integration in your code
  > For \['node']:
  For more information on DevCycle Node SDK usage, see [DevCycle docs](https://docs.devcycle.com/sdk/server-side-sdks/node).
  > For \['nextjs', 'nextjs-app']:
  For more information on DevCycle Next.js SDK usage, see the [DevCycle docs](https://docs.devcycle.com/sdk/client-side-sdks/nextjs).
  ```ts filename="app/index.tsx" framework=nextjs-app
  import { createClient } from '@vercel/edge-config';
  import { EdgeConfigSource } from '@devcycle/vercel-edge-config';
  import { setupDevCycle } from '@devcycle/nextjs-sdk/server';

  const edgeClient = createClient(process.env.EDGE_CONFIG ?? '');
  const edgeConfigSource = new EdgeConfigSource(edgeClient);

  export const { getVariableValue, getClientContext } = setupDevCycle({
    serverSDKKey: process.env.DEVCYCLE_SERVER_SDK_KEY ?? '',
    clientSDKKey: process.env.NEXT_PUBLIC_DEVCYCLE_CLIENT_SDK_KEY ?? '',
    userGetter: () => ({ user_id: 'test_user' }),
    options: {
      // pass the configSource option with the instance of EdgeConfigSource
      configSource: edgeConfigSource,
    },
  });
  ```
  ```js filename="app/index.jsx" framework=nextjs-app
  import { createClient } from '@vercel/edge-config';
  import { EdgeConfigSource } from '@devcycle/vercel-edge-config';
  import { setupDevCycle } from '@devcycle/nextjs-sdk/server';

  const edgeClient = createClient(process.env.EDGE_CONFIG ?? '');
  const edgeConfigSource = new EdgeConfigSource(edgeClient);

  export const { getVariableValue, getClientContext } = setupDevCycle({
    serverSDKKey: process.env.DEVCYCLE_SERVER_SDK_KEY ?? '',
    clientSDKKey: process.env.NEXT_PUBLIC_DEVCYCLE_CLIENT_SDK_KEY ?? '',
    userGetter: () => ({ user_id: 'test_user' }),
    options: {
      // pass the configSource option with the instance of EdgeConfigSource
      configSource: edgeConfigSource,
    },
  });
  ```
  ```ts filename="pages/index.tsx" framework=nextjs
  import type { GetServerSideProps } from 'next';
  import { createClient } from '@vercel/edge-config';
  import { EdgeConfigSource } from '@devcycle/vercel-edge-config';
  import { getServerSideDevCycle } from '@devcycle/nextjs-sdk/pages';

  const edgeClient = createClient(process.env.EDGE_CONFIG ?? '');
  const edgeConfigSource = new EdgeConfigSource(edgeClient);

  export const getServerSideProps: GetServerSideProps = async (context) => {
    const user = {
      user_id: 'server-user',
    };

    return {
      props: {
        ...(await getServerSideDevCycle({
          serverSDKKey: process.env.DEVCYCLE_SERVER_SDK_KEY ?? '',
          clientSDKKey: process.env.NEXT_PUBLIC_DEVCYCLE_CLIENT_SDK_KEY ?? '',
          user,
          context,
          options: {
            // pass the configSource option with the instance of EdgeConfigSource
            configSource: edgeConfigSource,
          },
        })),
      },
    };
  };
  ```
  ```js filename="pages/index.jsx" framework=nextjs
  import { createClient } from '@vercel/edge-config';
  import { EdgeConfigSource } from '@devcycle/vercel-edge-config';
  import { getServerSideDevCycle } from '@devcycle/nextjs-sdk/pages';

  const edgeClient = createClient(process.env.EDGE_CONFIG ?? '');
  const edgeConfigSource = new EdgeConfigSource(edgeClient);

  export const getServerSideProps = async (context) => {
    const user = {
      user_id: 'server-user',
    };

    return {
      props: {
        ...(await getServerSideDevCycle({
          serverSDKKey: process.env.DEVCYCLE_SERVER_SDK_KEY ?? '',
          clientSDKKey: process.env.NEXT_PUBLIC_DEVCYCLE_CLIENT_SDK_KEY ?? '',
          user,
          context,
          options: {
            // pass the configSource option with the instance of EdgeConfigSource
            configSource: edgeConfigSource,
          },
        })),
      },
    };
  };
  ```
  ```ts filename="index.tsx" framework=node
  import { createClient } from '@vercel/edge-config';
  import { EdgeConfigSource } from '@devcycle/vercel-edge-config';
  import { initializeDevCycle } from '@devcycle/nodejs-server-sdk';

  // the EDGE_CONFIG environment variable contains a connection string for a particular edge config. It is set automatically
  // when you connect an edge config to a project in Vercel.
  const edgeClient = createClient(process.env.EDGE_CONFIG);
  const edgeConfigSource = new EdgeConfigSource(edgeClient);

  const devcycleClient = initializeDevCycle(
    process.env.DEVCYCLE_SERVER_SDK_KEY,
    // pass the edgeConfigSource as the "configSource" option during SDK intialization to tell the SDK to use Edge Config
    // for retrieving its configuration
    { configSource: edgeConfigSource },
  );
  ```
  ```js filename="index.jsx" framework=node
  import { createClient } from '@vercel/edge-config';
  import { EdgeConfigSource } from '@devcycle/vercel-edge-config';
  import { initializeDevCycle } from '@devcycle/nodejs-server-sdk';

  // the EDGE_CONFIG environment variable contains a connection string for a particular edge config. It is set automatically
  // when you connect an edge config to a project in Vercel.
  const edgeClient = createClient(process.env.EDGE_CONFIG);
  const edgeConfigSource = new EdgeConfigSource(edgeClient);

  const devcycleClient = initializeDevCycle(
    process.env.DEVCYCLE_SERVER_SDK_KEY,
    // pass the edgeConfigSource as the "configSource" option during SDK intialization to tell the SDK to use Edge Config
    // for retrieving its configuration
    { configSource: edgeConfigSource },
  );
  ```

## Next steps

Now that you have the DevCycle Edge Config integration set up, you can explore the following topics to learn more:

- [Get started with Edge Config](/docs/edge-config/get-started)
- [Read with the SDK](/docs/edge-config/edge-config-sdk)
- [Use the dashboard](/docs/edge-config/edge-config-dashboard)
- [Edge Config limits](/docs/edge-config/edge-config-limits)


---

[View full sitemap](/docs/sitemap)
