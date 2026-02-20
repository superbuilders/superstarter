---
title: Connectivity
product: vercel
url: /docs/connectivity
type: reference
prerequisites:
  []
related:
  - /docs/connectivity/static-ips
  - /docs/connectivity/secure-compute
  - /docs/pricing/regional-pricing
summary: Connect your Vercel projects to backend services with static IPs and secure networking options.
---

# Connectivity

Connect your projects to backend services that require IP allowlisting or private network access.

## Static IPs (shared pool)

When your database or API needs to see traffic from known IP addresses, Static IPs give you shared static egress IPs that won't change. Perfect for Pro and Enterprise teams who need IP allowlisting without the complexity.

- **Use case**: IP allowlisting for databases, APIs, and legacy systems
- **Network**: Shared VPC with subnet-level isolation
- [**Pricing**](/docs/connectivity/static-ips#pricing): $100/month per project + $0.15/GB Private Data Transfer

[Learn more about Static IPs](/docs/connectivity/static-ips)

## Secure Compute

For when you need your own private Virtual Private Cloud (VPC). Secure Compute gives you dedicated networks with VPC peering — your infrastructure stays completely isolated from other customers.

- **Use case**: Full network isolation and VPC peering
- **Network**: Dedicated VPC per customer

[Learn more about Secure Compute](/docs/connectivity/secure-compute)

## Pricing

Both connectivity options are billed on **Private Data Transfer** priced regionally based on the [regional pricing documentation](/docs/pricing/regional-pricing).

| Feature                   | Static IPs (Pro)                                   | Secure Compute (Enterprise)           |
| ------------------------- | -------------------------------------------------- | ------------------------------------- |
| **Monthly cost**          | $100/month per project                             | Custom                                |
| **Private Data Transfer** | [Regional pricing](/docs/pricing/regional-pricing) | Custom                                |
| **Network isolation**     | Shared VPC with subnet-level isolation             | Dedicated VPC and subnet per customer |

### Understanding data transfer costs

Data transfer costs kick in for all outbound traffic from your Vercel Functions to external services:

- Database queries and responses
- API calls to third-party services
- File uploads and downloads
- Any other outbound network traffic

Keep tabs on your usage in the **Team Settings** **Usage** tab under the **Private Data Transfer** section.


---

[View full sitemap](/docs/sitemap)
