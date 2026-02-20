---
title: Transferring a project
product: vercel
url: /docs/projects/transferring-projects
type: how-to
prerequisites:
  - /docs/projects
related:
  - /docs/rbac/access-roles
  - /docs/deployments
  - /docs/environment-variables
  - /docs/project-configuration
  - /docs/configuration
summary: Learn how to transfer a project between Vercel teams.
---

# Transferring a project

You can transfer projects between your Vercel teams with **zero downtime** and **no workflow interruptions**.

You must be an [owner](/docs/rbac/access-roles#owner-role) of the team you're transferring from, and a member of the team you're transferring to. For example, you can transfer a project from your Hobby team to a Pro team, and vice versa if you're an owner on the Pro team.

During the transfer, all of the project's dependencies will be moved or copied over to the new Vercel team namespace. To learn more about what is transferred, see the [What is transferred?](#what-is-transferred) and [What is not transferred?](#what-is-not-transferred).

## Starting a transfer

1. To begin transferring a project, choose a project from the Vercel [dashboard](/dashboard).

2. Then, select the **Settings** tab from the top menu to go to the project settings.

3. From the left sidebar, click **General** and scroll down to the bottom of the page, where you'll see the **Transfer Project** section. Click **Transfer** to begin the transferring flow:

   ![Image](`/docs-assets/static/docs/concepts/projects/transfer-project-light.png`)

4. Select the Vercel team you wish to transfer the project to. You can also choose to create a new team:

   ![Image](`/docs-assets/static/docs/concepts/projects/transfer-project-model-light.png`)

   If the target Vercel team does not have a valid payment method, you must add
   one before transferring your project to avoid any interruption in service.

5. You'll see a list of any domains, aliases, and environment variables that will be transferred. You can also choose a new name for your project. By default, the existing name is re-used. You must provide a new name if the target Vercel team already has a project with the same name:

   > **💡 Note:** The original project  when initiating the transfer,
   > but you will not experience any downtime.

   ![Image](`/docs-assets/static/docs/concepts/projects/project-transfer-confirm-light.png`)

6. After reviewing the information, click **Transfer** to initiate the project transfer.

7. While the transfer is in progress, Vercel will redirect you to the newly created project on the target Vercel team with in-progress indicators. When a transfer is in progress, you **may not** create new deployments,
   edit project settings or delete that project.

Transferring a project may take between 10 seconds and 10 minutes, depending on the amount of associated data. When the transfer completes, the **transfer's initiator** and the **target team's owners** are notified by email. You can now use your project as normal.

## What is transferred?

- [Deployments](/docs/deployments)
- [Environment variables](/docs/environment-variables) are copied to the target team, except for those defined in the [`env`](/docs/project-configuration#env) and [`build.env`](/docs/configuration#project/build-env) configurations of `vercel.json`.
- The project's configuration details
- [Domains and Aliases](#transferring-domains)
- Administrators
- Project name
- Builds
- Git repository link
- Security settings
- [Cron Jobs](/docs/cron-jobs)
- [Preview Comments](/docs/comments)
- [Web Analytics](/docs/analytics)
- [Speed Insights](/docs/speed-insights)
- [Function Region](/docs/regions#compute-defaults)
- [Directory listing setting](/docs/directory-listing)

Once you transfer a project from a Hobby team to a Pro or Enterprise team, you may choose to enable additional paid features on the target team to match the features of the origin team. These include:

- [Concurrent Builds](/docs/deployments/concurrent-builds)
- [Preview Deployment Suffix](/docs/deployments/generated-urls#preview-deployment-suffix)
- [Password Protection](/docs/deployments/deployment-protection#password-protection)

## What is not transferred?

- [Integrations](/docs/integrations): Those associated with your project must be added again after the transfer is complete
- [Edge Configs](/docs/edge-config) have [a separate transfer mechanism](/docs/storage#transferring-your-store)
- Usage is reset on transfer
- The Active Branches section under **Project** will be empty
- Environment variables defined in the [`env`](/docs/project-configuration#env) and [`build.env`](/docs/configuration#project/build-env) configurations of `vercel.json` must be [migrated to Environment Variables](/kb/guide/how-do-i-migrate-away-from-vercel-json-env-and-build-env) in the Project Settings or configured again on the target team after the transfer is complete
- [Monitoring](/docs/observability/monitoring) data is not transferred
- Log data ([Runtime](/docs/runtime-logs) + [build](/docs/deployments/logs) time)
- [Custom Log Drains](/docs/drains) are not transferred
- [Vercel Blob](/docs/storage/vercel-blob) has [a separate transfer mechanism](/docs/storage#transferring-your-store)

## Transferring domains

Project [domains](/docs/domains) will automatically be transferred to the target team by delegating access to domains.

For example, if your project uses the domain `example.com`, the domain will be [moved](/docs/projects/custom-domains#moving-domains) to the target team. The target team will be billed as the primary owner of the domain if it was purchased through Vercel.

If your project uses the domain `blog.example.com`, the domain `blog.example.com` will be **delegated** to the target team, but the root domain `example.com` will remain on the origin Vercel scope. The origin Vercel scope will remain the primary owner of the domain, and will be billed as usual if the domain was purchased through Vercel.

If your project uses a [Wildcard domain](/docs/domains/working-with-domains#wildcard-domain) like `*.example.com`, the Wildcard domain will be **delegated** to the target team, but the root domain `example.com` will remain on the origin Vercel scope.

## Additional features

> **💡 Note:** This only applies when transferring away from a team.

When transferring between teams, you may be asked whether you want to add additional features to the target team to match the origin team's features. This ensures an uninterrupted workflow and a consistent experience between teams.
Adding these features is optional.


---

[View full sitemap](/docs/sitemap)
