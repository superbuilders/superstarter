---
title: Static IPs
product: vercel
url: /docs/connectivity/static-ips
type: reference
prerequisites:
  - /docs/connectivity
related:
  - /docs/connectivity/secure-compute
  - /docs/connectivity/static-ips/getting-started
  - /docs/routing-middleware
  - /docs/glossary
  - /docs/deployments/environments
summary: Access IP-restricted backend services through shared static egress IPs for Pro and Enterprise teams.
---

# Static IPs

> **🔒 Permissions Required**: Static IPs

With Static IPs (shared pool), you can access backend services that require IP allowlisting through static egress IPs. It's designed for Pro and Enterprise teams who need static IP functionality without the advanced networking or security features of [Secure Compute](/docs/connectivity/secure-compute).

> **💡 Note:** If you need dedicated infrastructure, VPC peering, or complete network isolation, consider [Secure Compute](/docs/connectivity/secure-compute).

## When to use Static IPs

- Connect to databases such as Amazon RDS, Google Cloud SQL, Azure SQL, and MongoDB Atlas
- Connect to APIs such as Auth0, PayPal, Stripe, internal corporate APIs
- Connect to systems such as on-premises databases and services behind firewalls
- Support compliance and business requirements

## When not to use Static IPs

Static IP is a service provided by Vercel that assigns a set of fixed outbound IP addresses used for egress traffic from your deployments. It does not assign a fixed public IP that external users or services can use to directly access or initiate inbound (ingress) traffic to your app.
Therefore, Static IPs should not be used if you need your app to be reachable through a fixed inbound IP or require ingress traffic support, as inbound connections do not route through the Static IP service.

### Static IPs or Secure Compute

| Feature               | Static IPs (Pro & Enterprise)                                         | Secure Compute (Enterprise only)             |
| --------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| **IP type**           | Static in shared Virtual Private Cloud (VPC)                          | Static in dedicated VPC                      |
| **Network isolation** | Shared VPC for a small group of customers with subnet-level isolation | Dedicated VPC and subnet per customer        |
| **Use cases**         | IP allowlisting, database access                                      | IP allowlisting, VPC Peering, full isolation |
| **Pricing**           | $100/month per project, plus Private Data Transfer at $0.15/GB        | Custom pricing                               |

### Static IPs with Secure Compute

If your project uses [Secure Compute](/docs/connectivity/secure-compute) and you have enabled Static IPs, Static IPs will be ignored.

## Getting started

Read our [getting started guide](/docs/connectivity/static-ips/getting-started) to learn how to set up Static IPs.

## How it works

When you enable Static IPs, you get:

- **Shared infrastructure**: Each VPC serves a small group of customers
- **Static egress**: All outbound traffic routes through shared static IP pairs
- **Logical isolation**: Subnet-level isolation maintains security between customers on the same VPC
- **NAT gateway**: Traffic exits through a managed NAT gateway for consistent IPs
- **Build traffic**: Traffic from both deployed functions and builds will route through the static IPs

## Managing your static IPs

### Routing build traffic

If your application calls data sources at build time, you can route its build traffic through your static IPs to keep your data sources secure.

To enable this, go to your [project's connectivity settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fconnectivity\&title=Go+to+Connectivity+Settings):

1. Go to your project's **Settings**
2. Navigate to **Connectivity**
3. Toggle **Use Static IPs for builds** under **Static IPs**

This setting is disabled by default. When enabled, both your project's build and deployed function traffic will route through static IPs and count as [Private Data Transfer](#pricing).

### Routing Middleware support

Static IPs (region-specific) don't apply to [middleware](/docs/routing-middleware) (which are deployed at the [edge](/docs/glossary#edge)).

### Checking usage

1. Go to your **Team** and click the **Usage** tab
2. Scroll down to the **Content, Caching & Optimization** section. Static IPs data transfer is metered by **Private Data Transfer**
3. Click **Private Data Transfer** for more detail about direction, regions, and projects

### Static IPs with deployment environments

When you configure static IPs in a project, they apply to all the [environments](/docs/deployments/environments) set up in this project.

### Regional considerations

- Choose regions close to your backend services to reduce latency
- Each configured region has its own static IP pair

## Limits and pricing

### Limits

- Static IP addresses are shared across a small group of customers in the same region
- Project-level configuration: You cannot isolate static IPs to specific deployment environments

### Pricing

Static IPs are priced at **$100/month per project** for Pro plus **Private Data Transfer** priced regionally based on [regional pricing documentation](/docs/pricing/regional-pricing).


---

[View full sitemap](/docs/sitemap)
