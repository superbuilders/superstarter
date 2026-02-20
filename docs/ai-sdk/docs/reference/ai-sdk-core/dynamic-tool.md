
# `dynamicTool()`

The `dynamicTool` function creates tools where the input and output types are not known at compile time. This is useful for scenarios such as:

- MCP (Model Context Protocol) tools without schemas
- User-defined functions loaded at runtime
- Tools loaded from external sources or databases
- Dynamic tool generation based on user input

Unlike the regular `tool` function, `dynamicTool` accepts and returns `unknown` types, allowing you to work with tools that have runtime-determined schemas.

```ts highlight={"1,4,9,10,11"}
import { dynamicTool } from 'ai';
import { z } from 'zod';

export const customTool = dynamicTool({
  description: 'Execute a custom user-defined function',
  inputSchema: z.object({}),
  // input is typed as 'unknown'
  execute: async input => {
    const { action, parameters } = input as any;

    // Execute your dynamic logic
    return {
      result: `Executed ${action} with ${JSON.stringify(parameters)}`,
    };
  },
});
```

## Import

<Snippet text={`import { dynamicTool } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'tool',
      type: 'Object',
      description: 'The dynamic tool definition.',
      properties: [
        {
          type: 'Object',
          parameters: [
            {
              name: 'description',
              isOptional: true,
              type: 'string',
              description:
                'Information about the purpose of the tool including details on how and when it can be used by the model.'
            },
            {
              name: 'title',
              isOptional: true,
              type: 'string',
              description:
                'A human-readable title for the tool.'
            },
            {
              name: 'needsApproval',
              isOptional: true,
              type: 'boolean | ((options: { args: unknown }) => boolean | Promise<boolean>)',
              description:
                'Whether the tool needs user approval before execution. Can be a boolean or a function that receives the tool arguments and returns a boolean.'
            },
            {
              name: 'inputSchema',
              type: 'FlexibleSchema<unknown>',
              description:
                'The schema of the input that the tool expects. While the type is unknown, a schema is still required for validation. You can use Zod schemas with z.unknown() or z.any() for fully dynamic inputs.'
            },
            {
              name: 'execute',
              type: 'ToolExecuteFunction<unknown, unknown>',
              description:
                'An async function that is called with the arguments from the tool call. The input is typed as unknown and must be validated/cast at runtime.',
                properties: [
                  {
                    type: "ToolExecutionOptions",
                    parameters: [
                      {
                      name: 'toolCallId',
                      type: 'string',
                      description: 'The ID of the tool call.',
                    },
                    {
                        name: "messages",
                        type: "ModelMessage[]",
                        description: "Messages that were sent to the language model."
                      },
                      {
                        name: "abortSignal",
                        type: "AbortSignal",
                        isOptional: true,
                        description: "An optional abort signal."
                      },
                      {
                        name: "experimental_context",
                        type: "unknown",
                        isOptional: true,
                        description: "Context that is passed into tool execution. Experimental (can break in patch releases)."
                      }
                    ]
                  }
                ]
            },
            {
              name: 'outputSchema',
              isOptional: true,
              type: 'Zod Schema | JSON Schema',
              description:
                'The schema of the output that the tool produces. Used for validation and type inference.'
            },
            {
              name: 'toModelOutput',
              isOptional: true,
              type: '({toolCallId: string; input: unknown; output: unknown}) => ToolResultOutput | PromiseLike<ToolResultOutput>',
              description: 'Optional conversion function that maps the tool result to an output that can be used by the language model.'
            },
            {
              name: 'onInputStart',
              isOptional: true,
              type: '(options: ToolExecutionOptions) => void | PromiseLike<void>',
              description:
                'Optional function that is called when the argument streaming starts. Only called when the tool is used in a streaming context.'
            },
            {
              name: 'onInputDelta',
              isOptional: true,
              type: '(options: { inputTextDelta: string } & ToolExecutionOptions) => void | PromiseLike<void>',
              description:
                'Optional function that is called when an argument streaming delta is available. Only called when the tool is used in a streaming context.'
            },
            {
              name: 'onInputAvailable',
              isOptional: true,
              type: '(options: { input: unknown } & ToolExecutionOptions) => void | PromiseLike<void>',
              description:
                'Optional function that is called when a tool call can be started, even if the execute function is not provided.'
            },
            {
              name: 'providerOptions',
              isOptional: true,
              type: 'ProviderOptions',
              description: 'Additional provider-specific metadata.'
            }
          ]
        }
      ]
    }

]}
/>

### Returns

A `Tool<unknown, unknown>` with `type: 'dynamic'` that can be used with `generateText`, `streamText`, and other AI SDK functions.

## Type-Safe Usage

When using dynamic tools alongside static tools, you need to check the `dynamic` flag for proper type narrowing:

```ts
const result = await generateText({
  model: __MODEL__,
  tools: {
    // Static tool with known types
    weather: weatherTool,
    // Dynamic tool with unknown types
    custom: dynamicTool({
      /* ... */
    }),
  },
  onStepFinish: ({ toolCalls, toolResults }) => {
    for (const toolCall of toolCalls) {
      if (toolCall.dynamic) {
        // Dynamic tool: input/output are 'unknown'
        console.log('Dynamic tool:', toolCall.toolName);
        console.log('Input:', toolCall.input);
        continue;
      }

      // Static tools have full type inference
      switch (toolCall.toolName) {
        case 'weather':
          // TypeScript knows the exact types
          console.log(toolCall.input.location); // string
          break;
      }
    }
  },
});
```

## Usage with `useChat`

When used with useChat (`UIMessage` format), dynamic tools appear as `dynamic-tool` parts:

```tsx
{
  message.parts.map(part => {
    switch (part.type) {
      case 'dynamic-tool':
        return (
          <div>
            <h4>Tool: {part.toolName}</h4>
            <pre>{JSON.stringify(part.input, null, 2)}</pre>
          </div>
        );
      // ... handle other part types
    }
  });
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
