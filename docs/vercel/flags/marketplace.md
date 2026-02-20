---
title: Marketplace
product: vercel
url: /docs/flags/marketplace
type: conceptual
prerequisites:
  - /docs/flags
related:
  - /docs/flags/flags-explorer/getting-started
  - /docs/flags/observability
  - /docs/flags/flags-sdk-reference
  - /docs/storage/edge-config
  - /docs/edge-config/edge-config-integrations/launchdarkly-edge-config
summary: Learn about marketplace on Vercel.
---

# Marketplace

When you connect a feature flag provider through the [Vercel Marketplace](https://vercel.com/marketplace?category=experimentation), you get deep platform integration with Vercel. Your flags and experiments will automatically appear in the **Flags** tab of your dashboard, where you can see all your flags in one place.

You can keep using your existing provider while you use Vercel's developer tools. Once you connect your provider, your flags work automatically with the [Flags dashboard](#flags-dashboard), [Flags Explorer](/docs/flags/flags-explorer/getting-started), and [observability](/docs/flags/observability). You can integrate flags into your code using your provider's SDK or the [Flags SDK](/docs/flags/flags-sdk-reference) for framework-native patterns and type-safety.

## Available providers

You can find popular feature flag and experimentation platforms in the Vercel Marketplace:

- [Statsig](https://vercel.com/marketplace/statsig)
- [Hypertune](https://vercel.com/marketplace/hypertune)
- [LaunchDarkly](https://vercel.com/marketplace/launchdarkly)
- [PostHog](https://vercel.com/marketplace/posthog)

[Browse all experimentation integrations](https://vercel.com/marketplace?category=experimentation)

## Flags dashboard

Once you connect a marketplace provider, all your flags appear in the **Flags** tab of your project overview. Use this dashboard to view and manage every flag in your project, regardless of the provider.

- **Unified overview**: See every flag, its current status, and which provider manages it in one list.
- **Source of truth**: You can view marketplace flags in the Vercel Dashboard, but you manage their configuration in your provider's dashboard to keep it as the source of truth.
- **Direct editing**: Click any flag to jump directly to your provider's dashboard. You'll be signed in automatically with your Vercel account.

## Edge Config sync

You can use providers that sync flag values to [Edge Config](/docs/storage/edge-config) for microsecond reads at the edge. This eliminates the network hop to your provider's API during flag evaluation.

See these integration guides for setup instructions:

- [Using Edge Config with LaunchDarkly](/docs/edge-config/edge-config-integrations/launchdarkly-edge-config)
- [Using Edge Config with Statsig](/docs/edge-config/edge-config-integrations/statsig-edge-config)
- [Using Edge Config with Hypertune](/docs/edge-config/edge-config-integrations/hypertune-edge-config)

## Platform integration

Marketplace providers work directly with Vercel's developer tools without requiring extra configuration in your codebase:

- **Flags Explorer**: View and override your flags during development using the [Vercel Toolbar](/docs/flags/flags-explorer/getting-started).
- **Observability**: Track flag evaluations in [Runtime Logs and Web Analytics](/docs/flags/observability) to help you debug and analyze your features.

## Codebase integration

You have multiple options for using marketplace flags in your application code:

- **Use your provider's SDK**: You can continue using the SDK provided by your chosen provider.
- **Use the Flags SDK**: Alternatively, you can use the [Flags SDK](/docs/flags/flags-sdk-reference) for framework-native patterns and type-safety in Next.js and SvelteKit.

No matter which SDK you choose, you still get deep Vercel platform integration once you connect your provider through the Marketplace.

## Get started

To integrate a marketplace provider with your Vercel project:

1. **Install the integration**: Choose your provider in the [Marketplace](https://vercel.com/marketplace?category=experimentation) and follow the steps to connect it to your project.
2. **View your flags**: Check the **Flags** tab in your project overview to see your flags automatically synced from your provider.
3. **Use the Toolbar**: Open the [Vercel Toolbar](/docs/flags/flags-explorer/getting-started) in your preview or local environment to interact with your flags.


---

[View full sitemap](/docs/sitemap)
