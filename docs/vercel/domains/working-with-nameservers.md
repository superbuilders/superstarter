---
title: Working with nameservers
product: vercel
url: /docs/domains/working-with-nameservers
type: conceptual
prerequisites:
  - /docs/domains
related:
  - /docs/domains/managing-nameservers
  - /docs/domains/working-with-domains
  - /docs/domains/troubleshooting
summary: Learn about nameservers and the benefits Vercel nameservers provide.
---

# Working with nameservers

> **⚠️ Warning:** Before moving your domain to use Vercel's nameservers, you should ensure that
> you own the domain listed on the [Domains](/domains) page of your account."

Nameservers are the actual servers on the network that are responsible for resolving domain names to the IP addresses where your site is hosted. Most domain registrars, including Vercel, [provide their own nameservers](/docs/domains/managing-nameservers). For Vercel these are:

- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

When you purchase your domain through Vercel, we can set all the DNS records, including nameserver records, that tell anyone looking for your site where it can be found.

### Benefits of using Vercel nameservers

- **Automatic DNS Records**: Domains with nameservers pointed to Vercel don't need explicit DNS records created for the apex domain or first-level subdomains since they will be created automatically. This means that you can add a domain or subdomain to a project without thinking about DNS records at all. Not only does this reduce the potential for mistakes, but if you have multiple subdomains that you would like to use for your project, it takes away the need for manual entry of CNAME records for each of them.
- **Wildcard Domains**: When using Vercel's nameservers you can add [wildcard domains](/docs/domains/working-with-domains#subdomains-wildcard-domains-and-apex-domains) without any further configuration.
- **Custom nameservers**: For domains registered with Vercel, you can add custom nameservers to your Vercel-hosted domain directly from the dashboard, allowing for delegation to other DNS providers. Add up to four nameservers at once, and revert to your previous settings if necessary.

For domains that are not registered with Vercel, you can change the nameservers directly from the domain registrar's dashboard. For more information, see [Add Vercel's nameservers](/docs/domains/managing-nameservers#add-vercel's-nameservers).

> **💡 Note:** Before using Vercel's nameservers, you should ensure that you own the domain.

## Troubleshooting

To learn more about common nameserver issues, see the [troubleshooting](/docs/domains/troubleshooting#common-nameserver-issues) doc.

## Related


---

[View full sitemap](/docs/sitemap)
