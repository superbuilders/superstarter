---
title: Promoting Deployments
product: vercel
url: /docs/deployments/promoting-a-deployment
type: how-to
prerequisites:
  - /docs/deployments
related:
  - /docs/instant-rollback
  - /docs/git
  - /docs/environment-variables
  - /docs/cli/deploying-from-cli
summary: Learn how to promote deployments to production on Vercel.
---

# Promoting Deployments

By default, when you merge to or make commits to your production branch (often `main`), Vercel will automatically promote the changes to Production. However, there are a number of ways to manually change which deployment is served to people who visit your production domain:

- **[Instant rollback](#instant-rollback)**: You can use this as a way to instantly revert to an earlier [deployment](/docs/instant-rollback#eligible-deployments) that **has** served production traffic. It works by assigning your domains to an existing deployment, rather than doing a complete rebuild
- **[Promote preview to production](#promote-a-deployment-from-preview-to-production)**: You can use this as a way to promote a preview deployment to production through a complete rebuild
- **[Promote a staged production build](#staging-and-promoting-a-production-deployment)**: You can use this option to promote a production deployment which has never served production traffic. To use this option, you must turn off the auto-assignment of domains. This option won't trigger a rebuild

## Instant Rollback

Use this when you want to replace the **current** production deployment with another deployment that has already been serving as current in the past. Instant Rollback is a faster process since it involves assigning domains to an existing deployment rather than a complete rebuild and is ideal to quickly recover from an incident in production to roll back. However, because it does not do a complete rebuild, items such as environment variables will not be rebuilt.

For more information on how and when to use it, see the [Instant Rollback docs](/docs/instant-rollback).

## Promote a deployment from preview to production

There may be times when you need to promote an existing preview deployment to production, such as when you need to temporarily use a branch that isn't set as the [production branch](/docs/git#production-branch).

To promote an existing preview deployment to production on Vercel, do the following:

1. Go to your project's **Deployments** tab. This tab lists all the previously deployed builds
2. Click the ellipsis (), and from the context menu select **Promote to Production**
3. The popup dialog informs you of which domain(s) will be linked to the build once promoted. To confirm, select **Promote to Production**

![Image](`/front/docs/deployment/promote-to-prod-light.png`)

> **💡 Note:** If you have different [Environment
> Variables](/docs/environment-variables#environments) set for preview and
> production deployments then the variables used will change from preview to
> those you have linked to the production environment. You **cannot use your
> preview environment variables in a production deployment**

## Staging and promoting a production deployment

In some cases you may want to create a production-like deployment to use as a staging environment before promoting it to production.

In this scenario, you can turn off the auto-assignment of domains for your production build, as described below. Turning off the auto-assignment of domains means the deployment won't automatically be served to your production traffic, but also means you must manually promote it to production.

### CLI

For steps on using this workflow in the CLI, see [Deploying a staged production build](/docs/cli/deploying-from-cli#deploying-a-staged-production-build).

### Dashboard

1. On your [dashboard](/dashboard), select your project
2. Select the **Settings** tab and go to your **Environments** settings
3. Click on **Production** and go to the **Branch Tracking** section
4. Disable the **Auto-assign Custom Production Domains** toggle
5. When you are ready to promote this staged deployment to production, select the ellipses (…) next to the deployment
6. From the menu, select the **Promote** option
7. From the **Promote** dialog, confirm the deployment, and select the **Promote** button:

![Image](`/docs-assets/static/docs/concepts/deployments/promote-to-prod-light.png`)

Vercel will instantly promote the deployment; it doesn't require a rebuild. Once promoted, the deployment is marked as [**Current**](#production-deployment-state).

## Production deployment state

Your production deployments could be in one of three states:

- **Staged** – This means that a commit has been pushed to `main`, but a domain has not been auto-assigned to the deployment. This type of a deployment can be promoted to **Current**
- **Promoted** – This production deployment has been [promoted](#staging-and-promoting-a-production-deployment) from staging. If a deployment has already been promoted in the past, you can't promote it again. If you want to use a previously promoted deployment, you must do a rollback to it
- **Current** – This is the production deployment that is aliased to your domain and the one that is currently being served to your users


---

[View full sitemap](/docs/sitemap)
