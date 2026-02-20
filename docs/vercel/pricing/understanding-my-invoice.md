---
title: Billing & Invoices
product: vercel
url: /docs/pricing/understanding-my-invoice
type: reference
prerequisites:
  - /docs/pricing
related:
  - /docs/pricing
  - /docs/pricing/manage-and-optimize-usage
summary: Learn how Vercel invoices get structured for Pro and Enterprise plans. Learn how usage allotments and on-demand charges get included.
---

# Billing & Invoices

You can view your current invoice from the **Settings** tab of your [dashboard](/dashboard) in two ways:

- By navigating to the **Billing** tab of the dashboard
- Or selecting the latest entry in the list of invoices on the **Invoices** tab.

## Understanding your invoice

Your invoice is a breakdown of the charges you have incurred for the current billing cycle. It includes the total amount due, the billing period, and a detailed breakdown of both [metered](# "What is metered?") and on-demand charges depending on your plan.

![Image](https://vercel.com/front/docs/pricing/full-invoice-light.png)

When you access your invoice through the **Invoice** tab:

- You can choose to download the invoice as a PDF through selecting the  icon on the invoice row
- You can select an invoice to view the detailed breakdown of the charges. Each invoice includes an invoice number, the date issued, and the due date

### Pro plan invoices

Pro plan users receive invoices based on on-demand usage. Each feature under [Managed Infrastructure](/docs/pricing#managed-infrastructure-billable-resources) includes:

- A specific usage allotment. Charges incur on-demand when you exceed the usage allotment
- [Managed Infrastructure](/docs/pricing#managed-infrastructure-billable-resources) charges get metered and billed on a monthly basis
- [Developer Experience Platform](/docs/pricing#dx-platform-billable-resources) features get billed at fixed prices when purchased, and can include monthly or one-time charges

When viewing an invoice, Pro plan users will see a section called **[On-demand Charges](#pro-plan-on-demand-charges)**. This section has two categories: [Managed Infrastructure](/docs/pricing#managed-infrastructure) and [Developer Experience Platform](/docs/pricing#developer-experience-platform).

#### Pro plan on-demand charges

For Pro plan users, on-demand charges incur in two ways. Either when you exceed the usage allotment for a specific feature under [Managed Infrastructure](/docs/pricing#managed-infrastructure-billable-resources). Or when you purchase a product from [Developer Experience Platform](/docs/pricing#dx-platform-billable-resources) during the period of the invoice.

![Image](https://vercel.com/front/docs/pricing/pro-plan-invoice-light.jpg)

### Enterprise plan invoices

Enterprise customers' invoicing gets tailored around a flexible usage model. It's based on a periodic commitment to [Managed Infrastructure Units (MIU)](#managed-infrastructure-units-miu).

The top of the invoice shows a summary of the commitment period, the total MIUs committed, and the current usage towards that commitment. If the commitment has been exceeded, the on-demand charges will be listed under the [**On-demand Charges**](#enterprise-on-demand-charges) section.

#### Managed Infrastructure Units (MIU)

MIUs are a measure of the infrastructure consumption of an Enterprise project. These consist of a variety of resources like [Fast Data Transfer, Edge Requests, and more](/docs/pricing#managed-infrastructure-billable-resources).

#### Enterprise on-demand charges

When Enterprise customers exceed their commitment for a period, they will see individual line items for the on-demand amount under the **On-demand Charges** section. This is the same as for Pro plan users.

![Image](https://vercel.com/front/docs/pricing/ent-on-demand-light.jpg)

## More resources

For more information on Vercel's pricing, and guidance on optimizing consumption, see the following resources:

- [Vercel Pricing](/docs/pricing)
- [Manage and optimize usage](/docs/pricing/manage-and-optimize-usage)


---

[View full sitemap](/docs/sitemap)
