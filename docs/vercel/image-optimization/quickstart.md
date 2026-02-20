---
title: Getting started with Image Optimization
product: vercel
url: /docs/image-optimization/quickstart
type: tutorial
prerequisites:
  - /docs/image-optimization
related:
  - /docs/cdn
  - /docs/image-optimization/limits-and-pricing
  - /docs/image-optimization/managing-image-optimization-costs
summary: Learn how you can leverage Vercel Image Optimization in your projects.
---

# Getting started with Image Optimization

This guide will help you get started with using Vercel Image Optimization in your project, showing you how to import images, add the required props, and deploy your app to Vercel. Vercel Image Optimization works out of the box with Next.js, Nuxt, SvelteKit, and Astro.

## Prerequisites

- A Vercel account. If you don't have one, you can [sign up for free](https://vercel.com/signup).
- A Vercel project. If you don't have one, you can [create a new project](https://vercel.com/new).
- The Vercel CLI installed. If you don't have it, you can install it using the following command:
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

- ### Import images
  > For \['astro']:
  To use Astro, you must:
  1. Enable [Vercel's image service](https://docs.astro.build/en/guides/integrations-guide/vercel/#imageservice) in&#x20;

     ```js filename="astro.config.mjs" framework=all
     import { defineConfig } from 'astro/config';
     import vercel from '@astrojs/vercel/static';

     export default defineConfig({
       output: 'server',
       adapter: vercel({
         imageService: true,
       }),
     });
     ```

     ```ts filename="astro.config.mjs" framework=all
     import { defineConfig } from 'astro/config';
     import vercel from '@astrojs/vercel/static';

     export default defineConfig({
       output: 'server',
       adapter: vercel({
         imageService: true,
       }),
     });
     ```

  2. Use Astro's built-in `Image` component:

     ```jsx filename="src/components/MyComponent.astro" framework=all
     ---
     // import the Image component and the image
     import { Image } from 'astro:assets';
     import myImage from "../assets/my_image.png"; // Image is 1600x900
     ---

     {/* `alt` is mandatory on the Image component */}
     <Image src={myImage} alt="A description of my image." />
     ```

     ```tsx filename="src/components/MyComponent.astro" framework=all
     ---
     // import the Image component and the image
     import { Image } from 'astro:assets';
     import myImage from "../assets/my_image.png"; // Image is 1600x900
     ---

     {/* `alt` is mandatory on the Image component */}
     <Image src={myImage} alt="A description of my image." />
     ```
  > For \['nextjs']:
  Next.js provides a built-in [`next/image`](https://nextjs.org/docs/pages/api-reference/components/image) component.
  ```js filename="pages/index.js" framework=all
  import Image from 'next/image';
  ```
  ```ts filename="pages/index.ts" framework=all
  import Image from 'next/image';
  ```
  > For \['sveltekit']:
  To use SvelteKit, use [`@sveltejs/adapter-vercel`](https://kit.svelte.dev/docs/adapter-vercel) within your  file.
  ```js filename="svelte.config.js" framework=all
  import adapter from '@sveltejs/adapter-vercel';

  export default {
    kit: {
      adapter({
        images: {
          sizes: [640, 828, 1200, 1920, 3840],
          formats: ['image/avif', 'image/webp'],
          minimumCacheTTL: 300,
          domains: ['example-app.vercel.app'],
        }
      })
    }
  };
  ```
  ```ts filename="svelte.config.ts" framework=all
  import adapter from '@sveltejs/adapter-vercel';

  export default {
    kit: {
      adapter({
        images: {
          sizes: [640, 828, 1200, 1920, 3840],
          formats: ['image/avif', 'image/webp'],
          minimumCacheTTL: 300,
          domains: ['example-app.vercel.app'],
        }
      })
    }
  };
  ```
  This allows you to specify [configuration options](https://vercel.com/docs/build-output-api/v3/configuration#images) for Vercel's native image optimization API.

  You have to construct your own `srcset` URLs to use image optimization with SvelteKit. You can create a library function that will optimize `srcset` URLs in production for you like this:
  ```js filename="src/lib/image.js" framework=all
  import { dev } from '$app/environment';

  export function optimize(src, widths = [640, 960, 1280], quality = 90) {
    if (dev) return src;

    return widths
      .slice()
      .sort((a, b) => a - b)
      .map((width, i) => {
        const url = `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
        const descriptor = i < widths.length - 1 ? ` ${width}w` : '';
        return url + descriptor;
      })
      .join(', ');
  }
  ```
  ```ts filename="src/lib/image.ts" framework=all
  import { dev } from '$app/environment';

  export function optimize(src: string, widths = [640, 960, 1280], quality = 90) {
    if (dev) return src;

    return widths
      .slice()
      .sort((a, b) => a - b)
      .map((width, i) => {
        const url = `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
        const descriptor = i < widths.length - 1 ? ` ${width}w` : '';
        return url + descriptor;
      })
      .join(', ');
  }
  ```
  > For \['nextjs-app']:
  Next.js provides a built-in [`next/image`](https://nextjs.org/docs/app/api-reference/components/image) component.
  ```js filename="app/example/page.jsx" framework=all
  import Image from 'next/image';
  ```
  ```ts filename="app/example/page.tsx" framework=all
  import Image from 'next/image';
  ```
  > For \['nuxt']:
  Install the `@nuxt/image` package:

  Then, add the module to the `modules` array in your Nuxt config:
  ```js filename="nuxt.config.js" framework=all
  export default defineNuxtConfig({
    modules: ['@nuxt/image'],
  });
  ```
  ```ts filename="nuxt.config.ts" framework=all
  export default defineNuxtConfig({
    modules: ['@nuxt/image'],
  });
  ```
  When you deploy to Vercel, the Vercel provider will be automatically enabled by default. **Vercel requires you to explicitly list all the widths used in your app** for proper image resizing:
  ```js filename="nuxt.config.js" framework=all
  export default defineNuxtConfig({
    modules: ['@nuxt/image'],
    image: {
      // You must specify every custom width used in <NuxtImg>, <NuxtPicture> or $img
      screens: {
        xs: 320,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        xxl: 1536,
        // Add any custom widths used in your components
        avatar: 40,
        avatar2x: 80,
        hero: 1920,
      },
      // Whitelist external domains for images not in public/ directory
      domains: ['example.com', 'images.unsplash.com'],
    },
  });
  ```
  ```ts filename="nuxt.config.ts" framework=all
  export default defineNuxtConfig({
    modules: ['@nuxt/image'],
    image: {
      // You must specify every custom width used in <NuxtImg>, <NuxtPicture> or $img
      screens: {
        xs: 320,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        xxl: 1536,
        // Add any custom widths used in your components
        avatar: 40,
        avatar2x: 80,
        hero: 1920,
      },
      // Whitelist external domains for images not in public/ directory
      domains: ['example.com', 'images.unsplash.com'],
    },
  });
  ```
  **Important:** If a width is not defined in your configuration, the image will fallback to the next bigger width, which may affect performance and bandwidth usage.

  See the [Nuxt Image documentation](https://image.nuxt.com/providers/vercel) for more details on Vercel provider requirements and [configuration options](https://image.nuxt.com/get-started/configuration).

- ### Add the required props
  > For \['astro']:
  The only required props for Astro's `Image` component are `alt` and `src`. All other attributes are enforced automatically if not specified. Given the following `.astro` file:
  ```jsx filename="src/components/MyComponent.astro" framework=all
  ---
  // import the Image component and the image
  import { Image } from 'astro:assets';
  import myImage from "../assets/my_image.png"; // Image is 1600x900
  ---

  {/* `alt` is mandatory on the Image component */}
  <Image src={myImage} alt="A description of my image." />
  ```
  ```tsx filename="src/components/MyComponent.astro" framework=all
  ---
  // import the Image component and the image
  import { Image } from 'astro:assets';
  import myImage from "../assets/my_image.png"; // Image is 1600x900
  ---

  {/* `alt` is mandatory on the Image component */}
  <Image src={myImage} alt="A description of my image." />
  ```
  The output would look like this:
  ```tsx filename="src/components/MyComponent.astro" framework=all
  {
    /* Output */
  }
  {
    /* Image is optimized, proper attributes are enforced */
  }
  <img
    src="/_astro/my_image.hash.webp"
    width="1600"
    height="900"
    decoding="async"
    loading="lazy"
    alt="A description of my image."
  />;
  ```
  ```jsx filename="src/components/MyComponent.astro" framework=all
  {
    /* Output */
  }
  {
    /* Image is optimized, proper attributes are enforced */
  }
  <img
    src="/_astro/my_image.hash.webp"
    width="1600"
    height="900"
    decoding="async"
    loading="lazy"
    alt="A description of my image."
  />;
  ```
  > For \['nextjs']:
  This component takes the following [required props](https://nextjs.org/docs/pages/api-reference/components/image#required-props):
  - `src`: The URL of the image to be loaded
  - `alt`: A short description of the image
  - `width`: The width of the image
  - `height`: The height of the image
  When using [local images](https://nextjs.org/docs/pages/building-your-application/optimizing/images#local-images "Local images") you **do not** need to provide the `width` and `height` props. These values will be automatically determined based on the imported image.

  The below example uses a [remote image](https://nextjs.org/docs/pages/building-your-application/optimizing/images#remote-images "Remote Images") stored in a `/public/images/` folder, and has the `width` and `height` props applied:
  ```js filename="pages/index.jsx" framework=all
  <Image
    src="https://unsplash.com/photos/MpL4w1vb798"
    alt="Picture of a triangle"
    width={500}
    height={500}
  />
  ```
  ```ts filename="pages/index.tsx" framework=all
  <Image
    src="https://unsplash.com/photos/MpL4w1vb798"
    alt="Picture of a triangle"
    width={500}
    height={500}
  />
  ```
  If you have images with URLs that may change frequently, even if the image content remains the same, you might want to avoid optimization. This is often the case with URLs containing unique identifiers or tokens. To disable image optimization for such images, use the [`unoptimized`](https://nextjs.org/docs/pages/api-reference/components/image#unoptimized) prop.

  For more information on all props, caching behavior, and responsive images, visit the [`next/image`](https://nextjs.org/docs/pages/api-reference/components/image) documentation.
  > For \['sveltekit']:
  To use image optimization with SvelteKit, you can use the `img` tag or any image component. Use an optimized `srcset` string generated by your `optimize` function:
  ```tsx filename="src/components/image.svelte" framework=all
  <script lang="ts">
    import { optimize } from '$lib/image';
    import type { Photo } from '$lib/types';

    export let photo: Photo;
  </script>

  <img
    class="absolute left-0 top-0 w-full h-full"
    srcset={optimize(photo.url)}
    alt={photo.description}
  />
  ```
  ```jsx filename="src/components/image.svelte" framework=all
  <script lang="js">
    import { optimize } from '$lib/image';

    export let photo;
  </script>

  <img
    class="absolute left-0 top-0 w-full h-full"
    srcset={optimize(photo.url)}
    alt={photo.description}
  />
  ```
  > For \['nextjs-app']:
  This component takes the following [required props](https://nextjs.org/docs/app/api-reference/components/image#required-props):
  - `src`: The URL of the image
  - `alt`: A short description of the image
  - `width`: The width of the image
  - `height`: The height of the image
  When using [local images](https://nextjs.org/docs/app/building-your-application/optimizing/images#local-images "Local images") you **do not** need to provide the `width` and `height` props. These values will be automatically determined based on the imported image.

  The example below uses a [remote image](https://nextjs.org/docs/app/building-your-application/optimizing/images#remote-images "Remote Images") with the `width` and `height` props applied:
  ```js filename="app/example/page.jsx" framework=all
  <Image
    src="https://images.unsplash.com/photo-1627843240167-b1f9d28f732e"
    alt="Triangular frames arranged concentrically, creating a tunnel against a dark background."
    width={1920}
    height={1080}
  />
  ```
  ```ts filename="app/example/page.tsx" framework=all
  <Image
    src="https://images.unsplash.com/photo-1627843240167-b1f9d28f732e"
    alt="Triangular frames arranged concentrically, creating a tunnel against a dark background."
    width={1920}
    height={1080}
  />
  ```
  If there are some images that you wish to not optimize (for example, if the URL contains a token), you can use the [unoptimized](https://nextjs.org/docs/app/api-reference/components/image#unoptimized) prop to disable image optimization on some or all of your images.

  For more information on all props, caching behavior, and responsive images, visit the [`next/image`](https://nextjs.org/docs/app/api-reference/components/image) documentation.
  > For \['nuxt']:
  The `<NuxtImg>` component will automatically optimize your images on demand. It is a wrapper around the `<img>` element, and takes all of its standard props, such as `src` and `alt`. It also takes a set of special props for Image Optimization. You can see the full list in [the Nuxt documentation](https://image.nuxt.com/usage/nuxt-img#props).

  The following example demonstrates a `<NuxtImg>` component with optimization props:
  ```jsx filename="pages/index.vue" framework=all
  <template>
    <NuxtImg
      preset="cover"
      src="/nuxt-icon.png"
      width="100"
      height="100"
      sizes="sm:100vw md:50vw lg:400px"
      provider="static"
      format="webp"
      quality="70"
      modifiers="rounded"
    />
  </template>
  ```
  ```tsx filename="pages/index.vue" framework=all
  <template>
    <NuxtImg
      preset="cover"
      src="/nuxt-icon.png"
      width="100"
      height="100"
      sizes="sm:100vw md:50vw lg:400px"
      provider="static"
      format="webp"
      quality="70"
      modifiers="rounded"
    />
  </template>
  ```

- ### Deploy your app to Vercel
  > For \['nextjs', 'nextjs-app']:
  Push your changes and deploy your Next.js application to Vercel.

  When deployed to Vercel, this component automatically optimizes your images on-demand and serves them from the [Vercel CDN](/docs/cdn).
  > For \['sveltekit']:
  Push your changes and deploy your SvelteKit application to Vercel.

  Your images that use optimized `src` URLs will leverage Vercel's on-demand image optimization. Images get served from the [Vercel CDN](/docs/cdn).
  > For \['astro']:
  Push your changes and deploy your Astro application to Vercel.

  When deployed to Vercel, this component automatically optimizes your images on-demand and serves them from the [Vercel CDN](/docs/cdn).
  > For \['nuxt']:
  When you deploy your Nuxt application to Vercel, the Vercel provider will be automatically enabled by default and use Vercel's CDN for on-demand image optimization.

  The `<NuxtImg>` components will automatically optimize your images and serve them from the [Vercel CDN](/docs/cdn). Make sure you have configured the required image widths and whitelisted any external domains as shown in the configuration above.

  For more information on usage with external URLs and customizing your images on demand, visit the [`@nuxt/image`](https://image.nuxt.com/providers/vercel) documentation.

## Next steps

Now that you've set up Vercel Image Optimization, you can explore the following:

- [Explore limits and pricing](/docs/image-optimization/limits-and-pricing)
- [Managing costs](/docs/image-optimization/managing-image-optimization-costs)


---

[View full sitemap](/docs/sitemap)
