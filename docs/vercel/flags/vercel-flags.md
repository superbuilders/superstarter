---
title: Vercel Flags
product: vercel
url: /docs/flags/vercel-flags
type: conceptual
prerequisites:
  - /docs/flags
related:
  - /docs/flags/vercel-flags/dashboard/segments
  - /docs/flags/observability
  - /docs/flags/vercel-flags/dashboard
  - /docs/flags/vercel-flags/sdks
  - /docs/flags/vercel-flags/sdks/flags-sdk
summary: Learn about vercel flags on Vercel.
---

# Vercel Flags

> **🔒 Permissions Required**: Vercel Flags

Vercel Flags is a feature flag provider built into the Vercel platform. Create flags, define targeting rules, roll out gradually, and run A/B tests, all from the Vercel Dashboard without adding another service to your stack.

Flag configurations use active global replication. Changes propagate worldwide in milliseconds, giving you low-latency evaluations and the confidence to ship, test, and roll back at any time.

## Why Vercel Flags?

- **Release with confidence**: Deploy new features to production behind a flag. Validate them with your team or a subset of users before enabling them for everyone.
- **Trunk-based development**: Stop maintaining long-lived feature branches. Merge code continuously and control when features go live independently of deploys.
- **Targeting and segments**: Control who sees what using user attributes, percentage rollouts, or reusable [segments](/docs/flags/vercel-flags/dashboard/segments) like "Beta Testers" or "Internal Team."
- **Per-environment configuration**: Set different flag values for Production, Preview, and Development so you can test features internally before rolling them out.
- **Built-in observability**: See flag evaluations in Runtime Logs and measure their impact on conversion and performance through [Web Analytics](/docs/flags/observability).
- **No infrastructure to manage**: Feature flags live in your Vercel Dashboard alongside your deployments. There's no external service to set up.

Beyond feature management, Vercel Flags also supports A/B testing and experimentation. Split users into buckets, then measure the results through [Web Analytics](/docs/flags/observability) or your own analytics platform and data warehouse.

![Image](`/docs-assets/static/docs/flags/flags-tab-light.png`)

## How it works

### Flags and SDKs

Every flag belongs to a Vercel project. Create flags in the [dashboard](/docs/flags/vercel-flags/dashboard), then evaluate them in your application using one of the available [SDKs](/docs/flags/vercel-flags/sdks):

- **[Flags SDK](/docs/flags/vercel-flags/sdks/flags-sdk)**: The recommended option for Next.js and SvelteKit. Framework-native, with full TypeScript support.
- **[OpenFeature](/docs/flags/vercel-flags/sdks/openfeature)**: A vendor-neutral standard. Use the OpenFeature API while Vercel manages your flags.
- **[Core library](/docs/flags/vercel-flags/sdks/core)**: Direct access to the evaluation engine for full control or unsupported frameworks.

Follow the [quickstart guide](/docs/flags/vercel-flags/quickstart) to set up your first flag.

### Entities and targeting

By default, a flag returns the same value for everyone. To personalize behavior, define entities that represent the things your application knows about, like users, teams, or devices. Then create targeting rules that reference entity attributes, such as enabling a flag for users on the Enterprise plan.

For more information on entities, see [Entities](/docs/flags/vercel-flags/dashboard/entities).

### Segments

Segments are reusable groups of users based on entity attributes. Define a segment once and apply it to any flag. When you update a segment's rules, every flag using it updates automatically.

For more information on segments, see [Segments](/docs/flags/vercel-flags/dashboard/segments).

### Drafts

Drafts bridge your code and your dashboard. Define a flag in code, deploy, and Vercel detects it through the Flags Discovery endpoint and surfaces it as a draft. Promote the draft when you're ready to configure targeting.

For more information on drafts, see [Draft Flags](/docs/flags/vercel-flags/dashboard/drafts).

### Flags Explorer

The Flags Explorer is built into the Vercel Toolbar and lets you view and override feature flags in your browser without affecting other users.

For more information on the Flags Explorer, see [Flags Explorer](/docs/flags/flags-explorer).

### Embedded definitions

The SDK can fetch your flag definitions once at build time and bundle them into the deployment. This guarantees every function uses the same snapshot during the build, and provides a runtime fallback if the Vercel Flags service is temporarily unreachable.

Learn more about [embedded definitions](/docs/flags/vercel-flags/sdks/core#embedded-definitions).

## Get started


---

[View full sitemap](/docs/sitemap)
