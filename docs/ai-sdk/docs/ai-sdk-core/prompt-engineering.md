
# Prompt Engineering

## Tips

### Prompts for Tools

When you create prompts that include tools, getting good results can be tricky as the number and complexity of your tools increases.

Here are a few tips to help you get the best results:

1. Use a model that is strong at tool calling, such as `gpt-5` or `gpt-4.1`. Weaker models will often struggle to call tools effectively and flawlessly.
1. Keep the number of tools low, e.g. to 5 or less.
1. Keep the complexity of the tool parameters low. Complex Zod schemas with many nested and optional elements, unions, etc. can be challenging for the model to work with.
1. Use semantically meaningful names for your tools, parameters, parameter properties, etc. The more information you pass to the model, the better it can understand what you want.
1. Add `.describe("...")` to your Zod schema properties to give the model hints about what a particular property is for.
1. When the output of a tool might be unclear to the model and there are dependencies between tools, use the `description` field of a tool to provide information about the output of the tool execution.
1. You can include example input/outputs of tool calls in your prompt to help the model understand how to use the tools. Keep in mind that the tools work with JSON objects, so the examples should use JSON.

In general, the goal should be to give the model all information it needs in a clear way.

### Tool & Structured Data Schemas

The mapping from Zod schemas to LLM inputs (typically JSON schema) is not always straightforward, since the mapping is not one-to-one.

#### Zod Dates

Zod expects JavaScript Date objects, but models return dates as strings.
You can specify and validate the date format using `z.string().datetime()` or `z.string().date()`,
and then use a Zod transformer to convert the string to a Date object.

```ts highlight="7-10"
const result = await generateObject({
  model: __MODEL__,
  schema: z.object({
    events: z.array(
      z.object({
        event: z.string(),
        date: z
          .string()
          .date()
          .transform(value => new Date(value)),
      }),
    ),
  }),
  prompt: 'List 5 important events from the year 2000.',
});
```

#### Optional Parameters

When working with tools that have optional parameters, you may encounter compatibility issues with certain providers that use strict schema validation.

<Note>
  This is particularly relevant for OpenAI models with structured outputs
  (strict mode).
</Note>

For maximum compatibility, optional parameters should use `.nullable()` instead of `.optional()`:

```ts highlight="6,7,16,17"
// This may fail with strict schema validation
const failingTool = tool({
  description: 'Execute a command',
  inputSchema: z.object({
    command: z.string(),
    workdir: z.string().optional(), // This can cause errors
    timeout: z.string().optional(),
  }),
});

// This works with strict schema validation
const workingTool = tool({
  description: 'Execute a command',
  inputSchema: z.object({
    command: z.string(),
    workdir: z.string().nullable(), // Use nullable instead
    timeout: z.string().nullable(),
  }),
});
```

#### Temperature Settings

For tool calls and object generation, it's recommended to use `temperature: 0` to ensure deterministic and consistent results:

```ts highlight="3"
const result = await generateText({
  model: __MODEL__,
  temperature: 0, // Recommended for tool calls
  tools: {
    myTool: tool({
      description: 'Execute a command',
      inputSchema: z.object({
        command: z.string(),
      }),
    }),
  },
  prompt: 'Execute the ls command',
});
```

Lower temperature values reduce randomness in model outputs, which is particularly important when the model needs to:

- Generate structured data with specific formats
- Make precise tool calls with correct parameters
- Follow strict schemas consistently

## Debugging

### Inspecting Warnings

Not all providers support all AI SDK features.
Providers either throw exceptions or return warnings when they do not support a feature.
To check if your prompt, tools, and settings are handled correctly by the provider, you can check the call warnings:

```ts
const result = await generateText({
  model: __MODEL__,
  prompt: 'Hello, world!',
});

console.log(result.warnings);
```

### HTTP Request Bodies

You can inspect the raw HTTP request bodies for models that expose them, e.g. [OpenAI](/providers/ai-sdk-providers/openai).
This allows you to inspect the exact payload that is sent to the model provider in the provider-specific way.

Request bodies are available via the `request.body` property of the response:

```ts highlight="6"
const result = await generateText({
  model: __MODEL__,
  prompt: 'Hello, world!',
});

console.log(result.request.body);
```


## Navigation

- [Overview](/docs/ai-sdk-core/overview)
- [Generating Text](/docs/ai-sdk-core/generating-text)
- [Generating Structured Data](/docs/ai-sdk-core/generating-structured-data)
- [Tool Calling](/docs/ai-sdk-core/tools-and-tool-calling)
- [Model Context Protocol (MCP)](/docs/ai-sdk-core/mcp-tools)
- [Prompt Engineering](/docs/ai-sdk-core/prompt-engineering)
- [Settings](/docs/ai-sdk-core/settings)
- [Embeddings](/docs/ai-sdk-core/embeddings)
- [Reranking](/docs/ai-sdk-core/reranking)
- [Image Generation](/docs/ai-sdk-core/image-generation)
- [Transcription](/docs/ai-sdk-core/transcription)
- [Speech](/docs/ai-sdk-core/speech)
- [Video Generation](/docs/ai-sdk-core/video-generation)
- [Language Model Middleware](/docs/ai-sdk-core/middleware)
- [Provider & Model Management](/docs/ai-sdk-core/provider-management)
- [Error Handling](/docs/ai-sdk-core/error-handling)
- [Testing](/docs/ai-sdk-core/testing)
- [Telemetry](/docs/ai-sdk-core/telemetry)
- [DevTools](/docs/ai-sdk-core/devtools)


[Full Sitemap](/sitemap.md)
