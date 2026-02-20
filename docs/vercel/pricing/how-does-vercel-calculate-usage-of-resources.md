---
title: Calculating usage of resources
product: vercel
url: /docs/pricing/how-does-vercel-calculate-usage-of-resources
type: conceptual
prerequisites:
  - /docs/pricing
related:
  - /docs/pricing
  - /docs/incremental-static-regeneration
  - /docs/runtime-cache
  - /docs/marketplace-storage
  - /docs/routing-middleware
summary: Understand how Vercel measures and calculates your resource usage based on a typical user journey.
---

# Calculating usage of resources

It's important to understand how usage and accrual happen on Vercel, in order to make the best choices for your project. This guide helps you understand that by exploring a user journey through an ecommerce store.

You'll learn how resources are used at each stage of the journey, from entering the site, to browsing products, interacting with dynamic content, and engaging with A/B testing for personalized content.

## Understanding Vercel resources

> **💡 Note:** The scenarios and resource usage described in this guide are for illustrative
> purposes only.

Usage is accrued as users visit your site. Vercel's framework-defined infrastructure determines how your site renders and how your costs accrue, based on the makeup of your application code, and the framework you use.

A typical user journey through an ecommerce store touches on multiple resources used in Vercel's [managed infrastructure](/docs/pricing#managed-infrastructure).

The ecommerce store employs a combination of caching strategies to optimize both static and dynamic content delivery. For static pages, it uses [Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration).

For dynamic content like product price discounts, the site uses [Vercel Runtime Cache](/docs/runtime-cache) to store and retrieve the latest product information. This ensures that all users see the most up-to-date pricing information, while minimizing the need to fetch data from the backend on each request.

For dynamic, user-specific content like shopping cart states, [Vercel Marketplace Redis integrations](/docs/marketplace-storage) are used. This allows the site to store and retrieve user-specific data in real-time, ensuring a seamless experience across sessions.

The site also uses [Middleware](/docs/routing-middleware) to A/B test a product carousel, showing different variants to different users based on their behavior or demographics.

The following sections outline the resources used at each stage of the user journey.

### 1. User enters the site

![Image](https://vercel.com/front/docs/pricing/enters-site-light.png)

The browser requests the page from Vercel. Since it's static and cached on our global [CDN](/docs/cdn), this only involves [Edge Requests](/docs/manage-cdn-usage#edge-requests) (the network requests required to get the content of the page) and [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) (the amount of content sent back to the browser).

**Priced resources**

- :
  Charged per network request to the CDN
- :
  Charged based on data moved to the user from the CDN

### 2. Product browsing

![Image](https://vercel.com/front/docs/pricing/browse-products-light.png)

During the user's visit to the site, they browse the **All Products** page, which is populated with a list of cached product images and price details. The request to view the page triggers an [Edge Request](/docs/manage-cdn-usage#edge-requests) to Vercel's CDN, which serves the static assets from the [cache](/docs/cdn-cache).

**Priced resources**

- :
  Charged for network requests to fetch product images/details
- :
  Data movement charges from CDN to the user

### 3. Viewing updated product details

![Image](https://vercel.com/front/docs/pricing/updated-product-light.png)

The user decides to view the details of a product. This product's price was recently updated and the first view of the page shows the stale content from the cache due to the revalidation period having ended.

Behind the scenes the site uses [Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration) to update the products description and image. The new information for the product is then cached on Vercel's [CDN](/docs/cdn) for future requests, and the revalidation period is reset.

For products with real-time discounts, these discounts are calculated using a [Vercel Function](/docs/functions) that fetches the latest product information from the backend. The results, which include any standard discounts applicable to all users, are cached using the [Vercel Runtime Cache](/docs/runtime-cache).

Upon viewing a product, if the discount data is already in the Data Cache and still fresh, it will be served from there. If the data is stale, it will be re-fetched and cached again for future requests. This ensures that all users see the most up-to-date pricing information.

**Priced resources**

- :
  Network request charges for fetching updated product information
- :
  Charges for activating a function to update content
- :
  CPU runtime charges for the function processing the update

### 4. Dynamic interactions (Cart)

![Image](https://vercel.com/front/docs/pricing/dynamic-cart-light.png)

The user decides to add a product to their cart. The cart is a dynamic feature that requires real-time updates. When the user adds an item to their cart, [Vercel Marketplace Redis integrations](/docs/marketplace-storage) are used to store the cart state. If the user leaves and returns to the site, the cart state is retrieved from the Redis store, ensuring a seamless experience across sessions.

**Priced resources**

- :
  Network request charges for cart updates
- :
  Function activation charges for managing cart logic
- :
  CPU runtime charges for the function processing the cart logic
- :
  Data movement charges for fetching cart state from the cache
- Redis Requests: Charges for reading and writing cart state to the Redis store
- Redis Storage: Charges for storing cart state in the Redis store
- Redis Data Transfer: Data movement charges for fetching cart state from the Redis store

### 5. Engaging with A/B testing for personalized content

![Image](https://vercel.com/front/docs/pricing/a-b-test-light.png)

Having added an item to the cart, the user decides to continue browsing the site. They scroll to the bottom of the page and are shown a product carousel. This carousel is part of an A/B test using [Middleware](/docs/routing-middleware), and the user is shown a variant based on their behavior or demographics.

**Priced resources**

- :
  Network request charges for delivering test variants

## Summary and next steps

Throughout the user journey through the site, a variety of resources are used from Vercel's [managed infrastructure](/docs/pricing#managed-infrastructure). When thinking about how to optimize resource consumption, it's important to consider how each resource is triggered and how it accrues usage over time and across different user interactions.

To learn more about each of the resources used in this guide, see the [managed infrastructure billable resources](/docs/pricing#managed-infrastructure-billable-resources) documentation. To learn about how to optimize resource consumption, see the [Manage and optimize usage](/docs/pricing/manage-and-optimize-usage) guide.

## More resources

For more information on Vercel's pricing, guidance on optimizing consumption, and invoices, see the following resources:

- [Learn about Vercel's pricing model and how it works](/docs/pricing)
- [Learn how Vercel usage is calculated and how it accrues](/docs/pricing/manage-and-optimize-usage)
- [Learn how to understand your Vercel invoice](/docs/pricing/understanding-my-invoice)


---

[View full sitemap](/docs/sitemap)
