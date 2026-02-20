---
title: Vercel Regions
product: vercel
url: /docs/regions
type: reference
prerequisites:
  []
related:
  - /docs/pricing/regional-pricing
  - /docs/cli/dev
  - /docs/functions/regions
  - /docs/functions/configuring-functions/region
summary: "View the list of regions supported by Vercel's CDN and learn about our global infrastructure."
---

# Vercel Regions

**Vercel's CDN** is a globally distributed platform that stores content and runs compute close to your users and data, reducing latency and improving performance. This page details the [supported regions](#region-list) and explains our global infrastructure.

![Image](https://vercel.com/front/docs/edge-network/cdn-pops-light.png)

## Global infrastructure

Vercel's CDN is built on a sophisticated global infrastructure designed to optimize performance and reliability:

- **Points of Presence (PoPs)**: We operate over 126 PoPs distributed across the globe. These PoPs serve as the first point of contact for incoming requests, ensuring low-latency access for users worldwide.
- **Vercel Regions**: Behind these PoPs, we maintain 20 compute-capable regions where your code can run close to your data.
- **Private Network**: Traffic flows from PoPs to the nearest region through private, low-latency connections, ensuring fast and efficient data transfer.

This architecture balances the benefits of widespread geographical distribution with the efficiency of concentrated caching and compute resources.

### Caching strategy

Our approach to caching is designed to maximize efficiency and performance:

- By maintaining fewer, dense regions, we increase cache hit probability. This means that popular content is more likely to be available in each region's cache.
- The extensive PoP network ensures that users can quickly access regional caches, minimizing latency.
- This concentrated caching strategy results in higher cache hit ratios, reducing the need for requests to go back to the origin server and significantly improving response times.

## Region list

| Region Code | Region Name | Reference Location |
|-------------|-------------|--------------------|
| arn1 | eu-north-1 | Stockholm, Sweden |
| bom1 | ap-south-1 | Mumbai, India |
| cdg1 | eu-west-3 | Paris, France |
| cle1 | us-east-2 | Cleveland, USA |
| cpt1 | af-south-1 | Cape Town, South Africa |
| dub1 | eu-west-1 | Dublin, Ireland |
| dxb1 | me-central-1 | Dubai, United Arab Emirates |
| fra1 | eu-central-1 | Frankfurt, Germany |
| gru1 | sa-east-1 | São Paulo, Brazil |
| hkg1 | ap-east-1 | Hong Kong |
| hnd1 | ap-northeast-1 | Tokyo, Japan |
| iad1 | us-east-1 | Washington, D.C., USA |
| icn1 | ap-northeast-2 | Seoul, South Korea |
| kix1 | ap-northeast-3 | Osaka, Japan |
| lhr1 | eu-west-2 | London, United Kingdom |
| pdx1 | us-west-2 | Portland, USA |
| sfo1 | us-west-1 | San Francisco, USA |
| sin1 | ap-southeast-1 | Singapore |
| syd1 | ap-southeast-2 | Sydney, Australia |
| yul1 | ca-central-1 | Montréal, Canada |


For information on different resource pricing based on region, see the [regional pricing](/docs/pricing/regional-pricing) page.

### Points of Presence (PoPs)

In addition to our 20 compute-capable regions, Vercel's CDN includes 126 PoPs distributed across the globe. These PoPs serve several crucial functions:

1. Request routing: PoPs intelligently route requests to the nearest or most appropriate edge region with single-digit millisecond latency.
2. DDoS protection: They provide a first line of defense against distributed denial-of-service attacks.
3. SSL termination: PoPs handle SSL/TLS encryption and decryption, offloading this work from origin servers.

The extensive PoP network ensures that users worldwide can access your content with minimal latency, even if compute resources are concentrated in fewer regions.

## Local development regions

When you use [the `vercel dev` CLI command to mimic your deployment environment locally](/docs/cli/dev), the region is assigned `dev1` to mimic the Vercel platform infrastructure.

| Region Code | Reference Location |
| ----------- | ------------------ |
| dev1        | localhost          |

## Compute defaults

- Vercel Functions default to running in the `iad1` (Washington, D.C., USA) region. Learn more about [changing function regions](/docs/functions/regions)

Functions should be executed in the same region as your database, or as close to it as possible, [for the lowest latency](/docs/functions/configuring-functions/region).

## Outage resiliency

Vercel's CDN is designed with high availability and fault tolerance in mind:

- In the event of regional downtime, application traffic is automatically rerouted to the next closest region. This ensures that your application remains available to users even during localized outages.
- Traffic will be rerouted to the next closest region in the following order:

**Default region (iad1) failover priority:**

| Priority | Region |
|----------|--------|
| P0 | iad1 |
| P1 | cle1 |
| P2 | yul1 |
| P3 | sfo1 |
| P4 | pdx1 |
| P5 | dub1 |
| P6 | lhr1 |
| P7 | cdg1 |
| P8 | fra1 |
| P9 | bru1 |
| P10 | arn1 |
| P11 | gru1 |
| P12 | hnd1 |
| P13 | kix1 |
| P14 | icn1 |
| P15 | dxb1 |
| P16 | bom1 |
| P17 | syd1 |
| P18 | hkg1 |
| P19 | sin1 |
| P20 | cpt1 |


- For Enterprise customers, Vercel functions can automatically failover to a different region if the region they are running in becomes unavailable. Learn more about [Vercel Function failover](/docs/functions/configuring-functions/region#automatic-failover).

This multi-layered approach to resiliency, combining our extensive PoP network with intelligent routing and regional failover capabilities, ensures high availability and consistent performance for your applications.


---

[View full sitemap](/docs/sitemap)
