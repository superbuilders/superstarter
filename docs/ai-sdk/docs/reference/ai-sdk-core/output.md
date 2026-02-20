
# `Output`

The `Output` object provides output specifications for structured data generation with [`generateText`](/docs/reference/ai-sdk-core/generate-text) and [`streamText`](/docs/reference/ai-sdk-core/stream-text). It allows you to specify the expected shape of the generated data and handles validation automatically.

```ts
import { generateText, Output } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const { output } = await generateText({
  model: __MODEL__,
  output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number(),
    }),
  }),
  prompt: 'Generate a user profile.',
});
```

## Import

<Snippet text={`import { Output } from "ai"`} prompt={false} />

## Output Types

### `Output.text()`

Output specification for plain text generation. This is the default behavior when no `output` is specified.

```ts
import { generateText, Output } from 'ai';

const { output } = await generateText({
  model: yourModel,
  output: Output.text(),
  prompt: 'Tell me a joke.',
});
// output is a string
```

#### Parameters

No parameters required.

#### Returns

An `Output<string, string>` specification that generates plain text without schema validation.

---

### `Output.object()`

Output specification for typed object generation using schemas. The output is validated against the provided schema to ensure type safety.

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const { output } = await generateText({
  model: yourModel,
  output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number().nullable(),
      labels: z.array(z.string()),
    }),
  }),
  prompt: 'Generate information for a test user.',
});
// output matches the schema type
```

#### Parameters

<PropertiesTable
  content={[
    {
      name: 'schema',
      type: 'FlexibleSchema<OBJECT>',
      description:
        'The schema that defines the structure of the object to generate. Supports Zod schemas, Standard JSON schemas, and custom JSON schemas.',
    },
    {
      name: 'name',
      type: 'string',
      isOptional: true,
      description:
        'Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.',
    },
    {
      name: 'description',
      type: 'string',
      isOptional: true,
      description:
        'Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.',
    },
  ]}
/>

#### Returns

An `Output<OBJECT, DeepPartial<OBJECT>>` specification where:

- Complete output is fully validated against the schema
- Partial output (during streaming) is a deep partial version of the schema type

<Note>
  Partial outputs streamed via `streamText` cannot be validated against your
  provided schema, as incomplete data may not yet conform to the expected
  structure.
</Note>

---

### `Output.array()`

Output specification for generating arrays of typed elements. Each element is validated against the provided element schema.

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const { output } = await generateText({
  model: yourModel,
  output: Output.array({
    element: z.object({
      location: z.string(),
      temperature: z.number(),
      condition: z.string(),
    }),
  }),
  prompt: 'List the weather for San Francisco and Paris.',
});
// output is an array of weather objects
```

#### Parameters

<PropertiesTable
  content={[
    {
      name: 'element',
      type: 'FlexibleSchema<ELEMENT>',
      description:
        'The schema that defines the structure of each array element. Supports Zod schemas, Valibot schemas, or JSON schemas.',
    },
    {
      name: 'name',
      type: 'string',
      isOptional: true,
      description:
        'Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.',
    },
    {
      name: 'description',
      type: 'string',
      isOptional: true,
      description:
        'Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.',
    },
  ]}
/>

#### Returns

An `Output<Array<ELEMENT>, Array<ELEMENT>>` specification where:

- Complete output is an array with all elements validated
- Partial output contains only fully validated elements (incomplete elements are excluded)

#### Streaming with `elementStream`

When using `streamText` with `Output.array()`, you can iterate over elements as they are generated using `elementStream`:

```ts
import { streamText, Output } from 'ai';
import { z } from 'zod';

const { elementStream } = streamText({
  model: yourModel,
  output: Output.array({
    element: z.object({
      name: z.string(),
      class: z.string(),
      description: z.string(),
    }),
  }),
  prompt: 'Generate 3 hero descriptions for a fantasy role playing game.',
});

for await (const hero of elementStream) {
  console.log(hero); // Each hero is complete and validated
}
```

<Note>
  Each element emitted by `elementStream` is complete and validated against your
  element schema, ensuring type safety for each item as it is generated.
</Note>

---

### `Output.choice()`

Output specification for selecting from a predefined set of string options. Useful for classification tasks or fixed-enum answers.

```ts
import { generateText, Output } from 'ai';

const { output } = await generateText({
  model: yourModel,
  output: Output.choice({
    options: ['sunny', 'rainy', 'snowy'] as const,
  }),
  prompt: 'Is the weather sunny, rainy, or snowy today?',
});
// output is 'sunny' | 'rainy' | 'snowy'
```

#### Parameters

<PropertiesTable
  content={[
    {
      name: 'options',
      type: 'Array<CHOICE>',
      description:
        'An array of string options that the model can choose from. The output will be exactly one of these values.',
    },
    {
      name: 'name',
      type: 'string',
      isOptional: true,
      description:
        'Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.',
    },
    {
      name: 'description',
      type: 'string',
      isOptional: true,
      description:
        'Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.',
    },
  ]}
/>

#### Returns

An `Output<CHOICE, CHOICE>` specification where:

- Complete output is validated to be exactly one of the provided options

---

### `Output.json()`

Output specification for unstructured JSON generation. Use this when you want to generate arbitrary JSON without enforcing a specific schema.

```ts
import { generateText, Output } from 'ai';

const { output } = await generateText({
  model: yourModel,
  output: Output.json(),
  prompt:
    'For each city, return the current temperature and weather condition as a JSON object.',
});
// output is any valid JSON value
```

#### Parameters

<PropertiesTable
  content={[
    {
      name: 'name',
      type: 'string',
      isOptional: true,
      description:
        'Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.',
    },
    {
      name: 'description',
      type: 'string',
      isOptional: true,
      description:
        'Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.',
    },
  ]}
/>

#### Returns

An `Output<JSONValue, JSONValue>` specification that:

- Validates that the output is valid JSON
- Does not enforce any specific structure

<Note>
  With `Output.json()`, the AI SDK only checks that the response is valid JSON;
  it doesn't validate the structure or types of the values. If you need schema
  validation, use `Output.object()` or `Output.array()` instead.
</Note>

## Error Handling

When `generateText` with structured output cannot generate a valid object, it throws a [`NoObjectGeneratedError`](/docs/reference/ai-sdk-errors/ai-no-object-generated-error).

```ts
import { generateText, Output, NoObjectGeneratedError } from 'ai';

try {
  await generateText({
    model: yourModel,
    output: Output.object({ schema }),
    prompt: 'Generate a user profile.',
  });
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.log('NoObjectGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Text:', error.text);
    console.log('Response:', error.response);
    console.log('Usage:', error.usage);
  }
}
```

## See also

- [Generating Structured Data](/docs/ai-sdk-core/generating-structured-data)
- [`generateText()`](/docs/reference/ai-sdk-core/generate-text)
- [`streamText()`](/docs/reference/ai-sdk-core/stream-text)
- [`zod-schema`](/docs/reference/ai-sdk-core/zod-schema)
- [`json-schema`](/docs/reference/ai-sdk-core/json-schema)


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
