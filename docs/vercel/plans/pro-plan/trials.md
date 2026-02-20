---
title: "Understanding Vercel's Pro Plan Trial"
product: vercel
url: /docs/plans/pro-plan/trials
type: reference
prerequisites:
  - /docs/plans/pro-plan
  - /docs/plans
related:
  - /docs/plans/pro-plan
  - /docs/dashboard-features
  - /docs/limits
  - /docs/functions/usage-and-pricing
  - /docs/image-optimization/limits-and-pricing
summary: "Learn all about Vercel's Pro Plan free trial, including features, usage limits, and options post-trial. Learn how to manage your team's projects with..."
---

# Understanding Vercel

Vercel offers three plan tiers: **Hobby**, **Pro**, and **Enterprise**.

The Pro trial offers an opportunity to explore [Pro features](/docs/plans/pro-plan) for free during the trial period. There are some [limitations](/docs/plans/pro-plan/trials#trial-limitations).

## Starting a trial

> **💡 Note:** There is a limit of one Pro plan trial per user account.

1. Select the [scope selector](/docs/dashboard-features#scope-selector) from the dashboard. From the bottom of the list select **Create Team**. Alternatively, click this button:
2. Name your team
3. Select the **Pro Trial** option from the dialog. If this option does not appear, it means you have already reached your limit of one trial:

![Image](https://vercel.com/docs-assets/static/docs/concepts/teams/new-team-light.png)

## Trial Limitations

The trial plan includes a $20 credit and follows the same [general limits](/docs/limits#general-limits) as a regular plan but with specified usage restrictions. See how these compare to the [non-trial usage limits](/docs/limits#included-usage):

|                                                                                            | Pro Trial Limits     |
| ------------------------------------------------------------------------------------------ | -------------------- |
| Owner Members                                                                              | 1                    |
| Team Members (total, including Owners)                                                     | 10                   |
| Projects                                                                                   | 200                  |
| [Active CPU](/docs/functions/usage-and-pricing)                                            | 8 CPU-hrs            |
| [Provisioned Memory](/docs/functions/usage-and-pricing)                                    | 720 GB-hrs           |
| [Function Invocations](/docs/functions/usage-and-pricing)                                  | 1,000,000/month      |
| Build Execution                                                                            | Max. 200 Hrs         |
| [Image transformations](/docs/image-optimization/limits-and-pricing#image-transformations) | Max. 5K/month        |
| [Image cache reads](/docs/image-optimization/limits-and-pricing#image-cache-reads)         | Max. 300K/month      |
| [Image cache writes](/docs/image-optimization/limits-and-pricing#image-cache-writes)       | Max. 100K/month      |
| [Monitoring](/docs/observability/monitoring)                                               | Max. 125,000 metrics |
| Domains per Project                                                                        | 50                   |

To monitor the current usage of your Team's projects, see the [Usage](/docs/limits/usage) guide.

The following Pro features are **not available** on the trial:

- [Log drains](/docs/log-drains)
- [Account webhooks](/docs/webhooks#account-webhooks)
- Certain models (GPT-5 and Claude) on [Vercel AI Playground](https://sdk.vercel.ai/)

Once your usage of [Active CPU](/docs/functions/usage-and-pricing), [Provisioned Memory](/docs/functions/usage-and-pricing), or [Function Invocations](/docs/functions/usage-and-pricing) exceeds or reaches 100% of the Pro trial usage, your trial will be paused.

It is not possible to change Owners during the Pro trial period. Owners can be changed once the Pro trial has upgraded to a paid Pro plan.

## Post-Trial Decision

Your trial finishes after 14 days or once your team exceeds the usage limits, whichever happens first. After which, you can opt for one of two paths:

- [Upgrade to a paid Pro plan](#upgrade-to-a-paid-pro-plan)
- [Revert to a Hobby plan](#revert-to-a-hobby-plan)

### Upgrade to a paid Pro plan

If you wish to continue on the Pro plan, you must add a payment method to ensure a seamless transition from the trial to the paid plan when your trial ends.

To add a payment method, navigate to the Billings page through **Settings > Billing**. From this point, you will get billed according to the [number of users in your team](/docs/plans/pro-plan/billing#what-is-a-billing-cycle).

#### When will I get billed?

Billing begins immediately after your trial ends if you have added a payment method.

### Revert to a Hobby plan

Without a payment method, your account reverts to a Hobby plan when the trial ends. Alternatively, you can use the **Downgrade** button located in the **Pro Plan** section of your [team's Billing page](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fbilling\&title=Go+to+Billing) to immediately end your trial and return to a Hobby plan. All team members will be removed from your team, and all Hobby limits will apply to your team.

> **💡 Note:** Charges apply only if you have a payment method. If a trial finishes and you
> haven't set payment method, you will  get charged.

You can upgrade to a Pro plan anytime later by visiting **Settings > Billing** and adding a payment method.

### Downgraded to Hobby

If your Pro trial account gets downgraded to a Hobby team, you can revert this by **upgrading to Pro**. If you've transferred out the projects that were exceeding the included Hobby usage and want to unpause your Hobby team, [contact support](/help).

When you upgrade to Pro, the pause status on your account will get lifted. This reinstates:

- **Full access** to all previous projects and deployments
- Access to the increased limits and features of a Pro account

#### What if I resume using Vercel months after my trial ends?

No charges apply for the months of inactivity. Billing will only cover the current billing cycle.


---

[View full sitemap](/docs/sitemap)
