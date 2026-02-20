---
title: Project settings
product: vercel
url: /docs/project-configuration/project-settings
type: reference
prerequisites:
  - /docs/project-configuration
related:
  - /docs/projects/project-dashboard
  - /docs/dashboard-features
  - /docs/project-configuration
  - /docs/project-configuration/general-settings
  - /docs/functions/runtimes/node-js/node-js-versions
summary: Use the project settings, to configure custom domains, environment variables, Git, integrations, deployment protection, functions, cron jobs, project...
---

# Project settings

From the Vercel [dashboard](/dashboard), there are two areas where you can configure settings:

- **Team Settings**: Any settings configured here, are applied at the team-level, although you can select which projects the settings should be set for.
- **Project Settings**: These are specific settings, accessed through the [project dashboard](/docs/projects/project-dashboard), that are only scoped to the selected project. You can make changes about all areas relating to your project, including domains, functions, drains, integrations, Git, caching, environment variables, deployment protection, and security.

This guide focuses on the project settings. To edit project settings:

1. Ensure you have selected your Team from the [scope selector](/docs/dashboard-features#scope-selector).
2. Choose a project from the [dashboard](/dashboard).
3. Select the **Settings** tab.
4. Find the settings you need and make changes.

## Configuring your project with a vercel.json file

While many settings can be set from the dashboard, you can also define a `vercel.json` file at the project root that allows you to set and override the default behavior of your project.

To learn more, see [Configuring projects with vercel.json](/docs/project-configuration).

## General settings

This provides all the foundational information and settings for your Vercel project, including the name, build and deployment settings, the directory where your code is located, the Node.js version, Project ID, toolbar settings, and more.

To learn more, see [General Settings](/docs/project-configuration/general-settings)

## Build and deployment settings

In your build and deployment settings, adjust configurations such as framework settings, code directory, and Node.js version.

In this section, you can adjust build-related configurations, such as framework settings, code directory, Node.js version, and more.

- [Node.js version](/docs/functions/runtimes/node-js/node-js-versions#setting-the-node.js-version-in-project-settings)
- [Prioritize production builds](/docs/deployments/concurrent-builds#prioritize-production-builds)
- [On-demand concurrent builds](/docs/deployments/managing-builds#on-demand-concurrent-builds)

### Ignored Build Step

By default, Vercel creates a new [deployment](/docs/deployments) and build (unless the Build Step is [skipped](/docs/deployments/configure-a-build#skip-build-step)) for every commit pushed to your connected Git repository.

Each commit in Git is assigned a unique hash value commonly referred to as SHA. If the SHA of the commit was already deployed in the past, no new Deployment is created. In that case, the last Deployment matching that SHA is returned instead.

To ignore the build step:

1. Choose a project from the [dashboard](/dashboard)
2. Select the **Settings** tab and then select the **Build and Deployment** menu item
3. In the **Ignored Build Step** section, select the behavior you would like. This behavior provides a command that outputs a code, which tells Vercel whether to issue a new build or not. The command is executed within the [Root Directory](/docs/deployments/configure-a-build#root-directory) and can access all [System Environment Variables](/docs/environment-variables/system-environment-variables):
   - **Automatic**: Each commit will issue a new build
   - **Only build production**: When the `VERCEL_ENV` is production, a new build will be issued
   - **Only build preview**: When the `VERCEL_ENV` is preview, a new build will be issued
   - **Only build if there are changes**: A new build will be issued only when the Git diff contains changes
   - **Only build if there are changes in a folder**: A new build will be issued only when the Git diff contains changes in a folder that you specify
   - **Don't build anything**: A new build will never be issued
   - **Run my Bash script**: [Run a Bash script](/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel) from a location that you specify
   - **Run my Node script**: [Run a Node script](/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel) from a location that you specify
   - **Custom**: You can enter any other command here, for example, only building an Nx app ([`npx nx-ignore <project-name>`](https://github.com/nrwl/nx-labs/tree/main/packages/nx-ignore#usage))
4. When your deployment enters the `BUILDING` state, the command you've entered in the **Ignored Build Step** section will be run. The command will always exit with either code `1` or `0`:
   - If the command exits with code `1`, the build continues as normal
   - If the command exits with code `0`, the build is immediately aborted, and the deployment state is set to `CANCELED`

> **⚠️ Warning:** Canceled builds are counted as full deployments as they execute a build
> command in the build step. This means that any canceled builds initiated using
> the ignore build step will still count towards your [deployment quotas](/docs/limits#deployments-per-day-hobby) and [concurrent build slots](/docs/deployments/concurrent-builds).You may be able to optimize your deployment queue by [skipping builds](/docs/monorepos#skipping-unaffected-projects) for projects within a monorepo that are unaffected by a change.

To learn about more advanced usage see the ["How do I use the Ignored Build Step field on Vercel?"](/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel) guide.

#### Ignore Build Step on redeploy

If you have set an ignore build step command or [script](/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel), you can also skip the build step when redeploying your app:

1. From the Vercel dashboard, select your project
2. Select the **Deployments** tab and find your deployment
3. Click the ellipses (...) and from the context menu, select **Redeploy**
4. Uncheck the **Use project's Ignore Build Step** checkbox

## Custom domains

You can [add **custom domains**](/docs/domains/add-a-domain) for each project.

To learn more, [see the Domains documentation](/docs/domains)

## Environment Variables

You can configure Environment Variables for each environment directly from your project's settings. This includes [linking Shared Environment Variables](/docs/environment-variables/shared-environment-variables#project-level-linking) and [creating Sensitive Environment Variables](/docs/environment-variables/sensitive-environment-variables)

To learn more, [see the Environment Variables documentation](/docs/environment-variables).

## Git

In your project settings, you can manage the Git connection, enable Git LFS, and create deploy hooks.

To learn more about the settings, see [Git Settings](/docs/project-configuration/git-settings). To learn more about working with your Git integration, see [Git Integrations](/docs/git).

## Integrations

To manage third-party integrations for your project, you can use the Integrations settings.

To learn more, see [Integrations](/docs/integrations).

## Deployment Protection

Protect your project deployments with [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) and [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection), and more.

To learn more, see [Deployment Protection](/docs/security/deployment-protection).

## Functions

You can configure the default settings for your Vercel Functions, including the Node.js version, memory, timeout, region, and more.

To learn more, see [Configuring Functions](/docs/functions/configuring-functions).

## Cron Jobs

You can enable and disable Cron Jobs for your project from the Project Settings. Configuring cron jobs is done in your codebase.

To learn more, see [Cron Jobs](/docs/cron-jobs).

## Project members

Team owners can manage who has access to the project by adding or removing members to that specific project from the project settings.

To learn more, see [project-level roles](/docs/rbac/access-roles/project-level-roles).

## Webhooks

Webhooks allow your external services to respond to events in your project. You can enable them on a per-project level from the project settings.

To learn more, see the [Webhooks documentation](/docs/webhooks).

## Drains

Drains are a Pro and Enterprise feature that allow you to send observability data (logs, traces, speed insights, and analytics) to external services. Drains are created at the team-level, but you can manage them on a per-project level from the project settings.

To learn more, see the [Drains documentation](/docs/drains/using-drains).

## Security settings

From your project's security settings you can enable or disable [Attack Challenge Mode](/docs/attack-challenge-mode), [Logs and Source Protection](/docs/projects/overview#logs-and-source-protection), [Customer Success Code Visibility](/docs/projects/overview#customer-success-code-visibility) [Git Fork Protection](/docs/projects/overview#git-fork-protection), and set a [retention policy for your deployments](/docs/security/deployment-retention).

To learn more, see [Security Settings](/docs/project-configuration/security-settings).

## Advanced

Vercel provides some additional features in order to configure your project in a more advanced way. This includes:

- Displaying [directory listing](/docs/directory-listing)
- Enabling [Skew protection](/docs/skew-protection)


---

[View full sitemap](/docs/sitemap)
