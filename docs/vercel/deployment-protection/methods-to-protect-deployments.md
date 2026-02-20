---
title: Methods to Protect Deployments
product: vercel
url: /docs/deployment-protection/methods-to-protect-deployments
type: conceptual
prerequisites:
  - /docs/deployment-protection
related:
  - /docs/security/deployment-protection
  - /docs/security/deployment-protection/methods-to-bypass-deployment-protection
  - /docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication
  - /docs/security/deployment-protection/methods-to-protect-deployments/password-protection
  - /docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips
summary: Learn about the different methods to protect your deployments on Vercel, including Vercel Authentication, Password Protection, and Trusted IPs.
---

# Methods to Protect Deployments

Vercel offers three methods for protecting your deployments. Depending on your use case, you can choose to protect a single environment, or multiple environments. See [Understanding Deployment Protection by environment](/docs/security/deployment-protection#understanding-deployment-protection-by-environment) for more information.

You can see an overview of your projects' protections in the following way

1. From your [dashboard](/dashboard) go to the **Settings** tab
2. Select **Deployment Protection**

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/deployment-protection-projects-view.png`)

### Vercel Authentication

> **🔒 Permissions Required**: Vercel Authentication

With Vercel Authentication you can restrict access to all deployments (including non-public deployments), meaning only those with a Vercel account on your team, or those you share a [Sharable Link](/docs/security/deployment-protection/methods-to-bypass-deployment-protection#sharable-links) with, can access non-public urls, such as `my-project-1234-your-name.vercel.app`.

When a Vercel user visits your protected deployment, but they do not have permission to access it, they have the option to [request access](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication#access-requests) for their Vercel account. This request triggers an email and Vercel notification to the branch authors.

Learn more about [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) and how to enable it.

### Password Protection

> **🔒 Permissions Required**: Password Protection

Password Protection on Vercel lets you restrict access to both non-public, and public deployments depending on the type of [environment protection](/docs/security/deployment-protection#understanding-deployment-protection-by-environment) you choose.

Learn more about [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) and how to enable it.

### Trusted IPs

> **🔒 Permissions Required**: Trusted IPs

Trusted IPs restrict deployment access to specified IPv4 addresses and [CIDR ranges](https://www.ipaddressguide.com/cidr "What is are CIDR ranges?"), returning a 404 for unauthorized IPs. This protection feature is suitable for limiting access through specific paths like VPNs or external proxies.

Learn more about [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips) and how to enable it.

## More resources

- [Understanding Deployment Protection by environment](/docs/deployment-protection#understanding-deployment-protection-by-environment)
- [Methods to bypass deployment protection](/docs/deployment-protection/methods-to-bypass-deployment-protection)


---

[View full sitemap](/docs/sitemap)
