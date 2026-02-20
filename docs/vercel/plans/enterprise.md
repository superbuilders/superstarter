---
title: Vercel Enterprise Plan
product: vercel
url: /docs/plans/enterprise
type: reference
prerequisites:
  - /docs/plans
related:
  - /docs/functions/runtimes
  - /docs/functions/configuring-functions/region
  - /docs/functions
  - /docs/domains
  - /docs/domains/custom-SSL-certificate
summary: Learn about the Enterprise plan for Vercel, including features, pricing, and more.
---

# Vercel Enterprise Plan

Vercel offers an Enterprise plan for organizations and enterprises that need high [performance](#performance-and-reliability), advanced [security](#security-and-compliance), and dedicated [support](#administration-and-support).

## Performance and reliability

The Enterprise plan uses isolated build infrastructure on high-grade hardware with no queues to ensure exceptional performance and a seamless experience.

- Greater function limits for [Vercel Functions](/docs/functions/runtimes) including bundle size, duration, memory, and concurrency
- Automatic failover regions for [Vercel Functions](/docs/functions/configuring-functions/region#automatic-failover)
- Greater multi-region limits for [Vercel Functions](/docs/functions/configuring-functions/region#project-configuration)
- Vercel functions memory [configurable](/docs/functions/runtimes#size-limits) to 3009 MB
- Configurable [Vercel Function](/docs/functions) up to a [maximum duration](/docs/functions/runtimes#max-duration) of 900-seconds
- Unlimited [domains](/docs/domains) per project
- [Custom SSL Certificates](/docs/domains/custom-SSL-certificate)
- Automatic concurrency scaling up to 100,000 for [Vercel Functions](/docs/functions/concurrency-scaling#automatic-concurrency-scaling)
- [Isolated
  build infrastructure](/docs/security#do-enterprise-accounts-run-on-a-different-infrastructure),
  with the ability to have [larger memory and storage](/docs/deployments/troubleshoot-a-build#build-container-resources)
- [Trusted Proxy](/docs/headers/request-headers#x-forwarded-for)

## Security and compliance

Data and infrastructure security is paramount in the Enterprise plan with advanced features including:

- [SSO/SAML Login](/docs/saml)
- [Compliance measures](/docs/security)
- Access management for your deployments such as [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection),
  [Private Production Deployments](/docs/security/deployment-protection#configuring-deployment-protection),
  and [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips)
- [Secure Compute](/docs/secure-compute) (Paid add-on for Enterprise)
- [Directory Sync](/docs/security/directory-sync)
- [SIEM Integration](/docs/observability/audit-log#custom-siem-log-streaming) (Paid add-on for Enterprise)
- [Vercel Firewall](/docs/vercel-firewall), including [dedicated DDoS support](/docs/vercel-firewall/ddos-mitigation#dedicated-ddos-support-for-enterprise-teams), [WAF account-level IP Blocking](/docs/security/vercel-waf/ip-blocking#account-level-ip-blocking) and [WAF Managed Rulesets](/docs/security/vercel-waf/managed-rulesets)

## Conformance and Code Owners

[Conformance](/docs/conformance) is a suite of tools designed for static code analysis. Conformance ensures high standards in performance, security, and code health, which are integral for enterprise projects. Code Owners enables you to define users or teams that are responsible for directories and files in your codebase.

- [Allowlists](/docs/conformance/allowlist)
- [Curated rules](/docs/conformance/rules)
- [Custom rules](/docs/conformance/custom-rules)
- [Code Owners](/docs/code-owners) for GitHub

## Observability and Reporting

Gain actionable insights with enhanced observability & logging.

- Enhanced [Observability and Logging](/docs/observability)
- [Audit Logs](/docs/observability/audit-log)
- Increased retention with [Speed Insights](/docs/speed-insights/limits-and-pricing)
- [Custom Events](/docs/analytics/custom-events) tracking and more filters, such as UTM Parameters
- 3 days of [Runtime Logs](/docs/runtime-logs) and increased row data
- Increased retention with [Vercel Monitoring](/docs/observability/monitoring)
- [Tracing](/docs/tracing) support
- Configurable [drains](/docs/drains/using-drains)
- Integrations, like [Datadog](/marketplace/datadog), [New Relic](/marketplace/newrelic), and [Middleware](/marketplace/middleware)

## Administration and Support

The Enterprise plan allows for streamlined team collaboration and offers robust support with:

- [Role-Based Access Control (RBAC)](/docs/rbac/access-roles)
- [Access Groups](/docs/rbac/access-groups)
- [Vercel Support Center](/docs/dashboard-features/support-center)
- A dedicated Success Manager
- [SLAs](https://vercel.com/legal/sla), including [response time](https://vercel.com/legal/support-terms)
- Audits for Next.js
- Professional services


---

[View full sitemap](/docs/sitemap)
