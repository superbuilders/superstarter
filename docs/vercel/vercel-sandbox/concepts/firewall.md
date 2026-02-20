---
title: Sandbox firewall
product: vercel
url: /docs/vercel-sandbox/concepts/firewall
type: conceptual
prerequisites:
  - /docs/vercel-sandbox/concepts
  - /docs/vercel-sandbox
related:
  []
summary: Define network policies on sandboxes, preventing data exfiltration.
---

# Sandbox firewall

Network firewall allows users to restrict egress traffic from their sandbox. It is a critical tool to prevent data exfiltration.

## When to use network firewall

- **Protect user data**: Allow untrusted code to touch user-data without a risk of it getting exfiltrated.
- **Avoid malware injection**: Constrain package sources, or S3 buckets to access.
- **Dynamic policies for multi-step work**: Start with Internet access, get required data, lock access and start untrusted process.

## Network policies

Sandboxes can use three distinct modes, which can be updated at runtime, without restarting the process.

### `allow-all`

Default policy. This gives the sandbox unrestricted access to the public Internet.

Have the ability to install software packages, download dependencies and pull any data from external sources with the enhanced security model of sandboxes.

### `deny-all`

Most restrictive policy. Denies all outbound network access, including DNS.

This is useful to reduce the chance of data exfiltration when running untrusted code or an agent on private data.

### User-defined

Most specific policy, denying all traffic by default, while allowing users to get fine-grain control on their sandbox setup. Users can define:

- a list of domains to allow traffic to. Domain-based policies are easy to use and maintain fine-grain access control for services like S3 (per bucket) or behind virtual hosting (as Vercel). Wildcard support (`*`) allows easier management for complex websites.
- a list of address ranges to allow traffic to. Those ranges will not enforce per-domain rules, supporting non-encrypted traffic. This is recommended when using secure-compute to connect to your private network securely.
- a list of address ranges to deny traffic to. Those range will take precedence to block traffic. This is useful when using secure-compute, allowing Internet access to be granted while blocking internal network.

## Sandbox creation

Policies can be defined on sandboxes on creation, ensuring they will never run without them.

## Live updates

Policies can be updated on running sandboxes, allowing for incremental restrictions.

For instance start by installing needed packages, downloading data, and then run untrusted code on it.
Without live updates the entire run would have to get Internet access (creating exfiltration risk), or multiple steps and sandboxes would be needed.


---

[View full sitemap](/docs/sitemap)
