
# `customProvider()`

With a custom provider, you can map ids to any model.
This allows you to set up custom model configurations, alias names, and more.
The custom provider also supports a fallback provider, which is useful for
wrapping existing providers and adding additional functionality.

### Example: custom model settings

You can create a custom provider using `customProvider`.

```ts
import { openai } from '@ai-sdk/openai';
import { customProvider } from 'ai';

// custom provider with different model settings:
export const myOpenAI = customProvider({
  languageModels: {
    // replacement model with custom settings:
    'gpt-4': wrapLanguageModel({
      model: openai('gpt-4'),
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            openai: {
              reasoningEffort: 'high',
            },
          },
        },
      }),
    }),
    // alias model with custom settings:
    'gpt-4o-reasoning-high': wrapLanguageModel({
      model: openai('gpt-4o'),
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            openai: {
              reasoningEffort: 'high',
            },
          },
        },
      }),
    }),
  },
  fallbackProvider: openai,
});
```

## Import

<Snippet text={`import {  customProvider } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'languageModels',
      type: 'Record<string, LanguageModel>',
      isOptional: true,
      description:
        'A record of language models, where keys are model IDs and values are LanguageModel instances.',
    },
    {
      name: '.embeddingModels',
      type: 'Record<string, EmbeddingModel<string>>',
      isOptional: true,
      description:
        'A record of text embedding models, where keys are model IDs and values are EmbeddingModel<string> instances.',
    },
    {
      name: 'imageModels',
      type: 'Record<string, ImageModel>',
      isOptional: true,
      description:
        'A record of image models, where keys are model IDs and values are image model instances.',
    },
    {
      name: 'transcriptionModels',
      type: 'Record<string, TranscriptionModel>',
      isOptional: true,
      description:
        'A record of transcription models, where keys are model IDs and values are TranscriptionModel instances.',
    },
    {
      name: 'speechModels',
      type: 'Record<string, SpeechModel>',
      isOptional: true,
      description:
        'A record of speech models, where keys are model IDs and values are SpeechModel instances.',
    },
    {
      name: 'rerankingModels',
      type: 'Record<string, RerankingModel>',
      isOptional: true,
      description:
        'A record of reranking models, where keys are model IDs and values are RerankingModel instances.',
    },
    {
      name: 'fallbackProvider',
      type: 'Provider',
      isOptional: true,
      description:
        'An optional fallback provider to use when a requested model is not found in the custom provider.',
    },
  ]}
/>

### Returns

The `customProvider` function returns a `Provider` instance. It has the following methods:

<PropertiesTable
  content={[
    {
      name: 'languageModel',
      type: '(id: string) => LanguageModel',
      description:
        'A function that returns a language model by its id (format: providerId:modelId)',
    },
    {
      name: 'embeddingModel',
      type: '(id: string) => EmbeddingModel<string>',
      description:
        'A function that returns a text embedding model by its id (format: providerId:modelId)',
    },
    {
      name: 'imageModel',
      type: '(id: string) => ImageModel',
      description:
        'A function that returns an image model by its id (format: providerId:modelId)',
    },
    {
      name: 'transcriptionModel',
      type: '(id: string) => TranscriptionModel',
      description: 'A function that returns a transcription model by its id.',
    },
    {
      name: 'speechModel',
      type: '(id: string) => SpeechModel',
      description: 'A function that returns a speech model by its id.',
    },
    {
      name: 'rerankingModel',
      type: '(id: string) => RerankingModel',
      description: 'A function that returns a reranking model by its id.',
    },
  ]}
/>


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
