
# `safeValidateUIMessages`

`safeValidateUIMessages` is an async function that validates UI messages like [`validateUIMessages`](https://ai-sdk.dev/docs/reference/ai-sdk-core/validate-ui-messages), but instead of throwing it returns an object with a `success` key and either `data` or `error`.

## Basic Usage

Simple validation without custom schemas:

```typescript
import { safeValidateUIMessages } from 'ai';

const messages = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hello!' }],
  },
];

const result = await safeValidateUIMessages({
  messages,
});

if (!result.success) {
  console.error(result.error.message);
} else {
  const validatedMessages = result.data;
}
```

## Advanced Usage

Comprehensive validation with custom metadata, data parts, and tools:

```typescript
import { safeValidateUIMessages, tool } from 'ai';
import { z } from 'zod';

// Define schemas
const metadataSchema = z.object({
  timestamp: z.string().datetime(),
  userId: z.string(),
});

const dataSchemas = {
  chart: z.object({
    data: z.array(z.number()),
    labels: z.array(z.string()),
  }),
  image: z.object({
    url: z.string().url(),
    caption: z.string(),
  }),
};

const tools = {
  weather: tool({
    description: 'Get weather info',
    parameters: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => `Weather in ${location}: sunny`,
  }),
};

// Messages with custom parts
const messages = [
  {
    id: '1',
    role: 'user',
    metadata: { timestamp: '2024-01-01T00:00:00Z', userId: 'user123' },
    parts: [
      { type: 'text', text: 'Show me a chart' },
      {
        type: 'data-chart',
        data: { data: [1, 2, 3], labels: ['A', 'B', 'C'] },
      },
    ],
  },
  {
    id: '2',
    role: 'assistant',
    parts: [
      {
        type: 'tool-weather',
        toolCallId: 'call_123',
        state: 'output-available',
        input: { location: 'San Francisco' },
        output: 'Weather in San Francisco: sunny',
      },
    ],
  },
];

// Validate with all schemas
const result = await safeValidateUIMessages({
  messages,
  metadataSchema,
  dataSchemas,
  tools,
});

if (!result.success) {
  console.error(result.error.message);
} else {
  const validatedMessages = result.data;
}
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
