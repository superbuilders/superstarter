---
title: Observability Plus
product: vercel
url: /docs/observability/observability-plus
type: reference
prerequisites:
  - /docs/observability
related:
  - /docs/observability
summary: Learn about using Observability Plus and its limits.
---

# Observability Plus

> **🔒 Permissions Required**: Observability Plus

**Observability Plus** is an optional upgrade that enables Pro and Enterprise teams to explore data at a more granular level, helping you to pinpoint exactly when and why issues occurred.

To learn more about Observability Plus, see [Limitations](#limitations) or [pricing](#pricing).

## Using Observability Plus

### Enabling Observability Plus

By default, all users on all plans have access to Observability at both a team and project level.

To upgrade to Observability Plus:

1. From your [dashboard](/dashboard), navigate to [the **Observability** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability\&title=Try+Observability).
2. Next to the time range selector, click the  button and select **Upgrade to Observability Plus**.
3. A modal displays the included features and your estimated monthly cost.
   - If you're an existing Monitoring user, the modal will be **Migrate from Monitoring to Observability Plus** and will display the reduced pricing.
4. Complete the upgrade based on your plan:
   - **Hobby**: Click **Continue**, then complete the upgrade to Pro in the drawer that appears.
   - **Pro**: Click **Continue**, review charges, then click **Confirm and Pay**.
   - **Enterprise**: Click **Confirm** to enable.

You'll be charged and upgraded immediately. You will immediately have access to the Observability Plus features and can view [events](/docs/observability#tracked-events) based on data that was collected before you enabled it.

> **💡 Note:** If you don't see the option to upgrade, contact your Account Executive or [Customer Success](/help) for assistance.

### Disabling Observability Plus

1. From your [dashboard](/dashboard), navigate to [the **Observability** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability).
2. Next to the time range selector, click the  button and select **Observability Settings**.
3. This takes you to the [**Observability Plus** section of your project's **Billing** settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings/billing#observability)
   - Click the toggle button to disable it
   - Click the **Confirm** button in the **Turn off Observability Plus** dialog

## Pricing

Users on all plans can use Observability at no additional cost, with some [limitations](#limitations). Observability is available for all projects in the team.

Owners on Pro and Enterprise teams can upgrade to **Observability Plus** to get access to additional features, higher limits, and increased retention. See the table below for more details on pricing:

| Resource                                                                      | Base Fee                              | Usage-based pricing                                              |
| ----------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Observability Plus  | Pro: $10/month  Enterprise: none | $1.20 per 1 million [events](/docs/observability#tracked-events) |

## Limitations

| Feature                               | Observability                                                                            | Observability Plus                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data Retention                        | Hobby: 12 hours  Pro: 1 day  Enterprise: 3 days                                | 30 days                                                                                                                                          |
| Monitoring access                     | Not Included                                                                             | Included for existing Monitoring users. See [Existing monitoring users](/docs/observability#existing-monitoring-users) for more information |
| Vercel Functions                      | No Latency (p75) data, no breakdown by path                                              | Latency data, sort by p75, breakdown by path and routes                                                                                          |
| External APIs                         | No ability to sort by error rate or p75 duration, only request totals for each hostname  | Sorting and filtering by requests, p75 duration, and duration. Latency, Requests, API Endpoint and function calls for each hostname              |
| Edge Requests                         | No breakdown by path                                                                     | Full request data                                                                                                                                |
| Fast Data Transfer                    | No breakdown by path                                                                     | Full request data                                                                                                                                |
| ISR (Incremental Static Regeneration) | No access to average duration or revalidation data. Limited function data for each route | Access to sorting and filtering by duration and revalidation. Full function data for each route                                                  |
| Build Diagnostics                     | Full access                                                                              | Full access                                                                                                                                      |
| In-function Concurrency               | Full access when enabled                                                                 | Full access when enabled                                                                                                                         |
| Runtime logs                          | Hobby: 1 hour  Pro: 1 day  Enterprise: 3 days                                  | 30 days, max selection window of 14 consecutive days                                                                                             |

## Prorating

Pro teams are charged a base fee when enabling Observability Plus. However, you will only be charged for the remaining time in your billing cycle. For example,

- If ten days remain in your current billing cycle, you will only pay around $3. For every new billing cycle after that, you'll be charged a total of $10 at the beginning of the cycle.
- Events are prorated. This means that if your team incurs 100K events over the included allotment, you would only pay $0.12 over the base fee. Not $1.20 and the base fee.
- Suppose you disable Observability Plus before the billing cycle ends. In that case, Observability Plus will automatically turn off, we will stop collecting events, and you will lose access to existing data.
- Once the billing cycle is over, you will be charged for the events collected prior to disabling. You won't be refunded any amounts already paid.
- Re-enabling Observability Plus before the end of the billing cycle won't cost you another base fee. Instead, the usual base fee of $10 will apply at the beginning of every upcoming billing cycle.


---

[View full sitemap](/docs/sitemap)
