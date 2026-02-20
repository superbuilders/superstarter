---
title: Vercel CDN Compression
product: vercel
url: /docs/compression
type: conceptual
prerequisites:
  []
related:
  - /docs/image-optimization
summary: Vercel helps reduce data transfer and improve performance by supporting both Gzip and Brotli compression
---

# Vercel CDN Compression

Vercel helps reduce data transfer and improve performance by supporting both Gzip and Brotli compression. These algorithms are widely used to compress files, such as HTML, CSS, and JavaScript, to reduce their size and improve performance.

## Compression algorithms

While `gzip` has been around for quite some time, `brotli` is a newer compression algorithm built by Google that best serves text compression. If your client supports [brotli](https://en.wikipedia.org/wiki/Brotli), it takes precedence over [gzip](https://en.wikipedia.org/wiki/LZ77_and_LZ78#LZ77) because:

- `brotli` compressed JavaScript files are 14% smaller than `gzip`
- HTML files are 21% smaller than `gzip`
- CSS files are 17% smaller than `gzip`

`brotli` has an advantage over `gzip` since it uses a dictionary of common keywords on both the client and server-side, which gives a better compression ratio.

## Compression negotiation

Many clients (e.g., browsers like Chrome, Firefox, and Safari) include the `Accept-Encoding` [request header](https://developer.mozilla.org/docs/Web/HTTP/Headers/Accept-Encoding) by default. This automatically enables compression for Vercel's CDN.

You can verify if a response was compressed by checking the `Content-Encoding` [response header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding) has a value of `gzip` or `brotli`.

### Clients that don't use `Accept-Encoding`

The following clients may not include the `Accept-Encoding` header by default:

- Custom applications, such as Python scripts, Node.js servers, or other software that can send HTTP requests to your deployment
- HTTP libraries, such as [`http`](https://nodejs.org/api/http.html) in Node.js, and networking tools, like `curl` or `wget`
- Older browsers. Check [MDN's browser compatibility list](https://developer.mozilla.org/docs/Web/HTTP/Headers/Accept-Encoding#browser_compatibility) to see if your client supports `Accept-Encoding` by default
- Bots and crawlers sometimes don't specify `Accept-Encoding` in their headers by default when visiting your deployment

When writing a client that doesn't run in a browser, for example a CLI, you will need to set the `Accept-Encoding` request header in your client code to opt into compression.

### Automatically compressed MIME types

When the `Accept-Encoding` request header is present, only the following list of MIME types will be automatically compressed.

#### Application types

- `json`
- `x-web-app-manifest+json`
- `geo+json`
- `manifest+json`
- `ld+json`
- `atom+xml`
- `rss+xml`
- `xhtml+xml`
- `xml`
- `rdf+xml`
- `javascript`
- `tar`
- `vnd.ms-fontobject`
- `wasm`

#### Font types

- `otf`
- `ttf`

#### Image types

- `svg+xml`
- `bmp`
- `x-icon`

#### Text types

- `cache-manifest`
- `css`
- `csv`
- `dns`
- `javascript`
- `plain`
- `markdown`
- `vcard`
- `calendar`
- `vnd.rim.location.xloc`
- `vtt`
- `x-component`
- `x-cross-domain-policy`

### Compression allowlist

The compression allowlist above is necessary to avoid accidentally increasing the size of non-compressible files, which can negatively impact performance.

For example, most image formats are already compressed such as JPEG, PNG, WebP, etc. If you want to compress an image even further, consider lowering the quality using [Vercel Image Optimization](/docs/image-optimization).


---

[View full sitemap](/docs/sitemap)
