---
title: Adding & Configuring a Custom Domain
product: vercel
url: /docs/domains/working-with-domains/add-a-domain
type: how-to
prerequisites:
  - /docs/domains/working-with-domains
  - /docs/domains
related:
  - /docs/domains/deploying-and-redirecting
summary: Learn how to add a custom domain to your Vercel project, verify it, and correctly set the DNS or Nameserver values.
---

# Adding & Configuring a Custom Domain

Vercel provides all deployments with a `vercel.app` URL, which enables you to share Deployments with your Team for collaboration. However, to provide greater personalization and flexibility to your project, you can instead add a **custom domain**. If you don't own a domain yet, you can [purchase it with Vercel](/domains).

You can manage all domain settings related to a project in the **Domains** section of the **Settings** tab of the project, regardless of whether you are using [apex domains](#apex-domains) or [subdomains](#subdomains) in your project. This document will guide you through both options.

Hobby teams have a limit of 50 custom domains per project.

## Add and configure domain

The following steps provide an overview of how to add and configure a custom domain in Vercel:

- ### Navigate to Domain Settings
  On the [dashboard](/dashboard), pick the project to which you would like to assign your domain.

  Once you have selected your project, click on the **Settings** tab and then select the **Domains** menu item:

  ![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/select-domains-light.png`)

- ### Add your domain
  From the **Domains** page, click the **Add Domain** button:

  ![Image](`/docs-assets/static/docs/domains/add-domain-button-light.png`)

  Input the domain you wish to include in the project:

  ![Image](`/docs-assets/static/docs/domains/enter-domain-input-light.png`)

  If you add an apex domain (e.g. `example.com`) to the project, Vercel will prompt you to add the `www` subdomain prefix. For more information about why we recommend using a `www` domain, see "[Redirecting `www` domains](/docs/domains/deploying-and-redirecting#redirecting-www-domains)".

- ### Using wildcard domain
  You can also use your **custom domain** as a **wildcard domain** by prefixing it with `*.`.
  > **💡 Note:** If using your custom domain as a wildcard domain, you **must use the
  > nameservers method for verification**.
  To add a **wildcard domain**, use the prefix `*`, for example `*.acme.com`.

  ![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/wildcard-domain.png`)

- ### Configure the domain
  Once you have added your custom domain, you will need to configure the DNS records of your domain with your registrar so it can be used with your Project. The dashboard will automatically display different methods for configuring it:
  - **If the domain is in use by another Vercel account**, you will need to [verify access to the domain](#verify-domain-access), with a **TXT** record
  - If you're using an [**Apex domain**](#apex-domains) (e.g. example.com), you will need to configure it with an **A** record
  - If you're using a [**Subdomain**](#subdomains) (e.g. docs.example.com), you will need to configure it with a **CNAME** record
  Both **apex domains** and **subdomains** can also be configured using the [**Nameservers**](#vercel-nameservers) method.
  > **⚠️ Warning:** If you are verifying your domain by changing nameservers, you will need to add
  > any DNS records to Vercel that you wish to keep from your previous DNS
  > provider.
  #### Apex domains
  You can configure apex domains with an **A** record.

  ![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/new-domain-apex-light.png`)
  #### Subdomains
  You can configure **subdomains** with a **CNAME** record. Each project has a unique CNAME record e.g. `d1d4fc829fe7bc7c.vercel-dns-017.com`.

  ![Image](`/docs-assets/static/docs/concepts/projects/custom-domains/new-domain-app-light.png`)
  #### Vercel Nameservers
  If you choose to use a wildcard domain Vercel's nameservers will be automatically enabled for you on saving the domain settings. You will then be provided with the Vercel nameservers to copy and use with your registrar.

  ![Image](`/docs-assets/static/docs/domains/configure-dns-ns-light.png`)

- ### Verify domain access
  If the domain is in use by another Vercel account, you may be prompted to verify access to the domain. Note that this will not move the domain into your account, but will allow you to use it in your project. If you have multiple domains to verify, be aware that you can only set up one TXT record at a time, but you can modify it after the domain is transferred.

  ![Image](`/docs-assets/static/docs/domains/verify-domain-light.png`)

Once the domain has been configured and Vercel has verified it, the status of the domain will be updated within the UI to confirm that it is ready for use.

![Image](`/docs-assets/static/docs/domains/domain-properly-configured-light.png`)

> **💡 Note:** If a someone visits your domain with or without the "www" subdomain prefix,
> Vercel will attempt to redirect them to your domain. For more robust
> protection, you should explicitly add this domain and [redirect
> it](/docs/domains/deploying-and-redirecting#redirecting-domains).


---

[View full sitemap](/docs/sitemap)
