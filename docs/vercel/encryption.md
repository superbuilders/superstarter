---
title: Encryption
product: vercel
url: /docs/encryption
type: conceptual
prerequisites:
  []
related:
  - /docs/headers/cache-control-headers
summary: Learn how Vercel encrypts data in transit and at rest.
---

# Encryption

Out of the box, every **deployment** on Vercel is served over an HTTPS connection. The [SSL](https://en.wikipedia.org/wiki/Transport_Layer_Security) certificates for these unique URLs are automatically generated free of charge.

Any HTTP requests to your **deployment** are automatically forwarded to HTTPS using the `308` status code:

```bash
HTTP/1.1 308 Moved Permanently
Content-Type: text/plain
Location: https://<your-deployment-host>
```

*An example showing how all \`HTTP\` requests are forwarded to \`HTTPS\`.*

Enabling HTTPS redirection for deployments is considered an industry standard, and therefore it isn't possible to disable it. This ensures that web content is always served over a secure connection, which helps protect users' data and privacy.

> **💡 Note:** If the client that is issuing requests to your **deployment** wants to
> establish a WebSocket connection, please ensure it is connecting using HTTPS.
> directly, as the WSS protocol doesn't support redirections.

## Supported TLS versions

​Vercel supports TLS version [1.2](https://en.wikipedia.org/wiki/Transport_Layer_Security#TLS_1.2) and TLS version [1.3](https://en.wikipedia.org/wiki/Transport_Layer_Security#TLS_1.3).

## TLS resumption

​Vercel supports both Session Identifiers and Session Tickets as methods for [resuming a TLS connection](https://hpbn.co/transport-layer-security-tls/#tls-session-resumption). This can significantly improve Time To First Byte for second time visitors.

## OCSP stapling

To ensure clients can validate TLS certificates as quickly as possible, we [staple an OCSP response](https://en.wikipedia.org/wiki/OCSP_stapling) allowing them to skip a network request to check for revocation, which improves TTFB for first-time visitors.

## Supported ciphers

In order to ensure the integrity of the data received and sent by any **deployment** running on the **Vercel** platform, we only support strong ciphers with [forward secrecy](https://en.wikipedia.org/wiki/Forward_secrecy).

The following cipher algorithms are supported:

- `TLS_AES_128_GCM_SHA256` (TLS 1.3)
- `TLS_AES_256_GCM_SHA384` (TLS 1.3)
- `TLS_CHACHA20_POLY1305_SHA256` (TLS 1.3)
- `ECDHE-ECDSA-AES128-GCM-SHA256` (TLS 1.2)
- `ECDHE-RSA-AES128-GCM-SHA256` (TLS 1.2)
- `ECDHE-ECDSA-AES256-GCM-SHA384` (TLS 1.2)
- `ECDHE-RSA-AES256-GCM-SHA384` (TLS 1.2)
- `ECDHE-ECDSA-CHACHA20-POLY1305` (TLS 1.2)
- `ECDHE-RSA-CHACHA20-POLY1305` (TLS 1.2)
- `DHE-RSA-AES256-GCM-SHA384` (TLS 1.2)

This is the [recommended configuration from Mozilla](https://wiki.mozilla.org/Security/Server_Side_TLS#Intermediate_compatibility_.28recommended.29).

## Post-quantum cryptography

Vercel offers the `X25519MLKEM768` key exchange mechanism during TLS handshakes, which protects your deployments against future quantum computing attacks. This key exchange mechanism will be negotiated automatically by your browser if you use:

- Chrome 131 and above
- Firefox 132 and above
- Safari 26 and above

## Support for HSTS

The `.vercel.app` domain (and therefore all of its sub domains, which are the unique URLs set when creating a deployment) support [HSTS](https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security) automatically and are preloaded.

```bash
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload;
```

*The default \`Strict-Transport-Security\` header for \*.vercel.app*

Custom domains use HSTS, but only for the particular subdomain.

```bash
Strict-Transport-Security: max-age=63072000;
```

*The default \`Strict-Transport-Security\` header for custom domains*

You can modify the `Strict-Transport-Security` header by configuring [custom response headers](/docs/headers/cache-control-headers#custom-response-headers) in your project.

Theoretically, you could set the `max-age` parameter to a different value (it indicates how long the client should remember that your site is only accessible over HTTPS), but since we don't allow connections made over HTTP, there is no point in setting it to a shorter value, as the client can just remember it forever.

> **💡 Note:** You can test whether your site qualifies for HSTS Preloading
> [here](https://hstspreload.org/). It also allows submitting the domain to
> Google Chrome's hardcoded HSTS list. Making it onto that list means your site
> will become even faster, as it is always accessed over HTTPS right away,
> instead of the browser following the redirection issued by our **Network**
> layer.

## How certificates are handled

The unique URLs generated when creating a deployment are handled using a wildcard certificate issued for the `.vercel.app` domain. The **Vercel** platform generates wildcard certificates using [LetsEncrypt](https://letsencrypt.org/) and keeps them updated automatically.

When custom certificates are generated using `vercel certs issue`, however, their keys are placed in our database and [encrypted at rest](https://en.wikipedia.org/wiki/Data_at_rest#Encryption) within the Network layer.

Then, once a hostname is requested, the certificate and key are read from the database and used for establishing the secure connection. In addition, both are cached in memory for optimal SSL termination performance.

## Full specification

Any features of the encryption mechanism that were left uncovered are documented on [SSL Labs](https://www.ssllabs.com/ssltest/analyze.html?d=vercel.com). You only need to make sure to select any IP address of your choice (it doesn't matter which one you pick – the results are the same for all).


---

[View full sitemap](/docs/sitemap)
