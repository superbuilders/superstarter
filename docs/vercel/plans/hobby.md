---
title: Vercel Hobby Plan
product: vercel
url: /docs/plans/hobby
type: reference
prerequisites:
  - /docs/plans
related:
  - /docs/edge-config/using-edge-config
  - /docs/functions/usage-and-pricing
  - /docs/functions/configuring-functions/duration
  - /docs/image-optimization/legacy-pricing
  - /docs/speed-insights/metrics
summary: Learn about the Hobby plan and how it compares to the Pro plan.
---

# Vercel Hobby Plan

The Hobby plan is **free** and aimed at developers with personal projects, and small-scale applications. It offers a generous set of features for individual users on a **per month** basis:

| Resource                                                                                            | Hobby Included Usage |
| --------------------------------------------------------------------------------------------------- | -------------------- |
| [Edge Config Reads](/docs/edge-config/using-edge-config#reading-data-from-edge-configs)             | First 100,000        |
| [Edge Config Writes](/docs/edge-config/using-edge-config#writing-data-to-edge-configs)              | First 100            |
| [Active CPU](/docs/functions/usage-and-pricing)                                                     | 4 CPU-hrs            |
| [Provisioned Memory](/docs/functions/usage-and-pricing)                                             | 360 GB-hrs           |
| [Function Invocations](/docs/functions/usage-and-pricing)                                           | First 1,000,000      |
| [Function Duration](/docs/functions/configuring-functions/duration)                                 | First 100 GB-Hours   |
| [Image Optimization Source Images](/docs/image-optimization/legacy-pricing#source-images)           | First 1,000          |
| [Speed Insights Data Points](/docs/speed-insights/metrics#understanding-data-points)                | First 10,000         |
| [Speed Insights Projects](/docs/speed-insights)                                                     | 1 Project            |
| [Web Analytics Events](/docs/analytics/limits-and-pricing#what-is-an-event-in-vercel-web-analytics) | First 50,000 Events  |

## Hobby billing cycle

As the Hobby plan is a free tier there are no billing cycles. In most cases, if you exceed your usage limits on the Hobby plan, you will have to wait until 30 days have passed before you can use the feature again.

Some features have shorter or longer time periods:

- [Web Analytics](/docs/analytics/limits-and-pricing#hobby)

As stated in the [fair use guidelines](/docs/limits/fair-use-guidelines#commercial-usage), the Hobby plan restricts users to non-commercial, personal use only.

When your personal account gets converted to a Hobby team, your usage and activity log will be reset. To learn more about this change, read the [changelog](/changelog/2024-01-account-changes).

## Comparing Hobby and Pro plans

The Pro plan offers more resources and advanced features compared to the Hobby plan. The following table provides a side-by-side comparison of the two plans:

| Feature | Hobby | Pro |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| Active CPU | 4 CPU-hrs | 16 CPU-hrs |
| Provisioned Memory | 360 GB-hrs | 1440 GB-hrs |
| ISR Reads | Up to 1,000,000 Reads | 10,000,000 included |
| ISR Writes | Up to 200,000 | 2,000,000 included |
| Edge Requests | Up to 1,000,000 requests | 10,000,000 requests included |
| Projects | 200 | Unlimited |
| Vercel Function maximum duration | 10s (default) - [configurable up to 60s (1 minute)](/docs/functions/limitations#max-duration) | 15s (default) - [configurable up to 300s (5 minutes)](/docs/functions/configuring-functions/duration) |
| Build execution minutes | 6,000 | 24,000 |
| Build vCPUs | 4 | 30 |
| Build memory (GB) | 8 | 60 |
| Build disk size | 23 | 64 |
| Team collaboration features | - | Yes |
| Domains per project | 50 | Unlimited |
| Deployments per day | 100 | 6,000 |
| Analytics | 50,000 included Events 1 month of data | 100,000 included Events 12 months of data Custom events |
| Email support | - | Yes |
| [Vercel AI Playground models](https://sdk.vercel.ai/) | Llama, GPT 3.5, Mixtral | GPT-4, Claude, Mistral Large, Code Llama |
| [RBAC](/docs/rbac/access-roles) available | N/A | [Owner](/docs/rbac/access-roles#owner-role), [Member](/docs/rbac/access-roles#member-role), [Billing](/docs/rbac/access-roles#billing-role), [Viewer Pro](/docs/rbac/access-roles#viewer-pro-role) |
| [Comments](/docs/comments) | Available | Available for team collaboration |
| Log Drains | - | [Configurable](/docs/drains/using-drains) (not on a trial) |
| Spend Management | N/A | [Configurable](/docs/spend-management) |
| [Vercel Toolbar](/docs/vercel-toolbar) | Available for certain features | Available |
| [Storage](/docs/storage) | Blob (Beta) | Blob (Beta) |
| [Activity Logs](/docs/observability/activity-log) | Available | Available |
| [Runtime Logs](/docs/runtime-logs) | 1 hour of logs and up to 4000 rows of log data | 1 day of logs and up to 100,000 rows of log data |
| [DDoS Mitigation](/docs/security/ddos-mitigation) | On by default. Optional [Attack Challenge Mode](/docs/attack-challenge-mode). | On by default. Optional [Attack Challenge Mode](/docs/attack-challenge-mode). |
| [Vercel WAF IP Blocking](/docs/security/vercel-waf/ip-blocking) | Up to 10 | Up to 100 |
| [Vercel WAF Custom Rules](/docs/security/vercel-waf/custom-rules) | Up to 3 | Up to 40 |
| Deployment Protection | [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) | [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication), [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) (Add-on), [Sharable Links](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) |
| [Deployment Retention](/docs/security/deployment-retention) | Unlimited by default. | Unlimited by default. |

## Upgrading to Pro

You can take advantage of Vercel's Pro trial to explore [Pro features](/docs/plans/pro-plan) for free during the trial period, with some [limitations](/docs/plans/pro-plan/trials#trial-limitations).

To upgrade from a Hobby plan:

1. Go to your [dashboard](/dashboard). If you're upgrading a team, make sure to select the team you want to upgrade
2. Go to the **Settings** tab and select **Billing**
3. Under **Plan**, if your team is eligible for an upgrade, you can click the **Upgrade** button. Or, you may need to create or select a team to upgrade. In that case, you can click **Create a Team** or **Upgrade a Team**
4. Optionally, add team members. Each member incurs a **$20 per user / month charge**
5. Enter your card details
6. Click **Confirm and Upgrade**

If you would like to end your paid plan, you can [downgrade to Hobby](/docs/plans/pro-plan#downgrading-to-hobby).


---

[View full sitemap](/docs/sitemap)
