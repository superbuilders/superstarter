---
title: Testing & Troubleshooting
product: vercel
url: /docs/microfrontends/troubleshooting
type: conceptual
prerequisites:
  - /docs/microfrontends
related:
  - /docs/microfrontends/local-development
  - /docs/microfrontends/managing-microfrontends/vercel-toolbar
  - /docs/observability
  - /docs/tracing/session-tracing
  - /docs/tracing
summary: Learn about testing & troubleshooting on Vercel.
---

# Testing & troubleshooting microfrontends

## Testing

The `@vercel/microfrontends` package includes test utilities to help avoid common misconfigurations.

### `validateMiddlewareConfig`

The `validateMiddlewareConfig` test ensures Middleware is configured to work correctly with microfrontends. Passing this test does *not* guarantee Middleware is set up correctly, but it should find many common problems.

Since Middleware only runs in the default application, you should only run this test on the default application. If it finds a configuration issue, it will throw an exception so that you can use it with any test framework.

```ts filename="tests/middleware.test.ts"
/* @jest-environment node */

import { validateMiddlewareConfig } from '@vercel/microfrontends/next/testing';
import { config } from '../middleware';

describe('middleware', () => {
  test('matches microfrontends paths', () => {
    expect(() =>
      validateMiddlewareConfig(config, './microfrontends.json'),
    ).not.toThrow();
  });
});
```

### `validateMiddlewareOnFlaggedPaths`

The `validateMiddlewareOnFlaggedPaths` test checks that Middleware is correctly configured for flagged paths by ensuring that Middleware rewrites to the correct path for these flagged paths. Since Middleware only runs in the default application, you should only run this testing utility in the default application.

```ts filename="tests/middleware.test.ts"
/* @jest-environment node */

import { validateMiddlewareOnFlaggedPaths } from '@vercel/microfrontends/next/testing';
import { middleware } from '../middleware';

// For this test to work, all flags must be enabled before calling
// validateMiddlewareOnFlaggedPaths. There are many ways to do this depending
// on your flag framework, test framework, etc. but this is one way to do it
// with https://flags-sdk.dev/
jest.mock('flags/next', () => ({
  flag: jest.fn().mockReturnValue(jest.fn().mockResolvedValue(true)),
}));

describe('middleware', () => {
  test('rewrites for flagged paths', async () => {
    await expect(
      validateMiddlewareOnFlaggedPaths('./microfrontends.json', middleware),
    ).resolves.not.toThrow();
  });
});
```

### `validateRouting`

The `validateRouting` test validates that the given paths route to the correct microfrontend. You should only add this test to the default application where the `microfrontends.json` file is defined.

```ts filename="tests/microfrontends.test.ts"
import { validateRouting } from '@vercel/microfrontends/next/testing';

describe('microfrontends', () => {
  test('routing', () => {
    expect(() => {
      validateRouting('./microfrontends.json', {
        marketing: ['/', '/products'],
        docs: ['/docs', '/docs/api'],
        dashboard: [
          '/dashboard',
          { path: '/new-dashboard', flag: 'enable-new-dashboard' },
        ],
      });
    }).not.toThrow();
  });
});
```

The above test confirms that microfrontends routing:

- Routes `/` and `/products` to the `marketing` microfrontend.
- Routes `/docs` and `/docs/api` to the `docs` microfrontend.
- Routes `/dashboard` and `/new-dashboard` (with the `enable-new-dashboard` flag enabled) to the `dashboard` microfrontend.

## Debugging routing

### Debug logs when running locally

See [debug routing](/docs/microfrontends/local-development#debug-routing) for how to enable debug logs to see where and why the local proxy routed the request.

### Debug headers when deployed

Debug headers expose the internal reason for the microfrontend response. You can use these headers to debug issues with routing.

You can enable debug headers in the [Vercel Toolbar](/docs/microfrontends/managing-microfrontends/vercel-toolbar#enable-routing-debug-mode), or by setting a cookie `VERCEL_MFE_DEBUG` to `1` in your browser.

Requests to your domain will then return additional headers on every response:

- `x-vercel-mfe-app`: The name of the microfrontend project that handled the request.
- `x-vercel-mfe-target-deployment-id`: The ID of the deployment that handled the request.
- `x-vercel-mfe-default-app-deployment-id`: The ID of the default application deployment, the source of the `microfrontends.json` configuration.
- `x-vercel-mfe-zone-from-middleware`: For flagged paths, the name of the microfrontend that middleware decided should handle the request.
- `x-vercel-mfe-matched-path`: The path from `microfrontends.json` that was matched by the routing configuration.
- `x-vercel-mfe-response-reason`: The internal reason for the MFE response.

## Observability

Microfrontends routing information is stored in [Observability](/docs/observability) and can be viewed in the team or project scopes. Click on the Observability tab, and then find Microfrontends in the CDN section.

## Tracing

Microfrontends routing is captured by Vercel [Session tracing](/docs/tracing/session-tracing). Once you have captured a trace, you can inspect the Microfrontends span in the [logs tab](/docs/tracing#viewing-traces-in-the-dashboard).

You may need to zoom in to the Microfrontends span. The span includes:

- `vercel.mfe.app`: The name of the microfrontend project that handled the request.
- `vercel.mfe.target_deployment_id`: The ID of the deployment that handled the request.
- `vercel.mfe.default_app_deployment_id`: The ID of the default application deployment, the source of the `microfrontends.json` configuration.
- `vercel.mfe.app_from_middleware`: For flagged paths, the name of the microfrontend that middleware decided should handle the request.
- `vercel.mfe.matched_path`: The path from `microfrontends.json` that was matched by the routing configuration.

## Troubleshooting

The following are common issues you might face with debugging tips:

### Microfrontends aren't working in local development

See [debug routing](/docs/microfrontends/local-development#debug-routing) for how to enable debug logs to see where and why the local proxy routed the request.

### Requests are not routed to the correct microfrontend in production

To validate where requests are being routed to in production, follow these steps:

1. [Verify](/docs/microfrontends/path-routing#identifying-microfrontends-by-path) that the path is covered by the microfrontends routing configuration.
2. Inspect the [debug headers](/docs/microfrontends/troubleshooting#debug-headers) or view a [page trace](/docs/microfrontends/troubleshooting#tracing) to verify the expected path was matched.


---

[View full sitemap](/docs/sitemap)
