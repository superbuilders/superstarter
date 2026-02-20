---
title: Getting Started with Static IPs
product: vercel
url: /docs/connectivity/static-ips/getting-started
type: tutorial
prerequisites:
  - /docs/connectivity/static-ips
  - /docs/connectivity
related:
  - /docs/plans/pro-plan
  - /docs/plans/enterprise
  - /docs/connectivity/static-ips
summary: Learn how to set up Static IPs for your Vercel projects to connect to IP-restricted backend services.
---

# Getting Started with Static IPs

> **🔒 Permissions Required**: Static IPs

This guide walks you through setting up Static IPs so you can access backend services that require IP allowlisting.

## Prerequisites

Before you dive in, make sure you have:

- A project deployed on Vercel
- A backend service that supports IP allowlisting
- [Pro](/docs/plans/pro-plan) or [Enterprise](/docs/plans/enterprise) plan

- ### Access the Connectivity settings
  1. Go to your **Project Dashboard**
  2. Navigate to **Project Settings**
  3. Click the **Connectivity** section

- ### Configure your region
  1. Click **Manage Active Regions**
  2. Pick a **region** close to your backend services to keep latency down. You can pick up to 3 regions
  3. Your project gets assigned static IPs within a shared VPC for each configured region

- ### Get your static IP addresses and configure your backend service
  1. Copy the static IP addresses from the dashboard
  2. Add the static IPs to your backend service's allowlist so it knows which IP addresses are allowed to connect

- ### Verify your connection
  To test your connection, redeploy your project that connects to your backend service. All your outbound traffic will now go through those static IPs and be routed via the static IPs.

## Next steps

- Learn how to [monitor usage and billing](/docs/connectivity/static-ips#managing-your-static-ips) for your Static IPs
- Understand [how Static IPs work](/docs/connectivity/static-ips#how-it-works)
- Review [limits and pricing](/docs/connectivity/static-ips#limits-and-pricing)


---

[View full sitemap](/docs/sitemap)
