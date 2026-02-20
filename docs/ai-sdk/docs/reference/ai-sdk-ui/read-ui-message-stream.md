
# readUIMessageStream

Transforms a stream of `UIMessageChunk`s into an `AsyncIterableStream` of `UIMessage`s.

UI message streams are useful outside of Chat use cases, e.g. for terminal UIs, custom stream consumption on the client, or RSC (React Server Components).

## Import

```tsx
import { readUIMessageStream } from 'ai';
```

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'message',
      type: 'UIMessage',
      isOptional: true,
      description:
        'The last assistant message to use as a starting point when the conversation is resumed. Otherwise undefined.',
    },
    {
      name: 'stream',
      type: 'ReadableStream<UIMessageChunk>',
      description: 'The stream of UIMessageChunk objects to read.',
    },
    {
      name: 'onError',
      type: '(error: unknown) => void',
      isOptional: true,
      description:
        'A function that is called when an error occurs during stream processing.',
    },
    {
      name: 'terminateOnError',
      type: 'boolean',
      isOptional: true,
      description:
        'Whether to terminate the stream if an error occurs. Defaults to false.',
    },
  ]}
/>

### Returns

An `AsyncIterableStream` of `UIMessage`s. Each stream part represents a different state of the same message as it is being completed.

For comprehensive examples and use cases, see [Reading UI Message Streams](/docs/ai-sdk-ui/reading-ui-message-streams).


## Navigation

- [useChat](/docs/reference/ai-sdk-ui/use-chat)
- [useCompletion](/docs/reference/ai-sdk-ui/use-completion)
- [useObject](/docs/reference/ai-sdk-ui/use-object)
- [convertToModelMessages](/docs/reference/ai-sdk-ui/convert-to-model-messages)
- [pruneMessages](/docs/reference/ai-sdk-ui/prune-messages)
- [createUIMessageStream](/docs/reference/ai-sdk-ui/create-ui-message-stream)
- [createUIMessageStreamResponse](/docs/reference/ai-sdk-ui/create-ui-message-stream-response)
- [pipeUIMessageStreamToResponse](/docs/reference/ai-sdk-ui/pipe-ui-message-stream-to-response)
- [readUIMessageStream](/docs/reference/ai-sdk-ui/read-ui-message-stream)
- [InferUITools](/docs/reference/ai-sdk-ui/infer-ui-tools)
- [InferUITool](/docs/reference/ai-sdk-ui/infer-ui-tool)
- [DirectChatTransport](/docs/reference/ai-sdk-ui/direct-chat-transport)


[Full Sitemap](/sitemap.md)
