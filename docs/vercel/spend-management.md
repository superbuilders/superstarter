---
title: Spend Management
product: vercel
url: /docs/spend-management
type: how-to
prerequisites:
  []
related:
  - /docs/limits
  - /docs/plans/pro-plan
  - /docs/pricing
  - /docs/rbac/access-roles
  - /docs/notifications
summary: Learn how to get notified about your account spend and configure a webhook.
---

# Spend Management

> **🔒 Permissions Required**: Spend Management

Spend management is a way for you to notify or to automatically take action on your account when your team hits a [set spend amount](#what-does-spend-management-include). The actions you can take are:

- [Receive a notification](/docs/spend-management#managing-alert-threshold-notifications)
- [Trigger a webhook](/docs/spend-management#configuring-a-webhook)
- [Pause the production deployment of all your projects](/docs/spend-management#pausing-projects)

> **⚠️ Warning:** Setting a spend amount does not automatically stop usage. If you want to pause
> all your projects at a certain amount, you must [enable the
> option](#pausing-projects).

The spend amount is set per billing cycle.

Setting the amount halfway through a billing cycle considers your current spend. You can increase or decrease your spend amount as needed. If you configure it below the current monthly spend, Spend Management will trigger any configured actions (including pausing all projects).

## What does Spend Management include?

The spend amount that you set covers [metered resources](/docs/limits#additional-resources) that go beyond your Pro plan [credits and usage allocation](/docs/plans/pro-plan#credit-and-usage-allocation) for all projects on your team.

It **does not** include seats, integrations (such as Marketplace), or separate [add-ons](/docs/pricing#pro-plan-add-ons), which Vercel charges on a monthly basis.

### How Vercel checks your spend amount

Vercel checks your metered resource usage often to determine if you are approaching or have exceeded your spend amount. This check happens every few minutes.

## Managing your spend amount

1. To enable spend management, you must have an [Owner](/docs/rbac/access-roles#owner-role) or [Billing](/docs/rbac/access-roles#billing-role) role on your [Pro](/docs/plans/pro-plan) team
2. From your team's [dashboard](/dashboard), select the **Settings** tab
3. Select **Billing** from the list
4. Under **Spend Management**, toggle the switch to enabled:

   ![Image](https://vercel.com/docs-assets/static/docs/concepts/teams/spend-manage-light.png)
5. Set the amount in USD at which you would like to receive a notification or trigger an action
6. Select the action(s) to happen when your spend amount is reached: [pause all your projects](#pausing-projects), [send notifications](#managing-alert-threshold-notifications), or [trigger a webhook URL](#configuring-a-webhook)

## Managing alert threshold notifications

When you set a spend amount, Vercel automatically enables web and email notifications for your team. These get triggered when spending on your team reaches **50%, 75%, and 100%** of the spend amount. You can also receive [SMS notifications](/docs/spend-management#sms-notifications) when your team reaches **100%** of the spend amount. To manage your notifications:

1. You must have an [Owner](/docs/rbac/access-roles#owner-role) or [Billing](/docs/rbac/access-roles#billing-role) role on your [Pro](/docs/plans/pro-plan) team
2. From your team's [dashboard](/dashboard), select the **Settings** tab
3. Select **My Notifications** from the list
4. Under **Team**, ensure that **Spend Management** is selected
5. Select the  icon and select the thresholds for which you would like to receive web and email notification, as described in [Notifications](/docs/notifications)
6. Repeat the previous step for the Web, Email, and SMS notification sections

> **💡 Note:** Following these steps only configures  notifications. Team members
> with the Owner or Billing role can configure their own preferences

### SMS notifications

In addition to web and email notifications, you can enable SMS notifications for Spend Management. They are only triggered when you reach 100% of your spend amount.

To enable SMS notifications:

1. You must have an [Owner](/docs/rbac/access-roles#owner-role) or [Billing](/docs/rbac/access-roles#billing-role) role on your [Pro](/docs/plans/pro-plan) team. Note that following these steps only configures **your** SMS notifications. Each member with an Owner or Billing role can configure their own SMS notifications for Spend Management
2. Set your [spend amount](#managing-your-spend-amount)
3. From your team's [dashboard](/dashboard), select the **Settings** tab
4. Select **My Notifications** from the list, scroll to **SMS** at the bottom of the page and toggle the switch to Enabled. If your personal profile has a phone number associated with it, SMS notifications will be enabled by default
5. Under **Team**, ensure that **Spend Management** is selected
6. Enter your phone number and follow the steps to verify it

## Pausing projects

Vercel provides an option to automatically pause the production deployment for all of your projects when your spend amount is reached.

1. In the **Spend Management** section of your team's settings, enable and set your [spend amount](#managing-your-spend-amount)
2. Ensure the **Pause production deployment** switch is **Enabled**
3. Confirm the action by entering the team name and select **Continue**. Your changes save automatically
4. When your team reaches the spend amount, Vercel automatically pauses the production deployment for **all projects** on your team

When visitors access your production deployment while it is paused, they will see a [503 DEPLOYMENT\_PAUSED error](/docs/errors/DEPLOYMENT_PAUSED).

### Unpausing projects

Projects need to be resumed on an individual basis, either [through the dashboard](/docs/projects/overview#resuming-a-project) or the [Vercel REST API](/docs/rest-api/reference/endpoints/projects/unpause-a-project).

Projects won't automatically unpause if you increase the spend amount, you must resume each project manually.

## Configuring a webhook

You can configure a webhook URL to trigger events such as serving a static version of your site, [pausing a project](/docs/projects/overview#pausing-a-project), or sending a Slack notification.

Vercel will send a [HTTPS POST request](#webhook-payload) to the URL that you provide when the following events happen:

- [When a spend amount reaches 100%](#spend-amount)
- [At the end of your billing cycle](#end-of-billing-cycle)

To configure a webhook for spend management:

1. In the **Spend Management** section of your team's settings, set your [spend amount](#managing-your-spend-amount)
2. Enter the webhook URL for the endpoint that will receive a POST request. In order to be accessible, make sure your endpoints are public
3. Secure your webhooks by comparing the [`x-vercel-signature`](/docs/headers/request-headers#x-vercel-signature) request header to the SHA that is generated when you save your webhook. To learn more, see the [securing webhooks](/docs/webhooks/webhooks-api#securing-webhooks) documentation

### Webhook payload

The webhook URL receives an HTTP POST request with the following JSON payload for each event:

#### Spend amount

Sent when the team hits 50%, 75%, and 100% of their spend amount. For budgets created before September 2025, this is only sent at 100%.

| Parameters         | Type                              | Description                                                                                                                                                                                   |
| ------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `budgetAmount`     |     | The [spend amount](/docs/spend-management#managing-your-spend-amount) that you have set                                                                                                       |
| `currentSpend`     |     | The [total cost](/docs/spend-management#managing-your-spend-amount) that your team [has accrued](/docs/spend-management#what-does-spend-management-include) during the current billing cycle. |
| `teamId`           |  | Your Vercel Team ID                                                                                                                                                                           |
| `thresholdPercent` |     | The percentage of the total budget amount for the threshold that triggered this alert                                                                                                         |

```json filename="webhook-payload.json"
{
  "budgetAmount": 500,
  "currentSpend": 500,
  "teamId": "team_jkT8yZ3oE1u6xLo8h6dxfNc3",
  "thresholdPercent": 100
}
```

### End of billing cycle

Sent when the billing cycle ends. You can use this event to resume paused projects.

| Parameters | Type                              | Description         |
| ---------- | --------------------------------- | ------------------- |
| `teamId`   |  | Your Vercel Team ID |
| `type`     |  | The type of event   |

```json filename="webhook-payload.json"
{
  "teamId": "team_jkT8yZ3oE1u6xLo8h6dxfNc3",
  "type": "endOfBillingCycle"
}
```

## Spend Management activity

Vercel displays all spend management activity in the **Activity** tab of your [team's dashboard](/docs/observability/activity-log). This includes spend amount creation and updates, and project pausing and unpausing.

## More resources

For more information on Vercel's pricing, guidance on optimizing consumption, and invoices, see the following resources:

- [How are resources used on Vercel?](/docs/pricing/how-does-vercel-calculate-usage-of-resources)
- [Manage and optimize usage](/docs/pricing/manage-and-optimize-usage)
- [Understanding my invoice](/docs/pricing/understanding-my-invoice)
- [Spend limits for Vercel](https://youtu.be/-_vpoayWTps?si=Jv6b8szx68lVHGYz)


---

[View full sitemap](/docs/sitemap)
