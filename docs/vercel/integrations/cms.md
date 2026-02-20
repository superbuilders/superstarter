---
title: Vercel CMS Integrations
product: vercel
url: /docs/integrations/cms
type: how-to
prerequisites:
  - /docs/integrations
related:
  - /docs/integrations/contentful
  - /docs/integrations/sitecore
  - /docs/edit-mode
  - /docs/cli/env
  - /docs/cli
summary: Learn how to integrate Vercel with CMS platforms, including Contentful, Sanity, and Sitecore XM Cloud.
---

# Vercel CMS Integrations

Vercel Content Management System (CMS) Integrations allow you to connect your projects with CMS platforms, including [Contentful](/docs/integrations/contentful), [Sanity](/marketplace/sanity), [Sitecore XM Cloud](/docs/integrations/sitecore) and [more](#featured-cms-integrations). These integrations provide a direct path to incorporating CMS into your applications, enabling you to build, deploy, and leverage CMS-powered features with minimal hassle.

You can use the following methods to integrate your CMS with Vercel:

- [**Environment variable import**](#environment-variable-import): Quickly setup your Vercel project with environment variables from your CMS
- [**Edit Mode through the Vercel Toolbar**](#edit-mode-with-the-vercel-toolbar): Visualize content from your CMS within a Vercel deployments and edit directly in your CMS
  - [**Content Link**](/docs/edit-mode#content-link): Lets you visualize content models from your CMS within a Vercel deployments and edit directly in your CMS
- [**Deploy changes from CMS**](#deploy-changes-from-cms): Connect and deploy content from your CMS to your Vercel site

## Environment variable import

The most common way to setup a CMS with Vercel is by installing an integration through the [Integrations Marketplace](https://vercel.com/integrations#cms). This method allows you to quickly setup your Vercel project with environment variables from your CMS.

Once a CMS has been installed, and a project linked you can pull in environment variables from the CMS to your Vercel project using the [Vercel CLI](/docs/cli/env).

- ### Install the Vercel CLI
  To pull in environment variables from  to your Vercel project, you need to install the [Vercel CLI](/docs/cli). Run the following command in your terminal:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i vercel
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i vercel
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i vercel
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i vercel
      ```
    </Code>
  </CodeBlock>

- ### Install your CMS integration
  Navigate to the  and follow the steps to install the integration.

- ### Pull in environment variables
  Once you've installed the  integration, you can pull in environment variables from  to your Vercel project. In your terminal, run:
  ```bash
  vercel env pull
  ```

See your installed CMSs documentation for next steps on how to use the integration.

## Edit mode with the Vercel Toolbar

To access Edit Mode:

1. Ensure you're logged into the [Vercel Toolbar](/docs/vercel-toolbar) with your Vercel account.
2. Navigate to a page with editable content. The  **Edit Mode** option will only appear in the [Vercel Toolbar](/docs/vercel-toolbar) menu when there are elements on the page matched to fields in the CMS.
3. Select the  **Edit Mode** option in the toolbar menu. This will highlight the editable fields as [Content Links](/docs/edit-mode#content-link), which turn blue as you hover near them.

The following CMS integrations support Content Link:

- [Contentful](https://www.contentful.com/developers/docs/tools/vercel/content-source-maps-with-vercel/)
- [Sanity](https://www.sanity.io/docs/vercel-visual-editing)
- [Builder](https://www.builder.io/c/docs/vercel-visual-editing)
- [TinaCMS](https://tina.io/docs/contextual-editing/overview/)
- [DatoCMS](https://www.datocms.com/docs/visual-editing/how-to-use-visual-editing)
- [Payload](https://payloadcms.com/docs/integrations/vercel-content-link)
- [Uniform](https://www.uniform.dev/blogs/visual-editing-with-vercel-uniform)
- [Strapi](https://strapi.io/blog/announcing-visual-editing-for-strapi-powered-by-vercel)

See the [Edit Mode documentation](/docs/edit-mode) for information on setup and configuration.

## Draft mode through the Vercel Toolbar

Draft mode allows you to view unpublished content from your CMS within a Vercel preview, and works with Next.js and SvelteKit. See the [Draft Mode documentation](/docs/draft-mode) for information and setup and configuration.

## Deploy changes from CMS

This method is generally setup through webhooks or APIs that trigger a deployment when content is updated in the CMS. See your CMSs documentation for information on how to set this up.

## Featured CMS integrations

- [Agility CMS](/docs/integrations/cms/agility-cms)
- [DatoCMS](/docs/integrations/cms/dato-cms)
- [ButterCMS](/docs/integrations/cms/butter-cms)
- [Formspree](/docs/integrations/cms/formspree)
- [Makeswift](/docs/integrations/cms/makeswift)
- [Sanity](/docs/integrations/cms/sanity)
- [Contentful](/docs/integrations/cms/contentful)
- [Sitecore XM Cloud](/docs/integrations/cms/sitecore)


---

[View full sitemap](/docs/sitemap)
