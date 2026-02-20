---
title: Managing Nameservers
product: vercel
url: /docs/domains/managing-nameservers
type: how-to
prerequisites:
  - /docs/domains
related:
  - /docs/domains/working-with-nameservers
summary: Learn how to add custom nameservers and restore original nameservers for your domains on Vercel with this guide.
---

# Managing Nameservers

[Nameservers](/docs/domains/working-with-nameservers) are used to resolve domain names to IP addresses. For domains with Vercel as the registrar, nameservers can be viewed, edited, and reset by selecting the domain from the [**Domains** tab of your team's dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page).

Sometimes, however, you may need to delegate nameserver management to another host. For domains registered with Vercel, you can [add custom nameservers](#add-custom-nameservers) to your Vercel-hosted domain, directly from the dashboard, allowing for delegation to other DNS providers. You can add up to four nameservers at once, and [revert to your previous settings](#restore-original-nameservers) if necessary.

For domains that are not registered with Vercel, you can change the nameservers directly from the domain registrar's dashboard.

Nameserver changes can take up to 48 hours to complete due to [DNS propagation](https://ns1.com/resources/dns-propagation).

## Add custom nameservers

1. Ensure your account or team is selected in the scope selector

2. Navigate to the **Domains** tab and select the domain

3. On your domain's settings page, under **Nameservers**, click the **Edit** button:

   ![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/nameservers.png`)

4. In the **Edit Nameservers** modal, add the new nameservers:

   ![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/edit-nameservers.png`)

## Add Vercel's nameservers

> **💡 Note:** Before using Vercel's nameservers, you should ensure that you own the domain.

1. Ensure your account or team is selected in the scope selector
2. Navigate to the **Domains** tab and select the domain
3. On your domain's settings page, under **DNS Records**, click the **Enable Vercel DNS** button to opt in
4. You then must configure the following nameservers from the domain registrar's dashboard

- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

## Restore original nameservers

1. Ensure your account or team is selected in the scope selector
2. Navigate to the **Domains** tab and select the domain
3. Under **Nameservers**, select the **Restore Original Nameservers** button
4. On the **Restore Original Nameservers** modal confirm the nameservers that will be present after the change

Vercel will present a message when you have successfully submitted the nameserver change.

![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/restore-original-nameservers.png`)


---

[View full sitemap](/docs/sitemap)
