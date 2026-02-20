---
title: Native integration concepts
product: vercel
url: /docs/integrations/create-integration/native-integration
type: conceptual
prerequisites:
  - /docs/integrations/create-integration
  - /docs/integrations
related:
  - /docs/integrations/create-integration/marketplace-api/reference/vercel/get-account-information
  - /docs/integrations/marketplace-api
  - /docs/integrations
  - /docs/integrations/create-integration
  - /docs/integrations/create-integration/submit-integration
summary: "As an integration provider, understanding how your service interacts with Vercel's platform will help you create and optimize your integration."
---

# Native integration concepts

Native integrations allow a two-way connection between Vercel and third-party providers. This enables providers to embed their services into the Vercel ecosystem so that Vercel customers can subscribe to third-party products directly through the Vercel dashboard, providing several key benefits to the integration user:

- They **do not** need to create an account on your site.
- They can choose suitable billing plans for each product through the Vercel dashboard.
- Billing is managed through their Vercel account.

This document outlines core concepts, structure, and best practices for creating robust, scalable integrations that align with Vercel's ecosystem and user expectations.

## Team installations

Team installations are the foundation of native integrations, providing a secure and organized way to connect user teams with specific integrations. You can then enable centralized management and access control to integration resources through the Vercel dashboard.

Installations represent a connection between a Vercel team and your system. They are **team-scoped, not user-scoped**, meaning they belong to the entire team rather than the individual who installed them. Therefore, if the user who created an installation leaves the team, the installation remains active and accessible to other team members with appropriate permissions.

Because installations are tied to teams and not individual users, use the [Get Account Information endpoint](/docs/integrations/create-integration/marketplace-api/reference/vercel/get-account-information) to get current team contact information rather than relying on the original installing user's details.

| Concept                                                              | Definition                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Team installation                                                    | The primary connection between a user's team and a specific integration. |
| [`installationId`](/docs/integrations/marketplace-api#installations) | The main partition key connecting the user's team to the integration.    |

### Reinstallation behavior

If a team uninstalls and then reinstalls your integration, Vercel creates a new `installationId`. Treat this as a completely new installation with no assumptions about previous configuration, billing, or resource states from the earlier installation.

### Limits

Understanding the limits of team installation instances for all types of integrations can help you design a better integration architecture.

A Vercel team can only have one native integration installation at a time. If a team wants to install the integration again, they need to uninstall the existing installation first. This helps maintain clarity in billing and resource management.

| Metric                                                                                                                 | Limit                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [Native integration](/docs/integrations#native-integrations) installation                                              | A maximum of one installation instance of a specific provider's native integration per team.              |
| [Connectable account integration](/docs/integrations/create-integration#connectable-account-integrations) installation | A maximum of one installation instance of a specific provider's connectable account integration per team. |

A team can have both a native integration installation and a connectable account integration installation for the same integration if you've set up both on the same integration configuration. In this case, there are technically two installations, and you should treat each one as independent even if you can correlate them in your system.

## Products

Products represent the offerings available within an integration, allowing integration users to select and customize an asset such as "ACME Redis Database" or a service such as "ACME 24/7 support" that they would like to use and subscribe to. They provide a structured way to package and present integration capabilities to users.

| Concept                            | Definition                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product                            | An offering that integration users can add to their native integration installation. A provider can offer multiple products through one integration. |
| [Billing plan](#billing-and-usage) | Each product has an associated pricing structure that the provider specifies when creating products.                                                 |

## Resources

Resources are the actual instances of products that integration users provision and utilize. They represent instances of products in your system, like databases or other infrastructure the user provisions in your service. Resources provide the flexibility and granularity needed for users to tailor the integration to their specific needs and project structures.

Resources track usage and billing at the individual resource level, giving you the ability to monitor and charge for each provisioned instance separately.

| Concept            | Definition                                                             |
| ------------------ | ---------------------------------------------------------------------- |
| Resource           | A specific instance of a product provisioned in an installation.       |
| Provisioning       | Explicit creation and removal (de-provisioning) of resources by users. |
| Keysets            | Independent sets of secrets for each resource.                         |
| Project connection | Ability to link resources to Vercel projects independently.            |

### Working with installation and team information

When working with resources, you'll use the `installationId` as the main identifier for connecting resources to a team's installation. Note that Vercel does not provide a `teamId` directly. Instead, use the [Get Account Information endpoint](/docs/integrations/create-integration/marketplace-api/reference/vercel/get-account-information) with the `installationId` to retrieve current team contact information and other account details.

### Resource usage patterns

Integration users can add and manage resources in various ways. For example:

- Single resource: Using one resource such as one database for all projects.
- Per-project resources: Dedicating separate resources for each project.
- Environment-specific resources: Using separate resources for different environments (development, preview, production) within a project.

## Relationships

The diagram below illustrates the relationships between team installations, products, and resources:

- One installation can host multiple products and resources.
- One product can have multiple resource instances.
- Resources can be connected to multiple projects independently.

## Billing and usage

Billing and usage tracking are crucial aspects of native integrations that are designed to help you create a system of transparent billing based on resource utilization. It enables flexible pricing models and provides users with clear insights into their integration costs.

| Concept                                                                                                                 | Definition                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Resource-level billing                                                                                                  | Billing and usage can be tracked separately for each resource.                                                                                                                                                                                               |
| [Installation-level billing](/docs/integrations/create-integration/submit-integration#installation-level-billing-plans) | Billing and usage for all resources can also be combined under one installation.                                                                                                                                                                             |
| Billing plan and payment                                                                                                | A plan can be of type prepaid or subscription. You ensure that the correct plans are pulled from your backend with your [integration server](/docs/integrations/marketplace-product/#update-your-integration-server) before you submit a product for review. |

We recommend you implement resource-level billing, which is the default, to provide users with detailed cost breakdowns and enable more flexible pricing strategies.

## More resources

To successfully implement your native integration, you'll need to handle several key flows:

- [Storage product creation flow](/docs/integrations/create-integration/marketplace-flows#create-a-storage-product-flow)
- [Data synchronization flows between Vercel and the provider](/docs/integrations/create-integration/marketplace-flows#connections-between-vercel-and-the-provider)
- [Provider dashboard access](/docs/integrations/create-integration/marketplace-flows#open-in-provider-button-flow)
- [Credential management](/docs/integrations/create-integration/marketplace-flows#rotate-credentials-in-provider-flow)
- [Experimentation integrations flows](/docs/integrations/create-integration/marketplace-flows#flows-for-the-experimentation-category)
- [Flows for resource handling with claim deployments](/docs/integrations/create-integration/marketplace-flows#resources-with-claim-deployments)


---

[View full sitemap](/docs/sitemap)
