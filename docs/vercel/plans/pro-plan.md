---
title: Vercel Pro Plan
product: vercel
url: /docs/plans/pro-plan
type: reference
prerequisites:
  - /docs/plans
related:
  - /docs/pricing
  - /docs/builds/managing-builds
  - /docs/manage-cdn-usage
  - /docs/spend-management
  - /docs/rbac/managing-team-members
summary: Learn about the Vercel Pro plan with credit-based billing, free viewer seats, and self-serve enterprise features for professional teams.
---

# Vercel Pro Plan

The Vercel Pro plan is designed for professional developers, freelancers, and businesses who need enhanced features and team collaboration.

## Pro plan features

- **[Credit-based billing](#monthly-credit)**: Pro includes monthly credit that can be used flexibly across [usage dimensions](/docs/pricing#managed-infrastructure-billable-resources)
- **[Free viewer seats](#viewer-team-seat)**: Unlimited read-only access to the Vercel dashboard so that project collaborators can view deployments, check analytics, and comment on previews
- **[Turbo build machines](/docs/builds/managing-builds#larger-build-machines)**: New projects use Turbo build machines (30 vCPUs, 60 GB memory) by default
- **[Paid add-ons](#paid-add-ons)**: Additional enterprise-grade features are available as add-ons

For a full breakdown of the features included in the Pro plan, see the [pricing page](https://vercel.com/pricing).

## Monthly credit

You can use your monthly credit across all infrastructure resources. Once you have used your monthly credit, Vercel bills additional usage on-demand.

The monthly credit applies to all [managed infrastructure billable resources](/docs/pricing#managed-infrastructure-billable-resources) after their respective included allocations are exceeded.

### Credit and usage allocation

- **Monthly credit**: Every Pro plan has $20 in monthly credit.
- **Included infrastructure usage**: Each month, you have 1 TB [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) and 10,000,000 [Edge Requests](/docs/manage-cdn-usage#edge-requests) included. Once you exceed these included allocations, Vercel will charge usage against your monthly credit before switching to on-demand billing.

### Credit expiration

The credit and allocations expire at the end of the month if they are not used, and are reset at the beginning of the following month.

### Managing your spend amount

You will receive automatic notifications when your usage has reached 75% of your monthly credit. Once you exceed the monthly credit, Vercel switches your team to on-demand usage and you will receive daily and weekly summary emails of your usage.

You can also set up alerts and automatic actions when your account hits a certain spend threshold as described in the [spend management documentation](/docs/spend-management). This can be useful to manage your spend amount once you have used your included credit.

> **💡 Note:** By default, Vercel enables spend management notifications for new customers at
> a spend amount of $200 per billing cycle.

## Pro plan pricing

The Pro plan is billed monthly based on the number of deploying team seats, paid add-ons, and any on-demand usage during the billing period. Each product has its own pricing structure, and includes both included resources and extra usage charges. The [platform fee](#platform-fee) is a fixed monthly fee that includes $20 in usage credit.

### Platform fee

- $20/month Pro platform fee
  - 1 deploying team seat included
  - $20/month in usage credit

See the [pricing](/docs/pricing) page for more information about the pricing for resource usage.

## Team seats

On the Pro plan, your team starts with 1 included paid seat that can deploy projects, manage the team, and access all member-level permissions.

You can add (See the [Managing Team Members documentation](/docs/rbac/managing-team-members#adding-team-members-and-assigning-roles) for more information):

- Additional paid seats ([Owner](/docs/rbac/access-roles#owner-role) or [Member](/docs/rbac/access-roles#member-role) roles) for $20/month each
- Unlimited free [Viewer seats](#viewer-team-seat) with read-only access

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Viewer team seat

Each viewer team seat has the [Viewer Pro](/docs/rbac/access-roles#viewer-pro-role) role with the following access:

- Read-only access to Vercel to view analytics, speed insights, or access project deployments
- Ability to comment and collaborate on deployed previews

Viewers cannot configure or deploy projects.

### Additional team seats

- Seats with [Owner](/docs/rbac/access-roles#owner-role) or [Member](/docs/rbac/access-roles#member-role) roles: $20/month each
  - These team seats have the ability to configure & deploy projects
- [Viewer Pro](/docs/rbac/access-roles#viewer-pro-role) (read-only) seats: Free

## Paid add-ons

The following features are available as add-ons:

- **[SAML Single Sign-On](/docs/saml)**: $300/month
- **[HIPAA BAA](/docs/security/compliance#hipaa)**: Healthcare compliance agreements for $350/month
- **[Flags Explorer](/docs/flags/flags-explorer)**: $250/month
- **[Observability Plus](/docs/observability/observability-plus)**: $10/month
- **[Web Analytics Plus](/docs/analytics/limits-and-pricing#pro-with-web-analytics-plus)**: $10/month
- **[Speed Insights](/docs/speed-insights)**: $10/month per project

## Downgrading to Hobby

Each account is limited to one team on the Hobby plan. If you attempt to downgrade a Pro team while already having a Hobby team, the platform will either require one team to be deleted or the two teams to be merged.

To downgrade from a Pro to Hobby plan without losing access to the team's projects:

1. Navigate to your [dashboard](/dashboard) and select your team from the [scope selector](/docs/dashboard-features#scope-selector)
2. Select the **Settings** tab
3. Select **Billing** in the Settings navigation
4. Click **Downgrade Plan** in the **Plan** sub-section

When you downgrade a Pro team, all active members except for the original owner are removed.

Due to restrictions in the downgrade flow, Pro teams will need to [manually transfer any connected Stores](/docs/storage#transferring-your-store) and/or [Domains](/docs/domains/working-with-domains/transfer-your-domain#transferring-domains-between-projects) to a new destination before proceeding with downgrade.


---

[View full sitemap](/docs/sitemap)
