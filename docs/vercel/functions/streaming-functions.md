---
title: Streaming
product: vercel
url: /docs/functions/streaming-functions
type: how-to
prerequisites:
  - /docs/functions
related:
  - /docs/functions/quickstart
  - /docs/cli
  - /docs/fluid-compute
  - /docs/functions/limitations
  - /docs/functions/logs
summary: Learn how to stream responses from Vercel Functions.
---

# Streaming

AI providers can be slow when producing responses, but many make their responses available in chunks as they're processed. Streaming enables you to show users those chunks of data as they arrive rather than waiting for the full response, improving the perceived speed of AI-powered apps.

**Vercel recommends using [Vercel's AI SDK](https://sdk.vercel.ai/docs) to stream responses from LLMs and AI APIs**. It reduces the boilerplate necessary for streaming responses from AI providers and allows you to change AI providers with a few lines of code, rather than rewriting your entire application.

## Getting started

The following example shows how to send a message to one of OpenAI's models and streams:

### Prerequisites

1. You should understand how to setup a Vercel Function. See the [Functions quickstart](/docs/functions/quickstart) for more information.
2. You should be using Node.js 20 or later and the [latest version](/docs/cli#updating-vercel-cli) of the Vercel CLI.
3. You should copy your OpenAI API key in the `.env.local` file with name `OPENAI_API_KEY`. See the [AI SDK docs](https://sdk.vercel.ai/docs/getting-started#configure-openai-api-key) for more information on how to do this.
4. Install the `ai` package:
   <CodeBlock>
     <Code tab="pnpm">
       ```bash
       pnpm i ai
       ```
     </Code>
     <Code tab="yarn">
       ```bash
       yarn i ai
       ```
     </Code>
     <Code tab="npm">
       ```bash
       npm i ai
       ```
     </Code>
     <Code tab="bun">
       ```bash
       bun i ai
       ```
     </Code>
   </CodeBlock>

```ts v0="build" filename="app/api/streaming-example/route.ts" framework=nextjs-app
import { streamText } from 'ai';

// This method must be named GET
export async function GET() {
  // Make a request to OpenAI's API based on
  // a placeholder prompt
  const response = streamText({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'What is the capital of Australia?' }],
  });
  // Respond with the stream
  return response.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
}
```

```js v0="build" filename="app/api/streaming-example/route.js" framework=nextjs-app
import { streamText } from 'ai';

// This method must be named GET
export async function GET() {
  // Make a request to OpenAI's API based on
  // a placeholder prompt
  const response = streamText({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'What is the capital of Australia?' }],
  });
  // Respond with the stream
  return response.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
}
```

```ts v0="build" filename="app/api/streaming-example/route.ts" framework=nextjs
// Streaming Functions must be defined in an
// app directory, even if the rest of your app
// is in the pages directory.
import { streamText } from 'ai';

// This method must be named GET
export async function GET() {
  // Make a request to OpenAI's API based on
  // a placeholder prompt
  const response = streamText({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'What is the capital of Australia?' }],
  });
  // Respond with the stream
  return response.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
}
```

```js v0="build" filename="app/api/streaming-example/route.js" framework=nextjs
// Streaming Functions must be defined in an
// app directory, even if the rest of your app
// is in the pages directory.
import { streamText } from 'ai';

// This method must be named GET
export async function GET() {
  // Make a request to OpenAI's API based on
  // a placeholder prompt
  const response = streamText({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'What is the capital of Australia?' }],
  });
  // Respond with the stream
  return response.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
}
```

```ts filename="api/chat-example.ts" framework=other
import { streamText } from 'ai';

// This method must be named GET
export async function GET() {
  // Make a request to OpenAI's API based on
  // a placeholder prompt
  const response = streamText({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'What is the capital of Australia?' }],
  });
  // Respond with the stream
  return response.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
}
```

```js filename="api/chat-example.js" framework=other
import { streamText } from 'ai';

// This method must be named GET
export async function GET() {
  // Make a request to OpenAI's API based on
  // a placeholder prompt
  const response = streamText({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'What is the capital of Australia?' }],
  });
  // Respond with the stream
  return response.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
}
```

## Function duration

If your workload requires longer durations, you should consider enabling [fluid compute](/docs/fluid-compute), which has [higher default max durations and limits across plans](/docs/fluid-compute#default-settings-by-plan).

Maximum durations can be configured for Node.js functions to enable streaming responses for longer periods. See [max durations](/docs/functions/limitations#max-duration) for more information.

## Streaming Python functions

You can stream responses from Vercel Functions that use the Python runtime.

When your function is streaming, it will be able to take advantage of the extended [runtime logs](/docs/functions/logs#runtime-logs), which will show you the real-time output of your function, in addition to larger and more frequent log entries. Because of this potential increase in frequency and format, your [Log Drains](/docs/drains) may be affected. We recommend ensuring that your ingestion can handle both the new format and frequency.

## More resources

- [What is streaming?](/docs/functions/streaming)
- [AI SDK](https://sdk.vercel.ai/docs/getting-started)
- [Vercel Functions](/docs/functions)
- [Fluid compute](/docs/fluid-compute)
- [Streaming and SEO: Does streaming affect SEO?](/kb/guide/does-streaming-affect-seo)
- [Processing data chunks: Learn how to process data chunks](/kb/guide/processing-data-chunks)
- [Handling backpressure: Learn how to handle backpressure](/kb/guide/handling-backpressure)


---

[View full sitemap](/docs/sitemap)
