
# `addToolInputExamplesMiddleware`

`addToolInputExamplesMiddleware` is a middleware function that appends input examples to tool descriptions. This is especially useful for language model providers that **do not natively support the `inputExamples` property**—the middleware serializes and injects the examples into the tool's `description` so models can learn from them.

## Import

<Snippet
  text={`import { addToolInputExamplesMiddleware } from "ai"`}
  prompt={false}
/>

## API

### Signature

```ts
function addToolInputExamplesMiddleware(options?: {
  prefix?: string;
  format?: (example: { input: JSONObject }, index: number) => string;
  remove?: boolean;
}): LanguageModelMiddleware;
```

### Parameters

<PropertiesTable
  content={[
    {
      name: 'prefix',
      type: 'string',
      isOptional: true,
      description:
        "A prefix prepended before the input examples section. Defaults to `'Input Examples:'`.",
    },
    {
      name: 'format',
      type: '(example: { input: JSONObject }, index: number) => string',
      isOptional: true,
      description:
        'Optional custom formatter for each example. Receives the example object and its index. Default: JSON.stringify(example.input).',
    },
    {
      name: 'remove',
      type: 'boolean',
      isOptional: true,
      description:
        'Whether to remove the `inputExamples` property from the tool after adding them to the description. Default: true.',
    },
  ]}
/>

### Returns

A [LanguageModelMiddleware](/docs/ai-sdk-core/middleware) that:

- Locates function tools with an `inputExamples` property.
- Serializes each input example (by default as JSON, or using your custom formatter).
- Prepends a section at the end of the tool description containing all formatted examples, prefixed by the `prefix`.
- Removes the `inputExamples` property from the tool (unless `remove: false`).
- Passes through all other tools (including those without examples) unchanged.

## Usage Example

```ts
import {
  generateText,
  tool,
  wrapLanguageModel,
  addToolInputExamplesMiddleware,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const model = wrapLanguageModel({
  model: __MODEL__,
  middleware: addToolInputExamplesMiddleware({
    prefix: 'Input Examples:',
    format: (example, index) =>
      `${index + 1}. ${JSON.stringify(example.input)}`,
  }),
});

const result = await generateText({
  model,
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({ location: z.string() }),
      inputExamples: [
        { input: { location: 'San Francisco' } },
        { input: { location: 'London' } },
      ],
    }),
  },
  prompt: 'What is the weather in Tokyo?',
});
```

## How It Works

1. For every function tool that defines `inputExamples`, the middleware:

   - Formats each example with the `format` function (default: JSON.stringify).
   - Builds a section like:

     ```
     Input Examples:
     {"location":"San Francisco"}
     {"location":"London"}
     ```

   - Appends this section to the end of the tool's `description`.

2. By default, it removes the `inputExamples` property after appending to prevent duplication (can be disabled with `remove: false`).
3. Tools without input examples or non-function tools are left unmodified.

> **Tip:** This middleware is especially useful with providers such as OpenAI or Anthropic, where native support for `inputExamples` is not available.

## Example effect

If your original tool definition is:

```ts
{
  type: 'function',
  name: 'weather',
  description: 'Get the weather in a location',
  inputSchema: { ... },
  inputExamples: [
    { input: { location: 'San Francisco' } },
    { input: { location: 'London' } }
  ]
}
```

After applying the middleware (with default settings), the tool passed to the model will look like:

```ts
{
  type: 'function',
  name: 'weather',
  description: `Get the weather in a location

Input Examples:
{"location":"San Francisco"}
{"location":"London"}`,
  inputSchema: { ... }
  // inputExamples is removed by default
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
