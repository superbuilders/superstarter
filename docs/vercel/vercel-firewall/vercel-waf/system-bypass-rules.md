---
title: WAF System Bypass Rules
product: vercel
url: /docs/vercel-firewall/vercel-waf/system-bypass-rules
type: how-to
prerequisites:
  - /docs/vercel-firewall/vercel-waf
  - /docs/vercel-firewall
related:
  - /docs/security/ddos-mitigation
  - /docs/vercel-waf/custom-rules
  - /docs/vercel-firewall/vercel-waf/managed-rulesets
  - /docs/plans
  - /docs/plans/hobby
summary: Learn how to configure IP-based system bypass rules with the Vercel Web Application Firewall (WAF).
---

# WAF System Bypass Rules

> **🔒 Permissions Required**: WAF System Bypass Rules

While Vercel's system-level mitigations (such as [DDoS protection](/docs/security/ddos-mitigation)) safeguard your websites and applications, it can happen that they block traffic from legitimate sources like proxies or shared networks in situations where traffic from these sources was identified as malicious.

You can ensure that specific IP addresses or CIDR ranges are never blocked by the Vercel Firewall's system mitigations with System Bypass Rules.

> **💡 Note:** If you need to allow requests blocked by your own [WAF Custom
> Rules](/docs/vercel-waf/custom-rules), use another [custom rule with a bypass
> action](/docs/vercel-firewall/vercel-waf/managed-rulesets#bypassing-custom-rules).

## Get started

To add an IP address that should bypass system mitigations, navigate to the **Firewall** tab of your project and follow these steps:

1. Select **Configure** on the top right of the Firewall overview page
2. Scroll down to the **System Bypass Rules** section
3. Select the **+ Add Rule** button
4. Complete the following fields in the **Configure New System Bypass** modal:
   - IP Address Or CIDR (required)
   - Domain (required): The domain connected to the project or use `*` to specify all domains connected to a project
   - Note: For future reference
5. Select the **Create System Bypass** button
6. Apply the changes:
   - When you make any change, you will see a **Review Changes** button appear or update on the top right with the number of changes requested
   - Select **Review Changes** and review the changes to be applied
   - Select **Publish** to apply the changes to your production deployment

## Limits

System Bypass Rules have limits based on your [account plan](/docs/plans).

| Resource                                  | [Hobby](/docs/plans/hobby) | [Pro](/docs/plans/pro) | [Enterprise](/docs/plans/enterprise) |
| ----------------------------------------- | -------------------------- | ---------------------- | ------------------------------------ |
| Number of system bypass rules per project | N/A                        | 25                     | 100                                  |


---

[View full sitemap](/docs/sitemap)
