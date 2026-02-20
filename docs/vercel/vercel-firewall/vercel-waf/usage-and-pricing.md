---
title: Usage & Pricing for Vercel WAF
product: vercel
url: /docs/vercel-firewall/vercel-waf/usage-and-pricing
type: reference
prerequisites:
  - /docs/vercel-firewall/vercel-waf
  - /docs/vercel-firewall
related:
  - /docs/security/ddos-mitigation
  - /docs/security/vercel-waf/ip-blocking
  - /docs/security/vercel-waf/custom-rules
  - /docs/security/vercel-waf/rate-limiting
  - /docs/security/vercel-waf/managed-rulesets
summary: Learn how the Vercel WAF can affect your usage and how specific features are priced.
---

# Usage & Pricing for Vercel WAF

Vercel Firewall features that are available under all plans, are free to use. This includes [DDoS mitigation](/docs/security/ddos-mitigation), [IP blocking](/docs/security/vercel-waf/ip-blocking), and [custom rules](/docs/security/vercel-waf/custom-rules). Vercel WAF plan-specific features such as [rate limiting](/docs/security/vercel-waf/rate-limiting) and [managed rulesets](/docs/security/vercel-waf/managed-rulesets) are priced as described in [priced features](#priced-features-usage).

## Free features usage

Although you are not charged for Firewall features available under all plans, you may incur [Edge Requests (ER)](/docs/manage-cdn-usage#edge-requests) and [incoming Fast Data Transfer (FDT)](/docs/manage-cdn-usage#fast-data-transfer) charges as described below.

| Feature                                                                                              | ER          | FDT         | Note                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| [WAF custom rule](/docs/security/vercel-waf/custom-rules)                                            | Charged     | Charged     | When a custom rule is active, you incur usage for every challenged or denied request.                           |
| [WAF custom rule with persistent actions](/docs/security/vercel-waf/custom-rules#persistent-actions) | Not charged | Not charged | As the requests are now blocked before being processed by the firewall, they do not count towards usage.        |
| [DDoS mitigation](/docs/security/ddos-mitigation)                                                    | Not charged | Not charged | Review [Do I get billed for DDoS?](/docs/security/ddos-mitigation#do-i-get-billed-for-ddos) for an explanation. |
| [Attack Challenge Mode](/docs/attack-challenge-mode)                                                 | Not charged | Not charged | When attack challenge mode is turned on, requests that do not pass the challenge will not count towards usage.  |
| [Account level IP Blocking](/docs/security/vercel-waf/ip-blocking#account-level-ip-blocking)         | Not charged | Not charged | Requests originating from these blocked IP addresses do not count towards usage.                                |
| [Project level IP Blocking](/docs/security/vercel-waf/ip-blocking#project-level-ip-blocking)         | Charged     | Charged     | This falls under custom rules.                                                                                  |

## Priced features usage

Enterprise only features are priced as described below.

### Rate limiting pricing

### Managed ruleset pricing

| Resource | Price | Included (Pro) |
|----------|-------|----------------|
| [OWASP CRS per request size](/docs/vercel-firewall/vercel-waf/managed-rulesets) | Regional | 4KB of each inspected request |


---

[View full sitemap](/docs/sitemap)
