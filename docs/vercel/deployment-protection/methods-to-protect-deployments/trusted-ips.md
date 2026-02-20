---
title: Trusted IPs
product: vercel
url: /docs/deployment-protection/methods-to-protect-deployments/trusted-ips
type: how-to
prerequisites:
  - /docs/deployment-protection/methods-to-protect-deployments
  - /docs/deployment-protection
related:
  - /docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips
  - /docs/projects/project-dashboard
  - /docs/errors/platform-error-codes
  - /docs/security/deployment-protection
  - /docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication
summary: Learn how to restrict access to your deployments to a list of trusted IP addresses.
---

# Trusted IPs

> **🔒 Permissions Required**: Trusted IPs

With Trusted IPs [enabled](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips#managing-trusted-ips) at the level of your [project](/docs/projects/project-dashboard#settings), only visitors from an allowed IP address can access your deployment. The deployment URL will return `404` [No Deployment Found](/docs/errors/platform-error-codes#404:-deployment_not_found) for all other requests. Trusted IPs is configured by specifying a list of IPv4 addresses and IPv4 CIDR ranges.

Trusted IPs is suitable for customers who access Vercel deployments through a specific IP address. For example, limiting preview deployment access to your VPN. Trusted IPs can also be enabled in production, for example, to restrict incoming access to only requests through your external proxy.

![Image](https://vercel.com/front/docs/security/trusted-ips-dash-light.png)

## Trusted IPs security considerations

The table below outlines key considerations and security implications when using Trusted IPs for your deployments on Vercel.

| Consideration                    | Description                                                                                                                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **General Considerations**       |                                                                                                                                                                                                                                                                                        |
| Environment Configuration        | Can be enabled for different environments. See [Understanding Deployment Protection by environment](/docs/security/deployment-protection#understanding-deployment-protection-by-environment)                                                                                           |
| Compatibility                    | Operates as a required layer on top of [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) and [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection).          |
| Bypass Methods                   | Can be bypassed using [Shareable Links](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) and [Protection Bypass for Automation](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) |
| IP Address Support               | Supports IPv4 addresses and IPv4 CIDR ranges                                                                                                                                                                                                                                           |
| **Prerequisites**                |                                                                                                                                                                                                                                                                                        |
| Preview Environment Requirements | Can only be enabled in preview when [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) is also enabled.                                                                                                                |
| External Proxy Configuration     | Requires [rulesets](/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment) configuration to avoid blocking proxy IPs. [Contact our sales team for more information](/contact/sales)                                                                                               |
| **Security Considerations**      |                                                                                                                                                                                                                                                                                        |
| Firewall Precedence              | [Vercel Firewall](/docs/vercel-firewall) takes precedence over Trusted IPs                                                                                                                                                                                                             |
| IP Blocking                      | IPs or CIDRs listed in [IP Blocking](/docs/security/vercel-waf/ip-blocking) will be blocked even if listed in Trusted IPs                                                                                                                                                              |
| DDoS Mitigation                  | Trusted IPs do not bypass [DDoS Mitigation](/docs/security/ddos-mitigation) unless configured                                                                                                                                                                                          |
| Deployment Impact                | Changing the Trusted IPs list affects all deployments                                                                                                                                                                                                                                  |
| Disabling Trusted IPs            | Disabling makes all existing deployments accessible from any IP                                                                                                                                                                                                                        |

## Managing Trusted IPs

You can manage Trusted IPs through the dashboard, API, or Terraform:

### Manage using the dashboard

- ### Go to Project Deployment Protection Settings
  From your Vercel [dashboard](/dashboard):
  1. Select the project that you wish to enable Trusted IPs for
  2. Go to **Settings** then **Deployment Protection**

- ### Manage Vercel Authentication
  Ensure Vercel Authentication is enabled. See [Managing Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication#managing-vercel-authentication).

- ### Manage Trusted IPs
  From the **Trusted IPs** section:
  1. Use the toggle to enable the feature
  2. Select the [deployment environment](/docs/security/deployment-protection#understanding-deployment-protection-by-environment) you want to protect
  3. Enter your list of IPv4 addresses and IPv4 CIDR ranges with an optional note describing the address
  4. Finally, select **Save**
  All your existing and future deployments will be protected with Trusted IPs for that project. Visitors to your project deployments from IP addresses not included in your list will see a [No Deployment Found](/docs/errors/platform-error-codes#404:-deployment_not_found) error page.

### Manage using the API

You can manage Trusted IPs using the Vercel API endpoint to [update an existing project](/docs/rest-api/reference/endpoints/projects/update-an-existing-project) with the following body

- `deploymentType`
  - `prod_deployment_urls_and_all_previews`: Standard Protection
  - `all`: All Deployments
  - `preview`: Only Preview Deployments
  - `production`: Only Production Deployments
- `addresses`: Array of addresses
  - `value`: The IPv4, or IPv4 CIDR address
  - `note`: Optional note about the address
  - `protectionMode`
    - `additional`: IP is required along with other enabled protection methods (recommended setting)
    - `additional`: IP is required along with other enabled protection methods

```json
// enable / update trusted ips
{
  "trustedIps": {
      "deploymentType": "all" | "preview" | "production" | "prod_deployment_urls_and_all_previews",
      "addresses": { "value": "<value>"; "note": "<note>" | undefined }[],
      "protectionMode": "additional"
  }
}
// disbale trusted ips
{
  "trustedIps": null
}
```

### Manage using Terraform

You can configure Trusted IPs using `trusted_ips` in the `vercel_project` data source in the [Vercel Terraform Provider](https://registry.terraform.io/providers/vercel/vercel/latest/docs/data-sources/project).


---

[View full sitemap](/docs/sitemap)
