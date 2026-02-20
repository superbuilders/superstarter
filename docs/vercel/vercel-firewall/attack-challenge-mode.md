---
title: Attack Challenge Mode
product: vercel
url: /docs/vercel-firewall/attack-challenge-mode
type: conceptual
prerequisites:
  - /docs/vercel-firewall
related:
  - /docs/vercel-firewall/firewall-concepts
  - /docs/security/ddos-mitigation
  - /docs/plans
  - /docs/bot-management
  - /docs/security/vercel-waf/custom-rules
summary: "Learn how to use Attack Challenge Mode to help control who has access to your site when it's under attack."
---

# Attack Challenge Mode

> **🔒 Permissions Required**: Attack Challenge Mode

Attack Challenge Mode is a security feature that protects your site during DDoS attacks. When enabled, visitors must complete a [security challenge](/docs/vercel-firewall/firewall-concepts#challenge) before accessing your site, while known bots (like search engines and webhook providers) are automatically allowed through.

The Vercel Firewall automatically [mitigates against DDoS attacks](/docs/security/ddos-mitigation), but Attack Challenge Mode provides an extra layer of protection for highly targeted attacks.

Attack Challenge Mode is available for [free](#pricing) on all [plans](/docs/plans) and requests blocked by challenge mode do not count towards your usage limits.

## Known bots support

Vercel maintains and continuously updates a comprehensive directory of known legitimate bots from across the internet. Attack Challenge Mode automatically recognizes and allows these bots to pass through without being challenged.

Review [Verified bots](/docs/bot-management#verified-bots) for examples of bot categories and services that are automatically allowed. [Internal Requests](#internal-requests) are also allowed through.

Vercel's bot directory is regularly updated to include new legitimate services as they emerge, ensuring your SEO, analytics, integrations, and essential services continue to function even with Attack Challenge Mode enabled.

> **💡 Note:** To block specific known bots instead of allowing them through, you can create
> a [Custom Rule](/docs/security/vercel-waf/custom-rules) that matches their
> User Agent.

## Internal requests

When Attack Challenge Mode is enabled, requests from your own [Functions](/docs/functions) and [Cron Jobs](/docs/cron-jobs) are automatically allowed through without being challenged. This means your application's internal operations will continue to work normally.

For example, if you have multiple projects in your Vercel account:

- Your projects can communicate with each other without being challenged
- Only requests from outside your account will be challenged
- Each Vercel account has its own secure boundary

Other Vercel accounts cannot bypass Attack Challenge Mode on your projects. The security is strictly enforced per account, ensuring that only your own projects can communicate without challenges.

## Enabling attack challenge mode

While Vercel's Firewall [automatically monitors for and mitigates attacks](/docs/security/ddos-mitigation#what-to-do-in-case-of-a-ddos-attack), you can enable Attack Challenge Mode during targeted attacks for additional security.

To enable:

1. Select your project from the [Dashboard](/dashboard).
2. Navigate to the **Firewall** tab.
3. Click **Bot Management**.
4. Under **Attack Challenge Mode**, select **Enable**.

All traffic initiated by web browsers, including API traffic, is supported. For example, a Next.js frontend calling a Next.js API in the same project will work properly.

> **💡 Note:** Standalone APIs, other backend frameworks, and non-recognized automated
> services may not be able to pass challenges and could be blocked. If you need
> more control over what traffic is challenged, consider using [Custom Rules
> with the Vercel WAF](/docs/security/vercel-waf/custom-rules).

## How long to keep it enabled

Attack Challenge Mode can be safely used for extended periods without affecting search engine indexing or webhook functionality. However, since Vercel's Firewall already provides automatic DDoS protection, we recommend using it primarily when facing highly targeted attacks rather than as a permanent setting.

## Disabling attack challenge mode

When you no longer need the additional protection:

1. Select your project from the [Dashboard](/dashboard)
2. Navigate to the **Firewall** tab.
3. Click **Bot Management**.
4. Under **Attack Challenge Mode**, select **Disable**.

## Challenging with custom rules

For more granular control, define a [Custom Rule with the Vercel WAF](/docs/security/vercel-waf/custom-rules) to challenge specific web traffic.

## Search indexing

Search engine crawlers like Googlebot are automatically allowed through Attack Challenge Mode without being challenged. This means enabling Attack Challenge Mode will not negatively impact your site's SEO or search engine indexing, even when used for extended periods.

## Pricing

Attack Challenge Mode is available for free on all plans.

All mitigations by Attack Challenge Mode are free and unlimited, and there are zero costs associated with traffic blocked by Attack Challenge Mode.


---

[View full sitemap](/docs/sitemap)
