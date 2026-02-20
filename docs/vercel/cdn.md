---
title: Vercel CDN overview
product: vercel
url: /docs/cdn
type: conceptual
prerequisites:
  []
related:
  - /docs/regions
  - /docs/redirects
  - /docs/rewrites
  - /docs/headers
  - /docs/cdn-cache
summary: "Vercel's CDN enables you to store content close to your customers and run compute in regions close to your data, reducing latency and improving..."
---

# Vercel CDN overview

Vercel's CDN is a globally distributed platform that stores content near your customers and runs compute in [regions](/docs/regions) close to your data, reducing latency and improving end-user performance.

If you're deploying an app on Vercel, you already use our CDN. These docs will teach you how to optimize your apps and deployment configuration to get the best performance for your use case.

![Image](https://vercel.com/front/docs/edge-network/cdn-pops-light.png)

## Global network architecture

Vercel's CDN is built on a robust global infrastructure designed for optimal performance and reliability:

- **Points of Presence (PoPs)**: Our network includes 126 PoPs distributed worldwide. These PoPs act as the first point of contact for incoming requests and route requests to the nearest region.
- **Vercel Regions**: Behind these PoPs, we maintain 20 compute-capable [regions](/docs/regions) where your code runs close to your data.
- **Private Network**: Traffic flows through private, low-latency connections from PoPs to the nearest region, ensuring fast and efficient data transfer.

This architecture balances the widespread geographical distribution benefits with the efficiency of concentrated caching and computing resources. By maintaining fewer, dense regions, we increase cache hit probabilities while ensuring low-latency access through our extensive PoP network.

## Features

- [**Redirects**](/docs/redirects): Redirects tell the client to make a new request to a different URL. They are useful for enforcing HTTPS, redirecting users, and directing traffic.
- [**Rewrites**](/docs/rewrites): Rewrites change the URL the server uses to fetch the requested resource internally, allowing for dynamic content and improved routing.
- [**Headers**](/docs/headers): Headers can modify the request and response headers, improving security, performance, and functionality.
- [**Caching**](/docs/cdn-cache): Caching stores responses in the CDN, reducing latency and improving performance
- [**Streaming**](/docs/functions/streaming-functions): Streaming enhances your user's perception of your app's speed and performance.
- [**HTTPS / SSL**](/docs/encryption): Vercel serves every deployment over an HTTPS connection by automatically provisioning SSL certificates.
- [**Compression**](/docs/compression): Compression reduces data transfer and improves performance, supporting both gzip and brotli compression.

## Pricing

Vercel's CDN pricing is divided into three resources:

- **Fast Data Transfer**: Data transfer between the Vercel CDN and the user's device.
- **Fast Origin Transfer**: Data transfer between the CDN and Vercel Functions.
- **Edge Requests**: Requests made to the CDN.

![Image](https://vercel.com/front/docs/cdn/site-cdn-data-light.png)

All resources are billed based on usage with each plan having an [included allotment](/docs/pricing). Those on the Pro plan are billed according to additional allotments.

The pricing for each resource is based on the region from which requests to your site come. Use the dropdown to select your preferred region and see the pricing for each resource.

| Resource | Price |
|----------|-------|
| [Fast Origin Transfer](/docs/pricing/regional-pricing) | Regional |
| [Edge Requests](/docs/pricing/regional-pricing) | Regional |


## Usage

The table below shows the metrics for the [**Networking**](/docs/pricing/networking) section of the **Usage** dashboard.

To view information on managing each resource, select the resource link in the **Metric** column. To jump straight to guidance on optimization, select the corresponding resource link in the **Optimize** column.

See the [manage and optimize networking usage](/docs/pricing/networking) section for more information on how to optimize your usage.

## Supported protocols

The CDN supports the following protocols (negotiated with [ALPN](https://tools.ietf.org/html/rfc7301)):

- [HTTPS](https://en.wikipedia.org/wiki/HTTPS)
- [HTTP/1.1](https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol)
- [HTTP/2](https://en.wikipedia.org/wiki/HTTP/2)

## Using Vercel's CDN locally

Vercel supports 35 [frontend frameworks](/docs/frameworks). These frameworks provide a local development environment used to test your app before deploying to Vercel.

Through [framework-defined infrastructure](https://vercel.com/blog/framework-defined-infrastructure), Vercel then transforms your framework build outputs into globally [managed infrastructure](/products/managed-infrastructure) for production.

If you are using [Vercel Functions](/docs/functions) or other compute on Vercel *without* a framework, you can use the [Vercel CLI](/docs/cli) to test your code locally with [`vercel dev`](/docs/cli/dev).

## Using Vercel's CDN with other CDNs

While sometimes necessary, proceed with caution when you place another CDN in front of Vercel:

- Vercel's CDN is designed to deploy new releases of your site without downtime by purging the [CDN Cache](/docs/cdn-cache) globally and replacing the current deployment.
- If you use an additional CDN in front of Vercel, it can cause issues because Vercel has no control over the other provider, leading to the serving of stale content or returning 404 errors.
- To avoid these problems while still using another CDN, we recommend you either configure a short cache time or disable the cache entirely. Visit the documentation for your preferred CDN to learn how to do either option or learn more about [using a proxy](/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment) in front of Vercel.


---

[View full sitemap](/docs/sitemap)
