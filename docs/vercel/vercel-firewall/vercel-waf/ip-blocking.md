---
title: WAF IP Blocking
product: vercel
url: /docs/vercel-firewall/vercel-waf/ip-blocking
type: how-to
prerequisites:
  - /docs/vercel-firewall/vercel-waf
  - /docs/vercel-firewall
related:
  - /docs/security/vercel-waf/custom-rules
  - /docs/rbac/access-roles
summary: Learn how to customize the Vercel WAF to restrict access to certain IP addresses.
---

# WAF IP Blocking

You can create custom rules to block a specific IP address or multiple IP addresses by [CIDR](# "What is CIDR?"), effectively preventing unauthorized access or unwanted traffic. This security measure allows you to restrict access to your applications or websites based on the IP addresses of incoming requests.

Common use cases for IP blocking on Vercel include:

- Blocking known malicious IP addresses
- Preventing competitors or scrapers from accessing your content

In cases such as blocking based on complying with specific laws and regulations or to restrict access to or from a particular geographic area, we recommend using [Custom Rules](/docs/security/vercel-waf/custom-rules).

## Access roles

- You need to be a [Developer](/docs/rbac/access-roles#developer-role) or viewer ([Viewer Pro](/docs/rbac/access-roles#viewer-pro-role) or [Viewer Enterprise](/docs/rbac/access-roles#viewer-enterprise-role)) in the team to view the Firewall overview page and list the rules
- You need to be a [Project administrator](/docs/rbac/access-roles#project-administrators) or [Team member](/docs/rbac/access-roles#member-role) to configure, save and apply any rule and configuration

## Project level IP Blocking

> **🔒 Permissions Required**: Project level IP Blocking

To block an IP address, navigate to the **Firewall** tab of your project and follow these steps:

1. Select **Configure** on the top right of the Firewall overview page
2. Scroll down to the **IP Blocking** section
3. Select the **+ Add IP** button
4. Complete the required **IP Address Or CIDR** and **Host** fields in the **Configure New Domain Protection** modal
   - The host is the domain name of the site you want to block the IP address from accessing. It should match the domain(s) associated with your project
   - You can copy this value from the URL of the site you want to block **without the `https` prefix**
   - It must match the exact domain you want to block, for example `my-site.com`, `www.my-site.com` or `docs.my-site.com`
   - You should add an entry for all subdomains that you wish block, such as `blog.my-site.com` and `docs.my-site.com`
5. Select the **Create IP Block Rule** button
6. Apply the changes:
   - When you make any change, you will see a **Review Changes** button appear or update on the top right with the number of changes requested
   - Select **Review Changes** and review the changes to be applied
   - Select **Publish** to apply the changes to your production deployment

## Account-level IP Blocking

> **🔒 Permissions Required**: Account-level IP Blocking

### How to add an IP block rule

To block an IP address, you can create an IP Blocking rule in your dashboard:

1. On your Team's [dashboard](/dashboard), navigate to **Settings** and select the **Security** tab
2. On the **IP Blocking** section, select **Create New Rule** to create a new rule set
3. Add the IP address you want to block and the host you want to block it from. The host is the domain name of the site you want to block the IP address from accessing
   - You can copy this value from the URL of the site you want to block **without the `https` prefix**
   - It must match the exact domain you want to block, for example `my-site.com`, `www.my-site.com` or `docs.my-site.com`
   - You should add a separate entry for each subdomain that you wish to block, such as `blog.my-site.com` and `docs.my-site.com`
4. Select the **Create IP Block Rule** button

## More resources

- [Geolocation region block](/kb/guide/suspicious-traffic-in-specific-countries)


---

[View full sitemap](/docs/sitemap)
