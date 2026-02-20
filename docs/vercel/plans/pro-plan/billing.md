---
title: Billing FAQ for Pro Plan
product: vercel
url: /docs/plans/pro-plan/billing
type: reference
prerequisites:
  - /docs/plans/pro-plan
  - /docs/plans
related:
  - /docs/pricing
  - /docs/dashboard-features
  - /docs/accounts/team-members-and-roles/access-roles
  - /docs/security/ddos-mitigation
  - /docs/attack-challenge-mode
summary: This page covers frequently asked questions around payments, invoices, and billing on the Pro plan.
---

# Billing FAQ for Pro Plan

The Vercel Pro plan is designed for professional developers, freelancers, and businesses who need enhanced features and team collaboration. This page covers frequently asked questions around payments, invoices, and billing on the **Pro** plan.

## Payments

### What is the price of the Pro plan?

See the [pricing page](/docs/pricing).

### When are payments taken?

At the beginning of each [billing cycle](#what-is-a-billing-cycle). Each invoice charges for the upcoming billing cycle. It includes any additional usage that occurred during the previous billing cycle.

### What payment methods are available?

Credit/Debit card only. Examples of invalid payment methods are gift cards, prepaid cards, EBT cards, and some virtual cards.

### What card types can I pay with?

- American Express
- China UnionPay (CUP)
- Discover & Diners
- Japan Credit Bureau (JCB)
- Mastercard
- Visa

### What currency can I pay in?

You can pay in any currency so long as the credit card provider allows charging in USD *after* conversion.

### What happens when I cannot pay?

When an account goes overdue, some account features are restricted until you make a payment. This means:

- You can't create new Projects
- You can't add new team members
- You can't redeploy existing projects

> **⚠️ Warning:** For subscription renewals, payment must be successfully made within 14 days,
> else all deployments on your account will be paused. For new subscriptions,
> the initial payment must be successfully made within 24 hours.

You can be overdue when:

- The card attached to the team expires
- The bank declined the payment
  - Possible incorrect card details
  - The card is reported lost or stolen
- There was no card on record or a payment method was removed

To fix, you can add a new payment method to bring your account back online.

### Can I delay my payment or be given an extension?

No. Payments must be made upon invoice issuance. Delays and extensions are not available.

### Can I pay annually?

No. Only monthly payments are supported. You can pay annually if you upgrade to an [Enterprise](/pricing) plan. The Enterprise plan offers increased performance, collaboration, and security needs.

### Can I change my payment method?

Yes. You will have to add a new payment method before you can remove the old one. To do this:

1. From your dashboard, select your team in the **Scope selector**
2. Go to the **Settings** tab and select **Billing** from the left nav
3. Scroll to **Payment Method** and select the **Add new card** button

![Image](`/docs-assets/static/docs/concepts/dashboard/scope-selector-light.png`)

*Scope selector to switch between teams and accounts.*

## Invoices

### Can I pay by invoice?

Yes. If you have a card on file, Vercel will charge it automatically. A receipt is then sent to you after your credit card gets charged. To view your past invoices:

- From your [dashboard](/docs/dashboard-features), go to the Team's page from the scope selector
- Select the **Settings** tab followed by the **Invoices** link on the left

If you do not have a card on file, then you will have to add a payment method, and you will receive a receipt of payment.

### Why am I overdue?

We were unable to charge your payment method for your latest invoice. This likely means that the payment was not successfully processed with the credit card on your account profile.

Some senders deduct a payment fee for transaction costs. This could mean that the amount charged on the invoice, does not reflect the amount due. To fix this make sure you add the transaction fee to the amount you send.

See [What happens when I cannot pay](#what-happens-when-i-cannot-pay) for more information.

### Can I change an existing invoice detail?

Invoice details must be accurate before adding a credit card at the end of a trial, **or prior to the upcoming invoice being finalized**. You can update your billing details on the [Billing settings page](/account/billing).

Changes are reflected on future invoices **only**. Details on previous invoices will remain as they were issued and cannot be changed.

### Does Vercel possess and display their VAT ID on invoices?

No. Vercel is a US-based entity and does not have a VAT ID. If applicable, customers are encouraged to add their own VAT ID to their billing details for self-reporting and tax compliance reasons within their respective country.

### Can invoices be sent to my email?

Yes. By default, invoices are sent to the email address of the first [owner](/docs/accounts/team-members-and-roles/access-roles#owner-role) of the team. To set a custom destination email address for your invoices, follow these steps:

1. From your [dashboard](/dashboard), navigate to the **Settings** tab
2. Select **Billing** from the sidebar
3. Scroll down to find the editable **Invoice Email Recipient** field

If you are having trouble receiving these emails, please review the spam settings of your email workspace as these emails may be getting blocked.

### Can I repay an invoice if I've used the wrong payment method?

No. Once an invoice is paid, it cannot be recharged with a different payment method, and refunds are not provided in these cases.

## Billing

### How are add-ons billed?

Pro add-ons are billed in the subsequent billing cycle as a line item on your invoice.

### What happens if I purchase an add-on by mistake?

[Open a support ticket](/help#issues) for your request and our team will assist you.

### What do I do if I think my bill is wrong?

Please [open a support ticket](/help#issues) and provide the following information:

- Invoice ID
- The account email
- The Team name
- If your query relates to the monthly plan, or usage billing

### Do I get billed for DDoS?

[Vercel automatically mitigates against L3, L4, and L7 DDoS attacks](/docs/security/ddos-mitigation) at the platform level for all plans. Vercel does not charge customers for traffic that gets blocked by the Firewall.

Usage will be incurred for requests that are successfully served prior to us automatically mitigating the event. Usage will also be incurred for requests that are not recognized as a DDoS event, which may include bot and crawler traffic.

For an additional layer of security, we recommend that you enable [Attack Challenge Mode](/docs/attack-challenge-mode) when you are under attack, which is available for free on all plans. While some malicious traffic is automatically challenged, enabling Attack Challenge Mode will challenge all traffic, including legitimate traffic to ensure that only real users can access your site.

You can monitor usage in the [Vercel Dashboard](/dashboard) under the **Usage** tab, although you will [receive notifications](/docs/notifications#on-demand-usage-notifications) when nearing your usage limits.

### What is a billing cycle?

The billing cycle refers to the period of time between invoices. The start date depends on when you created the account, or the account's trial phase ended. You can view your current and previous billing cycles on the Usage tab of your dashboard.

The second tab indicates the range of the billing cycle. During this period, you would get billed for:

- The amount of Team seats you have, and any addons you have purchased - Billed for the next 30 days of usage
- The usage consumed during the last billing cycle - Billed for the last 30 days of additional usage

You can't change a billing cycle or the dates on which you get billed. You can view the current billing cycle by going to the **Settings** tab and selecting **Billing**.

### What if my usage goes over the included credit?

You will be charged for on-demand usage, which is billed at the end of the month.

### What's the benefit of the credit-based model?

The monthly credit gives teams flexibility to allocate usage based on their actual workload, rather than being locked into rigid usage buckets they may not fully use.

## Access

### What can the Viewer seat do?

[Viewer seats](/docs/plans/pro-plan#viewer-team-seat) can:

- View and comment on deployments
- Access analytics and project insights


---

[View full sitemap](/docs/sitemap)
