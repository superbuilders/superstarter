---
title: Working with Checks
product: vercel
url: /docs/checks
type: conceptual
prerequisites:
  []
related:
  - /docs/speed-insights
  - /docs/deployments
  - /docs/integrations/checks-overview/creating-checks
  - /docs/integrations
  - /docs/integrations/create-integration/marketplace-product
summary: Vercel automatically keeps an eye on various aspects of your web application using the Checks API. Learn how to use Checks in your Vercel workflow...
---

# Working with Checks

Checks are tests and assertions created and run after every successful deployment. **Checks API** defines your application's quality metrics, runs end-to-end tests, investigates APIs' reliability, and checks your deployment.

Most testing and CI/CD flows occur in synthetic environments. This leads to false results, overlooked performance degradation, and missed broken connections.

## Types of flows enabled by Checks API

| Flow Type        | Description                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core**         | Checks `200` responses on specific pages or APIs. Determine the deployment's health and identify issues with code, errors, or broken connections                                                                  |
| **Performance**  | Collects [core web vital](/docs/speed-insights) information for specific pages and compares it with the new deployment. It helps you decide whether to build the deployment or block it for further investigation |
| **End-to-end**   | Validates that your deployment has all the required components to build successfully. And identifies any broken pages, missing images, or other assets                                                            |
| **Optimization** | Optimizes information about the bundle size. Ensures that your website manages large assets like package and image size                                                                                           |

## Checks lifecycle

![Image](https://vercel.com/docs-assets/static/docs/integrations/checks/checks-overview-light.png)

The diagram shows the complete lifecycle of how a check works:

1. When a [deployment](/docs/deployments) is created, Vercel triggers the `deployment.created` webhook. This tells integrators that checks can now be registered
2. Next, an integrator uses the Checks API to create checks defined in the integration configuration
3. When the deployment is built, Vercel triggers the `deployment.ready` webhook. This notifies integrators to begin checks on the deployment
4. Vercel waits until all the created checks receive an update
5. Once all checks receive a `conclusion`, aliases will apply, and the deployment will go live

Learn more about this process in the [Anatomy of Checks API](/docs/integrations/checks-overview/creating-checks)

## Checks integrations

You can create a [native](/docs/integrations#native-integrations) or [connectable account](/docs/integrations#connectable-accounts) integration that works with the checks API to facilitate testing of deployments for Vercel users.

### Install integrations

Vercel users can find and install your integration from the [Marketplace](/marketplace) under [testing](/marketplace/category/testing), [monitoring](/marketplace/category/monitoring) or [observability](/marketplace/category/observability).

### Build your Checks integration

Once you have [created your integration](/docs/integrations/create-integration/marketplace-product), [publish](/docs/integrations/create-integration/submit-integration) it to the marketplace by following these guidelines:

- Provide low or no configuration solutions for developers to run checks
- A guided onboarding process for developers from the installation to the end result
- Provide relevant information about the outcome of the test on the Vercel dashboard
- Document how to go beyond the default behavior to build custom tests for advanced users


---

[View full sitemap](/docs/sitemap)
