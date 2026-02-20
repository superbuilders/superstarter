---
title: Pricing on Vercel
product: vercel
url: /docs/pricing
type: reference
prerequisites:
  []
related:
  - /docs/pricing/how-does-vercel-calculate-usage-of-resources
  - /docs/functions/configuring-functions/duration
  - /docs/functions/usage-and-pricing
  - /docs/image-optimization/limits-and-pricing
  - /docs/edge-config/edge-config-limits
summary: "Learn about Vercel's pricing model, including the resources and services that are billed, and how they are priced."
---

# Pricing on Vercel

This page provides an overview of Vercel's pricing model and outlines all billable metrics and their pricing models.

For a full breakdown of Vercel's pricing by plan, see the [pricing page](https://vercel.com/pricing/coming-soon).

To learn how resources are triggered through a real-world app scenario, see the [calculating resource usage](/docs/pricing/how-does-vercel-calculate-usage-of-resources) guide.

## Managed Infrastructure

Vercel provides [Managed Infrastructure](https://vercel.com/products/managed-infrastructure) to deploy, scale, and secure your applications.

These resources are usage based, and billed based on the amount of data transferred, the number of requests made, and the duration of compute resources used.

Each product's usage breaks down into resources, with each one billed based on the usage of a specific metric. For example, [Function Duration](/docs/functions/configuring-functions/duration) generates bills based on the total execution time of a Vercel Function.

### Managed Infrastructure billable resources

Most resources include an amount of usage your projects can use within your billing cycle. If you exceed the included amount, you are charged for the extra usage.

See the following pages for more information on the pricing of each managed infrastructure resource:

- [Vercel Functions](/docs/functions/usage-and-pricing)
- [Image Optimization](/docs/image-optimization/limits-and-pricing)
- [Edge Config](/docs/edge-config/edge-config-limits)
- [Web Analytics](/docs/analytics/limits-and-pricing)
- [Speed Insights](/docs/speed-insights/limits-and-pricing)
- [Drains](/docs/drains#usage-and-pricing)
- [Monitoring](/docs/monitoring/limits-and-pricing)
- [Observability](/docs/observability/limits-and-pricing)
- [Blob](/docs/vercel-blob/usage-and-pricing)
- [Microfrontends](/docs/microfrontends#limits-and-pricing)
- [Bulk redirects](/docs/redirects/bulk-redirects#limits-and-pricing)

For [Enterprise](/docs/plans/enterprise) pricing, contact our [sales team](/contact/sales).

#### Pro plan add-ons

To enable any of the Pro plan add-ons:

1. Visit the Vercel [dashboard](/dashboard) and select your team from the [scope selector](/docs/dashboard-features#scope-selector).
2. Select the **Settings** tab and go to Billing.
3. In the **Add-Ons** section, find the add-on you'd like to add. Switch the toggle to **Enabled** and configure the add-on as necessary.

#### Regional pricing

See the [regional pricing](/docs/pricing/regional-pricing) page for more information on Managed Infrastructure pricing in different regions.

## Developer Experience Platform

Vercel's Developer Experience Platform [(DX Platform)](https://vercel.com/products/dx-platform) offers a monthly billed suite of tools and services focused on building, deploying, and optimizing web applications.

### DX Platform billable resources

The below table lists the billable DX Platform resources for the Pro plan. These resources are not usage based, and are billed at a fixed monthly rate.

| Resource | Price | Included (Pro) |
|----------|-------|----------------|
| [Team seats](/docs/plans/pro-plan#team-seats) | $20 / month per additional paid seat | N/A |
| [Preview Deployment Suffix](/docs/deployments/generated-urls#preview-deployment-suffix) | $100 / month | N/A |
| [SAML Single Sign-On](/docs/saml) | $300 / month | N/A |
| [HIPAA BAA](/docs/security/compliance#hipaa) | $350 / month | N/A |
| [Flags Explorer](/docs/flags/flags-explorer) | $250 / month | N/A |
| [Observability Plus](/docs/observability/observability-plus) | $10 / month | N/A |
| [Web Analytics Plus](/docs/analytics/limits-and-pricing#pro-with-web-analytics-plus) | $10 / month | N/A |
| [Speed Insights](/docs/speed-insights) | $10 / month per project | N/A |


## More resources

For more information on Vercel's pricing, guidance on optimizing consumption, and invoices, see the following resources:

- [How are resources used on Vercel?](/docs/pricing/how-does-vercel-calculate-usage-of-resources)
- [Manage and optimize usage](/docs/pricing/manage-and-optimize-usage)
- [Understanding my invoice](/docs/pricing/understanding-my-invoice)
- [Improved infrastructure pricing](/blog/improved-infrastructure-pricing)
- [Regional pricing](/docs/pricing/regional-pricing)


---

[View full sitemap](/docs/sitemap)
