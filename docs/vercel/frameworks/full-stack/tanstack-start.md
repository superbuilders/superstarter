---
title: TanStack Start on Vercel
product: vercel
url: /docs/frameworks/full-stack/tanstack-start
type: conceptual
prerequisites:
  - /docs/frameworks/full-stack
  - /docs/frameworks
related:
  - /docs/functions
  - /docs/fluid-compute
summary: "Learn how to use Vercel's features with TanStack Start."
---

# TanStack Start on Vercel

TanStack Start is a fullstack framework powered by TanStack Router for React and Solid. It has support for full-document SSR, streaming, server functions, bundling and more. TanStack Start works great on Vercel when paired with [Nitro](https://v3.nitro.build/).

## Getting started

You can quickly deploy a TanStack Start application to Vercel by creating a new one below or configuring an existing one with Nitro:

## Nitro Configuration

The [Nitro Vite plugin](https://v3.nitro.build/) allows deploying TanStack Start apps on Vercel, and integrates with Vercel's features.

To set up Nitro in your TanStack app, navigate to the root directory of your TanStack Start project with your terminal and install `nitro` with your preferred package manager:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i nitro
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i nitro
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i nitro
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i nitro
    ```
  </Code>
</CodeBlock>

To configure Nitro with TanStack Start, add the following lines to your `vite.config` file:

```ts {4-4,9-9} filename="/vite.config.ts"
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
})
```

### Vercel Functions

TanStack Start apps on Vercel benefit from the advantages of [Vercel Functions](/docs/functions) and use [Fluid Compute](/docs/fluid-compute) by default. This means your TanStack Start app will automatically scale up and down based on traffic.

## More resources

Learn more about deploying TanStack Start projects on Vercel with the following resources:

- [Explore the TanStack docs](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Learn to use Vercel specific features with Nitro](https://v3.nitro.build/deploy/providers/vercel)


---

[View full sitemap](/docs/sitemap)
