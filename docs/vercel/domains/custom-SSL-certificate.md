---
title: Uploading Custom SSL Certificates
product: vercel
url: /docs/domains/custom-SSL-certificate
type: how-to
prerequisites:
  - /docs/domains
related:
  - /docs/rest-api/reference/endpoints/certs/upload-a-cert
summary: By default, Vercel provides all domains with a custom SSL certificates. However, Enterprise teams can upload their own custom SSL certificate.
---

# Uploading Custom SSL Certificates

> **🔒 Permissions Required**: Uploading Custom SSL Certificates

By default, Vercel provides all domains with custom SSL certificates. However, Enterprise teams can upload a custom SSL certificate. This allows for Enterprise teams to serve their own SSL certificate on a **Custom Domain** on Vercel's global network, rather than the automatically generated certificate.

Custom SSL certificates can be uploaded through the [**Domains** tab on your team's dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page), or by using the [Vercel REST API](/docs/rest-api/reference/endpoints/certs/upload-a-cert#upload-a-cert).

Uploading a custom certificate follows a three step process:

1. Providing the private key for the certificate
2. Providing the certificate itself
3. Providing the Certificate Authority root certificate such as one of [Let's Encrypt's ISRG root certificates](https://letsencrypt.org/certificates/). This will be provided by your certificate issuer and is different to the core certificate. This may be included in their download process or available for download on their website.

The content of each element must be copied and pasted into the input box directly. The certificate and private key can be extracted from the [PEM](https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail) files that are provided by your certificate issuer, and should be in the following format:

```bash filename="certificate.pem"
-----BEGIN CERTIFICATE-----
<Certificate body will be here>
-----END CERTIFICATE-----
```

```bash filename="private-key.pem"
-----BEGIN PRIVATE KEY-----
<Private key body will be here>
-----END PRIVATE KEY-----
```

## SSL best practices

When uploading your SSL certificate, you should note the following:

1. The automatically generated certificate will remain in place, but a custom certificate is prioritized over the existing certificate. This means that if a custom certificate is uploaded and then later removed, Vercel will revert to the automatically generated certificate.
2. You can include canonical names CN's (CN's) for other subdomains on the certificate without needing to add these domains to Vercel. The certificate will be served on these domains if or when they are added.
3. Wildcards certificates can be uploaded.
4. Certificates with an explicitly defined subdomain are prioritized over a wildcard certificate when both are valid for a given subdomain.
5. Vercel cannot automatically renew custom certificates. If a custom certificate is within 5 days of expiration, an automatically generated certificate will be served in its place to prevent downtime.


---

[View full sitemap](/docs/sitemap)
