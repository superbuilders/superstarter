---
title: Draft Mode
product: vercel
url: /docs/draft-mode
type: how-to
prerequisites:
  []
related:
  - /docs/frameworks/nextjs
  - /docs/frameworks/sveltekit
  - /docs/build-output-api/v3
  - /docs/build-output-api/v3/primitives
  - /docs/deployments/environments
summary: "Vercel's Draft Mode enables you to view your unpublished headless CMS content on your site before publishing it."
---

# Draft Mode

Draft Mode lets you view your unpublished headless CMS content on your website rendered with all the normal styling and layout that you would see once published.

Both [Next.js](/docs/frameworks/nextjs#draft-mode) and [SvelteKit](/docs/frameworks/sveltekit#draft-mode) support Draft Mode. Any framework that uses the [Build Output API](/docs/build-output-api/v3) can support Draft Mode by adding the `bypassToken` option to [prerender configuration](/docs/build-output-api/v3/primitives#prerender-functions).

> **💡 Note:** Draft Mode was called Preview Mode before the release of Next.js
> [13.4](https://nextjs.org/blog/next-13-4). The name was changed to avoid
> confusion with [preview
> deployments](/docs/deployments/environments#preview-environment-pre-production),
> which is a different product.

You can use Draft Mode if you:

1. Use [Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration) to fetch and render data from a headless CMS
2. Want to view your unpublished headless CMS content on your site without rebuilding your pages when you make changes
3. Want to protect your unpublished content from being viewed publicly

## How Draft Mode works

Draft Mode allows you to bypass [ISR](/docs/incremental-static-regeneration) caching to fetch the latest CMS content at request time. This is useful for seeing your draft content on your website without waiting for the cache to refresh, or manually revalidating the page.

The process works like this:

1. Each ISR route has a `bypassToken` configuration option, which is assigned a generated, cryptographically-secure value at build time
2. When someone visits an ISR route with a `bypassToken` configured, the page will check for a `__prerender_bypass` cookie
3. If the `__prerender_bypass` cookie exists and has the same value as the `bypassToken` your project is using, the visitor will view the page in Draft Mode

> **💡 Note:** Only team members will be able to view pages in Draft Mode.

## Getting started

> For \['nextjs-app', 'nextjs']:

To use Draft Mode with Next.js on Vercel, you must:

1. [Enable ISR](/docs/incremental-static-regeneration) on pages that fetch content. Using ISR is required on pages that you want to view in Draft Mode
2. Add code to your ISR pages to detect when Draft Mode is enabled and render the draft content
3. Toggle Draft Mode in the Vercel Toolbar by selecting Draft Mode in [the toolbar menu](/docs/vercel-toolbar#using-the-toolbar-menu) to view your draft content. Once toggled, the toolbar will turn purple, indicating that Draft Mode is enabled

   ```tsx filename="app/page.tsx" framework=nextjs-app
   import { draftMode } from 'next/headers';

   async function getContent() {
     const { isEnabled } = await draftMode();

     const contentUrl = isEnabled
       ? 'https://draft.example.com'
       : 'https://production.example.com';

     // This line enables ISR, required for draft mode
     const res = await fetch(contentUrl, { next: { revalidate: 120 } });

     return res.json();
   }

   export default async function Page() {
     const { title, desc } = await getContent();

     return (
       <main>
         <h1>{title}</h1>
         <p>{desc}</p>
       </main>
     );
   }
   ```

   ```jsx filename="app/page.jsx" framework=nextjs-app
   import { draftMode } from 'next/headers';

   async function getContent() {
     const { isEnabled } = await draftMode();

     const contentUrl = isEnabled
       ? 'https://draft.example.com'
       : 'https://production.example.com';

     // This line enables ISR, required for draft mode
     const res = await fetch(contentUrl, { next: { revalidate: 120 } });

     return res.json();
   }

   export default async function Page() {
     const { title, desc } = await getContent();

     return (
       <main>
         <h1>{title}</h1>
         <p>{desc}</p>
       </main>
     );
   }
   ```

   ```tsx filename="pages/example.tsx" framework=nextjs
   export async function getStaticProps(context) {
     const url = context.draftMode
       ? 'https://draft.example.com'
       : 'https://production.example.com';
     const res = await fetch(url);
     return {
       props: {
         posts: await res.json(),
       },
       revalidate: 120,
     };
   }
   ```

   ```jsx filename="pages/example.jsx" framework=nextjs
   export async function getStaticProps(context) {
     const url = context.draftMode
       ? 'https://draft.example.com'
       : 'https://production.example.com';
     const res = await fetch(url);
     return {
       props: {
         posts: await res.json(),
       },
       revalidate: 120,
     };
   }
   ```

See the Next.js docs to learn how to use Draft Mode with self-hosted Next.js projects:

- [App Router](https://nextjs.org/docs/app/building-your-application/configuring/draft-mode)
- [Pages Router](https://nextjs.org/docs/pages/building-your-application/configuring/draft-mode)

> For \['sveltekit']:

To use a SvelteKit route in Draft Mode, you must:

1. Export a `config` object [that enables Incremental Static Regeneration](https://kit.svelte.dev/docs/adapter-vercel#incremental-static-regeneration) from the route's `+page.server` file:

```ts filename="blog/[slug]/+page.server.ts" framework=sveltekit
import { BYPASS_TOKEN } from '$env/static/private';

export const config = {
  isr: {
    // Random token that can be provided to bypass the cached version of the page with a __prerender_bypass=<token> cookie. Allows rendering content at request time for this route.
    bypassToken: BYPASS_TOKEN,

    // Expiration time (in seconds) before the cached asset will be re-generated by invoking the Vercel Function.
    // Setting the value to `false` means it will never expire.
    expiration: 60,
  },
};
```

```js filename="blog/[slug]/+page.server.js" framework=sveltekit
import { BYPASS_TOKEN } from '$env/static/private';

export const config = {
  isr: {
    // Random token that can be provided to bypass the cached version of the page with a __prerender_bypass=<token> cookie. Allows rendering content at request time for this route.
    bypassToken: BYPASS_TOKEN,

    // Expiration time (in seconds) before the cached asset will be re-generated by invoking the Vercel Function.
    // Setting the value to `false` means it will never expire.
    expiration: 60,
  },
};
```

2. Send a `__prerender_bypass` cookie with the same value as `bypassToken` in your config.

To render the draft content, SvelteKit will check for `__prerender_bypass`. If its value matches the value of `bypassToken`, it will render content fetched at request time rather than prebuilt content.

Once implemented, team members can access Draft Mode from the Vercel Toolbar by selecting the eye icon . Once selected, the toolbar will turn purple to indicate that Draft Mode is enabled.

## Sharing drafts

To share a draft URL, it must have the `?__vercel_draft=1` query parameter. For example:

```bash
https://my-site.com/blog/post-01?__vercel_draft=1
```

Viewers outside your Vercel team cannot enable Draft Mode or see your draft content, even with a draft URL.


---

[View full sitemap](/docs/sitemap)
