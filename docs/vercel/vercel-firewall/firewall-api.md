---
title: Using the REST API with the Firewall
product: vercel
url: /docs/vercel-firewall/firewall-api
type: how-to
prerequisites:
  - /docs/vercel-firewall
related:
  - /docs/rest-api
  - /docs/rest-api/reference/endpoints/security/create-system-bypass-rule
  - /docs/rest-api/reference/endpoints/security/update-firewall-configuration
  - /docs/rest-api/sdk
  - /docs/rest-api/reference/endpoints/security
summary: Learn how to interact with the security endpoints of the Vercel REST API programmatically.
---

# Using the REST API with the Firewall

The security section of the [Vercel REST API](/docs/rest-api) allows you to programmatically interact with some of the functionality of the Vercel Firewall such as [creating a system bypass rule](/docs/rest-api/reference/endpoints/security/create-system-bypass-rule) and [updating your Vercel WAF rule configuration](/docs/rest-api/reference/endpoints/security/update-firewall-configuration).

You can use the REST API programmatically as follows:

- Install the [Vercel SDK](/docs/rest-api/sdk) and use the [security methods](https://github.com/vercel/sdk/blob/HEAD/docs/sdks/security/README.md).
- [Call the endpoints directly](/docs/rest-api) and use the [security endpoints](/docs/rest-api/reference/endpoints/security).

To define firewall rules in code that apply across multiple projects, you can use the [Vercel Terraform provider](https://registry.terraform.io/providers/vercel/vercel/latest).

After [setting up Terraform](/kb/guide/integrating-terraform-with-vercel), you can use the following rules:

- [vercel\_firewall\_config](https://registry.terraform.io/providers/vercel/vercel/latest/docs/resources/firewall_config)
- [vercel\_firewall\_bypass](https://registry.terraform.io/providers/vercel/vercel/latest/docs/resources/firewall_bypass)

## Examples

Learn how to use some of these endpoints with specific examples for the Vercel WAF.

- [Challenge `cURL` requests](/kb/guide/challenge-curl-requests)
- [Challenge cookieless requests on a specific path](/kb/guide/challenge-cookieless-requests-on-a-specific-path)
- [Deny non-browser traffic or blocklisted ASNs](/kb/guide/deny-non-browser-traffic-or-blocklisted-asns)
- [Deny traffic from a set of IP addresses](/kb/guide/deny-traffic-from-a-set-of-ip-addresses)
- [Vercel Firewall Terraform configuration](/kb/guide/firewall-terraform-configuration)


---

[View full sitemap](/docs/sitemap)
