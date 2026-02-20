
# Stale body values with useChat

## Issue

When using `useChat` and passing dynamic information via the `body` parameter at the hook level, the data remains stale and only reflects the value from the initial component render. This occurs because the body configuration is captured once when the hook is initialized and doesn't update with subsequent component re-renders.

```tsx
// Problematic code - body data will be stale
export default function Chat() {
  const [temperature, setTemperature] = useState(0.7);
  const [userId, setUserId] = useState('user123');

  // This body configuration is captured once and won't update
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        temperature, // Always the initial value (0.7)
        userId, // Always the initial value ('user123')
      },
    }),
  });

  // Even if temperature or userId change, the body in requests will still use initial values
  return (
    <div>
      <input
        type="range"
        value={temperature}
        onChange={e => setTemperature(parseFloat(e.target.value))}
      />
      {/* Chat UI */}
    </div>
  );
}
```

## Background

The hook-level body configuration is evaluated once during the initial render and doesn't re-evaluate when component state changes.

## Solution

Pass dynamic variables via the second argument of the `sendMessage` function instead of at the hook level. Request-level options are evaluated on each call and take precedence over hook-level options.

```tsx
export default function Chat() {
  const [temperature, setTemperature] = useState(0.7);
  const [userId, setUserId] = useState('user123');
  const [input, setInput] = useState('');

  const { messages, sendMessage } = useChat({
    // Static configuration only
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <div>
      <input
        type="range"
        value={temperature}
        onChange={e => setTemperature(parseFloat(e.target.value))}
      />

      <form
        onSubmit={event => {
          event.preventDefault();
          if (input.trim()) {
            // Pass dynamic values as request-level options
            sendMessage(
              { text: input },
              {
                body: {
                  temperature, // Current value at request time
                  userId, // Current value at request time
                },
              },
            );
            setInput('');
          }
        }}
      >
        <input value={input} onChange={e => setInput(e.target.value)} />
      </form>
    </div>
  );
}
```

### Alternative: Dynamic Hook-Level Configuration

If you need hook-level configuration that responds to changes, you can use functions that return configuration values. However, for component state, you'll need to use `useRef` to access current values:

```tsx
export default function Chat() {
  const temperatureRef = useRef(0.7);

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        temperature: temperatureRef.current, // Access via ref.current
        sessionId: getCurrentSessionId(), // Function calls work directly
      }),
    }),
  });

  // ...
}
```

**Recommendation:** Request-level configuration is simpler and more reliable for component state. Use it whenever you need to pass dynamic values that change during the component lifecycle.

### Server-side handling

On your server side, retrieve the custom fields by destructuring the request body:

```tsx
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages, temperature, userId } = await req.json();

  const result = streamText({
    model: 'openai/gpt-5-mini',
    messages: await convertToModelMessages(messages),
    temperature, // Use the dynamic temperature from the request
    // ... other configuration
  });

  return result.toUIMessageStreamResponse();
}
```

For more information, see [chatbot request configuration documentation](/docs/ai-sdk-ui/chatbot#request-configuration).


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
