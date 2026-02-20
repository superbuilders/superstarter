---
title: Microfrontends
product: vercel
url: /docs/microfrontends
type: conceptual
prerequisites:
  []
related:
  - /docs/monorepos
  - /docs/feature-flags
  - /docs/microfrontends/quickstart
  - /docs/microfrontends/local-development
  - /docs/vercel-toolbar/in-production-and-localhost
summary: Learn about microfrontends on Vercel.
---

# Microfrontends

Microfrontends allow you to split a single application into smaller, independently deployable units that render as one cohesive application for users. Different teams using different technologies can develop, test, and deploy each microfrontend while Vercel handles connecting the microfrontends and routing requests on the global network.

## When to use microfrontends?

They are valuable for:

- **Improved developer velocity**: You can split large applications into smaller units, improving development and build times.
- **Independent teams**: Large organizations can split features across different teams, with each team choosing their technology stack, framework, and development lifecycle.
- **Incremental migration**: You can gradually migrate from legacy systems to modern frameworks without rewriting everything at once.

Microfrontends may add additional complexity to your development process. To improve developer velocity, consider alternatives like:

- [Monorepos](/docs/monorepos) with [Turborepo](https://turborepo.com/)
- [Feature flags](/docs/feature-flags)
- Faster compilation with [Turbopack](https://nextjs.org/docs/app/api-reference/turbopack)

## Getting started with microfrontends

- Learn how to set up and configure microfrontends using our [Quickstart](/docs/microfrontends/quickstart) guide
- [Test your microfrontends locally](/docs/microfrontends/local-development) before merging the code to preview and production

To make the most of your microfrontend experience, [install the Vercel Toolbar](/docs/vercel-toolbar/in-production-and-localhost).

## Managing microfrontends

Once you have configured the basic structure of your microfrontends,

- Learn the different ways in which you can [route paths](/docs/microfrontends/path-routing) to different microfrontends as well as available options
- Learn how to [manage your microfrontends](/docs/microfrontends/managing-microfrontends) to add and remove microfrontends, share settings, route observability and manage the security of each microfrontend.
- Learn how to [optimize navigations](/docs/microfrontends/managing-microfrontends#optimizing-navigations-between-microfrontends) between different microfrontends
- Use the [Vercel Toolbar](/docs/microfrontends/managing-microfrontends/vercel-toolbar) to manage different aspects of microfrontends such as [overriding microfrontend routing](/docs/microfrontends/managing-microfrontends/vercel-toolbar#routing-overrides).
- Learn how to [troubleshoot](/docs/microfrontends/troubleshooting#troubleshooting) your microfrontends setup or [add unit tests](/docs/microfrontends/troubleshooting#testing) to ensure everything works.

## Limits and pricing

Users on all plans can use microfrontends support with some limits, while [Pro](/docs/plans/pro-plan) and [Enterprise](/docs/plans/enterprise) users can use unlimited microfrontends projects and requests with the following pricing:

|                                    | Hobby                | Pro / Enterprise   |
| ---------------------------------- | -------------------- | ------------------ |
| Included Microfrontends Routing    | 50K requests / month | N/A                |
| Additional Microfrontends Routing  | -                    | $2 per 1M requests |
| Included Microfrontends Projects   | 2 projects           | 2 projects         |
| Additional Microfrontends Projects | -                    | $250/project/month |

Microfrontends usage can be viewed in the **Vercel Delivery Network** section of **Usage** tab in the Vercel dashboard.

## More resources

- [Incremental migrations with microfrontends](/kb/guide/incremental-migrations-with-microfrontends)
- [How Vercel adopted microfrontends](https://vercel.com/blog/how-vercel-adopted-microfrontends)


---

[View full sitemap](/docs/sitemap)
