---
title: Working with domains
product: vercel
url: /docs/domains/working-with-domains
type: conceptual
prerequisites:
  - /docs/domains
related:
  - /docs/getting-started-with-vercel/buy-domain
  - /docs/domains/add-a-domain
  - /docs/domains/working-with-domains/assign-domain-to-a-git-branch
  - /docs/domains/deploying-and-redirecting
  - /docs/domains/troubleshooting
summary: Learn how domains work and the options Vercel provides for managing them.
---

# Working with domains

You can [buy a domain through Vercel](#buying-a-domain-through-vercel) by going to the [Vercel.com domains page](https://vercel.com/domains) and using our fast search to [find one or more domains](/docs/getting-started-with-vercel/buy-domain) that fit your brand and needs. The price of available domains is the same as the registrar's pricing and Vercel **does not** keep a log of your search history for marketing purposes.

## Buying a domain name

When you create a deployment on Vercel, we automatically assign it a domain based on your project name and ending in `.vercel.app`. Your site will be available to anyone that you share the domain with. Deployment URLs with the domain `.vercel.app` are allocated on a first-come, first-served basis and cannot be reserved.

More often than not, you will want to assign a domain to a project that reflects its nature better. You can buy a domain name either [through Vercel](#buying-a-domain-through-vercel) or [through a third-party](#buying-a-domain-through-a-third-party). Depending on which option you choose, will dictate how and when you'll need to make configurations:

### Buying a domain through Vercel

When you buy a domain through Vercel, we configure and set the nameservers, which means you do not need to set any DNS records or make any configurations. It just works. In addition, if you choose to make configurations, such as setting up email, it's all maintained from the [**Domains** tab of your team's dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page). Finally, all renewals, including domain and SSL certificate renewals are automatically handled by Vercel.

> **💡 Note:** For the ICANN registrant information:

### Buying a domain through a third-party

When you buy a custom domain through a third-party, you can use the [add a custom domain](/docs/domains/add-a-domain) workflow to configure the DNS records. If you are using Vercel's nameservers, you can manage certain settings, such as records for email providers or additional DNS records through the [**Domains** tab of your team's dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page). Otherwise, you must configure nameservers and DNS records through your domain registrar.

## Domain ownership and Project assignment

When you are using domains with Vercel, there are two areas of the dashboard that you may need to go to in order to configure them correctly. The first relates to your ownership and the second relates to configuring the domain for your Project:

- **Domain ownership**: Domains are owned by a specific team and can be accessed from the [**Domains** tab on your team's dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page). All your domains, regardless of where they are registered, are *listed* here and are owned by the owner of the team. If you are using Vercel's nameservers, which is the case by default if you buy your domain through Vercel, you can manage DNS records, custom nameservers, and SSL certificates here. Domains that are registered by a third-party should manage DNS records and nameservers with the third-party.

- **Project assignment**: This is accessed by selecting the project that you wish to assign the domain to and navigating to **Settings > Domains**. From here you can add an apex domain or subdomain to the Project. When a user visits your domain, they will see the most recent production deployment of your site, unless you [assign the domain to a Git branch](/docs/domains/working-with-domains/assign-domain-to-a-git-branch) or [add redirection](/docs/domains/deploying-and-redirecting).

> **💡 Note:** When you add a domain to Vercel for the first time, it will appear as an  in your team's  tab. If you add that domain (for example, `yourdomain.com`, or `docs.yourdomain.com`) to a project on a different Vercel team, that domain will require a TXT Verification step and will only show up at the project level. The  will still appear in the original account's  tab.

## Subdomains, wildcard domains, and apex domains

### Apex Domain

The **apex domain** is the root-level domain, such as `acme.com`. When you add an apex domain, Vercel will recommend that you add a [redirect](/docs/domains/deploying-and-redirecting#redirecting-www-domains) to a `www` subdomain. This is because `www` records allow for better control over your domain. Anything configured on the apex domain (for example, cookies or CAA records), will usually apply to all subdomains, rather than setting it on the `www` subdomain, which will only apply to your `www` record. In addition, because Vercel's servers use anycast networking, it can handle CNAME records differently, allowing for quicker DNS resolution and therefore a faster website experience for the end user.

### Subdomain

A **subdomain** is a more specific part of that domain that can be assigned to a particular part of your site, for example, `blog.acme.com`, `help.acme.com`. This helps to blend both your brand, with the specificity of where the user may need to go. To add a subdomain to your Project, follow the instructions in the [Add a custom domain](/docs/domains/add-a-domain#subdomains) doc. If you have bought the domain through Vercel, you can also [point a subdomain to an external service](/kb/guide/pointing-subdomains-to-external-services) through the Domains section of the dashboard. Subdomains are set through a *CNAME* DNS record.

*Image showing the fully-qualified domain name (FQDN).*

### Wildcard domain

You can also configure **wildcard domains**. Using a wildcard domain, such as `*.acme.com`, is a way to scale and customize your project on Vercel. Rather than specifying a particular subdomain, you can add a wildcard domain to your project, and then you need to set the nameservers to the intended nameservers, allowing the domain to be resolved. See our [multi-tenant SaaS template](https://vercel.com/templates/next.js/platforms-starter-kit) for an example of using wildcard domains on Vercel.

To add a wildcard domain, follow the steps in [Adding a domain](/docs/domains/add-a-domain#using-wildcard-domain).

Wildcard domains **must** be configured with the [nameservers method](/docs/domains/add-a-domain#vercel-nameservers). This is because in order to generate the wildcard certificates, Vercel needs to be able to set DNS records, since the service that Vercel uses to generate those requires us to solve a challenge to verify ownership.

## Using email with domains

When you create a domain, you may want to also set up a way for users to contact you through an email address that is pointed at that domain. **Vercel does not provide a mail service for domains purchased with or transferred into it**.

Because many domain providers do not offer a mail service, several third-party services specifically offer this type of functionality and are enabled by adding MX records. Examples of this type of service include [ImproxMX](https://improvmx.com/) and [Forward Email](https://forwardemail.net/en), however there are many more options available. For each provider, different DNS records are required to be added. For information on how to set up email, see [How do I send and receive emails with my Vercel purchased domain?](/kb/guide/using-email-with-your-vercel-domain)

## Troubleshooting

[Invalid domain configurations](/docs/domains/troubleshooting#misconfigured-domain-issues) are one of the most common types of domain issues on Vercel. To learn more about other common domain issues, see the [troubleshooting](/docs/domains/troubleshooting#common-domain-issues) doc.

## More resources

- [Domains overview: Learn the concepts behind how domains work](/docs/domains)
- [Learn how DNS works in order to properly configure your domain](/docs/domains/working-with-dns)
- [Learn about nameservers and the benefits Vercel nameservers provide](/docs/domains/working-with-nameservers)
- [Learn how Vercel uses SSL certificates to keep your site secure](/docs/domains/working-with-ssl)
- [Learn how to troubleshoot your domain on Vercel](/docs/domains/troubleshooting)
- [What is a Domain Name?](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_domain_name)


---

[View full sitemap](/docs/sitemap)
