---
title: Run an A/B Test
product: vercel
url: /docs/flags/vercel-flags/cli/run-ab-test
type: reference
prerequisites:
  - /docs/flags/vercel-flags/cli
  - /docs/flags/vercel-flags
related:
  - /docs/flags/observability/web-analytics
  - /docs/flags/flags-explorer
summary: Learn about run an a/b test on Vercel.
---

# Running an A/B Test

This workflow sets up an A/B test for a layout experiment, tracks results through Web Analytics, and cleans up afterward.

## 1. Create the flag

```bash filename="terminal"
vercel flags add new-pricing-layout --kind boolean \
  --description "A/B test: new pricing page layout"
```

## 2. Define the flag in code

```ts filename="flags.ts"
import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const newPricingLayout = flag({
  key: 'new-pricing-layout',
  adapter: vercelAdapter(),
});
```

The flag returns `false` until you configure targeting in the dashboard.

## 3. Use the flag in a component

```tsx filename="app/pricing/page.tsx"
import { newPricingLayout } from '../../flags';

export default async function PricingPage() {
  const useNewLayout = await newPricingLayout();

  return useNewLayout ? <NewPricing /> : <CurrentPricing />;
}
```

## 4. Track flag values in Web Analytics

Add the `FlagValues` component to your layout so Web Analytics can correlate page views and events with flag values automatically:

```tsx filename="app/layout.tsx"
import { Suspense } from 'react';
import { FlagValues } from 'flags/react';
import { newPricingLayout } from '../flags';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        <Suspense fallback={null}>
          <FlagValues values={{ 'new-pricing-layout': await newPricingLayout() }} />
        </Suspense>
      </body>
    </html>
  );
}
```

See [Web Analytics integration](/docs/flags/observability/web-analytics) for more on tracking flag values.

## 5. Deploy to preview and test both variants

```bash filename="terminal"
vercel deploy
```

Visit the preview URL to confirm both layouts render correctly. If you've set up the [Flags Explorer](/docs/flags/flags-explorer), you can toggle the flag in the toolbar.

## 6. Deploy to production

```bash filename="terminal"
vercel deploy --prod
```

Enable the flag in the **Production** environment in the dashboard to start serving the new layout to users. Monitor results in Web Analytics by comparing metrics per variant.

## 7. Conclude the experiment

When you've picked a winner, clean up:

1. Remove the flag from code and keep only the winning layout
2. Archive the flag:

```bash filename="terminal"
vercel flags archive new-pricing-layout --yes
```


---

[View full sitemap](/docs/sitemap)
