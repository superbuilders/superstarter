---
title: Vercel and Shopify Integration
product: vercel
url: /docs/integrations/ecommerce/shopify
type: tutorial
prerequisites:
  - /docs/integrations/ecommerce
  - /docs/integrations
related:
  - /docs/incremental-static-regeneration
  - /docs/environment-variables
summary: Integrate Vercel with Shopify to deploy your headless storefront.
---

# Vercel and Shopify Integration

[Shopify](https://www.shopify.com/) is an ecommerce platform that allows you to build and manage online storefronts. Shopify does offer themes, but this integration guide will explain how to deploy your own, highly-performant, custom headless storefront using Next.js on Vercel's Frontend Cloud.

This guide uses the [Next.js Commerce template](/templates/ecommerce/nextjs-commerce) to connect your Shopify store to a Vercel deployment. When you use this template, you'll be automatically prompted to connect your Shopify storefront during deployment.

To finish, the important parts that you need to know are:

- [Configure Shopify for use as a headless CMS](#configure-shopify)
- [Deploy your headless storefront on Vercel](#deploy-to-vercel)
- [Configure environment variables](#configure-environment-variables)

> **💡 Note:** Even if you are not using Next.js Commerce, you can still use this guide as a
> roadmap to create your own headless Shopify theme.

## Getting started

To help you get started, we built a [template](/templates/ecommerce/nextjs-commerce) using Next.js, Shopify, and Tailwind CSS.

You can either deploy the template above to Vercel or use the steps below to clone it to your machine and deploy it locally.

## Configure Shopify

- ### Create a Shopify account and storefront
  If you have an existing Shopify account and storefront, you can use it with the rest of these steps.

  If you do not have an existing Shopify account and storefront, you'll need to [create one](https://www.shopify.com/signup).
  > **💡 Note:** Next.js Commerce will not work with a Shopify Starter plan as it does not
  > allow installation of custom themes, which is required to run as a headless
  > storefront.

- ### Install the Shopify Headless theme
  To use Next.js Commerce as your headless Shopify theme, you need to install the [Shopify Headless theme](https://github.com/instantcommerce/shopify-headless-theme). This enables a seamless flow between your headless site on Vercel and your Shopify hosted checkout, order details, links in emails, and more.

  Download [Shopify Headless Theme](https://github.com/instantcommerce/shopify-headless-theme).

  Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/themes`, click `Add theme`, and then `Upload zip file`.

  Select the downloaded zip file from above, and click the green `Upload file` button.

  Click `Customize`.

  Click `Theme settings` (the paintbrush icon), expand the `STOREFRONT` section, enter your headless store domain, click the gray `Publish` button.

  Confirm the theme change by clicking the green `Save and publish` button.

  The headless theme should now be your current active theme.

- ### Install the Shopify Headless app
  Shopify provides a [Storefront API](https://shopify.dev/docs/api/storefront) which allows you to fetch products, collections, pages, and more for your headless store. By installing the [Headless app](https://apps.shopify.com/headless), you can create an access token that can be used to authenticate requests from your Vercel deployment.

  Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/settings/apps` and click the green `Shopify App Store` button.

  Search for `Headless` and click on the `Headless` app.

  Click the black `Add app` button.

  Click the green `Add sales channel` button.

  Click the green `Create storefront` button.

  Copy the public access token as it will be used when we [configure environment variables](#configure-environment-variables).

  If you need to reference the public access token again, you can navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/headless_storefronts`.

- ### Configure your Shopify branding and design
  Even though you're creating a headless store, there are still a few aspects Shopify will control.
  - Checkout
  - Emails
  - Order status
  - Order history
  - Favicon (for any Shopify controlled pages)
  You can use Shopify's admin to customize these pages to match your brand and design.

- ### Customize checkout, order status, and order history
  Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/settings/checkout` and click the green `Customize` button.

  Click `Branding` (the paintbrush icon) and customize your brand.
  > **💡 Note:** There are three steps / pages to the checkout flow. Use the dropdown to change
  > pages and adjust branding as needed on each page. Click `Save` when you are
  > done.
  Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/settings/branding` and customize settings to match your brand.

- ### Customize emails
  Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/settings/email_settings` and customize settings to match your brand.

- ### Customize favicon
  Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/themes` and click the green `Customize` button.

  Click `Theme settings` (the paintbrush icon), expand the `FAVICON` section, upload favicon, then click the `Save` button.

- ### Configure Shopify webhooks
  Utilizing [Shopify's webhooks](https://shopify.dev/docs/apps/webhooks), and listening for select [Shopify webhook event topics](https://shopify.dev/docs/api/admin-rest/2022-04/resources/webhook#event-topics), you can use Next.js [on-demand revalidation](/docs/incremental-static-regeneration) to keep data fetches indefinitely cached until data in the Shopify store changes.

  Next.js Commerce is pre-configured to listen for the following Shopify webhook events and automatically revalidate fetches.
  - `collections/create`
  - `collections/delete`
  - `collections/update`
  - `products/create`
  - `products/delete`
  - `products/update` (this includes when variants are added, updated, and removed as well as when products are purchased so inventory and out of stocks can be updated)

- ### Create a secret for secure revalidation
  Create your own secret or [generate a random UUID](https://www.uuidgenerator.net/guid).

  This secret value will be used when we [configure environment variables](#configure-environment-variables).

- ### Configure Shopify webhooks in the Shopify admin
  Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/settings/notifications` and add webhooks for all six event topics listed above.

  You can add more sets for other preview urls, environments, or local development. Append `?secret=[your-secret]` to each url, where `[your-secret]` is the secret you created above.

- ### Testing webhooks during local development
  [ngrok](https://ngrok.com) is the easiest way to test webhooks while developing locally.
  - [Install and configure ngrok](https://ngrok.com/download) (you will need to create an account).
  - Run your app locally, `npm run dev`.
  - In a separate terminal session, run `ngrok http 3000`.
  - Use the url generated by ngrok and add or update your webhook urls in Shopify.
  You can now make changes to your store and your local app should receive updates. You can also use the `Send test notification` button to trigger a generic webhook test.

### Using Shopify as a full-featured CMS

Next.js Commerce is fully powered by Shopify in every way. All products, collections, pages header and footer menus, and SEO are controlled by Shopify.

#### Products

Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/products` to manage your products.

- Only `Active` products are shown. `Draft` products will not be shown until they are marked as `Active`.
- `Active` products can still be hidden and not seen by navigating the site, by adding a `nextjs-frontend-hidden` tag on the product. This tag will also tell search engines to not index or crawl the product, but the product will still be directly accessible by url. This feature allows "secret" products to only be accessed by people you share the url with.
- Product options and option combinations are driven from Shopify options and variants. When selecting options on the product detail page, other option and variant combinations will be visually validated and verified for availability, like Amazon does.
- Products that are `Active` but no quantity remaining will still be displayed on the site, but will be marked as "out of stock". The ability to add the product to the cart is disabled.

#### Collections

Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/collections` to manage your collections.

All available collections will show on the search page as filters on the left, with one exception.

Any collection names that start with the word `hidden` will not show up on the headless front end. Next.js Commerce comes pre-configured to look for two hidden collections. Collections were chosen for this over tags so that order of products could be controlled (collections allow for manual ordering).

Create the following collections:

- `Hidden: Homepage Featured Items` — Products in this collection are displayed in the three featured blocks on the homepage.
- `Hidden: Homepage Carousel` — Products in this collection are displayed in the auto-scrolling carousel section on the homepage.

#### Pages

Navigate to `https://[your-shopify-store-subdomain].myshopify.com/admin/pages` to manage your pages.

Next.js Commerce contains a dynamic `[page]` route. It will use the value to look for a corresponding page in Shopify.

- If a page is found, it will display its rich content using [Tailwind's typography plugin](https://tailwindcss.com/docs/typography-plugin) and `prose`.
- If a page is not found, a `404` page is displayed.

#### Navigation menus

`https://[your-shopify-store-subdomain].myshopify.com/admin/menus`

Next.js Commerce's header and footer navigation is pre-configured to be controlled by Shopify navigation menus. They can be to collections, pages, external links, and more, giving you full control of managing what displays.

Create the following navigation menus:

- `Next.js Frontend Header Menu` — Menu items to be shown in the headless frontend header.
- `Next.js Frontend Footer Menu` — Menu items to be shown in the headless frontend footer.

#### SEO

Shopify's products, collections, pages, etc. allow you to create custom SEO titles and descriptions. Next.js Commerce is pre-configured to display these custom values, but also comes with sensible fallbacks if they are not provided.

## Deploy to Vercel

Now that your Shopify store is configured, you can deploy your code to Vercel.

### Clone the repository

You can clone the repo using the following command:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i 
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i 
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i 
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i 
    ```
  </Code>
</CodeBlock>

### Publish your code

Publish your code to a Git provider like GitHub.

```shell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-account/your-repo
git push -u origin main
```

### Import your project

Import the repository into a [new Vercel project](/new).

Vercel will automatically detect you are using Next.js and configure the optimal build settings.

### Configure environment variables

Create [Vercel Environment Variables](/docs/environment-variables) with the following names and values.

- `COMPANY_NAME` *(optional)* — Displayed in the footer next to the copyright in the event the company is different from the site name, for example `Acme, Inc.`
- `SHOPIFY_STORE_DOMAIN` — Used to connect to your Shopify storefront, for example `[your-shopify-store-subdomain].myshopify.com`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` — Used to secure API requests between Shopify and your headless site, which was created when you [installed the Shopify Headless app](#install-the-shopify-headless-app)
- `SHOPIFY_REVALIDATION_SECRET` — Used to secure data revalidation requests between Shopify and your headless site, which was created when you [created a secret for secure revalidation](#create-a-secret-for-secure-revalidation)
- `SITE_NAME` — Displayed in the header and footer navigation next to the logo, for example `Acme Store`
- `TWITTER_CREATOR` — Used in Twitter OG metadata, for example `@nextjs`
- `TWITTER_SITE` — Used in Twitter OG metadata, for example `https://nextjs.org`

You can [use the Vercel CLI to setup your local development environment variables](/docs/environment-variables#development-environment-variables) to use these values.


---

[View full sitemap](/docs/sitemap)
