---
title: Flags SDK
product: vercel
url: /docs/flags/flags-sdk-reference
type: conceptual
prerequisites:
  - /docs/flags
related:
  - /docs/flags/vercel-flags/quickstart
  - /docs/flags/flags-explorer/getting-started
  - /docs/flags/observability
summary: Learn about flags sdk on Vercel.
---

# Flags SDK Reference

The Flags SDK is a free, open-source library that gives you the tools you need to use feature flags in Next.js and SvelteKit applications. It works with any flag provider, custom setups, or no provider at all.

> **💡 Note:** This page provides an overview of key concepts and APIs. For complete API documentation, visit [flags-sdk.dev](https://flags-sdk.dev), the official source of truth for the Flags SDK.

## Key features

- **Framework-native**: Built specifically for Next.js (App Router, Pages Router, Middleware) and SvelteKit
- **Provider-agnostic**: Works with any [flag provider](https://flags-sdk.dev/docs/adapters/supported-providers) or [custom adapters](https://flags-sdk.dev/docs/adapters/custom-adapters)
- **Type-safe**: Full TypeScript support with type inference
- **Optimized for performance**: Uses precompute pattern for static generation
- **Integrated**: Works seamlessly with Flags Explorer and Vercel observability features

## Core concepts

### Flag definitions

Flags are defined using the `flag()` function. Each flag has a key and a `decide` function that returns the flag's value:

```ts filename="flags.ts"
import { flag } from 'flags/next';

export const showNewFeature = flag({
  key: 'show-new-feature',
  decide: () => false,
  description: 'Show the new dashboard feature',
});
```

### The decide function

The `decide` function determines a flag's value. It can be sync or async, and can access request context:

```ts filename="flags.ts"
export const experimentalUI = flag({
  key: 'experimental-ui',
  decide: async () => {
    const user = await getCurrentUser();
    return user?.betaAccess === true;
  },
});
```

### Flag options

Flags can have multiple options for A/B testing and experimentation:

```ts filename="flags.ts"
export const theme = flag({
  key: 'theme',
  options: [
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
    { value: 'auto', label: 'Auto' },
  ],
  decide: () => 'auto',
});
```

### Precompute for static pages

The precompute pattern generates multiple versions of static pages with different flag values:

```ts filename="flags.ts"
export const layoutVariant = flag({
  key: 'layout-variant',
  options: [
    { value: 'a' },
    { value: 'b' },
  ],
  decide: () => 'a',
});

export const precompute = [layoutVariant];
```

Learn more about [precompute on flags-sdk.dev](https://flags-sdk.dev/docs/core-concepts/precompute).

## Key APIs

### Reading flag values

Call your flag functions to read their values:

```ts
const isEnabled = await showNewFeature();
const currentTheme = await theme();
```

### Reporting values

Report flag values for observability (automatic with SDK):

```ts
import { reportValue } from 'flags';

reportValue('my-flag', true);
```

### Overrides

Handle flag overrides from Flags Explorer (automatic with SDK integrations):

```ts
import { getOverrides } from 'flags/next';

const overrides = await getOverrides();
```

### Flags Explorer integration

Create a Flags API endpoint for Flags Explorer:

```ts filename="app/.well-known/vercel/flags/route.ts"
import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import * as flags from '#/flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags);
});
```

## Framework-specific guides

- **Next.js**: [Getting started with Next.js](https://flags-sdk.dev/docs/getting-started/next)
- **SvelteKit**: [Getting started with SvelteKit](https://flags-sdk.dev/docs/getting-started/sveltekit)

## Provider adapters

The Flags SDK works with many providers out of the box:

- [Vercel](https://flags-sdk.dev/docs/adapters/vercel)
- [LaunchDarkly](https://flags-sdk.dev/docs/adapters/supported-providers#launchdarkly)
- [Statsig](https://flags-sdk.dev/docs/adapters/supported-providers#statsig)
- [Hypertune](https://flags-sdk.dev/docs/adapters/supported-providers#hypertune)
- [ConfigCat](https://flags-sdk.dev/docs/adapters/supported-providers#configcat)
- [DevCycle](https://flags-sdk.dev/docs/adapters/supported-providers#devcycle)
- [Flipt](https://flags-sdk.dev/docs/adapters/supported-providers#flipt)
- [Custom adapters](https://flags-sdk.dev/docs/adapters/custom-adapters)

## Complete API reference

For the full API documentation, including all functions, types, and advanced patterns, visit:

- [Core API reference](https://flags-sdk.dev/docs/api-reference/core/core)
- [Next.js API reference](https://flags-sdk.dev/docs/api-reference/frameworks/next)
- [SvelteKit API reference](https://flags-sdk.dev/docs/api-reference/frameworks/sveltekit)
- [React components](https://flags-sdk.dev/docs/api-reference/core/react)

## Examples

- [Next.js Feature Flags Example](/templates/next.js/shirt-shop-feature-flags)
- [More examples on flags-sdk.dev](https://flags-sdk.dev/docs/examples)

## Next steps

- [Get started with the quickstart](/docs/flags/vercel-flags/quickstart)
- [Set up Flags Explorer](/docs/flags/flags-explorer/getting-started)
- [Integrate with observability](/docs/flags/observability)


---

[View full sitemap](/docs/sitemap)
