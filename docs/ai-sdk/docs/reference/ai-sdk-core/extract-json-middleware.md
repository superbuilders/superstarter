
# `extractJsonMiddleware()`

`extractJsonMiddleware` is a middleware function that extracts JSON from text content by stripping markdown code fences and other formatting. This is useful when using `Output.object()` with models that wrap JSON responses in markdown code blocks (e.g., ` ```json ... ``` `).

```ts
import { extractJsonMiddleware } from 'ai';

const middleware = extractJsonMiddleware();
```

## Import

<Snippet text={`import { extractJsonMiddleware } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'transform',
      type: '(text: string) => string',
      isOptional: true,
      description:
        'Custom transform function to apply to text content. Receives the raw text and should return the transformed text. If not provided, the default transform strips markdown code fences.',
    },
  ]}
/>

### Returns

Returns a middleware object that:

- Processes both streaming and non-streaming responses
- Strips markdown code fences (` ```json ` and ` ``` `) from text content
- Applies custom transformations when a `transform` function is provided
- Maintains proper streaming behavior with efficient buffering

## Usage Examples

### Basic Usage

Strip markdown code fences from model responses when using structured output:

```ts
import {
  generateText,
  wrapLanguageModel,
  extractJsonMiddleware,
  Output,
} from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: wrapLanguageModel({
    model: yourModel,
    middleware: extractJsonMiddleware(),
  }),
  output: Output.object({
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        steps: z.array(z.string()),
      }),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
});

console.log(result.output);
```

### With Streaming

The middleware also works with streaming responses:

```ts
import {
  streamText,
  wrapLanguageModel,
  extractJsonMiddleware,
  Output,
} from 'ai';
import { z } from 'zod';

const { partialOutputStream } = streamText({
  model: wrapLanguageModel({
    model: yourModel,
    middleware: extractJsonMiddleware(),
  }),
  output: Output.object({
    schema: z.object({
      recipe: z.object({
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
      }),
    }),
  }),
  prompt: 'Generate a detailed recipe.',
});

for await (const partialObject of partialOutputStream) {
  console.log(partialObject);
}
```

### Custom Transform Function

For models that use different formatting, you can provide a custom transform:

```ts
import { extractJsonMiddleware } from 'ai';

const middleware = extractJsonMiddleware({
  transform: text =>
    text
      .replace(/^PREFIX/, '')
      .replace(/SUFFIX$/, '')
      .trim(),
});
```

## How It Works

The middleware handles text content in two ways:

### Non-Streaming (generateText)

1. Receives the complete response from the model
2. Applies the transform function to strip markdown fences (or custom formatting)
3. Returns the cleaned text content

### Streaming (streamText)

1. Buffers initial content to detect markdown fence prefixes (` ```json\n `)
2. If a fence is detected, strips the prefix and switches to streaming mode
3. Maintains a small suffix buffer to handle the closing fence (` \n``` `)
4. When the stream ends, strips any trailing fence from the buffer
5. For custom transforms, buffers all content and applies the transform at the end

This approach ensures efficient streaming while correctly handling code fences that may be split across multiple chunks.


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
