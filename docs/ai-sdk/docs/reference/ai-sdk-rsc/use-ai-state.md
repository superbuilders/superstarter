
# `useAIState`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

It is a hook that enables you to read and update the AI state. The AI state is shared globally between all `useAIState` hooks under the same `<AI/>` provider.

The AI state is intended to contain context and information shared with the AI model, such as system messages, function responses, and other relevant data.

## Import

<Snippet text={`import { useAIState } from "@ai-sdk/rsc"`} prompt={false} />

## API Signature

### Returns

Similar to useState, it is an array where the first element is the current AI state and the second element is a function to update the state.


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
