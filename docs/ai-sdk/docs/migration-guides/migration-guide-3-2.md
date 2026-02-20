
# Migrate AI SDK 3.1 to 3.2

<Note>
  Check out the [AI SDK 3.2 release blog
  post](https://vercel.com/blog/introducing-vercel-ai-sdk-3-2) for more
  information about the release.
</Note>

This guide will help you upgrade to AI SDK 3.2:

- Experimental `StreamingReactResponse` functionality has been removed
- Several features have been deprecated
- UI framework integrations have moved to their own Node modules

## Upgrading

### AI SDK

To update to AI SDK version 3.2, run the following command using your preferred package manager:

<Snippet text="pnpm add ai@latest" />

## Removed Functionality

The experimental `StreamingReactResponse` has been removed. You can use [AI SDK RSC](/docs/ai-sdk-rsc/overview) to build streaming UIs.

## Deprecated Functionality

The `nanoid` export has been deprecated. Please use [`generateId`](/docs/reference/ai-sdk-core/generate-id) instead.

## UI Package Separation

AI SDK UI supports several frameworks: [React](https://react.dev/), [Svelte](https://svelte.dev/), [Vue.js](https://vuejs.org/), and [SolidJS](https://www.solidjs.com/).

The integrations (other than React and RSC) have moved to separate Node modules. You need to update the import and require statements as follows:

- Change `ai/svelte` to `@ai-sdk/svelte`
- Change `ai/vue` to `@ai-sdk/vue`
- Change `ai/solid` to `@ai-sdk/solid`

The old exports are still available but will be removed in a future release.


## Navigation

- [Versioning](/docs/migration-guides/versioning)
- [Migrate AI SDK 5.x to 6.0](/docs/migration-guides/migration-guide-6-0)
- [Migrate Your Data to AI SDK 5.0](/docs/migration-guides/migration-guide-5-0-data)
- [Migrate AI SDK 4.x to 5.0](/docs/migration-guides/migration-guide-5-0)
- [Migrate AI SDK 4.1 to 4.2](/docs/migration-guides/migration-guide-4-2)
- [Migrate AI SDK 4.0 to 4.1](/docs/migration-guides/migration-guide-4-1)
- [Migrate AI SDK 3.4 to 4.0](/docs/migration-guides/migration-guide-4-0)
- [Migrate AI SDK 3.3 to 3.4](/docs/migration-guides/migration-guide-3-4)
- [Migrate AI SDK 3.2 to 3.3](/docs/migration-guides/migration-guide-3-3)
- [Migrate AI SDK 3.1 to 3.2](/docs/migration-guides/migration-guide-3-2)
- [Migrate AI SDK 3.0 to 3.1](/docs/migration-guides/migration-guide-3-1)


[Full Sitemap](/sitemap.md)
