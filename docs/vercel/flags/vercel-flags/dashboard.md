---
title: Dashboard
product: vercel
url: /docs/flags/vercel-flags/dashboard
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags
  - /docs/flags
related:
  - /docs/flags/vercel-flags/dashboard/feature-flag
  - /docs/flags/vercel-flags/dashboard/drafts
  - /docs/flags/vercel-flags/dashboard/segments
  - /docs/flags/vercel-flags/dashboard/entities
  - /docs/flags/vercel-flags/dashboard/sdk-keys
summary: Learn about dashboard on Vercel.
---

# Managing flags in the dashboard

The **Flags** tab in your Vercel dashboard is the central place to manage feature flags. You can control feature rollouts, configure targeting rules, run experiments, and coordinate releases directly within Vercel.

![Image](`/docs-assets/static/docs/flags/flags-tab-light.png`)

## Access your flags

You can access the flags dashboard by navigating to your project and selecting the **Flags** tab:

The **Overview** shows all your flags at a glance. You can filter and search to see each flag's status, type, and whether it's currently in use. Flags from Marketplace providers display their provider's icon, while Vercel Flags show a status light. Click on **Vercel Flags** » **Flags** on the left to see Vercel Flags only.

## How to create a flag

> **💡 Note:** **Project Administrators** and **Developers** can create and manage feature
> flags.

To create a flag in the dashboard:

1. From the **Flags** tab, click the **Create Flag** button
2. Enter a **Slug** for your flag (e.g., `show-new-feature`)
3. Select the **Type** (Boolean, String, or Number)

For String and Number flags, you can define the variants your flag returns. Each variant has a **value** used in code and an optional **label** shown in the dashboard.

During creation, you can configure which variant each environment receives. Boolean flags default to `true` in Development and `false` in Preview and Production, so your feature is visible while you develop but hidden after merging. You can refine these rules at any time after creating the flag.

When you create a flag, Vercel automatically configures these environment variables for your project:

- `FLAGS`: Connection string to your Vercel Flags project
- `FLAGS_SECRET`: Secret key used by the Flags Explorer for overrides

See [Feature Flag Configuration](/docs/flags/vercel-flags/dashboard/feature-flag) for more information on how to configure individual flags.

## Flags tab sections

### Flags

Select any flag to configure how it behaves across environments and user groups. You can set static values, add targeting rules that evaluate top to bottom, and track the complete history of changes. Rules can target specific segments or entities, with percentage-based rollouts for gradual releases.

For more information on how to configure individual flags, see [Feature Flag Configuration](/docs/flags/vercel-flags/dashboard/feature-flag).

### Drafts

Drafts are flags that Vercel detects in your code but haven't been created in the dashboard yet. This lets you define flags in code first, then promote them when you're ready to configure targeting. When you create a feature flag from a draft the descriptions and options from your code are pre-filled automatically.

For more information on drafts, see [Draft Flags](/docs/flags/vercel-flags/dashboard/drafts).

### Segments

Segments let you define reusable groups of users, like "Beta Testers" or "Internal Team." Create a segment once with your targeting rules, then apply it to any flag. When you update a segment, all flags using it update automatically.

For more information on segments, see [Segments](/docs/flags/vercel-flags/dashboard/segments).

### Entities

Entities define the types and attributes you can target, like User, Team, or Device. By mapping entities to your application data, you can create precise rules like "enable for users on the Enterprise plan" or "show to users in the Engineering department."

For more information on entities, see [Entities](/docs/flags/vercel-flags/dashboard/entities).

### SDK Keys

SDK Keys authenticate your application and determine which environment's configuration is used. Vercel automatically manages keys through the `FLAGS` environment variable, but you can view and rotate them here if needed.

To share flags across projects, such as in a microfrontend setup, create a dedicated SDK Key in one project and add it to the other project's environment variables. See [How to use flags of another project](/docs/flags/vercel-flags/dashboard/sdk-keys#how-to-use-flags-of-another-project) for details.

For more information on SDK keys, see [SDK Keys](/docs/flags/vercel-flags/dashboard/sdk-keys).

### Archive

Archive flags when they're no longer needed but you might want to restore them later. Archived flags stop being served and can't be edited while archived, but their configuration is preserved. You can restore a flag with all its previous settings intact, or permanently delete it from the archive.

For more information on archiving flags, see [Archive](/docs/flags/vercel-flags/dashboard/archive).

## Next steps

- [Quickstart guide](/docs/flags/vercel-flags/quickstart)
- [Set up Flags Explorer](/docs/flags/flags-explorer/getting-started)
- [Enable observability](/docs/flags/observability)


---

[View full sitemap](/docs/sitemap)
