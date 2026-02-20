
# AI SDK Core

[AI SDK Core](/docs/ai-sdk-core) is a set of functions that allow you to interact with language models and other AI models.
These functions are designed to be easy-to-use and flexible, allowing you to generate text, structured data,
and embeddings from language models and other AI models.

AI SDK Core contains the following main functions:

<IndexCards
  cards={[
    {
      title: 'generateText()',
      description: 'Generate text and call tools from a language model.',
      href: '/docs/reference/ai-sdk-core/generate-text',
    },
    {
      title: 'streamText()',
      description: 'Stream text and call tools from a language model.',
      href: '/docs/reference/ai-sdk-core/stream-text',
    },
    {
      title: 'generateObject()',
      description: 'Generate structured data from a language model.',
      href: '/docs/reference/ai-sdk-core/generate-object',
    },
    {
      title: 'streamObject()',
      description: 'Stream structured data from a language model.',
      href: '/docs/reference/ai-sdk-core/stream-object',
    },
    {
      title: 'embed()',
      description:
        'Generate an embedding for a single value using an embedding model.',
      href: '/docs/reference/ai-sdk-core/embed',
    },
    {
      title: 'embedMany()',
      description:
        'Generate embeddings for several values using an embedding model (batch embedding).',
      href: '/docs/reference/ai-sdk-core/embed-many',
    },
    {
      title: 'generateImage()',
      description:
        'Generate images based on a given prompt using an image model.',
      href: '/docs/reference/ai-sdk-core/generate-image',
    },
    {
      title: 'experimental_generateVideo()',
      description:
        'Generate videos based on a given prompt using a video model.',
      href: '/docs/reference/ai-sdk-core/generate-video',
    },
    {
      title: 'experimental_transcribe()',
      description: 'Generate a transcript from an audio file.',
      href: '/docs/reference/ai-sdk-core/transcribe',
    },
    {
      title: 'experimental_generateSpeech()',
      description: 'Generate speech audio from text.',
      href: '/docs/reference/ai-sdk-core/generate-speech',
    },
  ]}
/>

It also contains the following helper functions:

<IndexCards
  cards={[
    {
      title: 'tool()',
      description: 'Type inference helper function for tools.',
      href: '/docs/reference/ai-sdk-core/tool',
    },
    {
      title: 'createMCPClient()',
      description: 'Creates a client for connecting to MCP servers.',
      href: '/docs/reference/ai-sdk-core/create-mcp-client',
    },
    {
      title: 'jsonSchema()',
      description: 'Creates AI SDK compatible JSON schema objects.',
      href: '/docs/reference/ai-sdk-core/json-schema',
    },
    {
      title: 'zodSchema()',
      description: 'Creates AI SDK compatible Zod schema objects.',
      href: '/docs/reference/ai-sdk-core/zod-schema',
    },
    {
      title: 'createProviderRegistry()',
      description:
        'Creates a registry for using models from multiple providers.',
      href: '/docs/reference/ai-sdk-core/provider-registry',
    },
    {
      title: 'cosineSimilarity()',
      description:
        'Calculates the cosine similarity between two vectors, e.g. embeddings.',
      href: '/docs/reference/ai-sdk-core/cosine-similarity',
    },
    {
      title: 'simulateReadableStream()',
      description:
        'Creates a ReadableStream that emits values with configurable delays.',
      href: '/docs/reference/ai-sdk-core/simulate-readable-stream',
    },
    {
      title: 'wrapLanguageModel()',
      description: 'Wraps a language model with middleware.',
      href: '/docs/reference/ai-sdk-core/wrap-language-model',
    },
    {
      title: 'wrapImageModel()',
      description: 'Wraps an image model with middleware.',
      href: '/docs/reference/ai-sdk-core/wrap-image-model',
    },
    {
      title: 'extractReasoningMiddleware()',
      description:
        'Extracts reasoning from the generated text and exposes it as a `reasoning` property on the result.',
      href: '/docs/reference/ai-sdk-core/extract-reasoning-middleware',
    },
    {
      title: 'extractJsonMiddleware()',
      description:
        'Extracts JSON from text content by stripping markdown code fences.',
      href: '/docs/reference/ai-sdk-core/extract-json-middleware',
    },
    {
      title: 'simulateStreamingMiddleware()',
      description:
        'Simulates streaming behavior with responses from non-streaming language models.',
      href: '/docs/reference/ai-sdk-core/simulate-streaming-middleware',
    },
    {
      title: 'defaultSettingsMiddleware()',
      description: 'Applies default settings to a language model.',
      href: '/docs/reference/ai-sdk-core/default-settings-middleware',
    },
    {
      title: 'smoothStream()',
      description: 'Smooths text and reasoning streaming output.',
      href: '/docs/reference/ai-sdk-core/smooth-stream',
    },
    {
      title: 'generateId()',
      description: 'Helper function for generating unique IDs',
      href: '/docs/reference/ai-sdk-core/generate-id',
    },
    {
      title: 'createIdGenerator()',
      description: 'Creates an ID generator',
      href: '/docs/reference/ai-sdk-core/create-id-generator',
    },
  ]}
/>


## Navigation

- [AI SDK Core](/docs/reference/ai-sdk-core)
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
- [AI SDK UI](/docs/reference/ai-sdk-ui)
  - [useChat](/docs/reference/ai-sdk-ui/use-chat)
  - [useCompletion](/docs/reference/ai-sdk-ui/use-completion)
  - [useObject](/docs/reference/ai-sdk-ui/use-object)
  - [convertToModelMessages](/docs/reference/ai-sdk-ui/convert-to-model-messages)
  - [pruneMessages](/docs/reference/ai-sdk-ui/prune-messages)
  - [createUIMessageStream](/docs/reference/ai-sdk-ui/create-ui-message-stream)
  - [createUIMessageStreamResponse](/docs/reference/ai-sdk-ui/create-ui-message-stream-response)
  - [pipeUIMessageStreamToResponse](/docs/reference/ai-sdk-ui/pipe-ui-message-stream-to-response)
  - [readUIMessageStream](/docs/reference/ai-sdk-ui/read-ui-message-stream)
  - [InferUITools](/docs/reference/ai-sdk-ui/infer-ui-tools)
  - [InferUITool](/docs/reference/ai-sdk-ui/infer-ui-tool)
  - [DirectChatTransport](/docs/reference/ai-sdk-ui/direct-chat-transport)
- [AI SDK RSC](/docs/reference/ai-sdk-rsc)
  - [streamUI](/docs/reference/ai-sdk-rsc/stream-ui)
  - [createAI](/docs/reference/ai-sdk-rsc/create-ai)
  - [createStreamableUI](/docs/reference/ai-sdk-rsc/create-streamable-ui)
  - [createStreamableValue](/docs/reference/ai-sdk-rsc/create-streamable-value)
  - [readStreamableValue](/docs/reference/ai-sdk-rsc/read-streamable-value)
  - [getAIState](/docs/reference/ai-sdk-rsc/get-ai-state)
  - [getMutableAIState](/docs/reference/ai-sdk-rsc/get-mutable-ai-state)
  - [useAIState](/docs/reference/ai-sdk-rsc/use-ai-state)
  - [useActions](/docs/reference/ai-sdk-rsc/use-actions)
  - [useUIState](/docs/reference/ai-sdk-rsc/use-ui-state)
  - [useStreamableValue](/docs/reference/ai-sdk-rsc/use-streamable-value)
  - [render (Removed)](/docs/reference/ai-sdk-rsc/render)
- [AI SDK Errors](/docs/reference/ai-sdk-errors)
  - [AI_APICallError](/docs/reference/ai-sdk-errors/ai-api-call-error)
  - [AI_DownloadError](/docs/reference/ai-sdk-errors/ai-download-error)
  - [AI_EmptyResponseBodyError](/docs/reference/ai-sdk-errors/ai-empty-response-body-error)
  - [AI_InvalidArgumentError](/docs/reference/ai-sdk-errors/ai-invalid-argument-error)
  - [AI_InvalidDataContentError](/docs/reference/ai-sdk-errors/ai-invalid-data-content-error)
  - [AI_InvalidMessageRoleError](/docs/reference/ai-sdk-errors/ai-invalid-message-role-error)
  - [AI_InvalidPromptError](/docs/reference/ai-sdk-errors/ai-invalid-prompt-error)
  - [AI_InvalidResponseDataError](/docs/reference/ai-sdk-errors/ai-invalid-response-data-error)
  - [AI_InvalidToolApprovalError](/docs/reference/ai-sdk-errors/ai-invalid-tool-approval-error)
  - [AI_InvalidToolInputError](/docs/reference/ai-sdk-errors/ai-invalid-tool-input-error)
  - [AI_JSONParseError](/docs/reference/ai-sdk-errors/ai-json-parse-error)
  - [AI_LoadAPIKeyError](/docs/reference/ai-sdk-errors/ai-load-api-key-error)
  - [AI_LoadSettingError](/docs/reference/ai-sdk-errors/ai-load-setting-error)
  - [AI_MessageConversionError](/docs/reference/ai-sdk-errors/ai-message-conversion-error)
  - [AI_NoContentGeneratedError](/docs/reference/ai-sdk-errors/ai-no-content-generated-error)
  - [AI_NoImageGeneratedError](/docs/reference/ai-sdk-errors/ai-no-image-generated-error)
  - [AI_NoObjectGeneratedError](/docs/reference/ai-sdk-errors/ai-no-object-generated-error)
  - [AI_NoOutputGeneratedError](/docs/reference/ai-sdk-errors/ai-no-output-generated-error)
  - [AI_NoSpeechGeneratedError](/docs/reference/ai-sdk-errors/ai-no-speech-generated-error)
  - [AI_NoSuchModelError](/docs/reference/ai-sdk-errors/ai-no-such-model-error)
  - [AI_NoSuchProviderError](/docs/reference/ai-sdk-errors/ai-no-such-provider-error)
  - [AI_NoSuchToolError](/docs/reference/ai-sdk-errors/ai-no-such-tool-error)
  - [AI_NoTranscriptGeneratedError](/docs/reference/ai-sdk-errors/ai-no-transcript-generated-error)
  - [AI_NoVideoGeneratedError](/docs/reference/ai-sdk-errors/ai-no-video-generated-error)
  - [AI_RetryError](/docs/reference/ai-sdk-errors/ai-retry-error)
  - [AI_TooManyEmbeddingValuesForCallError](/docs/reference/ai-sdk-errors/ai-too-many-embedding-values-for-call-error)
  - [AI_ToolCallNotFoundForApprovalError](/docs/reference/ai-sdk-errors/ai-tool-call-not-found-for-approval-error)
  - [ToolCallRepairError](/docs/reference/ai-sdk-errors/ai-tool-call-repair-error)
  - [AI_TypeValidationError](/docs/reference/ai-sdk-errors/ai-type-validation-error)
  - [AI_UIMessageStreamError](/docs/reference/ai-sdk-errors/ai-ui-message-stream-error)
  - [AI_UnsupportedFunctionalityError](/docs/reference/ai-sdk-errors/ai-unsupported-functionality-error)


[Full Sitemap](/sitemap.md)
