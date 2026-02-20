
# InferUITool

Infers the input and output types of a tool.

This type helper is useful when working with individual tools to ensure type safety for your tool inputs and outputs in `UIMessage`s.

## Import

```tsx
import { InferUITool } from 'ai';
```

## API Signature

### Type Parameters

<PropertiesTable
  content={[
    {
      name: 'TOOL',
      type: 'Tool',
      description: 'The tool to infer types from.',
    },
  ]}
/>

### Returns

A type that contains the inferred input and output types of the tool.

The resulting type has the shape:

```typescript
{
  input: InferToolInput<TOOL>;
  output: InferToolOutput<TOOL>;
}
```

## Examples

### Basic Usage

```tsx
import { InferUITool } from 'ai';
import { z } from 'zod';

const weatherTool = {
  description: 'Get the current weather',
  inputSchema: z.object({
    location: z.string().describe('The city and state'),
  }),
  execute: async ({ location }) => {
    return `The weather in ${location} is sunny.`;
  },
};

// Infer the types from the tool
type WeatherUITool = InferUITool<typeof weatherTool>;
// This creates a type with:
// {
//   input: { location: string };
//   output: string;
// }
```

## Related

- [`InferUITools`](/docs/reference/ai-sdk-ui/infer-ui-tools) - Infer types for a tool set
- [`ToolUIPart`](/docs/reference/ai-sdk-core/ui-message#tooluipart) - Tool part type for UI messages


## Navigation

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


[Full Sitemap](/sitemap.md)
