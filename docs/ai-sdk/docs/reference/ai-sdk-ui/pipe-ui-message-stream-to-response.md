
# `pipeUIMessageStreamToResponse`

The `pipeUIMessageStreamToResponse` function pipes streaming data to a Node.js ServerResponse object (see [Streaming Data](/docs/ai-sdk-ui/streaming-data)).

## Import

<Snippet
  text={`import { pipeUIMessageStreamToResponse } from "ai"`}
  prompt={false}
/>

## Example

```tsx
pipeUIMessageStreamToResponse({
  response: serverResponse,
  status: 200,
  statusText: 'OK',
  headers: {
    'Custom-Header': 'value',
  },
  stream: myUIMessageStream,
  consumeSseStream: ({ stream }) => {
    // Optional: consume the SSE stream independently
    console.log('Consuming SSE stream:', stream);
  },
});
```

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'response',
      type: 'ServerResponse',
      description: 'The Node.js ServerResponse object to pipe the data to.',
    },
    {
      name: 'stream',
      type: 'ReadableStream<UIMessageChunk>',
      description: 'The UI message stream to pipe to the response.',
    },
    {
      name: 'status',
      type: 'number',
      isOptional: true,
      description: 'The status code for the response.',
    },
    {
      name: 'statusText',
      type: 'string',
      isOptional: true,
      description: 'The status text for the response.',
    },
    {
      name: 'headers',
      type: 'Headers | Record<string, string>',
      isOptional: true,
      description: 'Additional headers for the response.',
    },
    {
      name: 'consumeSseStream',
      type: '({ stream }: { stream: ReadableStream<string> }) => PromiseLike<void> | void',
      isOptional: true,
      description:
        'Optional function to consume the SSE stream independently. The stream is teed and this function receives a copy.',
    },
  ]}
/>


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
