---
title: Account Plans on Vercel
product: vercel
url: /docs/plans
type: reference
prerequisites:
  []
related:
  - /docs/git
  - /docs/security/encryption
  - /docs/deployments/environments
  - /docs/functions
  - /docs/routing-middleware
summary: Learn about the different plans available on Vercel.
---

# Account Plans on Vercel

Vercel offers multiple account plans: Hobby, Pro, and Enterprise.

Each plan is designed to meet the needs of different types of users, from personal projects to large enterprises. The Hobby plan is free and includes base features, while Pro and Enterprise plans offer enhanced features, team collaboration, and flexible resource management.

## Hobby

The Hobby plan is designed for personal projects and developers. It includes CLI and personal [Git integrations](/docs/git), built-in CI/CD, [automatic HTTPS/SSL](/docs/security/encryption), and [previews deployments](/docs/deployments/environments#preview-environment-pre-production) for every Git push.

It also provides base resources for [Vercel Functions](/docs/functions), [Middleware](/docs/routing-middleware), and [Image Optimization](/docs/image-optimization), along with 100 GB of Fast Data Transfer and 1 hour of [runtime logs](/docs/runtime-logs).

See the [Hobby plan](/docs/plans/hobby) page for more details.

## Pro

The Pro plan is designed for professional developers, freelancers, and businesses who need enhanced features and team collaboration. It includes all features of the [Hobby plan](/docs/plans/hobby) with significant improvements in resource management and team capabilities.

Pro introduces a flexible credit-based system that provides transparent, usage-based billing. You get enhanced team collaboration with viewer roles, advanced analytics, and the option to add enterprise features through add-ons.

Key features include team roles and permissions, credit-based resource management, enhanced monitoring, and email support with optional priority support upgrades.

See the [Pro plan](/docs/plans/pro-plan) page for more details.

## Enterprise

The Enterprise plan caters to large organizations and enterprises requiring custom options, advanced security, and dedicated support. It includes all features of the Pro plan with custom limits, dedicated infrastructure, and enterprise-grade security features.

Enterprise customers benefit from [Single Sign-On (SSO)](/docs/saml), enhanced [observability and logging](/docs/observability), isolated build infrastructure, dedicated customer success managers, and SLAs.

See the [Enterprise plan](/docs/plans/enterprise) page for more details.

## General billing information

### Where do I understand my usage?

On the [usage page of your dashboard](/dashboard). To learn how your usage relates to your bill and how to optimize your usage, see [Manage and optimize usage](/docs/pricing/manage-and-optimize-usage).

You can also learn more about how [usage incurs on your site](/docs/pricing/how-does-vercel-calculate-usage-of-resources) or how to [understand your invoice](/docs/pricing/understanding-my-invoice).

### What happens when I reach 100% usage?

All plans [receive notifications](/docs/notifications#on-demand-usage-notifications) by email and on the dashboard when they are approaching and exceed their usage limits.

- Hobby plans will be paused when they exceed the included free tier usage
- Pro plans users can configure [Spend Management](/docs/spend-management) to automatically pause deployments, trigger a webhook, or send SMS notifications when they reach 100% usage

For Pro and Enterprise teams, when you reach 100% usage your deployments are **not** automatically stopped. Rather, Vercel enables you to incur on-demand usage as your site grows. It's important to be aware of the [usage page of your dashboard](/docs/limits/usage) to see if you are approaching your limit.

One of the benefits to always being on, is that you don't have to worry about downtime in the event of a huge traffic spike caused by announcements or other events. Keeping your site live during these times can be critical to your business.

See [Manage & optimize usage](/docs/pricing/manage-and-optimize-usage) for more information on how to optimize your usage.


---

[View full sitemap](/docs/sitemap)
