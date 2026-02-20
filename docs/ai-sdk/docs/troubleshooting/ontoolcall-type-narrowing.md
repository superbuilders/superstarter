
# Type Error with onToolCall

When using the `onToolCall` callback with TypeScript, you may encounter type errors when trying to pass tool properties directly to `addToolOutput`.

## Problem

TypeScript cannot automatically narrow the type of `toolCall.toolName` when you have both static and dynamic tools, leading to type errors:

```tsx
// ❌ This causes a TypeScript error
const { messages, sendMessage, addToolOutput } = useChat({
  async onToolCall({ toolCall }) {
    addToolOutput({
      tool: toolCall.toolName, // Type 'string' is not assignable to type '"yourTool" | "yourOtherTool"'
      toolCallId: toolCall.toolCallId,
      output: someOutput,
    });
  },
});
```

The error occurs because:

- Static tools have specific literal types for their names (e.g., `"getWeatherInformation"`)
- Dynamic tools have `toolName` as a generic `string`
- TypeScript can't guarantee that `toolCall.toolName` matches your specific tool names

## Solution

Check if the tool is dynamic first to enable proper type narrowing:

```tsx
// ✅ Correct approach with type narrowing
const { messages, sendMessage, addToolOutput } = useChat({
  async onToolCall({ toolCall }) {
    // Check if it's a dynamic tool first
    if (toolCall.dynamic) {
      return;
    }

    // Now TypeScript knows this is a static tool with the correct type
    addToolOutput({
      tool: toolCall.toolName, // No type error!
      toolCallId: toolCall.toolCallId,
      output: someOutput,
    });
  },
});
```

<Note>
  If you're still using the deprecated `addToolResult` method, this solution
  applies the same way. Consider migrating to `addToolOutput` for consistency
  with the latest API.
</Note>

## Related

- [Chatbot Tool Usage](/docs/ai-sdk-ui/chatbot-tool-usage)
- [Dynamic Tools](/docs/reference/ai-sdk-core/dynamic-tool)
- [useChat Reference](/docs/reference/ai-sdk-ui/use-chat)


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
