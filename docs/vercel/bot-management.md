---
title: Bot Management
product: vercel
url: /docs/bot-management
type: conceptual
prerequisites:
  []
related:
  - /docs/vercel-firewall/firewall-concepts
  - /docs/vercel-waf/managed-rulesets
  - /docs/vercel-waf/custom-rules
  - /docs/security/ddos-mitigation
  - /docs/observability
summary: Learn how to manage bot traffic to your site.
---

# Bot Management

Bots generate nearly half of all internet traffic. While many bots serve legitimate purposes like search engine crawling and content aggregation, others originate from malicious sources. Bot management encompasses both observing and controlling all bot traffic. A key component of this is bot protection, which focuses specifically on mitigating risks from automated threats that scrape content, attempt unauthorized logins, or overload servers.

## How bot management works

Bot management systems analyze incoming traffic to identify and classify requests based on their source and intent. This includes:

- Verifying and allowing legitimate bots that correctly identify themselves
- Monitoring bot traffic patterns and resource consumption
- Detecting and challenging suspicious traffic that behaves abnormally
- Enforcing browser-like behavior by verifying navigation patterns and cache usage

### Methods of bot management and protection

To effectively manage bot traffic and protect against harmful bots, you can use various techniques, including:

- Signature-based detection: Inspecting HTTP requests for known bot signatures
- Rate limiting: Restricting how often certain actions can be performed to prevent abuse
- Challenges: [Using JavaScript checks to verify human presence](/docs/vercel-firewall/firewall-concepts#challenge)
- Behavioral analysis: Detecting unusual patterns in user activity that suggest automation

With Vercel, you can use:

- [Managed rulesets](/docs/vercel-waf/managed-rulesets#configure-bot-protection-managed-ruleset) to challenge specific bot traffic
- Rate limiting and challenge actions with [WAF custom rules](/docs/vercel-waf/custom-rules) to prevent bot activity from reaching your application
- [DDoS protection](/docs/security/ddos-mitigation) to defend your application against bot driven attacks
- [Observability](/docs/observability) and [Firewall](/docs/vercel-firewall/firewall-observability) to monitor bot patterns, traffic sources, and the effectiveness of your bot management strategies

## Bot protection managed ruleset

> **🔒 Permissions Required**: Bot protection managed ruleset

With Vercel, you can use the bot protection managed ruleset to [challenge](/docs/vercel-firewall/firewall-concepts#challenge) non-browser traffic from accessing your applications. It filters out automated threats while allowing legitimate traffic.

- It identifies clients that violate browser-like behavior and serves a javascript challenge to them.
- It prevents requests that falsely claim to be from a browser such as a `curl` request identifying as Chrome.
- It automatically excludes [verified bots](#verified-bots), such as Google's crawler, from evaluation.

To learn more about how the ruleset works, review the [Challenge](/docs/vercel-firewall/firewall-concepts#challenge) section of [Firewall actions](/docs/vercel-firewall/firewall-concepts#firewall-actions). To understand the details of what get logged and how to monitor your traffic, review [Firewall Observability](/docs/vercel-firewall/firewall-observability).

> **💡 Note:** For trusted automated traffic, you can create [custom WAF
> rules](/docs/vercel-waf/custom-rules) with [bypass
> actions](/docs/vercel-firewall/firewall-concepts#bypass) that will allow this
> traffic to skip the bot protection ruleset.

### Enable the ruleset

You can apply the ruleset to your project in [log](/docs/vercel-firewall/firewall-concepts#log) or [challenge](/docs/vercel-firewall/firewall-concepts#challenge) mode. Learn how to [configure the bot protection managed ruleset](/docs/vercel-waf/managed-rulesets#configure-bot-protection-managed-ruleset).

### Bot protection ruleset with reverse proxies

Bot Protection doesn't work when a reverse proxy (e.g. Cloudflare, Azure, or other CDNs) is placed in front of your Vercel deployment. This setup significantly degrades detection accuracy and performance, leading to a suboptimal end-user experience.

[Reverse proxies](/docs/security/reverse-proxy) interfere with Vercel's ability to reliably identify bots:

- **Obscured detection signals**: Legitimate users may be incorrectly challenged because the proxy masks signals that Bot Protection relies on.
- **Frequent re-challenges**: Some proxies rotate their exit node IPs frequently, forcing Vercel to re-initiate the challenge on every IP change.

## AI bots managed ruleset

> **🔒 Permissions Required**: AI bots managed ruleset

Vercel's AI bots managed ruleset allows you to control traffic from AI bots that crawl your site for training data, search purposes, or user-generated fetches.

- It identifies and filters requests from known AI crawlers and bots.
- It provides options to log or deny these requests based on your preferences.
- The list of known AI bots is automatically maintained and updated by Vercel.

When new AI bots emerge, Vercel automatically adds them to its managed list and handles them according to your existing configured action without requiring any changes on your part.

### Enable the ruleset

You can apply the ruleset to your project in [log](/docs/vercel-firewall/firewall-concepts#log) or [deny](/docs/vercel-firewall/firewall-concepts#deny) mode. Learn how to [configure the AI bots managed ruleset](/docs/vercel-waf/managed-rulesets#configure-ai-bots-managed-ruleset).

## Verified bots

Vercel maintains and continuously updates a comprehensive directory of known legitimate bots from across the internet. This directory is regularly updated to include new legitimate services as they emerge. [Attack Challenge Mode](/docs/vercel-firewall/attack-challenge-mode#known-bots-support) and bot protection automatically recognize and allow these bots to pass through without being challenged. You can block access to some or all of these bots by writing [WAF custom rules](/docs/vercel-firewall/vercel-waf/custom-rules) with the **User Agent** match condition or **Signature-Agent** header. To learn how to do this, review [WAF Examples](/docs/vercel-firewall/vercel-waf/examples).

### Bot verification methods

To prove that bots are legitimate and verify their claimed identity, several methods are used:

- **IP Address Verification**: Checking if requests originate from known IP ranges owned by legitimate bot operators (e.g., Google's Googlebot, Bing's crawler).
- **Reverse DNS Lookup**: Performing reverse DNS queries to verify that an IP address resolves back to the expected domain (e.g., an IP claiming to be Googlebot should resolve to `*.googlebot.com` or `*.google.com`).
- **Cryptographic Verification**: Using digital signatures to authenticate bot requests through protocols like [Web Bot Authentication](https://datatracker.ietf.org/doc/html/draft-meunier-web-bot-auth-architecture), which employs HTTP Message Signatures (RFC 9421) to cryptographically verify automated requests.

### Verified bots directory

[Submit a bot request](https://bots.fyi/new-bot) if you are a SaaS provider and would like to be added to this list.


---

[View full sitemap](/docs/sitemap)
