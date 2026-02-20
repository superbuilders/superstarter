---
title: Advanced BotID Configuration
product: vercel
url: /docs/botid/advanced-configuration
type: reference
prerequisites:
  - /docs/botid
related:
  []
summary: Fine-grained control over BotID detection levels and backend domain configuration
---

# Advanced BotID Configuration

## Route-by-Route configuration

When you need fine-grained control over BotID's detection levels, you can specify `advancedOptions` to choose between basic and deep analysis modes on a per-route basis. **This configuration takes precedence over the project-level BotID settings in your Vercel dashboard.**

> **⚠️ Warning:** **Important**: The `checkLevel` in both client and server configurations must
> be identical for each protected route. A mismatch between client and server
> configurations will cause BotID verification to fail, potentially blocking
> legitimate traffic or allowing bots through. This feature is available in
> `botid@1.4.5` and above

### Client-side configuration

In your client-side protection setup, you can specify the check level for each protected path:

```ts
initBotId({
  protect: [
    {
      path: '/api/checkout',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'deepAnalysis', // or 'basic'
      },
    },
    {
      path: '/api/contact',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
  ],
});
```

### Server-side configuration

In your server-side endpoint that uses `checkBotId()`, ensure it matches the client-side configuration.

```ts
export async function POST(request: NextRequest) {
  const verification = await checkBotId({
    advancedOptions: {
      checkLevel: 'deepAnalysis', // Must match client-side config
    },
  });

  if (verification.isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Your protected logic here
}
```

## Separate backend domains

By default, BotID validates that requests come from the same host that serves the BotID challenge. However, if your application architecture separates your frontend and backend domains (e.g., your app is served from `vercel.com` but your API is on `api.vercel.com` or `vercel-api.com`), you'll need to configure `extraAllowedHosts`.

The `extraAllowedHosts` parameter in `checkBotId()` allows you to specify a list of frontend domains that are permitted to send requests to your backend:

```ts filename="app/api/backend/route.ts"
export async function POST(request: NextRequest) {
  const verification = await checkBotId({
    advancedOptions: {
      extraAllowedHosts: ['vercel.com', 'app.vercel.com'],
    },
  });

  if (verification.isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Your protected logic here
}
```

> **💡 Note:** Only add trusted domains to `extraAllowedHosts`. Each domain in this list can
> send requests that will be validated by BotID, so ensure these are domains you
> control.

### When to use `extraAllowedHosts`

Use this configuration when:

- Your frontend is hosted on a different domain than your API (e.g., `myapp.com` → `api.myapp.com`)
- You have multiple frontend applications that need to access the same protected backend
- Your architecture uses a separate subdomain for API endpoints

### Example with advanced options

You can combine `extraAllowedHosts` with other advanced options:

```ts filename="app/api/backend-advanced/route.ts"
const verification = await checkBotId({
  advancedOptions: {
    checkLevel: 'deepAnalysis',
    extraAllowedHosts: ['app.example.com', 'dashboard.example.com'],
  },
});
```

## Next.js Pages Router configuration

When using [Pages Router API handlers](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) in development, pass request headers to `checkBotId()`:

```ts filename="pages/api/endpoint.ts"
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkBotId } from 'botid/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const result = await checkBotId({
    advancedOptions: {
      headers: req.headers,
    },
  });

  if (result.isBot) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Your protected logic here
  res.status(200).json({ success: true });
}
```

> **💡 Note:** Pages Router requires explicit headers in development. In production, headers
> are extracted automatically.


---

[View full sitemap](/docs/sitemap)
