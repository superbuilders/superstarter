---
title: DDoS Mitigation
product: vercel
url: /docs/vercel-firewall/ddos-mitigation
type: conceptual
prerequisites:
  - /docs/vercel-firewall
related:
  - /docs/attack-challenge-mode
  - /docs/security/firewall-concepts
  - /docs/security/vercel-waf/ip-blocking
  - /docs/security/vercel-waf/custom-rules
  - /docs/spend-management
summary: Learn how the Vercel Firewall mitigates against DoS and DDoS attacks
---

# DDoS Mitigation

> **🔒 Permissions Required**: DDoS Mitigation

Vercel provides automatic DDoS mitigation for all deployments, regardless of your plan. We block incoming traffic if we identify abnormal or suspicious levels of incoming requests.

> **💡 Note:** Vercel does not charge customers for traffic that gets blocked with DDoS
> mitigation.

It works by:

- **Monitoring traffic:** Vercel Firewall continuously analyzes incoming traffic to detect signs of DDoS attacks. This helps to identify and mitigate threats in real-time
- **Blocking traffic:** Vercel Firewall filters out malicious traffic while allowing legitimate requests to pass through
- **Scaling resources:** During a DDoS attack, Vercel Firewall dynamically scales resources to absorb the increased traffic, preventing your applications or sites from being overwhelmed

If you need further control over incoming traffic, you can temporarily enable [Attack Challenge Mode](/docs/attack-challenge-mode) to challenge all traffic to your site, ensuring only legitimate users can access it.

Learn more about [DoS, DDoS and the Open System Interconnection model](/docs/security/firewall-concepts#understanding-ddos).

## Responding to DDoS attacks

Vercel mitigates against L3, L4, and L7 DDoS attacks regardless of the plan you are on. The Vercel Firewall uses hundreds of signals and detection factors to fingerprint request patterns, determining if they appear to be an attack, and challenging or blocking requests if they appear illegitimate.

However, there are other steps you can take to protect your site during DDoS attacks:

- Enable [Attack Challenge Mode](/docs/attack-challenge-mode) to challenge all visitors to your site. This is a temporary measure and provides another layer of security to ensure all traffic to your site is legitimate
- You can set up [IP Blocking](/docs/security/vercel-waf/ip-blocking) to block specific IP addresses from accessing your projects. Enterprise teams can also receive dedicated DDoS support
- You can add [Custom Rules](/docs/security/vercel-waf/custom-rules) to deny or challenge specific traffic to your site based on the conditions of the rules
- You can also use Middleware to [block requests](https://github.com/vercel/examples/tree/main/edge-middleware/geolocation-country-block) based on specific criteria or to implement [rate limiting](/kb/guide/add-rate-limiting-vercel).

Pro teams can [set up Spend Management](/docs/spend-management#managing-your-spend-amount) to get notified or to automatically take action, such as [using a webhook](/docs/spend-management#configuring-a-webhook) or pausing your projects when your usage hits a set spend amount.

## Bypass System-level Mitigations

> **🔒 Permissions Required**: Bypass System-level Mitigations

While Vercel's system-level mitigations (such as [DDoS protection](/docs/security/ddos-mitigation)) safeguards your websites and applications, it can happen that they block traffic from trusted sources like proxies or shared networks in situations where traffic from these proxies or shared networks was identified as malicious. You can temporarily pause all automatic mitigations for a specific project. This can be useful on business-critical events such as Black Friday.

To temporarily pause all automatic mitigations for a specific project:

1. Click the menu button with the ellipsis icon  at the top right of the **Firewall** tab for your project.
2. Select **Pause System Mitigations**.
3. Review the warning in the **Pause System Mitigations** dialog and confirm that you would like to pause all automatic mitigations for that project for the next 24 hours.

To resume the automatic mitigations **before** the 24 hour period ends:

1. Click the menu button with the ellipsis icon  at the top right of the **Firewall** tab for your project.
2. Select **Resume System Mitigations**.
3. Select **Resume** from the **Resume System Mitigations** dialog.

> **⚠️ Warning:** You are responsible for all usage fees incurred when using this feature,
> including illegitimate traffic that may otherwise have been blocked.

### System Bypass Rules

In situations where you need a more granular and permanent approach, you can use [System Bypass Rules](/docs/security/vercel-waf/system-bypass-rules) to ensure that essential traffic is never blocked by DDoS protection.

This feature is available for Pro and Enterprise customers. Learn how to [set up a System Bypass rule](/docs/security/vercel-waf/system-bypass-rules#get-started) for your project and [limits](/docs/security/vercel-waf/system-bypass-rules#limits) that apply based on your plan.

## Dedicated DDoS support for Enterprise teams

For larger, distributed attacks on Enterprise Teams, we collaborate with you to keep your site(s) online during an attack. Automated prevention and direct communication from our Customer Success Managers or Account Executives ensure your site remains resilient.

## DDoS and billing

[Vercel automatically mitigates against L3, L4, and L7 DDoS attacks](/docs/security/ddos-mitigation) at the platform level for all plans. Vercel does not charge customers for traffic that gets blocked by the Firewall.

Usage will be incurred for requests that are successfully served prior to us automatically mitigating the event. Usage will also be incurred for requests that are not recognized as a DDoS event, which may include bot and crawler traffic.

For an additional layer of security, we recommend that you enable [Attack Challenge Mode](/docs/attack-challenge-mode) when you are under attack, which is available for free on all plans. While some malicious traffic is automatically challenged, enabling Attack Challenge Mode will challenge all traffic, including legitimate traffic to ensure that only real users can access your site.

You can monitor usage in the [Vercel Dashboard](/dashboard) under the **Usage** tab, although you will [receive notifications](/docs/notifications#on-demand-usage-notifications) when nearing your usage limits.


---

[View full sitemap](/docs/sitemap)
