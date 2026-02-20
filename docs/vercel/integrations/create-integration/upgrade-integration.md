---
title: Upgrade an Integration
product: vercel
url: /docs/integrations/create-integration/upgrade-integration
type: conceptual
prerequisites:
  - /docs/integrations/create-integration
  - /docs/integrations
related:
  - /docs/integrations/create-integration/submit-integration
  - /docs/deploy-button
  - /docs/integrations/create-integration/marketplace-product
  - /docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables
summary: Lean more about when you may need to upgrade your Integration.
---

# Upgrade an Integration

You should upgrade your integration if you are using any of the following scenarios.

## Upgrading your Integration

If your Integration is using outdated features on the Vercel Platform, [follow these guidelines](/docs/integrations/create-integration/upgrade-integration#upgrading-your-integration) to upgrade your Integration and use the latest features.

Once ready, make sure to [submit your Integration](/docs/integrations/create-integration/submit-integration) for review after you upgraded it.

## Use generic Webhooks

You can now specify a generic Webhook URL in your Integration settings. Use generic Webhooks instead of Webhooks APIs and Delete Hooks.

The Vercel REST API to list, create, and delete Webhooks [has been removed](https://vercel.com/changelog/sunsetting-ui-hooks-and-legacy-webhooks). There's also no support for Delete Hooks which are notified on Integration Configuration removal. If you have been using either or both features, you need to update your Integration.

## Use External Flow

If your Integration is using the OAuth2 installation flow, you should use the [External installation flow](/docs/integrations/create-integration/submit-integration#external-installation-flow) instead. By using the External flow, users will be able to choose which Vercel scope (Personal Account or Team) to install your Integration to.

## Use your own UI

UI Hooks is a deprecated feature that allowed you to create custom configuration UI for your Integration inside the Vercel dashboard. If your Integration is using UI Hooks, you should build your own UI instead.

## Legacy Integrations

Integration that use UI Hooks are now [fully deprecated](https://vercel.com/changelog/sunsetting-ui-hooks-and-legacy-webhooks). Users are not able to install them anymore.

If you are using a Legacy Integrations, it's recommended finding an updated Integration on the [Integrations Marketplace](https://vercel.com/integrations).
If adequate replacement is not available, contact the integration developer for more information.

## `currentProjectId` in Deploy Button

If your Integration is not using `currentProjectId` to determine the target project for the Deploy Button flow, please use it. [Here’s the documentation](/docs/deploy-button).

## Single installation per scope

If your Integration assumes that it can be installed multiple times in a Vercel scope (Hobby team or team), read the following so that it can support single installation per scope for each flow:

- [Marketplace flow](/docs/integrations/create-integration/marketplace-product)
- [External flow](/docs/integrations/create-integration/submit-integration#external-installation-flow)
- [Deploy Button flow](/docs/deploy-button)

## Latest API for Environment Variables

If your Integration is setting Environment Variables, please make sure to use `type=encrypted` with the latest version (v7) of the API when [creating Environment Variables for a Project](/docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables).

> **💡 Note:** Creating project secrets is not required anymore and will be deprecated in the
> near future.


---

[View full sitemap](/docs/sitemap)
