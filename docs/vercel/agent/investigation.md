---
title: Investigation
product: vercel
url: /docs/agent/investigation
type: integration
prerequisites:
  - /docs/agent
related:
  - /docs/observability/observability-plus
  - /docs/agent/pricing
summary: Let AI investigate your error alerts to help you debug faster
---

# Investigation

> **🔒 Permissions Required**: Agent Investigation

When you get an error alert, Vercel Agent can investigate what's happening in your logs and metrics to help you figure out the root cause. Instead of manually digging through data, AI will do the detective work and display highlights of the anomaly in the Vercel dashboard.

Investigations happen automatically when an error alert fires. The AI digs into patterns in your data, checks what changed, and gives you insights about what might be causing the issue.

## Getting started with Agent Investigation

You'll need two things before you can use Agent Investigation:

1. An [Observability Plus](/docs/observability/observability-plus) subscription, which includes **10 investigations per billing cycle**
2. [Sufficient credits](/docs/agent/pricing) to cover the cost of additional investigations

To allow investigations to run **automatically for every error alert**, you should [enable Vercel Agent Investigations](#enable-agent-investigations) for your team.

You can [run an investigation manually](#run-an-investigation-manually) if you want to investigate an alert that has already fired.

> **💡 Note:** Agent Investigation will not automatically start running if you had previously only enabled Vercel Agent for code review. You will need to [enable Agent Investigations](#enable-agent-investigations) separately.

### Enable Agent Investigations

To run investigations automatically for every error alert, enable Vercel Agent Investigations in your team's settings:

1. Go to your team's [Settings](https://vercel.com/d?to=%2Fteams%2F%5Bteam%5D%2Fsettings\&title=Go+to+Settings\&personalTo=%2Faccount) page.
2. In the **General** section, find **Vercel Agent** and under **Investigations**, switch the toggle to **Enabled**.
3. Select **Save** to confirm your changes.

Once enabled, investigations will run automatically when an error alert fires. You'll need to make sure your team has [enough credits](/docs/agent/pricing#adding-credits) to cover the cost of investigations beyond the 10 included in your subscription.

## How to use Agent Investigation

When [Agent Investigations are enabled](#enable-agent-investigations), they run automatically when an error alert fires. The AI queries your logs and metrics around the time of the alert, looks for patterns that might explain the issue, checks for related errors or anomalies, and provides insights about what it found.

To view an investigation:

1. Go to your [Vercel dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability%2Falerts\&title=Open+Alerts) and navigate to **Observability**, then **Alerts**.
2. Find the alert you want to review and click on it.
3. The investigation results will appear alongside your alert details. You'll see the analysis stream in real time if the investigation is still running.

If you want to run the investigation again with fresh data, click the **Rerun** button.

### Run an investigation manually

If you do not have Agent Investigations enabled and running automatically, you can run an investigation manually from the alert details page.

1. Go to your [Vercel dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fobservability%2Falerts\&title=Open+Alerts) and navigate to **Observability**, then **Alerts**.
2. Find the alert you want to review and click on it.
3. Click the **Investigate** (or **Rerun**) button to run an investigation manually.

## Pricing

Agent Investigation uses a credit-based system. All teams with Observability Plus have **10 investigations included in their subscription every billing cycle** at no extra cost.

Additional investigations cost a fixed $0.30 USD plus token costs billed at the Agent's underlying AI provider's rate, with no additional markup. The token cost varies based on how much data the AI needs to analyze from your logs and metrics.

Pro teams can redeem a $100 USD promotional credit when enabling Agent. You can [purchase credits and enable auto-reload](/docs/agent/pricing#adding-credits) in the Agent tab of your dashboard. For complete pricing details, credit management, and cost tracking information, see [Vercel Agent Pricing](/docs/agent/pricing).

## Disable Agent Investigation

To disable Agent Investigation:

1. Go to the your team's [Settings](https://vercel.com/d?to=%2Fteams%2F%5Bteam%5D%2Fsettings\&title=Go+to+Settings\&personalTo=%2Faccount) page.
2. In the **General** section, find **Vercel Agent** and under **Investigations**, switch the toggle to **Disabled**.
3. Select **Save** to confirm your changes.

Once disabled, Agent Investigation won't run automatically on any new alerts. You can re-enable Agent Investigation at any time from the same menu or [run an investigation manually](#run-an-investigation-manually) from the alert details page.


---

[View full sitemap](/docs/sitemap)
