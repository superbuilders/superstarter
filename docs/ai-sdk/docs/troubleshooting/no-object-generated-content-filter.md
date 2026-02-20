
# Object generation failed with OpenAI

## Issue

When using `generateObject` or `streamObject` with OpenAI's structured output generation, you may encounter a `NoObjectGeneratedError` with the finish reason `content-filter`. This error occurs when your Zod schema contains incompatible types that OpenAI's structured output feature cannot process.

```typescript
// Problematic code - incompatible schema types
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = await generateObject({
  model: openai('gpt-4o-2024-08-06'),
  schema: z.object({
    name: z.string().nullish(), // ❌ .nullish() is not supported
    email: z.string().optional(), // ❌ .optional() is not supported
    age: z.number().nullable(), // ✅ .nullable() is supported
  }),
  prompt: 'Generate a user profile',
});

// Error: NoObjectGeneratedError: No object generated.
// Finish reason: content-filter
```

## Background

OpenAI's structured output generation uses JSON Schema under the hood and has specific requirements for schema compatibility. The Zod methods `.nullish()` and `.optional()` generate JSON Schema patterns that are incompatible with OpenAI's implementation, causing the model to reject the schema and return a content-filter finish reason.

## Solution

Replace `.nullish()` and `.optional()` with `.nullable()` in your Zod schemas when using structured output generation with OpenAI models.

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Correct approach - use .nullable()
const result = await generateObject({
  model: openai('gpt-4o-2024-08-06'),
  schema: z.object({
    name: z.string().nullable(), // ✅ Use .nullable() instead of .nullish()
    email: z.string().nullable(), // ✅ Use .nullable() instead of .optional()
    age: z.number().nullable(),
  }),
  prompt: 'Generate a user profile',
});

console.log(result.object);
// { name: "John Doe", email: "john@example.com", age: 30 }
// or { name: null, email: null, age: 25 }
```

### Schema Type Comparison

| Zod Type      | Compatible | JSON Schema Behavior                                   |
| ------------- | ---------- | ------------------------------------------------------ |
| `.nullable()` | ✅ Yes     | Allows `null` or the specified type                    |
| `.optional()` | ❌ No      | Field can be omitted (not supported)                   |
| `.nullish()`  | ❌ No      | Allows `null`, `undefined`, or omitted (not supported) |

## Related Information

- For more details on structured output generation, see [Generating Structured Data](/docs/ai-sdk-core/generating-structured-data)
- For OpenAI-specific structured output configuration, see [OpenAI Provider - Structured Outputs](/providers/ai-sdk-providers/openai#structured-outputs)


## Navigation

- [Azure OpenAI Slow to Stream](/docs/troubleshooting/azure-stream-slow)
- [Server Actions in Client Components](/docs/troubleshooting/server-actions-in-client-components)
- [useChat/useCompletion stream output contains 0:... instead of text](/docs/troubleshooting/strange-stream-output)
- [Streamable UI Errors](/docs/troubleshooting/streamable-ui-errors)
- [Tool Invocation Missing Result Error](/docs/troubleshooting/tool-invocation-missing-result)
- [Streaming Not Working When Deployed](/docs/troubleshooting/streaming-not-working-when-deployed)
- [Streaming Not Working When Proxied](/docs/troubleshooting/streaming-not-working-when-proxied)
- [Getting Timeouts When Deploying on Vercel](/docs/troubleshooting/timeout-on-vercel)
- [Unclosed Streams](/docs/troubleshooting/unclosed-streams)
- [useChat Failed to Parse Stream](/docs/troubleshooting/use-chat-failed-to-parse-stream)
- [Server Action Plain Objects Error](/docs/troubleshooting/client-stream-error)
- [useChat No Response](/docs/troubleshooting/use-chat-tools-no-response)
- [Custom headers, body, and credentials not working with useChat](/docs/troubleshooting/use-chat-custom-request-options)
- [TypeScript performance issues with Zod and AI SDK 5](/docs/troubleshooting/typescript-performance-zod)
- [useChat "An error occurred"](/docs/troubleshooting/use-chat-an-error-occurred)
- [Repeated assistant messages in useChat](/docs/troubleshooting/repeated-assistant-messages)
- [onFinish not called when stream is aborted](/docs/troubleshooting/stream-abort-handling)
- [Tool calling with generateObject and streamObject](/docs/troubleshooting/tool-calling-with-structured-outputs)
- [Abort breaks resumable streams](/docs/troubleshooting/abort-breaks-resumable-streams)
- [streamText fails silently](/docs/troubleshooting/stream-text-not-working)
- [Streaming Status Shows But No Text Appears](/docs/troubleshooting/streaming-status-delay)
- [Stale body values with useChat](/docs/troubleshooting/use-chat-stale-body-data)
- [Type Error with onToolCall](/docs/troubleshooting/ontoolcall-type-narrowing)
- [Unsupported model version error](/docs/troubleshooting/unsupported-model-version)
- [Object generation failed with OpenAI](/docs/troubleshooting/no-object-generated-content-filter)
- [Missing Tool Results Error](/docs/troubleshooting/missing-tool-results-error)
- [Model is not assignable to type "LanguageModelV1"](/docs/troubleshooting/model-is-not-assignable-to-type)
- [TypeScript error "Cannot find namespace 'JSX'"](/docs/troubleshooting/typescript-cannot-find-namespace-jsx)
- [React error "Maximum update depth exceeded"](/docs/troubleshooting/react-maximum-update-depth-exceeded)
- [Jest: cannot find module '@ai-sdk/rsc'](/docs/troubleshooting/jest-cannot-find-module-ai-rsc)
- [High memory usage when processing many images](/docs/troubleshooting/high-memory-usage-with-images)


[Full Sitemap](/sitemap.md)
