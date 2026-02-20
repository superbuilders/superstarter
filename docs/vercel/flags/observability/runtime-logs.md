---
title: Runtime Logs
product: vercel
url: /docs/flags/observability/runtime-logs
type: conceptual
prerequisites:
  - /docs/flags/observability
  - /docs/flags
related:
  - /docs/runtime-logs
  - /docs/flags/flags-sdk-reference
summary: Learn about runtime logs on Vercel.
---

# Integrate flags with Runtime Logs

> **🔒 Permissions Required**: Runtime Logs integration

On your dashboard, the **[Logs](/docs/runtime-logs)** tab displays your [runtime logs](/docs/runtime-logs#what-are-runtime-logs). It can also display any feature flags your application evaluated while handling requests.

![Image](`/docs-assets/static/docs/workflow-collaboration/feature-flags/logs-light.png`)

To make the runtime logs aware of your feature flag call `reportValue(name, value)` with the flag name and value to be reported. Each call to `reportValue` will show up as a distinct entry, even when the same key is used:

```ts {1,8} filename="app/api/test/route.ts" framework=nextjs-app
import { reportValue } from 'flags';

export async function GET() {
  reportValue('summer-sale', false);
  return Response.json({ ok: true });
}
```

```js {1,8} filename="app/api/test/route.js" framework=nextjs-app
import { reportValue } from 'flags';

export async function GET() {
  reportValue('summer-sale', false);
  return Response.json({ ok: true });
}
```

```ts {1,4} filename="api/test/page.tsx" framework=nextjs
import { reportValue } from "flags";

export default function Test() {
  reportValue("summer-sale", false);
  return <p>test</p>;
}
```

```js {1,4} filename="api/test/page.jsx" framework=nextjs
import { reportValue } from 'flags';

export default function Test() {
  reportValue('summer-sale', false);
  return <p>test</p>;
}
```

> **💡 Note:** If you are using an implementation of the [Flags SDK](/docs/flags/flags-sdk-reference) you don't need to call
> `reportValue`. The respective implementation will automatically call
> `reportValue` for you.

## Limits

The following limits apply to reported values:

- Keys are truncated to 256 characters
- Values are truncated to 256 characters
- Reported values must be JSON serializable or they will be ignored


---

[View full sitemap](/docs/sitemap)
