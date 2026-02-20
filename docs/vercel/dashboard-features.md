---
title: Dashboard Overview
product: vercel
url: /docs/dashboard-features
type: conceptual
prerequisites:
  []
related:
  - /docs/projects/overview
  - /docs/deployments
  - /docs/integrations/install-an-integration/product-integration
  - /docs/integrations/create-integration
  - /docs/integrations
summary: Learn how to use the Vercel dashboard to view and manage all aspects of the Vercel platform, including your Projects and Deployments.
---

# Dashboard Overview

You can use the [Vercel dashboard](/dashboard) to view and manage all aspects of the Vercel platform, including your [Projects](/docs/projects/overview) and [Deployments](/docs/deployments). What you see in each tab is dependant on the *scope* that is selected.

![Image](`/docs-assets/static/docs/concepts/dashboard/dash-light-3.png`)

## Scope selector

What you see in each tab is dependant on the *scope* that is selected.

The scope selector allows you to switch between your Hobby team and any teams that you may be part of. To switch between accounts and teams, select the arrows next to the name:

![Image](`/docs-assets/static/docs/concepts/dashboard/scope-selector-light.png`)

To go back to your Team dashboard at any time, click the Vercel logo or the scope selector.

## Find

The Find bar allows you to search for:

- Teams
- Projects
- Deployments (by branch)
- Pages
- Settings

Access this feature by clicking on the **Find** search input on the top right of the Vercel dashboard or pressing  on your keyboard.

## Overview

When you first create an account and log on to Vercel, you'll be greeted by your team overview. This shows information on all projects that you have on the selected Vercel team.

You can click on the  button to filter by a specific Repository and to choose whether to sort by Activity (which projects you have most recently viewed in the dashboard or deployed to) or Name (alphabetically). Next to the  button is a toggle you can use to switch between card view and list view. You can also filter to a certain repository by clicking the pill for that repository on any of its projects.

- [My dashboard](/dashboard)

## Integrations

Integrations allow you to extend the capabilities of Vercel and connect with third-party platforms or services. Users and Teams on all plans can use or create Integrations.

Through the Integrations section on the dashboard, you can [view and manage a list of all integrations](/docs/integrations/install-an-integration/product-integration#manage-native-integrations) on your account, browse the marketplace to [install integrations](/docs/integrations/create-integration), or go to the [Integrations Console](/dashboard/integrations/console) to [create your own Integration](/docs/integrations/create-integration).

- [Integrations overview](/docs/integrations)
- [My integrations](/dashboard/integrations)

## Activity

The Activity Log provides a list of all events on a Hobby team, chronologically organized since its creation. The [events](/docs/observability/activity-log#events-logged) that you will see are dependant on the type of account and [role within a Team](/docs/accounts/team-members-and-roles).

- [Activity log overview](/docs/dashboard-features/activity-log)
- [My activity log](/dashboard/activity)

## Recent Previews

The recent previews panel gives you a quick way to access recently deployed and viewed previews within your teams. It's scoped to the team you are actively viewing.

Each listed preview shows the latest deployment ID and status. Any associated pull request to your git provider is also shown or the relevant git branch.

Selecting a preview from the list will navigate to the live preview.

You can also navigate to related items for a preview deployment:

- The associated pull request or code repository page by clicking the label that will have the word "Code" or the pull request ID
- The deployment details by clicking the label with the deployment ID and status icon

Each preview deployment item also has a context menu where you can see further details and also remove the listing.

## Domains

By default, all deployments are assigned a domain with the suffix: `.vercel.app`. This domain can be replaced with a Custom Domain of your choice.

The Domains section of the dashboard lets you view all domains related to your account or Team, and allows you to **Buy**, **Add**, or **Transfer In** a custom domain.

- [Add a domain](/docs/domains/add-a-domain)
- [My domains](/dashboard/domains)

## Usage

The Usage tab on the Dashboard provides detailed insight into the actual resource usage of all projects relating to your account or Team.

From the dashboard, you can filter the usage by billing cycle, date, project, or function.

- [Usage overview](/docs/limits/usage)
- [My usage](/dashboard/usage)

## Settings

There are two different types of settings pages:

- **Personal Account / Team Settings** - These settings allow you to manage account details, billing, invoicing, membership, security, and tokens. The options you see will depend on the your scope and permissions.

- **Project Settings** - You can view this by selecting a project in the dashboard and then selecting its settings. From there you can manage project details, domains, integrations, Git, functions, environment variables, and security.

- [My settings dashboard](/account)

## Command Menu

Vercel provides a **Command Menu** that enables you to navigate through the dashboard and perform common actions using only the keyboard.

You can access the menu using by pressing  +  on macOS or  +  on Windows and Linux. Note that you must be logged in to access the Command Menu.

- [Command Menu overview](/docs/dashboard-features/command-menu)


---

[View full sitemap](/docs/sitemap)
