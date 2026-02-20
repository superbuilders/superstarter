---
title: Permissions and Access
product: vercel
url: /docs/integrations/install-an-integration/manage-integrations-reference
type: how-to
prerequisites:
  - /docs/integrations/install-an-integration
  - /docs/integrations
related:
  - /docs/notifications
  - /docs/rest-api/vercel-api-integrations
  - /docs/integrations/create-integration/billing
summary: Learn how to manage project access and added products for your integrations.
---

# Permissions and Access

## View an integration's permissions

To view an integration's permissions:

1. From your Vercel [dashboard](/dashboard), go to the **Integrations** tab.
2. Next to the integration, select the **Manage** button.
3. On the Integrations detail page, scroll to **Permissions** section at the bottom of the page.

## Permission Types

Integration permissions restrict how much of the API the integration is allowed to access. When you install an integration, you will see an overview of what permissions the integration requires to work.

| **Permission Type**                      | **Read Access**                                                                                                                                        | **Write Access**                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Installation**                         | Reads whether the integration is installed for the hobby or team account                                                                               | Removes the installation for the hobby or team account                                                        |
| **Deployment**                           | Retrieves deployments for the hobby or team account. Includes build logs, a list of files and builds, and the file structure for a specific deployment | Creates, updates, and deletes deployments for the hobby or team account                                       |
| **Deployment Checks**                    | N/A                                                                                                                                                    | Retrieves, creates, and updates tests/assertions that trigger after deployments for the hobby or team account |
| **Project**                              | Retrieves projects for the hobby or team account. Also includes retrieving all domains for an individual project                                       | Creates, updates, and deletes projects for the hobby or team account                                          |
| **Project Environment Variables**        | N/A                                                                                                                                                    | Reads, creates, and updates integration-owned environment variables for the hobby or team account             |
| **Global Project Environment Variables** | N/A                                                                                                                                                    | Reads, creates, and updates all environment variables for the hobby or team account                           |
| **Team**                                 | Accesses team details for the account. Includes listing team members                                                                                   | N/A                                                                                                           |
| **Current User**                         | Accesses information about the Hobby team on which the integration is installed                                                                        | N/A                                                                                                           |
| **Log Drains**                           | N/A                                                                                                                                                    | Retrieves a list of log drains, creates new and removes existing ones for the Pro or Enterprise accounts      |
| **Domain**                               | Retrieves all domains for the hobby or team account. Includes reading its status and configuration                                                     | Removes a previously registered domain name from Vercel for the hobby or team account                         |

## Confirming Permission Changes

Integrations can request more permissions over time.
Individual users and team owners are [notified](/docs/notifications#notification-details) by Vercel when an integration installation has pending permission changes. You'll also be alerted to any new permissions on the [dashboard](/dashboard/marketplace). The permission request contains information on which permissions are changing and the reasoning behind the changes.

![Image](https://vercel.com/docs-assets/static/docs/integrations/dashboard/action-required-for-changed-permissions-light.png)

## Manage project access

To manage which projects the installed integration has access to:

1. From your Vercel [dashboard](/dashboard), go to the **Integrations** tab.
2. Next to the integration, select the **Manage** button.
3. On the Integrations page, under **Access**, select the **Manage Access** button.
4. From the dialog, select the option to manage which projects have access.

### Disabled integrations

Every integration installed for a team creates an access token that is associated with the developer who originally installed it. If the developer loses access to the team, the integration will become disabled to prevent unauthorized access. We will [notify](/docs/notifications#notification-details) team owners when an installation becomes disabled.

When an integration is disabled, team owners must take action by clicking **Manage** and either changing ownership or removing the integration.

> **💡 Note:** If a disabled integration is not re-enabled, it will be automatically removed
> after 30 days. Any environment variables that were created by that integration
> will also be removed - this may prevent new deployments from working.

When an integration is `disabled`:

- The integration will no longer have API access to your team or account
- If the integration has set up log drains, then logs will cease to flow
- The integration will no longer receive the majority of webhooks, other than those essential to its operation (`project.created`, `project.removed` and `integration-configuration.removed`)

If you are an integrator, see the [disabled integration configurations](/docs/rest-api/vercel-api-integrations#disabled-integration-configurations) documentation to make sure your integration can handle `disabled` state.

## Invoice access

Only users with **Owner** or **Billing** roles can view invoices for native integrations. See [Billing](/docs/integrations/create-integration/billing) for more details on invoice lifecycle, pricing, and refunds.


---

[View full sitemap](/docs/sitemap)
