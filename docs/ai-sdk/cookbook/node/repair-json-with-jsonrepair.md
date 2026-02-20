
# Repair Malformed JSON with jsonrepair

When generating structured outputs, language models sometimes produce malformed JSON output. This can happen due to:

- Truncated responses (hitting token limits)
- Syntax errors like single quotes instead of double quotes
- Missing closing brackets or braces
- Trailing commas

The AI SDK provides an `experimental_repairText` option that lets you intercept and repair malformed JSON before parsing. Combined with the [`jsonrepair`](https://github.com/josdejong/jsonrepair) library, you can automatically fix many common JSON issues.

## Installation

First, install the `jsonrepair` library:

```bash
pnpm add jsonrepair
```

## Using with generateObject

Here's how to use `jsonrepair` with `generateObject`:

```ts
import { generateObject } from 'ai';
__PROVIDER_IMPORT__;
import { jsonrepair } from 'jsonrepair';
import { z } from 'zod';

const result = await generateObject({
  model: __MODEL__,
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
        }),
      ),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
  experimental_repairText: async ({ text }) => {
    try {
      return jsonrepair(text);
    } catch {
      return null; // Return null if jsonrepair cannot fix the text
    }
  },
});

console.log(result.object.recipe);
```

## How it Works

The `experimental_repairText` function is called in two scenarios:

1. **`JSONParseError`** - The model output cannot be parsed as JSON (syntax errors, truncation)
2. **`TypeValidationError`** - The JSON is valid but doesn't match the schema

When called, it receives:

- `text`: The raw text output from the model
- `error`: Either a `JSONParseError` or `TypeValidationError`

The function should return:

- A repaired string that will be re-parsed and validated
- `null` if the text cannot be repaired (the original error will be thrown)

## What jsonrepair Can Fix

The `jsonrepair` library can automatically fix many common issues:

- Missing closing brackets: `{"name": "test"` → `{"name": "test"}`
- Single quotes: `{'name': 'test'}` → `{"name": "test"}`
- Missing quotes around keys: `{name: "test"}` → `{"name": "test"}`
- Trailing commas: `{"items": [1, 2, 3,]}` → `{"items": [1, 2, 3]}`
- Comments in JSON
- Unescaped special characters

## Considerations

1. **Repair is Best-Effort** - While `jsonrepair` handles many cases, it cannot fix all malformed JSON (e.g., semantically incorrect data that happens to be valid JSON)
2. **Schema Validation** - Even after repair, the object must still match your schema. If the model produces structurally wrong data, repair won't help
3. **Truncated Content** - For severely truncated responses, consider increasing `maxOutputTokens` or simplifying your schema


## Navigation

- [Generate Text](/cookbook/node/generate-text)
- [Retrieval Augmented Generation](/cookbook/node/retrieval-augmented-generation)
- [Knowledge Base Agent](/cookbook/node/knowledge-base-agent)
- [Generate Text with Chat Prompt](/cookbook/node/generate-text-with-chat-prompt)
- [Generate Text with Image Prompt](/cookbook/node/generate-text-with-image-prompt)
- [Stream Text](/cookbook/node/stream-text)
- [Stream Text with Chat Prompt](/cookbook/node/stream-text-with-chat-prompt)
- [Stream Text with Image Prompt](/cookbook/node/stream-text-with-image-prompt)
- [Stream Text with File Prompt](/cookbook/node/stream-text-with-file-prompt)
- [Generate Object with a Reasoning Model](/cookbook/node/generate-object-reasoning)
- [Generate Object](/cookbook/node/generate-object)
- [Stream Object](/cookbook/node/stream-object)
- [Stream Object with Image Prompt](/cookbook/node/stream-object-with-image-prompt)
- [Record Token Usage After Streaming Object](/cookbook/node/stream-object-record-token-usage)
- [Record Final Object after Streaming Object](/cookbook/node/stream-object-record-final-object)
- [Call Tools](/cookbook/node/call-tools)
- [Call Tools in Parallel](/cookbook/node/call-tools-in-parallel)
- [Call Tools with Image Prompt](/cookbook/node/call-tools-with-image-prompt)
- [Call Tools in Multiple Steps](/cookbook/node/call-tools-multiple-steps)
- [Model Context Protocol (MCP) Tools](/cookbook/node/mcp-tools)
- [Manual Agent Loop](/cookbook/node/manual-agent-loop)
- [Web Search Agent](/cookbook/node/web-search-agent)
- [Model Context Protocol (MCP) Elicitation](/cookbook/node/mcp-elicitation)
- [Embed Text](/cookbook/node/embed-text)
- [Embed Text in Batch](/cookbook/node/embed-text-batch)
- [Intercepting Fetch Requests](/cookbook/node/intercept-fetch-requests)
- [Local Caching Middleware](/cookbook/node/local-caching-middleware)
- [Repair Malformed JSON with jsonrepair](/cookbook/node/repair-json-with-jsonrepair)
- [Dynamic Prompt Caching](/cookbook/node/dynamic-prompt-caching)


[Full Sitemap](/sitemap.md)
