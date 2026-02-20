
# `generateImage()`

Generates images based on a given prompt using an image model.

It is ideal for use cases where you need to generate images programmatically,
such as creating visual content or generating images for data augmentation.

```ts
import { generateImage } from 'ai';

const { images } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'A futuristic cityscape at sunset',
  n: 3,
  size: '1024x1024',
});

console.log(images);
```

## Import

<Snippet text={`import { generateImage } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'model',
      type: 'ImageModelV3',
      description: 'The image model to use.',
    },
    {
      name: 'prompt',
      type: 'string | GenerateImagePrompt',
      description: 'The input prompt to generate the image from.',
      properties: [
        {
          type: 'GenerateImagePrompt',
          type: 'object',
          description: 'A prompt object for image editing',
          parameters: [
            {
              name: 'images',
              type: 'Array<DataContent>',
              description:
                'an image item can be one of: base64-encoded string, a `Uint8Array`, an `ArrayBuffer`, or a `Buffer`.',
            },
            {
              name: 'text',
              type: 'string',
              description: 'The text prompt.',
            },
            {
              name: 'mask',
              type: 'DataContent',
              description:
                'base64-encoded string, a `Uint8Array`, an `ArrayBuffer`, or a `Buffer`.',
            },
          ],
        },
      ],
    },
    {
      name: 'n',
      type: 'number',
      isOptional: true,
      description: 'Number of images to generate.',
    },
    {
      name: 'size',
      type: 'string',
      isOptional: true,
      description:
        'Size of the images to generate. Format: `{width}x{height}`.',
    },
    {
      name: 'aspectRatio',
      type: 'string',
      isOptional: true,
      description:
        'Aspect ratio of the images to generate. Format: `{width}:{height}`.',
    },
    {
      name: 'seed',
      type: 'number',
      isOptional: true,
      description: 'Seed for the image generation.',
    },
    {
      name: 'providerOptions',
      type: 'ProviderOptions',
      isOptional: true,
      description: 'Additional provider-specific options.',
    },
    {
      name: 'maxImagesPerCall',
      type: 'number',
      isOptional: true,
      description:
        'Maximum number of images to generate per API call. When n exceeds this value, multiple API calls will be made.',
    },
    {
      name: 'maxRetries',
      type: 'number',
      isOptional: true,
      description: 'Maximum number of retries. Default: 2.',
    },
    {
      name: 'abortSignal',
      type: 'AbortSignal',
      isOptional: true,
      description: 'An optional abort signal to cancel the call.',
    },
    {
      name: 'headers',
      type: 'Record<string, string>',
      isOptional: true,
      description: 'Additional HTTP headers for the request.',
    },
  ]}
/>

### Returns

<PropertiesTable
  content={[
    {
      name: 'image',
      type: 'GeneratedFile',
      description: 'The first image that was generated.',
      properties: [
        {
          type: 'GeneratedFile',
          parameters: [
            {
              name: 'base64',
              type: 'string',
              description: 'Image as a base64 encoded string.',
            },
            {
              name: 'uint8Array',
              type: 'Uint8Array',
              description: 'Image as a Uint8Array.',
            },
            {
              name: 'mediaType',
              type: 'string',
              description: 'The IANA media type of the image.',
            },
          ],
        },
      ],
    },
    {
      name: 'images',
      type: 'Array<GeneratedFile>',
      description: 'All images that were generated.',
      properties: [
        {
          type: 'GeneratedFile',
          parameters: [
            {
              name: 'base64',
              type: 'string',
              description: 'Image as a base64 encoded string.',
            },
            {
              name: 'uint8Array',
              type: 'Uint8Array',
              description: 'Image as a Uint8Array.',
            },
            {
              name: 'mediaType',
              type: 'string',
              description: 'The IANA media type of the image.',
            },
          ],
        },
      ],
    },
    {
      name: 'warnings',
      type: 'Warning[]',
      description:
        'Warnings from the model provider (e.g. unsupported settings).',
    },
    {
      name: 'usage',
      type: 'ImageModelUsage',
      description: 'The usage statistics for the image generation.',
      properties: [
        {
          type: 'ImageModelUsage',
          parameters: [
            {
              name: 'imagesGenerated',
              type: 'number',
              description: 'The total number of images generated.',
            },
          ],
        },
      ],
    },
    {
      name: 'providerMetadata',
      type: 'ImageModelProviderMetadata',
      isOptional: true,
      description:
        'Optional metadata from the provider. The outer key is the provider name. The inner values are the metadata. An `images` key is always present in the metadata and is an array with the same length as the top level `images` key. Details depend on the provider.',
    },
    {
      name: 'responses',
      type: 'Array<ImageModelResponseMetadata>',
      description:
        'Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.',
      properties: [
        {
          type: 'ImageModelResponseMetadata',
          parameters: [
            {
              name: 'timestamp',
              type: 'Date',
              description: 'Timestamp for the start of the generated response.',
            },
            {
              name: 'modelId',
              type: 'string',
              description:
                'The ID of the response model that was used to generate the response.',
            },
            {
              name: 'headers',
              type: 'Record<string, string>',
              isOptional: true,
              description: 'Response headers.',
            },
          ],
        },
      ],
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
