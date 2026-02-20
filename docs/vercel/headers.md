---
title: Headers
product: vercel
url: /docs/headers
type: reference
prerequisites:
  []
related:
  - /docs/compression
  - /docs/project-configuration
  - /docs/headers/request-headers
  - /docs/headers/response-headers
  - /docs/headers/cache-control-headers
summary: This reference covers the list of request, response, cache-control, and custom response headers included with deployments with Vercel.
---

# Headers

Headers are small pieces of information that are sent between the client (usually a web browser) and the server. They contain metadata about the request and response, such as the content type, cache-control directives, and authentication tokens. [HTTP headers](https://developer.mozilla.org/docs/Web/HTTP/Headers) can be found in both the HTTP Request and HTTP Response.

## Using headers

By using headers effectively, you can optimize the performance and security of your application on Vercel's global network. Here are some tips for using headers on Vercel:

1. [Use caching headers](#cache-control-header): Caching headers instruct the client and server to cache resources like images, CSS files, and JavaScript files, so they don't need to be reloaded every time a user visits your site. By using caching headers, you can significantly reduce the time it takes for your site to load.
2. [Use compression headers](/docs/compression#compression-with-vercel-cdn): Use the `Accept-Encoding` header to tell the client and server to compress data before it's sent over the network. By using compression, you can reduce the amount of data that needs to be sent, resulting in faster load times.
3. Use custom headers: You can also use custom headers in your `vercel.json` file to add metadata specific to your application. For example, you could add a header that indicates the user's preferred language or the version of your application. See [Project Configuration](/docs/project-configuration#headers) docs for more information.

## Request headers

To learn about the request headers sent to each Vercel deployment and how to use them to process requests before sending a response, see [Request headers](/docs/headers/request-headers).

## Response headers

To learn about the response headers included in Vercel deployment responses and how to use them to process responses before sending a response, see [Response headers](/docs/headers/response-headers).

## Cache-Control header

To learn about the cache-control headers sent to each Vercel deployment and how to use them to control the caching behavior of your application, see [Cache-Control headers](/docs/headers/cache-control-headers).

## More resources

- [Set Caching Header](/kb/guide/set-cache-control-headers)


---

[View full sitemap](/docs/sitemap)
