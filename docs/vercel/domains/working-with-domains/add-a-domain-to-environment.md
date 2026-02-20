---
title: Assigning a custom domain to an environment
product: vercel
url: /docs/domains/working-with-domains/add-a-domain-to-environment
type: how-to
prerequisites:
  - /docs/domains/working-with-domains
  - /docs/domains
related:
  - /docs/deployments/environments
  - /docs/domains/add-a-domain
summary: Learn how to add a custom domain to your Vercel project, verify it, and correctly set the DNS or Nameserver values.
---

# Assigning a custom domain to an environment

1. From the [dashboard](/dashboard), pick the project to which you would like to assign your domain and select the **Settings** tab.
2. Click on the **Environments** menu item.
3. Select the environment to which you would like to assign your domain. Users on Pro and Enterprise plans can create [custom environments](/docs/deployments/environments#custom-environments) to which they can assign custom domains.
4. Once you've added your domain, you will need to configure the DNS records of your domain with your registrar so it can be used with your environment:
   - **If the domain is in use by another Vercel account**, you will need to [verify access to the domain](/docs/domains/add-a-domain#verify-domain-access), with a **TXT** record.

- If you're using an [**Apex domain**](/docs/domains/add-a-domain#apex-domains) (e.g. example.com), you will need to configure it with an **A** record.
- If you're using a [**Subdomain**](/docs/domains/add-a-domain#subdomains) (e.g. docs.example.com), you will need to configure it with a **CNAME** record.


---

[View full sitemap](/docs/sitemap)
