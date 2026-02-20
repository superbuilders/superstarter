
# `smoothStream()`

`smoothStream` is a utility function that creates a TransformStream
for the `streamText` `transform` option
to smooth out text and reasoning streaming by buffering and releasing complete chunks with configurable delays.
This creates a more natural reading experience when streaming text and reasoning responses.

```ts highlight={"6-9"}
import { smoothStream, streamText } from 'ai';

const result = streamText({
  model,
  prompt,
  experimental_transform: smoothStream({
    delayInMs: 20, // optional: defaults to 10ms
    chunking: 'line', // optional: defaults to 'word'
  }),
});
```

## Import

<Snippet text={`import { smoothStream } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'delayInMs',
      type: 'number | null',
      isOptional: true,
      description:
        'The delay in milliseconds between outputting each chunk. Defaults to 10ms. Set to `null` to disable delays.',
    },
    {
      name: 'chunking',
      type: '"word" | "line" | RegExp | Intl.Segmenter | (buffer: string) => string | undefined | null',
      isOptional: true,
      description:
        'Controls how text and reasoning content is chunked for streaming. Use "word" to stream word by word (default), "line" to stream line by line, an Intl.Segmenter for locale-aware word segmentation (recommended for CJK languages), or provide a custom callback or RegExp pattern for custom chunking.',
    },
  ]}
/>

#### Word chunking caveats with non-latin languages

The word based chunking **does not work well** with the following languages that do not delimit words with spaces:

- Chinese
- Japanese
- Korean
- Vietnamese
- Thai

#### Using Intl.Segmenter (recommended)

For these languages, we recommend using `Intl.Segmenter` for proper locale-aware word segmentation.
This is the preferred approach as it provides accurate word boundaries for CJK and other languages.

<Note>
  `Intl.Segmenter` is available in Node.js 16+ and all modern browsers (Chrome
  87+, Firefox 125+, Safari 14.1+).
</Note>

```tsx filename="Japanese example with Intl.Segmenter"
import { smoothStream, streamText } from 'ai';
__PROVIDER_IMPORT__;

const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });

const result = streamText({
  model: __MODEL__,
  prompt: 'Your prompt here',
  experimental_transform: smoothStream({
    chunking: segmenter,
  }),
});
```

```tsx filename="Chinese example with Intl.Segmenter"
import { smoothStream, streamText } from 'ai';
__PROVIDER_IMPORT__;

const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });

const result = streamText({
  model: __MODEL__,
  prompt: 'Your prompt here',
  experimental_transform: smoothStream({
    chunking: segmenter,
  }),
});
```

#### Regex based chunking

To use regex based chunking, pass a `RegExp` to the `chunking` option.

```ts
// To split on underscores:
smoothStream({
  chunking: /_+/,
});

// Also can do it like this, same behavior
smoothStream({
  chunking: /[^_]*_/,
});
```

#### Custom callback chunking

To use a custom callback for chunking, pass a function to the `chunking` option.

```ts
smoothStream({
  chunking: text => {
    const findString = 'some string';
    const index = text.indexOf(findString);

    if (index === -1) {
      return null;
    }

    return text.slice(0, index) + findString;
  },
});
```

### Returns

Returns a `TransformStream` that:

- Buffers incoming text and reasoning chunks
- Releases content when the chunking pattern is encountered
- Adds configurable delays between chunks for smooth output
- Passes through non-text/reasoning chunks (like tool calls, step-finish events) immediately


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
