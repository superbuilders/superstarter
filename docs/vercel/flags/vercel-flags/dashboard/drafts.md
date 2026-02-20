---
title: Drafts
product: vercel
url: /docs/flags/vercel-flags/dashboard/drafts
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags/dashboard
  - /docs/flags/vercel-flags
related:
  - /docs/flags/flags-explorer/getting-started
  - /docs/flags/vercel-flags/dashboard/archive
  - /docs/flags/vercel-flags/dashboard/feature-flag
  - /docs/flags/vercel-flags/sdks/flags-sdk
summary: Learn about drafts on Vercel.
---

# Draft Flags

Drafts are flags that Vercel detects in your code but haven't been created in the dashboard yet. They let you define flags in code first, then configure them in the dashboard when you're ready.

## How drafts work

When you deploy your application, Vercel queries your [Flags Discovery Endpoint](/docs/flags/flags-explorer/getting-started#creating-the-flags-discovery-endpoint) to detect flags defined in code. If a flag has its provider set to Vercel but doesn't exist in the dashboard, it appears as a draft.

This happens automatically when:

1. You define a flag in code using the Flags SDK with `vercelAdapter()`
2. Your application exposes a Flags Discovery Endpoint
3. You deploy to production

## Draft behavior

When a flag is in draft state, Vercel knows it exists but doesn't control its value yet. Your application evaluates the flag using the `defaultValue` you defined in code. No targeting rules, segments, or environment-specific configuration apply until you create a Vercel Flag from the draft.

This lets you ship code with new flags before deciding how to configure them. For example, you might deploy a flag with `defaultValue: false` to keep the feature hidden, then promote and configure targeting rules when you're ready to roll out.

```ts filename="flags.ts"
export const newCheckout = flag({
  key: 'new-checkout',
  adapter: vercelAdapter(),
  defaultValue: false, // Used while the flag is a draft
  description: 'Enable the new checkout flow',
  options: [
    { value: true, label: 'Enabled' },
    { value: false, label: 'Disabled' },
  ],
});
```

The `description` and `options` you define here will pre-fill the dashboard when you promote the draft.

## Keeping code and dashboard in sync

Vercel compares the flags in your code against the flags in the dashboard whenever a new production deployment goes live. It uses the [Flags Discovery Endpoint](/docs/flags/flags-explorer/getting-started#creating-the-flags-discovery-endpoint) to detect which flags your code defines, then highlights any mismatches:

- **Drafts**: Flags that exist in your production deployment's code but have not been created in the dashboard appear as drafts. You can promote a draft to turn it into a fully managed Vercel Flag with targeting rules and environment configuration.
- **Unreferenced**: Flags that exist in the dashboard but are not found in your latest production deployment are marked with an **Unreferenced** badge in the flag list and flag details page. This helps you identify flags that may be safe to [archive](/docs/flags/vercel-flags/dashboard/archive).
- **Referenced archived flags**: If an archived flag is still present in your production deployment, the archive shows a **Referenced** badge so you know the code still depends on it. This can indicate a potential misconfiguration since archived flags are neither served nor evaluated, so your application will fall back to the default value defined in code.

## How to promote a draft

To start managing a flag through the dashboard:

1. Navigate to the **Flags** tab in your project
2. Go to the **Drafts** section
3. Click on the draft you want to promote
4. Click **Create Flag**

When you promote a draft, Vercel pre-fills the flag configuration with information from your code:

- **Description**: From the `description` property in your flag definition
- **Options/Variants**: From the `options` array in your flag definition
- **Type**: Inferred from your default value or options

After promotion, the flag is managed by the dashboard and you can configure environments, add targeting rules, and track changes.

## Flags Discovery Endpoint

Vercel detects drafts through your application's Flags Discovery Endpoint, typically located at `/.well-known/vercel/flags`. This endpoint returns metadata about your flags, including:

- Flag keys
- Descriptions
- Available options
- Provider information

If you're using the Flags SDK, use `getProviderData` to generate this information automatically:

```ts filename="app/.well-known/vercel/flags/route.ts"
import { createFlagsDiscoveryEndpoint, verifyAccess } from 'flags/next';
import { getProviderData } from '@flags-sdk/vercel';
import * as flags from '../../../../flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags);
});
```

## Next steps

- [Configure your flags](/docs/flags/vercel-flags/dashboard/feature-flag)
- [Learn about the Flags SDK](/docs/flags/vercel-flags/sdks/flags-sdk)


---

[View full sitemap](/docs/sitemap)
