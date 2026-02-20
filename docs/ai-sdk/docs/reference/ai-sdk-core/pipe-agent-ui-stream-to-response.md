
# `pipeAgentUIStreamToResponse`

The `pipeAgentUIStreamToResponse` function runs an [Agent](/docs/reference/ai-sdk-core/agent) and streams the resulting UI message output directly to a Node.js [`ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) object. This is ideal for building real-time streaming API endpoints (for chat, tool use, etc.) in Node.js-based frameworks like Express, Hono, or custom Node servers.

## Import

<Snippet
  text={`import { pipeAgentUIStreamToResponse } from "ai"`}
  prompt={false}
/>

## Usage

```ts
import { pipeAgentUIStreamToResponse } from 'ai';
import { MyAgent } from './agent';

export async function handler(req, res) {
  const { messages } = JSON.parse(req.body);

  await pipeAgentUIStreamToResponse({
    response: res, // Node.js ServerResponse
    agent: MyAgent,
    uiMessages: messages, // Required: array of input UI messages
    // abortSignal: optional AbortSignal for cancellation
    // status: 200,
    // headers: { ... },
    // ...other optional UI message stream options
  });
}
```

## Parameters

<PropertiesTable
  content={[
    {
      name: 'response',
      type: 'ServerResponse',
      isRequired: true,
      description:
        'The Node.js ServerResponse object to pipe UI message stream output into.',
    },
    {
      name: 'agent',
      type: 'Agent',
      isRequired: true,
      description:
        'An agent instance implementing `.stream({ prompt, ... })` and defining a `tools` property.',
    },
    {
      name: 'uiMessages',
      type: 'unknown[]',
      isRequired: true,
      description:
        'Array of input UI messages sent to the agent (such as user/assistant message objects).',
    },
    {
      name: 'abortSignal',
      type: 'AbortSignal',
      isRequired: false,
      description:
        'Optional abort signal to cancel streaming (e.g., on client disconnect). Supply an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal), for example from an `AbortController`.',
    },
    {
      name: 'timeout',
      type: 'number | { totalMs?: number }',
      isRequired: false,
      description:
        'Timeout in milliseconds. Can be specified as a number or as an object with a totalMs property. The call will be aborted if it takes longer than the specified timeout. Can be used alongside abortSignal.',
    },
    {
      name: 'options',
      type: 'CALL_OPTIONS',
      isRequired: false,
      description:
        'Optional agent call options, for agents configured with generic parameter `CALL_OPTIONS`.',
    },
    {
      name: 'experimental_transform',
      type: 'StreamTextTransform | StreamTextTransform[]',
      isRequired: false,
      description:
        'Optional stream text transformation(s) applied to agent output.',
    },
    {
      name: 'onStepFinish',
      type: 'ToolLoopAgentOnStepFinishCallback',
      isRequired: false,
      description:
        'Callback invoked after each agent step (LLM/tool call) completes. Useful for tracking token usage or logging intermediate steps.',
    },
    {
      name: '...UIMessageStreamResponseInit & UIMessageStreamOptions',
      type: 'object',
      isRequired: false,
      description:
        'Options for streaming headers, status, SSE stream config, and additional UI message stream control.',
    },
  ]}
/>

## Returns

A `Promise<void>`. The function completes when the UI message stream has been fully sent to the provided ServerResponse.

## Example: Express Route Handler

```ts
import { pipeAgentUIStreamToResponse } from 'ai';
import { openaiWebSearchAgent } from './openai-web-search-agent';

app.post('/chat', async (req, res) => {
  // Use req.body.messages as input UI messages
  await pipeAgentUIStreamToResponse({
    response: res,
    agent: openaiWebSearchAgent,
    uiMessages: req.body.messages,
    // abortSignal: yourController.signal
    // status: 200,
    // headers: { ... },
    // ...more options
  });
});
```

## How It Works

1. **Runs the Agent:** Calls the agent’s `.stream` method with the provided UI messages and options, converting them into model messages as needed.
2. **Streams UI Message Output:** Pipes the agent output as a UI message stream to the `ServerResponse`, sending data via streaming HTTP responses (including appropriate headers).
3. **Abort Signal Handling:** If `abortSignal` is supplied, streaming is cancelled as soon as the signal is triggered (such as on client disconnect).
4. **No Response Return:** Unlike Edge/serverless APIs that return a `Response`, this function writes bytes directly to the ServerResponse and does not return a response object.

## Notes

- **Abort Handling:** For best robustness, use an `AbortSignal` (for example, wired to Express/Hono client disconnects) to ensure quick cancellation of agent computation and streaming.
- **Node.js Only:** Only works with Node.js [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse) objects (e.g., in Express, Hono’s node adapter, etc.), not Edge/serverless/web Response APIs.
- **Streaming Support:** Make sure your client (and any proxies) correctly support streaming HTTP responses for full effect.
- **Parameter Names:** The property for input messages is `uiMessages` (not `messages`) for consistency with SDK agent utilities.

## See Also

- [`createAgentUIStreamResponse`](/docs/reference/ai-sdk-core/create-agent-ui-stream-response)
- [`Agent`](/docs/reference/ai-sdk-core/agent)
- [`UIMessage`](/docs/reference/ai-sdk-core/ui-message)


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
