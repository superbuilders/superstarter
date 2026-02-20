---
title: Managing Domain Renewals and Redemptions
product: vercel
url: /docs/domains/working-with-domains/renew-a-domain
type: how-to
prerequisites:
  - /docs/domains/working-with-domains
  - /docs/domains
related:
  []
summary: Learn how to manage automatic and manual renewals for custom domains purchased through or registered with Vercel, and how to redeem expired domains...
---

# Managing Domain Renewals and Redemptions

Custom domains purchased through or registered with Vercel are [automatically renewed](#auto-renewal) by default with the option to [manually renew](#manual-renewal) them.

You can see the expiration or [renewal date](#filter-on-renewal-status) of your Vercel-managed domains in the list of domains on the [**Domains** tab of your team's dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page).

## Auto renewal

To enable automatic renewal, follow these steps:

- ### Select the Domains tab
  You can choose to prevent the automatic renewal of a Domain from the [**Domains** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+Domains) on the **Vercel Dashboard**.

- ### View the auto renewal status
  From the list of domains, find the domain you want to enable automatic renewal for. You can use the search bar or filter button to find it if you have many domains.
  You'll see the auto-renewal or expiry status of the domain in the domain's row.

  ![Image](`/docs-assets/static/docs/domains/domains-list-item-light.png`)

- ### Toggle the auto renewal status
  Click on the hamburger menu icon  to the right of the domain and toggle the Auto Renewal to on or off.

### Auto renewal off

If auto renewal is off, Vercel will not try to re-register the Domain when it expires at the end of the registration period. You will not be charged for the Domain any longer, but **you will lose access to the Domain** when it expires. Recovering the Domain, if even possible, may be subject to a **redemption fee**.

If the Domain enters the redemption period, you can attempt to manually recover it by selecting **Renew** in the [Domains tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+Domains). The option will appear if recovery is still possible.

Vercel will send you three emails regarding the Domain before this happens. 24 and 14 days before the Domain is set to expire, you will be notified that auto renewal is off and the Domain will expire soon. A final email will notify you when the Domain expires.

### Auto renewal on

> **💡 Note:** Vercel can only renew your domain if your payment method is valid at the time of renewal. If your card fails, the domain may expire. Vercel will retry the payment and notify you of any issues via email. You can confirm renewal status or retry manually in the [**Domains** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+Domains).

If auto renewal is on, Vercel will use the following process to renew the domain:

1. 60 days before expiration, Vercel will send you a warning email that the domain will expire and that we will try to renew it
2. 30 days before expiration, Vercel will try to renew the domain
3. Starting at 29 days before expiration, Vercel will check for any failed renewals and try to renew them again

## Manual renewal

- ### Select the Domains Tab
  Navigate to the [**Domains** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+Domains) on the **Vercel Dashboard**.

- ### Find your domain from the list
  From the list of domains, find the domain you want to renew. You can use the search bar or filter button to find it if you have many domains.
  You'll see the auto renewal or expiry status of the domain in the domain's row.

- ### Click the Renew button
  Click on the hamburger menu icon to the right of the domain and click the **Renew** button.
  > **💡 Note:** Your domain must be within 1 year of expiration to be eligible for renewal.

- ### Confirm your renewal
  ![Image](`/docs-assets/static/docs/domains/renew-domain-modal-light.png`)

## Domain redemptions

For expired domains with a redemption period (typically 30 days), you can now recover them directly in the dashboard:

![Image](`/docs-assets/static/docs/domains/redeem-domain-modal-light.png`)

A redemption fee will be applied, depending on the domain registry.

> **💡 Note:** Not all top-level domains (TLDs) support redemptions.

## Filter on renewal status

You can filter your Vercel owned domains by their renewal status by clicking the filter icon in the top right of the Domains table:

![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/renew-domain-light.png`)

## Renewing third-party domains

Third-Party Domains (ones not purchased with or transferred into Vercel) are not subject to auto-renewal. Please refer to your Domain name registrar's policy regarding renewals.


---

[View full sitemap](/docs/sitemap)
