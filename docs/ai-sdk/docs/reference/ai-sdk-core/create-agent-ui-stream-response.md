
# `createAgentUIStreamResponse`

The `createAgentUIStreamResponse` function executes an [Agent](/docs/reference/ai-sdk-core/agent), runs its streaming output as a UI message stream, and returns an HTTP [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object whose body is the live, streaming UI message output. This is designed for API routes that deliver real-time agent results, such as chat endpoints or streaming tool-use operations.

## Import

<Snippet
  text={`import { createAgentUIStreamResponse } from "ai"`}
  prompt={false}
/>

## Usage

```ts
import { ToolLoopAgent, createAgentUIStreamResponse } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are a helpful assistant.',
  tools: { weather: weatherTool, calculator: calculatorTool },
});

export async function POST(request: Request) {
  const { messages } = await request.json();

  // Optional: support cancellation (aborts on disconnect, etc.)
  const abortController = new AbortController();

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    abortSignal: abortController.signal, // optional
    // ...other UIMessageStreamOptions like sendSources, experimental_transform, etc.
  });
}
```

## Parameters

<PropertiesTable
  content={[
    {
      name: 'agent',
      type: 'Agent',
      isRequired: true,
      description:
        'The agent instance to stream responses from. Must implement `.stream({ prompt, ... })` and define the `tools` property.',
    },
    {
      name: 'uiMessages',
      type: 'unknown[]',
      isRequired: true,
      description:
        'Array of input UI messages provided to the agent (e.g., user and assistant messages).',
    },
    {
      name: 'abortSignal',
      type: 'AbortSignal',
      isRequired: false,
      description:
        'Optional abort signal to cancel streaming, e.g., on client disconnect. This should be an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) instance.',
    },
    {
      name: 'timeout',
      type: 'number | { totalMs?: number }',
      isRequired: false,
      description:
        'Timeout in milliseconds. Can be specified as a number or as an object with a totalMs property. The call will be aborted if it takes longer than the specified timeout. Can be used alongside abortSignal.',
    },
    {
      name: 'options',
      type: 'CALL_OPTIONS',
      isRequired: false,
      description:
        'Optional agent call options, for agents with generic parameter `CALL_OPTIONS`.',
    },
    {
      name: 'experimental_transform',
      type: 'StreamTextTransform | StreamTextTransform[]',
      isRequired: false,
      description:
        'Optional stream transforms to post-process text output—the same as in lower-level streaming APIs.',
    },
    {
      name: 'onStepFinish',
      type: 'ToolLoopAgentOnStepFinishCallback',
      isRequired: false,
      description:
        'Callback invoked after each agent step (LLM/tool call) completes. Useful for tracking token usage or logging intermediate steps.',
    },
    {
      name: '...UIMessageStreamOptions',
      type: 'UIMessageStreamOptions',
      isRequired: false,
      description:
        'Other UI message output options—such as `sendSources` and more.',
    },
    {
      name: 'headers',
      type: 'HeadersInit',
      isRequired: false,
      description: 'Optional HTTP headers to include in the Response object.',
    },
    {
      name: 'status',
      type: 'number',
      isRequired: false,
      description: 'Optional HTTP status code.',
    },
    {
      name: 'statusText',
      type: 'string',
      isRequired: false,
      description: 'Optional HTTP status text.',
    },
    {
      name: 'consumeSseStream',
      type: '(options: { stream: ReadableStream<string> }) => PromiseLike<void> | void',
      isRequired: false,
      description:
        'Optional function to consume the SSE stream. When provided, this function will be called with the SSE stream to handle consumption.',
    },
  ]}
/>

## Returns

A `Promise<Response>` whose `body` is a streaming UI message output from the agent. Use this as the return value of API/server handlers in serverless, Next.js, Express, Hono, or edge runtime contexts.

## Example: Next.js API Route Handler

```ts
import { createAgentUIStreamResponse } from 'ai';
import { MyCustomAgent } from '@/agent/my-custom-agent';

export async function POST(request: Request) {
  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent: MyCustomAgent,
    uiMessages: messages,
    sendSources: true, // (optional)
    // headers, status, abortSignal, and other UIMessageStreamOptions also supported
  });
}
```

## How It Works

- 1. **UI Message Validation:** Validates the incoming `uiMessages` array according to the agent's specified tools and requirements.
- 2. **Model Message Conversion:** Converts validated UI messages into the internal model message format for the agent.
- 3. **Streaming Agent Output:** Invokes the agent’s `.stream({ prompt, ... })` to get a stream of chunks (steps/UI messages).
- 4. **HTTP Response Creation:** Wraps the output stream as a readable HTTP `Response` object that streams UI message chunks to the client.

## Notes

- Your agent **must** implement `.stream({ prompt, ... })` and define a `tools` property (even if it's just `{}`) to work with this function.
- **Server Only:** This API should only be called in backend/server-side contexts (API routes, edge/serverless/server route handlers, etc.). Not for browser use.
- Additional options (`headers`, `status`, UI stream options, transforms, etc.) are available for advanced scenarios.
- This leverages [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) so your platform/client must support HTTP streaming consumption.

## See Also

- [`Agent`](/docs/reference/ai-sdk-core/agent)
- [`ToolLoopAgent`](/docs/reference/ai-sdk-core/tool-loop-agent)
- [`UIMessage`](/docs/reference/ai-sdk-core/ui-message)
- [`createAgentUIStream`](/docs/reference/ai-sdk-core/create-agent-ui-stream)


## Navigation

- [generateText](/docs/reference/ai-sdk-core/generate-text)
- [streamText](/docs/reference/ai-sdk-core/stream-text)
- [generateObject](/docs/reference/ai-sdk-core/generate-object)
- [streamObject](/docs/reference/ai-sdk-core/stream-object)
- [embed](/docs/reference/ai-sdk-core/embed)
- [embedMany](/docs/reference/ai-sdk-core/embed-many)
- [rerank](/docs/reference/ai-sdk-core/rerank)
- [generateImage](/docs/reference/ai-sdk-core/generate-image)
- [transcribe](/docs/reference/ai-sdk-core/transcribe)
- [generateSpeech](/docs/reference/ai-sdk-core/generate-speech)
- [experimental_generateVideo](/docs/reference/ai-sdk-core/generate-video)
- [Agent (Interface)](/docs/reference/ai-sdk-core/agent)
- [ToolLoopAgent](/docs/reference/ai-sdk-core/tool-loop-agent)
- [createAgentUIStream](/docs/reference/ai-sdk-core/create-agent-ui-stream)
- [createAgentUIStreamResponse](/docs/reference/ai-sdk-core/create-agent-ui-stream-response)
- [pipeAgentUIStreamToResponse](/docs/reference/ai-sdk-core/pipe-agent-ui-stream-to-response)
- [tool](/docs/reference/ai-sdk-core/tool)
- [dynamicTool](/docs/reference/ai-sdk-core/dynamic-tool)
- [createMCPClient](/docs/reference/ai-sdk-core/create-mcp-client)
- [Experimental_StdioMCPTransport](/docs/reference/ai-sdk-core/mcp-stdio-transport)
- [jsonSchema](/docs/reference/ai-sdk-core/json-schema)
- [zodSchema](/docs/reference/ai-sdk-core/zod-schema)
- [valibotSchema](/docs/reference/ai-sdk-core/valibot-schema)
- [Output](/docs/reference/ai-sdk-core/output)
- [ModelMessage](/docs/reference/ai-sdk-core/model-message)
- [UIMessage](/docs/reference/ai-sdk-core/ui-message)
- [validateUIMessages](/docs/reference/ai-sdk-core/validate-ui-messages)
- [safeValidateUIMessages](/docs/reference/ai-sdk-core/safe-validate-ui-messages)
- [createProviderRegistry](/docs/reference/ai-sdk-core/provider-registry)
- [customProvider](/docs/reference/ai-sdk-core/custom-provider)
- [cosineSimilarity](/docs/reference/ai-sdk-core/cosine-similarity)
- [wrapLanguageModel](/docs/reference/ai-sdk-core/wrap-language-model)
- [wrapImageModel](/docs/reference/ai-sdk-core/wrap-image-model)
- [LanguageModelV3Middleware](/docs/reference/ai-sdk-core/language-model-v2-middleware)
- [extractReasoningMiddleware](/docs/reference/ai-sdk-core/extract-reasoning-middleware)
- [simulateStreamingMiddleware](/docs/reference/ai-sdk-core/simulate-streaming-middleware)
- [defaultSettingsMiddleware](/docs/reference/ai-sdk-core/default-settings-middleware)
- [addToolInputExamplesMiddleware](/docs/reference/ai-sdk-core/add-tool-input-examples-middleware)
- [extractJsonMiddleware](/docs/reference/ai-sdk-core/extract-json-middleware)
- [stepCountIs](/docs/reference/ai-sdk-core/step-count-is)
- [hasToolCall](/docs/reference/ai-sdk-core/has-tool-call)
- [simulateReadableStream](/docs/reference/ai-sdk-core/simulate-readable-stream)
- [smoothStream](/docs/reference/ai-sdk-core/smooth-stream)
- [generateId](/docs/reference/ai-sdk-core/generate-id)
- [createIdGenerator](/docs/reference/ai-sdk-core/create-id-generator)
- [DefaultGeneratedFile](/docs/reference/ai-sdk-core/default-generated-file)


[Full Sitemap](/sitemap.md)
