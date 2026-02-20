
# `useUIState`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

It is a hook that enables you to read and update the UI State. The state is client-side and can contain functions, React nodes, and other data. UIState is the visual representation of the AI state.

## Import

<Snippet text={`import { useUIState } from "@ai-sdk/rsc"`} prompt={false} />

## API Signature

### Returns

Similar to useState, it is an array, where the first element is the current UI state and the second element is the function that updates the state.

## Examples

<ExampleLinks
  examples={[
    {
      title: 'Learn to manage AI and UI states in Next.js',
      link: '/examples/next-app/state-management/ai-ui-states',
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
