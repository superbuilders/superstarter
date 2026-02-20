---
title: SDKs
product: vercel
url: /docs/flags/vercel-flags/sdks
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags
  - /docs/flags
related:
  - /docs/flags/vercel-flags/sdks/flags-sdk
  - /docs/flags/vercel-flags/sdks/openfeature
  - /docs/flags/vercel-flags/sdks/core
summary: Learn about sdks on Vercel.
---

# SDKs

There are multiple ways to use Vercel Flags, depending on your framework and how much control you need.

## Integration options

## Comparison

| Feature                   | Flags SDK          | OpenFeature          | Core Library  |
| ------------------------- | ------------------ | -------------------- | ------------- |
| Framework support         | Next.js, SvelteKit | Any                  | Any           |
| TypeScript                | Full inference     | Standard types       | Full types    |
| Flags Explorer            | Automatic          | Manual setup         | Manual setup  |
| Precompute (static pages) | Yes                | No                   | No            |
| Best for                  | Most applications  | Provider portability | Custom setups |

## Which should you use?

**Use the Flags SDK** if you're building with Next.js or SvelteKit. It provides the best developer experience with automatic integration for Flags Explorer, precompute for static pages, and framework-specific optimizations.

**Use OpenFeature** if you need a vendor-neutral API that allows switching between flag providers without code changes, or if you're already using OpenFeature in your stack.

**Use the Core Library** if you're working outside of supported frameworks, building custom tooling, or need direct access to the evaluation engine.

## How the SDKs relate to each other

The Flags SDK and OpenFeature are both provider-agnostic — they don't evaluate flags themselves, but instead delegate to a provider. The `@vercel/flags-core` library is that provider for Vercel Flags.

The difference between the Flags SDK and OpenFeature is scope. The Flags SDK is designed for specific frameworks like Next.js and SvelteKit, so it can offer deeper integrations like Flags Explorer and precomputation. OpenFeature is a broader standard that works across languages and frameworks, but leaves those framework-specific capabilities to you.

Both have adapters that connect them to `@vercel/flags-core`: `@flags-sdk/vercel` for the Flags SDK, and `@vercel/flags-core/openfeature` for OpenFeature.

## Environment variables

All integration methods use the same environment variables:

- **`FLAGS`**: Connection string that identifies your Vercel Flags project. Vercel automatically sets this with different values for Production, Preview, and Development environments.
- **`FLAGS_SECRET`**: Secret key used by Flags Explorer for secure overrides. Required if you want to use Flags Explorer.

When you create your first flag in the Vercel Dashboard, these variables are automatically added to your project.

## Next steps

- [Get started with the Flags SDK](/docs/flags/vercel-flags/sdks/flags-sdk)
- [Learn about OpenFeature integration](/docs/flags/vercel-flags/sdks/openfeature)
- [Use the core library directly](/docs/flags/vercel-flags/sdks/core)


---

[View full sitemap](/docs/sitemap)
