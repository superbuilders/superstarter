
# `ToolLoopAgent`

Creates a reusable AI agent capable of generating text, streaming responses, and using tools over multiple steps (a reasoning-and-acting loop). `ToolLoopAgent` is ideal for building autonomous, multi-step agents that can take actions, call tools, and reason over the results until a stop condition is reached.

Unlike single-step calls like `generateText()`, an agent can iteratively invoke tools, collect tool results, and decide next actions until completion or user approval is required.

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are a helpful assistant.',
  tools: {
    weather: weatherTool,
    calculator: calculatorTool,
  },
});

const result = await agent.generate({
  prompt: 'What is the weather in NYC?',
});

console.log(result.text);
```

To see `ToolLoopAgent` in action, check out [these examples](#examples).

## Import

<Snippet text={`import { ToolLoopAgent } from "ai"`} prompt={false} />

## Constructor

### Parameters

<PropertiesTable
  content={[
    {
      name: 'model',
      type: 'LanguageModel',
      isRequired: true,
      description:
        'The language model instance to use (e.g., from a provider).',
    },
    {
      name: 'instructions',
      type: 'string | SystemModelMessage | SystemModelMessage[]',
      isOptional: true,
      description:
        'Instructions for the agent, usually used for system prompt/context.',
    },
    {
      name: 'tools',
      type: 'Record<string, Tool>',
      isOptional: true,
      description:
        'A set of tools the agent can call. Keys are tool names. Tools require the underlying model to support tool calling.',
    },
    {
      name: 'toolChoice',
      type: 'ToolChoice',
      isOptional: true,
      description:
        "Tool call selection strategy. Options: 'auto' | 'none' | 'required' | { type: 'tool', toolName: string }. Default: 'auto'.",
    },
    {
      name: 'stopWhen',
      type: 'StopCondition | StopCondition[]',
      isOptional: true,
      description:
        'Condition(s) for ending the agent loop. Default: stepCountIs(20).',
    },
    {
      name: 'activeTools',
      type: 'Array<string>',
      isOptional: true,
      description:
        'Limits the subset of tools that are available in a specific call.',
    },
    {
      name: 'output',
      type: 'Output',
      isOptional: true,
      description:
        'Optional structured output specification, for parsing responses into typesafe data.',
    },
    {
      name: 'prepareStep',
      type: 'PrepareStepFunction',
      isOptional: true,
      description:
        'Optional function to mutate step settings or inject state for each agent step.',
    },
    {
      name: 'experimental_repairToolCall',
      type: 'ToolCallRepairFunction',
      isOptional: true,
      description:
        'Optional callback to attempt automatic recovery when a tool call cannot be parsed.',
    },
    {
      name: 'onStepFinish',
      type: 'GenerateTextOnStepFinishCallback',
      isOptional: true,
      description:
        'Callback invoked after each agent step (LLM/tool call) completes.',
    },
    {
      name: 'onFinish',
      type: 'ToolLoopAgentOnFinishCallback',
      isOptional: true,
      description:
        'Callback that is called when all agent steps are finished and the response is complete. Receives { steps, result, experimental_context }.',
    },
    {
      name: 'experimental_context',
      type: 'unknown',
      isOptional: true,
      description:
        'Experimental: Custom context object passed to each tool call.',
    },
    {
      name: 'experimental_telemetry',
      type: 'TelemetrySettings',
      isOptional: true,
      description: 'Experimental: Optional telemetry configuration.',
    },
    {
      name: 'experimental_download',
      type: 'DownloadFunction | undefined',
      isOptional: true,
      description:
        'Experimental: Custom download function for fetching files/URLs for tool or model use. By default, files are downloaded if the model does not support the URL for a given media type.',
    },
    {
      name: 'maxOutputTokens',
      type: 'number',
      isOptional: true,
      description: 'Maximum number of tokens the model is allowed to generate.',
    },
    {
      name: 'temperature',
      type: 'number',
      isOptional: true,
      description:
        'Sampling temperature, controls randomness. Passed through to the model.',
    },
    {
      name: 'topP',
      type: 'number',
      isOptional: true,
      description:
        'Top-p (nucleus) sampling parameter. Passed through to the model.',
    },
    {
      name: 'topK',
      type: 'number',
      isOptional: true,
      description: 'Top-k sampling parameter. Passed through to the model.',
    },
    {
      name: 'presencePenalty',
      type: 'number',
      isOptional: true,
      description: 'Presence penalty parameter. Passed through to the model.',
    },
    {
      name: 'frequencyPenalty',
      type: 'number',
      isOptional: true,
      description: 'Frequency penalty parameter. Passed through to the model.',
    },
    {
      name: 'stopSequences',
      type: 'string[]',
      isOptional: true,
      description:
        'Custom token sequences which stop the model output. Passed through to the model.',
    },
    {
      name: 'seed',
      type: 'number',
      isOptional: true,
      description: 'Seed for deterministic generation (if supported).',
    },
    {
      name: 'maxRetries',
      type: 'number',
      isOptional: true,
      description: 'How many times to retry on failure. Default: 2.',
    },
    {
      name: 'providerOptions',
      type: 'ProviderOptions',
      isOptional: true,
      description: 'Additional provider-specific configuration.',
    },
    {
      name: 'headers',
      type: 'Record<string, string | undefined>',
      isOptional: true,
      description:
        'Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.',
    },
    {
      name: 'callOptionsSchema',
      type: 'FlexibleSchema<CALL_OPTIONS>',
      isOptional: true,
      description:
        'Optional schema for custom call options that can be passed when calling generate() or stream().',
    },
    {
      name: 'prepareCall',
      type: 'PrepareCallFunction',
      isOptional: true,
      description:
        'Optional function to prepare call-specific settings based on the call options.',
    },
    {
      name: 'id',
      type: 'string',
      isOptional: true,
      description: 'Custom agent identifier.',
    },
  ]}
/>

## Methods

### `generate()`

Generates a response and triggers tool calls as needed, running the agent loop and returning the final result. Returns a promise resolving to a `GenerateTextResult`.

```ts
const result = await agent.generate({
  prompt: 'What is the weather like?',
});
```

<PropertiesTable
  content={[
    {
      name: 'prompt',
      type: 'string | Array<ModelMessage>',
      description: 'A text prompt or message array.',
    },
    {
      name: 'messages',
      type: 'Array<ModelMessage>',
      description: 'A full conversation history as a list of model messages.',
    },
    {
      name: 'abortSignal',
      type: 'AbortSignal',
      isOptional: true,
      description:
        'An optional abort signal that can be used to cancel the call.',
    },
    {
      name: 'timeout',
      type: 'number | { totalMs?: number; stepMs?: number; chunkMs?: number }',
      isOptional: true,
      description:
        'Timeout in milliseconds. Can be specified as a number or as an object with totalMs, stepMs, and/or chunkMs properties. The call will be aborted if it takes longer than the specified timeout. Can be used alongside abortSignal.',
    },
    {
      name: 'options',
      type: 'CALL_OPTIONS',
      isOptional: true,
      description:
        'Custom call options when the agent is configured with a callOptionsSchema.',
    },
    {
      name: 'onStepFinish',
      type: 'ToolLoopAgentOnStepFinishCallback',
      isOptional: true,
      description:
        'Callback invoked after each agent step (LLM/tool call) completes. If also specified in the constructor, both callbacks are called (constructor first, then this one).',
    },
  ]}
/>

#### Returns

The `generate()` method returns a `GenerateTextResult` object (see [`generateText`](/docs/reference/ai-sdk-core/generate-text#returns) for details).

### `stream()`

Streams a response from the agent, including agent reasoning and tool calls, as they occur. Returns a `StreamTextResult`.

```ts
const stream = agent.stream({
  prompt: 'Tell me a story about a robot.',
});

for await (const chunk of stream.textStream) {
  console.log(chunk);
}
```

<PropertiesTable
  content={[
    {
      name: 'prompt',
      type: 'string | Array<ModelMessage>',
      description: 'A text prompt or message array.',
    },
    {
      name: 'messages',
      type: 'Array<ModelMessage>',
      description: 'A full conversation history as a list of model messages.',
    },
    {
      name: 'abortSignal',
      type: 'AbortSignal',
      isOptional: true,
      description:
        'An optional abort signal that can be used to cancel the call.',
    },
    {
      name: 'timeout',
      type: 'number | { totalMs?: number; stepMs?: number; chunkMs?: number }',
      isOptional: true,
      description:
        'Timeout in milliseconds. Can be specified as a number or as an object with totalMs, stepMs, and/or chunkMs properties. The call will be aborted if it takes longer than the specified timeout. Can be used alongside abortSignal.',
    },
    {
      name: 'options',
      type: 'CALL_OPTIONS',
      isOptional: true,
      description:
        'Custom call options when the agent is configured with a callOptionsSchema.',
    },
    {
      name: 'experimental_transform',
      type: 'StreamTextTransform | Array<StreamTextTransform>',
      isOptional: true,
      description:
        'Optional stream transformation(s). They are applied in the order provided and must maintain the stream structure. See `streamText` docs for details.',
    },
    {
      name: 'onStepFinish',
      type: 'ToolLoopAgentOnStepFinishCallback',
      isOptional: true,
      description:
        'Callback invoked after each agent step (LLM/tool call) completes. If also specified in the constructor, both callbacks are called (constructor first, then this one).',
    },
  ]}
/>

#### Returns

The `stream()` method returns a `StreamTextResult` object (see [`streamText`](/docs/reference/ai-sdk-core/stream-text#returns) for details).

## Types

### `InferAgentUIMessage`

Infers the UI message type for the given agent instance. Useful for type-safe UI and message exchanges.

#### Basic Example

```ts
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';

const weatherAgent = new ToolLoopAgent({
  model: __MODEL__,
  tools: { weather: weatherTool },
});

type WeatherAgentUIMessage = InferAgentUIMessage<typeof weatherAgent>;
```

#### Example with Message Metadata

You can provide a second type argument to customize the metadata for each message. This is useful for tracking rich metadata returned by the agent (such as createdAt, tokens, finish reason, etc.).

```ts
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';
import { z } from 'zod';

// Example schema for message metadata
const exampleMetadataSchema = z.object({
  createdAt: z.number().optional(),
  model: z.string().optional(),
  totalTokens: z.number().optional(),
  finishReason: z.string().optional(),
});
type ExampleMetadata = z.infer<typeof exampleMetadataSchema>;

// Define agent as usual
const metadataAgent = new ToolLoopAgent({
  model: __MODEL__,
  // ...other options
});

// Type-safe UI message type with custom metadata
type MetadataAgentUIMessage = InferAgentUIMessage<
  typeof metadataAgent,
  ExampleMetadata
>;
```

## Examples

### Basic Agent with Tools

```ts
import { ToolLoopAgent, stepCountIs } from 'ai';
import { weatherTool, calculatorTool } from './tools';

const assistant = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are a helpful assistant.',
  tools: {
    weather: weatherTool,
    calculator: calculatorTool,
  },
  stopWhen: stepCountIs(3),
});

const result = await assistant.generate({
  prompt: 'What is the weather in NYC and what is 100 * 25?',
});

console.log(result.text);
console.log(result.steps); // Array of all steps taken by the agent
```

### Streaming Agent Response

```ts
const agent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are a creative storyteller.',
});

const stream = agent.stream({
  prompt: 'Tell me a short story about a time traveler.',
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Agent with Output Parsing

```ts
import { z } from 'zod';

const analysisAgent = new ToolLoopAgent({
  model: __MODEL__,
  output: {
    schema: z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      score: z.number(),
      summary: z.string(),
    }),
  },
});

const result = await analysisAgent.generate({
  prompt: 'Analyze this review: "The product exceeded my expectations!"',
});

console.log(result.output);
// Typed as { sentiment: 'positive' | 'negative' | 'neutral', score: number, summary: string }
```

### Example: Approved Tool Execution

```ts
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are an agent with access to a weather API.',
  tools: {
    weather: openai.tools.weather({
      /* ... */
    }),
  },
  // Optionally require approval, etc.
});

const result = await agent.generate({
  prompt: 'Is it raining in Paris today?',
});
console.log(result.text);
```


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
