---
title: Vercel security overview
product: vercel
url: /docs/security
type: reference
prerequisites:
  []
related:
  - /docs/security/compliance
  - /docs/security/shared-responsibility
  - /docs/security/encryption
  - /docs/security/firewall-concepts
  - /docs/security/ddos-mitigation
summary: Vercel provides built-in and customizable features to ensure that your site is secure.
---

# Vercel security overview

Cloud-deployed web applications face constant security threats, with attackers launching millions of malicious attacks weekly. Your application, users, and business require robust security measures to stay protected.

A comprehensive security strategy requires active protection, robust policies, and compliance frameworks:

- [Security governance and policies](#governance-and-policies) ensure long-term organizational safety, maintain regulatory adherence, and establish consistent security practices across teams.
- A [Multi-layered protection](#multi-layered-protection) system provides active security against immediate threats and attacks.

## Governance and policies

### Compliance measures

Learn about the [protection and compliance measures](/docs/security/compliance) Vercel takes to ensure the security of your data, including DDoS mitigation, SOC2 Type 2 compliance, Data encryption, and more.

### Shared responsibility model

A [shared responsibility model](/docs/security/shared-responsibility) is a framework designed to split tasks and obligations between two groups in cloud computing. The model divides duties to ensure security, maintenance, and service functionality.

### Encryption

Out of the box, Vercel serves every deployment over an [HTTPS connection](/docs/security/encryption). Vercel automatically generates SSL certificates for these unique URLs free of charge.

## Multi-layered protection

Understand how Vercel protects every incoming request with [multiple layers](/docs/security/firewall-concepts#how-vercel-secures-requests) of firewall and deployment protection.

### Vercel firewall

The Vercel firewall helps to protect your applications and websites from malicious attacks and unauthorized access through:

- An enterprise-grade platform-wide firewall available for free for all customers with no configuration required that includes automatic [DDoS mitigation](/docs/security/ddos-mitigation) and protection against low quality traffic.
- A [Web Application Firewall (WAF)](/docs/security/vercel-waf) that supports custom rules, managed rulesets, and allows customers to challenge automated traffic. You can customize the WAF at the project level.
- [Observability](/docs/vercel-firewall/firewall-observability) into network traffic and firewall activity, including the access to firewall logs.


---

[View full sitemap](/docs/sitemap)
