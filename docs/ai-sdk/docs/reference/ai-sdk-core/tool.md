
# `tool()`

Tool is a helper function that infers the tool input for its `execute` method.

It does not have any runtime behavior, but it helps TypeScript infer the types of the input for the `execute` method.

Without this helper function, TypeScript is unable to connect the `inputSchema` property to the `execute` method,
and the argument types of `execute` cannot be inferred.

```ts highlight={"1,4,9,10"}
import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  // location below is inferred to be a string:
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});
```

## Import

<Snippet text={`import { tool } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'tool',
      type: 'Tool',
      description: 'The tool definition.',
      properties: [
        {
          type: 'Tool',
          parameters: [
            {
              name: 'description',
              isOptional: true,
              type: 'string',
              description:
                'Information about the purpose of the tool including details on how and when it can be used by the model.',
            },
            {
              name: 'title',
              isOptional: true,
              type: 'string',
              description: 'A human-readable title for the tool.',
            },
            {
              name: 'needsApproval',
              isOptional: true,
              type: 'boolean | ((options: { args: INPUT }) => boolean | Promise<boolean>)',
              description:
                'Whether the tool needs user approval before execution. Can be a boolean or a function that receives the tool arguments and returns a boolean.',
            },
            {
              name: 'inputSchema',
              type: 'Zod Schema | JSON Schema',
              description:
                'The schema of the input that the tool expects. The language model will use this to generate the input. It is also used to validate the output of the language model. Use descriptions to make the input understandable for the language model. You can either pass in a Zod schema or a JSON schema (using the `jsonSchema` function).',
            },
            {
              name: 'inputExamples',
              isOptional: true,
              type: 'Array<{ input: INPUT }>',
              description:
                'An optional list of input examples that show the language model what the input should look like.',
            },
            {
              name: 'strict',
              isOptional: true,
              type: 'boolean',
              description:
                'Strict mode setting for the tool. Providers that support strict mode will use this setting to determine how the input should be generated. Strict mode will always produce valid inputs, but it might limit what input schemas are supported.',
            },
            {
              name: 'execute',
              isOptional: true,
              type: 'async (input: INPUT, options: ToolExecutionOptions) => RESULT | Promise<RESULT> | AsyncIterable<RESULT>',
              description:
                'An async function that is called with the arguments from the tool call and produces a result or a results iterable. If an iterable is provided, all results but the last one are considered preliminary. If not provided, the tool will not be executed automatically.',
              properties: [
                {
                  type: 'ToolExecutionOptions',
                  parameters: [
                    {
                      name: 'toolCallId',
                      type: 'string',
                      description:
                        'The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.',
                    },
                    {
                      name: 'messages',
                      type: 'ModelMessage[]',
                      description:
                        'Messages that were sent to the language model to initiate the response that contained the tool call. The messages do not include the system prompt nor the assistant response that contained the tool call.',
                    },
                    {
                      name: 'abortSignal',
                      type: 'AbortSignal',
                      isOptional: true,
                      description:
                        'An optional abort signal that indicates that the overall operation should be aborted.',
                    },
                    {
                      name: 'experimental_context',
                      type: 'unknown',
                      isOptional: true,
                      description:
                        'Context that is passed into tool execution. Experimental (can break in patch releases).',
                    },
                  ],
                },
              ],
            },
            {
              name: 'outputSchema',
              isOptional: true,
              type: 'Zod Schema | JSON Schema',
              description:
                'The schema of the output that the tool produces. Used for validation and type inference.',
            },
            {
              name: 'toModelOutput',
              isOptional: true,
              type: '({toolCallId: string; input: INPUT; output: OUTPUT}) => ToolResultOutput | PromiseLike<ToolResultOutput>',
              description:
                'Optional conversion function that maps the tool result to an output that can be used by the language model. If not provided, the tool result will be sent as a JSON object.',
            },
            {
              name: 'onInputStart',
              isOptional: true,
              type: '(options: ToolExecutionOptions) => void | PromiseLike<void>',
              description:
                'Optional function that is called when the argument streaming starts. Only called when the tool is used in a streaming context.',
            },
            {
              name: 'onInputDelta',
              isOptional: true,
              type: '(options: { inputTextDelta: string } & ToolExecutionOptions) => void | PromiseLike<void>',
              description:
                'Optional function that is called when an argument streaming delta is available. Only called when the tool is used in a streaming context.',
            },
            {
              name: 'onInputAvailable',
              isOptional: true,
              type: '(options: { input: INPUT } & ToolExecutionOptions) => void | PromiseLike<void>',
              description:
                'Optional function that is called when a tool call can be started, even if the execute function is not provided.',
            },
            {
              name: 'providerOptions',
              isOptional: true,
              type: 'ProviderOptions',
              description:
                'Additional provider-specific metadata. They are passed through to the provider from the AI SDK and enable provider-specific functionality that can be fully encapsulated in the provider.',
            },
            {
              name: 'type',
              isOptional: true,
              type: "'function' | 'provider-defined'",
              description:
                'The type of the tool. Defaults to "function" for regular tools. Use "provider-defined" for provider-specific tools.',
            },
            {
              name: 'id',
              isOptional: true,
              type: 'string',
              description:
                'The ID of the tool for provider-defined tools. Should follow the format `<provider-name>.<unique-tool-name>`. Required when type is "provider-defined".',
            },
            {
              name: 'name',
              isOptional: true,
              type: 'string',
              description:
                'The name of the tool that the user must use in the tool set. Required when type is "provider-defined".',
            },
            {
              name: 'args',
              isOptional: true,
              type: 'Record<string, unknown>',
              description:
                'The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool. Required when type is "provider-defined".',
            },
          ],
        },
      ],
    },
  ]}
/>

### Returns

The tool that was passed in.


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
