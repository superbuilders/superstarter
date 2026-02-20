---
title: Core
product: vercel
url: /docs/flags/vercel-flags/sdks/core
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags/sdks
  - /docs/flags/vercel-flags
related:
  - /docs/flags/vercel-flags/sdks/flags-sdk
  - /docs/flags/vercel-flags/dashboard/sdk-keys
  - /docs/flags/vercel-flags/dashboard/entities
  - /docs/functions/limitations
  - /docs/flags/vercel-flags/sdks/openfeature
summary: Learn about core on Vercel.
---

# Using the Core Library

The `@vercel/flags-core` library provides direct access to the Vercel Flags evaluation engine. Use it when you need full control over flag evaluation or are working outside of supported frameworks.

## When to use the core library

- Building custom tooling or CLI applications
- Working with frameworks other than Next.js or SvelteKit
- Creating server-side applications without a web framework
- Building custom integrations or adapters

> **💡 Note:** For Next.js and SvelteKit applications, use the [Flags
> SDK](/docs/flags/vercel-flags/sdks/flags-sdk) instead. It provides a better
> developer experience with framework-specific optimizations.

## Installation

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/flags-core
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/flags-core
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/flags-core
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/flags-core
    ```
  </Code>
</CodeBlock>

## Creating a client

Create a `FlagsClient` using the [SDK Key](/docs/flags/vercel-flags/dashboard/sdk-keys) from the `FLAGS` environment variable:

```ts
import { createClient } from '@vercel/flags-core';

const client = createClient(process.env.FLAGS);
```

Or use the default client, which reads from the `FLAGS` environment variable automatically:

```ts
import { flagsClient } from '@vercel/flags-core';

const result = await flagsClient.evaluate('flag-name', false);
```

### Client options

`createClient` accepts an optional second argument to configure how the client fetches and updates flag definitions:

```ts
import { createClient } from '@vercel/flags-core';

const client = createClient(process.env.FLAGS, {
  stream: { initTimeoutMs: 5000 },
  polling: { intervalMs: 60000, initTimeoutMs: 10000 },
});
```

| Option      | Type                                       | Default | Description                                                                                                       |
| ----------- | ------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `datafile`  | `DatafileInput`                            | -       | An initial datafile for immediate reads without waiting for a network request.                                    |
| `stream`    | `boolean \| { initTimeoutMs: number }`     | `true`  | Enable streaming updates via SSE. Set `initTimeoutMs` to control how long to wait for the first update.           |
| `polling`   | `boolean \| { intervalMs, initTimeoutMs }` | `true`  | Enable polling as a fallback. `intervalMs` controls refresh frequency, `initTimeoutMs` controls the initial wait. |
| `buildStep` | `boolean`                                  | auto    | Override build step auto-detection. See [Data source fallback chain](#data-source-fallback-chain).                |

## Initializing the client

Before evaluating flags, initialize the client to load flag definitions and subscribe to changes:

```ts
await client.initialize();
```

The client caches flag definitions in memory and keeps them up to date using streaming and polling mechanisms.

## Evaluating flags

Use the `evaluate` method to get a flag's value:

```ts
const result = await client.evaluate<boolean>('show-new-feature', false);

if (result.value) {
  // Show the new feature
}
```

The second argument is the default value, returned when the flag doesn't exist or evaluation fails.

### With evaluation context

Pass an evaluation context to use targeting rules:

```ts
const result = await client.evaluate<boolean>('premium-feature', false, {
  user: {
    id: 'user-123',
    email: 'user@example.com',
    plan: 'premium',
  },
});

console.log(result.value); // true or false based on targeting rules
```

The context structure should match the [entities](/docs/flags/vercel-flags/dashboard/entities) you've defined in the Vercel Dashboard.

## Evaluation result

The `evaluate` method returns a result object with detailed information:

```ts
const result = await client.evaluate<string>('theme', 'light');

console.log({
  value: result.value, // The evaluated value
  reason: result.reason, // Why this value was returned
  errorMessage: result.errorMessage, // Error details if applicable
});
```

### Evaluation reasons

The `reason` field indicates how the value was determined:

```ts
import { Reason } from '@vercel/flags-core';

switch (result.reason) {
  case Reason.TARGET_MATCH:
    // A specific target matched
    break;
  case Reason.RULE_MATCH:
    // A targeting rule matched
    break;
  case Reason.FALLTHROUGH:
    // No rules matched, using default
    break;
  case Reason.PAUSED:
    // Flag is paused/disabled
    break;
  case Reason.ERROR:
    // Evaluation failed
    console.error(result.errorMessage);
    break;
}
```

## Data source fallback chain

The client uses a fallback chain to resolve flag definitions. The chain differs depending on whether the client is running at build time or at runtime.

### Build step behavior

During a build step (detected when `CI=1` or `NEXT_PHASE=phase-production-build`, or when `buildStep: true` is set), the client avoids network connections and resolves definitions in this order:

1. **Provided datafile** — Uses the `datafile` option if provided
2. **Embedded definitions** — Uses definitions [embedded at build time](#embedded-definitions)
3. **Fetch** — Last resort network fetch

### Runtime behavior

At runtime (the default, or when `buildStep: false` is set), the client uses real-time mechanisms first and falls back to static sources:

1. **Stream** — Real-time updates via SSE, waits up to `initTimeoutMs` (default: 3000ms)
2. **Polling** — Interval-based HTTP requests, waits up to `initTimeoutMs` (default: 10000ms)
3. **Provided datafile** — Uses the `datafile` option if provided
4. **Embedded definitions** — Uses definitions [embedded at build time](#embedded-definitions)

Key behaviors:

- The client never streams and polls at the same time
- If the stream disconnects, the client starts polling (if enabled)
- If the stream reconnects while polling, polling stops
- If in-memory data already exists, the client serves it immediately while background updates happen

### Overriding build step detection

Use the `buildStep` option to explicitly control which fallback chain the client uses:

```ts
// Force build step mode (skip network connections)
const client = createClient(process.env.FLAGS, {
  buildStep: true,
});

// Force runtime mode (use streaming and polling)
const client = createClient(process.env.FLAGS, {
  buildStep: false,
});
```

This is useful when auto-detection doesn't match your environment. If you pass custom logic, ensure that `buildStep` is true during the build phase but false at runtime.

## Embedded definitions

When you deploy to Vercel, the SDK fetches your latest flag definitions once at build time and bundles them into the deployment. This serves two purposes:

- **Build consistency**: Every function in the build uses the same snapshot of flag definitions, fetched once at the start of the build. Without embedding, each function may fetch definitions independently, which could lead to inconsistent behavior if definitions change mid-build.
- **Runtime resilience**: If the Vercel Flags service is temporarily unreachable at runtime, the SDK falls back to the embedded snapshot instead of returning hardcoded default values. Because the snapshot preserves your full configuration — targeting rules, segments, and percentages — your flags continue to evaluate accurately. Since the snapshot is from build time, users may see slightly outdated values until the service recovers.

> **💡 Note:** Embedding is experimental. Enable it by adding a
> `VERCEL_EXPERIMENTAL_EMBED_FLAG_DEFINITIONS=1` environment variable to your
> project. This is recommended to avoid downtime during service outages, and
> will become the default in a future release.

Because the flag definitions are bundled into your deployment, they count toward the [function bundle size limit](/docs/functions/limitations#bundle-size-limits).

## Shutting down

When your application exits, shut down the client to clean up resources:

```ts
await client.shutdown();
```

This outputs detailed information about the client's data source connections, fallback behavior, and evaluation steps.

## Next steps

- [Learn about the Flags SDK](/docs/flags/vercel-flags/sdks/flags-sdk) for framework-native integration
- [Use OpenFeature](/docs/flags/vercel-flags/sdks/openfeature) for a vendor-neutral API
- [Configure entities](/docs/flags/vercel-flags/dashboard/entities) for targeting rules


---

[View full sitemap](/docs/sitemap)
