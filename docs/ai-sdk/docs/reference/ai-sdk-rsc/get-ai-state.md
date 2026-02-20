
# `getAIState`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

Get the current AI state.

## Import

<Snippet text={`import { getAIState } from "@ai-sdk/rsc"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'key',
      type: 'string',
      isOptional: true,
      description:
        "Returns the value of the specified key in the AI state, if it's an object.",
    },
  ]}
/>

### Returns

The AI state.

## Examples

<ExampleLinks
  examples={[
    {
      title:
        'Learn to render a React component during a tool call made by a language model in Next.js',
      link: '/examples/next-app/tools/render-interface-during-tool-call',
    },
  ]}
/>


## Navigation

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


[Full Sitemap](/sitemap.md)
