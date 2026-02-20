---
title: Integrations for Agents
product: vercel
url: /docs/agent-resources/integrations-for-agents
type: conceptual
prerequisites:
  - /docs/agent-resources
related:
  - /docs/integrations
  - /docs/integrations/create-integration
  - /docs/integrations/install-an-integration/product-integration
  - /docs/integrations/create-integration/marketplace-product
summary: Learn about integrations for agents on Vercel.
---

# Build with AI agents on Vercel

Integrating AI agents in your application often means working with separate dashboards, billing systems, and authentication flows for each agent you want to use. This can be time-consuming and frustrating.

With [AI agents](#ai-agents) and [AI agent services](#ai-agent-services) on the Vercel Marketplace, you can add AI-powered workflows to your projects through [native integrations](/docs/integrations#native-integrations) and get a unified dashboard with billing, observability, and installation flows.

You have access to two types of AI building blocks:

- [**Agents**](#ai-agents): Pre-built systems that handle specialized workflows on your behalf
- [**Services**](#ai-agent-services): Infrastructure you use to build and run your own agents

## Getting started

To add an agent or service to your project:

1. Go to the [AI agents and services section](https://vercel.com/marketplace/category/agents) of the Vercel Marketplace and select the agent or service you want to add.

2. Review the details and click **Install**.

3. If you selected an agent that needs GitHub access for tasks like code reviews, you'll be prompted to select a Git namespace.

4. Choose an **Installation Plan** from the available options.

5. Click **Continue**.

6. On the configuration page, update the **Resource Name**, review your selections, and click **Create**.

7. Click **Done** once the installation is complete.

You'll be taken to the installation detail page where you can complete the onboarding process to connect your project with the agent or service.

### Providers

If you're building agents or AI infrastructure, check out [Integrate with Vercel](/docs/integrations/create-integration) to learn how to create a native integration. When you're ready to proceed, submit a [request to join](https://vercel.com/marketplace/program#become-a-provider) the Vercel Marketplace.

## AI agents

Agents are pre-built systems that reason, act, and adapt inside your existing workflows, like CodeRabbit, Corridor, and Sourcery. For example, instead of building code review automation from scratch, you install an agent that operates where your applications already run.

Each agent integrates with GitHub through a single onboarding flow. Once installed, the agent begins monitoring your repositories and acting on changes according to its specialization.

## AI agent services

Services give you the foundation to create, customize, monitor, and scale your own agents, including Braintrust, Kubiks, Autonoma, Chatbase, Kernel, and BrowserUse.

These services plug into your Vercel workflows so you can build agents specific to your company, products, and customers. They'll integrate with your CI/CD, observability, or automation workflows on Vercel.

## More resources

- [AI agents and services on the Vercel Marketplace](https://vercel.com/marketplace/category/agents)
- [Learn how to add and manage a native integration](/docs/integrations/install-an-integration/product-integration)
- [Learn how to create a native integration](/docs/integrations/create-integration/marketplace-product)


---

[View full sitemap](/docs/sitemap)
