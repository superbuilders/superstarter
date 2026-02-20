---
title: Flags Explorer
product: vercel
url: /docs/flags/flags-explorer
type: conceptual
prerequisites:
  - /docs/flags
related:
  - /docs/vercel-toolbar
  - /docs/flags/flags-explorer/getting-started
  - /docs/vercel-toolbar/in-production-and-localhost
  - /docs/flags/flags-explorer/reference
  - /docs/flags/flags-sdk-reference
summary: Learn about flags explorer on Vercel.
---

# Flags Explorer

> **🔒 Permissions Required**: Flags Explorer

The Flags Explorer is a feature of the [Vercel Toolbar](/docs/vercel-toolbar) that allows you to view and override your application's feature flags without leaving your browser tab. You can also share and recommend overrides to team members. Follow the [Quickstart](/docs/flags/flags-explorer/getting-started) to make the Flags Explorer aware of your application's feature flags.

Quickly override feature flags for your current session without signing into your feature flag provider, and without affecting team members or automated tests using the Flags Explorer.

Team members can access the Flags Explorer once they have activated the toolbar. The Flags Explorer is available in all environments your team has [enabled the toolbar for](/docs/vercel-toolbar/in-production-and-localhost).

![Image](`/docs-assets/static/docs/workflow-collaboration/feature-flags/flags-explorer-overview-filter-light.png`)

## View and override flags in the toolbar

Before you can use with the Flags Explorer, ensure that your team has set up both [feature flags](/docs/flags/flags-explorer/getting-started) and the [Vercel Toolbar](/docs/vercel-toolbar/in-production-and-localhost) in the environment you are using,

To see and override feature flags for your application:

1. You must log into the Vercel Toolbar to interact with your application's feature flag overrides.
2. Select the **Flags Explorer** option () from the Vercel Toolbar menu.
3. Find the desired feature flag in the modal by scrolling or using the search and filter controls.
4. Select an override value for the desired feature flag. Note that by default, overrides are not persisted and only affect the user applying them, in the environment in which they were set. To share overrides, see [Sharing flag overrides](#sharing-flag-overrides).
5. Apply the changes. This will trigger a soft reload. If you have applied changes, the Vercel Toolbar will turn blue.

## Sharing flag overrides

Any overrides you apply from Vercel Toolbar usually apply to your browser session only. However, you can recommend overrides to team members by either:

- [Setting overrides as recommended for a given branch](#branch-based-recommendations)
- Explicitly [sharing a set of overrides through a URL](#url-based-recommendations) with a team member

### Branch based recommendations

This workflow is great when you start working on a new feature in a branch, as the recommended overrides will travel with the branch from local development through to the preview deployment.

1. First configure the overrides you would like to share as usual
2. Then, select the chevron next to the branch name at the top
3. Choose **Save Recommendations** to recommend these overrides to any team member visiting your branch locally or on a preview deployment

When a team member visits that branch they will get a notification suggesting to apply the overrides you recommended. Notifications are displayed on all preview deployments, but not on your production deployment.

### URL based recommendations

This workflow is great when you want to share once-off overrides with team members to reproduce a bug under certain conditions or to share a new feature.

1. First configure the overrides you would like to share as usual
2. Choose **Share** to copy a link to the page you are on, along with a query parameter containing your overrides

You can send this link to team members. When they visit the link they will get a notification suggesting to apply the overrides you shared.

## More resources

- [Flags Explorer reference](/docs/flags/flags-explorer/reference)
- [Flags SDK Reference](/docs/flags/flags-sdk-reference)


---

[View full sitemap](/docs/sitemap)
