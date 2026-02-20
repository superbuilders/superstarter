---
title: Interact with Integrations using Agent Tools
product: vercel
url: /docs/integrations/install-an-integration/agent-tools
type: how-to
prerequisites:
  - /docs/integrations/install-an-integration
  - /docs/integrations
related:
  - /docs/integrations/install-an-integration/product-integration
summary: Use Agent Tools to query, debug, and manage your installed integrations through a chat interface with natural language.
---

# Interact with Integrations using Agent Tools

> **🔒 Permissions Required**: Agent Tools

With Agent Tools, you can interact with your installed integrations through a chat interface in the Vercel Dashboard. Instead of navigating through settings and forms, ask questions and run commands in natural language.

When you install an integration from the Marketplace, any tools that the provider has enabled via MCP (Model Context Protocol) become available automatically. Vercel handles the authentication and configuration, so you can start querying your services immediately.

## What you can do with Agent Tools

You can use the chat interface to:

- Query databases and view table structures
- Run SQL queries on your data
- Inspect cache contents and performance metrics
- Fetch logs for debugging
- Trigger test events in your services
- Manage media assets and check processing status

This works with installed native integrations that provide tools through the MCP standard, including Neon, Prisma, Supabase, Dash0, Stripe, and Mux.

## Access Agent Tools

To use Agent Tools:

1. From the [Vercel Dashboard](/dashboard), make sure you have at least one native integration installed. See [Add a Native Integration](/docs/integrations/install-an-integration/product-integration) to install integrations.
2. Navigate to the **Integrations** tab in your dashboard.
3. Select an integration that supports Agent Tools.
4. Click on **Agent Tools** in the left navigation to open the chat interface.
5. Your installed integration's tools load automatically and are ready to use.

## Read-Only Mode

Agent Tools includes a **Read-Only Mode** toggle that is enabled by default. When enabled, you can query and view data, but cannot perform any actions that modify your services (such as creating, updating, or deleting resources).

This is useful for:

- Safely exploring your data without risk of accidental changes
- Allowing team members to investigate issues without write access
- Demonstrating integrations without modifying production data

To disable Read-Only Mode, click the toggle at the bottom of the Agent Tools interface. Be aware that this will allow the agent to create, modify, or delete resources within your connected projects.

## Interact with your integrations

Type natural language questions or commands in the chat interface. The agent understands what you're trying to do and routes your request to the appropriate integration.

Here are some examples of queries you can try:

- "Show me all my tables in this Neon database"
- "Run my Supabase SQL query"
- "Fetch my Dash0 logs"
- "Trigger a Stripe test event"

The specific tools and capabilities available depend on what each provider has enabled. You can ask questions about your data, run queries, check statuses, and manage your services directly through the chat interface.

## Supported integrations

Agent Tools is currently enabled for the following integrations: [Neon](https://vercel.com/marketplace/neon), [Prisma](https://vercel.com/marketplace/prisma), [Supabase](https://vercel.com/marketplace/supabase), [Dash0](https://vercel.com/marketplace/dash0), [Stripe](https://vercel.com/marketplace/stripe), and [Mux](https://vercel.com/marketplace/mux).

## Next steps

- [Learn how to add a native integration](/docs/integrations/install-an-integration/product-integration) to your project


---

[View full sitemap](/docs/sitemap)
