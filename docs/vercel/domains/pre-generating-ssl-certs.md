---
title: Pre-Generate SSL Certificates
product: vercel
url: /docs/domains/pre-generating-ssl-certs
type: how-to
prerequisites:
  - /docs/domains
related:
  - /docs/domains/working-with-domains/transfer-your-domain
  - /docs/cli
  - /docs/domains/managing-dns-records
summary: test
---

# Pre-Generate SSL Certificates

> **💡 Note:** This page is part the domains transfer experience. See [this
> page](/docs/domains/working-with-domains/transfer-your-domain#transfer-a-domain-to-vercel)
> for the full set of steps to transfer a domain to Vercel.

This article guides you through all the steps necessary to set up SSL certificates for a domain
being migrated to Vercel without downtime. Your domain should be serving content from 3rd party
servers that are unrelated to Vercel, and you need to be prepared to make the necessary
DNS changes.

You can do this using either the Vercel Domains dashboard, or the [Vercel CLI](/docs/cli).

## Generating a Certificate

In order to issue certificates through the dashboard for a domain, first ensure the domain belongs to a team. You can then click into the domain management page,
scroll down to "SSL Certificates" and click "Pre-generate SSL certificates". Please note this option is only available if you do not already
have any SSL certificates issued for the domain.

![Image](`/docs-assets/static/docs/domains/ssl-pregen-light.png`)

If you choose to do this through the terminal, you can run the following command to get the challenge records for your domain:

```bash filename="terminal"
vercel certs issue "*.example.com" example.com --challenge-only
```

*Creating the challenge for the certificate that will be used for \*.example.com
and example.com.*

## Setting your DNS records and finalizing

In order to verify ownership of your domain, copy the TXT records into your DNS on the registrar you are using.

Click "Verify" to verify that the records have been set and issue the certificate. DNS records can take time to propagate,
so if it doesn't work immediately, it's worth waiting for the records to propagate before taking further action.

![Image](`/docs-assets/static/docs/domains/copy-challenges-light.png`)

To check whether the TXT records have propagated, you can use the following command in a terminal of your choice:

```bash filename="terminal"
nslookup -type=TXT example.com
```

*Looking up the TXT records for example.com*

Once TXT records have propagated, you can click "Verify" to issue the SSL certificates.

If you choose to issue SSL certificates through the terminal, you can run the command previously used without the
`--challenge-only` flag:

```bash filename="terminal"
vercel certs issue "*.example.com" example.com
```

*Issuing a certificate that covers both \*.example.com and example.com.*

## Verifying the Certificate

Before you change the DNS records of your domain, you can verify if the certificate is correct and will be accepted by browsers. Run the following command:

```bash filename="terminal"
curl https://example.com --resolve example.com:443:76.76.21.21 -I
```

*curl command that sends a request directly to Vercel, ignoring the DNS
configuration of the domain.*

If the request is successful, the certificate is working and you can proceed with the migration.

## Finishing connecting your domain to Vercel

To migrate your deployment to Vercel, add the provided A or CNAME record from your project’s Domain Settings page to your DNS configuration so your domain points to Vercel webservers.
See [this detailed guide](/kb/guide/a-record-and-caa-with-vercel) on using domains with **A** records for more information.

For more details on performing a migration, see [this guide](/docs/domains/managing-dns-records#migrating-dns-records-from-an-external-registrar).


---

[View full sitemap](/docs/sitemap)
