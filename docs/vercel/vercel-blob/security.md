---
title: Security
product: vercel
url: /docs/vercel-blob/security
type: tutorial
prerequisites:
  - /docs/vercel-blob
related:
  - /docs/vercel-blob/private-storage
  - /docs/functions
  - /docs/vercel-firewall
  - /docs/vercel-firewall/vercel-waf
summary: Learn how your Vercel Blob store is secured
---

# Security

> **🔒 Permissions Required**: Vercel Blob

## Private storage

For files that require authentication, use [private storage](/docs/vercel-blob/private-storage). Private Blob stores require the `BLOB_READ_WRITE_TOKEN` for all read and write operations. Files in private Blob stores cannot be accessed via public URLs. You deliver them to your users through [Vercel Functions](/docs/functions) where you implement your own authentication logic.

## Public storage security

Vercel Blob URLs, although publicly accessible, are unique and hard to guess when you use the `addRandomSuffix: true` option. They consist of a unique store id, a pathname, and a unique random blob id generated when the blob is created.

> **💡 Note:** This is similar to [Share a file
> publicly](https://support.google.com/drive/answer/2494822?hl=en\&co=GENIE.Platform%3DDesktop#zippy=%2Cshare-a-file-publicly)
> in Google Docs. You should ensure that the URLs are only shared to authorized
> users

Headers that enhance security by preventing unauthorized downloads, blocking external content from being embedded, and protecting against malicious file type manipulation, are enforced on each blob. They are:

- `content-security-policy`: `default-src "none"`
- `x-frame-options`: `DENY`
- `x-content-type-options`: `nosniff`
- `content-disposition`: `attachment/inline; filename="filename.extension"`

### Encryption

All files stored on Vercel Blob are secured using AES-256 encryption. This encryption process is applied at rest and is transparent, ensuring that files are encrypted before being saved to the disk and decrypted upon retrieval.

### Firewall and WAF integration

Vercel Blob is protected by Vercel's [platform-wide firewall](/docs/vercel-firewall#platform-wide-firewall) which provides DDoS mitigation and blocks abnormal or suspicious levels of incoming requests.

Vercel Blob does not currently support [Vercel WAF](/docs/vercel-firewall/vercel-waf). If you need WAF rules on your blob URLs, consider using a [Vercel function](/docs/functions) to proxy the blob URL. This approach may introduce some latency to your requests but will enable the use of WAF rules on the blob URLs.


---

[View full sitemap](/docs/sitemap)
