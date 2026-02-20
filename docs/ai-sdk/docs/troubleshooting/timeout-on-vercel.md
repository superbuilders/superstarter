
# Getting Timeouts When Deploying on Vercel

## Issue

Streaming with the AI SDK works in my local development environment.
However, when I'm deploying to Vercel, longer responses get chopped off in the UI and I'm seeing timeouts in the Vercel logs or I'm seeing the error: `Uncaught (in promise) Error: Connection closed`.

## Solution

With Vercel's [Fluid Compute](https://vercel.com/docs/fluid-compute), the default function duration is now **5 minutes (300 seconds)** across all plans. This should be sufficient for most streaming applications.

If you need to extend the timeout for longer-running processes, you can increase the `maxDuration` setting:

### Next.js (App Router)

Add the following to your route file or the page you are calling your Server Action from:

```tsx
export const maxDuration = 600;
```

<Note>
  Setting `maxDuration` above 300 seconds requires a Pro or Enterprise plan.
</Note>

### Other Frameworks

For other frameworks, you can set timeouts in your `vercel.json` file:

```json
{
  "functions": {
    "api/chat/route.ts": {
      "maxDuration": 600
    }
  }
}
```

<Note>
  Setting `maxDuration` above 300 seconds requires a Pro or Enterprise plan.
</Note>

### Maximum Duration Limits

The maximum duration you can set depends on your Vercel plan:

- **Hobby**: Up to 300 seconds (5 minutes)
- **Pro**: Up to 800 seconds (~13 minutes)
- **Enterprise**: Up to 800 seconds (~13 minutes)

## Learn more

- [Fluid Compute Default Settings](https://vercel.com/docs/fluid-compute#default-settings-by-plan)
- [Configuring Maximum Duration for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration)


## Navigation

- [Azure OpenAI Slow to Stream](/docs/troubleshooting/azure-stream-slow)
- [Server Actions in Client Components](/docs/troubleshooting/server-actions-in-client-components)
- [useChat/useCompletion stream output contains 0:... instead of text](/docs/troubleshooting/strange-stream-output)
- [Streamable UI Errors](/docs/troubleshooting/streamable-ui-errors)
- [Tool Invocation Missing Result Error](/docs/troubleshooting/tool-invocation-missing-result)
- [Streaming Not Working When Deployed](/docs/troubleshooting/streaming-not-working-when-deployed)
- [Streaming Not Working When Proxied](/docs/troubleshooting/streaming-not-working-when-proxied)
- [Getting Timeouts When Deploying on Vercel](/docs/troubleshooting/timeout-on-vercel)
- [Unclosed Streams](/docs/troubleshooting/unclosed-streams)
- [useChat Failed to Parse Stream](/docs/troubleshooting/use-chat-failed-to-parse-stream)
- [Server Action Plain Objects Error](/docs/troubleshooting/client-stream-error)
- [useChat No Response](/docs/troubleshooting/use-chat-tools-no-response)
- [Custom headers, body, and credentials not working with useChat](/docs/troubleshooting/use-chat-custom-request-options)
- [TypeScript performance issues with Zod and AI SDK 5](/docs/troubleshooting/typescript-performance-zod)
- [useChat "An error occurred"](/docs/troubleshooting/use-chat-an-error-occurred)
- [Repeated assistant messages in useChat](/docs/troubleshooting/repeated-assistant-messages)
- [onFinish not called when stream is aborted](/docs/troubleshooting/stream-abort-handling)
- [Tool calling with generateObject and streamObject](/docs/troubleshooting/tool-calling-with-structured-outputs)
- [Abort breaks resumable streams](/docs/troubleshooting/abort-breaks-resumable-streams)
- [streamText fails silently](/docs/troubleshooting/stream-text-not-working)
- [Streaming Status Shows But No Text Appears](/docs/troubleshooting/streaming-status-delay)
- [Stale body values with useChat](/docs/troubleshooting/use-chat-stale-body-data)
- [Type Error with onToolCall](/docs/troubleshooting/ontoolcall-type-narrowing)
- [Unsupported model version error](/docs/troubleshooting/unsupported-model-version)
- [Object generation failed with OpenAI](/docs/troubleshooting/no-object-generated-content-filter)
- [Missing Tool Results Error](/docs/troubleshooting/missing-tool-results-error)
- [Model is not assignable to type "LanguageModelV1"](/docs/troubleshooting/model-is-not-assignable-to-type)
- [TypeScript error "Cannot find namespace 'JSX'"](/docs/troubleshooting/typescript-cannot-find-namespace-jsx)
- [React error "Maximum update depth exceeded"](/docs/troubleshooting/react-maximum-update-depth-exceeded)
- [Jest: cannot find module '@ai-sdk/rsc'](/docs/troubleshooting/jest-cannot-find-module-ai-rsc)
- [High memory usage when processing many images](/docs/troubleshooting/high-memory-usage-with-images)


[Full Sitemap](/sitemap.md)
