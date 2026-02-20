
# `UIMessage`

`UIMessage` serves as the source of truth for your application's state, representing the complete message history including metadata, data parts, and all contextual information. In contrast to `ModelMessage`, which represents the state or context passed to the model, `UIMessage` contains the full application state needed for UI rendering and client-side functionality.

## Type Safety

`UIMessage` is designed to be type-safe and accepts three generic parameters to ensure proper typing throughout your application:

1. **`METADATA`** - Custom metadata type for additional message information
2. **`DATA_PARTS`** - Custom data part types for structured data components
3. **`TOOLS`** - Tool definitions for type-safe tool interactions

## Creating Your Own UIMessage Type

Here's an example of how to create a custom typed UIMessage for your application:

```typescript
import { InferUITools, ToolSet, UIMessage, tool } from 'ai';
import z from 'zod';

const metadataSchema = z.object({
  someMetadata: z.string().datetime(),
});

type MyMetadata = z.infer<typeof metadataSchema>;

const dataPartSchema = z.object({
  someDataPart: z.object({}),
  anotherDataPart: z.object({}),
});

type MyDataPart = z.infer<typeof dataPartSchema>;

const tools = {
  someTool: tool({}),
} satisfies ToolSet;

type MyTools = InferUITools<typeof tools>;

export type MyUIMessage = UIMessage<MyMetadata, MyDataPart, MyTools>;
```

## `UIMessage` Interface

```typescript
interface UIMessage<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  /**
   * A unique identifier for the message.
   */
  id: string;

  /**
   * The role of the message.
   */
  role: 'system' | 'user' | 'assistant';

  /**
   * The metadata of the message.
   */
  metadata?: METADATA;

  /**
   * The parts of the message. Use this for rendering the message in the UI.
   */
  parts: Array<UIMessagePart<DATA_PARTS, TOOLS>>;
}
```

## `UIMessagePart` Types

### `TextUIPart`

A text part of a message.

```typescript
type TextUIPart = {
  type: 'text';
  /**
   * The text content.
   */
  text: string;
  /**
   * The state of the text part.
   */
  state?: 'streaming' | 'done';
};
```

### `ReasoningUIPart`

A reasoning part of a message.

```typescript
type ReasoningUIPart = {
  type: 'reasoning';
  /**
   * The reasoning text.
   */
  text: string;
  /**
   * The state of the reasoning part.
   */
  state?: 'streaming' | 'done';
  /**
   * The provider metadata.
   */
  providerMetadata?: Record<string, any>;
};
```

### `ToolUIPart`

A tool part of a message that represents tool invocations and their results.

<Note>
  The type is based on the name of the tool (e.g., `tool-someTool` for a tool
  named `someTool`).
</Note>

```typescript
type ToolUIPart<TOOLS extends UITools = UITools> = ValueOf<{
  [NAME in keyof TOOLS & string]: {
    type: `tool-${NAME}`;
    toolCallId: string;
  } & (
    | {
        state: 'input-streaming';
        input: DeepPartial<TOOLS[NAME]['input']> | undefined;
        providerExecuted?: boolean;
        output?: never;
        errorText?: never;
      }
    | {
        state: 'input-available';
        input: TOOLS[NAME]['input'];
        providerExecuted?: boolean;
        output?: never;
        errorText?: never;
      }
    | {
        state: 'output-available';
        input: TOOLS[NAME]['input'];
        output: TOOLS[NAME]['output'];
        errorText?: never;
        providerExecuted?: boolean;
      }
    | {
        state: 'output-error';
        input: TOOLS[NAME]['input'];
        output?: never;
        errorText: string;
        providerExecuted?: boolean;
      }
  );
}>;
```

### `SourceUrlUIPart`

A source URL part of a message.

```typescript
type SourceUrlUIPart = {
  type: 'source-url';
  sourceId: string;
  url: string;
  title?: string;
  providerMetadata?: Record<string, any>;
};
```

### `SourceDocumentUIPart`

A document source part of a message.

```typescript
type SourceDocumentUIPart = {
  type: 'source-document';
  sourceId: string;
  mediaType: string;
  title: string;
  filename?: string;
  providerMetadata?: Record<string, any>;
};
```

### `FileUIPart`

A file part of a message.

```typescript
type FileUIPart = {
  type: 'file';
  /**
   * IANA media type of the file.
   */
  mediaType: string;
  /**
   * Optional filename of the file.
   */
  filename?: string;
  /**
   * The URL of the file.
   * It can either be a URL to a hosted file or a Data URL.
   */
  url: string;
};
```

### `DataUIPart`

A data part of a message for custom data types.

<Note>
  The type is based on the name of the data part (e.g., `data-someDataPart` for
  a data part named `someDataPart`).
</Note>

```typescript
type DataUIPart<DATA_TYPES extends UIDataTypes> = ValueOf<{
  [NAME in keyof DATA_TYPES & string]: {
    type: `data-${NAME}`;
    id?: string;
    data: DATA_TYPES[NAME];
  };
}>;
```

### `StepStartUIPart`

A step boundary part of a message.

```typescript
type StepStartUIPart = {
  type: 'step-start';
};
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
