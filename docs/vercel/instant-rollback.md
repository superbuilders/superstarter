---
title: Performing an Instant Rollback on a Deployment
product: vercel
url: /docs/instant-rollback
type: conceptual
prerequisites:
  []
related:
  - /docs/cron-jobs
  - /docs/deployments/promoting-a-deployment
  - /docs/cli/promote
  - /docs/deployments/environments
summary: Learn how to perform an Instant Rollback on your production deployments and quickly roll back to a previously deployed production deployment.
---

# Performing an Instant Rollback on a Deployment

Vercel provides Instant Rollback as a way to quickly revert to a previous production deployment. This can be useful in situations that require a swift recovery from production incidents, like breaking changes or bugs. It's important to keep in mind that during a rollback:

- Vercel treats the rolled-back deployment as a restored version of a previous deployment
- The configuration used for the rolled-back deployment may become stale
- Vercel won't update environment variables if you change them in the project settings and will roll back to a previous build
- If the project uses [cron jobs](/docs/cron-jobs), they will be reverted to the state of the rolled back deployment

For teams on a Pro or Enterprise plan, all deployments previously aliased to a production domain are [eligible to roll back](#eligible-deployments). Hobby users can roll back to the immediately previous deployment.

## How to roll back deployments

To initiate an Instant Rollback from the Vercel dashboard:

- ### Select your project
  On the project's overview page, you will see the [Production Deployment tile](# "Production Deployment tile"). From there, click **Instant Rollback**.

  ![Image](`/docs-assets/static/docs/concepts/deployments/instant-rollback.png`)

- ### Select the deployment to roll back to
  After selecting Instant Rollback, you'll see an dialog that displays your current production deployment and the eligible deployments that you can roll back to.

  If you're on the Pro or Enterprise plans, you can also click the **Choose another deployment** button to display a list of all [eligible](#eligible-deployments) deployments.

  Select the deployment that you'd like to roll back to and click **Continue**.

  ![Image](`/docs-assets/static/docs/concepts/deployments/rollback-process.png`)

- ### Verify the information
  Once you've selected the deployment to roll back to, verify the roll back information:
  - The names of the domains and sub-domains that will be rolled back
  - There are no change in Environment Variables, and they will remain in their original state
  - A reminder about the changing behavior of external APIs, databases, and CMSes used in the current or previous deployments

- ### Confirm the rollback
  Once you have verified the details, click the **Confirm Rollback** button. At this point, you'll get confirmation details about the successful rollback.

  ![Image](`/docs-assets/static/docs/concepts/deployments/rollback-success.png`)
  > **⚠️ Warning:** If you have custom aliases, ensure the domains listed above are correct. The
  > rolled-back deployment does not include custom aliases since these are not a
  > part of your project’s domain settings. Custom aliases will only be included
  > if they were present on the previous production deployment.

- ### Successful rollback
  The rollback happens instantaneously. Vercel points your domains back to the selected deployment, and the production deployment tile highlights the canceled and rolled-back commits.

  After a rollback, Vercel turns off auto-assignment of production domains. This means new pushes to your production branch won't replace the rolled-back deployment. To restore normal deployment behavior, see [Undo a rollback](#undo-a-rollback).

  ![Image](`/docs-assets/static/docs/concepts/deployments/rollback-on-production-tile.png`)

> **💡 Note:**&#x20;

### Accessing Instant Rollback from Deployments tab

You can also roll back from the main **Deployments** tab in your dashboard. Filtering the deployments list by `main` is recommended to view a list of [eligible roll back deployments](#eligible-deployments) as this list all your current and previous deployments promoted to production.

Click the vertical ellipses (⋮) next to the deployment row and select the **Instant Rollback** option from the context menu.

![Image](`/docs-assets/static/docs/concepts/deployments/rollback-from-deploys-list.png`)

## Undo a rollback

After a rollback, Vercel turns off [auto-assignment of production domains](/docs/deployments/promoting-a-deployment#staging-and-promoting-a-production-deployment). This means new pushes to your production branch won't go live automatically. To restore normal deployment behavior, you need to undo the rollback by promoting a different deployment.

### From the dashboard

When your project is in a rolled-back state, an **Undo Rollback** button appears on the production deployment tile:

1. On your project's overview page, click the **Undo Rollback** button on the production deployment tile
2. In the dialog, select the deployment you'd like to promote
3. Click **Confirm** to promote the selected deployment

This promotes the selected deployment to production and re-enables auto-assignment of production domains. New pushes to your production branch will go live automatically again.

### From the CLI

To undo a rollback from the command line, promote a deployment with [`vercel promote`](/docs/cli/promote):

```bash filename="terminal"
vercel promote [deployment-id or url]
```

This has the same effect as undoing from the dashboard: it promotes the specified deployment and restores auto-assignment of production domains.

## Who can roll back deployments?

- **Hobby** plan: On the hobby plan you can roll back to the previous deployment
- **Pro** and **Enterprise** plan: Owners and Members on these plans can roll back to any [eligible deployment](#eligible-deployments).

## Eligible deployments

Deployments previously aliased to a production domain are eligible for Instant Rollback. Deployments that have never been aliased to production a domain, e.g., most [preview deployments](/docs/deployments/environments#preview-environment-pre-production), are not eligible.

## Comparing Instant Rollback and manual promote options

To compare the manual promotion options, see [Manually promoting to Production](/docs/deployments/promoting-a-deployment).


---

[View full sitemap](/docs/sitemap)
