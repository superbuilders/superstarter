
# `createAgentUIStream`

The `createAgentUIStream` function executes an [Agent](/docs/reference/ai-sdk-core/agent), consumes an array of UI messages, and streams the agent's output as UI message chunks via an async iterable. This enables real-time, incremental rendering of AI assistant output with full access to tool use, intermediate reasoning, and interactive UI features in your own runtime—perfect for building chat APIs, dashboards, or bots powered by agents.

## Import

<Snippet text={`import { createAgentUIStream } from "ai"`} prompt={false} />

## Usage

```ts
import { ToolLoopAgent, createAgentUIStream } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are a helpful assistant.',
  tools: { weather: weatherTool, calculator: calculatorTool },
});

export async function* streamAgent(
  uiMessages: unknown[],
  abortSignal?: AbortSignal,
) {
  const stream = await createAgentUIStream({
    agent,
    uiMessages,
    abortSignal,
    // ...other options (see below)
  });

  for await (const chunk of stream) {
    yield chunk; // Each chunk is a UI message output from the agent.
  }
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
        'The agent to run. Must define its `tools` and implement `.stream({ prompt, ... })`.',
    },
    {
      name: 'uiMessages',
      type: 'unknown[]',
      isRequired: true,
      description:
        'Array of input UI message objects (e.g., user/assistant/chat history). These will be validated and converted for the agent.',
    },
    {
      name: 'abortSignal',
      type: 'AbortSignal',
      isRequired: false,
      description:
        'Optional abort signal to cancel the stream early (for example, if the client disconnects).',
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
        'Optional agent call options, only needed if your agent expects extra configuration (see agent generic parameters).',
    },
    {
      name: 'experimental_transform',
      type: 'StreamTextTransform | StreamTextTransform[]',
      isRequired: false,
      description:
        'Optional transformations to apply to the agent output stream (experimental).',
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
        'Additional options to control the output stream, such as including sources or usage data.',
    },
  ]}
/>

## Returns

A `Promise<AsyncIterableStream<UIMessageChunk>>`, where each yielded chunk is a UI message output from the agent (see [`UIMessage`](/docs/reference/ai-sdk-core/ui-message)). This can be consumed with any async iterator loop, or piped to a streaming HTTP response, socket, or any other sink.

## Example

```ts
import { createAgentUIStream } from 'ai';

const controller = new AbortController();

const stream = await createAgentUIStream({
  agent,
  uiMessages: [{ role: 'user', content: 'What is the weather in SF today?' }],
  abortSignal: controller.signal,
  sendStart: true,
  // ...other UIMessageStreamOptions
});

for await (const chunk of stream) {
  // Each chunk is a UI message update — stream it to your client, dashboard, logs, etc.
  console.log(chunk);
}

// Call controller.abort() to cancel the agent operation early.
```

## How It Works

1. **UI Message Validation:** The input `uiMessages` array is validated and normalized using the agent's `tools` definition. Any invalid messages cause an error.
2. **Conversion to Model Messages:** The validated UI messages are converted into model-specific message format, as required by the agent.
3. **Agent Streaming:** The agent's `.stream({ prompt, ... })` method is invoked with the converted model messages, optional call options, abort signal, and any experimental transforms.
4. **UI Message Stream Building:** The result stream is converted and exposed as a streaming async iterable of UI message chunks for you to consume.

## Notes

- The agent **must** implement the `.stream({ prompt, ... })` method and define its supported `tools` property.
- This utility returns an async iterable for maximal streaming flexibility. For HTTP responses, see [`createAgentUIStreamResponse`](/docs/reference/ai-sdk-core/create-agent-ui-stream-response) (Web) or [`pipeAgentUIStreamToResponse`](/docs/reference/ai-sdk-core/pipe-agent-ui-stream-to-response) (Node.js).
- The `uiMessages` parameter is named `uiMessages`, **not** just `messages`.
- You can provide advanced options via `UIMessageStreamOptions` (for example, to include sources or usage).
- To cancel the stream, pass an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) via the `abortSignal` parameter.

## See Also

- [`Agent`](/docs/reference/ai-sdk-core/agent)
- [`ToolLoopAgent`](/docs/reference/ai-sdk-core/tool-loop-agent)
- [`UIMessage`](/docs/reference/ai-sdk-core/ui-message)
- [`createAgentUIStreamResponse`](/docs/reference/ai-sdk-core/create-agent-ui-stream-response)
- [`pipeAgentUIStreamToResponse`](/docs/reference/ai-sdk-core/pipe-agent-ui-stream-to-response)


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
