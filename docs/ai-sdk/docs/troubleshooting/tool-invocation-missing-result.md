
# Tool Invocation Missing Result Error

## Issue

When using `generateText()` or `streamText()`, you may encounter the error "ToolInvocation must have a result" when a tool without an `execute` function is called.

## Cause

The error occurs when you define a tool without an `execute` function and don't provide the result through other means (like `useChat`'s `onToolCall` or `addToolOutput` functions).

Each time a tool is invoked, the model expects to receive a result before continuing the conversation. Without a result, the model cannot determine if the tool call succeeded or failed and the conversation state becomes invalid.

## Solution

You have two options for handling tool results:

1. Server-side execution using tools with an `execute` function:

```tsx
const tools = {
  weather: tool({
    description: 'Get the weather in a location',
    parameters: z.object({
      location: z
        .string()
        .describe('The city and state, e.g. "San Francisco, CA"'),
    }),
    execute: async ({ location }) => {
      // Fetch and return weather data
      return { temperature: 72, conditions: 'sunny', location };
    },
  }),
};
```

2. Client-side execution with `useChat` (omitting the `execute` function), you must provide results using `addToolOutput`:

```tsx
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';

const { messages, sendMessage, addToolOutput } = useChat({
  // Automatically submit when all tool results are available
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

  // Handle tool calls in onToolCall
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === 'getLocation') {
      try {
        const result = await getLocationData();

        // Important: Don't await inside onToolCall to avoid deadlocks
        addToolOutput({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          output: result,
        });
      } catch (err) {
        // Important: Don't await inside onToolCall to avoid deadlocks
        addToolOutput({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: 'Failed to get location',
        });
      }
    }
  },
});
```

```tsx
// For interactive UI elements:
const { messages, sendMessage, addToolOutput } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
});

// Inside your JSX, when rendering tool calls:
<button
  onClick={() =>
    addToolOutput({
      tool: 'myTool',
      toolCallId, // must provide tool call ID
      output: {
        /* your tool result */
      },
    })
  }
>
  Confirm
</button>;
```

<Note type="warning">
  Whether handling tools on the server or client, each tool call must have a
  corresponding result before the conversation can continue.
</Note>


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
