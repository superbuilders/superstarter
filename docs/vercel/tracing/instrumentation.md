---
title: Instrumentation
product: vercel
url: /docs/tracing/instrumentation
type: how-to
prerequisites:
  - /docs/tracing
related:
  - /docs/functions/runtimes/edge
  - /docs/tracing/session-tracing
  - /docs/drains/reference/traces
summary: Learn how to instrument your application to understand performance and infrastructure details.
---

# Instrumentation

Observability is crucial for understanding and optimizing the behavior and performance of your app. Vercel supports OpenTelemetry instrumentation out of the box, which can be used through the `@vercel/otel` package.

## Getting started

To get started, install the following packages:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @opentelemetry/api @vercel/otel
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @opentelemetry/api @vercel/otel
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @opentelemetry/api @vercel/otel
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @opentelemetry/api @vercel/otel
    ```
  </Code>
</CodeBlock>

Next, create a `instrumentation.ts` (or `.js`) file in the root directory of the project, or, on Next.js [it must be placed](https://nextjs.org/docs/app/guides/open-telemetry#using-vercelotel) in the `src` directory if you are using one. Add the following code to initialize and configure OTel using `@vercel/otel`:

```ts filename="instrumentation.ts" framework=nextjs-app
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'your-project-name' });
}
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```js filename="instrumentation.js" framework=nextjs-app
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'your-project-name' });
}
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```ts filename="instrumentation.ts" framework=nextjs
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'your-project-name' });
}
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```js filename="instrumentation.js" framework=nextjs
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'your-project-name' });
}
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```ts filename="instrumentation.ts" framework=other
import { registerOTel } from '@vercel/otel';

registerOTel({ serviceName: 'your-project-name' });
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```js filename="instrumentation.js" framework=other
import { registerOTel } from '@vercel/otel';

registerOTel({ serviceName: 'your-project-name' });
// NOTE: You can replace `your-project-name` with the actual name of your project
```

## Configuring context propagation

Context propagation connects operations across service boundaries so you can trace a request through your entire system. When your app calls another service, context propagation passes trace metadata (for example,trace IDs, span IDs) along with the request, typically through HTTP headers like `traceparent`. This lets OpenTelemetry link all the spans together into a single, complete trace.

Without context propagation, each service generates isolated spans you can't connect. With it, you see exactly how a request flows through your infrastructure—from the initial API call through databases, queues, and external services.

For more details on how context propagation works, see the [OpenTelemetry context propagation documentation](https://opentelemetry.io/docs/concepts/context-propagation/).

### For outgoing requests

You can configure context propagation by configuring the `fetch` option in the `instrumentationConfig` option.

```ts filename="instrumentation.ts" framework=nextjs-app
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: `your-project-name`,
    instrumentationConfig: {
      fetch: {
        // This URLs will have the tracing context propagated to them.
        propagateContextUrls: [
          'your-service-domain.com',
          'your-database-domain.com',
        ],
        // This URLs will not have the tracing context propagated to them.
        dontPropagateContextUrls: [
          'some-third-party-service-domain.com',
        ],
        // This URLs will be ignored and will not be traced.
        ignoreUrls: ['my-internal-private-tool.com'],
      },
    },
  });
}
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```js filename="instrumentation.js" framework=nextjs-app
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: `your-project-name`,
    instrumentationConfig: {
      fetch: {
        // This URLs will have the tracing context propagated to them.
        propagateContextUrls: [
          'your-service-domain.com',
          'your-database-domain.com',
        ],
        // This URLs will not have the tracing context propagated to them.
        dontPropagateContextUrls: [
          'some-third-party-service-domain.com',
        ],
        // This URLs will be ignored and will not be traced.
        ignoreUrls: ['my-internal-private-tool.com'],
      },
    },
  });
}
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```ts filename="instrumentation.ts" framework=nextjs
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: `your-project-name`,
    instrumentationConfig: {
      fetch: {
        // This URLs will have the tracing context propagated to them.
        propagateContextUrls: [
          'your-service-domain.com',
          'your-database-domain.com',
        ],
        // This URLs will not have the tracing context propagated to them.
        dontPropagateContextUrls: [
          'some-third-party-service-domain.com',
        ],
        // This URLs will be ignored and will not be traced.
        ignoreUrls: ['my-internal-private-tool.com'],
      },
    },
  });
}
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```js filename="instrumentation.js" framework=nextjs
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: `your-project-name`,
    instrumentationConfig: {
      fetch: {
        // This URLs will have the tracing context propagated to them.
        propagateContextUrls: [
          'your-service-domain.com',
          'your-database-domain.com',
        ],
        // This URLs will not have the tracing context propagated to them.
        dontPropagateContextUrls: [
          'some-third-party-service-domain.com',
        ],
        // This URLs will be ignored and will not be traced.
        ignoreUrls: ['my-internal-private-tool.com'],
      },
    },
  });
}
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```ts filename="instrumentation.ts" framework=other
import { registerOTel } from '@vercel/otel';

registerOTel({
  serviceName: `your-project-name`,
  instrumentationConfig: {
    fetch: {
      // This URLs will have the tracing context propagated to them.
      propagateContextUrls: [
        'your-service-domain.com',
        'your-database-domain.com',
      ],
      // This URLs will not have the tracing context propagated to them.
      dontPropagateContextUrls: [
        'some-third-party-service-domain.com',
      ],
      // This URLs will be ignored and will not be traced.
      ignoreUrls: ['my-internal-private-tool.com'],
    },
  },
});
// NOTE: You can replace `your-project-name` with the actual name of your project
```

```js filename="instrumentation.js" framework=other
import { registerOTel } from '@vercel/otel';

registerOTel({
  serviceName: `your-project-name`,
  instrumentationConfig: {
    fetch: {
      // This URLs will have the tracing context propagated to them.
      propagateContextUrls: [
        'your-service-domain.com',
        'your-database-domain.com',
      ],
      // This URLs will not have the tracing context propagated to them.
      dontPropagateContextUrls: [
        'some-third-party-service-domain.com',
      ],
      // This URLs will be ignored and will not be traced.
      ignoreUrls: ['my-internal-private-tool.com'],
    },
  },
});
// NOTE: You can replace `your-project-name` with the actual name of your project
```

### From incoming requests

Next.js 13.4+ supports automatic OpenTelemetry context propagation for incoming requests. For other frameworks, that do not support automatic OpenTelemetry context propagation, you can refer to the following code example to manually inject the inbound context into a request handler.

```ts filename="api-handler.ts"
import { propagation, context, trace } from "@opentelemetry/api";

const tracer = trace.getTracer('custom-tracer');

// This function injects the inbound context into the request handler
function injectInboundContext(f: (request: Request) => Promise<Response>): (request: Request) => Promise<Response> {
  return (req) => {
    const c = propagation.extract(context.active(), Object.fromEntries(req.headers))
    return context.with(c, async () => {
      return await f(req);
    })
  }
}

export const GET = injectInboundContext(async (req: Request) => {
  const span = tracer.startSpan('your-operation-name');
  // The above ^ span will be automatically attached to incoming tracing context (if any)
  try {
    // Your operation logic here
    span.setAttributes({
      'custom.attribute': 'value',
    });
    return new Response('Hello, world!');
  } finally {
    span.end();
  }
});
```

### Sampling behavior

When requests arrive with a `traceparent` header, Vercel's infrastructure considers the inbound sampling decision alongside its own sampling rules. Both must agree to sample for spans to be emitted.

For a span to be emitted, both the inbound decision (if present) and Vercel's sampling rules must agree to sample:

| Inbound decision | Vercel sampled | Result  |
| ---------------- | -------------- | ------- |
| Sampled          | Yes            | Emitted |
| Sampled          | No             | Dropped |
| Not sampled      | Any            | Dropped |
| No decision      | Yes            | Emitted |
| No decision      | No             | Dropped |

This ensures consistency in distributed systems: if an upstream service marks a trace as not sampled, Vercel respects that decision. When an upstream marks a trace as sampled, Vercel still applies its own sampling rules to control span volume.

## Adding custom spans

After installing `@vercel/otel`, you can add custom spans to your traces to capture additional visibility into your application. Custom spans let you track specific operations that matter to your business logic, such as processing payments, generating reports, or transforming data, so you can measure their performance and debug issues more effectively.

Use the `@opentelemetry/api` package to instrument specific operations:

```ts filename="custom-span.ts" {3, 6, 9-11, 13}
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('custom-tracer');

async function performOperation() {
  const span = tracer.startSpan('operation-name');
  try {
    // Your operation logic here
    span.setAttributes({
      'custom.attribute': 'value',
    });
  } finally {
    span.end();
  }
}
```

Custom spans from functions using the [Edge runtime](/docs/functions/runtimes/edge) are not supported.

## OpenTelemetry configuration options

For the full list of configuration options, see the [@vercel/otel documentation](https://github.com/vercel/otel/blob/main/packages/otel/README.md).

## Limitations

- If your app uses manual OpenTelemetry SDK configuration without the usage of `@vercel/otel`, you will not be able to use [Session Tracing](/docs/tracing/session-tracing) or [Trace Drains](/docs/drains/reference/traces).


---

[View full sitemap](/docs/sitemap)
