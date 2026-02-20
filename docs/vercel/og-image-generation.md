---
title: Open Graph (OG) Image Generation
product: vercel
url: /docs/og-image-generation
type: conceptual
prerequisites:
  []
related:
  - /docs/functions
  - /docs/deployments/og-preview
  - /docs/functions/runtimes/node-js
  - /docs/og-image-generation/examples
  - /docs/og-image-generation/og-image-api
summary: Learn how to optimize social media image generation through the Open Graph Protocol and @vercel/og library.
---

# Open Graph (OG) Image Generation

To assist with generating dynamic [Open Graph (OG)](https://ogp.me/ "Open Graph (OG)") images, you can use the Vercel `@vercel/og` library to compute and generate social card images using [Vercel Functions](/docs/functions).

## Benefits

- **Performance:** With a small amount of code needed to generate images, [functions](/docs/functions) can be started almost instantly. This allows the image generation process to be fast and recognized by tools like the [Open Graph Debugger](https://en.rakko.tools/tools/9/ "Open Graph Debugger")
- **Straightforward syntax:** You can define your images using HTML and CSS and the library will dynamically generate images from the markup
- **Cost-effectiveness:** `@vercel/og` automatically adds the correct headers to cache computed images on the CDN, helping reduce cost and recomputation

## Supported features

- Basic CSS layouts including flexbox and absolute positioning
- Custom fonts, text wrapping, centering, and nested images
- Ability to download the subset characters of the font from Google Fonts
- Compatible with any framework and application deployed on Vercel
- View your OG image and other metadata before your deployment goes to production through the [Open Graph](/docs/deployments/og-preview) tab

## Runtime support

Vercel OG image generation is supported on the [Node.js runtime](/docs/functions/runtimes/node-js).

Local resources can be loaded directly using `fs.readFile`. Alternatively, `fetch` can be used to load remote resources.

```js filename="og.js"
const fs = require('fs').promises;

const loadLocalImage = async () => {
  const imageData = await fs.readFile('/path/to/image.png');
  // Process image data
};
```

### Runtime caveats

There are limitations when using `vercel/og` with the **Next.js Pages Router** and the Node.js runtime. Specifically, this combination does not support the `return new Response(…)` syntax. The table below provides a breakdown of the supported syntaxes for different configurations.

| Configuration              | Supported Syntax         | Notes                                                              |
| -------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `pages/` + Edge runtime    | `return new Response(…)` | Fully supported.                                                   |
| `app/` + Node.js runtime   | `return new Response(…)` | Fully supported.                                                   |
| `app/` + Edge runtime      | `return new Response(…)` | Fully supported.                                                   |
| `pages/` + Node.js runtime | Not supported            | Does not support `return new Response(…)` syntax with `vercel/og`. |

## Usage

### Requirements

- Install  or newer by visiting [nodejs.org](https://nodejs.org)
- Install `@vercel/og` by running the following command inside your project directory. **This isn't required for Next.js App Router projects**, as the package is already included:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/og
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/og
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/og
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/og
    ```
  </Code>
</CodeBlock>

- For Next.js implementations, make sure you are using Next.js v12.2.3 or newer
- Create API endpoints that you can call from your front-end to generate the images. Since the HTML code for generating the image is included as one of the parameters of the `ImageResponse` function, the use of `.jsx` or `.tsx` files is recommended as they are designed to handle this kind of syntax
- To avoid the possibility of social media providers not being able to fetch your image, it is recommended to add your OG image API route(s) to `Allow` inside your `robots.txt` file. For example, if your OG image API route is `/api/og/`, you can add the following line:
  ```txt filename="robots.txt"
  Allow: /api/og/*
  ```
  If you are using Next.js, review [robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots#static-robotstxt) to learn how to add or generate a `robots.txt` file.

### Getting started

Get started with an example that generates an image from static text using Next.js by setting up a new app with the following command:

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

> For \["nextjs"]:

Create an API endpoint by adding  under the `/pages/api` directory in the root of your project.

> For \["nextjs-app"]:

Create an API endpoint by adding  under the `app/api/og` directory in the root of your project.

> For \["other"]:

Create an API endpoint by adding  under the `api` directory in the root of your project.

Then paste the following code:

```ts v0="build" filename="app/api/og/route.tsx" framework=nextjs-app
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        👋 Hello
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

```js v0="build" filename="app/api/og/route.jsx" framework=nextjs-app
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        👋 Hello
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

```ts v0="build" filename="pages/api/og.tsx" framework=nextjs
import { ImageResponse } from '@vercel/og';

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        👋 Hello 你好 नमस्ते こんにちは สวัสดีค่ะ 안녕 добрий день Hallá
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

```js v0="build" filename="pages/api/og.jsx" framework=nextjs
import { ImageResponse } from '@vercel/og';

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        👋 Hello 你好 नमस्ते こんにちは สวัสดีค่ะ 안녕 добрий день Hallá
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

```ts filename="api/og.tsx" framework=other
import { ImageResponse } from '@vercel/og';

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        👋 Hello
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

```js filename="api/og.jsx" framework=other
import { ImageResponse } from '@vercel/og';

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        👋 Hello
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

> **💡 Note:** If you're not using a framework, you must either add
> `"type": "module"` to your
> `package.json` or change your JavaScript Functions'
> file extensions from `.js` to
> `.mjs`

Run the following command:

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

Then, browse to `http://localhost:3000/api/og`. You will see the following image:

### Consume the OG route

Deploy your project to obtain a publicly accessible path to the OG image API endpoint. You can find an example deployment at <https://og-examples.vercel.sh/api/static>.

Then, based on the [Open Graph Protocol](https://ogp.me/#metadata), create the web content for your social media post as follows:

- Create a `<meta>` tag inside the `<head>` of the webpage
- Add the `property` attribute with value `og:image` to the `<meta>` tag
- Add the `content` attribute with value as the absolute path of the `/api/og` endpoint to the `<meta>` tag

With the example deployment at <https://og-examples.vercel.sh/api/static>, use the following code:

```html filename="index.js"
<head>
  <title>Hello world</title>
  <meta
    property="og:image"
    content="https://og-examples.vercel.sh/api/static"
  />
</head>
```

Every time you create a new social media post, you need to update the API endpoint with the new content. However, if you identify which parts of your `ImageResponse` will change for each post, you can then pass those values as parameters of the endpoint so that you can use the same endpoint for all your posts.

In the examples below, we explore using parameters and including other types of content with `ImageResponse`.

## Examples

- [Dynamic title](/docs/og-image-generation/examples#dynamic-title): Passing the image title as a URL parameter
- [Dynamic external image](/docs/og-image-generation/examples#dynamic-external-image): Passing the username as a URL parameter to pull an external profile image for the image generation
- [Emoji](/docs/og-image-generation/examples#emoji): Using emojis to generate the image
- [SVG](/docs/og-image-generation/examples#svg): Using SVG embedded content to generate the image
- [Custom font](/docs/og-image-generation/examples#custom-font): Using a custom font available in the file system to style your image title
- [Tailwind CSS](/docs/og-image-generation/examples#tailwind-css): Using Tailwind CSS (Experimental) to style your image content
- [Internationalization](/docs/og-image-generation/examples#internationalization): Using other languages in the text for generating your image
- [Secure URL](/docs/og-image-generation/examples#secure-url): Encrypting parameters so that only certain values can be passed to generate your image

## Technical details

- Recommended OG image size: 1200x630 pixels
- `@vercel/og` uses [Satori](https://github.com/vercel/satori) and Resvg to convert HTML and CSS into PNG
- `@vercel/og` [API reference](/docs/og-image-generation/og-image-api)

## Limitations

- Only `ttf`, `otf`, and `woff` font formats are supported. To maximize the font parsing speed, `ttf` or `otf` are preferred over `woff`
- Only flexbox (`display: flex`) and a subset of CSS properties are supported. Advanced layouts (`display: grid`) will not work. See [Satori](https://github.com/vercel/satori)'s documentation for more details on supported CSS properties
- Maximum bundle size of 500KB. The bundle size includes your JSX, CSS, fonts, images, and any other assets. If you exceed the limit, consider reducing the size of any assets or fetching at runtime


---

[View full sitemap](/docs/sitemap)
