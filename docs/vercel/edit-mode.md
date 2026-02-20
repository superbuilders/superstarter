---
title: Edit Mode
product: vercel
url: /docs/edit-mode
type: conceptual
prerequisites:
  []
related:
  - /docs/vercel-toolbar
  - /docs/integrations/cms
summary: "Discover how Vercel's Edit Mode enhances content management for headless CMSs, enabling real-time editing, and seamless collaboration."
---

# Edit Mode

> **🔒 Permissions Required**: Edit Mode

Content editing in CMSs usually occurs separately from the website's layout and design. This separation makes it hard for authors to visualize their changes. Edit Mode allows authors to edit content within the website's context, offering a clearer understanding of the impact on design and user experience. The ability to jump from content to the editing interface further enhances this experience.

## Accessing Edit Mode

To access Edit Mode:

1. Ensure you're logged into the [Vercel Toolbar](/docs/vercel-toolbar) with your Vercel account.
2. Navigate to a page with editable content. The  **Edit Mode** option will only appear in the [Vercel Toolbar](/docs/vercel-toolbar) menu when there are elements on the page matched to fields in the CMS.
3. Select the  **Edit Mode** option in the toolbar menu. This will highlight the editable fields as [Content Links](/docs/edit-mode#content-link), which turn blue as you hover near them.

## Content Link

> **🔒 Permissions Required**: Content Link

Content Link enables you to edit content on websites using headless CMSs by providing links on elements that match a content model in the CMS. This real-time content visualization allows collaborators to make changes without needing a developer's assistance.

You can enable Content Link on a preview deployment by selecting  **Edit Mode** in the [Vercel Toolbar](/docs/vercel-toolbar) menu.

The corresponding model in the CMS determines an editable field. You can hover over an element to display a link in the top-right corner of the element and then select the link to open the related CMS field for editing.

You don't need any additional configuration or code changes on the page to use this feature.

The following CMS integrations support Content Link:

- [Contentful](https://www.contentful.com/developers/docs/tools/vercel/content-source-maps-with-vercel/)
- [Sanity](https://www.sanity.io/docs/vercel-visual-editing)
- [Builder](https://www.builder.io/c/docs/vercel-visual-editing)
- [TinaCMS](https://tina.io/docs/contextual-editing/overview/)
- [DatoCMS](https://www.datocms.com/docs/visual-editing/how-to-use-visual-editing)
- [Payload](https://payloadcms.com/docs/integrations/vercel-visual-editing)
- [Uniform](https://www.uniform.dev/blogs/visual-editing-with-vercel-uniform)
- [Strapi](https://strapi.io/blog/announcing-visual-editing-for-strapi-powered-by-vercel)

See the [CMS integration documentation](/docs/integrations/cms) for information on how to use Content Link with your chosen CMS.


---

[View full sitemap](/docs/sitemap)
