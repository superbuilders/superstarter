---
title: @vercel/og Reference
product: vercel
url: /docs/og-image-generation/og-image-api
type: reference
prerequisites:
  - /docs/og-image-generation
related:
  - /docs/recipes/using-custom-font
summary: This reference provides information on how the @vercel/og package works on Vercel.
---

# @vercel/og Reference

The package exposes an `ImageResponse` constructor, with the following parameters:

```ts v0="build" filename="ImageResponse Interface" framework=all
import { ImageResponse } from '@vercel/og'

new ImageResponse(
  element: ReactElement,
  options: {
    width?: number = 1200
    height?: number = 630
    emoji?: 'twemoji' | 'blobmoji' | 'noto' | 'openmoji' = 'twemoji',
    fonts?: {
      name: string,
      data: ArrayBuffer,
      weight: number,
      style: 'normal' | 'italic'
    }[]
    debug?: boolean = false

    // Options that will be passed to the HTTP response
    status?: number = 200
    statusText?: string
    headers?: Record<string, string>
  },
)
```

### Main parameters

| Parameter | Type           | Default | Description                                       |
| --------- | -------------- | ------- | ------------------------------------------------- |
| `element` | `ReactElement` | —       | The React element to generate the image from.     |
| `options` | `object`       | —       | Options to customize the image and HTTP response. |

### Options parameters

| Parameter    | Type                                             | Default               | Description                            |
| ------------ | ------------------------------------------------ | --------------------- | -------------------------------------- |
| `width`      | `number`                                         | `1200`                | The width of the image.                |
| `height`     | `number`                                         | `630`                 | The height of the image.               |
| `emoji`      | `twemoji` `blobmoji` `noto` `openmoji` `twemoji` | The emoji set to use. |
| `debug`      | `boolean`                                        | `false`               | Debug mode flag.                       |
| `status`     | `number`                                         | `200`                 | The HTTP status code for the response. |
| `statusText` | `string`                                         | —                     | The HTTP status text for the response. |
| `headers`    | `Record<string, string>`                         | —                     | The HTTP headers for the response.     |

### Fonts parameters (within options)

| Parameter | Type              | Default | Description             |
| --------- | ----------------- | ------- | ----------------------- |
| `name`    | `string`          | —       | The name of the font.   |
| `data`    | `ArrayBuffer`     | —       | The font data.          |
| `weight`  | `number`          | —       | The weight of the font. |
| `style`   | `normal` `italic` | —       | The style of the font.  |

By default, the following headers will be included by `@vercel/og`:

```javascript filename="included-headers"

'content-type': 'image/png',
'cache-control': 'public, immutable, no-transform, max-age=31536000',

```

## Supported HTML and CSS features

Refer to [Satori's documentation](https://github.com/vercel/satori#documentation) for a list of supported HTML and CSS features.

By default, `@vercel/og` only has the Noto Sans font included. If you need to use other fonts, you can pass them in the `fonts` option. View the [custom font example](/docs/recipes/using-custom-font) for more details.

## Acknowledgements

- [Twemoji](https://github.com/twitter/twemoji)
- [Google Fonts](https://fonts.google.com) and [Noto Sans](https://www.google.com/get/noto/)
- [Resvg](https://github.com/RazrFalcon/resvg) and [Resvg.js](https://github.com/yisibl/resvg-js)


---

[View full sitemap](/docs/sitemap)
