---
title: Notifications
product: vercel
url: /docs/notifications
type: conceptual
prerequisites:
  []
related:
  - /docs/deployments
  - /docs/domains
  - /docs/integrations
  - /docs/accounts
  - /docs/limits/usage
summary: Learn how to use Notifications to view and manage important alerts about your deployments, domains, integrations, account, and usage.
---

# Notifications

> **🔒 Permissions Required**: Notifications

Vercel sends configurable notifications to you through the [dashboard](/dashboard) and email. These notifications enable you to view and manage important alerts about your [deployments](/docs/deployments), [domains](/docs/domains), [integrations](/docs/integrations), [account](/docs/accounts), and [usage](/docs/limits/usage).

## Receiving notifications

There are a number of places where you can receive notifications:

- **Web**: The Vercel dashboard displays a popover, which contains all relevant notifications
- **Email**: You'll receive an email when any of the alerts that you set on your team have been triggered
- **Push**: You'll receive a push notification when any of the alerts that you set on your team have been triggered
- **SMS**: SMS notifications can only be configured on a per-user basis for [Spend Management](/docs/spend-management#managing-alert-threshold-notifications) notifications.

By default, you will receive both web and email notifications for all [types of alerts](#types-of-notifications). Push notifications are opt-in per device and are available on desktop and mobile web. You can [manage these notifications](#managing-notifications) from the **Settings** tab, but any changes you make will only affect *your* notifications.

## Basic capabilities

There are two main ways to interact with web notifications:

- **Read**: Unread notifications are displayed with a counter on the bell icon. When you view a notification on the web, it will be marked as read once you close the popover. Because of this, we also will not send an email if you have already read it on the web.
- **Archive**: You can manage the list of notifications by archiving them. You can view these archived notifications in the archive tab, where they will be visible for 365 days.

## Managing notifications

You can manage **your own** notifications by using the following steps:

1. Select your team from the [scope selector](/docs/dashboard-features#scope-selector).
2. Go to the **Settings** tab of your account or team's dashboard, and under **Account**, select **My Notifications**.
3. From here, you can toggle [where](#receiving-notifications) *you* would like to receive notifications for each different [type of notification](#types-of-notifications).

Any changes you make will only be reflected for your notifications and not for any other members of the team. You cannot configure notifications for other users.

### Notifications for Comments

You can receive feedback on your deployments with the Comments feature. When someone leaves a comment, you'll receive a notification on Vercel. You can see all new comments in the **Comments** tab of your notifications.

[Learn more in the Comments docs](/docs/comments/managing-comments#notifications).

### On-demand usage notifications

> **🔒 Permissions Required**: Customizing on-demand usage notifications

You'll receive notifications as you accrue usage past the [included amounts](/docs/limits#included-usage) for products like Vercel Functions, Image Optimization, and more.

**Team owners** on the **Pro** plan can customize which usage categories they want to receive notifications for based on percentage thresholds or absolute dollar values.

Emails are sent out at specific usage thresholds which vary based on the feature and plan you are on.

> **💡 Note:** If you choose to disable notifications, you won't receive alerts for any
> excessive charges within that category. This may result in unexpected
> additional costs on your bill. It is recommended that you carefully consider
> the implications of turning off notifications for any usage thresholds before
> making changes to your notification settings.

## Types of notifications

The types of notifications available for you to manage depend on the [role](/docs/rbac/access-roles/team-level-roles) you are assigned within your team. For example, someone with a [Developer](/docs/rbac/access-roles#developer-role) role will only be able to be notified of Deployment failures and Integration updates.

### Critical notifications

It is *not* possible to disable all notifications for alerts that are critical to your Vercel workflow. You **can** opt-out of [one specific channel](#receiving-notifications), like email, but not both email and web notifications. This is because of the importance of these notifications for using the Vercel platform. The list below provides information on which alerts are critical.

### Notification details

| Notification group   | Type of notification                                             | Explanation                                                                                                                                                                                                                                                                                            | [Critical notification?](#critical-notifications)                 |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Account**          |                                                                  |                                                                                                                                                                                                                                                                                                        |                                                                   |
|                      | Team join requests                                               | Team owners will be notified when someone requests access to join their team and can follow a link from the notification to manage the request.                                                                                                                                                        |  |
| **Alerts**           |                                                                  |                                                                                                                                                                                                                                                                                                        |                                                                   |
|                      | Usage Anomalies                                                  | Triggered when the usage of your project exceeds a certain threshold                                                                                                                                                                                                                                   |                                                                   |
|                      | Error Anomalies                                                  | Triggered when a high rate of failed function invocations (those with a status code of 5xx) in your project exceeds a certain threshold                                                                                                                                                                |                                                                   |
| **Deployment**       |                                                                  |                                                                                                                                                                                                                                                                                                        |                                                                   |
|                      | Deployment Failures                                              | Deployment owners will be notified about any deployment failures that occur for any Project on your team.                                                                                                                                                                                              |                                                                   |
|                      | Deployment Promotions                                            | Deployment owners will be notified about any deployment promotions that occur for any Project on your team.                                                                                                                                                                                            |                                                                   |
| **Domain**           |                                                                  |                                                                                                                                                                                                                                                                                                        |                                                                   |
|                      | Configuration - Certificate renewal failed                       | Team owners will be notified if the SSL Certification renewal for any of their team's domains has failed. For more information, see [When is the SSL Certificate on my Vercel Domain renewed?](/kb/guide/renewal-of-ssl-certificates-with-a-vercel-domain).                                            |                                                                   |
|                      | Configuration - Domain Configured                                | Team owners will be notified of any domains that have been added to a project. For more information, see [Add a domain](/docs/domains/add-a-domain).                                                                                                                                                   |                                                                   |
|                      | Configuration - Domain Misconfigured                             | Team owners will be notified of any domains that have been added to a project and are misconfigured. These notifications will be batched. For more information, see [Add a domain](/docs/domains/add-a-domain).                                                                                        |                                                                   |
|                      | Configuration - Domain no payment source or payment failure      | Team owners will be notified if there were any payment issues while [Adding a domain](/docs/domains/add-a-domain). Ensure a valid payment option is adding to **Settings > Billing**                                                                                                                   |                                                                   |
|                      | Renewals - Domain renewals                                       | Team owners will be notified 17 days and 7 days before [renewal attempts](/docs/domains/renew-a-domain#auto-renewal-on).                                                                                                                                                                               |                                                                   |
|                      | Renewals - Domain expiration                                     | Team owners will be notified 24 and 14 days before a domain is set to expire about, if [auto-renewal is off](/docs/domains/renew-a-domain#auto-renewal-off). A final email will notify you when the Domain expires.                                                                                    |                                                                   |
|                      | Transfers - Domain moves requested or completed                  | Team owners will be notified when a domain has requested to move or successfully moved in or out of their team. For more information see, [Transfer a domain to another Vercel user or team](/docs/domains/working-with-domains/transfer-your-domain#transfer-a-domain-to-another-vercel-user-or-team) |                                                                   |
|                      | Transfers - Domain transfers initiated, cancelled, and completed | Team owners will be notified about any information regarding any [domain transfers](/docs/domains/working-with-domains/transfer-your-domain) in or out of your team.                                                                                                                                   |                                                                   |
|                      | Transfers - Domain transfers pending approval                    | Team owners will be notified when a domain is being [transferred into Vercel](/docs/domains/working-with-domains/transfer-your-domain#transfer-a-domain-to-vercel), but the approval is required from the original registrar.                                                                          |                                                                   |
| **Integrations**     |                                                                  |                                                                                                                                                                                                                                                                                                        |                                                                   |
|                      | Integration configuration disabled                               | Everyone will be notified about integration updates such as a [disabled Integration](/docs/integrations/install-an-integration/manage-integrations-reference#disabled-integrations).                                                                                                                   |   |
|                      | Integration scope changed                                        | Team owners will be notified if any of the Integrations used on their team have updated their [scope](/docs/rest-api/vercel-api-integrations#scopes).                                                                                                                                                  |   |
| **Usage**            |                                                                  |                                                                                                                                                                                                                                                                                                        |                                                                   |
|                      | Usage increased                                                  | Team owners will be notified about all [usage alerts](/docs/limits) regarding billing, and other usage warnings.                                                                                                                                                                                       |   |
|                      | Usage limit reached                                              | Users will be notified when they reach the limits outlined in the [Fair Usage Policy](/docs/limits/fair-use-guidelines).                                                                                                                                                                               |   |
| **Non-configurable** |                                                                  |                                                                                                                                                                                                                                                                                                        |                                                                   |
|                      | Email changed confirmation                                       | You will be notified when you have successfully updated the email connected to your Hobby team                                                                                                                                                                                                         |                                                                   |
|                      | Email changed verification                                       | You will be notified when you have updated the email connected to your Hobby team. You will need to verify this email to confirm.                                                                                                                                                                      |                                                                   |
|                      | User invited                                                     | You will be sent this when you have been invited to join a new team.                                                                                                                                                                                                                                   |                                                                   |
|                      | Invoice payment failed                                           | Users who can manage billing settings will be notified when they have an [outstanding invoice](/docs/plans/enterprise/billing#why-am-i-overdue).                                                                                                                                                       |                                                                   |
|                      | Project role changed                                             | You will be sent this when your [role](/docs/accounts/team-members-and-roles) has changed                                                                                                                                                                                                              |                                                                   |
|                      | User deleted                                                     | You will be sent this when you have chosen to delete their account. This notification is sent by email only.                                                                                                                                                                                           |                                                                   |
| **Edge Config**      | Size Limit Alerts                                                | Members will be notified when Edge Config size exceeds its limits for the current plan                                                                                                                                                                                                                 |                                                                   |
|                      | Schema Validation Errors                                         | Members will be notified (at most once per hour) if API updates are rejected by [schema protection](/docs/edge-config/edge-config-dashboard#schema-validation)                                                                                                                                         |                                                                   |


---

[View full sitemap](/docs/sitemap)
