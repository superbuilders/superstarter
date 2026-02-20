
# `hasToolCall()`

Creates a stop condition that stops when a specific tool is called.

This function is used with `stopWhen` in `generateText` and `streamText` to control when a tool-calling loop should stop based on whether a particular tool has been invoked.

```ts
import { generateText, hasToolCall } from 'ai';
__PROVIDER_IMPORT__;

const result = await generateText({
  model: __MODEL__,
  tools: {
    weather: weatherTool,
    finalAnswer: finalAnswerTool,
  },
  // Stop when the finalAnswer tool is called
  stopWhen: hasToolCall('finalAnswer'),
});
```

## Import

<Snippet text={`import { hasToolCall } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'toolName',
      type: 'string',
      description:
        'The name of the tool that should trigger the stop condition when called.',
    },
  ]}
/>

### Returns

A `StopCondition` function that returns `true` when the specified tool is called in the current step. The function can be used with the `stopWhen` parameter in `generateText` and `streamText`.

## Examples

### Basic Usage

Stop when a specific tool is called:

```ts
import { generateText, hasToolCall } from 'ai';

const result = await generateText({
  model: yourModel,
  tools: {
    submitAnswer: submitAnswerTool,
    search: searchTool,
  },
  stopWhen: hasToolCall('submitAnswer'),
});
```

### Combining with Other Conditions

You can combine multiple stop conditions in an array:

```ts
import { generateText, hasToolCall, stepCountIs } from 'ai';

const result = await generateText({
  model: yourModel,
  tools: {
    weather: weatherTool,
    search: searchTool,
    finalAnswer: finalAnswerTool,
  },
  // Stop when weather tool is called OR finalAnswer is called OR after 5 steps
  stopWhen: [
    hasToolCall('weather'),
    hasToolCall('finalAnswer'),
    stepCountIs(5),
  ],
});
```

### Agent Pattern

Common pattern for agents that run until they provide a final answer:

```ts
import { generateText, hasToolCall } from 'ai';

const result = await generateText({
  model: yourModel,
  tools: {
    search: searchTool,
    calculate: calculateTool,
    finalAnswer: {
      description: 'Provide the final answer to the user',
      parameters: z.object({
        answer: z.string(),
      }),
      execute: async ({ answer }) => answer,
    },
  },
  stopWhen: hasToolCall('finalAnswer'),
});
```

## See also

- [`stepCountIs()`](/docs/reference/ai-sdk-core/step-count-is)
- [`generateText()`](/docs/reference/ai-sdk-core/generate-text)
- [`streamText()`](/docs/reference/ai-sdk-core/stream-text)


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
