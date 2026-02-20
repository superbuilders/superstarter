---
title: Roll Out a Feature
product: vercel
url: /docs/flags/vercel-flags/cli/roll-out-feature
type: reference
prerequisites:
  - /docs/flags/vercel-flags/cli
  - /docs/flags/vercel-flags
related:
  []
summary: Learn about roll out a feature on Vercel.
---

# Rolling Out a New Feature

This workflow creates a feature flag, wires it into your application, and progressively enables it across environments.

## 1. Create the flag

```bash filename="terminal"
vercel flags add redesigned-checkout --kind boolean \
  --description "New checkout flow with streamlined steps"
```

*Creating a boolean flag to gate the new checkout experience.*

## 2. Verify SDK keys exist

Each project gets SDK keys automatically when you create your first flag. Confirm they're in place:

```bash filename="terminal"
vercel flags sdk-keys ls
```

## 3. Pull environment variables

The `FLAGS` environment variable contains your SDK keys. Pull it into your local `.env.local`:

```bash filename="terminal"
vercel env pull
```

## 4. Install the Flags SDK

```bash filename="terminal"
pnpm add flags @flags-sdk/vercel
```

## 5. Define the flag in code

Create a flag definition using the Flags SDK. The `vercelAdapter` reads the `FLAGS` environment variable automatically:

```ts filename="flags.ts"
import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const redesignedCheckout = flag({
  key: 'redesigned-checkout',
  adapter: vercelAdapter(),
});
```

The flag returns `false` until you enable it in the dashboard.

## 6. Use the flag in a component

```tsx filename="app/checkout/page.tsx"
import { redesignedCheckout } from '../../flags';

export default async function CheckoutPage() {
  const showRedesign = await redesignedCheckout();

  return showRedesign ? <NewCheckout /> : <OldCheckout />;
}
```

## 7. Deploy to preview

```bash filename="terminal"
vercel deploy
```

Visit the preview URL to confirm the old checkout renders. The flag defaults to `false` since it hasn't been enabled yet.

## 8. Enable across environments

Enable the flag progressively, starting with development:

```bash filename="terminal"
vercel flags enable redesigned-checkout --environment development
```

```bash filename="terminal"
vercel flags enable redesigned-checkout --environment preview
```

```bash filename="terminal"
vercel flags enable redesigned-checkout --environment production
```

## 9. Deploy to production

```bash filename="terminal"
vercel deploy --prod
```

Visit the production URL to confirm the new checkout is live.


---

[View full sitemap](/docs/sitemap)
