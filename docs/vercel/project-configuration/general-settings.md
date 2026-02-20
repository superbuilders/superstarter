---
title: General settings
product: vercel
url: /docs/project-configuration/general-settings
type: reference
prerequisites:
  - /docs/project-configuration
related:
  - /docs/deployments/configure-a-build
  - /docs/functions/runtimes/node-js/node-js-versions
  - /docs/dashboard-features
  - /docs/comments
  - /docs/vercel-toolbar
summary: Configure basic settings for your Vercel project, including the project name, build and development settings, root directory, Node.js version,...
---

# General settings

## Project name

Project names can be up to 100 characters long and must be lowercase. They can include letters, digits, and the following characters: `.`, `\_`, `-`. However, they cannot contain the sequence `---`.

## Build and development settings

You can edit settings regarding the build and development settings, root directory, and the [install command](/docs/deployments/configure-a-build#install-command). See the [Configure a build documentation](/docs/deployments/configure-a-build) to learn more.

The changes you make to these settings will only be applied starting from your **next deployment**.

## Node.js version

Learn more about how to customize the Node.js version of your project in the [Node.js runtime](/docs/functions/runtimes/node-js/node-js-versions#setting-the-node.js-version-in-project-settings) documentation.

You can also learn more about [all supported versions](/docs/functions/runtimes/node-js/node-js-versions#default-and-available-versions) of Node.js.

## Project ID

Your project ID can be used by the REST API to carry out tasks relating to your project. To locate your Project ID:

1. Ensure you have selected your Team from the [scope selector](/docs/dashboard-features#scope-selector).
2. Choose your project from the [dashboard](/dashboard).
3. Select the **Settings** tab.
4. Under **General**, scroll down until you find **Project ID**. The ID should start `prj_`.
5. Copy the Project ID to use as needed.

## Vercel Toolbar settings

The Vercel Toolbar is a tool that assists you in iterating and developing your project and is enabled by default on preview deployments. You can enable or disable the toolbar in your project settings.

- Leave feedback on deployments with [Comments](/docs/comments)
- Navigate [through dashboard pages](/docs/vercel-toolbar#using-the-toolbar-menu), and [share deployments](/docs/vercel-toolbar#sharing-deployments)
- Read and set [Feature Flags](/docs/feature-flags)
- Use [Draft Mode](/docs/draft-mode) for previewing unpublished content
- Edit content in real-time using [Edit Mode](/docs/edit-mode)
- Inspect for [Layout Shifts](/docs/vercel-toolbar/layout-shift-tool) and [Interaction Timing](/docs/vercel-toolbar/interaction-timing-tool)
- Check for accessibility issues with the [Accessibility Audit Tool](/docs/vercel-toolbar/accessibility-audit-tool)


---

[View full sitemap](/docs/sitemap)
