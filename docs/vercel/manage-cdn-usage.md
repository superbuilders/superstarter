---
title: Manage and optimize CDN usage
product: vercel
url: /docs/manage-cdn-usage
type: reference
prerequisites:
  []
related:
  - /docs/image-optimization
  - /docs/observability/monitoring/monitoring-reference
  - /docs/image-optimization/managing-image-optimization-costs
  - /docs/pricing/regional-pricing
  - /docs/cdn
summary: Learn how to understand the different charts in the Vercel dashboard. Learn how usage relates to billing, and how to optimize your usage for CDN.
---

# Manage and optimize CDN usage

The **Networking** section shows the following metrics:

![Image](https://vercel.com/front/docs/cdn/site-cdn-data-light.png)

## Top Paths

**Top Paths** displays the paths that consume the most resources on your team. These are resources such as bandwidth, execution, invocations, and requests.

This section helps you find ways to optimize your project.

### Managing Top Paths

In the compact view, you can view the top ten resource-consuming paths in your projects.

You can filter these by:

- **Bandwidth**
- **Execution**
- **Invocations**
- or **Requests**

Select the **View** button to view a full page, allowing you to apply filters such as billing cycle, date, or project.

### Using Top Paths and Monitoring

Using **Top Paths** you can identify and optimize the most resource-intensive paths within your project. This is particularly useful for paths showing high bandwidth consumption.

When analyzing your bandwidth consumption you may see a path that ends with `_next/image`. The path will also detail a consumption value, for example, 100 GB. This would mean your application is serving a high amount of image data through Vercel's [Image Optimization](/docs/image-optimization).

To investigate further, you can:

1. Navigate to the **Monitoring** tab and select the **Bandwidth by Optimized Image** example query from the left navigation
2. Select the **Edit Query** button and edit the **Where** clause to filter by `host = 'my-site.com'`. The full query should look like `request_path = '/_next/image' OR request_path = '/_vercel/image' and host = 'my-site.com'` replacing `my-site.com` with your domain

This will show you the bandwidth consumption of images served through Vercel's Image Optimization for your project hosting the domain `my-site.com`.

Remove filters to get a better view of image optimization usage across all your projects. You can remove the `host = 'my-site.com'` filter on the **Where** clause. Use the host field on the **Group By** clause to filter by all your domains.

For a breakdown of the available clauses, fields, and variables that you can use to construct a query, see the [Monitoring Reference](/docs/observability/monitoring/monitoring-reference) page.

For more guidance on optimizing your image usage, see [managing image optimization and usage costs](/docs/image-optimization/managing-image-optimization-costs).

## Fast Data Transfer

When a user visits your site, the data transfer between Vercel's CDN and the user's device gets measured as Fast Data Transfer. The data transferred gets measured based on data volume transferred, and can include assets such as your homepage, images, and other static files.

Fast Data transfer usage incurs alongside [Edge Requests](#edge-requests) every time a user visits your site, and is [priced regionally](/docs/pricing/regional-pricing).

### Optimizing Fast Data Transfer

The **Fast Data Transfer** chart on the **Usage** tab of your dashboard shows the incoming and outgoing data transfer of your projects.

- The **Direction** filter allows you to see the data transfer direction (incoming or outgoing)
- The **Projects** filter allows you to see the data transfer of a specific project
- The **Regions** filter allows you to see the data transfer of a specific region. This is can be helpful due to the nature of [regional pricing and Fast Data Transfer](/docs/pricing/regional-pricing)

As with all charts on the **Usage** tab, you can select the caret icon to view the chart as a full page.

To optimize Fast Data Transfer, you must optimize the assets that are being transferred. You can do this by:

- **Using Vercel's Image Optimization**: [Image Optimization](/docs/image-optimization) on Vercel uses advanced compression and modern file formats to reduce image and video file sizes. This decreases page load times and reduces Fast Data Transfer costs by serving optimized media tailored to the requesting device
- **Analyzing your bundles**: See your preferred frameworks documentation for guidance on how to analyze and reduce the size of your bundles. For Next.js, see the [Bundle Analyzer](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer) guide

Similar to **Top Paths**, you can use the **Monitoring** tab to further analyze the data transfer of your projects. See the [**Using Top Paths and Monitoring**](#using-top-paths-and-monitoring) section for an example of how to use **Monitoring** to analyze large image data transfer.

### Calculating Fast Data Transfer

Fast Data Transfer is calculated based on the full size of each HTTP request and response transmitted to or from Vercel's [CDN](/docs/cdn). This includes the body, all headers, the full URL and any compression. Incoming data transfer corresponds to the request, and outgoing corresponds to the response.

## Fast Origin Transfer

Fast Origin Transfer is incurred when using any of Vercel's compute products. These include Vercel Functions, Middleware, and the Data Cache (used through ISR).

### Calculating Fast Origin Transfer

Usage is incurred on both the input and output data transfer when using compute on Vercel. For example:

- **Incoming:** The number of bytes sent as part of the [HTTP Request (Headers & Body)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages#http_requests).
  - For common `GET` requests, the incoming bytes are normally inconsequential (less than 1KB for a normal request).
  - For `POST` requests, like a file upload API, the incoming bytes would include the entire uploaded file.
- **Outgoing:** The number of bytes sent as the [HTTP Response (Headers & Body)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages#http_responses).

### Optimizing Fast Origin Transfer

#### Functions

> **💡 Note:** When using Incremental Static Regeneration (ISR) on Vercel, a Vercel Function
> is used to generate the static page. This optimization section applies for
> both server-rendered function usage, as well as usage for ISR. ISR usage on
> Vercel is billed under the Vercel Data Cache.

If using Vercel Functions, you can optimize Fast Origin Transfer by reducing the size of the response. Ensure your Function is only responding with relevant data (no extraneous API fields).

You can also add [caching headers](/docs/cdn-cache) to the function response. By caching the response, future requests serve from the CDN Cache, rather than invoking the function again. This reduces Fast Origin Transfer usage and improves performance.

Ensure your Function supports `If-Modified-Since` or `Etag` to prevent duplicate data transmission ([on by default for Next.js applications](https://nextjs.org/docs/app/api-reference/next-config-js/generateEtags)).

#### Middleware

If using Middleware, it is possible to accrue Fast Origin Transfer twice for a single Function request. To prevent this, you want to only run Middleware when necessary. For example, Next.js allows you to set a [matcher](https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher) to restrict what requests run Middleware.

#### Investigating usage

- Look at the Fast Origin Transfer section of the Usage page:
  - Observe incoming vs outgoing usage. Reference the list above for optimization tips.
  - Observe the breakdown by project.
  - Observe the breakdown by region (Fast Origin Transfer is [priced regionally](#fast-origin-transfer))
- If optimizing Outgoing Fast Origin Transfer:
  - Observe the Top Paths on the Usage page
  - Filter by invocations to see which specific compute is being accessed most

## Edge Requests

When visiting your site, requests are made to a Vercel CDN [region](/docs/pricing/regional-pricing). Traffic is routed to the nearest region to the visitor. Static assets and functions all incur Edge Requests.

> **💡 Note:** Requests to regions are not only for Functions using the edge runtime. Edge
> Requests are for all requests made to your site, including static assets and
> functions.

### Managing Edge Requests

You can view the **Edge Requests** chart on the **Usage** tab of your dashboard. This chart shows:

- **Count**: The total count of requests made to your deployments
- **Projects**: The projects that received the requests
- **Region**: The region where the requests are made

As with all charts on the **Usage** tab, you can select the caret icon to view the chart in full screen mode.

### Optimizing Edge Requests

Frameworks such as [Next.js](/docs/frameworks/nextjs), [SvelteKit](/docs/frameworks/sveltekit), [Nuxt](/docs/frameworks/nuxt), and others help build applications that automatically reduce unnecessary requests.

The most significant opportunities for optimizing Edge Requests include:

- **Identifying frequent re-mounting**: If your application involves rendering a large number of images and re-mounts them, it can inadvertently increase requests
  - **To identify**: Use your browsers devtools and browse your site. Pay attention to responses with a [304 status code](# "What is 304 status code?") on repeated requests paths. This indicates content that has been fetched multiple times
- **Excessive polling or data fetching**: Applications that poll APIs for live updates, or use tools like SWR or React Query to reload data on user focus can contribute to increased requests

## Edge Request CPU duration

Edge Request CPU Duration is the measurement of CPU processing time per Edge Request. Edge Requests of 10ms or less in duration don't incur any additional charges. CPU Duration is metered in increments of 10ms.

### Managing Edge Request CPU duration

View the **Edge Request CPU Duration** chart on the **Usage** tab of your dashboard. If you notice an increase in CPU Duration, investigate the following aspects of your application:

- Number of routes.
- Number of redirects.
- Complex regular expressions in routing.

To investigate further:

- Identify the deployment where the metric increased.
- Compare rewrites, redirects, and pages to the previous deployment.


---

[View full sitemap](/docs/sitemap)
