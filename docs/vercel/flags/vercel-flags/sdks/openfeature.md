---
title: OpenFeature
product: vercel
url: /docs/flags/vercel-flags/sdks/openfeature
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags/sdks
  - /docs/flags/vercel-flags
related:
  - /docs/flags/vercel-flags/quickstart
  - /docs/flags/vercel-flags/dashboard/entities
  - /docs/flags/vercel-flags/sdks/flags-sdk
summary: Learn about openfeature on Vercel.
---

# Using OpenFeature with Vercel Flags

[OpenFeature](https://openfeature.dev/) is a vendor-neutral, open standard for feature flags. Vercel Flags provides an OpenFeature provider so you can use the standard OpenFeature API while Vercel manages your flags.

The [Getting Started guide](/docs/flags/vercel-flags/quickstart) covers creating a flag in the dashboard, pulling environment variables, and evaluating a flag with OpenFeature. This page goes deeper into initialization options, typed evaluation methods, context passing, and debugging.

## Setup

OpenFeature requires you to register a provider before you can evaluate flags. In a real application you'll want to do this once and reuse the client everywhere. Create a helper that handles initialization with retry logic:

```ts filename="lib/openfeature.ts"
import { OpenFeature } from '@openfeature/server-sdk';
import { flagsClient } from '@vercel/flags-core';
import { VercelProvider } from '@vercel/flags-core/openfeature';

let initPromise: Promise<void> | null = null;
let initialized = false;
const vercelProvider = new VercelProvider(flagsClient);

async function initialize() {
  try {
    await OpenFeature.setProviderAndWait(vercelProvider);
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize provider:', error);
    initPromise = null; // allow retry on next request
  }
}

export async function getOpenFeatureClient() {
  if (initialized) return OpenFeature.getClient();
  if (!initPromise) initPromise = initialize();
  await initPromise;
  return OpenFeature.getClient();
}
```

This ensures the provider is only initialized once. Concurrent callers share the same in-flight promise, and after the first successful initialization the function returns synchronously. If initialization fails, the next call retries.

You can then call `getOpenFeatureClient()` from any server component or route handler:

```tsx filename="app/page.tsx"
import { getOpenFeatureClient } from '../lib/openfeature';

export default async function Page() {
  const client = await getOpenFeatureClient();
  const showBanner = await client.getBooleanValue('marketing-banner', false);

  return <div>{showBanner ? 'Sale live now!' : 'Welcome'}</div>;
}
```

## Evaluating flags

The OpenFeature client provides typed methods for different flag types:

### Boolean flags

```ts
const showFeature = await client.getBooleanValue('show-new-feature', false);
```

### String flags

```ts
const theme = await client.getStringValue('theme', 'light');
```

### Number flags

```ts
const maxItems = await client.getNumberValue('max-items-per-page', 10);
```

### Object flags

```ts
const config = await client.getObjectValue('feature-config', {
  enabled: false,
  variant: 'control',
});
```

The second argument is always the default value, returned when evaluation fails or no rules match.

## Passing evaluation context

To evaluate targeting rules based on user attributes, pass a context as the third argument:

```ts
const context = {
  targetingKey: 'user-123',
  email: 'user@example.com',
  plan: 'premium',
};

const showFeature = await client.getBooleanValue(
  'premium-feature',
  false,
  context,
);
```

The context properties should match the [entities](/docs/flags/vercel-flags/dashboard/entities) you've defined in the Vercel Dashboard.

## Getting evaluation details

For debugging or logging, use the detail methods to see why a particular value was returned:

```ts
const details = await client.getBooleanDetails('show-new-feature', false);

console.log({
  value: details.value,
  reason: details.reason,
  errorCode: details.errorCode,
  errorMessage: details.errorMessage,
});
```

The `reason` field tells you how the value was determined:

- `TARGETING_MATCH`: A targeting rule matched
- `DEFAULT`: No rules matched, using the default value
- `STATIC`: The flag is paused or disabled
- `ERROR`: An error occurred during evaluation

## Example: Next.js API route

A complete example using the `getOpenFeatureClient` helper with evaluation context:

```ts filename="app/api/feature/route.ts"
import { getOpenFeatureClient } from '../../lib/openfeature';

export async function GET(request: Request) {
  const client = await getOpenFeatureClient();
  const userId = request.headers.get('x-user-id');

  const showNewCheckout = await client.getBooleanValue(
    'new-checkout-flow',
    false,
    { user: userId ? { id: userId } : undefined },
  );

  return Response.json({ showNewCheckout });
}
```

## Limitations

- **Server-side only**: The `VercelProvider` runs on the server. Use the Flags SDK for client-side evaluation.
- **Flags Explorer**: OpenFeature doesn't respect Flags Explorer overrides out of the box. If you need Flags Explorer, expose the available flags through the Flags Discovery endpoint and respect the override cookie set by Flags Explorer manually.
- **No precompute**: The Flags SDK's precompute pattern for static pages is not available with OpenFeature.

## Next steps

- [Learn about the Flags SDK](/docs/flags/vercel-flags/sdks/flags-sdk) for framework-native integration
- [Configure entities](/docs/flags/vercel-flags/dashboard/entities) for targeting rules
- Visit [OpenFeature documentation](https://openfeature.dev/docs) for more about the OpenFeature ecosystem


---

[View full sitemap](/docs/sitemap)
