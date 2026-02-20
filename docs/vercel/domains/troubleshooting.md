---
title: Troubleshooting domains
product: vercel
url: /docs/domains/troubleshooting
type: reference
prerequisites:
  - /docs/domains
related:
  - /docs/domains/add-a-domain
  - /docs/domains/working-with-dns
  - /docs/domains/managing-dns-records
  - /docs/domains/working-with-domains
  - /docs/domains/working-with-ssl
summary: Learn about common reasons for domain misconfigurations and how to troubleshoot your domain on Vercel.
---

# Troubleshooting domains

There are many common reasons why your domain configuration may not be working. Check the following:

- Is your domain [added](/docs/domains/add-a-domain#add-and-configure-domain) to your Vercel project?
- Is your custom domain pointed to the provided Vercel `CNAME`/`A` record correctly? You can check it by using `dig [example.com]` in your Terminal.
- If you use the [nameservers method](/docs/domains/troubleshooting#configuring-nameservers-for-wildcard-domains) on your apex domain, please refer to your DNS provider's documentation for the exact instructions on how to change authoritative nameservers.
- Is the issue only local to you? Try to clear your browser cache, and flush DNS caches on your machine/network if possible.

## Misconfigured domain issues

When you add a domain to Vercel that you have purchased from a third-party DNS provider, you may see an **Invalid Configuration** alert. There are many reasons why this could be the case:

- You need to configure the [DNS](#common-dns-issues) records of your domain with your DNS provider so they can be used with your project. To resolve this, follow the steps to [configure your domain](/docs/domains/add-a-domain#configure-the-domain).
- If your domain is in use by another Vercel account, you may be prompted to [verify access to the domain](/docs/domains/add-a-domain#verify-domain-access) by adding a TXT record. This will not move the domain into your account, but will allow you to use it in your project.
- There was an issue generating the SSL certificate for your domain. The most common reason for this is [missing CAA records](#missing-caa-records). For information on other issues that may cause this, see the [common SSL certificate issues](#common-ssl-certificate-issues) section.
- You have configured [wildcard subdomains](/docs/domains/add-a-domain#using-wildcard-domain) on your project, but their nameservers aren’t with Vercel. When using a wildcard domain, you must use the [nameservers method](/docs/domains/troubleshooting#configuring-nameservers-for-wildcard-domains).

## Common DNS issues

Vercel is expecting either an `A` record or a `CNAME` record. In your Project Settings under the Domain page, you’ll find the precise `CNAME` or `A` record values tailored to your project and plan. Make sure to remove any outdated records from your DNS provider to prevent conflicts. Once your new records have been added, you can use the following commands on your Terminal to check the DNS records are correctly configured:

- `dig ns [domain]` to get a domain’s nameservers
- `dig a [apex domain e.g. example.com]` to get a domain’s `A` record
- `dig cname [subdomain e.g. www.example.com]` to get a domain’s `CNAME` record

If you prefer a non-command-line interface, you can use a free online tool, such as [Google Public DNS](https://dns.google/). If any of these results do not match what is expected, follow the steps to [configure your domain](/docs/domains/add-a-domain#configure-the-domain).

### DNS record propagation times

DNS changes can take a while to propagate across the globe, depending on the previous DNS record TTL length. This may mean that certain regions can access your site as intended, while others wait until the DNS changes have reached them. Please allow some time for these changes to take effect.
Changes to standard DNS records (A, CNAME, TXT, etc.) typically propagate quicker, but changing a domain’s nameservers can take up to **24–48 hours** to fully propagate across the internet. During this time, different users may see different versions of your site depending on their local DNS caches. You can monitor this propagation using tools like [DNSChecker](https://dnschecker.org) or the [dig](/kb/guide/how-to-manage-vercel-dns-records#verifying-dns-records) command in your terminal.

For more information on [propagation times](/docs/domains/working-with-dns#dns-propagation) for nameservers and other DNS records, see "[How long will it take for my Vercel DNS records to update?](/kb/guide/how-long-to-update-dns-records)"

> **💡 Note:** Before changing your DNS records to point to Vercel, we recommend updating
> your existing DNS record to "lower" the TTL (for example 60 seconds) and
> waiting for the old TTL to expire. Lowering the current TTL and changing a DNS
> record after its TTL expiration period can ensure that you can quickly roll
> back the change if you encounter an issue. You can then increase the DNS
> record TTL to its original value once you confirm everything is working as
> expected.

### IPv6 support

While we allow the [creation](/docs/domains/managing-dns-records#adding-dns-records) of AAAA records when using Vercel's nameservers, **we do not support IPv6 yet**. This means if you are adding a [custom domain](/docs/domains/add-a-domain) from a [third-party](/docs/domains/working-with-domains#buying-a-domain-through-a-third-party), you won't be able to point an `AAAA` record to Vercel.

### Syntax errors debugging

When working with DNS records, you may make minor errors in the syntax. These errors can be difficult to debug. Below is a list of common errors made when adding DNS records and the steps required to resolve them.

#### Using the domain as part of the **Name** argument

When you add a new DNS record to a domain, the **Name** field should use the prefix or location of the record. For `www.example.com`, the name argument would be `www`.

If you have already added a record with this, [remove the record](/docs/domains/managing-dns-records#removing-dns-records) from the **DNS Records** section of the **Domains** tab, and add the record again **without** the domain as the **Name** argument.

#### Absolute CNAME records

When you add a custom domain with a subdomain to your project, we'll prompt you to add a CNAME DNS record in order to configure the domain. This record *includes* a period (.) at the end of the **Value** field. This is intentional to denote that it is an absolute, fully qualified domain name.

This means that when you add a new CNAME record to your DNS provider, you **must** copy the value exactly as it appears, **including** the period.

## Common Nameserver issues

### Configuring nameservers for wildcard domains

When you add any custom domain to your Vercel project you must [configure](/docs/domains/add-a-domain#configure-the-domain) the DNS records with your DNS provider so it can be used with your project. When you add a wildcard domain (such as `*.example.com`), you **must** [use the **Nameservers** method](/docs/domains/add-a-domain#vercel-nameservers).

This is because Vercel needs to be able to set DNS records in order to generate the wildcard certificates. The service that Vercel uses to [generate the certificates](/docs/domains/working-with-ssl) requires us to verify the domain ownership by using the [DNS-01 challenge method](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge). By changing the nameservers, Vercel will handle the DNS-01 challenge for you automatically, and you don't need to update your verification DNS record upon your certificate renewal each time.

For more information, see [Why must we use the Domain Nameservers method for Wildcard Domains on Vercel?](/kb/guide/why-use-domain-nameservers-method-wildcard-domains)

## Common domain issues

### Domains and emails

When you buy a new domain, you may want to also set up an email address with this domain. Vercel **does not provide a mail service for domains purchased with or transferred into it**. To learn how to set up email, see [How do I send and receive emails with my Vercel purchased domain?](/kb/guide/using-email-with-your-vercel-domain)

When you add your custom domain to a project and use Vercel's nameservers, you will need to add `MX` records to continue receiving email. To learn how to add `MX` records, see
[Why am I no longer receiving email after adding my domain to Vercel?](/kb/guide/why-has-email-stopped-working)

### Purchasing a domain through Vercel

All domain purchases and renewals through Vercel are final and cannot be refunded once processed. For more information, see [Can I get a refund for a domain purchased or renewed with Vercel?](/kb/guide/can-i-get-a-refund-for-a-domain-purchased-or-renewed-with-vercel)

### Pending domain purchases

When a domain purchase does not go through immediately, your payment method may show a **temporary authorization** — this is a pending hold, not a completed charge. It will be automatically released by your bank if the domain is not successfully registered.

If the purchase is processing, your domain will appear in the [Domains tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Domains+page) with a **“Pending”** status. Most purchases complete within minutes, but some TLDs may take up to 5 days to finalize. There is no need to retry the purchase or contact support while the domain is pending. You will receive a confirmation email once the registration completes.

### Pending verification

If verification is needed, you will receive an email with instructions from Vercel. You will also see an alert on your team's domain page, which you can access through the [Domain Dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains%2F\&title=). From there, you can resend the verification email or update your registrant information and email address.

### Emoji and ASCII support

You will need to convert the domain to [punycode](https://www.punycoder.com) in order to add it to your project. For example, a user looking to add a domain such as `jérémie.fr` can do so in the form of `xn--jrmie-bsab.fr`.

### Unable to transfer-in a domain

[ICANN](https://www.icann.org/) forces domain registrars to wait **60 days**:

- between transfers
- between a new registration and a subsequent transfer

If you transfer before this time, the transfer will fail. Besides this restriction, some DNS providers may further restrict domain transferring by default as a security measure, unless the owner explicitly turns off their protection setting. Please refer to the DNS provider's documentation for more details.

### Working with Apex domain

When you add an [apex domain](/docs/domains/working-with-domains#subdomains-wildcard-domains-and-apex-domains) (e.g. `example.com`) to your project, Vercel provides you with details, including an IP address, to add as an `A` record in your DNS configuration, as opposed to a `CNAME` record.

The main reason for that is the DNS [RFC1034](https://www.ietf.org/rfc/rfc1034.txt) (section 3.6.2) states that `If a CNAME RR is present at a node, no other data should be present`. Because an apex domain requires `NS` records and usually some other records, such as `MX` (for a mail service), adding a `CNAME` at the zone apex would violate this rule and likely cause an issue on your domain. Therefore, we encourage you to use an `A` record at your zone apex instead.

### Domain IP address and geographic regions

When you configure an apex domain (example.com) as a custom domain for your project on Vercel, Vercel will be give you an IP address to add as an A record in your DNS configuration. Although this IP address resolves to a specific geographic location, it does not mean that when your users point to your domain, they will be sent to this specific geographic location to resolve the domain.

This is because Vercel uses [Anycast](https://en.wikipedia.org/wiki/Anycast) IP addresses, which are shared across all regions. That means even if your users access your domain resolving to the same IP addresses from different geographic locations, they will be routed to the closest CDN region relative to your users, based on the BGP (Border Gateway Protocol).

### Domain ownership errors

When you add a domain to your project, Vercel checks if it is already associated with a [Personal Account or Team](/docs/accounts). A domain can only be associated with *one* Personal Account or Team at a time.

The following table shows errors that can be encountered when adding a domain to your project:

| Error Text                                                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `This team has already registered this domain`                                              | The domain you are trying to add is already connected to the team you have selected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `You have already registered this domain`                                                   | The domain you are trying to add is already connected to the Personal Account you have selected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `The domain mydomain.com is not available` or `Another Vercel account is using this domain` | This domain is already linked to another Vercel account or team. **If you have access to that account:** Transfer the domain to your current account via the [**Domains** dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Domains+Dashboard) by following [the working with domains guide](/docs/domains/working-with-domains/transfer-your-domain). **If you own the domain but not the other account:** Use the **Add Existing** option on the [**Domains** dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Domains+Dashboard). You'll receive a TXT record to add to your DNS to verify ownership. Once verified, the domain will automatically transfer to your account. |

## Common SSL certificate issues

There are many reasons why a certificate may not be generated. As the first starting point, we recommend testing your domain with:

1. **[Let's Debug](https://letsdebug.net)**: Let's Debug is a diagnostic tool/website to help figure out why you might not be able to issue a certificate for Let's Encrypt
2. **[DNSViz](https://dnsviz.net/)**: DNSViz is a tool suite for analysis and visualization of Domain Name System (DNS) behavior, including its security extensions (DNSSEC). They can also tell you about possible DNS misconfiguration.

For non-wildcard domains, we use [HTTP-01](https://letsencrypt.org/docs/challenge-types/#http-01-challenge) challenge by default, which Vercel handles automatically by intercepting the challenge requests from Let's Encrypt to your domain as long as the domain points to Vercel.

For wildcard domains, only [DNS-01](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge) challenge is supported, which Vercel requires you to use the [nameservers method](/docs/domains/troubleshooting#configuring-nameservers-for-wildcard-domains) to handle DNS-01 challenge requests with Vercel's nameservers automatically.

### Missing `CAA` records

Since we use Let's Encrypt for our automatic SSL certificates, you must add a `CAA` record with the value `0 issue "letsencrypt.org"` if other `CAA` records already exist on your domain.

You can check if your domain currently has any `CAA` records by running the `dig -t CAA +noall +ans example.com` command on your terminal, or check with [Google Public DNS](https://dns.google/) (change the `RR Type` to `CAA` and resolve).

For more information, see [Why is my domain not automatically generating an SSL certificate?](/kb/guide/domain-not-generating-ssl-certificate)

### Existing `_acme-challenge` record

An `_acme-challenge` record allows Let's Encrypt to verify the domain ownership using [DNS-01](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge) challenge. This may exist on your apex or subdomains, so can be checked with `dig -t TXT _acme-challenge.example.com` or `dig -t TXT _acme-challenge.subdomain.example.com`

If the domain was previously hosted on a different provider, and if the `_acme-challenge` record resolves to something, please consider [removing the DNS record](/docs/domains/managing-dns-records#removing-dns-records). This will prevent any provider (other than the one in the DNS record) from provisioning certificates for that domain.

### Rewriting or redirecting `/.well-known`

The [/.well-known](# "The /.well-known directory") path is reserved and cannot be redirected or rewritten. Only Enterprise teams can configure custom SSL. [Contact sales](/contact/sales) to learn more.


---

[View full sitemap](/docs/sitemap)
