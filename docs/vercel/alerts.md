---
title: Alerts
product: vercel
url: /docs/alerts
type: reference
prerequisites:
  []
related:
  - /docs/notifications
  - /docs/webhooks
  - /docs/webhooks/webhooks-api
  - /docs/agent/investigation
summary: "Get notified when something's wrong with your Vercel projects. Set up alerts through Slack, webhooks, or email so you can fix issues quickly."
---

# Alerts

> **🔒 Permissions Required**: Alerts

Alerts let you know when something's wrong with your Vercel projects, like a spike in failed function invocations or unusual usage patterns. You can get these alerts by email, through Slack, or set up a webhook so you can jump on issues quickly.

By default, you'll be notified about:

- **Usage anomaly**: When your project's usage exceeds abnormal levels.
- **Error anomaly**: When your project's error rate of function invocations (those with a status code of 5xx) exceeds abnormal levels.

## Alert types

| Alert Type        | Triggered when                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Error Anomaly** | Fires when your 5-minute error rate (5xx) is more than 4 standard deviations above your 24-hour average and exceeds the minimum threshold. |
| **Usage Anomaly** | Fires when your 5-minute usage is more than 4 standard deviations above your 24-hour average and exceeds the minimum threshold.            |

## Configure alerts

Here's how to configure alerts for your projects:

1. First, head to your [Vercel dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability%2Falerts).
2. Go to the **Observability** tab, find the **Alerts** tab, and click **Subscribe to Alerts**.
3. Then, pick how you'd like to be notified: [Email](#vercel-notifications), [Slack](#slack-integration), or [Webhook](#webhook).

### Vercel Notifications

You can subscribe to alerts about anomalies through the standard [Vercel notifications](/docs/notifications), which will notify you through either email or the Vercel dashboard.

By default, users with team owner roles will receive notifications.

To enable notifications:

1. Go to your [Vercel dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability%2Falerts), head to **Observability**, then **Alerts**.
2. Click **Subscribe to Alerts**.
3. Click **Manage** next to **Vercel Notifications**.
4. Select which alert you'd like to receive to each of the notification channels.

You can configure **your own** notification preferences in your [Vercel dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fnotifications\&title=Manage+Notifications). You cannot configure notification preferences for other users.

### Slack integration

You'll need the correct permissions in your Slack workspace to install the Slack integration.

1. Install the Vercel [Slack integration](https://vercel.com/marketplace/slack) if you haven't already.
2. Go to the Slack channel where you want alerts and run this command for alerts about usage and error anomalies:

   ```bash
   /vercel subscribe [team/project] alerts
   ```

   The dashboard will show you the exact command for your team or project.

### Webhook

With webhooks, you can send alerts to any destination.

1. Go to your [Vercel dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability%2Falerts), head to **Observability**, then **Alerts**.
2. Click **Subscribe to Alerts**.
3. Choose **Webhook**.
4. Fill out the webhook details:
   - Choose which projects to monitor
   - Add your endpoint URL

You can also set this up through [account webhooks](/docs/webhooks#account-webhooks). Pick the events you want under **Observability Events**.

#### Webhooks payload

To learn more about the webhook payload, see the [Webhooks API Reference](/docs/webhooks/webhooks-api):

- [Alerts triggered](/docs/webhooks/webhooks-api#alerts.triggered)

## Investigate alerts with AI

When you get an error alert, [Agent Investigation](/docs/agent/investigation) can run automatically to help you debug faster. Instead of manually digging through logs and metrics, AI analyzes what's happening and displays highlights of the anomaly directly in your dashboard.

When you view an alert in the dashboard, you can click the **Enable Auto Run** button to run an investigation automatically. You'll then be brought to the Agents tab to allow you set up Investigations automatically on new alerts. In addition, you can click the **Rerun** button to run an investigation manually.

Learn more in the [Agent Investigation docs](/docs/agent/investigation).

## Error anomaly reference table

Error Anomaly detection compares current error rates against the last 24-hour baseline using statistical confidence intervals. The table below shows minimum error counts needed to trigger alerts at different traffic volumes.

| Traffic Volume                     | Avg Error Rate | Minimum Errors | Notes                                    |
| ---------------------------------- | -------------- | -------------- | ---------------------------------------- |
| Sparse (1 req/hour)                | 2%             | 51 errors      | or 5 with 2 consecutive 5-min intervals  |
| Low (10 req/min)                   | 1%             | 51 errors      | or 6 with 2 consecutive 5-min intervals  |
| Medium (100 req/min)               | 0.5%           | 51 errors      | or 18 with 2 consecutive 5-min intervals |
| High (1k req/min)                  | 0.5%           | 106 errors     |                                          |
| High (10k req/min)                 | 0.2%           | 361 errors     |                                          |
| Zero Error Baseline (1000 req/min) | 0%             | 51 errors      | or 5 with 2 consecutive 5-min intervals  |
| High Error Rate (100 req/min)      | 5%             | 106 errors     |                                          |


---

[View full sitemap](/docs/sitemap)
