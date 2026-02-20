---
title: SDK Keys
product: vercel
url: /docs/flags/vercel-flags/dashboard/sdk-keys
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags/dashboard
  - /docs/flags/vercel-flags
related:
  - /docs/flags/vercel-flags/dashboard/feature-flag
  - /docs/flags/vercel-flags/sdks
  - /docs/projects/custom-environments
  - /docs/flags/vercel-flags/sdks/flags-sdk
summary: Learn about sdk keys on Vercel.
---

# SDK Keys

When your application evaluates a feature flag, it needs to connect to Vercel Flags to read the flag's configuration. SDK Keys make this possible by authenticating your application and selecting the right environment.

Projects typically have three SDK Keys, one per environment:

- **Production SDK Key** → Uses Production configuration
- **Preview SDK Key** → Uses Preview configuration
- **Development SDK Key** → Uses Development configuration

Because each key is scoped to an environment, the same application code can resolve flags differently depending on where it runs. See [environment configuration](/docs/flags/vercel-flags/dashboard/feature-flag#how-environments-work) to learn how to configure flags per environment.

> **💡 Note:** SDK Keys are secrets. Each key grants read-only access to the full flag configuration for its environment, including any data used in targeting rules such as email addresses. Don't expose SDK Keys in client-side code or commit them to version control.

## The FLAGS environment variable

When you create your first feature flag, Vercel automatically provisions an SDK Key for each environment and adds a `FLAGS` environment variable to your project using these keys:

| Vercel Environment | FLAGS value         |
| ------------------ | ------------------- |
| Production         | Production SDK Key  |
| Preview            | Preview SDK Key     |
| Development        | Development SDK Key |

The special things about the `FLAGS` environment variable are

- it's automatically populated by Vercel when you create your first feature flag
- the default clients of the [SDKs](/docs/flags/vercel-flags/sdks) are connected to this variable

You are free to manually create SDK Keys, store them in any environment variable, and create SDK clients connected to them.

## How to use SDK Keys

### With the Flags SDK

The default `vercelAdapter()` function reads from the `FLAGS` environment variable:

```ts
import { vercelAdapter } from '@flags-sdk/vercel';

export const myFlag = flag({
  key: 'my-flag',
  adapter: vercelAdapter(),
});
```

To use a specific SDK Key, pass it to `createVercelAdapter`:

```ts
import { createVercelAdapter } from '@flags-sdk/vercel';

const vercelAdapter = createVercelAdapter(process.env.MY_CUSTOM_FLAGS_KEY);

export const myFlag = flag({
  key: 'my-flag',
  adapter: vercelAdapter(),
});
```

### With OpenFeature

If you create a `VercelProvider` without passing an SDK key it will read from the `FLAGS` environment variable:

```ts
import { OpenFeature } from '@openfeature/server-sdk';
import { VercelProvider } from '@vercel/flags-core/openfeature';

const vercelProvider = new VercelProvider();
await OpenFeature.setProviderAndWait(vercelProvider);
const client = OpenFeature.getClient();

await client.getBooleanValue('my-flag', false); // usage example
```

To use a specific SDK Key, pass it to `VercelProvider`:

```ts
import { OpenFeature } from '@openfeature/server-sdk';
import { VercelProvider } from '@vercel/flags-core/openfeature';

const vercelProvider = new VercelProvider(process.env.MY_CUSTOM_FLAGS_KEY);
await OpenFeature.setProviderAndWait(vercelProvider);
const client = OpenFeature.getClient();

await client.getBooleanValue('my-flag', false); // usage example
```

### With the core library

The default `flagsClient` reads from the `FLAGS` environment variable:

```ts
import { flagsClient } from '@vercel/flags-core';

await flagsClient.evaluate("my-flag");  // usage example
```

To use a specific SDK Key, pass it to `createClient`:

```ts
import { createClient } from '@vercel/flags-core';
const client = createClient(process.env.MY_CUSTOM_FLAGS_KEY);

await client.evaluate("my-flag"); // usage example
```

## How to view your SDK Keys

To see your project's SDK Keys:

1. Navigate to your project in the Vercel Dashboard
2. Go to the **Flags** tab
3. Click **SDK Keys** in the sidebar

Here you can view the keys for each environment. Use these when you need to configure SDK Keys manually, such as for [custom environments](/docs/projects/custom-environments).

> **💡 Note:** SDK Keys are secrets. Each key grants read-only access to the full flag configuration for its environment, including any data used in targeting rules such as email addresses. Don't expose SDK Keys in client-side code or commit them to version control.

## How to use flags of another project

Each SDK Key is scoped to a single project. By default, an application can only evaluate flags defined in its own project. To evaluate flags from a different project, you need an SDK Key from that project.

This is useful when multiple applications share the same flags, for example in a microfrontend setup or when a shared feature flag controls behavior across several services.

This example uses two projects: **Project A** owns the flags, and **Project B** needs to evaluate them.

1. **In Project A** (the project that owns the flags), go to **Flags** → **SDK Keys** and click **Create SDK Key**. Create one key per environment (Development, Preview, Production). Use Project B's name as the label so you can tell which keys belong to which consumer.
2. **In Project B** (the project that evaluates the flags), add the keys from step 1 as an environment variable — for example `PROJECT_A_FLAGS_KEY` — setting each environment to the corresponding key.
3. **In Project B's code**, create an adapter or client using that variable:

```ts
import { flag } from 'flags/next';
import { createVercelAdapter } from '@flags-sdk/vercel';

const projectAAdapter = createVercelAdapter(
  process.env.PROJECT_A_FLAGS_KEY,
);

export const sharedFlag = flag({
  key: 'shared-flag',
  adapter: projectAAdapter(),
});
```

Project B can use `vercelAdapter()` for its own flags and the custom adapter for Project A's flags side by side. See [How to use SDK Keys](/docs/flags/vercel-flags/dashboard/sdk-keys#how-to-use-sdk-keys) for examples with OpenFeature and the core library.

## How to rotate SDK Keys

If you need to rotate an SDK Key, for example, if it was accidentally exposed:

1. Go to the SDK Keys section
2. Click **Create SDK Key** and create a new key for the environment you want to rotate
3. Update the `FLAGS` environment variable to use the new SDK Key for the target environment
4. Redeploy your application
5. Delete the compromised SDK Key

After deletion, the old key will no longer work, so make sure to redeploy your application with the new key before deleting the old key.

## Next steps

- [Configure your flags](/docs/flags/vercel-flags/dashboard/feature-flag)
- [Set up the Flags SDK](/docs/flags/vercel-flags/sdks/flags-sdk)


---

[View full sitemap](/docs/sitemap)
