---
title: Inspecting your Open Graph metadata
product: vercel
url: /docs/deployments/og-preview
type: how-to
prerequisites:
  - /docs/deployments
related:
  - /docs/deployments/deployment-protection
  - /docs/dashboard-features
  - /docs/og-image-generation
summary: Learn how to inspect and validate your Open Graph metadata through the Open Graph deployment tab.
---

# Inspecting your Open Graph metadata

You can use the **Open Graph** tab on every deployment on Vercel to validate and view your [Open Graph (OG)](https://ogp.me/ "Open Graph (OG)") data across a range of social media sites before you share it out. Routes using [Deployment Protection](/docs/deployments/deployment-protection) can also be inspected.

To view your data:

1. Choose your account or team from the [scope selector](/docs/dashboard-features#scope-selector)
2. Select your project and go to the **Deployments** tab
3. From the **Deployments** tab, select the deployment you wish to view the metadata for
4. Select the Open Graph tab:

   ![Image](`/docs-assets/static/docs/concepts/deployments/og-tab-light.png`)
5. From here, you can view the metadata and a preview for [Twitter](/docs/deployments/og-preview#twitter-specific-metadata), Slack, Facebook, and LinkedIn for [specific pages](/docs/deployments/og-preview#filter-by-pathname) in your deployment

## Filter by pathname

You can use the **Path** dropdown to view the OG card for any page on that particular deployment.

## Metadata

These properties set by the [Open Graph protocol](https://ogp.me/#metadata).

| Property         | Value                                                                   | Description                                                                                  |
| ---------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `title`          | The title tag used to name the page. 70 characters max.                 | This is used by default if no other values are passed.                                       |
| `description`    | The meta.description tag used to describe the page. 200 characters max. | This is used by default if no other values are passed.                                       |
| `og:image`       | Absolute URL to image.                                                  | Use the [OG Image Generation](/docs/og-image-generation) documentation to create new images. |
| `og:title`       | A title for link previews.                                              | You can use this to override the meta title if you want the OG title to be different.        |
| `og:description` | A one to two sentence description for link previews.                    | You can use this to override the meta description if you want the OG title to be different.  |
| `og:url`         | A canonical URL for link previews.                                      | You should provide the absolute URL.                                                         |

```html filename="index.js"
<div>
  <head>
    <meta name="og:title" content="Vercel CDN" />
    <meta name="og:description" content="Vercel CDN" />
    <meta name="og:image" content={ // Because OG images must have a absolute
    URL, we use the // `VERCEL_URL` environment variable to get the deployment’s
    URL. // More info: // https://vercel.com/docs/environment-variables
    `${ process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''
    }/api/vercel` } />
    <meta
      name="og:url"
      content="https://vercel.com/docs/cdn"
    />
  </head>
  <h1>A page with Open Graph Image.</h1>
</div>
```

### Twitter-specific metadata

| Property              | `content` value                                                                               | Additional information                                |
| --------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `twitter:image`       | A URL to an image file or to a dynamically generated image. `og:image` is used as a fallback. | `JPG`,`PNG`, `WEBP` and `GIF`. `SVG` is not supported |
| `twitter:card`        | The type of card used for Twitter link previews                                               | `summary`, `summary_large_image`, `app`, or `player`  |
| `twitter:title`       | A string that shows for Twitter link previews. `og:title` is used as a fallback.              | 70 characters max                                     |
| `twitter:description` | A description for Twitter link previews. `og:description` is used as a fallback.              | 200 characters max                                    |

```html filename="index.js"
<div>
  <head>
    <meta name="twitter:title" content="Vercel CDN for Twitter" />
    <meta name="twitter:description" content="Vercel CDN for Twitter" />
    <meta
      name="twitter:image"
      content="https://og-examples.vercel.sh/api/static"
    />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <h1>A page with Open Graph Image.</h1>
</div>
```


---

[View full sitemap](/docs/sitemap)
