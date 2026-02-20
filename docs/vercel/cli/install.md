---
title: vercel install
product: vercel
url: /docs/cli/install
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/integrations/create-integration
  - /docs/integrations/marketplace-product
summary: Learn how to install native integrations with the vercel install CLI command.
---

# vercel install

The `vercel install` command is used to install a [native integration](/docs/integrations/create-integration#native-integrations) with the option of [adding a product](/docs/integrations/marketplace-product#create-your-product) to an existing installation.

If you have not installed the integration before, you will asked to open the Vercel dashboard and accept the Vercel Marketplace terms. You can then decide to continue and add a product through the dashboard or cancel the product addition step.

If you have an existing installation with the provider, you can add a product directly from the CLI by answering a series of questions that reflect the choices you would make in the dashboard.

## Usage

```bash filename="terminal"
vercel install acme
```

*Using the vercel install command install the ACME
integration.*

You can get the value of `acme` by looking at the slug of the integration provider from the marketplace URL. For example, for `https://vercel.com/marketplace/gel`, `acme` is `gel`.


---

[View full sitemap](/docs/sitemap)
