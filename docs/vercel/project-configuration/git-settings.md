---
title: Git settings
product: vercel
url: /docs/project-configuration/git-settings
type: reference
prerequisites:
  - /docs/project-configuration
related:
  - /docs/git
  - /docs/projects/project-dashboard
  - /docs/deployments/managing-deployments
  - /docs/deploy-hooks
summary: Use the project settings to manage the Git connection, enable Git LFS, and create deploy hooks.
---

# Git settings

Once you have [connected a Git repository](/docs/git#deploying-a-git-repository), select the **Git** menu item from your project settings page to edit your project's Git settings. These settings include:

- Managing Git Large File Storage (LFS)
- Creating Deploy Hooks

## Disconnect your Git repository

To disconnect your Git repository from your Vercel project:

1. Choose a project from the [dashboard](/dashboard)
2. Select the **Settings** tab and then select the **Git** menu item
3. Under **Connected Git Repository**, select the **Disconnect** button.

## Git Large File Storage (LFS)

If you have [LFS objects](https://git-lfs.com/) in your repository, you can enable or disable support for them from the [project settings](/docs/projects/project-dashboard#settings).
When support is enabled, Vercel will pull the LFS objects that are used in your repository.

> **💡 Note:** You must [redeploy your
> project](/docs/deployments/managing-deployments#redeploy-a-project) after
> turning Git LFS on.

## Deploy Hooks

Vercel supports **deploy hooks**, which are unique URLs that accept HTTP POST requests and trigger deployments. Check out [our Deploy Hooks documentation](/docs/deploy-hooks) to learn more.


---

[View full sitemap](/docs/sitemap)
