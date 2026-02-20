---
title: Feature Flag
product: vercel
url: /docs/flags/vercel-flags/dashboard/feature-flag
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags/dashboard
  - /docs/flags/vercel-flags
related:
  - /docs/flags/vercel-flags/dashboard/sdk-keys
  - /docs/flags/vercel-flags/dashboard/entities
  - /docs/flags/vercel-flags/dashboard/segments
  - /docs/deployments/environments
  - /docs/flags/vercel-flags/dashboard/archive
summary: Learn about feature flag on Vercel.
---

# Feature Flag Configuration

When you select a flag from the Flags overview, you can configure how it behaves across different environments and users. This page covers all the configuration options available for individual flags.

## Flag types

Vercel Flags supports three value types:

- **Boolean**: `true` or `false`. Use for simple feature toggles.
- **String**: Text values like `"control"`, `"variant-a"`, `"variant-b"`. Use for A/B tests or multi-variant experiments.
- **Number**: Numeric values. Use for scaling, limits, or thresholds.

The type is set when you create the flag and cannot be changed afterward.

## Variants

Variants are the possible values your flag can return. Each variant has:

- **Value**: The actual value returned by the flag (e.g., `true`, `"premium"`, `42`)
- **Label**: A human-readable name shown in the dashboard (e.g., "Enabled", "Premium Tier")

### How to manage variants

You can add new variants at any time. To delete a variant, it must not be referenced by any environment configuration or targeting rule.

> **💡 Note:** If an environment is set to "Off" but still has rules referencing a variant, you must remove those rules before deleting the variant.

## Environment configuration

Each flag can be configured differently for Production, Preview, and Development environments. This allows you to test features in Development while keeping them off in Production, test on Preview deployments before going live, or run experiments only in Production.

### How environments work

When your application evaluates a flag, the [SDK Key](/docs/flags/vercel-flags/dashboard/sdk-keys) determines which environment's configuration is used:

- **Production SDK Key** → Production configuration
- **Preview SDK Key** → Preview configuration
- **Development SDK Key** → Development configuration

Each environment can have its own static value, targeting rules, or linked configuration from another environment. See [SDK Keys](/docs/flags/vercel-flags/dashboard/sdk-keys) to learn how Vercel automatically manages the `FLAGS` environment variable for each environment.

If your project uses custom environments, see [Custom Environments](/docs/flags/vercel-flags/dashboard/feature-flag#custom-environments).

### How to set a static value

The simplest configuration serves the same value to everyone in an environment:

1. Select the environment (Production, Preview, or Development)
2. Choose a variant from the switch or dropdown
3. Save your changes

### How to add targeting rules

Targeting and dynamic rules allow you to serve different values based on user attributes.

Using targeting and rules requires creating [Entities](/docs/flags/vercel-flags/dashboard/entities) first, since targeting and rules are based on entities.

To set up targeting and dynamic rules:

1. Click the  **Target** icon next to an environment
2. Add rules or targets to define who sees which variant
3. Set a default variant for users who don't match any rules

Targets are evaluated first. If no targets match, rules are evaluated.

Rules are evaluated from top to bottom. Each rule can have multiple filters. A rule only matches if all filters match. The first matching rule determines the value. If no rules match, the fallthrough value at the bottom is used.

Learn more about [targeting with segments](/docs/flags/vercel-flags/dashboard/segments) and [entities](/docs/flags/vercel-flags/dashboard/entities).

### How to reuse configuration from another environment

Lower environments (Development and Preview) can reuse the configuration from higher environments:

- Development can reuse Preview or Production
- Preview can reuse Production

This is useful when you want consistent behavior across environments without duplicating configuration.

> **💡 Note:** Configuration linking only works from lower to higher environments. Production cannot reuse Development or Preview. This prevents accidentally affecting production when changing development settings.

To reuse configuration:

1. Select the environment you want to configure
2. Click the  icon to **Reuse configuration**
3. Select the source environment

Changes to the source environment will automatically apply to linked environments.

### How to switch between static and targeting modes

You can switch between static values and targeting rules at any time. When you switch from targeting to a static value, your rules are preserved in the background. This lets you quickly disable targeting (serve one value to everyone) and re-enable it later without losing your configuration.

### Saving changes

After making changes to a flag, click on **Review and save**, which will open a confirmation modal.

The modal shows the environments your change will affect and summarizes the changed configuration.

Leave a *Change message* for your change which will show up in the activity log of this flag.

### Common patterns

#### Testing before production

Enable a feature in Development and Preview while keeping it off in Production:

| Environment | Configuration |
| ----------- | ------------- |
| Production  | Disabled      |
| Preview     | Enabled       |
| Development | Enabled       |

This lets your team test the feature during development and in preview deployments before going live.

#### Gradual rollout

Roll out a feature to increasing percentages of users:

| Environment | Configuration           |
| ----------- | ----------------------- |
| Production  | 10% enabled (initially) |
| Preview     | Enabled                 |
| Development | Enabled                 |

Manually increase the production percentage as you gain confidence in the feature.

#### Internal testing in production

Use targeting rules to enable a feature only for your team in production:

| Environment | Configuration                              |
| ----------- | ------------------------------------------ |
| Production  | Enabled only for `@yourcompany.com` emails |
| Preview     | Reuse production                           |
| Development | Reuse production                           |

#### Splits

To configure a feature for a specific percentage of users, set up an [Entity](/docs/flags/vercel-flags/dashboard/entities) first.

For example you could have an entity called *User* with *id* (string) and *email* (string) attributes.

1. In your flag details, select the  **Target** icon of the desirved environment.
2. Do not configure any rules or targets. Pick the **Weighted split** option for the "When no other rules match, serve" fallback.
3. In the **Based on** field, select **User » id** or whatever entity attribute you want to base the split on. This attribute will be used to bucket your users into the available variants.
4. Select a **Fallback** variant which is used in case the entity or attribute the split is based on was not provided.
5. Set the percentages or weights for the split. Vercel Flags supports weights so you can set 1, 1, 1 if you want an equal three-way split.

## Custom Environments

Vercel Flags supports three flag environments: Production, Preview, and Development. [Vercel Custom Environments](/docs/deployments/environments#custom-environments) use the Preview SDK Key by default, so the `FLAGS` environment variable in a custom environment points to your Preview flag configuration.

To use a different flag environment for a custom environment:

1. Find the SDK Key you want in the [SDK Keys](/docs/flags/vercel-flags/dashboard/sdk-keys) section of the **Flags** tab, or create a new for the desired environment
2. Reconfigure the `FLAGS` environment variable in your custom environment and set its value to that SDK Key
3. Redeploy the custom environment

This means you configure your flags once per flag environment rather than repeating the setup for every custom environment.

If you need flag rules that distinguish between individual custom environments, create an [entity](/docs/flags/vercel-flags/dashboard/entities) for the environment name and pass it as evaluation context.

## Activity and change history

The **Activity** tab shows the complete history of changes to a flag:

- Who made each change
- When the change was made
- What was modified

You can add a change message when modifying a flag to document the reason for the update. This helps your team understand the context behind changes.

### How to restore a previous configuration

To restore a previous configuration:

1. Go to the **Activity** tab
2. Find the configuration you want to restore
3. Click **Restore** to apply that configuration

This creates a new change in the history, so you can always see what was restored and when.

## Using segments

[Segments](/docs/flags/vercel-flags/dashboard/segments) let you define reusable groups of users. Instead of recreating the same targeting rules for multiple flags, create a segment once and reference it in your flag configuration.

Common segments include:

- Internal team members
- Beta testers
- Enterprise customers
- Users in specific regions

Segments can consist of a list of users or be made up of dynamic rules.

## Archiving and deleting

When a flag is no longer needed:

- **Archive**: Removes the flag from active use but preserves its configuration. Archived flags can be restored later. See [Archive](/docs/flags/vercel-flags/dashboard/archive).
- **Delete**: Permanently removes the flag and all its configuration. This cannot be undone.

> **💡 Note:** When you archive a flag, it stops being served by the SDK. Your application will receive the default value defined in code, or an error if no default is set.

## Next steps

- [Create reusable segments](/docs/flags/vercel-flags/dashboard/segments)
- [Define entities for targeting](/docs/flags/vercel-flags/dashboard/entities)
- [Manage SDK Keys](/docs/flags/vercel-flags/dashboard/sdk-keys)


---

[View full sitemap](/docs/sitemap)
