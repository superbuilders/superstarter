---
title: Project Dashboard
product: vercel
url: /docs/projects/project-dashboard
type: reference
prerequisites:
  - /docs/projects
related:
  - /docs/projects/managing-projects
  - /docs/deployments/logs
  - /docs/runtime-logs
  - /docs/domains
  - /docs/git
summary: Learn about the features available for managing projects with the project Dashboard on Vercel.
---

# Project Dashboard

Each Vercel project has a separate dashboard to configure settings, view deployments, and more.

To get started with a project on Vercel, see [Creating a Project](/docs/projects/managing-projects#creating-a-project) or [create a new project with one of our templates](/new/templates).

## Project overview

![Image](`/docs-assets/static/docs/concepts/projects/project-dashboard/project-tab-light.png`)

*The Project tab.*

The Project Overview tab provides an overview of your production deployment, including its [active Git branches](#active-branches), [build logs](/docs/deployments/logs), [runtime logs](/docs/runtime-logs), [associated domains](/docs/domains), and more.

### Active branches

![Image](`/docs-assets/static/docs/concepts/projects/project-dashboard/active-branches-light.png`)

*The Active Branches section of the Project Overview tab.*

The Project Overview's Active Branches gives you a quick view of your project's branches that are being actively committed to. The metadata we surface on these active branches further enables you to determine whether there's feedback to resolve or a deployment that needs your immediate attention.

> **💡 Note:** If your project isn't connected to [a Git provider](/docs/git), you'll see a
> **Preview Deployments** section where **Active Branches** should be.

You can filter the list of active branches by a search term, and see the status of each branch's deployment at a glance with the colored circle icon to the left of the branch name.

From the Active Branches section, you can:

- View the status of a branch's deployment
- Redeploy a branch, if you have [the appropriate permissions](/docs/rbac/access-roles/team-level-roles)
- View build and runtime logs for a branch's deployment
- View a branch's source in your chosen Git provider
- Copy a branch's deployment URL for sharing and viewing amongst members of your team. To share the preview with members outside of your team, see [our docs on sharing preview URLs](/docs/deployments/environments#preview-environment-pre-production#sharing-previews).

## Deployments

![Image](`/docs-assets/static/docs/concepts/projects/project-dashboard/deployments-light.png`)

*The Deployments tab.*

The project dashboard lets you manage all your current and previous deployments associated with your project. To manage a deployment, select the project in the dashboard and click the **Deployments** tab from the top navigation.

You can sort your deployments by branch, or by status. You can also interact with your deployment by redeploying it, inspecting it, assigning it a domain, and more.

See [our docs on managing deployments](/docs/deployments/managing-deployments) to learn more.

## Web Analytics and Speed Insights

![Image](`/docs-assets/static/docs/concepts/speed-insights/res-chart-light.png`)

You can learn about your site's performance metrics with [**Speed Insights**](/docs/speed-insights). When enabled, this dashboard displays in-depth information about scores and individual metrics without the need for code modifications or leaving the Vercel dashboard.

Through [**Web Analytics**](/docs/analytics), Vercel exposes data about your audience, such as the top pages, top referrers, and visitor demographics.

## Runtime logs

![Image](https://vercel.com/docs-assets/static/docs/concepts/deployments/logs/runtime-logs-ui-light.png)

The Logs tab inside your project dashboard allows you to view, search, inspect, and share your runtime logs without any third-party integration. You can filter and group your runtime logs based on the relevant [fields](/docs/runtime-logs#log-filters).

Learn more in the [runtime logs docs](/docs/runtime-logs).

## Storage

![Image](`/docs-assets/static/docs/concepts/projects/project-dashboard/storage-tab-light.png`)

*The Storage tab.*

The Storage tab lets you manage storage products connected to your project, including:

- [Vercel Blob stores](/docs/storage/vercel-blob)
- [Edge Config stores](/docs/edge-config)

Learn more in [our storage docs](/docs/storage).

## Settings

![Image](`/docs-assets/static/docs/concepts/projects/project-dashboard/project-settings-light.png`)

*The Settings tab.*

The Settings tab lets you configure your project. You can change the project's name, specify its root directory, configure environment variables and more directly in the dashboard.

Learn more in [our project settings docs](/docs/project-configuration/project-settings).


---

[View full sitemap](/docs/sitemap)
