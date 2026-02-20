---
title: Vercel Agent Pricing
product: vercel
url: /docs/agent/pricing
type: reference
prerequisites:
  - /docs/agent
related:
  []
summary: Understand how Vercel Agent pricing works and how to manage your credits
---

# Vercel Agent Pricing

Vercel Agent uses a credit-based system and all agent features and tools will use the same credit pool.

All teams with Observability Plus have **10 investigations included in their subscription every billing cycle** at no extra cost.
Additional investigations cost both:

| Cost component | Price                | Details                                                                        |
| -------------- | -------------------- | ------------------------------------------------------------------------------ |
| Fixed cost     | $0.30 USD            | Charged for each Code Review or additional investigation                       |
| Token costs    | Pass-through pricing | Billed at the Agent's underlying AI provider's rate, with no additional markup |

**Your total cost per action is the fixed cost plus the token costs.**

The token cost varies based on the complexity and amount of data the AI needs to analyze. You can track your spending in real time in the [Agent tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fvercel-agent\&title=Open+Vercel+Agent) of your dashboard.

## Promotional credit

When you enable Agent for the first time, Pro teams can redeem a $100 USD promotional credit. This credit can be used by any Vercel Agent feature, can only be redeemed once, and is only valid for 2 weeks.

To redeem your promotional credit:

1. Go to the [Agent tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fvercel-agent\&title=Open+Vercel+Agent) in your dashboard.
2. If you haven't enabled Agent yet, you'll be prompted to **Enable with $100 free credits**.

Once your promotional credit is redeemed, you can track your remaining credits in the [Agent tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fvercel-agent\&title=Open+Vercel+Agent) of your dashboard.

## Track costs and spending

Each Code Review or additional investigation costs $0.30 USD plus token costs. You can monitor your spending in real time to manage your budget.

To view costs:

1. Go to the [Agent tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fvercel-agent\&title=Open+Vercel+Agent).
2. Check your current credit balance at the top of the page. Click the **Credits** button to view more details and add credits.
3. View the **Cost** column in the reviews table to see the cost of each individual Code Review or investigation.

The Agent tab shows you the cost of all reviews and investigations over a given period, as well as the cost of each individual action. If certain repositories or alerts consistently cost more, you can use this data to decide whether to adjust your settings.

## Adding credits

You can add credits to your account at any time through manual purchases or by enabling auto-reload to keep your balance topped up automatically.

### Manual credit purchases

To manually add credits:

1. Go to the [Agent tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fvercel-agent\&title=Open+Vercel+Agent) in your dashboard.
2. Click the **Credits** button at the top of the page.
3. In the dialog that appears, enter the amount you want to add to your balance.
4. Click **Continue to Payment** to enter your card details and complete the purchase.

Your new credit balance will be available immediately and will be used for all Agent features.

### Auto-reload

Auto-reload automatically adds credits when your balance falls below a threshold you set. This helps prevent the Vercel Agent tools from stopping due to insufficient credits.

To enable auto-reload:

1. Go to the [Agent tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fvercel-agent\&title=Open+Vercel+Agent) in your dashboard.
2. Click the **Credits** button at the top of the page and select **Enable** next to the auto-reload option.
3. On the next screen, toggle the switch to **Enabled**.
4. Then, configure your auto-reload preferences:
   - **When Balance Falls Below**: Set the threshold that triggers an automatic recharge (for example, $10 USD)
   - **Recharge To Target Balance**: Set the amount your balance will be recharged to (for example, $50 USD)
   - **Monthly Spending Limit** (optional): Set a maximum amount VercelAgent can spend per month to control costs
5. Click **Save** to enable auto-reload.

When your balance drops below the threshold, Vercel will automatically charge your payment method and add the specified amount to your credit balance. If you've set a monthly spending limit, auto-reload will stop once you reach that limit for the current month.


---

[View full sitemap](/docs/sitemap)
